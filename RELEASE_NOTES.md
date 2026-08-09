# 🚀 Release Notes - Version 2.1.0

**Release Tag:** `v2.1.0`  
**Repository:** [Stillalv/uni-scrapper-go](https://github.com/Stillalv/uni-scrapper-go)  
**Date:** August 9, 2026  

---

## 🔥 What's New in v2.1.0

### 1. 🔴 MANGA Plus (Sub Indo) Integration
- **Full Catalog Fetching:** Added support for fetching 16 official Indonesian translated titles from MANGA Plus (`jumpg-webapi.tokyo-cdn.com`) with 24-hour disk caching (`catalog_cache_mangaplus_id.json`).
- **130-Chapter Resolver:** Integrated Virtual Android Device Secret registration token management (`GetDeviceSecret`) to resolve complete title details and all 130 chapters (e.g. *Kagurabachi*, *Boruto: Two Blue Vortex*, *Dandadan*, *One Piece*).
- **High-Speed Decryption & Download:** Automatic XOR image byte decryption (`ApplyMangaPlusXORDecryption`) for high-resolution WebP images from CDN (`jumpg-assets3.tokyo-cdn.com`).

### 2. 🏛️ Enterprise-Grade Modular Architecture (Strategy Pattern + Provider Registry)
- **Decoupled Provider Architecture (`engine/providers/`):**
  - `engine/providers/webtoon/`: LINE Webtoon Indonesia & English scraper.
  - `engine/providers/mangaplus/`: MANGA Plus Shueisha scraper & XOR decoder.
- **Provider Registry:** Dynamic lookup and auto-dispatching for catalog fetching and title resolving (`providers.FetchCatalogBySource`). Zero `if/else` checks needed in API handlers.
- **Unified Domain Models (`engine/model/`):** Unified `CatalogItem` and `ComicInfo` data structures across all sources.

### 3. 🤖 Telegram Remote Control Bot Upgrades
- **Source Switching:** Added inline buttons in the Telegram Bot catalog menu to switch between `🇮🇩 Webtoon (ID)`, `🔴 MANGA Plus (ID)`, and `🇬🇧 Webtoon (EN)`.
- **Automatic MANGA Plus Resolution:** Full support for resolving MANGA Plus URLs and numeric Title IDs (e.g. `400006`) directly from Telegram chat commands.

### 4. 🪟 Native Windowless Windows GUI Executable
- **No Console Window:** Recompiled `webtoon-scraper.exe` with `-ldflags="-H windowsgui -s -w"` so the application runs natively as a windowless GUI without opening a black CMD console.

---

## 🛠️ Summary of Changed Files

- **New Sub-packages:**
  - [`engine/model/comic.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/model/comic.go) & [`engine/model/episode.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/model/episode.go)
  - [`engine/utils/http.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/utils/http.go) & [`engine/utils/file.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/utils/file.go)
  - [`engine/providers/provider.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/providers/provider.go), [`engine/providers/registry.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/providers/registry.go), & [`engine/providers/init.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/providers/init.go)
  - [`engine/providers/webtoon/`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/providers/webtoon/) (`catalog.go`, `resolver.go`)
  - [`engine/providers/mangaplus/`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/engine/providers/mangaplus/) (`device.go`, `catalog.go`, `resolver.go`, `decoder.go`)
- **Updated Main Modules:**
  - [`server/api.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/server/api.go) & [`server/telegram.go`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/server/telegram.go)
  - [`frontend/src/App.jsx`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/frontend/src/App.jsx) & [`frontend/src/components/CatalogView.jsx`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/frontend/src/components/CatalogView.jsx)
  - [`AGENTS.md`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/AGENTS.md) & [`.agents/AGENTS.md`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/.agents/AGENTS.md)
