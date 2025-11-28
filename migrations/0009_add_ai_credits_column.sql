-- Add AI Credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 0;

-- Add index for improved query performance when checking credit balances
CREATE INDEX IF NOT EXISTS idx_ai_credits ON users(ai_credits);
