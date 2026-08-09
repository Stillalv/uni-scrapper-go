package main

import (
	"fmt"
	"uni-scraper-go/engine"
)

func main() {
	fmt.Println("=== Debugging Kagurabachi (#400006) ===")
	info, eps, err := engine.ResolveMangaPlusInfo("400006", func(msg string) {
		fmt.Println("LOG:", msg)
	})
	if err != nil {
		fmt.Println("Resolve Error:", err)
		return
	}

	fmt.Printf("Resolved Comic: %s, Total Episodes: %d\n", info.Title, len(eps))
	for i, ep := range eps {
		fmt.Printf("Episode %d: %s -> %s\n", ep.EpisodeNo, ep.Title, ep.URL)
		if i == 0 {
			chID := engine.ExtractChapterIDFromURL(ep.URL)
			fmt.Printf("Extracting pages for Chapter ID %s...\n", chID)
			urls, keys, err := engine.FetchMangaPlusChapterPages(chID)
			if err != nil {
				fmt.Println("Fetch pages error:", err)
			} else {
				fmt.Printf("Extracted %d page URLs and %d encryption keys!\n", len(urls), len(keys))
				for j, u := range urls {
					if j < 5 {
						fmt.Printf(" Page %d: %s\n", j+1, u)
					}
				}
			}
		}
	}
}
