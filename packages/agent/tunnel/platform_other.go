//go:build !linux && !darwin && !windows

package tunnel

import (
	"fmt"
	"runtime"
)

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
