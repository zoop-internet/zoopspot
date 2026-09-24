package tunnel

import (
	"log/slog"
	"sync"
	"time"
)

// DPDState models the liveliness condition of a peer.
type DPDState string

const (
	DPDStateAlive   DPDState = "alive"
	DPDStateSuspect DPDState = "suspect"
	DPDStateDead    DPDState = "dead"
)

// DPDConfig holds configurable timers and exponential backoff parameters for dead-peer detection.
type DPDConfig struct {
	CheckInterval     time.Duration
	InitialTimeout    time.Duration
	MaxBackoffTimeout time.Duration
	BackoffMultiplier float64
	MaxRetries        int
}

// DefaultDPDConfig returns production-tuned defaults for peer liveliness monitoring.
// WireGuard renegotiates cryptographic session keys at REKEY_AFTER_TIME (120s)
// and rejects packets beyond REJECT_AFTER_TIME (180s). InitialTimeout is set to
// 135s to grant a 15s rekey margin without triggering false-positive suspect states.
func DefaultDPDConfig() DPDConfig {
	return DPDConfig{
		CheckInterval:     1 * time.Second,
		InitialTimeout:    135 * time.Second,
		MaxBackoffTimeout: 180 * time.Second,
		BackoffMultiplier: 1.2,
		MaxRetries:        3,
	}
}

// DeadPeerDetector manages liveliness tracking with exponential backoff retries.
type DeadPeerDetector struct {
	cfg         DPDConfig
	logger      *slog.Logger
	mu          sync.RWMutex
	state       DPDState
	retries     int
	curTimeout  time.Duration
	lastFresh   time.Time
	lastRxBytes int64

	onDead    func()
	onSuspect func(retries int, nextBackoff time.Duration)
	onAlive   func()
}

// NewDeadPeerDetector initializes a new DPD monitor.
func NewDeadPeerDetector(
	cfg DPDConfig,
	onDead func(),
	onSuspect func(retries int, nextBackoff time.Duration),
	onAlive func(),
	logger *slog.Logger,
) *DeadPeerDetector {
	if cfg.BackoffMultiplier <= 1.0 {
		cfg.BackoffMultiplier = 2.0
	}
	if cfg.InitialTimeout <= 0 {
		cfg.InitialTimeout = 3 * time.Second
	}
	if cfg.MaxBackoffTimeout <= 0 {
		cfg.MaxBackoffTimeout = 30 * time.Second
	}
	if cfg.MaxRetries <= 0 {
		cfg.MaxRetries = 3
	}
	if logger == nil {
		logger = slog.Default()
	}

	return &DeadPeerDetector{
		cfg:        cfg,
		logger:     logger,
		state:      DPDStateAlive,
		retries:    0,
		curTimeout: cfg.InitialTimeout,
		lastFresh:  time.Now(),
		onDead:     onDead,
		onSuspect:  onSuspect,
		onAlive:    onAlive,
	}
}

// GetStatus returns the current state, retries, and backoff timeout.
func (d *DeadPeerDetector) GetStatus() (DPDState, int, time.Duration) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.state, d.retries, d.curTimeout
}

// Reset resets the detector back to DPDStateAlive upon receiving fresh traffic or handshake.
func (d *DeadPeerDetector) Reset() {
	d.mu.Lock()
	defer d.mu.Unlock()

	wasNonAlive := d.state != DPDStateAlive
	d.state = DPDStateAlive
	d.retries = 0
	d.curTimeout = d.cfg.InitialTimeout
	d.lastFresh = time.Now()

	if wasNonAlive && d.onAlive != nil {
		go d.onAlive()
	}
}

// RecordActivity evaluates the peer's latest handshake timestamp and received byte count.
// If rxBytes has incremented since the last observation, or if the handshake is within
// curTimeout, the peer is considered actively alive.
func (d *DeadPeerDetector) RecordActivity(lastHandshake time.Time, rxBytes int64) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()

	// If rxBytes increased, active decrypted data is being received from the peer.
	if rxBytes > d.lastRxBytes && d.lastRxBytes > 0 {
		d.lastRxBytes = rxBytes
		d.lastFresh = now
		if d.state != DPDStateAlive {
			d.state = DPDStateAlive
			d.retries = 0
			d.curTimeout = d.cfg.InitialTimeout
			if d.onAlive != nil {
				go d.onAlive()
			}
		}
		return true
	}
	if rxBytes > d.lastRxBytes {
		d.lastRxBytes = rxBytes
	}

	var elapsed time.Duration
	if !lastHandshake.IsZero() {
		elapsed = now.Sub(lastHandshake)
	} else {
		elapsed = now.Sub(d.lastFresh)
	}

	if elapsed <= d.curTimeout {
		// Fresh handshake observed
		if d.state != DPDStateAlive {
			d.state = DPDStateAlive
			d.retries = 0
			d.curTimeout = d.cfg.InitialTimeout
			if d.onAlive != nil {
				go d.onAlive()
			}
		}
		d.lastFresh = now
		return true
	}

	// Handshake is stale and no RX traffic progression
	d.retries++
	if d.retries >= d.cfg.MaxRetries {
		if d.state != DPDStateDead {
			d.state = DPDStateDead
			d.logger.Warn("peer declared DEAD by DPD, max retries reached",
				"retries", d.retries,
				"elapsed_sec", elapsed.Seconds(),
				"rx_bytes", rxBytes,
			)
			if d.onDead != nil {
				go d.onDead()
			}
		}
		return false
	}

	// Transition to suspect and backoff
	d.state = DPDStateSuspect
	nextBackoff := time.Duration(float64(d.curTimeout) * d.cfg.BackoffMultiplier)
	if nextBackoff > d.cfg.MaxBackoffTimeout {
		nextBackoff = d.cfg.MaxBackoffTimeout
	}
	d.curTimeout = nextBackoff

	d.logger.Info("peer SUSPECT, backing off next check",
		"retries", d.retries,
		"max_retries", d.cfg.MaxRetries,
		"next_backoff", nextBackoff,
		"elapsed_sec", elapsed.Seconds(),
	)

	if d.onSuspect != nil {
		go d.onSuspect(d.retries, nextBackoff)
	}

	return false
}

// RecordHandshake evaluates the latest handshake timestamp against DPD thresholds.
// It returns true if the peer is still considered alive, or false if suspect/dead.
func (d *DeadPeerDetector) RecordHandshake(lastHandshake time.Time) bool {
	return d.RecordActivity(lastHandshake, d.lastRxBytes)
}
