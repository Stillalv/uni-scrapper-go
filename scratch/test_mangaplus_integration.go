package main

import (
	"fmt"

	"uni-scraper-go/engine/providers"
)

func main() {
	fmt.Println("=== Testing MANGA Plus Indonesia Catalog Fetch ===")
	p, ok := providers.Get("mangaplus_id")
	if !ok {
		fmt.Println("Provider mangaplus_id not registered!")
		return
	}

	comics, err := p.FetchCatalog(false, func(msg string) {
		fmt.Println("LOG:", msg)
	})
	if err != nil {
		fmt.Println("Catalog Err:", err)
		return
	}
	fmt.Printf("Successfully loaded %d MANGA Plus Indonesian titles!\n", len(comics))
	for i, c := range comics {
		fmt.Printf("%d. [%s] %s -> %s\n", i+1, c.ID, c.Title, c.URL)
	}

	fmt.Println("\n=== Testing MANGA Plus Title Info Resolve (Boruto #400004) ===")
	info, eps, err := p.ResolveComic("400004", func(msg string) {
		fmt.Println("LOG:", msg)
	})
	if err != nil {
		fmt.Println("Resolve Err:", err)
		return
	}

	fmt.Printf("Resolved Title: %s (%s)\n", info.Title, info.Genre)
	fmt.Printf("Total Episodes Resolved: %d\n", len(eps))
	for i, ep := range eps {
		fmt.Printf(" -> Episode %d: %s (%s)\n", ep.EpisodeNo, ep.Title, ep.URL)
		if i >= 4 {
			break
		}
	}
}
