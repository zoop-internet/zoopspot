package services

import (
	"context"
	"fmt"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type OrganizationService struct {
	store store.Store
}

func NewOrganizationService(s store.Store) *OrganizationService {
	return &OrganizationService{
		store: s,
	}
}

func (s *OrganizationService) CreateOrg(ctx context.Context, req api.CreateOrgRequest) (*api.OrgResponse, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("organization name cannot be empty")
	}

	org := &types.Organization{
		ID:   types.NewID(),
		Name: req.Name,
	}

	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return nil, err
	}

	return &api.OrgResponse{
		ID:   org.ID,
		Name: org.Name,
	}, nil
}

func (s *OrganizationService) GetOrg(ctx context.Context, id types.ID) (*api.OrgResponse, error) {
	org, err := s.store.GetOrganization(ctx, id)
	if err != nil {
		return nil, err
	}
	return &api.OrgResponse{
		ID:   org.ID,
		Name: org.Name,
	}, nil
}

func (s *OrganizationService) ListOrgs(ctx context.Context) ([]api.OrgResponse, error) {
	orgs, err := s.store.ListOrganizations(ctx)
	if err != nil {
		return nil, err
	}

	var resp []api.OrgResponse
	for _, o := range orgs {
		resp = append(resp, api.OrgResponse{
			ID:   o.ID,
			Name: o.Name,
		})
	}
	if resp == nil {
		resp = []api.OrgResponse{}
	}
	return resp, nil
}

func (s *OrganizationService) AddMember(ctx context.Context, orgID types.ID, req api.AddOrgMemberRequest) (*api.OrgMemberResponse, error) {
	if req.Name == "" || req.Email == "" {
		return nil, fmt.Errorf("member name and email are required")
	}

	// Verify org exists
	if _, err := s.store.GetOrganization(ctx, orgID); err != nil {
		return nil, err
	}

	role := req.Role
	if role == "" {
		role = "member"
	}

	member := &types.OrgMember{
		ID:             types.NewID(),
		OrganizationID: orgID,
		Name:           req.Name,
		Email:          req.Email,
		Role:           role,
		Status:         "active",
	}

	if err := s.store.SaveOrgMember(ctx, member); err != nil {
		return nil, err
	}

	return &api.OrgMemberResponse{
		ID:             member.ID,
		OrganizationID: member.OrganizationID,
		Name:           member.Name,
		Email:          member.Email,
		Role:           member.Role,
		Status:         member.Status,
	}, nil
}

func (s *OrganizationService) ListMembers(ctx context.Context, orgID types.ID) ([]api.OrgMemberResponse, error) {
	members, err := s.store.GetOrgMembers(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var resp []api.OrgMemberResponse
	for _, m := range members {
		resp = append(resp, api.OrgMemberResponse{
			ID:             m.ID,
			OrganizationID: m.OrganizationID,
			Name:           m.Name,
			Email:          m.Email,
			Role:           m.Role,
			Status:         m.Status,
		})
	}
	if resp == nil {
		resp = []api.OrgMemberResponse{}
	}
	return resp, nil
}
