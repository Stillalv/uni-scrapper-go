package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
)

func main() {
	targetImg := "https://webtoon-phinf.pstatic.net/20250204_206/1738638300596cqgaM_JPEG/698.jpg?type=q90"
	proxyURL := fmt.Sprintf("http://127.0.0.1:8080/api/proxy-image?url=%s", url.QueryEscape(targetImg))

	req, _ := http.NewRequest("GET", proxyURL, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Error connecting to local server:", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("Proxy Status Code:", resp.StatusCode)
	fmt.Println("Content-Type:", resp.Header.Get("Content-Type"))
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Received %d bytes of image data\n", len(body))
}
