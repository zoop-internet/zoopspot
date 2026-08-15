package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/zoop-internet/zoop/packages/cloud/api"
)

type mockHealthChecker struct {
	subsystems map[string]api.SubsystemStatus
}

func (m *mockHealthChecker) CheckHealth() map[string]api.SubsystemStatus {
	return m.subsystems
}

func TestHealthHandler_AllOK(t *testing.T) {
	checker := &mockHealthChecker{
		subsystems: map[string]api.SubsystemStatus{
			"store":     {Status: "ok"},
			"signaling": {Status: "ok"},
			"relays":    {Status: "ok", Details: map[string]interface{}{"count": 2}},
		},
	}

	handler := api.HealthHandler(time.Now().Add(-10*time.Second), checker)

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp api.HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "ok" {
		t.Errorf("expected overall status ok, got %s", resp.Status)
	}
	if resp.UptimeSec < 10 {
		t.Errorf("expected uptime >= 10s, got %d", resp.UptimeSec)
	}
	if len(resp.Subsystems) != 3 {
		t.Errorf("expected 3 subsystems, got %d", len(resp.Subsystems))
	}
}

func TestHealthHandler_DegradedAndDown(t *testing.T) {
	// 1. Degraded check
	degradedChecker := &mockHealthChecker{
		subsystems: map[string]api.SubsystemStatus{
			"store":  {Status: "ok"},
			"relays": {Status: "degraded", Details: map[string]interface{}{"reason": "1 of 2 offline"}},
		},
	}
	h1 := api.HealthHandler(time.Now(), degradedChecker)
	req1 := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	rec1 := httptest.NewRecorder()
	h1(rec1, req1)

	if rec1.Code != http.StatusOK {
		t.Fatalf("expected status 200 for degraded, got %d", rec1.Code)
	}
	var resp1 api.HealthResponse
	_ = json.NewDecoder(rec1.Body).Decode(&resp1)
	if resp1.Status != "degraded" {
		t.Errorf("expected overall status degraded, got %s", resp1.Status)
	}

	// 2. Down check
	downChecker := &mockHealthChecker{
		subsystems: map[string]api.SubsystemStatus{
			"store": {Status: "down", Error: "database connection refused"},
		},
	}
	h2 := api.HealthHandler(time.Now(), downChecker)
	req2 := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	rec2 := httptest.NewRecorder()
	h2(rec2, req2)

	if rec2.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503 for down, got %d", rec2.Code)
	}
	var resp2 api.HealthResponse
	_ = json.NewDecoder(rec2.Body).Decode(&resp2)
	if resp2.Status != "down" {
		t.Errorf("expected overall status down, got %s", resp2.Status)
	}
}
