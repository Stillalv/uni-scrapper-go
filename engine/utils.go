package engine

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// SanitizeFilename removes invalid characters for Windows file/folder names.
func SanitizeFilename(filename string) string {
	re := regexp.MustCompile(`[\\/*?:"<>|]`)
	cleaned := re.ReplaceAllString(filename, "")
	return strings.TrimSpace(cleaned)
}

// IsMatchingFormat checks magic bytes to determine if content matches target format directly.
func IsMatchingFormat(content []byte, targetFormat string) bool {
	tf := strings.ToUpper(targetFormat)
	if tf == "WEBP" {
		return len(content) > 12 && string(content[0:4]) == "RIFF" && string(content[8:12]) == "WEBP"
	} else if tf == "JPEG" || tf == "JPG" {
		return len(content) > 3 && content[0] == 0xFF && content[1] == 0xD8 && content[2] == 0xFF
	} else if tf == "PNG" {
		return len(content) > 8 && content[0] == 0x89 && string(content[1:4]) == "PNG" && string(content[4:8]) == "\r\n\x1a\n"
	}
	return false
}

// ParseChapterSelection parses user input for selection and returns corresponding episodes.
func ParseChapterSelection(selectionStr string, episodeMap map[int]Episode) []Episode {
	selectionStr = strings.ToLower(strings.TrimSpace(selectionStr))
	var selected []Episode

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

	// Check for range: e.g. "1-10" or "200-"
	rangeRegex := regexp.MustCompile(`^(\d+)-(\d*)$`)
	rangeMatches := rangeRegex.FindStringSubmatch(selectionStr)
	if len(rangeMatches) > 1 {
		start, _ := strconv.Atoi(rangeMatches[1])
		var end int
		if rangeMatches[2] != "" {
			end, _ = strconv.Atoi(rangeMatches[2])
		} else {
			// Find max episode
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

	// Check for comma-separated values: e.g. "1,3,5" or single "10"
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

// FormatFloatEp formats episode float numbers into padded string (e.g. 1 -> 001, 1.5 -> 001.5)
func FormatFloatEp(val float64) string {
	if val == float64(int64(val)) {
		return fmt.Sprintf("%03d", int64(val))
	}
	parts := strings.Split(fmt.Sprintf("%f", val), ".")
	intPart, _ := strconv.Atoi(parts[0])
	decPart := strings.TrimRight(parts[1], "0")
	return fmt.Sprintf("%03d.%s", intPart, decPart)
}
