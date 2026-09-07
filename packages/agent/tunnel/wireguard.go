package tunnel

import (
	"encoding/hex"
	"fmt"
	"net"
	"strings"

	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// ConfigureDevice sets the local private key and listen port for the WireGuard device.
func (m *DeviceManager) ConfigureDevice(privKey wgtypes.Key, listenPort int) error {
	privKeyHex := hex.EncodeToString(privKey[:])
	uapi := fmt.Sprintf("private_key=%s\nlisten_port=%d\n", privKeyHex, listenPort)

	if err := m.wgDev.IpcSet(uapi); err != nil {
		return fmt.Errorf("failed to configure wireguard device: %w", err)
	}

	m.wgPubKey = privKey.PublicKey()

	return nil
}

// WireGuardMTU is clamped to 1420 bytes to guarantee zero IP fragmentation over IPv6 cellular encapsulation overhead.
const WireGuardMTU = 1420

// AddPeer adds a remote peer to the WireGuard configuration with default 25s keepalive.
func (m *DeviceManager) AddPeer(peerPubKey wgtypes.Key, endpointIP string, endpointPort int, allowedIPs []string) error {
	return m.AddPeerWithKeepalive(peerPubKey, endpointIP, endpointPort, allowedIPs, 25)
}

// AddPeerWithKeepalive adds a remote peer to the WireGuard configuration with a custom keepalive interval.
// Pass 0 to disable keepalives (idle battery saving mode) or e.g. 25-120 for active/background maintenance.
func (m *DeviceManager) AddPeerWithKeepalive(peerPubKey wgtypes.Key, endpointIP string, endpointPort int, allowedIPs []string, keepaliveIntervalSec int) error {
	peerKeyHex := hex.EncodeToString(peerPubKey[:])
	
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("public_key=%s\n", peerKeyHex))
	
	if endpointIP != "" && endpointPort != 0 {
		// IPv6 needs brackets
		ip := net.ParseIP(endpointIP)
		if ip != nil && ip.To4() == nil {
			sb.WriteString(fmt.Sprintf("endpoint=[%s]:%d\n", endpointIP, endpointPort))
		} else {
			sb.WriteString(fmt.Sprintf("endpoint=%s:%d\n", endpointIP, endpointPort))
		}
	}

	sb.WriteString("replace_allowed_ips=true\n")
	for _, aip := range allowedIPs {
		sb.WriteString(fmt.Sprintf("allowed_ip=%s\n", aip))
	}
	sb.WriteString(fmt.Sprintf("persistent_keepalive_interval=%d\n", keepaliveIntervalSec))

	if err := m.wgDev.IpcSet(sb.String()); err != nil {
		return fmt.Errorf("failed to add peer to wireguard device: %w", err)
	}

	// Add routes for the allowed IPs to the OS routing table using the platform-appropriate method.
	if m.mockMode {
		return nil
	}
	for _, aip := range allowedIPs {
		if err := platformAddRoute(m.ifName, aip); err != nil {
			return fmt.Errorf("failed to add route for %s: %w", aip, err)
		}
	}

	return nil
}

// RemovePeer removes a remote peer from the WireGuard configuration.
func (m *DeviceManager) RemovePeer(peerPubKey wgtypes.Key) error {
	peerKeyHex := hex.EncodeToString(peerPubKey[:])
	uapi := fmt.Sprintf("public_key=%s\nremove=true\n", peerKeyHex)

	if err := m.wgDev.IpcSet(uapi); err != nil {
		return fmt.Errorf("failed to remove peer from wireguard device: %w", err)
	}
	return nil
}

