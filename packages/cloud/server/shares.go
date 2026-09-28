package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/services"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func (s *Server) handleCreateShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.shares.CreateShare(r.Context(), req)
		if err != nil {
			msg := err.Error()
			if isValidationError(msg) || msg == "sharing relationship already exists" || msg == "provider and recipient must be different devices" {
				status := http.StatusBadRequest
				if msg == "sharing relationship already exists" {
					status = http.StatusConflict
				}
				api.WriteError(w, "invalid_request", msg, status)
				return
			}
			s.logger.Error("failed to create share", "error", err)
			api.WriteError(w, "internal_error", "failed to create share", http.StatusInternalServerError)
			return
		}

		ev := services.ServerEvent{Type: "share_created", Entity: "share", ID: resp.ID.String(), Payload: resp}
		s.events.PublishTo(resp.ProviderID, ev)
		s.events.PublishTo(resp.RecipientID, ev)

		s.audit.Log(r.Context(), resp.ProviderID, "share.create", "share:"+resp.ID.String(), "recipient="+resp.RecipientID.String())
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid share id format", http.StatusBadRequest)
			return
		}

		resp, err := s.shares.GetShare(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "share not found", http.StatusNotFound)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup share", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListShares() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		resp, err := s.shares.ListShares(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list shares", "error", err)
			api.WriteError(w, "internal_error", "failed to list shares", http.StatusInternalServerError)
			return
		}
		limit, offset := parsePagination(r, 100, 500)
		paged := paginateSlice(resp, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", len(resp)))
		api.WriteJSON(w, http.StatusOK, paged)
	}
}

func (s *Server) handleDeleteShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid share id format", http.StatusBadRequest)
			return
		}
		if err := s.shares.DeleteShare(r.Context(), types.ID(parsedUUID), callerID); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "share not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not authorized to revoke this share", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to delete share", "error", err)
			api.WriteError(w, "internal_error", "failed to revoke share", http.StatusInternalServerError)
			return
		}
		s.audit.Log(r.Context(), callerID, "share.revoke", "share:"+parsedUUID.String(), "")
		s.events.PublishBroadcast(services.ServerEvent{Type: "share_revoked", Entity: "share", ID: parsedUUID.String()})
		w.WriteHeader(http.StatusNoContent)
	}
}
