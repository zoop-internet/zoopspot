//go:build windows

package tunnel

import (
	"fmt"
	"os/exec"
)

func platformAssignIP(ifName string, ipAddress string) error {
	// netsh interface ip set address name="zoop0" static 100.64.0.1 255.255.255.255
	cmd := exec.Command("netsh", "interface", "ip", "set", "address", "name="+ifName, "static", ipAddress, "255.255.255.255")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("netsh failed: %v: %s", err, string(out))
	}
	return nil
}

func platformEnableForwarding(ifName string) error {
	// Set-NetIPInterface -Forwarding Enabled
	return nil
}
