package api

import (
	"time"

	"github.com/allannuwamanya/zoop/packages/cloud/relay"
)

// RelaySelectRequest is the payload for POST /v1/relays/select
type RelaySelectRequest struct {
	PreferredRegion string           `json:"preferred_region,omitempty"`
	ClientRTTs      map[string]int64 `json:"client_rtts,omitempty"` // map[node_id]latency_in_ms
}

// RelaySelectResponse is returned by POST /v1/relays/select
type RelaySelectResponse struct {
	Relays []relay.RelayNode `json:"relays"`
}

// RelayAddRequest is the payload for POST /v1/admin/relays
type RelayAddRequest struct {
	ID           string `json:"id"`
	Region       string `json:"region"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	WebSocketURL string `json:"websocket_url,omitempty"`
	STUNPort     int    `json:"stun_port,omitempty"`
	TURNPort     int    `json:"turn_port,omitempty"`
	MaxCapacity  int    `json:"max_capacity,omitempty"`
}

// Helper to convert client ms RTTs to time.Duration
func (r *RelaySelectRequest) ToDurationRTTs() map[string]time.Duration {
	result := make(map[string]time.Duration)
	for id, ms := range r.ClientRTTs {
		result[id] = time.Duration(ms) * time.Millisecond
	}
	return result
}
