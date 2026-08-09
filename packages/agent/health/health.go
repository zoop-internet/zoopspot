package health

import (
	"github.com/zoop-internet/zoop/packages/agent/state"
)

// Checker provides health status for the agent.
type Checker struct {
	stateMgr *state.Manager
}

// NewChecker creates a new health checker.
func NewChecker(sm *state.Manager) *Checker {
	return &Checker{
		stateMgr: sm,
	}
}

// IsHealthy returns true if the agent is running normally.
func (c *Checker) IsHealthy() bool {
	// For now, simple check: is the state RUNNING?
	return c.stateMgr.Get() == state.StateRunning
}
