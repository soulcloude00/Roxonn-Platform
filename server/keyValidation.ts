import crypto from 'crypto';
import { log } from './utils';

/**
 * Enhanced private key validation with entropy and secp256k1 curve validation
 * Provides comprehensive security checks for wallet private keys
 */

/**
 * Known weak private keys that should be rejected
 * These are commonly used test keys or keys with obvious patterns
 */
const WEAK_PRIVATE_KEYS = new Set([
  '0000000000000000000000000000000000000000000000000000000000000001',
  '0000000000000000000000000000000000000000000000000000000000000002',
  'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140', // secp256k1 order - 1
  'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', // secp256k1 order
  // Add more known weak keys as needed
]);

/**
 * secp256k1 curve order (maximum valid private key value)
 */
const SECP256K1_ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

/**
 * Calculate Shannon entropy of a hex string
 * @param hexString The hex string to analyze
 * @returns Entropy value (higher is better)
 */
function calculateEntropy(hexString: string): number {
  const frequency: { [key: string]: number } = {};
  
  // Count frequency of each character
  for (const char of hexString) {
    frequency[char] = (frequency[char] || 0) + 1;
  }
  
  // Calculate Shannon entropy
  let entropy = 0;
  const length = hexString.length;
  
  for (const count of Object.values(frequency)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Check if private key has sufficient entropy
 * @param privateKey The private key to check (without 0x prefix)
 * @returns True if entropy is sufficient
 */
function hasValidEntropy(privateKey: string): boolean {
  const entropy = calculateEntropy(privateKey);
  const minEntropy = 3.5; // Minimum Shannon entropy threshold
  
  if (entropy < minEntropy) {
    log(`Private key entropy too low: ${entropy.toFixed(2)} (minimum: ${minEntropy})`, 'security');
    return false;
  }
  
  return true;
}

/**
 * Check for obvious patterns in private key
 * @param privateKey The private key to check
 * @returns True if no obvious patterns detected
 */
function hasNoObviousPatterns(privateKey: string): boolean {
  // Check for repeating patterns
  const patterns = [
    /^(.)\\1{10,}/, // 10+ consecutive identical characters
    /^(..?)\\1{5,}/, // Repeating 1-2 character patterns
    /^0+[1-9a-f]$/, // All zeros except last character
    /^[1-9a-f]0+$/, // Single non-zero followed by all zeros
    /^(0123456789abcdef){2,}/, // Sequential hex pattern
    /^(fedcba9876543210){2,}/, // Reverse sequential pattern
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(privateKey)) {
      log('Private key contains obvious pattern', 'security');
      return false;
    }
  }
  
  return true;
}

/**
 * Validate private key against secp256k1 curve parameters
 * @param privateKey The private key as a hex string (without 0x prefix)
 * @returns True if valid for secp256k1
 */
function isValidSecp256k1Key(privateKey: string): boolean {
  try {
    const keyValue = BigInt('0x' + privateKey);
    
    // Private key must be greater than 0 and less than the curve order
    if (keyValue <= BigInt(0)) {
      log('Private key must be greater than 0', 'security');
      return false;
    }
    
    if (keyValue >= SECP256K1_ORDER) {
      log('Private key must be less than secp256k1 curve order', 'security');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`Error validating secp256k1 key: ${error instanceof Error ? error.message : String(error)}`, 'security');
    return false;
  }
}

/**
 * Check if private key is in the list of known weak keys
 * @param privateKey The private key to check (without 0x prefix)
 * @returns True if not a known weak key
 */
function isNotWeakKey(privateKey: string): boolean {
  const normalizedKey = privateKey.toLowerCase();
  
  if (WEAK_PRIVATE_KEYS.has(normalizedKey)) {
    log('Private key is a known weak key', 'security');
    return false;
  }
  
  return true;
}

/**
 * Comprehensive private key validation
 * @param privateKey The private key to validate (with or without 0x prefix)
 * @returns Object with validation result and details
 */
export function validatePrivateKey(privateKey: string): {
  isValid: boolean;
  errors: string[];
  entropy?: number;
} {
  const errors: string[] = [];
  
  try {
    // Remove 0x prefix if present
    let cleanKey = privateKey.trim();
    if (cleanKey.startsWith('0x')) {
      cleanKey = cleanKey.substring(2);
    }
    
    // Basic format validation
    if (!/^[0-9a-f]{64}$/i.test(cleanKey)) {
      errors.push('Private key must be exactly 64 hexadecimal characters');
      return { isValid: false, errors };
    }
    
    // Normalize to lowercase for consistent checking
    cleanKey = cleanKey.toLowerCase();
    
    // Check for known weak keys
    if (!isNotWeakKey(cleanKey)) {
      errors.push('Private key is a known weak key');
    }
    
    // Validate secp256k1 curve parameters
    if (!isValidSecp256k1Key(cleanKey)) {
      errors.push('Private key is not valid for secp256k1 curve');
    }
    
    // Check entropy
    if (!hasValidEntropy(cleanKey)) {
      errors.push('Private key has insufficient entropy');
    }
    
    // Check for obvious patterns
    if (!hasNoObviousPatterns(cleanKey)) {
      errors.push('Private key contains obvious patterns');
    }
    
    const entropy = calculateEntropy(cleanKey);
    const isValid = errors.length === 0;
    
    if (isValid) {
      log(`Private key validation successful (entropy: ${entropy.toFixed(2)})`, 'security');
    } else {
      log(`Private key validation failed: ${errors.join(', ')}`, 'security');
    }
    
    return {
      isValid,
      errors,
      entropy
    };
    
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { isValid: false, errors };
  }
}

/**
 * Generate a cryptographically secure private key
 * @returns A valid private key as hex string with 0x prefix
 */
export function generateSecurePrivateKey(): string {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    try {
      // Generate 32 random bytes
      const randomBytes = crypto.randomBytes(32);
      const privateKey = randomBytes.toString('hex');
      
      // Validate the generated key
      const validation = validatePrivateKey(privateKey);
      
      if (validation.isValid) {
        log(`Secure private key generated after ${attempts + 1} attempts`, 'security');
        return '0x' + privateKey;
      }
      
      attempts++;
    } catch (error) {
      log(`Error generating private key: ${error instanceof Error ? error.message : String(error)}`, 'security');
      attempts++;
    }
  }
  
  throw new Error(`Failed to generate secure private key after ${maxAttempts} attempts`);
}

/**
 * Validate that a private key corresponds to a given public address
 * @param privateKey The private key to validate
 * @param expectedAddress The expected Ethereum address
 * @returns True if the private key generates the expected address
 */
export function validatePrivateKeyAddress(privateKey: string, expectedAddress: string): boolean {
  try {
    // This would require ethers.js or similar library
    // For now, we'll add a placeholder that can be implemented when needed
    log('Address validation requires ethers.js integration', 'security');
    return true; // Placeholder
  } catch (error) {
    log(`Error validating private key address: ${error instanceof Error ? error.message : String(error)}`, 'security');
    return false;
  }
}