package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)

// ErrForbidden is returned when the caller lacks permission for an operation.
var ErrForbidden = errors.New("forbidden")

type OrganizationService struct {
	store store.Store
}

func NewOrganizationService(s store.Store) *OrganizationService {
	return &OrganizationService{
		store: s,
	}
}

func (s *OrganizationService) CreateOrg(ctx context.Context, callerID types.ID, req api.CreateOrgRequest) (*api.OrgResponse, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("organization name cannot be empty")
	}

	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Name)
	}
	if !slugPattern.MatchString(slug) {
		return nil, fmt.Errorf("invalid slug: must be 1-63 chars of lowercase letters, digits and hyphens")
	}

	now := time.Now().UTC()
	org := &types.Organization{
		ID:          types.NewID(),
		Name:        req.Name,
		OwnerDevice: callerID,
		Slug:        slug,
		Status:      "active",
		CreatedAt:   now,
	}

	// Reject duplicate slugs regardless of storage backend.
	if slug != "" {
		existing, err := s.store.ListOrganizations(ctx)
		if err != nil {
			return nil, err
		}
		for _, o := range existing {
			if o.Slug == slug {
				return nil, fmt.Errorf("slug %q is already taken", slug)
			}
		}
	}

	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return nil, err
	}

	// Caller becomes the first member with role "owner".
	owner := &types.OrgMember{
		ID:             types.NewID(),
		OrganizationID: org.ID,
		DeviceID:       callerID,
		Name:           "Owner",
		Email:          "owner@zoop.local",
		Role:           "owner",
		Status:         "active",
		CreatedAt:      now,
	}
	if err := s.store.SaveOrgMember(ctx, owner); err != nil {
		return nil, err
	}

	return orgToResponse(org), nil
}

func (s *OrganizationService) GetOrg(ctx context.Context, callerID types.ID, id types.ID) (*api.OrgResponse, error) {
	org, err := s.store.GetOrganization(ctx, id)
	if err != nil {
		return nil, err
	}

	if !s.isMember(ctx, id, callerID) {
		return nil, ErrForbidden
	}

	return orgToResponse(org), nil
}

func (s *OrganizationService) ListOrgs(ctx context.Context, callerID types.ID) ([]api.OrgResponse, error) {
	orgs, err := s.store.ListOrgsByDevice(ctx, callerID)
	if err != nil {
		return nil, err
	}

	var resp []api.OrgResponse
	for _, o := range orgs {
		resp = append(resp, *orgToResponse(o))
	}
	if resp == nil {
		resp = []api.OrgResponse{}
	}
	return resp, nil
}

func (s *OrganizationService) AddMember(ctx context.Context, callerID types.ID, orgID types.ID, req api.AddOrgMemberRequest) (*api.OrgMemberResponse, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("member name is required")
	}
	// Email is optional per docs/identity.md §7 — Zoop does not require email.
	// Generate a deterministic placeholder if neither email nor username/zoopId provided,
	// to satisfy NOT NULL storage while preserving privacy.
	if req.Email == "" && req.Username == "" && req.ZoopID == "" {
		req.Email = fmt.Sprintf("%s@zoop.local", slugify(req.Name))
	}
	if req.Email == "" && req.Username != "" {
		// Derive placeholder email from username for legacy storage
		u := slugify(req.Username)
		if u == "" {
			u = slugify(req.Name)
		}
		req.Email = fmt.Sprintf("%s@zoop.local", u)
	}
	if req.Email == "" && req.ZoopID != "" {
		req.Email = fmt.Sprintf("%s@zoop.local", strings.ToLower(strings.TrimSpace(req.ZoopID)))
	}

	org, err := s.store.GetOrganization(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// Only owners/admins can add members.
	members, err := s.store.GetOrgMembers(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if !hasRole(members, callerID, "owner", "admin") {
		return nil, ErrForbidden
	}

	role := req.Role
	if role == "" {
		role = "member"
	}

	member := &types.OrgMember{
		ID:             types.NewID(),
		OrganizationID: org.ID,
		DeviceID:       req.DeviceID,
		Name:           req.Name,
		Email:          req.Email,
		Role:           role,
		Status:         "active",
		CreatedAt:      time.Now().UTC(),
	}

	if err := s.store.SaveOrgMember(ctx, member); err != nil {
		return nil, err
	}

	return &api.OrgMemberResponse{
		ID:             member.ID,
		OrganizationID: member.OrganizationID,
		DeviceID:       member.DeviceID,
		Name:           member.Name,
		Email:          member.Email,
		Username:       req.Username,
		ZoopID:         req.ZoopID,
		Role:           member.Role,
		Status:         member.Status,
	}, nil
}

func (s *OrganizationService) ListMembers(ctx context.Context, callerID types.ID, orgID types.ID) ([]api.OrgMemberResponse, error) {
	if _, err := s.store.GetOrganization(ctx, orgID); err != nil {
		return nil, err
	}

	if !s.isMember(ctx, orgID, callerID) {
		return nil, ErrForbidden
	}

	members, err := s.store.GetOrgMembers(ctx, orgID)
	if err != nil {
		return nil, err
	}

	var resp []api.OrgMemberResponse
	for _, m := range members {
		resp = append(resp, api.OrgMemberResponse{
			ID:             m.ID,
			OrganizationID: m.OrganizationID,
			DeviceID:       m.DeviceID,
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

// isMember reports whether callerID is a member of the org.
func (s *OrganizationService) isMember(ctx context.Context, orgID, callerID types.ID) bool {
	members, err := s.store.GetOrgMembers(ctx, orgID)
	if err != nil {
		return false
	}
	for _, m := range members {
		if m.DeviceID == callerID {
			return true
		}
	}
	return false
}

func (s *OrganizationService) RemoveMember(ctx context.Context, callerID, orgID, memberID types.ID) error {
	if _, err := s.store.GetOrganization(ctx, orgID); err != nil {
		return err
	}
	members, err := s.store.GetOrgMembers(ctx, orgID)
	if err != nil {
		return err
	}
	// caller must be owner/admin or removing self
	if !hasRole(members, callerID, "owner", "admin") && !isSelfMember(members, callerID, memberID) {
		return ErrForbidden
	}
	// prevent removing last owner
	if isLastOwner(members, memberID) {
		return fmt.Errorf("cannot remove last owner")
	}
	return s.store.DeleteOrgMember(ctx, orgID, memberID)
}

func isSelfMember(members []*types.OrgMember, callerID, memberID types.ID) bool {
	for _, m := range members {
		if m.ID == memberID && m.DeviceID == callerID {
			return true
		}
	}
	return false
}

func isLastOwner(members []*types.OrgMember, memberID types.ID) bool {
	ownerCount := 0
	targetIsOwner := false
	for _, m := range members {
		if m.Role == "owner" {
			ownerCount++
			if m.ID == memberID {
				targetIsOwner = true
			}
		}
	}
	return targetIsOwner && ownerCount == 1
}

func hasRole(members []*types.OrgMember, deviceID types.ID, roles ...string) bool {
	for _, m := range members {
		if m.DeviceID == deviceID {
			for _, r := range roles {
				if m.Role == r {
					return true
				}
			}
		}
	}
	return false
}

func orgToResponse(o *types.Organization) *api.OrgResponse {
	return &api.OrgResponse{
		ID:          o.ID,
		Name:        o.Name,
		OwnerDevice: o.OwnerDevice,
		Slug:        o.Slug,
		Status:      o.Status,
	}
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	lastDash := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		case r == ' ' || r == '_' || r == '-' || r == '.':
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}
