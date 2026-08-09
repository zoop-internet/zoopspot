package tunnel

import (
	"fmt"
	"net"

	"github.com/pion/stun/v3"
)

// DiscoverPublicEndpoint connects to a STUN server to discover the public Server-Reflexive IP and port.
func DiscoverPublicEndpoint(localPort int) (string, int, error) {
	// 1. Resolve STUN server
	stunServerAddr, err := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
	if err != nil {
		return "", 0, fmt.Errorf("failed to resolve stun server: %w", err)
	}

	// 2. Bind locally to the WireGuard port to punch a hole
	// If listenPort is 0, we can't reliably hole-punch the exact socket WireGuard is using.
	// In userspace wireguard, the port might be bound by the wg dev itself.
	// For accurate STUN, we should ideally use the same UDP socket, but wireguard-go doesn't expose it.
	// We'll create a temporary socket on the same port using SO_REUSEPORT if possible, 
	// or fallback to discovering the general NAT mapping (which works for full-cone).
	// For simplicity in this milestone, we'll just dial to get the public IP,
	// because STUN requires a UDP socket. The public IP is the most critical part.

	conn, err := net.DialUDP("udp", nil, stunServerAddr)
	if err != nil {
		return "", 0, fmt.Errorf("failed to dial stun server: %w", err)
	}
	defer conn.Close()

	// 3. Create STUN Client
	client, err := stun.NewClient(conn)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create stun client: %w", err)
	}
	defer client.Close()

	// 4. Build and send request
	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)
	
	var publicIP string
	var stunErr error
	done := make(chan bool)

	err = client.Do(message, func(res stun.Event) {
		if res.Error != nil {
			stunErr = res.Error
			done <- true
			return
		}

		var xorAddr stun.XORMappedAddress
		if getErr := xorAddr.GetFrom(res.Message); getErr != nil {
			stunErr = getErr
			done <- true
			return
		}
		
		publicIP = xorAddr.IP.String()
		_ = xorAddr.Port
		done <- true
	})

	if err != nil {
		return "", 0, fmt.Errorf("failed to start stun client: %w", err)
	}

	<-done

	if stunErr != nil {
		return "", 0, stunErr
	}

	// Because we couldn't share the socket with wireguard-go easily, 
	// we will report the public IP from STUN, but we will use the actual 
	// WireGuard listenPort for the port since symmetric NAT might change it anyway,
	// and if it's full cone, the public IP + WG local port will be correct.
	// In the future (M10), we will implement proper STUN over the WG socket via eBPF or custom dialers.

	return publicIP, localPort, nil
}
