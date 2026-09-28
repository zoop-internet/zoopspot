package relay_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoopspot/packages/cloud/relay"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func TestRelayServer_Forwarding(t *testing.T) {
	srv := relay.NewServer(nil, nil)
	ts := httptest.NewServer(http.HandlerFunc(srv.HandleWebSocket))
	defer ts.Close()

	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	senderID := types.NewID()
	recipientID := types.NewID()

	// Connect Recipient
	rHeaders := http.Header{}
	rHeaders.Set("X-Zoop-Identity", recipientID.String())
	rConn, _, err := websocket.DefaultDialer.Dial(wsURL, rHeaders)
	if err != nil {
		t.Fatalf("failed to dial recipient: %v", err)
	}
	defer rConn.Close()

	// Connect Sender
	sHeaders := http.Header{}
	sHeaders.Set("X-Zoop-Identity", senderID.String())
	sConn, _, err := websocket.DefaultDialer.Dial(wsURL, sHeaders)
	if err != nil {
		t.Fatalf("failed to dial sender: %v", err)
	}
	defer sConn.Close()

	time.Sleep(50 * time.Millisecond)

	if srv.ActiveConnections() != 2 {
		t.Fatalf("expected 2 active connections, got %d", srv.ActiveConnections())
	}

	// Sender sends frame to Recipient
	payload := []byte("hello relay world")
	outboundFrame := relay.EncodeOutbound(recipientID, payload)

	if err := sConn.WriteMessage(websocket.BinaryMessage, outboundFrame); err != nil {
		t.Fatalf("sender failed to write frame: %v", err)
	}

	// Recipient receives frame
	rConn.SetReadDeadline(time.Now().Add(2 * time.Second))
	msgType, inData, err := rConn.ReadMessage()
	if err != nil {
		t.Fatalf("recipient failed to read frame: %v", err)
	}

	if msgType != websocket.BinaryMessage {
		t.Fatalf("expected binary message type, got %d", msgType)
	}

	recvSenderID, recvPayload, err := relay.DecodeInbound(inData)
	if err != nil {
		t.Fatalf("failed to decode inbound frame: %v", err)
	}

	if recvSenderID != senderID {
		t.Errorf("expected sender %s, got %s", senderID, recvSenderID)
	}

	if string(recvPayload) != string(payload) {
		t.Errorf("expected payload %s, got %s", payload, string(recvPayload))
	}
}
