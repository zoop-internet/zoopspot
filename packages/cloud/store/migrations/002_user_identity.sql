-- Migration: 002_user_identity.sql
-- Add ZoopID and Username support to users table

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS zoop_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_zoop_id ON users(zoop_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
