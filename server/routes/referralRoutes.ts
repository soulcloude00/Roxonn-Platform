import { Router, Request, Response } from 'express';
import { referralService } from '../services/referralService';
import { createReferralCodeSchema, applyReferralCodeSchema } from '../../shared/schema';
import { log } from '../utils';
import rateLimit from 'express-rate-limit';

const router = Router();

// Middleware to require authentication
// Note: Local version used instead of server/auth.ts to avoid strict GitHub token requirement for referral operations
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Admin check middleware - SECURITY: No hardcoded fallback
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminUsernames = process.env.ADMIN_USERNAMES;
  if (!adminUsernames) {
    log('SECURITY WARNING: ADMIN_USERNAMES env var not set', 'referral-SECURITY');
    return res.status(503).json({ error: 'Admin access not configured' });
  }

  const admins = adminUsernames.split(',').map(u => u.trim().toLowerCase());
  if (!admins.includes(req.user.username.toLowerCase())) {
    log(`Admin access denied for user: ${req.user.username}`, 'referral-SECURITY');
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Rate limiter for referral apply endpoint - SECURITY: Prevent spam
const applyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many referral attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for public validation endpoint - SECURITY: Prevent enumeration
const validateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many validation attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// TX hash validation regex (XDC format: 0x + 64 hex chars)
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * GET /api/referral/code
 * Get or create user's referral code and stats
 */
/**
 * @openapi
 * /api/referral/code:
 *   get:
 *     summary: Get or create user's referral code and stats
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Referral info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/code', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await referralService.getReferralInfo(userId);
    res.json(result);
  } catch (error: any) {
    log(`Error getting referral code: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

/**
 * @openapi
 * /api/referral/code/custom:
 *   post:
 *     summary: Create a custom referral code
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *     responses:
 *       200:
 *         description: Custom code created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralInfo'
 *       400:
 *         description: Invalid code or already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */


/**
 * POST /api/referral/code/custom
 * Create a custom referral code
 */
router.post('/code/custom', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validation = createReferralCodeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid code format',
        details: validation.error.errors
      });
    }

    const code = await referralService.generateReferralCode(userId, validation.data.code);
    res.json({ success: true, code });
  } catch (error: any) {
    log(`Error creating custom referral code: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to create custom referral code' });
  }
});

/**
 * POST /api/referral/apply
 * Apply a referral code to current user
 * SECURITY: Rate limited to prevent spam
 */
/**
 * @openapi
 * /api/referral/apply:
 *   post:
 *     summary: Apply a referral code to current user
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral code applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 referrer:
 *                   type: string
 *       400:
 *         description: Invalid code or already applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/apply', requireAuth, applyRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validation = applyReferralCodeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid referral code',
        details: validation.error.errors
      });
    }

    const result = await referralService.applyReferralCode(userId, validation.data.code);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      referrer: result.referrerUsername
    });
  } catch (error: any) {
    log(`Error applying referral code: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

/**
 * GET /api/referral/validate/:code
 * Validate a referral code (public endpoint for signup page)
 * SECURITY: Rate limited to prevent code enumeration
 */
/**
 * @openapi
 * /api/referral/validate/{code}:
 *   get:
 *     summary: Validate a referral code (public endpoint)
 *     tags: [Referrals]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/validate/:code', validateRateLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const isValid = await referralService.validateCode(code);
    res.json({ valid: isValid });
  } catch (error: any) {
    log(`Error validating referral code: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
});

/**
 * GET /api/referral/stats
 * Get detailed referral statistics for current user
 */
/**
 * @openapi
 * /api/referral/stats:
 *   get:
 *     summary: Get detailed referral statistics for current user
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Referral stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralStats'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await referralService.getReferralStats(userId);
    res.json(stats);
  } catch (error: any) {
    log(`Error getting referral stats: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

/**
 * GET /api/referral/leaderboard
 * Get referral leaderboard
 */
/**
 * @openapi
 * /api/referral/leaderboard:
 *   get:
 *     summary: Get referral leaderboard
 *     tags: [Referrals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Leaderboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       username: { type: string }
 *                       referrals: { type: integer }
 *                       earnings: { type: number }
 *                 userRank:
 *                   type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await referralService.getLeaderboard(Math.min(limit, 100));

    // If user is authenticated, include their rank
    let userRank = 0;
    if (req.user) {
      userRank = await referralService.getUserRank(req.user.id);
    }

    res.json({
      leaderboard,
      userRank
    });
  } catch (error: any) {
    log(`Error getting leaderboard: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * @openapi
 * /api/referral/rewards:
 *   get:
 *     summary: Get pending and paid rewards for current user
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Rewards info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pending:
 *                   type: object
 *                   properties:
 *                     usdc: { type: number }
 *                     roxn: { type: number }
 *                 paid:
 *                   type: object
 *                   properties:
 *                     usdc: { type: number }
 *                     roxn: { type: number }
 *                 history:
 *                   type: array
 *                   items: { type: object }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/rewards', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const pendingRewards = await referralService.getPendingRewards(userId);
    const stats = await referralService.getReferralStats(userId);

    res.json({
      pending: {
        usdc: pendingRewards.usdc,
        roxn: pendingRewards.roxn
      },
      paid: {
        usdc: stats.totalUsdcEarned,
        roxn: stats.totalRoxnEarned
      },
      history: pendingRewards.rewards
    });
  } catch (error: any) {
    log(`Error getting rewards: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

/**
 * @openapi
 * /api/referral/rewards/claim:
 *   post:
 *     summary: Request payout of pending rewards
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payout request submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 requestId: { type: integer }
 *       400:
 *         description: Error submitting request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/rewards/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await referralService.createPayoutRequest(userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Payout request submitted! Our team will review and process your rewards.',
      requestId: result.requestId
    });
  } catch (error: any) {
    log(`Error requesting payout: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to submit payout request' });
  }
});

/**
 * @openapi
 * /api/referral/payout/status:
 *   get:
 *     summary: Get current payout request status
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payout status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayoutRequest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payout/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = await referralService.getLatestPayoutStatus(userId);
    res.json(status);
  } catch (error: any) {
    log(`Error getting payout status: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get payout status' });
  }
});

/**
 * @openapi
 * /api/referral/payout/history:
 *   get:
 *     summary: Get user's payout request history
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payout history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PayoutRequest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payout/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await referralService.getPayoutRequests(userId);
    res.json({ history });
  } catch (error: any) {
    log(`Error getting payout history: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get payout history' });
  }
});

// =====================================================
// ADMIN ENDPOINTS (Protected by admin check)
// =====================================================

/**
 * @openapi
 * /api/referral/admin/payouts/pending:
 *   get:
 *     summary: Get all pending payout requests (admin only)
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pending payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payouts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PayoutRequest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (Not admin)
 */
router.get('/admin/payouts/pending', requireAdmin, async (req: Request, res: Response) => {
  try {
    const pendingPayouts = await referralService.getAllPendingPayouts();
    log(`Admin ${req.user!.username} accessed pending payouts`, 'referral-ADMIN');
    res.json({ payouts: pendingPayouts });
  } catch (error: any) {
    log(`Error getting pending payouts: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to get pending payouts' });
  }
});

/**
 * @openapi
 * /api/referral/admin/payouts/{id}/mark-paid:
 *   post:
 *     summary: Mark a payout request as paid (admin only)
 *     tags: [Referrals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usdcTxHash
 *               - roxnTxHash
 *             properties:
 *               usdcTxHash: { type: string }
 *               roxnTxHash: { type: string }
 *               adminNotes: { type: string }
 *     responses:
 *       200:
 *         description: Payout marked as paid
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payout not found
 */
router.post('/admin/payouts/:id/mark-paid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { usdcTxHash, roxnTxHash, adminNotes } = req.body;

    if (!usdcTxHash || !roxnTxHash) {
      return res.status(400).json({ error: 'Transaction hashes are required' });
    }

    // SECURITY: Validate TX hash format (XDC: 0x + 64 hex chars)
    if (!TX_HASH_REGEX.test(usdcTxHash)) {
      return res.status(400).json({ error: 'Invalid USDC transaction hash format. Expected: 0x followed by 64 hex characters' });
    }
    if (!TX_HASH_REGEX.test(roxnTxHash)) {
      return res.status(400).json({ error: 'Invalid ROXN transaction hash format. Expected: 0x followed by 64 hex characters' });
    }

    const success = await referralService.markPayoutAsPaid(
      requestId,
      usdcTxHash,
      roxnTxHash,
      adminNotes
    );

    if (!success) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    log(`Admin ${req.user!.username} marked payout #${requestId} as paid. USDC TX: ${usdcTxHash}, ROXN TX: ${roxnTxHash}`, 'referral-ADMIN');
    res.json({ success: true, message: 'Payout marked as paid' });
  } catch (error: any) {
    log(`Error marking payout as paid: ${error.message}`, 'referral-ERROR');
    res.status(500).json({ error: 'Failed to mark payout as paid' });
  }
});

export default router;
