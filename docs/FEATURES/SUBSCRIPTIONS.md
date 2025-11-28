# Subscription System Documentation

## Overview

The Roxonn platform offers a yearly subscription service for $10 USD (paid in USDC on XDC network) that provides access to premium courses and features.

## Features

### Subscription Benefits
- Access to premium courses (bolt.new, v0-dev)
- Early access to new features
- Priority support
- Enhanced API limits

### Payment System
- **Price**: $10 USD per year
- **Currency**: USDC on XDC network
- **Gateway**: Onramp.money integration
- **Auto-renewal**: Not implemented (manual renewal)

## Technical Implementation

### Database Schema

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'cancelled'
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  amount_paid DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USDC',
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription events for audit
CREATE TABLE subscription_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course assignments
CREATE TABLE course_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_name VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(user_id, course_name)
);
```

## Payment Flow

### 1. Initiation
```typescript
POST /api/subscription/init
{
  walletAddress: "xdc...",
  email: "user@email.com"
}
```

### 2. Onramp.money Integration
- Generate payment URL with merchant recognition ID
- User redirected to Onramp.money
- User completes USDC payment

### 3. Verification
```typescript
POST /api/subscription/verify
{
  orderId: "ORD_xxx",
  transactionHash: "0x..."
}
```

### 4. Webhook Processing
```typescript
POST /webhook/onramp-money
// Automated verification and activation
```

### 5. Activation
- Subscription marked as active
- Course access granted
- Confirmation email sent

## API Endpoints

### Public Endpoints
- `GET /api/subscription/status` - Check subscription status
- `GET /api/subscription/merchant-url` - Get payment URL

### Authenticated Endpoints
- `POST /api/subscription/init` - Initialize subscription
- `POST /api/subscription/verify` - Verify payment
- `GET /api/subscription/details` - Get subscription details

### Admin Endpoints
- `GET /api/admin/subscription/pending` - View pending payments
- `POST /api/admin/subscription/verify/:orderId` - Manual verification

## Environment Variables

```bash
# Onramp.money Configuration
ONRAMP_MONEY_API_KEY=
ONRAMP_MONEY_WEBHOOK_SECRET=
ONRAMP_MONEY_BASE_URL=https://onramp.money

# Subscription Settings
SUBSCRIPTION_PRICE_USD=10
SUBSCRIPTION_DURATION_DAYS=365
USDC_XDC_ADDRESS=        # USDC token on XDC
SUBSCRIPTION_WALLET=      # Receiving wallet

# Email Configuration (optional)
EMAIL_SERVICE_ENABLED=false
EMAIL_FROM_ADDRESS=
```

## Testing Guide

### Test Flow
1. **Initialize subscription** with test wallet
2. **Simulate payment** on Onramp.money sandbox
3. **Verify webhook** receipt
4. **Check activation** in database
5. **Validate course access**

### Test Commands
```bash
# Check subscription status
curl ${API_URL}/api/subscription/status \
  -H "Cookie: connect.sid=${SESSION}"

# Initialize subscription
curl -X POST ${API_URL}/api/subscription/init \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "xdc...", "email": "test@test.com"}'

# Verify payment
curl -X POST ${API_URL}/api/subscription/verify \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD_xxx", "transactionHash": "0x..."}'
```

## Deployment Checklist

### Pre-Deployment
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Onramp.money API key configured
- [ ] Webhook endpoint accessible
- [ ] USDC token address verified

### Post-Deployment
- [ ] Test payment flow end-to-end
- [ ] Verify webhook processing
- [ ] Check email notifications
- [ ] Monitor error logs
- [ ] Validate course access

## Troubleshooting

### Common Issues

1. **Payment not reflecting**
   - Check webhook logs
   - Verify transaction on blockchain
   - Manual verification via admin endpoint

2. **Course access not granted**
   - Check subscription status
   - Verify course_assignments table
   - Check expiration date

3. **Webhook failures**
   - Verify webhook secret
   - Check webhook URL accessibility
   - Review webhook logs

### Debug Queries

```sql
-- Check user's subscription
SELECT * FROM subscriptions
WHERE user_id = ?
ORDER BY created_at DESC;

-- Check pending transactions
SELECT * FROM onramp_transactions
WHERE status = 'INITIATED'
AND created_at > NOW() - INTERVAL '24 hours';

-- Verify course access
SELECT * FROM course_assignments
WHERE user_id = ?;
```

## Implementation Status

✅ **Complete**:
- Database schema and migrations
- Payment initiation flow
- Onramp.money integration
- Webhook processing
- Manual verification
- Course assignment
- Status checking

⏳ **Future Enhancements**:
- [ ] Auto-renewal
- [ ] Multiple subscription tiers
- [ ] Promo codes/discounts
- [ ] Subscription analytics
- [ ] Email notifications
- [ ] Refund processing

## Related Documentation

- [Onramp Integration](/docs/INTEGRATION/ONRAMP.md)
- [Wallet System](/docs/FEATURES/WALLET_SYSTEM.md)
- [API Reference](/docs/API_REFERENCE.md)

---

Last Updated: November 2024
Version: 1.0