# UniScrapper Pro Go - Native Desktop Edition

🚀 **High-Speed Go Engine Webtoon Scraper & Downloader** with 32-Goroutine Direct Byte Streaming and Apple macOS Light & Dark Theme UI.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8.svg)
![React](https://img.shields.io/badge/React-18.0.0-61DAFB.svg)

---

## ✨ Features

- **⚡ 32-Goroutine Worker Pool**: Peak throughput downloading images at **200+ Mbps** with zero GC pauses.
- **🎨 Apple macOS San Francisco UI**: Clean Apple Light & Dark mode toggle with glassmorphism aesthetics.
- **📊 100% Smooth Continuous Stream Progress**: Zero flickering, zero progress bar resets between chapters.
- **⚡ Smart Skip & Fast Resume**: Automatically detects existing files on disk and skips them in milliseconds.
- **📁 VS Code-Style Native Windows Directory Picker**: Win32 COM `IFileOpenDialog` integration with quadruple-location persistent state saving.
- **📦 Single 7.88 MB Executable**: Standalone `webtoon-scraper.exe` with zero external dependencies required.

---

## 🛠️ Tech Stack

- **Backend**: Go (Golang) 1.21+, Win32 COM, Gorilla SSE Broadcaster
- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons
- **HTTP Engine**: Customized `http.Transport` with HTTP/2 stream multiplexing

---

## 🚀 Building from Source

```bash
# 1. Build React frontend bundle
cd frontend
npm install
npm run build

# 2. Build native Go executable
cd ..
go build -ldflags="-H windowsgui -s -w" -o webtoon-scraper.exe .
```

---

## 📄 License

MIT License © 2026 Stillalv
