package services

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

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
	pubKeyBytes, err := base64.StdEncoding.DecodeString(req.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("invalid public key encoding: %w", err)
	}

	// Calculate deterministic Endpoint ID from the public key, matching agent logic.
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pubKeyBytes))

	// Create device record
	device := &types.Device{
		ID:          types.NewID(),
		Name:        req.Name,
		OS:          req.Platform,
		Description: "", // Not supplied in the basic payload yet
	}

	if err := s.store.SaveDevice(ctx, device); err != nil {
		return nil, err
	}

	// Create and save Identity mapping to this device
	identity := &types.Identity{
		EndpointID: endpointID,
		PublicKey:  pubKeyBytes,
	}

	if err := s.store.SaveIdentity(ctx, identity); err != nil {
		return nil, err
	}

	return &api.DeviceResponse{
		ID:     device.ID,
		Status: "active",
	}, nil
}

func (s *DeviceService) GetDevice(ctx context.Context, id types.ID) (*api.DeviceResponse, error) {
	device, err := s.store.GetDevice(ctx, id)
	if err != nil {
		return nil, err
	}

	return &api.DeviceResponse{
		ID:     device.ID,
		Status: "active",
	}, nil
}
