package api

import (
	"bytes"
	"net/http"
	"sync"
	"time"
)

type cachedResp struct {
	status int
	header http.Header
	body   []byte
	expiry time.Time
}

type idempotencyStore struct {
	mu    sync.Mutex
	cache map[string]*cachedResp
}

var globalIdempotency = &idempotencyStore{cache: make(map[string]*cachedResp)}

func (s *idempotencyStore) get(key string) (*cachedResp, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cr, ok := s.cache[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(cr.expiry) {
		delete(s.cache, key)
		return nil, false
	}
	return cr, true
}

func (s *idempotencyStore) set(key string, cr *cachedResp) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// cap size 10000
	if len(s.cache) > 10000 {
		for k := range s.cache {
			delete(s.cache, k)
			break
		}
	}
	s.cache[key] = cr
	// cleanup expired periodically not needed; get will evict
}

// IdempotencyMiddleware caches POST responses keyed by Idempotency-Key header per caller.
// If the same key is reused within 24h, the cached response is replayed.
func IdempotencyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			next.ServeHTTP(w, r)
			return
		}
		key := r.Header.Get("Idempotency-Key")
		if key == "" {
			key = r.Header.Get("X-Idempotency-Key")
		}
		if key == "" {
			next.ServeHTTP(w, r)
			return
		}
		caller := r.Header.Get("X-Zoop-Identity")
		if caller == "" {
			caller = r.Header.Get("X-Zoop-Device-ID")
		}
		cacheKey := r.URL.Path + "|" + caller + "|" + key
		if cr, ok := globalIdempotency.get(cacheKey); ok {
			for k, vals := range cr.header {
				for _, v := range vals {
					w.Header().Add(k, v)
				}
			}
			w.Header().Set("X-Idempotent-Replayed", "true")
			w.WriteHeader(cr.status)
			_, _ = w.Write(cr.body)
			return
		}
		rec := &responseRecorder{header: make(http.Header), status: http.StatusOK}
		next.ServeHTTP(rec, r)
		// store
		cached := &cachedResp{
			status: rec.status,
			header: rec.header.Clone(),
			body:   rec.body.Bytes(),
			expiry: time.Now().Add(24 * time.Hour),
		}
		globalIdempotency.set(cacheKey, cached)
		for k, vals := range rec.header {
			for _, v := range vals {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(rec.status)
		_, _ = w.Write(rec.body.Bytes())
	})
}

type responseRecorder struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func (r *responseRecorder) Header() http.Header { return r.header }
func (r *responseRecorder) Write(b []byte) (int, error) { return r.body.Write(b) }
func (r *responseRecorder) WriteHeader(statusCode int) { r.status = statusCode }
