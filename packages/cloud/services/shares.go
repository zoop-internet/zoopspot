package services

import (
	"context"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type ShareService struct {
	store store.Store
}

func NewShareService(s store.Store) *ShareService {
	return &ShareService{
		store: s,
	}
}

func (s *ShareService) CreateShare(ctx context.Context, req api.CreateShareRequest) (*api.ShareResponse, error) {
	// Verify Provider exists
	if _, err := s.store.GetIdentity(ctx, req.ProviderID); err != nil {
		return nil, err
	}

	// Verify Recipient exists
	if _, err := s.store.GetIdentity(ctx, req.RecipientID); err != nil {
		return nil, err
	}

	share := &types.SharingRelationship{
		ID:          types.NewID(),
		ProviderID:  req.ProviderID,
		RecipientID: req.RecipientID,
		IsActive:    true,
	}

	if err := s.store.SaveSharingRelationship(ctx, share); err != nil {
		return nil, err
	}

	return &api.ShareResponse{
		ID:          share.ID,
		ProviderID:  share.ProviderID,
		RecipientID: share.RecipientID,
		IsActive:    share.IsActive,
	}, nil
}

func (s *ShareService) GetShare(ctx context.Context, id types.ID) (*api.ShareResponse, error) {
	share, err := s.store.GetSharingRelationship(ctx, id)
	if err != nil {
		return nil, err
	}

	return &api.ShareResponse{
		ID:          share.ID,
		ProviderID:  share.ProviderID,
		RecipientID: share.RecipientID,
		IsActive:    share.IsActive,
	}, nil
}

// ListShares returns all sharing relationships where the caller is either the
// provider or the recipient.
func (s *ShareService) ListShares(ctx context.Context, endpointID types.ID) ([]api.ShareResponse, error) {
	shares, err := s.store.ListShares(ctx, endpointID)
	if err != nil {
		return nil, err
	}

	resp := make([]api.ShareResponse, 0, len(shares))
	for _, share := range shares {
		resp = append(resp, api.ShareResponse{
			ID:          share.ID,
			ProviderID:  share.ProviderID,
			RecipientID: share.RecipientID,
			IsActive:    share.IsActive,
		})
	}
	return resp, nil
}
