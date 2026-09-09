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

	// Test boundary: third octet roll-over (n = 64)
	s.ipam.counter = 64
	p64, r64, err := s.AllocateConnectionIPs(ctx)
	if err != nil {
		t.Fatalf("allocation 64 failed: %v", err)
	}
	if p64 != "100.64.1.1" || r64 != "100.64.1.2" {
		t.Errorf("expected 100.64.1.1 & 100.64.1.2, got %s & %s", p64, r64)
	}

	// Test boundary: second octet roll-over (n = 16384 -> 100.65.0.1)
	s.ipam.counter = 16384
	p16k, r16k, err := s.AllocateConnectionIPs(ctx)
	if err != nil {
		t.Fatalf("allocation 16384 failed: %v", err)
	}
	if p16k != "100.65.0.1" || r16k != "100.65.0.2" {
		t.Errorf("expected 100.65.0.1 & 100.65.0.2, got %s & %s", p16k, r16k)
	}

	// Test boundary: last valid allocation (n = 1,048,575 -> 100.127.255.253)
	s.ipam.counter = 1048575
	pLast, rLast, err := s.AllocateConnectionIPs(ctx)
	if err != nil {
		t.Fatalf("last allocation failed: %v", err)
	}
	if pLast != "100.127.255.253" || rLast != "100.127.255.254" {
		t.Errorf("expected 100.127.255.253 & 100.127.255.254, got %s & %s", pLast, rLast)
	}

	// Test exhaustion (n = 1,048,576)
	_, _, err = s.AllocateConnectionIPs(ctx)
	if err == nil {
		t.Errorf("expected error on IPAM pool exhaustion, got nil")
	}
}

func TestInMemoryStore_UserIdentity(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	account := &types.Account{
		ID:       types.NewID(),
		ZoopID:   "ZP-7K4M9X",
		Username: "alex",
		Name:     "Alex Morgan",
	}

	if err := s.SaveUser(ctx, account); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Lookup by ID
	byID, err := s.GetUser(ctx, account.ID)
	if err != nil {
		t.Fatalf("failed lookup by ID: %v", err)
	}
	if byID.ZoopID != "ZP-7K4M9X" || byID.Username != "alex" {
		t.Errorf("expected ZoopID ZP-7K4M9X and username alex, got %s and %s", byID.ZoopID, byID.Username)
	}

	// Lookup by ZoopID
	byZoopID, err := s.GetUserByZoopID(ctx, "ZP-7K4M9X")
	if err != nil {
		t.Fatalf("failed lookup by ZoopID: %v", err)
	}
	if byZoopID.ID != account.ID {
		t.Errorf("expected ID match")
	}

	// Lookup by Username
	byUsername, err := s.GetUserByUsername(ctx, "alex")
	if err != nil {
		t.Fatalf("failed lookup by username: %v", err)
	}
	if byUsername.ID != account.ID {
		t.Errorf("expected ID match")
	}

	// Not found lookups
	if _, err := s.GetUserByZoopID(ctx, "ZP-NONEXIST"); err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
	if _, err := s.GetUserByUsername(ctx, "nonexist"); err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestInMemoryStore_Payments(t *testing.T) {
	s := NewInMemoryStore()
	ctx := context.Background()

	ownerID := types.NewID()
	walletID := types.NewID()

	// 1. Wallet
	w := &types.Wallet{
		ID:               walletID,
		OwnerID:          ownerID,
		Currency:         "UGX",
		AvailableBalance: 15000,
		PendingBalance:   5000,
		TotalEarned:      20000,
	}
	if err := s.SaveWallet(ctx, w); err != nil {
		t.Fatalf("SaveWallet failed: %v", err)
	}

	retrievedWallet, err := s.GetWallet(ctx, ownerID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if retrievedWallet.AvailableBalance != 15000 {
		t.Errorf("expected available balance 15000, got %f", retrievedWallet.AvailableBalance)
	}

	// 2. Transaction
	txnID := types.NewID()
	txn := &types.PaymentTransaction{
		ID:        txnID,
		WalletID:  walletID,
		OwnerID:   ownerID,
		Reference: "ZP-TXN-ABC123",
		Type:      types.TypeDeposit,
		Method:    types.MethodMobileMoney,
		Amount:    15000,
		Currency:  "UGX",
		Status:    types.StatusCompleted,
	}
	if err := s.SaveTransaction(ctx, txn); err != nil {
		t.Fatalf("SaveTransaction failed: %v", err)
	}

	byID, err := s.GetTransaction(ctx, txnID)
	if err != nil {
		t.Fatalf("GetTransaction failed: %v", err)
	}
	if byID.Reference != "ZP-TXN-ABC123" {
		t.Errorf("expected reference ZP-TXN-ABC123, got %s", byID.Reference)
	}

	byRef, err := s.GetTransactionByReference(ctx, "ZP-TXN-ABC123")
	if err != nil {
		t.Fatalf("GetTransactionByReference failed: %v", err)
	}
	if byRef.ID != txnID {
		t.Errorf("expected txn ID match")
	}

	txns, total, err := s.ListTransactions(ctx, ownerID, 10, 0)
	if err != nil {
		t.Fatalf("ListTransactions failed: %v", err)
	}
	if total != 1 || len(txns) != 1 {
		t.Errorf("expected 1 transaction, got total %d, count %d", total, len(txns))
	}

	// 3. Earnings
	earnID := types.NewID()
	earn := &types.EarningRecord{
		ID:           earnID,
		WalletID:     walletID,
		OwnerID:      ownerID,
		Source:       types.SourceBandwidthRelay,
		BytesRelayed: 1024 * 1024 * 1024,
		Amount:       1000,
		Currency:     "UGX",
	}
	if err := s.SaveEarningRecord(ctx, earn); err != nil {
		t.Fatalf("SaveEarningRecord failed: %v", err)
	}

	earnings, totalEarn, err := s.ListEarnings(ctx, ownerID, 10, 0)
	if err != nil {
		t.Fatalf("ListEarnings failed: %v", err)
	}
	if totalEarn != 1 || len(earnings) != 1 {
		t.Errorf("expected 1 earning record, got total %d, count %d", totalEarn, len(earnings))
	}
}

