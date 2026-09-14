//go:build darwin

package tunnel

import (
	"bytes"
	"fmt"
	"net"
	"os"
	"os/exec"
	"strings"

	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"
)

func platformCreateTUNFromFD(fd int, ifName string) (tun.Device, error) {
	file := os.NewFile(uintptr(fd), ifName)
	return tun.CreateTUNFromFile(file, device.DefaultMTU)
}

func platformAssignIP(ifName string, ipAddress string) error {
	// On macOS, generic utun interfaces require point-to-point IP assignment
	cmd := exec.Command("ifconfig", ifName, "inet", ipAddress, ipAddress, "up")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ifconfig failed: %v: %s", err, string(out))
	}

	// Ensure local /32 host route points to the utun interface
	_ = exec.Command("route", "-q", "add", "-host", ipAddress, "-interface", ifName).Run()
	return nil
}

func getDefaultGatewayInterfaceDarwin() string {
	out, err := exec.Command("route", "-n", "get", "default").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "interface:") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					return parts[1]
				}
			}
		}
	}
	return "en0"
}

func platformEnableForwarding(ifName string) error {
	// Enable IPv4 and IPv6 packet forwarding via sysctl
	_ = exec.Command("sysctl", "-w", "net.inet.ip.forwarding=1").Run()
	_ = exec.Command("sysctl", "-w", "net.inet6.ip6.forwarding=1").Run()

	egressIf := getDefaultGatewayInterfaceDarwin()

	// Configure macOS Packet Filter (pf) NAT anchor for zoop
	pfRules := fmt.Sprintf("nat on %s from %s:network to any -> (%s)\n", egressIf, ifName, egressIf)
	cmd := exec.Command("pfctl", "-a", "zoop", "-f", "-")
	cmd.Stdin = strings.NewReader(pfRules)
	_ = cmd.Run()

	// Ensure pf is enabled
	_ = exec.Command("pfctl", "-e").Run()
	return nil
}

func platformDisableForwarding(ifName string) error {
	// Flush zoop pf anchor rules
	_ = exec.Command("pfctl", "-a", "zoop", "-F", "all").Run()
	return nil
}

// platformAddRoute adds a host, network, or default route using macOS route.
func platformAddRoute(ifName, cidr string) error {
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		ip = net.ParseIP(cidr)
		if ip == nil {
			return fmt.Errorf("invalid CIDR or IP: %s", cidr)
		}
	}

	var cmd *exec.Cmd
	if cidr == "0.0.0.0/0" || cidr == "default" {
		cmd = exec.Command("route", "-q", "add", "default", "-interface", ifName)
	} else if ipNet != nil {
		ones, bits := ipNet.Mask.Size()
		if ones == bits {
			cmd = exec.Command("route", "-q", "add", "-host", ip.String(), "-interface", ifName)
		} else {
			cmd = exec.Command("route", "-q", "add", "-net", cidr, "-interface", ifName)
		}
	} else {
		cmd = exec.Command("route", "-q", "add", "-host", ip.String(), "-interface", ifName)
	}

	out, err := cmd.CombinedOutput()
	if err != nil && len(out) > 0 && !bytes.Contains(out, []byte("exists")) && !bytes.Contains(out, []byte("File exists")) {
		changeCmd := exec.Command("route", "-q", "change", cidr, "-interface", ifName)
		if chOut, chErr := changeCmd.CombinedOutput(); chErr != nil && !bytes.Contains(chOut, []byte("not in table")) {
			return fmt.Errorf("route add/change failed for %s: %v: %s", cidr, err, string(out))
		}
	}
	return nil
}

func getDefaultGatewayDarwin() string {
	out, err := exec.Command("route", "-n", "get", "default").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "gateway:") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					return parts[1]
				}
			}
		}
	}
	return ""
}

func platformAddEndpointRoute(endpointIP string) error {
	ip := net.ParseIP(endpointIP)
	if ip == nil || ip.IsLoopback() {
		return nil
	}
	gw := getDefaultGatewayDarwin()
	if gw == "" {
		return nil
	}
	_ = exec.Command("route", "-q", "add", "-host", endpointIP, gw).Run()
	return nil
}

func platformRemoveEndpointRoute(endpointIP string) error {
	ip := net.ParseIP(endpointIP)
	if ip == nil || ip.IsLoopback() {
		return nil
	}
	_ = exec.Command("route", "-q", "delete", "-host", endpointIP).Run()
	return nil
}

func platformRemoveRoute(ifName, cidr string) error {
	if cidr == "0.0.0.0/0" || cidr == "default" {
		_ = exec.Command("route", "-q", "delete", "default", "-interface", ifName).Run()
	} else {
		_ = exec.Command("route", "-q", "delete", "-net", cidr, "-interface", ifName).Run()
	}
	return nil
}
