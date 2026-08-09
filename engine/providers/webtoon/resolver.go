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

func GetAllWebtoonEpisodes(listURL string, logCb func(string)) ([]model.Episode, error) {
	epMap := make(map[int]model.Episode)
	baseURL, _ := url.Parse(listURL)
	page := 1

	for {
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
			break
		}
		req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
		req.Header.Set("Referer", "https://www.webtoons.com/")

		resp, err := utils.HTTPClient.Do(req)
		if err != nil || resp.StatusCode != 200 {
			if resp != nil {
				resp.Body.Close()
			}
			break
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		resp.Body.Close()
		if err != nil {
			break
		}

		episodeNoRe := regexp.MustCompile(`episode_no=(\d+)`)
		newInPage := 0

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

			if _, exists := epMap[epNo]; !exists {
				chNum := fmt.Sprintf("%03d", epNo)
				folderName := utils.SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, title))
				epMap[epNo] = model.Episode{
					EpisodeNo:  epNo,
					Title:      title,
					URL:        fullURL,
					ChNum:      chNum,
					FolderName: folderName,
				}
				newInPage++
			}
		})

		if newInPage == 0 {
			break
		}
		page++
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
