import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, DollarSign, Coins, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { blockchainApi } from '@/lib/blockchain';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { IssueBountyDetails, UnifiedPoolInfo } from '@shared/schema';

// Currency configuration
const SUPPORTED_CURRENCIES = [
  {
    symbol: 'XDC',
    name: 'XDC Network',
    network: 'XDC',
    networkColor: 'bg-blue-500',
    icon: Zap,
    fees: 'Very Low (~$0.001)',
    description: 'Native token for fast, energy-efficient transactions'
  },
  {
    symbol: 'ROXN',
    name: 'Roxonn Token',
    network: 'XDC',
    networkColor: 'bg-purple-500',
    icon: Coins,
    fees: 'Very Low (~$0.001)',
    description: 'Platform governance and rewards token'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'XDC',
    networkColor: 'bg-blue-600',
    icon: DollarSign,
    fees: 'Very Low (~$0.001)',
    description: 'Stable cryptocurrency pegged to USD on XDC Network'
  }
];

interface Currency {
  symbol: string;
  network: string;
} // Import UnifiedPoolInfo if needed for queryClient invalidation

interface SetRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    issue: {
        id: number;
        title: string;
    };
    repoId: number;
    currentXdcPool: string; 
    currentRoxnPool: string;
    currentUsdcPool?: string;  // Add USDC pool balance
    onSuccess: () => void;
    githubRepoFullName: string;
    issueUrl: string;
}

export function SetRewardModal({ 
    isOpen, 
    onClose, 
    issue, 
    repoId, 
    currentXdcPool, 
    currentRoxnPool,
    currentUsdcPool = '0',  // Default to 0 if not provided
    onSuccess: onParentSuccess, 
    githubRepoFullName, 
    issueUrl 
}: SetRewardModalProps) {
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>({ symbol: 'XDC', network: 'XDC' });
    const [rewardInputAmount, setRewardInputAmount] = useState(''); // Unified input for any currency
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: currentBountyDetails, isLoading: isLoadingCurrentBounty } = useQuery<IssueBountyDetails | null>({
        queryKey: ['issueBountyDetails', repoId, issue.id],
        queryFn: async () => {
            return blockchainApi.getIssueBountyDetails(repoId, issue.id);
        },
        enabled: isOpen, 
        staleTime: 1000 * 60, 
    });

    const currentXdcRewardFormatted = currentBountyDetails?.isRoxn === false ? currentBountyDetails.xdcAmount : '0';
    const currentRoxnRewardFormatted = currentBountyDetails?.isRoxn === true ? currentBountyDetails.roxnAmount : '0';
    
    const xdcRewardAlreadyExists = !isLoadingCurrentBounty && currentBountyDetails?.isRoxn === false && parseFloat(currentBountyDetails?.xdcAmount || '0') > 0;
    const roxnRewardAlreadyExists = !isLoadingCurrentBounty && currentBountyDetails?.isRoxn === true && parseFloat(currentBountyDetails?.roxnAmount || '0') > 0;
    
    // Check if reward exists for currently selected currency
    const rewardAlreadyExistsForSelectedCurrency = 
        (selectedCurrency.symbol === 'XDC' && xdcRewardAlreadyExists) || 
        (selectedCurrency.symbol === 'ROXN' && roxnRewardAlreadyExists);
        
    const currentPoolForSelectedCurrency = 
        selectedCurrency.symbol === 'XDC' ? currentXdcPool : 
        selectedCurrency.symbol === 'USDC' ? currentUsdcPool : 
        currentRoxnPool;
    const currentRewardDisplay = selectedCurrency.symbol === 'XDC' 
        ? (xdcRewardAlreadyExists ? `${currentXdcRewardFormatted} XDC` : 'N/A')
        : (roxnRewardAlreadyExists ? `${currentRoxnRewardFormatted} ROXN` : 'N/A');

    const { mutate: assignUnifiedBounty, isPending: isAssigningBounty } = useMutation({
        mutationKey: ['allocateUnifiedBounty', repoId, issue.id, selectedCurrency.symbol],
        mutationFn: (data: { amount: string; currencyType: 'XDC' | 'ROXN' | 'USDC'; githubRepoFullName: string; issueTitle: string; issueUrl: string }) => {
            return blockchainApi.allocateUnifiedBounty(
                repoId, 
                issue.id, 
                data.amount,
                data.currencyType,
                data.githubRepoFullName,
                data.issueTitle, 
                data.issueUrl 
            );
        },
        onSuccess: (data) => { 
            const explorerUrl = `https://xdcscan.com/tx/${data.transactionHash}`;
            toast({
                title: `${selectedCurrency.symbol} Bounty Transaction Submitted`,
                description: (
                    <div>
                        <span>{selectedCurrency.symbol} transaction sent successfully.</span>
                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">View on Explorer</a>
                    </div>
                ),
                duration: 9000 
            });
            onClose();
            onParentSuccess(); // This should trigger refetch of poolInfo in parent
        },
        onError: (err: any) => {
            toast({
                title: `Error Setting ${selectedCurrency.symbol} Bounty`,
                description: err instanceof Error ? err.message : `Failed to allocate ${selectedCurrency.symbol} reward`,
                variant: 'destructive'
            });
        },
        onSettled: () => {
             queryClient.invalidateQueries({ queryKey: ['poolInfo', repoId] });
             queryClient.invalidateQueries({ queryKey: ['issueBountyDetails', repoId, issue.id] });
        },
    });

    const handleSetReward = () => {
        if (!rewardInputAmount || isAssigningBounty) return; 

        assignUnifiedBounty({
            amount: rewardInputAmount,
            currencyType: selectedCurrency.symbol as 'XDC' | 'ROXN' | 'USDC',
            githubRepoFullName: githubRepoFullName,
            issueTitle: issue.title,
            issueUrl: issueUrl
        });
    };

    const handleAmountChange = (value: string) => {
        const currency = selectedCurrency.symbol;
        const minAmount = currency === 'XDC' ? 1 : 0.0001;
        const poolBalance = currency === 'XDC' ? currentXdcPool : 
                           currency === 'ROXN' ? currentRoxnPool : 
                           currentUsdcPool;

        if (value && parseFloat(value) < minAmount && parseFloat(value) !== 0) {
            toast({ title: 'Invalid Amount', description: `Minimum bounty must be at least ${minAmount} ${currency}`, variant: 'destructive' });
            setRewardInputAmount(value);
            return;
        }

        const poolBalanceEther = parseFloat(poolBalance || '0'); // Corrected: poolBalance is already formatted ether string
        if (value && parseFloat(value) > poolBalanceEther) {
            toast({ title: 'Invalid Amount', description: `Amount cannot exceed available ${currency} pool balance (${poolBalanceEther.toFixed(4)} ${currency})`, variant: 'destructive' });
            setRewardInputAmount(poolBalanceEther.toFixed(4)); // Set to max if exceeds
            return;
        }
        setRewardInputAmount(value);
    };
    
    useEffect(() => { // Reset input when currency changes or modal opens/closes
        setRewardInputAmount('');
    }, [selectedCurrency.symbol, isOpen]);

    const isDisabled = isAssigningBounty || rewardAlreadyExistsForSelectedCurrency || isLoadingCurrentBounty;

    return (
        <Dialog open={isOpen} onOpenChange={() => !isAssigningBounty && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Bounty for Issue #{issue.id}</DialogTitle>
                    <DialogDescription>
                        Set the bounty amount for this issue. This action cannot be undone or changed later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        {issue.title}
                    </div>
                    
                    {/* Currency Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency & Network</Label>
                        <Select 
                            value={`${selectedCurrency.symbol}-${selectedCurrency.network}`}
                            onValueChange={(value) => {
                                const [symbol, network] = value.split('-');
                                setSelectedCurrency({ symbol, network });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const currency = SUPPORTED_CURRENCIES.find(
                                                c => c.symbol === selectedCurrency.symbol && c.network === selectedCurrency.network
                                            );
                                            const Icon = currency?.icon || Coins;
                                            return <Icon className="h-4 w-4" />;
                                        })()}
                                        <span>{selectedCurrency.symbol} ({selectedCurrency.network})</span>
                                        <Badge variant="outline" className="ml-auto text-xs">
                                            {selectedCurrency.network}
                                        </Badge>
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_CURRENCIES.map((currency) => {
                                    const Icon = currency.icon;
                                    const currencyValue = `${currency.symbol}-${currency.network}`;
                                    
                                    return (
                                        <SelectItem key={currencyValue} value={currencyValue}>
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{currency.symbol}</span>
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`text-xs text-white ${currency.networkColor}`}
                                                        >
                                                            {currency.network}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {currency.description}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Fees: {currency.fees}
                                                    </span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="text-sm">
                        Available Pool: {currentPoolForSelectedCurrency || '0.0'} {selectedCurrency.symbol}
                    </div>

                    {isLoadingCurrentBounty && <Loader2 className="h-4 w-4 animate-spin" />}

                    {!isLoadingCurrentBounty && rewardAlreadyExistsForSelectedCurrency && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-500/10 p-3 rounded-md border border-orange-500/30">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>A bounty of {currentRewardDisplay} is already assigned. You cannot change it.</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="amount">Bounty Amount ({selectedCurrency.symbol})</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min={selectedCurrency.symbol === 'XDC' ? "1" : "0.0001"}
                            value={rewardInputAmount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.0"
                            disabled={isDisabled}
                        />
                        <p className="text-xs text-muted-foreground">Minimum bounty: {selectedCurrency.symbol === 'XDC' ? '1 XDC' : '0.0001 ROXN/USDC'}</p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground"><span className="font-semibold text-orange-600">Warning:</span> Setting a bounty is final and cannot be updated.</p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isAssigningBounty}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSetReward}
                        disabled={isDisabled || !rewardInputAmount || parseFloat(rewardInputAmount) <=0}
                    >
                        {isAssigningBounty ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting Bounty...
                            </>
                        ) : (
                            `Set ${selectedCurrency.symbol} Bounty`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
