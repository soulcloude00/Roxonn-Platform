import { Router } from 'express';
import { db } from '../db';
import { users, registeredRepositories, multiCurrencyBounties } from '../../shared/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { log } from '../utils';

const router = Router();

/**
 * @openapi
 * /api/leaderboard/contributors:
 *   get:
 *     summary: Get top contributors
 *     tags: [Leaderboard]
 *     responses:
 *       200:
 *         description: List of top contributors
 */
router.get('/contributors', async (req, res) => {
    try {
        // Fetch top contributors sorted by earnings
        // We prioritize Total ROXN Earned, then Total USDC Earned
        const topContributors = await db.select({
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
            totalRoxnEarned: users.totalRoxnEarned,
            totalUsdcEarned: users.totalUsdcEarned,
            // We can add bounties completed details if we join with bounties table, 
            // but for MVP schema only stores totals in users table (based on referral/rewards logic updates)
        })
            .from(users)
            .where(sql`${users.totalRoxnEarned} > 0 OR ${users.totalUsdcEarned} > 0`)
            .orderBy(desc(users.totalRoxnEarned), desc(users.totalUsdcEarned))
            .limit(50); // Top 50

        // Format response
        const formattedContributors = topContributors.map((c, index) => ({
            rank: index + 1,
            id: c.id,
            username: c.username,
            avatarUrl: c.avatarUrl,
            roxnEarned: parseFloat(c.totalRoxnEarned?.toString() || '0').toFixed(2),
            usdcEarned: parseFloat(c.totalUsdcEarned?.toString() || '0').toFixed(2),
        }));

        res.json(formattedContributors);
    } catch (error) {
        log(`Error fetching contributors leaderboard: ${error}`, 'leaderboard');
        res.status(500).json({ error: 'Failed to fetch contributors leaderboard' });
    }
});

/**
 * @openapi
 * /api/leaderboard/projects:
 *   get:
 *     summary: Get top projects
 *     tags: [Leaderboard]
 *     responses:
 *       200:
 *         description: List of top projects
 */
router.get('/projects', async (req, res) => {
    try {
        // Aggregate bounties per repository to calculate "Total Value Distributed" using a single optimized query
        const projectRankings = await db.select({
            id: registeredRepositories.id,
            githubRepoFullName: registeredRepositories.githubRepoFullName,
            totalBounties: sql<number>`count(${multiCurrencyBounties.id})`.as('totalBounties'),
        })
            .from(registeredRepositories)
            .leftJoin(multiCurrencyBounties, eq(registeredRepositories.githubRepoId, multiCurrencyBounties.repoId))
            .where(eq(registeredRepositories.isActive, true))
            .groupBy(registeredRepositories.id, registeredRepositories.githubRepoFullName)
            .orderBy(desc(sql`totalBounties`))
            .limit(50);

        const formattedProjects = projectRankings.map((p, index) => {
            // Validate and clean repo name for avatar URL
            const [owner] = p.githubRepoFullName ? p.githubRepoFullName.split('/') : [];
            return {
                rank: index + 1,
                name: p.githubRepoFullName,
                bountiesCount: Number(p.totalBounties),
                avatarUrl: owner ? `https://github.com/${owner}.png` : ''
            };
        });

        res.json(formattedProjects);
    } catch (error) {
        log(`Error fetching projects leaderboard: ${error}`, 'leaderboard');
        res.status(500).json({ error: 'Failed to fetch projects leaderboard' });
    }
});

export default router;
