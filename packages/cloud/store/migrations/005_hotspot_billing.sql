-- Migration: 005_hotspot_billing.sql
-- Adds Hotspot venues, pricing packages, customer sessions, and prepaid vouchers

CREATE TABLE IF NOT EXISTS hotspots (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    location TEXT NOT NULL DEFAULT '',
    router_type VARCHAR(32) NOT NULL DEFAULT 'mikrotik',
    router_ip TEXT NOT NULL DEFAULT '',
    router_api_user TEXT NOT NULL DEFAULT 'zoopspot',
    router_api_password TEXT NOT NULL DEFAULT '',
    wireguard_pubkey TEXT NOT NULL DEFAULT '',
    currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_owner_id ON hotspots(owner_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_slug ON hotspots(slug);

CREATE TABLE IF NOT EXISTS hotspot_packages (
    id UUID PRIMARY KEY,
    hotspot_id UUID NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    duration_minutes INT NOT NULL DEFAULT 60,
    data_limit_bytes BIGINT NOT NULL DEFAULT 0,
    rate_limit_down_kbps INT NOT NULL DEFAULT 5120,
    rate_limit_up_kbps INT NOT NULL DEFAULT 2048,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspot_packages_hotspot_id ON hotspot_packages(hotspot_id);

CREATE TABLE IF NOT EXISTS hotspot_sessions (
    id UUID PRIMARY KEY,
    hotspot_id UUID NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
    package_id UUID REFERENCES hotspot_packages(id) ON DELETE SET NULL,
    phone_number VARCHAR(32) NOT NULL DEFAULT '',
    mac_address VARCHAR(32) NOT NULL,
    client_ip VARCHAR(45) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    voucher_code VARCHAR(32) NOT NULL DEFAULT '',
    bytes_downloaded BIGINT NOT NULL DEFAULT 0,
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_hotspot_id ON hotspot_sessions(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_mac ON hotspot_sessions(mac_address, status);
CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_status ON hotspot_sessions(status);

CREATE TABLE IF NOT EXISTS hotspot_vouchers (
    id UUID PRIMARY KEY,
    hotspot_id UUID NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES hotspot_packages(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    batch_tag VARCHAR(32) NOT NULL DEFAULT 'general',
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_by_mac VARCHAR(32) NOT NULL DEFAULT '',
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspot_vouchers_hotspot_id ON hotspot_vouchers(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_vouchers_code ON hotspot_vouchers(code);
