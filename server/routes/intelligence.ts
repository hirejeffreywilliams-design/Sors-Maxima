import type { Express, Request, Response } from "express";
import { startIntelligenceHub, generateIntelligenceFeed, getUnifiedSnapshot, getHubStatus } from "../unifiedIntelligenceHub";
import { registerSSEClient, startSSEBroadcaster, getSSEStatus } from "../sseManager";
import { startPrecomputedEngine, getPrecomputedPredictions, getPrecomputedCache, getEngineStatus as getPrecomputedEngineStatus } from "../precomputedPredictionsEngine";
import {
  startPlatformIntelligenceEngine,
  getFullIntelligenceReport,
  getTeamTrends,
  getTeamDetail,
  getPredictionAccuracy,
  getBookmakerRankings,
  getInjuryImpactDatabase,
  getCommunityInsights,
  getPlatformStats,
  getDailySummaries,
  getEngineStatus as getPlatformEngineStatus,
} from "../platformIntelligenceEngine";
import {
  startMonteCarloEngine,
  getMonteCarloEngineStatus,
  getCalibrationReport,
  simulateMatchup,
  getAllPreSimulated,
  getPreSimulated,
  getRiskMetrics,
} from "../monteCarloEngine";
import type { MatchupSimulationInput } from "../monteCarloEngine";
import { getClientIp } from "./helpers";

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
    const clientIp = getClientIp(req);
    const lastEventIdHeader = req.headers["last-event-id"] as string | undefined;
    const lastEventIdQuery = req.query.lastEventId as string | undefined;
    const lastEventId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : lastEventIdQuery ? parseInt(lastEventIdQuery, 10) : undefined;
    registerSSEClient(res, channels, clientIp, lastEventId);
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

  startPlatformIntelligenceEngine();

  app.get("/api/platform-intelligence", (_req: Request, res: Response) => {
    try {
      return res.json(getFullIntelligenceReport());
    } catch (err) {
      console.error("Platform intelligence error:", err);
      return res.status(500).json({ error: "Failed to get platform intelligence" });
    }
  });

  app.get("/api/platform-intelligence/team-trends", (req: Request, res: Response) => {
    const sport = req.query.sport as string | undefined;
    const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    const sportFilter = sport && validSports.includes(sport.toUpperCase()) ? sport.toUpperCase() as any : undefined;
    return res.json(getTeamTrends(sportFilter));
  });

  app.get("/api/platform-intelligence/team/:sport/:team", (req: Request, res: Response) => {
    const { sport, team } = req.params;
    return res.json(getTeamDetail(decodeURIComponent(team), sport.toUpperCase() as any));
  });

  app.get("/api/platform-intelligence/prediction-accuracy", (_req: Request, res: Response) => {
    return res.json(getPredictionAccuracy());
  });

  app.get("/api/platform-intelligence/bookmaker-rankings", (_req: Request, res: Response) => {
    return res.json(getBookmakerRankings());
  });

  app.get("/api/platform-intelligence/injury-impact", (req: Request, res: Response) => {
    const sport = req.query.sport as string | undefined;
    const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    const sportFilter = sport && validSports.includes(sport.toUpperCase()) ? sport.toUpperCase() as any : undefined;
    return res.json(getInjuryImpactDatabase(sportFilter));
  });

  app.get("/api/platform-intelligence/community", (_req: Request, res: Response) => {
    return res.json(getCommunityInsights());
  });

  app.get("/api/platform-intelligence/stats", (_req: Request, res: Response) => {
    return res.json(getPlatformStats());
  });

  app.get("/api/platform-intelligence/daily-summaries", (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 30;
    return res.json(getDailySummaries(limit));
  });

  app.get("/api/platform-intelligence/engine-status", (_req: Request, res: Response) => {
    return res.json(getPlatformEngineStatus());
  });

  startMonteCarloEngine();

  app.get("/api/monte-carlo/status", (_req: Request, res: Response) => {
    return res.json(getMonteCarloEngineStatus());
  });

  app.get("/api/monte-carlo/calibration", (_req: Request, res: Response) => {
    return res.json(getCalibrationReport());
  });

  app.get("/api/monte-carlo/pre-simulated", (_req: Request, res: Response) => {
    return res.json(getAllPreSimulated());
  });

  app.get("/api/monte-carlo/simulate/:gameId", (req: Request, res: Response) => {
    const { gameId } = req.params;
    const cached = getPreSimulated(gameId);
    if (cached) {
      return res.json(cached);
    }
    return res.json({ error: "Game not found in pre-simulation cache", gameId });
  });

  app.post("/api/monte-carlo/simulate", (req: Request, res: Response) => {
    try {
      const { gameId, sport, homeTeam, awayTeam, homeWinPct, awayWinPct, spread, totalLine, homeMoneyline, awayMoneyline } = req.body;
      if (!gameId || !sport || !homeTeam || !awayTeam) {
        return res.status(400).json({ error: "Missing required fields: gameId, sport, homeTeam, awayTeam" });
      }
      const input: MatchupSimulationInput = {
        gameId,
        sport: sport as any,
        homeTeam,
        awayTeam,
        homeWinPct: homeWinPct || 50,
        awayWinPct: awayWinPct || 50,
        spread,
        totalLine,
        homeMoneyline,
        awayMoneyline,
        isHomeGame: true,
        gameState: "pre",
      };
      const result = simulateMatchup(input);
      return res.json(result);
    } catch (err) {
      console.error("Monte Carlo simulation error:", err);
      return res.status(500).json({ error: "Simulation failed" });
    }
  });
}
