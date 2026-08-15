package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPRequestsTotal counts total incoming HTTP requests partitioned by method, path, and status code.
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "http_requests_total",
			Help:      "Total number of HTTP requests processed by the control plane.",
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestDuration tracks request latency distributions in seconds.
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "http_request_duration_seconds",
			Help:      "Histogram of HTTP request latency in seconds.",
			Buckets:   prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	// ActiveConnectionsTotal gauges current live active peer connections.
	ActiveConnectionsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "active_connections_total",
			Help:      "Number of currently active WireGuard peer connections registered.",
		},
	)

	// ActiveSignalingSessions gauges current active WebSocket signaling sessions.
	ActiveSignalingSessions = promauto.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "active_signaling_sessions",
			Help:      "Number of currently connected WebSocket signaling clients.",
		},
	)

	// SignalingMessagesTotal counts total signaling messages sent and received.
	SignalingMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "signaling_messages_total",
			Help:      "Total number of signaling messages exchanged.",
		},
		[]string{"direction", "type"},
	)

	// RelayedBytesTotal tracks the cumulative volume of data forwarded through relay nodes.
	RelayedBytesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "zoop",
			Subsystem: "cloud",
			Name:      "relayed_bytes_total",
			Help:      "Total number of bytes forwarded through cloud relay nodes.",
		},
		[]string{"relay_id"},
	)
)

// responseWriterWrapper captures status code for metrics recording.
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// MetricsMiddleware records Prometheus metrics for each handled HTTP request.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		path := r.Pattern
		if path == "" {
			path = r.URL.Path
		}

		HTTPRequestsTotal.WithLabelValues(r.Method, path, strconv.Itoa(rw.statusCode)).Inc()
		HTTPRequestDuration.WithLabelValues(r.Method, path).Observe(duration)
	})
}
