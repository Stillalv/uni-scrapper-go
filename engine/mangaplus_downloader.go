package engine

import "uni-scraper-go/engine/providers/mangaplus"

// FetchMangaPlusChapterPages delegates page fetching to mangaplus package.
func FetchMangaPlusChapterPages(chapterID string) ([]string, []string, error) {
	return mangaplus.FetchChapterPages(chapterID)
}

// ApplyMangaPlusXORDecryption delegates XOR decryption to mangaplus package.
func ApplyMangaPlusXORDecryption(data []byte, keyHex string) []byte {
	return mangaplus.XORDecrypt(data, keyHex)
}

// ExtractChapterIDFromURL delegates chapter ID extraction to mangaplus package.
func ExtractChapterIDFromURL(viewerURL string) string {
	return mangaplus.ExtractChapterIDFromURL(viewerURL)
}
