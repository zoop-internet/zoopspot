package store

import (
	"context"
	"encoding/base64"
	"errors"
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

	SaveIdentity(ctx context.Context, identity *types.Identity) error
	GetIdentity(ctx context.Context, endpointID types.ID) (*types.Identity, error)
	GetIdentityByPublicKey(ctx context.Context, pubKey []byte) (*types.Identity, error)

	SaveUser(ctx context.Context, account *types.Account) error
	GetUser(ctx context.Context, id types.ID) (*types.Account, error)

	SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error
	GetSharingRelationship(ctx context.Context, id types.ID) (*types.SharingRelationship, error)
	GetSharingRelationshipByEndpoints(ctx context.Context, providerID, recipientID types.ID) (*types.SharingRelationship, error)

	SaveConnection(ctx context.Context, conn *types.Connection) error
	GetConnection(ctx context.Context, id types.ID) (*types.Connection, error)
}

// InMemoryStore is a thread-safe, ephemeral implementation of Store.
type InMemoryStore struct {
	mu              sync.RWMutex
	devices         map[types.ID]*types.Device
	identities      map[types.ID]*types.Identity
	users           map[types.ID]*types.Account
	shares          map[types.ID]*types.SharingRelationship
	connections     map[types.ID]*types.Connection
	identitiesByKey map[string]types.ID
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		devices:         make(map[types.ID]*types.Device),
		identities:      make(map[types.ID]*types.Identity),
		users:           make(map[types.ID]*types.Account),
		shares:          make(map[types.ID]*types.SharingRelationship),
		connections:     make(map[types.ID]*types.Connection),
		identitiesByKey: make(map[string]types.ID),
	}
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
