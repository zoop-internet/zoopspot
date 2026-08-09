package state

import "sync"

// State represents the current operational state of the agent.
type State string

const (
	StateStarting State = "STARTING"
	StateRunning  State = "RUNNING"
	StateError    State = "ERROR"
	StateStopped  State = "STOPPED"
)

// Manager handles the thread-safe state machine of the agent.
type Manager struct {
	mu      sync.RWMutex
	current State
}

// NewManager creates a new state manager initialized to StateStarting.
func NewManager() *Manager {
	return &Manager{
		current: StateStarting,
	}
}

// Get returns the current state.
func (m *Manager) Get() State {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

// Set updates the agent's state.
func (m *Manager) Set(newState State) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.current = newState
}
