-- Migration to update currency_type constraint from USDT to USDC
-- This updates the check constraint on the multi_currency_bounties table

-- Drop the existing constraint
ALTER TABLE multi_currency_bounties 
DROP CONSTRAINT multi_currency_bounties_currency_type_check;

-- Add the new constraint with USDC instead of USDT
ALTER TABLE multi_currency_bounties 
ADD CONSTRAINT multi_currency_bounties_currency_type_check 
CHECK (currency_type IN ('XDC', 'ROXN', 'USDC'));