package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/relay"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// handleAdminRelays lists the relay registry nodes.
func (s *Server) handleAdminRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodes := s.relayRegistry.GetNodes(true)
		api.WriteJSON(w, http.StatusOK, nodes)
	}
}

// handleAdminAddRelay registers a new relay node in the cluster registry.
func (s *Server) handleAdminAddRelay() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RelayAddRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid relay payload", http.StatusBadRequest)
			return
		}
		if req.ID == "" || req.Host == "" {
			api.WriteError(w, "invalid_request", "relay id and host are required", http.StatusBadRequest)
			return
		}

		node := relay.RelayNode{
			ID:           req.ID,
			Region:       req.Region,
			Host:         req.Host,
			Port:         req.Port,
			WebSocketURL: req.WebSocketURL,
			STUNPort:     req.STUNPort,
			TURNPort:     req.TURNPort,
			MaxCapacity:  req.MaxCapacity,
		}
		s.relayRegistry.RegisterNode(node)

		s.audit.Log(r.Context(), s.adminActorID(r), "relay.add", "relay:"+node.ID, "host="+node.Host+" region="+node.Region)

		for _, n := range s.relayRegistry.GetNodes(true) {
			if n.ID == node.ID {
				api.WriteJSON(w, http.StatusCreated, n)
				return
			}
		}
		api.WriteJSON(w, http.StatusCreated, node)
	}
}

// handleAdminRemoveRelay removes a relay node from the cluster registry.
func (s *Server) handleAdminRemoveRelay() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if id == "" {
			api.WriteError(w, "invalid_request", "relay id is required", http.StatusBadRequest)
			return
		}
		s.relayRegistry.DeregisterNode(id)
		s.audit.Log(r.Context(), s.adminActorID(r), "relay.remove", "relay:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"removed": true, "id": id})
	}
}

func (s *Server) handleListRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodes := s.relayRegistry.GetNodes(false)
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"relays": nodes,
		})
	}
}

func (s *Server) handleSelectRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RelaySelectRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		candidates := s.relayRegistry.SelectOptimalRelays(req.PreferredRegion, req.ToDurationRTTs())
		api.WriteJSON(w, http.StatusOK, api.RelaySelectResponse{
			Relays: candidates,
		})
	}
}

func (s *Server) handleGetTURNCredentials() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthorized", "missing caller identity", http.StatusUnauthorized)
			return
		}

		creds := s.turnManager.GenerateCredentials(callerID, 24*time.Hour, "127.0.0.1", 3478, 19302)
		api.WriteJSON(w, http.StatusOK, creds)
	}
}

// CheckHealth queries subsystem states for the /v1/health probe.
func (s *Server) CheckHealth() map[string]api.SubsystemStatus {
	subsystems := make(map[string]api.SubsystemStatus)

	// Storage check
	if s.store != nil {
		subsystems["store"] = api.SubsystemStatus{
			Status: "ok",
			Details: map[string]interface{}{
				"backend": "configured",
			},
		}
	} else {
		subsystems["store"] = api.SubsystemStatus{
			Status: "down",
			Error:  "storage backend is nil",
		}
	}

	// Relay Registry check
	var activeCount int
	if s.relayRegistry != nil {
		activeCount = len(s.relayRegistry.GetNodes(false))
	}
	subsystems["relays"] = api.SubsystemStatus{
		Status: "ok",
		Details: map[string]interface{}{
			"active_count": activeCount,
		},
	}

	// Signaling check
	subsystems["signaling"] = api.SubsystemStatus{
		Status: "ok",
	}

	// TURN check
	subsystems["turn"] = api.SubsystemStatus{
		Status: "ok",
	}

	return subsystems
}
