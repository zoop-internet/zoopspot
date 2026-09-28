package hotspot

import (
	"fmt"
	"strings"

	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// MikroTikConfig holds parameters required to generate a RouterOS v7 provisioning script.
type MikroTikConfig struct {
	Hotspot          *types.Hotspot
	ServerWGPubKey   string
	ServerEndpoint   string // e.g. "vpn.zoopspot.network:51820"
	ClientWGAddress  string // e.g. "100.64.0.2/30"
	PortalBaseURL    string // e.g. "https://zoopspot.network/portal"
	RouterWGPrivKey  string // optional; if empty RouterOS will generate its own
}

// GenerateMikroTikScript produces a single copy-pasteable RouterOS v7 terminal script.
// It sets up:
// 1. WireGuard client interface to punch through residential ISP CGNAT (Liquid/MTN).
// 2. Hotspot IP service and walled-garden bypass for MarzPay, MTN/Airtel MoMo, and ZoopSpot Cloud.
// 3. Captive portal login redirect pointing to the ZoopSpot Cloud captive portal.
func GenerateMikroTikScript(cfg MikroTikConfig) string {
	h := cfg.Hotspot
	var sb strings.Builder

	sb.WriteString("# ====================================================\n")
	sb.WriteString(fmt.Sprintf("# ZoopSpot Automated Provisioning for MikroTik RouterOS v7\n# Venue: %s (%s)\n", h.Name, h.Slug))
	sb.WriteString("# ====================================================\n\n")

	// 1. WireGuard Interface & Cloud Peer
	sb.WriteString("# --- 1. WireGuard Cloud Management Tunnel ---\n")
	sb.WriteString("/interface wireguard\n")
	sb.WriteString("add name=wg-zoopspot listen-port=51820 comment=\"ZoopSpot Cloud Management\"\n\n")

	sb.WriteString("/ip address\n")
	sb.WriteString(fmt.Sprintf("add address=%s interface=wg-zoopspot comment=\"ZoopSpot Overlay IP\"\n\n", cfg.ClientWGAddress))

	sb.WriteString("/interface wireguard peers\n")
	sb.WriteString(fmt.Sprintf("add interface=wg-zoopspot public-key=\"%s\" endpoint-address=\"%s\" endpoint-port=51820 allowed-address=100.64.0.0/10 persistent-keepalive=25s comment=\"ZoopSpot Cloud Gateway\"\n\n",
		cfg.ServerWGPubKey, cfg.ServerEndpoint))

	// 2. Enable RouterOS REST API for Cloud Session Unlocks
	sb.WriteString("# --- 2. Enable RouterOS REST API ---\n")
	sb.WriteString("/ip service\n")
	sb.WriteString("set www-ssl disabled=no port=443\n")
	sb.WriteString("set api-ssl disabled=no port=8729\n\n")

	apiPass := h.RouterAPIPassword
	if apiPass == "" {
		apiPass = "ZoopSpot2026!"
	}
	sb.WriteString("/user group\n")
	sb.WriteString("add name=zoopspot-group policy=read,write,api,rest\n")
	sb.WriteString("/user\n")
	sb.WriteString(fmt.Sprintf("add name=%s group=zoopspot-group password=\"%s\" comment=\"ZoopSpot Cloud Controller\"\n\n",
		h.RouterAPIUser, apiPass))

	// 3. Walled Garden Entries (Allows payment processing before login)
	sb.WriteString("# --- 3. Walled Garden Bypass (Payments & Captive Portal) ---\n")
	sb.WriteString("/ip hotspot walled-garden\n")
	sb.WriteString("add dst-host=*zoopspot.network comment=\"ZoopSpot Portal & API\"\n")
	sb.WriteString("add dst-host=*zoopnetwork.app comment=\"ZoopSpot Portal Alt\"\n")
	sb.WriteString("add dst-host=*wearemarz.com comment=\"MarzPay Payment Gateway\"\n")
	sb.WriteString("add dst-host=*mtn.co.ug comment=\"MTN MoMo Gateway\"\n")
	sb.WriteString("add dst-host=*airtel.co.ug comment=\"Airtel Money Gateway\"\n")
	sb.WriteString("add dst-host=*fonts.googleapis.com comment=\"Google Fonts for Portal\"\n")
	sb.WriteString("add dst-host=*fonts.gstatic.com comment=\"Google Fonts CDN\"\n\n")

	// 4. Hotspot Login Redirection
	portalURL := fmt.Sprintf("%s?hotspot=%s&mac=$(mac)&ip=$(ip)", cfg.PortalBaseURL, h.Slug)
	sb.WriteString("# --- 4. Hotspot Redirect Profile ---\n")
	sb.WriteString("/ip hotspot user profile\n")
	sb.WriteString("add name=zoopspot-default rate-limit=5M/2M transparent-proxy=no\n\n")

	sb.WriteString(fmt.Sprintf("# Note: Point your hotspot login.html redirect to:\n# %s\n\n", portalURL))
	sb.WriteString(":put \"ZoopSpot RouterOS v7 Provisioning Completed Successfully!\"\n")

	return sb.String()
}
