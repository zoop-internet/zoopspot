package api

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type clientBucket struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter implements a thread-safe token bucket rate limiter.
type RateLimiter struct {
	mu           sync.Mutex
	buckets      map[string]*clientBucket
	rate         float64 // tokens per second
	capacity     float64 // maximum tokens
	cleanupTimer *time.Ticker
}

// NewRateLimiter creates a new rate limiter with the specified rate and burst capacity.
func NewRateLimiter(ratePerMinute int, burstCapacity int) *RateLimiter {
	rl := &RateLimiter{
		buckets:  make(map[string]*clientBucket),
		rate:     float64(ratePerMinute) / 60.0,
		capacity: float64(burstCapacity),
	}

	// Periodic cleanup of stale client buckets (older than 10 minutes)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for k, b := range rl.buckets {
				if now.Sub(b.lastRefill) > 10*time.Minute {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

// Allow checks if a request from key (IP or Device ID) is permitted.
func (rl *RateLimiter) Allow(key string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	bucket, exists := rl.buckets[key]
	if !exists {
		bucket = &clientBucket{
			tokens:     rl.capacity - 1,
			lastRefill: now,
		}
		rl.buckets[key] = bucket
		return true, 0
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(bucket.lastRefill).Seconds()
	bucket.tokens += elapsed * rl.rate
	if bucket.tokens > rl.capacity {
		bucket.tokens = rl.capacity
	}
	bucket.lastRefill = now

	if bucket.tokens >= 1.0 {
		bucket.tokens -= 1.0
		return true, 0
	}

	// Calculate wait time until at least 1 token is available
	missing := 1.0 - bucket.tokens
	retryAfter := time.Duration((missing / rl.rate) * float64(time.Second))
	return false, retryAfter
}

// ExtractClientIP extracts the remote client IP, respecting X-Forwarded-For if behind a proxy.
func ExtractClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

// RateLimitMiddleware returns an HTTP middleware enforcing rate limits.
func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ExtractClientIP(r)
			allowed, retryAfter := limiter.Allow(ip)
			if !allowed {
				w.Header().Set("Retry-After", fmt.Sprintf("%.0f", retryAfter.Seconds()+1))
				WriteError(w, "rate_limited", "too many requests, please slow down", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
