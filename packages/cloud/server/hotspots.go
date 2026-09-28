package server

import (
	"encoding/json"
	"net/http"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// --- Request DTOs ---

type CreateHotspotRequest struct {
	Name       string                  `json:"name"`
	Slug       string                  `json:"slug,omitempty"`
	Location   string                  `json:"location,omitempty"`
	RouterType types.HotspotRouterType `json:"router_type,omitempty"`
}

type CreatePackageRequest struct {
	Name            string  `json:"name"`
	Price           float64 `json:"price"`
	DurationMinutes int     `json:"duration_minutes"`
	RateDownKbps    int     `json:"rate_down_kbps,omitempty"`
	RateUpKbps      int     `json:"rate_up_kbps,omitempty"`
}

type GenerateVouchersRequest struct {
	PackageID types.ID `json:"package_id"`
	Count     int      `json:"count"`
	BatchTag  string   `json:"batch_tag,omitempty"`
}

type PortalCheckoutRequest struct {
	HotspotSlug string `json:"hotspot_slug"`
	PackageID   string `json:"package_id"`
	PhoneNumber string `json:"phone_number"`
	MACAddress  string `json:"mac_address"`
	ClientIP    string `json:"client_ip,omitempty"`
}

type PortalVoucherRequest struct {
	HotspotSlug string `json:"hotspot_slug"`
	Code        string `json:"code"`
	MACAddress  string `json:"mac_address"`
	ClientIP    string `json:"client_ip,omitempty"`
}

type PortalLifelineRequest struct {
	HotspotSlug string `json:"hotspot_slug"`
	MACAddress  string `json:"mac_address"`
	ClientIP    string `json:"client_ip,omitempty"`
}

// --- Handlers: Hotspot Operator Fleet ---

func (s *Server) handleCreateHotspot() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ownerID := s.resolveOwnerID(r)
		var req CreateHotspotRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		if req.RouterType == "" {
			req.RouterType = types.RouterMikroTik
		}

		h, err := s.hotspots.CreateHotspot(r.Context(), ownerID, req.Name, req.Slug, req.Location, req.RouterType)
		if err != nil {
			s.logger.Error("failed to create hotspot", "error", err, "owner", ownerID)
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusCreated, h)
	}
}

func (s *Server) handleListHotspots() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ownerID := s.resolveOwnerID(r)
		list, err := s.hotspots.ListHotspots(r.Context(), ownerID)
		if err != nil {
			s.logger.Error("failed to list hotspots", "error", err, "owner", ownerID)
			api.WriteError(w, "internal_error", "failed to list hotspots", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"hotspots": list,
			"total":    len(list),
		})
	}
}

func (s *Server) handleGetHotspot() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		h, err := s.hotspots.GetHotspot(r.Context(), id)
		if err != nil {
			api.WriteError(w, "not_found", "hotspot not found", http.StatusNotFound)
			return
		}
		api.WriteJSON(w, http.StatusOK, h)
	}
}

func (s *Server) handleDeleteHotspot() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		if err := s.hotspots.DeleteHotspot(r.Context(), id); err != nil {
			api.WriteError(w, "internal_error", "failed to delete hotspot", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

func (s *Server) handleGetHotspotScript() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		script, err := s.hotspots.GenerateProvisioningScript(r.Context(), id)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(script))
	}
}

func (s *Server) handleCreateHotspotPackage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		var req CreatePackageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		down := req.RateDownKbps
		if down == 0 {
			down = 5120
		}
		up := req.RateUpKbps
		if up == 0 {
			up = 2048
		}
		pkg, err := s.hotspots.CreatePackage(r.Context(), id, req.Name, req.Price, req.DurationMinutes, down, up)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusCreated, pkg)
	}
}

func (s *Server) handleListHotspotPackages() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		list, err := s.hotspots.ListPackages(r.Context(), id)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"packages": list,
			"total":    len(list),
		})
	}
}

func (s *Server) handleGenerateVouchers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		var req GenerateVouchersRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		if req.Count <= 0 {
			req.Count = 10
		}
		vouchers, err := s.hotspots.GenerateVouchers(r.Context(), id, req.PackageID, req.Count, req.BatchTag)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusCreated, map[string]interface{}{
			"vouchers": vouchers,
			"total":    len(vouchers),
		})
	}
}

func (s *Server) handleListHotspotVouchers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		limit, offset := parsePagination(r, 50, 200)
		vouchers, total, err := s.hotspots.ListVouchers(r.Context(), id, limit, offset)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"vouchers": vouchers,
			"total":    total,
			"limit":    limit,
			"offset":   offset,
		})
	}
}

func (s *Server) handleGetHotspotStats() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid hotspot ID", http.StatusBadRequest)
			return
		}
		stats, err := s.hotspots.GetStats(r.Context(), id)
		if err != nil {
			api.WriteError(w, "internal_error", err.Error(), http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, stats)
	}
}

// --- Handlers: Public Captive Portal ---

func (s *Server) handlePortalGetHotspot() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := r.PathValue("slug")
		h, err := s.hotspots.GetHotspotBySlug(r.Context(), slug)
		if err != nil {
			api.WriteError(w, "not_found", "hotspot not found", http.StatusNotFound)
			return
		}
		pkgs, err := s.hotspots.ListPackages(r.Context(), h.ID)
		if err != nil {
			pkgs = []*types.HotspotPackage{}
		}

		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"hotspot": map[string]interface{}{
				"id":         h.ID,
				"name":       h.Name,
				"slug":       h.Slug,
				"location":   h.Location,
				"currency":   h.Currency,
				"is_online":  h.IsOnline,
			},
			"packages": pkgs,
		})
	}
}

func (s *Server) handlePortalCheckout() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req PortalCheckoutRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		if req.HotspotSlug == "" || req.PackageID == "" || req.PhoneNumber == "" || req.MACAddress == "" {
			api.WriteError(w, "validation_error", "hotspot_slug, package_id, phone_number, and mac_address are required", http.StatusBadRequest)
			return
		}

		resp, err := s.hotspots.InitiatePortalCheckout(r.Context(), req.HotspotSlug, req.PackageID, req.PhoneNumber, req.MACAddress, req.ClientIP)
		if err != nil {
			s.logger.Error("portal checkout failed", "error", err, "slug", req.HotspotSlug)
			api.WriteError(w, "checkout_failed", err.Error(), http.StatusBadRequest)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handlePortalVoucher() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req PortalVoucherRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		if req.HotspotSlug == "" || req.Code == "" || req.MACAddress == "" {
			api.WriteError(w, "validation_error", "hotspot_slug, code, and mac_address are required", http.StatusBadRequest)
			return
		}

		sess, err := s.hotspots.ClaimVoucher(r.Context(), req.HotspotSlug, req.Code, req.MACAddress, req.ClientIP)
		if err != nil {
			api.WriteError(w, "voucher_failed", err.Error(), http.StatusBadRequest)
			return
		}
		api.WriteJSON(w, http.StatusOK, sess)
	}
}

func (s *Server) handlePortalLifeline() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req PortalLifelineRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		if req.HotspotSlug == "" || req.MACAddress == "" {
			api.WriteError(w, "validation_error", "hotspot_slug and mac_address are required", http.StatusBadRequest)
			return
		}

		sess, err := s.hotspots.ClaimLifeline(r.Context(), req.HotspotSlug, req.MACAddress, req.ClientIP)
		if err != nil {
			api.WriteError(w, "lifeline_failed", err.Error(), http.StatusBadRequest)
			return
		}
		api.WriteJSON(w, http.StatusOK, sess)
	}
}

func (s *Server) handlePortalGetSession() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := types.ParseID(r.PathValue("id"))
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid session ID", http.StatusBadRequest)
			return
		}
		sess, err := s.hotspots.GetSession(r.Context(), id)
		if err != nil {
			api.WriteError(w, "not_found", "session not found", http.StatusNotFound)
			return
		}
		api.WriteJSON(w, http.StatusOK, sess)
	}
}
