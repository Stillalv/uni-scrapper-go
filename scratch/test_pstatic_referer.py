import urllib.request
import urllib.error

img_url = "https://webtoon-phinf.pstatic.net/20250204_206/1738638300596cqgaM_JPEG/698.jpg?type=q90"

def test_fetch(referer=None):
    req = urllib.request.Request(img_url)
    if referer:
        req.add_header("Referer", referer)
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Referer: '{referer}' -> Status {resp.status}, Size {len(resp.read())}")
    except urllib.error.HTTPError as e:
        print(f"Referer: '{referer}' -> HTTP Error {e.code}")

if __name__ == "__main__":
    test_fetch(None)
    test_fetch("https://www.webtoons.com/")
