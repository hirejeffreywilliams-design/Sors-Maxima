import type { Express } from "express";
import { createServer, type Server } from "http";
import { preloadAllRosters, startPeriodicRefresh } from "./espn-roster-provider";
import { registerAuthRoutes } from "./routes/auth";
import { registerAdminRoutes } from "./routes/admin";
import { registerBettingRoutes } from "./routes/betting";
import { registerAccountRoutes } from "./routes/account";
import { registerCommunityRoutes } from "./routes/community";
import { registerIntelligenceRoutes } from "./routes/intelligence";
import { registerNotificationRoutes } from "./routes/notifications";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  preloadAllRosters().then(() => {
    startPeriodicRefresh(6);
  }).catch((err) => {
    console.error("[Startup] Roster preload failed:", err);
    startPeriodicRefresh(6);
  });

  registerAuthRoutes(app);
  await registerAdminRoutes(app);
  await registerBettingRoutes(app);
  await registerAccountRoutes(app);
  registerCommunityRoutes(app);
  registerIntelligenceRoutes(app);
  registerNotificationRoutes(app);

  return httpServer;
}
