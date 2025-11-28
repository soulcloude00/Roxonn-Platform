import { ethers } from 'ethers';
import { STAGING_API_URL, ROXN_TOKEN_ADDRESS } from '../config'; // Removed NEW_ROXN_REWARDS_CONTRACT_ADDRESS
import { invalidateWalletInfo } from './queryClient';
import csrfService from './csrf';
// Import new types from shared schema
import type { 
    UnifiedPoolInfo,    // Changed from NewRoxnPoolInfo
    IssueBountyDetails, // Changed from NewRoxnIssueBountyDetails
    // AllocateNewRoxnBountyResponse removed, will use a simpler custom type or inline
} from '@shared/schema';

// Custom response type for allocate bounty
export interface AllocateBountyResponse {
    message: string;
    transactionHash?: string;
    blockNumber?: number;
}

// This local interface might be replaced by UnifiedPoolInfo if structures match
// For now, keeping it if getRepository is still used with this structure elsewhere,
// but it should ideally align with UnifiedPoolInfo.
export interface Repository {
    poolManagers: string[];
    contributors: string[];
    poolRewards: string; // This was XDC specific, UnifiedPoolInfo has xdcPoolRewards and roxnPoolRewards
    issues: {
        issueId: string;
        rewardAmount: string; // This was XDC specific
        status: string;
    }[];
}

export interface TokenInfo {
    balance: string;
}

class BlockchainApi {
    async getPoolInfo(repoId: number): Promise<UnifiedPoolInfo> { // Renamed from getRepository, updated return type
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/pool-info/${repoId}`, {
            credentials: 'include' // Assuming this might be needed for consistency
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to fetch pool info');
        }
        return await response.json();
    }
    
    async getRepositoryFundingStatus(repoId: number): Promise<{
        dailyLimit: number;
        currentTotal: number;
        remainingLimit: number;
        windowStartTime: string;
        windowEndTime: string;
    }> {
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/repository/${repoId}/funding-status`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch repository funding status');
        }
        
        return await response.json();
    }

    async addXDCFundToRepository(repoId: number, amountXdc: string, repositoryFullName: string) { // Renamed for clarity
        const csrfToken = await csrfService.getToken();
        
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/repository/${repoId}/fund`, { // This endpoint is for XDC
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ 
                amountXdc,
                repositoryFullName,
                _csrf: csrfToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 429 && error.details) {
                throw new Error(`Daily funding limit reached. Remaining: ${error.details.remainingLimit} XDC. Limit resets at ${new Date(error.details.limitResetTime).toLocaleString()}`);
            }
            throw new Error(error.error || 'Failed to add XDC fund to repository');
        }
        invalidateWalletInfo();
        return await response.json();
    }

    async fundRepositoryWithRoxn(repoId: number, roxnAmount: string, repositoryFullName: string): Promise<any> {
        const csrfToken = await csrfService.getToken();
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/fund-roxn/${repoId}`, { // Updated URL
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ roxnAmount, repositoryFullName, _csrf: csrfToken }) // Schema is fundRoxnRepoSchema
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add ROXN fund to repository');
        }
        invalidateWalletInfo(); // ROXN balance might change
        return response.json();
    }

    async fundRepositoryWithUsdc(repoId: number, usdcAmount: string, repositoryFullName: string): Promise<any> {
        const csrfToken = await csrfService.getToken();
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/fund-usdc/${repoId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ usdcAmount, repositoryFullName, _csrf: csrfToken }) // Schema is fundUsdcRepoSchema
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add USDC fund to repository');
        }
        invalidateWalletInfo(); // USDC balance might change
        return response.json();
    }
    
    async approveRoxn(amount: string): Promise<any> { // Renamed from approveTokens
        const csrfToken = await csrfService.getToken();
        
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/approve-roxn`, { // Updated URL
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ 
                amount, // Spender address is handled by backend
                _csrf: csrfToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve ROXN tokens');
        }
        return await response.json();
    }
    
    async getTokenBalance(): Promise<string> { // This is ROXN balance
        const response = await fetch(`${STAGING_API_URL}/api/token/balance`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch ROXN token balance');
        }
        
        const result = await response.json();
        return result.balance;
    }
    
    async allocateUnifiedBounty( // Renamed from allocateIssueReward
        repoId: number, 
        issueId: number | string, 
        bountyAmount: string, // Generic name
        currencyType: 'XDC' | 'ROXN' | 'USDC', // Currency type
        githubRepoFullName: string,
        issueTitle: string,
        issueUrl: string 
    ): Promise<AllocateBountyResponse> {
        const csrfToken = await csrfService.getToken();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(`${STAGING_API_URL}/api/blockchain/allocate-bounty/${repoId}/${issueId}`, { // Updated URL
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    bountyAmount,
                    currencyType,
                    githubRepoFullName,
                    issueTitle,
                    issueUrl,
                    _csrf: csrfToken
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || error.error || 'Failed to allocate bounty');
            }
            return response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return { message: 'Bounty allocation submitted but not yet confirmed (timeout)' };
            }
            throw error;
        }
    }

    async getIssueBountyDetails(repoId: number, issueId: number | string): Promise<IssueBountyDetails | null> { // Renamed, updated return type
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/issue-bounty/${repoId}/${issueId}`, {
            credentials: 'include' // Assuming this might be needed
        });

        if (!response.ok) {
            if (response.status === 404) return null; // Handle not found gracefully
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to get issue bounty details');
        }
        return response.json();
    }
    
    async registerUser(username: string, githubId: number, typeOfUser: string) {
        const csrfToken = await csrfService.getToken();
        
        const response = await fetch(`${STAGING_API_URL}/api/auth/register`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                username,
                githubId,
                role: typeOfUser,
                _csrf: csrfToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register user');
        }
        invalidateWalletInfo();
        return response.json();
    }

    async addPoolManager(repoId: number, walletAddress: string, username: string, githubId: number) {
        const csrfToken = await csrfService.getToken();
        
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/repository/${repoId}/manager`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                walletAddress,
                username,
                githubId,
                _csrf: csrfToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add pool manager');
        }
        return response.json();
    }

    async distributeUnifiedReward(repoId: number, issueId: number, contributorAddress: string) { // Renamed
        const csrfToken = await csrfService.getToken();
        
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/distribute-bounty/${repoId}/${issueId}`, { // Updated URL
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                contributorAddress,
                _csrf: csrfToken
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to distribute bounty');
        }
        return response.json();
    }

    async getUserType(address: string): Promise<{ userType: string; address: string }> {
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/user/${address}/type`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get user type');
        }
        return response.json();
    }

    async getUserWallet(username: string): Promise<{ wallet: string }> {
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/user/${username}/wallet`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get user wallet');
        }
        return response.json();
    }

    // Obsolete ROXN-specific methods removed.
    
    async getRoxnRewardsContractAllowance(): Promise<string> { // Renamed and simplified
        console.log("Fetching ROXN allowance for rewards contract from backend.");
        const response = await fetch(`${STAGING_API_URL}/api/blockchain/roxn-allowance`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Error fetching ROXN allowance:", error);
            throw new Error(error.message || 'Failed to fetch ROXN allowance');
        }
        
        const result = await response.json();
        if (typeof result.allowance !== 'string') {
            console.error("Unexpected allowance format from backend:", result);
            throw new Error('Invalid allowance format received from server.');
        }
        return result.allowance; // Expects { allowance: "WEI_STRING" }
    }
}

export const blockchainApi = new BlockchainApi();
