package relay

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	cloudrelay "github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// FrameHandler receives inbound frames from the relay client.
type FrameHandler func(senderID types.ID, payload []byte)

// RelayClient manages the agent's WebSocket connection to a Zoop Relay server.
type RelayClient struct {
	relayURL string
	identity types.Identity
	privKey  ed25519.PrivateKey
	logger   *slog.Logger

	mu      sync.RWMutex
	conn    *websocket.Conn
	handler FrameHandler
	stopCh  chan struct{}
}

// NewClient creates a new RelayClient instance.
func NewClient(relayURL string, identity types.Identity, privKey ed25519.PrivateKey, logger *slog.Logger) *RelayClient {
	if logger == nil {
		logger = slog.Default()
	}
	return &RelayClient{
		relayURL: relayURL,
		identity: identity,
		privKey:  privKey,
		logger:   logger,
		stopCh:   make(chan struct{}),
	}
}

// SetFrameHandler sets the callback for incoming relayed frames.
func (c *RelayClient) SetFrameHandler(h FrameHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = h
}

// Connect establishes the WebSocket connection to the relay server.
func (c *RelayClient) Connect(ctx context.Context) error {
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(c.privKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", c.identity.EndpointID.String())
	headers.Set("X-Zoop-Signature", sigStr)
	headers.Set("X-Zoop-Timestamp", ts)

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, c.relayURL, headers)
	if err != nil {
		return fmt.Errorf("failed to dial relay websocket: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()

	c.logger.Info("connected to relay server", "url", c.relayURL)
	go c.readLoop()

	return nil
}

// Send encodes and transmits a frame to a destination device via the relay server.
func (c *RelayClient) Send(destID types.ID, payload []byte) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("relay client not connected")
	}

	frame := cloudrelay.EncodeOutbound(destID, payload)

	c.mu.Lock()
	err := conn.WriteMessage(websocket.BinaryMessage, frame)
	c.mu.Unlock()

	if err != nil {
		return fmt.Errorf("failed to write relay frame: %w", err)
	}
	return nil
}

// IsConnected returns true if the client is currently connected.
func (c *RelayClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.conn != nil
}

// Close closes the relay WebSocket connection.
func (c *RelayClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	select {
	case <-c.stopCh:
	default:
		close(c.stopCh)
	}

	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

func (c *RelayClient) readLoop() {
	defer func() {
		c.mu.Lock()
		if c.conn != nil {
			_ = c.conn.Close()
			c.conn = nil
		}
		c.mu.Unlock()
	}()

	for {
		select {
		case <-c.stopCh:
			return
		default:
		}

		c.mu.RLock()
		conn := c.conn
		c.mu.RUnlock()

		if conn == nil {
			return
		}

		msgType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if msgType != websocket.BinaryMessage {
			continue
		}

		senderID, payload, err := cloudrelay.DecodeInbound(data)
		if err != nil {
			c.logger.Warn("invalid inbound relay frame", "error", err)
			continue
		}

		c.mu.RLock()
		h := c.handler
		c.mu.RUnlock()

		if h != nil {
			h(senderID, payload)
		}
	}
}
