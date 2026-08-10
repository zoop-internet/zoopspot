package tunnel

import (
	"context"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/zoop-internet/zoop/packages/core/types"
)

// ProbeServer listens for UDP candidate probes and replies to ping requests.
type ProbeServer struct {
	conn   *net.UDPConn
	stopCh chan struct{}
}

// StartProbeServer starts a UDP probe listener on the given port.
func StartProbeServer(port int) (*ProbeServer, error) {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", port))
	if err != nil {
		return nil, fmt.Errorf("failed to resolve probe UDP addr: %w", err)
	}
	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on probe UDP port: %w", err)
	}

	ps := &ProbeServer{
		conn:   conn,
		stopCh: make(chan struct{}),
	}

	go ps.listen()
	return ps, nil
}

func (ps *ProbeServer) listen() {
	buf := make([]byte, 1024)
	for {
		select {
		case <-ps.stopCh:
			return
		default:
		}

		_ = ps.conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
		n, remoteAddr, err := ps.conn.ReadFromUDP(buf)
		if err != nil {
			continue
		}

		msg := string(buf[:n])
		if strings.HasPrefix(msg, "ZOOP_PING:") {
			connID := strings.TrimPrefix(msg, "ZOOP_PING:")
			reply := "ZOOP_PONG:" + connID
			_, _ = ps.conn.WriteToUDP([]byte(reply), remoteAddr)
		}
	}
}

// Close stops the probe server listener.
func (ps *ProbeServer) Close() {
	close(ps.stopCh)
	if ps.conn != nil {
		ps.conn.Close()
	}
}

// CandidateResult represents a probe attempt result for a specific candidate.
type CandidateResult struct {
	Candidate types.EndpointCandidate
	RTT       time.Duration
	Err       error
}

// ProbeCandidates sends UDP ping probes to all given candidates and returns the optimal working candidate.
func ProbeCandidates(ctx context.Context, candidates []types.EndpointCandidate, connID string, defaultProbePort int) (*types.EndpointCandidate, error) {
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no candidates provided for probing")
	}

	localAddr, err := net.ResolveUDPAddr("udp", ":0")
	if err != nil {
		return nil, fmt.Errorf("failed to resolve local UDP probe addr: %w", err)
	}
	conn, err := net.ListenUDP("udp", localAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to bind local UDP probe socket: %w", err)
	}
	defer conn.Close()

	var mu sync.Mutex
	var working []CandidateResult
	var wg sync.WaitGroup

	pingMsg := []byte("ZOOP_PING:" + connID)

	for _, cand := range candidates {
		wg.Add(1)
		go func(c types.EndpointCandidate) {
			defer wg.Done()

			targetPort := c.Port
			if targetPort == 0 {
				targetPort = defaultProbePort
			}

			raddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", c.IP, targetPort))
			if err != nil {
				return
			}

			start := time.Now()
			_, err = conn.WriteToUDP(pingMsg, raddr)
			if err != nil {
				return
			}

			buf := make([]byte, 1024)
			_ = conn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
			for {
				n, from, err := conn.ReadFromUDP(buf)
				if err != nil {
					return
				}
				if from.IP.Equal(raddr.IP) && string(buf[:n]) == "ZOOP_PONG:"+connID {
					rtt := time.Since(start)
					mu.Lock()
					working = append(working, CandidateResult{
						Candidate: c,
						RTT:       rtt,
					})
					mu.Unlock()
					return
				}
			}
		}(cand)
	}

	wg.Wait()

	if len(working) == 0 {
		return nil, fmt.Errorf("no candidate responded to UDP connectivity checks")
	}

	// Sort by Priority descending, then RTT ascending
	sort.Slice(working, func(i, j int) bool {
		if working[i].Candidate.Priority != working[j].Candidate.Priority {
			return working[i].Candidate.Priority > working[j].Candidate.Priority
		}
		return working[i].RTT < working[j].RTT
	})

	return &working[0].Candidate, nil
}
