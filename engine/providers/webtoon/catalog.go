package webtoon

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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

// WebtoonProvider implements the Provider interface for LINE Webtoon.
type WebtoonProvider struct {
	lang     string // "id" or "en"
	sourceID string // "webtoon_id" or "webtoon_en"
	name     string
}

func NewWebtoonProvider(lang string) *WebtoonProvider {
	sID := "webtoon_id"
	name := "LINE Webtoon (Indonesia)"
	if lang == "en" {
		sID = "webtoon_en"
		name = "LINE Webtoon (English)"
	}
	return &WebtoonProvider{
		lang:     lang,
		sourceID: sID,
		name:     name,
	}
}

func (p *WebtoonProvider) SourceID() string { return p.sourceID }
func (p *WebtoonProvider) Name() string     { return p.name }

func (p *WebtoonProvider) CanHandle(input string) bool {
	clean := strings.TrimSpace(input)
	if strings.Contains(clean, "webtoons.com") {
		return true
	}
	return false
}

var reWebtoonTitleNo = regexp.MustCompile(`title_no=(\d+)`)

func (p *WebtoonProvider) FetchCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	cachePath := filepath.Join(".", fmt.Sprintf("catalog_cache_%s.json", p.lang))

	if !forceRefresh {
		if info, err := os.Stat(cachePath); err == nil {
			if time.Since(info.ModTime()) < 24*time.Hour {
				if logCb != nil {
					logCb(fmt.Sprintf("Loading '%s' comic catalog from local cache (fast)...", strings.ToUpper(p.lang)))
				}
				data, err := os.ReadFile(cachePath)
				if err == nil {
					type cachedItem struct {
						model.CatalogItem
						TitleNo string `json:"title_no,omitempty"`
					}
					var rawList []cachedItem
					if err := json.Unmarshal(data, &rawList); err == nil && len(rawList) > 0 {
						result := make([]model.CatalogItem, len(rawList))
						for i, item := range rawList {
							result[i] = item.CatalogItem
							if result[i].ID == "" && item.TitleNo != "" {
								result[i].ID = item.TitleNo
							}
						}
						if len(result) > 0 && result[0].CoverURL != "" {
							if logCb != nil {
								logCb(fmt.Sprintf("Done! Found %d comics from cache.", len(result)))
							}
							return result, nil
						}
					}
				}
			}
		}
	}

	days := []string{"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "complete"}
	comicsMap := make(map[string]model.CatalogItem, 400)
	var mu sync.Mutex
	var wg sync.WaitGroup

	if logCb != nil {
		logCb(fmt.Sprintf("Starting full comic catalog fetch for language '%s'...", p.lang))
	}

	for _, day := range days {
		wg.Add(1)
		go func(dayName string) {
			defer wg.Done()
			isCompleted := (dayName == "complete")
			targetURL := fmt.Sprintf("https://www.webtoons.com/%s/originals/%s?sortOrder=MANA", p.lang, dayName)

			req, err := http.NewRequest("GET", targetURL, nil)
			if err != nil {
				return
			}
			req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
			req.Header.Set("Referer", "https://www.webtoons.com/")
			req.Header.Set("Accept-Language", fmt.Sprintf("%s,en-US;q=0.9,en;q=0.8", p.lang))

			resp, err := utils.HTTPClient.Do(req)
			if err != nil || resp.StatusCode != 200 {
				if resp != nil {
					resp.Body.Close()
				}
				if logCb != nil {
					logCb(fmt.Sprintf("[Error] Failed to access %s", strings.ToUpper(dayName)))
				}
				return
			}

			doc, err := goquery.NewDocumentFromReader(resp.Body)
			resp.Body.Close()
			if err != nil {
				return
			}

			baseURL, _ := url.Parse(targetURL)
			localCount := 0

			doc.Find("a").Each(func(i int, s *goquery.Selection) {
				href, exists := s.Attr("href")
				if !exists {
					return
				}
				matches := reWebtoonTitleNo.FindStringSubmatch(href)
				if len(matches) < 2 {
					return
				}
				titleNo := matches[1]

				genre := dayName
				if isCompleted {
					genre = "Selesai"
				} else if len(dayName) > 0 {
					genre = strings.ToUpper(dayName[:1]) + dayName[1:]
				}

				subjTag := s.Find(".subj, .title, .name")
				title := ""
				if subjTag.Length() > 0 {
					title = strings.TrimSpace(subjTag.Text())
				}

				genreTag := s.Find(".genre, .category")
				if genreTag.Length() > 0 {
					genre = strings.TrimSpace(genreTag.Text())
				} else if isCompleted {
					genre = "Tamat"
				}

				if title == "" {
					titleRaw := strings.TrimSpace(s.Text())
					title = strings.Join(strings.Fields(titleRaw), " ")
				}

				imgTag := s.Find("img")
				imgSrc, _ := imgTag.Attr("src")
				if imgSrc == "" {
					imgSrc, _ = imgTag.Attr("data-url")
				}

				relURL, _ := url.Parse(href)
				fullURL := baseURL.ResolveReference(relURL).String()

				mu.Lock()
				if _, found := comicsMap[titleNo]; !found {
					comicsMap[titleNo] = model.CatalogItem{
						ID:          titleNo,
						Source:      p.sourceID,
						Title:       title,
						Genre:       genre,
						CoverURL:    imgSrc,
						URL:         fullURL,
						IsCompleted: isCompleted,
					}
					localCount++
				}
				mu.Unlock()
			})

			if logCb != nil && localCount > 0 {
				logCb(fmt.Sprintf("  %s list processed. Found %d new comics.", strings.ToUpper(dayName), localCount))
			}
		}(day)
	}

	wg.Wait()

	catalog := make([]model.CatalogItem, 0, len(comicsMap))
	for _, c := range comicsMap {
		catalog = append(catalog, c)
	}

	sort.Slice(catalog, func(i, j int) bool {
		return strings.ToLower(catalog[i].Title) < strings.ToLower(catalog[j].Title)
	})

	// Save to disk cache
	if data, err := json.MarshalIndent(catalog, "", "  "); err == nil {
		_ = os.WriteFile(cachePath, data, 0644)
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Done! Found %d unique comics in the catalog.", len(catalog)))
	}

	return catalog, nil
}
