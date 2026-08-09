package engine

import (
	"uni-scraper-go/engine/model"
	"uni-scraper-go/engine/providers/mangaplus"
)

// IsMangaPlusInput checks if a given input belongs to MANGA Plus.
func IsMangaPlusInput(rawInput string) bool {
	p := mangaplus.NewMangaPlusProvider("id")
	return p.CanHandle(rawInput)
}

// ResolveMangaPlusInfo resolves MANGA Plus title details and chapters.
func ResolveMangaPlusInfo(rawInput string, logCb func(string)) (*model.ComicInfo, []model.Episode, error) {
	p := mangaplus.NewMangaPlusProvider("id")
	return p.ResolveComic(rawInput, logCb)
}

// GetMangaPlusDeviceSecret delegates virtual device registration to mangaplus package.
func GetMangaPlusDeviceSecret() (string, error) {
	return mangaplus.GetDeviceSecret()
}
