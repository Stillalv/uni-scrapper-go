package engine

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
)

// Comic stores catalog metadata for a Webtoon comic.
type Comic struct {
	TitleNo string `json:"title_no"`
	Title   string `json:"title"`
	Genre   string `json:"genre"`
	URL     string `json:"url"`
}

// FetchWebtoonCatalog fetches all ongoing and completed comics for the given language from LINE Webtoon, using local disk cache if available.
func FetchWebtoonCatalog(lang string, forceRefresh bool, logCb func(string)) ([]Comic, error) {
	cachePath := filepath.Join(".", fmt.Sprintf("catalog_cache_%s.json", lang))

	if !forceRefresh {
		if info, err := os.Stat(cachePath); err == nil {
			if time.Since(info.ModTime()) < 24*time.Hour {
				if logCb != nil {
					logCb(fmt.Sprintf("Memuat katalog komik '%s' dari cache lokal (cepat)...", strings.ToUpper(lang)))
				}
				data, err := os.ReadFile(cachePath)
				if err == nil {
					var cachedCatalog []Comic
					if err := json.Unmarshal(data, &cachedCatalog); err == nil {
						if logCb != nil {
							logCb(fmt.Sprintf("Selesai! Ditemukan %d komik dari cache.", len(cachedCatalog)))
						}
						return cachedCatalog, nil
					}
				}
			}
		}
	}

	days := []string{"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "complete"}
	comicsMap := make(map[string]Comic)
	var mu sync.Mutex
	var wg sync.WaitGroup

	if logCb != nil {
		logCb(fmt.Sprintf("Memulai pengambilan katalog komik lengkap untuk bahasa '%s'...", lang))
	}

	for _, day := range days {
		wg.Add(1)
		go func(dayName string) {
			defer wg.Done()
			isCompleted := (dayName == "complete")
			targetURL := fmt.Sprintf("https://www.webtoons.com/%s/originals/%s?sortOrder=MANA", lang, dayName)

			req, err := http.NewRequest("GET", targetURL, nil)
			if err != nil {
				return
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
			req.Header.Set("Referer", "https://www.webtoons.com/")
			req.Header.Set("Accept-Language", fmt.Sprintf("%s,en-US;q=0.9,en;q=0.8", lang))

			resp, err := HTTPClient.Do(req)
			if err != nil || resp.StatusCode != 200 {
				if resp != nil {
					resp.Body.Close()
				}
				if logCb != nil {
					logCb(fmt.Sprintf("[Error] Gagal mengakses %s", strings.ToUpper(dayName)))
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
			titleNoRe := regexp.MustCompile(`title_no=(\d+)`)

			doc.Find("a").Each(func(i int, s *goquery.Selection) {
				href, exists := s.Attr("href")
				if !exists {
					return
				}
				matches := titleNoRe.FindStringSubmatch(href)
				if len(matches) < 2 {
					return
				}
				titleNo := matches[1]

				genre := dayName
				if isCompleted {
					genre = "Selesai"
				} else {
					genre = strings.Title(dayName)
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
					spaceRe := regexp.MustCompile(`\s+`)
					title = spaceRe.ReplaceAllString(titleRaw, " ")
				}

				relURL, _ := url.Parse(href)
				fullURL := baseURL.ResolveReference(relURL).String()

				mu.Lock()
				if _, found := comicsMap[titleNo]; !found {
					comicsMap[titleNo] = Comic{
						TitleNo: titleNo,
						Title:   title,
						Genre:   genre,
						URL:     fullURL,
					}
					localCount++
				}
				mu.Unlock()
			})

			if logCb != nil && localCount > 0 {
				logCb(fmt.Sprintf("  Daftar %s selesai diproses. Ditemukan %d komik baru.", strings.ToUpper(dayName), localCount))
			}
		}(day)
	}

	wg.Wait()

	catalog := make([]Comic, 0, len(comicsMap))
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
		logCb(fmt.Sprintf("Selesai! Ditemukan total %d komik unik di katalog.", len(catalog)))
	}

	return catalog, nil
}
