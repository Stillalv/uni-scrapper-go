package naver

import (
	"strings"

	"uni-scraper-go/engine/model"
)

// NaverProvider implements the Provider interface for Naver Webtoon Korea (comic.naver.com).
type NaverProvider struct {
	lang     string
	sourceID string
	name     string
}

// NewNaverProvider creates a new NaverProvider instance for Korean language.
func NewNaverProvider(lang string) *NaverProvider {
	if lang == "" {
		lang = "ko"
	}
	return &NaverProvider{
		lang:     lang,
		sourceID: "naver_ko",
		name:     "Naver Webtoon (Korean)",
	}
}

// SourceID returns the unique identifier for this provider.
func (p *NaverProvider) SourceID() string {
	return p.sourceID
}

// Name returns the display name for this provider.
func (p *NaverProvider) Name() string {
	return p.name
}

// CanHandle determines whether the input string (URL or ID) can be handled by this provider.
func (p *NaverProvider) CanHandle(input string) bool {
	clean := strings.TrimSpace(input)
	if strings.Contains(clean, "comic.naver.com") || strings.Contains(clean, "m.comic.naver.com") {
		return true
	}
	if strings.HasPrefix(strings.ToLower(clean), "naver:") {
		return true
	}
	return false
}

// FetchCatalog crawls all schedules from Naver Webtoon and caches the result for 24 hours.
func (p *NaverProvider) FetchCatalog(forceRefresh bool, logCb func(string)) ([]model.CatalogItem, error) {
	return fetchNaverCatalog(forceRefresh, logCb)
}

// ResolveComic resolves comic metadata and retrieves all chapters for a given URL or TitleID.
func (p *NaverProvider) ResolveComic(input string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	return resolveNaverComic(input, p.sourceID, logCb)
}
