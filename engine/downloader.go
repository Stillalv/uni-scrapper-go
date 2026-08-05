package engine

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// HTTPClient is the shared HTTP client tuned for high-speed multi-simultaneous connections.
var HTTPClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:          1000,
		MaxIdleConnsPerHost:   500,
		MaxConnsPerHost:       500,
		IdleConnTimeout:       120 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		DisableKeepAlives:     false,
		WriteBufferSize:       64 * 1024,
		ReadBufferSize:        64 * 1024,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
	},
}

// DownloadConfig holds settings for downloading episodes.
type DownloadConfig struct {
	OutputDir     string
	Format        string // WEBP, JPEG, PNG
	MaxWorkers    int
	Quality       int
	StopRequested *int32 // Atomic flag
}

type imageTask struct {
	Index              int
	URL                string
	Viewer             string
	Dir                string
	Ext                string
	Format             string
	GlobalIndex        int // Absolute index across ALL chapters (for smooth progress)
	ChNum              string
	ChIdx              int
	ChapterTotalImages int
}

type WorkerStatus struct {
	ID        int     `json:"id"`
	ImageFile string  `json:"imageFile"`
	Status    string  `json:"status"`
	Progress  float64 `json:"progress"`
	Active    bool    `json:"active"`
}

// chapterScanResult holds pre-scanned image URLs for a single chapter
type chapterScanResult struct {
	ChIdx      int
	Episode    Episode
	ImageURLs  []string
	ChapterDir string
	ChNum      string
}

var defaultHeaders = map[string]string{
	"User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Accept-Language": "id,en-US;q=0.9,en;q=0.8",
}

// extractImageURLs fetches a chapter viewer page and extracts all image URLs
func extractImageURLs(viewerURL string) ([]string, error) {
	req, err := http.NewRequest("GET", viewerURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", defaultHeaders["User-Agent"])
	req.Header.Set("Referer", "https://www.webtoons.com/")

	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	htmlContent := string(bodyBytes)
	var imageURLs []string

	// Fast regex extraction
	re := regexp.MustCompile(`data-url="([^"]+)"`)
	matches := re.FindAllStringSubmatch(htmlContent, -1)
	for _, m := range matches {
		if len(m) > 1 && !strings.Contains(m[1], "bg_transparency.png") {
			imageURLs = append(imageURLs, m[1])
		}
	}

	// Fallback regex for class="_images"
	if len(imageURLs) == 0 {
		imgRe := regexp.MustCompile(`<img[^>]+class="[^"]*_images[^"]*"[^>]+(?:data-url|src)="([^"]+)"`)
		matches2 := imgRe.FindAllStringSubmatch(htmlContent, -1)
		for _, m := range matches2 {
			if len(m) > 1 && !strings.Contains(m[1], "bg_transparency.png") {
				imageURLs = append(imageURLs, m[1])
			}
		}
	}

	// Fallback to goquery
	if len(imageURLs) == 0 {
		doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
		if err == nil {
			doc.Find("#_itemList img, img._images").Each(func(i int, s *goquery.Selection) {
				src, _ := s.Attr("data-url")
				if src == "" {
					src, _ = s.Attr("src")
				}
				if src != "" && !strings.Contains(src, "bg_transparency.png") {
					imageURLs = append(imageURLs, src)
				}
			})
		}
	}

	return imageURLs, nil
}

// downloadSingleImage downloads a single image with retry logic
func downloadSingleImage(task imageTask, filePath string, cfg DownloadConfig) bool {
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequest("GET", task.URL, nil)
		if err != nil {
			return false
		}
		for k, v := range defaultHeaders {
			req.Header.Set(k, v)
		}
		req.Header.Set("Referer", task.Viewer)

		resp, err := HTTPClient.Do(req)
		if err != nil {
			time.Sleep(50 * time.Millisecond)
			continue
		}

		if resp.StatusCode != 200 {
			resp.Body.Close()
			time.Sleep(50 * time.Millisecond)
			continue
		}

		// Zero-Allocation Stream Copy: Stream network bytes directly to file
		outFile, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			resp.Body.Close()
			time.Sleep(50 * time.Millisecond)
			continue
		}

		written, err := io.Copy(outFile, resp.Body)
		resp.Body.Close()
		_ = outFile.Close()

		if err == nil && written > 0 {
			return true
		}

		_ = os.Remove(filePath)
		time.Sleep(50 * time.Millisecond)
	}
	return false
}

// DownloadEpisodesWithGranularProgress downloads selected episodes with real-time SSE progress tracking.
// Phase 1: Pre-scan ALL chapters to get exact total image count (no estimation).
// Phase 2: Download all images with smooth, monotonically increasing progress.
func DownloadEpisodesWithGranularProgress(
	info *WebtoonInfo,
	selected []Episode,
	cfg DownloadConfig,
	progressCb func(map[string]interface{}),
) (int, int) {
	imgFormat := strings.ToUpper(cfg.Format)
	ext := ".webp"
	if imgFormat == "JPEG" || imgFormat == "JPG" {
		ext = ".jpg"
	} else if imgFormat == "PNG" {
		ext = ".png"
	}

	comicFolder := SanitizeFilename(info.Title)
	targetBase := filepath.Join(cfg.OutputDir, comicFolder)
	_ = os.MkdirAll(targetBase, 0755)

	totalCh := len(selected)

	// ============================================================
	// PHASE 1: Fast parallel pre-scan all chapters (8 goroutines)
	// ============================================================
	scannedChapters := make([]chapterScanResult, totalCh)
	var totalImages int32 = 0
	var scannedCount int32 = 0

	// Pre-compute chapter metadata (dirs, chNums) before concurrent scan
	for chIdx, ep := range selected {
		chNum := ep.ChNum
		if chNum == "" {
			chNum = fmt.Sprintf("%03d", ep.EpisodeNo)
		}
		folderName := ep.FolderName
		if folderName == "" {
			folderName = SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, ep.Title))
		}
		chapterDir := filepath.Join(targetBase, folderName)
		_ = os.MkdirAll(chapterDir, 0755)

		scannedChapters[chIdx] = chapterScanResult{
			ChIdx:      chIdx,
			Episode:    ep,
			ImageURLs:  nil,
			ChapterDir: chapterDir,
			ChNum:      chNum,
		}
	}

	// Concurrent scan with 8 goroutines
	scanWorkers := 8
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
				if atomic.LoadInt32(cfg.StopRequested) == 1 {
					return
				}

				ep := selected[chIdx]
				imageURLs, err := extractImageURLs(ep.URL)
				if err == nil && len(imageURLs) > 0 {
					scannedChapters[chIdx].ImageURLs = imageURLs
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

	if atomic.LoadInt32(cfg.StopRequested) == 1 {
		return 0, totalCh
	}

	finalTotalImages := int(atomic.LoadInt32(&totalImages))
	if finalTotalImages == 0 {
		finalTotalImages = 1 // prevent division by zero
	}

	// ============================================================
	// PHASE 2: Download all images via a single continuous worker pipeline
	// ============================================================
	allTasks := make(chan imageTask, finalTotalImages)
	chapterCounts := make(map[int]int)
	chapterFinishedSlice := make([]int32, totalCh)
	// Highest chapter index with at least one completed task (the "current" chapter).
	var latestDoneChapter int32 = -1
	// Drain target frozen at Stop time: only this chapter is completed, all others halt.
	var drainChapter int32 = -1

	for _, scan := range scannedChapters {
		if len(scan.ImageURLs) == 0 {
			continue
		}
		chImgCount := len(scan.ImageURLs)
		chapterCounts[scan.ChIdx] = chImgCount

		for i, imgURL := range scan.ImageURLs {
			allTasks <- imageTask{
				Index:              i + 1,
				URL:                imgURL,
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

	workerList := make([]WorkerStatus, cfg.MaxWorkers)
	for i := 0; i < cfg.MaxWorkers; i++ {
		workerList[i] = WorkerStatus{ID: i + 1, ImageFile: "-", Status: "Waiting...", Active: false}
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
					workerList[workerID-1] = WorkerStatus{ID: workerID, ImageFile: "-", Status: "Idle", Active: false}
				}
				workerMu.Unlock()
			}()

			for task := range allTasks {
				// Drain mode: once Stop is requested, freeze the drain target to
				// the chapter that was currently being downloaded (the last one
				// with completed work). Only that single chapter is finished —
				// every other chapter is abandoned so the download halts right
				// after the current one completes.
				if atomic.LoadInt32(cfg.StopRequested) == 1 {
					if atomic.LoadInt32(&drainChapter) == -1 {
						atomic.CompareAndSwapInt32(&drainChapter, -1, atomic.LoadInt32(&latestDoneChapter))
					}
					if atomic.LoadInt32(&drainChapter) != int32(task.ChIdx) {
						return
					}
				}

				fileName := fmt.Sprintf("%03d%s", task.Index, task.Ext)
				filePath := filepath.Join(task.Dir, fileName)

				// Update worker status in real-time
				workerMu.Lock()
				if workerID-1 < len(workerList) {
					workerList[workerID-1] = WorkerStatus{
						ID:        workerID,
						ImageFile: fileName,
						Status:    fmt.Sprintf("Image #%d (%s)", task.Index, fileName),
						Progress:  (float64(task.Index) / float64(task.ChapterTotalImages)) * 100.0,
						Active:    true,
					}
				}
				workerMu.Unlock()

				// Resume check: skip already downloaded file
				if fi, err := os.Stat(filePath); err == nil && fi.Size() > 0 {
					// File already exists on disk — Smart Skip!
				} else {
					_ = downloadSingleImage(task, filePath, cfg)
				}

				currentTotal := atomic.AddInt32(&totalDownloaded, 1)
				chDone := atomic.AddInt32(&chapterFinishedSlice[task.ChIdx], 1)

				// Track the highest chapter with completed work (drives the drain target).
				for {
					cur := atomic.LoadInt32(&latestDoneChapter)
					if int32(task.ChIdx) <= cur || atomic.CompareAndSwapInt32(&latestDoneChapter, cur, int32(task.ChIdx)) {
						break
					}
				}

				// Calculate smooth monotonically increasing percentage
				pct := (float64(currentTotal) / float64(finalTotalImages)) * 100.0
				if pct > 100.0 {
					pct = 100.0
				}

				// Broadcast real-time SSE progress
				if progressCb != nil {
					workerMu.Lock()
					activeWorkerCopy := make([]WorkerStatus, len(workerList))
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

				// If last image of a chapter is completed, send CHAPTER_FINISHED event
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

	// Broadcast final 100% completion
	if progressCb != nil && atomic.LoadInt32(cfg.StopRequested) == 0 {
		workerMu.Lock()
		for i := 0; i < cfg.MaxWorkers; i++ {
			workerList[i] = WorkerStatus{ID: i + 1, ImageFile: "-", Status: "Idle", Active: false}
		}
		finalWorkers := make([]WorkerStatus, len(workerList))
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

	return int(successCh), totalCh
}

// DownloadEpisodes downloads selected episodes in parallel (simpler version without SSE).
func DownloadEpisodes(info *WebtoonInfo, selected []Episode, cfg DownloadConfig, progressCb func(current, total int), statusCb func(string), logCb func(string)) (int, int) {
	imgFormat := strings.ToUpper(cfg.Format)
	ext := ".webp"
	if imgFormat == "JPEG" || imgFormat == "JPG" {
		ext = ".jpg"
	} else if imgFormat == "PNG" {
		ext = ".png"
	}

	comicFolder := SanitizeFilename(info.Title)
	targetBase := filepath.Join(cfg.OutputDir, comicFolder)
	_ = os.MkdirAll(targetBase, 0755)

	totalCh := len(selected)
	successCh := 0

	for chIdx, ep := range selected {
		if atomic.LoadInt32(cfg.StopRequested) == 1 {
			break
		}

		chNum := ep.ChNum
		if chNum == "" {
			chNum = fmt.Sprintf("%03d", ep.EpisodeNo)
		}

		if statusCb != nil {
			statusCb(fmt.Sprintf("Downloading Ch %s (%d/%d)...", chNum, chIdx+1, totalCh))
		}
		if progressCb != nil {
			progressCb(chIdx, totalCh)
		}

		folderName := ep.FolderName
		if folderName == "" {
			folderName = SanitizeFilename(fmt.Sprintf("Chapter %s - %s", chNum, ep.Title))
		}
		chapterDir := filepath.Join(targetBase, folderName)
		_ = os.MkdirAll(chapterDir, 0755)

		imageURLs, err := extractImageURLs(ep.URL)
		if err != nil || len(imageURLs) == 0 {
			continue
		}

		totalImgs := len(imageURLs)
		taskChan := make(chan imageTask, totalImgs)
		var chSuccessCount int32
		var wg sync.WaitGroup

		workers := cfg.MaxWorkers
		if workers < 1 {
			workers = 6
		}

		for w := 0; w < workers; w++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for task := range taskChan {
					if atomic.LoadInt32(cfg.StopRequested) == 1 {
						return
					}
					fileName := fmt.Sprintf("%03d%s", task.Index, task.Ext)
					filePath := filepath.Join(task.Dir, fileName)
					if fi, err := os.Stat(filePath); err == nil && fi.Size() > 0 {
						atomic.AddInt32(&chSuccessCount, 1)
						continue
					}
					if downloadSingleImage(task, filePath, cfg) {
						atomic.AddInt32(&chSuccessCount, 1)
					}
				}
			}()
		}

		for idx, imgURL := range imageURLs {
			taskChan <- imageTask{
				Index:  idx + 1,
				URL:    imgURL,
				Viewer: ep.URL,
				Dir:    chapterDir,
				Ext:    ext,
				Format: imgFormat,
			}
		}
		close(taskChan)
		wg.Wait()

		if atomic.LoadInt32(cfg.StopRequested) == 1 {
			break
		}

		chSuccess := int(chSuccessCount)
		if chSuccess == totalImgs {
			successCh++
		}

		if t, ok := HTTPClient.Transport.(*http.Transport); ok {
			t.CloseIdleConnections()
		}
	}

	if progressCb != nil {
		progressCb(totalCh, totalCh)
	}

	return successCh, totalCh
}

// RunActualWorkerBenchmark executes a real live concurrency benchmark using Go worker Goroutines.
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
			for imgURL := range taskChan {
				req, err := http.NewRequest("GET", imgURL, nil)
				if err != nil {
					continue
				}
				req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
				req.Header.Set("Referer", "https://www.webtoons.com/")

				resp, err := HTTPClient.Do(req)
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
