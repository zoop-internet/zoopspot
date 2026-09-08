//go:build windows

package tunnel

import (
	"fmt"
	"net"
	"os/exec"
	"strings"

	"golang.zx2c4.com/wireguard/tun"
)

func platformCreateTUNFromFD(fd int, ifName string) (tun.Device, error) {
	return nil, fmt.Errorf("TUN creation from file descriptor is not supported on Windows")
}

func platformAssignIP(ifName string, ipAddress string) error {
	cmd := exec.Command("netsh", "interface", "ip", "set", "address", "name="+ifName, "static", ipAddress, "255.255.255.255")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("netsh set address failed: %v: %s", err, string(out))
	}
	return nil
}

func platformEnableForwarding(ifName string) error {
	// Enable IPv4 packet forwarding on the interface using netsh
	cmd := exec.Command("netsh", "interface", "ipv4", "set", "interface", ifName, "forwarding=enabled")
	_ = cmd.Run()

	// Configure Windows NAT for Zoop CGNAT subnet 100.64.0.0/10 via PowerShell NetNat
	psScript := "if (-not (Get-NetNat -Name 'ZoopNAT' -ErrorAction SilentlyContinue)) { New-NetNat -Name 'ZoopNAT' -InternalIPInterfaceAddressPrefix '100.64.0.0/10' -ErrorAction SilentlyContinue }"
	_ = exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psScript).Run()
	return nil
}

func platformDisableForwarding(ifName string) error {
	_ = exec.Command("netsh", "interface", "ipv4", "set", "interface", ifName, "forwarding=disabled").Run()
	psScript := "Remove-NetNat -Name 'ZoopNAT' -Confirm:$false -ErrorAction SilentlyContinue"
	_ = exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psScript).Run()
	return nil
}

// platformAddRoute adds a host or network route using the Windows route command with accurate subnet mask.
func platformAddRoute(ifName, cidr string) error {
	var network string
	var mask string

	if cidr == "0.0.0.0/0" || cidr == "default" {
		network = "0.0.0.0"
		mask = "0.0.0.0"
	} else {
		ip, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			ip = net.ParseIP(cidr)
			if ip == nil {
				return fmt.Errorf("invalid CIDR or IP: %s", cidr)
			}
			network = ip.String()
			mask = "255.255.255.255"
		} else {
			network = ipNet.IP.String()
			if len(ipNet.Mask) == 4 {
				mask = fmt.Sprintf("%d.%d.%d.%d", ipNet.Mask[0], ipNet.Mask[1], ipNet.Mask[2], ipNet.Mask[3])
			} else {
				mask = "255.255.255.255"
			}
		}
	}

	// Try route ADD first
	out, err := exec.Command("route", "ADD", network, "MASK", mask, "0.0.0.0", "IF", ifName).CombinedOutput()
	if err != nil {
		outStr := string(out)
		if strings.Contains(outStr, "already exists") || strings.Contains(outStr, "The route addition failed: The object already exists") {
			// Change existing route
			changeCmd := exec.Command("route", "CHANGE", network, "MASK", mask, "0.0.0.0", "IF", ifName)
			_ = changeCmd.Run()
			return nil
		}
		// Also attempt PowerShell New-NetRoute as modern fallback
		psCmd := fmt.Sprintf("New-NetRoute -DestinationPrefix '%s' -InterfaceAlias '%s' -NextHop '0.0.0.0' -ErrorAction SilentlyContinue", cidr, ifName)
		_ = exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psCmd).Run()
	}

	return nil
}
