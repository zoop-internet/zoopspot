package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	mrand "math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/relay"
	"github.com/allannuwamanya/zoop/packages/cloud/server"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/config"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

type seededDevice struct {
	ID        types.ID
	Pub       []byte
	Priv      ed25519.PrivateKey
	Name      string
	OS        string
	CreatedAt time.Time
}

var (
	firstNames    = []string{"Alex", "Sarah", "Mike", "Emma", "David", "Lisa", "James", "Anna", "Chris", "Maria", "John", "Sophie", "Ryan", "Olivia", "Daniel", "Grace", "Kevin", "Nina", "Omar", "Priya", "Liam", "Zoe", "Ethan", "Maya", "Noah", "Ava", "Lucas", "Isla", "Hugo", "Leila", "Yuki", "Amara", "Jasper", "Sana", "Khalid", "Elena", "Marco", "Aisha", "Ravi", "Sofia"}
	lastNames     = []string{"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Kim", "Patel", "Chen", "Kumar", "Ali", "Nguyen", "Singh", "Okafor", "Dubois", "Silva", "Yamamoto", "Petrov", "Andersson", "Müller", "Rossi", "Martinsson"}
	devicePresets = []struct{ name, os string }{
		{"MacBook Pro", "darwin"}, {"MacBook Air", "darwin"}, {"ThinkPad X1", "linux"}, {"Dell XPS", "linux"},
		{"Surface Laptop", "windows"}, {"Gaming Rig", "windows"}, {"Home Server", "linux"}, {"Pixel 8", "android"},
		{"Galaxy S24", "android"}, {"iPhone 15", "ios"}, {"iPad Pro", "ios"}, {"Workstation", "linux"},
		{"Desktop", "windows"}, {"Router", "openwrt"}, {"Android Tablet", "android"}, {"Ubuntu Box", "linux"}, {"Mac Mini", "darwin"},
	}
	orgPrefixes = []string{"Acme", "Northwind", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Cyber", "Nova", "Apex", "Vertex", "Orion", "Atlas", "Zenith", "Pinnacle", "Horizon", "Nimbus", "Vector", "Quantum", "Fusion"}
	orgSuffixes = []string{"Labs", "Systems", "Industries", "Technologies", "Solutions", "Dynamics", "Ventures", "Collective", "Group", "Holdings", "Networks", "Digital", "Works", "Studio", "Partners", "Associates", "Innovations", "Enterprises", "Corp", "LLC"}
	roles       = []string{"owner", "admin", "member", "member", "member", "member", "network_engineer"}
)

func pick(r *mrand.Rand, list []string) string { return list[r.Intn(len(list))] }
func fullName(r *mrand.Rand) string            { return pick(r, firstNames) + " " + pick(r, lastNames) }
func stringLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
		if b[i] == ' ' {
			b[i] = '_'
		}
	}
	out := make([]byte, 0, len(b))
	for _, c := range b {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '.' {
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		return "user"
	}
	return string(out)
}
func weightedHour(r *mrand.Rand) int {
	roll := r.Float64()
	switch {
	case roll < 0.45:
		return 9 + r.Intn(9)
	case roll < 0.65:
		return 18 + r.Intn(4)
	case roll < 0.85:
		return 6 + r.Intn(3)
	default:
		return r.Intn(6)
	}
}
func randomWGKey(r *mrand.Rand) []byte {
	b := make([]byte, 32)
	for i := range b {
		b[i] = byte(r.Intn(256))
	}
	return b
}
func slugify(s string) string {
	out := make([]byte, 0, len(s))
	for _, c := range s {
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			out = append(out, byte(c))
		} else if c == ' ' || c == '-' || c == '_' {
			out = append(out, byte('-'))
		}
	}
	res := make([]byte, 0, len(out))
	prevDash := false
	for _, c := range out {
		if c == '-' {
			if !prevDash {
				res = append(res, c)
			}
			prevDash = true
		} else {
			res = append(res, c)
			prevDash = false
		}
	}
	for len(res) > 0 && res[0] == '-' {
		res = res[1:]
	}
	for len(res) > 0 && res[len(res)-1] == '-' {
		res = res[:len(res)-1]
	}
	if len(res) == 0 {
		return "zoop"
	}
	if len(res) > 30 {
		res = res[:30]
	}
	return string(res)
}
func firstNameOnly(full string) string {
	for i, c := range full {
		if c == ' ' {
			return full[:i]
		}
	}
	return full
}
func findDevice(all []seededDevice, id types.ID) seededDevice {
	for _, d := range all {
		if d.ID == id {
			return d
		}
	}
	return seededDevice{}
}

func main() {
	r := mrand.New(mrand.NewSource(42))
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	logger.Info("Zoop Hosted Seeded — starting")

	cfg := config.LoadConfig()
	if cfg.WebDistDir == "" {
		for _, p := range []string{"./web/dist", "web/dist", "/home/a-n/Documents/BUSINESS/ZOOP/web/dist"} {
			if st, err := os.Stat(p); err == nil && st.IsDir() {
				cfg.WebDistDir = p
				break
			}
		}
	}
	if cfg.ControlPlaneURL == "" {
		cfg.ControlPlaneURL = "http://localhost:8080"
	}
	cfg.AllowedOrigins = []string{}
	if cfg.WebDistDir != "" {
		os.Setenv("ZOOP_WEB_DIST", cfg.WebDistDir)
	}
	logger.Info("Config", "webDist", cfg.WebDistDir, "controlPlane", cfg.ControlPlaneURL)

	st := store.NewInMemoryStore()
	ctx := context.Background()

	adminPub, adminPriv, _ := ed25519.GenerateKey(rand.Reader)
	adminID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, adminPub))
	now := time.Now().UTC()
	adminDevice := &types.Device{
		ID:        adminID,
		Name:      "Admin Operator",
		OS:        "linux",
		State:     types.DeviceStateTrusted,
		CreatedAt: now.AddDate(0, 0, -30),
		UpdatedAt: now,
	}
	_ = st.SaveDevice(ctx, adminDevice)
	_ = st.SaveIdentity(ctx, &types.Identity{EndpointID: adminID, PublicKey: adminPub, WireGuardPublicKey: randomWGKey(r)})
	logger.Info("Seed admin", "id", adminID.String())

	var allDevices []seededDevice
	allDevices = append(allDevices, seededDevice{ID: adminID, Pub: adminPub, Priv: adminPriv, Name: "Admin Operator", OS: "linux", CreatedAt: adminDevice.CreatedAt})

	totalDays := 30
	perDayBase := 100
	var totalOrgs, totalShares, totalConns, totalMembers int
	var allOrgs []*types.Organization

	seedStart := now.AddDate(0, 0, -totalDays+1)
	seedStart = time.Date(seedStart.Year(), seedStart.Month(), seedStart.Day(), 0, 0, 0, 0, time.UTC)

	for dayOffset := 0; dayOffset < totalDays; dayOffset++ {
		day := seedStart.AddDate(0, 0, dayOffset)
		weekday := day.Weekday()
		isWeekend := weekday == time.Saturday || weekday == time.Sunday
		variation := r.Intn(41) - 10
		if isWeekend {
			variation -= 20
		}
		growthFactor := 1.0 + float64(dayOffset)*0.008
		perDay := int(float64(perDayBase+variation) * growthFactor)
		if perDay < 50 {
			perDay = 50 + r.Intn(20)
		}
		for i := 0; i < perDay; i++ {
			hour := weightedHour(r)
			min := r.Intn(60)
			sec := r.Intn(60)
			created := time.Date(day.Year(), day.Month(), day.Day(), hour, min, sec, 0, time.UTC)
			if created.After(now) {
				created = now.Add(-time.Duration(r.Intn(3600)) * time.Second)
			}
			pub, priv, _ := ed25519.GenerateKey(rand.Reader)
			id := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
			preset := devicePresets[r.Intn(len(devicePresets))]
			person := fullName(r)
			var devName string
			if r.Float64() < 0.6 {
				devName = fmt.Sprintf("%s's %s", firstNameOnly(person), preset.name)
			} else {
				devName = fmt.Sprintf("%s-%d", preset.name, 1000+r.Intn(9000))
			}
			osStr := preset.os
			if r.Float64() < 0.1 {
				osStr = pick(r, []string{"linux", "windows", "darwin", "android", "ios", "openwrt"})
			}
			state := types.DeviceStateTrusted
			roll := r.Float64()
			if roll < 0.03 {
				state = types.DeviceStateRevoked
			} else if roll < 0.07 {
				state = types.DeviceStateSuspended
			} else if roll < 0.12 {
				state = types.DeviceStateRegistered
			}
			dev := &types.Device{
				ID:        id,
				Name:      devName,
				OS:        osStr,
				State:     state,
				CreatedAt: created,
				UpdatedAt: created.Add(time.Duration(r.Intn(3600*24)) * time.Second),
			}
			if dev.UpdatedAt.After(now) {
				dev.UpdatedAt = now
			}
			_ = st.SaveDevice(ctx, dev)
			_ = st.SaveIdentity(ctx, &types.Identity{EndpointID: id, PublicKey: pub, WireGuardPublicKey: randomWGKey(r)})
			allDevices = append(allDevices, seededDevice{ID: id, Pub: pub, Priv: priv, Name: devName, OS: osStr, CreatedAt: created})
		}
	}
	logger.Info("Seed devices completed", "total", len(allDevices), "days", totalDays)

	numOrgs := len(allDevices) / 10
	if numOrgs < 50 {
		numOrgs = 50
	}
	if numOrgs > 400 {
		numOrgs = 400
	}
	for i := 0; i < numOrgs; i++ {
		ownerIdx := r.Intn(len(allDevices))
		owner := allDevices[ownerIdx]
		orgCreated := owner.CreatedAt.Add(time.Duration(r.Intn(14*24)) * time.Hour)
		if orgCreated.After(now) {
			orgCreated = now.Add(-time.Duration(r.Intn(72)) * time.Hour)
		}
		if orgCreated.Before(owner.CreatedAt) {
			orgCreated = owner.CreatedAt
		}
		orgName := pick(r, orgPrefixes) + " " + pick(r, orgSuffixes)
		if r.Float64() < 0.3 {
			orgName += fmt.Sprintf(" %d", 2020+r.Intn(6))
		}
		slug := slugify(orgName) + fmt.Sprintf("-%d", 100+r.Intn(900))
		orgID := types.NewID()
		org := &types.Organization{
			ID:          orgID,
			Name:        orgName,
			OwnerDevice: owner.ID,
			Slug:        slug,
			Status:      "active",
			CreatedAt:   orgCreated,
		}
		_ = st.SaveOrganization(ctx, org)
		allOrgs = append(allOrgs, org)
		totalOrgs++
		ownerMember := &types.OrgMember{
			ID:             types.NewID(),
			OrganizationID: orgID,
			DeviceID:       owner.ID,
			Name:           fullName(r),
			Email:          fmt.Sprintf("%s@zoop.local", slugify(owner.Name)),
			Role:           "owner",
			Status:         "active",
			CreatedAt:      orgCreated,
		}
		_ = st.SaveOrgMember(ctx, ownerMember)
		totalMembers++
		memberCount := 2 + r.Intn(6)
		used := map[types.ID]bool{owner.ID: true}
		for m := 0; m < memberCount; m++ {
			var memberDev seededDevice
			tries := 0
			for tries < 20 {
				cand := allDevices[r.Intn(len(allDevices))]
				if !used[cand.ID] {
					memberDev = cand
					break
				}
				tries++
			}
			if memberDev.ID.String() == "00000000-0000-0000-0000-000000000000" {
				continue
			}
			used[memberDev.ID] = true
			role := pick(r, roles)
			status := "active"
			if r.Float64() < 0.08 {
				status = "invited"
			} else if r.Float64() < 0.04 {
				status = "suspended"
			}
			mem := &types.OrgMember{
				ID:             types.NewID(),
				OrganizationID: orgID,
				DeviceID:       memberDev.ID,
				Name:           fullName(r),
				Email:          fmt.Sprintf("%s@%s.zoop.local", slugify(memberDev.Name), slugify(orgName)),
				Role:           role,
				Status:         status,
				CreatedAt:      orgCreated.Add(time.Duration(r.Intn(72)) * time.Hour),
			}
			if mem.CreatedAt.After(now) {
				mem.CreatedAt = now
			}
			_ = st.SaveOrgMember(ctx, mem)
			totalMembers++
		}
	}
	logger.Info("Seed orgs", "orgs", totalOrgs, "members", totalMembers)

	targetShares := len(allDevices) * 2
	if targetShares > 8000 {
		targetShares = 8000
	}
	shareSeen := make(map[string]bool)
	for i := 0; i < targetShares; i++ {
		var provider, recipient seededDevice
		if r.Float64() < 0.7 && len(allOrgs) > 0 {
			org := allOrgs[r.Intn(len(allOrgs))]
			members, _ := st.GetOrgMembers(ctx, org.ID)
			if len(members) < 2 {
				provider = allDevices[r.Intn(len(allDevices))]
				recipient = allDevices[r.Intn(len(allDevices))]
			} else {
				a := members[r.Intn(len(members))]
				b := members[r.Intn(len(members))]
				tries := 0
				for a.DeviceID == b.DeviceID && tries < 10 {
					b = members[r.Intn(len(members))]
					tries++
				}
				provider = findDevice(allDevices, a.DeviceID)
				recipient = findDevice(allDevices, b.DeviceID)
				if provider.ID.String() == "" || recipient.ID.String() == "" {
					provider = allDevices[r.Intn(len(allDevices))]
					recipient = allDevices[r.Intn(len(allDevices))]
				}
			}
		} else {
			provider = allDevices[r.Intn(len(allDevices))]
			recipient = allDevices[r.Intn(len(allDevices))]
		}
		if provider.ID == recipient.ID {
			continue
		}
		key := provider.ID.String() + "->" + recipient.ID.String()
		if shareSeen[key] {
			continue
		}
		shareSeen[key] = true
		base := provider.CreatedAt
		if recipient.CreatedAt.After(base) {
			base = recipient.CreatedAt
		}
		created := base.Add(time.Duration(r.Intn(10*24)) * time.Hour)
		if created.After(now) {
			created = now.Add(-time.Duration(r.Intn(48)) * time.Hour)
		}
		if created.Before(base) {
			created = base
		}
		isActive := r.Float64() < 0.88
		share := &types.SharingRelationship{
			ID:          types.NewID(),
			ProviderID:  provider.ID,
			RecipientID: recipient.ID,
			IsActive:    isActive,
			CreatedAt:   created,
		}
		_ = st.SaveSharingRelationship(ctx, share)
		totalShares++
	}
	logger.Info("Seed shares", "shares", totalShares)

	allShares, _ := st.ListSharesAll(ctx)
	for _, sh := range allShares {
		if r.Float64() > 0.62 {
			continue
		}
		created := sh.CreatedAt.Add(time.Duration(r.Intn(5*24)) * time.Hour)
		if created.After(now) {
			created = now.Add(-time.Duration(r.Intn(24)) * time.Hour)
		}
		roll := r.Float64()
		var state types.ConnectionState
		switch {
		case roll < 0.12:
			state = types.ConnectionStateRequested
		case roll < 0.22:
			state = types.ConnectionStateAuthorized
		case roll < 0.30:
			state = types.ConnectionStateConnecting
		case roll < 0.75:
			state = types.ConnectionStateConnected
		default:
			state = types.ConnectionStateDisconnected
		}
		providerIP, recipientIP, err := st.AllocateConnectionIPs(ctx)
		if err != nil {
			continue
		}
		shouldRelease := state == types.ConnectionStateDisconnected && r.Float64() < 0.5
		conn := &types.Connection{
			ID:          types.NewID(),
			ProviderID:  sh.ProviderID,
			RecipientID: sh.RecipientID,
			State:       state,
			ProviderIP:  providerIP,
			RecipientIP: recipientIP,
			CreatedAt:   created,
			UpdatedAt:   created.Add(time.Duration(r.Intn(24)) * time.Hour),
		}
		if conn.UpdatedAt.After(now) {
			conn.UpdatedAt = now
		}
		_ = st.SaveConnection(ctx, conn)
		if shouldRelease {
			_ = st.ReleaseConnectionIPs(ctx, providerIP, recipientIP)
		}
		totalConns++
	}
	logger.Info("Seed connections", "connections", totalConns)

	deviceService := services.NewDeviceService(st)
	userService := services.NewUserService(st)
	orgService := services.NewOrganizationService(st)
	shareService := services.NewShareService(st)
	hub := services.NewSignalingHub()
	connService := services.NewConnectionService(st, hub)

	srv := server.NewServer(cfg, logger, st, deviceService, userService, orgService, shareService, connService, hub)

	reg := srv.RelayRegistry()
	reg.RegisterNode(relay.RelayNode{ID: "relay-us-east", Region: "us-east", Host: "us-east.zoop.network", Port: 8080, WebSocketURL: "ws://us-east.zoop.network:8080/v1/relay", STUNPort: 3478, TURNPort: 3478, Status: relay.RelayStatusOnline, MaxCapacity: 5000})
	reg.RegisterNode(relay.RelayNode{ID: "relay-eu-central", Region: "eu-central", Host: "eu.zoop.network", Port: 8080, WebSocketURL: "ws://eu.zoop.network:8080/v1/relay", STUNPort: 3478, TURNPort: 3478, Status: relay.RelayStatusOnline, MaxCapacity: 5000})
	reg.RegisterNode(relay.RelayNode{ID: "relay-ap-southeast", Region: "ap-southeast", Host: "ap.zoop.network", Port: 8080, WebSocketURL: "ws://ap.zoop.network:8080/v1/relay", STUNPort: 3478, TURNPort: 3478, Status: relay.RelayStatusOnline, MaxCapacity: 5000})

	// Prepare stats
	fmt.Printf("\n=== ZOOP SEEDED HOSTED READY ===\n")
	fmt.Printf(" Devices: %d (100/day avg over 30 days)\n", len(allDevices))
	fmt.Printf(" Orgs: %d Members: %d\n", totalOrgs, totalMembers)
	fmt.Printf(" Shares: %d Connections: %d\n", totalShares, totalConns)
	fmt.Printf(" Admin Device ID: %s\n", adminID.String())
	fmt.Printf(" Admin PublicKey (base64): %s\n", base64.StdEncoding.EncodeToString(adminPub))
	fmt.Printf(" Admin PrivateKey (base64 len %d) saved to /tmp/zoop_admin_priv.b64\n", len(adminPriv))
	_ = os.WriteFile("/tmp/zoop_admin.env", []byte(fmt.Sprintf("ZOOP_ADMIN_ID=%s\nZOOP_ADMIN_PUB=%s\n", adminID.String(), base64.StdEncoding.EncodeToString(adminPub))), 0644)
	_ = os.WriteFile("/tmp/zoop_admin_priv.b64", []byte(base64.StdEncoding.EncodeToString(adminPriv)), 0600)
	fmt.Printf(" Files: /tmp/zoop_admin.env and /tmp/zoop_admin_priv.b64\n")
	fmt.Printf(" API http://localhost:8080/v1/health  Web http://localhost:8080/  Vite http://localhost:5173 (proxy)\n")
	fmt.Printf("================================\n\n")

	ctx2, cancel := context.WithCancel(context.Background())
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		logger.Info("Signal received", "signal", sig)
		cancel()
	}()
	if err := srv.Start(ctx2); err != nil {
		logger.Error("Server stopped", "error", err)
		os.Exit(1)
	}
	logger.Info("Server exited")
}
