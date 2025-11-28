# Subscription Feature Deployment Guide

This guide covers deploying the subscription feature to production.

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All code changes reviewed and approved
- [ ] No hardcoded secrets or keys in code
- [ ] Error handling implemented for all API endpoints
- [ ] Logging added for critical operations
- [ ] No linter errors

### 2. Database Preparation
- [ ] Migration file reviewed: `migrations/0013_add_subscriptions.sql`
- [ ] Backup current production database
- [ ] Test migration on staging database
- [ ] Verify rollback procedure

### 3. Environment Configuration
- [ ] Production treasury wallet created and secured
- [ ] Onramp.money production merchant app ID obtained
- [ ] Azure Storage production key rotated
- [ ] All environment variables documented

### 4. Third-Party Services
- [ ] Onramp.money webhook URL registered
- [ ] Azure Blob containers set to private
- [ ] Test webhook from Onramp.money to production
- [ ] Verify treasury wallet can receive USDC on XDC

## Deployment Steps

### Step 1: Update Environment Variables

Add to production `.env` file:

```bash
# Subscription Settings
PLATFORM_TREASURY_ADDRESS_XDC=xdc_production_treasury_address
SUBSCRIPTION_PRICE_USDC=10
ONRAMP_MERCHANT_APP_ID=production_merchant_app_id
ONRAMP_MERCHANT_LOGO_URL=https://roxonn.com/logo.png
ONRAMP_FIAT_TYPE=1

# Azure Storage
AZURE_STORAGE_ACCOUNT=blobvideohostcoursepage
AZURE_STORAGE_KEY=production_azure_key
```

**Security Notes:**
- Store these in AWS Parameter Store or similar secret manager
- Never commit to git
- Rotate keys regularly
- Use different values for staging/production

### Step 2: Run Database Migration

```bash
# Backup production database first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migration
psql $DATABASE_URL -f migrations/0013_add_subscriptions.sql

# Verify tables created
psql $DATABASE_URL -c "\dt subscriptions"
psql $DATABASE_URL -c "\dt subscription_events"

# Check indexes
psql $DATABASE_URL -c "\di subscriptions*"
```

### Step 3: Install NPM Dependencies

```bash
# Install Onramp SDK
npm install @onramp.money/onramp-web-sdk

# Rebuild
npm run build
```

### Step 4: Deploy Backend

```bash
# Build server
npm run build

# Deploy (example using PM2)
pm2 stop roxonn-server
pm2 start dist/index.js --name roxonn-server
pm2 save

# Verify server started
pm2 logs roxonn-server --lines 50
```

### Step 5: Deploy Frontend

```bash
# Frontend is bundled with backend in this setup
# Already deployed in Step 4

# Verify static assets
curl https://yourdomain.com/favicon.png
```

### Step 6: Configure Azure Blob Storage

#### Set Containers to Private

```bash
# Using Azure CLI
az storage container set-permission \
  --name bolt-new-shortvideo \
  --public-access off \
  --account-name blobvideohostcoursepage

az storage container set-permission \
  --name bolt-new-longvideo-faststart \
  --public-access off \
  --account-name blobvideohostcoursepage

az storage container set-permission \
  --name v0-dev-shortvideo \
  --public-access off \
  --account-name blobvideohostcoursepage

az storage container set-permission \
  --name v0-dev-longvideo-faststart \
  --public-access off \
  --account-name blobvideohostcoursepage
```

#### Rotate Storage Key

1. Go to Azure Portal → Storage Account
2. Navigate to "Access keys"
3. Click "Rotate key" for key1 or key2
4. Update `AZURE_STORAGE_KEY` in production environment
5. Restart server

### Step 7: Register Webhook with Onramp.money

Contact Onramp.money support to register webhook:

```
Webhook URL: https://api.roxonn.com/api/webhook/onramp-money
Method: POST
Headers: X-Signature (HMAC-SHA512)
```

Provide them with:
- Production merchant app ID
- Webhook URL
- Expected signature format

### Step 8: Verify Deployment

#### Health Check
```bash
curl https://api.roxonn.com/health
# Should return 200 OK
```

#### API Endpoints
```bash
# Test subscription status (requires auth)
curl https://api.roxonn.com/api/subscription/status \
  -H "Cookie: connect.sid=..." \
  -H "X-CSRF-Token: ..."

# Test course videos (requires auth)
curl https://api.roxonn.com/api/courses/bolt-new/videos \
  -H "Cookie: connect.sid=..." \
  -H "X-CSRF-Token: ..."
```

#### Frontend
1. Visit https://roxonn.com/courses
2. Verify subscription card displays
3. Check payment button loads
4. Verify course pages load

### Step 9: Test End-to-End in Production

#### Small Test Payment
1. Create a test account
2. Navigate to courses page
3. Click "Pay 10 USDC / Year"
4. Complete payment with small amount (if possible in production)
5. Verify webhook received
6. Check subscription activated
7. Verify video access granted

#### Monitor Logs
```bash
# Watch logs in real-time
pm2 logs roxonn-server --lines 100

# Filter for subscription logs
pm2 logs roxonn-server | grep subscription

# Check for errors
pm2 logs roxonn-server | grep ERROR
```

## Post-Deployment Monitoring

### Key Metrics

1. **Subscription Metrics**
   - Total subscriptions created
   - Active subscriptions
   - Conversion rate
   - Revenue (10 USDC × active subscriptions)

2. **Technical Metrics**
   - API response times
   - Webhook processing time
   - SAS URL generation success rate
   - Video playback errors

3. **Error Rates**
   - Payment failures
   - Webhook signature failures
   - Azure SAS generation errors
   - Database errors

### Monitoring Queries

```sql
-- Total active subscriptions
SELECT COUNT(*) FROM subscriptions 
WHERE status = 'active' 
AND current_period_end > NOW();

-- Subscriptions by day
SELECT DATE(created_at) as date, COUNT(*) as count
FROM subscriptions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Recent subscription events
SELECT se.*, s.user_id, s.status
FROM subscription_events se
JOIN subscriptions s ON se.subscription_id = s.id
ORDER BY se.created_at DESC
LIMIT 20;

-- Failed/pending subscriptions
SELECT * FROM subscriptions
WHERE status IN ('pending', 'canceled')
ORDER BY created_at DESC;
```

### Alert Setup

Set up alerts for:
- Webhook failures (> 5% error rate)
- Payment processing delays (> 1 minute)
- Azure SAS generation failures
- Database connection errors
- High API latency (> 2 seconds)

## Rollback Procedure

If critical issues arise:

### 1. Immediate Rollback

```bash
# Stop current server
pm2 stop roxonn-server

# Revert to previous version
git checkout previous_commit_hash
npm run build
pm2 start dist/index.js --name roxonn-server

# Or restore from backup
pm2 start backup/previous_version/dist/index.js --name roxonn-server
```

### 2. Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Or manually drop tables
psql $DATABASE_URL -c "DROP TABLE IF EXISTS subscription_events CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS subscriptions CASCADE;"
```

### 3. Revert Environment Variables

Remove new environment variables and restart server.

### 4. Notify Users

If subscriptions were activated:
- Keep subscriptions active
- Refund if necessary
- Communicate via email

## Security Considerations

### 1. Webhook Security
- Verify HMAC signature on every webhook
- Log all webhook attempts
- Rate limit webhook endpoint
- Monitor for replay attacks

### 2. Treasury Wallet
- Use hardware wallet or multi-sig
- Monitor balance regularly
- Set up alerts for large transactions
- Keep backup of private keys offline

### 3. Azure Storage
- Rotate keys every 90 days
- Monitor access logs
- Use SAS URLs with minimal permissions (read-only)
- Set short expiration times (1 hour)

### 4. Environment Variables
- Use secret manager (AWS Parameter Store, etc.)
- Never log sensitive values
- Rotate regularly
- Audit access

## Maintenance

### Weekly Tasks
- [ ] Review subscription metrics
- [ ] Check error logs
- [ ] Verify webhook processing
- [ ] Monitor treasury wallet balance

### Monthly Tasks
- [ ] Review and optimize database queries
- [ ] Check SAS URL expiration patterns
- [ ] Analyze conversion funnel
- [ ] Review and update pricing if needed

### Quarterly Tasks
- [ ] Rotate Azure Storage keys
- [ ] Security audit
- [ ] Performance review
- [ ] User feedback analysis

## Support & Troubleshooting

### Common Issues

**Issue: Webhook not received**
- Check Onramp.money webhook configuration
- Verify URL is accessible from internet
- Check firewall rules
- Review server logs

**Issue: Subscription not activating**
- Check webhook signature
- Verify merchant recognition ID format
- Check database connectivity
- Review subscription service logs

**Issue: Videos not loading**
- Verify Azure Storage key is valid
- Check SAS URL generation
- Verify container permissions
- Check network connectivity

### Getting Help

- **Onramp.money Support**: support@onramp.money
- **Azure Support**: Azure Portal → Support
- **Internal Team**: Check Slack #engineering channel

## Success Metrics

After 1 week:
- ✅ 0 critical errors
- ✅ > 95% webhook success rate
- ✅ > 99% video playback success
- ✅ < 2s average API response time

After 1 month:
- ✅ > 10 active subscriptions
- ✅ > 5% conversion rate
- ✅ 0 security incidents
- ✅ Positive user feedback

## Completion

Once deployment is successful and monitoring is in place:

```bash
# Mark deployment todo as completed
# Update TODOS in project management system
```

Congratulations! The subscription feature is now live in production. 🎉

