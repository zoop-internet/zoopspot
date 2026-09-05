package services

import (
	"context"

	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type UserService struct {
	store store.Store
}

func NewUserService(s store.Store) *UserService {
	return &UserService{
		store: s,
	}
}

func (s *UserService) CreateAccount(ctx context.Context, name string) (*types.Account, error) {
	acc := &types.Account{
		ID:   types.NewID(),
		Name: name,
	}

	if err := s.store.SaveUser(ctx, acc); err != nil {
		return nil, err
	}

	return acc, nil
}

func (s *UserService) CreateAccountWithIdentity(ctx context.Context, name, zoopID, username string) (*types.Account, error) {
	acc := &types.Account{
		ID:       types.NewID(),
		Name:     name,
		ZoopID:   zoopID,
		Username: username,
	}

	if err := s.store.SaveUser(ctx, acc); err != nil {
		return nil, err
	}

	return acc, nil
}

func (s *UserService) GetAccount(ctx context.Context, id types.ID) (*types.Account, error) {
	return s.store.GetUser(ctx, id)
}

func (s *UserService) GetAccountByZoopID(ctx context.Context, zoopID string) (*types.Account, error) {
	return s.store.GetUserByZoopID(ctx, zoopID)
}

func (s *UserService) GetAccountByUsername(ctx context.Context, username string) (*types.Account, error) {
	return s.store.GetUserByUsername(ctx, username)
}

