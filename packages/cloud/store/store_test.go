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
