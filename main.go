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
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
	"uni-scraper-go/server"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

var (
	user32                  = windows.NewLazySystemDLL("user32.dll")
	procReleaseCapture      = user32.NewProc("ReleaseCapture")
	procSendMessageW        = user32.NewProc("SendMessageW")
	procShowWindow          = user32.NewProc("ShowWindow")
	procIsZoomed            = user32.NewProc("IsZoomed")
	procGetWindowLongPtrW   = user32.NewProc("GetWindowLongPtrW")
	procSetWindowLongPtrW   = user32.NewProc("SetWindowLongPtrW")
	procSetWindowPos        = user32.NewProc("SetWindowPos")
	procGetSystemMetrics    = user32.NewProc("GetSystemMetrics")
	procPostMessageW        = user32.NewProc("PostMessageW")
)

const (
	wmNCLButtonDown = 0x00A1
	htCaption       = 0x0002
	wmSysCommand    = 0x0112
	scMinimize      = 0xF020
	scMaximize      = 0xF030
	scRestore       = 0xF120
	scClose         = 0xF060
	swRestore       = 9
	swMaximize      = 3
	swMinimize      = 6
	gwlStyle        = -16
	wsThickFrame    = 0x00040000
	wsMaximizeBox   = 0x00010000
	wsMinimizeBox   = 0x00020000
	wsCaption       = 0x00C00000
	wsSysMenu       = 0x00080000
	wsVisible       = 0x10000000
	wsOverlapped    = 0x00000000
	swpNoZOrder     = 0x0004
	swpNoMove       = 0x0002
	swpNoSize       = 0x0001
	swpFrameChanged = 0x0020
	swpShowWindow   = 0x0040
)

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
		fmt.Printf("Open your browser at: %s\n", url)
	}
}

func hwndFrom(w webview2.WebView) uintptr {
	return uintptr(w.Window())
}

func enableFreeResize(hwnd uintptr) {
	idx := int32(gwlStyle)
	style, _, _ := procGetWindowLongPtrW.Call(hwnd, uintptr(idx))
	style |= wsThickFrame | wsMaximizeBox | wsMinimizeBox | wsSysMenu | wsCaption | wsVisible | wsOverlapped
	procSetWindowLongPtrW.Call(hwnd, uintptr(idx), style)
	procSetWindowPos.Call(hwnd, 0, 0, 0, 0, 0, swpNoZOrder|swpNoMove|swpNoSize|swpFrameChanged|swpShowWindow)
}

func bindWindowControls(w webview2.WebView) {
	hwnd := hwndFrom(w)
	enableFreeResize(hwnd)

	_ = w.Bind("windowDrag", func() {
		procReleaseCapture.Call()
		procSendMessageW.Call(hwnd, wmNCLButtonDown, htCaption, 0)
	})

	_ = w.Bind("windowMinimize", func() {
		procShowWindow.Call(hwnd, swMinimize)
	})

	_ = w.Bind("windowMaximize", func() {
		zoomed, _, _ := procIsZoomed.Call(hwnd)
		if zoomed != 0 {
			procShowWindow.Call(hwnd, swRestore)
		} else {
			procShowWindow.Call(hwnd, swMaximize)
		}
	})

	_ = w.Bind("windowClose", func() {
		procPostMessageW.Call(hwnd, wmSysCommand, scClose, 0)
	})
}

func main() {
	disableQuickEdit()

	distFS, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		fmt.Printf("Error loading embedded frontend dist: %v\n", err)
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Printf("Failed to listen: %v\n", err)
		return
	}
	port := listener.Addr().(*net.TCPAddr).Port
	appURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/catalog", server.HandleCatalog)
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

	go func() {
		_ = http.Serve(listener, mux)
	}()

	// Auto-start Telegram bot if a token is saved in config.
	server.InitBotFromConfig()

	fmt.Println("==================================================")
	fmt.Println("   WEBTOON SCRAPER PRO - NATIVE WINDOWS GUI EDITION")
	fmt.Println("==================================================")
	fmt.Printf(" -> Go Backend Engine running on: %s\n", appURL)
	fmt.Println(" -> Creating 100%% Native Windows Desktop Window (WebView2)")
	fmt.Println("==================================================")

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

	// Free resize + free drag bindings
	w.SetSize(1240, 780, webview2.HintNone)
	w.SetSize(900, 560, webview2.HintMin)
	bindWindowControls(w)

	w.Navigate(appURL)
	w.Run()
}

// silence unused import if any toolchain complains about unsafe in some builds
var _ = unsafe.Pointer(nil)
var _ = syscall.Errno(0)
