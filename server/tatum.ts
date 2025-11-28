import { walletService } from './walletService';
import { log } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { storeWalletSecret, getWalletSecret, SensitiveWalletData } from './aws';
import { config } from './config';
import { TatumSDK, Network } from "@tatumio/tatum";

if (!config.tatumApiKey) {
  throw new Error('TATUM_API_KEY environment variable is required');
}

// Exported interface for wallet data
export interface Wallet {
  address: string;
  referenceId: string;
  // Sensitive fields no longer returned:
  // privateKey: string;
  // mnemonic: string;
  xpub?: string;
}

/**
 * Get wallet private key from secure storage
 */
export async function getWalletPrivateKey(referenceId: string): Promise<string> {
  try {
    const secretData = await getWalletSecret(referenceId);
    if (!secretData || !secretData.privateKey) {
      throw new Error('Private key not found in secure storage');
    }
    return secretData.privateKey;
  } catch (error) {
    log(`Error retrieving private key: ${error instanceof Error ? error.message : String(error)}`, 'tatum');
    throw error;
  }
}

/**
 * Get wallet mnemonic from secure storage
 */
export async function getWalletMnemonic(referenceId: string): Promise<string> {
  try {
    const secretData = await getWalletSecret(referenceId);
    if (!secretData || !secretData.mnemonic) {
      throw new Error('Mnemonic not found in secure storage');
    }
    return secretData.mnemonic;
  } catch (error) {
    log(`Error retrieving mnemonic: ${error instanceof Error ? error.message : String(error)}`, 'tatum');
    throw error;
  }
}

/**
 * Generates a new multi-network wallet using Tatum SDK
 * This implementation follows a multi-step process:
 * 1. Generate mnemonic
 * 2. Generate wallets for all supported networks
 * 3. Store sensitive data securely and return only public data
 */
export async function generateWallet(): Promise<Wallet> {
  try {
    log('Step 1: Generating single XDC wallet...', 'tatum');
    const singleWallet = await walletService.generateSingleWallet();
    
    log('Step 2: Generating xpub...', 'tatum');
    const xpubDetails = await walletService.generateXpub(singleWallet.mnemonic);

    const referenceId = singleWallet.referenceId;

    log('Step 3: Storing sensitive wallet data securely...', 'tatum');
    const sensitiveData: SensitiveWalletData = {
      privateKey: singleWallet.xdc.privateKey!,
      mnemonic: singleWallet.mnemonic,
    };

    try {
      await storeWalletSecret(referenceId, sensitiveData);
      log('Sensitive wallet data stored successfully', 'tatum');
    } catch (storageError: any) {
      log(`Failed to store wallet data: ${storageError.message}`, 'tatum');
      
      if (storageError.message?.includes('already exists')) {
        log('Wallet with this reference ID already exists, continuing...', 'tatum');
      } else {
        // For other errors, we should rethrow
        throw storageError;
      }
    }

    log('Single XDC wallet generated successfully', 'tatum');

    // Return only non-sensitive data
    const wallet: Wallet = {
      address: singleWallet.xdc.address,
      referenceId,
      xpub: xpubDetails.xpub,
    };

    return wallet;
  } catch (error) {
    log(`Error generating wallet: ${error instanceof Error ? error.message : String(error)}`, 'tatum');
    throw error;
  }
}