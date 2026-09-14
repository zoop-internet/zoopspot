package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func (s *Server) handleCreateConnection() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		var req api.CreateConnectionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.connections.CreateConnection(r.Context(), req, callerID)
		if err != nil {
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			if err == services.ErrConflict {
				api.WriteError(w, "conflict", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to create connection", "error", err)
			api.WriteError(w, "internal_error", "failed to create connection", http.StatusInternalServerError)
			return
		}

		ev := services.ServerEvent{Type: "connection_requested", Entity: "connection", ID: resp.ID.String(), Payload: resp}
		s.events.PublishTo(resp.ProviderID, ev)
		s.events.PublishTo(resp.RecipientID, ev)

		s.audit.Log(r.Context(), callerID, "connection.create", "connection:"+resp.ID.String(), "provider="+resp.ProviderID.String())
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetConnection() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid connection id format", http.StatusBadRequest)
			return
		}

		resp, err := s.connections.GetConnection(r.Context(), types.ID(parsedUUID), callerID)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "connection not found", http.StatusNotFound)
				return
			}
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup connection", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		resp, err := s.connections.ListConnections(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list connections", "error", err)
			api.WriteError(w, "internal_error", "failed to list connections", http.StatusInternalServerError)
			return
		}

		limit, offset := parsePagination(r, 100, 500)
		paged := paginateSlice(resp, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", len(resp)))
		api.WriteJSON(w, http.StatusOK, paged)
	}
}

func (s *Server) handleUpdateConnectionState() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid connection id format", http.StatusBadRequest)
			return
		}

		var req api.UpdateConnectionStateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		err = s.connections.UpdateConnectionState(r.Context(), types.ID(parsedUUID), callerID, req.State)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "connection not found", http.StatusNotFound)
				return
			}
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			if err == services.ErrInvalidState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to update connection state", "error", err)
			api.WriteError(w, "internal_error", "failed to update connection state", http.StatusInternalServerError)
			return
		}

		s.events.PublishBroadcast(services.ServerEvent{
			Type:   "connection_updated",
			Entity: "connection",
			ID:     parsedUUID.String(),
			Payload: map[string]string{
				"state": string(req.State),
			},
		})
		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func (s *Server) handleGetPendingConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		deviceID := types.ID(parsedUUID)

		if callerID != deviceID {
			api.WriteError(w, "authorization_denied", "authorization denied", http.StatusForbidden)
			return
		}

		pending, err := s.store.GetPendingConnections(r.Context(), deviceID)
		if err != nil {
			s.logger.Error("failed to get pending connections", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup pending connections", http.StatusInternalServerError)
			return
		}

		var resp []api.ConnectionResponse
		for _, conn := range pending {
			resp = append(resp, api.ConnectionResponse{
				ID:          conn.ID,
				ProviderID:  conn.ProviderID,
				RecipientID: conn.RecipientID,
				State:       conn.State,
				ProviderIP:  conn.ProviderIP,
				RecipientIP: conn.RecipientIP,
			})
		}

		if resp == nil {
			resp = []api.ConnectionResponse{}
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}
