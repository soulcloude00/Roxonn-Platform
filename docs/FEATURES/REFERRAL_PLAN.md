# Referral Feature Plan

## Overview

A referral system for premium membership where users earn **USDC revenue share + ROXN tokens** when their referrals purchase subscriptions.

## Requirements

- **Reward**: Share of USDC subscription revenue + ROXN tokens
- **Methods**: Both unique referral code AND referral link
- **Limits**: No restrictions (maximize referrals)
- **Visibility**: Display referral stats everywhere in UI

---

## Database Schema

### New Tables

```sql
-- Referral codes table
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  code VARCHAR(20) UNIQUE NOT NULL,        -- e.g., "DINESH2025"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Referral tracking table
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),  -- User who referred
  referred_id INTEGER NOT NULL REFERENCES users(id),  -- New user who signed up
  referral_code_id INTEGER REFERENCES referral_codes(id),
  subscription_id INTEGER REFERENCES subscriptions(id), -- When they subscribe
  status VARCHAR(20) DEFAULT 'pending',    -- pending, converted, rewarded
  usdc_reward DECIMAL(10, 6) DEFAULT 0,    -- USDC earned
  roxn_reward DECIMAL(18, 8) DEFAULT 0,    -- ROXN earned
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  converted_at TIMESTAMP,                  -- When subscription purchased
  rewarded_at TIMESTAMP,                   -- When rewards distributed
  UNIQUE(referred_id)                      -- Each user can only be referred once
);

-- Referral rewards ledger
CREATE TABLE referral_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  referral_id INTEGER REFERENCES referrals(id),
  reward_type VARCHAR(10) NOT NULL,        -- 'usdc' or 'roxn'
  amount DECIMAL(18, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',    -- pending, processing, paid
  transaction_hash VARCHAR(255),           -- Blockchain tx hash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);
```

### Users Table Addition

```sql
ALTER TABLE users
ADD COLUMN referral_code_id INTEGER REFERENCES referral_codes(id),
ADD COLUMN referred_by INTEGER REFERENCES users(id),
ADD COLUMN total_usdc_earned DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN total_roxn_earned DECIMAL(18, 8) DEFAULT 0,
ADD COLUMN total_referrals INTEGER DEFAULT 0;
```

---

## Reward Structure

### Revenue Share Model

```
Subscription Price: $10 USDC/year

Revenue Split:
├── Platform: 70% ($7.00)
├── Referrer: 20% ($2.00 USDC)
└── ROXN Bonus: 10 ROXN tokens (fixed)

Per Successful Referral:
- $2.00 USDC (20% of subscription)
- 10 ROXN tokens (bonus)
```

### Configuration (Environment Variables)

```bash
REFERRAL_USDC_PERCENTAGE=20        # 20% of subscription
REFERRAL_ROXN_AMOUNT=10            # Fixed 10 ROXN per referral
REFERRAL_CODE_PREFIX=ROXONN        # Optional prefix for codes
```

---

## API Endpoints

### Referral Code Management

```typescript
// Get/Create user's referral code
GET /api/referral/code
Response: {
  code: "DINESH2025",
  link: "https://roxonn.com/signup?ref=DINESH2025",
  stats: {
    totalReferrals: 15,
    pendingReferrals: 3,
    convertedReferrals: 12,
    totalUsdcEarned: "24.00",
    totalRoxnEarned: "120.00"
  }
}

// Generate custom referral code
POST /api/referral/code/custom
Body: { code: "MYCODE123" }
Response: { success: true, code: "MYCODE123" }
```

### Referral Tracking

```typescript
// Apply referral code during signup
POST /api/referral/apply
Body: { code: "DINESH2025" }
Response: { success: true, referrer: "dinesh***" }

// Get referral leaderboard
GET /api/referral/leaderboard
Response: {
  leaderboard: [
    { rank: 1, username: "din***", referrals: 50, earned: "100.00" },
    { rank: 2, username: "joh***", referrals: 35, earned: "70.00" },
    ...
  ],
  userRank: 15
}
```

### Rewards

```typescript
// Get pending rewards
GET /api/referral/rewards
Response: {
  pending: { usdc: "4.00", roxn: "20" },
  paid: { usdc: "20.00", roxn: "100" },
  history: [...]
}

// Claim rewards (transfer to wallet)
POST /api/referral/rewards/claim
Response: {
  success: true,
  usdcTxHash: "0x...",
  roxnTxHash: "0x..."
}
```

---

## Referral Flow

### 1. Referrer Shares Code/Link

```
User Dashboard → Copy Referral Code/Link → Share via social/email
```

### 2. New User Signs Up

```
Lands on signup page with ?ref=CODE
  → Code auto-applied
  → Stored in session/localStorage
  → User completes GitHub OAuth
  → Referral record created (status: pending)
```

### 3. New User Subscribes

```
New user purchases $10 subscription
  → Payment verified
  → Referral status → 'converted'
  → Calculate rewards:
    - $2.00 USDC (20%)
    - 10 ROXN tokens
  → Add to referrer's pending rewards
```

### 4. Rewards Distribution

```
Option A: Auto-distribution
  → After payment confirmed
  → Send USDC + ROXN to referrer's wallet
  → Update referral status → 'rewarded'

Option B: Manual claim
  → Rewards accumulate
  → User clicks "Claim Rewards"
  → Transfer to wallet
```

---

## UI Components

### 1. Referral Dashboard Widget (Everywhere)

```
┌─────────────────────────────────────────┐
│  🎁 Your Referrals                      │
│  ───────────────────────────────────    │
│  Total: 15 | Pending: 3 | Earned: $24   │
│                                         │
│  Your Code: DINESH2025  [Copy]          │
│  [Share Link] [View Details]            │
└─────────────────────────────────────────┘
```

### 2. Referral Page (/referrals)

```
┌─────────────────────────────────────────┐
│  Refer & Earn                           │
│  ═══════════════════════════════════    │
│                                         │
│  Earn $2 USDC + 10 ROXN for every       │
│  friend who subscribes!                 │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Your Referral Code              │    │
│  │ DINESH2025              [Copy]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Your Referral Link              │    │
│  │ roxonn.com/r/DINESH2025 [Copy]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Share on Twitter] [Share on LinkedIn] │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📊 Your Stats                          │
│  ┌──────────┬──────────┬──────────┐    │
│  │ Total    │ Pending  │ Earned   │    │
│  │ 15       │ 3        │ $24 USDC │    │
│  │ referrals│ signups  │ 120 ROXN │    │
│  └──────────┴──────────┴──────────┘    │
│                                         │
│  [Claim $4.00 USDC + 20 ROXN]           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🏆 Leaderboard                         │
│  1. din*** - 50 referrals - $100        │
│  2. joh*** - 35 referrals - $70         │
│  3. sam*** - 28 referrals - $56         │
│  ...                                    │
│  15. You - 15 referrals - $30           │
└─────────────────────────────────────────┘
```

### 3. Signup Page (with referral code)

```
┌─────────────────────────────────────────┐
│  Join Roxonn                            │
│                                         │
│  🎁 You were referred by dinesh***      │
│  You'll both earn rewards!              │
│                                         │
│  [Continue with GitHub]                 │
└─────────────────────────────────────────┘
```

### 4. Membership Page Addition

```
┌─────────────────────────────────────────┐
│  Premium Membership - $10/year          │
│                                         │
│  Have a referral code?                  │
│  ┌─────────────────────────────────┐    │
│  │ Enter code: [          ] [Apply]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Subscribe Now]                        │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database & Core API
1. Create migration file for new tables
2. Update schema.ts with new types
3. Implement referral code generation
4. Implement referral tracking

### Phase 2: Subscription Integration
1. Hook into subscription payment flow
2. Calculate and store rewards
3. Update referral status on payment

### Phase 3: Rewards Distribution
1. Implement USDC transfer to referrer
2. Implement ROXN transfer to referrer
3. Add claim functionality

### Phase 4: Frontend
1. Add referral widget to dashboard
2. Create dedicated referrals page
3. Add referral code input to signup/membership
4. Add social sharing buttons
5. Add leaderboard

### Phase 5: Testing & Launch
1. Test complete referral flow
2. Test reward distribution
3. Deploy to production

---

## Security Considerations

1. **Self-referral Prevention**: Check if referrer email domain matches
2. **Fraud Detection**: Monitor for suspicious patterns
3. **Rate Limiting**: Limit referral code applications per IP
4. **Minimum Payout**: Consider minimum threshold for claiming

---

## Success Metrics

- Total referrals generated
- Conversion rate (signup → subscription)
- Revenue from referrals
- User engagement with referral program
- ROXN tokens distributed

---

## Notes

- No restrictions on referral count (per user request)
- Display referral stats everywhere in UI
- Both code and link supported
- Revenue share: 20% USDC + 10 ROXN fixed