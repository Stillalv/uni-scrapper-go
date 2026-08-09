package engine

import (
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers"
)

// FetchMangaPlusCatalog delegates MANGA Plus catalog fetch to Provider Registry.
func FetchMangaPlusCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	return providers.FetchCatalogBySource("mangaplus_id", "id", forceRefresh, logCb)
}
