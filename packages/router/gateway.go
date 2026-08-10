package router

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strings"
)

// GatewayManager manages Linux router iptables/nftables MASQUERADE and LAN policy routing.
type GatewayManager struct {
	cfg    RouterConfig
	logger *slog.Logger
}

// NewGatewayManager initializes a GatewayManager instance.
func NewGatewayManager(cfg RouterConfig, logger *slog.Logger) *GatewayManager {
	if logger == nil {
		logger = slog.Default()
	}
	return &GatewayManager{
		cfg:    cfg,
		logger: logger,
	}
}

// EnableProviderNAT configures MASQUERADE NAT so remote Zoop recipients can access the Internet through the router's WAN.
func (g *GatewayManager) EnableProviderNAT() error {
	g.logger.Info("Enabling Provider Router NAT MASQUERADE", "wan", g.cfg.WANInterface, "tunnel", g.cfg.TunnelIfName)

	// Enable sysctl IP forwarding
	_ = os.WriteFile("/proc/sys/net/ipv4/ip_forward", []byte("1"), 0644)

	// Add iptables MASQUERADE rule for traffic exiting WAN
	cmd := exec.Command("iptables", "-t", "nat", "-A", "POSTROUTING", "-o", g.cfg.WANInterface, "-j", "MASQUERADE")
	if out, err := cmd.CombinedOutput(); err != nil && !strings.Contains(string(out), "File exists") {
		g.logger.Debug("iptables provider NAT notice (unprivileged/mock)", "error", err, "output", string(out))
	}

	// Forward traffic from tunnel to WAN
	_ = exec.Command("iptables", "-A", "FORWARD", "-i", g.cfg.TunnelIfName, "-o", g.cfg.WANInterface, "-j", "ACCEPT").Run()
	_ = exec.Command("iptables", "-A", "FORWARD", "-i", g.cfg.WANInterface, "-o", g.cfg.TunnelIfName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()

	return nil
}

// EnableRecipientRouting configures policy routing (ip rule) to capture LAN traffic and route it through the Zoop tunnel.
func (g *GatewayManager) EnableRecipientRouting(providerIP string) error {
	g.logger.Info("Enabling Recipient Router LAN Policy Routing", "lan_subnet", g.cfg.LANSubnet, "tunnel", g.cfg.TunnelIfName)

	// Add policy routing table entry for LAN subnet
	_ = exec.Command("ip", "route", "add", "default", "dev", g.cfg.TunnelIfName, "table", fmt.Sprintf("%d", g.cfg.TableID)).Run()
	_ = exec.Command("ip", "rule", "add", "from", g.cfg.LANSubnet, "table", fmt.Sprintf("%d", g.cfg.TableID)).Run()

	// MASQUERADE LAN traffic exiting tunnel
	_ = exec.Command("iptables", "-t", "nat", "-A", "POSTROUTING", "-o", g.cfg.TunnelIfName, "-j", "MASQUERADE").Run()
	return nil
}

// Teardown disables router NAT rules and policy routing tables.
func (g *GatewayManager) Teardown() error {
	g.logger.Info("Tearing down Router Gateway configuration")
	_ = exec.Command("iptables", "-t", "nat", "-D", "POSTROUTING", "-o", g.cfg.WANInterface, "-j", "MASQUERADE").Run()
	_ = exec.Command("iptables", "-t", "nat", "-D", "POSTROUTING", "-o", g.cfg.TunnelIfName, "-j", "MASQUERADE").Run()
	_ = exec.Command("ip", "rule", "del", "from", g.cfg.LANSubnet, "table", fmt.Sprintf("%d", g.cfg.TableID)).Run()
	return nil
}
