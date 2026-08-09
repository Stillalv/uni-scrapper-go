package main

import (
	"fmt"

	"uni-scraper-go/engine/providers/webtoon"
)

func main() {
	p := webtoon.NewWebtoonProvider("id")
	comics, err := p.FetchCatalog(false, nil)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf("Total comics: %d\n", len(comics))
	for i := 0; i < 5; i++ {
		c := comics[i]
		fmt.Printf("%d. ID: %s | Title: %s\n   CoverURL: '%s'\n\n", i+1, c.ID, c.Title, c.CoverURL)
	}
}
