package utils

import (
	"net"
	"net/http"
	"time"
)

// Shared HTTP Client with connection pooling, socket buffer tuning, and timeouts
var HTTPClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 60 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		ReadBufferSize:        64 * 1024, // 64KB for high-throughput gigabit streaming
		WriteBufferSize:       64 * 1024, // 64KB
	},
}

// FastHTTPClient with 15s timeout specifically for HTML page & viewer resolution (HTTP/1.1 for reliable anti-throttling)
var FastHTTPClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   6 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   50,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   6 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
		ReadBufferSize:        32 * 1024,
		WriteBufferSize:       32 * 1024,
	},
}

// UserAgents list for rotating headers across parallel scraping workers
var UserAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

// GetRandomUserAgent returns a User-Agent based on worker ID or index
func GetRandomUserAgent(idx int) string {
	return UserAgents[idx%len(UserAgents)]
}

// DefaultHeaders for general HTTP scraping requests
var DefaultHeaders = map[string]string{
	"User-Agent":      UserAgents[0],
	"Accept-Language": "id,en-US;q=0.9,en;q=0.8",
}
