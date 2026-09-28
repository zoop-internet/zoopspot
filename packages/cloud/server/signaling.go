package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoopspot/packages/cloud/api"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func (s *Server) handleSignaling() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		conn, err := s.upgrader.Upgrade(w, r, nil)
		if err != nil {
			s.logger.Error("failed to upgrade to websocket", "error", err)
			return
		}
		defer conn.Close()

		s.logger.Info("signaling channel established", "caller_id", callerID)

		s.signaling.Register(callerID, conn)
		defer s.signaling.Unregister(callerID)

		// Parse JSON signaling messages and route them
		for {
			var msg types.SignalingMessage
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					s.logger.Error("signaling read error", "error", err)
				}
				return
			}

			// Overwrite sender ID to ensure it is the authenticated caller
			msg.SenderID = callerID

			// Intercept connection acceptance from provider
			if msg.Type == types.SignalingTypeConnectionAccepted {
				var payload types.ConnectionPayload
				if err := json.Unmarshal(msg.Payload, &payload); err == nil {
					s.logger.Info("connection accepted by provider via signaling", "conn_id", payload.ConnectionID, "provider_id", callerID)
					_ = s.connections.UpdateConnectionState(r.Context(), payload.ConnectionID, callerID, types.ConnectionStateAuthorized)
					s.connections.RecordAcceptedPayload(payload.ConnectionID, payload, callerID)
				}
			}

			// Route to the intended recipient
			if err := s.signaling.SendTo(msg.RecipientID, msg); err != nil {
				s.logger.Warn("failed to route signaling message", "recipient", msg.RecipientID, "error", err)
				// Optionally send an error message back to the sender
			}
		}
	}
}

// handleEventStream serves a Server-Sent Events stream of real-time server
// events (share/connection changes) to authenticated web clients.
func (s *Server) handleEventStream() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			api.WriteError(w, "unsupported", "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		ch, unsub := s.events.Subscribe(callerID)
		defer unsub()

		// Initial heartbeat so the client knows the stream is live.
		fmt.Fprintf(w, ": connected\n\n")
		flusher.Flush()

		ctx := r.Context()
		heartbeat := time.NewTicker(30 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-heartbeat.C:
				if _, err := fmt.Fprintf(w, ": ping\n\n"); err != nil {
					return
				}
				flusher.Flush()
			case ev, ok := <-ch:
				if !ok {
					return
				}
				b, err := json.Marshal(ev)
				if err != nil {
					continue
				}
				if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
					return
				}
				flusher.Flush()
			}
		}
	}
}
