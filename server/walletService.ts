import { TatumSDK, Network } from '@tatumio/tatum';
import { EvmWalletProvider } from '@tatumio/evm-wallet-provider';
import { log } from './utils';
import { config } from './config';
import { ethers } from 'ethers';
import { db, users } from "./db";
import { generateMnemonic, mnemonicToSeed } from "ethereum-cryptography/bip39";
import { HDKey } from "ethereum-cryptography/hdkey";
import * as crypto from 'crypto'; // Using Node.js native crypto
import { getWalletSecret } from './aws'; // Import the AWS KMS decryption function
import { validatePrivateKey } from './keyValidation'; // Import enhanced key validation

// Interface for single XDC wallet
export interface WalletDetails {
    address: string;
    privateKey?: string;
    mnemonic?: string;
    xpub?: string;
}

export interface SingleWallet {
    xdc: WalletDetails;
    mnemonic: string;
    referenceId: string;
}

export interface MultiNetworkWallet {
    xdc: WalletDetails;
    ethereum?: WalletDetails;
    polygon?: WalletDetails;
    bsc?: WalletDetails;
    mnemonic: string;
    referenceId: string;
}

export interface NetworkConfig {
    name: string;
    rpc: string;
    chainId: number;
    network: Network;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    usdtContractAddress?: string; // USDT contract address on this network
    usdcContractAddress?: string; // USDC contract address on this network
}

// Network configurations
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
    xdc: {
        name: 'XDC Network',
        rpc: process.env.XDC_RPC_URL || 'https://rpc.xinfin.network',
        chainId: 50,
        network: Network.XINFIN,
        nativeCurrency: {
            name: 'XDC',
            symbol: 'XDC',
            decimals: 18
        },
        usdcContractAddress: '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1' // USDC on XDC
    },
    ethereum: {
        name: 'Ethereum',
        rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
        chainId: 1,
        network: Network.ETHEREUM,
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        usdtContractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' // USDT on Ethereum
    },
    polygon: {
        name: 'Polygon',
        rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137,
        network: Network.POLYGON,
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        },
        usdtContractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // USDT on Polygon
    },
    bsc: {
        name: 'BSC',
        rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
        chainId: 56,
        network: Network.BINANCE_SMART_CHAIN,
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        usdtContractAddress: '0x55d398326f99059fF775485246999027B3197955' // USDT on BSC
    }
};

// Custom network configuration for XDC
interface XdcNetwork {
    name: string;
    rpc: string;
    chainId: number;
}

export class WalletService {
    private tatumSdks: Map<string, any> = new Map();
    private tatumApiKey: string = config.tatumApiKey || '';
    private lastApiCall: number = 0;
    private readonly API_RATE_LIMIT_MS = 334; // ~3 requests per second (1000ms/3 = 333ms + buffer)

    constructor() {
        this.initializeAllSdks();
    }
    
    /**
     * Rate limiting and retry mechanism for Tatum API calls
     */
    private async retryApiCall<T>(apiCall: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        // Rate limiting: ensure minimum time between API calls
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        if (timeSinceLastCall < this.API_RATE_LIMIT_MS) {
            const delay = this.API_RATE_LIMIT_MS - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastApiCall = Date.now();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error: any) {
                if (error.statusCode === 429 && attempt < maxRetries) {
                    // Rate limit hit, wait exponentially longer
                    const retryDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
                    log(`Rate limit hit, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`, 'wallet');
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // For other errors, wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error('Max retries exceeded');
    }
    
    /**
     * Initialize SDKs for all supported networks
     */
    private async initializeAllSdks() {
        if (!this.tatumApiKey) {
            log("No Tatum API key provided, wallet service functionality will be limited", "wallet");
            return;
        }

        try {
            log('Initializing Tatum SDKs for all networks...', 'wallet');
            
            // Initialize XDC Network (existing)
            await this.initializeNetworkSdk('xdc');
            
            // Initialize other networks if API key allows
            try {
                await this.initializeNetworkSdk('polygon');
                log('Polygon SDK initialized successfully', 'wallet');
            } catch (error) {
                log(`Polygon SDK initialization failed: ${error}`, 'wallet');
            }
            
            try {
                await this.initializeNetworkSdk('ethereum');
                log('Ethereum SDK initialized successfully', 'wallet');
            } catch (error) {
                log(`Ethereum SDK initialization failed: ${error}`, 'wallet');
            }
            
            try {
                await this.initializeNetworkSdk('bsc');
                log('BSC SDK initialized successfully', 'wallet');
            } catch (error) {
                log(`BSC SDK initialization failed: ${error}`, 'wallet');
            }
            
        } catch (error: any) {
            log(`Failed to initialize Tatum SDKs: ${error.message}`, 'wallet');
        }
    }

    /**
     * Initialize SDK for a specific network
     */
    private async initializeNetworkSdk(networkName: string) {
        const networkConfig = SUPPORTED_NETWORKS[networkName];
        if (!networkConfig) {
            throw new Error(`Unsupported network: ${networkName}`);
        }

        try {
            const sdk = await TatumSDK.init({
                configureWalletProviders: [EvmWalletProvider],
                network: networkConfig.network,
                apiKey: {
                    v4: this.tatumApiKey
                }
            });
            
            this.tatumSdks.set(networkName, sdk);
            log(`${networkConfig.name} SDK initialized successfully`, 'wallet');
        } catch (error: any) {
            log(`Failed to initialize ${networkConfig.name} SDK: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Get SDK for a specific network, initializing if needed
     */
    private async getNetworkSdk(networkName: string = 'xdc') {
        let sdk = this.tatumSdks.get(networkName);
        
        if (!sdk) {
            await this.initializeNetworkSdk(networkName);
            sdk = this.tatumSdks.get(networkName);
        }
        
        if (!sdk) {
            throw new Error(`Failed to initialize SDK for network: ${networkName}`);
        }
        
        return sdk;
    }

    /**
     * Ensures the SDK is initialized before using it (legacy method for XDC)
     * @returns The initialized XDC SDK instance
     * @throws Error if SDK initialization fails
     */
    private async ensureSdkInitialized() {
        return await this.getNetworkSdk('xdc');
    }

    private async initializeSdk() {
        // Legacy method - now delegates to XDC network initialization
        await this.initializeNetworkSdk('xdc');
    }

    async generateMnemonic(): Promise<string> {
        try {
            // Ensure XDC SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const mnemonic = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generateMnemonic();
            
            log('Generated new mnemonic', 'wallet');
            return mnemonic;
        } catch (error: any) {
            log(`Failed to generate mnemonic: ${error.message}`, 'wallet');
            throw error;
        }
    }

    /**
     * Generate single XDC wallet from a mnemonic
     */
    async generateSingleWallet(): Promise<SingleWallet> {
        try {
            log('Generating single XDC wallet...', 'wallet');
            
            // Generate master mnemonic
            const mnemonic = await this.generateMnemonic();
            const referenceId = crypto.randomUUID();
            
            // Generate XDC wallet (required)
            const xdcWallet = await this.generateNetworkWallet('xdc', mnemonic, 0);
            
            // Create single wallet object with only XDC wallet
            const singleWallet: SingleWallet = {
                xdc: xdcWallet,
                mnemonic,
                referenceId
            };
            
            log('Single XDC wallet generation completed', 'wallet');
            return singleWallet;
            
        } catch (error: any) {
            log(`Failed to generate single XDC wallet: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Generate multi-network wallet from a single mnemonic
     */
    async generateMultiNetworkWallet(): Promise<MultiNetworkWallet> {
        try {
            log('Generating multi-network wallet...', 'wallet');
            
            // Generate master mnemonic
            const mnemonic = await this.generateMnemonic();
            const referenceId = crypto.randomUUID();
            
            // Generate XDC wallet (required)
            const xdcWallet = await this.generateNetworkWallet('xdc', mnemonic, 0);
            
            // Generate other network wallets (optional, based on available SDKs)
            const multiWallet: MultiNetworkWallet = {
                xdc: xdcWallet,
                mnemonic,
                referenceId
            };
            
            // Try to generate Polygon wallet
            try {
                const polygonWallet = await this.generateNetworkWallet('polygon', mnemonic, 0);
                multiWallet.polygon = polygonWallet;
                log('Polygon wallet generated successfully', 'wallet');
            } catch (error) {
                log(`Polygon wallet generation failed: ${error}`, 'wallet');
            }
            
            // Try to generate Ethereum wallet
            try {
                const ethereumWallet = await this.generateNetworkWallet('ethereum', mnemonic, 0);
                multiWallet.ethereum = ethereumWallet;
                log('Ethereum wallet generated successfully', 'wallet');
            } catch (error) {
                log(`Ethereum wallet generation failed: ${error}`, 'wallet');
            }
            
            log('Multi-network wallet generation completed', 'wallet');
            return multiWallet;
            
        } catch (error: any) {
            log(`Failed to generate multi-network wallet: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Generate wallet for a specific network
     */
    async generateNetworkWallet(networkName: string, mnemonic: string, index: number = 0): Promise<WalletDetails> {
        try {
            const sdk = await this.getNetworkSdk(networkName);
            const networkConfig = SUPPORTED_NETWORKS[networkName];
            
            // Generate address from mnemonic
            let address = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generateAddressFromMnemonic(mnemonic, index);
            
            // Convert to network-specific format if needed (XDC uses 'xdc' prefix)
            if (networkName === 'xdc' && address.startsWith('0x')) {
                address = `xdc${address.slice(2)}`;
            }
            
            // Generate private key
            const privateKey = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generatePrivateKeyFromMnemonic(mnemonic, index);
            
            log(`Generated ${networkConfig.name} wallet at index ${index}`, 'wallet');
            
            return {
                address,
                privateKey,
                mnemonic
            };
            
        } catch (error: any) {
            log(`Failed to generate ${networkName} wallet: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async generateXpub(mnemonic: string): Promise<{ xpub: string }> {
        try {
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const xpubDetails = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generateXpub(mnemonic);
            
            log('Generated xpub from mnemonic', 'wallet');
            return xpubDetails;
        } catch (error: any) {
            log(`Failed to generate xpub: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async generateAddressFromMnemonic(mnemonic: string, index: number = 0): Promise<string> {
        try {
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const address = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generateAddressFromMnemonic(mnemonic, index);
            
            // Convert to XDC format
            const xdcAddress = address.startsWith('0x') ? `xdc${address.slice(2)}` : address;
            log(`Generated address from mnemonic at index ${index}`, 'wallet');
            return xdcAddress;
        } catch (error: any) {
            log(`Failed to generate address from mnemonic: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async generateAddressFromXpub(xpub: string, index: number = 0): Promise<string> {
        try {
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const address = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generateAddressFromXpub(xpub, index);
            
            // Convert to XDC format
            const xdcAddress = address.startsWith('0x') ? `xdc${address.slice(2)}` : address;
            log(`Generated address from xpub at index ${index}`, 'wallet');
            return xdcAddress;
        } catch (error: any) {
            log(`Failed to generate address from xpub: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async generatePrivateKey(mnemonic: string, index: number = 0): Promise<string> {
        try {
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const privateKey = await sdk.walletProvider
                .use(EvmWalletProvider)
                .generatePrivateKeyFromMnemonic(mnemonic, index);
            
            log(`Generated private key from mnemonic at index ${index}`, 'wallet');
            return privateKey;
        } catch (error: any) {
            log(`Failed to generate private key: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async signAndBroadcastTransaction(payload: {
        privateKey: string;
        to: string;
        value?: string;
        data?: string;
        nonce?: number;
        gasLimit?: string;
        gasPrice?: string;
    }): Promise<string> {
        try {
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            // Convert XDC address to ETH format if needed
            const toAddress = payload.to.startsWith('xdc') ? `0x${payload.to.slice(3)}` : payload.to;
            
            // Get current gas price if not provided
            if (!payload.gasPrice) {
                const feeData = await sdk.rpc.getFeeData();
                payload.gasPrice = feeData.gasPrice.toString();
            }

            // Estimate gas limit if not provided
            if (!payload.gasLimit) {
                const estimatedGas = await sdk.rpc.estimateGas({
                    to: toAddress,
                    value: payload.value ? ethers.parseEther(payload.value) : 0,
                    data: payload.data
                });
                payload.gasLimit = estimatedGas.toString();
            }

            const txHash = await sdk.walletProvider
                .use(EvmWalletProvider)
                .signAndBroadcast({
                    ...payload,
                    to: toAddress
                });
            
            log(`Transaction signed and broadcasted: ${txHash}`, 'wallet');
            return txHash;
        } catch (error: any) {
            log(`Failed to sign and broadcast transaction: ${error.message}`, 'wallet');
            throw error;
        }
    }

    async getBalance(address: string): Promise<string> {
        try {
            // Convert XDC address to ETH format if needed
            const ethAddress = address.startsWith('xdc') ? `0x${address.slice(3)}` : address;
            
            // Ensure SDK is initialized
            const sdk = await this.ensureSdkInitialized();
            
            const balanceResponse = await sdk.rpc.getBalance(ethAddress);
            
            // Debug the actual response to understand its structure
            console.log('Raw balance response:', balanceResponse);
            
            // Extract the numeric value from the JSON-RPC response
            let balanceValue;
            
            if (typeof balanceResponse === 'string') {
                balanceValue = balanceResponse;
            } else if (typeof balanceResponse === 'number') {
                balanceValue = balanceResponse.toString();
            } else if (typeof balanceResponse === 'object' && balanceResponse !== null) {
                const obj = balanceResponse as any;
                
                // Based on the logs, we can see it's a JSON-RPC response with result property
                if (obj.result) {
                    console.log('Found result property, type:', typeof obj.result);
                    
                    // Handle BigNumber object directly
                    if (typeof obj.result === 'object') {
                        // Check if it's a BigNumber (has properties like s, e, c)
                        if (obj.result.s !== undefined && obj.result.e !== undefined && obj.result.c) {
                            console.log('Detected BigNumber format with s, e, c properties');
                            // This is likely a BigNumber - try to get its string representation
                            try {
                                // If it has a toString method, use it
                                if (typeof obj.result.toString === 'function') {
                                    balanceValue = obj.result.toString();
                                    console.log('Using BigNumber toString():', balanceValue);
                                }
                            } catch (e) {
                                console.log('Error calling toString on BigNumber:', e);
                            }
                        }
                    } else {
                        // If result is not an object, use it directly
                        balanceValue = String(obj.result);
                    }
                } else {
                    // Try other common property names if result isn't present
                    if (obj.hex) balanceValue = obj.hex;
                    else if (obj._hex) balanceValue = obj._hex;
                    else if (obj.value) balanceValue = obj.value;
                    else if (obj.balance) balanceValue = obj.balance;
                    else if (obj.amount) balanceValue = obj.amount;
                }
            }
            
            // If we couldn't extract a value, use the original response
            if (balanceValue === undefined) {
                balanceValue = String(balanceResponse);
            }
            
            console.log(`Extracted balance value: ${balanceValue}`);
            log(`Got balance for address ${address}`, 'wallet');
            
            return String(balanceValue);
        } catch (error: any) {
            log(`Failed to get balance: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Get wallet details including balance and address
     * Used by the sell-xdc-url endpoint to verify wallet balance
     */
    async getWalletDetails(address: string): Promise<{ address: string, balance: string }> {
        try {
            const balance = await this.getBalance(address);
            // Ensure balance is always returned as a string
            return {
                address,
                balance: typeof balance === 'string' ? balance : String(balance)
            };
        } catch (error: any) {
            log(`Failed to get wallet details: ${error.message}`, 'wallet');
            throw error;
        }
    }

    /**
     * Securely retrieve encrypted wallet data for client-side MetaMask export
     * This only returns encrypted data - never plaintext private keys
     */
    /**
     * Get wallet data for MetaMask export
     * Production-grade implementation that retrieves the actual wallet private key
     * This is a sensitive operation that returns the private key
     */
    async getWalletDataForExport(userId: number): Promise<{ 
        address: string; 
        privateKey: string;
    }> {
        try {
            // Get user information with wallet reference ID
            const user = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, userId)
            });
            
            if (!user || !user.xdcWalletAddress || !user.walletReferenceId) {
                log('Wallet not found or incomplete for export', 'wallet');
                throw new Error('Wallet not found or incomplete');
            }
            
            // For security, log this sensitive operation
            log(`Wallet export requested for user ${userId}`, 'security', 'security');
            
            try {
                // Get the actual wallet secret from KMS
                const walletData = await getWalletSecret(user.walletReferenceId);
                
                if (!walletData) {
                    log('Wallet data not found', 'wallet');
                    throw new Error('Could not retrieve wallet data');
                }
                
                if (!walletData.privateKey) {
                    log('Private key missing in wallet data', 'wallet');
                    throw new Error('Private key not found in wallet data');
                }
                
                // Remove any whitespace and ensure proper format for MetaMask
                let privateKey = walletData.privateKey.trim();
                
                // Remove '0x' prefix if it exists - we'll add it back in a consistent way
                if (privateKey.startsWith('0x')) {
                    privateKey = privateKey.substring(2);
                }
                
                // Ensure the key is a valid hex string of the correct length (64 characters for a 32-byte key)
                // Enhanced validation with entropy and secp256k1 checks
                const validation = validatePrivateKey(privateKey);
                if (!validation.isValid) {
                    log(`Invalid private key format: ${validation.errors.join(', ')}`, 'security');
                    throw new Error(`Invalid private key format: ${validation.errors.join(', ')}`);
                }
                
                // Add the 0x prefix for MetaMask
                const formattedPrivateKey = '0x' + privateKey;
                
                // Verify that the private key corresponds to the correct address
                try {
                    log('Verifying private key matches wallet address', 'wallet', 'security');
                    const wallet = new ethers.Wallet(formattedPrivateKey);
                    const derivedAddress = wallet.address;
                    
                    // Convert addresses to lowercase for case-insensitive comparison
                    // XDC addresses start with 'xdc' instead of '0x', so we need to handle that
                    const normalizedUserAddress = user.xdcWalletAddress.toLowerCase().replace('xdc', '0x');
                    const normalizedDerivedAddress = derivedAddress.toLowerCase();
                    
                    log(`Address verification in progress`, 'wallet', 'security');
                    
                    if (normalizedUserAddress !== normalizedDerivedAddress) {
                        log(`Address mismatch detected during wallet export`, 'security', 'error');
                        // If addresses don't match, this is a critical security issue
                        log(`CRITICAL SECURITY ERROR: Address mismatch detected`, 'security', 'error');
                        throw new Error('Address verification failed - security measure');
                    }
                    
                    log('Private key verification successful', 'wallet', 'security');
                    
                    // Return the verified address and private key
                    return {
                        address: user.xdcWalletAddress,
                        privateKey: formattedPrivateKey
                    };
                } catch (error: any) {
                    // If verification fails, log it but DO NOT use a fallback key
                    // This is a critical security measure
                    log(`Private key verification failed: ${error.message}`, 'security', 'error');
                    
                    // Never use hardcoded keys - throw an error instead
                    throw new Error('Wallet verification failed - security measure');
                }
            } catch (error: any) {
                log(`Error retrieving private key: ${error.message}`, 'wallet');
                throw new Error('Failed to retrieve private key for export');
            }
        } catch (error: any) {
            log(`Failed to get wallet data for export: ${error.message}`, 'wallet');
            throw error;
        }
    }

    /**
     * Verify that a private key corresponds to the expected wallet address
     * @param privateKey The private key to verify
     * @param expectedAddress The expected wallet address
     * @returns Boolean indicating if the key matches the address
     */
    private async verifyPrivateKey(privateKey: string, expectedAddress: string): Promise<boolean> {
        try {
            // Create a wallet from the private key
            const wallet = new ethers.Wallet(privateKey);
            
            // Get the address from the wallet
            const derivedAddress = wallet.address;
            
            // Normalize addresses for comparison (handle XDC prefix)
            const normalizedExpected = expectedAddress.toLowerCase().replace('xdc', '0x');
            const normalizedDerived = derivedAddress.toLowerCase();
            
            return normalizedExpected === normalizedDerived;
        } catch (error: any) {
            log(`Error verifying private key: ${error.message}`, 'wallet');
            return false;
        }
    }
    
    /**
     * Transfer USDT tokens on supported networks
     */
    async transferUSDT(params: {
        privateKey: string;
        toAddress: string;
        amount: string;
        networkName: string;
    }): Promise<string> {
        try {
            const { privateKey, toAddress, amount, networkName } = params;
            const networkConfig = SUPPORTED_NETWORKS[networkName];
            
            if (!networkConfig || !networkConfig.usdtContractAddress) {
                throw new Error(`USDT not supported on network: ${networkName}`);
            }
            
            const sdk = await this.getNetworkSdk(networkName);
            
            // Use Tatum's ERC20 transfer method for USDT
            const txHash = await sdk.walletProvider
                .use(EvmWalletProvider)
                .transferErc20(toAddress, amount, networkConfig.usdtContractAddress);
            
            log(`USDT transfer completed on ${networkConfig.name}: ${txHash}`, 'wallet');
            return txHash;
            
        } catch (error: any) {
            log(`Failed to transfer USDT: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Get USDT balance for an address on a specific network
     */
    async getUSDTBalance(address: string, networkName: string): Promise<string> {
        try {
            const networkConfig = SUPPORTED_NETWORKS[networkName];
            
            if (!networkConfig || !networkConfig.usdtContractAddress) {
                throw new Error(`USDT not supported on network: ${networkName}`);
            }
            
            const sdk = await this.getNetworkSdk(networkName);
            
            // Convert XDC address format if needed
            const ethAddress = address.startsWith('xdc') ? `0x${address.slice(3)}` : address;
            
            // Use proper ERC20 balanceOf method call instead of getBalance
            const balanceResponse = await this.retryApiCall(async () => {
                // ERC20 balanceOf function signature: balanceOf(address) -> uint256
                const balanceOfSelector = '0x70a08231'; // keccak256('balanceOf(address)') first 4 bytes
                const paddedAddress = ethAddress.toLowerCase().replace('0x', '').padStart(64, '0');
                const callData = balanceOfSelector + paddedAddress;
                
                return await sdk.rpc.call({
                    to: networkConfig.usdtContractAddress,
                    data: callData
                }, 'latest');
            });
            
            // Extract balance from RPC response
            let balance = '0';
            if (typeof balanceResponse === 'string') {
                // Convert hex result to decimal string
                if (balanceResponse.startsWith('0x') && balanceResponse.length > 2) {
                    try {
                        const hexBalance = balanceResponse;
                        balance = BigInt(hexBalance).toString();
                    } catch (conversionError) {
                        log(`Error converting hex balance ${balanceResponse}: ${conversionError}`, 'wallet');
                        balance = '0';
                    }
                } else {
                    balance = balanceResponse;
                }
            } else if (typeof balanceResponse === 'object' && balanceResponse?.result) {
                // Handle JSON-RPC response format
                const hexResult = balanceResponse.result;
                if (hexResult && hexResult.startsWith('0x')) {
                    try {
                        balance = BigInt(hexResult).toString();
                    } catch (conversionError) {
                        log(`Error converting hex result ${hexResult}: ${conversionError}`, 'wallet');
                        balance = '0';
                    }
                } else {
                    balance = hexResult || '0';
                }
            } else if (typeof balanceResponse === 'object' && balanceResponse?.error) {
                log(`RPC error for USDT balance on ${networkConfig.name}: ${JSON.stringify(balanceResponse.error)}`, 'wallet');
                balance = '0';
            }
            
            log(`Retrieved USDT balance for ${address} on ${networkConfig.name}: ${balance}`, 'wallet');
            return balance;
            
        } catch (error: any) {
            log(`Failed to get USDT balance: ${error.message}`, 'wallet');
            return '0'; // Return '0' instead of throwing
        }
    }
    
    /**
     * Get native currency balance for an address on a specific network
     */
    async getNetworkBalance(address: string, networkName: string): Promise<string> {
        try {
            const networkConfig = SUPPORTED_NETWORKS[networkName];
            const sdk = await this.getNetworkSdk(networkName);
            
            // Convert XDC address format if needed
            const ethAddress = address.startsWith('xdc') ? `0x${address.slice(3)}` : address;
            
            // Get balance with retry mechanism
            const balanceResponse = await this.retryApiCall(async () => {
                return await sdk.rpc.getBalance(ethAddress);
            });
            
            // Extract balance from RPC response
            let balance = '0';
            if (typeof balanceResponse === 'string') {
                balance = balanceResponse;
            } else if (typeof balanceResponse === 'object' && balanceResponse?.result) {
                balance = balanceResponse.result;
            } else if (typeof balanceResponse === 'object' && balanceResponse?.error) {
                log(`RPC error for ${networkConfig.nativeCurrency.symbol} balance: ${JSON.stringify(balanceResponse.error)}`, 'wallet');
                balance = '0';
            }
            
            log(`Retrieved ${networkConfig.nativeCurrency.symbol} balance for ${address}: ${balance}`, 'wallet');
            return balance;
            
        } catch (error: any) {
            log(`Failed to get network balance: ${error.message}`, 'wallet');
            return '0'; // Return '0' instead of throwing
        }
    }
    
    async destroy() {
        // Destroy all SDK instances
        for (const networkName of Array.from(this.tatumSdks.keys())) {
            try {
                const sdk = this.tatumSdks.get(networkName);
                if (sdk) {
                    await sdk.destroy();
                    log(`${networkName} SDK destroyed`, 'wallet');
                }
            } catch (error: any) {
                log(`Error destroying ${networkName} SDK: ${error.message}`, 'wallet');
            }
        }
        this.tatumSdks.clear();
    }
    
    /**
     * Get supported networks with their configurations
     */
    getSupportedNetworks(): Record<string, NetworkConfig> {
        return SUPPORTED_NETWORKS;
    }
    
    /**
     * Get token balance for a specific network and token
     */
    async getTokenBalance(networkName: string, address: string, tokenSymbol: string): Promise<string | null> {
        try {
            log(`Getting ${tokenSymbol} balance for ${address} on ${networkName}`, 'wallet');
            
            // For ROXN token on XDC network
            if (networkName === 'xdc' && tokenSymbol === 'ROXN') {
                const networkConfig = SUPPORTED_NETWORKS[networkName];
                const sdk = await this.getNetworkSdk(networkName);
                
                // This would need to be implemented based on your ROXN token contract
                // For now, return null to indicate not implemented
                log('ROXN balance checking not yet implemented', 'wallet');
                return null;
            }
            
            return null;
        } catch (error: any) {
            log(`Failed to get ${tokenSymbol} balance: ${error.message}`, 'wallet');
            return null;
        }
    }
    
    /**
     * Check if a network supports USDT
     */
    isUSDTSupported(networkName: string): boolean {
        const config = SUPPORTED_NETWORKS[networkName];
        return config && !!config.usdtContractAddress;
    }
    
    /**
     * Get USDC balance for an address on XDC network
     */
    async getUSDCBalance(address: string): Promise<string> {
        try {
            log(`Getting USDC balance for ${address}`, 'wallet');
            const networkConfig = SUPPORTED_NETWORKS['xdc'];
            
            if (!networkConfig || !networkConfig.usdcContractAddress) {
                throw new Error(`USDC not supported on XDC network`);
            }
            
            log(`USDC contract address: ${networkConfig.usdcContractAddress}`, 'wallet');
            
            // Convert XDC address format if needed
            const ethAddress = address.startsWith('xdc') ? `0x${address.slice(3)}` : address;
            log(`Converted address: ${ethAddress}`, 'wallet');
            
            // Use ethers.js directly for reliable RPC calls
            const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
            
            // ERC20 ABI for balanceOf function
            const erc20Abi = [
                'function balanceOf(address owner) view returns (uint256)'
            ];
            
            const usdcContract = new ethers.Contract(
                networkConfig.usdcContractAddress,
                erc20Abi,
                provider
            );
            
            log(`Calling USDC balanceOf for address: ${ethAddress}`, 'wallet');
            
            // Call balanceOf with retry logic
            const balanceRaw = await this.retryApiCall(async () => {
                return await usdcContract.balanceOf(ethAddress);
            });
            
            log(`USDC balance (raw): ${balanceRaw.toString()}`, 'wallet');
            
            // USDC has 6 decimals
            const balance = balanceRaw.toString();
            const formattedBalance = (Number(balance) / 1000000).toFixed(2);
            
            log(`Retrieved USDC balance for ${address}: ${balance} (${formattedBalance} USDC)`, 'wallet');
            return formattedBalance;
            
        } catch (error: any) {
            log(`Failed to get USDC balance: ${error?.message || error?.toString() || JSON.stringify(error)}`, 'wallet');
            return '0.00'; // Return '0.00' instead of throwing
        }
    }
    
    /**
     * Transfer USDC tokens on XDC network
     */
    async transferUSDC(params: {
        privateKey: string;
        toAddress: string;
        amount: string;
    }): Promise<string> {
        try {
            const { privateKey, toAddress, amount } = params;
            const networkConfig = SUPPORTED_NETWORKS['xdc'];
            
            if (!networkConfig || !networkConfig.usdcContractAddress) {
                throw new Error(`USDC not supported on XDC network`);
            }
            
            const sdk = await this.getNetworkSdk('xdc');
            
            // Use Tatum's ERC20 transfer method for USDC
            const txHash = await sdk.walletProvider
                .use(EvmWalletProvider)
                .transferErc20(toAddress, amount, networkConfig.usdcContractAddress);
            
            log(`USDC transfer completed on XDC: ${txHash}`, 'wallet');
            return txHash;
            
        } catch (error: any) {
            log(`Failed to transfer USDC: ${error.message}`, 'wallet');
            throw error;
        }
    }
    
    /**
     * Check if a network supports USDC
     */
    isUSDCSupported(networkName: string): boolean {
        const config = SUPPORTED_NETWORKS[networkName];
        return config && !!config.usdcContractAddress;
    }
}

// Export singleton instance
export const walletService = new WalletService(); 