package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	targetURL := "https://www.webtoons.com/id/originals/monday?sortOrder=MANA"
	req, _ := http.NewRequest("GET", targetURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	req.Header.Set("Referer", "https://www.webtoons.com/")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()

	doc, _ := goquery.NewDocumentFromReader(resp.Body)
	count := 0
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "title_no=") {
			return
		}
		imgTag := s.Find("img")
		imgSrc, _ := imgTag.Attr("src")
		if imgSrc == "" {
			imgSrc, _ = imgTag.Attr("data-url")
		}
		title := strings.TrimSpace(s.Find(".subj, .title").Text())
		if title != "" && imgSrc != "" && count < 5 {
			fmt.Printf("Comic: %s\nCover: %s\n\n", title, imgSrc)
			count++
		}
	})
}
