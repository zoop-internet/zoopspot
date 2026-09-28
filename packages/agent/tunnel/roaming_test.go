package tunnel

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func TestRoamingManagerLifecycle(t *testing.T) {
	var mu sync.Mutex
	callbackInvoked := false
	var receivedEvent NetworkChangeEvent
	var receivedCandidates []types.EndpointCandidate

	rm := NewRoamingManager("stun.l.google.com:19302", 51820, func(event NetworkChangeEvent, newCandidates []types.EndpointCandidate) {
		mu.Lock()
		defer mu.Unlock()
		callbackInvoked = true
		receivedEvent = event
		receivedCandidates = newCandidates
	}, nil)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	rm.Start(ctx)

	// Manually trigger a roam check
	rm.TriggerRoamCheck("test_wifi_roam")

	// Wait for debounce timer (500ms) to execute and STUN to resolve
	time.Sleep(3 * time.Second)

	mu.Lock()
	invoked := callbackInvoked
	reason := receivedEvent.Reason
	candLen := len(receivedCandidates)
	mu.Unlock()

	if !invoked {
		t.Errorf("Expected roaming callback to be invoked after TriggerRoamCheck")
	}
	if reason != "test_wifi_roam" {
		t.Errorf("Expected reason 'test_wifi_roam', got '%s'", reason)
	}
	t.Logf("Roaming completed with %d discovered candidates", candLen)

	rm.Stop()
}
