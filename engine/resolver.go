package engine

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// WebtoonInfo stores parsed details about a Webtoon.
type WebtoonInfo struct {
	Lang      string
	Genre     string
	TitleSlug string
	TitleNo   string
	Title     string
	ListURL   string
}

// Episode stores parsed details about an episode/chapter.
type Episode struct {
	EpisodeNo  int
	Title      string
	URL        string
	ChNum      string
	FolderName string
}

// ResolveWebtoonInfo resolves Webtoon details from a URL or title_no ID.
func ResolveWebtoonInfo(inputStr, lang string, logCb func(string)) (*WebtoonInfo, error) {
	inputStr = strings.TrimSpace(inputStr)
	if inputStr == "" {
		return nil, fmt.Errorf("input string is empty")
	}

	var titleNo string
	if isDigit(inputStr) {
		titleNo = inputStr
	} else {
		re := regexp.MustCompile(`title_no=(\d+)`)
		matches := re.FindStringSubmatch(inputStr)
		if len(matches) > 1 {
			titleNo = matches[1]
		}
	}

	if titleNo == "" {
		if logCb != nil {
			logCb("[Error] Unable to find Webtoon ID (title_no) from the input.")
		}
		return nil, fmt.Errorf("invalid title_no")
	}

	var candidateURL string
	if strings.HasPrefix(strings.ToLower(inputStr), "http") {
		candidateURL = inputStr
	} else {
		candidateURL = fmt.Sprintf("https://www.webtoons.com/%s/drama/comic/list?title_no=%s", lang, titleNo)
	}

	var resp *http.Response
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		req, reqErr := http.NewRequest("GET", candidateURL, nil)
		if reqErr != nil {
			err = reqErr
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Referer", "https://www.webtoons.com/")
		req.Header.Set("Accept-Language", fmt.Sprintf("%s,en-US;q=0.9,en;q=0.8", lang))

		resp, err = HTTPClient.Do(req)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(time.Duration(attempt*300) * time.Millisecond)
	}

	if err != nil || resp == nil || resp.StatusCode != 200 {
		if logCb != nil {
			logCb(fmt.Sprintf("[Error] Failed to reach the server after 3 attempts: %v", err))
		}
		return nil, fmt.Errorf("failed to connect to Webtoon server: %v", err)
	}
	defer resp.Body.Close()

	finalURL := resp.Request.URL.String()
	genre := "drama"
	titleSlug := "comic"
	detectedLang := lang

	urlRe := regexp.MustCompile(`webtoons\.com/([^/]+)/([^/]+)/([^/]+)/list`)
	urlMatches := urlRe.FindStringSubmatch(finalURL)
	if len(urlMatches) > 3 {
		detectedLang = urlMatches[1]
		genre = urlMatches[2]
		titleSlug = urlMatches[3]
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	title := ""
	doc.Find("h1.subj").Each(func(i int, s *goquery.Selection) {
		title = strings.TrimSpace(s.Text())
	})

	if title == "" {
		title, _ = doc.Find("meta[property='og:title']").Attr("content")
		title = strings.TrimSpace(title)
	}

	return &WebtoonInfo{
		Lang:      detectedLang,
		Genre:     genre,
		TitleSlug: titleSlug,
		TitleNo:   titleNo,
		Title:     title,
		ListURL:   CleanListURL(finalURL),
	}, nil
}

func CleanListURL(rawURL string) string {
	re := regexp.MustCompile(`([?&])page=\d+&?`)
	cleaned := re.ReplaceAllString(rawURL, "$1")
	cleaned = strings.TrimSuffix(cleaned, "?")
	cleaned = strings.TrimSuffix(cleaned, "&")
	return cleaned
}

// GetAllEpisodes fetches all episode details dynamically page-by-page.
func GetAllEpisodes(listURL string, logCb func(string)) ([]Episode, error) {
	listURL = CleanListURL(listURL)
	var episodes []Episode
	seenEpisodes := make(map[int]bool)
	page := 1

	for {
		if logCb != nil && (page == 1 || page%5 == 0) {
			logCb(fmt.Sprintf(" -> Loading episode list page (%d)...", page))
		}

		eps := fetchEpisodePage(listURL, page, logCb)
		if len(eps) == 0 {
			// End of episode pages
			break
		}

		newCount := 0
		for _, ep := range eps {
			if !seenEpisodes[ep.EpisodeNo] {
				seenEpisodes[ep.EpisodeNo] = true
				episodes = append(episodes, ep)
				newCount++
			}
		}

		if newCount == 0 {
			break
		}

		page++
		time.Sleep(30 * time.Millisecond)
	}

	if len(episodes) == 0 {
		return nil, fmt.Errorf("0 episodes found")
	}

	sort.Slice(episodes, func(i, j int) bool {
		return episodes[i].EpisodeNo < episodes[j].EpisodeNo
	})

	// Pre-calculate folder names for season/specials alignment
	lastMainEp := 0.0
	specialCount := 0
	seasonOffsets := make(map[int]float64)

	seasonPattern := regexp.MustCompile(`(?i)(?:S|Season\s*)(\d+)\s*Ep\.?\s*(\d+(?:\.\d+)?)`)
	epPattern := regexp.MustCompile(`(?i)(?:[Ee]p\.?\s*|Episode\s*|Ep\s+)(\d+(?:\.\d+)?)`)

	for i := range episodes {
		title := episodes[i].Title
		sMatches := seasonPattern.FindStringSubmatch(title)
		var chNum string

		if len(sMatches) > 2 {
			season, _ := strconv.Atoi(sMatches[1])
			epVal, _ := strconv.ParseFloat(sMatches[2], 64)

			actualEp := epVal
			if season > 1 {
				if _, exists := seasonOffsets[season]; !exists {
					seasonOffsets[season] = lastMainEp
				}
				actualEp = seasonOffsets[season] + epVal
			}
			lastMainEp = actualEp
			specialCount = 0
			chNum = FormatFloatEp(actualEp)
		} else {
			epMatches := epPattern.FindStringSubmatch(title)
			if len(epMatches) > 1 {
				actualEp, _ := strconv.ParseFloat(epMatches[1], 64)
				lastMainEp = actualEp
				specialCount = 0
				chNum = FormatFloatEp(actualEp)
			} else {
				specialCount++
				if specialCount == 1 {
					chNum = fmt.Sprintf("%03d.5", int(lastMainEp))
				} else {
					chNum = fmt.Sprintf("%03d.5.%d", int(lastMainEp), specialCount-1)
				}
			}
		}

		episodes[i].ChNum = chNum
		episodes[i].FolderName = SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, title))
	}

	return episodes, nil
}

func fetchEpisodePage(listURL string, pageNum int, logCb func(string)) []Episode {
	sep := "?"
	if strings.Contains(listURL, "?") {
		sep = "&"
	}
	pageURL := fmt.Sprintf("%s%spage=%d", listURL, sep, pageNum)
	fmt.Printf("[DEBUG-BACKEND] Requesting page %d: %s\n", pageNum, pageURL)

	var resp *http.Response
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		req, reqErr := http.NewRequest("GET", pageURL, nil)
		if reqErr != nil {
			err = reqErr
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Referer", "https://www.webtoons.com/")
		req.Header.Set("Accept-Language", "id,en-US;q=0.9,en;q=0.8")

		resp, err = HTTPClient.Do(req)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if resp != nil {
			fmt.Printf("[DEBUG-BACKEND] Attempt %d failed for page %d (Status: %d, Err: %v)\n", attempt, pageNum, resp.StatusCode, err)
			resp.Body.Close()
		}
		time.Sleep(time.Duration(attempt*300) * time.Millisecond)
	}

	if resp == nil || resp.StatusCode != 200 {
		fmt.Printf("[DEBUG-BACKEND] Page %d failed completely (Status: %v, Err: %v)\n", pageNum, resp, err)
		return nil
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[DEBUG-BACKEND] Page %d read body error: %v\n", pageNum, err)
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(bodyBytes))
	if err != nil {
		fmt.Printf("[DEBUG-BACKEND] Page %d goquery parse error: %v\n", pageNum, err)
		return nil
	}

	var eps []Episode
	baseURL, _ := url.Parse(pageURL)

	doc.Find("li._episodeItem").Each(func(i int, s *goquery.Selection) {
		epNoStr, exists := s.Attr("data-episode-no")
		if !exists {
			return
		}
		epNo, _ := strconv.Atoi(epNoStr)

		aTag := s.Find("a")
		href, hasHref := aTag.Attr("href")
		if !hasHref {
			return
		}

		relURL, _ := url.Parse(href)
		viewerURL := baseURL.ResolveReference(relURL).String()

		subjSpan := s.Find("span.subj")
		title := strings.TrimSpace(subjSpan.Text())
		if title == "" {
			title = fmt.Sprintf("Ep. %d", epNo)
		}

		eps = append(eps, Episode{
			EpisodeNo: epNo,
			Title:     title,
			URL:       viewerURL,
		})
	})

	fmt.Printf("[DEBUG-BACKEND] Page %d returned %d episodes (Body bytes: %d)\n", pageNum, len(eps), len(bodyBytes))
	if len(eps) == 0 && pageNum == 1 {
		fmt.Printf("[DEBUG-BACKEND] WARNING: Page 1 returned 0 episodes! HTML snippet: %.300s\n", string(bodyBytes))
	}

	return eps
}

func isDigit(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}
