package main

import (
	"fmt"

	"uni-scraper-go/engine/providers/mangaplus"
)

func main() {
	p := mangaplus.NewMangaPlusProvider("id")
	comics, err := p.FetchCatalog(true, nil)
	if err != nil {
		fmt.Println("Err:", err)
		return
	}
	fmt.Printf("Loaded %d MANGA Plus comics with covers:\n", len(comics))
	for i, c := range comics {
		fmt.Printf("%d. %s\n   ID: %s | Cover: %s\n\n", i+1, c.Title, c.ID, c.CoverURL)
		if i >= 4 {
			break
		}
	}
}
