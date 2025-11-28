import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Shield, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { generateEphemeralKeyPair, deriveSharedSecret, decryptWithSharedSecret } from '@/lib/ecdh';
import { Input } from './ui/input';

// Define proper types for network configuration
interface NetworkConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export function WalletExport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const privateKeyRef = useRef<string>('');
  const [displayKey, setDisplayKey] = useState<boolean>(false);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [networkAdded, setNetworkAdded] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Start / stop the countdown timer
  useEffect(() => {
    if (!displayKey) return;

    const intervalId = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setDisplayKey(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean-up only clears the interval
    return () => clearInterval(intervalId);
  }, [displayKey]);

  // Clear the key only AFTER the dialog has been closed
  useEffect(() => {
    if (!displayKey) {
      privateKeyRef.current = '';
      setRemainingTime(60);
      setNetworkAdded(false);
    }
  }, [displayKey]);

  const handleStartExport = async () => {
    setLoading(true);
    setError(null);
    privateKeyRef.current = ''; // Clear any previous key
    setDisplayKey(false); // Reset display state
    setNetworkAdded(false);

    try {
      // 1. Generate ephemeral ECDH key pair
      const { publicKeyBase64, privateKey: clientPrivateKey } = await generateEphemeralKeyPair();

      // 2. Send POST with client pub key & OTP (step-up auth)
      const response = await api.post('/api/wallet/export-data', {
        ephemeralPublicKey: publicKeyBase64,
        otp: otpCode.trim()
      });

      const data = response; // api.post already throws on non-OK

      if (!data || !data.cipherText || !data.iv || !data.serverPublicKey) {
        throw new Error('Invalid response from server');
      }

      // 3. Derive shared secret & decrypt
      const secret = await deriveSharedSecret(clientPrivateKey, data.serverPublicKey);
      const decryptedKey: string = await decryptWithSharedSecret(
        data.cipherText,
        data.iv,
        secret
      );

      // Store the network config if available
      if (data.networkConfig) {
        setNetworkConfig(data.networkConfig);
      }

      // Ensure 0x prefix
      const formattedKey = decryptedKey.startsWith('0x') ? decryptedKey : `0x${decryptedKey}`;

      privateKeyRef.current = formattedKey;
      setRemainingTime(60); // 60-second countdown

      // Force update the UI to show the key
      setTimeout(() => {
        setDisplayKey(true);
      }, 100); // Small delay to ensure state updates

    } catch (err: any) {
      console.error('Export error:', err);
      let errorMessage = 'Failed to export wallet data';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      setDisplayKey(false);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (!privateKeyRef.current) {
        setError('No private key available to copy');
        return;
      }

      if (remainingTime <= 0) {
        setError('Private key has expired. Please export again.');
        return;
      }

      // Try to use modern Clipboard API first
      try {
        await navigator.clipboard.writeText(privateKeyRef.current);
        // Successfully copied using Clipboard API
      } catch (clipboardErr) {
        // Clipboard API failed, using fallback
        // Fallback to document.execCommand
        const input = document.createElement('textarea');
        input.value = privateKeyRef.current;
        input.setAttribute('readonly', '');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }

      // Show success feedback without alert dialog
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Don't log the error as it might contain sensitive data
      setError('Failed to copy to clipboard. Please try selecting and copying the text manually.');
    }
  };

  // Production-grade implementation of MetaMask network integration following EIP-3085 and EIP-3326
  const addNetworkToMetaMask = async () => {
    setError(null);
    try {
      if (!window.ethereum) {
        setError('MetaMask is not installed.');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      if (!networkConfig) {
        setError('Network configuration missing.');
        return;
      }

      // Ensure user is connected
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      try {
        // Try switching first (network might already be added)
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }]
        });
      } catch (switchError: any) {
        // Error code 4902 indicates network is not added
        if (switchError.code === 4902) {
          // Add network
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig]
          });
        } else {
          setError(switchError.message || 'Failed to switch network');
          return;
        }
      }

      // All good
      setNetworkAdded(true);
      return true; // Return explicit value to avoid promise issues
    } catch (err: any) {
      if (err.code === 4001) {
        setError('You rejected the request.');
      } else {
        setError(err.message || 'MetaMask configuration failed.');
      }
      return false; // Return explicit value on error
    }
  };

  // Send OTP to user's email
  const handleSendOtp = async () => {
    try {
      await api.post('/api/wallet/export-request');
      setOtpRequested(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {displayKey ? "Your Private Key" : "Export Wallet to MetaMask"}
        </CardTitle>
        <CardDescription>
          {displayKey
            ? `Visible for ${remainingTime} seconds - Copy to MetaMask`
            : "Securely export your wallet to use with MetaMask"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!displayKey && (
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <AlertTitle className="text-amber-800 dark:text-amber-300">Security Warning</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <p>Your private key gives complete control over your funds. Never share it with anyone.</p>
              <p className="mt-1">The key will only be visible for 60 seconds after export.</p>
              <p className="mt-1">Once exported, Roxonn cannot recover your funds if your private key is compromised.</p>
            </AlertDescription>
          </Alert>
        )}

        {!displayKey && (
          <div className="space-y-3">
            <Button onClick={handleSendOtp} disabled={otpRequested || loading}>
              {otpRequested ? 'OTP Sent' : 'Send OTP to Email'}
            </Button>
            {otpRequested && (
              <Input
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                maxLength={6}
                className="max-w-[160px]"
              />
            )}
            <Button onClick={handleStartExport} disabled={!otpCode || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Export Wallet
            </Button>
          </div>
        )}

        {displayKey && privateKeyRef.current && (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-md font-mono text-base border-2 border-amber-500 dark:border-amber-400 overflow-visible">
              <h3 className="text-black dark:text-white font-bold mb-2 text-lg">Private Key:</h3>

              <textarea
                readOnly
                className="w-full bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-700 text-black dark:text-white break-all min-h-[60px]"
                value={privateKeyRef.current}
                id="private-key-textarea"
              />

              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-gray-800"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Key"}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>MetaMask Instructions</CardTitle>
                <CardDescription>
                  Follow these steps to import your account to MetaMask
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Open MetaMask and click on account icon (top-right)</li>
                  <li>Select "Import Account"</li>
                  <li>Paste your private key and click "Import"</li>
                  <li>Click the button below to add XDC Network</li>
                </ol>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    onClick={copyToClipboard}
                    disabled={remainingTime <= 0 || !privateKeyRef.current}
                    variant="outline"
                    className="flex items-center justify-center"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" /> Copy Private Key
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={addNetworkToMetaMask}
                    disabled={!privateKeyRef.current || networkAdded}
                    className="flex items-center justify-center"
                  >
                    {networkAdded ? (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Configured!
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" /> Configure MetaMask
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {loading && (
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-md flex flex-col items-center justify-center min-h-[120px] border border-gray-300 dark:border-gray-700">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 mb-2 animate-spin text-amber-500" />
              <span className="text-amber-500 font-bold">Loading your private key...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
