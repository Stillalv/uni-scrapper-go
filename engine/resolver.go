package engine

import (
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers"
	"uni-scraper-go/engine/providers/webtoon"
)

// WebtoonInfo stores parsed details about a Webtoon comic.
type WebtoonInfo = model.ComicInfo

// Episode stores parsed details about an episode/chapter.
type Episode = model.Episode

// ResolveWebtoonInfo resolves comic info using matching provider or Webtoon provider.
func ResolveWebtoonInfo(rawInput string, lang string, logCb func(string)) (*WebtoonInfo, []Episode, error) {
	p, ok := providers.FindMatchingProvider(rawInput)
	if !ok {
		p = webtoon.NewWebtoonProvider(lang)
	}
	return p.ResolveComic(rawInput, logCb)
}

// GetAllEpisodes delegates episode parsing to Webtoon provider.
func GetAllEpisodes(listURL string, logCb func(string)) ([]Episode, error) {
	return webtoon.GetAllWebtoonEpisodes(listURL, logCb)
}
