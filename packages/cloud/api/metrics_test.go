package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
)

func TestMetricsMiddleware(t *testing.T) {
	innerHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	wrapped := api.MetricsMiddleware(innerHandler)

	req := httptest.NewRequest(http.MethodGet, "/test-metrics-path", nil)
	rec := httptest.NewRecorder()

	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	// Update custom metric counters and gauges to verify registration
	api.ActiveConnectionsTotal.Inc()
	api.ActiveConnectionsTotal.Dec()
	api.ActiveSignalingSessions.Set(5)
	api.SignalingMessagesTotal.WithLabelValues("in", "offer").Inc()
	api.RelayedBytesTotal.WithLabelValues("relay-us-east").Add(1024)
}
