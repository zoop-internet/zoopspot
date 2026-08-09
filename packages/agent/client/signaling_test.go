package client

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/core/types"
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
	c := NewSignalingClient(apiClient, logger)

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
