import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Network {
  chainId: string;
  name: string;
  displayName: string;
  coinId: string;
}

interface CryptoPaymentButtonProps {
  chainId?: string;
  onSuccess?: () => void;
  className?: string;
  networkDisplay?: string;
}

export function CryptoPaymentButton({
  chainId = '3', // Default to Polygon
  onSuccess,
  className,
  networkDisplay,
}: CryptoPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCryptoPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // TEMPORARY WORKAROUND: Contact Onramp to enable Crypto Merchant Widget API
      // For now, showing an informational message
      setError('Crypto payments coming soon! Please contact support@roxonn.com or use fiat payment for now.');
      setLoading(false);

      /* ORIGINAL CODE (Uncomment after Onramp enables API access):
      // Call backend to create crypto payment intent
      const response = await api.post('/api/subscription/crypto/init', {
        chainId,
        language: 'en',
      });

      const { widgetUrl } = response.data;

      // Redirect to Onramp's crypto widget
      window.location.href = widgetUrl;
      */
    } catch (err: any) {
      console.error('Error initializing crypto payment:', err);
      setError(err.response?.data?.error || 'Failed to initialize crypto payment');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCryptoPayment}
        disabled={loading}
        className={cn(
          'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
          className
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Opening Payment...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            {networkDisplay || 'Pay with Crypto Wallet'}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
