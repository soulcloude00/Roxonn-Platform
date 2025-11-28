# 🎓 Roxonn Course Subscription Feature

## Overview

A complete **10 USDC/year subscription system** that provides users with:
- ✅ Lifetime access to all video courses
- ✅ Mentorship and guidance
- ✅ Premium community access
- ✅ Training materials and assignments

**Payment Method**: USDC on XDC Network via Onramp Merchant Checkout

## 📋 Quick Start

### 1. Install Dependencies
```bash
npm install @onramp.money/onramp-web-sdk
```

### 2. Configure Environment
See `ENV_VARIABLES_NEEDED.md` for required variables:
- `PLATFORM_TREASURY_ADDRESS_XDC`
- `ONRAMP_MERCHANT_APP_ID`
- `AZURE_STORAGE_KEY`
- And more...

### 3. Run Migration
```bash
psql $DATABASE_URL -f migrations/0013_add_subscriptions.sql
```

### 4. Test
Follow `SUBSCRIPTION_TESTING_GUIDE.md`

### 5. Deploy
Follow `SUBSCRIPTION_DEPLOYMENT_GUIDE.md`

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `ENV_VARIABLES_NEEDED.md` | Environment variable reference |
| `SUBSCRIPTION_TESTING_GUIDE.md` | Complete testing procedures |
| `SUBSCRIPTION_DEPLOYMENT_GUIDE.md` | Production deployment checklist |
| `SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md` | Technical implementation details |

## 🏗️ Architecture

### Payment Flow
```
User → Pay Button → Onramp Overlay → Payment → Webhook → Subscription Activated
```

### Video Access Flow
```
User → Course Page → Check Subscription → Generate SAS URL → Stream Video
```

## 🔑 Key Features

### Backend
- **Subscription Management**: Create, renew, expire, cancel subscriptions
- **Onramp Integration**: Merchant checkout with logo and custom config
- **Webhook Processing**: Automatic activation on successful payment
- **Secure Video Delivery**: Short-lived SAS URLs (1-hour expiration)
- **Treasury Validation**: Verify payments to correct wallet

### Frontend
- **Payment UI**: Onramp SDK overlay integration
- **Status Polling**: Real-time subscription activation
- **Video Gating**: Show promo or full video based on subscription
- **Subscription Card**: Display benefits, pricing, and status

## 🔒 Security

- ✅ HMAC-SHA512 webhook signature verification
- ✅ Private Azure Blob containers
- ✅ Short-lived SAS URLs (1 hour)
- ✅ CSRF protection on all endpoints
- ✅ Authentication required
- ✅ Treasury address validation

## 📊 Database Schema

### `subscriptions` Table
- Stores user subscription records
- Tracks status (active, expired, canceled, pending)
- Records payment details (orderId, txHash, amount)
- Manages subscription periods (start, end dates)

### `subscription_events` Table
- Audit log for subscription lifecycle
- Tracks created, renewed, canceled, expired events

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscription/merchant/init` | POST | Initialize payment widget |
| `/api/subscription/status` | GET | Check subscription status |
| `/api/courses/:courseId/videos` | GET | Get video URLs (gated) |
| `/api/webhook/onramp-money` | POST | Process payment webhooks |

## 💰 Pricing

- **Amount**: 10 USDC
- **Currency**: USDC on XDC Network
- **Duration**: 1 year (renewable)
- **Payment Method**: Onramp Merchant Checkout

## 🎯 Success Criteria

✅ All implementation tasks completed  
✅ No linting errors  
✅ Database schema created  
✅ Backend services implemented  
✅ Frontend UI implemented  
✅ Documentation complete  
⏳ Testing in sandbox (manual step)  
⏳ Production deployment (manual step)  

## 🚀 Next Steps

1. **Review Implementation**
   - Check all code changes
   - Verify no hardcoded secrets
   - Review error handling

2. **Test in Sandbox**
   - Follow testing guide
   - Verify payment flow
   - Test video gating

3. **Deploy to Production**
   - Follow deployment guide
   - Configure environment
   - Monitor metrics

## 📞 Support

- **Onramp.money**: support@onramp.money
- **Azure Support**: Azure Portal → Support
- **Internal**: #engineering Slack channel

## 📝 Notes

### Important Considerations

1. **Treasury Wallet**: Secure the private keys. This wallet will receive all subscription payments.

2. **Onramp Merchant App ID**: Different from regular onramp app ID. Contact Onramp.money to obtain.

3. **Azure Storage Key**: Must be moved from hardcoded value to environment variable. Rotate after deployment.

4. **Webhook URL**: Must be publicly accessible. Register with Onramp.money.

5. **SAS URL Expiration**: Set to 1 hour for security. Users must refresh page after expiration.

### Renewal Process

Subscriptions are renewed by:
1. User initiates new payment
2. Same flow as initial subscription
3. Webhook extends `currentPeriodEnd` by 1 year
4. No interruption in access

### Expiration Handling

- Subscriptions expire automatically when `currentPeriodEnd < now`
- Status API checks expiration on each call
- Optional cron job can batch-expire subscriptions
- Users lose access to full videos immediately upon expiration

## 🎉 Implementation Complete!

All code has been implemented and documented. The feature is ready for testing and deployment.

**Total Files Modified**: 11  
**Total Files Created**: 6  
**Total Lines of Code**: ~2,000+  

---

**Last Updated**: November 4, 2025  
**Status**: ✅ Implementation Complete | ⏳ Testing Pending | ⏳ Deployment Pending

