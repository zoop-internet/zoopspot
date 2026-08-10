package linux

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// DNSManager handles DNS resolver configuration on Linux systems.
type DNSManager struct {
	ifName string
}

// NewDNSManager creates a new DNSManager attached to an interface.
func NewDNSManager(ifName string) *DNSManager {
	return &DNSManager{ifName: ifName}
}

// SetDNS overrides system DNS servers (using systemd-resolved if present, else /etc/resolv.conf backup).
func (d *DNSManager) SetDNS(dnsServers []string) error {
	if len(dnsServers) == 0 {
		return nil
	}

	// Try systemd-resolved (resolvectl)
	if _, err := exec.LookPath("resolvectl"); err == nil {
		args := append([]string{"dns", d.ifName}, dnsServers...)
		if out, err := exec.Command("resolvectl", args...).CombinedOutput(); err == nil {
			// Set domain routing rule for default DNS resolution
			_ = exec.Command("resolvectl", "domain", d.ifName, "~.").Run()
			return nil
		} else {
			_ = out
		}
	}

	// Fallback to updating /etc/resolv.conf
	var sb strings.Builder
	for _, dns := range dnsServers {
		sb.WriteString(fmt.Sprintf("nameserver %s\n", dns))
	}

	return os.WriteFile("/etc/resolv.conf", []byte(sb.String()), 0644)
}

// RestoreDNS clears DNS overrides for the interface.
func (d *DNSManager) RestoreDNS() error {
	if _, err := exec.LookPath("resolvectl"); err == nil {
		_ = exec.Command("resolvectl", "revert", d.ifName).Run()
	}
	return nil
}
