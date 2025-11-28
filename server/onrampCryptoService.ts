import crypto from 'crypto';
import axios from 'axios';
import { config } from './config';
import { log } from './utils';

/**
 * Supported networks for crypto payments
 * Based on Onramp's network mappings
 */
export interface NetworkOption {
  chainId: string;
  name: string;
  displayName: string;
  coinId: string; // USDC coin ID for this network
}

export const SUPPORTED_CRYPTO_NETWORKS: NetworkOption[] = [
  {
    chainId: '3',
    name: 'matic20',
    displayName: 'Polygon (MATIC)',
    coinId: '54', // USDC on Polygon
  },
  {
    chainId: '0',
    name: 'erc20',
    displayName: 'Ethereum (ETH)',
    coinId: '54', // USDC on Ethereum
  },
  {
    chainId: '1',
    name: 'bep20',
    displayName: 'BNB Smart Chain',
    coinId: '54', // USDC on BSC
  },
  {
    chainId: '4',
    name: 'spl',
    displayName: 'Solana',
    coinId: '54', // USDC on Solana
  },
  {
    chainId: '13',
    name: 'arbitrum',
    displayName: 'Arbitrum',
    coinId: '54', // USDC on Arbitrum
  },
];

export interface CryptoPaymentIntent {
  hash: string;
  widgetUrl: string;
}

export class OnrampCryptoService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.onramp.money';

  constructor() {
    this.apiKey = config.onrampMoneyApiKey || '';
    this.apiSecret = config.onrampMoneyAppSecretKey || '';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Onramp API credentials not configured');
    }
  }

  /**
   * Generate HMAC-SHA512 signature for Onramp API authentication
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha512', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Create a crypto payment intent
   * Returns a hash that can be used to redirect user to Onramp's crypto widget
   */
  async createCryptoIntent(
    userId: number,
    chainId: string = '3', // Default to Polygon
    language: string = 'en'
  ): Promise<CryptoPaymentIntent> {
    try {
      // Get subscription price in USDC
      const subscriptionPriceUsdc = parseFloat(config.subscriptionPriceUsdc || '10');

      // Find network details
      const network = SUPPORTED_CRYPTO_NETWORKS.find(n => n.chainId === chainId);
      if (!network) {
        throw new Error(`Unsupported network: ${chainId}`);
      }

      // Build request body
      const body = {
        coinId: network.coinId,
        chainId: network.chainId,
        coinAmount: subscriptionPriceUsdc.toFixed(2),
        redirectURL: `${config.frontendUrl}/membership?payment=success`,
        assetDescription: 'Roxonn Courses Annual Membership',
        assetImage: config.onrampMerchantLogoUrl || `${config.frontendUrl}/favicon.png`,
        lang: language,
      };

      // Create payload with timestamp
      const payloadObj = {
        timestamp: Date.now(),
        body,
      };

      const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
      const signature = this.generateSignature(payload);

      // Make API request
      const response = await axios.post(
        `${this.baseUrl}/onramp-merchants/widget/createIntent`,
        body,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-ONRAMP-SIGNATURE': signature,
            'X-ONRAMP-APIKEY': this.apiKey,
            'X-ONRAMP-PAYLOAD': payload,
          },
          timeout: 10000,
        }
      );

      if (response.data.status !== 1 || !response.data.data?.hash) {
        throw new Error('Failed to create crypto payment intent: ' + JSON.stringify(response.data));
      }

      const hash = response.data.data.hash;
      const widgetUrl = `https://widget.onramp.money/crypto?hash=${hash}`;

      log(
        `Created crypto payment intent for user ${userId}: ${hash}, Network: ${network.displayName}, Amount: ${subscriptionPriceUsdc} USDC`,
        'onramp-crypto'
      );

      return {
        hash,
        widgetUrl,
      };
    } catch (error: any) {
      log(`Error creating crypto payment intent: ${error.message}`, 'onramp-crypto-ERROR');
      if (error.response) {
        log(`Onramp API error response: ${JSON.stringify(error.response.data)}`, 'onramp-crypto-ERROR');
      }
      throw error;
    }
  }

  /**
   * Get order status for a crypto payment
   * This can be used to poll for payment completion
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const body = { orderId };

      const payloadObj = {
        timestamp: Date.now(),
        body,
      };

      const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
      const signature = this.generateSignature(payload);

      const response = await axios.post(
        `${this.baseUrl}/onramp/order/orderStatus`,
        body,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-ONRAMP-SIGNATURE': signature,
            'X-ONRAMP-APIKEY': this.apiKey,
            'X-ONRAMP-PAYLOAD': payload,
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      log(`Error getting order status: ${error.message}`, 'onramp-crypto-ERROR');
      throw error;
    }
  }

  /**
   * Validate network selection
   */
  isValidNetwork(chainId: string): boolean {
    return SUPPORTED_CRYPTO_NETWORKS.some(n => n.chainId === chainId);
  }

  /**
   * Get network display name
   */
  getNetworkName(chainId: string): string {
    const network = SUPPORTED_CRYPTO_NETWORKS.find(n => n.chainId === chainId);
    return network?.displayName || 'Unknown Network';
  }
}

export const onrampCryptoService = new OnrampCryptoService();
