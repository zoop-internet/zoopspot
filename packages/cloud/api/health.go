package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/allannuwamanya/zoop/packages/core"
)

// SubsystemStatus represents the health status of a specific cloud subsystem.
type SubsystemStatus struct {
	Status  string                 `json:"status"` // "ok", "degraded", "down"
	Details map[string]interface{} `json:"details,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

// HealthResponse represents the comprehensive health report returned by /v1/health.
type HealthResponse struct {
	Status     string                     `json:"status"` // "ok", "degraded", "down"
	Version    string                     `json:"version"`
	UptimeSec  int64                      `json:"uptime_seconds"`
	Timestamp  string                     `json:"timestamp"`
	Subsystems map[string]SubsystemStatus `json:"subsystems"`
}

// HealthChecker is an interface for querying system component health.
type HealthChecker interface {
	CheckHealth() map[string]SubsystemStatus
}

// HealthHandler returns an http.HandlerFunc that renders the system health report.
func HealthHandler(startTime time.Time, checker HealthChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		subsystems := map[string]SubsystemStatus{}
		if checker != nil {
			subsystems = checker.CheckHealth()
		}

		overallStatus := "ok"
		for _, sub := range subsystems {
			if sub.Status == "down" {
				overallStatus = "down"
				break
			} else if sub.Status == "degraded" {
				overallStatus = "degraded"
			}
		}

		resp := HealthResponse{
			Status:     overallStatus,
			Version:    core.Version(),
			UptimeSec:  int64(time.Since(startTime).Seconds()),
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
			Subsystems: subsystems,
		}

		statusCode := http.StatusOK
		if overallStatus == "down" {
			statusCode = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
