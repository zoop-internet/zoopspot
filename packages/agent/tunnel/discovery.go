package tunnel

import (
	"fmt"
	"net"
	"os"
	"time"

	"github.com/pion/stun/v3"
)

// DiscoverPublicEndpoint connects to a STUN server to discover the public Server-Reflexive IP and port.
func DiscoverPublicEndpoint(localPort int) (string, int, error) {
	if val := os.Getenv("ZOOP_LOCAL_TEST"); val != "" {
		if val == "1" {
			return "127.0.0.1", localPort, nil
		}
		if ip := net.ParseIP(val); ip == nil {
			ips, err := net.LookupIP(val)
			if err == nil && len(ips) > 0 {
				return ips[0].String(), localPort, nil
			}
		}
		return val, localPort, nil
	}

	type result struct {
		ip   string
		port int
		err  error
	}
	resChan := make(chan result, 1)

	go func() {
		// 1. Resolve STUN server
		stunServerAddr, err := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to resolve stun server: %w", err)}
			return
		}

		conn, err := net.DialUDP("udp", nil, stunServerAddr)
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to dial stun server: %w", err)}
			return
		}
		defer conn.Close()

		client, err := stun.NewClient(conn)
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to create stun client: %w", err)}
			return
		}
		defer client.Close()

		message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)

		var publicIP string
		var stunErr error
		done := make(chan bool, 1)

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
			done <- true
		})

		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to start stun client: %w", err)}
			return
		}

		<-done
		if stunErr != nil {
			resChan <- result{"", 0, stunErr}
		} else {
			resChan <- result{publicIP, localPort, nil}
		}
	}()

	select {
	case res := <-resChan:
		return res.ip, res.port, res.err
	case <-time.After(3 * time.Second):
		return "", 0, fmt.Errorf("stun discovery timed out")
	}
}
