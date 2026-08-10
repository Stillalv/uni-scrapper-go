package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"

	"uni-scraper-go/server"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

func main() {
	distFS, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		fmt.Printf("Error loading embedded frontend dist: %v\n", err)
	}

	appURL := "http://127.0.0.1:8080"
	mux := http.NewServeMux()
	mux.HandleFunc("/api/catalog", server.HandleCatalog)
	mux.HandleFunc("/api/proxy-image", server.HandleProxyImage)
	mux.HandleFunc("/api/check", server.HandleCheckInfo)
	mux.HandleFunc("/api/config", server.HandleGetConfig)
	mux.HandleFunc("/api/open-folder", server.HandleOpenFolder)
	mux.HandleFunc("/api/select-folder", server.HandleSelectFolder)
	mux.HandleFunc("/api/download", server.HandleStartDownload)
	mux.HandleFunc("/api/cancel", server.HandleCancelDownload)
	mux.HandleFunc("/api/benchmark", server.HandleBenchmark)
	mux.HandleFunc("/api/bot-config", server.HandleBotConfig)
	mux.HandleFunc("/api/events", server.HandleSSE)

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

	fmt.Printf("Server listening on %s...\n", appURL)
	if err := http.ListenAndServe("127.0.0.1:8080", mux); err != nil {
		fmt.Println("Server error:", err)
		os.Exit(1)
	}
}
