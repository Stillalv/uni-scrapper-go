package main

import (
	"fmt"
	"os"
	"path/filepath"
	"uni-scraper-go/engine"
)

func main() {
	fmt.Println("=== Testing Kagurabachi Download ===")
	info, eps, err := engine.ResolveMangaPlusInfo("400006", nil)
	if err != nil {
		fmt.Println("Err:", err)
		return
	}

	cfg := engine.DownloadConfig{
		OutputDir:     filepath.Join("scratch", "test_downloads"),
		Format:        "WEBP",
		MaxWorkers:    6,
		Quality:       90,
		StopRequested: new(int32),
	}

	success, total := engine.DownloadEpisodesWithGranularProgress(
		info,
		eps[:1], // Download Chapter 1 (55 pages)
		cfg,
		func(p map[string]interface{}) {
			if evt, ok := p["type"].(string); ok && evt == "CHAPTER_FINISHED" {
				fmt.Println("EVENT:", p)
			}
		},
	)

	fmt.Printf("\nResult: Downloaded %d of %d chapters.\n", success, total)

	ch1Dir := filepath.Join(cfg.OutputDir, "Kagurabachi", "Chapter 001 - Bab 1")
	files, err := os.ReadDir(ch1Dir)
	if err != nil {
		fmt.Println("ReadDir error:", err)
	} else {
		fmt.Printf("Files downloaded in '%s': %d files!\n", ch1Dir, len(files))
		for i, f := range files {
			if i < 5 {
				info, _ := f.Info()
				fmt.Printf(" - %s (%d bytes)\n", f.Name(), info.Size())
			}
		}
	}
}
