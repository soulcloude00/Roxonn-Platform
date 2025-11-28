# Wallet System Documentation

## Overview

The Roxonn platform uses a **single-wallet-per-user architecture** with XDC network support only. This document consolidates all wallet system documentation.

## Current Implementation

- **Single Wallet**: Each user has exactly ONE XDC wallet address
- **XDC-Only**: All Ethereum, Polygon, BSC support has been removed
- **Tatum Integration**: Wallet creation and management via Tatum API
- **KMS Encryption**: Private keys encrypted using AWS KMS

## Key Changes from Multi-Wallet System

### Before (Deprecated)
- Multiple wallets per network (Ethereum, Polygon, BSC, XDC)
- Complex cross-chain management
- Multiple balance tracking systems
- USDT support across chains

### After (Current)
- Single XDC wallet per user
- Simplified balance management
- XDC, ROXN, and USDC tokens on XDC network only
- Streamlined user experience

## Database Schema

```sql
-- Single wallet fields in users table
xdc_wallet_address TEXT UNIQUE,        -- Single XDC address
wallet_reference_id TEXT,              -- Tatum reference
encrypted_private_key TEXT,            -- KMS encrypted
```

## Wallet Operations

### Creation
1. User signs up with GitHub OAuth
2. System creates single XDC wallet via Tatum
3. Private key encrypted with AWS KMS
4. Stored in database

### Export
- Requires email verification
- 24-hour cooldown period
- Encrypted delivery via secure link

### Funding
- Direct XDC transfers
- Onramp.money integration for fiat-to-crypto
- Support for XDC, ROXN, USDC tokens

## Migration Details

**Migration 0010**: Simplified wallet system
- Removed multi-network columns
- Added single wallet fields
- Migrated existing XDC addresses
- Cleaned up orphaned data

## Environment Variables

```bash
# Wallet Configuration
TATUM_API_KEY=           # Tatum API key
WALLET_KMS_KEY_ID=       # AWS KMS key for encryption
ENCRYPTION_KEY=          # Additional encryption layer
```

## API Endpoints

- `GET /api/wallet/info` - Get wallet details
- `GET /api/wallet/balance` - Get balances (XDC, ROXN, USDC)
- `POST /api/wallet/export-request` - Request wallet export
- `GET /api/wallet/limits` - Transfer limits

## Security Considerations

1. **Private Key Storage**: Never stored in plaintext
2. **KMS Encryption**: AWS KMS for key management
3. **Access Control**: Wallet operations require authentication
4. **Rate Limiting**: Applied to all wallet endpoints
5. **Export Protection**: Email verification + cooldown period

## Implementation Status

✅ **Complete**:
- Single wallet creation
- XDC-only support
- Tatum integration
- KMS encryption
- Export functionality
- Balance tracking
- API endpoints

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Development guide
- [Subscription System](/docs/FEATURES/SUBSCRIPTIONS.md) - USDC payments
- [Private Repos](/docs/FEATURES/PRIVATE_REPOS.md) - Repository management