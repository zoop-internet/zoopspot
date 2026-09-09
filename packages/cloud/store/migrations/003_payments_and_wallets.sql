-- Migration: 003_payments_and_wallets.sql
-- Establishes the authoritative wallet ledger, payment transactions, and bandwidth earning records

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL UNIQUE,
    currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    total_earned NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON wallets(owner_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    reference VARCHAR(64) NOT NULL UNIQUE,
    gateway_reference VARCHAR(128) NOT NULL DEFAULT '',
    type VARCHAR(32) NOT NULL,
    method VARCHAR(32) NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT '',
    amount NUMERIC(18, 2) NOT NULL,
    fee NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    phone_number VARCHAR(32) NOT NULL DEFAULT '',
    checkout_url TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON payment_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner_id ON payment_transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON payment_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS earning_records (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    source VARCHAR(32) NOT NULL,
    session_id VARCHAR(64) NOT NULL DEFAULT '',
    bytes_relayed BIGINT NOT NULL DEFAULT 0,
    rate_per_gb NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_wallet_id ON earning_records(wallet_id);
CREATE INDEX IF NOT EXISTS idx_earnings_owner_id ON earning_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earning_records(created_at DESC);
