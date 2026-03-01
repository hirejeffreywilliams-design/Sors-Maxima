import type { Express, Request, Response } from "express";
import { subscribeToGame, unsubscribeFromGame, getUserGameSubscriptions, watchParlay, unwatchParlay, getUserParlayWatches, getNotifications as getCustomNotifications, markNotificationsRead as markCustomNotificationsRead, getNotificationStats } from "../notificationEngine";

export function registerNotificationRoutes(app: Express): void {

  app.get("/api/custom-notifications", (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const types = req.query.types ? (req.query.types as string).split(",") : undefined;
    return res.json(getCustomNotifications(limit, types));
  });

  app.put("/api/custom-notifications/read", (req: Request, res: Response) => {
    const { ids } = req.body;
    markCustomNotificationsRead(ids);
    return res.json({ success: true });
  });

  app.get("/api/custom-notifications/stats", (_req: Request, res: Response) => {
    return res.json(getNotificationStats());
  });

  app.post("/api/game-subscriptions", async (req: Request, res: Response) => {
    const { gameId, sport, gameName, alerts } = req.body;
    if (!gameId || !sport) {
      return res.status(400).json({ error: "gameId and sport are required" });
    }
    const userId = (req.session as any)?.userId || (req.session as any)?.username || "anon";
    const sub = await subscribeToGame(userId, gameId, sport, gameName || "", alerts);
    return res.json(sub);
  });

  app.delete("/api/game-subscriptions/:gameId", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username || "anon";
    const removed = await unsubscribeFromGame(userId, req.params.gameId);
    return res.json({ success: removed });
  });

  app.get("/api/game-subscriptions", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username || "anon";
    return res.json(await getUserGameSubscriptions(userId));
  });

  app.post("/api/parlay-watches", (req: Request, res: Response) => {
    const { ticketId, legs } = req.body;
    if (!ticketId || !legs || !Array.isArray(legs)) {
      return res.status(400).json({ error: "ticketId and legs array are required" });
    }
    const userId = (req.session as any)?.userId || (req.session as any)?.username || "anon";
    const watch = watchParlay(ticketId, userId, legs);
    return res.json(watch);
  });

  app.delete("/api/parlay-watches/:ticketId", (req: Request, res: Response) => {
    const removed = unwatchParlay(req.params.ticketId);
    return res.json({ success: removed });
  });

  app.get("/api/parlay-watches", (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId || (req.session as any)?.username || "anon";
    return res.json(getUserParlayWatches(userId));
  });
}
