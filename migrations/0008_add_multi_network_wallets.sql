-- Add multi-network wallet addresses to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ethereum_wallet_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS polygon_wallet_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bsc_wallet_address TEXT;

-- Add indexes for wallet lookups
CREATE INDEX IF NOT EXISTS idx_ethereum_wallet_address ON users(ethereum_wallet_address);
CREATE INDEX IF NOT EXISTS idx_polygon_wallet_address ON users(polygon_wallet_address);
CREATE INDEX IF NOT EXISTS idx_bsc_wallet_address ON users(bsc_wallet_address);

-- Add multi-currency bounty support table
CREATE TABLE IF NOT EXISTS multi_currency_bounties (
    id SERIAL PRIMARY KEY,
    repo_id TEXT NOT NULL,
    issue_id INTEGER NOT NULL,
    currency_type TEXT NOT NULL CHECK (currency_type IN ('XDC', 'ROXN', 'USDC')),
    network TEXT NOT NULL CHECK (network IN ('xdc', 'ethereum', 'polygon', 'bsc')),
    amount TEXT NOT NULL,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'allocated', 'distributed', 'cancelled')),
    contributor_address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_id, issue_id, currency_type, network)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_multi_currency_bounties_repo_id ON multi_currency_bounties(repo_id);
CREATE INDEX IF NOT EXISTS idx_multi_currency_bounties_currency_network ON multi_currency_bounties(currency_type, network);
CREATE INDEX IF NOT EXISTS idx_multi_currency_bounties_status ON multi_currency_bounties(status);