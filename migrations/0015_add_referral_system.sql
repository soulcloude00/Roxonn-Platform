-- Migration: Add Referral System
-- Description: Creates tables for referral tracking, rewards, and user referral stats

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_id INTEGER REFERENCES referral_codes(id),
  subscription_id INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  usdc_reward DECIMAL(10, 6) DEFAULT 0,
  roxn_reward DECIMAL(18, 8) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  converted_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  UNIQUE(referred_id)
);

-- Indexes for referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Referral rewards ledger
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id INTEGER REFERENCES referrals(id),
  reward_type VARCHAR(10) NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);

-- Index for reward queries
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);

-- Add referral columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS total_usdc_earned DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_roxn_earned DECIMAL(18, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_total_referrals ON users(total_referrals DESC);

-- Payout requests table (for manual admin review)
CREATE TABLE IF NOT EXISTS payout_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usdc_amount DECIMAL(10, 6) NOT NULL,
  roxn_amount DECIMAL(18, 8) NOT NULL,
  wallet_address TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  usdc_tx_hash VARCHAR(255),
  roxn_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Indexes for payout request queries
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
