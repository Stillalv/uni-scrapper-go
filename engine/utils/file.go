package utils

import (
	"regexp"
	"strings"
)

// SanitizeFilename cleans illegal characters for Windows filesystem compatibility.
func SanitizeFilename(name string) string {
	invalidChars := regexp.MustCompile(`[\\/:*?"<>|]`)
	cleaned := invalidChars.ReplaceAllString(name, "_")
	spaceRe := regexp.MustCompile(`\s+`)
	cleaned = spaceRe.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
}
