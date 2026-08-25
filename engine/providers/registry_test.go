package providers

import (
	"testing"
	"uni-scraper-go/engine/model"
)

type dummyProvider struct {
	id string
}

func (d *dummyProvider) SourceID() string                                    { return d.id }
func (d *dummyProvider) Name() string                                        { return d.id }
func (d *dummyProvider) CanHandle(input string) bool                         { return input == d.id }
func (d *dummyProvider) FetchCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	return nil, nil
}
func (d *dummyProvider) ResolveComic(input string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	return nil, nil, nil
}

func TestRegistry_DeterministicOrder(t *testing.T) {
	p1 := &dummyProvider{id: "test_dummy_1"}
	p2 := &dummyProvider{id: "test_dummy_2"}

	Register(p1)
	Register(p2)

	found, ok := FindMatchingProvider("test_dummy_1")
	if !ok || found.SourceID() != "test_dummy_1" {
		t.Fatalf("Expected test_dummy_1 to match")
	}

	found, ok = FindMatchingProvider("test_dummy_2")
	if !ok || found.SourceID() != "test_dummy_2" {
		t.Fatalf("Expected test_dummy_2 to match")
	}
}
