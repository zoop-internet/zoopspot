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
	uapi := fmt.Sprintf("private_key=%s\nlisten_port=%d\nreplace_peers=false\n", privKeyHex, listenPort)

	if err := m.wgDev.IpcSet(uapi); err != nil {
		return fmt.Errorf("failed to configure wireguard device: %w", err)
	}

	m.wgPubKey = privKey.PublicKey()

	return nil
}

// AddPeer adds a remote peer to the WireGuard configuration.
func (m *DeviceManager) AddPeer(peerPubKey wgtypes.Key, endpointIP string, endpointPort int, allowedIPs []string) error {
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
	sb.WriteString("persistent_keepalive_interval=25\n")

	if err := m.wgDev.IpcSet(sb.String()); err != nil {
		return fmt.Errorf("failed to add peer to wireguard device: %w", err)
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

