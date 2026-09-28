package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

var (
	ErrUnauthorized = errors.New("authorization denied")
	ErrInvalidState = errors.New("invalid connection state transition")
	ErrConflict     = errors.New("conflict: duplicate connection")
)

// validTransitions defines the allowed state machine transitions for a Connection.
// Any transition not present here is rejected.
var validTransitions = map[types.ConnectionState][]types.ConnectionState{
	types.ConnectionStateRequested:    {types.ConnectionStateAuthorized, types.ConnectionStateConnecting, types.ConnectionStateConnected, types.ConnectionStateDisconnected},
	types.ConnectionStateAuthorized:   {types.ConnectionStateConnecting, types.ConnectionStateConnected, types.ConnectionStateDisconnected},
	types.ConnectionStateConnecting:   {types.ConnectionStateConnected, types.ConnectionStateDisconnected},
	types.ConnectionStateConnected:    {types.ConnectionStateDisconnected},
	types.ConnectionStateDisconnected: {types.ConnectionStateRequested}, // allow reconnect attempts
}

// isValidTransition returns true if transitioning from → to is permitted.
func isValidTransition(from, to types.ConnectionState) bool {
	if from == to {
		return true // Idempotent updates are always allowed
	}
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
	store            store.Store
	signaling        *SignalingHub
	acceptedPayloads sync.Map // types.ID -> types.ConnectionPayload
	waiters          sync.Map // types.ID -> chan types.ConnectionPayload
	latestCandidates sync.Map // types.ID -> []string
}

func NewConnectionService(s store.Store, sh *SignalingHub) *ConnectionService {
	return &ConnectionService{
		store:     s,
		signaling: sh,
	}
}

func (s *ConnectionService) RecordAcceptedPayload(connID types.ID, payload types.ConnectionPayload, providerID types.ID) {
	s.acceptedPayloads.Store(connID, payload)
	if len(payload.Candidates) > 0 {
		var candStrs []string
		for _, c := range payload.Candidates {
			candStrs = append(candStrs, fmt.Sprintf("%s:%d", c.IP, c.Port))
		}
		s.latestCandidates.Store(providerID, candStrs)
	}
	if chRaw, ok := s.waiters.Load(connID); ok {
		ch := chRaw.(chan types.ConnectionPayload)
		select {
		case ch <- payload:
		default:
		}
	}
}

func (s *ConnectionService) GetAcceptedPayload(connID types.ID) (*types.ConnectionPayload, bool) {
	if val, ok := s.acceptedPayloads.Load(connID); ok {
		p := val.(types.ConnectionPayload)
		return &p, true
	}
	return nil, false
}

func (s *ConnectionService) GetDeviceEndpoints(deviceID types.ID) []string {
	if val, ok := s.latestCandidates.Load(deviceID); ok {
		return val.([]string)
	}
	return nil
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

	var conn *types.Connection
	// Check if active connection exists for this pair
	if existing, err := s.store.ListConnections(ctx, req.RecipientID); err == nil {
		for _, c := range existing {
			if c.ProviderID == req.ProviderID && c.RecipientID == req.RecipientID && c.State != types.ConnectionStateDisconnected {
				// If we already have accepted candidates in memory, return immediately!
				if p, ok := s.GetAcceptedPayload(c.ID); ok && len(p.Candidates) > 0 {
					resp := &api.ConnectionResponse{
						ID:                 c.ID,
						ProviderID:         c.ProviderID,
						RecipientID:        c.RecipientID,
						State:              c.State,
						ProviderIP:         c.ProviderIP,
						RecipientIP:        c.RecipientIP,
						WireGuardPublicKey: p.WireGuardPublicKey,
						Candidates:         p.Candidates,
						EndpointIP:         p.EndpointIP,
						EndpointPort:       p.EndpointPort,
					}
					return resp, nil
				}
				// Otherwise, reuse this existing connection and signal the provider to refresh candidates!
				conn = c
				break
			}
		}
	}

	if conn == nil {
		// Allocate unique IPs from the CGNAT pool instead of using hardcoded addresses.
		providerIP, recipientIP, err := s.store.AllocateConnectionIPs(ctx)
		if err != nil {
			return nil, err
		}

		now := time.Now().UTC()
		conn = &types.Connection{
			ID:          types.NewID(),
			ProviderID:  req.ProviderID,
			RecipientID: req.RecipientID,
			State:       types.ConnectionStateRequested,
			ProviderIP:  providerIP,
			RecipientIP: recipientIP,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if err := s.store.SaveConnection(ctx, conn); err != nil {
			return nil, err
		}
	}

	recipientIdent, _ := s.store.GetIdentity(ctx, req.RecipientID)
	var wgPubKeyStr string
	if req.WireGuardPublicKey != "" {
		wgPubKeyStr = req.WireGuardPublicKey
	} else if recipientIdent != nil && len(recipientIdent.WireGuardPublicKey) > 0 {
		wgPubKeyStr = base64.StdEncoding.EncodeToString(recipientIdent.WireGuardPublicKey)
	}

	payloadBytes, _ := json.Marshal(types.ConnectionPayload{
		ConnectionID:       conn.ID,
		ProviderIP:         conn.ProviderIP,
		RecipientIP:        conn.RecipientIP,
		WireGuardPublicKey: wgPubKeyStr,
		EndpointIP:         req.EndpointIP,
		EndpointPort:       req.EndpointPort,
		Candidates:         req.Candidates,
	})

	// Register waiter channel before sending signaling to catch fast provider acceptance
	waitCh := make(chan types.ConnectionPayload, 1)
	s.waiters.Store(conn.ID, waitCh)
	defer s.waiters.Delete(conn.ID)

	sigMsg := types.SignalingMessage{
		Type:        types.SignalingTypeConnectionRequest,
		SenderID:    req.RecipientID,
		RecipientID: req.ProviderID,
		Payload:     payloadBytes,
	}
	// Best-effort: provider may not be connected to signaling yet (resync will catch it).
	_ = s.signaling.SendTo(req.ProviderID, sigMsg)

	resp := &api.ConnectionResponse{
		ID:          conn.ID,
		ProviderID:  conn.ProviderID,
		RecipientID: conn.RecipientID,
		State:       conn.State,
		ProviderIP:  conn.ProviderIP,
		RecipientIP: conn.RecipientIP,
	}

	// Wait up to 4s for provider acceptance over signaling
	select {
	case p := <-waitCh:
		resp.State = types.ConnectionStateAuthorized
		resp.WireGuardPublicKey = p.WireGuardPublicKey
		resp.Candidates = p.Candidates
		resp.EndpointIP = p.EndpointIP
		resp.EndpointPort = p.EndpointPort
	case <-time.After(4000 * time.Millisecond):
		if p, ok := s.GetAcceptedPayload(conn.ID); ok {
			resp.State = types.ConnectionStateAuthorized
			resp.WireGuardPublicKey = p.WireGuardPublicKey
			resp.Candidates = p.Candidates
			resp.EndpointIP = p.EndpointIP
			resp.EndpointPort = p.EndpointPort
		}
	}

	// Fallback to known endpoints and WireGuard key if provider response was slow
	if len(resp.Candidates) == 0 {
		cands := s.GetDeviceEndpoints(req.ProviderID)
		for _, cStr := range cands {
			host, portStr, err := net.SplitHostPort(cStr)
			if err == nil {
				p, _ := strconv.Atoi(portStr)
				resp.Candidates = append(resp.Candidates, types.EndpointCandidate{
					IP:   host,
					Port: p,
					Type: types.CandidateTypeHost,
				})
			}
		}
		if len(resp.Candidates) > 0 {
			resp.EndpointIP = resp.Candidates[0].IP
			resp.EndpointPort = resp.Candidates[0].Port
		}
	}
	if resp.WireGuardPublicKey == "" {
		if ident, err := s.store.GetIdentity(ctx, req.ProviderID); err == nil && len(ident.WireGuardPublicKey) > 0 {
			resp.WireGuardPublicKey = base64.StdEncoding.EncodeToString(ident.WireGuardPublicKey)
		}
	}

	return resp, nil
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

	resp := &api.ConnectionResponse{
		ID:          conn.ID,
		ProviderID:  conn.ProviderID,
		RecipientID: conn.RecipientID,
		State:       conn.State,
		ProviderIP:  conn.ProviderIP,
		RecipientIP: conn.RecipientIP,
	}

	if p, ok := s.GetAcceptedPayload(conn.ID); ok {
		if resp.State == types.ConnectionStateRequested {
			resp.State = types.ConnectionStateAuthorized
		}
		resp.WireGuardPublicKey = p.WireGuardPublicKey
		resp.Candidates = p.Candidates
		resp.EndpointIP = p.EndpointIP
		resp.EndpointPort = p.EndpointPort
	}

	return resp, nil
}

// ListConnections returns all connections where the caller is either the
// provider or the recipient.
func (s *ConnectionService) ListConnections(ctx context.Context, callerIdentity types.ID) ([]api.ConnectionResponse, error) {
	conns, err := s.store.ListConnections(ctx, callerIdentity)
	if err != nil {
		return nil, err
	}

	resp := make([]api.ConnectionResponse, 0, len(conns))
	for _, conn := range conns {
		resp = append(resp, api.ConnectionResponse{
			ID:          conn.ID,
			ProviderID:  conn.ProviderID,
			RecipientID: conn.RecipientID,
			State:       conn.State,
			ProviderIP:  conn.ProviderIP,
			RecipientIP: conn.RecipientIP,
		})
	}
	return resp, nil
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
	conn.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveConnection(ctx, conn); err != nil {
		return err
	}
	// Reclaim IPAM pool when connection is torn down.
	if newState == types.ConnectionStateDisconnected {
		_ = s.store.ReleaseConnectionIPs(ctx, conn.ProviderIP, conn.RecipientIP)
	}

	// Notify the peer endpoint so it can tear down or update its tunnel.
	if newState == types.ConnectionStateDisconnected && s.signaling != nil {
		peerID := conn.RecipientID
		if callerIdentity == conn.RecipientID {
			peerID = conn.ProviderID
		}
		payloadBytes, _ := json.Marshal(types.ConnectionPayload{ConnectionID: conn.ID})
		msg := types.SignalingMessage{
			Type:        types.SignalingTypeConnectionDisconnected,
			SenderID:    callerIdentity,
			RecipientID: peerID,
			Payload:     payloadBytes,
		}
		// Best-effort: the peer may be offline; a resync on reconnect catches it.
		_ = s.signaling.SendTo(peerID, msg)
	}

	return nil
}
