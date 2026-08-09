package engine

import (
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers"
)

// Comic stores catalog metadata for backwards compatibility.
type Comic = model.CatalogItem

// FetchWebtoonCatalog fetches catalog for Webtoon (or delegates via provider registry).
func FetchWebtoonCatalog(lang string, forceRefresh bool, logCb func(string)) ([]Comic, error) {
	sID := "webtoon_id"
	if lang == "en" {
		sID = "webtoon_en"
	}
	return providers.FetchCatalogBySource(sID, lang, forceRefresh, logCb)
}
