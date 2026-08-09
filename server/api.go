package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"

	"uni-scraper-go/engine/downloader"
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers"
	"uni-scraper-go/engine/utils"
)

type SavedConfig struct {
	LastOutputDir string `json:"lastOutputDir"`
	BotToken      string `json:"botToken,omitempty"`
	BotChatIDs    string `json:"botChatIDs,omitempty"`
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

func LoadConfig() SavedConfig {
	for _, file := range getConfigFilePaths() {
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		var cfg SavedConfig
		if err := json.Unmarshal(data, &cfg); err == nil {
			return cfg
		}
	}
	return SavedConfig{}
}

func SaveConfig(cfg SavedConfig) {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return
	}
	for _, file := range getConfigFilePaths() {
		_ = os.WriteFile(file, data, 0644)
	}
}

func LoadSavedOutputDir() string {
	cfg := LoadConfig()
	if cfg.LastOutputDir != "" {
		cleanPath := filepath.Clean(cfg.LastOutputDir)
		_ = os.MkdirAll(cleanPath, 0755)
		return cleanPath
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

	cfg := LoadConfig()
	cfg.LastOutputDir = cleanPath
	SaveConfig(cfg)
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
	currentWebtoonInfo *model.ComicInfo
	currentEpisodes    []model.Episode
	currentEpisodeMap  map[int]model.Episode
	downloadStopFlag   *int32 // stop flag of the currently active download (replaced per download)
	isDownloading      bool
	currentOutputDir   string = LoadSavedOutputDir()
)

func HandleCatalog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "id"
	}
	source := r.URL.Query().Get("source")
	refreshStr := r.URL.Query().Get("refresh")
	forceRefresh := refreshStr == "true"

	catalog, err := providers.FetchCatalogBySource(source, lang, forceRefresh, nil)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": fmt.Sprintf("Failed to load catalog: %v", err),
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
			"message": "Invalid Webtoon / MANGA Plus URL or ID.",
		})
		return
	}

	if req.Lang == "" {
		req.Lang = "id"
	}

	var info *model.ComicInfo
	var episodes []model.Episode
	var err error

	if p, ok := providers.FindMatchingProvider(req.URL); ok {
		info, episodes, err = p.ResolveComic(req.URL, nil)
	} else if p, ok := providers.Get("webtoon_" + req.Lang); ok {
		info, episodes, err = p.ResolveComic(req.URL, nil)
	} else if p, ok := providers.Get("webtoon_id"); ok {
		info, episodes, err = p.ResolveComic(req.URL, nil)
	} else {
		err = fmt.Errorf("no provider found for URL")
	}

	if err != nil || len(episodes) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": fmt.Sprintf("Failed to process comic: %v", err),
		})
		return
	}

	currentWebtoonInfo = info
	currentEpisodes = episodes
	currentEpisodeMap = make(map[int]model.Episode)
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
			"EpisodeRange":  fmt.Sprintf("Chapter %d to %d", minEp, maxEp),
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

	if err := launchDownload(currentWebtoonInfo, currentEpisodes, currentEpisodeMap, req, nil); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "started",
		"message": fmt.Sprintf("Download started for %d chapters.", len(req.Range)),
	})
}

// launchDownload is the shared download runner used by both the HTTP API
// (native app UI) and the Telegram bot. It receives the comic data directly
// so the bot can download comics it checked itself (no dependency on the
// UI-only global state). notify receives all engine events
// (PROGRESS_UPDATE, CHAPTER_FINISHED, DOWNLOAD_FINISHED, DOWNLOAD_STOPPED).
func launchDownload(info *model.ComicInfo, episodes []model.Episode, epMap map[int]model.Episode, req DownloadRequest, notify func(event string, data map[string]interface{})) error {
	if info == nil || len(episodes) == 0 || len(epMap) == 0 {
		return fmt.Errorf("Please check comic info first.")
	}

	selectedEps := utils.ParseChapterSelection(req.Range, epMap)
	if len(selectedEps) == 0 {
		return fmt.Errorf("Invalid chapter range selection.")
	}

	if req.OutputDir != "" {
		currentOutputDir = req.OutputDir
	}

	workers := req.Workers
	if workers <= 0 {
		workers = 6
	}

	// Reject a new download while the previous one is still draining.
	if isDownloading {
		return fmt.Errorf("A download is already running. Wait for it to stop, then try again.")
	}

	// Fresh stop flag per download so a later restart can never reset the
	// flag of a download that is still draining after Stop was pressed.
	stopFlag := new(int32)
	downloadStopFlag = stopFlag
	isDownloading = true

	cfg := model.DownloadConfig{
		OutputDir:     currentOutputDir,
		Format:        req.Format,
		MaxWorkers:    workers,
		Quality:       90,
		StopRequested: stopFlag,
	}

	// Run download asynchronously with SSE real-time updates
	go func() {
		defer func() {
			isDownloading = false
		}()

		progressAdapter := func(progData map[string]interface{}) {
			evtType, _ := progData["type"].(string)
			if evtType == "CHAPTER_FINISHED" {
				Broadcaster.Broadcast("CHAPTER_FINISHED", progData)
			} else {
				Broadcaster.Broadcast("PROGRESS_UPDATE", progData)
			}
			if notify != nil {
				notify(evtType, progData)
			}
		}

		successCh, totalCh := downloader.DownloadEpisodesWithGranularProgress(
			info,
			selectedEps,
			cfg,
			progressAdapter,
		)

		if atomic.LoadInt32(downloadStopFlag) == 1 {
			isDownloading = false
			data := map[string]interface{}{
				"title":          "Download Stopped",
				"completedCount": successCh,
				"totalCount":     totalCh,
				"format":         cfg.Format,
				"outputDir":      cfg.OutputDir,
				"message":        fmt.Sprintf("The in-progress chapter was completed, then the download stopped. Finished %d of %d chapters.", successCh, totalCh),
				"type":           "warning",
			}
			Broadcaster.Broadcast("DOWNLOAD_STOPPED", data)
			if notify != nil {
				notify("DOWNLOAD_STOPPED", data)
			}
		} else {
			isDownloading = false
			data := map[string]interface{}{
				"title":          info.Title,
				"completedCount": successCh,
				"totalCount":     totalCh,
				"format":         cfg.Format,
				"outputDir":      cfg.OutputDir,
				"message":        fmt.Sprintf("Download complete! %d of %d chapters downloaded.", successCh, totalCh),
			}
			Broadcaster.Broadcast("DOWNLOAD_FINISHED", data)
			if notify != nil {
				notify("DOWNLOAD_FINISHED", data)
			}
		}
	}()
	return nil
}

// IsDownloadActive reports whether a download is currently running or draining.
func IsDownloadActive() bool {
	return isDownloading
}

// RequestStopDownload asks the active download to stop: the current chapter
// is finished first (drain mode), then the download halts.
func RequestStopDownload() string {
	if flag := downloadStopFlag; flag != nil {
		atomic.StoreInt32(flag, 1)
	}
	if t, ok := utils.HTTPClient.Transport.(*http.Transport); ok {
		t.CloseIdleConnections()
	}

	// Broadcast instantaneous worker reset to UI
	Broadcaster.Broadcast("PROGRESS_UPDATE", map[string]interface{}{
		"status":        "Stopping... finishing current chapter",
		"activeWorkers": []model.WorkerStatus{},
	})

	return "Stop requested. The in-progress chapter will be completed, then the download stops."
}

func HandleCancelDownload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	msg := RequestStopDownload()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": msg,
	})
}

// InitBotFromConfig starts the Telegram bot at app launch if a token is saved.
func InitBotFromConfig() {
	cfg := LoadConfig()
	if cfg.BotToken != "" {
		Bot.SetConfig(cfg.BotToken, cfg.BotChatIDs)
		Bot.Start()
	}
}

func HandleBotConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"bot":    Bot.Status(),
		})
		return

	case http.MethodPost:
		var req struct {
			Token   string `json:"token"`
			ChatIDs string `json:"chatIDs"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":  "error",
				"message": "Invalid request payload.",
			})
			return
		}

		cfg := LoadConfig()
		// Empty fields keep the previously saved values (no need to re-type
		// the token/chat IDs every time the app restarts).
		if strings.TrimSpace(req.Token) != "" {
			cfg.BotToken = strings.TrimSpace(req.Token)
		}
		if strings.TrimSpace(req.ChatIDs) != "" {
			cfg.BotChatIDs = strings.TrimSpace(req.ChatIDs)
		}
		SaveConfig(cfg)

		Bot.Stop()
		if cfg.BotToken != "" {
			Bot.SetConfig(cfg.BotToken, cfg.BotChatIDs)
			Bot.Start()
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"bot":    Bot.Status(),
		})
		return

	default:
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": "Method not allowed.",
		})
	}
}

func HandleBenchmark(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	workersStr := r.URL.Query().Get("workers")
	workers := 6
	if workersStr != "" {
		fmt.Sscanf(workersStr, "%d", &workers)
	}

	result := downloader.RunActualWorkerBenchmark(workers)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   result,
	})
}

func HandleProxyImage(w http.ResponseWriter, r *http.Request) {
	imgURL := r.URL.Query().Get("url")
	if imgURL == "" {
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest("GET", imgURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if strings.Contains(imgURL, "tokyo-cdn.com") {
		req.Header.Set("Referer", "https://mangaplus.shueisha.co.jp/")
		req.Header.Set("Origin", "https://mangaplus.shueisha.co.jp")
	} else {
		req.Header.Set("Referer", "https://www.webtoons.com/")
	}
	req.Header.Set("User-Agent", utils.DefaultHeaders["User-Agent"])

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Upstream returned %d", resp.StatusCode), resp.StatusCode)
		return
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.Header().Set("Cache-Control", "public, max-age=86400")
	_, _ = io.Copy(w, resp.Body)
}
