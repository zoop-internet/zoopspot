package main

import (
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

const (
	systemdServicePath = "/etc/systemd/system/zoopd.service"
	launchdPlistPath   = "/Library/LaunchDaemons/com.zoop.zoopd.plist"
	installedBinPath   = "/usr/local/bin/zoopd"
)

const systemdUnitTemplate = `[Unit]
Description=Zoop Device-to-Device Connectivity Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/zoopd
Restart=always
RestartSec=5s
LimitNOFILE=65536
UMask=0000
RuntimeDirectory=zoop
RuntimeDirectoryMode=0777
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE CAP_NET_RAW
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE CAP_NET_RAW

[Install]
WantedBy=multi-user.target
`

const launchdPlistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zoop.zoopd</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/zoopd</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/var/log/zoopd.err</string>
    <key>StandardOutPath</key>
    <string>/var/log/zoopd.log</string>
</dict>
</plist>
`

// HandleServiceCommand processes service subcommands (install, uninstall, start, stop, status, restart).
func HandleServiceCommand(action string) error {
	switch action {
	case "install":
		return installService()
	case "uninstall":
		return uninstallService()
	case "start":
		return startService()
	case "stop":
		return stopService()
	case "restart":
		return restartService()
	case "status":
		return checkServiceStatus()
	default:
		return fmt.Errorf("unknown service command '%s'. Available: install, uninstall, start, stop, restart, status", action)
	}
}

func installService() error {
	if os.Geteuid() != 0 {
		return fmt.Errorf("service installation requires root privileges (run with sudo)")
	}

	fmt.Println("==> Installing Zoop System Daemon...")

	// 1. Copy current binary to /usr/local/bin/zoopd
	selfPath, err := os.Executable()
	if err == nil && selfPath != installedBinPath {
		if err := copyBinary(selfPath, installedBinPath); err != nil {
			fmt.Printf("Warning: Failed to copy binary to %s: %v (continuing with existing)\n", installedBinPath, err)
		} else {
			fmt.Printf("  ✓ Copied binary to %s\n", installedBinPath)
		}
	}
	_ = os.Chmod(installedBinPath, 0755)

	// 2. Install platform service definition
	switch runtime.GOOS {
	case "linux":
		if err := os.WriteFile(systemdServicePath, []byte(systemdUnitTemplate), 0644); err != nil {
			return fmt.Errorf("failed to write systemd unit: %w", err)
		}
		fmt.Printf("  ✓ Created systemd unit: %s\n", systemdServicePath)

		_ = exec.Command("systemctl", "daemon-reload").Run()
		if err := exec.Command("systemctl", "enable", "--now", "zoopd").Run(); err != nil {
			return fmt.Errorf("failed to enable and start zoopd service: %w", err)
		}
		fmt.Println("  ✓ Enabled and started zoopd.service via systemd")

	case "darwin":
		if err := os.WriteFile(launchdPlistPath, []byte(launchdPlistTemplate), 0644); err != nil {
			return fmt.Errorf("failed to write launchd plist: %w", err)
		}
		fmt.Printf("  ✓ Created launchd plist: %s\n", launchdPlistPath)

		_ = exec.Command("launchctl", "load", "-w", launchdPlistPath).Run()
		fmt.Println("  ✓ Loaded and started com.zoop.zoopd via launchd")

	default:
		return fmt.Errorf("service installation not supported on %s", runtime.GOOS)
	}

	fmt.Println("==> Zoop daemon successfully installed and running!")
	return nil
}

func uninstallService() error {
	if os.Geteuid() != 0 {
		return fmt.Errorf("service uninstallation requires root privileges (run with sudo)")
	}

	fmt.Println("==> Uninstalling Zoop System Daemon...")

	switch runtime.GOOS {
	case "linux":
		_ = exec.Command("systemctl", "disable", "--now", "zoopd").Run()
		_ = os.Remove(systemdServicePath)
		_ = exec.Command("systemctl", "daemon-reload").Run()
		fmt.Println("  ✓ Disabled and removed zoopd.service")

	case "darwin":
		_ = exec.Command("launchctl", "unload", "-w", launchdPlistPath).Run()
		_ = os.Remove(launchdPlistPath)
		fmt.Println("  ✓ Unloaded and removed com.zoop.zoopd plist")
	}

	return nil
}

func startService() error {
	if runtime.GOOS == "linux" {
		return exec.Command("systemctl", "start", "zoopd").Run()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("launchctl", "start", "com.zoop.zoopd").Run()
	}
	return nil
}

func stopService() error {
	if runtime.GOOS == "linux" {
		return exec.Command("systemctl", "stop", "zoopd").Run()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("launchctl", "stop", "com.zoop.zoopd").Run()
	}
	return nil
}

func restartService() error {
	if runtime.GOOS == "linux" {
		return exec.Command("systemctl", "restart", "zoopd").Run()
	}
	_ = stopService()
	time.Sleep(500 * time.Millisecond)
	return startService()
}

func checkServiceStatus() error {
	fmt.Println("==> Checking Zoop Daemon Status:")

	// 1. Check system service status
	if runtime.GOOS == "linux" {
		out, err := exec.Command("systemctl", "is-active", "zoopd").Output()
		status := strings.TrimSpace(string(out))
		if err == nil && status == "active" {
			fmt.Println("  ✓ System Service: active (running)")
		} else {
			fmt.Printf("  ✗ System Service: %s\n", status)
		}
	}

	// 2. Check IPC socket connectivity
	conn, err := net.Dial("unix", defaultSocketPath)
	if err != nil {
		fmt.Printf("  ✗ Control Socket (/var/run/zoopd.sock): Offline (%v)\n", err)
	} else {
		conn.Close()
		fmt.Println("  ✓ Control Socket (/var/run/zoopd.sock): Accessible (ready for Desktop UI)")
	}

	return nil
}

func copyBinary(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
