# Subscription Feature Implementation Summary

## Overview

Implemented a **10 USDC/year subscription** system for Roxonn courses with the following features:
- Onramp Merchant Checkout integration for payments
- Automatic subscription activation via webhooks
- Secure Azure Blob video delivery with SAS URLs
- Subscription status tracking and gating

## What Was Implemented

### 1. Database Schema (`shared/schema.ts` + `migrations/0013_add_subscriptions.sql`)

**New Tables:**
- `subscriptions`: Stores user subscription records
  - Fields: id, userId, plan, status, currentPeriodStart, currentPeriodEnd, provider, providerOrderId, txHash, amountUsdc, metadata
  - Indexes on userId and status for fast lookups
  
- `subscription_events`: Audit log for subscription lifecycle
  - Fields: id, subscriptionId, eventType, metadata, createdAt
  - Tracks: created, renewed, canceled, expired events

### 2. Backend Services

#### SubscriptionService (`server/subscriptionService.ts`)
- `createSubscription()`: Create new subscription record
- `activateOrRenewSubscription()`: Activate or extend subscription by 1 year
- `getSubscriptionStatus()`: Check if user has active subscription
- `expireSubscription()`: Mark subscription as expired
- `cancelSubscription()`: Cancel subscription
- `markExpiredSubscriptions()`: Batch expire (for cron)

#### OnrampMerchantService (`server/onrampMerchant.ts`)
- `buildMerchantCheckoutConfig()`: Generate widget config with treasury address
- `generateMerchantRecognitionId()`: Create unique ID format `roxonn-sub-{userId}-{timestamp}`
- `isSuccessStatus()`: Map Onramp status codes to success/failure
- `validateTreasuryAddress()`: Verify payment went to correct wallet
- `extractUserIdFromMerchantId()`: Parse user ID from merchant recognition ID
- `isSubscriptionMerchantId()`: Check if transaction is subscription-related

### 3. API Endpoints (`server/routes.ts`)

**New Routes:**
- `POST /api/subscription/merchant/init`: Initialize merchant checkout widget
  - Returns: appId, walletAddress, coinCode, network, fiatAmount, merchantRecognitionId, etc.
  - Auth: Required + CSRF
  
- `GET /api/subscription/status`: Get user's subscription status
  - Returns: active (boolean), periodEnd (date), subscription details
  - Auth: Required + CSRF
  
- `GET /api/courses/:courseId/videos`: Get video URLs with subscription gating
  - Returns: shortVideoUrl (always), longVideoUrl (if subscribed), poster, hasAccess
  - Auth: Required + CSRF

**Updated Routes:**
- `POST /api/webhook/onramp-money`: Extended to handle subscription payments
  - Checks if merchantRecognitionId starts with `roxonn-sub-`
  - Validates success status
  - Calls `activateOrRenewSubscription()` on success
  - Logs warning if payment to non-treasury address

### 4. Azure Media Service (`server/azure-media.ts`)

**Security Improvements:**
- Moved hardcoded storage key to environment variable
- Reduced SAS URL expiry from 4 hours to 1 hour
- Added `getCourseVideoUrlsWithGating()` function for subscription-based access
- Returns short video (promo) for all users, long video only for subscribers

### 5. Configuration (`server/config.ts`)

**New Environment Variables:**
- `PLATFORM_TREASURY_ADDRESS_XDC`: Treasury wallet for receiving payments
- `SUBSCRIPTION_PRICE_USDC`: Price in USDC (default: 10)
- `ONRAMP_MERCHANT_APP_ID`: Merchant checkout app ID
- `ONRAMP_MERCHANT_LOGO_URL`: Logo for payment widget
- `ONRAMP_FIAT_TYPE`: Fiat currency type (1=INR)
- `AZURE_STORAGE_ACCOUNT`: Azure storage account name
- `AZURE_STORAGE_KEY`: Azure storage access key (sensitive)

### 6. Frontend Components

#### SubscriptionPayButton (`client/src/components/subscription-pay-button.tsx`)
- Loads Onramp SDK dynamically
- Initializes merchant checkout widget
- Listens to TX_EVENTS and WIDGET_EVENTS
- Polls `/api/subscription/status` after payment completion
- Shows loading/processing states

#### Updated Courses Page (`client/src/pages/courses-page.tsx`)
- Fetches and displays subscription status
- Shows subscription card with:
  - Pricing (10 USDC/year)
  - Benefits list (courses, mentorship, community, assignments)
  - Pay button (if not subscribed)
  - Active status (if subscribed)
- Handles subscription success callback

#### Updated Course Pages (`client/src/pages/bolt-new.tsx`, `v0-dev.tsx`)
- Fetch videos from backend API instead of hardcoded URLs
- Receive SAS URLs with 1-hour expiration
- Display promo video if not subscribed
- Display full video if subscribed

## Architecture Flow

### Payment Flow
```
1. User clicks "Pay 10 USDC / Year"
2. Frontend calls POST /api/subscription/merchant/init
3. Backend generates merchant recognition ID: roxonn-sub-{userId}-{timestamp}
4. Backend returns widget config with treasury address
5. Frontend shows Onramp overlay
6. User completes payment on Onramp
7. Onramp sends webhook to /api/webhook/onramp-money
8. Backend verifies signature
9. Backend checks if merchantRecognitionId starts with "roxonn-sub-"
10. Backend validates success status
11. Backend calls subscriptionService.activateOrRenewSubscription()
12. Subscription record created/updated with status=active, periodEnd=now+1year
13. Frontend polls /api/subscription/status
14. Frontend detects active=true and updates UI
```

### Video Access Flow
```
1. User navigates to /courses/bolt-new
2. Frontend calls GET /api/courses/bolt-new/videos
3. Backend checks subscription status
4. Backend generates SAS URLs:
   - Short video (promo): Always generated
   - Long video (full): Only if subscribed
5. Backend returns URLs with 1-hour expiration
6. Frontend loads video with SAS URL
7. Azure Blob Storage validates SAS token
8. Video streams to user
9. SAS URL expires after 1 hour
10. User must refresh page to get new SAS URL
```

## Security Features

1. **Webhook Verification**: HMAC-SHA512 signature validation
2. **Treasury Validation**: Warns if payment to wrong address
3. **SAS URLs**: Short-lived (1 hour), read-only access
4. **Private Containers**: Azure blobs not publicly accessible
5. **CSRF Protection**: All mutation endpoints protected
6. **Authentication**: All endpoints require user login

## Files Modified

### Backend
- `shared/schema.ts`: Added subscriptions and subscription_events tables
- `server/subscriptionService.ts`: New service for subscription management
- `server/onrampMerchant.ts`: New service for merchant checkout
- `server/config.ts`: Added new environment variables
- `server/azure-media.ts`: Moved key to env, added gating function
- `server/routes.ts`: Added 3 new endpoints, extended webhook
- `migrations/0013_add_subscriptions.sql`: New migration file

### Frontend
- `client/src/components/subscription-pay-button.tsx`: New payment button component
- `client/src/pages/courses-page.tsx`: Added subscription UI
- `client/src/pages/bolt-new.tsx`: Updated to fetch videos from API
- `client/src/pages/v0-dev.tsx`: Updated to fetch videos from API

### Documentation
- `ENV_VARIABLES_NEEDED.md`: Environment variable reference
- `SUBSCRIPTION_TESTING_GUIDE.md`: Testing procedures
- `SUBSCRIPTION_DEPLOYMENT_GUIDE.md`: Deployment checklist
- `SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md`: This file

## Dependencies

**New NPM Package:**
- `@onramp.money/onramp-web-sdk`: For merchant checkout overlay

**Existing Packages Used:**
- `@azure/storage-blob`: For SAS URL generation
- `ethers`: For address formatting
- `crypto`: For HMAC signature verification

## Configuration Required

Before deployment, configure:

1. **Onramp.money**
   - Obtain merchant app ID
   - Register webhook URL
   - Test in sandbox mode

2. **Treasury Wallet**
   - Create/designate XDC wallet
   - Secure private keys
   - Monitor balance

3. **Azure Storage**
   - Add storage key to environment
   - Set containers to private
   - Rotate keys regularly

4. **Database**
   - Apply migration
   - Verify indexes created
   - Test queries

## Testing Status

- ✅ Backend services implemented
- ✅ API endpoints created
- ✅ Frontend UI implemented
- ✅ Video gating implemented
- ⏳ End-to-end testing (pending sandbox access)
- ⏳ Production deployment (pending testing)

## Next Steps

1. **Testing** (TODO: testing-sandbox)
   - Follow `SUBSCRIPTION_TESTING_GUIDE.md`
   - Test in Onramp sandbox
   - Verify webhook flow
   - Test video access gating

2. **Deployment** (TODO: deploy-rollout)
   - Follow `SUBSCRIPTION_DEPLOYMENT_GUIDE.md`
   - Apply database migration
   - Configure environment variables
   - Set Azure containers to private
   - Deploy to production
   - Monitor metrics

## Metrics to Track

### Business Metrics
- Total subscriptions
- Active subscriptions
- Conversion rate (visits → payments)
- Monthly recurring revenue
- Churn rate

### Technical Metrics
- API response times
- Webhook processing time
- SAS URL generation success rate
- Video playback errors
- Payment success rate

## Support Contacts

- **Onramp.money**: support@onramp.money
- **Azure Support**: Azure Portal
- **Internal**: #engineering Slack channel

## License & Credits

- Implemented by: Cursor AI Assistant
- Date: November 4, 2025
- License: MIT (as per project license)

---

## Quick Reference

### Key Merchant Recognition ID Format
```
roxonn-sub-{userId}-{timestamp}
```

### Subscription Duration
```
1 year from activation/renewal date
```

### Payment Amount
```
10 USDC on XDC Network
```

### SAS URL Expiration
```
1 hour from generation
```

### Webhook Signature
```
HMAC-SHA512 using ONRAMP_MONEY_APP_SECRET_KEY
```

---

**Status**: ✅ Implementation Complete | ⏳ Testing Pending | ⏳ Deployment Pending

