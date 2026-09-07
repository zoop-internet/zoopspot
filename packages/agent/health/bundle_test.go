package health_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/agent/telemetry"
)

func TestGenerateBundle_PrivacyAndSanitization(t *testing.T) {
	// Setup mock cloud server
	cloudMock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer cloudMock.Close()

	sm := state.NewManager()
	sm.Set(state.StateRunning)

	tracker := telemetry.GetTracker()
	rawPeerID := "client-device-uuid-1234-5678"
	tracker.RecordConnectionState(rawPeerID, "connected", "direct_host", 12.4, 0.0)
	tracker.RecordPacketStats(rawPeerID, "zoop0", 1024, 2048)

	checker := health.NewChecker(sm, "zoop0", cloudMock.URL, "stun.l.google.com:19302")
	bundle, err := health.GenerateBundle(context.Background(), checker, tracker)
	if err != nil {
		t.Fatalf("GenerateBundle failed: %v", err)
	}

	if bundle == nil {
		t.Fatalf("expected bundle to be non-nil")
	}

	if !strings.HasPrefix(bundle.BundleID, "zb-") {
		t.Errorf("expected bundle ID with prefix zb-, got %s", bundle.BundleID)
	}

	jsonStr, err := bundle.ToJSON()
	if err != nil {
		t.Fatalf("failed to serialize bundle to JSON: %v", err)
	}

	// 1. Verify the raw peer ID does NOT appear in the JSON output
	if strings.Contains(jsonStr, rawPeerID) {
		t.Errorf("security violation: raw peer ID %s found in diagnostic bundle JSON", rawPeerID)
	}

	// 2. Verify that peer telemetry is pseudonymized
	if len(bundle.PeerTelemetry) == 0 {
		t.Fatalf("expected at least one peer telemetry entry")
	}
	for _, p := range bundle.PeerTelemetry {
		if !strings.HasPrefix(p.PseudonymID, "peer-") {
			t.Errorf("expected pseudonymized peer ID format, got %s", p.PseudonymID)
		}
		if p.PseudonymID == rawPeerID {
			t.Errorf("pseudonym matches raw peer ID")
		}
	}

	// 3. Verify valid JSON parse
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		t.Fatalf("bundle JSON is invalid: %v", err)
	}
}

func TestSanitizePeerID(t *testing.T) {
	salt := []byte("test-salt-123456")
	id1 := health.SanitizePeerID("peer-alice", salt)
	id2 := health.SanitizePeerID("peer-bob", salt)
	id1Repeat := health.SanitizePeerID("peer-alice", salt)

	if id1 != id1Repeat {
		t.Errorf("expected deterministic pseudonymization with same salt")
	}

	if id1 == id2 {
		t.Errorf("expected distinct pseudonyms for distinct IDs")
	}

	if !strings.HasPrefix(id1, "peer-") {
		t.Errorf("expected prefix peer-, got %s", id1)
	}
}
