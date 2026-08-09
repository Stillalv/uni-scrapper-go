package main

import (
	"fmt"
	"net/http/httptest"
	"net/url"

	"uni-scraper-go/server"
)

func main() {
	targetImg := "https://webtoon-phinf.pstatic.net/20250204_206/1738638300596cqgaM_JPEG/698.jpg?type=q90"
	req := httptest.NewRequest("GET", "/api/proxy-image?url="+url.QueryEscape(targetImg), nil)
	w := httptest.NewRecorder()

	server.HandleProxyImage(w, req)

	resp := w.Result()
	fmt.Println("Status Code:", resp.StatusCode)
	fmt.Println("Content-Type:", resp.Header.Get("Content-Type"))
	fmt.Println("Body length:", len(w.Body.Bytes()))
}
