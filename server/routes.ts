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
import { registerResearchRoutes } from "./routes/research";
import { registerGuidelinesRoutes } from "./routes/guidelines";
import { registerFeedbackRoutes } from "./routes/feedback";
import { registerPickFeedbackRoutes } from "./routes/pickFeedback";
import { registerStrategyIntelligenceRoutes } from "./routes/strategy-intelligence";
import { registerVaultRoutes } from "./routes/vault";
import { getProgramStatus, getFoundersForWall } from "./foundersEngine";

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
  registerResearchRoutes(app);
  registerGuidelinesRoutes(app);
  registerFeedbackRoutes(app);
  registerPickFeedbackRoutes(app);
  registerStrategyIntelligenceRoutes(app);
  registerVaultRoutes(app);

  app.get("/api/founders/status", async (_req, res) => {
    try {
      const [status, founders] = await Promise.all([getProgramStatus(), getFoundersForWall()]);
      res.json({ ...status, founders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
