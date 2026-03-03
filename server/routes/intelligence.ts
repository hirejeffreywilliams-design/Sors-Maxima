import type { Express, Request, Response } from "express";
import { generateIntelligenceFeed, getUnifiedSnapshot, getHubStatus } from "../unifiedIntelligenceHub";
import { generateInternationalFeed, getLeagueEmoji } from "../internationalSportsEngine";
import { generateMMAFeed, generateNCAABFutures } from "../mma-engine";
import { getStrategyTemplates, analyzeTicket, getSmartSuggestions, getStrategyById } from "../strategyAdvisorEngine";
import { registerSSEClient, getSSEStatus } from "../sseManager";
import { getPrecomputedPredictions, getPrecomputedCache, getEngineStatus as getPrecomputedEngineStatus, buildOptimalTickets, buildMatchupTickets, buildLifeChangerTicket, type PrecomputedSnapshot, type PrecomputedPick, type OptimalTicket, type MatchupTicket } from "../precomputedPredictionsEngine";
import { getRecentPropMovements, getSharpPropAlerts, getPropMovementsForPlayer } from "../notificationEngine";
import { isPickReleasedForTier, diversifyPicksForUser, getCapacityStatus, recordTail, getProtectionStats, getPickReleaseTime } from "../pickProtectionEngine";
import { stripeService } from "../stripeService";
import { getPickAccuracyStats, getBacktestCount } from "../pickOutcomeTracker";
import {
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
  getMonteCarloEngineStatus,
  getCalibrationReport,
  simulateMatchup,
  getAllPreSimulated,
  getPreSimulated,
  getRiskMetrics,
} from "../monteCarloEngine";
import type { MatchupSimulationInput } from "../monteCarloEngine";
import { getInSeasonSports } from "../sportSeasons";
import { getClientIp, requireAuth, requireTier, requireSubscription } from "./helpers";
import { getTwoWayMatchupImpact } from "../two-way-contracts";

export function registerIntelligenceRoutes(app: Express): void {
  app.get("/api/intelligence/feed", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const feed = await generateIntelligenceFeed();
      return res.json(feed);
    } catch (err) {
      console.error("Intelligence feed error:", err);
      return res.status(500).json({ error: "Failed to generate intelligence feed" });
    }
  });

  app.get("/api/intelligence/snapshot/:sport", requireSubscription, async (req: Request, res: Response) => {
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

  app.get("/api/sse/stream", requireAuth, (req: Request, res: Response) => {
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


  app.get("/api/optimal-tickets", requireSubscription, async (req: Request, res: Response) => {
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
          "46-Factor Model Analysis",
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

  app.get("/api/matchup-tickets", requireSubscription, async (req: Request, res: Response) => {
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
          "46-Factor Model Analysis",
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

  app.get("/api/prop-movements", requireSubscription, (req: Request, res: Response) => {
    try {
      const sharpOnly = req.query.sharp === "true";
      const player = req.query.player as string | undefined;
      const limit = Math.max(1, Math.min(Number(req.query.limit) || 25, 100));

      let movements;
      if (player) {
        movements = getPropMovementsForPlayer(player);
      } else if (sharpOnly) {
        movements = getSharpPropAlerts();
      } else {
        movements = getRecentPropMovements({ limit });
      }

      return res.json({
        movements: movements.slice(0, limit),
        totalCount: movements.length,
        sharpCount: movements.filter(m => m.sharpAction).length,
        steamCount: movements.filter(m => m.velocity === "steam").length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Prop movements error:", err);
      return res.status(500).json({ error: "Failed to fetch prop movements" });
    }
  });

  app.get("/api/precomputed-predictions/:sport", requireSubscription, async (req: Request, res: Response) => {
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

  app.get("/api/model-health", (_req: Request, res: Response) => {
    try {
      const stats = getPickAccuracyStats();
      const settledCount = stats.overall.total;
      const won = stats.overall.won;
      const lost = stats.overall.lost;
      const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0;
      const recentForm = stats.recentForm;
      const recentWon = recentForm.won;
      const recentLost = recentForm.lost;
      const recentTrend = recentWon + recentLost > 0
        ? Math.round((recentWon / (recentWon + recentLost)) * 1000) / 10
        : 0;
      const backtestCount = getBacktestCount();
      const liveCount = settledCount - backtestCount;

      let status: 'building' | 'calibrated' | 'recalibrating' = 'building';
      if (settledCount >= 100) {
        if (winRate >= 48 && winRate <= 60) {
          status = 'calibrated';
        } else {
          status = 'recalibrating';
        }
      }

      return res.json({
        status,
        settledCount,
        winRate,
        recentTrend,
        lastUpdated: stats.lastUpdated,
        backtestCount,
        liveCount,
        factorCount: 46
      });
    } catch (err) {
      console.error("Model health error:", err);
      return res.status(500).json({ error: "Failed to get model health" });
    }
  });

  app.get("/api/sports/in-season", (_req: Request, res: Response) => {
    return res.json(getInSeasonSports());
  });


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

  app.get("/api/strategy/templates", (_req: Request, res: Response) => {
    const templates = getStrategyTemplates();
    return res.json({ templates, count: templates.length });
  });

  app.get("/api/strategy/templates/:id", (req: Request, res: Response) => {
    const template = getStrategyById(req.params.id);
    if (!template) return res.status(404).json({ error: "Strategy not found" });
    return res.json(template);
  });

  app.post("/api/strategy/analyze", async (req: Request, res: Response) => {
    try {
      const { legs } = req.body;
      if (!Array.isArray(legs)) return res.status(400).json({ error: "legs must be an array" });
      const analysis = await analyzeTicket(legs);
      return res.json(analysis);
    } catch (err) {
      console.error("Strategy analysis error:", err);
      return res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/strategy/suggestions", async (req: Request, res: Response) => {
    try {
      const { currentLegs, strategy } = req.body;
      const suggestions = await getSmartSuggestions(currentLegs ?? [], strategy);
      return res.json({ suggestions, count: suggestions.length });
    } catch (err) {
      console.error("Strategy suggestions error:", err);
      return res.status(500).json({ error: "Suggestions failed" });
    }
  });

  app.post("/api/slip/simulate", async (req: Request, res: Response) => {
    try {
      const { legs, bankroll } = req.body;
      if (!Array.isArray(legs) || legs.length === 0) {
        return res.status(400).json({ error: "legs must be a non-empty array" });
      }
      const { runSimulation, getRiskMetrics } = await import("../monteCarloEngine");
      const parlayLegs = legs.map((l: any) => {
        const rawOdds = l.americanOdds || l.odds || l.overOdds || -110;
        const decimalOdds = l.decimalOdds ||
          (rawOdds > 0 ? 1 + rawOdds / 100 : 1 + 100 / Math.abs(rawOdds));

        let probOverride: number | undefined;
        if (typeof l.winProbability === "number" && l.winProbability > 0) {
          probOverride = l.winProbability > 1 ? l.winProbability / 100 : l.winProbability;
        } else if (typeof l.probOverride === "number" && l.probOverride > 0) {
          probOverride = l.probOverride > 1 ? l.probOverride / 100 : l.probOverride;
        } else if (typeof l.confidence === "number" && l.confidence > 0) {
          probOverride = l.confidence > 1 ? (l.confidence * 0.95) / 100 : l.confidence * 0.95;
        }

        return {
          id: l.id || `leg-${Math.random().toString(36).slice(2, 8)}`,
          gameId: l.gameId || "",
          eventId: l.gameId || l.eventId || "",
          sport: l.sport || "NBA",
          game: l.game || l.gameName || "",
          market: l.market || "moneyline",
          outcome: l.outcome || l.pick || "",
          team: l.team || "",
          odds: rawOdds,
          decimalOdds,
          probOverride,
          playerId: l.playerId || undefined,
          propCategory: l.propCategory || undefined,
          bookmaker: l.bookmaker || "consensus",
        };
      });

      const simResult = await runSimulation(parlayLegs, 25000);

      const riskMetrics = getRiskMetrics(parlayLegs, bankroll || 1000);

      const combinedDecimalOdds = parlayLegs.reduce((acc: number, l: any) => acc * l.decimalOdds, 1);
      const combinedAmericanOdds = combinedDecimalOdds >= 2
        ? Math.round((combinedDecimalOdds - 1) * 100)
        : Math.round(-100 / (combinedDecimalOdds - 1));

      let riskRating: "low" | "medium" | "high" | "very_high" = "medium";
      if (simResult.winProbability >= 0.40) riskRating = "low";
      else if (simResult.winProbability >= 0.20) riskRating = "medium";
      else if (simResult.winProbability >= 0.05) riskRating = "high";
      else riskRating = "very_high";

      const kellyStake = riskMetrics.kellyFraction;
      const optimalBet = Math.round((bankroll || 1000) * Math.max(0, Math.min(kellyStake, 0.25)) * 100) / 100;
      const potentialPayout = Math.round(optimalBet * combinedDecimalOdds * 100) / 100;

      return res.json({
        simulation: {
          winProbability: Math.round(simResult.winProbability * 10000) / 100,
          method: simResult.method,
          simulations: simResult.sims,
          convergenceScore: Math.round(simResult.convergenceScore * 1000) / 1000,
          confidenceInterval: [
            Math.round(simResult.confidenceInterval[0] * 10000) / 100,
            Math.round(simResult.confidenceInterval[1] * 10000) / 100,
          ],
          standardError: Math.round(simResult.standardError * 100000) / 100000,
        },
        risk: {
          rating: riskRating,
          variance: Math.round(simResult.variance * 10000) / 10000,
          valueAtRisk95: Math.round(riskMetrics.valueAtRisk95 * 100) / 100,
          maxDrawdown: Math.round(riskMetrics.maxDrawdown * 100) / 100,
          ruinProbability: Math.round(riskMetrics.ruinProbability * 10000) / 100,
          sharpeRatio: Math.round(riskMetrics.sharpeRatio * 100) / 100,
        },
        kelly: {
          fraction: Math.round(kellyStake * 10000) / 10000,
          optimalBet,
          potentialPayout,
          expectedGrowthRate: Math.round(riskMetrics.expectedGrowthRate * 10000) / 10000,
        },
        ticket: {
          legs: parlayLegs.length,
          combinedOdds: combinedAmericanOdds,
          combinedDecimalOdds: Math.round(combinedDecimalOdds * 100) / 100,
          impliedProbability: Math.round((1 / combinedDecimalOdds) * 10000) / 100,
        },
        simulatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[slip/simulate] Error:", err.message);
      return res.status(500).json({ error: "Simulation failed" });
    }
  });

  app.get("/api/track-record", async (_req: Request, res: Response) => {
    try {
      const { getTrackRecord } = await import("../calibrationEngine");
      const { getRecentPicks } = await import("../pickOutcomeTracker");
      const record = getTrackRecord();
      
      const settledPicks = getRecentPicks({ status: "settled", limit: 5000 });
      const backtestPickCount = settledPicks.filter(p => p.isBacktest).length;
      const livePickCount = settledPicks.length - backtestPickCount;
      
      res.json({ ...record, backtestPickCount, livePickCount });
    } catch (err: any) {
      console.error("[track-record] Error:", err.message);
      res.status(500).json({ error: "Failed to load track record" });
    }
  });

  app.post("/api/track-record/refresh", async (_req: Request, res: Response) => {
    try {
      const { invalidateCalibrationCache, getTrackRecord } = await import("../calibrationEngine");
      invalidateCalibrationCache();
      const record = getTrackRecord();
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to refresh track record" });
    }
  });

  app.get("/api/life-changer-ticket", (req: Request, res: Response) => {
    try {
      const ticket = buildLifeChangerTicket();
      if (!ticket) {
        return res.json({ ticket: null, message: "Not enough picks available yet — check back once today's games are loaded." });
      }
      res.json({ ticket });
    } catch (err: any) {
      console.error("[life-changer] Error:", err.message);
      res.status(500).json({ error: "Failed to generate Life Changer ticket" });
    }
  });

  // ── MMA/UFC ────────────────────────────────────────────────────────────────
  app.get("/api/mma/picks", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const feed = await generateMMAFeed();
      res.json(feed);
    } catch (err: any) {
      console.error("[mma] Error:", err.message);
      res.status(500).json({ error: "Failed to load MMA picks" });
    }
  });

  // ── Championship Futures ───────────────────────────────────────────────────
  app.get("/api/picks/futures/ncaab", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const futures = await generateNCAABFutures();
      res.json(futures);
    } catch (err: any) {
      console.error("[futures] Error:", err.message);
      res.status(500).json({ error: "Failed to load championship futures" });
    }
  });

  // ── International Sports ────────────────────────────────────────────────────
  app.get("/api/international/feed", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const feed = await generateInternationalFeed();
      res.json(feed);
    } catch (err: any) {
      console.error("[international] Error:", err.message);
      res.status(500).json({ error: "Failed to load international feed" });
    }
  });

  app.get("/api/international/picks", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const feed = await generateInternationalFeed();
      res.json({
        picks: feed.picks,
        totalPicks: feed.totalPicks,
        lastUpdated: feed.lastUpdated,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load international picks" });
    }
  });

  app.get("/api/international/league/:sport", requireSubscription, async (req: Request, res: Response) => {
    try {
      const { sport } = req.params;
      const feed = await generateInternationalFeed();
      const leagueStatus = feed.leagueStatus.find(l => l.sport === sport);
      const picks = feed.picks.filter(p => p.sport === sport);
      if (!leagueStatus) return res.status(404).json({ error: "League not found" });
      res.json({
        ...leagueStatus,
        picks,
        emoji: getLeagueEmoji(sport),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load league data" });
    }
  });

  app.get("/api/nba/two-way-contracts", requireSubscription, async (req: Request, res: Response) => {
    try {
      const { homeTeamId, homeTeamName, awayTeamId, awayTeamName } = req.query;
      if (!homeTeamId || !homeTeamName || !awayTeamId || !awayTeamName) {
        return res.status(400).json({ error: "homeTeamId, homeTeamName, awayTeamId, awayTeamName required" });
      }
      const impact = await getTwoWayMatchupImpact(
        homeTeamId as string,
        homeTeamName as string,
        awayTeamId as string,
        awayTeamName as string
      );
      res.json(impact);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to analyze two-way contracts" });
    }
  });

}
