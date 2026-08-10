package main

import (
	"fmt"

	"time"

	"uni-scraper-go/engine/providers/mangaplus"
)

func main() {
	p := mangaplus.NewMangaPlusProvider("id")

	fmt.Println("=== 1. Benchmarking MANGA Plus Catalog Fetch (Fresh No-Cache) ===")
	t0 := time.Now()
	comics, err := p.FetchCatalog(true, nil)
	tCatalog := time.Since(t0)
	if err != nil {
		fmt.Println("Catalog Error:", err)
		return
	}
	fmt.Printf("Catalog fetched in %v (Loaded %d comics)\n", tCatalog, len(comics))

	fmt.Println("\n=== 2. Benchmarking MANGA Plus Title Resolve (Kagurabachi 400006) ===")
	t1 := time.Now()
	info, eps, err := p.ResolveComic("400006", nil)
	tResolve := time.Since(t1)
	if err != nil {
		fmt.Println("Resolve Error:", err)
		return
	}
	fmt.Printf("Title resolved in %v (Title: %s, Chapters: %d)\n", tResolve, info.Title, len(eps))

	fmt.Println("\n=== 3. Benchmarking Parallel Fetch of 10 Chapter Viewers ===")
	t2 := time.Now()
	sampleEps := eps
	if len(sampleEps) > 10 {
		sampleEps = sampleEps[:10]
	}
	for i, ep := range sampleEps {
		chID := mangaplus.ExtractChapterIDFromURL(ep.URL)
		_, _, err := mangaplus.FetchChapterPages(chID)
		if err != nil {
			fmt.Printf("Chapter %d Error: %v\n", i+1, err)
		}
	}
	tViewers := time.Since(t2)
	fmt.Printf("10 Chapter Viewers fetched in %v (Avg %.2f ms/chapter)\n", tViewers, float64(tViewers.Milliseconds())/10.0)
}
