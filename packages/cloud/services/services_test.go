package services

import (
	"context"
	"testing"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
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
