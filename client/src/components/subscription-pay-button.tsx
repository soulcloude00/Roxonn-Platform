import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface SubscriptionPayButtonProps {
  onSuccess?: () => void;
  fiatType?: number;
  currencyDisplay?: string;
  className?: string;
}

export function SubscriptionPayButton({ onSuccess, fiatType, currencyDisplay, className }: SubscriptionPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Poll subscription status after payment
  const pollSubscriptionStatus = async () => {
    setProcessing(true);
    const maxAttempts = 30; // Poll for up to 30 seconds
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await api.get('/api/subscription/status');
        const { active } = response.data;

        if (active) {
          clearInterval(interval);
          setProcessing(false);
          toast({
            title: 'Subscription activated!',
            description: 'You now have full access to all courses.',
          });
          onSuccess?.();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessing(false);
          toast({
            title: 'Payment processing',
            description: 'Your payment is being processed. Please check back in a few minutes.',
            variant: 'default',
          });
        }
      } catch (error) {
        // Silently handle polling errors
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessing(false);
        }
      }
    }, 1000);
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Get merchant checkout config from backend
      const config = await api.post('/api/subscription/merchant/init', {
        fiatType: fiatType,
        logoUrl: `${window.location.origin}/favicon.png`,
      });

      // Validate config
      if (!config) {
        throw new Error('No config received from server');
      }

      // Ensure all required fields are present and not null/undefined
      const requiredFields = ['appId', 'walletAddress', 'coinCode', 'network', 'fiatAmount', 'fiatType', 'flowType', 'merchantRecognitionId'];
      const missingFields = requiredFields.filter(field => !config[field] && config[field] !== 0);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Ensure numeric fields are numbers
      const sdkConfig = {
        ...config,
        fiatAmount: Number(config.fiatAmount),
        fiatType: Number(config.fiatType),
        flowType: Number(config.flowType),
      };

      // Dynamically import the SDK
      const { OnrampWebSDK } = await import('@onramp.money/onramp-web-sdk');
      
      // Create SDK instance
      const onrampInstance = new OnrampWebSDK(sdkConfig);

      // Listen to transaction events
      onrampInstance.on('TX_EVENTS', (e: any) => {
        if (e.type === 'ONRAMP_WIDGET_TX_COMPLETED') {
          // Payment completed, start polling for subscription activation
          pollSubscriptionStatus();
        }
      });

      // Listen to widget events
      onrampInstance.on('WIDGET_EVENTS', (e: any) => {
        if (e.type === 'ONRAMP_WIDGET_CLOSE_REQUEST_CONFIRMED') {
          setLoading(false);
        }
      });

      // Show the widget
      onrampInstance.show();
      
    } catch (error) {
      toast({
        title: 'Payment initialization failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (processing) {
    return (
      <Button disabled className={className || "w-full"}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing payment...
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className={className || "w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading payment...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {currencyDisplay || 'Pay 10 USDC / Year'}
        </>
      )}
    </Button>
  );
}

