package server

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func (s *Server) handleRegisterDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RegisterDeviceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.devices.Register(r.Context(), req)
		if err != nil {
			msg := err.Error()
			if isValidationError(msg) {
				api.WriteError(w, "invalid_request", msg, http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to register device", "error", err)
			api.WriteError(w, "internal_error", "failed to register device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), types.ID{}, "device.register", "device:"+resp.ID.String(), "name="+resp.Name)
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		resp, err := s.devices.GetDevice(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to get device", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup device", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleGetEndpoints() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		// Retrieve device identity to get public key
		ident, err := s.store.GetIdentity(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device identity not found", http.StatusNotFound)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup device identity", http.StatusInternalServerError)
			return
		}

		var wgPubKeyStr string
		if len(ident.WireGuardPublicKey) > 0 {
			wgPubKeyStr = base64.StdEncoding.EncodeToString(ident.WireGuardPublicKey)
		}

		endpoints := s.connections.GetDeviceEndpoints(ident.EndpointID)
		if endpoints == nil {
			endpoints = []string{}
		}

		resp := api.EndpointsResponse{
			DeviceID:           ident.EndpointID,
			PublicKey:          base64.StdEncoding.EncodeToString(ident.PublicKey),
			WireGuardPublicKey: wgPubKeyStr,
			Endpoints:          endpoints,
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleUnregisterDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		// Only the device itself may unregister.
		identityID := api.IdentityFromContext(r.Context())
		if identityID != types.ID(parsedUUID) {
			api.WriteError(w, "forbidden", "device may only unregister itself", http.StatusForbidden)
			return
		}

		if err := s.devices.Unregister(r.Context(), types.ID(parsedUUID)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to unregister device", "error", err)
			api.WriteError(w, "internal_error", "failed to unregister device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), identityID, "device.unregister", "device:"+parsedUUID.String(), "")
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleListDevices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, err := s.devices.ListDevices(r.Context())
		if err != nil {
			s.logger.Error("failed to list devices", "error", err)
			api.WriteError(w, "internal_error", "failed to list devices", http.StatusInternalServerError)
			return
		}
		// Server-side search: ?search= or ?q= filters by name, id, platform substring
		searchRaw := r.URL.Query().Get("search")
		if searchRaw == "" {
			searchRaw = r.URL.Query().Get("q")
		}
		if searchRaw != "" {
			low := strings.ToLower(searchRaw)
			var filtered []api.DeviceResponse
			for _, d := range devices {
				if strings.Contains(strings.ToLower(d.Name), low) || strings.Contains(strings.ToLower(d.ID.String()), low) || strings.Contains(strings.ToLower(d.OS), low) {
					filtered = append(filtered, d)
				}
			}
			devices = filtered
		}
		limit, offset := parsePagination(r, 100, 500)
		total := len(devices)
		paged := paginateSlice(devices, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
		api.WriteJSON(w, http.StatusOK, paged)
	}
}

func (s *Server) handleGetDeviceFleet() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		idStr := r.PathValue("id")
		targetID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		endpointID := types.ID(targetID)
		if callerID != endpointID {
			if _, err := s.store.GetSharingRelationshipByEndpoints(r.Context(), callerID, endpointID); err != nil {
				if _, err2 := s.store.GetSharingRelationshipByEndpoints(r.Context(), endpointID, callerID); err2 != nil {
					api.WriteError(w, "forbidden", "not authorized to view this device fleet", http.StatusForbidden)
					return
				}
			}
		}

		shares, err := s.store.ListShares(r.Context(), endpointID)
		if err != nil {
			s.logger.Error("failed to list shares for fleet", "error", err)
			api.WriteError(w, "internal_error", "failed to list fleet", http.StatusInternalServerError)
			return
		}

		fleet := make([]api.FleetDevice, 0)
		seen := make(map[types.ID]bool)

		if selfDev, err := s.store.GetDevice(r.Context(), endpointID); err == nil {
			seen[endpointID] = true
			fleet = append(fleet, api.FleetDevice{
				ID:       selfDev.ID.String(),
				Name:     selfDev.Name + " (This Device)",
				Platform: selfDev.OS,
				Status:   string(selfDev.State),
				IsSelf:   true,
				PairedAt: selfDev.CreatedAt.Format(time.RFC3339),
			})
		}

		for _, sh := range shares {
			otherID := sh.ProviderID
			if otherID == endpointID {
				otherID = sh.RecipientID
			}
			if seen[otherID] {
				continue
			}
			seen[otherID] = true

			dev, err := s.store.GetDevice(r.Context(), otherID)
			if err != nil {
				continue
			}

			fleet = append(fleet, api.FleetDevice{
				ID:       dev.ID.String(),
				Name:     dev.Name,
				Platform: dev.OS,
				Status:   string(dev.State),
				IsSelf:   false,
				PairedAt: sh.CreatedAt.Format(time.RFC3339),
			})
		}

		api.WriteJSON(w, http.StatusOK, fleet)
	}
}
