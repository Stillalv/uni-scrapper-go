package mangaplus

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/utils"
)

func (p *MangaPlusProvider) ResolveComic(rawInput string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	cleanInput := strings.TrimSpace(rawInput)
	var titleID string

	reID := regexp.MustCompile(`(?:titles/|title_id=)?(\d+)`)
	matches := reID.FindStringSubmatch(cleanInput)
	if len(matches) >= 2 {
		titleID = matches[1]
	} else {
		titleID = cleanInput
	}

	if titleID == "" {
		return nil, nil, fmt.Errorf("invalid MANGA Plus Title ID")
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Resolving MANGA Plus Title ID: %s...", titleID))
	}

	secret, err := GetDeviceSecret()
	if err != nil {
		secret = "a2a9960bd0060a6eba81ebb25ad5b13c"
	}

	url := fmt.Sprintf("https://jumpg-api.tokyo-cdn.com/api/title_detailV3?title_id=%s&os=android&os_ver=33&app_ver=240&secret=%s", titleID, secret)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, nil, err
	}

	req.Header.Set("User-Agent", "okhttp/4.9.0")
	req.Header.Set("Accept", "*/*")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch MANGA Plus title detail: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("MANGA Plus API returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read response body: %v", err)
	}

	titleName, author := parseMangaPlusHeaderFromProto(body)
	if titleName == "" {
		titleName = fmt.Sprintf("MANGA Plus Title #%s", titleID)
	}

	episodes := parseMangaPlusEpisodesFromProto(body, titleID)
	if len(episodes) == 0 {
		return nil, nil, fmt.Errorf("no chapters found for MANGA Plus title #%s", titleID)
	}

	info := &model.ComicInfo{
		Source:  p.sourceID,
		Title:   titleName,
		Lang:    "id",
		Genre:   "MANGA Plus (Sub Indo)",
		TitleNo: titleID,
		Author:  author,
		ListURL: fmt.Sprintf("https://mangaplus.shueisha.co.jp/titles/%s", titleID),
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Successfully resolved '%s' (%d chapters).", titleName, len(episodes)))
	}

	return info, episodes, nil
}

func parseMangaPlusHeaderFromProto(data []byte) (string, string) {
	var name, author string
	strRe := regexp.MustCompile(`[a-zA-Z0-9 _\-:/?&=.']{3,}`)
	matches := strRe.FindAllString(string(data), -1)

	for _, s := range matches {
		sClean := strings.TrimSpace(s)
		if len(sClean) > 3 && !strings.HasPrefix(sClean, "http") && !strings.Contains(sClean, "MANGA") && !strings.Contains(sClean, "SHUEISHA") {
			if name == "" {
				name = sClean
			} else if author == "" && sClean != name {
				author = sClean
				break
			}
		}
	}
	return name, author
}

func parseMangaPlusEpisodesFromProto(data []byte, titleID string) []model.Episode {
	bodyStr := string(data)
	reThumb := regexp.MustCompile(`https?://jumpg-assets[0-9]*\.tokyo-cdn\.com/secure/title/` + titleID + `/chapter/([0-9]+)/chapter_thumbnail`)
	matches := reThumb.FindAllStringSubmatch(bodyStr, -1)

	seen := make(map[string]bool)
	var episodes []model.Episode

	for i, m := range matches {
		chIDStr := m[1]
		if !seen[chIDStr] {
			seen[chIDStr] = true
			epNum := i + 1
			chNum := fmt.Sprintf("%03d", epNum)
			folderName := utils.SanitizeFilename(fmt.Sprintf("Chapter %s - Bab %d", chNum, epNum))

			episodes = append(episodes, model.Episode{
				EpisodeNo:  epNum,
				Title:      fmt.Sprintf("Bab %d", epNum),
				URL:        fmt.Sprintf("https://mangaplus.shueisha.co.jp/viewer/%s", chIDStr),
				ChNum:      chNum,
				FolderName: folderName,
			})
		}
	}

	return episodes
}

// FetchChapterPages fetches all panel image URLs and encryption keys for a MANGA Plus chapter.
func FetchChapterPages(chapterID string) ([]string, []string, error) {
	secret, err := GetDeviceSecret()
	if err != nil {
		secret = "a2a9960bd0060a6eba81ebb25ad5b13c"
	}

	url := fmt.Sprintf("https://jumpg-api.tokyo-cdn.com/api/manga_viewer?chapter_id=%s&os=android&os_ver=33&app_ver=240&secret=%s&split=yes&img_quality=super_high", chapterID, secret)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, nil, err
	}

	req.Header.Set("User-Agent", "okhttp/4.9.0")
	req.Header.Set("Accept", "*/*")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch MANGA Plus chapter viewer: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("MANGA Plus viewer returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read viewer response body: %v", err)
	}

	var pages []PageMeta
	walkPagesProto(body, &pages)

	var imageURLs []string
	var keys []string

	for _, p := range pages {
		if strings.Contains(p.URL, "jumpg-assets") || strings.Contains(p.URL, "manga_page") {
			imageURLs = append(imageURLs, p.URL)
			keys = append(keys, p.EncryptionHex)
		}
	}

	return imageURLs, keys, nil
}

type PageMeta struct {
	URL           string
	EncryptionHex string
}

func parsePageMetaObj(data []byte) (PageMeta, bool) {
	var p PageMeta
	offset := 0
	for offset < len(data) {
		tag, nOffset := readVarintBytes(data, offset)
		if nOffset == offset {
			break
		}
		fieldNumber := tag >> 3
		wireType := tag & 0x07
		offset = nOffset

		if wireType == 2 {
			length, next := readVarintBytes(data, offset)
			offset = next
			if offset+int(length) <= len(data) {
				strVal := string(data[offset : offset+int(length)])
				offset += int(length)
				if fieldNumber == 1 {
					p.URL = strVal
				} else if fieldNumber == 5 {
					p.EncryptionHex = strVal
				}
			} else {
				break
			}
		} else if wireType == 0 {
			_, next := readVarintBytes(data, offset)
			offset = next
		} else if wireType == 5 {
			offset += 4
		} else if wireType == 1 {
			offset += 8
		} else {
			break
		}
	}
	return p, strings.HasPrefix(p.URL, "http")
}

func walkPagesProto(data []byte, pages *[]PageMeta) {
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

				p, ok := parsePageMetaObj(subData)
				if ok {
					*pages = append(*pages, p)
				} else {
					walkPagesProto(subData, pages)
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

// ExtractChapterIDFromURL extracts chapter ID from a MANGA Plus viewer URL.
func ExtractChapterIDFromURL(viewerURL string) string {
	re := regexp.MustCompile(`viewer/(\d+)`)
	matches := re.FindStringSubmatch(viewerURL)
	if len(matches) >= 2 {
		return matches[1]
	}
	return viewerURL
}
