import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blockchainApi } from '../lib/blockchain';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { ethers } from 'ethers';
import { Loader2, AlertCircle, Info, RefreshCw } from 'lucide-react'; // Removed ArrowRight as it's not used
import { useWallet } from '../hooks/use-wallet';
import { ROXN_TOKEN_ADDRESS, UNIFIED_REWARDS_CONTRACT_ADDRESS } from '../config';
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from './ui/tooltip';
import type { UnifiedPoolInfo, IssueBountyDetails } from '@shared/schema'; // Updated types

interface RepoRewardsProps {
    repoId: number;
    issueId?: number; 
    isPoolManager: boolean;
    repositoryFullName?: string;
}

export function RepoRewards({ repoId, issueId, isPoolManager, repositoryFullName }: RepoRewardsProps) {
    const [selectedCurrency, setSelectedCurrency] = useState<'XDC' | 'ROXN' | 'USDC'>('XDC');
    
    const [amountXdc, setAmountXdc] = useState('');
    const [amountRoxn, setAmountRoxn] = useState('');
    const [amountUsdc, setAmountUsdc] = useState('');
    
    const [rewardAmount, setRewardAmount] = useState(''); // Unified reward input
    
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: walletInfo, isLoading: walletLoading } = useWallet();
    const [showFundingInfo, setShowFundingInfo] = useState(false);
    const [isRoxnApproving, setIsRoxnApproving] = useState(false);
    const [isUsdcApproving, setIsUsdcApproving] = useState(false);

    const PLATFORM_FEE_RATE = 50; // 0.5%
    const XDC_GAS_RESERVE = 0.1; 

    const maxSafeXdcAmount = walletInfo?.balance 
        ? Math.max(parseFloat(ethers.formatEther(walletInfo.balance)) - XDC_GAS_RESERVE, 0).toFixed(4)
        : '0';

    const { data: roxnBalanceData, isLoading: roxnBalanceLoading, refetch: refetchRoxnBalance } = useQuery({
        queryKey: ['roxnTokenBalance', walletInfo?.address, ROXN_TOKEN_ADDRESS],
        queryFn: () => {
            if (!walletInfo?.address) throw new Error("Wallet address not available for ROXN balance");
            return blockchainApi.getTokenBalance();
        },
        enabled: !!walletInfo?.address,
    });
    const roxnBalance = roxnBalanceData ? ethers.formatEther(roxnBalanceData) : '0';

    const { data: roxnAllowanceData, isLoading: roxnAllowanceLoading, refetch: refetchRoxnAllowance } = useQuery({
        queryKey: ['roxnRewardsContractAllowance', walletInfo?.address], // Simplified key
        queryFn: () => {
            if (!walletInfo?.address ) { 
                throw new Error("Wallet address not available for ROXN allowance check");
            }
            return blockchainApi.getRoxnRewardsContractAllowance(); // Updated method call
        },
        enabled: !!walletInfo?.address && selectedCurrency === 'ROXN', // Simplified enabled condition
    });
    const roxnAllowance = roxnAllowanceData ? ethers.formatEther(roxnAllowanceData) : '0';
    
    const calculateFees = (amountStr: string, currency: 'XDC' | 'ROXN' | 'USDC') => {
        if (!amountStr || parseFloat(amountStr) <= 0) {
            return { total: '0', platformFee: '0', netAmount: '0', currencySymbol: currency };
        }
        const totalAmount = parseFloat(amountStr);
        const platformFee = totalAmount * (PLATFORM_FEE_RATE / 10000);
        const netAmount = totalAmount - platformFee;
        return {
            total: totalAmount.toFixed(6),
            platformFee: platformFee.toFixed(6),
            netAmount: netAmount.toFixed(6),
            currencySymbol: currency
        };
    };
    
    const fees = selectedCurrency === 'XDC' ? calculateFees(amountXdc, 'XDC') : 
                 selectedCurrency === 'ROXN' ? calculateFees(amountRoxn, 'ROXN') : 
                 calculateFees(amountUsdc, 'USDC');
    
    const setMaxAmount = () => {
        if (selectedCurrency === 'XDC') {
            if (fundingStatus) {
                const remainingLimit = fundingStatus.remainingLimit;
                const maxAmount = Math.min(parseFloat(maxSafeXdcAmount), remainingLimit);
                setAmountXdc(maxAmount > 1.01 ? maxAmount.toFixed(4) : '1.01');
            } else {
                setAmountXdc(parseFloat(maxSafeXdcAmount) > 1.01 ? maxSafeXdcAmount : '1.01');
            }
        } else if (selectedCurrency === 'ROXN') {
            const numericRoxnBalance = parseFloat(roxnBalance);
            if (numericRoxnBalance > 0.0001) { 
                setAmountRoxn(numericRoxnBalance.toFixed(4));
            } else {
                setAmountRoxn('0');
                toast({ title: 'Low ROXN Balance', description: 'Your ROXN balance is very low.', variant: 'default' });
            }
        } else if (selectedCurrency === 'USDC') {
            // TODO: Add USDC balance query
            const numericUsdcBalance = 0; // Placeholder
            if (numericUsdcBalance > 0.01) { 
                setAmountUsdc(numericUsdcBalance.toFixed(4));
            } else {
                setAmountUsdc('0');
                toast({ title: 'Low USDC Balance', description: 'Your USDC balance is very low.', variant: 'default' });
            }
        }
    };

    const { data: poolInfo, isLoading: poolInfoLoading, refetch: refetchPoolInfo } = useQuery<UnifiedPoolInfo | null>({
        queryKey: ['poolInfo', repoId], 
        queryFn: () => blockchainApi.getPoolInfo(repoId), 
        enabled: !!repoId,
    });
    
    const { data: fundingStatus, isLoading: fundingStatusLoading } = useQuery({
        queryKey: ['repositoryFundingStatus', repoId],
        queryFn: () => blockchainApi.getRepositoryFundingStatus(repoId),
        enabled: isPoolManager && selectedCurrency === 'XDC',
        refetchInterval: 60000 
    });

    const addXDCFundsMutation = useMutation({
        mutationFn: (amount: string) => {
            if (!repositoryFullName) throw new Error('Repository full name is required.');
            return blockchainApi.addXDCFundToRepository(repoId, amount, repositoryFullName);
        },
        onSuccess: (response: any) => {
            const explorerUrl = `https://xdcscan.com/tx/${response.transactionHash}`;
            toast({
                title: 'XDC Funding Submitted',
                description: (
                    <div>
                        <span>{response.message || 'XDC funds added.'}</span>
                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">View on Explorer</a>
                    </div>
                ),
                duration: 9000
            });
            setAmountXdc('');
            refetchPoolInfo(); 
            queryClient.invalidateQueries({ queryKey: ['repositoryFundingStatus', repoId] });
        },
        onError: (error: any) => {
            toast({ title: 'Error Adding XDC Funds', description: error.response?.data?.error || error.message, variant: 'destructive' });
        }
    });

    const allocateUnifiedBountyMutation = useMutation({
        mutationFn: (params: { amount: string; currencyType: 'XDC' | 'ROXN' | 'USDC' }) => {
            if (!issueId) throw new Error('No issue selected');
            if (!repositoryFullName) throw new Error('Repository name is required');
            const issueTitle = `Issue #${issueId}`; 
            const issueUrl = `https://github.com/${repositoryFullName}/issues/${issueId}`;
            return blockchainApi.allocateUnifiedBounty(repoId, issueId, params.amount, params.currencyType, repositoryFullName, issueTitle, issueUrl);
        },
        onSuccess: (response: any) => {
            const currency = selectedCurrency; // Capture current currency for the toast
            toast({ title: `${currency} Bounty Assigned`, description: response?.message || 'Bounty assigned.' });
            setRewardAmount('');
            refetchPoolInfo(); 
            queryClient.invalidateQueries({ queryKey: ['issueBountyDetails', repoId, issueId] }); // Assuming this key is used elsewhere
        },
        onError: (error: any) => {
            const currency = selectedCurrency;
            toast({ title: `Error Assigning ${currency} Bounty`, description: error.response?.data?.error || error.message, variant: 'destructive' });
        }
    });

    const approveRoxnMutation = useMutation({
        mutationFn: async (amountToApprove: string) => {
            setIsRoxnApproving(true);
            return blockchainApi.approveRoxn(amountToApprove);
        },
        onSuccess: () => {
            toast({ title: 'ROXN Approved', description: 'You can now add ROXN funds.' });
            refetchRoxnAllowance();
        },
        onError: (error: any) => {
            toast({ title: 'ROXN Approval Failed', description: error.message || 'Could not approve ROXN.', variant: 'destructive' });
        },
        onSettled: () => {
            setIsRoxnApproving(false);
        }
    });

    const addRoxnFundsMutation = useMutation({
        mutationFn: (amount: string) => {
            if (!repositoryFullName) throw new Error('Repository full name is required.');
            return blockchainApi.fundRepositoryWithRoxn(repoId, amount, repositoryFullName);
        },
        onSuccess: (response: any) => {
            toast({ title: 'ROXN Funding Submitted', description: response.message || 'ROXN funding transaction submitted.' });
            setAmountRoxn('');
            refetchPoolInfo();
            refetchRoxnBalance(); 
            refetchRoxnAllowance();
        },
        onError: (error: any) => {
            toast({ title: 'Error Adding ROXN Funds', description: error.message || 'Failed to add ROXN funds.', variant: 'destructive' });
        }
    });

    const addUsdcFundsMutation = useMutation({
        mutationFn: (amount: string) => {
            if (!repositoryFullName) throw new Error('Repository full name is required.');
            return blockchainApi.fundRepositoryWithUsdc(repoId, amount, repositoryFullName);
        },
        onSuccess: (response: any) => {
            toast({ title: 'USDC Funding Submitted', description: response.message || 'USDC funding transaction submitted.' });
            setAmountUsdc('');
            refetchPoolInfo();
            // TODO: Add USDC balance and allowance refetch when implemented
        },
        onError: (error: any) => {
            toast({ title: 'Error Adding USDC Funds', description: error.message || 'Failed to add USDC funds.', variant: 'destructive' });
        }
    });
    
    const handleAddXdcFunds = () => {
        if (!amountXdc || parseFloat(amountXdc) <= 0) return;
        if (!repositoryFullName) {
            toast({ title: 'Error', description: 'Repository details missing.', variant: 'destructive' });
            return;
        }
        if (walletInfo?.balance) {
            const amountValue = parseFloat(amountXdc);
            const balanceValue = parseFloat(ethers.formatEther(walletInfo.balance));
            if (amountValue <= 1) {
                toast({ title: 'Minimum funding amount not met', description: `Minimum is > 1 XDC.`, variant: 'destructive' });
                return;
            }
            if (amountValue > 0 && balanceValue - amountValue < XDC_GAS_RESERVE) {
                toast({ title: 'Insufficient funds for gas', description: `Leave at least ${XDC_GAS_RESERVE} XDC for gas.`, variant: 'destructive' });
                return;
            }
            if (fundingStatus && amountValue > fundingStatus.remainingLimit) {
                toast({ title: 'Exceeds daily funding limit', description: `Remaining: ${fundingStatus.remainingLimit.toFixed(2)} XDC.`, variant: 'destructive' });
                return;
            }
        }
        addXDCFundsMutation.mutate(amountXdc);
    };

    const handleAllocateBounty = () => {
        if (!rewardAmount || parseFloat(rewardAmount) <= 0 || !issueId) return;
        const currencyType = selectedCurrency; // 'XDC', 'ROXN', or 'USDC'
        allocateUnifiedBountyMutation.mutate({ amount: rewardAmount, currencyType });
    };
    
    const handleAddRoxnFunds = () => {
        if (!amountRoxn || parseFloat(amountRoxn) <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid ROXN amount.', variant: 'destructive' });
            return;
        }
        if (parseFloat(amountRoxn) > parseFloat(roxnBalance)) {
            toast({ title: 'Insufficient ROXN Balance', variant: 'destructive' });
            return;
        }
        const requiredAllowance = parseFloat(amountRoxn);
        const currentAllowance = parseFloat(roxnAllowance);
        if (currentAllowance < requiredAllowance) {
            approveRoxnMutation.mutate(amountRoxn); 
        } else {
            addRoxnFundsMutation.mutate(amountRoxn);
        }
    };

    const handleAddUsdcFunds = () => {
        if (!amountUsdc || parseFloat(amountUsdc) <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid USDC amount.', variant: 'destructive' });
            return;
        }
        // TODO: Add USDC balance check when balance query is implemented
        // For now, directly call the mutation which will handle approval + funding
        addUsdcFundsMutation.mutate(amountUsdc);
    };

    const currencySymbol = selectedCurrency === 'XDC' ? 'XDC' : selectedCurrency === 'ROXN' ? 'ROXN' : 'USDC';
    // poolInfo.xdcPoolRewards and roxnPoolRewards are already formatted ether strings from the backend
    const currentXdcPoolAmount = poolInfo ? poolInfo.xdcPoolRewards : '0';
    const currentRoxnPoolAmount = poolInfo ? poolInfo.roxnPoolRewards : '0';

    const isAssigningBounty = allocateUnifiedBountyMutation.isPending;

    return (
        <Card className="p-4">
            <div className="flex mb-4 border-b">
                <Button variant={selectedCurrency === 'XDC' ? 'secondary' : 'ghost'} onClick={() => setSelectedCurrency('XDC')} className="rounded-b-none">XDC Rewards</Button>
                <Button variant={selectedCurrency === 'ROXN' ? 'secondary' : 'ghost'} onClick={() => setSelectedCurrency('ROXN')} className="rounded-b-none">ROXN Rewards</Button>
                <Button variant={selectedCurrency === 'USDC' ? 'secondary' : 'ghost'} onClick={() => setSelectedCurrency('USDC')} className="rounded-b-none">USDC Rewards</Button>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Repository Rewards</h3>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Current XDC Pool: {poolInfoLoading ? <Loader2 className="h-4 w-4 animate-spin inline"/> : currentXdcPoolAmount} XDC</p>
                            {isPoolManager && selectedCurrency === 'XDC' && fundingStatus && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-500" onClick={() => setShowFundingInfo(!showFundingInfo)}>
                                    <Info className="h-4 w-4 mr-1" /> XDC Funding Limits
                                </Button>
                            )}
                        </div>
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-sm text-gray-500 dark:text-gray-400">
                                Current ROXN Pool: {poolInfoLoading ? <Loader2 className="h-4 w-4 animate-spin inline"/> : currentRoxnPoolAmount} ROXN
                            </p>
                            {isPoolManager && (
                                <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Your ROXN: {roxnBalanceLoading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : parseFloat(roxnBalance).toFixed(2)}
                                    </p>
                                    <Button variant="ghost" size="icon" onClick={() => refetchRoxnBalance()} className="h-6 w-6">
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-sm text-gray-500 dark:text-gray-400">
                                Current USDC Pool: {poolInfoLoading ? <Loader2 className="h-4 w-4 animate-spin inline"/> : (poolInfo?.usdcPoolRewards || '0')} USDC
                            </p>
                        </div>
                        {isPoolManager && selectedCurrency === 'XDC' && showFundingInfo && fundingStatus && (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-md p-3 mb-4">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Daily XDC Funding Limit Information</h4>
                                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                                    <li>• Daily limit: <span className="font-medium">{fundingStatus.dailyLimit} XDC</span> per repository</li>
                                    <li>• Used today: <span className="font-medium">{fundingStatus.currentTotal.toFixed(2)} XDC</span></li>
                                    <li>• Remaining: <span className="font-medium">{fundingStatus.remainingLimit.toFixed(2)} XDC</span></li>
                                    <li>• Resets at: <span className="font-medium">{new Date(fundingStatus.windowEndTime).toLocaleString()}</span></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {isPoolManager && selectedCurrency === 'XDC' && (
                <div>
                    <Label htmlFor="amountXdc">Add XDC Funds
                        {fundingStatus && (<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Daily remaining: {fundingStatus.remainingLimit.toFixed(2)} XDC)</span>)}
                    </Label>
                    <div className="flex mt-1.5 gap-2">
                        <div className="relative flex-grow">
                            <Input id="amountXdc" placeholder="Amount to add (XDC)" value={amountXdc} onChange={(e) => setAmountXdc(e.target.value)} type="number" min="1.01" step="0.01"
                                max={(() => {
                                    let maxValue = fundingStatus ? Math.min(parseFloat(maxSafeXdcAmount), fundingStatus.remainingLimit) : parseFloat(maxSafeXdcAmount); 
                                    return maxValue > 1.01 ? maxValue.toString() : undefined;
                                })()} 
                            />
                            <Button type="button" variant="outline" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs" onClick={setMaxAmount}
                                disabled={walletLoading || (parseFloat(maxSafeXdcAmount) <= 1.01 && (!fundingStatus || fundingStatus.remainingLimit <= 1.01))} >
                                Max
                            </Button>
                        </div>
                        <Button onClick={handleAddXdcFunds} disabled={addXDCFundsMutation.isPending || !amountXdc || parseFloat(amountXdc) <= 0}>
                            {addXDCFundsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add XDC Funds'}
                        </Button>
                    </div>
                    {parseFloat(amountXdc) > 0 && (
                        <div className="mt-3 p-3 bg-accent/30 dark:bg-accent/20 rounded-md border border-border">
                            <h4 className="text-xs font-semibold mb-2 text-foreground">XDC Transaction Breakdown</h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Total amount:</span><span className="font-medium">{fees.total} {fees.currencySymbol}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center">Platform fee (0.5%):
                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 inline ml-1 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent className="max-w-xs"><p className="text-xs">This fee supports ongoing development and maintenance of the platform.</p></TooltipContent></Tooltip></TooltipProvider>
                                    </span><span className="text-orange-500 dark:text-orange-400">-{fees.platformFee} {fees.currencySymbol}</span>
                                </div>
                                <div className="h-px bg-border my-1"></div>
                                <div className="flex justify-between font-medium"><span>Net amount to repository:</span><span className="text-emerald-600 dark:text-emerald-400">{fees.netAmount} {fees.currencySymbol}</span></div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                        <span> Your XDC balance: {walletLoading ? '...' : ethers.formatEther(walletInfo?.balance || '0')} XDC
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 inline ml-1 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent className="max-w-xs"><p className="text-xs">You need to keep at least {XDC_GAS_RESERVE} XDC for transaction fees.</p></TooltipContent></Tooltip></TooltipProvider>
                        </span>
                    </div>
                </div>
                )}

                {isPoolManager && selectedCurrency === 'ROXN' && (
                <div className="mt-4">
                    <Label htmlFor="amountRoxn">Add ROXN Funds</Label>
                     <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        ROXN Allowance: {roxnAllowanceLoading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : parseFloat(roxnAllowance).toFixed(4)} ROXN
                        <Button variant="ghost" size="icon" onClick={() => refetchRoxnAllowance()} className="h-5 w-5 ml-1" disabled={roxnAllowanceLoading}>
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex mt-1.5 gap-2">
                        <div className="relative flex-grow">
                            <Input id="amountRoxn" placeholder="Amount to add (ROXN)" value={amountRoxn} onChange={(e) => setAmountRoxn(e.target.value)} type="number" min="0.0001" step="0.0001"/>
                             <Button type="button" variant="outline" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs" onClick={setMaxAmount}
                                disabled={roxnBalanceLoading || parseFloat(roxnBalance) <= 0}>Max ROXN</Button>
                        </div>
                        <Button onClick={handleAddRoxnFunds} 
                            disabled={addRoxnFundsMutation.isPending || approveRoxnMutation.isPending || !amountRoxn || parseFloat(amountRoxn) <= 0 || parseFloat(amountRoxn) > parseFloat(roxnBalance)}>
                            {isRoxnApproving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : 
                             addRoxnFundsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding ROXN...</> : 
                             (parseFloat(roxnAllowance) < parseFloat(amountRoxn || "0") ? 'Approve & Add ROXN' : 'Add ROXN Funds')}
                        </Button>
                    </div>
                     {parseFloat(amountRoxn) > 0 && (
                        <div className="mt-3 p-3 bg-accent/30 dark:bg-accent/20 rounded-md border border-border">
                            <h4 className="text-xs font-semibold mb-2 text-foreground">ROXN Transaction Breakdown</h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Total amount:</span><span className="font-medium">{fees.total} {fees.currencySymbol}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center">Platform fee (0.5%):
                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 inline ml-1 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent className="max-w-xs"><p className="text-xs">This fee supports ongoing development and maintenance of the platform.</p></TooltipContent></Tooltip></TooltipProvider>
                                    </span><span className="text-orange-500 dark:text-orange-400">-{fees.platformFee} {fees.currencySymbol}</span>
                                </div>
                                <div className="h-px bg-border my-1"></div>
                                <div className="flex justify-between font-medium"><span>Net amount to repository:</span><span className="text-emerald-600 dark:text-emerald-400">{fees.netAmount} {fees.currencySymbol}</span></div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {isPoolManager && selectedCurrency === 'USDC' && (
                <div className="mt-4">
                    <Label htmlFor="amountUsdc">Add USDC Funds</Label>
                    <div className="flex mt-1.5 gap-2">
                        <div className="relative flex-grow">
                            <Input id="amountUsdc" placeholder="Amount to add (USDC)" value={amountUsdc} onChange={(e) => setAmountUsdc(e.target.value)} type="number" min="0.01" step="0.01"/>
                             <Button type="button" variant="outline" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs" onClick={setMaxAmount}
                                disabled={true}>Max USDC</Button>
                        </div>
                        <Button onClick={handleAddUsdcFunds} 
                            disabled={addUsdcFundsMutation.isPending || !amountUsdc || parseFloat(amountUsdc) <= 0}>
                            {isUsdcApproving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : 
                             addUsdcFundsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding USDC...</> : 
                             'Approve & Add USDC'}
                        </Button>
                    </div>
                     {parseFloat(amountUsdc) > 0 && (
                        <div className="mt-3 p-3 bg-accent/30 dark:bg-accent/20 rounded-md border border-border">
                            <h4 className="text-xs font-semibold mb-2 text-foreground">USDC Transaction Breakdown</h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Total amount:</span><span className="font-medium">{fees.total} {fees.currencySymbol}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center">Platform fee (0.5%):
                                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 inline ml-1 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent className="max-w-xs"><p className="text-xs">This fee supports ongoing development and maintenance of the platform.</p></TooltipContent></Tooltip></TooltipProvider>
                                    </span><span className="text-orange-500 dark:text-orange-400">-{fees.platformFee} {fees.currencySymbol}</span>
                                </div>
                                <div className="h-px bg-border my-1"></div>
                                <div className="flex justify-between font-medium"><span>Net amount to repository:</span><span className="text-emerald-600 dark:text-emerald-400">{fees.netAmount} {fees.currencySymbol}</span></div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {issueId && isPoolManager && (
                    <div className="mt-4">
                        <Label htmlFor="rewardAmount">Assign {currencySymbol} Bounty</Label>
                        <div className="flex mt-1.5 gap-2">
                            <Input
                                id="rewardAmount"
                                placeholder={`Bounty amount (${currencySymbol})`}
                                value={rewardAmount}
                                onChange={(e) => setRewardAmount(e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                            />
                            <Button 
                                onClick={handleAllocateBounty} 
                                disabled={isAssigningBounty || !rewardAmount || parseFloat(rewardAmount) <= 0}
                            >
                                {isAssigningBounty 
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</>
                                    : `Assign ${currencySymbol} Bounty`
                                }
                            </Button>
                        </div>
                    </div>
                )}

                {/* Display Issue Bounties from UnifiedPoolInfo */}
                {/* issue.xdcAmount and issue.roxnAmount are already formatted ether strings from the backend */}
                {(poolInfo?.issues ?? []).filter(issue => 
                    (selectedCurrency === 'XDC' && parseFloat(issue.xdcAmount || '0') > 0) ||
                    (selectedCurrency === 'ROXN' && parseFloat(issue.roxnAmount || '0') > 0) ||
                    (selectedCurrency === 'USDC' && parseFloat(issue.usdcAmount || '0') > 0)
                ).length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Active {currencySymbol} Issue Bounties</h4>
                        <div className="space-y-2">
                            {(poolInfo?.issues ?? []) 
                                .filter(issue => 
                                    (selectedCurrency === 'XDC' && parseFloat(issue.xdcAmount || '0') > 0) ||
                                    (selectedCurrency === 'ROXN' && parseFloat(issue.roxnAmount || '0') > 0) ||
                                    (selectedCurrency === 'USDC' && parseFloat(issue.usdcAmount || '0') > 0)
                                )
                                .sort((a, b) => parseInt(a.issueId) - parseInt(b.issueId))
                                .map((issue: IssueBountyDetails) => (
                                    <div 
                                        key={`${selectedCurrency}-issue-reward-${issue.issueId}`}
                                        className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                    >
                                        <span>Issue #{issue.issueId}</span>
                                        <span className="font-medium">
                                            {selectedCurrency === 'XDC' 
                                                ? `${issue.xdcAmount || '0'} XDC`
                                                : selectedCurrency === 'ROXN'
                                                ? `${issue.roxnAmount || '0'} ROXN`
                                                : `${issue.usdcAmount || '0'} USDC`
                                            }
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
