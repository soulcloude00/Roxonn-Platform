import { db } from '../db';
import {
  referralCodes,
  referrals,
  referralRewards,
  payoutRequests,
  users,
  subscriptions,
  ReferralStatus,
  PayoutRequestStatus,
  type ReferralStats,
  type LeaderboardEntry,
  type PayoutRequestInfo
} from '../../shared/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { log } from '../utils';
import { sendPayoutRequestNotification } from '../email';

// Configuration - can be moved to environment variables
const REFERRAL_USDC_PERCENTAGE = parseFloat(process.env.REFERRAL_USDC_PERCENTAGE || '20'); // 20% of subscription
const REFERRAL_ROXN_AMOUNT = parseFloat(process.env.REFERRAL_ROXN_AMOUNT || '10'); // Fixed 10 ROXN per referral
const SUBSCRIPTION_PRICE_USDC = 10; // $10 USDC

export class ReferralService {

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: number, customCode?: string): Promise<string> {
    // Check if user already has a code
    const existingCode = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, userId)
    });

    if (existingCode) {
      return existingCode.code;
    }

    // Generate or use custom code
    let code = customCode?.toUpperCase() || await this.generateUniqueCode(userId);

    // Ensure code is unique
    let attempts = 0;
    while (attempts < 10) {
      const codeExists = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, code)
      });

      if (!codeExists) break;

      // If custom code is taken, append random suffix
      code = customCode ? `${customCode.toUpperCase()}_${Math.random().toString(36).substring(2, 5).toUpperCase()}` : await this.generateUniqueCode(userId);
      attempts++;
    }

    // Insert new code
    await db.insert(referralCodes).values({
      userId,
      code,
      isActive: true
    });

    log(`Generated referral code ${code} for user ${userId}`, 'referral');
    return code;
  }

  /**
   * Generate a unique code based on username or random
   */
  private async generateUniqueCode(userId: number): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { username: true }
    });

    if (user?.username) {
      // Try username-based code first
      const baseCode = user.username.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12);
      const year = new Date().getFullYear();
      return `${baseCode}${year}`;
    }

    // Fallback to random code
    return `ROXONN${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Get user's referral code and stats
   */
  async getReferralInfo(userId: number): Promise<{
    code: string;
    link: string;
    stats: ReferralStats;
  }> {
    // Get or create referral code
    const code = await this.generateReferralCode(userId);

    // Get referral stats
    const stats = await this.getReferralStats(userId);

    // Generate link
    const baseUrl = process.env.FRONTEND_URL || 'https://roxonn.com';
    const link = `${baseUrl}/signup?ref=${code}`;

    return { code, link, stats };
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: number): Promise<ReferralStats> {
    // Get all referrals for this user
    const userReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId)
    });

    const totalReferrals = userReferrals.length;
    const pendingReferrals = userReferrals.filter(r => r.status === 'pending').length;
    const convertedReferrals = userReferrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length;

    // Calculate total earned
    const totalUsdcEarned = userReferrals
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + parseFloat(r.usdcReward || '0'), 0);

    const totalRoxnEarned = userReferrals
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + parseFloat(r.roxnReward || '0'), 0);

    // Calculate pending rewards
    const pendingUsdcReward = userReferrals
      .filter(r => r.status === 'converted')
      .reduce((sum, r) => sum + parseFloat(r.usdcReward || '0'), 0);

    const pendingRoxnReward = userReferrals
      .filter(r => r.status === 'converted')
      .reduce((sum, r) => sum + parseFloat(r.roxnReward || '0'), 0);

    return {
      totalReferrals,
      pendingReferrals,
      convertedReferrals,
      totalUsdcEarned: totalUsdcEarned.toFixed(2),
      totalRoxnEarned: totalRoxnEarned.toFixed(2),
      pendingUsdcReward: pendingUsdcReward.toFixed(2),
      pendingRoxnReward: pendingRoxnReward.toFixed(2)
    };
  }

  /**
   * Apply a referral code to a new user
   */
  async applyReferralCode(newUserId: number, code: string): Promise<{
    success: boolean;
    referrerUsername?: string;
    error?: string;
  }> {
    // Find the referral code
    const referralCode = await db.query.referralCodes.findFirst({
      where: and(
        eq(referralCodes.code, code.toUpperCase()),
        eq(referralCodes.isActive, true)
      )
    });

    if (!referralCode) {
      return { success: false, error: 'Invalid or inactive referral code' };
    }

    // Check if user is trying to refer themselves
    if (referralCode.userId === newUserId) {
      return { success: false, error: 'You cannot use your own referral code' };
    }

    // Check if user was already referred
    const existingReferral = await db.query.referrals.findFirst({
      where: eq(referrals.referredId, newUserId)
    });

    if (existingReferral) {
      return { success: false, error: 'You have already been referred' };
    }

    // Get referrer info
    const referrer = await db.query.users.findFirst({
      where: eq(users.id, referralCode.userId),
      columns: { username: true }
    });

    // Create referral record
    await db.insert(referrals).values({
      referrerId: referralCode.userId,
      referredId: newUserId,
      referralCodeId: referralCode.id,
      status: 'pending'
    });

    // Update user's referred_by field
    await db.update(users)
      .set({ referredBy: referralCode.userId })
      .where(eq(users.id, newUserId));

    log(`User ${newUserId} applied referral code ${code} from user ${referralCode.userId}`, 'referral');

    // Mask username for privacy
    const maskedUsername = referrer?.username
      ? `${referrer.username.substring(0, 3)}${'*'.repeat(Math.max(0, referrer.username.length - 3))}`
      : 'Unknown';

    return { success: true, referrerUsername: maskedUsername };
  }

  /**
   * Process subscription payment and calculate referral rewards
   */
  async processSubscriptionReferral(
    userId: number,
    subscriptionId: number,
    amountUsdc: number = SUBSCRIPTION_PRICE_USDC
  ): Promise<boolean> {
    // Find pending referral for this user
    const referral = await db.query.referrals.findFirst({
      where: and(
        eq(referrals.referredId, userId),
        eq(referrals.status, 'pending')
      )
    });

    if (!referral) {
      log(`No pending referral found for user ${userId}`, 'referral');
      return false;
    }

    // Calculate rewards
    const usdcReward = (amountUsdc * REFERRAL_USDC_PERCENTAGE) / 100;
    const roxnReward = REFERRAL_ROXN_AMOUNT;

    // Update referral record
    await db.update(referrals)
      .set({
        status: 'converted',
        subscriptionId,
        usdcReward: usdcReward.toFixed(6),
        roxnReward: roxnReward.toFixed(8),
        convertedAt: new Date()
      })
      .where(eq(referrals.id, referral.id));

    // Create reward entries
    await db.insert(referralRewards).values([
      {
        userId: referral.referrerId,
        referralId: referral.id,
        rewardType: 'usdc',
        amount: usdcReward.toFixed(8),
        status: 'pending'
      },
      {
        userId: referral.referrerId,
        referralId: referral.id,
        rewardType: 'roxn',
        amount: roxnReward.toFixed(8),
        status: 'pending'
      }
    ]);

    // Update referrer's total referrals count
    await db.update(users)
      .set({
        totalReferrals: sql`COALESCE(${users.totalReferrals}, 0) + 1`
      })
      .where(eq(users.id, referral.referrerId));

    log(`Processed referral conversion: User ${userId} subscribed, referrer ${referral.referrerId} earned $${usdcReward} USDC + ${roxnReward} ROXN`, 'referral');
    return true;
  }

  /**
   * Get leaderboard of top referrers
   */
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    // Query top referrers by total referrals
    const topReferrers = await db
      .select({
        userId: users.id,
        username: users.username,
        totalReferrals: users.totalReferrals,
        totalUsdcEarned: users.totalUsdcEarned
      })
      .from(users)
      .where(sql`${users.totalReferrals} > 0`)
      .orderBy(desc(users.totalReferrals))
      .limit(limit);

    return topReferrers.map((user, index) => ({
      rank: index + 1,
      username: `${user.username.substring(0, 3)}${'*'.repeat(Math.max(0, user.username.length - 3))}`,
      referrals: user.totalReferrals || 0,
      earned: `$${parseFloat(user.totalUsdcEarned || '0').toFixed(2)}`
    }));
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(userId: number): Promise<number> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { totalReferrals: true }
    });

    if (!user?.totalReferrals || user.totalReferrals === 0) {
      return 0; // Not on leaderboard
    }

    // Count users with more referrals
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.totalReferrals} > ${user.totalReferrals}`);

    return (result[0]?.count || 0) + 1;
  }

  /**
   * Get pending rewards for a user
   */
  async getPendingRewards(userId: number): Promise<{
    usdc: string;
    roxn: string;
    rewards: Array<{
      id: number;
      type: string;
      amount: string;
      status: string;
      createdAt: Date;
    }>;
  }> {
    const rewards = await db.query.referralRewards.findMany({
      where: and(
        eq(referralRewards.userId, userId),
        eq(referralRewards.status, 'pending')
      ),
      orderBy: [desc(referralRewards.createdAt)]
    });

    const pendingUsdc = rewards
      .filter(r => r.rewardType === 'usdc')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const pendingRoxn = rewards
      .filter(r => r.rewardType === 'roxn')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return {
      usdc: pendingUsdc.toFixed(2),
      roxn: pendingRoxn.toFixed(2),
      rewards: rewards.map(r => ({
        id: r.id,
        type: r.rewardType,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt
      }))
    };
  }

  /**
   * Validate referral code exists
   */
  async validateCode(code: string): Promise<boolean> {
    const referralCode = await db.query.referralCodes.findFirst({
      where: and(
        eq(referralCodes.code, code.toUpperCase()),
        eq(referralCodes.isActive, true)
      )
    });
    return !!referralCode;
  }

  // =====================================================
  // PAYOUT REQUEST METHODS (Manual Admin Review)
  // =====================================================

  /**
   * Check if user has a pending payout request
   */
  async hasPendingPayoutRequest(userId: number): Promise<boolean> {
    const pendingRequest = await db.query.payoutRequests.findFirst({
      where: and(
        eq(payoutRequests.userId, userId),
        or(
          eq(payoutRequests.status, 'pending'),
          eq(payoutRequests.status, 'approved')
        )
      )
    });
    return !!pendingRequest;
  }

  /**
   * Create a payout request for manual admin review
   */
  async createPayoutRequest(userId: number): Promise<{
    success: boolean;
    requestId?: number;
    error?: string;
  }> {
    // Check if user already has a pending request
    const hasPending = await this.hasPendingPayoutRequest(userId);
    if (hasPending) {
      return { success: false, error: 'You already have a pending payout request' };
    }

    // Get user's pending rewards
    const stats = await this.getReferralStats(userId);
    const pendingUsdc = parseFloat(stats.pendingUsdcReward);
    const pendingRoxn = parseFloat(stats.pendingRoxnReward);

    if (pendingUsdc <= 0 && pendingRoxn <= 0) {
      return { success: false, error: 'No pending rewards to claim' };
    }

    // Get user's wallet address
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { xdcWalletAddress: true }
    });

    if (!user?.xdcWalletAddress) {
      return { success: false, error: 'No wallet address found. Please set up your wallet first.' };
    }

    // Create payout request
    const [request] = await db.insert(payoutRequests).values({
      userId,
      usdcAmount: pendingUsdc.toFixed(6),
      roxnAmount: pendingRoxn.toFixed(8),
      walletAddress: user.xdcWalletAddress,
      status: 'pending'
    }).returning();

    log(`Payout request created: User ${userId} requested $${pendingUsdc} USDC + ${pendingRoxn} ROXN`, 'referral-payout');

    // Get username for notification
    const userInfo = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { username: true }
    });

    // Send admin notification email (non-blocking)
    sendPayoutRequestNotification({
      requestId: request.id,
      username: userInfo?.username || `User #${userId}`,
      usdcAmount: pendingUsdc.toFixed(2),
      roxnAmount: pendingRoxn.toFixed(2),
      walletAddress: user.xdcWalletAddress
    });

    return { success: true, requestId: request.id };
  }

  /**
   * Get user's payout request history
   */
  async getPayoutRequests(userId: number): Promise<PayoutRequestInfo[]> {
    const requests = await db.query.payoutRequests.findMany({
      where: eq(payoutRequests.userId, userId),
      orderBy: [desc(payoutRequests.createdAt)]
    });

    return requests.map(r => ({
      id: r.id,
      usdcAmount: r.usdcAmount,
      roxnAmount: r.roxnAmount,
      status: r.status,
      createdAt: r.createdAt,
      paidAt: r.paidAt || undefined,
      usdcTxHash: r.usdcTxHash || undefined,
      roxnTxHash: r.roxnTxHash || undefined
    }));
  }

  /**
   * Get latest payout request status for a user
   */
  async getLatestPayoutStatus(userId: number): Promise<{
    hasPendingRequest: boolean;
    latestRequest?: PayoutRequestInfo;
  }> {
    const latestRequest = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.userId, userId),
      orderBy: [desc(payoutRequests.createdAt)]
    });

    if (!latestRequest) {
      return { hasPendingRequest: false };
    }

    const isPending = latestRequest.status === 'pending' || latestRequest.status === 'approved';

    return {
      hasPendingRequest: isPending,
      latestRequest: {
        id: latestRequest.id,
        usdcAmount: latestRequest.usdcAmount,
        roxnAmount: latestRequest.roxnAmount,
        status: latestRequest.status,
        createdAt: latestRequest.createdAt,
        paidAt: latestRequest.paidAt || undefined,
        usdcTxHash: latestRequest.usdcTxHash || undefined,
        roxnTxHash: latestRequest.roxnTxHash || undefined
      }
    };
  }

  /**
   * Admin: Mark payout request as paid
   */
  async markPayoutAsPaid(
    requestId: number,
    usdcTxHash: string,
    roxnTxHash: string,
    adminNotes?: string
  ): Promise<boolean> {
    const request = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, requestId)
    });

    if (!request) {
      return false;
    }

    // Update payout request
    await db.update(payoutRequests)
      .set({
        status: 'paid',
        usdcTxHash,
        roxnTxHash,
        adminNotes,
        paidAt: new Date(),
        reviewedAt: new Date()
      })
      .where(eq(payoutRequests.id, requestId));

    // Mark related referral rewards as paid
    await db.update(referralRewards)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(
        eq(referralRewards.userId, request.userId),
        eq(referralRewards.status, 'pending')
      ));

    // Update related referrals to rewarded status
    const userReferrals = await db.query.referrals.findMany({
      where: and(
        eq(referrals.referrerId, request.userId),
        eq(referrals.status, 'converted')
      )
    });

    for (const referral of userReferrals) {
      await db.update(referrals)
        .set({ status: 'rewarded', rewardedAt: new Date() })
        .where(eq(referrals.id, referral.id));
    }

    // Update user's total earned
    const usdcAmount = parseFloat(request.usdcAmount);
    const roxnAmount = parseFloat(request.roxnAmount);

    await db.update(users)
      .set({
        totalUsdcEarned: sql`COALESCE(${users.totalUsdcEarned}, 0) + ${usdcAmount}`,
        totalRoxnEarned: sql`COALESCE(${users.totalRoxnEarned}, 0) + ${roxnAmount}`
      })
      .where(eq(users.id, request.userId));

    log(`Payout marked as paid: Request ${requestId}, User ${request.userId}, $${usdcAmount} USDC + ${roxnAmount} ROXN`, 'referral-payout');

    return true;
  }

  /**
   * Admin: Get all pending payout requests
   */
  async getAllPendingPayouts(): Promise<Array<PayoutRequestInfo & { username: string }>> {
    const requests = await db
      .select({
        id: payoutRequests.id,
        userId: payoutRequests.userId,
        usdcAmount: payoutRequests.usdcAmount,
        roxnAmount: payoutRequests.roxnAmount,
        walletAddress: payoutRequests.walletAddress,
        status: payoutRequests.status,
        createdAt: payoutRequests.createdAt,
        username: users.username
      })
      .from(payoutRequests)
      .innerJoin(users, eq(payoutRequests.userId, users.id))
      .where(eq(payoutRequests.status, 'pending'))
      .orderBy(desc(payoutRequests.createdAt));

    return requests.map(r => ({
      id: r.id,
      usdcAmount: r.usdcAmount,
      roxnAmount: r.roxnAmount,
      status: r.status,
      createdAt: r.createdAt,
      username: r.username,
      walletAddress: r.walletAddress
    }));
  }
}

export const referralService = new ReferralService();
