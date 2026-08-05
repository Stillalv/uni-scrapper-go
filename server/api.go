package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"

	"uni-scraper-go/engine"
)

type SavedConfig struct {
	LastOutputDir string `json:"lastOutputDir"`
}

func getConfigFilePaths() []string {
	paths := []string{}

	// 1. AppData Roaming directory (%APPDATA%\WebtoonScraper\config.json)
	appData := os.Getenv("APPDATA")
	if appData != "" {
		dir := filepath.Join(appData, "WebtoonScraper")
		_ = os.MkdirAll(dir, 0755)
		paths = append(paths, filepath.Join(dir, "config.json"))
	}

	// 2. User Profile directory (%USERPROFILE%\.webtoon_scraper_config.json)
	userProfile := os.Getenv("USERPROFILE")
	if userProfile != "" {
		paths = append(paths, filepath.Join(userProfile, ".webtoon_scraper_config.json"))
	}

	// 3. LocalAppData directory (%LOCALAPPDATA%\WebtoonScraper\config.json)
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData != "" {
		dir := filepath.Join(localAppData, "WebtoonScraper")
		_ = os.MkdirAll(dir, 0755)
		paths = append(paths, filepath.Join(dir, "config.json"))
	}

	// 4. App Directory / CWD
	pwd, err := os.Getwd()
	if err == nil {
		paths = append(paths, filepath.Join(pwd, "config.json"))
	}

	return paths
}

func LoadSavedOutputDir() string {
	for _, file := range getConfigFilePaths() {
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		var cfg SavedConfig
		if err := json.Unmarshal(data, &cfg); err == nil && cfg.LastOutputDir != "" {
			cleanPath := filepath.Clean(cfg.LastOutputDir)
			_ = os.MkdirAll(cleanPath, 0755)
			return cleanPath
		}
	}
	pwd, _ := os.Getwd()
	return pwd
}

func SaveOutputDir(path string) {
	if path == "" {
		return
	}
	cleanPath := filepath.Clean(path)
	_ = os.MkdirAll(cleanPath, 0755)

	cfg := SavedConfig{LastOutputDir: cleanPath}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return
	}

	for _, file := range getConfigFilePaths() {
		_ = os.WriteFile(file, data, 0644)
	}
}

func showNativeFolderPicker() (string, bool) {
	// Call modern VS Code style Windows File Explorer Folder Picker COM API (IFileOpenDialog with FOS_PICKFOLDERS)
	folder, ok := ShowModernFileExplorerPicker()
	if ok && folder != "" {
		return folder, true
	}
	return "", false
}

type CheckInfoRequest struct {
	URL  string `json:"url"`
	Lang string `json:"lang"`
}

type DownloadRequest struct {
	URL       string `json:"url"`
	Range     string `json:"range"`
	Format    string `json:"format"`
	Workers   int    `json:"workers"`
	OutputDir string `json:"outputDir"`
}

var (
	currentWebtoonInfo *engine.WebtoonInfo
	currentEpisodes    []engine.Episode
	currentEpisodeMap  map[int]engine.Episode
	downloadStopFlag   int32
	isDownloading      bool
	currentOutputDir   string = LoadSavedOutputDir()
)

func HandleCatalog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "id"
	}
	refreshStr := r.URL.Query().Get("refresh")
	forceRefresh := refreshStr == "true"

	catalog, err := engine.FetchWebtoonCatalog(lang, forceRefresh, nil)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": fmt.Sprintf("Gagal memuat katalog: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"catalog": catalog,
	})
}

func HandleCheckInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req CheckInfoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.URL == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "URL / ID Webtoon tidak valid.",
		})
		return
	}

	if req.Lang == "" {
		req.Lang = "id"
	}

	info, err := engine.ResolveWebtoonInfo(req.URL, req.Lang, nil)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": fmt.Sprintf("Gagal memproses Webtoon: %v", err),
		})
		return
	}

	episodes, err := engine.GetAllEpisodes(info.ListURL, nil)
	if err != nil || len(episodes) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "Gagal memuat daftar episode.",
		})
		return
	}

	currentWebtoonInfo = info
	currentEpisodes = episodes
	currentEpisodeMap = make(map[int]engine.Episode)
	for _, ep := range episodes {
		currentEpisodeMap[ep.EpisodeNo] = ep
	}

	if currentOutputDir == "" {
		currentOutputDir = LoadSavedOutputDir()
	}

	minEp := episodes[0].EpisodeNo
	maxEp := episodes[len(episodes)-1].EpisodeNo

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"info": map[string]interface{}{
			"Title":         info.Title,
			"Lang":          info.Lang,
			"Genre":         info.Genre,
			"TitleNo":       info.TitleNo,
			"ListURL":       info.ListURL,
			"TotalEpisodes": len(episodes),
			"EpisodeRange":  fmt.Sprintf("Chapter %d s/d %d", minEp, maxEp),
			"OutputDir":     currentOutputDir,
		},
	})
}

func HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	currentOutputDir = LoadSavedOutputDir()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "success",
		"outputDir": currentOutputDir,
	})
}

func HandleOpenFolder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	target := r.URL.Query().Get("path")
	if target == "" {
		target = currentOutputDir
	}
	if target == "" {
		target = LoadSavedOutputDir()
	}

	err := exec.Command("explorer.exe", target).Start()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": fmt.Sprintf("Failed to open File Explorer: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"path":   target,
	})
}

func HandleSelectFolder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	folder, ok := ShowModernFileExplorerPicker()
	if ok && folder != "" {
		currentOutputDir = filepath.Clean(folder)
		SaveOutputDir(currentOutputDir)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"path":   currentOutputDir,
		})
		return
	}

	currentOutputDir = LoadSavedOutputDir()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "cancelled",
		"path":   currentOutputDir,
	})
}

func HandleStartDownload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "Invalid request payload.",
		})
		return
	}

	if currentWebtoonInfo == nil || len(currentEpisodes) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "Please check comic info first.",
		})
		return
	}

	selectedEps := engine.ParseChapterSelection(req.Range, currentEpisodeMap)
	if len(selectedEps) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "Invalid chapter range selection.",
		})
		return
	}

	if req.OutputDir != "" {
		currentOutputDir = req.OutputDir
	}

	workers := req.Workers
	if workers <= 0 {
		workers = 6
	}

	atomic.StoreInt32(&downloadStopFlag, 0)
	isDownloading = true

	cfg := engine.DownloadConfig{
		OutputDir:     currentOutputDir,
		Format:        req.Format,
		MaxWorkers:    workers,
		Quality:       90,
		StopRequested: &downloadStopFlag,
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "started",
		"message": fmt.Sprintf("Download started for %d chapters.", len(selectedEps)),
	})

	// Run download asynchronously with SSE real-time updates
	go func() {
		defer func() {
			isDownloading = false
		}()

		progressAdapter := func(progData map[string]interface{}) {
			Broadcaster.Broadcast("PROGRESS_UPDATE", progData)
		}

		successCh, totalCh := engine.DownloadEpisodesWithGranularProgress(
			currentWebtoonInfo,
			selectedEps,
			cfg,
			progressAdapter,
		)

		if atomic.LoadInt32(&downloadStopFlag) == 1 {
			Broadcaster.Broadcast("TOAST_NOTIFICATION", map[string]interface{}{
				"title":   "Download Cancelled",
				"message": fmt.Sprintf("Download stopped. Completed %d of %d chapters.", successCh, totalCh),
				"type":    "warning",
			})
		} else {
			Broadcaster.Broadcast("DOWNLOAD_FINISHED", map[string]interface{}{
				"title":          currentWebtoonInfo.Title,
				"completedCount": successCh,
				"totalCount":     totalCh,
				"format":         cfg.Format,
				"outputDir":      cfg.OutputDir,
				"message":        fmt.Sprintf("Download complete! %d of %d chapters downloaded.", successCh, totalCh),
			})
		}
	}()
}

func HandleCancelDownload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if isDownloading {
		atomic.StoreInt32(&downloadStopFlag, 1)
		if t, ok := engine.HTTPClient.Transport.(*http.Transport); ok {
			t.CloseIdleConnections()
		}
	}
	isDownloading = false

	// Broadcast instantaneous worker reset to UI
	Broadcaster.Broadcast("PROGRESS_UPDATE", map[string]interface{}{
		"status":        "Download Stopped",
		"activeWorkers": []engine.WorkerStatus{},
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Cancellation request sent. All workers stopped.",
	})
}

func HandleBenchmark(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	workersStr := r.URL.Query().Get("workers")
	workers := 6
	if workersStr != "" {
		fmt.Sscanf(workersStr, "%d", &workers)
	}

	result := engine.RunActualWorkerBenchmark(workers)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   result,
	})
}
