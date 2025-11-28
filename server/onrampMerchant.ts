import { config } from './config';
import { log } from './utils';
import { calculateFiatAmount, getCurrencyByFiatType } from './currencyConfig';

export interface MerchantCheckoutConfig {
  appId: string;
  walletAddress: string;
  coinCode: string;
  network: string;
  fiatAmount: string;
  fiatType: number;
  assetDescription: string;
  assetImage: string;
  flowType: number;
  merchantRecognitionId: string;
  redirectUrl?: string;  // Optional redirect URL after payment completion
}

export class OnrampMerchantService {
  /**
   * Generate merchant recognition ID for subscription
   */
  generateMerchantRecognitionId(userId: number): string {
    const timestamp = Date.now();
    return `roxonn-sub-${userId}-${timestamp}`;
  }

  /**
   * Build merchant checkout widget configuration
   */
  async buildMerchantCheckoutConfig(
    userId: number,
    fiatType?: number,
    logoUrl?: string
  ): Promise<MerchantCheckoutConfig> {
    try {
      const merchantRecognitionId = this.generateMerchantRecognitionId(userId);

      // Get treasury address for Polygon (standard 0x format)
      const treasuryAddress = config.platformTreasuryAddressPolygon || config.platformTreasuryAddressXdc;
      if (!treasuryAddress) {
        throw new Error('Platform treasury address not configured');
      }

      // Ensure address is in 0x format (Polygon uses standard Ethereum addresses)
      const walletAddress = treasuryAddress.toLowerCase().startsWith('xdc')
        ? '0x' + treasuryAddress.substring(3)
        : treasuryAddress;

      // Get subscription price in USDC (default 10 USDC)
      const subscriptionPriceUsdc = parseFloat(config.subscriptionPriceUsdc || '10');

      // Get merchant app ID
      const merchantAppId = config.onrampMerchantAppId;
      if (!merchantAppId) {
        throw new Error('Onramp merchant app ID not configured');
      }

      // Default to INR (fiatType 1) if not provided
      const selectedFiatType = fiatType || 1;

      // Calculate fiat amount based on selected currency
      const fiatAmount = calculateFiatAmount(subscriptionPriceUsdc, selectedFiatType);

      // Get currency info for logging
      const currencyInfo = getCurrencyByFiatType(selectedFiatType);
      const currencyName = currencyInfo ? `${currencyInfo.name} (${currencyInfo.code})` : 'Unknown';

      // Build config with user's selected currency
      const checkoutConfig: MerchantCheckoutConfig = {
        appId: merchantAppId,
        walletAddress,
        coinCode: 'usdc',
        network: 'matic20', // Polygon network (supported by merchant checkout)
        fiatAmount: fiatAmount.toString(),
        fiatType: selectedFiatType,
        assetDescription: 'Roxonn Courses Annual Membership',
        assetImage: logoUrl || config.onrampMerchantLogoUrl || `${config.frontendUrl}/favicon.png`,
        flowType: 3, // Merchant checkout flow
        merchantRecognitionId,
        redirectUrl: `${config.frontendUrl}/membership`, // Onramp will append ?status=success/pending&orderId=xxx
      };

      log(`Generated merchant checkout config for user ${userId}: ${merchantRecognitionId}, Currency: ${currencyName}, Amount: ${fiatAmount}`, 'onramp-merchant');
      return checkoutConfig;
    } catch (error) {
      log(`Error building merchant checkout config: ${error}`, 'onramp-merchant-ERROR');
      throw error;
    }
  }

  /**
   * Map Onramp status codes to success/failure
   */
  isSuccessStatus(statusCode?: string, statusMessage?: string): boolean {
    // Onramp success status codes (based on their documentation)
    const successCodes = ['4', '5']; // 4 = completed, 5 = success
    const successMessages = ['completed', 'success', 'confirmed'];

    if (statusCode && successCodes.includes(statusCode)) {
      return true;
    }

    if (statusMessage) {
      const lowerMessage = statusMessage.toLowerCase();
      return successMessages.some(msg => lowerMessage.includes(msg));
    }

    return false;
  }

  /**
   * Validate that the payment went to the treasury address
   */
  validateTreasuryAddress(walletAddress: string): boolean {
    const treasuryAddress = config.platformTreasuryAddressPolygon || config.platformTreasuryAddressXdc;
    if (!treasuryAddress) {
      log('Treasury address not configured for validation', 'onramp-merchant-WARN');
      return false;
    }

    // Normalize both addresses for comparison (remove xdc/0x prefix)
    const normalizeAddress = (addr: string) => {
      const lower = addr.toLowerCase();
      if (lower.startsWith('xdc')) {
        return lower.substring(3);
      }
      if (lower.startsWith('0x')) {
        return lower.substring(2);
      }
      return lower;
    };

    const normalizedWallet = normalizeAddress(walletAddress);
    const normalizedTreasury = normalizeAddress(treasuryAddress);

    return normalizedWallet === normalizedTreasury;
  }

  /**
   * Extract user ID from merchant recognition ID
   */
  extractUserIdFromMerchantId(merchantRecognitionId: string): number | null {
    try {
      // Format: roxonn-sub-{userId}-{timestamp}
      const match = merchantRecognitionId.match(/^roxonn-sub-(\d+)-\d+$/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return null;
    } catch (error) {
      log(`Error extracting user ID from merchant ID: ${error}`, 'onramp-merchant-ERROR');
      return null;
    }
  }

  /**
   * Check if merchant recognition ID is for subscription
   */
  isSubscriptionMerchantId(merchantRecognitionId: string): boolean {
    return merchantRecognitionId.startsWith('roxonn-sub-');
  }
}

export const onrampMerchantService = new OnrampMerchantService();

