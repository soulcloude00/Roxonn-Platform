-- Migration to remove multi-network wallet fields and keep only XDC wallet
-- This migration removes ethereum_wallet_address, polygon_wallet_address, 
-- and bsc_wallet_address fields from the users table

-- Remove multi-network wallet columns
ALTER TABLE users 
DROP COLUMN IF EXISTS ethereum_wallet_address,
DROP COLUMN IF EXISTS polygon_wallet_address,
DROP COLUMN IF EXISTS bsc_wallet_address;