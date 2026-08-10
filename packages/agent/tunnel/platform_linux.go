//go:build linux

package tunnel

import (
	"fmt"
	"os"
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
	// Enable IP forwarding and disable reverse path filtering
	_ = exec.Command("sysctl", "-w", "net.ipv4.ip_forward=1").Run()
	_ = exec.Command("sh", "-c", "echo 1 > /proc/sys/net/ipv4/ip_forward").Run()
	_ = exec.Command("sysctl", "-w", "net.ipv4.conf.all.rp_filter=0").Run()
	_ = exec.Command("sysctl", "-w", "net.ipv4.conf.default.rp_filter=0").Run()
	_ = exec.Command("sysctl", "-w", fmt.Sprintf("net.ipv4.conf.%s.rp_filter=0", ifName)).Run()

	wanIf := os.Getenv("ZOOP_WAN_IF")
	if wanIf == "" {
		wanIf = "eth0"
	}
	_ = exec.Command("sysctl", "-w", fmt.Sprintf("net.ipv4.conf.%s.rp_filter=0", wanIf)).Run()

	// Set default FORWARD policy to ACCEPT
	_ = exec.Command("iptables", "-P", "FORWARD", "ACCEPT").Run()

	// 1. TCP MSS Clamping to prevent MTU fragmentation issues over WireGuard (MTU 1420)
	if err := exec.Command("iptables", "-C", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run(); err != nil {
		_ = exec.Command("iptables", "-A", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()
	}

	// 2. MASQUERADE outbound traffic on WAN interface
	if err := exec.Command("iptables", "-t", "nat", "-C", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run(); err != nil {
		_ = exec.Command("iptables", "-t", "nat", "-A", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run()
	}

	// 3. Allow forwarding from TUN to WAN
	if err := exec.Command("iptables", "-C", "FORWARD", "-i", ifName, "-o", wanIf, "-j", "ACCEPT").Run(); err != nil {
		_ = exec.Command("iptables", "-A", "FORWARD", "-i", ifName, "-o", wanIf, "-j", "ACCEPT").Run()
	}

	// 4. Allow established return traffic from WAN to TUN
	if err := exec.Command("iptables", "-C", "FORWARD", "-i", wanIf, "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run(); err != nil {
		_ = exec.Command("iptables", "-A", "FORWARD", "-i", wanIf, "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	}

	return nil
}

func platformDisableForwarding(ifName string) error {
	wanIf := os.Getenv("ZOOP_WAN_IF")
	if wanIf == "" {
		wanIf = "eth0"
	}

	// Clean up iptables rules gracefully on shutdown
	_ = exec.Command("iptables", "-t", "nat", "-D", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run()
	_ = exec.Command("iptables", "-D", "FORWARD", "-i", ifName, "-o", wanIf, "-j", "ACCEPT").Run()
	_ = exec.Command("iptables", "-D", "FORWARD", "-i", wanIf, "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command("iptables", "-D", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()

	return nil
}
