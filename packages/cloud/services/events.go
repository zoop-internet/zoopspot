package services

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/zoop-internet/zoop/packages/core/types"
)

// ServerEvent is a real-time notification pushed to authenticated web clients
// over SSE. It mirrors the events agents see over signaling, but as a
// browser-friendly payload the dashboard can act on (refresh lists, show toasts).
type ServerEvent struct {
	Type    string `json:"type"` // e.g. connection_requested | connection_updated | share_created | org_created
	Entity  string `json:"entity,omitempty"`
	ID      string `json:"id,omitempty"`
	Payload any    `json:"payload,omitempty"`
}

// eventSubscriber is a single SSE client subscribed to events for one identity.
type eventSubscriber struct {
	ch chan ServerEvent
}

// EventHub fans server events out to subscribed web clients, per identity.
type EventHub struct {
	mu       sync.RWMutex
	clients  map[types.ID]map[*eventSubscriber]struct{}
	closed   bool
	onDrop   func(id types.ID, sub *eventSubscriber)
}

// NewEventHub creates an event hub.
func NewEventHub() *EventHub {
	return &EventHub{
		clients: make(map[types.ID]map[*eventSubscriber]struct{}),
	}
}

// Subscribe registers a subscriber for an identity and returns its channel.
// The returned unsubscribe func must be called when the client disconnects.
func (h *EventHub) Subscribe(id types.ID) (<-chan ServerEvent, func()) {
	ch := make(chan ServerEvent, 64)
	sub := &eventSubscriber{ch: ch}

	h.mu.Lock()
	if h.clients[id] == nil {
		h.clients[id] = make(map[*eventSubscriber]struct{})
	}
	h.clients[id][sub] = struct{}{}
	h.mu.Unlock()

	var once sync.Once
	unsub := func() {
		once.Do(func() {
			h.mu.Lock()
			if set, ok := h.clients[id]; ok {
				delete(set, sub)
				if len(set) == 0 {
					delete(h.clients, id)
				}
			}
			h.mu.Unlock()
			close(ch)
		})
	}

	return ch, unsub
}

// PublishTo delivers an event to every subscriber of the identity.
func (h *EventHub) PublishTo(id types.ID, ev ServerEvent) {
	h.mu.RLock()
	subs := h.clients[id]
	cloned := make([]*eventSubscriber, 0, len(subs))
	for s := range subs {
		cloned = append(cloned, s)
	}
	h.mu.RUnlock()

	for _, s := range cloned {
		select {
		case s.ch <- ev:
		default:
			// Drop if the client is too slow; it can resync via polling.
		}
	}
}

// PublishBroadcast delivers an event to every subscriber across all identities.
func (h *EventHub) PublishBroadcast(ev ServerEvent) {
	h.mu.RLock()
	all := make([]*eventSubscriber, 0, 8)
	for _, subs := range h.clients {
		for s := range subs {
			all = append(all, s)
		}
	}
	h.mu.RUnlock()

	for _, s := range all {
		select {
		case s.ch <- ev:
		default:
		}
	}
}

func (ev ServerEvent) MarshalJSON() ([]byte, error) {
	type alias ServerEvent
	b, err := json.Marshal(alias(ev))
	if err != nil {
		return nil, fmt.Errorf("failed to marshal server event: %w", err)
	}
	return b, nil
}