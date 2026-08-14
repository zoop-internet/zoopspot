package api

import (
	"fmt"
	"testing"
	"time"
)

func TestNonceCache_BoundedLimit(t *testing.T) {
	maxCap := 100
	nc := NewBoundedNonceCache(maxCap)

	// Fill cache to capacity
	for i := 0; i < maxCap; i++ {
		nonce := fmt.Sprintf("nonce-%d", i)
		if !nc.CheckAndSet(nonce, 10*time.Minute) {
			t.Fatalf("expected nonce %s to be set", nonce)
		}
	}

	// Verify duplicate is rejected
	if nc.CheckAndSet("nonce-0", 10*time.Minute) {
		t.Fatalf("expected duplicate nonce-0 to be rejected")
	}

	// Insert beyond capacity: should trigger eviction of older/expired entries instead of growing infinitely
	for i := maxCap; i < maxCap+50; i++ {
		nonce := fmt.Sprintf("nonce-%d", i)
		nc.CheckAndSet(nonce, 10*time.Minute)
	}

	nc.mu.Lock()
	mapLen := len(nc.nonces)
	nc.mu.Unlock()

	if mapLen > maxCap+10 {
		t.Errorf("expected map length to stay close to maxCap %d, got %d", maxCap, mapLen)
	}
}
