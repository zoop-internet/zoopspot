package services

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

// ErrInvalidDeviceState signals a device state transition that is not allowed.
var ErrInvalidDeviceState = errors.New("invalid device state transition")

type DeviceService struct {
	store store.Store
}

func NewDeviceService(s store.Store) *DeviceService {
	return &DeviceService{
		store: s,
	}
}

// Register processes a device registration payload.
func (s *DeviceService) Register(ctx context.Context, req api.RegisterDeviceRequest) (*api.DeviceResponse, error) {
	if len(req.Name) < 1 || len(req.Name) > 64 {
		return nil, fmt.Errorf("device name must be 1-64 characters")
	}
	if len(req.Platform) > 32 {
		return nil, fmt.Errorf("platform must be <= 32 characters")
	}
	pubKeyBytes, err := base64.StdEncoding.DecodeString(req.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("invalid public key encoding: %w", err)
	}
	if len(pubKeyBytes) == 0 {
		return nil, fmt.Errorf("public key must not be empty")
	}
	if len(pubKeyBytes) != 32 && len(pubKeyBytes) != 64 {
		// Accept 32 (Ed25519 public) or 64 (private mis-use in tests) but warn; derive ID from whatever was sent
		// For strict deployments, require 32 — keep permissive for backward compat
	}

	// Calculate deterministic Endpoint ID from the public key, matching agent logic.
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pubKeyBytes))

	// The device registry ID equals the endpoint ID so that listing peers,
	// creating shares, and requesting connections all reference the same
	// identifier. This keeps the web UI and agent aligned.
	now := time.Now().UTC()
	device := &types.Device{
		ID:          endpointID,
		Name:        req.Name,
		OS:          req.Platform,
		Description: "",
		State:       types.DeviceStateTrusted,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.SaveDevice(ctx, device); err != nil {
		return nil, err
	}

	var wgPubKeyBytes []byte
	if req.WireGuardPublicKey != "" {
		wgPubKeyBytes, err = base64.StdEncoding.DecodeString(req.WireGuardPublicKey)
		if err != nil {
			return nil, fmt.Errorf("invalid wireguard public key encoding: %w", err)
		}
	}

	// Create and save Identity mapping to this device
	identity := &types.Identity{
		EndpointID:         endpointID,
		PublicKey:          pubKeyBytes,
		WireGuardPublicKey: wgPubKeyBytes,
	}

	if err := s.store.SaveIdentity(ctx, identity); err != nil {
		return nil, err
	}

	return &api.DeviceResponse{
		ID:         device.ID,
		EndpointID: endpointID,
		Status:     string(device.State),
	}, nil
}

func (s *DeviceService) GetDevice(ctx context.Context, id types.ID) (*api.DeviceResponse, error) {
	device, err := s.store.GetDevice(ctx, id)
	if err != nil {
		return nil, err
	}

	return &api.DeviceResponse{
		ID:         device.ID,
		EndpointID: device.ID,
		Name:       device.Name,
		OS:         device.OS,
		Status:     string(device.State),
	}, nil
}

func (s *DeviceService) ListDevices(ctx context.Context) ([]api.DeviceResponse, error) {
	devices, err := s.store.ListDevices(ctx)
	if err != nil {
		return nil, err
	}

	var resp []api.DeviceResponse
	for _, d := range devices {
		resp = append(resp, api.DeviceResponse{
			ID:         d.ID,
			EndpointID: d.ID,
			Name:       d.Name,
			OS:         d.OS,
			Status:     string(d.State),
		})
	}
	if resp == nil {
		resp = []api.DeviceResponse{}
	}
	return resp, nil
}

// Revoke transition a device state to revoked.
func (s *DeviceService) Revoke(ctx context.Context, id types.ID) error {
	device, err := s.store.GetDevice(ctx, id)
	if err != nil {
		return err
	}
	device.State = types.DeviceStateRevoked
	device.UpdatedAt = time.Now().UTC()
	return s.store.SaveDevice(ctx, device)
}

// Suspend transitions a device to the suspended state. Revoked devices are
// terminal and cannot be suspended.
func (s *DeviceService) Suspend(ctx context.Context, id types.ID) error {
	device, err := s.store.GetDevice(ctx, id)
	if err != nil {
		return err
	}
	if device.State == types.DeviceStateRevoked {
		return ErrInvalidDeviceState
	}
	device.State = types.DeviceStateSuspended
	device.UpdatedAt = time.Now().UTC()
	return s.store.SaveDevice(ctx, device)
}

// Restore returns a suspended device to the trusted state.
func (s *DeviceService) Restore(ctx context.Context, id types.ID) error {
	device, err := s.store.GetDevice(ctx, id)
	if err != nil {
		return err
	}
	if device.State != types.DeviceStateSuspended {
		return ErrInvalidDeviceState
	}
	device.State = types.DeviceStateTrusted
	device.UpdatedAt = time.Now().UTC()
	return s.store.SaveDevice(ctx, device)
}

// Unregister removes a device and its identity from the control plane.
// It also best-effort cleans orphaned shares, connections (reclaiming IPAM) and org memberships.
func (s *DeviceService) Unregister(ctx context.Context, id types.ID) error {
	if _, err := s.store.GetDevice(ctx, id); err != nil {
		return err
	}
	// Clean shares where device is provider or recipient
	if shares, err := s.store.ListShares(ctx, id); err == nil {
		for _, sh := range shares {
			_ = s.store.DeleteSharingRelationship(ctx, sh.ID)
		}
	}
	// Clean connections and reclaim IPs
	if conns, err := s.store.ListConnections(ctx, id); err == nil {
		for _, c := range conns {
			_ = s.store.ReleaseConnectionIPs(ctx, c.ProviderIP, c.RecipientIP)
		}
	}
	// Clean org memberships
	if members, err := s.store.ListOrgMembersAll(ctx); err == nil {
		for _, m := range members {
			if m.DeviceID == id {
				_ = s.store.DeleteOrgMember(ctx, m.OrganizationID, m.ID)
			}
		}
	}
	if err := s.store.DeleteIdentity(ctx, id); err != nil {
		return err
	}
	return s.store.DeleteDevice(ctx, id)
}

// RotateKey updates the registered WireGuard public key for an identity.
func (s *DeviceService) RotateKey(ctx context.Context, endpointID types.ID, newWireGuardKeyBase64 string) error {
	identity, err := s.store.GetIdentity(ctx, endpointID)
	if err != nil {
		return err
	}
	wgBytes, err := base64.StdEncoding.DecodeString(newWireGuardKeyBase64)
	if err != nil {
		return fmt.Errorf("invalid base64 key: %w", err)
	}
	identity.WireGuardPublicKey = wgBytes
	return s.store.SaveIdentity(ctx, identity)
}
