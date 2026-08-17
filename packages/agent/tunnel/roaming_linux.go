//go:build linux

package tunnel

import (
	"context"
	"net"
	"time"

	"github.com/vishvananda/netlink"
)

func (rm *RoamingManager) startPlatformMonitor(ctx context.Context) {
	linkUpdates := make(chan netlink.LinkUpdate, 16)
	addrUpdates := make(chan netlink.AddrUpdate, 16)
	routeUpdates := make(chan netlink.RouteUpdate, 16)

	if err := netlink.LinkSubscribe(linkUpdates, ctx.Done()); err != nil {
		rm.logger.Warn("netlink link subscribe failed, falling back to polling", "error", err)
		rm.fallbackPoll(ctx)
		return
	}

	if err := netlink.AddrSubscribe(addrUpdates, ctx.Done()); err != nil {
		rm.logger.Warn("netlink addr subscribe failed", "error", err)
	}

	if err := netlink.RouteSubscribe(routeUpdates, ctx.Done()); err != nil {
		rm.logger.Warn("netlink route subscribe failed", "error", err)
	}

	rm.logger.Info("started Linux netlink kernel network change listener")

	for {
		select {
		case <-ctx.Done():
			return
		case link, ok := <-linkUpdates:
			if !ok {
				return
			}
			if link.Link != nil && link.Link.Attrs() != nil {
				name := link.Link.Attrs().Name
				if name != "zoop0" && name != "lo" {
					rm.TriggerRoamCheck("link_state_changed:" + name)
				}
			}
		case _, ok := <-addrUpdates:
			if !ok {
				return
			}
			rm.TriggerRoamCheck("ip_address_changed")
		case route, ok := <-routeUpdates:
			if !ok {
				return
			}
			// Detect default route changes (Dst == nil or 0.0.0.0/0)
			if route.Dst == nil || (route.Dst.IP != nil && route.Dst.IP.IsUnspecified()) {
				rm.TriggerRoamCheck("default_route_changed")
			}
		}
	}
}

func (rm *RoamingManager) fallbackPoll(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			currentIPs := make(map[string]string)
			ifaces, err := net.Interfaces()
			if err != nil {
				continue
			}

			changed := false
			for _, iface := range ifaces {
				if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 || iface.Name == "zoop0" {
					continue
				}
				addrs, _ := iface.Addrs()
				for _, addr := range addrs {
					if ipNet, ok := addr.(*net.IPNet); ok && ipNet.IP.To4() != nil {
						ipStr := ipNet.IP.String()
						currentIPs[iface.Name] = ipStr
						rm.mu.RLock()
						prevIP, exists := rm.lastInterfaces[iface.Name]
						rm.mu.RUnlock()
						if !exists || prevIP != ipStr {
							changed = true
						}
					}
				}
			}

			if changed {
				rm.TriggerRoamCheck("interface_poll_diff")
			}
		}
	}
}
