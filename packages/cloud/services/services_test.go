package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func TestConnectionService_Authorization(t *testing.T) {
	st := store.NewInMemoryStore()
	hub := NewSignalingHub()
	connSvc := NewConnectionService(st, hub)
	shareSvc := NewShareService(st)
	ctx := context.Background()

	providerID := types.NewID()
	recipientID := types.NewID()
	otherRecipientID := types.NewID()

	// Setup fake identities so ShareService allows creating the share
	st.SaveIdentity(ctx, &types.Identity{EndpointID: providerID})
	st.SaveIdentity(ctx, &types.Identity{EndpointID: recipientID})
	st.SaveIdentity(ctx, &types.Identity{EndpointID: otherRecipientID})

	// Create Share
	_, err := shareSvc.CreateShare(ctx, api.CreateShareRequest{
		ProviderID:  providerID,
		RecipientID: recipientID,
	})
	if err != nil {
		t.Fatalf("failed to create share: %v", err)
	}

	// Authorized connection attempt (Recipient calls)
	req := api.CreateConnectionRequest{
		ProviderID:  providerID,
		RecipientID: recipientID,
	}
	_, err = connSvc.CreateConnection(ctx, req, recipientID)
	if err != nil {
		t.Fatalf("expected authorized connection to succeed, got %v", err)
	}

	// Unauthorized connection attempt (Caller is not Recipient)
	_, err = connSvc.CreateConnection(ctx, req, otherRecipientID)
	if err != ErrUnauthorized {
		t.Fatalf("expected ErrUnauthorized for bad caller identity, got %v", err)
	}

	// Unauthorized connection attempt (No share exists)
	req2 := api.CreateConnectionRequest{
		ProviderID:  providerID,
		RecipientID: otherRecipientID,
	}
	_, err = connSvc.CreateConnection(ctx, req2, otherRecipientID)
	if err != ErrUnauthorized {
		t.Fatalf("expected ErrUnauthorized for missing share, got %v", err)
	}
}

// TestConnectionService_DisconnectSignalsPeer verifies that when one endpoint
// disconnects a connection, the cloud broadcasts a connection_disconnected
// signaling message to the peer so it can tear down its tunnel.
func TestConnectionService_DisconnectSignalsPeer(t *testing.T) {
	st := store.NewInMemoryStore()
	hub := NewSignalingHub()
	connSvc := NewConnectionService(st, hub)
	shareSvc := NewShareService(st)
	ctx := context.Background()

	providerID := types.NewID()
	recipientID := types.NewID()

	st.SaveIdentity(ctx, &types.Identity{EndpointID: providerID})
	st.SaveIdentity(ctx, &types.Identity{EndpointID: recipientID})

	if _, err := shareSvc.CreateShare(ctx, api.CreateShareRequest{
		ProviderID:  providerID,
		RecipientID: recipientID,
	}); err != nil {
		t.Fatalf("failed to create share: %v", err)
	}

	conn, err := connSvc.CreateConnection(ctx, api.CreateConnectionRequest{
		ProviderID:  providerID,
		RecipientID: recipientID,
	}, recipientID)
	if err != nil {
		t.Fatalf("failed to create connection: %v", err)
	}

	// The provider is connected to signaling; the recipient disconnects.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{}
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer ws.Close()
		hub.Register(providerID, ws)
		<-r.Context().Done()
	}))
	defer server.Close()

	client, _, err := websocket.DefaultDialer.Dial("ws"+server.URL[4:], nil)
	if err != nil {
		t.Fatalf("failed to dial test ws: %v", err)
	}
	defer client.Close()
	defer hub.Unregister(providerID)

	// Give the hub a moment to register the provider connection.
	time.Sleep(50 * time.Millisecond)

	// Recipient updates the connection to DISCONNECTED.
	if err := connSvc.UpdateConnectionState(ctx, conn.ID, recipientID, types.ConnectionStateDisconnected); err != nil {
		t.Fatalf("failed to disconnect connection: %v", err)
	}

	// Provider should receive the connection_disconnected message.
	client.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg types.SignalingMessage
	if err := client.ReadJSON(&msg); err != nil {
		t.Fatalf("expected to receive disconnect signal, got error: %v", err)
	}
	if msg.Type != types.SignalingTypeConnectionDisconnected {
		t.Fatalf("expected connection_disconnected, got %s", msg.Type)
	}
	if msg.RecipientID != providerID {
		t.Fatalf("expected message addressed to provider, got %s", msg.RecipientID)
	}
}
