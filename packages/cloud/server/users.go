package server

import (
	"net/http"

	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
)

func (s *Server) handleGetUserByZoopID() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		zoopID := r.PathValue("zoopId")
		if zoopID == "" {
			api.WriteError(w, "invalid_request", "zoop_id is required", http.StatusBadRequest)
			return
		}
		u, err := s.users.GetAccountByZoopID(r.Context(), zoopID)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "user not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to lookup user by zoop_id", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup user", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, u)
	}
}

func (s *Server) handleGetUserByUsername() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username := r.PathValue("username")
		if username == "" {
			api.WriteError(w, "invalid_request", "username is required", http.StatusBadRequest)
			return
		}
		u, err := s.users.GetAccountByUsername(r.Context(), username)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "user not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to lookup user by username", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup user", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, u)
	}
}
