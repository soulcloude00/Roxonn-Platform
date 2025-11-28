# Wallet Address Format Update - XDC to 0x

**Date**: October 27, 2025  
**Status**: ✅ COMPLETE

---

## Issue

Onramp.money requires wallet addresses to start with `0x` prefix instead of `xdc` prefix.

**Problem**:
- XDC addresses: `xdc4873d2a7249c4cf59f38e66c78abde511ca75377`
- Onramp requires: `0x4873d2a7249c4cf59f38e66c78abde511ca75377`
- Error: "Wallet address is not valid"

---

## Solution

Added address format conversion in both buy and sell endpoints to convert XDC format to 0x format before sending to Onramp.money.

---

## Changes Made

### 1. Buy USDC Endpoint (`/api/wallet/buy-xdc-url`)

**File**: `server/routes.ts` (Lines 985-989)

**Added Conversion Logic**:
```typescript
// Convert XDC address format (xdc...) to 0x format for Onramp.money
// Onramp requires addresses to start with 0x, not xdc
const walletAddress = user.xdcWalletAddress.toLowerCase().startsWith('xdc')
  ? '0x' + user.xdcWalletAddress.substring(3)
  : user.xdcWalletAddress;
```

**Updated Parameters**:
```typescript
const params = new URLSearchParams({
  appId: config.onrampMoneyAppId,
  walletAddress: walletAddress,  // Now uses 0x format
  coinCode: 'usdc',
  chainId: '10518',
  fiatCode: 'INR'
});
```

**Updated Logging** (Line 1013):
```typescript
log(`...Address=${maskedAddress} (0x format)...`);
```

**Updated Metadata** (Line 1026):
```typescript
metadata: { 
  // ... other fields
  onrampWalletAddress: walletAddress // Store the 0x format used in Onramp
}
```

---

### 2. Sell/Withdraw USDC Endpoint (`/api/wallet/sell-xdc-url`)

**File**: `server/routes.ts` (Lines 1084-1088)

**Added Conversion Logic**:
```typescript
// Convert XDC address format (xdc...) to 0x format for Onramp.money
// Onramp requires addresses to start with 0x, not xdc
const walletAddress = user.xdcWalletAddress.toLowerCase().startsWith('xdc')
  ? '0x' + user.xdcWalletAddress.substring(3)
  : user.xdcWalletAddress;
```

**Updated Parameters**:
```typescript
const params = new URLSearchParams({
  appId: config.onrampMoneyAppId,
  walletAddress: walletAddress,  // Now uses 0x format
  coinCode: 'usdc',
  chainId: '10518',
  fiatCode: 'INR'
});
```

**Updated Logging** (Line 1112):
```typescript
log(`...Address=${maskedAddress} (0x format)...`);
```

**Updated Metadata** (Line 1126):
```typescript
metadata: { 
  // ... other fields
  onrampWalletAddress: walletAddress // Store the 0x format used in Onramp
}
```

---

## Conversion Logic Explained

### Input Formats Handled:
1. **XDC Format** (lowercase): `xdc4873d2a7249c4cf59f38e66c78abde511ca75377`
2. **XDC Format** (uppercase): `XDC4873d2a7249c4cf59f38e66c78abde511ca75377`
3. **Already 0x Format**: `0x4873d2a7249c4cf59f38e66c78abde511ca75377`

### Conversion Code:
```typescript
const walletAddress = user.xdcWalletAddress.toLowerCase().startsWith('xdc')
  ? '0x' + user.xdcWalletAddress.substring(3)
  : user.xdcWalletAddress;
```

### How It Works:
1. Convert address to lowercase for comparison
2. Check if it starts with 'xdc'
3. If yes: Replace 'xdc' with '0x' (take substring from index 3)
4. If no: Use address as-is (already in correct format)

### Examples:
| Input | Output |
|-------|--------|
| `xdc4873d2a7249c4cf59f38e66c78abde511ca75377` | `0x4873d2a7249c4cf59f38e66c78abde511ca75377` |
| `XDC4873d2a7249c4cf59f38e66c78abde511ca75377` | `0x4873d2a7249c4cf59f38e66c78abde511ca75377` |
| `0x4873d2a7249c4cf59f38e66c78abde511ca75377` | `0x4873d2a7249c4cf59f38e66c78abde511ca75377` |

---

## URL Comparison

### Before (Invalid)
```
https://onramp.money/main/buy/?appId={YOUR_APP_ID}
  &walletAddress=xdc4873d2a7249c4cf59f38e66c78abde511ca75377  ❌
  &coinCode=usdc
  &chainId=10518
  &fiatCode=INR
```

### After (Valid)
```
https://onramp.money/main/buy/?appId={YOUR_APP_ID}
  &walletAddress=0x4873d2a7249c4cf59f38e66c78abde511ca75377  ✅
  &coinCode=usdc
  &chainId=10518
  &fiatCode=INR
```

---

## Database Impact

### Transaction Metadata
The `onramp_transactions` table now stores both address formats:

```json
{
  "walletAddress": "xdc4873d2a7249c4cf59f38e66c78abde511ca75377",
  "metadata": {
    "onrampWalletAddress": "0x4873d2a7249c4cf59f38e66c78abde511ca75377",
    "currency": "USDC",
    "network": "XDC",
    "chainId": "10518"
  }
}
```

**Benefits**:
- `walletAddress`: Original XDC format (for internal use)
- `metadata.onrampWalletAddress`: 0x format (for Onramp.money tracking)
- Easy to debug and trace transactions

---

## Logging

### Updated Log Format

**Buy Endpoint**:
```
Generated Onramp.money URL for user 1, Address=0x4873...5377 (0x format), MerchantID=roxonn-1-1234567890, Currency=USDC on XDC
```

**Sell Endpoint**:
```
Generated Onramp.money Off-ramp URL for user 1, Address=0x4873...5377 (0x format), MerchantID=roxonn-offramp-1-1234567890, Currency=USDC on XDC
```

**Key Changes**:
- ✅ Address shown in 0x format (masked)
- ✅ Explicitly labeled "(0x format)"
- ✅ Clear indication of conversion

---

## Testing Checklist

### ✅ Address Conversion Tests
- [x] XDC format (lowercase) converts to 0x
- [x] XDC format (uppercase) converts to 0x
- [x] Already 0x format remains unchanged
- [x] Conversion preserves address integrity

### ✅ Buy Endpoint Tests
- [x] URL contains 0x address
- [x] Transaction metadata stores both formats
- [x] Logs show 0x format
- [x] No errors in address validation

### ✅ Sell Endpoint Tests
- [x] URL contains 0x address
- [x] Transaction metadata stores both formats
- [x] Logs show 0x format
- [x] USDC balance check still works with XDC format

### ✅ Code Quality
- [x] No linter errors
- [x] TypeScript compilation successful
- [x] Consistent implementation in both endpoints

---

## Security Considerations

### Address Integrity
- ✅ Conversion only affects prefix (xdc → 0x)
- ✅ Actual address hex remains unchanged
- ✅ No risk of address corruption

### Validation
- ✅ Case-insensitive check prevents issues
- ✅ Fallback to original if not XDC format
- ✅ Safe for all address formats

### Privacy
- ✅ Address still masked in logs
- ✅ Full 0x address never exposed in logs
- ✅ Original XDC address stored in database

---

## Compatibility

### XDC Network
- ✅ 0x and xdc formats are equivalent on XDC Network
- ✅ Same address, different notation
- ✅ USDC transactions work with both formats

### Onramp.money
- ✅ Requires 0x format for validation
- ✅ Recognizes address with chainId: 10518
- ✅ Sends USDC to correct address

### Internal Systems
- ✅ XDC format preserved in database
- ✅ Wallet service still uses XDC format
- ✅ Balance checks work with XDC format

---

## Rollback Plan

If issues arise, revert the conversion logic:

```typescript
// Remove these lines:
const walletAddress = user.xdcWalletAddress.toLowerCase().startsWith('xdc')
  ? '0x' + user.xdcWalletAddress.substring(3)
  : user.xdcWalletAddress;

// Replace with:
const walletAddress = user.xdcWalletAddress;
```

---

## Files Modified

1. ✅ `server/routes.ts`
   - Buy endpoint (Lines 985-989, 1012-1013, 1026)
   - Sell endpoint (Lines 1084-1088, 1111-1112, 1126)

---

## Success Criteria

- ✅ Onramp.money accepts the wallet address
- ✅ No "invalid wallet address" errors
- ✅ Buy flow completes successfully
- ✅ Sell/withdraw flow completes successfully
- ✅ USDC sent to correct address
- ✅ All logging and tracking work correctly

---

## Additional Notes

### Why This Works
XDC Network addresses can be represented in two formats:
- **XDC Format**: `xdc...` (XDC Network standard)
- **0x Format**: `0x...` (Ethereum-compatible format)

Both represent the same address. Onramp.money uses the Ethereum-compatible 0x format for consistency across multiple blockchain networks.

### No Frontend Changes Needed
The conversion happens entirely on the backend. Frontend code doesn't need any modifications.

---

## Conclusion

The wallet address format has been successfully updated to use the 0x prefix when communicating with Onramp.money, while maintaining the XDC format internally for database storage and wallet operations.

**Status**: ✅ Production Ready  
**Breaking Changes**: None  
**User Impact**: None (transparent conversion)

