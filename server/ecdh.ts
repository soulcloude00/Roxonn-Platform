import crypto from 'crypto';
import { getParameter, putParameter } from './aws';
import { log } from './utils';

/**
 * Server-side static ECDH key pair (P-256) used to envelope-encrypt
 * the wallet private key before it is sent to the browser.
 * The private key is now stored persistently in AWS Parameter Store
 * to maintain consistency across server restarts and deployments.
 */

const ecdh = crypto.createECDH('prime256v1');
let serverPublicKeyBase64: string | null = null;

/**
 * Initialize ECDH key pair from secure storage or generate new one
 */
async function initializeECDHKeys(): Promise<void> {
  try {
    log('Initializing ECDH keys from secure storage...', 'security');
    
    // Try to load existing ECDH private key from Parameter Store
    const storedPrivateKey = await getParameter('ecdh/private-key');
    
    if (storedPrivateKey) {
      // Load existing key
      log('Loading existing ECDH private key from Parameter Store', 'security');
      ecdh.setPrivateKey(storedPrivateKey, 'base64');
      
      // Verify the key is valid by generating public key
      serverPublicKeyBase64 = ecdh.getPublicKey('base64');
      log('ECDH keys loaded successfully from secure storage', 'security');
    } else {
      // Generate new key pair on first deployment
      log('No existing ECDH key found, generating new key pair...', 'security');
      ecdh.generateKeys();
      
      // Store the private key securely
      const privateKeyBase64 = ecdh.getPrivateKey('base64');
      const success = await putParameter(
        'ecdh/private-key',
        privateKeyBase64,
        'ECDH private key for client-server envelope encryption'
      );
      
      if (success) {
        serverPublicKeyBase64 = ecdh.getPublicKey('base64');
        log('New ECDH key pair generated and stored securely', 'security');
      } else {
        throw new Error('Failed to store ECDH private key in Parameter Store');
      }
    }
  } catch (error) {
    log(`Error initializing ECDH keys: ${error instanceof Error ? error.message : String(error)}`, 'security');
    throw error;
  }
}

/**
 * Get the server's public key, initializing if necessary
 */
export async function getServerPublicKey(): Promise<string> {
  if (!serverPublicKeyBase64) {
    await initializeECDHKeys();
  }
  
  if (!serverPublicKeyBase64) {
    throw new Error('Failed to initialize ECDH public key');
  }
  
  return serverPublicKeyBase64;
}

// Backward compatibility export - will be initialized on first access
export const SERVER_PUBLIC_KEY_BASE64 = getServerPublicKey();

/**
 * Derive a 32-byte shared secret from the caller's public key.
 * Ensures ECDH keys are initialized before use.
 */
export async function deriveSharedSecret(clientPublicKeyBase64: string): Promise<Buffer> {
  // Ensure ECDH keys are initialized
  if (!serverPublicKeyBase64) {
    await initializeECDHKeys();
  }
  
  const clientPubBuf = Buffer.from(clientPublicKeyBase64, 'base64');
  return ecdh.computeSecret(clientPubBuf);
}

/**
 * Encrypt plaintext with AES-256-GCM using a key derived from the shared secret.
 * Returns base64 strings for IV and ciphertext.
 */
export async function encryptWithSharedSecret(
  plaintext: string,
  sharedSecret: Buffer
): Promise<{ iv: string; cipherText: string }> {
  // Derive 32-byte symmetric key from shared secret via SHA-256
  const key = crypto.createHash('sha256').update(sharedSecret).digest(); // 32 bytes

  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cipherTextBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const output = Buffer.concat([cipherTextBuf, authTag]);

  return {
    iv: iv.toString('base64'),
    cipherText: output.toString('base64')
  };
}
