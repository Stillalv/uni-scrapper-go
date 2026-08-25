package server

import (
	"sync"
	"testing"
)

func TestSSEBroadcaster_Concurrent(t *testing.T) {
	b := &SSEBroadcaster{
		clients: make(map[chan string]bool),
	}

	const numClients = 50
	var channels []chan string
	for i := 0; i < numClients; i++ {
		channels = append(channels, b.AddClient())
	}

	var wg sync.WaitGroup
	// Concurrently broadcast
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			b.Broadcast("TEST_EVENT", map[string]interface{}{"index": idx})
		}(i)
	}
	wg.Wait()

	// Clean up
	for _, ch := range channels {
		b.RemoveClient(ch)
	}
}
