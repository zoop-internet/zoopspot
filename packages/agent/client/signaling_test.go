package client

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoopspot/packages/agent/tunnel"
	"github.com/zoop-internet/zoopspot/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

func TestSignalingClient_Connect(t *testing.T) {
	// Create identity
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	ident := types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	}

	var connected int32

	upgrader := websocket.Upgrader{}

	// Mock websocket server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/signaling" {
			// Mock the resync fetch
			if r.Method == "GET" && len(r.URL.Path) > 12 && r.URL.Path[len(r.URL.Path)-20:] == "/connections/pending" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				w.Write([]byte(`[]`))
				return
			}
			t.Errorf("expected path /v1/signaling, got %s", r.URL.Path)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		atomic.StoreInt32(&connected, 1)

		// Wait indefinitely to keep connection open for test
		<-r.Context().Done()
	}))
	defer mockServer.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	apiClient := NewAPIClient(mockServer.URL, ident, priv)
	c := NewSignalingClient(apiClient, nil, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Run connect loop in background
	go c.Connect(ctx)

	// Wait for connection to succeed (up to 2 seconds)
	for i := 0; i < 20; i++ {
		if atomic.LoadInt32(&connected) == 1 {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	if atomic.LoadInt32(&connected) != 1 {
		t.Errorf("expected websocket connection to be established")
	}
}

// TestSignalingClient_HandleDisconnect verifies that a connection_disconnected
// signaling message tears down the tracked tunnel for that connection.
func TestSignalingClient_HandleDisconnect(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	ident := types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	}

	// Mock server only needs to serve the state update call.
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut && r.URL.Path[len(r.URL.Path)-6:] == "/state" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"updated"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`[]`))
	}))
	defer mockServer.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	apiClient := NewAPIClient(mockServer.URL, ident, priv)

	devMgr, err := tunnel.NewMockDeviceManager("zooptest0", nil)
	if err != nil {
		t.Fatalf("failed to create mock device manager: %v", err)
	}
	defer devMgr.Close()

	c := NewSignalingClient(apiClient, devMgr, logger)

	// Simulate an established connection: generate a peer key and track it.
	kp, err := tunnel.GenerateKeyPair()
	if err != nil {
		t.Fatalf("failed to generate keypair: %v", err)
	}
	connID := types.NewID()
	c.trackActive(connID, kp.PublicKey)

	if len(c.activeConns) != 1 {
		t.Fatalf("expected 1 tracked connection, got %d", len(c.activeConns))
	}

	// Deliver a connection_disconnected message.
	payloadBytes, _ := json.Marshal(types.ConnectionPayload{ConnectionID: connID})
	msg := types.SignalingMessage{
		Type:        types.SignalingTypeConnectionDisconnected,
		SenderID:    ident.EndpointID,
		RecipientID: ident.EndpointID,
		Payload:     payloadBytes,
	}
	c.handleMessage(context.Background(), msg)

	// The connection must no longer be tracked (peer removed).
	if len(c.activeConns) != 0 {
		t.Fatalf("expected tracked connection to be torn down, got %d remaining", len(c.activeConns))
	}
}

// TestSignalingClient_ReportConnected verifies the client reports CONNECTED to
// the cloud after a tunnel peer is configured on the recipient side.
func TestSignalingClient_ReportConnected(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	ident := types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	}

	var updatedState atomic.Value

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut && r.URL.Path[len(r.URL.Path)-6:] == "/state" {
			var body struct {
				State string `json:"state"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err == nil {
				updatedState.Store(body.State)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"updated"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`[]`))
	}))
	defer mockServer.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	apiClient := NewAPIClient(mockServer.URL, ident, priv)

	devMgr, err := tunnel.NewMockDeviceManager("zooptest1", nil)
	if err != nil {
		t.Fatalf("failed to create mock device manager: %v", err)
	}
	defer devMgr.Close()

	c := NewSignalingClient(apiClient, devMgr, logger)

	// Build an accepted payload as the peer would send it.
	connID := types.NewID()
	kp, err := tunnel.GenerateKeyPair()
	if err != nil {
		t.Fatalf("failed to generate keypair: %v", err)
	}
	payloadBytes, _ := json.Marshal(types.ConnectionPayload{
		ConnectionID:       connID,
		WireGuardPublicKey: kp.PublicKey.String(),
		RecipientIP:        "100.64.0.2",
		ProviderIP:         "100.64.0.1",
	})
	msg := types.SignalingMessage{
		Type:        types.SignalingTypeConnectionAccepted,
		SenderID:    types.NewID(),
		RecipientID: ident.EndpointID,
		Payload:     payloadBytes,
	}
	c.handleMessage(context.Background(), msg)

	if len(c.activeConns) != 1 {
		t.Fatalf("expected 1 tracked connection after accept, got %d", len(c.activeConns))
	}

	// The mock tunnel AddPeer should succeed in user space, so the client must
	// report CONNECTED to the cloud.
	time.Sleep(100 * time.Millisecond)
	if got, ok := updatedState.Load().(string); !ok || got != string(types.ConnectionStateConnected) {
		t.Fatalf("expected client to report CONNECTED, got %v", got)
	}
}

var _ = wgtypes.Key{} // keep wgtypes import for parity with tunnel usage
