/**
 * Currency configuration for Onramp.money multi-currency support
 * Based on: https://docs.onramp.money/onramp/supported-assets-and-fiat/fiat-currencies
 *
 * IMPORTANT: Only includes currencies with ✔ "Onramp" support in official docs
 * "Coming soon" currencies are excluded to prevent payment failures
 *
 * Exchange rates are approximate and based on 1 USDC ≈ $1 USD
 * Last updated: 2025-01-10
 */

export interface CurrencyConfig {
  fiatType: number;
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  /** Exchange rate: How much local currency for 1 USDC */
  usdcRate: number;
  /** Is this currency active for onramp? */
  active: boolean;
  /** Available payment methods for this currency */
  paymentMethods?: string[];
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  // Top/Popular currencies first (verified working on Onramp)
  {
    fiatType: 21,
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    country: 'United States',
    flag: '🇺🇸',
    usdcRate: 1,
    active: true,
    paymentMethods: ['ACH', 'Wire Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 12,
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    country: 'Europe',
    flag: '🇪🇺',
    usdcRate: 0.95,
    active: true,
    paymentMethods: ['SEPA', 'Credit Card', 'Debit Card', 'Bank Transfer'],
  },
  {
    fiatType: 1,
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    country: 'India',
    flag: '🇮🇳',
    usdcRate: 85,
    active: true,
    paymentMethods: ['UPI', 'IMPS', 'Net Banking', 'Debit Card'],
  },
  {
    fiatType: 20,
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    country: 'United Kingdom',
    flag: '🇬🇧',
    usdcRate: 0.80,
    active: true,
    paymentMethods: ['Bank Transfer', 'Credit Card', 'Debit Card', 'Faster Payments'],
  },

  // Americas
  {
    fiatType: 50,
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    country: 'Canada',
    flag: '🇨🇦',
    usdcRate: 1.35,
    active: true,
    paymentMethods: ['Interac', 'Bank Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 7,
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    country: 'Brazil',
    flag: '🇧🇷',
    usdcRate: 5.0,
    active: true,
    paymentMethods: ['PIX', 'Bank Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 4,
    code: 'MXN',
    symbol: '$',
    name: 'Mexican Peso',
    country: 'Mexico',
    flag: '🇲🇽',
    usdcRate: 17,
    active: true,
    paymentMethods: ['SPEI', 'Bank Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 29,
    code: 'ARS',
    symbol: '$',
    name: 'Argentine Peso',
    country: 'Argentina',
    flag: '🇦🇷',
    usdcRate: 1000,
    active: true,
    paymentMethods: ['Bank Transfer', 'Credit Card'],
  },
  {
    fiatType: 9,
    code: 'COP',
    symbol: '$',
    name: 'Colombian Peso',
    country: 'Colombia',
    flag: '🇨🇴',
    usdcRate: 4000,
    active: true,
    paymentMethods: ['Bank Transfer', 'PSE'],
  },
  {
    fiatType: 10,
    code: 'CLP',
    symbol: '$',
    name: 'Chilean Peso',
    country: 'Chile',
    flag: '🇨🇱',
    usdcRate: 950,
    active: true,
    paymentMethods: ['Bank Transfer'],
  },
  {
    fiatType: 8,
    code: 'PEN',
    symbol: 'S/',
    name: 'Peruvian Sol',
    country: 'Peru',
    flag: '🇵🇪',
    usdcRate: 3.7,
    active: true,
    paymentMethods: ['Bank Transfer'],
  },

  // Middle East & North Africa
  {
    fiatType: 3,
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    country: 'UAE',
    flag: '🇦🇪',
    usdcRate: 3.67,
    active: true,
    paymentMethods: ['Bank Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 2,
    code: 'TRY',
    symbol: '₺',
    name: 'Turkish Lira',
    country: 'Turkey',
    flag: '🇹🇷',
    usdcRate: 32,
    active: true,
    paymentMethods: ['FAST', 'Bank Transfer', 'Credit Card', 'Debit Card'],
  },

  // Asia
  {
    fiatType: 11,
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    country: 'Philippines',
    flag: '🇵🇭',
    usdcRate: 56,
    active: true,
    paymentMethods: ['InstaPay', 'PESONet', 'GCash', 'Bank Transfer'],
  },
  {
    fiatType: 14,
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    country: 'Indonesia',
    flag: '🇮🇩',
    usdcRate: 15800,
    active: true,
    paymentMethods: ['Bank Transfer', 'E-Wallet', 'Virtual Account'],
  },
  {
    fiatType: 5,
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    country: 'Vietnam',
    flag: '🇻🇳',
    usdcRate: 25000,
    active: true,
    paymentMethods: ['Bank Transfer', 'E-Wallet', 'QR Payment'],
  },

  // Africa
  {
    fiatType: 6,
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    country: 'Nigeria',
    flag: '🇳🇬',
    usdcRate: 1550,
    active: true,
    paymentMethods: ['Bank Transfer', 'USSD', 'Card Payment'],
  },
  {
    fiatType: 15,
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    country: 'Kenya',
    flag: '🇰🇪',
    usdcRate: 130,
    active: true,
    paymentMethods: ['M-Pesa', 'Bank Transfer', 'Card Payment'],
  },
  {
    fiatType: 17,
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    country: 'South Africa',
    flag: '🇿🇦',
    usdcRate: 18,
    active: true,
    paymentMethods: ['EFT', 'Bank Transfer', 'Credit Card', 'Debit Card'],
  },
  {
    fiatType: 16,
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    country: 'Ghana',
    flag: '🇬🇭',
    usdcRate: 15,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer', 'Card Payment'],
  },
  {
    fiatType: 25,
    code: 'UGX',
    symbol: 'USh',
    name: 'Ugandan Shilling',
    country: 'Uganda',
    flag: '🇺🇬',
    usdcRate: 3700,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 24,
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    country: 'Tanzania',
    flag: '🇹🇿',
    usdcRate: 2500,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 18,
    code: 'RWF',
    symbol: 'FRw',
    name: 'Rwandan Franc',
    country: 'Rwanda',
    flag: '🇷🇼',
    usdcRate: 1350,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 26,
    code: 'ZMW',
    symbol: 'ZK',
    name: 'Zambian Kwacha',
    country: 'Zambia',
    flag: '🇿🇲',
    usdcRate: 27,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 22,
    code: 'BWP',
    symbol: 'P',
    name: 'Botswana Pula',
    country: 'Botswana',
    flag: '🇧🇼',
    usdcRate: 13.5,
    active: true,
    paymentMethods: ['Bank Transfer'],
  },
  {
    fiatType: 23,
    code: 'MWK',
    symbol: 'MK',
    name: 'Malawian Kwacha',
    country: 'Malawi',
    flag: '🇲🇼',
    usdcRate: 1750,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 19,
    code: 'XAF',
    symbol: 'FCFA',
    name: 'Central African CFA Franc',
    country: 'Central Africa',
    flag: '🇨🇲',
    usdcRate: 600,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 39,
    code: 'XOF',
    symbol: 'CFA',
    name: 'West African CFA Franc',
    country: 'West Africa',
    flag: '🇧🇯',
    usdcRate: 600,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },
  {
    fiatType: 40,
    code: 'CDF',
    symbol: 'FC',
    name: 'Congolese Franc',
    country: 'DR Congo',
    flag: '🇨🇩',
    usdcRate: 2800,
    active: true,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
  },

  // Europe (non-EUR)
  {
    fiatType: 33,
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish Zloty',
    country: 'Poland',
    flag: '🇵🇱',
    usdcRate: 4.0,
    active: true,
    paymentMethods: ['Bank Transfer', 'BLIK'],
  },
];

/**
 * Get currency config by fiatType
 */
export function getCurrencyByFiatType(fiatType: number): CurrencyConfig | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.fiatType === fiatType);
}

/**
 * Get currency config by currency code
 */
export function getCurrencyByCode(code: string): CurrencyConfig | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code.toUpperCase());
}

/**
 * Calculate fiat amount for a given USDC amount and currency
 */
export function calculateFiatAmount(usdcAmount: number, fiatType: number): number {
  const currency = getCurrencyByFiatType(fiatType);
  if (!currency) {
    // Default to INR if currency not found
    return Math.ceil(usdcAmount * 85);
  }

  // Round up to avoid underpayment
  return Math.ceil(usdcAmount * currency.usdcRate);
}

/**
 * Get popular currencies (shown first in dropdown)
 */
export function getPopularCurrencies(): CurrencyConfig[] {
  // Return first 8 currencies (USD, EUR, INR, GBP, CAD, BRL, MXN, ARS)
  return SUPPORTED_CURRENCIES.slice(0, 8);
}

/**
 * Get all active currencies
 */
export function getAllCurrencies(): CurrencyConfig[] {
  return SUPPORTED_CURRENCIES.filter(c => c.active);
}
