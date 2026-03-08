import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./routes/auth";
import { registerAdminRoutes } from "./routes/admin";
import { registerBettingRoutes } from "./routes/betting";
import { registerAccountRoutes } from "./routes/account";
import { registerCommunityRoutes } from "./routes/community";
import { registerApplyRoutes } from "./routes/apply";
import { registerIntelligenceRoutes } from "./routes/intelligence";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerAiRoutes } from "./routes/ai";
import { registerTicketRoutes } from "./routes/tickets";
import { registerSorsbooksRoutes } from "./routes/sorsbooks";
import cardsRouter from "./routes/cards";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  await registerAdminRoutes(app);
  await registerBettingRoutes(app);
  await registerAccountRoutes(app);
  registerApplyRoutes(app);
  registerCommunityRoutes(app);
  registerIntelligenceRoutes(app);
  registerNotificationRoutes(app);
  registerAiRoutes(app);
  registerTicketRoutes(app);
  registerSorsbooksRoutes(app);
  
  app.use("/api/cards", cardsRouter);

  return httpServer;
}
