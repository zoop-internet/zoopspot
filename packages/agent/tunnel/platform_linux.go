//go:build linux

package tunnel

import (
	"fmt"
	"net"
	"os"
	"os/exec"

	"github.com/vishvananda/netlink"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"
)

func platformCreateTUNFromFD(fd int, ifName string) (tun.Device, error) {
	file := os.NewFile(uintptr(fd), ifName)
	return tun.CreateTUNFromFile(file, device.DefaultMTU)
}

func platformAssignIP(ifName string, ipAddress string) error {
	link, err := netlink.LinkByName(ifName)
	if err != nil {
		// Fall back to exec if netlink can't find interface (e.g. mock TUN).
		return execAssignIP(ifName, ipAddress)
	}

	addr, err := netlink.ParseAddr(ipAddress + "/32")
	if err != nil {
		return fmt.Errorf("failed to parse IP address %s: %w", ipAddress, err)
	}

	if err := netlink.AddrAdd(link, addr); err != nil && !isExistError(err) {
		// Fall back to exec if netlink add fails (permissions, mock environment).
		return execAssignIP(ifName, ipAddress)
	}

	if err := netlink.LinkSetUp(link); err != nil {
		return fmt.Errorf("ip link set up failed: %w", err)
	}

	return nil
}

func execAssignIP(ifName, ipAddress string) error {
	cmd := exec.Command("ip", "addr", "add", ipAddress+"/32", "dev", ifName)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ip addr add failed: %v: %s", err, string(out))
	}
	cmd = exec.Command("ip", "link", "set", "dev", ifName, "up")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ip link set up failed: %v: %s", err, string(out))
	}
	return nil
}

// platformAddRoute adds a host or network route to the OS routing table via netlink.
// Falls back to exec.Command if the interface cannot be found (test environments).
func platformAddRoute(ifName, cidr string) error {
	link, err := netlink.LinkByName(ifName)
	if err != nil {
		return execAddRoute(ifName, cidr)
	}

	_, dst, err := net.ParseCIDR(cidr)
	if err != nil {
		return fmt.Errorf("failed to parse CIDR %s: %w", cidr, err)
	}

	route := &netlink.Route{
		LinkIndex: link.Attrs().Index,
		Dst:       dst,
	}

	if err := netlink.RouteAdd(route); err != nil && !isExistError(err) {
		return fmt.Errorf("failed to add route %s via %s: %w", cidr, ifName, err)
	}
	return nil
}

func execAddRoute(ifName, cidr string) error {
	out, err := exec.Command("ip", "route", "add", cidr, "dev", ifName).CombinedOutput()
	if err != nil && !containsExistMsg(string(out)) {
		return fmt.Errorf("failed to add route for %s: %v, out: %s", cidr, err, string(out))
	}
	return nil
}

func isExistError(err error) bool {
	if err == nil {
		return false
	}
	// syscall.EEXIST is returned when the address or route already exists.
	return containsExistMsg(err.Error())
}

func containsExistMsg(s string) bool {
	return len(s) > 0 && (s == "file exists" || containsStr(s, "exists") || containsStr(s, "File exists"))
}

func containsStr(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
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

func platformAddEndpointRoute(endpointIP string) error {
	ip := net.ParseIP(endpointIP)
	if ip == nil || ip.IsLoopback() {
		return nil
	}

	routes, err := netlink.RouteGet(ip)
	if err != nil || len(routes) == 0 {
		return nil
	}

	hostDst := &net.IPNet{IP: ip, Mask: net.CIDRMask(32, 32)}
	route := &netlink.Route{
		LinkIndex: routes[0].LinkIndex,
		Dst:       hostDst,
		Gw:        routes[0].Gw,
	}

	if err := netlink.RouteAdd(route); err != nil && !isExistError(err) {
		return fmt.Errorf("failed to add host route for endpoint %s: %w", endpointIP, err)
	}
	return nil
}

func platformRemoveEndpointRoute(endpointIP string) error {
	ip := net.ParseIP(endpointIP)
	if ip == nil || ip.IsLoopback() {
		return nil
	}
	hostDst := &net.IPNet{IP: ip, Mask: net.CIDRMask(32, 32)}
	route := &netlink.Route{
		Dst: hostDst,
	}
	_ = netlink.RouteDel(route)
	return nil
}

func platformRemoveRoute(ifName, cidr string) error {
	link, err := netlink.LinkByName(ifName)
	if err != nil {
		_ = exec.Command("ip", "route", "del", cidr, "dev", ifName).Run()
		return nil
	}

	_, dst, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil
	}

	route := &netlink.Route{
		LinkIndex: link.Attrs().Index,
		Dst:       dst,
	}
	_ = netlink.RouteDel(route)
	return nil
}
