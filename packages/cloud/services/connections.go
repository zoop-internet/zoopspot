package services

import (
	"context"
	"errors"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

var (
	ErrUnauthorized = errors.New("authorization denied")
)

type ConnectionService struct {
	store store.Store
}

func NewConnectionService(s store.Store) *ConnectionService {
	return &ConnectionService{
		store: s,
	}
}

// CreateConnection performs Basic Authorization before creating a connection.
func (s *ConnectionService) CreateConnection(ctx context.Context, req api.CreateConnectionRequest, callerIdentity types.ID) (*api.ConnectionResponse, error) {
	// Verify the caller is actually the Recipient requesting the connection.
	if callerIdentity != req.RecipientID {
		return nil, ErrUnauthorized
	}

	// Basic Authorization: Verify a SharingRelationship exists and is active.
	_, err := s.store.GetSharingRelationshipByEndpoints(ctx, req.ProviderID, req.RecipientID)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, ErrUnauthorized
		}
		return nil, err
	}

	// Create the connection
	conn := &types.Connection{
		ID:          types.NewID(),
		ProviderID:  req.ProviderID,
		RecipientID: req.RecipientID,
		State:       types.ConnectionStateRequested,
	}

	if err := s.store.SaveConnection(ctx, conn); err != nil {
		return nil, err
	}

	return &api.ConnectionResponse{
		ID:          conn.ID,
		ProviderID:  conn.ProviderID,
		RecipientID: conn.RecipientID,
		State:       conn.State,
	}, nil
}

func (s *ConnectionService) GetConnection(ctx context.Context, id types.ID, callerIdentity types.ID) (*api.ConnectionResponse, error) {
	conn, err := s.store.GetConnection(ctx, id)
	if err != nil {
		return nil, err
	}

	// Basic Authorization: Only Provider or Recipient can view their connection.
	if callerIdentity != conn.ProviderID && callerIdentity != conn.RecipientID {
		return nil, ErrUnauthorized
	}

	return &api.ConnectionResponse{
		ID:          conn.ID,
		ProviderID:  conn.ProviderID,
		RecipientID: conn.RecipientID,
		State:       conn.State,
	}, nil
}
