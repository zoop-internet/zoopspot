package server

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func (s *Server) handleRemoveOrgMember() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		orgIDStr := r.PathValue("id")
		memberIDStr := r.PathValue("memberId")
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id", http.StatusBadRequest)
			return
		}
		memberID, err := uuid.Parse(memberIDStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid member id", http.StatusBadRequest)
			return
		}
		if err := s.organizations.RemoveMember(r.Context(), callerID, types.ID(orgID), types.ID(memberID)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "member not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", err.Error(), http.StatusForbidden)
				return
			}
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}
		s.audit.Log(r.Context(), callerID, "org.member_remove", "org:"+orgIDStr, "member:"+memberIDStr)
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleCreateOrganization() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateOrgRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		resp, err := s.organizations.CreateOrg(r.Context(), callerID, req)
		if err != nil {
			s.logger.Error("failed to create organization", "error", err)
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}

		s.audit.Log(r.Context(), callerID, "org.create", "org:"+resp.ID.String(), "name="+resp.Name+" slug="+resp.Slug)
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleListOrganizations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		orgs, err := s.organizations.ListOrgs(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list organizations", "error", err)
			api.WriteError(w, "internal_error", "failed to list organizations", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, orgs)
	}
}

func (s *Server) handleGetOrganization() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		org, err := s.organizations.GetOrg(r.Context(), callerID, types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "organization not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not a member of this organization", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to get organization", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup organization", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, org)
	}
}

func (s *Server) handleAddOrgMember() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		var req api.AddOrgMemberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		resp, err := s.organizations.AddMember(r.Context(), callerID, types.ID(orgID), req)
		if err != nil {
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "only owners or admins can add members", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to add organization member", "error", err)
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}

		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleListOrgMembers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		members, err := s.organizations.ListMembers(r.Context(), callerID, types.ID(orgID))
		if err != nil {
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not a member of this organization", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to list organization members", "error", err)
			api.WriteError(w, "internal_error", "failed to list members", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, members)
	}
}
