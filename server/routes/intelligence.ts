import type { Express, Request, Response } from "express";
import { startIntelligenceHub, generateIntelligenceFeed, getUnifiedSnapshot, getHubStatus } from "../unifiedIntelligenceHub";
import { registerSSEClient, startSSEBroadcaster, getSSEStatus } from "../sseManager";
import { startPrecomputedEngine, getPrecomputedPredictions, getPrecomputedCache, getEngineStatus as getPrecomputedEngineStatus, buildOptimalTickets, buildMatchupTickets, type PrecomputedSnapshot, type PrecomputedPick, type OptimalTicket, type MatchupTicket } from "../precomputedPredictionsEngine";
import { isPickReleasedForTier, diversifyPicksForUser, getCapacityStatus, recordTail, getProtectionStats, getPickReleaseTime } from "../pickProtectionEngine";
import { stripeService } from "../stripeService";
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
import { getInSeasonSports } from "../sportSeasons";
import { getClientIp, requireAuth, requireTier } from "./helpers";

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

  app.get("/api/optimal-tickets", async (req: Request, res: Response) => {
    try {
      const sportsParam = (req.query.sports as string) || "NBA,NFL,MLB,NHL,NCAAB,NCAAF";
      const sports = sportsParam.split(",").map(s => s.trim().toUpperCase()).filter(s =>
        ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(s)
      );
      const rawRisk = (req.query.risk as string) || "moderate";
      const riskLevel = ["conservative", "moderate", "aggressive"].includes(rawRisk) ? rawRisk : "moderate";
      const bankroll = Math.max(10, Math.min(Number(req.query.bankroll) || 1000, 100000));
      const maxLegs = Math.max(2, Math.min(Number(req.query.maxLegs) || 4, 10));
      const rawDate = (req.query.date as string) || "all";
      const dateFilter = (["today", "future", "all"].includes(rawDate) ? rawDate : "all") as "today" | "future" | "all";

      const tickets = buildOptimalTickets({ sports, riskLevel, bankroll, maxLegs, dateFilter });

      return res.json({
        tickets,
        ticketCount: tickets.length,
        sports,
        riskLevel,
        generatedAt: new Date().toISOString(),
        engineSources: [
          "Quantum Fusion (46 factors)",
          "Monte Carlo Simulations",
          "Situational Analysis",
          "Injury Impact",
          "Vegas Power Ratings",
          "Market Odds (The Odds API)",
          "ESPN Live Data",
        ],
      });
    } catch (err) {
      console.error("Optimal tickets error:", err);
      return res.status(500).json({ error: "Failed to build optimal tickets" });
    }
  });

  app.get("/api/matchup-tickets", async (req: Request, res: Response) => {
    try {
      const sportsParam = (req.query.sports as string) || "NBA,NFL,MLB,NHL,NCAAB,NCAAF";
      const sports = sportsParam.split(",").map(s => s.trim().toUpperCase()).filter(s =>
        ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(s)
      );
      const maxLegs = Math.max(3, Math.min(Number(req.query.maxLegs) || 20, 30));
      const bankroll = Math.max(10, Math.min(Number(req.query.bankroll) || 1000, 100000));

      const matchupTickets = buildMatchupTickets({ sports, maxLegs, bankroll });

      return res.json({
        matchupTickets,
        ticketCount: matchupTickets.length,
        sports,
        generatedAt: new Date().toISOString(),
        engineSources: [
          "Quantum Fusion (46 factors)",
          "Monte Carlo Simulations",
          "Situational Analysis",
          "Injury Impact",
          "Vegas Power Ratings",
          "Market Odds (The Odds API)",
          "ESPN Live Data",
        ],
      });
    } catch (err) {
      console.error("Matchup tickets error:", err);
      return res.status(500).json({ error: "Failed to build matchup tickets" });
    }
  });

  app.get("/api/precomputed-predictions/:sport", requireAuth, async (req: Request, res: Response) => {
    try {
      const sport = req.params.sport?.toUpperCase();
      if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport. Use NBA, NFL, MLB, NHL, NCAAB, or NCAAF." });
      }

      const username = req.session?.username || "";
      const subscription = await stripeService.getUserSubscription(username);
      const userTier = subscription?.subscriptionTier || "free";
      const isAdmin = req.session?.isAdmin || false;
      const effectiveTier = isAdmin ? "whale" : userTier;

      const snapshot = await getPrecomputedPredictions(sport as any);

      let filteredPicks = snapshot.picks.filter(pick =>
        isPickReleasedForTier(pick.generatedAt, effectiveTier)
      );

      if (effectiveTier !== "whale") {
        filteredPicks = filteredPicks.filter(pick => !pick.isExclusive);
      }

      filteredPicks = diversifyPicksForUser(filteredPicks, username, effectiveTier);

      const picksWithCapacity = filteredPicks.map(pick => ({
        ...pick,
        capacity: getCapacityStatus(pick.id, effectiveTier),
      }));

      let eligiblePending = snapshot.picks.filter(pick =>
        !isPickReleasedForTier(pick.generatedAt, effectiveTier)
      );
      if (effectiveTier !== "whale") {
        eligiblePending = eligiblePending.filter(pick => !pick.isExclusive);
      }
      eligiblePending.sort((a, b) =>
        new Date(getPickReleaseTime(a.generatedAt, effectiveTier)).getTime() -
        new Date(getPickReleaseTime(b.generatedAt, effectiveTier)).getTime()
      );

      const protectedSnapshot = {
        ...snapshot,
        picks: picksWithCapacity,
        totalPickPool: snapshot.picks.length,
        exclusivePickCount: snapshot.exclusivePickCount,
        userTier: effectiveTier,
        pendingReleaseCount: eligiblePending.length,
        nextPickRelease: eligiblePending.length > 0 ? getPickReleaseTime(eligiblePending[0].generatedAt, effectiveTier) : null,
        pickProtection: {
          staggeredRelease: true,
          capacityLimits: true,
          diversifiedDistribution: effectiveTier !== "whale",
          exclusiveAccess: effectiveTier === "whale",
        },
      };

      return res.json(protectedSnapshot);
    } catch (err) {
      console.error("Precomputed predictions error:", err);
      return res.status(500).json({ error: "Failed to fetch precomputed predictions" });
    }
  });

  app.post("/api/picks/:pickId/tail", requireAuth, async (req: Request, res: Response) => {
    try {
      const { pickId } = req.params;
      const username = req.session?.username || "";
      const subscription = await stripeService.getUserSubscription(username);
      const userTier = subscription?.subscriptionTier || "free";
      const effectiveTier = req.session?.isAdmin ? "whale" : userTier;

      const allCaches = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
      let targetPick: any = null;
      for (const sport of allCaches) {
        const cached = getPrecomputedCache(sport as any);
        if (cached) {
          targetPick = cached.picks.find((p: any) => p.id === pickId);
          if (targetPick) break;
        }
      }

      if (targetPick) {
        if (!isPickReleasedForTier(targetPick.generatedAt, effectiveTier)) {
          return res.status(403).json({ error: "Pick not yet released for your tier" });
        }
        if (targetPick.isExclusive && effectiveTier !== "whale") {
          return res.status(403).json({ error: "Exclusive pick requires Max tier" });
        }
      }

      const result = recordTail(pickId, username, effectiveTier);
      return res.json(result);
    } catch (err) {
      console.error("Tail recording error:", err);
      return res.status(500).json({ error: "Failed to record tail" });
    }
  });

  app.get("/api/pick-protection/stats", requireAuth, (_req: Request, res: Response) => {
    return res.json(getProtectionStats());
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

  app.get("/api/sports/in-season", (_req: Request, res: Response) => {
    return res.json(getInSeasonSports());
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
