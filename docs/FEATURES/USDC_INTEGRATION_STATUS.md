# USDC Integration Status

## ✅ Completed

### 1. Smart Contract
- **Deployed**: `USDCRepoRewards.sol` at `0x9C4b4545d4eff6B4DdF287Dcb5c619498e384d2a`
- **Features**: Fund repositories, allocate rewards, distribute rewards
- **Status**: Ready to use

### 2. Configuration
- **Added to `.env`**: `USDC_REWARDS_CONTRACT_ADDRESS=0x9C4b4545d4eff6B4DdF287Dcb5c619498e384d2a`
- **Config.ts**: Added `usdcRewardsContractAddress` and `usdcTokenAddress`
- **Status**: ✅ Complete

### 3. Backend - blockchain.ts
- **Added**: USDC contract ABI import
- **Added**: USDC contract instance (`this.usdcContract`)
- **Added**: USDC token instance (`this.usdcTokenContract`)
- **Status**: ✅ Initialized

## 🚧 Remaining Work

### Backend Functions Needed

Need to add these methods to `BlockchainService` class in `blockchain.ts`:

```typescript
// 1. Fund USDC to repository
async addUSDCFundToRepository(repoId: number, usdcAmount: string, userAddress: string) {
    // Approve USDC transfer
    // Call usdcContract.fundRepository()
}

// 2. Allocate USDC reward to issue
async allocateUSDCIssueReward(repoId: number, issueId: number, reward: string) {
    // Call usdcContract.allocateReward()
}

// 3. Distribute USDC reward
async distributeUSDCReward(repoId: number, issueId: number, contributorAddress: string) {
    // Call usdcContract.distributeReward()
}

// 4. Get USDC pool balance
async getUSDCPoolBalance(repoId: number): Promise<string> {
    // Call usdcContract.getRepositoryPool()
}

// 5. Modify getRepository() to merge USDC data
async getRepository(repoId: number) {
    const xdcRoxnData = await this.contract.getRepository(repoId);
    let usdcPool = '0';
    if (this.usdcContract) {
        usdcPool = await this.usdcContract.getRepositoryPool(repoId);
    }
    return { ...xdcRoxnData, poolRewardsUSDC: usdcPool };
}
```

### Backend Routes (routes.ts)

Already exists but may need to route to correct contract:
- `/api/blockchain/fund-usdc/:repoId` → use USDC contract
- `/api/blockchain/allocate-unified/:repoId/:issueId` → check currency type, route to USDC if needed

### Frontend Updates

**Files to modify:**
1. `client/src/components/repo-rewards.tsx` - Add USDC funding UI
2. `client/src/components/set-reward-modal.tsx` - Add USDC to currency dropdown
3. `client/src/lib/blockchain.ts` - Add USDC API calls

## Testing Checklist

- [ ] Fund a test repository with USDC
- [ ] Allocate USDC bounty to issue
- [ ] Distribute USDC reward
- [ ] Verify XDC/ROXN repos still work
- [ ] Check merged data display (XDC + ROXN + USDC)

## Architecture

```
Old System (XDC/ROXN):
Contract: 0x53A28e4F696E16ABd4F4e5D5B4f47b8b5190d170
- 6 funded repositories preserved
- Working perfectly, don't touch

New System (USDC):
Contract: 0x9C4b4545d4eff6B4DdF287Dcb5c619498e384d2a
- Fresh start, clean state
- Parallel to old system
```

