package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// signalingConn wraps a WebSocket connection with its own write mutex.
// The hub-level lock only protects the connections map; per-connection locks
// protect individual writes so a slow or blocked peer cannot stall the entire hub.
type signalingConn struct {
	conn *websocket.Conn
	mu   sync.Mutex // serialises writes to this specific connection
}

func (sc *signalingConn) writeJSON(v interface{}) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("failed to marshal signaling message: %w", err)
	}
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return sc.conn.WriteMessage(websocket.TextMessage, b)
}

// SignalingHub routes real-time messages between Zoop agents.
type SignalingHub struct {
	mu          sync.RWMutex
	connections map[types.ID]*signalingConn
}

// NewSignalingHub creates a new hub.
func NewSignalingHub() *SignalingHub {
	return &SignalingHub{
		connections: make(map[types.ID]*signalingConn),
	}
}

// Register adds a new WebSocket connection for the given identity.
// Any existing connection for that identity is closed first.
func (h *SignalingHub) Register(id types.ID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Close any existing connection for this ID.
	if existing, ok := h.connections[id]; ok {
		existing.conn.Close()
	}

	h.connections[id] = &signalingConn{conn: conn}
}

// Unregister removes a connection from the hub.
func (h *SignalingHub) Unregister(id types.ID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.connections, id)
}

// SendTo routes a message to a specific recipient.
// The hub-level lock is held only while looking up the connection; the actual
// write is serialised by the per-connection mutex so other recipients are not blocked.
func (h *SignalingHub) SendTo(recipientID types.ID, msg interface{}) error {
	h.mu.RLock()
	sc, ok := h.connections[recipientID]
	h.mu.RUnlock()

	if !ok {
		return fmt.Errorf("recipient %s not connected to signaling", recipientID)
	}

	return sc.writeJSON(msg)
}
