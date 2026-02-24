import type { Express, Request, Response } from "express";
import { startIntelligenceHub, generateIntelligenceFeed, getUnifiedSnapshot, getHubStatus } from "../unifiedIntelligenceHub";
import { registerSSEClient, startSSEBroadcaster, getSSEStatus } from "../sseManager";
import { startPrecomputedEngine, getPrecomputedPredictions, getPrecomputedCache, getEngineStatus as getPrecomputedEngineStatus } from "../precomputedPredictionsEngine";

export function registerIntelligenceRoutes(app: Express): void {
  startIntelligenceHub();

  app.get("/api/intelligence/feed", async (_req: Request, res: Response) => {
    try {
      const feed = await generateIntelligenceFeed();
      return res.json(feed);
    } catch (err) {
      console.error("Intelligence feed error:", err);
      return res.status(500).json({ error: "Failed to generate intelligence feed" });
    }
  });

  app.get("/api/intelligence/snapshot/:sport", async (req: Request, res: Response) => {
    try {
      const sport = req.params.sport?.toUpperCase();
      if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport" });
      }
      const snapshot = await getUnifiedSnapshot(sport as any);
      if (!snapshot) {
        return res.status(404).json({ error: "No data available yet, hub is initializing" });
      }
      return res.json({
        sport: snapshot.sport,
        games: snapshot.games.length,
        marketData: snapshot.marketData ? snapshot.marketData.games.length : 0,
        injuries: snapshot.injuries.length,
        weatherStations: snapshot.weatherMap.size,
        timestamp: new Date(snapshot.timestamp).toISOString(),
      });
    } catch (err) {
      console.error("Intelligence snapshot error:", err);
      return res.status(500).json({ error: "Failed to fetch intelligence snapshot" });
    }
  });

  app.get("/api/intelligence/hub-status", (_req: Request, res: Response) => {
    return res.json(getHubStatus());
  });

  startSSEBroadcaster();

  app.get("/api/sse/stream", (req: Request, res: Response) => {
    const channelsParam = (req.query.channels as string) || "all";
    const channels = channelsParam.split(",").map(c => c.trim()).filter(Boolean);
    registerSSEClient(res, channels);
  });

  app.get("/api/sse/status", (_req: Request, res: Response) => {
    return res.json(getSSEStatus());
  });

  startPrecomputedEngine();

  app.get("/api/precomputed-predictions/:sport", async (req: Request, res: Response) => {
    try {
      const sport = req.params.sport?.toUpperCase();
      if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport. Use NBA, NFL, MLB, NHL, NCAAB, or NCAAF." });
      }
      const snapshot = await getPrecomputedPredictions(sport as any);
      return res.json(snapshot);
    } catch (err) {
      console.error("Precomputed predictions error:", err);
      return res.status(500).json({ error: "Failed to fetch precomputed predictions" });
    }
  });

  app.get("/api/precomputed-predictions/:sport/cache", (req: Request, res: Response) => {
    const sport = req.params.sport?.toUpperCase();
    if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
      return res.status(400).json({ error: "Invalid sport" });
    }
    const cached = getPrecomputedCache(sport as any);
    if (!cached) {
      return res.status(404).json({ error: "No cached predictions available" });
    }
    return res.json(cached);
  });

  app.get("/api/precomputed-engine/status", (_req: Request, res: Response) => {
    return res.json(getPrecomputedEngineStatus());
  });
}
