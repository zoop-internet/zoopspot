package mobile

import (
	"encoding/json"
	"sync"
	"testing"

	"github.com/allannuwamanya/zoop/packages/core/types"
)

type mockCallback struct {
	mu           sync.Mutex
	lastState    string
	lastEndpoint string
	lastDirect   bool
	lastError    string
	stateEvents  []string
}

func (m *mockCallback) OnStateChange(state string, endpoint string, isDirect bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lastState = state
	m.lastEndpoint = endpoint
	m.lastDirect = isDirect
	m.stateEvents = append(m.stateEvents, state)
}

func (m *mockCallback) OnError(errorCode string, message string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lastError = errorCode + ": " + message
}

func (m *mockCallback) OnProtectSocket(fd int) bool {
	return true
}

func TestMobileLifecycle(t *testing.T) {
	cb := &mockCallback{}

	// 1. Initialize
	cfgJSON := `{"device_id":"test-mobile-id","cloud_url":"http://localhost:8080"}`
	err := InitMobile(cfgJSON, cb)
	if err != nil {
		t.Fatalf("InitMobile failed: %v", err)
	}

	cb.mu.Lock()
	if cb.lastState != "initialized" {
		t.Fatalf("expected state initialized, got %s", cb.lastState)
	}
	cb.mu.Unlock()

	// 2. Query status
	statusJSON := GetConnectionStatus()
	var status ConnectionStatusDTO
	if err := json.Unmarshal([]byte(statusJSON), &status); err != nil {
		t.Fatalf("failed to parse connection status: %v", err)
	}
	if !status.IsInitialized {
		t.Fatalf("expected status to be initialized")
	}

	// 3. Network roaming notification
	NotifyNetworkChange("CELLULAR")
	cb.mu.Lock()
	if cb.lastState != "roaming" || cb.lastEndpoint != "CELLULAR" {
		t.Fatalf("expected roaming on CELLULAR, got %s / %s", cb.lastState, cb.lastEndpoint)
	}
	cb.mu.Unlock()

	// 4. Disconnect
	Disconnect()
	cb.mu.Lock()
	if cb.lastState != "disconnected" {
		t.Fatalf("expected state disconnected, got %s", cb.lastState)
	}
	cb.mu.Unlock()

	statusJSON = GetConnectionStatus()
	if err := json.Unmarshal([]byte(statusJSON), &status); err != nil {
		t.Fatalf("failed to parse connection status: %v", err)
	}
	if status.IsInitialized {
		t.Fatalf("expected status to be uninitialized after disconnect")
	}
}

func TestMobileConfigError(t *testing.T) {
	cb := &mockCallback{}
	err := InitMobile("invalid json", cb)
	if err == nil {
		t.Fatalf("expected error on invalid config JSON")
	}

	cb.mu.Lock()
	if cb.lastError == "" {
		t.Fatalf("expected callback OnError to be called")
	}
	cb.mu.Unlock()
}

func TestSelectFallbackCandidate(t *testing.T) {
	// 1. Empty candidates
	ip, port := selectFallbackCandidate(nil)
	if ip != "" || port != 0 {
		t.Fatalf("expected empty for nil candidates, got %s:%d", ip, port)
	}

	// 2. Loopback candidate at index 0 followed by public Srflx candidate
	cands := []types.EndpointCandidate{
		{IP: "127.0.0.1", Port: 51820, Type: types.CandidateTypeHost},
		{IP: "203.0.113.5", Port: 54321, Type: types.CandidateTypeSrflx},
	}
	ip, port = selectFallbackCandidate(cands)
	if ip != "203.0.113.5" || port != 54321 {
		t.Fatalf("expected srflx candidate 203.0.113.5:54321, got %s:%d", ip, port)
	}

	// 3. Non-matching host candidate vs Srflx candidate
	cands = []types.EndpointCandidate{
		{IP: "192.0.2.1", Port: 51820, Type: types.CandidateTypeHost},
		{IP: "198.51.100.25", Port: 41234, Type: types.CandidateTypeSrflx},
	}
	ip, port = selectFallbackCandidate(cands)
	if ip != "198.51.100.25" || port != 41234 {
		t.Fatalf("expected srflx candidate 198.51.100.25:41234, got %s:%d", ip, port)
	}

	// 4. Non-loopback host candidate when loopback is first
	cands = []types.EndpointCandidate{
		{IP: "127.0.0.1", Port: 51820, Type: types.CandidateTypeHost},
		{IP: "10.0.0.5", Port: 51820, Type: types.CandidateTypeHost},
	}
	ip, port = selectFallbackCandidate(cands)
	if ip != "10.0.0.5" || port != 51820 {
		t.Fatalf("expected non-loopback candidate 10.0.0.5:51820, got %s:%d", ip, port)
	}

	// 5. Explicit local IP matching same-subnet candidate
	cands = []types.EndpointCandidate{
		{IP: "192.168.88.189", Port: 51820, Type: types.CandidateTypeHost},
		{IP: "154.227.130.65", Port: 51820, Type: types.CandidateTypeSrflx},
	}
	ip, port = selectFallbackCandidateWithLocalIP(cands, "192.168.88.243")
	if ip != "192.168.88.189" || port != 51820 {
		t.Fatalf("expected LAN host candidate 192.168.88.189:51820 when on same subnet, got %s:%d", ip, port)
	}

	// 6. Explicit local IP on different subnet selects Srflx
	ip, port = selectFallbackCandidateWithLocalIP(cands, "10.42.0.15")
	if ip != "154.227.130.65" || port != 51820 {
		t.Fatalf("expected WAN srflx candidate 154.227.130.65:51820 when on different subnet, got %s:%d", ip, port)
	}
}
