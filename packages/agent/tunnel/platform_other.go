//go:build !linux && !darwin && !windows

package tunnel

import (
	"fmt"
	"runtime"

	"golang.zx2c4.com/wireguard/tun"
)

func platformCreateTUNFromFD(fd int, ifName string) (tun.Device, error) {
	return nil, fmt.Errorf("TUN creation from file descriptor is not supported on %s", runtime.GOOS)
}

func platformAssignIP(ifName string, ipAddress string) error {
	return fmt.Errorf("IP assignment not implemented on %s", runtime.GOOS)
}

func platformEnableForwarding(ifName string) error {
	return fmt.Errorf("IP forwarding not implemented on %s", runtime.GOOS)
}

func platformDisableForwarding(ifName string) error {
	return nil
}

func platformAddRoute(ifName, cidr string) error {
	return fmt.Errorf("route management not implemented on %s", runtime.GOOS)
}

func platformAddEndpointRoute(endpointIP string) error {
	return nil
}

func platformRemoveEndpointRoute(endpointIP string) error {
	return nil
}

func platformRemoveRoute(ifName, cidr string) error {
	return nil
}
