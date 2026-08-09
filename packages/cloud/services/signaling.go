package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// SignalingHub routes real-time messages between Zoop agents.
type SignalingHub struct {
	mu          sync.RWMutex
	connections map[types.ID]*websocket.Conn
}

// NewSignalingHub creates a new hub.
func NewSignalingHub() *SignalingHub {
	return &SignalingHub{
		connections: make(map[types.ID]*websocket.Conn),
	}
}

// Register adds a new connection to the hub.
func (h *SignalingHub) Register(id types.ID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	// Close any existing connection for this ID
	if existing, ok := h.connections[id]; ok {
		existing.Close()
	}
	
	h.connections[id] = conn
}

// Unregister removes a connection from the hub.
func (h *SignalingHub) Unregister(id types.ID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.connections, id)
}

// SendTo routes a message to a specific recipient.
func (h *SignalingHub) SendTo(recipientID types.ID, msg interface{}) error {
	h.mu.RLock()
	conn, ok := h.connections[recipientID]
	h.mu.RUnlock()

	if !ok {
		return fmt.Errorf("recipient %s not connected to signaling", recipientID)
	}

	b, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	// WriteMessage must be protected or synchronized per-connection
	// Using the global hub lock for simplicity in M5.
	return conn.WriteMessage(websocket.TextMessage, b)
}
