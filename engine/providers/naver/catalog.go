package naver

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/utils"
)

var reNaverTitleIDFromHref = regexp.MustCompile(`titleId=(\d+)`)

// fetchNaverCatalog retrieves the complete Naver Webtoon catalog across all weekday and completed schedules.
func fetchNaverCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	cachePath := filepath.Join(".", "catalog_cache_naver_ko.json")

	if !forceRefresh {
		if info, err := os.Stat(cachePath); err == nil {
			if time.Since(info.ModTime()) < 24*time.Hour {
				data, err := os.ReadFile(cachePath)
				if err == nil {
					var cachedItems []model.CatalogItem
					if err := json.Unmarshal(data, &cachedItems); err == nil && len(cachedItems) > 0 {
						if logCb != nil {
							logCb(fmt.Sprintf("Loaded %d Naver Webtoon items from cache (%s)", len(cachedItems), cachePath))
						}
						return cachedItems, nil
					}
				}
			}
		}
	}

	if logCb != nil {
		logCb("Fetching live Naver Webtoon schedules...")
	}

	days := []string{"mon", "tue", "wed", "thu", "fri", "sat", "sun", "dailyPlus", "finish"}
	type dayResult struct {
		day   string
		items []model.CatalogItem
		err   error
	}

	resChan := make(chan dayResult, len(days))
	var wg sync.WaitGroup

	for _, d := range days {
		wg.Add(1)
		go func(dayName string) {
			defer wg.Done()
			var targetURL string
			if dayName == "finish" {
				targetURL = "https://m.comic.naver.com/webtoon/finish"
			} else {
				targetURL = fmt.Sprintf("https://m.comic.naver.com/webtoon/weekday?week=%s", dayName)
			}

			req, err := http.NewRequest("GET", targetURL, nil)
			if err != nil {
				resChan <- dayResult{day: dayName, err: err}
				return
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148")
			req.Header.Set("Referer", "https://m.comic.naver.com/")

			resp, err := utils.HTTPClient.Do(req)
			if err != nil {
				resChan <- dayResult{day: dayName, err: err}
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				resChan <- dayResult{day: dayName, err: fmt.Errorf("HTTP status %d", resp.StatusCode)}
				return
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				resChan <- dayResult{day: dayName, err: err}
				return
			}

			doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
			if err != nil {
				resChan <- dayResult{day: dayName, err: err}
				return
			}

			var dayItems []model.CatalogItem
			doc.Find("ul.list_toon li, ul.toon_list li, div.item, li[class*='item']").Each(func(i int, s *goquery.Selection) {
				aTag := s.Find("a[href*='titleId']")
				if aTag.Length() == 0 {
					return
				}
				href, _ := aTag.Attr("href")
				m := reNaverTitleIDFromHref.FindStringSubmatch(href)
				if len(m) < 2 {
					return
				}
				titleID := m[1]

				title := strings.TrimSpace(s.Find(".title, strong.text, .name, .title_name").First().Text())
				if title == "" {
					title = strings.TrimSpace(aTag.Find("strong, .text").First().Text())
				}

				author := strings.TrimSpace(s.Find(".author, span.author, .writer").First().Text())

				imgTag := s.Find("img")
				coverURL, _ := imgTag.Attr("src")
				if coverURL == "" {
					coverURL, _ = imgTag.Attr("data-src")
				}

				if title != "" && titleID != "" {
					dayItems = append(dayItems, model.CatalogItem{
						ID:          titleID,
						Source:      "naver_ko",
						Title:       title,
						Author:      author,
						Genre:       "Naver Webtoon",
						CoverURL:    coverURL,
						URL:         fmt.Sprintf("https://comic.naver.com/webtoon/list?titleId=%s", titleID),
						IsCompleted: dayName == "finish",
					})
				}
			})

			resChan <- dayResult{day: dayName, items: dayItems}
		}(d)
	}

	wg.Wait()
	close(resChan)

	uniqueMap := make(map[string]model.CatalogItem)
	for res := range resChan {
		if res.err != nil {
			if logCb != nil {
				logCb(fmt.Sprintf("Warning: failed to crawl schedule '%s': %v", res.day, res.err))
			}
			continue
		}
		for _, it := range res.items {
			if _, exists := uniqueMap[it.ID]; !exists {
				uniqueMap[it.ID] = it
			}
		}
	}

	if len(uniqueMap) == 0 {
		return nil, fmt.Errorf("no comic items retrieved from Naver Webtoon")
	}

	result := make([]model.CatalogItem, 0, len(uniqueMap))
	for _, it := range uniqueMap {
		result = append(result, it)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Title < result[j].Title
	})

	// Save to local cache
	if cacheData, err := json.MarshalIndent(result, "", "  "); err == nil {
		_ = os.WriteFile(cachePath, cacheData, 0644)
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Successfully crawled and cached %d Naver Webtoon titles.", len(result)))
	}

	return result, nil
}
