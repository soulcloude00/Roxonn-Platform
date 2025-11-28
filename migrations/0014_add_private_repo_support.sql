-- Migration: Add Private Repository Support
-- Description: Adds fields to support private repository access for pool managers

-- Add private repository access fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_private_repo_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS github_private_access_token TEXT;

-- Add is_private flag to registered_repositories table
ALTER TABLE registered_repositories
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Create index for faster private repo queries
CREATE INDEX IF NOT EXISTS idx_registered_repositories_is_private
ON registered_repositories(is_private);

-- Create index for users with private access
CREATE INDEX IF NOT EXISTS idx_users_private_access
ON users(has_private_repo_access) WHERE has_private_repo_access = TRUE;
