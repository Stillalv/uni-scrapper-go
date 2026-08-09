import json
import subprocess
import urllib.request
import urllib.error

def get_git_token():
    try:
        proc = subprocess.Popen(["git", "credential", "fill"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        out, _ = proc.communicate("protocol=https\nhost=github.com\n\n")
        for line in out.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception as e:
        print("Failed to get credential:", e)
    return ""

TOKEN = get_git_token()
REPO = "Stillalv/uni-scrapper-go"
TAG = "v2.1.0"

body_text = """# 🚀 Release Notes - Version 2.1.0

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
"""

def create_release():
    if not TOKEN:
        print("No token found!")
        return None
    url = f"https://api.github.com/repos/{REPO}/releases"
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": "v2.1.0 - MANGA Plus Integration & Strategy Architecture",
        "body": body_text,
        "draft": False,
        "prerelease": False
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Antigravity-Release-Publisher"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Successfully published GitHub Release!")
            print("Release HTML URL:", data.get("html_url"))
            print("Upload URL:", data.get("upload_url"))
            return data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err_msg}")
        return None

if __name__ == "__main__":
    create_release()
