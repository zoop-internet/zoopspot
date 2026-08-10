//go:build linux

package tunnel

import (
	"fmt"
	"os/exec"
)

func platformAssignIP(ifName string, ipAddress string) error {
	// Add the IP address to the interface
	cmd := exec.Command("ip", "addr", "add", ipAddress+"/32", "dev", ifName)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ip addr add failed: %v: %s", err, string(out))
	}

	// Bring the link up
	cmd = exec.Command("ip", "link", "set", "dev", ifName, "up")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ip link set up failed: %v: %s", err, string(out))
	}

	return nil
}

func platformEnableForwarding(ifName string) error {
	// Enable IP forwarding
	cmd := exec.Command("sysctl", "-w", "net.ipv4.ip_forward=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to enable ip_forward: %v: %s", err, string(out))
	}

	// Determine default outgoing interface (usually eth0/wlan0)
	// For simplicity in testing, we MASQUERADE all traffic exiting non-zoop interfaces
	// A robust implementation would find the default route interface
	cmd = exec.Command("iptables", "-t", "nat", "-A", "POSTROUTING", "-o", "eth0", "-j", "MASQUERADE")
	cmd.Run() // Ignore errors if rule exists or interface differs

	return nil
}
