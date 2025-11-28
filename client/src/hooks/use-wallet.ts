import { useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { STAGING_API_URL } from '../config';
import { useQuery } from '@tanstack/react-query';

interface WalletInfo {
  address: string;
  balance: string;
  tokenBalance: string;
}

export function useWallet() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['wallet-info'],
    queryFn: async (): Promise<WalletInfo> => {
      if (!user) return { address: '', balance: '0', tokenBalance: '0' };
      
      const response = await fetch(`${STAGING_API_URL}/api/wallet/info`, {
        credentials: 'include', 
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }
      
      return response.json();
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Reduced from 5 minutes to 30 seconds
    gcTime: 60 * 1000, // Garbage collection time (previously cacheTime)
    refetchOnWindowFocus: true, // Changed from false to true - refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when network reconnects
  });
} 