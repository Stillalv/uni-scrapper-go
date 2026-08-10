package main

import (
	"fmt"
	"net/http/httptest"
	"net/url"

	"uni-scraper-go/server"
)

func main() {
	targetImg := "https://jumpg-assets.tokyo-cdn.com/secure/title/100141/title_thumbnail_portrait_list/311764.jpg?hash=Fq9KosFvZToZU-3BnYmr5w&expires=2145884400"
	req := httptest.NewRequest("GET", "/api/proxy-image?url="+url.QueryEscape(targetImg), nil)
	w := httptest.NewRecorder()

	server.HandleProxyImage(w, req)

	resp := w.Result()
	fmt.Println("Status Code:", resp.StatusCode)
	fmt.Println("Content-Type:", resp.Header.Get("Content-Type"))
	fmt.Println("Body length:", len(w.Body.Bytes()))
}
