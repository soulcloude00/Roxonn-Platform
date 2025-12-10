import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { getTopContributors, getTopProjects } from '../../services/leaderboardService';
import leaderboardRoutes from '../leaderboardRoutes'; // We need to test the router logic, but often we test the handler directly or via supertest.
// For simplicity matching authRoutes.test.ts style, we might need to export the handler or mock the router.
// Actually authRoutes.test.ts mocks req/res and calls handler logic simulation.
// Since leaderboardRoutes exports a router, we might want to use supertest or separate handler functions.
// However, looking at the code, it exports the router default. 

// Let's use a slightly different approach: we can mock express and test the route registration, 
// OR we can export the handlers for testing if we refactor.
// But without refactoring, we can't easily access the async handlers directly from `router`.
// So standard practice is to use supertest with an app instance, or just trust the manual verification + service tests?
// The prompt asked for "server/routes/__tests__/leaderboardRoutes.test.ts".

// Let's try to simulate the request via supertest if possible, or just mock the service.
// Since we don't have the `app` exported easily here, we will create a tailored test that mocks the service.

// Wait, authRoutes.test.ts simulates the route handler logic manually by redefining it in the test?
// "Simulate the route handler" lines 85-90. It effectively duplications logic.
// That's ... one way. Better to test the actual code.

// Let's use supertest with a minimal express app.
import express from 'express';
import request from 'supertest';

// Mock the service
vi.mock('../../services/leaderboardService', () => ({
    getTopContributors: vi.fn(),
    getTopProjects: vi.fn(),
}));

// Mock auth middleware
vi.mock('../../auth', () => ({
    requireAuth: (req: Request, res: Response, next: any) => next(),
    csrfProtection: (req: Request, res: Response, next: any) => next(), // Even if removed, good to mock just in case
}));

describe('Leaderboard Routes', () => {
    let app: express.Express;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/leaderboard', leaderboardRoutes);
    });

    describe('GET /api/leaderboard/contributors', () => {
        it('should return contributors list', async () => {
            const mockData = [{ rank: 1, id: 1, username: 'test', avatarUrl: 'url', roxnEarned: '10', usdcEarned: '5' }];
            vi.mocked(getTopContributors).mockResolvedValue(mockData);

            const response = await request(app).get('/api/leaderboard/contributors');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockData);
            expect(getTopContributors).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            vi.mocked(getTopContributors).mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/leaderboard/contributors');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/leaderboard/projects', () => {
        it('should return projects list', async () => {
            const mockData = [{ rank: 1, id: 1, name: 'repo', bountiesCount: 5, avatarUrl: 'url' }];
            vi.mocked(getTopProjects).mockResolvedValue(mockData);

            const response = await request(app).get('/api/leaderboard/projects');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockData);
            expect(getTopProjects).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            vi.mocked(getTopProjects).mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/leaderboard/projects');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
});
