package naver

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/utils"
)

var (
	reNaverTitleIDExtractor = regexp.MustCompile(`titleId=(\d+)`)
	reNaverNumericID        = regexp.MustCompile(`^\d+$`)
)

type naverInfoResponse struct {
	TitleID          int      `json:"titleId"`
	TitleName        string   `json:"titleName"`
	Finished         bool     `json:"finished"`
	PublishDesc      string `json:"publishDescription"`
	CurationTagList  []struct {
		ID      int    `json:"id"`
		TagName string `json:"tagName"`
		TagType string `json:"tagType"`
	} `json:"curationTagList"`
	CommunityArtists []struct {
		ArtistID   int    `json:"artistId"`
		Name       string `json:"name"`
		ArtistType string `json:"artistType"`
	} `json:"communityArtists"`
	Age struct {
		AgeLimit    int    `json:"ageLimit"`
		Description string `json:"description"`
	} `json:"age"`
	FirstArticle struct {
		No           int    `json:"no"`
		Subtitle     string `json:"subtitle"`
		ThumbnailURL string `json:"thumbnailUrl"`
	} `json:"firstArticle"`
}

type naverArticleItem struct {
	No                     int     `json:"no"`
	Subtitle               string  `json:"subtitle"`
	Charge                 bool    `json:"charge"`
	StarScore              float64 `json:"starScore"`
	ThumbnailURL           string  `json:"thumbnailUrl"`
	ServiceDateDescription string  `json:"serviceDateDescription"`
}

type naverArticleListResponse struct {
	TotalCount  int                `json:"totalCount"`
	ArticleList []naverArticleItem `json:"articleList"`
	PageInfo    struct {
		TotalPages int `json:"totalPages"`
		Page       int `json:"page"`
		Size       int `json:"size"`
	} `json:"pageInfo"`
}

// resolveNaverComic extracts comic metadata and full chapter list for a given Naver Webtoon title.
func resolveNaverComic(rawInput string, sourceID string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	cleanInput := strings.TrimSpace(rawInput)
	var titleID string

	if m := reNaverTitleIDExtractor.FindStringSubmatch(cleanInput); len(m) >= 2 {
		titleID = m[1]
	} else if strings.HasPrefix(strings.ToLower(cleanInput), "naver:") {
		titleID = strings.TrimPrefix(cleanInput, "naver:")
		titleID = strings.TrimPrefix(titleID, "NAVER:")
	} else if reNaverNumericID.MatchString(cleanInput) {
		titleID = cleanInput
	}

	if titleID == "" {
		return nil, nil, fmt.Errorf("could not extract Naver Webtoon Title ID from input: %s", rawInput)
	}

	if logCb != nil {
		logCb(fmt.Sprintf("Resolving Naver Webtoon Title #%s...", titleID))
	}

	// Step 1: Fetch title metadata from info API
	infoURL := fmt.Sprintf("https://comic.naver.com/api/article/list/info?titleId=%s", titleID)
	req, err := http.NewRequest("GET", infoURL, nil)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
	req.Header.Set("Referer", fmt.Sprintf("https://comic.naver.com/webtoon/list?titleId=%s", titleID))
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch Naver Webtoon info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("Naver Webtoon info API returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var infoData naverInfoResponse
	if err := json.Unmarshal(body, &infoData); err != nil {
		return nil, nil, fmt.Errorf("failed to parse Naver Webtoon info JSON: %w", err)
	}

	titleName := strings.TrimSpace(infoData.TitleName)
	if titleName == "" {
		titleName = fmt.Sprintf("Naver Webtoon #%s", titleID)
	}

	var authors []string
	for _, a := range infoData.CommunityArtists {
		if a.Name != "" {
			authors = append(authors, a.Name)
		}
	}
	authorStr := strings.Join(authors, " / ")

	genreStr := "Naver Webtoon"
	if len(infoData.CurationTagList) > 0 {
		var tags []string
		for _, t := range infoData.CurationTagList {
			if t.TagName != "" {
				tags = append(tags, t.TagName)
			}
		}
		if len(tags) > 0 {
			genreStr = strings.Join(tags, ", ")
		}
	}

	coverURL := infoData.FirstArticle.ThumbnailURL
	if coverURL == "" {
		coverURL = fmt.Sprintf("https://image-comic.pstatic.net/webtoon/%s/thumbnail/thumbnail_IMAG21_0.jpg", titleID)
	}

	comicInfo := &model.ComicInfo{
		Source:   sourceID,
		Lang:     "ko",
		Genre:    genreStr,
		TitleNo:  titleID,
		Title:    titleName,
		Author:   authorStr,
		ListURL:  fmt.Sprintf("https://comic.naver.com/webtoon/list?titleId=%s", titleID),
		CoverURL: coverURL,
	}

	// Step 2: Fetch Page 1 of chapters to get pagination metrics
	p1URL := fmt.Sprintf("https://comic.naver.com/api/article/list?titleId=%s&page=1", titleID)
	p1Req, err := http.NewRequest("GET", p1URL, nil)
	if err != nil {
		return nil, nil, err
	}
	p1Req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
	p1Req.Header.Set("Referer", comicInfo.ListURL)
	p1Req.Header.Set("Accept", "application/json, text/plain, */*")
	p1Req.Header.Set("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")

	p1Resp, err := utils.FastHTTPClient.Do(p1Req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch Naver Webtoon chapters page 1: %w", err)
	}
	defer p1Resp.Body.Close()

	if p1Resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("Naver Webtoon chapter list returned HTTP %d", p1Resp.StatusCode)
	}

	p1Body, err := io.ReadAll(p1Resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var p1Data naverArticleListResponse
	if err := json.Unmarshal(p1Body, &p1Data); err != nil {
		return nil, nil, fmt.Errorf("failed to parse Naver Webtoon chapters page 1 JSON: %w", err)
	}

	totalPages := p1Data.PageInfo.TotalPages
	if totalPages < 1 {
		pageSize := len(p1Data.ArticleList)
		if pageSize < 1 {
			pageSize = 20
		}
		totalPages = (p1Data.TotalCount + pageSize - 1) / pageSize
		if totalPages < 1 {
			totalPages = 1
		}
	}

	// Step 3: Concurrently fetch remaining pages (Pages 2 through totalPages)
	type pageResult struct {
		page     int
		articles []naverArticleItem
		err      error
	}

	resChan := make(chan pageResult, totalPages)
	resChan <- pageResult{page: 1, articles: p1Data.ArticleList}

	if totalPages > 1 {
		var wg sync.WaitGroup
		sem := make(chan struct{}, 4)

		for p := 2; p <= totalPages; p++ {
			wg.Add(1)
			go func(pageNum int) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				pageURL := fmt.Sprintf("https://comic.naver.com/api/article/list?titleId=%s&page=%d", titleID, pageNum)
				var pageArticles []naverArticleItem
				var fetchErr error

				for attempt := 0; attempt < 3; attempt++ {
					req, err := http.NewRequest("GET", pageURL, nil)
					if err != nil {
						fetchErr = err
						continue
					}
					req.Header.Set("User-Agent", utils.GetRandomUserAgent(pageNum+attempt))
					req.Header.Set("Referer", comicInfo.ListURL)
					req.Header.Set("Accept", "application/json, text/plain, */*")
					req.Header.Set("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")

					resp, err := utils.FastHTTPClient.Do(req)
					if err != nil {
						fetchErr = err
						time.Sleep(time.Duration(150*(attempt+1)) * time.Millisecond)
						continue
					}

					if resp.StatusCode != http.StatusOK {
						resp.Body.Close()
						fetchErr = fmt.Errorf("HTTP status %d", resp.StatusCode)
						time.Sleep(time.Duration(150*(attempt+1)) * time.Millisecond)
						continue
					}

					bodyBytes, err := io.ReadAll(resp.Body)
					resp.Body.Close()
					if err != nil {
						fetchErr = err
						continue
					}

					var parsed naverArticleListResponse
					if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
						fetchErr = err
						continue
					}

					pageArticles = parsed.ArticleList
					fetchErr = nil
					break
				}

				resChan <- pageResult{page: pageNum, articles: pageArticles, err: fetchErr}
			}(p)
		}

		wg.Wait()
	}
	close(resChan)

	// Step 4: Aggregate and deduplicate chapters
	seenChapters := make(map[int]bool)
	var rawEpisodes []model.Episode

	for pr := range resChan {
		if pr.err != nil {
			if logCb != nil {
				logCb(fmt.Sprintf("Warning: could not fetch Naver chapter page %d: %v", pr.page, pr.err))
			}
			continue
		}
		for _, art := range pr.articles {
			if art.No <= 0 || seenChapters[art.No] {
				continue
			}
			seenChapters[art.No] = true

			subTitle := strings.TrimSpace(art.Subtitle)
			if subTitle == "" {
				subTitle = fmt.Sprintf("Chapter %d", art.No)
			}

			epURL := fmt.Sprintf("https://comic.naver.com/webtoon/detail?titleId=%s&no=%d", titleID, art.No)
			rawEpisodes = append(rawEpisodes, model.Episode{
				EpisodeNo: art.No,
				Title:     subTitle,
				URL:       epURL,
			})
		}
	}

	if len(rawEpisodes) == 0 {
		return nil, nil, fmt.Errorf("no chapters found for Naver Webtoon #%s", titleID)
	}

	// Sort chronologically from Chapter 1 upwards
	sort.Slice(rawEpisodes, func(i, j int) bool {
		return rawEpisodes[i].EpisodeNo < rawEpisodes[j].EpisodeNo
	})

	// Assign clean standardized display numbers and folder names
	episodes := utils.AssignChapterDisplayNumbers(rawEpisodes)

	if logCb != nil {
		logCb(fmt.Sprintf("Successfully resolved '%s' (%d chapters).", comicInfo.Title, len(episodes)))
	}

	return comicInfo, episodes, nil
}
