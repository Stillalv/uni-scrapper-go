package mangaplus

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sync"
	"uni-scraper-go/engine/utils"
)

var (
	mangaPlusSecret   string
	mangaPlusSecretMu sync.Mutex
)

// GetDeviceSecret registers a virtual Android device and returns the device secret.
func GetDeviceSecret() (string, error) {
	mangaPlusSecretMu.Lock()
	defer mangaPlusSecretMu.Unlock()

	if mangaPlusSecret != "" {
		return mangaPlusSecret, nil
	}

	randomBytes := make([]byte, 8)
	_, _ = rand.Read(randomBytes)
	androidID := hex.EncodeToString(randomBytes)

	h1 := md5.Sum([]byte(androidID))
	deviceToken := hex.EncodeToString(h1[:])

	h2 := md5.Sum([]byte(deviceToken + "4Kin9vGg"))
	securityKey := hex.EncodeToString(h2[:])

	url := fmt.Sprintf("https://jumpg-api.tokyo-cdn.com/api/register?os=android&os_ver=33&app_ver=240&device_token=%s&security_key=%s", deviceToken, securityKey)
	req, err := http.NewRequest("PUT", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "okhttp/4.9.0")
	req.Header.Set("Accept", "*/*")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	strRe := regexp.MustCompile(`[a-f0-9]{32}`)
	matches := strRe.FindAllString(string(body), -1)
	if len(matches) > 0 {
		mangaPlusSecret = matches[0]
		return mangaPlusSecret, nil
	}

	return "", fmt.Errorf("failed to extract device secret from register response")
}
