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
        // Aggregate bounties per repository to calculate "Total Value Distributed"
        // Join registeredRepositories with multiCurrencyBounties

        // 1. Get all bounties grouped by repoId
        const bountyStats = await db.select({
            repoId: multiCurrencyBounties.repoId,
            totalBounties: sql<number>`count(*)`,
            // We can't easily sum mixed currencies (ROXN vs USDC) into one number in SQL without a conversion rate.
            // For MVP, we'll fetch them and process or just count "active bounties"
        })
            .from(multiCurrencyBounties)
            .groupBy(multiCurrencyBounties.repoId);

        // 2. Fetch all registered repos
        const projects = await db.select().from(registeredRepositories).where(eq(registeredRepositories.isActive, true));

        // 3. Merge and sort in memory (slower but flexible for MVP with mixed currencies)
        const projectRankings = projects.map(proj => {
            // Find stats for this repo
            // Note: multiCurrencyBounties.repoId is text (GitHub Repo ID) usually, but schema says:
            // repoId: text("repo_id").notNull() in multiCurrencyBounties
            // githubRepoId: text("github_repo_id").notNull().unique() in registeredRepositories

            const stats = bountyStats.find(s => s.repoId === proj.githubRepoId); // Matching by GitHub Repo ID string

            return {
                id: proj.id,
                githubRepoFullName: proj.githubRepoFullName,
                totalBounties: stats ? Number(stats.totalBounties) : 0,
                // For visual flair, we could calculate a "Engagement Score" later
            };
        })
            .sort((a, b) => b.totalBounties - a.totalBounties)
            .slice(0, 50);

        const formattedProjects = projectRankings.map((p, index) => ({
            rank: index + 1,
            name: p.githubRepoFullName,
            bountiesCount: p.totalBounties,
            // For images, we can use GitHub avatar of the owner from the full name (owner/repo)
            avatarUrl: `https://github.com/${p.githubRepoFullName.split('/')[0]}.png`
        }));

        res.json(formattedProjects);
    } catch (error) {
        log(`Error fetching projects leaderboard: ${error}`, 'leaderboard');
        res.status(500).json({ error: 'Failed to fetch projects leaderboard' });
    }
});

export default router;
