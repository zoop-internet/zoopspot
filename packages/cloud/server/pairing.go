package server

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func generatePairingCode() (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	var sb strings.Builder
	sb.WriteString("ZP-")
	for i := 0; i < 6; i++ {
		sb.WriteByte(charset[int(b[i])%len(charset)])
	}
	return sb.String(), nil
}

func (s *Server) handleCreatePairingToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "caller identity required", http.StatusUnauthorized)
			return
		}

		var req api.CreatePairingTokenRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		ttl := 10 * time.Minute
		if req.ExpiresInSeconds > 0 && req.ExpiresInSeconds <= 3600 {
			ttl = time.Duration(req.ExpiresInSeconds) * time.Second
		}

		code, err := generatePairingCode()
		if err != nil {
			api.WriteError(w, "internal_error", "failed to generate pairing code", http.StatusInternalServerError)
			return
		}

		zoopID := "ZP-" + callerID.String()[:8]
		if user, err := s.store.GetUser(r.Context(), callerID); err == nil && user.ZoopID != "" {
			zoopID = user.ZoopID
		}

		now := time.Now().UTC()
		expiresAt := now.Add(ttl)

		s.pairingMu.Lock()
		for k, v := range s.pairingTokens {
			if now.After(v.expiresAt) {
				delete(s.pairingTokens, k)
			}
		}
		s.pairingTokens[code] = pairingEntry{
			code:       code,
			endpointID: callerID,
			zoopID:     zoopID,
			expiresAt:  expiresAt,
		}
		s.pairingMu.Unlock()

		cloudURL := "https://zoop-cloud.onrender.com"
		if r.Host != "" {
			scheme := "https"
			if r.TLS == nil && !strings.Contains(r.Host, "onrender.com") && !strings.Contains(r.Host, "sslip.io") {
				scheme = "http"
			}
			cloudURL = fmt.Sprintf("%s://%s", scheme, r.Host)
		}

		resp := api.PairingTokenResponse{
			Code:       code,
			EndpointID: callerID.String(),
			ZoopID:     zoopID,
			CloudURL:   cloudURL,
			ExpiresAt:  expiresAt.Format(time.RFC3339),
		}
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleClaimPairingToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claimerID := api.IdentityFromContext(r.Context())
		if claimerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "caller identity required", http.StatusUnauthorized)
			return
		}

		var req api.ClaimPairingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		code := strings.TrimSpace(strings.ToUpper(req.Code))
		if !strings.HasPrefix(code, "ZP-") && len(code) == 6 {
			code = "ZP-" + code
		}

		s.pairingMu.Lock()
		entry, exists := s.pairingTokens[code]
		if exists && time.Now().UTC().After(entry.expiresAt) {
			delete(s.pairingTokens, code)
			exists = false
		}
		if exists {
			delete(s.pairingTokens, code)
		}
		s.pairingMu.Unlock()

		if !exists {
			api.WriteError(w, "not_found", "invalid or expired pairing code", http.StatusNotFound)
			return
		}

		if entry.endpointID == claimerID {
			api.WriteError(w, "invalid_request", "cannot pair a device with itself", http.StatusBadRequest)
			return
		}

		issuerDev, err := s.store.GetDevice(r.Context(), entry.endpointID)
		if err != nil {
			api.WriteError(w, "not_found", "issuing device not found", http.StatusNotFound)
			return
		}

		// Provision bidirectional sharing relationships
		_, _ = s.shares.CreateShare(r.Context(), api.CreateShareRequest{
			ProviderID:  entry.endpointID,
			RecipientID: claimerID,
		})
		_, _ = s.shares.CreateShare(r.Context(), api.CreateShareRequest{
			ProviderID:  claimerID,
			RecipientID: entry.endpointID,
		})

		ev := services.ServerEvent{
			Type:   "device_paired",
			Entity: "device",
			ID:     claimerID.String(),
			Payload: map[string]interface{}{
				"paired_with": entry.endpointID.String(),
				"device_name": issuerDev.Name,
			},
		}
		s.events.PublishTo(entry.endpointID, ev)
		s.events.PublishTo(claimerID, ev)

		s.audit.Log(r.Context(), claimerID, "device.pair", "issuer:"+entry.endpointID.String(), "claimer:"+claimerID.String())

		resp := api.ClaimPairingResponse{
			Success:          true,
			PairedDeviceID:   entry.endpointID.String(),
			PairedDeviceName: issuerDev.Name,
			Message:          fmt.Sprintf("Successfully paired with %s", issuerDev.Name),
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleSubmitDiagnosticReport() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "missing authentication identity", http.StatusUnauthorized)
			return
		}

		var req api.DiagnosticReportRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid diagnostic report json", http.StatusBadRequest)
			return
		}

		if req.Timestamp == "" {
			req.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}

		s.diagnosticsMu.Lock()
		existing := s.diagnosticReports[callerID]
		if len(existing) >= 10 {
			existing = existing[1:] // bounded ring buffer
		}
		s.diagnosticReports[callerID] = append(existing, req)
		s.diagnosticsMu.Unlock()

		resp := api.DiagnosticReportResponse{
			ReportID:  uuid.New().String(),
			DeviceID:  callerID.String(),
			Timestamp: req.Timestamp,
			Status:    "recorded",
		}
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetDiagnosticReports() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "missing authentication identity", http.StatusUnauthorized)
			return
		}

		deviceIDStr := r.PathValue("deviceId")
		if deviceIDStr == "" {
			api.WriteError(w, "invalid_request", "device id required", http.StatusBadRequest)
			return
		}

		if deviceIDStr != callerID.String() {
			api.WriteError(w, "forbidden", "cannot access diagnostics for another device", http.StatusForbidden)
			return
		}

		s.diagnosticsMu.RLock()
		reports := s.diagnosticReports[callerID]
		s.diagnosticsMu.RUnlock()

		if reports == nil {
			reports = []api.DiagnosticReportRequest{}
		}

		api.WriteJSON(w, http.StatusOK, reports)
	}
}
