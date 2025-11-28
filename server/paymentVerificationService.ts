import { db } from './db';
import { onrampTransactions, subscriptions, TransactionStatus } from '../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { log } from './utils';
import { onrampCryptoService } from './onrampCryptoService';
import { onrampMerchantService } from './onrampMerchant';
import { subscriptionService } from './subscriptionService';
import { config } from './config';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

// ERC20 ABI for reading USDC transfers
const ERC20_ABI: AbiItem[] = [
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
];

interface VerificationRequest {
  orderId?: string;
  txHash?: string;
  referenceId?: string;
  timestamp?: string;
}

interface VerificationResult {
  success: boolean;
  needsConfirmation?: boolean;
  transaction?: any;
  subscription?: any;
  message: string;
  error?: string;
}

export class PaymentVerificationService {
  private web3: Web3 | null = null;

  constructor() {
    // Initialize Web3 for Polygon network
    if (config.polygonRpcUrl) {
      this.web3 = new Web3(config.polygonRpcUrl);
    }
  }

  /**
   * Main verification entry point - routes to appropriate method
   */
  async verifyPayment(userId: number, request: VerificationRequest): Promise<VerificationResult> {
    try {
      // Rate limiting check
      const isRateLimited = await this.checkRateLimit(userId);
      if (isRateLimited) {
        return {
          success: false,
          message: 'Too many verification attempts. Please try again in 10 minutes.',
          error: 'RATE_LIMITED'
        };
      }

      // Log verification attempt
      await this.logVerificationAttempt(userId, request);

      // ONLY ALLOW ORDER ID VERIFICATION - IT'S THE ONLY SECURE METHOD
      if (request.orderId) {
        return await this.verifyByOrderId(userId, request.orderId);
      } else {
        return {
          success: false,
          message: 'Please provide your Order ID from Onramp.money receipt',
          error: 'MISSING_ORDER_ID'
        };
      }
    } catch (error) {
      log(`Payment verification error for user ${userId}: ${error}`, 'verification-ERROR');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed',
        error: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Method A: Verify by Onramp Order ID (most reliable)
   */
  private async verifyByOrderId(userId: number, orderId: string): Promise<VerificationResult> {
    try {
      log(`Verifying payment by orderId ${orderId} for user ${userId}`, 'verification');

      // IDEMPOTENCY CHECK: Check if this order ID already exists in the system
      const existingTransaction = await db.query.onrampTransactions.findFirst({
        where: eq(onrampTransactions.orderId, orderId)
      });

      if (existingTransaction) {
        // Order ID already in system - check if it belongs to this user
        if (existingTransaction.userId !== userId) {
          log(`User ${userId} attempted to use Order ID ${orderId} which belongs to user ${existingTransaction.userId}`, 'verification-WARN');
          return {
            success: false,
            message: 'This Order ID belongs to a different user',
            error: 'WRONG_USER'
          };
        }

        // Order ID belongs to this user - check subscription status
        const subscription = await subscriptionService.getSubscriptionByOrderId(orderId);

        if (subscription && subscription.status === 'active') {
          // Perfect case: already processed and active, return success (idempotent)
          log(`Order ${orderId} already verified for user ${userId}, returning success (idempotent)`, 'verification');
          return {
            success: true,
            subscription,
            message: 'Your subscription is already active with this payment',
            error: undefined
          };
        }

        // Transaction exists but subscription not active - could be edge case
        // Let it proceed to try reprocessing
        log(`Order ${orderId} exists for user ${userId} but subscription not active, attempting reprocessing`, 'verification-WARN');
      }

      // 1. Try to get order details from Onramp API
      let orderDetails;
      try {
        orderDetails = await onrampCryptoService.getOrderStatus(orderId);
      } catch (apiError: any) {
        // If 404, it's likely a merchant checkout order
        if (apiError.response?.status === 404) {
          log(`Order ${orderId} not found via API. Likely merchant checkout order. Checking database.`, 'verification-WARN');

          // For merchant checkout orders, we need to match with pending transactions
          // Since we can't verify via API, we'll match the order ID pattern
          // and activate if we have a recent pending transaction for this user

          // Check if user has recent pending transactions
          const pendingTx = await db.query.onrampTransactions.findFirst({
            where: and(
              eq(onrampTransactions.userId, userId),
              eq(onrampTransactions.status, TransactionStatus.INITIATED),
              sql`${onrampTransactions.metadata}->>'type' = 'subscription'`,
              sql`${onrampTransactions.createdAt} > NOW() - INTERVAL '24 hours'`
            ),
            orderBy: [desc(onrampTransactions.createdAt)]
          });

          if (!pendingTx) {
            return {
              success: false,
              message: 'No pending payment found for your account. Please ensure you initiated payment from this account.',
              error: 'NO_PENDING_PAYMENT'
            };
          }

          // Since we can't verify the order via API, we'll trust the user
          // but log this for manual review
          log(`MANUAL VERIFICATION: User ${userId} claiming order ${orderId} for pending tx ${pendingTx.merchantRecognitionId}`, 'verification-IMPORTANT');

          // Use database transaction for atomicity
          const result = await db.transaction(async (tx) => {
            // Check one more time inside transaction that orderId doesn't exist
            const duplicateCheck = await tx.query.onrampTransactions.findFirst({
              where: eq(onrampTransactions.orderId, orderId)
            });

            if (duplicateCheck && duplicateCheck.id !== pendingTx.id) {
              throw new Error(`Order ID ${orderId} is already in use`);
            }

            // Update the transaction with the order ID
            await tx.update(onrampTransactions)
              .set({
                orderId: orderId,
                status: TransactionStatus.SUCCESS,
                statusMessage: 'Manually verified - merchant checkout',
                updatedAt: new Date()
              })
              .where(eq(onrampTransactions.id, pendingTx.id));

            // Activate subscription
            const subscription = await subscriptionService.activateOrRenewSubscription(
              userId,
              'courses_yearly',
              orderId,
              undefined, // No txHash yet
              '10' // Default amount for subscription
            );

            return subscription;
          });

          log(`Subscription activated for user ${userId} via manual merchant checkout verification`, 'verification');

          return {
            success: true,
            subscription: result,
            message: 'Payment verified! Your subscription is now active.',
            error: undefined
          };
        }
        throw apiError;
      }

      if (!orderDetails) {
        return {
          success: false,
          message: 'Order not found. Please check your Order ID.',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // 2. Extract merchantRecognitionId
      const merchantId = orderDetails.merchantRecognitionId;
      if (!merchantId) {
        return {
          success: false,
          message: 'Invalid order details received from payment provider',
          error: 'INVALID_ORDER_DETAILS'
        };
      }

      // 3. Verify it belongs to requesting user
      const extractedUserId = onrampMerchantService.extractUserIdFromMerchantId(merchantId);
      if (extractedUserId !== userId) {
        log(`User ${userId} attempted to verify payment belonging to user ${extractedUserId}`, 'verification-WARN');
        return {
          success: false,
          message: 'This payment belongs to another user',
          error: 'WRONG_USER'
        };
      }

      // 4. Check if it's a subscription payment
      if (!onrampMerchantService.isSubscriptionMerchantId(merchantId)) {
        return {
          success: false,
          message: 'This is not a subscription payment',
          error: 'NOT_SUBSCRIPTION'
        };
      }

      // 5. Check payment status
      if (!onrampMerchantService.isSuccessStatus(orderDetails.statusCode, orderDetails.status)) {
        return {
          success: false,
          message: `Payment is not successful. Status: ${orderDetails.status}`,
          error: 'PAYMENT_NOT_SUCCESSFUL'
        };
      }

      // 6. Find the INITIATED transaction
      const transaction = await db.query.onrampTransactions.findFirst({
        where: eq(onrampTransactions.merchantRecognitionId, merchantId)
      });

      if (!transaction) {
        log(`No transaction found for merchantId ${merchantId}`, 'verification-ERROR');
        return {
          success: false,
          message: 'Payment initiation record not found. Please contact support.',
          error: 'TRANSACTION_NOT_FOUND'
        };
      }

      // 7. Check if already used
      const existingSubscription = await subscriptionService.getSubscriptionByOrderId(orderId);
      if (existingSubscription && existingSubscription.status === 'active') {
        return {
          success: false,
          message: 'This payment has already been used to activate a subscription',
          error: 'PAYMENT_ALREADY_USED'
        };
      }

      // 8. Verify amount (allow some tolerance for fees)
      const amount = parseFloat(orderDetails.actualCryptoAmount || orderDetails.expectedCryptoAmount || '0');
      if (amount < 9.5) { // 10 USDC with 0.5 tolerance
        return {
          success: false,
          message: `Insufficient payment amount: ${amount} USDC (minimum 10 USDC required)`,
          error: 'INSUFFICIENT_AMOUNT'
        };
      }

      // 9. Update transaction and activate subscription
      const result = await this.activateSubscription(
        userId,
        transaction,
        orderId,
        orderDetails.txHash,
        amount.toString()
      );

      return result;
    } catch (error) {
      log(`Error verifying by orderId: ${error}`, 'verification-ERROR');
      throw error;
    }
  }

  /**
   * Method B: Verify by blockchain transaction hash
   */
  private async verifyByTransactionHash(userId: number, txHash: string): Promise<VerificationResult> {
    try {
      log(`Verifying payment by txHash ${txHash.substring(0, 10)}... for user ${userId}`, 'verification');

      if (!this.web3) {
        log('Web3 not initialized, attempting to initialize now', 'verification');
        if (config.polygonRpcUrl) {
          this.web3 = new Web3(config.polygonRpcUrl);
        } else {
          return {
            success: false,
            message: 'Blockchain verification not available. Polygon RPC not configured.',
            error: 'WEB3_NOT_CONFIGURED'
          };
        }
      }

      // 1. Find user's pending transactions
      const pendingTransactions = await db.query.onrampTransactions.findMany({
        where: and(
          eq(onrampTransactions.userId, userId),
          eq(onrampTransactions.status, TransactionStatus.INITIATED),
          sql`${onrampTransactions.metadata}->>'type' = 'subscription'`,
          sql`${onrampTransactions.createdAt} > NOW() - INTERVAL '48 hours'`
        ),
        orderBy: [desc(onrampTransactions.createdAt)]
      });

      if (pendingTransactions.length === 0) {
        return {
          success: false,
          message: 'No pending payment initiations found. Please initiate payment first.',
          error: 'NO_PENDING_TRANSACTIONS'
        };
      }

      // 2. Get transaction from blockchain
      let web3Tx;
      let receipt;

      try {
        log(`Fetching transaction from blockchain: ${txHash.substring(0, 10)}...`, 'verification');
        web3Tx = await this.web3.eth.getTransaction(txHash);

        if (!web3Tx) {
          log('Transaction not found on Polygon blockchain', 'verification-ERROR');
          return {
            success: false,
            message: 'Transaction not found on Polygon blockchain. Please check the transaction hash.',
            error: 'TX_NOT_FOUND'
          };
        }

        receipt = await this.web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
          log('Transaction receipt not found - might be pending', 'verification-WARN');
          return {
            success: false,
            message: 'Transaction is still pending or receipt not available',
            error: 'TX_PENDING'
          };
        }

        if (!receipt.status) {
          log('Transaction failed on blockchain', 'verification-ERROR');
          return {
            success: false,
            message: 'Transaction failed on blockchain',
            error: 'TX_FAILED'
          };
        }
      } catch (web3Error: any) {
        log(`Error fetching transaction from blockchain: ${web3Error.message}`, 'verification-ERROR');
        return {
          success: false,
          message: `Failed to fetch transaction from blockchain: ${web3Error.message}`,
          error: 'BLOCKCHAIN_ERROR'
        };
      }

      // 3. Verify it's a USDC transfer to treasury
      const treasuryAddress = config.platformTreasuryAddressPolygon?.toLowerCase();
      const usdcAddress = config.polygonUsdcAddress?.toLowerCase();

      if (!treasuryAddress || !usdcAddress) {
        return {
          success: false,
          message: 'System configuration error. Please contact support.',
          error: 'CONFIG_ERROR'
        };
      }

      // Find Transfer event in logs
      const transferLog = receipt.logs.find(log =>
        log.address.toLowerCase() === usdcAddress &&
        log.topics[0] === this.web3!.utils.sha3('Transfer(address,address,uint256)') &&
        log.topics[2] && // to address
        ('0x' + log.topics[2].slice(26).toLowerCase()) === treasuryAddress.toLowerCase()
      );

      if (!transferLog) {
        return {
          success: false,
          message: 'Transaction is not a USDC payment to the treasury address',
          error: 'INVALID_PAYMENT'
        };
      }

      // 4. Decode amount (USDC has 6 decimals)
      const amount = parseInt(transferLog.data, 16) / 1e6;
      if (amount < 9.5) {
        return {
          success: false,
          message: `Insufficient payment amount: ${amount} USDC (minimum 10 USDC required)`,
          error: 'INSUFFICIENT_AMOUNT'
        };
      }

      // 5. Check if already used
      const existingSubscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.txHash, txHash)
      });

      if (existingSubscription) {
        return {
          success: false,
          message: 'This transaction has already been used',
          error: 'TX_ALREADY_USED'
        };
      }

      // 6. Match to pending transaction by timestamp
      const blockTimestamp = (await this.web3.eth.getBlock(web3Tx.blockNumber!)).timestamp;
      const blockTime = new Date(Number(blockTimestamp) * 1000);

      // Find transaction initiated within 10 minutes of blockchain transaction
      const matchedTransaction = pendingTransactions.find(t => {
        const timeDiff = Math.abs(blockTime.getTime() - new Date(t.createdAt!).getTime());
        return timeDiff < 600000; // 10 minutes
      });

      if (!matchedTransaction) {
        // If multiple pending, ask for confirmation
        if (pendingTransactions.length > 1) {
          return {
            success: false,
            needsConfirmation: true,
            transaction: pendingTransactions[0],
            message: 'Multiple pending payments found. Please use Order ID for exact match.',
            error: 'MULTIPLE_PENDING'
          };
        }

        // Use the only pending transaction
        const transaction = pendingTransactions[0];
        return await this.activateSubscription(
          userId,
          transaction,
          undefined, // No orderId from blockchain
          txHash,
          amount.toString()
        );
      }

      // 7. Activate subscription
      return await this.activateSubscription(
        userId,
        matchedTransaction,
        undefined,
        txHash,
        amount.toString()
      );
    } catch (error) {
      log(`Error verifying by txHash: ${error}`, 'verification-ERROR');
      throw error;
    }
  }

  /**
   * Method C: Verify by timestamp (least reliable, needs confirmation)
   */
  private async verifyByTimestamp(userId: number, timestamp: string): Promise<VerificationResult> {
    try {
      log(`Verifying payment by timestamp ${timestamp} for user ${userId}`, 'verification');

      const targetTime = new Date(timestamp);
      const targetEpoch = targetTime.getTime() / 1000;

      // Find transaction within 5 minutes of provided timestamp
      const transaction = await db.query.onrampTransactions.findFirst({
        where: and(
          eq(onrampTransactions.userId, userId),
          eq(onrampTransactions.status, TransactionStatus.INITIATED),
          sql`${onrampTransactions.metadata}->>'type' = 'subscription'`,
          sql`ABS(EXTRACT(EPOCH FROM ${onrampTransactions.createdAt}) - ${targetEpoch}) < 300`
        ),
        orderBy: [desc(onrampTransactions.createdAt)]
      });

      if (!transaction) {
        return {
          success: false,
          message: 'No payment found around that time. Please check the time or use Order ID.',
          error: 'NO_MATCHING_TRANSACTION'
        };
      }

      // Return for user confirmation
      return {
        success: false,
        needsConfirmation: true,
        transaction: {
          id: transaction.id,
          merchantRecognitionId: transaction.merchantRecognitionId,
          createdAt: transaction.createdAt,
          amount: transaction.amount,
          status: transaction.status
        },
        message: 'Payment found. Please confirm this is your payment to proceed.',
        error: 'NEEDS_CONFIRMATION'
      };
    } catch (error) {
      log(`Error verifying by timestamp: ${error}`, 'verification-ERROR');
      throw error;
    }
  }

  /**
   * Activate subscription after successful verification
   */
  private async activateSubscription(
    userId: number,
    transaction: any,
    orderId?: string,
    txHash?: string,
    amountUsdc?: string
  ): Promise<VerificationResult> {
    try {
      // Use database transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Defensive check: ensure orderId isn't already in use by another transaction
        if (orderId) {
          const existingTx = await tx.query.onrampTransactions.findFirst({
            where: and(
              eq(onrampTransactions.orderId, orderId),
              sql`${onrampTransactions.id} != ${transaction.id}`
            )
          });

          if (existingTx) {
            log(`Order ID ${orderId} already in use by transaction ${existingTx.id}, cannot update transaction ${transaction.id}`, 'verification-ERROR');
            throw new Error(`Order ID ${orderId} is already in use`);
          }
        }

        // Update onramp transaction
        await tx.update(onrampTransactions)
          .set({
            orderId: orderId || transaction.orderId,
            txHash: txHash || transaction.txHash,
            status: TransactionStatus.SUCCESS,
            amount: amountUsdc || transaction.amount,
            updatedAt: new Date()
          })
          .where(eq(onrampTransactions.id, transaction.id));

        // Activate subscription
        const subscription = await subscriptionService.activateOrRenewSubscription(
          userId,
          'courses_yearly',
          orderId,
          txHash,
          amountUsdc
        );

        return { subscription, subscriptionId: subscription?.id };
      });

      // Process referral rewards if this user was referred
      try {
        const { referralService } = await import('./services/referralService');
        const amountUsdcNum = parseFloat(amountUsdc || '10');
        await referralService.processSubscriptionReferral(userId, result.subscriptionId, amountUsdcNum);
      } catch (referralError) {
        log(`Error processing referral for user ${userId}: ${referralError}`, 'verification-referral-ERROR');
        // Don't fail the subscription if referral processing fails
      }

      log(`Successfully activated subscription for user ${userId} via manual verification`, 'verification');

      return {
        success: true,
        subscription: result.subscription,
        message: 'Payment verified! Your subscription is now active.',
        error: undefined
      };
    } catch (error) {
      log(`Error activating subscription: ${error}`, 'verification-ERROR');
      throw error;
    }
  }

  /**
   * Check rate limiting for user
   */
  private async checkRateLimit(userId: number): Promise<boolean> {
    // Check verification attempts in last 10 minutes
    const recentAttempts = await db.query.onrampTransactions.findMany({
      where: and(
        eq(onrampTransactions.userId, userId),
        sql`${onrampTransactions.metadata}->>'verificationAttempts' IS NOT NULL`,
        sql`${onrampTransactions.updatedAt} > NOW() - INTERVAL '10 minutes'`
      )
    });

    return recentAttempts.length > 5;
  }

  /**
   * Log verification attempt for audit
   */
  private async logVerificationAttempt(userId: number, request: VerificationRequest): Promise<void> {
    const sanitized = {
      orderId: request.orderId ? '***' + request.orderId.slice(-4) : undefined,
      txHash: request.txHash ? request.txHash.slice(0, 10) + '...' : undefined,
      timestamp: request.timestamp,
      attemptTime: new Date().toISOString()
    };

    log(`Verification attempt by user ${userId}: ${JSON.stringify(sanitized)}`, 'verification');
  }

  /**
   * Get user's pending payments for display
   */
  async getUserPendingPayments(userId: number): Promise<any[]> {
    try {
      const pending = await db.query.onrampTransactions.findMany({
        where: and(
          eq(onrampTransactions.userId, userId),
          eq(onrampTransactions.status, TransactionStatus.INITIATED),
          sql`${onrampTransactions.metadata}->>'type' = 'subscription'`,
          sql`${onrampTransactions.createdAt} > NOW() - INTERVAL '48 hours'`
        ),
        orderBy: [desc(onrampTransactions.createdAt)]
      });

      return pending.map(t => ({
        id: t.id,
        merchantRecognitionId: t.merchantRecognitionId,
        createdAt: t.createdAt,
        status: t.status,
        metadata: t.metadata
      }));
    } catch (error) {
      log(`Error getting pending payments: ${error}`, 'verification-ERROR');
      return [];
    }
  }
}

export const paymentVerificationService = new PaymentVerificationService();