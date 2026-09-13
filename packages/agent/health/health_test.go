package health_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/allannuwamanya/zoop/packages/agent/health"
	"github.com/allannuwamanya/zoop/packages/agent/state"
	"github.com/allannuwamanya/zoop/packages/agent/telemetry"
)

func TestChecker_IsHealthy(t *testing.T) {
	sm := state.NewManager()
	checker := health.NewChecker(sm, "zoop0", "http://localhost:8080", "stun.l.google.com:19302")

	if checker.IsHealthy() {
		t.Fatalf("expected unhealthy when state is idle")
	}

	sm.Set(state.StateRunning)
	if !checker.IsHealthy() {
		t.Fatalf("expected healthy when state is running")
	}
}

func TestChecker_RunDiagnostics(t *testing.T) {
	// Mock Cloud Health Server
	cloudMock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer cloudMock.Close()

	sm := state.NewManager()
	sm.Set(state.StateRunning)

	tracker := telemetry.GetTracker()
	tracker.RecordConnectionState("peer-test-1", "connected", "direct_host", 14.5, 0.0)
	tracker.RecordPacketStats("peer-test-1", "zoop0", 5000, 3000)

	checker := health.NewChecker(sm, "nonexistent-tun-test", cloudMock.URL, "stun.l.google.com:19302")
	report := checker.RunDiagnostics(context.Background())

	if report.AgentState != "RUNNING" {
		t.Errorf("expected agent state RUNNING, got %s", report.AgentState)
	}

	if len(report.Checks) < 4 {
		t.Errorf("expected at least 4 diagnostic checks, got %d", len(report.Checks))
	}

	if len(report.PeerTelemetry) == 0 {
		t.Errorf("expected peer telemetry snapshot, got none")
	}

	jsonStr := report.FormatJSON()
	if len(jsonStr) == 0 {
		t.Errorf("expected non-empty JSON report")
	}

	// Verify HTTP writer
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	checker.WriteHTTP(rec, req)
	if rec.Code != http.StatusOK && rec.Code != http.StatusServiceUnavailable {
		t.Errorf("unexpected status code %d", rec.Code)
	}
}
