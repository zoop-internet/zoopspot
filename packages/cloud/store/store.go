package store

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/allannuwamanya/zoop/packages/core/types"
)

var (
	ErrNotFound = errors.New("record not found")
	ErrConflict = errors.New("record already exists")
)

// Store defines the data access interface for the Zoop Control Plane.
type Store interface {
	SaveDevice(ctx context.Context, device *types.Device) error
	GetDevice(ctx context.Context, id types.ID) (*types.Device, error)
	ListDevices(ctx context.Context) ([]*types.Device, error)
	DeleteDevice(ctx context.Context, id types.ID) error

	SaveIdentity(ctx context.Context, identity *types.Identity) error
	GetIdentity(ctx context.Context, endpointID types.ID) (*types.Identity, error)
	GetIdentityByPublicKey(ctx context.Context, pubKey []byte) (*types.Identity, error)
	DeleteIdentity(ctx context.Context, endpointID types.ID) error

	SaveUser(ctx context.Context, account *types.Account) error
	GetUser(ctx context.Context, id types.ID) (*types.Account, error)
	GetUserByZoopID(ctx context.Context, zoopID string) (*types.Account, error)
	GetUserByUsername(ctx context.Context, username string) (*types.Account, error)

	SaveOrganization(ctx context.Context, org *types.Organization) error
	GetOrganization(ctx context.Context, id types.ID) (*types.Organization, error)
	ListOrganizations(ctx context.Context) ([]*types.Organization, error)

	SaveOrgMember(ctx context.Context, member *types.OrgMember) error
	GetOrgMembers(ctx context.Context, orgID types.ID) ([]*types.OrgMember, error)
	ListOrgMembersAll(ctx context.Context) ([]*types.OrgMember, error)
	ListOrgsByDevice(ctx context.Context, deviceID types.ID) ([]*types.Organization, error)
	DeleteOrgMember(ctx context.Context, orgID, memberID types.ID) error

	SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error
	GetSharingRelationship(ctx context.Context, id types.ID) (*types.SharingRelationship, error)
	GetSharingRelationshipByEndpoints(ctx context.Context, providerID, recipientID types.ID) (*types.SharingRelationship, error)
	ListShares(ctx context.Context, endpointID types.ID) ([]*types.SharingRelationship, error)
	DeleteSharingRelationship(ctx context.Context, id types.ID) error

	SaveConnection(ctx context.Context, conn *types.Connection) error
	GetConnection(ctx context.Context, id types.ID) (*types.Connection, error)
	GetPendingConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error)
	ListConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error)
	ListAllConnections(ctx context.Context) ([]*types.Connection, error)
	ListSharesAll(ctx context.Context) ([]*types.SharingRelationship, error)

	// Wallets & Payments
	SaveWallet(ctx context.Context, wallet *types.Wallet) error
	GetWallet(ctx context.Context, ownerID types.ID) (*types.Wallet, error)
	SaveTransaction(ctx context.Context, txn *types.PaymentTransaction) error
	GetTransaction(ctx context.Context, id types.ID) (*types.PaymentTransaction, error)
	GetTransactionByReference(ctx context.Context, ref string) (*types.PaymentTransaction, error)
	ListTransactions(ctx context.Context, ownerID types.ID, limit, offset int) ([]*types.PaymentTransaction, int, error)
	SaveEarningRecord(ctx context.Context, earning *types.EarningRecord) error
	ListEarnings(ctx context.Context, ownerID types.ID, limit, offset int) ([]*types.EarningRecord, int, error)

	// AllocateConnectionIPs returns a unique (providerIP, recipientIP) pair for a new connection
	// from the 100.64.0.0/10 CGNAT block (RFC 6598). Each pair occupies a /30 subnet.
	AllocateConnectionIPs(ctx context.Context) (providerIP, recipientIP string, err error)

	// ReleaseConnectionIPs returns a previously allocated pair to the free pool.
	ReleaseConnectionIPs(ctx context.Context, providerIP, recipientIP string) error

	// IPAMUsage returns the number of allocated /30 pairs and the pool capacity.
	IPAMUsage(ctx context.Context) (allocated, capacity uint32, err error)
}

// ipamAllocator hands out sequential IP pairs from 100.64.0.0/10 (RFC 6598).
// Layout: each allocation n uses IPs 100.(64 + n/(64*256)).((n/64)%256).((n%64)*4 + 1 and + 2),
// providing up to 1,048,576 distinct /30 pairs across the entire /10 block.
type ipamAllocator struct {
	mu      sync.Mutex
	counter uint32
	free    []uint32
}

func (a *ipamAllocator) allocate() (string, string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	var n uint32
	if len(a.free) > 0 {
		n = a.free[len(a.free)-1]
		a.free = a.free[:len(a.free)-1]
	} else {
		n = a.counter
		const maxPairs = ipamMaxPairs
		if n >= maxPairs {
			return "", "", fmt.Errorf("IPAM pool exhausted (allocated %d connections)", n)
		}
		a.counter++
	}

	second := 64 + (n / (64 * 256))
	third := (n / 64) % 256
	fourthBase := (n % 64) * 4

	providerIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+1)
	recipientIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+2)

	return providerIP, recipientIP, nil
}

func (a *ipamAllocator) release(providerIP string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	var second, third, fourth int
	if _, err := fmt.Sscanf(providerIP, "100.%d.%d.%d", &second, &third, &fourth); err != nil {
		return fmt.Errorf("invalid provider IP %q", providerIP)
	}
	if second < 64 || second > 127 || third < 0 || third > 255 || fourth < 1 || fourth > 254 {
		return fmt.Errorf("IP %q outside CGNAT pool", providerIP)
	}
	fourthBase := fourth - 1
	if fourthBase%4 != 0 {
		return fmt.Errorf("IP %q not aligned to /30", providerIP)
	}
	n := uint32((second-64)*64*256 + third*64 + fourthBase/4)
	// avoid double-free
	for _, v := range a.free {
		if v == n {
			return nil
		}
	}
	a.free = append(a.free, n)
	return nil
}

// InMemoryStore is a thread-safe, ephemeral implementation of Store.
type InMemoryStore struct {
	mu              sync.RWMutex
	devices         map[types.ID]*types.Device
	identities      map[types.ID]*types.Identity
	users           map[types.ID]*types.Account
	organizations   map[types.ID]*types.Organization
	orgMembers      map[types.ID][]*types.OrgMember
	shares          map[types.ID]*types.SharingRelationship
	connections     map[types.ID]*types.Connection
	identitiesByKey   map[string]types.ID
	usersByZoopID     map[string]types.ID
	usersByUsername   map[string]types.ID
	wallets           map[types.ID]*types.Wallet
	transactions      map[types.ID]*types.PaymentTransaction
	transactionsByRef map[string]types.ID
	earnings          map[types.ID][]*types.EarningRecord
	ipam              *ipamAllocator
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		devices:           make(map[types.ID]*types.Device),
		identities:        make(map[types.ID]*types.Identity),
		users:             make(map[types.ID]*types.Account),
		organizations:     make(map[types.ID]*types.Organization),
		orgMembers:        make(map[types.ID][]*types.OrgMember),
		shares:            make(map[types.ID]*types.SharingRelationship),
		connections:       make(map[types.ID]*types.Connection),
		identitiesByKey:   make(map[string]types.ID),
		usersByZoopID:     make(map[string]types.ID),
		usersByUsername:   make(map[string]types.ID),
		wallets:           make(map[types.ID]*types.Wallet),
		transactions:      make(map[types.ID]*types.PaymentTransaction),
		transactionsByRef: make(map[string]types.ID),
		earnings:          make(map[types.ID][]*types.EarningRecord),
		ipam:              &ipamAllocator{},
	}
}

func (s *InMemoryStore) AllocateConnectionIPs(_ context.Context) (string, string, error) {
	return s.ipam.allocate()
}

func (s *InMemoryStore) ReleaseConnectionIPs(_ context.Context, providerIP, _ string) error {
	return s.ipam.release(providerIP)
}

const ipamMaxPairs = 64 * 256 * 64 // 1,048,576 /30 pairs across 100.64.0.0/10

func (s *InMemoryStore) IPAMUsage(_ context.Context) (allocated, capacity uint32, err error) {
	s.ipam.mu.Lock()
	defer s.ipam.mu.Unlock()
	allocated = s.ipam.counter - uint32(len(s.ipam.free))
	return allocated, ipamMaxPairs, nil
}

func (s *InMemoryStore) SaveDevice(ctx context.Context, device *types.Device) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if device.CreatedAt.IsZero() {
		device.CreatedAt = time.Now().UTC()
	}
	if device.UpdatedAt.IsZero() {
		device.UpdatedAt = device.CreatedAt
	} else {
		device.UpdatedAt = time.Now().UTC()
	}
	s.devices[device.ID] = device
	return nil
}

func (s *InMemoryStore) GetDevice(ctx context.Context, id types.ID) (*types.Device, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.devices[id]
	if !ok {
		return nil, ErrNotFound
	}
	return d, nil
}

func (s *InMemoryStore) SaveIdentity(ctx context.Context, identity *types.Identity) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.identities[identity.EndpointID] = identity
	encodedKey := base64.StdEncoding.EncodeToString(identity.PublicKey)
	s.identitiesByKey[encodedKey] = identity.EndpointID

	return nil
}

func (s *InMemoryStore) GetIdentity(ctx context.Context, endpointID types.ID) (*types.Identity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	i, ok := s.identities[endpointID]
	if !ok {
		return nil, ErrNotFound
	}
	return i, nil
}

func (s *InMemoryStore) GetIdentityByPublicKey(ctx context.Context, pubKey []byte) (*types.Identity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	encodedKey := base64.StdEncoding.EncodeToString(pubKey)
	id, ok := s.identitiesByKey[encodedKey]
	if !ok {
		return nil, ErrNotFound
	}
	return s.identities[id], nil
}

func (s *InMemoryStore) DeleteDevice(ctx context.Context, id types.ID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.devices[id]; !ok {
		return ErrNotFound
	}
	delete(s.devices, id)
	return nil
}

func (s *InMemoryStore) DeleteIdentity(ctx context.Context, endpointID types.ID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i, ok := s.identities[endpointID]
	if !ok {
		return ErrNotFound
	}
	delete(s.identities, endpointID)
	if i != nil {
		encodedKey := base64.StdEncoding.EncodeToString(i.PublicKey)
		delete(s.identitiesByKey, encodedKey)
	}
	return nil
}

func (s *InMemoryStore) SaveUser(ctx context.Context, account *types.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if account.CreatedAt.IsZero() {
		account.CreatedAt = time.Now().UTC()
	}
	s.users[account.ID] = account
	if account.ZoopID != "" {
		s.usersByZoopID[account.ZoopID] = account.ID
	}
	if account.Username != "" {
		s.usersByUsername[account.Username] = account.ID
	}
	return nil
}

func (s *InMemoryStore) GetUser(ctx context.Context, id types.ID) (*types.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	if !ok {
		return nil, ErrNotFound
	}
	return u, nil
}

func (s *InMemoryStore) GetUserByZoopID(ctx context.Context, zoopID string) (*types.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.usersByZoopID[zoopID]
	if !ok {
		return nil, ErrNotFound
	}
	return s.users[id], nil
}

func (s *InMemoryStore) GetUserByUsername(ctx context.Context, username string) (*types.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.usersByUsername[username]
	if !ok {
		return nil, ErrNotFound
	}
	return s.users[id], nil
}

func (s *InMemoryStore) SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if share.CreatedAt.IsZero() {
		share.CreatedAt = time.Now().UTC()
	}
	s.shares[share.ID] = share
	return nil
}

func (s *InMemoryStore) GetSharingRelationship(ctx context.Context, id types.ID) (*types.SharingRelationship, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sh, ok := s.shares[id]
	if !ok {
		return nil, ErrNotFound
	}
	return sh, nil
}

func (s *InMemoryStore) GetSharingRelationshipByEndpoints(ctx context.Context, providerID, recipientID types.ID) (*types.SharingRelationship, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, sh := range s.shares {
		if sh.ProviderID == providerID && sh.RecipientID == recipientID && sh.IsActive {
			return sh, nil
		}
	}
	return nil, ErrNotFound
}

func (s *InMemoryStore) ListShares(ctx context.Context, endpointID types.ID) ([]*types.SharingRelationship, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var shares []*types.SharingRelationship
	for _, sh := range s.shares {
		if sh.ProviderID == endpointID || sh.RecipientID == endpointID {
			shares = append(shares, sh)
		}
	}
	if shares == nil {
		shares = []*types.SharingRelationship{}
	}
	return shares, nil
}

func (s *InMemoryStore) ListSharesAll(ctx context.Context) ([]*types.SharingRelationship, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var shares []*types.SharingRelationship
	for _, sh := range s.shares {
		shares = append(shares, sh)
	}
	if shares == nil {
		shares = []*types.SharingRelationship{}
	}
	return shares, nil
}

func (s *InMemoryStore) SaveConnection(ctx context.Context, conn *types.Connection) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if conn.CreatedAt.IsZero() {
		conn.CreatedAt = time.Now().UTC()
	}
	if conn.UpdatedAt.IsZero() {
		conn.UpdatedAt = conn.CreatedAt
	} else {
		conn.UpdatedAt = time.Now().UTC()
	}
	s.connections[conn.ID] = conn
	return nil
}

func (s *InMemoryStore) GetConnection(ctx context.Context, id types.ID) (*types.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.connections[id]
	if !ok {
		return nil, ErrNotFound
	}
	return c, nil
}

func (s *InMemoryStore) GetPendingConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var pending []*types.Connection
	for _, conn := range s.connections {
		if (conn.ProviderID == endpointID || conn.RecipientID == endpointID) && conn.State == types.ConnectionStateRequested {
			pending = append(pending, conn)
		}
	}
	return pending, nil
}

func (s *InMemoryStore) ListConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var conns []*types.Connection
	for _, conn := range s.connections {
		if conn.ProviderID == endpointID || conn.RecipientID == endpointID {
			conns = append(conns, conn)
		}
	}
	if conns == nil {
		conns = []*types.Connection{}
	}
	return conns, nil
}

func (s *InMemoryStore) ListAllConnections(ctx context.Context) ([]*types.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var conns []*types.Connection
	for _, conn := range s.connections {
		conns = append(conns, conn)
	}
	if conns == nil {
		conns = []*types.Connection{}
	}
	return conns, nil
}

func (s *InMemoryStore) ListDevices(ctx context.Context) ([]*types.Device, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	devices := make([]*types.Device, 0, len(s.devices))
	for _, d := range s.devices {
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *InMemoryStore) SaveOrganization(ctx context.Context, org *types.Organization) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if org.CreatedAt.IsZero() {
		org.CreatedAt = time.Now().UTC()
	}
	s.organizations[org.ID] = org
	return nil
}

func (s *InMemoryStore) GetOrganization(ctx context.Context, id types.ID) (*types.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	org, ok := s.organizations[id]
	if !ok {
		return nil, ErrNotFound
	}
	return org, nil
}

func (s *InMemoryStore) ListOrganizations(ctx context.Context) ([]*types.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orgs := make([]*types.Organization, 0, len(s.organizations))
	for _, o := range s.organizations {
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *InMemoryStore) SaveOrgMember(ctx context.Context, member *types.OrgMember) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if member.CreatedAt.IsZero() {
		member.CreatedAt = time.Now().UTC()
	}
	s.orgMembers[member.OrganizationID] = append(s.orgMembers[member.OrganizationID], member)
	return nil
}

func (s *InMemoryStore) GetOrgMembers(ctx context.Context, orgID types.ID) ([]*types.OrgMember, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	members := s.orgMembers[orgID]
	if members == nil {
		return []*types.OrgMember{}, nil
	}
	return members, nil
}

func (s *InMemoryStore) ListOrgsByDevice(ctx context.Context, deviceID types.ID) ([]*types.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var orgs []*types.Organization
	for _, members := range s.orgMembers {
		for _, m := range members {
			if m.DeviceID == deviceID {
				if org, ok := s.organizations[m.OrganizationID]; ok {
					orgs = append(orgs, org)
				}
				break
			}
		}
	}
	if orgs == nil {
		orgs = []*types.Organization{}
	}
	return orgs, nil
}

func (s *InMemoryStore) ListOrgMembersAll(ctx context.Context) ([]*types.OrgMember, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var all []*types.OrgMember
	for _, members := range s.orgMembers {
		all = append(all, members...)
	}
	if all == nil {
		all = []*types.OrgMember{}
	}
	return all, nil
}

func (s *InMemoryStore) DeleteSharingRelationship(ctx context.Context, id types.ID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.shares[id]; !ok {
		return ErrNotFound
	}
	delete(s.shares, id)
	return nil
}

func (s *InMemoryStore) DeleteOrgMember(ctx context.Context, orgID, memberID types.ID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	members := s.orgMembers[orgID]
	for i, m := range members {
		if m.ID == memberID {
			s.orgMembers[orgID] = append(members[:i], members[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

// ─── Wallets & Payments ──────────────────────────────────────────

func (s *InMemoryStore) SaveWallet(_ context.Context, wallet *types.Wallet) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cp := *wallet
	s.wallets[wallet.OwnerID] = &cp
	return nil
}

func (s *InMemoryStore) GetWallet(_ context.Context, ownerID types.ID) (*types.Wallet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	w, ok := s.wallets[ownerID]
	if !ok {
		return nil, ErrNotFound
	}
	cp := *w
	return &cp, nil
}

func (s *InMemoryStore) SaveTransaction(_ context.Context, txn *types.PaymentTransaction) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cp := *txn
	s.transactions[txn.ID] = &cp
	if txn.Reference != "" {
		s.transactionsByRef[txn.Reference] = txn.ID
	}
	return nil
}

func (s *InMemoryStore) GetTransaction(_ context.Context, id types.ID) (*types.PaymentTransaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	t, ok := s.transactions[id]
	if !ok {
		return nil, ErrNotFound
	}
	cp := *t
	return &cp, nil
}

func (s *InMemoryStore) GetTransactionByReference(_ context.Context, ref string) (*types.PaymentTransaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	id, ok := s.transactionsByRef[ref]
	if !ok {
		return nil, ErrNotFound
	}
	t, ok := s.transactions[id]
	if !ok {
		return nil, ErrNotFound
	}
	cp := *t
	return &cp, nil
}

func (s *InMemoryStore) ListTransactions(_ context.Context, ownerID types.ID, limit, offset int) ([]*types.PaymentTransaction, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var matches []*types.PaymentTransaction
	for _, t := range s.transactions {
		if t.OwnerID == ownerID {
			cp := *t
			matches = append(matches, &cp)
		}
	}

	// Sort descending by CreatedAt
	for i := 0; i < len(matches)-1; i++ {
		for j := i + 1; j < len(matches); j++ {
			if matches[i].CreatedAt.Before(matches[j].CreatedAt) {
				matches[i], matches[j] = matches[j], matches[i]
			}
		}
	}

	total := len(matches)
	if offset >= total {
		return []*types.PaymentTransaction{}, total, nil
	}
	end := offset + limit
	if end > total || limit <= 0 {
		end = total
	}
	return matches[offset:end], total, nil
}

func (s *InMemoryStore) SaveEarningRecord(_ context.Context, earning *types.EarningRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cp := *earning
	s.earnings[earning.OwnerID] = append(s.earnings[earning.OwnerID], &cp)
	return nil
}

func (s *InMemoryStore) ListEarnings(_ context.Context, ownerID types.ID, limit, offset int) ([]*types.EarningRecord, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	records := s.earnings[ownerID]
	var matches []*types.EarningRecord
	for _, r := range records {
		cp := *r
		matches = append(matches, &cp)
	}

	// Sort descending by CreatedAt
	for i := 0; i < len(matches)-1; i++ {
		for j := i + 1; j < len(matches); j++ {
			if matches[i].CreatedAt.Before(matches[j].CreatedAt) {
				matches[i], matches[j] = matches[j], matches[i]
			}
		}
	}

	total := len(matches)
	if offset >= total {
		return []*types.EarningRecord{}, total, nil
	}
	end := offset + limit
	if end > total || limit <= 0 {
		end = total
	}
	return matches[offset:end], total, nil
}

