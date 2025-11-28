-- Migration: Create pending_wallets table for secure temporary wallet storage
-- This replaces the in-memory cache for better security and persistence

CREATE TABLE IF NOT EXISTS pending_wallets (
    id SERIAL PRIMARY KEY,
    reference_id VARCHAR(255) UNIQUE NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    encrypted_mnemonic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_wallets_reference_id ON pending_wallets(reference_id);
CREATE INDEX IF NOT EXISTS idx_pending_wallets_expires_at ON pending_wallets(expires_at);