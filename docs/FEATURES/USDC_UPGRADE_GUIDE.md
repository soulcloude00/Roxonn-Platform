# USDC Support Upgrade Guide

## ✅ All Changes Complete!

This guide will help you upgrade the smart contract and test the new USDC functionality.

## 🎯 What's Been Implemented

### Smart Contract (DualCurrencyRepoRewards.sol)
- ✅ Added `CurrencyType` enum (XDC, ROXN, USDC)
- ✅ Added `poolRewardsUSDC` storage variable
- ✅ Added `usdcToken` ERC20 interface
- ✅ Added `addUSDCFundToRepository()` function
- ✅ Updated `allocateIssueReward()` to accept CurrencyType
- ✅ Updated `distributeReward()` to handle USDC distributions
- ✅ Added `updateUSDCTokenAddress()` admin function
- ✅ Updated getter functions for USDC pool balance

### Backend
- ✅ Updated `blockchain.ts` service with USDC methods
- ✅ Added `/api/blockchain/fund-usdc/:repoId` endpoint
- ✅ Updated `/api/blockchain/allocate-bounty` to accept `currencyType`
- ✅ Updated schemas to use `currencyType` enum

### Frontend
- ✅ Updated `blockchainApi.fundRepositoryWithUsdc()`
- ✅ Updated `blockchainApi.allocateUnifiedBounty()` to use currencyType
- ✅ Updated `set-reward-modal.tsx` with USDC support (already had USDC in UI!)
- ✅ Updated `repo-rewards.tsx` with USDC funding mutations

## 📋 Step-by-Step Upgrade Process

### Step 1: Compile the Updated Contract

```bash
cd /home/ubuntu/.cursor/worktrees/GitHubIdentity__SSH__15.206.189.212_/ot4rg
npx hardhat compile
```

### Step 2: Run the Upgrade Script

The upgrade script will:
1. Deploy the new implementation with USDC support
2. Upgrade the proxy to point to the new implementation
3. Automatically set the USDC token address if not already set

```bash
npx hardhat run scripts/upgrade_repo_rewards.cjs --network xinfin
```

### Step 3: Verify the Upgrade

The script will output verification details. You should see:
- ✅ New implementation address
- ✅ USDC token address set to: `0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1`
- ✅ All existing state preserved (XDC and ROXN pools intact)

### Step 4: Restart the Backend Server

```bash
# If using PM2
pm2 restart all

# Or if running manually
# Stop the server (Ctrl+C) and restart it
```

### Step 5: Test USDC Functionality

#### Test 1: Fund a Repository with USDC
1. Go to `https://app.roxonn.com/repos`
2. Select a repository you manage
3. Click "Fund Repository"
4. Select **USDC** tab
5. Enter amount (e.g., 10 USDC)
6. Click "Approve USDC" (first time only)
7. Click "Add USDC Funds"
8. Check transaction on XDCScan

#### Test 2: Allocate USDC Bounty to an Issue
1. Go to the repository's issues
2. Click "Set Bounty" on an issue
3. Select **USDC** from currency dropdown
4. Enter bounty amount
5. Click "Assign Bounty"
6. Verify the bounty shows in USDC

#### Test 3: Distribute USDC Bounty
1. When PR is merged, bounty should be distributed in USDC
2. Check contributor's wallet for USDC tokens

## 🔍 Verification Checklist

- [ ] Contract compiled successfully
- [ ] Upgrade script completed without errors
- [ ] USDC token address is set
- [ ] Backend server restarted
- [ ] Frontend shows USDC option in funding UI
- [ ] Frontend shows USDC option in bounty allocation
- [ ] Can approve USDC tokens
- [ ] Can fund repository with USDC
- [ ] Can allocate USDC bounties
- [ ] USDC pool balance displays correctly

## 🚨 Important Notes

### USDC Contract Address on XDC Network
```
0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1
```

### Gas Considerations
- USDC operations require XDC for gas (same as ROXN)
- Pool managers need XDC in their wallet for gas fees
- Approval transaction is needed before first USDC funding

### State Preservation
- All existing XDC and ROXN pools remain intact
- All existing bounties remain unchanged
- This is a non-breaking upgrade

## 🐛 Troubleshooting

### Issue: "USDC token not set" error
**Solution:** The upgrade script should set this automatically. If not:
```bash
# Manually set USDC address (owner only)
npx hardhat run scripts/set_usdc_address.cjs --network xinfin
```

### Issue: "Insufficient USDC balance" when funding
**Solution:** Pool manager needs to have USDC tokens. Buy USDC via:
- Onramp.money (https://app.roxonn.com/wallet → "Buy USDC on XDC with INR")
- Or swap XDC for USDC on a DEX

### Issue: Frontend doesn't show USDC option
**Solution:** 
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

## 📊 Expected Behavior After Upgrade

### Pool Manager Dashboard
- Should see 3 tabs: **XDC**, **ROXN**, **USDC**
- Each tab shows respective pool balance
- Funding forms work for all three currencies

### Issue Bounty Modal
- Currency dropdown shows: XDC, ROXN, USDC
- Pool balance updates for selected currency
- Min/max validation works for each currency

### Bounty Distribution
- Contributors receive bounties in the allocated currency
- USDC bounties go to contributor's wallet as USDC tokens

## 🎉 Success Criteria

✅ Contract upgrade successful
✅ USDC funding works end-to-end
✅ USDC bounty allocation works
✅ USDC bounty distribution works
✅ All existing functionality remains intact
✅ No breaking changes to XDC or ROXN flows

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the backend logs: `pm2 logs`
3. Verify the contract on XDCScan
4. Check transaction history on XDCScan

---

**Ready to upgrade? Run Step 1 above!** 🚀

