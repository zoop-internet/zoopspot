//go:build !linux

package tunnel

import (
	"context"
	"net"
	"time"
)

func (rm *RoamingManager) startPlatformMonitor(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	rm.logger.Info("started cross-platform polling network change listener")

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
