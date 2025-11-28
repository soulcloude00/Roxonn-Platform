-- Create onramp_transactions table
CREATE TABLE IF NOT EXISTS onramp_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  merchant_recognition_id TEXT NOT NULL UNIQUE,
  order_id TEXT UNIQUE,
  amount TEXT,
  fiat_amount TEXT,
  fiat_currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'initiated',
  status_code TEXT,
  status_message TEXT,
  tx_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_onramp_transactions_user_id ON onramp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_onramp_transactions_wallet_address ON onramp_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_onramp_transactions_merchant_recognition_id ON onramp_transactions(merchant_recognition_id);
