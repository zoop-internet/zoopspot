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
	relayURLs []string
	activeIdx int
	identity  types.Identity
	privKey   ed25519.PrivateKey
	logger    *slog.Logger

	mu      sync.RWMutex
	conn    *websocket.Conn
	handler FrameHandler
	stopCh  chan struct{}
}

// NewClient creates a new RelayClient instance with a single relay URL.
func NewClient(relayURL string, identity types.Identity, privKey ed25519.PrivateKey, logger *slog.Logger) *RelayClient {
	urls := []string{}
	if relayURL != "" {
		urls = append(urls, relayURL)
	}
	return NewMultiClient(urls, identity, privKey, logger)
}

// NewMultiClient creates a RelayClient with multiple ordered relay candidates for automatic failover.
func NewMultiClient(relayURLs []string, identity types.Identity, privKey ed25519.PrivateKey, logger *slog.Logger) *RelayClient {
	if logger == nil {
		logger = slog.Default()
	}
	return &RelayClient{
		relayURLs: relayURLs,
		activeIdx: 0,
		identity:  identity,
		privKey:   privKey,
		logger:    logger,
		stopCh:    make(chan struct{}),
	}
}

// SetRelayURLs updates the candidate relay URLs list.
func (c *RelayClient) SetRelayURLs(urls []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.relayURLs = urls
	c.activeIdx = 0
}

// GetActiveURL returns the currently active connected relay URL.
func (c *RelayClient) GetActiveURL() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if len(c.relayURLs) == 0 {
		return ""
	}
	return c.relayURLs[c.activeIdx%len(c.relayURLs)]
}

// SetFrameHandler sets the callback for incoming relayed frames.
func (c *RelayClient) SetFrameHandler(h FrameHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = h
}

// Connect establishes the WebSocket connection to the current active relay candidate.
func (c *RelayClient) Connect(ctx context.Context) error {
	c.mu.RLock()
	if len(c.relayURLs) == 0 {
		c.mu.RUnlock()
		return fmt.Errorf("no relay URLs configured")
	}
	targetURL := c.relayURLs[c.activeIdx%len(c.relayURLs)]
	c.mu.RUnlock()

	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(c.privKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", c.identity.EndpointID.String())
	headers.Set("X-Zoop-Signature", sigStr)
	headers.Set("X-Zoop-Timestamp", ts)

	dialer := websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, targetURL, headers)
	if err != nil {
		return fmt.Errorf("failed to dial relay websocket (%s): %w", targetURL, err)
	}

	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()

	c.logger.Info("connected to relay server", "url", targetURL)
	go c.readLoop()

	return nil
}

// Start maintains a persistent connection with automatic multi-node failover and backoff.
func (c *RelayClient) Start(ctx context.Context) {
	backoff := 1 * time.Second
	maxBackoff := 15 * time.Second

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.stopCh:
			return
		default:
		}

		err := c.Connect(ctx)
		if err != nil {
			c.logger.Error("relay server connection failed", "error", err, "active_url", c.GetActiveURL(), "retry_in", backoff)

			// Try next candidate in the cluster (failover)
			c.mu.Lock()
			if len(c.relayURLs) > 1 {
				c.activeIdx = (c.activeIdx + 1) % len(c.relayURLs)
				c.logger.Info("failing over to next relay candidate", "next_url", c.relayURLs[c.activeIdx])
			}
			c.mu.Unlock()

			select {
			case <-ctx.Done():
				return
			case <-c.stopCh:
				return
			case <-time.After(backoff):
			}

			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			continue
		}

		backoff = 1 * time.Second

		for {
			select {
			case <-ctx.Done():
				_ = c.Close()
				return
			case <-c.stopCh:
				return
			case <-time.After(1 * time.Second):
			}
			if !c.IsConnected() {
				break
			}
		}
	}
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

// HealthCheck verifies relay connectivity by sending a WebSocket ping and waiting for a pong.
func (c *RelayClient) HealthCheck(ctx context.Context) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("relay client not connected")
	}

	pongCh := make(chan struct{}, 1)
	conn.SetPongHandler(func(appData string) error {
		select {
		case pongCh <- struct{}{}:
		default:
		}
		return nil
	})

	c.mu.Lock()
	err := conn.WriteControl(websocket.PingMessage, []byte("zoop-ping"), time.Now().Add(2*time.Second))
	c.mu.Unlock()
	if err != nil {
		return fmt.Errorf("failed to write ping frame: %w", err)
	}

	select {
	case <-pongCh:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(2 * time.Second):
		return fmt.Errorf("relay health check timed out")
	}
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
	// Snapshot the connection once at the start of this loop iteration.
	// Only one goroutine reads from a given WebSocket conn so no per-read locking is needed.
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return
	}

	defer func() {
		c.mu.Lock()
		// Only close and nil c.conn if it still refers to the connection owned
		// by this readLoop invocation. A concurrent Start() may have already
		// replaced it with a new connection.
		if c.conn == conn {
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
