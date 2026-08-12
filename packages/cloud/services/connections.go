package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

var (
	ErrUnauthorized    = errors.New("authorization denied")
	ErrInvalidState    = errors.New("invalid connection state transition")
)

// validTransitions defines the allowed state machine transitions for a Connection.
// Any transition not present here is rejected.
var validTransitions = map[types.ConnectionState][]types.ConnectionState{
	types.ConnectionStateRequested:    {types.ConnectionStateAuthorized, types.ConnectionStateConnecting, types.ConnectionStateDisconnected},
	types.ConnectionStateAuthorized:   {types.ConnectionStateConnecting, types.ConnectionStateDisconnected},
	types.ConnectionStateConnecting:   {types.ConnectionStateConnected, types.ConnectionStateDisconnected},
	types.ConnectionStateConnected:    {types.ConnectionStateDisconnected},
	types.ConnectionStateDisconnected: {types.ConnectionStateRequested}, // allow reconnect attempts
}

// isValidTransition returns true if transitioning from → to is permitted.
func isValidTransition(from, to types.ConnectionState) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

type ConnectionService struct {
	store     store.Store
	signaling *SignalingHub
}

func NewConnectionService(s store.Store, sh *SignalingHub) *ConnectionService {
	return &ConnectionService{
		store:     s,
		signaling: sh,
	}
}

// CreateConnection verifies authorization then creates and signals a new connection.
// Provider/Recipient IPs are allocated from the CGNAT IPAM pool (no hardcoded values).
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

	// Allocate unique IPs from the CGNAT pool instead of using hardcoded addresses.
	providerIP, recipientIP, err := s.store.AllocateConnectionIPs(ctx)
	if err != nil {
		return nil, err
	}

	conn := &types.Connection{
		ID:          types.NewID(),
		ProviderID:  req.ProviderID,
		RecipientID: req.RecipientID,
		State:       types.ConnectionStateRequested,
		ProviderIP:  providerIP,
		RecipientIP: recipientIP,
	}

	if err := s.store.SaveConnection(ctx, conn); err != nil {
		return nil, err
	}

	recipientIdent, _ := s.store.GetIdentity(ctx, req.RecipientID)
	var wgPubKeyStr string
	if recipientIdent != nil && len(recipientIdent.WireGuardPublicKey) > 0 {
		wgPubKeyStr = base64.StdEncoding.EncodeToString(recipientIdent.WireGuardPublicKey)
	}

	payloadBytes, _ := json.Marshal(types.ConnectionPayload{
		ConnectionID:       conn.ID,
		ProviderIP:         conn.ProviderIP,
		RecipientIP:        conn.RecipientIP,
		WireGuardPublicKey: wgPubKeyStr,
	})

	sigMsg := types.SignalingMessage{
		Type:        types.SignalingTypeConnectionRequest,
		SenderID:    req.RecipientID,
		RecipientID: req.ProviderID,
		Payload:     payloadBytes,
	}
	// Best-effort: provider may not be connected to signaling yet (resync will catch it).
	_ = s.signaling.SendTo(req.ProviderID, sigMsg)

	return &api.ConnectionResponse{
		ID:          conn.ID,
		ProviderID:  conn.ProviderID,
		RecipientID: conn.RecipientID,
		State:       conn.State,
		ProviderIP:  conn.ProviderIP,
		RecipientIP: conn.RecipientIP,
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
		ProviderIP:  conn.ProviderIP,
		RecipientIP: conn.RecipientIP,
	}, nil
}

// UpdateConnectionState transitions a connection to a new state, validating the transition first.
func (s *ConnectionService) UpdateConnectionState(ctx context.Context, id types.ID, callerIdentity types.ID, newState types.ConnectionState) error {
	conn, err := s.store.GetConnection(ctx, id)
	if err != nil {
		return err
	}

	// Basic Authorization: Only Provider or Recipient can update their connection.
	if callerIdentity != conn.ProviderID && callerIdentity != conn.RecipientID {
		return ErrUnauthorized
	}

	// Validate the state machine transition.
	if !isValidTransition(conn.State, newState) {
		return ErrInvalidState
	}

	conn.State = newState
	return s.store.SaveConnection(ctx, conn)
}
