//go:build linux

package tunnel

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"strings"

	"github.com/vishvananda/netlink"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"
)

func platformCreateTUNFromFD(fd int, ifName string) (tun.Device, error) {
	dev, _, err := tun.CreateUnmonitoredTUNFromFD(fd)
	if err == nil {
		return dev, nil
	}
	file := os.NewFile(uintptr(fd), ifName)
	return tun.CreateTUNFromFile(file, device.DefaultMTU)
}

func findExecutable(name string) string {
	if p, err := exec.LookPath(name); err == nil {
		return p
	}
	commonPaths := []string{
		"/sbin/" + name,
		"/usr/sbin/" + name,
		"/usr/bin/" + name,
		"/bin/" + name,
	}
	for _, p := range commonPaths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return name
}

func platformAssignIP(ifName string, ipAddress string) error {
	cidr := ipAddress
	if !strings.Contains(cidr, "/") {
		cidr = ipAddress + "/24"
	}

	link, err := netlink.LinkByName(ifName)
	if err != nil {
		// Fall back to exec if netlink can't find interface (e.g. mock TUN).
		return execAssignIP(ifName, cidr)
	}

	addr, err := netlink.ParseAddr(cidr)
	if err != nil {
		return fmt.Errorf("failed to parse IP address %s: %w", cidr, err)
	}

	if err := netlink.AddrAdd(link, addr); err != nil && !isExistError(err) {
		// Fall back to exec if netlink add fails (permissions, mock environment).
		return execAssignIP(ifName, cidr)
	}

	if err := netlink.LinkSetUp(link); err != nil {
		return fmt.Errorf("ip link set up failed: %w", err)
	}

	// Ensure the entire Zoop CGNAT overlay block (100.64.0.0/10) routes into this TUN interface
	_ = platformAddRoute(ifName, "100.64.0.0/10")

	return nil
}

func execAssignIP(ifName, cidr string) error {
	ipBin := findExecutable("ip")
	cmd := exec.Command(ipBin, "addr", "add", cidr, "dev", ifName)
	if out, err := cmd.CombinedOutput(); err != nil && !containsExistMsg(string(out)) {
		return fmt.Errorf("ip addr add failed: %v: %s", err, string(out))
	}
	cmd = exec.Command(ipBin, "link", "set", "dev", ifName, "up")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ip link set up failed: %v: %s", err, string(out))
	}
	_ = execAddRoute(ifName, "100.64.0.0/10")
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
	ipBin := findExecutable("ip")
	out, err := exec.Command(ipBin, "route", "add", cidr, "dev", ifName).CombinedOutput()
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

func getDefaultWANInterface() string {
	if wanIf := os.Getenv("ZOOP_WAN_IF"); wanIf != "" {
		return wanIf
	}

	// 1. Query kernel route to 8.8.8.8 via netlink
	routes, err := netlink.RouteGet(net.ParseIP("8.8.8.8"))
	if err == nil && len(routes) > 0 {
		link, err := netlink.LinkByIndex(routes[0].LinkIndex)
		if err == nil && link != nil && link.Attrs().Name != "" {
			return link.Attrs().Name
		}
	}

	// 2. Query via 'ip route get 8.8.8.8' fallback
	ipBin := findExecutable("ip")
	out, err := exec.Command("sh", "-c", fmt.Sprintf("%s route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i==\"dev\") print $(i+1)}'", ipBin)).Output()
	if err == nil {
		dev := strings.TrimSpace(string(out))
		if dev != "" {
			return dev
		}
	}

	return "eth0"
}

func platformEnableForwarding(ifName string) error {
	sysctlBin := findExecutable("sysctl")
	iptablesBin := findExecutable("iptables")
	ip6tablesBin := findExecutable("ip6tables")

	// 1. Enable IPv4 packet forwarding via sysctl and procfs
	_ = exec.Command(sysctlBin, "-w", "net.ipv4.ip_forward=1").Run()
	_ = exec.Command(sysctlBin, "-w", "net.ipv4.conf.all.forwarding=1").Run()
	_ = exec.Command(sysctlBin, "-w", "net.ipv4.conf.default.forwarding=1").Run()
	_ = exec.Command("sh", "-c", "echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true").Run()

	// Enable IPv6 packet forwarding if supported
	_ = exec.Command(sysctlBin, "-w", "net.ipv6.conf.all.forwarding=1").Run()
	_ = exec.Command(sysctlBin, "-w", "net.ipv6.conf.default.forwarding=1").Run()
	_ = exec.Command("sh", "-c", "echo 1 > /proc/sys/net/ipv6/conf/all/forwarding 2>/dev/null || true").Run()

	// Disable reverse path filtering comprehensively across all interfaces
	_ = exec.Command(sysctlBin, "-w", "net.ipv4.conf.all.rp_filter=0").Run()
	_ = exec.Command(sysctlBin, "-w", "net.ipv4.conf.default.rp_filter=0").Run()
	_ = exec.Command(sysctlBin, "-w", fmt.Sprintf("net.ipv4.conf.%s.rp_filter=0", ifName)).Run()

	wanIf := getDefaultWANInterface()
	if wanIf != "" && wanIf != ifName {
		_ = exec.Command(sysctlBin, "-w", fmt.Sprintf("net.ipv4.conf.%s.rp_filter=0", wanIf)).Run()
	}
	_ = exec.Command("sh", "-c", "for f in /proc/sys/net/ipv4/conf/*/rp_filter; do echo 0 > \"$f\" 2>/dev/null || true; done").Run()

	// Set default FORWARD policy to ACCEPT
	_ = exec.Command(iptablesBin, "-P", "FORWARD", "ACCEPT").Run()

	// 2. TCP MSS Clamping to prevent MTU fragmentation issues over WireGuard (MTU 1420)
	if err := exec.Command(iptablesBin, "-C", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run(); err != nil {
		_ = exec.Command(iptablesBin, "-I", "FORWARD", "1", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()
	}

	// 3. Universal NAT MASQUERADE for Zoop overlay subnet (100.64.0.0/10) exiting ANY physical interface (Wi-Fi, Ethernet, Cellular)
	if err := exec.Command(iptablesBin, "-t", "nat", "-C", "POSTROUTING", "-s", "100.64.0.0/10", "!", "-o", ifName, "-j", "MASQUERADE").Run(); err != nil {
		_ = exec.Command(iptablesBin, "-t", "nat", "-A", "POSTROUTING", "-s", "100.64.0.0/10", "!", "-o", ifName, "-j", "MASQUERADE").Run()
	}

	// Also keep specific WAN interface rule if detected for backward compatibility
	if wanIf != "" && wanIf != ifName {
		if err := exec.Command(iptablesBin, "-t", "nat", "-C", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run(); err != nil {
			_ = exec.Command(iptablesBin, "-t", "nat", "-A", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run()
		}
	}

	// 4. Universal Forwarding: Allow all traffic from TUN to ANY external interface
	if err := exec.Command(iptablesBin, "-C", "FORWARD", "-i", ifName, "!", "-o", ifName, "-j", "ACCEPT").Run(); err != nil {
		_ = exec.Command(iptablesBin, "-I", "FORWARD", "1", "-i", ifName, "!", "-o", ifName, "-j", "ACCEPT").Run()
	}

	// 5. Allow established/related return traffic to TUN from ANY interface
	// Support modern conntrack and legacy state modules
	if err := exec.Command(iptablesBin, "-C", "FORWARD", "-o", ifName, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run(); err != nil {
		if ctErr := exec.Command(iptablesBin, "-I", "FORWARD", "1", "-o", ifName, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run(); ctErr != nil {
			if err := exec.Command(iptablesBin, "-C", "FORWARD", "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run(); err != nil {
				_ = exec.Command(iptablesBin, "-I", "FORWARD", "1", "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
			}
		}
	}

	// 6. IPv6 ULA Masquerade & Forwarding (if ip6tables is available)
	_ = exec.Command(ip6tablesBin, "-t", "nat", "-A", "POSTROUTING", "-s", "fd00:7a6f:6f70::/64", "!", "-o", ifName, "-j", "MASQUERADE").Run()
	_ = exec.Command(ip6tablesBin, "-I", "FORWARD", "1", "-i", ifName, "!", "-o", ifName, "-j", "ACCEPT").Run()
	_ = exec.Command(ip6tablesBin, "-I", "FORWARD", "1", "-o", ifName, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command(ip6tablesBin, "-I", "FORWARD", "1", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()

	// 7. Prepend to DOCKER-USER if Docker daemon exists
	_ = exec.Command(iptablesBin, "-I", "DOCKER-USER", "1", "-i", ifName, "-j", "ACCEPT").Run()
	_ = exec.Command(iptablesBin, "-I", "DOCKER-USER", "2", "-o", ifName, "-j", "ACCEPT").Run()

	return nil
}

func platformDisableForwarding(ifName string) error {
	iptablesBin := findExecutable("iptables")
	ip6tablesBin := findExecutable("ip6tables")
	wanIf := getDefaultWANInterface()

	// Clean up iptables rules gracefully on shutdown
	_ = exec.Command(iptablesBin, "-t", "nat", "-D", "POSTROUTING", "-s", "100.64.0.0/10", "!", "-o", ifName, "-j", "MASQUERADE").Run()
	if wanIf != "" && wanIf != ifName {
		_ = exec.Command(iptablesBin, "-t", "nat", "-D", "POSTROUTING", "-o", wanIf, "-j", "MASQUERADE").Run()
	}
	_ = exec.Command(iptablesBin, "-D", "FORWARD", "-i", ifName, "!", "-o", ifName, "-j", "ACCEPT").Run()
	_ = exec.Command(iptablesBin, "-D", "FORWARD", "-o", ifName, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command(iptablesBin, "-D", "FORWARD", "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command(iptablesBin, "-D", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()

	// Clean up ip6tables
	_ = exec.Command(ip6tablesBin, "-t", "nat", "-D", "POSTROUTING", "-s", "fd00:7a6f:6f70::/64", "!", "-o", ifName, "-j", "MASQUERADE").Run()
	_ = exec.Command(ip6tablesBin, "-D", "FORWARD", "-i", ifName, "!", "-o", ifName, "-j", "ACCEPT").Run()
	_ = exec.Command(ip6tablesBin, "-D", "FORWARD", "-o", ifName, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command(ip6tablesBin, "-D", "FORWARD", "-o", ifName, "-m", "state", "--state", "RELATED,ESTABLISHED", "-j", "ACCEPT").Run()
	_ = exec.Command(ip6tablesBin, "-D", "FORWARD", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu").Run()

	return nil
}

func platformAddEndpointRoute(endpointIP string) error {
	ip := net.ParseIP(endpointIP)
	if ip == nil || ip.IsLoopback() {
		return nil
	}

	routes, err := netlink.RouteGet(ip)
	if err != nil || len(routes) == 0 {
		return execAddEndpointRoute(endpointIP)
	}

	hostDst := &net.IPNet{IP: ip, Mask: net.CIDRMask(32, 32)}
	route := &netlink.Route{
		LinkIndex: routes[0].LinkIndex,
		Dst:       hostDst,
		Gw:        routes[0].Gw,
	}

	if err := netlink.RouteAdd(route); err != nil && !isExistError(err) {
		return execAddEndpointRoute(endpointIP)
	}
	return nil
}

func execAddEndpointRoute(endpointIP string) error {
	_ = exec.Command("sh", "-c", fmt.Sprintf("GW=$(ip route get %s 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i==\"via\") print $(i+1)}'); DEV=$(ip route get %s 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i==\"dev\") print $(i+1)}'); if [ -n \"$GW\" ] && [ -n \"$DEV\" ]; then ip route add %s/32 via $GW dev $DEV 2>/dev/null || true; elif [ -n \"$DEV\" ]; then ip route add %s/32 dev $DEV 2>/dev/null || true; fi", endpointIP, endpointIP, endpointIP, endpointIP)).Run()
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
