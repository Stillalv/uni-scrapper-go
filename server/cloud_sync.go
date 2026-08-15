package server

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type cloudSyncClient struct {
	baseURL string
	token   string
	userID  string
	device  string
}

const defaultCloudSyncURL = "https://webtoon-sync.rahmat-jayadi-191205.workers.dev"

type cloudSyncBootstrap struct {
	UserID        string                   `json:"user_id"`
	DeviceID      string                   `json:"device_id"`
	ServerTime    string                   `json:"server_time"`
	Bookmarks     []map[string]interface{} `json:"bookmarks"`
	History       []map[string]interface{} `json:"history"`
	Settings      []map[string]interface{} `json:"settings"`
	BookmarkCount int                      `json:"bookmark_count"`
}

func NewCloudSyncClient(cfg SavedConfig) *cloudSyncClient {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.CloudSyncURL), "/")
	if baseURL == "" {
		baseURL = defaultCloudSyncURL
	}
	return &cloudSyncClient{
		baseURL: baseURL,
		token:   strings.TrimSpace(cfg.CloudSyncToken),
		userID:  strings.TrimSpace(cfg.CloudSyncUserID),
		device:  strings.TrimSpace(cfg.CloudSyncDeviceID),
	}
}

func (c *cloudSyncClient) Enabled() bool {
	return c != nil && c.baseURL != "" && c.token != ""
}

func (c *cloudSyncClient) request(method, path string, payload interface{}, result interface{}) error {
	if !c.Enabled() {
		return fmt.Errorf("cloud sync is not configured")
	}

	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, c.baseURL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("cloud sync returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(data)))
	}
	if result != nil && len(data) > 0 {
		if err := json.Unmarshal(data, result); err != nil {
			return fmt.Errorf("invalid cloud sync response: %w", err)
		}
	}
	return nil
}

func (c *cloudSyncClient) RegisterDevice() error {
	var result map[string]interface{}
	return c.request(http.MethodPost, "/v1/device/register", map[string]interface{}{
		"device_id": c.device,
		"name":      c.device,
		"platform":  "windows-desktop",
	}, &result)
}

func (c *cloudSyncClient) Bootstrap() (cloudSyncBootstrap, error) {
	var result cloudSyncBootstrap
	err := c.request(http.MethodPost, "/v1/bootstrap", map[string]interface{}{"device_id": c.device}, &result)
	return result, err
}

func (c *cloudSyncClient) SyncCollection(kind string, records []map[string]interface{}) ([]map[string]interface{}, error) {
	var result struct {
		Records []map[string]interface{} `json:"records"`
	}
	err := c.request(http.MethodPost, "/v1/"+kind+"/sync", map[string]interface{}{"records": records}, &result)
	return result.Records, err
}

func (c *cloudSyncClient) DeleteRecord(kind, id string) error {
	if id == "" {
		return nil
	}
	var result map[string]interface{}
	return c.request(http.MethodDelete, "/v1/"+kind+"/"+url.PathEscape(id), nil, &result)
}

func (c *cloudSyncClient) SyncSettings(settings []map[string]interface{}) ([]map[string]interface{}, error) {
	var result struct {
		Records []map[string]interface{} `json:"records"`
	}
	err := c.request(http.MethodPost, "/v1/settings/sync", map[string]interface{}{"records": settings}, &result)
	return result.Records, err
}

func newDeviceID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "desktop-" + hex.EncodeToString(buf), nil
}
