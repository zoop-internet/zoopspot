package mobile

import (
	"encoding/json"
	"sync"
	"testing"
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
