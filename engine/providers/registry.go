package providers

import (
	"fmt"
	"sync"

	"uni-scraper-go/engine/model"
)

var (
	registryMu    sync.RWMutex
	providers     = make(map[string]Provider)
	providerOrder = make([]Provider, 0)
)

// Register adds a new Provider to the global registry.
func Register(p Provider) {
	registryMu.Lock()
	defer registryMu.Unlock()
	if p != nil {
		if _, exists := providers[p.SourceID()]; !exists {
			providerOrder = append(providerOrder, p)
		}
		providers[p.SourceID()] = p
	}
}

// Get returns the Provider for a given source ID (e.g. "webtoon_id", "mangaplus_id").
func Get(sourceID string) (Provider, bool) {
	registryMu.RLock()
	defer registryMu.RUnlock()
	p, ok := providers[sourceID]
	return p, ok
}

// FindMatchingProvider returns the first Provider capable of handling the input URL or ID in deterministic order.
func FindMatchingProvider(input string) (Provider, bool) {
	registryMu.RLock()
	defer registryMu.RUnlock()
	for _, p := range providerOrder {
		if p.CanHandle(input) {
			return p, true
		}
	}
	return nil, false
}

// FetchCatalogBySource fetches catalog for a specific source ID. Defaults to "webtoon_id".
func FetchCatalogBySource(sourceID string, lang string, forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	if sourceID == "" || sourceID == "webtoon" {
		if lang == "en" {
			sourceID = "webtoon_en"
		} else {
			sourceID = "webtoon_id"
		}
	} else if sourceID == "mangaplus" {
		sourceID = "mangaplus_id"
	}

	p, ok := Get(sourceID)
	if !ok {
		// Fallback to webtoon_id if source is unrecognized
		p, ok = Get("webtoon_id")
		if !ok {
			return nil, fmt.Errorf("no registered provider found for source: %s", sourceID)
		}
	}

	return p.FetchCatalog(forceRefresh, logCb)
}
