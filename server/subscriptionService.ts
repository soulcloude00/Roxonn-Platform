import { db } from './db';
import { subscriptions, subscriptionEvents, users } from '../shared/schema';
import type { Subscription, NewSubscription, NewSubscriptionEvent } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { log } from './utils';

export class SubscriptionService {
  /**
   * Create a new subscription
   */
  async createSubscription(data: NewSubscription): Promise<Subscription> {
    try {
      const [subscription] = await db
        .insert(subscriptions)
        .values(data)
        .returning();

      // Log the event
      await this.logEvent(subscription.id, 'created', {
        plan: subscription.plan,
        provider: subscription.provider,
      });

      log(`Created subscription ${subscription.id} for user ${subscription.userId}`, 'subscription');
      return subscription;
    } catch (error) {
      log(`Error creating subscription: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Activate or renew a subscription for 1 year
   */
  async activateOrRenewSubscription(
    userId: number,
    plan: 'courses_yearly',
    providerOrderId?: string,
    txHash?: string,
    amountUsdc?: string
  ): Promise<Subscription> {
    try {
      // Check if user has an existing subscription
      const existingSubscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
        orderBy: [desc(subscriptions.createdAt)],
      });

      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (existingSubscription) {
        // Renew existing subscription
        const [updated] = await db
          .update(subscriptions)
          .set({
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: oneYearFromNow,
            providerOrderId: providerOrderId || existingSubscription.providerOrderId,
            txHash: txHash || existingSubscription.txHash,
            amountUsdc: amountUsdc || existingSubscription.amountUsdc,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existingSubscription.id))
          .returning();

        // Log renewal event
        await this.logEvent(updated.id, 'renewed', {
          providerOrderId,
          txHash,
          amountUsdc,
        });

        log(`Renewed subscription ${updated.id} for user ${userId}`, 'subscription');
        return updated;
      } else {
        // Create new subscription
        const newSubscription = await this.createSubscription({
          userId,
          plan,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: oneYearFromNow,
          provider: 'onramp',
          providerOrderId,
          txHash,
          amountUsdc,
        });

        log(`Activated new subscription ${newSubscription.id} for user ${userId}`, 'subscription');
        return newSubscription;
      }
    } catch (error) {
      log(`Error activating/renewing subscription: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: number): Promise<{
    active: boolean;
    subscription?: Subscription;
    periodEnd?: Date;
  }> {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
        orderBy: [desc(subscriptions.createdAt)],
      });

      if (!subscription) {
        return { active: false };
      }

      // Check if subscription is active and not expired
      const now = new Date();
      const isActive =
        subscription.status === 'active' &&
        subscription.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd) > now;

      // Auto-expire if needed
      if (subscription.status === 'active' && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) <= now) {
        await this.expireSubscription(subscription.id);
        return { active: false, subscription, periodEnd: subscription.currentPeriodEnd };
      }

      return {
        active: isActive,
        subscription,
        periodEnd: subscription.currentPeriodEnd || undefined,
      };
    } catch (error) {
      log(`Error getting subscription status: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Expire a subscription
   */
  async expireSubscription(subscriptionId: number): Promise<void> {
    try {
      await db
        .update(subscriptions)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      await this.logEvent(subscriptionId, 'expired', {});
      log(`Expired subscription ${subscriptionId}`, 'subscription');
    } catch (error) {
      log(`Error expiring subscription: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: number): Promise<void> {
    try {
      await db
        .update(subscriptions)
        .set({
          status: 'canceled',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      await this.logEvent(subscriptionId, 'canceled', {});
      log(`Canceled subscription ${subscriptionId}`, 'subscription');
    } catch (error) {
      log(`Error canceling subscription: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Log a subscription event
   */
  private async logEvent(
    subscriptionId: number,
    eventType: 'created' | 'renewed' | 'canceled' | 'expired',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(subscriptionEvents).values({
        subscriptionId,
        eventType,
        metadata,
      });
    } catch (error) {
      log(`Error logging subscription event: ${error}`, 'subscription-ERROR');
      // Don't throw - event logging is not critical
    }
  }

  /**
   * Get subscription by provider order ID
   */
  async getSubscriptionByOrderId(providerOrderId: string): Promise<Subscription | undefined> {
    try {
      return await db.query.subscriptions.findFirst({
        where: eq(subscriptions.providerOrderId, providerOrderId),
      });
    } catch (error) {
      log(`Error getting subscription by order ID: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }

  /**
   * Mark expired subscriptions (for cron job)
   */
  async markExpiredSubscriptions(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .update(subscriptions)
        .set({
          status: 'expired',
          updatedAt: now,
        })
        .where(
          and(
            eq(subscriptions.status, 'active'),
            // currentPeriodEnd < now
          )
        )
        .returning();

      for (const sub of result) {
        await this.logEvent(sub.id, 'expired', { autoExpired: true });
      }

      log(`Marked ${result.length} subscriptions as expired`, 'subscription');
      return result.length;
    } catch (error) {
      log(`Error marking expired subscriptions: ${error}`, 'subscription-ERROR');
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();

