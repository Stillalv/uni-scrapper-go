# 🚀 Release Notes - Version 2.4.0

**Release Tag:** `v2.4.0`
**Repository:** [Stillalv/uni-scrapper-go](https://github.com/Stillalv/uni-scrapper-go)
**Release Subject:** Cloudflare D1 Cloud Sync & Portable Project Setup

---

## 🔥 What's New in v2.4.0

### 1. ☁️ Cloudflare D1 Cloud Sync
- Added a dedicated Cloudflare Worker sync API backed by D1.
- Synchronizes bookmarks, download history, themes, image format, worker profile, and device metadata.
- Keeps downloaded comic images local to each computer.
- Uses bearer-token authentication through the private `SYNC_API_TOKEN` Worker secret.

### 2. 🔄 Cross-Computer State Migration
- Added non-destructive bootstrap merging between local WebView2 cache and D1.
- Added tombstone-based deletion propagation for bookmarks and history.
- Added per-device output directory settings to prevent path conflicts between computers.
- Migrates existing legacy bookmark data when the cloud database is first initialized.

### 3. 🖥️ Desktop Cloud Sync Settings
- Added Cloud Sync status and configuration controls to the desktop Settings view.
- The Worker URL is preconfigured for new computers.
- Device IDs are generated and persisted locally.
- Offline fallback keeps the application usable when the cloud service is unavailable.

### 4. 📘 Portable Project Documentation
- Expanded root `AGENTS.md` with the project map, storage locations, setup steps, Cloudflare deployment rules, verification commands, and release checklist.
- Added a dedicated Worker README and D1 migration documentation.
- Updated `.gitignore` to exclude local bookmark state, download output, and Wrangler runtime files.

## ✅ Verification

1. `go test ./server ./engine/...`
2. `npm run build`
3. `node --check worker.js`
4. `npx wrangler deploy --dry-run`
5. Windows build with `-ldflags="-H windowsgui -s -w"`
6. Cloudflare `/health` smoke test
7. Unauthorized request returns `401`
8. Authorized D1 bootstrap returns synchronized bookmark data

## ⚙️ Configuration

- Worker URL: `https://webtoon-sync.rahmat-jayadi-191205.workers.dev`
- D1 database: `webtoon-sync`
- User ID: `default`
- Enter the same private sync token in `Settings > Cloud Sync` on each computer.
- Never commit the sync token or local configuration files.

## 📦 Included Asset

- `webtoon-scraper.exe`, compiled as a native Windows GUI application without a console window.
