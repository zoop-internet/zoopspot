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

func TestInMemoryStore_OrganizationAndMembers(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	org := &types.Organization{
		ID:   types.NewID(),
		Name: "Acme Corp",
	}

	if err := s.SaveOrganization(ctx, org); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	retrievedOrg, err := s.GetOrganization(ctx, org.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrievedOrg.Name != org.Name {
		t.Errorf("expected %s, got %s", org.Name, retrievedOrg.Name)
	}

	member := &types.OrgMember{
		ID:             types.NewID(),
		OrganizationID: org.ID,
		Name:           "Alice Smith",
		Email:          "alice@acme.corp",
		Role:           "admin",
		Status:         "active",
	}

	if err := s.SaveOrgMember(ctx, member); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	members, err := s.GetOrgMembers(ctx, org.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(members) != 1 || members[0].Email != member.Email {
		t.Errorf("expected member in list")
	}
}

func TestInMemoryStore_IPAMAllocation(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	p1, r1, err := s.AllocateConnectionIPs(ctx)
	if err != nil {
		t.Fatalf("allocation 1 failed: %v", err)
	}
	if p1 != "100.64.0.1" || r1 != "100.64.0.2" {
		t.Errorf("expected 100.64.0.1 & 100.64.0.2, got %s & %s", p1, r1)
	}

	p2, r2, err := s.AllocateConnectionIPs(ctx)
	if err != nil {
		t.Fatalf("allocation 2 failed: %v", err)
	}
	if p2 != "100.64.0.5" || r2 != "100.64.0.6" {
		t.Errorf("expected 100.64.0.5 & 100.64.0.6, got %s & %s", p2, r2)
	}
}

