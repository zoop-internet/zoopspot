//go:build darwin

package tunnel

import (
	"fmt"
	"os/exec"
)

func platformAssignIP(ifName string, ipAddress string) error {
	// On macOS, the generic TUN interface might require ptp
	cmd := exec.Command("ifconfig", ifName, "inet", ipAddress, ipAddress, "up")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ifconfig failed: %v: %s", err, string(out))
	}

	// Add route for the /32 subnet to ensure traffic routes to the TUN
	cmd = exec.Command("route", "add", "-host", ipAddress, "-interface", ifName)
	cmd.Run() // Ignore errors if it exists

	return nil
}

func platformEnableForwarding(ifName string) error {
	// Enable IP forwarding
	cmd := exec.Command("sysctl", "-w", "net.inet.ip.forwarding=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to enable ip forwarding: %v: %s", err, string(out))
	}

	// In a real implementation we would dynamically configure pf (packet filter) for NAT
	return nil
}
func platformDisableForwarding(ifName string) error {
	// Tear down pf rules if any were added
	return nil
}

// platformAddRoute adds a host or network route using the macOS route command.
func platformAddRoute(ifName, cidr string) error {
	out, err := exec.Command("route", "-q", "add", "-net", cidr, "-interface", ifName).CombinedOutput()
	if err != nil && string(out) != "" && !containsExistStr(string(out)) {
		return fmt.Errorf("route add failed: %v: %s", err, string(out))
	}
	return nil
}

func containsExistStr(s string) bool {
	for i := 0; i+6 <= len(s); i++ {
		if s[i:i+6] == "exists" {
			return true
		}
	}
	return false
}
