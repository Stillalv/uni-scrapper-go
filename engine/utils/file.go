package utils

import (
	"regexp"
	"sort"
	"strconv"
	"strings"

	"uni-scraper-go/engine/model"
)

// SanitizeFilename cleans illegal characters for Windows filesystem compatibility.
func SanitizeFilename(name string) string {
	invalidChars := regexp.MustCompile(`[\\/:*?"<>|]`)
	cleaned := invalidChars.ReplaceAllString(name, "_")
	spaceRe := regexp.MustCompile(`\s+`)
	cleaned = spaceRe.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
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

	rangeRegex := regexp.MustCompile(`^(\d+)-(\d*)$`)
	rangeMatches := rangeRegex.FindStringSubmatch(selectionStr)
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
