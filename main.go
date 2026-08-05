package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"strings"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
	"uni-scraper-go/server"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

func disableQuickEdit() {
	handle, err := windows.GetStdHandle(windows.STD_INPUT_HANDLE)
	if err != nil {
		return
	}
	var mode uint32
	if err := windows.GetConsoleMode(handle, &mode); err != nil {
		return
	}
	mode &^= windows.ENABLE_QUICK_EDIT_MODE
	mode |= windows.ENABLE_EXTENDED_FLAGS
	_ = windows.SetConsoleMode(handle, mode)
}

func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = exec.Command("xdg-open", url).Start()
	}
	if err != nil {
		fmt.Printf("Silakan buka browser Anda di: %s\n", url)
	}
}

func main() {
	disableQuickEdit()

	// Extract embedded frontend/dist sub-filesystem
	distFS, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		fmt.Printf("Error loading embedded frontend dist: %v\n", err)
	}

	// Find free local TCP port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Printf("Failed to listen: %v\n", err)
		return
	}
	port := listener.Addr().(*net.TCPAddr).Port
	appURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	// Register REST API & SSE Endpoints
	mux := http.NewServeMux()
	mux.HandleFunc("/api/catalog", server.HandleCatalog)
	mux.HandleFunc("/api/check", server.HandleCheckInfo)
	mux.HandleFunc("/api/config", server.HandleGetConfig)
	mux.HandleFunc("/api/open-folder", server.HandleOpenFolder)
	mux.HandleFunc("/api/select-folder", server.HandleSelectFolder)
	mux.HandleFunc("/api/download", server.HandleStartDownload)
	mux.HandleFunc("/api/cancel", server.HandleCancelDownload)
	mux.HandleFunc("/api/benchmark", server.HandleBenchmark)
	mux.HandleFunc("/api/events", server.HandleSSE)

	// Serve React Frontend static files with dynamic config injection for index.html
	if distFS != nil {
		fileServer := http.FileServer(http.FS(distFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" || r.URL.Path == "/index.html" {
				indexData, err := fs.ReadFile(distFS, "index.html")
				if err == nil {
					savedDir := server.LoadSavedOutputDir()
					jsonDir, _ := json.Marshal(savedDir)
					injectedScript := fmt.Sprintf("<script>window.__INITIAL_OUTPUT_DIR__ = %s;</script>", string(jsonDir))
					htmlStr := strings.Replace(string(indexData), "<head>", "<head>"+injectedScript, 1)
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.Write([]byte(htmlStr))
					return
				}
			}
			fileServer.ServeHTTP(w, r)
		})
	}

	// Start local Go web engine server
	go func() {
		_ = http.Serve(listener, mux)
	}()

	fmt.Println("==================================================")
	fmt.Println("   WEBTOON SCRAPER PRO - NATIVE WINDOWS GUI EDITION")
	fmt.Println("==================================================")
	fmt.Printf(" -> Go Backend Engine running on: %s\n", appURL)
	fmt.Println(" -> Creating 100%% Native Windows Desktop Window (WebView2)")
	fmt.Println("==================================================")

	// Create 100% Native Windows Desktop Window via WebView2
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug: false,
		WindowOptions: webview2.WindowOptions{
			Title:  "Webtoon Scraper Pro - Native Desktop Edition",
			Width:  1240,
			Height: 780,
			Center: true,
		},
	})

	if w == nil {
		fmt.Println("Fallback: Launching in default browser window...")
		openBrowser(appURL)
		select {}
	}
	defer w.Destroy()

	w.SetSize(1240, 780, webview2.HintNone)
	w.Navigate(appURL)
	w.Run()
}
