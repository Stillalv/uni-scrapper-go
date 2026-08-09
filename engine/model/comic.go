package model

// CatalogItem represents a unified comic entry in any comic catalog.
type CatalogItem struct {
	ID          string `json:"id"`
	Source      string `json:"source"`
	Title       string `json:"title"`
	Author      string `json:"author,omitempty"`
	Genre       string `json:"genre,omitempty"`
	CoverURL    string `json:"cover_url,omitempty"`
	URL         string `json:"url"`
	IsCompleted bool   `json:"is_completed,omitempty"`
}

// ComicInfo stores parsed metadata about a comic series.
type ComicInfo struct {
	Source      string `json:"source"`
	Lang        string `json:"lang"`
	Genre       string `json:"genre"`
	TitleSlug   string `json:"title_slug,omitempty"`
	TitleNo     string `json:"title_no"`
	Title       string `json:"title"`
	Author      string `json:"author,omitempty"`
	ListURL     string `json:"list_url"`
	CoverURL    string `json:"cover_url,omitempty"`
}
