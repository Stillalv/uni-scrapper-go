# Antigravity Project Rules & Guidelines

## 🌐 Language & Communication Rules (Strict)
1. **User Interface (UI/UX) - English ONLY**:
   - All UI/UX elements, labels, buttons, descriptions, tooltips, progress updates, status messages, dialog cards, and interactive responses across both the **Desktop App (React Frontend)** and **Telegram Remote Control Bot** MUST be written in **English ONLY**.
   - Do NOT use Indonesian text anywhere in the user-facing app UI or Telegram bot responses.
   - Telegram Bot Keyboard buttons MUST be standardized to English:
     - `🔍 Check Webtoon`
     - `📚 Catalog`
     - `⬇️ Download`
     - `📊 Status`
     - `⏹ Stop`
     - `📂 Output Folder`
     - `🕘 History`
     - `⚡ Benchmark`
     - `⚙️ Settings`
     - `ℹ️ Help`

2. **Antigravity Chat Response - Bahasa Indonesia ONLY**:
   - All explanations, summaries, code reviews, and responses from Antigravity to the user in the chat conversation MUST always be written in **Bahasa Indonesia**.

---

## 🏗️ Code Quality, Architecture & Design Standards
1. **Enterprise-Grade Modular Architecture (Anti-Monolith)**:
   - Use the **Strategy Pattern + Provider Registry** (`engine/providers/`) for adding any new comic catalog or scraper source.
   - Every provider MUST implement the standard `providers.Provider` interface and register itself in `engine/providers/init.go`.
   - Never add hardcoded `if/else` source checks directly inside `server/api.go` or `main.go`.

2. **Zero-Regression & Compatibility Principle**:
   - New features or refactoring MUST NOT break or alter existing working features (LINE Webtoon ID/EN, MANGA Plus ID, Desktop GUI, SSE progress, Telegram Bot).
   - Maintain backward compatibility bridges in `engine/` for top-level structs and functions.

3. **Clean Code & Best Standards**:
   - Keep code decoupled, highly readable, and well-structured.
   - Centralize HTTP clients, connection pooling, and file sanitization in `engine/utils/`.
   - Maintain clean error handling and avoid silent failures or swallowing errors.
   - Windows binaries MUST be compiled with `-ldflags="-H windowsgui -s -w"` to run natively without opening a black CMD console window.

---

## 🐙 Git & Version Control Rules
1. **Local Commits**:
   - Antigravity MUST commit code changes locally after completing milestones, fixing issues, or refactoring.
2. **Remote Push Protection (Strict)**:
   - Antigravity MUST ALWAYS ask for explicit user permission before executing `git push` to remote repositories. NEVER push automatically without user approval.
3. **GitHub Release Naming & Formatting Standard**:
   - Release Titles MUST follow the standardized format: `<tag> - <Descriptive Feature Subject>` (e.g. `v2.2.0 - IDM-Style Parallel Chunking & High-Speed Optimizations`).
   - NEVER name releases with just the version tag alone (e.g. `v2.2.0`). Always append the feature subject after the hyphen `-`.
   - Release notes body MUST follow the structured GitHub Flavored Markdown format (`# 🚀 Release Notes - Version X.Y.Z` with numbered feature highlights and emoji headers).

---

## 📘 Portable Project Guide

### Project Identity
- Repository: `Stillalv/uni-scrapper-go`
- Default branch: `main`
- Module: `uni-scraper-go`
- Application: Native Windows desktop comic scraper/downloader with React UI, Go engine, SSE progress, and Telegram remote control.
- Current cloud-sync Worker: `https://webtoon-sync.rahmat-jayadi-191205.workers.dev`
- Cloudflare D1 database: `webtoon-sync` (`298ce55c-8629-420e-a7de-9f9a4c845f84`)
- Cloud sync user ID for the private setup: `default`

### Repository Map
- `main.go`: Windows desktop shell, embedded frontend, local HTTP route registration, and WebView2 startup.
- `server/`: local HTTP API, SSE broadcaster, Telegram bot, native folder picker, and cloud-sync bridge.
- `server/cloud_sync.go`: Cloudflare Worker client, device registration, bootstrap, and sync transport.
- `engine/model/`: shared comic, episode, download, and worker domain models.
- `engine/providers/`: provider interface, registry, LINE Webtoon providers, and MANGA Plus provider.
- `engine/downloader/`: chapter selection, image scanning, retries, worker pool, and local file output.
- `engine/utils/`: shared HTTP transport and file/path helpers.
- `frontend/src/`: React desktop UI. User-facing text must remain English.
- `deploy/webtoon-sync/`: Cloudflare Worker, D1 migrations, Wrangler configuration, and deployment guide.
- `deploy/mangaplus-proxy/`: separate MANGA Plus image proxy Worker. Do not mix it with the sync Worker.
- `scratch/`: local experiments and research only. Do not treat it as production code.

### Persistent Data Locations
- App configuration: `%APPDATA%\\WebtoonScraper\\config.json` and `%LOCALAPPDATA%\\WebtoonScraper\\config.json`.
- Local configuration fields: output directory, Telegram settings, cloud sync URL/token/user/device fields.
- Frontend cache: WebView2 Local Storage under `%APPDATA%\\webtoon-scraper.exe\\EBWebView\\Default\\Local Storage\\leveldb`.
- Legacy bookmarks fallback: `bookmarks.json` in the working directory or AppData bookmark paths. It is ignored by Git.
- Catalog cache: `catalog_cache_id.json`, `catalog_cache_en.json`, and `catalog_cache_mangaplus_id.json` in the working directory. They expire after 24 hours and are ignored by Git.
- Downloaded images: the user-selected local output directory. They are never stored in D1.
- Cloud data: bookmarks, download history, theme, format, worker profile, device records, and metadata in Cloudflare D1.

### Cloud Sync Rules
- The desktop app talks only to the local Go API; React must not access D1 directly.
- The Go API talks to the Worker using `Authorization: Bearer <SYNC_API_TOKEN>`.
- The token is a private personal token and MUST NOT be committed, embedded in the frontend bundle, or written in documentation.
- The Worker URL has a safe default in `server/cloud_sync.go`; a different URL may be configured in Settings.
- Each computer receives a generated stable device ID stored in local config.
- Output directory is device-specific; theme, image format, and worker settings can be synchronized.
- `localStorage` remains an offline cache. Cloud bootstrap merges local and remote records before syncing.
- Deletes use D1 tombstones so deletion propagates across computers.
- Telegram bot token remains local by design and is not synchronized to D1.

### Setup On A New Computer
1. Install Go 1.25+, Node.js/npm, WebView2 Runtime, and Wrangler if cloud deployment is needed.
2. Clone the repository and enter its root directory.
3. Build the frontend: `cd frontend`, `npm install`, `npm run build`.
4. Build the Windows executable from the root: `go build -ldflags="-H windowsgui -s -w" -o webtoon-scraper.exe .`.
5. Start the executable and open `Settings > Cloud Sync`.
6. Enter the same personal sync token and choose a unique device name. The Worker URL is preconfigured.
7. Select a local output directory for that computer.
8. Verify that the Cloud Sync status becomes `Cloud Online` and bookmarks appear.

### Cloudflare Deployment
- Run Wrangler commands from `deploy/webtoon-sync/`.
- Apply schema changes with `npx wrangler d1 migrations apply webtoon-sync --remote`.
- Set or rotate the Worker secret with `npx wrangler secret put SYNC_API_TOKEN`.
- Optional single-user identity secret: `npx wrangler secret put SYNC_USER_ID`.
- Deploy with `npx wrangler deploy`.
- Never commit `.wrangler/`, database credentials, API tokens, local config, bookmark state, or downloaded output.

### Required Verification
- Go: `go test ./server ./engine/...`
- Frontend: `npm run build` from `frontend/`.
- Worker syntax: `node --check worker.js` from `deploy/webtoon-sync/`.
- Worker packaging: `npx wrangler deploy --dry-run` from `deploy/webtoon-sync/`.
- Windows build: use `-ldflags="-H windowsgui -s -w"`.
- Before release: inspect `git status`, `git diff`, `git log --oneline -10`, and ensure no secrets are staged.

### Release Checklist
- Use the next semantic version tag, for example `v2.4.0`.
- Title format: `<tag> - <Descriptive Feature Subject>`.
- Release notes must start with `# 🚀 Release Notes - Version X.Y.Z`.
- Include numbered feature highlights, verification results, migration notes, and configuration requirements.
- Attach the final `webtoon-scraper.exe` when it is rebuilt for the release.
- Push only after explicit user permission.

