package utils

import (
	"fmt"
	"io"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"uni-scraper-go/engine/model"
)

// Pre-compiled package-level regular expressions to eliminate runtime compilation overhead
var (
	reInvalidFileChars = regexp.MustCompile(`[\\/:*?"<>|]`)
	reMultiSpaces      = regexp.MustCompile(`\s+`)
	reSpecialMarkers   = regexp.MustCompile(`(^|[^a-z])(prolog|prologue|epilog|epilogue|special|extra|bonus|side[ -]?story|non[ -]?canon|omake|interlude|preview|teaser|afterword)([^a-z]|$)`)
	reChapterZero      = regexp.MustCompile(`^(episode|chapter)\s*0\b`)
	reRangeSelection   = regexp.MustCompile(`^(\d+)-(\d*)$`)
)

// SanitizeFilename cleans illegal characters for Windows filesystem compatibility.
func SanitizeFilename(name string) string {
	cleaned := reInvalidFileChars.ReplaceAllString(name, "_")
	cleaned = reMultiSpaces.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
}

// AssignChapterDisplayNumbers keeps EpisodeNo as the stable source ID while
// giving prologues, extras, and other special episodes readable decimal names.
func AssignChapterDisplayNumbers(episodes []model.Episode) []model.Episode {
	previousCanonical := 0
	specialSlots := make(map[int]int)

	for i := range episodes {
		ep := &episodes[i]
		if !isSpecialEpisode(ep.Title) {
			previousCanonical++
			ep.ChNum = fmt.Sprintf("%03d", previousCanonical)
		} else {
			slot := specialSlots[previousCanonical]
			specialSlots[previousCanonical] = slot + 1
			ep.ChNum = fmt.Sprintf("%03d.%d", previousCanonical, slot+5)
		}
		ep.FolderName = SanitizeFilename(fmt.Sprintf("Chapter %s - %s", ep.ChNum, ep.Title))
	}
	return episodes
}

func isSpecialEpisode(title string) bool {
	title = strings.ToLower(strings.TrimSpace(title))
	if title == "" {
		return false
	}
	return reSpecialMarkers.MatchString(title) || reChapterZero.MatchString(title)
}

// ParseChapterSelection parses user input for selection and returns corresponding episodes.
func ParseChapterSelection(selectionStr string, episodeMap map[int]model.Episode) []model.Episode {
	selectionStr = strings.ToLower(strings.TrimSpace(selectionStr))
	var selected []model.Episode

	if selectionStr == "all" || selectionStr == "" {
		keys := make([]int, 0, len(episodeMap))
		for k := range episodeMap {
			keys = append(keys, k)
		}
		sort.Ints(keys)
		for _, k := range keys {
			selected = append(selected, episodeMap[k])
		}
		return selected
	}

	rangeMatches := reRangeSelection.FindStringSubmatch(selectionStr)
	if len(rangeMatches) > 1 {
		start, _ := strconv.Atoi(rangeMatches[1])
		var end int
		if rangeMatches[2] != "" {
			end, _ = strconv.Atoi(rangeMatches[2])
		} else {
			maxEp := 0
			for epNo := range episodeMap {
				if epNo > maxEp {
					maxEp = epNo
				}
			}
			end = maxEp
		}

		keys := make([]int, 0, len(episodeMap))
		for k := range episodeMap {
			if k >= start && k <= end {
				keys = append(keys, k)
			}
		}
		sort.Ints(keys)
		for _, k := range keys {
			selected = append(selected, episodeMap[k])
		}
		return selected
	}

	parts := strings.Split(selectionStr, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if epNo, err := strconv.Atoi(part); err == nil {
			if ep, exists := episodeMap[epNo]; exists {
				selected = append(selected, ep)
			}
		}
	}

	return selected
}

// IsEmptyDir checks if a directory exists and contains 0 files/subdirectories.
func IsEmptyDir(dirPath string) bool {
	f, err := os.Open(dirPath)
	if err != nil {
		return false
	}
	defer f.Close()

	names, err := f.Readdirnames(1)
	if err != nil && err != io.EOF {
		return false
	}
	return len(names) == 0
}

// RemoveEmptyDir removes a directory if it exists and is completely empty (0 files).
func RemoveEmptyDir(dirPath string) {
	if IsEmptyDir(dirPath) {
		_ = os.Remove(dirPath)
	}
}
