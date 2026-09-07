package relay_test

import (
	"context"
	"crypto/ed25519"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	agentrelay "github.com/zoop-internet/zoop/packages/agent/relay"
	cloudrelay "github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestRelayClient_Integration(t *testing.T) {
	srv := cloudrelay.NewServer(nil, nil)
	ts := httptest.NewServer(http.HandlerFunc(srv.HandleWebSocket))
	defer ts.Close()

	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	pubP, privP, _ := ed25519.GenerateKey(nil)
	pIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubP}

	pubR, privR, _ := ed25519.GenerateKey(nil)
	rIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubR}

	pClient := agentrelay.NewClient(wsURL, pIdent, privP, nil)
	rClient := agentrelay.NewClient(wsURL, rIdent, privR, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	receivedCh := make(chan string, 1)
	rClient.SetFrameHandler(func(senderID types.ID, payload []byte) {
		if senderID == pIdent.EndpointID {
			receivedCh <- string(payload)
		}
	})

	if err := rClient.Connect(ctx); err != nil {
		t.Fatalf("failed to connect recipient relay client: %v", err)
	}
	defer rClient.Close()

	if err := pClient.Connect(ctx); err != nil {
		t.Fatalf("failed to connect provider relay client: %v", err)
	}
	defer pClient.Close()

	time.Sleep(50 * time.Millisecond)

	// Send message from Provider to Recipient via Relay
	testMsg := "encrypted wireguard packet via relay"
	if err := pClient.Send(rIdent.EndpointID, []byte(testMsg)); err != nil {
		t.Fatalf("failed to send frame via relay client: %v", err)
	}

	select {
	case msg := <-receivedCh:
		if msg != testMsg {
			t.Errorf("expected %s, got %s", testMsg, msg)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for relayed message")
	}

	// Verify HealthCheck works
	if err := pClient.HealthCheck(ctx); err != nil {
		t.Errorf("expected successful health check, got: %v", err)
	}
}
