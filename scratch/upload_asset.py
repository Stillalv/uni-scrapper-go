import os
import subprocess
import json
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
EXE_PATH = "webtoon-scraper.exe"

def get_release_by_tag():
    url = f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Antigravity-Release-Publisher"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print("Failed to fetch release:", e)
        return None

def delete_asset(asset_id):
    url = f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Antigravity-Release-Publisher"
        },
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Successfully deleted old asset ID {asset_id}")
    except Exception as e:
        print(f"Failed to delete asset ID {asset_id}:", e)

def upload_asset():
    if not TOKEN:
        print("No GitHub token found!")
        return

    rel = get_release_by_tag()
    if not rel:
        print("Release v2.1.0 not found!")
        return

    release_id = rel["id"]
    assets = rel.get("assets", [])

    for a in assets:
        if a["name"] == "webtoon-scraper.exe":
            print(f"Found existing webtoon-scraper.exe asset (ID: {a['id']}), deleting it first...")
            delete_asset(a["id"])

    if not os.path.exists(EXE_PATH):
        print(f"File {EXE_PATH} not found!")
        return

    file_size = os.path.getsize(EXE_PATH)
    print(f"Uploading new {EXE_PATH} ({file_size} bytes) to GitHub Release #{release_id}...")

    url = f"https://uploads.github.com/repos/{REPO}/releases/{release_id}/assets?name=webtoon-scraper.exe"
    
    with open(EXE_PATH, "rb") as f:
        file_data = f.read()

    req = urllib.request.Request(
        url,
        data=file_data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/octet-stream",
            "User-Agent": "Antigravity-Release-Publisher"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            print("Successfully uploaded updated webtoon-scraper.exe to GitHub Release!")
            print("Response:", data)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err_msg}")

if __name__ == "__main__":
    upload_asset()
