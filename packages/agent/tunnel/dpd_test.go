package tunnel_test

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
)

func TestDeadPeerDetector_LivelinessFlow(t *testing.T) {
	var deadTriggered int32
	var suspectTriggered int32
	var aliveTriggered int32

	cfg := tunnel.DPDConfig{
		CheckInterval:     10 * time.Millisecond,
		InitialTimeout:    50 * time.Millisecond,
		MaxBackoffTimeout: 200 * time.Millisecond,
		BackoffMultiplier: 2.0,
		MaxRetries:        2,
	}

	dpd := tunnel.NewDeadPeerDetector(
		cfg,
		func() { atomic.AddInt32(&deadTriggered, 1) },
		func(retries int, nextBackoff time.Duration) { atomic.AddInt32(&suspectTriggered, 1) },
		func() { atomic.AddInt32(&aliveTriggered, 1) },
		nil,
	)

	// 1. Initial state is alive
	st, retries, timeout := dpd.GetStatus()
	if st != tunnel.DPDStateAlive {
		t.Errorf("expected DPDStateAlive, got %s", st)
	}
	if retries != 0 {
		t.Errorf("expected 0 retries, got %d", retries)
	}
	if timeout != 50*time.Millisecond {
		t.Errorf("expected 50ms initial timeout, got %v", timeout)
	}

	// 2. Fresh handshake
	freshTime := time.Now()
	if !dpd.RecordHandshake(freshTime) {
		t.Errorf("expected alive on fresh handshake")
	}

	// 3. Stale handshake -> triggers suspect (retry 1)
	staleTime := time.Now().Add(-100 * time.Millisecond)
	if dpd.RecordHandshake(staleTime) {
		t.Errorf("expected false on stale handshake")
	}
	st, retries, timeout = dpd.GetStatus()
	if st != tunnel.DPDStateSuspect {
		t.Errorf("expected DPDStateSuspect, got %s", st)
	}
	if retries != 1 {
		t.Errorf("expected retry 1, got %d", retries)
	}
	if timeout != 100*time.Millisecond {
		t.Errorf("expected backed-off timeout 100ms, got %v", timeout)
	}

	// 4. Stale handshake again -> max retries reached -> triggers dead
	if dpd.RecordHandshake(staleTime) {
		t.Errorf("expected false on second stale handshake")
	}
	st, retries, _ = dpd.GetStatus()
	if st != tunnel.DPDStateDead {
		t.Errorf("expected DPDStateDead, got %s", st)
	}
	if retries != 2 {
		t.Errorf("expected retry 2, got %d", retries)
	}

	time.Sleep(20 * time.Millisecond)
	if atomic.LoadInt32(&deadTriggered) == 0 {
		t.Errorf("expected dead callback to have fired")
	}

	// 5. Recovery reset
	dpd.Reset()
	st, retries, timeout = dpd.GetStatus()
	if st != tunnel.DPDStateAlive {
		t.Errorf("expected DPDStateAlive after reset, got %s", st)
	}
	if retries != 0 {
		t.Errorf("expected 0 retries after reset, got %d", retries)
	}
	if timeout != 50*time.Millisecond {
		t.Errorf("expected initial timeout 50ms after reset, got %v", timeout)
	}
}

func TestDeadPeerDetector_RecordActivity(t *testing.T) {
	cfg := tunnel.DPDConfig{
		CheckInterval:     10 * time.Millisecond,
		InitialTimeout:    50 * time.Millisecond,
		MaxBackoffTimeout: 200 * time.Millisecond,
		BackoffMultiplier: 2.0,
		MaxRetries:        2,
	}

	dpd := tunnel.NewDeadPeerDetector(cfg, nil, nil, nil, nil)

	// Initial handshake and byte observation
	staleTime := time.Now().Add(-100 * time.Millisecond) // Older than 50ms
	rxBytes := int64(1024)

	// First call establishes baseline rxBytes
	dpd.RecordActivity(time.Now(), rxBytes)

	// Stale handshake but RX bytes increased -> must remain ALIVE
	rxBytes += 500
	if !dpd.RecordActivity(staleTime, rxBytes) {
		t.Errorf("expected alive when rxBytes increments despite stale handshake")
	}
	st, retries, _ := dpd.GetStatus()
	if st != tunnel.DPDStateAlive || retries != 0 {
		t.Errorf("expected alive with 0 retries, got state=%s, retries=%d", st, retries)
	}

	// Stale handshake AND static rxBytes -> must become SUSPECT (retry 1)
	if dpd.RecordActivity(staleTime, rxBytes) {
		t.Errorf("expected false when handshake is stale and rxBytes is static")
	}
	st, retries, _ = dpd.GetStatus()
	if st != tunnel.DPDStateSuspect || retries != 1 {
		t.Errorf("expected suspect with retry 1, got state=%s, retries=%d", st, retries)
	}

	// Another stale check -> max retries reached -> DEAD
	if dpd.RecordActivity(staleTime, rxBytes) {
		t.Errorf("expected false on second failure")
	}
	st, retries, _ = dpd.GetStatus()
	if st != tunnel.DPDStateDead || retries != 2 {
		t.Errorf("expected dead with retry 2, got state=%s, retries=%d", st, retries)
	}

	// New traffic arrives -> should revive back to ALIVE
	rxBytes += 256
	if !dpd.RecordActivity(staleTime, rxBytes) {
		t.Errorf("expected revived to alive when new rxBytes arrives")
	}
	st, retries, _ = dpd.GetStatus()
	if st != tunnel.DPDStateAlive || retries != 0 {
		t.Errorf("expected revived alive with 0 retries, got state=%s, retries=%d", st, retries)
	}
}

func TestDefaultDPDConfig(t *testing.T) {
	cfg := tunnel.DefaultDPDConfig()
	if cfg.InitialTimeout != 135*time.Second {
		t.Errorf("expected InitialTimeout 135s matching WireGuard rekey margin, got %v", cfg.InitialTimeout)
	}
	if cfg.MaxBackoffTimeout != 180*time.Second {
		t.Errorf("expected MaxBackoffTimeout 180s matching WireGuard reject time, got %v", cfg.MaxBackoffTimeout)
	}
	if cfg.MaxRetries != 3 {
		t.Errorf("expected MaxRetries 3, got %d", cfg.MaxRetries)
	}
}
