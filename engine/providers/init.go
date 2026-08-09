package providers

import (
	"uni-scraper-go/engine/providers/mangaplus"
	"uni-scraper-go/engine/providers/webtoon"
)

func init() {
	// Register LINE Webtoon Indonesia
	Register(webtoon.NewWebtoonProvider("id"))

	// Register LINE Webtoon English
	Register(webtoon.NewWebtoonProvider("en"))

	// Register MANGA Plus Indonesia
	Register(mangaplus.NewMangaPlusProvider("id"))
}
