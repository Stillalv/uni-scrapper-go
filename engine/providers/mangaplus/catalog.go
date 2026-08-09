package mangaplus

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/utils"
)

type MangaPlusProvider struct {
	lang     string // "id"
	sourceID string // "mangaplus_id"
	name     string
}

func NewMangaPlusProvider(lang string) *MangaPlusProvider {
	return &MangaPlusProvider{
		lang:     lang,
		sourceID: "mangaplus_id",
		name:     "MANGA Plus (Indonesia)",
	}
}

func (p *MangaPlusProvider) SourceID() string { return p.sourceID }
func (p *MangaPlusProvider) Name() string     { return p.name }

func (p *MangaPlusProvider) CanHandle(input string) bool {
	clean := strings.TrimSpace(input)
	if strings.Contains(clean, "mangaplus.shueisha.co.jp") || strings.Contains(clean, "mangaplus") {
		return true
	}
	return false
}

type MangaPlusComic struct {
	TitleID     uint32 `json:"title_id"`
	Title       string `json:"title"`
	Author      string `json:"author"`
	PortraitURL string `json:"portrait_url"`
	LanguageID  uint32 `json:"language_id"`
}

func (p *MangaPlusProvider) FetchCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	cachePath := filepath.Join(".", "catalog_cache_mangaplus_id.json")

	if !forceRefresh {
		if info, err := os.Stat(cachePath); err == nil {
			if time.Since(info.ModTime()) < 24*time.Hour {
				if logCb != nil {
					logCb("Loading MANGA Plus (Indonesia) catalog from local cache...")
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
						if logCb != nil {
							logCb(fmt.Sprintf("Done! Loaded %d MANGA Plus Indonesian titles from cache.", len(result)))
						}
						return result, nil
					}
				}
			}
		}
	}

	if logCb != nil {
		logCb("Fetching fresh MANGA Plus (Indonesia) catalog from API...")
	}

	url := "https://jumpg-webapi.tokyo-cdn.com/api/title_list/allV2"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
	req.Header.Set("Origin", "https://mangaplus.shueisha.co.jp")
	req.Header.Set("SESSION-TOKEN", "12345678-1234-4234-8234-123456789abc")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch MANGA Plus API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MANGA Plus API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read MANGA Plus response: %v", err)
	}

	rawTitles := parseMangaPlusTitlesFromProto(body)
	seen := make(map[uint32]bool)
	var catalog []model.CatalogItem

	for _, t := range rawTitles {
		if (t.LanguageID == 3 || (t.TitleID >= 400000 && t.TitleID < 500000)) && !seen[t.TitleID] {
			seen[t.TitleID] = true
			catalog = append(catalog, model.CatalogItem{
				ID:       fmt.Sprintf("%d", t.TitleID),
				Source:   p.sourceID,
				Title:    t.Title,
				Author:   t.Author,
				Genre:    "MANGA Plus (Sub Indo)",
				CoverURL: t.PortraitURL,
				URL:      fmt.Sprintf("https://mangaplus.shueisha.co.jp/titles/%d", t.TitleID),
			})
		}
	}

	sort.Slice(catalog, func(i, j int) bool {
		return strings.ToLower(catalog[i].Title) < strings.ToLower(catalog[j].Title)
	})

	if data, err := json.MarshalIndent(catalog, "", "  "); err == nil {
		_ = os.WriteFile(cachePath, data, 0644)
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Done! Loaded %d MANGA Plus Indonesian titles.", len(catalog)))
	}

	return catalog, nil
}

func readVarintBytes(data []byte, offset int) (uint64, int) {
	var res uint64
	var shift uint
	for offset < len(data) {
		b := data[offset]
		offset++
		res |= uint64(b&0x7F) << shift
		if (b & 0x80) == 0 {
			break
		}
		shift += 7
	}
	return res, offset
}

func parseMangaPlusTitlesFromProto(data []byte) []MangaPlusComic {
	var titles []MangaPlusComic
	walkMangaPlusProto(data, &titles)
	return titles
}

func parseSingleTitleObj(data []byte) (MangaPlusComic, bool) {
	var t MangaPlusComic
	offset := 0
	for offset < len(data) {
		tag, nOffset := readVarintBytes(data, offset)
		if nOffset == offset {
			break
		}
		fieldNumber := tag >> 3
		wireType := tag & 0x07
		offset = nOffset

		if wireType == 0 {
			val, next := readVarintBytes(data, offset)
			offset = next
			if fieldNumber == 1 {
				t.TitleID = uint32(val)
			} else if fieldNumber == 5 || fieldNumber == 6 || fieldNumber == 7 || fieldNumber == 8 {
				if t.LanguageID == 0 {
					t.LanguageID = uint32(val)
				}
			}
		} else if wireType == 2 {
			length, next := readVarintBytes(data, offset)
			offset = next
			if offset+int(length) <= len(data) {
				strVal := string(data[offset : offset+int(length)])
				offset += int(length)
				if fieldNumber == 2 {
					t.Title = strVal
				} else if fieldNumber == 3 {
					t.Author = strVal
				} else if fieldNumber == 4 {
					t.PortraitURL = strVal
				}
			} else {
				break
			}
		} else if wireType == 5 {
			offset += 4
		} else if wireType == 1 {
			offset += 8
		} else {
			break
		}
	}
	return t, t.Title != "" && strings.HasPrefix(t.PortraitURL, "http")
}

func walkMangaPlusProto(data []byte, titles *[]MangaPlusComic) {
	offset := 0
	for offset < len(data) {
		tag, nOffset := readVarintBytes(data, offset)
		if nOffset == offset {
			break
		}
		wireType := tag & 0x07
		offset = nOffset

		if wireType == 0 {
			_, next := readVarintBytes(data, offset)
			offset = next
		} else if wireType == 2 {
			length, next := readVarintBytes(data, offset)
			offset = next
			if offset+int(length) <= len(data) {
				subData := data[offset : offset+int(length)]
				offset += int(length)

				tObj, ok := parseSingleTitleObj(subData)
				if ok {
					*titles = append(*titles, tObj)
				} else {
					walkMangaPlusProto(subData, titles)
				}
			} else {
				break
			}
		} else if wireType == 5 {
			offset += 4
		} else if wireType == 1 {
			offset += 8
		} else {
			break
		}
	}
}
