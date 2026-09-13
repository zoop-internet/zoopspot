package relay_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	agentrelay "github.com/allannuwamanya/zoop/packages/agent/relay"
	"github.com/allannuwamanya/zoop/packages/cloud/relay"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func TestRelayRegistry_MultiRegionSelection(t *testing.T) {
	reg := relay.NewRelayRegistry()

	// Register 3 nodes across regions
	reg.RegisterNode(relay.RelayNode{
		ID:             "node-us-east-1",
		Region:         "us-east",
		Host:           "useast1.zoop.net",
		Port:           8080,
		MaxCapacity:    1000,
		ActiveSessions: 10,
	})

	reg.RegisterNode(relay.RelayNode{
		ID:             "node-eu-central-1",
		Region:         "eu-central",
		Host:           "eucentral1.zoop.net",
		Port:           8080,
		MaxCapacity:    1000,
		ActiveSessions: 5,
	})

	reg.RegisterNode(relay.RelayNode{
		ID:             "node-ap-south-1",
		Region:         "ap-south",
		Host:           "apsouth1.zoop.net",
		Port:           8080,
		MaxCapacity:    100,
		ActiveSessions: 100, // full capacity
	})

	// 1. Ap-south is at full capacity, so it must not be selected
	candidates := reg.SelectOptimalRelays("us-east", nil)
	if len(candidates) != 2 {
		t.Fatalf("expected 2 candidates (excluding full capacity node), got %d", len(candidates))
	}

	// 2. Local preferred region (us-east) should be ranked first
	if candidates[0].ID != "node-us-east-1" {
		t.Errorf("expected node-us-east-1 to be first choice, got %s", candidates[0].ID)
	}

	// 3. Dynamic RTT probe override: if client reports eu-central is faster
	customRTTs := map[string]time.Duration{
		"node-eu-central-1": 10 * time.Millisecond,
		"node-us-east-1":    80 * time.Millisecond,
	}

	candidatesWithRTT := reg.SelectOptimalRelays("us-east", customRTTs)
	if candidatesWithRTT[0].ID != "node-eu-central-1" {
		t.Errorf("expected node-eu-central-1 to be prioritized by lower RTT, got %s", candidatesWithRTT[0].ID)
	}
}

func TestTURNManager_Credentials(t *testing.T) {
	mgr := relay.NewTURNManager("super-secret-turn-key", "zoop.test")
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.NewID()

	creds := mgr.GenerateCredentials(endpointID, 1*time.Hour, "turn.zoop.net", 3478, 19302)

	if creds.Username == "" || creds.Password == "" {
		t.Fatalf("expected non-empty username and password")
	}

	if len(creds.URIs) != 3 {
		t.Fatalf("expected 3 URIs (stun, turn-udp, turn-tcp), got %d", len(creds.URIs))
	}

	// Validate credentials match
	if !mgr.ValidateCredentials(creds.Username, creds.Password) {
		t.Errorf("expected generated credentials to be valid")
	}

	// Validate forged password is rejected
	if mgr.ValidateCredentials(creds.Username, "wrong-password") {
		t.Errorf("expected forged credentials to be rejected")
	}
	_ = pub
}

func TestSessionMeter_QuotaAndAccounting(t *testing.T) {
	meter := relay.NewSessionMeter(1000) // 1000 bytes max quota
	devID := types.NewID()

	meter.RegisterSession(devID)

	// Send 400 bytes
	ok := meter.RecordInbound(devID, 400)
	if !ok {
		t.Fatalf("expected 400 bytes to be allowed")
	}

	// Send 500 bytes (total 900)
	ok = meter.RecordOutbound(devID, 500)
	if !ok {
		t.Fatalf("expected 500 bytes to be allowed")
	}

	stats, exists := meter.GetStats(devID)
	if !exists {
		t.Fatalf("expected stats to exist")
	}
	if stats.BytesIn != 400 || stats.BytesOut != 500 {
		t.Errorf("unexpected byte stats: In=%d, Out=%d", stats.BytesIn, stats.BytesOut)
	}

	// Send 200 bytes (total 1100 > 1000 quota) -> should return false
	ok = meter.RecordInbound(devID, 200)
	if ok {
		t.Errorf("expected quota breach to return false")
	}
}

func TestRelayCluster_Failover(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	identity := types.Identity{
		EndpointID: types.NewID(),
		PublicKey:  pub,
	}

	// Setup Server 2 (Backup)
	relayServer2 := relay.NewServer(slog.Default(), nil)
	ts2 := httptest.NewServer(http.HandlerFunc(relayServer2.HandleWebSocket))
	defer ts2.Close()
	wsURL2 := "ws" + strings.TrimPrefix(ts2.URL, "http")

	// Setup Server 1 (Primary - will be offline/broken)
	brokenURL1 := "ws://127.0.0.1:1" // unreachable port

	// Create MultiClient with [brokenURL1, wsURL2]
	client := agentrelay.NewMultiClient([]string{brokenURL1, wsURL2}, identity, priv, slog.Default())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		client.Start(ctx)
	}()

	// Wait up to 3 seconds for client to fail over to wsURL2
	time.Sleep(1500 * time.Millisecond)

	if !client.IsConnected() {
		t.Errorf("expected client to fail over and connect to backup relay server")
	}

	if client.GetActiveURL() != wsURL2 {
		t.Errorf("expected active URL to be %s, got %s", wsURL2, client.GetActiveURL())
	}

	client.Close()
	cancel()
	wg.Wait()
}
