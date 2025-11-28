# Dual Contract Setup - XDC/ROXN + USDC

## Overview

To preserve all existing funded repositories while adding USDC support, we now use TWO separate contracts:

### Contract 1: DualCurrencyRepoRewards (Existing - XDC + ROXN)
- **Address**: `0x53A28e4F696E16ABd4F4e5D5B4f47b8b5190d170`
- **Handles**: XDC and ROXN rewards
- **Status**: Working, 6 funded repositories preserved
- **DO NOT MODIFY**: Any changes break existing funded repos

### Contract 2: USDCRepoRewards (New - USDC Only)
- **Address**: `0x9C4b4545d4eff6B4DdF287Dcb5c619498e384d2a`
- **Handles**: USDC rewards only
- **Status**: Deployed and ready
- **Contract**: `/contracts/USDCRepoRewards.sol`

## How It Works

1. **For XDC/ROXN funding**: Use existing `DualCurrencyRepoRewards` contract
2. **For USDC funding**: Use new `USDCRepoRewards` contract
3. **Frontend**: Show all three currency options, route to appropriate contract
4. **Backend**: Check both contracts when displaying repository funds

## Integration Steps

### Backend (server/blockchain.ts)

Need to add parallel functions for USDC contract:

```typescript
// New function
async addUSDCFundToRepository(repoId, usdcAmount, userAddress) {
  const usdcContract = new ethers.Contract(
    process.env.USDC_REWARDS_CONTRACT_ADDRESS,
    USDCRepoRewardsABI,
    signer
  );
  // ... implementation
}

// Modify getRepository to merge data from both contracts
async getRepository(repoId) {
  const xdcRoxnData = await dualCurrencyContract.getRepository(repoId);
  const usdcPool = await usdcContract.getRepositoryPool(repoId);
  
  return {
    ...xdcRoxnData,
    poolRewardsUSDC: usdcPool
  };
}
```

### Frontend

- Keep existing XDC/ROXN UI unchanged
- Add USDC option that calls new contract
- Display combines data from both contracts

## Benefits

✅ All 6 existing XDC/ROXN funded repos remain intact and working  
✅ USDC support added without risk  
✅ Clean separation of concerns  
✅ Easy to test USDC independently  
✅ Can upgrade USDC contract without affecting XDC/ROXN  

## Deployed Contracts

- **DualCurrency (XDC/ROXN)**: `0x53A28e4F696E16ABd4F4e5D5B4f47b8b5190d170`
- **USDCRewards**: `0x9C4b4545d4eff6B4DdF287Dcb5c619498e384d2a`
- **USDC Token**: `0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1`
- **ROXN Token**: `0xA7147F59D90C1dcf680CE3B675Be4A729bAd7d3a`

## Testing

1. Fund a test repository with USDC using new contract
2. Allocate USDC bounty to an issue
3. Distribute USDC reward to contributor
4. Verify existing XDC/ROXN repos still work

