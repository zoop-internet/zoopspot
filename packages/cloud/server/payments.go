package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/payments"
)

func (s *Server) handleGetWallet() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		wallet, err := s.payments.GetOrCreateWallet(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to get or create wallet", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to retrieve wallet", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, wallet)
	}
}

func (s *Server) handleDepositMobileMoney() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.DepositMobileMoneyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateMobileMoneyDeposit(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInvalidAmount) || errors.Is(err, payments.ErrInvalidPhone) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate mobile money deposit", "error", err, "caller", callerID)
			api.WriteError(w, "payment_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleDepositCard() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.DepositCardRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateCardDeposit(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInvalidAmount) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate card deposit", "error", err, "caller", callerID)
			api.WriteError(w, "payment_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleWithdrawal() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.WithdrawalRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateWithdrawal(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInsufficientFunds) {
				api.WriteError(w, "insufficient_funds", err.Error(), http.StatusBadRequest)
				return
			}
			if errors.Is(err, payments.ErrInvalidAmount) || errors.Is(err, payments.ErrInvalidPhone) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate withdrawal", "error", err, "caller", callerID)
			api.WriteError(w, "payout_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListTransactions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		limit, offset := parsePagination(r, 20, 100)
		resp, err := s.payments.ListTransactions(r.Context(), callerID, limit, offset)
		if err != nil {
			s.logger.Error("failed to list transactions", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to list transactions", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListEarnings() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		limit, offset := parsePagination(r, 20, 100)
		resp, err := s.payments.ListEarnings(r.Context(), callerID, limit, offset)
		if err != nil {
			s.logger.Error("failed to list earnings", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to list earnings", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handlePaymentWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			api.WriteError(w, "invalid_request", "failed to read body", http.StatusBadRequest)
			return
		}
		sigHeader := r.Header.Get("X-MarzPay-Signature")
		if sigHeader == "" {
			sigHeader = r.Header.Get("X-Webhook-Signature")
		}
		if sigHeader == "" {
			sigHeader = r.Header.Get("X-Webhook-Token")
		}

		if err := s.payments.ProcessWebhook(r.Context(), body, sigHeader); err != nil {
			if errors.Is(err, payments.ErrInvalidSignature) {
				api.WriteError(w, "unauthorized", "invalid webhook signature", http.StatusUnauthorized)
				return
			}
			s.logger.Error("failed to process payment webhook", "error", err)
			api.WriteError(w, "internal_error", "webhook processing failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","received":true}`))
	}
}
