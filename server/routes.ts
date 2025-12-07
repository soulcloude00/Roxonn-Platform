import type { Express } from "express";
import { registerModularRoutes } from "./routes/index";

/**
 * Register all application routes
 *
 * This file acts as a thin wrapper that delegates to the modular routes system.
 * All actual route handlers are defined in the ./routes/ directory.
 *
 * @see ./routes/index.ts for route registration
 */
export async function registerRoutes(app: Express) {
  registerModularRoutes(app);
}
