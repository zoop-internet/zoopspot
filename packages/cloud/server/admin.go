package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func (s *Server) handleAdminOverview() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, _ := s.store.ListDevices(r.Context())
		orgs, _ := s.store.ListOrganizations(r.Context())
		members, _ := s.store.ListOrgMembersAll(r.Context())

		trusted := 0
		for _, d := range devices {
			if d.State == types.DeviceStateTrusted || d.State == types.DeviceStateRegistered {
				trusted++
			}
		}

		api.WriteJSON(w, http.StatusOK, map[string]any{
			"devices":       len(devices),
			"organizations": len(orgs),
			"members":       len(members),
			"trusted":       trusted,
		})
	}
}

func (s *Server) handleAdminDevices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, err := s.store.ListDevices(r.Context())
		if err != nil {
			s.logger.Error("failed to list devices for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list devices", http.StatusInternalServerError)
			return
		}

		resp := make([]api.DeviceResponse, 0, len(devices))
		for _, d := range devices {
			resp = append(resp, api.DeviceResponse{
				ID:     d.ID,
				Name:   d.Name,
				OS:     d.OS,
				Status: string(d.State),
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conns, err := s.store.ListAllConnections(r.Context())
		if err != nil {
			s.logger.Error("failed to list connections for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list connections", http.StatusInternalServerError)
			return
		}

		resp := make([]api.ConnectionResponse, 0, len(conns))
		for _, c := range conns {
			resp = append(resp, api.ConnectionResponse{
				ID:          c.ID,
				ProviderID:  c.ProviderID,
				RecipientID: c.RecipientID,
				State:       c.State,
				ProviderIP:  c.ProviderIP,
				RecipientIP: c.RecipientIP,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminServices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		health := s.CheckHealth()
		api.WriteJSON(w, http.StatusOK, health)
	}
}

func (s *Server) handleAdminOrganizations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgs, err := s.store.ListOrganizations(r.Context())
		if err != nil {
			s.logger.Error("failed to list organizations for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list organizations", http.StatusInternalServerError)
			return
		}

		resp := make([]api.OrgResponse, 0, len(orgs))
		for _, o := range orgs {
			resp = append(resp, api.OrgResponse{
				ID:          o.ID,
				Name:        o.Name,
				OwnerDevice: o.OwnerDevice,
				Slug:        o.Slug,
				Status:      o.Status,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminOrgMembers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		all, err := s.store.GetOrgMembers(r.Context(), types.ID(orgID))
		if err != nil {
			s.logger.Error("failed to list members for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list members", http.StatusInternalServerError)
			return
		}

		resp := make([]api.OrgMemberResponse, 0, len(all))
		for _, m := range all {
			resp = append(resp, api.OrgMemberResponse{
				ID:             m.ID,
				OrganizationID: m.OrganizationID,
				DeviceID:       m.DeviceID,
				Name:           m.Name,
				Email:          m.Email,
				Role:           m.Role,
				Status:         m.Status,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

// handleAdminUsers lists every registered user across the platform: org members
// enriched with their linked device state.
func (s *Server) handleAdminUsers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, _ := s.store.ListDevices(r.Context())
		members, _ := s.store.ListOrgMembersAll(r.Context())

		deviceByID := make(map[types.ID]*types.Device, len(devices))
		for _, d := range devices {
			deviceByID[d.ID] = d
		}

		resp := make([]map[string]interface{}, 0, len(members))
		for _, m := range members {
			dev := deviceByID[m.DeviceID]
			status := m.Status
			if dev != nil {
				status = string(dev.State)
			}
			resp = append(resp, map[string]interface{}{
				"id":              m.ID,
				"name":            m.Name,
				"email":           m.Email,
				"role":            m.Role,
				"status":          status,
				"device_id":       m.DeviceID,
				"organization_id": m.OrganizationID,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

// handleAdminNetwork reports IPAM allocation usage for the overlay network.
func (s *Server) handleAdminNetwork() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		allocated, capacity, err := s.store.IPAMUsage(r.Context())
		if err != nil {
			s.logger.Error("failed to read IPAM usage", "error", err)
			api.WriteError(w, "internal_error", "failed to read IPAM usage", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"pool":              "100.64.0.0/10",
			"subnets_allocated": allocated,
			"capacity":          capacity,
			"utilization_pct":   float64(allocated) / float64(capacity) * 100,
		})
	}
}

// handleAdminAudit returns recent operator audit log entries, newest first.
func (s *Server) handleAdminAudit() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		events := s.audit.ListEvents()
		// Newest first, capped at 200.
		n := len(events)
		if n > 200 {
			n = 200
		}
		out := make([]*services.AuditEvent, 0, n)
		for i := len(events) - 1; i >= 0 && len(out) < n; i-- {
			out = append(out, events[i])
		}
		api.WriteJSON(w, http.StatusOK, out)
	}
}

// handleAdminUsage aggregates platform usage counters with production telemetry.
func (s *Server) handleAdminUsage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		devices, _ := s.store.ListDevices(ctx)
		orgs, _ := s.store.ListOrganizations(ctx)
		members, _ := s.store.ListOrgMembersAll(ctx)
		shares, _ := s.store.ListSharesAll(ctx)
		conns, _ := s.store.ListAllConnections(ctx)

		// Parse range param (default 30)
		rangeDays := 30
		if q := r.URL.Query().Get("range"); q != "" {
			q = strings.TrimSuffix(strings.TrimSpace(q), "d")
			if v, err := fmt.Sscanf(q, "%d", &rangeDays); err == nil && v == 1 {
				if rangeDays != 7 && rangeDays != 30 && rangeDays != 90 {
					if rangeDays < 1 {
						rangeDays = 7
					} else if rangeDays > 90 {
						rangeDays = 90
					}
				}
			}
		}
		if rangeDays < 1 {
			rangeDays = 30
		}

		stateCounts := map[string]int{}
		for _, c := range conns {
			stateCounts[string(c.State)]++
		}

		trusted := 0
		suspended := 0
		revoked := 0
		for _, d := range devices {
			switch d.State {
			case types.DeviceStateTrusted, types.DeviceStateRegistered:
				trusted++
			case types.DeviceStateSuspended:
				suspended++
			case types.DeviceStateRevoked:
				revoked++
			}
		}

		// Bandwidth from relay meter
		var bytesIn, bytesOut uint64
		activeSessions := 0
		if s.relayServer != nil && s.relayServer.GetMeter() != nil {
			bytesIn, bytesOut = s.relayServer.GetMeter().GetTotalTraffic()
			activeSessions = s.relayServer.ActiveConnections()
		}

		// IPAM
		allocated, capacity, _ := s.store.IPAMUsage(ctx)
		var utilization float64
		if capacity > 0 {
			utilization = float64(allocated) / float64(capacity) * 100
		}

		// Timeseries: bucket per day for last rangeDays
		now := time.Now().UTC()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		dateKeys := make([]string, rangeDays)
		dateMap := make(map[string]int)
		for i := 0; i < rangeDays; i++ {
			d := today.AddDate(0, 0, -rangeDays+1+i)
			k := d.Format("2006-01-02")
			dateKeys[i] = k
			dateMap[k] = i
		}
		deviceDaily := make([]int, rangeDays)
		connDaily := make([]int, rangeDays)
		memberDaily := make([]int, rangeDays)
		shareDaily := make([]int, rangeDays)

		countByDay := func(t time.Time, bucket []int) {
			if t.IsZero() {
				return
			}
			k := t.In(time.UTC).Format("2006-01-02")
			if idx, ok := dateMap[k]; ok {
				bucket[idx]++
			} else if t.After(today.AddDate(0, 0, -rangeDays+1)) && t.Before(today.AddDate(0, 0, 1)) {
				bucket[rangeDays-1]++
			}
		}
		for _, d := range devices {
			countByDay(d.CreatedAt, deviceDaily)
		}
		for _, c := range conns {
			countByDay(c.CreatedAt, connDaily)
		}
		for _, m := range members {
			countByDay(m.CreatedAt, memberDaily)
		}
		for _, sh := range shares {
			countByDay(sh.CreatedAt, shareDaily)
		}

		type dailyPoint struct {
			Date       string `json:"date"`
			NewDevices int    `json:"new_devices"`
			NewConns   int    `json:"new_connections"`
			NewMembers int    `json:"new_members"`
			NewShares  int    `json:"new_shares"`
			CumDevices int    `json:"cum_devices,omitempty"`
			CumConns   int    `json:"cum_connections,omitempty"`
		}
		points := make([]dailyPoint, rangeDays)
		cumD, cumC := 0, 0
		beforeD := len(devices)
		beforeC := len(conns)
		for _, v := range deviceDaily {
			beforeD -= v
		}
		for _, v := range connDaily {
			beforeC -= v
		}
		cumD = beforeD
		cumC = beforeC
		for i := 0; i < rangeDays; i++ {
			cumD += deviceDaily[i]
			cumC += connDaily[i]
			points[i] = dailyPoint{
				Date:       dateKeys[i],
				NewDevices: deviceDaily[i],
				NewConns:   connDaily[i],
				NewMembers: memberDaily[i],
				NewShares:  shareDaily[i],
				CumDevices: cumD,
				CumConns:   cumC,
			}
		}

		calcGrowth := func(daily []int) float64 {
			if rangeDays < 14 {
				return 0
			}
			last7 := 0
			prev7 := 0
			for i := rangeDays - 7; i < rangeDays; i++ {
				last7 += daily[i]
			}
			for i := rangeDays - 14; i < rangeDays-7; i++ {
				prev7 += daily[i]
			}
			if prev7 == 0 {
				if last7 == 0 {
					return 0
				}
				return 100
			}
			return float64(last7-prev7) / float64(prev7) * 100
		}
		devGrowth := calcGrowth(deviceDaily)
		connGrowth := calcGrowth(connDaily)

		orgMemberCounts := make(map[string]int)
		for _, o := range orgs {
			orgMemberCounts[o.ID.String()] = 0
		}
		for _, m := range members {
			k := m.OrganizationID.String()
			orgMemberCounts[k]++
		}

		deviceOrgs := make(map[string][]string)
		for _, m := range members {
			if m.DeviceID.String() != "" && m.DeviceID.String() != "00000000-0000-0000-0000-000000000000" {
				deviceOrgs[m.DeviceID.String()] = append(deviceOrgs[m.DeviceID.String()], m.OrganizationID.String())
			}
		}

		orgConnCounts := make(map[string]int)
		for _, c := range conns {
			seen := make(map[string]bool)
			for _, did := range []string{c.ProviderID.String(), c.RecipientID.String()} {
				for _, oid := range deviceOrgs[did] {
					if !seen[oid] {
						orgConnCounts[oid]++
						seen[oid] = true
					}
				}
			}
		}

		type orgUsage struct {
			ID          string  `json:"id"`
			Name        string  `json:"name"`
			Slug        string  `json:"slug,omitempty"`
			Members     int     `json:"members"`
			Devices     int     `json:"devices"`
			Connections int     `json:"connections"`
			Share       float64 `json:"share_pct,omitempty"`
		}
		var topOrgs []orgUsage
		for _, o := range orgs {
			id := o.ID.String()
			membersCount := orgMemberCounts[id]
			devCount := 0
			seenDev := make(map[string]bool)
			for _, m := range members {
				if m.OrganizationID.String() == id && m.DeviceID.String() != "" && m.DeviceID.String() != "00000000-0000-0000-0000-000000000000" {
					if !seenDev[m.DeviceID.String()] {
						devCount++
						seenDev[m.DeviceID.String()] = true
					}
				}
			}
			topOrgs = append(topOrgs, orgUsage{
				ID:          id,
				Name:        o.Name,
				Slug:        o.Slug,
				Members:     membersCount,
				Devices:     devCount,
				Connections: orgConnCounts[id],
			})
		}

		for i := 0; i < len(topOrgs); i++ {
			for j := i + 1; j < len(topOrgs); j++ {
				if topOrgs[j].Connections > topOrgs[i].Connections || (topOrgs[j].Connections == topOrgs[i].Connections && topOrgs[j].Members > topOrgs[i].Members) {
					topOrgs[i], topOrgs[j] = topOrgs[j], topOrgs[i]
				}
			}
		}
		if len(topOrgs) > 10 {
			topOrgs = topOrgs[:10]
		}

		totalConnsForShare := len(conns)
		if totalConnsForShare == 0 {
			totalConnsForShare = 1
		}
		for i := range topOrgs {
			topOrgs[i].Share = float64(topOrgs[i].Connections) / float64(totalConnsForShare) * 100
		}

		events := s.audit.ListEvents()
		cutoff := now.AddDate(0, 0, -7)
		byAction := make(map[string]int)
		last7Count := 0
		for _, ev := range events {
			if ev.Timestamp.After(cutoff) {
				last7Count++
				byAction[ev.Action]++
			}
		}

		deviceLimit := 10000
		quotas := map[string]interface{}{
			"device_limit":     deviceLimit,
			"devices_used_pct": float64(len(devices)) / float64(deviceLimit) * 100,
			"ipam_warning":     80,
			"ipam_critical":    95,
			"ipam_pct":         utilization,
			"bandwidth_cap_per_session": func() uint64 {
				if s.relayServer != nil && s.relayServer.GetMeter() != nil {
					return 0
				}
				return 0
			}(),
		}

		if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
			w.Header().Set("Content-Type", "text/csv")
			w.Header().Set("Content-Disposition", "attachment; filename=zoop-usage-"+today.Format("2006-01-02")+".csv")
			fmt.Fprintln(w, "metric,value")
			fmt.Fprintf(w, "devices,%d\n", len(devices))
			fmt.Fprintf(w, "trusted_devices,%d\n", trusted)
			fmt.Fprintf(w, "suspended_devices,%d\n", suspended)
			fmt.Fprintf(w, "revoked_devices,%d\n", revoked)
			fmt.Fprintf(w, "organizations,%d\n", len(orgs))
			fmt.Fprintf(w, "members,%d\n", len(members))
			fmt.Fprintf(w, "shares,%d\n", len(shares))
			fmt.Fprintf(w, "connections,%d\n", len(conns))
			for k, v := range stateCounts {
				fmt.Fprintf(w, "connections_%s,%d\n", strings.ToLower(k), v)
			}
			fmt.Fprintf(w, "bandwidth_bytes_in,%d\n", bytesIn)
			fmt.Fprintf(w, "bandwidth_bytes_out,%d\n", bytesOut)
			fmt.Fprintf(w, "bandwidth_total,%d\n", bytesIn+bytesOut)
			fmt.Fprintf(w, "relay_active_sessions,%d\n", activeSessions)
			fmt.Fprintf(w, "ipam_allocated,%d\n", allocated)
			fmt.Fprintf(w, "ipam_capacity,%d\n", capacity)
			fmt.Fprintf(w, "ipam_utilization_pct,%.2f\n", utilization)
			fmt.Fprintln(w, "")
			fmt.Fprintln(w, "date,new_devices,new_connections,new_members,new_shares,cum_devices,cum_connections")
			for _, p := range points {
				fmt.Fprintf(w, "%s,%d,%d,%d,%d,%d,%d\n", p.Date, p.NewDevices, p.NewConns, p.NewMembers, p.NewShares, p.CumDevices, p.CumConns)
			}
			fmt.Fprintln(w, "")
			fmt.Fprintln(w, "org_id,org_name,members,devices,connections,share_pct")
			for _, o := range topOrgs {
				safeName := strings.ReplaceAll(o.Name, ",", " ")
				fmt.Fprintf(w, "%s,%s,%d,%d,%d,%.1f\n", o.ID, safeName, o.Members, o.Devices, o.Connections, o.Share)
			}
			return
		}

		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"devices":              len(devices),
			"trusted_devices":      trusted,
			"suspended_devices":    suspended,
			"revoked_devices":      revoked,
			"organizations":        len(orgs),
			"members":              len(members),
			"shares":               len(shares),
			"connections":          len(conns),
			"connections_by_state": stateCounts,
			"bandwidth": map[string]interface{}{
				"bytes_in":        bytesIn,
				"bytes_out":       bytesOut,
				"total":           bytesIn + bytesOut,
				"active_sessions": activeSessions,
			},
			"ipam": map[string]interface{}{
				"pool":              "100.64.0.0/10",
				"subnets_allocated": allocated,
				"capacity":          capacity,
				"utilization_pct":   utilization,
			},
			"timeseries": points,
			"range_days": rangeDays,
			"trends": map[string]interface{}{
				"devices_growth_pct":     devGrowth,
				"connections_growth_pct": connGrowth,
			},
			"top_orgs": topOrgs,
			"audit_summary": map[string]interface{}{
				"last_7_days": last7Count,
				"by_action":   byAction,
			},
			"quotas":       quotas,
			"generated_at": now.Format(time.RFC3339),
		})
	}
}

// handleAdminRevokeDevice transitions a device into the revoked state.
func (s *Server) handleAdminRevokeDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Revoke(r.Context(), types.ID(parsed)); err != nil {
			s.logger.Error("failed to revoke device", "error", err)
			api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.revoke", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"revoked": true, "id": id})
	}
}

func (s *Server) handleAdminSuspendDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Suspend(r.Context(), types.ID(parsed)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			if err == services.ErrInvalidDeviceState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to suspend device", "error", err)
			api.WriteError(w, "internal_error", "failed to suspend device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.suspend", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"suspended": true, "id": id})
	}
}

func (s *Server) handleAdminRestoreDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Restore(r.Context(), types.ID(parsed)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			if err == services.ErrInvalidDeviceState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to restore device", "error", err)
			api.WriteError(w, "internal_error", "failed to restore device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.restore", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"restored": true, "id": id})
	}
}

// adminActorID resolves the caller identity for audit logging on admin actions.
func (s *Server) adminActorID(r *http.Request) types.ID {
	callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
	if !ok {
		return types.ID{}
	}
	return callerID
}
