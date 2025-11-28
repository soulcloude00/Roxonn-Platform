# Subscription Feature Testing Guide

This guide walks through testing the 10 USDC yearly subscription feature end-to-end.

## Prerequisites

1. **Environment Variables Set**
   - All variables from `ENV_VARIABLES_NEEDED.md` are configured
   - Treasury address is set and accessible
   - Onramp Merchant App ID obtained
   - Azure Storage key configured

2. **Database Migration Applied**
   ```bash
   # Apply the subscription tables migration
   psql $DATABASE_URL -f migrations/0013_add_subscriptions.sql
   # Or use drizzle-kit
   npm run db:push
   ```

3. **Onramp.money SDK Installed**
   ```bash
   npm install @onramp.money/onramp-web-sdk
   ```

## Testing Checklist

### 1. Backend API Tests

#### Test Subscription Status Endpoint
```bash
# Should return active: false for new users
curl -X GET http://localhost:5000/api/subscription/status \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"

# Expected response:
# {"active":false,"periodEnd":null,"subscription":null}
```

#### Test Merchant Checkout Init
```bash
curl -X POST http://localhost:5000/api/subscription/merchant/init \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logoUrl":"http://localhost:5000/favicon.png"}'

# Expected response should include:
# {
#   "appId": "...",
#   "walletAddress": "0x...", (treasury address in 0x format)
#   "coinCode": "usdc",
#   "network": "xdc",
#   "fiatAmount": "10",
#   "merchantRecognitionId": "roxonn-sub-{userId}-{timestamp}",
#   ...
# }
```

#### Test Course Video Gating
```bash
# Without subscription - should only return short video
curl -X GET http://localhost:5000/api/courses/bolt-new/videos \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"

# Expected: shortVideoUrl present, longVideoUrl absent or same as short
# {"shortVideoUrl":"...?sas_token","longVideoUrl":null,"poster":"...","hasAccess":false}
```

### 2. Frontend UI Tests

#### Navigate to Courses Page
1. Go to `http://localhost:5000/courses`
2. Sign in with GitHub if not already signed in
3. Verify subscription card is displayed with:
   - "Annual Membership" title
   - Crown icon
   - "10 USDC per year" pricing
   - "Pay 10 USDC / Year" button
   - List of benefits (courses, mentorship, community, assignments)

#### Test Payment Flow (Sandbox)
1. Click "Pay 10 USDC / Year" button
2. Onramp overlay should appear with:
   - Logo displayed
   - 10 USDC amount
   - XDC network
   - Treasury wallet address
3. Complete payment in sandbox mode
4. After payment:
   - Button should show "Processing payment..."
   - Status should poll every second
   - Once activated, subscription card should update to show "Active subscription"

#### Test Video Access
1. **Before Subscription:**
   - Navigate to `/courses/bolt-new`
   - Should see promo video only
   - Full course video not accessible

2. **After Subscription:**
   - Navigate to `/courses/bolt-new`
   - Should see full course video
   - Video should load with SAS URL (check network tab)
   - SAS URL should expire in 1 hour

### 3. Webhook Tests

#### Test Webhook Signature Verification
```bash
# Generate HMAC-SHA512 signature
echo -n '{"merchantRecognitionId":"roxonn-sub-1-123","orderId":"test","statusCode":"4","status":"completed","walletAddress":"0x...","amount":"10","txHash":"0x..."}' | \
  openssl dgst -sha512 -hmac "YOUR_ONRAMP_APP_SECRET_KEY" -hex

# Send webhook with signature
curl -X POST http://localhost:5000/api/webhook/onramp-money \
  -H "Content-Type: application/json" \
  -H "X-Signature: GENERATED_SIGNATURE" \
  -d '{
    "merchantRecognitionId":"roxonn-sub-1-123",
    "orderId":"test-order-123",
    "statusCode":"4",
    "status":"completed",
    "walletAddress":"0xYOUR_TREASURY_ADDRESS",
    "amount":"10",
    "txHash":"0xtest-tx-hash"
  }'

# Expected: 200 OK, subscription activated in database
```

#### Verify Subscription Activation
```bash
# Check database
psql $DATABASE_URL -c "SELECT * FROM subscriptions WHERE user_id = 1;"

# Should show:
# - status: 'active'
# - current_period_end: 1 year from now
# - provider_order_id: 'test-order-123'
# - amount_usdc: '10'
```

### 4. Azure SAS URL Tests

#### Verify SAS URLs are Generated
1. Check network tab when loading course video
2. URL should match pattern:
   ```
   https://blobvideohostcoursepage.blob.core.windows.net/
   bolt-new-longvideo-faststart/Bolt-new-longvideo-faststart.mp4
   ?sv=...&se=...&sr=...&sp=r&sig=...
   ```
3. `se` parameter should be ~1 hour from now
4. `sp=r` indicates read-only permission

#### Test SAS URL Expiration
1. Copy a video SAS URL
2. Wait 1 hour
3. Try to access the URL directly
4. Should get 403 Forbidden after expiration

### 5. Subscription Renewal Tests

#### Test Yearly Renewal
```bash
# Simulate renewal webhook (same user, new order)
curl -X POST http://localhost:5000/api/webhook/onramp-money \
  -H "Content-Type: application/json" \
  -H "X-Signature: GENERATED_SIGNATURE" \
  -d '{
    "merchantRecognitionId":"roxonn-sub-1-456",
    "orderId":"renewal-order-456",
    "statusCode":"4",
    "status":"completed",
    "walletAddress":"0xYOUR_TREASURY_ADDRESS",
    "amount":"10",
    "txHash":"0xrenewal-tx-hash"
  }'

# Check database - current_period_end should extend by 1 year
```

### 6. Edge Cases

#### Test Invalid Merchant Recognition ID
```bash
# Send webhook with non-subscription merchant ID
curl -X POST http://localhost:5000/api/webhook/onramp-money \
  -H "Content-Type: application/json" \
  -H "X-Signature: GENERATED_SIGNATURE" \
  -d '{
    "merchantRecognitionId":"roxonn-123-456",
    "statusCode":"4",
    "status":"completed"
  }'

# Should process as regular transaction, not activate subscription
```

#### Test Failed Payment
```bash
# Send webhook with failed status
curl -X POST http://localhost:5000/api/webhook/onramp-money \
  -H "Content-Type: application/json" \
  -H "X-Signature: GENERATED_SIGNATURE" \
  -d '{
    "merchantRecognitionId":"roxonn-sub-1-789",
    "statusCode":"3",
    "status":"failed"
  }'

# Subscription should NOT be activated
```

#### Test Wrong Treasury Address
```bash
# Send webhook with different wallet address
curl -X POST http://localhost:5000/api/webhook/onramp-money \
  -H "Content-Type: application/json" \
  -H "X-Signature: GENERATED_SIGNATURE" \
  -d '{
    "merchantRecognitionId":"roxonn-sub-1-999",
    "statusCode":"4",
    "status":"completed",
    "walletAddress":"0xWRONG_ADDRESS"
  }'

# Should log warning but still activate (payment already processed)
# Check logs for: "Warning: Payment to non-treasury address"
```

## Monitoring

### Key Metrics to Track
1. Subscription conversion rate (visits to courses page → payments)
2. Payment success rate
3. Webhook processing time
4. SAS URL generation errors
5. Video playback errors

### Logs to Monitor
```bash
# Subscription-related logs
grep "subscription" server.log

# Onramp webhook logs
grep "onramp-merchant" server.log

# Azure media logs
grep "azure-media" server.log
```

## Troubleshooting

### Issue: Payment button doesn't show overlay
- Check browser console for SDK import errors
- Verify `@onramp.money/onramp-web-sdk` is installed
- Check merchant app ID is configured

### Issue: Subscription not activating after payment
- Check webhook logs for signature verification
- Verify treasury address matches
- Check merchant recognition ID format
- Verify database connection

### Issue: Videos not loading
- Check Azure Storage key is configured
- Verify SAS URL generation (check logs)
- Check blob container names match
- Verify network connectivity to Azure

### Issue: Full video not accessible after subscription
- Check subscription status API response
- Verify `hasAccess` flag in video response
- Check subscription expiration date
- Clear browser cache and retry

## Success Criteria

✅ User can view subscription pricing on courses page  
✅ Payment overlay loads with correct details  
✅ Payment completes successfully in sandbox  
✅ Webhook activates subscription automatically  
✅ Full course videos become accessible  
✅ SAS URLs expire after 1 hour  
✅ Subscription status persists across sessions  
✅ Renewal extends subscription period  

## Next Steps

After successful testing:
1. Update `testing-sandbox` todo to completed
2. Proceed to production deployment
3. Follow `SUBSCRIPTION_DEPLOYMENT_GUIDE.md`

