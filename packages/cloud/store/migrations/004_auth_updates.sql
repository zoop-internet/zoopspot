-- Migration: 004_auth_updates.sql
-- Add pin_hash for user authentication and owner_id to link devices to accounts

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pin_hash TEXT;

ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON devices(owner_id);
