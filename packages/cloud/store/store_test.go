package store

import (
	"context"
	"testing"

	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestInMemoryStore_Device(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	dev := &types.Device{
		ID:   types.NewID(),
		Name: "Test Device",
	}

	err := s.SaveDevice(ctx, dev)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	retrieved, err := s.GetDevice(ctx, dev.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrieved.Name != dev.Name {
		t.Errorf("expected %s, got %s", dev.Name, retrieved.Name)
	}

	_, err = s.GetDevice(ctx, types.NewID())
	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestInMemoryStore_Identity(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	ident := &types.Identity{
		EndpointID: types.NewID(),
		PublicKey:  []byte("fake-public-key"),
	}

	err := s.SaveIdentity(ctx, ident)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	retrieved, err := s.GetIdentity(ctx, ident.EndpointID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(retrieved.PublicKey) != string(ident.PublicKey) {
		t.Errorf("expected pubkey match")
	}

	retrievedByPubKey, err := s.GetIdentityByPublicKey(ctx, ident.PublicKey)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrievedByPubKey.EndpointID != ident.EndpointID {
		t.Errorf("expected endpoint id match")
	}
}

func TestInMemoryStore_SharingRelationship(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	share := &types.SharingRelationship{
		ID:          types.NewID(),
		ProviderID:  types.NewID(),
		RecipientID: types.NewID(),
		IsActive:    true,
	}

	err := s.SaveSharingRelationship(ctx, share)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	retrieved, err := s.GetSharingRelationship(ctx, share.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrieved.ProviderID != share.ProviderID {
		t.Errorf("expected provider id match")
	}

	retrievedByEndpoints, err := s.GetSharingRelationshipByEndpoints(ctx, share.ProviderID, share.RecipientID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrievedByEndpoints.ID != share.ID {
		t.Errorf("expected share id match")
	}
}

func TestInMemoryStore_Connection(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	conn := &types.Connection{
		ID:          types.NewID(),
		ProviderID:  types.NewID(),
		RecipientID: types.NewID(),
		State:       types.ConnectionStateConnected,
	}

	err := s.SaveConnection(ctx, conn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	retrieved, err := s.GetConnection(ctx, conn.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrieved.State != conn.State {
		t.Errorf("expected state match")
	}
}
