package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type SSEBroadcaster struct {
	clients map[chan string]bool
	mu      sync.Mutex
}

var Broadcaster = &SSEBroadcaster{
	clients: make(map[chan string]bool),
}

func (b *SSEBroadcaster) AddClient() chan string {
	b.mu.Lock()
	defer b.mu.Unlock()
	ch := make(chan string, 100)
	b.clients[ch] = true
	return ch
}

func (b *SSEBroadcaster) RemoveClient(ch chan string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if _, ok := b.clients[ch]; ok {
		delete(b.clients, ch)
		close(ch)
	}
}

func (b *SSEBroadcaster) Broadcast(eventType string, data interface{}) {
	b.mu.Lock()
	defer b.mu.Unlock()

	payload := map[string]interface{}{
		"type": eventType,
		"data": data,
	}

	bytesData, err := json.Marshal(payload)
	if err != nil {
		return
	}

	msg := fmt.Sprintf("data: %s\n\n", string(bytesData))
	for ch := range b.clients {
		select {
		case ch <- msg:
		default:
		}
	}
}

func HandleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := Broadcaster.AddClient()
	defer Broadcaster.RemoveClient(clientChan)

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg := <-clientChan:
			fmt.Fprint(w, msg)
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}
		}
	}
}
