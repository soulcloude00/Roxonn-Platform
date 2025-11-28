import { useWallet } from '../hooks/use-wallet';
import { useAuth } from '../hooks/use-auth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ethers } from 'ethers';
import { Loader2, DollarSign, Coins, Zap, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// New hook for USDC balance
const useUsdcBalance = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['usdcBalance', user?.id],
    queryFn: async (): Promise<string> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await fetch(`/api/wallet/multi-currency-balances/${user.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balances');
      }
      
      const balances = await response.json();
      // Find USDC balance from the balances array
      const usdcBalance = balances.find((b: any) => b.currency === 'USDC');
      return usdcBalance?.balance || '0';
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });
};

const getCurrencyIcon = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'XDC':
      return Zap;
    case 'ROXN':
      return Coins;
    case 'USDC':
      return DollarSign;
    default:
      return Coins;
  }
};

const getNetworkColor = (network: string) => {
  switch (network.toLowerCase()) {
    case 'xdc':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export function WalletInfo() {
    const { data: walletInfo, isLoading } = useWallet();
    const { user } = useAuth();
    const { data: usdcBalance, isLoading: isUsdcLoading } = useUsdcBalance();
    
    // Format USDC balance
    const formattedUsdcBalance = usdcBalance 
      ? parseFloat(usdcBalance).toFixed(2) 
      : "0.00";
    
    return (
        <Card className="p-4">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Wallet Information</h3>
                    {isLoading || isUsdcLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* XDC Wallet */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Wallet Address</span>
                                    <span className="text-sm font-mono truncate max-w-[200px]">
                                        {walletInfo?.address || 'Not available'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">XDC Balance:</span>
                                    <span className="text-sm font-medium">
                                        {walletInfo?.balance ? ethers.formatEther(walletInfo.balance) : '0'} XDC
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">ROXN Balance:</span>
                                    <span className="text-sm font-medium">
                                        {walletInfo?.tokenBalance ? ethers.formatEther(walletInfo.tokenBalance) : '0'} ROXN
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        USDC Balance:
                                    </span>
                                    <span className="text-sm font-medium">
                                        {isUsdcLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            `${formattedUsdcBalance} USDC`
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}