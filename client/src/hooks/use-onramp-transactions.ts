import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { STAGING_API_URL } from '../config';
import csrfService from '../lib/csrf';

export interface OnrampTransaction {
  id: number;
  userId: number;
  walletAddress: string;
  merchantRecognitionId: string;
  orderId?: string;
  amount?: string;
  fiatAmount?: string;
  fiatCurrency: string;
  status: 'initiated' | 'pending' | 'processing' | 'success' | 'failed';
  statusCode?: string;
  statusMessage?: string;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Hook to fetch Onramp.money transactions for the current user
 * @param limit Maximum number of transactions to fetch
 */
export function useOnrampTransactions(limit: number = 10) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['onramp-transactions', limit],
    queryFn: async (): Promise<OnrampTransaction[]> => {
      if (!user) return [];
      
      const csrfToken = await csrfService.getToken();
      const response = await fetch(`${STAGING_API_URL}/api/wallet/onramp-transactions?limit=${limit}`, {
        credentials: 'include',
        headers: { 
          'Accept': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch onramp transactions');
      }
      
      const data = await response.json();
      return data.transactions;
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Only retry once on failure
  });
}
