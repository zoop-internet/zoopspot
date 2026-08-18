package store

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"

	"github.com/zoop-internet/zoop/packages/core/types"
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

	SaveOrganization(ctx context.Context, org *types.Organization) error
	GetOrganization(ctx context.Context, id types.ID) (*types.Organization, error)
	ListOrganizations(ctx context.Context) ([]*types.Organization, error)

	SaveOrgMember(ctx context.Context, member *types.OrgMember) error
	GetOrgMembers(ctx context.Context, orgID types.ID) ([]*types.OrgMember, error)

	SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error
	GetSharingRelationship(ctx context.Context, id types.ID) (*types.SharingRelationship, error)
	GetSharingRelationshipByEndpoints(ctx context.Context, providerID, recipientID types.ID) (*types.SharingRelationship, error)
	ListShares(ctx context.Context, endpointID types.ID) ([]*types.SharingRelationship, error)

	SaveConnection(ctx context.Context, conn *types.Connection) error
	GetConnection(ctx context.Context, id types.ID) (*types.Connection, error)
	GetPendingConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error)
	ListConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error)

	// AllocateConnectionIPs returns a unique (providerIP, recipientIP) pair for a new connection
	// from the 100.64.0.0/10 CGNAT block (RFC 6598). Each pair occupies a /30 subnet.
	AllocateConnectionIPs(ctx context.Context) (providerIP, recipientIP string, err error)
}

// ipamAllocator hands out sequential IP pairs from 100.64.0.0/10 (RFC 6598).
// Layout: each allocation n uses IPs 100.(64 + n/(64*256)).((n/64)%256).((n%64)*4 + 1 and + 2),
// providing up to 1,048,576 distinct /30 pairs across the entire /10 block.
type ipamAllocator struct {
	mu      sync.Mutex
	counter uint32
}

func (a *ipamAllocator) allocate() (string, string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	n := a.counter

	// 100.64.0.0/10 spans 100.64.0.0 – 100.127.255.255 (4,194,304 host IPs = 1,048,576 /30 subnets).
	// We consume 4 IPs per connection (.1 provider, .2 recipient, .0 net, .3 bcast).
	const maxPairs = 64 * 256 * 64 // 1,048,576

	if n >= maxPairs {
		return "", "", fmt.Errorf("IPAM pool exhausted (allocated %d connections)", n)
	}

	second := 64 + (n / (64 * 256))
	third := (n / 64) % 256
	fourthBase := (n % 64) * 4

	providerIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+1)
	recipientIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+2)

	a.counter++
	return providerIP, recipientIP, nil
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
	identitiesByKey map[string]types.ID
	ipam            *ipamAllocator
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		devices:         make(map[types.ID]*types.Device),
		identities:      make(map[types.ID]*types.Identity),
		users:           make(map[types.ID]*types.Account),
		organizations:   make(map[types.ID]*types.Organization),
		orgMembers:      make(map[types.ID][]*types.OrgMember),
		shares:          make(map[types.ID]*types.SharingRelationship),
		connections:     make(map[types.ID]*types.Connection),
		identitiesByKey: make(map[string]types.ID),
		ipam:            &ipamAllocator{},
	}
}

func (s *InMemoryStore) AllocateConnectionIPs(_ context.Context) (string, string, error) {
	return s.ipam.allocate()
}

func (s *InMemoryStore) SaveDevice(ctx context.Context, device *types.Device) error {
	s.mu.Lock()
	defer s.mu.Unlock()
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
	s.users[account.ID] = account
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

func (s *InMemoryStore) SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error {
	s.mu.Lock()
	defer s.mu.Unlock()
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

func (s *InMemoryStore) SaveConnection(ctx context.Context, conn *types.Connection) error {
	s.mu.Lock()
	defer s.mu.Unlock()
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
