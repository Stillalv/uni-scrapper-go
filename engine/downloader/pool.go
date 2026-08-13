package downloader

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/PuerkitoBio/goquery"
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers/mangaplus"
	"uni-scraper-go/engine/utils"
)

// chapterScanResult holds pre-scanned image URLs for a single chapter
type chapterScanResult struct {
	ChIdx          int
	Episode        model.Episode
	ImageURLs      []string
	EncryptionKeys []string
	HasBanner      bool
	ChapterDir     string
	ChNum          string
}

// extractImageURLs fetches a chapter viewer page and extracts all image URLs
func extractImageURLs(viewerURL string, userAgent string) ([]string, []string, bool, error) {
	if strings.Contains(viewerURL, "mangaplus.shueisha.co.jp") {
		chID := mangaplus.ExtractChapterIDFromURL(viewerURL)
		urls, keys, err := mangaplus.FetchChapterPages(chID)
		if err != nil {
			return nil, nil, false, err
		}
		return urls, keys, false, nil
	}

	if userAgent == "" {
		userAgent = utils.DefaultHeaders["User-Agent"]
	}

	var resp *http.Response
	var err error

	for attempt := 0; attempt < 5; attempt++ {
		req, reqErr := http.NewRequest("GET", viewerURL, nil)
		if reqErr != nil {
			return nil, nil, false, reqErr
		}
		req.Header.Set("User-Agent", userAgent)
		req.Header.Set("Referer", "https://www.webtoons.com/")
		req.Header.Set("Accept-Language", "id,en-US;q=0.9,en;q=0.8")

		resp, err = utils.FastHTTPClient.Do(req)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(time.Duration(100*(1<<attempt)) * time.Millisecond)
	}

	if err != nil {
		return nil, nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, nil, false, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, false, err
	}

	htmlContent := string(bodyBytes)
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		return nil, nil, false, err
	}

	var bannerURL string
	var panelURLs []string

	isBanner := func(s string) bool {
		sl := strings.ToLower(s)
		return strings.Contains(sl, "warning") || strings.Contains(sl, "notice_") || strings.Contains(sl, "banner_")
	}

	isIgnored := func(s string) bool {
		sl := strings.ToLower(s)
		return s == "" || strings.Contains(sl, "bg_transparency.png") || strings.Contains(sl, "thumb_")
	}

	doc.Find("#_imageList img._images, #_imageList img").Each(func(i int, s *goquery.Selection) {
		classAttr, _ := s.Attr("class")
		if strings.Contains(classAttr, "_thumbnailImages") {
			return
		}
		src, _ := s.Attr("data-url")
		if src == "" {
			src, _ = s.Attr("src")
		}
		if isIgnored(src) {
			return
		}
		if isBanner(src) {
			if bannerURL == "" {
				bannerURL = src
			}
			return
		}
		panelURLs = append(panelURLs, src)
	})

	if len(panelURLs) == 0 {
		doc.Find("img._images").Each(func(i int, s *goquery.Selection) {
			classAttr, _ := s.Attr("class")
			if strings.Contains(classAttr, "_thumbnailImages") {
				return
			}
			src, _ := s.Attr("data-url")
			if src == "" {
				src, _ = s.Attr("src")
			}
			if isIgnored(src) {
				return
			}
			if isBanner(src) {
				if bannerURL == "" {
					bannerURL = src
				}
				return
			}
			panelURLs = append(panelURLs, src)
		})
	}

	var finalURLs []string
	hasBanner := bannerURL != ""
	if hasBanner {
		finalURLs = append(finalURLs, bannerURL)
	}
	finalURLs = append(finalURLs, panelURLs...)

	return finalURLs, nil, hasBanner, nil
}

func downloadSingleImage(task model.ImageTask, filePath string, cfg model.DownloadConfig) bool {
	dirPath := filepath.Dir(filePath)
	_ = os.MkdirAll(dirPath, 0755)

	ua := utils.GetRandomUserAgent(task.Index)

	for attempt := 0; attempt < 4; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(100*(1<<attempt)) * time.Millisecond)
		}

		req, err := http.NewRequest("GET", task.URL, nil)
		if err != nil {
			return false
		}
		req.Header.Set("User-Agent", ua)
		if strings.Contains(task.URL, "tokyo-cdn.com") || strings.Contains(task.Viewer, "mangaplus") || task.EncryptionKey != "" {
			req.Header.Set("Referer", "https://mangaplus.shueisha.co.jp/")
			req.Header.Set("Origin", "https://mangaplus.shueisha.co.jp")
		} else {
			req.Header.Set("Referer", task.Viewer)
		}

		resp, err := utils.HTTPClient.Do(req)
		if err != nil {
			continue
		}

		if resp.StatusCode != 200 {
			resp.Body.Close()
			continue
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil || len(bodyBytes) == 0 {
			continue
		}

		if task.EncryptionKey != "" {
			bodyBytes = mangaplus.XORDecrypt(bodyBytes, task.EncryptionKey)
		}

		err = os.WriteFile(filePath, bodyBytes, 0644)
		if err == nil && len(bodyBytes) > 0 {
			return true
		}

		_ = os.Remove(filePath)
	}
	return false
}

func DownloadEpisodesWithGranularProgress(
	info *model.ComicInfo,
	selected []model.Episode,
	cfg model.DownloadConfig,
	progressCb func(map[string]interface{}),
) (int, int, int) {
	imgFormat := strings.ToUpper(cfg.Format)
	ext := ".webp"
	if imgFormat == "JPEG" || imgFormat == "JPG" {
		ext = ".jpg"
	} else if imgFormat == "PNG" {
		ext = ".png"
	}

	comicFolder := utils.SanitizeFilename(info.Title)
	targetBase := filepath.Join(cfg.OutputDir, comicFolder)
	_ = os.MkdirAll(targetBase, 0755)

	totalCh := len(selected)

	scannedChapters := make([]chapterScanResult, totalCh)
	var totalImages int32 = 0
	var scannedCount int32 = 0

	for chIdx, ep := range selected {
		chNum := ep.ChNum
		if chNum == "" {
			chNum = fmt.Sprintf("%03d", ep.EpisodeNo)
		}
		folderName := ep.FolderName
		if folderName == "" {
			folderName = utils.SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, ep.Title))
		}
		chapterDir := filepath.Join(targetBase, folderName)

		scannedChapters[chIdx] = chapterScanResult{
			ChIdx:      chIdx,
			Episode:    ep,
			ImageURLs:  nil,
			ChapterDir: chapterDir,
			ChNum:      chNum,
		}
	}

	scanWorkers := cfg.MaxWorkers
	if scanWorkers < 8 {
		scanWorkers = 8
	}
	if scanWorkers > 32 {
		scanWorkers = 32
	}
	if scanWorkers > totalCh {
		scanWorkers = totalCh
	}
	scanChan := make(chan int, totalCh)
	for i := 0; i < totalCh; i++ {
		scanChan <- i
	}
	close(scanChan)

	var scanWg sync.WaitGroup
	for sw := 0; sw < scanWorkers; sw++ {
		scanWg.Add(1)
		go func() {
			defer scanWg.Done()
			for chIdx := range scanChan {
				if cfg.StopRequested != nil && atomic.LoadInt32(cfg.StopRequested) == 1 {
					return
				}

				ep := selected[chIdx]
				ua := utils.GetRandomUserAgent(chIdx)
				imageURLs, keys, hasBanner, err := extractImageURLs(ep.URL, ua)
				if err == nil && len(imageURLs) > 0 {
					scannedChapters[chIdx].ImageURLs = imageURLs
					scannedChapters[chIdx].EncryptionKeys = keys
					scannedChapters[chIdx].HasBanner = hasBanner
					atomic.AddInt32(&totalImages, int32(len(imageURLs)))
				}

				done := atomic.AddInt32(&scannedCount, 1)

				if progressCb != nil {
					progressCb(map[string]interface{}{
						"type":            "SCANNING",
						"status":          fmt.Sprintf("Scanning chapters... (%d/%d)", done, totalCh),
						"scannedChapters": done,
						"totalChapters":   totalCh,
						"totalImages":     atomic.LoadInt32(&totalImages),
						"percentage":      0.0,
					})
				}
			}
		}()
	}
	scanWg.Wait()

	if cfg.StopRequested != nil && atomic.LoadInt32(cfg.StopRequested) == 1 {
		return 0, totalCh, 0
	}

	finalTotalImages := int(atomic.LoadInt32(&totalImages))
	if finalTotalImages == 0 {
		finalTotalImages = 1
	}

	allTasks := make(chan model.ImageTask, finalTotalImages)
	chapterCounts := make(map[int]int)
	chapterFinishedSlice := make([]int32, totalCh)
	var latestDoneChapter int32 = -1
	var drainChapter int32 = -1

	for _, scan := range scannedChapters {
		if len(scan.ImageURLs) == 0 {
			continue
		}
		chImgCount := len(scan.ImageURLs)
		chapterCounts[scan.ChIdx] = chImgCount

		for i, imgURL := range scan.ImageURLs {
			taskIdx := i + 1
			if scan.HasBanner {
				taskIdx = i
			}
			encKey := ""
			if i < len(scan.EncryptionKeys) {
				encKey = scan.EncryptionKeys[i]
			}
			allTasks <- model.ImageTask{
				Index:              taskIdx,
				URL:                imgURL,
				EncryptionKey:      encKey,
				Viewer:             scan.Episode.URL,
				Dir:                scan.ChapterDir,
				Ext:                ext,
				Format:             imgFormat,
				ChNum:              scan.ChNum,
				ChIdx:              scan.ChIdx,
				ChapterTotalImages: chImgCount,
			}
		}
	}
	close(allTasks)

	workerList := make([]model.WorkerStatus, cfg.MaxWorkers)
	for i := 0; i < cfg.MaxWorkers; i++ {
		workerList[i] = model.WorkerStatus{ID: i + 1, ImageFile: "-", Status: "Waiting...", Active: false}
	}
	var workerMu sync.Mutex
	var totalDownloaded int32 = 0
	var successCh int32 = 0

	var wg sync.WaitGroup
	for w := 0; w < cfg.MaxWorkers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			defer func() {
				workerMu.Lock()
				if workerID-1 < len(workerList) {
					workerList[workerID-1] = model.WorkerStatus{ID: workerID, ImageFile: "-", Status: "Idle", Active: false}
				}
				workerMu.Unlock()
			}()

			for task := range allTasks {
				if cfg.StopRequested != nil && atomic.LoadInt32(cfg.StopRequested) == 1 {
					if atomic.LoadInt32(&drainChapter) == -1 {
						atomic.CompareAndSwapInt32(&drainChapter, -1, atomic.LoadInt32(&latestDoneChapter))
					}
					if atomic.LoadInt32(&drainChapter) != int32(task.ChIdx) {
						return
					}
				}

				fileName := fmt.Sprintf("%03d%s", task.Index, task.Ext)
				filePath := filepath.Join(task.Dir, fileName)

				workerMu.Lock()
				if workerID-1 < len(workerList) {
					workerList[workerID-1] = model.WorkerStatus{
						ID:        workerID,
						ImageFile: fileName,
						Status:    fmt.Sprintf("Image #%d (%s)", task.Index, fileName),
						Progress:  (float64(task.Index) / float64(task.ChapterTotalImages)) * 100.0,
						Active:    true,
					}
				}
				workerMu.Unlock()

				if fi, err := os.Stat(filePath); err == nil && fi.Size() > 0 {
					// Skip existing file
				} else {
					_ = downloadSingleImage(task, filePath, cfg)
				}

				currentTotal := atomic.AddInt32(&totalDownloaded, 1)
				chDone := atomic.AddInt32(&chapterFinishedSlice[task.ChIdx], 1)

				for {
					cur := atomic.LoadInt32(&latestDoneChapter)
					if int32(task.ChIdx) <= cur || atomic.CompareAndSwapInt32(&latestDoneChapter, cur, int32(task.ChIdx)) {
						break
					}
				}

				pct := (float64(currentTotal) / float64(finalTotalImages)) * 100.0
				if pct > 100.0 {
					pct = 100.0
				}

				if progressCb != nil {
					workerMu.Lock()
					activeWorkerCopy := make([]model.WorkerStatus, len(workerList))
					copy(activeWorkerCopy, workerList)
					workerMu.Unlock()

					progressCb(map[string]interface{}{
						"type":               "PROGRESS_UPDATE",
						"status":             fmt.Sprintf("Downloading Chapter %s (%d/%d)...", task.ChNum, task.ChIdx+1, totalCh),
						"totalChapters":      totalCh,
						"completedChapters":  task.ChIdx,
						"totalImages":        finalTotalImages,
						"downloadedImages":   currentTotal,
						"percentage":         pct,
						"currentChapter":     task.ChIdx + 1,
						"currentImage":       chDone,
						"chapterTotalImages": task.ChapterTotalImages,
						"activeWorkers":      activeWorkerCopy,
					})
				}

				if int(chDone) == task.ChapterTotalImages {
					atomic.AddInt32(&successCh, 1)
					if progressCb != nil {
						progressCb(map[string]interface{}{
							"type":          "CHAPTER_FINISHED",
							"chapterTitle":  fmt.Sprintf("Chapter %s", task.ChNum),
							"chapterNum":    task.ChNum,
							"chapterIdx":    task.ChIdx + 1,
							"totalChapters": totalCh,
							"imageCount":    task.ChapterTotalImages,
							"format":        cfg.Format,
							"outputDir":     task.Dir,
							"timestamp":     time.Now().Format("15:04:05"),
						})
					}
				}
			}
		}(w + 1)
	}

	wg.Wait()

	// Automatic cleanup pass: Remove any chapter folders created that have 0 files inside
	for _, scan := range scannedChapters {
		if scan.ChapterDir != "" {
			utils.RemoveEmptyDir(scan.ChapterDir)
		}
	}
	utils.RemoveEmptyDir(targetBase)

	if progressCb != nil && (cfg.StopRequested == nil || atomic.LoadInt32(cfg.StopRequested) == 0) {
		workerMu.Lock()
		for i := 0; i < cfg.MaxWorkers; i++ {
			workerList[i] = model.WorkerStatus{ID: i + 1, ImageFile: "-", Status: "Idle", Active: false}
		}
		finalWorkers := make([]model.WorkerStatus, len(workerList))
		copy(finalWorkers, workerList)
		workerMu.Unlock()

		progressCb(map[string]interface{}{
			"type":               "PROGRESS_UPDATE",
			"status":             "Complete! All chapters downloaded successfully (100%)",
			"totalChapters":      totalCh,
			"completedChapters":  totalCh,
			"totalImages":        finalTotalImages,
			"downloadedImages":   totalDownloaded,
			"percentage":         100.0,
			"currentChapter":     totalCh,
			"currentImage":       0,
			"chapterTotalImages": 0,
			"activeWorkers":      finalWorkers,
		})
	}

	return int(successCh), totalCh, int(totalDownloaded)
}

func RunActualWorkerBenchmark(workers int) map[string]interface{} {
	if workers < 1 {
		workers = 6
	}

	sampleURLs := []string{
		"https://webtoon-phinf.pstatic.net/20231215_245/1702621927702SjR4Q_JPEG/1.jpg",
		"https://webtoon-phinf.pstatic.net/20231215_282/1702621927734aF252_JPEG/2.jpg",
		"https://webtoon-phinf.pstatic.net/20231215_110/1702621927768oE1Sg_JPEG/3.jpg",
		"https://webtoon-phinf.pstatic.net/20231215_239/17026219278028mKkH_JPEG/4.jpg",
		"https://webtoon-phinf.pstatic.net/20231215_187/17026219278385jB6L_JPEG/5.jpg",
	}

	taskURLs := make([]string, 0, 30)
	for i := 0; i < 6; i++ {
		taskURLs = append(taskURLs, sampleURLs...)
	}

	taskChan := make(chan string, len(taskURLs))
	for _, u := range taskURLs {
		taskChan <- u
	}
	close(taskChan)

	var wg sync.WaitGroup
	var downloadedCount int32
	var totalBytesDownloaded int64

	startTime := time.Now()

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for taskURL := range taskChan {
				req, err := http.NewRequest("GET", taskURL, nil)
				if err != nil {
					continue
				}
				req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])
				req.Header.Set("Referer", "https://www.webtoons.com/")

				resp, err := utils.HTTPClient.Do(req)
				if err != nil {
					continue
				}

				if resp.StatusCode == 200 {
					written, _ := io.Copy(io.Discard, resp.Body)
					atomic.AddInt32(&downloadedCount, 1)
					atomic.AddInt64(&totalBytesDownloaded, written)
				}
				resp.Body.Close()
			}
		}()
	}

	wg.Wait()
	elapsed := time.Since(startTime)

	elapsedSec := elapsed.Seconds()
	if elapsedSec <= 0 {
		elapsedSec = 0.001
	}

	count := float64(downloadedCount)
	if count == 0 {
		count = 1
	}
	imgsPerSec := count / elapsedSec
	mbps := (float64(totalBytesDownloaded) * 8.0) / (elapsedSec * 1000000.0)
	latencyMs := float64(elapsed.Milliseconds()) / count

	return map[string]interface{}{
		"threads":    workers,
		"speed":      fmt.Sprintf("%.1f", imgsPerSec),
		"bandwidth":  fmt.Sprintf("%.1f", mbps),
		"latency":    fmt.Sprintf("%.0f ms", latencyMs),
		"elapsedSec": fmt.Sprintf("%.2fs", elapsedSec),
		"downloaded": downloadedCount,
	}
}
