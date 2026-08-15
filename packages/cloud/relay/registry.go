package relay

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

// RelayStatus defines the current operational state of a Relay Node.
type RelayStatus string

const (
	RelayStatusOnline  RelayStatus = "online"
	RelayStatusDraining RelayStatus = "draining"
	RelayStatusOffline RelayStatus = "offline"
)

// RelayNode represents a single geo-distributed relay server node in the cluster.
type RelayNode struct {
	ID             string        `json:"id"`
	Region         string        `json:"region"` // e.g. "us-east", "eu-central", "ap-southeast"
	Host           string        `json:"host"`
	Port           int           `json:"port"`
	WebSocketURL   string        `json:"websocket_url"`
	STUNPort       int           `json:"stun_port,omitempty"`
	TURNPort       int           `json:"turn_port,omitempty"`
	ActiveSessions int           `json:"active_sessions"`
	MaxCapacity    int           `json:"max_capacity"`
	Status         RelayStatus   `json:"status"`
	LastHeartbeat  time.Time     `json:"last_heartbeat"`
	RTT            time.Duration `json:"rtt,omitempty"` // populated during dynamic client probes
}

// RelayRegistry coordinates multi-region relay nodes in the Control Plane.
type RelayRegistry struct {
	mu    sync.RWMutex
	nodes map[string]*RelayNode
}

// NewRelayRegistry initializes a cluster relay registry.
func NewRelayRegistry() *RelayRegistry {
	r := &RelayRegistry{
		nodes: make(map[string]*RelayNode),
	}
	return r
}

// RegisterNode registers or updates a relay node in the registry.
func (r *RelayRegistry) RegisterNode(node RelayNode) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if node.Status == "" {
		node.Status = RelayStatusOnline
	}
	if node.MaxCapacity <= 0 {
		node.MaxCapacity = 10000 // default capacity
	}
	if node.WebSocketURL == "" {
		node.WebSocketURL = fmt.Sprintf("ws://%s:%d/v1/relay", node.Host, node.Port)
	}
	node.LastHeartbeat = time.Now()

	r.nodes[node.ID] = &node
}

// Heartbeat updates the active sessions count and heartbeat timestamp for a relay node.
func (r *RelayRegistry) Heartbeat(nodeID string, activeSessions int) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	node, exists := r.nodes[nodeID]
	if !exists {
		return false
	}
	node.ActiveSessions = activeSessions
	node.LastHeartbeat = time.Now()
	if node.Status == RelayStatusOffline {
		node.Status = RelayStatusOnline
	}
	return true
}

// DeregisterNode removes a node from the cluster registry.
func (r *RelayRegistry) DeregisterNode(nodeID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.nodes, nodeID)
}

// GetNodes returns all currently registered relay nodes, filtering out dead nodes if requested.
func (r *RelayRegistry) GetNodes(includeDead bool) []RelayNode {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []RelayNode
	now := time.Now()

	for _, node := range r.nodes {
		isAlive := now.Sub(node.LastHeartbeat) < 30*time.Second && node.Status != RelayStatusOffline
		if includeDead || isAlive {
			result = append(result, *node)
		}
	}

	return result
}

// GetNodesByRegion returns active nodes belonging to a specific region.
func (r *RelayRegistry) GetNodesByRegion(region string) []RelayNode {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []RelayNode
	now := time.Now()

	for _, node := range r.nodes {
		if node.Region == region && now.Sub(node.LastHeartbeat) < 30*time.Second && node.Status == RelayStatusOnline {
			result = append(result, *node)
		}
	}

	return result
}

// SelectOptimalRelays orders relay nodes based on reported client RTTs and geographic proximity.
func (r *RelayRegistry) SelectOptimalRelays(preferredRegion string, clientRTTs map[string]time.Duration) []RelayNode {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var candidates []RelayNode
	now := time.Now()

	for _, node := range r.nodes {
		if now.Sub(node.LastHeartbeat) >= 30*time.Second || node.Status != RelayStatusOnline {
			continue
		}
		// Skip nodes that are completely full
		if node.MaxCapacity > 0 && node.ActiveSessions >= node.MaxCapacity {
			continue
		}

		c := *node
		if rtt, ok := clientRTTs[c.ID]; ok && rtt > 0 {
			c.RTT = rtt
		} else if c.Region == preferredRegion {
			c.RTT = 15 * time.Millisecond // assume low latency for local region
		} else {
			c.RTT = 150 * time.Millisecond // default higher RTT for cross-region
		}
		candidates = append(candidates, c)
	}

	// Sort candidates by RTT (lowest first), then by active session load
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].RTT != candidates[j].RTT {
			return candidates[i].RTT < candidates[j].RTT
		}
		return candidates[i].ActiveSessions < candidates[j].ActiveSessions
	})

	return candidates
}
