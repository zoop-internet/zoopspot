package relay

import (
	"log/slog"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/core/types"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  65536,
	WriteBufferSize: 65536,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for agent connections
	},
}

// RelayServer implements a zero-decryption DERP-style WebSocket relay.
type RelayServer struct {
	mu          sync.RWMutex
	connections map[types.ID]*websocket.Conn
	logger      *slog.Logger
	revokedIDs  map[types.ID]bool
}

// NewServer creates a new RelayServer instance.
func NewServer(logger *slog.Logger) *RelayServer {
	if logger == nil {
		logger = slog.Default()
	}
	return &RelayServer{
		connections: make(map[types.ID]*websocket.Conn),
		logger:      logger,
		revokedIDs:  make(map[types.ID]bool),
	}
}

// RevokeDevice marks a device ID as revoked on the relay server.
func (s *RelayServer) RevokeDevice(id types.ID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.revokedIDs[id] = true
	if conn, ok := s.connections[id]; ok {
		_ = conn.Close()
		delete(s.connections, id)
	}
}

// Register connects an agent to the relay server.
func (s *RelayServer) Register(id types.ID, conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing, ok := s.connections[id]; ok {
		_ = existing.Close()
	}
	s.connections[id] = conn
}

// Unregister disconnects an agent from the relay server.
func (s *RelayServer) Unregister(id types.ID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.connections, id)
}

// ActiveConnections returns the number of currently connected agents.
func (s *RelayServer) ActiveConnections() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.connections)
}

// HandleWebSocket handles client WebSocket connections for relaying traffic.
func (s *RelayServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	identStr := r.Header.Get("X-Zoop-Identity")
	if identStr == "" {
		identStr = r.URL.Query().Get("identity")
	}
	if identStr == "" {
		http.Error(w, "missing X-Zoop-Identity header or identity query param", http.StatusUnauthorized)
		return
	}

	senderID, err := types.ParseID(identStr)
	if err != nil {
		http.Error(w, "invalid identity ID", http.StatusBadRequest)
		return
	}

	s.mu.RLock()
	isRevoked := s.revokedIDs[senderID]
	s.mu.RUnlock()

	if isRevoked {
		s.logger.Warn("rejected connection attempt from revoked device", "sender_id", senderID)
		http.Error(w, "device identity revoked", http.StatusForbidden)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("failed to upgrade relay websocket", "error", err, "sender_id", senderID)
		return
	}
	defer conn.Close()

	s.Register(senderID, conn)
	defer s.Unregister(senderID)

	s.logger.Info("agent connected to relay server", "sender_id", senderID)

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if messageType != websocket.BinaryMessage {
			continue
		}

		destID, payload, err := DecodeOutbound(data)
		if err != nil {
			s.logger.Warn("invalid relay outbound frame", "error", err, "sender_id", senderID)
			continue
		}

		s.mu.RLock()
		destConn, connected := s.connections[destID]
		s.mu.RUnlock()

		if !connected {
			s.logger.Debug("relay recipient not connected", "dest_id", destID)
			continue
		}

		inboundFrame := EncodeInbound(senderID, payload)

		s.mu.Lock()
		err = destConn.WriteMessage(websocket.BinaryMessage, inboundFrame)
		s.mu.Unlock()

		if err != nil {
			s.logger.Error("failed to write relay frame to destination", "error", err, "dest_id", destID)
		}
	}
}
