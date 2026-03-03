import type { Express, Request, Response, NextFunction } from "express";
import { subscribeToGame, unsubscribeFromGame, getUserGameSubscriptions, watchParlay, unwatchParlay, getUserParlayWatches, getNotifications as getCustomNotifications, markNotificationsRead as markCustomNotificationsRead, getNotificationStats } from "../notificationEngine";
import { requireAuth } from "./helpers";

export function registerNotificationRoutes(app: Express): void {

  app.get("/api/custom-notifications", requireAuth, (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const types = req.query.types ? (req.query.types as string).split(",") : undefined;
    return res.json(getCustomNotifications(limit, types));
  });

  app.put("/api/custom-notifications/read", requireAuth, (req: Request, res: Response) => {
    const { ids } = req.body;
    markCustomNotificationsRead(ids);
    return res.json({ success: true });
  });

  app.get("/api/custom-notifications/stats", requireAuth, (_req: Request, res: Response) => {
    return res.json(getNotificationStats());
  });

  app.post("/api/game-subscriptions", requireAuth, async (req: Request, res: Response) => {
    const { gameId, sport, gameName, alerts } = req.body;
    if (!gameId || !sport) {
      return res.status(400).json({ error: "gameId and sport are required" });
    }
    const userId = (req.session as any)?.userId || (req.session as any)?.username;
    const sub = await subscribeToGame(userId, gameId, sport, gameName || "", alerts);
    return res.json(sub);
  });

  app.delete("/api/game-subscriptions/:gameId", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username;
    const removed = await unsubscribeFromGame(userId, req.params.gameId);
    return res.json({ success: removed });
  });

  app.get("/api/game-subscriptions", requireAuth, async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username;
    return res.json(await getUserGameSubscriptions(userId));
  });

  app.post("/api/parlay-watches", requireAuth, (req: Request, res: Response) => {
    const { ticketId, legs } = req.body;
    if (!ticketId || !legs || !Array.isArray(legs)) {
      return res.status(400).json({ error: "ticketId and legs array are required" });
    }
    const userId = (req.session as any)?.userId || (req.session as any)?.username;
    const watch = watchParlay(ticketId, userId, legs);
    return res.json(watch);
  });

  app.delete("/api/parlay-watches/:ticketId", requireAuth, (req: Request, res: Response) => {
    const removed = unwatchParlay(req.params.ticketId);
    return res.json({ success: removed });
  });

  app.get("/api/parlay-watches", requireAuth, (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username;
    return res.json(getUserParlayWatches(userId));
  });
}
