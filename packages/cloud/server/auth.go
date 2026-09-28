package server

import (
	"crypto/rand"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// Brute force protection: tracks failed login attempts per account identifier.
type loginAttemptTracker struct {
	mu       sync.Mutex
	attempts map[string]*attemptInfo
}

type attemptInfo struct {
	count       int
	firstFailed time.Time
	lockedUntil time.Time
}

var globalLoginLimiter = &loginAttemptTracker{
	attempts: make(map[string]*attemptInfo),
}

const (
	maxFailedAttempts = 5
	lockoutDuration   = 15 * time.Minute
	failureWindow     = 10 * time.Minute
)

func (t *loginAttemptTracker) isLocked(identifier string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	info, exists := t.attempts[identifier]
	if !exists {
		return false
	}
	if time.Now().Before(info.lockedUntil) {
		return true
	}
	// Expired lockout
	if !info.lockedUntil.IsZero() && time.Now().After(info.lockedUntil) {
		delete(t.attempts, identifier)
	}
	return false
}

func (t *loginAttemptTracker) recordFailure(identifier string) int {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := time.Now()
	info, exists := t.attempts[identifier]
	if !exists || now.Sub(info.firstFailed) > failureWindow {
		info = &attemptInfo{
			count:       1,
			firstFailed: now,
		}
		t.attempts[identifier] = info
		return 1
	}

	info.count++
	if info.count >= maxFailedAttempts {
		info.lockedUntil = now.Add(lockoutDuration)
	}
	return info.count
}

func (t *loginAttemptTracker) recordSuccess(identifier string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.attempts, identifier)
}

func generateAuthZoopID() (string, error) {
	const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	var sb strings.Builder
	sb.WriteString("ZP-")
	for i := 0; i < 6; i++ {
		sb.WriteByte(charset[int(b[i])%len(charset)])
	}
	return sb.String(), nil
}

var validUsernameRegex = regexp.MustCompile(`^[a-zA-Z0-9._-]{2,32}$`)
var validPINRegex = regexp.MustCompile(`^\d{6}$`)

func (s *Server) handleAuthSignup() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.AuthSignupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		username := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(req.Username, "@")))
		if !validUsernameRegex.MatchString(username) {
			api.WriteError(w, "invalid_request", "username must be 2-32 characters of letters, numbers, . _ -", http.StatusBadRequest)
			return
		}

		pin := strings.TrimSpace(req.PIN)
		if !validPINRegex.MatchString(pin) {
			api.WriteError(w, "invalid_request", "pin must be exactly 6 digits", http.StatusBadRequest)
			return
		}

		if req.DeviceName == "" {
			req.DeviceName = "Web Browser"
		}
		if req.Platform == "" {
			req.Platform = "web"
		}
		if req.PublicKey == "" {
			api.WriteError(w, "invalid_request", "public_key is required", http.StatusBadRequest)
			return
		}

		// Check if username is already taken
		if existing, err := s.users.GetAccountByUsername(r.Context(), username); err == nil && existing != nil {
			api.WriteError(w, "conflict", "username is already taken", http.StatusConflict)
			return
		}

		// Generate unique Zoop ID
		zoopID, err := generateAuthZoopID()
		if err != nil {
			api.WriteError(w, "internal_error", "failed to generate zoop id", http.StatusInternalServerError)
			return
		}

		// Hash PIN
		pinHash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
		if err != nil {
			api.WriteError(w, "internal_error", "failed to hash pin", http.StatusInternalServerError)
			return
		}

		displayName := strings.TrimSpace(req.Name)
		if displayName == "" {
			displayName = strings.ToUpper(username[:1]) + username[1:]
		}

		user := &types.Account{
			ID:        types.NewID(),
			ZoopID:    zoopID,
			Username:  username,
			Name:      displayName,
			PinHash:   string(pinHash),
			CreatedAt: time.Now().UTC(),
		}

		if err := s.store.SaveUser(r.Context(), user); err != nil {
			s.logger.Error("failed to create user", "error", err)
			api.WriteError(w, "internal_error", "failed to create user", http.StatusInternalServerError)
			return
		}

		// Register the new device linked to this user
		devResp, err := s.devices.Register(r.Context(), api.RegisterDeviceRequest{
			Name:               req.DeviceName,
			Platform:           req.Platform,
			PublicKey:          req.PublicKey,
			WireGuardPublicKey: req.WireGuardPublicKey,
			AccountID:          user.ID,
		})
		if err != nil {
			s.logger.Error("failed to register device for user", "error", err)
			api.WriteError(w, "internal_error", "failed to register device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), user.ID, "user.signup", "user:"+user.ID.String(), "device:"+devResp.ID.String())

		resp := api.AuthResponse{
			User:   user,
			Device: devResp,
		}
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleAuthLogin() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.AuthLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		identifier := strings.TrimSpace(req.Identifier)
		if identifier == "" {
			api.WriteError(w, "invalid_request", "identifier (username or Zoop ID) is required", http.StatusBadRequest)
			return
		}

		normIdentifier := strings.ToLower(strings.TrimPrefix(identifier, "@"))

		// Check rate limiting / lockout
		if globalLoginLimiter.isLocked(normIdentifier) {
			api.WriteError(w, "rate_limited", "account temporarily locked due to too many failed attempts. please try again in 15 minutes", http.StatusTooManyRequests)
			return
		}

		pin := strings.TrimSpace(req.PIN)
		if !validPINRegex.MatchString(pin) {
			api.WriteError(w, "invalid_request", "pin must be exactly 6 digits", http.StatusBadRequest)
			return
		}

		if req.PublicKey == "" {
			api.WriteError(w, "invalid_request", "public_key is required", http.StatusBadRequest)
			return
		}
		if req.DeviceName == "" {
			req.DeviceName = "Web Browser"
		}
		if req.Platform == "" {
			req.Platform = "web"
		}

		// Lookup user
		var user *types.Account
		var err error

		if strings.HasPrefix(strings.ToUpper(identifier), "ZP-") {
			user, err = s.users.GetAccountByZoopID(r.Context(), strings.ToUpper(identifier))
		} else {
			user, err = s.users.GetAccountByUsername(r.Context(), normIdentifier)
			if err == store.ErrNotFound {
				user, err = s.users.GetAccountByZoopID(r.Context(), strings.ToUpper(identifier))
			}
		}

		if err != nil || user == nil {
			globalLoginLimiter.recordFailure(normIdentifier)
			api.WriteError(w, "unauthenticated", "invalid username or PIN", http.StatusUnauthorized)
			return
		}

		// Verify PIN
		if user.PinHash == "" {
			// If legacy account with no PIN hash yet, disallow or handle
			api.WriteError(w, "unauthenticated", "account has no PIN configured", http.StatusUnauthorized)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PinHash), []byte(pin)); err != nil {
			fails := globalLoginLimiter.recordFailure(normIdentifier)
			s.logger.Warn("failed login attempt", "identifier", normIdentifier, "failures", fails)
			api.WriteError(w, "unauthenticated", "invalid username or PIN", http.StatusUnauthorized)
			return
		}

		// Login successful: reset failed attempt counter
		globalLoginLimiter.recordSuccess(normIdentifier)

		// Register new device keypair for this login session, linked to the user account
		devResp, err := s.devices.Register(r.Context(), api.RegisterDeviceRequest{
			Name:               req.DeviceName,
			Platform:           req.Platform,
			PublicKey:          req.PublicKey,
			WireGuardPublicKey: req.WireGuardPublicKey,
			AccountID:          user.ID,
		})
		if err != nil {
			s.logger.Error("failed to register device on login", "error", err)
			api.WriteError(w, "internal_error", "failed to register device for session", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), user.ID, "user.login", "user:"+user.ID.String(), "device:"+devResp.ID.String())

		resp := api.AuthResponse{
			User:   user,
			Device: devResp,
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}
