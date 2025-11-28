import { db } from './db';
import { onrampTransactions, TransactionStatus, type OnrampTransaction, type NewOnrampTransaction } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { log } from './utils';

/**
 * Service to manage Onramp.money transactions
 * Provides methods to create, update, and fetch transaction records
 */
export class OnrampService {
  /**
   * Create a new onramp transaction
   */
  async createTransaction(transaction: NewOnrampTransaction): Promise<OnrampTransaction | null> {
    try {
      const [created] = await db.insert(onrampTransactions)
        .values(transaction)
        .returning();
      
      log(`Created new onramp transaction: ${transaction.merchantRecognitionId}`);
      return created;
    } catch (error) {
      log(`Error creating onramp transaction: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Update an existing transaction
   */
  async updateTransaction(
    merchantRecognitionId: string,
    updates: Partial<NewOnrampTransaction>
  ): Promise<OnrampTransaction | null> {
    try {
      // Always update the updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      const [updated] = await db.update(onrampTransactions)
        .set(updatesWithTimestamp)
        .where(eq(onrampTransactions.merchantRecognitionId, merchantRecognitionId))
        .returning();
      
      if (!updated) {
        log(`No transaction found with merchantRecognitionId: ${merchantRecognitionId}`);
        return null;
      }
      
      log(`Updated onramp transaction: ${merchantRecognitionId}, new status: ${updates.status || 'unchanged'}`);
      return updated;
    } catch (error) {
      log(`Error updating onramp transaction: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Get transaction by merchant recognition ID
   */
  async getTransactionByMerchantId(merchantRecognitionId: string): Promise<OnrampTransaction | null> {
    try {
      const transaction = await db.query.onrampTransactions.findFirst({
        where: (transactions, { eq }) => eq(transactions.merchantRecognitionId, merchantRecognitionId)
      });
      
      return transaction || null;
    } catch (error) {
      log(`Error fetching onramp transaction: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Get transactions for a user
   */
  async getUserTransactions(userId: number, limit: number = 10): Promise<OnrampTransaction[]> {
    try {
      const transactions = await db.query.onrampTransactions.findMany({
        where: (transactions, { eq }) => eq(transactions.userId, userId),
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit
      });
      
      return transactions;
    } catch (error) {
      log(`Error fetching user onramp transactions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Map Onramp.money status to our internal status
   */
  mapStatus(status?: string, statusCode?: string): string {
    if (!status && !statusCode) return TransactionStatus.INITIATED;
    
    const normalizedStatus = (status || '').toLowerCase();
    const normalizedCode = (statusCode || '').toUpperCase();
    
    if (normalizedStatus === 'success' || normalizedCode === 'SUCCESS') 
      return TransactionStatus.SUCCESS;
    
    if (normalizedStatus === 'failed' || normalizedCode === 'FAILED') 
      return TransactionStatus.FAILED;
    
    if (normalizedStatus === 'processing' || normalizedCode === 'PROCESSING') 
      return TransactionStatus.PROCESSING;
    
    if (normalizedStatus === 'pending' || normalizedCode === 'PENDING') 
      return TransactionStatus.PENDING;
    
    return TransactionStatus.INITIATED;
  }
}

// Export singleton instance
export const onrampService = new OnrampService();
