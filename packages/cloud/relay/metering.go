package relay

import (
	"sync"
	"sync/atomic"
	"time"

	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// SessionStats tracks real-time traffic statistics for a single active relay session.
type SessionStats struct {
	BytesIn      uint64    `json:"bytes_in"`
	BytesOut     uint64    `json:"bytes_out"`
	PacketsIn    uint64    `json:"packets_in"`
	PacketsOut   uint64    `json:"packets_out"`
	ConnectedAt  time.Time `json:"connected_at"`
	LastActiveAt time.Time `json:"last_active_at"`
}

// SessionMeter manages real-time bandwidth accounting and rate-limiting per connected agent.
type SessionMeter struct {
	mu            sync.RWMutex
	sessions      map[types.ID]*SessionStats
	maxBytesTotal uint64 // 0 for unlimited
}

// NewSessionMeter creates a new SessionMeter instance.
func NewSessionMeter(maxBytesPerSession uint64) *SessionMeter {
	return &SessionMeter{
		sessions:      make(map[types.ID]*SessionStats),
		maxBytesTotal: maxBytesPerSession,
	}
}

// RegisterSession starts tracking a new connected device session.
func (m *SessionMeter) RegisterSession(id types.ID) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	m.sessions[id] = &SessionStats{
		ConnectedAt:  now,
		LastActiveAt: now,
	}
}

// UnregisterSession removes a session from active metering.
func (m *SessionMeter) UnregisterSession(id types.ID) *SessionStats {
	m.mu.Lock()
	defer m.mu.Unlock()

	stats, exists := m.sessions[id]
	if exists {
		delete(m.sessions, id)
	}
	return stats
}

// RecordInbound adds bytes received from an agent (Inbound to relay).
// Returns false if session has exceeded total quota.
func (m *SessionMeter) RecordInbound(id types.ID, bytes uint64) bool {
	m.mu.RLock()
	stats, ok := m.sessions[id]
	m.mu.RUnlock()

	if !ok {
		return true
	}

	atomic.AddUint64(&stats.BytesIn, bytes)
	atomic.AddUint64(&stats.PacketsIn, 1)

	if m.maxBytesTotal > 0 && (atomic.LoadUint64(&stats.BytesIn)+atomic.LoadUint64(&stats.BytesOut)) > m.maxBytesTotal {
		return false // quota exceeded
	}
	return true
}

// RecordOutbound adds bytes forwarded to an agent (Outbound from relay).
// Returns false if session has exceeded total quota.
func (m *SessionMeter) RecordOutbound(id types.ID, bytes uint64) bool {
	m.mu.RLock()
	stats, ok := m.sessions[id]
	m.mu.RUnlock()

	if !ok {
		return true
	}

	atomic.AddUint64(&stats.BytesOut, bytes)
	atomic.AddUint64(&stats.PacketsOut, 1)

	if m.maxBytesTotal > 0 && (atomic.LoadUint64(&stats.BytesIn)+atomic.LoadUint64(&stats.BytesOut)) > m.maxBytesTotal {
		return false // quota exceeded
	}
	return true
}

// GetStats returns the snapshot stats for a given session.
func (m *SessionMeter) GetStats(id types.ID) (SessionStats, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats, ok := m.sessions[id]
	if !ok {
		return SessionStats{}, false
	}

	return SessionStats{
		BytesIn:      atomic.LoadUint64(&stats.BytesIn),
		BytesOut:     atomic.LoadUint64(&stats.BytesOut),
		PacketsIn:    atomic.LoadUint64(&stats.PacketsIn),
		PacketsOut:   atomic.LoadUint64(&stats.PacketsOut),
		ConnectedAt:  stats.ConnectedAt,
		LastActiveAt: stats.LastActiveAt,
	}, true
}

// GetTotalTraffic returns the cumulative bytes across all active sessions.
func (m *SessionMeter) GetTotalTraffic() (totalBytesIn uint64, totalBytesOut uint64) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, s := range m.sessions {
		totalBytesIn += atomic.LoadUint64(&s.BytesIn)
		totalBytesOut += atomic.LoadUint64(&s.BytesOut)
	}
	return totalBytesIn, totalBytesOut
}
