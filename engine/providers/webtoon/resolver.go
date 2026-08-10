package webtoon

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
	"sync"

	"github.com/PuerkitoBio/goquery"
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/utils"
)

func (p *WebtoonProvider) ResolveComic(rawInput string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	cleanInput := strings.TrimSpace(rawInput)
	var titleNo, lang, genre, titleSlug string

	titleNoRe := regexp.MustCompile(`title_no=(\d+)`)
	if matches := titleNoRe.FindStringSubmatch(cleanInput); len(matches) >= 2 {
		titleNo = matches[1]
	}

	urlSlugRe := regexp.MustCompile(`webtoons\.com/([^/]+)/([^/]+)/([^/]+)/list\?title_no=(\d+)`)
	if matches := urlSlugRe.FindStringSubmatch(cleanInput); len(matches) >= 5 {
		lang = matches[1]
		genre = matches[2]
		titleSlug = matches[3]
		titleNo = matches[4]
	}

	if titleNo == "" {
		if _, err := strconv.Atoi(cleanInput); err == nil {
			titleNo = cleanInput
		}
	}

	if titleNo == "" {
		return nil, nil, fmt.Errorf("could not extract title_no from input")
	}

	if lang == "" {
		lang = p.lang
	}

	listURL := cleanInput
	if !strings.HasPrefix(cleanInput, "http://") && !strings.HasPrefix(cleanInput, "https://") {
		if titleSlug != "" && genre != "" {
			listURL = fmt.Sprintf("https://www.webtoons.com/%s/%s/%s/list?title_no=%s", lang, genre, titleSlug, titleNo)
		} else {
			listURL = fmt.Sprintf("https://www.webtoons.com/%s/episode/list?title_no=%s", lang, titleNo)
		}
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Resolving LINE Webtoon: %s", listURL))
	}

	req, err := http.NewRequest("GET", listURL, nil)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
	req.Header.Set("Referer", "https://www.webtoons.com/")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, nil, fmt.Errorf("HTTP %d when resolving list page", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, nil, err
	}

	finalURL := resp.Request.URL.String()
	if matches := urlSlugRe.FindStringSubmatch(finalURL); len(matches) >= 5 {
		lang = matches[1]
		genre = matches[2]
		titleSlug = matches[3]
		titleNo = matches[4]
	}

	title := ""
	subjTag := doc.Find("h1.subj, .subj_info .subj, .detail_header .subj").First()
	if subjTag.Length() > 0 {
		title = strings.TrimSpace(subjTag.Text())
	}
	if title == "" {
		ogTitle, exists := doc.Find("meta[property='og:title']").Attr("content")
		if exists {
			title = strings.TrimSpace(ogTitle)
		}
	}

	if genre == "" {
		genreTag := doc.Find("h2.genre, .info .genre").First()
		if genreTag.Length() > 0 {
			genre = strings.TrimSpace(genreTag.Text())
		}
	}

	author := ""
	authorTag := doc.Find(".author, .author_area").First()
	if authorTag.Length() > 0 {
		author = strings.TrimSpace(authorTag.Text())
	}

	coverURL := ""
	coverTag, exists := doc.Find("meta[property='og:image']").Attr("content")
	if exists {
		coverURL = coverTag
	}

	info := &model.ComicInfo{
		Source:    p.sourceID,
		Lang:      lang,
		Genre:     genre,
		TitleSlug: titleSlug,
		TitleNo:   titleNo,
		Title:     title,
		Author:    author,
		ListURL:   finalURL,
		CoverURL:  coverURL,
	}

	episodes, err := GetAllWebtoonEpisodes(finalURL, logCb)
	if err != nil {
		return nil, nil, err
	}

	return info, episodes, nil
}

func fetchWebtoonEpisodePage(listURL string, page int, baseURL *url.URL) ([]model.Episode, error) {
	targetURL := listURL
	if page > 1 {
		if strings.Contains(listURL, "?") {
			targetURL = fmt.Sprintf("%s&page=%d", listURL, page)
		} else {
			targetURL = fmt.Sprintf("%s?page=%d", listURL, page)
		}
	}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
	req.Header.Set("Referer", "https://www.webtoons.com/")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		if resp != nil {
			resp.Body.Close()
		}
		return nil, fmt.Errorf("HTTP error for page %d", page)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}

	episodeNoRe := regexp.MustCompile(`episode_no=(\d+)`)
	var pageEpisodes []model.Episode

	doc.Find("#_listUl a, ul.card_lst a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		matches := episodeNoRe.FindStringSubmatch(href)
		if len(matches) < 2 {
			return
		}
		epNo, _ := strconv.Atoi(matches[1])

		subjTag := s.Find("span.subj, .subj")
		title := ""
		if subjTag.Length() > 0 {
			title = strings.TrimSpace(subjTag.Text())
		}

		relURL, _ := url.Parse(href)
		fullURL := baseURL.ResolveReference(relURL).String()

		chNum := fmt.Sprintf("%03d", epNo)
		folderName := utils.SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, title))
		pageEpisodes = append(pageEpisodes, model.Episode{
			EpisodeNo:  epNo,
			Title:      title,
			URL:        fullURL,
			ChNum:      chNum,
			FolderName: folderName,
		})
	})

	return pageEpisodes, nil
}

func GetAllWebtoonEpisodes(listURL string, logCb func(string)) ([]model.Episode, error) {
	epMap := make(map[int]model.Episode)
	var mu sync.Mutex
	baseURL, _ := url.Parse(listURL)

	// Fetch Page 1 first
	p1Episodes, err := fetchWebtoonEpisodePage(listURL, 1, baseURL)
	if err != nil || len(p1Episodes) == 0 {
		return nil, err
	}

	for _, ep := range p1Episodes {
		epMap[ep.EpisodeNo] = ep
	}

	// Fetch subsequent pages in parallel batches of 10
	batchSize := 10
	currentStartPage := 2

	for {
		var wg sync.WaitGroup
		hasEmptyPage := false
		var batchMu sync.Mutex

		for p := 0; p < batchSize; p++ {
			pageNo := currentStartPage + p
			wg.Add(1)
			go func(pNum int) {
				defer wg.Done()
				eps, err := fetchWebtoonEpisodePage(listURL, pNum, baseURL)
				if err != nil || len(eps) == 0 {
					batchMu.Lock()
					hasEmptyPage = true
					batchMu.Unlock()
					return
				}

				mu.Lock()
				newCount := 0
				for _, ep := range eps {
					if _, exists := epMap[ep.EpisodeNo]; !exists {
						epMap[ep.EpisodeNo] = ep
						newCount++
					}
				}
				mu.Unlock()

				if newCount == 0 {
					batchMu.Lock()
					hasEmptyPage = true
					batchMu.Unlock()
				}
			}(pageNo)
		}

		wg.Wait()

		if hasEmptyPage {
			break
		}
		currentStartPage += batchSize
	}

	episodes := make([]model.Episode, 0, len(epMap))
	for _, ep := range epMap {
		episodes = append(episodes, ep)
	}

	sort.Slice(episodes, func(i, j int) bool {
		return episodes[i].EpisodeNo < episodes[j].EpisodeNo
	})

	return episodes, nil
}
