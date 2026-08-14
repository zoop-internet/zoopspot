-- Zoop Control Plane Database Schema
-- Migration: 001_initial_schema.sql

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    os TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT 'trusted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identities (
    endpoint_id UUID PRIMARY KEY,
    public_key BYTEA NOT NULL UNIQUE,
    wireguard_public_key BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sharing_relationships (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    state TEXT NOT NULL DEFAULT 'requested',
    provider_ip TEXT,
    recipient_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ipam_counter (
    id INT PRIMARY KEY DEFAULT 1,
    allocated_pairs BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize IPAM allocation counter row if not exists
INSERT INTO ipam_counter (id, allocated_pairs) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Indexes for ultra-fast Lookups
CREATE INDEX IF NOT EXISTS idx_devices_state ON devices(state);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_shares_endpoints ON sharing_relationships(provider_id, recipient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON connections(provider_id, state);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id, state);
