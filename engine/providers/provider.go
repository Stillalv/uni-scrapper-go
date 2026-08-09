package providers

import "uni-scraper-go/engine/model"

// Provider defines the standard interface for any comic catalog & scraping provider.
type Provider interface {
	SourceID() string
	Name() string
	FetchCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error)
	CanHandle(input string) bool
	ResolveComic(input string, logCb func(string)) (*model.ComicInfo, []model.Episode, error)
}
