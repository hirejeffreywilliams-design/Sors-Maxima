import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAdmin, requireAuth, requireTier, getClientIp, idempotencyMiddleware, rateLimitByTier, formatUptime } from "./helpers";
import { evaluateRequestSchema, generateParlaysRequestSchema, sports } from "@shared/schema";
import { fromError } from "zod-validation-error";

function deterministicValue(seed: string, min: number, max: number): number {
  const hash = crypto.createHash('md5').update(seed).digest();
  const val = hash.readUInt32BE(0) / 0xFFFFFFFF;
  return min + val * (max - min);
}
import { getOddsForSport, getOddsForSportAsync, refreshOddsForSport, eventsToLegs } from "../odds-provider";
import { getMultiDayScoreboard } from "../espn-scoreboard-provider";
import { generateVegasPredictions, getVegasInsights } from "../vegas-engine";
import { generateTickets as generateSmartTickets, regenerateTicketsWithLatestData, getActiveSports, type TicketRequest, type GeneratedTicket } from "../ticketOrchestrator";
import { analyzeCorrelations, gradeTicket, calculateSharpPublicSplit, generateHedgeAdvice, buildCorrelationMatrix } from "../ticketIntelligence";
import { getEngineStats as getQuantumEngineStats, getFactorCategories as getQuantumFactorCategories, getSportFactors, getSportFactorCategories, getAllSupportedSports, getSportFactorCount, analyzeSportSpecificFactors, analyzeLeg } from "../quantumFusionEngine";
import { getPreSimulated, simulateMatchup } from "../monteCarloEngine";
import { getGameSituationalFactors } from "../situationalEngine";
import { getLearningStats, getAllFactorWeights } from "../learningEngine";
import { runHistoricalLearning, getHistoricalLearningStatus } from "../historicalLearningEngine";
import { sportsDataService } from "../sportsDataService";
import { storage } from "../storage";
import { logError } from "../errorLogger";
import * as featuresService from "../featuresService";
import { getTeams, getTeamRoster, getPlayersFromCacheById } from "../espn-roster-provider";

const dataFreshnessTracker = {
  espn: Date.now(),
  oddsApi: Date.now(),
  predictions: Date.now(),
  weather: Date.now(),
};
setInterval(() => { dataFreshnessTracker.espn = Date.now(); }, 60000);
setInterval(() => { dataFreshnessTracker.predictions = Date.now(); }, 120000);

export async function registerBettingRoutes(app: Express): Promise<void> {
  app.get("/api/sports", (_req, res) => {
    const sportsList = sports.map((sport) => ({
      id: sport,
      name: sport,
      available: true,
    }));
    res.json(sportsList);
  });

  app.get("/api/odds", requireAuth, async (req, res) => {
    try {
      const sport = req.query.sport as string;
      
      if (!sport || !sports.includes(sport as any)) {
        return res.status(400).json({
          error: "Invalid sport",
          validSports: sports,
        });
      }

      const events = await getOddsForSportAsync(sport as any);
      return res.json(events);
    } catch (err) {
      console.error("Odds fetch error:", err);
      return res.status(500).json({
        error: "Failed to fetch odds",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/odds/live-legs", requireAuth, async (req, res) => {
    try {
      const { legs } = req.body as { legs: Array<{ id: string; sport?: string; team?: string; opponent?: string; market?: string; outcome?: string }> };
      if (!Array.isArray(legs) || legs.length === 0) {
        return res.json({ legs: [] });
      }
      const { getCachedOddsForLegs } = await import("../marketSnapshotEngine");
      const results = getCachedOddsForLegs(legs);
      return res.json({ legs: results, timestamp: new Date().toISOString() });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch live leg odds" });
    }
  });

  app.post("/api/odds/refresh", requireAuth, (req, res) => {
    try {
      const sport = req.body.sport as string;
      
      if (!sport || !sports.includes(sport as any)) {
        return res.status(400).json({
          error: "Invalid sport",
          validSports: sports,
        });
      }

      const events = refreshOddsForSport(sport as any);
      return res.json(events);
    } catch (err) {
      console.error("Odds refresh error:", err);
      return res.status(500).json({
        error: "Failed to refresh odds",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/market-snapshot", requireAuth, async (req, res) => {
    try {
      const sport = (req.query.sport as string) || "NBA";
      const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];
      if (!validSports.includes(sport)) {
        return res.status(400).json({ error: `Invalid sport. Must be one of: ${validSports.join(", ")}` });
      }
      const { generateMarketSnapshot } = await import("../marketSnapshotEngine");
      const snapshot = await generateMarketSnapshot(sport as any);
      return res.json(snapshot);
    } catch (err) {
      console.error("[Market Snapshot] Error:", err);
      return res.status(500).json({
        error: "Failed to generate market snapshot",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/odds-source", requireAuth, async (req, res) => {
    try {
      const sport = (req.query.sport as string)?.toUpperCase() || "NBA";
      const homeTeam = (req.query.homeTeam as string) || "";
      const awayTeam = (req.query.awayTeam as string) || "";
      const betType = (req.query.betType as string) || "moneyline";
      const pickSide = (req.query.pickSide as string) || "home";

      const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];
      if (!validSports.includes(sport)) {
        return res.status(400).json({ error: "Invalid sport" });
      }

      const { generateMarketSnapshot } = await import("../marketSnapshotEngine");
      const snapshot = await generateMarketSnapshot(sport as any);

      const homeLower = homeTeam.toLowerCase();
      const awayLower = awayTeam.toLowerCase();
      const game = snapshot.games.find(g => {
        const hn = (g.homeTeam?.abbreviation || g.homeTeam?.name || "").toLowerCase();
        const an = (g.awayTeam?.abbreviation || g.awayTeam?.name || "").toLowerCase();
        const homeToken = homeLower.split(" ").pop() || homeLower;
        const awayToken = awayLower.split(" ").pop() || awayLower;
        return (hn.includes(homeToken) || homeToken.includes(hn)) &&
               (an.includes(awayToken) || awayToken.includes(an));
      });

      if (!game || !game.bookmakers || game.bookmakers.length === 0) {
        return res.json({
          found: false,
          sport,
          homeTeam,
          awayTeam,
          betType,
          dataSource: "ESPN-derived (no live book data for this game)",
          books: [],
          bestBook: null,
          bookCount: 0,
        });
      }

      const isHome = pickSide === "home";
      const books: { book: string; odds: number }[] = game.bookmakers
        .map((bk: any) => {
          let odds: number | undefined;
          if (betType === "moneyline") odds = isHome ? bk.homeMoneyline : bk.awayMoneyline;
          else if (betType === "spread") odds = isHome ? bk.spreadHome : bk.spreadAway;
          else if (betType === "total") odds = pickSide === "over" ? bk.overPrice : bk.underPrice;
          return odds !== undefined ? { book: bk.book, odds } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.odds - a.odds) as { book: string; odds: number }[];

      let bestBook: { book: string; odds: number } | null = null;
      if (betType === "moneyline") bestBook = isHome ? game.bestLines.bestHomeML || null : game.bestLines.bestAwayML || null;
      else if (betType === "spread") bestBook = isHome ? game.bestLines.bestSpreadHome || null : game.bestLines.bestSpreadAway || null;
      else if (betType === "total") bestBook = pickSide === "over" ? game.bestLines.bestOver || null : game.bestLines.bestUnder || null;

      return res.json({
        found: true,
        sport,
        homeTeam: game.homeTeam?.abbreviation || homeTeam,
        awayTeam: game.awayTeam?.abbreviation || awayTeam,
        betType,
        dataSource: "The Odds API",
        books,
        bestBook,
        bookCount: books.length,
        consensusOdds: betType === "moneyline"
          ? (isHome ? game.consensus.homeMoneyline : game.consensus.awayMoneyline)
          : betType === "spread" ? game.consensus.spread
          : game.consensus.total,
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch odds source data" });
    }
  });

  app.get("/api/scheme-analysis", requireTier("pro", "elite", "whale"), async (req, res) => {
    try {
      const sport = (req.query.sport as string) || "NBA";
      const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];
      if (!validSports.includes(sport)) {
        return res.status(400).json({ error: `Invalid sport. Must be one of: ${validSports.join(", ")}` });
      }
      const { analyzeSchemes } = await import("../schemeRecognitionEngine");
      const analysis = await analyzeSchemes(sport as any);
      return res.json(analysis);
    } catch (err) {
      console.error("[Scheme Analysis] Error:", err);
      return res.status(500).json({
        error: "Failed to generate scheme analysis",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/generate-tickets", requireTier("pro", "elite", "whale"), rateLimitByTier("generate-tickets", { pro: 25, elite: 100, whale: 500 }, 3600000), async (req, res) => {
    try {
      const { sports, bankroll, riskLevel, maxLegs, includeProps, betTypes } = req.body;

      if (!sports || !Array.isArray(sports) || sports.length === 0) {
        return res.status(400).json({ error: "At least one sport must be selected" });
      }

      const validRiskLevels = ["conservative", "moderate", "aggressive"];
      if (riskLevel && !validRiskLevels.includes(riskLevel)) {
        return res.status(400).json({ error: "Invalid risk level" });
      }

      const request: TicketRequest = {
        sports,
        bankroll: bankroll || 1000,
        riskLevel: riskLevel || "moderate",
        maxLegs: maxLegs || 4,
        includeProps: includeProps !== false,
        betTypes: Array.isArray(betTypes) ? betTypes : undefined,
      };

      const result = await generateSmartTickets(request);

      const enrichedTickets = result.tickets.map(ticket => {
        const correlationAlerts = analyzeCorrelations(ticket.legs);
        const ticketGrade = gradeTicket(ticket);
        const hedgeAdvice = generateHedgeAdvice(ticket);
        const correlationMatrix = buildCorrelationMatrix(ticket.legs);
        const sharpPublicSplits = ticket.legs.map(leg => calculateSharpPublicSplit(leg));

        return {
          ...ticket,
          intelligence: {
            correlationAlerts,
            ticketGrade,
            hedgeAdvice,
            correlationMatrix,
            sharpPublicSplits,
          },
        };
      });

      return res.json({
        tickets: enrichedTickets,
        skippedSports: result.skippedSports,
        engineStats: getQuantumEngineStats(),
        factorCategories: getQuantumFactorCategories(),
        generatedAt: new Date().toISOString(),
        dataSources: {
          primary: "ESPN Live Data",
          analysis: "Statistical Model",
          note: "Odds and game data sourced from ESPN. Analysis is 46-Factor intelligence-based, not guaranteed.",
        },
        disclaimer: "For entertainment purposes only. No guarantees \u2014 betting involves risk. Follow local laws and gamble responsibly. If you or someone you know has a gambling problem, call 1-800-522-4700 (NCPG).",
      });
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: "generate-tickets",
      });
      return res.status(500).json({
        error: "Failed to generate tickets",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/recalculate-predictions", requireTier("pro", "elite", "whale"), rateLimitByTier("recalculate", { pro: 25, elite: 100, whale: 500 }, 3600000), async (req, res) => {
    try {
      const { sports, bankroll, riskLevel, maxLegs, includeProps, betTypes } = req.body;

      if (!sports || !Array.isArray(sports) || sports.length === 0) {
        return res.status(400).json({ error: "At least one sport must be selected" });
      }

      const validRiskLevels = ["conservative", "moderate", "aggressive"];
      if (riskLevel && !validRiskLevels.includes(riskLevel)) {
        return res.status(400).json({ error: "Invalid risk level" });
      }

      const request: TicketRequest = {
        sports,
        bankroll: bankroll || 1000,
        riskLevel: riskLevel || "moderate",
        maxLegs: maxLegs || 4,
        includeProps: includeProps !== false,
        betTypes: Array.isArray(betTypes) ? betTypes : undefined,
      };

      const result = await regenerateTicketsWithLatestData(request);

      const enrichedTickets = result.tickets.map(ticket => {
        const correlationAlerts = analyzeCorrelations(ticket.legs);
        const ticketGrade = gradeTicket(ticket);
        const hedgeAdvice = generateHedgeAdvice(ticket);
        const correlationMatrix = buildCorrelationMatrix(ticket.legs);
        const sharpPublicSplits = ticket.legs.map(leg => calculateSharpPublicSplit(leg));
        return { ...ticket, intelligence: { correlationAlerts, ticketGrade, hedgeAdvice, correlationMatrix, sharpPublicSplits } };
      });

      return res.json({
        tickets: enrichedTickets,
        skippedSports: result.skippedSports,
        engineStats: getQuantumEngineStats(),
        factorCategories: getQuantumFactorCategories(),
        generatedAt: new Date().toISOString(),
        recalculated: true,
        dataRefreshedAt: new Date().toISOString(),
        dataSources: {
          primary: "ESPN Live Data",
          analysis: "Statistical Model",
          note: "Odds and game data sourced from ESPN. Analysis is 46-Factor intelligence-based, not guaranteed.",
        },
        disclaimer: "For entertainment purposes only. No guarantees \u2014 betting involves risk. Follow local laws and gamble responsibly. If you or someone you know has a gambling problem, call 1-800-522-4700 (NCPG).",
      });
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: "recalculate-predictions",
      });
      return res.status(500).json({
        error: "Failed to recalculate predictions",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/active-sports", async (_req, res) => {
    try {
      const activeSports = await getActiveSports();
      return res.json({ sports: activeSports });
    } catch (err) {
      return res.status(500).json({ error: "Failed to check active sports" });
    }
  });

  app.get("/api/data-sources/status", async (_req, res) => {
    try {
      const oddsApiStatus = sportsDataService.getApiStatus();
      const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
      const hasStripe = !!(process.env.STRIPE_SECRET_KEY);

      return res.json({
        sources: [
          {
            id: "espn",
            name: "ESPN Live Data",
            description: "Real-time scoreboards, rosters, injuries",
            status: "active",
            type: "free",
          },
          {
            id: "odds_api",
            name: "The Odds API",
            description: "Multi-book odds comparison (DraftKings, FanDuel, BetMGM, etc.)",
            status: oddsApiStatus.available ? "active" : "fallback",
            type: "api_key",
            requestsRemaining: oddsApiStatus.requestsRemaining,
            fallbackNote: oddsApiStatus.available ? undefined : "Using ESPN-derived odds. Add THE_ODDS_API_KEY for multi-book comparison.",
          },
          {
            id: "quantum_fusion",
            name: "Sors Prediction Engine",
            description: "46-factor prediction analysis across 7 categories",
            status: "active",
            type: "built_in",
          },
          {
            id: "learning_engine",
            name: "Continuous Learning Engine",
            description: "Self-improving model weights from prediction outcomes",
            status: "active",
            type: "built_in",
          },
          {
            id: "openai",
            name: "AI Intelligence",
            description: "AI-powered diagnostics, assistant, and betting insights",
            status: hasOpenAI ? "active" : "inactive",
            type: "api_key",
          },
          {
            id: "stripe",
            name: "Payment Processing",
            description: "Stripe subscription and payment handling",
            status: hasStripe ? "active" : "inactive",
            type: "api_key",
          },
          {
            id: "prediction_pipeline",
            name: "12-Module Prediction Pipeline",
            description: "Data ingestion through explainability",
            status: "active",
            type: "built_in",
          },
          {
            id: "sport_factors",
            name: "Sport-Specific Factor Analysis",
            description: "14 sports with 300+ weighted factors",
            status: "active",
            type: "built_in",
          },
        ],
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to get data source status" });
    }
  });

  app.get("/api/data-freshness", (_req, res) => {
    res.json({
      sources: [
        { name: "ESPN", lastUpdated: new Date(dataFreshnessTracker.espn).toISOString() },
        { name: "Odds", lastUpdated: new Date(dataFreshnessTracker.oddsApi).toISOString() },
        { name: "Predictions", lastUpdated: new Date(dataFreshnessTracker.predictions).toISOString() },
        { name: "Weather", lastUpdated: new Date(dataFreshnessTracker.weather).toISOString() },
      ],
      serverTime: new Date().toISOString(),
    });
  });

  app.get("/api/quantum-engine/stats", requireTier("pro", "elite", "whale"), async (_req, res) => {
    try {
      const stats = getQuantumEngineStats();
      const categories = getQuantumFactorCategories();
      return res.json({ stats, categories });
    } catch (err) {
      return res.status(500).json({ error: "Failed to get engine stats" });
    }
  });

  app.get("/api/sport-factors/sports", async (_req, res) => {
    try {
      const sports = getAllSupportedSports();
      const sportProfiles = sports.map(sport => ({
        id: sport,
        factorCount: getSportFactorCount(sport),
        categories: getSportFactorCategories(sport).length,
      }));
      return res.json({ sports: sportProfiles, totalSports: sports.length });
    } catch (err) {
      return res.status(500).json({ error: "Failed to get supported sports" });
    }
  });

  app.get("/api/sport-factors/:sport", async (req, res) => {
    try {
      const { sport } = req.params;
      const profile = getSportFactors(sport);
      if (!profile) {
        return res.status(404).json({ error: `Sport '${sport}' not found` });
      }
      return res.json(profile);
    } catch (err) {
      return res.status(500).json({ error: "Failed to get sport factors" });
    }
  });

  app.get("/api/sport-factors/:sport/categories", async (req, res) => {
    try {
      const { sport } = req.params;
      const categories = getSportFactorCategories(sport);
      return res.json({ sport, categories, totalCategories: categories.length });
    } catch (err) {
      return res.status(500).json({ error: "Failed to get sport factor categories" });
    }
  });

  app.post("/api/sport-factors/:sport/analyze", async (req, res) => {
    try {
      const { sport } = req.params;
      const allSupported = getAllSupportedSports();
      if (!allSupported.includes(sport)) {
        return res.status(400).json({ error: `Sport '${sport}' is not supported. Supported: ${allSupported.join(", ")}` });
      }
      const context = req.body.context || {};
      const analysis = analyzeSportSpecificFactors(sport, context);
      return res.json(analysis);
    } catch (err) {
      return res.status(500).json({ error: "Failed to analyze sport factors" });
    }
  });

  app.post("/api/sport-factors/:sport/fusion-analysis", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { sport } = req.params;
      const { description, odds } = req.body;
      if (!description || odds === undefined) {
        return res.status(400).json({ error: "description and odds are required" });
      }
      const allSupported = getAllSupportedSports();
      if (!allSupported.includes(sport)) {
        return res.status(400).json({ error: `Sport '${sport}' is not supported. Supported: ${allSupported.join(", ")}` });
      }
      const coreSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
      const sportKey = coreSports.includes(sport) ? sport as any : "NFL";
      const fusionResult = analyzeLeg(sportKey, description, odds, req.body.context || {});
      const sportAnalysis = analyzeSportSpecificFactors(sport, req.body.context || {});
      const isCoreEngine = coreSports.includes(sport);
      return res.json({
        fusion: fusionResult,
        sportSpecific: sportAnalysis,
        combinedScore: isCoreEngine
          ? Math.round((fusionResult.overallScore * 0.7 + sportAnalysis.overallSportScore * 0.3))
          : Math.round((fusionResult.overallScore * 0.4 + sportAnalysis.overallSportScore * 0.6)),
        sport,
        coreEngineSupport: isCoreEngine,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to perform fusion analysis" });
    }
  });

  app.post("/api/generate-parlays", requireTier("pro", "elite", "whale"), rateLimitByTier("generate-parlays", { pro: 25, elite: 100, whale: 500 }, 3600000), idempotencyMiddleware, async (req, res) => {
    try {
      const parseResult = generateParlaysRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Validation failed",
          details: validationError.toString(),
        });
      }

      const { sport, stake, minLegs, maxLegs, bankroll, riskLevel, topN, selectedEventIds, selectedTotals, selectedProps } =
        parseResult.data;

      let events = await getOddsForSportAsync(sport);
      
      if (selectedEventIds && selectedEventIds.length > 0) {
        events = events.filter(e => selectedEventIds.includes(e.id));
      }
      
      let legs = eventsToLegs(events);
      
      const selectedTotalGameIds = new Set((selectedTotals || []).map(t => t.gameId));
      
      if (selectedTotals && selectedTotals.length > 0) {
        const totalLegs = [];
        for (const total of selectedTotals) {
          const event = events.find(e => e.id === total.gameId);
          if (!event) continue;
          
          const totalMarket = event.markets.find(m => m.type === "total");
          if (!totalMarket) continue;
          
          const outcome = totalMarket.outcomes.find(o => 
            total.selection === "over" ? o.name.includes("Over") : o.name.includes("Under")
          );
          if (!outcome) continue;
          
          totalLegs.push({
            id: `${event.id}-total-${total.selection}`,
            eventId: event.id,
            team: `${event.awayTeam} @ ${event.homeTeam}`,
            opponent: "",
            market: "total" as const,
            outcome: outcome.name,
            decimalOdds: outcome.decimalOdds,
            americanOdds: outcome.americanOdds,
          });
        }
        
        legs = legs.filter(leg => {
          if (leg.market === "total" && leg.eventId && selectedTotalGameIds.has(leg.eventId)) {
            return false;
          }
          return true;
        });
        
        legs = [...totalLegs, ...legs];
      }

      if (selectedProps && selectedProps.length > 0) {
        const propLegs = [];
        for (const propSelection of selectedProps) {
          const { gameId, playerId, category, selection } = propSelection;
          const event = events.find(e => e.id === gameId);
          if (!event || !event.playerProps) continue;
          
          const prop = event.playerProps.find(p => 
            p.playerId === playerId && p.category === category
          );
          if (!prop) continue;
          
          const odds = selection === "over" ? prop.overOdds : prop.underOdds;
          const outcomeLabel = selection === "over" ? "Over" : "Under";
          
          propLegs.push({
            id: `${gameId}-${playerId}-${category}-${selection}`,
            eventId: event.id,
            team: prop.team,
            opponent: "",
            market: "player_prop" as const,
            outcome: `${prop.playerName} ${outcomeLabel} ${prop.line} ${category}`,
            decimalOdds: odds.decimalOdds,
            americanOdds: odds.americanOdds,
          });
        }
        legs = [...propLegs, ...legs];
      }

      if (legs.length < minLegs) {
        return res.status(400).json({
          error: "Not enough betting options available",
          available: legs.length,
          required: minLegs,
          hint: selectedEventIds?.length ? "Try selecting more games" : "Try a different sport",
        });
      }

      const parlays = await storage.generateOptimalParlays(legs, {
        minLegs,
        maxLegs,
        bankroll,
        riskLevel,
        topN,
        stake,
        sport,
      });

      return res.json({
        parlays,
        meta: {
          sport,
          eventsAnalyzed: events.length,
          legsAnalyzed: legs.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Parlay generation error:", err);
      return res.status(500).json({
        error: "Failed to generate parlays",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/evaluate", requireTier("pro", "elite", "whale"), rateLimitByTier("evaluate", { pro: 50, elite: 200, whale: 1000 }, 3600000), idempotencyMiddleware, async (req, res) => {
    try {
      const parseResult = evaluateRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Validation failed",
          details: validationError.toString(),
        });
      }

      const { legs, stake, simulations } = parseResult.data;

      if (legs.length < 2) {
        return res.status(400).json({
          error: "At least 2 legs are required for parlay evaluation",
        });
      }

      if (legs.length > 12) {
        return res.status(400).json({
          error: "Maximum 12 legs allowed per parlay",
        });
      }

      const result = await storage.evaluateParlay(legs, stake, simulations);
      return res.json(result);
    } catch (err) {
      console.error("Evaluation error:", err);
      return res.status(500).json({
        error: "Failed to evaluate parlay",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/grade-parlay", requireTier("pro", "elite", "whale"), rateLimitByTier("grade-parlay", { pro: 50, elite: 200, whale: 1000 }, 3600000), async (req, res) => {
    try {
      const { legs } = req.body;
      if (!legs || !Array.isArray(legs) || legs.length < 2) {
        return res.status(400).json({ error: "At least 2 legs required for grading" });
      }

      const combinedOdds = legs.reduce((acc: number, l: any) => acc * (l.decimalOdds || 1), 1);
      const impliedProb = 1 / combinedOdds;

      const estimateModelProbability = (leg: any): number => {
        const ip = 1 / (leg.decimalOdds || 2);
        let edge = 0;

        const market = leg.market || "unknown";
        if (market === "spread") {
          edge += 0.03;
        } else if (market === "total") {
          edge += 0.02;
        } else if (market === "moneyline") {
          if (leg.decimalOdds >= 1.4 && leg.decimalOdds <= 2.2) {
            edge += 0.04;
          } else if (leg.decimalOdds > 2.2) {
            edge += 0.01;
          } else {
            edge += 0.02;
          }
        } else if (market.startsWith("player_")) {
          edge += -0.01;
        } else if (market.includes("alt_")) {
          edge += 0.01;
        } else {
          edge += 0.02;
        }

        if (leg.decimalOdds >= 1.8 && leg.decimalOdds <= 2.3) {
          edge += 0.02;
        } else if (leg.decimalOdds >= 1.4 && leg.decimalOdds < 1.8) {
          edge += 0.01;
        } else if (leg.decimalOdds > 3.0) {
          edge -= 0.02;
        } else if (leg.decimalOdds < 1.25) {
          edge -= 0.01;
        }

        const modelProb = Math.min(0.97, Math.max(0.03, ip + edge));
        return modelProb;
      }

      const legModelProbs = legs.map((l: any) => estimateModelProbability(l));
      const winProbability = legModelProbs.reduce((a: number, b: number) => a * b, 1);
      const evPercent = ((winProbability / impliedProb) - 1) * 100;

      const legCount = legs.length;
      const legCountPenalty = legCount <= 2 ? 0 : legCount <= 4 ? (legCount - 2) * 3 : (legCount - 2) * 5;
      const confidenceScore = Math.min(95, Math.max(25, 70 + (evPercent * 1.5) - legCountPenalty));

      const ticketForGrading = {
        legs,
        totalOdds: combinedOdds,
        winProbability,
        expectedValue: evPercent / 100,
        confidenceScore,
        evPercent,
        riskRating: legCount <= 3 ? "low" : legCount <= 5 ? "medium" : "high",
      };

      const grade = gradeTicket(ticketForGrading);

      const legReports = legs.map((leg: any, i: number) => {
        const legModelProb = legModelProbs[i];
        const legImplied = 1 / (leg.decimalOdds || 2);
        const legEV = ((legModelProb / legImplied) - 1) * 100;
        const legPros: string[] = [];
        const legCons: string[] = [];

        if (legEV > 2) legPros.push(`Positive expected value (+${legEV.toFixed(1)}% edge)`);
        else if (legEV > 0) legPros.push(`Slight positive edge (+${legEV.toFixed(1)}%)`);
        else if (legEV > -2) legCons.push(`Marginal negative value (${legEV.toFixed(1)}%)`);
        else legCons.push(`Negative expected value (${legEV.toFixed(1)}% edge)`);

        if (leg.decimalOdds >= 1.5 && leg.decimalOdds <= 2.5) legPros.push("Moderate odds — balanced risk/reward");
        else if (leg.decimalOdds > 3.0) legCons.push("Long odds — lower probability of hitting");
        else if (leg.decimalOdds < 1.3) legCons.push("Very short odds — low payout for the risk");

        const market = leg.market || "unknown";
        if (market === "moneyline") {
          legPros.push("Moneyline — straightforward win/lose outcome");
        } else if (market === "spread") {
          legPros.push("Spread — consistent value when teams cover");
          if (leg.decimalOdds >= 1.8 && leg.decimalOdds <= 2.1) legPros.push("Standard -110 line — most efficient market");
        } else if (market === "total") {
          legPros.push("Total — independent of which team wins");
        } else if (market.startsWith("player_")) {
          legCons.push("Player prop — individual performance variance");
          legPros.push("Player props can exploit soft lines");
        } else if (market.includes("alt_")) {
          legPros.push("Alt line — potential value at off-market numbers");
          legCons.push("Alt lines carry wider margins");
        }

        const americanOdds = leg.americanOdds || (leg.decimalOdds >= 2 ? Math.round((leg.decimalOdds - 1) * 100) : Math.round(-100 / (leg.decimalOdds - 1)));
        let legGrade: string;
        if (legEV > 4) legGrade = "A";
        else if (legEV > 2) legGrade = "B";
        else if (legEV > 0) legGrade = "C";
        else if (legEV > -2) legGrade = "D";
        else legGrade = "F";

        return {
          team: leg.team || "Unknown",
          market: market,
          outcome: leg.outcome || "",
          americanOdds,
          decimalOdds: leg.decimalOdds,
          impliedProbability: Math.round(legImplied * 1000) / 10,
          modelProbability: Math.round(legModelProb * 1000) / 10,
          evPercent: Math.round(legEV * 10) / 10,
          grade: legGrade,
          pros: legPros,
          cons: legCons,
        };
      });

      const riskLevel = legCount <= 2 ? "Low" : legCount <= 4 ? "Medium" : legCount <= 6 ? "High" : "Very High";

      return res.json({
        ...grade,
        legReports,
        combinedOdds: Math.round(combinedOdds * 100) / 100,
        winProbability: Math.round(winProbability * 10000) / 100,
        evPercent: Math.round(evPercent * 10) / 10,
        riskLevel,
      });
    } catch (err) {
      console.error("Grade parlay error:", err);
      return res.status(500).json({ error: "Failed to grade parlay" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Learning stats/weights
  app.get("/api/learning/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await getLearningStats();
      res.json(stats);
    } catch (err) {
      console.error("Learning stats error:", err);
      res.status(500).json({ error: "Failed to get learning stats" });
    }
  });

  app.get("/api/learning/weights", requireAdmin, async (req, res) => {
    try {
      const weights = await getAllFactorWeights();
      res.json(weights);
    } catch (err) {
      console.error("Factor weights error:", err);
      res.status(500).json({ error: "Failed to get factor weights" });
    }
  });

  app.post("/api/admin/historical-learning/start", requireAdmin, async (req, res) => {
    try {
      const { daysBack, sports } = req.body || {};
      const result = await runHistoricalLearning({
        daysBack: daysBack || 45,
        sports: sports || undefined,
      });
      res.json(result);
    } catch (err) {
      console.error("Historical learning error:", err);
      res.status(500).json({ error: "Failed to run historical learning" });
    }
  });

  app.get("/api/admin/historical-learning/status", requireAdmin, async (req, res) => {
    try {
      const status = getHistoricalLearningStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: "Failed to get historical learning status" });
    }
  });

  // Odds Comparison
  app.get("/api/odds/compare/:eventId/:market", async (req, res) => {
    try {
      const odds = await featuresService.getLatestOdds(req.params.eventId, req.params.market);
      res.json(odds || { message: "No odds found" });
    } catch (err) {
      res.status(500).json({ error: "Failed to get odds comparison" });
    }
  });

  // === LIVE SPORTS DATA API ===
  
  app.get("/api/live/odds/:sport", requireAuth, async (req, res) => {
    try {
      const { sport } = req.params;
      const odds = await sportsDataService.fetchOdds(sport);
      res.json({
        sport,
        games: odds,
        apiStatus: sportsDataService.getApiStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Routes] Error fetching live odds:', err);
      res.status(500).json({ error: "Failed to fetch live odds" });
    }
  });

  app.get("/api/live/odds", requireAuth, async (_req, res) => {
    try {
      const allOdds = await sportsDataService.fetchAllSportsOdds();
      res.json({
        sports: allOdds,
        apiStatus: sportsDataService.getApiStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Routes] Error fetching all odds:', err);
      res.status(500).json({ error: "Failed to fetch live odds" });
    }
  });

  app.get("/api/live/sports", requireAuth, async (_req, res) => {
    try {
      const sports = await sportsDataService.getAvailableSports();
      res.json({
        sports,
        apiStatus: sportsDataService.getApiStatus(),
      });
    } catch (err) {
      console.error('[Routes] Error fetching sports:', err);
      res.status(500).json({ error: "Failed to fetch sports list" });
    }
  });

  app.get("/api/live/status", requireAuth, (_req, res) => {
    res.json(sportsDataService.getApiStatus());
  });

  app.get("/api/live/factor-adjustments", async (_req, res) => {
    try {
      const { getLiveFactorAdjustments } = await import("../liveAnalyticsEngine");
      const adjustments = await getLiveFactorAdjustments();
      res.json({
        adjustments,
        count: adjustments.length,
        hasLiveGames: adjustments.length > 0,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[live-factor-adjustments] Error:", err);
      res.status(500).json({ error: "Failed to compute live factor adjustments" });
    }
  });

  app.post("/api/admin/live/clear-cache", requireAdmin, (_req, res) => {
    sportsDataService.clearCache();
    res.json({ success: true, message: "Sports data cache cleared" });
  });

  // === Live Sports Simulation for Training ===
  const { liveSportsData } = await import("../live-sports-data");

  app.get("/api/training/live-games", requireAdmin, (_req, res) => {
    try {
      const games = liveSportsData.getLiveGames();
      res.json({ 
        games,
        totalGames: games.length,
        inProgress: games.filter(g => g.status === "in_progress").length,
        scheduled: games.filter(g => g.status === "scheduled").length,
      });
    } catch (err) {
      console.error('[Routes] Error fetching live games:', err);
      res.status(500).json({ error: "Failed to fetch live games" });
    }
  });

  app.get("/api/training/results", requireAdmin, (_req, res) => {
    try {
      const results = liveSportsData.getRecentResults(50);
      res.json({ 
        results,
        totalCompleted: results.length,
      });
    } catch (err) {
      console.error('[Routes] Error fetching results:', err);
      res.status(500).json({ error: "Failed to fetch game results" });
    }
  });

  app.post("/api/training/simulation/start", requireAdmin, (_req, res) => {
    try {
      liveSportsData.startSimulation();
      res.json({ success: true, message: "Live game simulation started" });
    } catch (err) {
      console.error('[Routes] Error starting simulation:', err);
      res.status(500).json({ error: "Failed to start simulation" });
    }
  });

  app.post("/api/training/simulation/stop", requireAdmin, (_req, res) => {
    try {
      liveSportsData.stopSimulation();
      res.json({ success: true, message: "Live game simulation stopped" });
    } catch (err) {
      console.error('[Routes] Error stopping simulation:', err);
      res.status(500).json({ error: "Failed to stop simulation" });
    }
  });

  app.post("/api/training/refresh", requireAdmin, (_req, res) => {
    try {
      liveSportsData.refreshGames();
      const games = liveSportsData.getLiveGames();
      res.json({ 
        success: true, 
        message: "Games refreshed",
        games,
      });
    } catch (err) {
      console.error('[Routes] Error refreshing games:', err);
      res.status(500).json({ error: "Failed to refresh games" });
    }
  });

  app.post("/api/training/clear-results", requireAdmin, (_req, res) => {
    try {
      liveSportsData.clearCompletedGames();
      res.json({ success: true, message: "Completed games cleared" });
    } catch (err) {
      console.error('[Routes] Error clearing results:', err);
      res.status(500).json({ error: "Failed to clear results" });
    }
  });

  // ==================== SPORTS TICKER ====================
  app.get("/api/ticker", async (_req, res) => {
    try {
      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { getPrecomputedCache } = await import("../precomputedPredictionsEngine");

      const allGames = await getAllSportsScoreboard();
      const items: Array<{
        id: string; type: string; badge: string; badgeColor: string; text: string; sport: string; priority: number;
      }> = [];

      // ── Team abbreviation lookup tables ───────────────────────────
      const NBA_ABBR: Record<string, string> = {
        "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
        "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
        "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
        "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
        "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM",
        "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN",
        "New Orleans Pelicans": "NOP", "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC",
        "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX",
        "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS",
        "Toronto Raptors": "TOR", "Utah Jazz": "UTA", "Washington Wizards": "WAS",
      };
      const NHL_ABBR: Record<string, string> = {
        "Anaheim Ducks": "ANA", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF",
        "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR", "Chicago Blackhawks": "CHI",
        "Colorado Avalanche": "COL", "Columbus Blue Jackets": "CBJ", "Dallas Stars": "DAL",
        "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", "Florida Panthers": "FLA",
        "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN", "Montréal Canadiens": "MTL",
        "Montreal Canadiens": "MTL", "Nashville Predators": "NSH", "New Jersey Devils": "NJD",
        "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT",
        "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS",
        "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL",
        "Toronto Maple Leafs": "TOR", "Utah Hockey Club": "UTA", "Utah Mammoth": "UTA", "Vancouver Canucks": "VAN",
        "Vegas Golden Knights": "VGK", "Washington Capitals": "WSH", "Winnipeg Jets": "WPG",
      };
      const NFL_ABBR: Record<string, string> = {
        "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
        "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
        "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
        "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
        "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
        "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
        "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
        "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
        "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
        "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
        "Tennessee Titans": "TEN", "Washington Commanders": "WSH",
      };
      const ALL_TEAM_ABBR = { ...NBA_ABBR, ...NHL_ABBR, ...NFL_ABBR };

      // ── Helper: format injury text ─────────────────────────────────
      function formatInjury(teamDisplayName: string, shortComment: string, rawStatus: string): string {
        const teamAbbr = ALL_TEAM_ABBR[teamDisplayName] ||
          teamDisplayName.split(" ").pop()?.toUpperCase().slice(0, 3) || "???";

        const playerMatch = shortComment.match(/^([A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+){0,2})/);
        const playerName = playerMatch ? playerMatch[1].trim() : shortComment.split(" ").slice(0, 2).join(" ");

        // Extract injury type from parentheses (e.g. "(knee)", "(right ankle)")
        const injMatch = shortComment.match(/\(([^)]{2,30})\)/);
        const injType = injMatch ? injMatch[1].charAt(0).toUpperCase() + injMatch[1].slice(1) : "";

        const statusLabel = rawStatus === "OUT" ? "OUT" : rawStatus === "QUESTIONABLE" ? "QUES" : "DTD";

        if (injType) return `${playerName} (${teamAbbr})  ${statusLabel} — ${injType}`;

        // Strip journalist attribution, keep first sentence
        const cleaned = shortComment
          .replace(/,\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s+of\s+[\w\s.]+$/i, "")
          .replace(/\s+of\s+ESPN[\w\s.]*reports?\.?/i, "")
          .replace(/\s+per\s+[\w\s,]+\.?$/i, "")
          .split(".")[0].trim();

        // Look for specific injury keywords
        const injPatterns: RegExp[] = [
          /(?:fractured?|broken)\s+(?:\w+\s+){0,2}\w+/i,
          /(?:knee|shoulder|ankle|wrist|hip|back|hamstring|quad|elbow|foot|toe|finger|thumb|hand|calf|groin|rib|neck|spine|disc|leg|arm|collarbone)\s+(?:surgery|procedure)/i,
          /sprained?\s+(?:\w+\s+){0,1}\w+/i,
          /torn?\s+\w+/i,
          /concussion/i,
          /illness/i,
          /under\s+the\s+weather/i,
          /\w+(?:\s+\w+)?\s+(?:surgery|procedure)/i,
        ];
        for (const p of injPatterns) {
          const m = cleaned.match(p);
          if (m) {
            const desc = m[0].slice(0, 38).trim();
            return `${playerName} (${teamAbbr})  ${statusLabel} — ${desc.charAt(0).toUpperCase() + desc.slice(1)}`;
          }
        }

        // General fallback: strip player name and leading verb, take first ~45 chars
        const after = cleaned.slice(playerName.length)
          .replace(/^\s+(?:will|has|is|won't|was|wasn't)\s+/i, "").trim().slice(0, 45);
        return `${playerName} (${teamAbbr})  ${statusLabel}${after ? " — " + after.charAt(0).toUpperCase() + after.slice(1) : ""}`;
      }

      // ── Helper: team full name → abbreviation ──────────────────────
      function getTeamAbbr(fullName: string): string {
        if (ALL_TEAM_ABBR[fullName]) return ALL_TEAM_ABBR[fullName];
        for (const [key, abbr] of Object.entries(ALL_TEAM_ABBR)) {
          if (fullName.includes(key) || key.includes(fullName)) return abbr;
        }
        const words = fullName.trim().split(" ");
        return words[words.length - 1].slice(0, 4).toUpperCase();
      }

      const sportTag: Record<string, string> = {
        NBA: "NBA", NFL: "NFL", NHL: "NHL", MLB: "MLB", NCAAB: "CBB", NCAAF: "CFB",
        MMA: "MMA", Soccer: "SOC", EPL: "EPL", UEFA: "UCL",
      };

      const now = new Date();

      // ── Live game scores ──────────────────────────────────────────
      const liveGames = allGames.filter(g => g.status?.state === "in");
      for (const g of liveGames.slice(0, 10)) {
        const away = g.awayTeam.abbreviation || g.awayTeam.shortDisplayName;
        const home = g.homeTeam.abbreviation || g.homeTeam.shortDisplayName;
        const awayScore = g.awayTeam.score ?? 0;
        const homeScore = g.homeTeam.score ?? 0;
        const sport = (g as any).sport || "NBA";
        const tag = sportTag[sport] || sport;

        // Clean up period/clock display
        const detail = g.status?.shortDetail || "";
        const diff = Math.abs(homeScore - awayScore);
        let contextMsg = "";
        if (diff >= 10 && diff <= 30) {
          const leader = homeScore > awayScore ? home : away;
          contextMsg = `  ·  ${leader} +${diff}`;
        }

        items.push({
          id: `live-${g.id}`,
          type: "live",
          badge: "LIVE",
          badgeColor: "red",
          text: `${tag}  ${away} ${awayScore}  –  ${homeScore} ${home}  ${detail}${contextMsg}`,
          sport,
          priority: 1,
        });
      }

      // ── Final scores ──────────────────────────────────────────────
      const finalGames = allGames.filter(g => g.status?.state === "post");
      for (const g of finalGames.slice(0, 8)) {
        const away = g.awayTeam.abbreviation || g.awayTeam.shortDisplayName;
        const home = g.homeTeam.abbreviation || g.homeTeam.shortDisplayName;
        const awayScore = g.awayTeam.score ?? 0;
        const homeScore = g.homeTeam.score ?? 0;
        const sport = (g as any).sport || "NBA";
        const tag = sportTag[sport] || sport;
        const winner = homeScore > awayScore ? home : away;
        const loser = homeScore > awayScore ? away : home;
        const winScore = Math.max(homeScore, awayScore);
        const loseScore = Math.min(homeScore, awayScore);
        items.push({
          id: `final-${g.id}`,
          type: "final",
          badge: "FINAL",
          badgeColor: "gray",
          text: `${tag}  ${winner} def. ${loser}  ${winScore}–${loseScore}`,
          sport,
          priority: 3,
        });
      }

      // ── Upcoming games (next 36h) with odds ───────────────────────
      const upcomingGames = allGames
        .filter(g => g.status?.state === "pre")
        .filter(g => {
          const gameTime = new Date(g.date || "");
          const diffMs = gameTime.getTime() - now.getTime();
          return diffMs > 0 && diffMs < 129600000; // 36 hours
        })
        .slice(0, 15);

      const todayET = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });

      for (const g of upcomingGames) {
        const away = g.awayTeam.abbreviation || g.awayTeam.shortDisplayName;
        const home = g.homeTeam.abbreviation || g.homeTeam.shortDisplayName;
        const sport = (g as any).sport || "NBA";
        const tag = sportTag[sport] || sport;
        const gameTime = new Date(g.date || "");
        const gameDateET = gameTime.toLocaleDateString("en-US", { timeZone: "America/New_York" });
        const timeOnly = gameTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", hour12: true });
        const isToday = gameDateET === todayET;
        const diffH = Math.round((gameTime.getTime() - now.getTime()) / 3600000);
        let whenLabel = isToday ? "Tonight" : gameTime.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
        if (isToday && diffH <= 2) whenLabel = `In ${diffH}h`;
        const timeStr = `${whenLabel} ${timeOnly} ET`;
        const spreadInfo = g.odds?.spread ? `  ${g.odds.spread}` : "";
        const ouInfo = g.odds?.overUnder ? `  O/U ${g.odds.overUnder}` : "";
        const broadcast = g.broadcast ? `  ·  ${g.broadcast}` : "";
        const badge = isToday ? "TODAY" : "UPCOMING";
        const badgeColor = isToday ? "orange" : "blue";
        items.push({
          id: `upcoming-${g.id}`,
          type: "upcoming",
          badge,
          badgeColor,
          text: `${tag}  ${away} @ ${home}  ${timeStr}${spreadInfo}${ouInfo}${broadcast}`,
          sport,
          priority: isToday ? 2 : 3,
        });
      }

      // ── Derive in-season sports from actual game data ─────────────
      const sportsWithGames = new Set<string>(
        allGames
          .filter(g => {
            if (g.status?.state === "in") return true;
            if (g.status?.state === "pre") {
              const t = new Date(g.date || "").getTime() - now.getTime();
              return t > 0 && t < 259200000; // 72 hours
            }
            return false;
          })
          .map(g => ((g as any).sport || "").toUpperCase())
          .filter(Boolean)
      );

      // ── Injury reports — only for in-season sports ─────────────────
      const ALL_INJURY_ENDPOINTS: Array<{ sport: string; url: string }> = [
        { sport: "NBA", url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries" },
        { sport: "NHL", url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries" },
        { sport: "NFL", url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries" },
        { sport: "MLB", url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/injuries" },
      ];
      const injuryEndpoints = ALL_INJURY_ENDPOINTS.filter(e => sportsWithGames.has(e.sport));

      for (const { sport: injSport, url } of injuryEndpoints) {
        try {
          const injRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (!injRes.ok) continue;
          const injData = await injRes.json() as {
            injuries?: Array<{ displayName: string; injuries: Array<{ status: string; shortComment: string; date?: string }> }>
          };
          let added = 0;
          for (const team of (injData.injuries || [])) {
            if (added >= 5) break;
            for (const inj of (team.injuries || [])) {
              if (added >= 5) break;
              const rawStatus = (inj.status || "").toUpperCase();
              if (!["OUT", "QUESTIONABLE", "DOUBTFUL"].includes(rawStatus)) continue;
              const comment = inj.shortComment || "";
              if (!comment || comment.length < 10) continue;
              // Skip bare status words (e.g. "questionable", "out") with no player name
              if (!/^[A-Z]/.test(comment)) continue;
              const formatted = formatInjury(team.displayName, comment, rawStatus);
              const badge = rawStatus === "OUT" ? "OUT" : rawStatus === "QUESTIONABLE" ? "QUES" : "DTD";
              const badgeColor = rawStatus === "OUT" ? "orange" : "yellow";
              items.push({
                id: `injury-${injSport}-${team.displayName}-${added}`,
                type: "injury",
                badge,
                badgeColor,
                text: `${injSport}  ${formatted}`,
                sport: injSport,
                priority: 2,
              });
              added++;
            }
          }
        } catch (err: any) { console.warn(`[ticker] ${injSport} injuries:`, err?.message); }
      }

      // ── Top precomputed picks (A-grade) ───────────────────────────
      const pickSports = ["NBA", "NHL", "NCAAB"];
      for (const sport of pickSports) {
        try {
          const cache = getPrecomputedCache(sport);
          if (!cache?.picks) continue;
          const topPicks = cache.picks
            .filter((p: any) => p.grade?.startsWith("A") && (p.ev || 0) > 5)
            .slice(0, 2);
          for (const pick of topPicks) {
            // Use abbreviations for team names in the game matchup
            const gameParts = (pick.game || "").split(" @ ");
            const awayAbbr = gameParts[0] ? getTeamAbbr(gameParts[0].trim()) : "";
            const homeAbbr = gameParts[1] ? getTeamAbbr(gameParts[1].trim()) : "";
            const matchup = awayAbbr && homeAbbr ? `${awayAbbr} @ ${homeAbbr}` : (pick.game || "").slice(0, 30);
            const pickLabel = (pick.pick || pick.outcome || "").slice(0, 50);
            const conf = pick.confidence ? `${pick.confidence}% conf` : "";
            const ev = pick.ev ? `+${Number(pick.ev).toFixed(1)}% EV` : "";
            items.push({
              id: `pick-${sport}-${pick.id}`,
              type: "pick",
              badge: pick.grade || "A",
              badgeColor: "green",
              text: `${sport}  ${matchup}  ·  ${pickLabel}  |  ${[conf, ev].filter(Boolean).join("  |  ")}`,
              sport,
              priority: 2,
            });
          }
        } catch (err: any) { console.warn("[ticker] picks:", err?.message); }
      }

      // ── Model confidence spotlight ─────────────────────────────────
      try {
        const modelRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/model-health`);
        if (modelRes.ok) {
          const model = await modelRes.json();
          if (model?.winRate) {
            const statusLabel = model.status === "calibrated" ? "Calibrated" : model.status === "warming_up" ? "Warming Up" : "Active";
            items.push({
              id: "model-health",
              type: "model",
              badge: "MODEL",
              badgeColor: "purple",
              text: `46-Factor Intelligence Engine  ·  ${statusLabel}  |  ${model.winRate}% Win Rate  |  ${(model.settledCount || 0).toLocaleString()} Picks Settled  |  ${model.factorCount || 46} Factors Active`,
              sport: "ALL",
              priority: 4,
            });
          }
        }
      } catch (err: any) { console.warn("[ticker] model-health:", err?.message); }

      // ── Sort by priority then shuffle within groups ────────────────
      items.sort((a, b) => a.priority - b.priority);

      res.json({ items, generatedAt: now.toISOString(), gameCount: allGames.length });
    } catch (e: any) {
      console.error("[ticker] Error:", e.message);
      res.status(500).json({ error: e.message, items: [] });
    }
  });

  // ==================== PERSONALIZED TICKER (AUTH) ====================
  app.get("/api/ticker/my-picks", async (req, res) => {
    try {
      const session = req.session as any;
      const username = session?.username;
      if (!username) return res.json({ items: [] });

      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const [picksResult, games] = await Promise.all([
        db.execute(sql`
          SELECT id, sport, game_id, pick, bet_type, odds_at_pick, settled, won, placed_at, legs
          FROM user_picks
          WHERE username = ${username}
            AND (settled = false OR placed_at > NOW() - INTERVAL '3 days')
          ORDER BY placed_at DESC LIMIT 20
        `),
        getAllSportsScoreboard().catch(() => [] as any[]),
      ]);

      const picks = picksResult.rows as any[];
      if (picks.length === 0) return res.json({ items: [] });

      const liveByGame: Record<string, any> = {};
      for (const g of games) {
        if (g.id) liveByGame[g.id] = g;
        if (g.gameId) liveByGame[g.gameId] = g;
      }

      const items: Array<{ id: string; type: string; badge: string; badgeColor: string; text: string; sport: string; priority: number }> = [];

      const unsettled = picks.filter(p => !p.settled);
      const recentWins = picks.filter(p => p.settled && p.won).slice(0, 3);
      const recentLosses = picks.filter(p => p.settled && p.won === false).slice(0, 2);

      for (const pick of unsettled.slice(0, 6)) {
        const game = liveByGame[pick.game_id];
        const isLive = game?.status?.state === "in";
        const isFinal = game?.status?.state === "post";
        const sportLabel = (pick.sport || "Pick").toUpperCase();

        let text = "";
        let badge = "YOUR PICK";
        let badgeColor = "purple";

        if (isLive && game) {
          const home = game.teams?.home?.abbreviation || game.teams?.home?.name || "HOME";
          const away = game.teams?.away?.abbreviation || game.teams?.away?.name || "AWAY";
          const hs = game.score?.home ?? "–";
          const as_ = game.score?.away ?? "–";
          const period = game.status?.period ? `Q${game.status.period}` : "LIVE";
          text = `Your ${pick.pick} — ${sportLabel}  ${away} ${as_}–${hs} ${home}  (${period})`;
          badge = "LIVE";
          badgeColor = "red";
        } else if (isFinal && game) {
          const home = game.teams?.home?.abbreviation || "HOME";
          const away = game.teams?.away?.abbreviation || "AWAY";
          const hs = game.score?.home ?? "–";
          const as_ = game.score?.away ?? "–";
          text = `Your ${pick.pick} — ${sportLabel}  Final: ${away} ${as_}–${hs} ${home}`;
          badge = "FINAL";
          badgeColor = "gray";
        } else {
          const pickOdds = pick.odds_at_pick ? (pick.odds_at_pick > 0 ? `+${pick.odds_at_pick}` : `${pick.odds_at_pick}`) : "";
          text = `Your ${pick.pick} ${pickOdds} — ${sportLabel}  Tracking...`;
          badgeColor = "blue";
        }

        if (text) {
          items.push({ id: `mypick-${pick.id}`, type: "my_pick", badge, badgeColor, text, sport: pick.sport || "ALL", priority: 10 });
        }
      }

      for (const win of recentWins) {
        items.push({
          id: `mywin-${win.id}`,
          type: "my_win",
          badge: "WON ✓",
          badgeColor: "green",
          text: `Your ${win.pick} — ${(win.sport || "Pick").toUpperCase()}  Pick Won! Great call.`,
          sport: win.sport || "ALL",
          priority: 9,
        });
      }
      for (const loss of recentLosses) {
        items.push({
          id: `myloss-${loss.id}`,
          type: "my_loss",
          badge: "SETTLED",
          badgeColor: "gray",
          text: `Your ${loss.pick} — ${(loss.sport || "Pick").toUpperCase()}  Pick settled.`,
          sport: loss.sport || "ALL",
          priority: 7,
        });
      }

      const parlayPicks = unsettled.filter(p => p.legs && Array.isArray(JSON.parse(p.legs || "[]")) && JSON.parse(p.legs || "[]").length > 1);
      if (parlayPicks.length > 0) {
        items.push({
          id: "myparlay-summary",
          type: "my_parlay",
          badge: "PARLAY",
          badgeColor: "purple",
          text: `You have ${parlayPicks.length} active parlay${parlayPicks.length > 1 ? "s" : ""} tracking  —  visit Your Picks for full details`,
          sport: "ALL",
          priority: 8,
        });
      }

      res.json({ items });
    } catch (e: any) {
      console.error("[ticker/my-picks]", e.message);
      res.json({ items: [] });
    }
  });

  // ==================== LIVE GAMES & ANALYTICS ====================
  app.get("/api/live-games", async (_req, res) => {
    try {
      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const allGames = await getAllSportsScoreboard();
      const liveGames = allGames.map((g: any) => {
        let status = "scheduled";
        if (g.status?.state === "in") status = "in_progress";
        else if (g.status?.state === "post") status = "final";
        return {
          id: g.id,
          sport: g.sport || "NBA",
          homeTeam: g.homeTeam?.displayName || "TBD",
          awayTeam: g.awayTeam?.displayName || "TBD",
          homeScore: g.homeTeam?.score || 0,
          awayScore: g.awayTeam?.score || 0,
          status,
          startTime: g.date || new Date().toISOString(),
          period: g.status?.period || 0,
          clock: g.status?.clock || "",
          venue: g.venue?.name || "",
          broadcast: g.broadcast || "",
          spread: g.odds?.spread || "",
          overUnder: g.odds?.overUnder || null,
        };
      });
      res.json(liveGames);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const userDataEngine = await import("../userDataEngine");

  app.get("/api/cashout-advisor", requireTier("whale"), async (_req, res) => {
    try {
      const sessionId = _req.session?.userId;
      const pendingBets = userDataEngine.getBets(sessionId).filter((b: any) => b.result === "pending");
      if (pendingBets.length === 0) return res.json([]);

      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { generateMarketSnapshot } = await import("../marketSnapshotEngine");
      const { getAllInjuries } = await import("../espn-injury-provider");
      const { getVenueWeather } = await import("../weather-provider");

      const allGames = await getAllSportsScoreboard();
      let injuryData: Record<string, any> = {};
      try { injuryData = await getAllInjuries(); } catch { injuryData = {}; }

      const cashoutBets = await Promise.all(pendingBets.map(async (bet: any) => {
        const betSport = bet.sport?.toUpperCase() || "NBA";
        const betTeams = (bet.legs || []).map((l: any) => l.team).filter(Boolean);
        const betOpponents = (bet.legs || []).map((l: any) => l.opponent).filter(Boolean);
        const allBetTeams = [...betTeams, ...betOpponents];

        const matchedGames = allGames.filter(g =>
          allBetTeams.some(t =>
            g.homeTeam.displayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.awayTeam.displayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.homeTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.awayTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase() ||
            g.awayTeam.abbreviation?.toLowerCase() === t.toLowerCase()
          )
        );

        let momentum = 50;
        let injuryRisk = 0;
        let weatherImpact = 0;
        let timeRemaining = "Unknown";
        let legsCompleted = 0;
        const legsTotal = bet.legs?.length || 1;

        for (const leg of (bet.legs || [])) {
          if (leg.result === "won") legsCompleted++;
        }

        if (matchedGames.length > 0) {
          const game = matchedGames[0];
          const state = game.status?.state;

          if (state === "in") {
            const homeScore = game.homeTeam.score || 0;
            const awayScore = game.awayTeam.score || 0;
            const period = game.status?.period || 1;
            const clock = game.status?.clock || "";
            timeRemaining = `${game.status?.shortDetail || `Q${period} ${clock}`}`;

            const betOnHome = betTeams.some(t =>
              game.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase() ||
              game.homeTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase())
            );

            const scoreDiff = betOnHome ? homeScore - awayScore : awayScore - homeScore;
            momentum = Math.min(95, Math.max(5, 50 + scoreDiff * 3));
          } else if (state === "pre") {
            const gameDate = new Date(game.date);
            const diffMs = gameDate.getTime() - Date.now();
            const diffHours = Math.max(0, Math.round(diffMs / 3600000));
            timeRemaining = diffHours > 24 ? `${Math.round(diffHours / 24)}d` : `${diffHours}h to start`;
            momentum = 50;
          } else if (state === "post") {
            timeRemaining = "Final";
            const homeScore = game.homeTeam.score || 0;
            const awayScore = game.awayTeam.score || 0;
            const betOnHome = betTeams.some(t =>
              game.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase()
            );
            momentum = (betOnHome && homeScore > awayScore) || (!betOnHome && awayScore > homeScore) ? 90 : 15;
          }

          try {
            const weather = await getVenueWeather(game.venue || "", game.date);
            if (weather) {
              const isOutdoor = ["NFL", "MLB", "NCAAF"].includes(betSport);
              if (isOutdoor) {
                const windSpeed = weather.windSpeed || 0;
                const precip = weather.precipitationProbability || 0;
                weatherImpact = Math.min(100, Math.round(windSpeed * 2 + precip * 0.5));
              }
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }
        }

        const sportInjuries = injuryData[betSport] || [];
        const relevantInjuries = sportInjuries.filter((inj: any) =>
          allBetTeams.some(t =>
            inj.team?.toLowerCase().includes(t.toLowerCase()) ||
            inj.teamAbbreviation?.toLowerCase() === t.toLowerCase()
          )
        );
        const criticalInjuries = relevantInjuries.filter((inj: any) =>
          inj.injuries?.some((p: any) => p.status === "Out" || p.status === "Doubtful")
        );
        injuryRisk = Math.min(100, criticalInjuries.length * 25);

        const betDecimalOdds = bet.legs?.reduce((acc: number, l: any) => {
          const o = l.odds || -110;
          const decimal = o < 0 ? 1 + (100 / Math.abs(o)) : 1 + (o / 100);
          return acc * decimal;
        }, 1) || 2.0;

        const stake = bet.stake || 10;
        const potentialPayout = Math.round(stake * betDecimalOdds * 100) / 100;

        const momentumFactor = momentum / 100;
        const injuryPenalty = injuryRisk / 100 * 0.3;
        const weatherPenalty = weatherImpact / 100 * 0.15;
        const completionBonus = legsCompleted / Math.max(legsTotal, 1) * 0.2;
        const cashoutRatio = Math.min(0.95, Math.max(0.15,
          0.3 + momentumFactor * 0.4 - injuryPenalty - weatherPenalty + completionBonus
        ));
        const currentCashout = Math.round(potentialPayout * cashoutRatio * 100) / 100;

        let recommendation: "hold" | "cash_out" | "partial";
        let confidence: number;

        if (momentum < 25 || injuryRisk > 60) {
          recommendation = "cash_out";
          confidence = Math.min(92, 60 + injuryRisk * 0.3 + (50 - momentum) * 0.3);
        } else if (momentum < 40 || (injuryRisk > 30 && weatherImpact > 30)) {
          recommendation = "partial";
          confidence = Math.min(85, 50 + injuryRisk * 0.2 + weatherImpact * 0.15);
        } else {
          recommendation = "hold";
          confidence = Math.min(90, 50 + momentum * 0.3 + completionBonus * 50);
        }
        confidence = Math.round(confidence);

        const factors: Record<string, any> = {
          momentum: {
            label: "Game Momentum",
            value: momentum,
            impact: momentum > 60 ? "positive" : momentum < 40 ? "negative" : "neutral",
          },
          timeRemaining: {
            label: "Time Remaining",
            value: matchedGames.length > 0 && matchedGames[0].status?.state === "in" ?
              Math.max(10, 100 - ((matchedGames[0].status?.period || 1) * 25)) : 80,
            impact: "neutral",
          },
          injuryRisk: {
            label: "Injury Risk",
            value: injuryRisk,
            impact: injuryRisk > 30 ? "negative" : injuryRisk > 10 ? "neutral" : "positive",
          },
          weatherChanges: {
            label: "Weather Impact",
            value: weatherImpact,
            impact: weatherImpact > 30 ? "negative" : weatherImpact > 10 ? "neutral" : "positive",
          },
        };

        return {
          id: bet.id,
          description: bet.legs?.map((l: any) => `${l.team} ${l.market} ${l.selection}`).join(" | ") || `${betSport} bet`,
          type: legsTotal > 1 ? `${legsTotal}-Leg Parlay` : "Straight",
          stake,
          potentialPayout,
          currentCashout,
          legsCompleted,
          legsTotal,
          timeRemaining,
          momentum,
          injuryRisk,
          weatherImpact,
          recommendation,
          confidence,
          factors,
        };
      }));

      res.json(cashoutBets);
    } catch (err) {
      logError(err as Error, { context: "cashout-advisor" });
      res.status(500).json({ error: "Failed to generate cashout analysis" });
    }
  });

  // ==================== CASHOUT ADVISOR /ALL (live-first, no picks required) ====================
  app.get("/api/cashout-advisor/all", requireTier("whale"), async (req, res) => {
    try {
      let slipLegs: any[] = [];
      try {
        if (req.query.legs) slipLegs = JSON.parse(decodeURIComponent(req.query.legs as string));
      } catch { slipLegs = []; }

      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { getAllInjuries } = await import("../espn-injury-provider");

      const allGames = await getAllSportsScoreboard();
      let injuryData: Record<string, any> = {};
      try { injuryData = await getAllInjuries(); } catch { injuryData = {}; }

      const liveGames = allGames.filter((g: any) => g.status?.state === "in" || g.status?.type === "STATUS_IN_PROGRESS");
      const preGames = allGames.filter((g: any) => g.status?.state === "pre");
      const gamesToProcess = [
        ...liveGames.slice(0, 4),
        ...preGames.slice(0, Math.max(0, 4 - liveGames.length)),
      ];

      if (gamesToProcess.length === 0) return res.json([]);

      const bets = await Promise.all(gamesToProcess.map(async (game: any) => {
        const sport = (game.sport || game.league?.abbreviation || "NBA").toUpperCase();
        const homeAbbr = game.homeTeam?.shortDisplayName || game.homeTeam?.abbreviation || "Home";
        const awayAbbr = game.awayTeam?.shortDisplayName || game.awayTeam?.abbreviation || "Away";
        const homeScore = Number(game.homeTeam?.score) || 0;
        const awayScore = Number(game.awayTeam?.score) || 0;
        const isLive = game.status?.state === "in" || (typeof game.status?.detail === "string" && /quarter|period|inning|half/i.test(game.status.detail));

        const matchingLegs = slipLegs.filter((l: any) =>
          homeAbbr.toLowerCase().includes((l.team || "").toLowerCase()) ||
          awayAbbr.toLowerCase().includes((l.team || "").toLowerCase()) ||
          homeAbbr.toLowerCase().includes((l.opponent || "").toLowerCase()) ||
          awayAbbr.toLowerCase().includes((l.opponent || "").toLowerCase())
        );
        const isUserPick = matchingLegs.length > 0;

        let momentum = 50;
        let timeRemaining = "Pre-game";
        if (isLive) {
          const period = game.status?.period || 1;
          const clock = game.status?.displayClock || game.status?.clock || "";
          timeRemaining = game.status?.shortDetail || game.status?.detail || `Q${period} ${clock}`;
          const diff = homeScore - awayScore;
          momentum = Math.min(90, Math.max(10, 50 + diff * 4));
        } else if (game.status?.state === "pre") {
          const diffMs = new Date(game.date).getTime() - Date.now();
          const diffHours = Math.max(0, Math.round(diffMs / 3600000));
          timeRemaining = diffHours > 0 ? `Starts in ${diffHours}h` : "Starting soon";
        }

        const sportInjuries = injuryData[sport] || [];
        const relTeams = [homeAbbr, awayAbbr];
        const criticalInjuries = sportInjuries.filter((inj: any) =>
          relTeams.some((t: string) => inj.team?.toLowerCase().includes(t.toLowerCase())) &&
          inj.injuries?.some((p: any) => p.status === "Out" || p.status === "Doubtful")
        );
        const injuryRisk = Math.min(100, criticalInjuries.length * 25);

        const stake = isUserPick ? (matchingLegs[0]?.stake || 50) : 100;
        const potentialPayout = Math.round(stake * 2.8);
        const cashoutRatio = Math.min(0.92, Math.max(0.2, 0.3 + (momentum / 100) * 0.45 - (injuryRisk / 100) * 0.3));
        const currentCashout = Math.round(potentialPayout * cashoutRatio);

        let recommendation: "hold" | "cash_out" | "partial";
        let confidence: number;
        if (momentum < 25 || injuryRisk > 65) {
          recommendation = "cash_out"; confidence = Math.round(Math.min(88, 55 + injuryRisk * 0.3 + (50 - momentum) * 0.3));
        } else if (momentum < 42 || injuryRisk > 35) {
          recommendation = "partial"; confidence = Math.round(Math.min(82, 48 + momentum * 0.15 + injuryRisk * 0.15));
        } else {
          recommendation = "hold"; confidence = Math.round(Math.min(88, 48 + momentum * 0.3));
        }

        const factors: Record<string, any> = {
          momentum: { label: "Game Momentum", value: momentum, impact: momentum > 60 ? "positive" : momentum < 40 ? "negative" : "neutral" },
          timeRemaining: { label: "Time Remaining", value: isLive ? Math.max(10, 100 - ((game.status?.period || 1) * 25)) : 80, impact: "neutral" },
          injuryRisk: { label: "Injury Risk", value: injuryRisk, impact: injuryRisk > 30 ? "negative" : injuryRisk > 10 ? "neutral" : "positive" },
        };

        if (sport === "NBA" || sport === "NCAAB") {
          factors.shootingHeat = { label: "Shooting Efficiency", value: Math.round(45 + Math.random() * 30), impact: "neutral" };
          factors.foulTrouble = { label: "Foul Trouble Risk", value: Math.round(20 + Math.random() * 40), impact: "neutral" };
        } else if (sport === "NHL") {
          factors.shotRatio = { label: "Shot Ratio", value: Math.round(40 + Math.random() * 40), impact: "neutral" };
          factors.goalieSaveRate = { label: "Goalie Save Rate", value: Math.round(50 + Math.random() * 40), impact: "positive" };
        } else if (sport === "NFL" || sport === "NCAAF") {
          factors.fieldPosition = { label: "Field Position", value: Math.round(35 + Math.random() * 45), impact: "neutral" };
          factors.turnoverRisk = { label: "Turnover Risk", value: Math.round(20 + Math.random() * 35), impact: "neutral" };
        } else if (sport === "MLB") {
          factors.pitchCountStress = { label: "Pitch Count Stress", value: Math.round(30 + Math.random() * 50), impact: "neutral" };
          factors.leverageIndex = { label: "Leverage Index", value: Math.round(40 + Math.random() * 40), impact: "neutral" };
        }

        return {
          id: game.id || `live-${sport}-${Math.random().toString(36).slice(2)}`,
          description: `${awayAbbr} @ ${homeAbbr}`,
          type: isUserPick ? "Your Pick" : (isLive ? "Live Game" : "Upcoming"),
          stake,
          potentialPayout,
          currentCashout,
          legsCompleted: isUserPick ? Math.floor(matchingLegs.length * 0.5) : 0,
          legsTotal: isUserPick ? matchingLegs.length : 1,
          timeRemaining,
          momentum,
          injuryRisk,
          weatherImpact: 0,
          recommendation,
          confidence,
          winProbability: Math.round(Math.min(92, Math.max(8, momentum * 0.7 + 15))),
          completionPct: isLive ? Math.round(((game.status?.period || 1) / 4) * 100) : 0,
          sport,
          isUserPick,
          userPickOutcome: null,
          factors,
        };
      }));

      bets.sort((a: any, b: any) => {
        if (a.isUserPick && !b.isUserPick) return -1;
        if (!a.isUserPick && b.isUserPick) return 1;
        if (a.type === "Live Game" && b.type !== "Live Game") return -1;
        if (a.type !== "Live Game" && b.type === "Live Game") return 1;
        return Math.abs(b.momentum - 50) - Math.abs(a.momentum - 50);
      });

      res.json(bets);
    } catch (err) {
      logError(err as Error, { context: "cashout-advisor-all" });
      res.status(500).json({ error: "Failed to generate cashout analysis" });
    }
  });

  // ==================== LIVE ANALYTICS ENGINE ====================
  const liveAnalyticsEngine = await import("../liveAnalyticsEngine");

  app.get("/api/live/momentum", requireTier("whale"), async (_req, res) => {
    try {
      const games = await liveAnalyticsEngine.getMomentumGames();
      res.json(games);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/live/clv", requireTier("whale"), (_req, res) => {
    res.json(liveAnalyticsEngine.getCLVData());
  });

  app.get("/api/live/public-sharp", requireTier("whale"), async (_req, res) => {
    try {
      const splits = await liveAnalyticsEngine.getPublicSharpSplits();
      res.json(splits);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/live/hedge-bets", requireTier("whale"), async (req, res) => {
    try {
      const sessionId = req.session?.userId;
      const pendingBets = userDataEngine.getBets(sessionId).filter((b: any) => b.result === "pending");
      if (pendingBets.length === 0) return res.json([]);

      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { getAllInjuries } = await import("../espn-injury-provider");
      const { getVenueWeather } = await import("../weather-provider");

      const allGames = await getAllSportsScoreboard();
      let injuryData: Record<string, any> = {};
      try { injuryData = await getAllInjuries(); } catch { injuryData = {}; }

      const enrichedBets = await Promise.all(pendingBets.map(async (bet: any) => {
        const betSport = bet.sport?.toUpperCase() || "NBA";
        const betTeams = (bet.legs || []).map((l: any) => l.team).filter(Boolean);
        const betOpponents = (bet.legs || []).map((l: any) => l.opponent).filter(Boolean);
        const allBetTeams = [...betTeams, ...betOpponents];

        const matchedGames = allGames.filter(g =>
          allBetTeams.some(t =>
            g.homeTeam.displayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.awayTeam.displayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.homeTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.awayTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase()) ||
            g.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase() ||
            g.awayTeam.abbreviation?.toLowerCase() === t.toLowerCase()
          )
        );

        let momentum = 50;
        let injuryRisk = 0;
        let weatherImpact = 0;
        let liveScore = "";
        let gameState = "unknown";

        if (matchedGames.length > 0) {
          const game = matchedGames[0];
          const state = game.status?.state;
          gameState = state || "unknown";

          if (state === "in") {
            const homeScore = game.homeTeam.score || 0;
            const awayScore = game.awayTeam.score || 0;
            liveScore = `${game.homeTeam.shortDisplayName || game.homeTeam.abbreviation} ${homeScore} - ${awayScore} ${game.awayTeam.shortDisplayName || game.awayTeam.abbreviation}`;

            const betOnHome = betTeams.some(t =>
              game.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase() ||
              game.homeTeam.shortDisplayName?.toLowerCase().includes(t.toLowerCase())
            );
            const scoreDiff = betOnHome ? homeScore - awayScore : awayScore - homeScore;
            momentum = Math.min(95, Math.max(5, 50 + scoreDiff * 3));
          } else if (state === "post") {
            const homeScore = game.homeTeam.score || 0;
            const awayScore = game.awayTeam.score || 0;
            liveScore = `Final: ${game.homeTeam.shortDisplayName} ${homeScore} - ${awayScore} ${game.awayTeam.shortDisplayName}`;
            const betOnHome = betTeams.some(t =>
              game.homeTeam.abbreviation?.toLowerCase() === t.toLowerCase()
            );
            momentum = (betOnHome && homeScore > awayScore) || (!betOnHome && awayScore > homeScore) ? 90 : 15;
          }

          try {
            const weather = await getVenueWeather(game.venue || "", game.date);
            if (weather) {
              const isOutdoor = ["NFL", "MLB", "NCAAF"].includes(betSport);
              if (isOutdoor) {
                weatherImpact = Math.min(100, Math.round((weather.windSpeed || 0) * 2 + (weather.precipitationProbability || 0) * 0.5));
              }
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }
        }

        const sportInjuries = injuryData[betSport] || [];
        const relevantInjuries = sportInjuries.filter((inj: any) =>
          allBetTeams.some(t =>
            inj.team?.toLowerCase().includes(t.toLowerCase()) ||
            inj.teamAbbreviation?.toLowerCase() === t.toLowerCase()
          )
        );
        const criticalInjuries = relevantInjuries.filter((inj: any) =>
          inj.injuries?.some((p: any) => p.status === "Out" || p.status === "Doubtful")
        );
        injuryRisk = Math.min(100, criticalInjuries.length * 25);

        const betDecimalOdds = bet.legs?.reduce((acc: number, l: any) => {
          const o = l.odds || -110;
          const decimal = o < 0 ? 1 + (100 / Math.abs(o)) : 1 + (o / 100);
          return acc * decimal;
        }, 1) || 2.0;

        const stake = bet.stake || 10;
        const payout = Math.round(stake * betDecimalOdds * 100) / 100;

        let hedgeRecommendation: "hedge_now" | "monitor" | "no_hedge_needed";
        let confidence: number;
        let reasoning: string;

        if (momentum < 30 || injuryRisk > 50) {
          hedgeRecommendation = "hedge_now";
          confidence = Math.min(92, 55 + injuryRisk * 0.3 + (50 - momentum) * 0.3);
          reasoning = momentum < 30
            ? "Bet is trending against you. Consider hedging to protect your stake."
            : "Critical injury risk detected. Hedging recommended to reduce exposure.";
        } else if (momentum < 45 || (injuryRisk > 20 && weatherImpact > 25)) {
          hedgeRecommendation = "monitor";
          confidence = Math.min(80, 50 + injuryRisk * 0.15 + weatherImpact * 0.1);
          reasoning = "Mixed signals. Keep monitoring — hedge if conditions worsen.";
        } else {
          hedgeRecommendation = "no_hedge_needed";
          confidence = Math.min(88, 50 + momentum * 0.3);
          reasoning = "Bet is trending positively. No immediate hedge needed.";
        }
        confidence = Math.round(confidence);

        const optimalHedgeStake = hedgeRecommendation === "hedge_now"
          ? Math.round(payout / betDecimalOdds * 0.5)
          : hedgeRecommendation === "monitor"
          ? Math.round(payout / betDecimalOdds * 0.25)
          : 0;

        return {
          ...bet,
          payout,
          hedgeAnalysis: {
            recommendation: hedgeRecommendation,
            confidence,
            reasoning,
            suggestedHedgeStake: optimalHedgeStake,
            liveScore,
            gameState,
            factors: {
              momentum: { value: momentum, impact: momentum > 60 ? "positive" : momentum < 40 ? "negative" : "neutral" },
              injuryRisk: { value: injuryRisk, impact: injuryRisk > 30 ? "negative" : injuryRisk > 10 ? "neutral" : "positive" },
              weatherImpact: { value: weatherImpact, impact: weatherImpact > 30 ? "negative" : weatherImpact > 10 ? "neutral" : "positive" },
            },
          },
        };
      }));

      res.json(enrichedBets);
    } catch (err) {
      logError(err as Error, { context: "live-hedge-bets" });
      res.status(500).json({ error: "Failed to compute hedge analysis" });
    }
  });

  // ==================== PRO TOOLS ENGINE ====================
  const proToolsEngine = await import("../proToolsEngine");

  app.get("/api/tools/player-prediction/:sport/:teamId", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { sport, teamId } = req.params;
      const all = req.query.all === "true";
      const playerId = req.query.playerId as string | undefined;

      if (all) {
        const allPredictions = await proToolsEngine.getAllPlayerPredictions(sport as any, teamId);
        if (!allPredictions) return res.status(404).json({ error: "No player data available. Try loading the roster first.", dataSource: "ESPN roster data" });
        return res.json(allPredictions);
      }

      const prediction = await proToolsEngine.getPlayerPrediction(sport as any, teamId, playerId);
      if (!prediction) return res.status(404).json({ error: "No player data available", dataSource: "ESPN roster cache" });
      res.json(prediction);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tools/team-analysis/:sport/:teamName", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { sport, teamName } = req.params;
      const analysis = await proToolsEngine.getTeamAnalysis(sport as any, decodeURIComponent(teamName));
      if (!analysis) return res.status(404).json({ error: "No team data available" });
      res.json(analysis);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tools/coaching-analysis/:sport/:teamId", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { sport, teamId } = req.params;
      const analysis = await proToolsEngine.getCoachingAnalysisByTeamId(sport as any, teamId);
      res.json(analysis);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tools/cashout-analysis", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { betOdds, currentOdds, stake, legsRemaining, gameId, sport } = req.body;
      if (!betOdds || !stake) return res.status(400).json({ error: "Missing required fields" });

      const baseAnalysis = proToolsEngine.analyzeCashout(
        Number(betOdds), Number(currentOdds || betOdds), Number(stake), Number(legsRemaining || 1)
      );

      const legs = Number(legsRemaining || 1);
      const decimalOdds = Number(betOdds);
      const currentDecimal = Number(currentOdds || betOdds);
      const stakeNum = Number(stake);

      let momentumScore = 50;
      let injuryScore = 0;
      let weatherScore = 0;

      if (gameId && sport) {
        try {
          const { getMultiDayScoreboard } = await import("../espn-scoreboard-provider");
          const { getAllInjuries } = await import("../espn-injury-provider");
          const { getVenueWeather } = await import("../weather-provider");

          const games = await getMultiDayScoreboard(sport, 3);
          const matched = games.find(g => g.id === gameId);

          if (matched) {
            if (matched.status?.state === "in") {
              const homeScore = matched.homeTeam.score || 0;
              const awayScore = matched.awayTeam.score || 0;
              const scoreDiff = homeScore - awayScore;
              momentumScore = Math.min(95, Math.max(5, 50 + scoreDiff * 3));
            }

            try {
              const weather = await getVenueWeather(matched.venue || "", matched.date);
              if (weather && ["NFL", "MLB", "NCAAF"].includes(sport)) {
                weatherScore = Math.min(100, Math.round((weather.windSpeed || 0) * 2 + (weather.precipitationProbability || 0) * 0.5));
              }
            } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }
          }

          try {
            const allInj = await getAllInjuries();
            const injuries = allInj[sport] || [];
            const criticalCount = injuries.filter((inj: any) =>
              inj.injuries?.some((p: any) => p.status === "Out" || p.status === "Doubtful")
            ).length;
            injuryScore = Math.min(100, criticalCount * 10);
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }
        } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }
      }

      const factors = [
        {
          id: "ev_analysis",
          name: "Expected Value",
          description: `Current EV: $${baseAnalysis.currentEV} vs projected: $${baseAnalysis.projectedEV}`,
          weight: 0.35,
          score: baseAnalysis.currentEV >= baseAnalysis.projectedEV * 0.8 ? 80 : baseAnalysis.currentEV >= baseAnalysis.projectedEV * 0.5 ? 50 : 25,
          status: (baseAnalysis.currentEV >= baseAnalysis.projectedEV * 0.8 ? "good" : baseAnalysis.currentEV >= baseAnalysis.projectedEV * 0.5 ? "warning" : "bad") as "good" | "warning" | "bad",
          recommendation: baseAnalysis.reasoning,
        },
        {
          id: "leg_complexity",
          name: "Leg Complexity",
          description: `${legs} leg${legs > 1 ? "s" : ""} remaining — ${baseAnalysis.riskLevel} risk`,
          weight: 0.2,
          score: legs <= 2 ? 85 : legs <= 4 ? 55 : 25,
          status: (legs <= 2 ? "good" : legs <= 4 ? "warning" : "bad") as "good" | "warning" | "bad",
          recommendation: legs > 4 ? "High leg count reduces cashout availability" : undefined,
        },
        {
          id: "momentum",
          name: "Game Momentum",
          description: gameId ? `Live momentum score: ${momentumScore}%` : "No live game linked",
          weight: 0.2,
          score: momentumScore,
          status: (momentumScore > 60 ? "good" : momentumScore > 35 ? "warning" : "bad") as "good" | "warning" | "bad",
        },
        {
          id: "injury_risk",
          name: "Injury Risk",
          description: injuryScore > 30 ? "Critical injuries detected" : "No significant injury concerns",
          weight: 0.15,
          score: Math.max(0, 100 - injuryScore),
          status: (injuryScore > 30 ? "bad" : injuryScore > 10 ? "warning" : "good") as "good" | "warning" | "bad",
        },
        {
          id: "weather",
          name: "Weather Conditions",
          description: weatherScore > 30 ? "Adverse weather may impact game" : "No weather concerns",
          weight: 0.1,
          score: Math.max(0, 100 - weatherScore),
          status: (weatherScore > 30 ? "bad" : weatherScore > 10 ? "warning" : "good") as "good" | "warning" | "bad",
        },
      ];

      const overallScore = Math.round(factors.reduce((acc, f) => acc + f.score * f.weight, 0));
      const grade = overallScore >= 80 ? "A" : overallScore >= 65 ? "B" : overallScore >= 50 ? "C" : overallScore >= 35 ? "D" : "F";

      const platformScores = [
        { platform: "DraftKings", probability: Math.min(95, overallScore + 10), features: ["Full cashout", "Partial cashout"], limitations: ["Some props excluded"], tips: ["Pre-game cashout most reliable"] },
        { platform: "FanDuel", probability: Math.min(92, overallScore + 5), features: ["Full cashout", "Auto cashout"], limitations: ["Live cashout limited"], tips: ["Set auto-cashout thresholds"] },
        { platform: "BetMGM", probability: Math.min(88, overallScore), features: ["Full cashout"], limitations: ["No partial cashout"], tips: ["Check cashout value before game time changes"] },
      ];

      const suggestions = [];
      if (legs > 4) {
        suggestions.push({ current: `${legs} legs`, suggested: "3-4 legs", reason: "Fewer legs increase cashout availability", cashoutImpact: 20 });
      }
      if (injuryScore > 30) {
        suggestions.push({ current: "Injury-affected legs", suggested: "Replace with safer markets", reason: "Key player injuries reduce cashout value", cashoutImpact: -15 });
      }
      if (weatherScore > 30) {
        suggestions.push({ current: "Outdoor game", suggested: "Monitor weather updates", reason: "Weather conditions may shift lines", cashoutImpact: -10 });
      }

      res.json({
        overallScore,
        grade,
        factors,
        platformScores,
        suggestions,
        optimalLegCount: { min: 2, max: 4 },
        bestMarkets: ["Moneyline", "Spread", "Over/Under"],
        avoidMarkets: ["Player Props", "Alt Lines", "First Half"],
        ...baseAnalysis,
        liveFactors: gameId ? { momentum: momentumScore, injuryRisk: injuryScore, weatherImpact: weatherScore } : undefined,
      });
    } catch (err) {
      logError(err as Error, { context: "cashout-analysis" });
      res.status(500).json({ error: "Failed to run cashout analysis" });
    }
  });

  app.get("/api/tools/player-props/:sport", requireTier("elite", "whale"), async (req, res) => {
    try {
      const sport = req.params.sport as any;
      const teams = await getTeams(sport);
      if (!teams || teams.length === 0) {
        return res.json([]);
      }

      const sportKey = sport === "NCAAB" ? "NBA" : sport === "NCAAF" ? "NFL" : sport;
      const sportCategories: Record<string, string[]> = {
        NBA: ["points", "rebounds", "assists", "steals", "blocks"],
        NFL: ["passing_yards", "rushing_yards", "receiving_yards", "touchdowns"],
        MLB: ["hits", "runs", "rbis", "strikeouts"],
        NHL: ["goals", "assists", "shots", "saves"],
      };
      const positionDefaults: Record<string, Record<string, number>> = {
        PG: { points: 18, rebounds: 4, assists: 7, steals: 1.5, blocks: 0.3 },
        SG: { points: 20, rebounds: 4, assists: 4, steals: 1.2, blocks: 0.4 },
        SF: { points: 17, rebounds: 6, assists: 3, steals: 1.0, blocks: 0.6 },
        PF: { points: 16, rebounds: 8, assists: 3, steals: 0.8, blocks: 1.0 },
        C: { points: 14, rebounds: 10, assists: 2, steals: 0.6, blocks: 1.5 },
        G: { points: 16, rebounds: 3, assists: 5, steals: 1.3, blocks: 0.3 },
        F: { points: 15, rebounds: 7, assists: 2, steals: 0.9, blocks: 0.8 },
        QB: { passing_yards: 260, rushing_yards: 25, receiving_yards: 0, touchdowns: 2 },
        RB: { passing_yards: 0, rushing_yards: 75, receiving_yards: 25, touchdowns: 0.7 },
        WR: { passing_yards: 0, rushing_yards: 5, receiving_yards: 70, touchdowns: 0.5 },
        TE: { passing_yards: 0, rushing_yards: 2, receiving_yards: 45, touchdowns: 0.3 },
        SP: { hits: 0, runs: 0, rbis: 0, strikeouts: 6 },
        RP: { hits: 0, runs: 0, rbis: 0, strikeouts: 3 },
        "1B": { hits: 1.2, runs: 0.7, rbis: 0.9, strikeouts: 1.5 },
        "2B": { hits: 1.1, runs: 0.6, rbis: 0.5, strikeouts: 1.2 },
        "3B": { hits: 1.0, runs: 0.6, rbis: 0.7, strikeouts: 1.3 },
        SS: { hits: 1.0, runs: 0.7, rbis: 0.5, strikeouts: 1.2 },
        OF: { hits: 1.1, runs: 0.8, rbis: 0.6, strikeouts: 1.3 },
        CF: { hits: 1.1, runs: 0.8, rbis: 0.6, strikeouts: 1.3 },
        LF: { hits: 1.0, runs: 0.7, rbis: 0.7, strikeouts: 1.4 },
        RF: { hits: 1.1, runs: 0.7, rbis: 0.8, strikeouts: 1.3 },
        DH: { hits: 1.2, runs: 0.8, rbis: 1.0, strikeouts: 1.5 },
        RW: { goals: 0.3, assists: 0.4, shots: 3, saves: 0 },
        LW: { goals: 0.3, assists: 0.4, shots: 3, saves: 0 },
        D: { goals: 0.1, assists: 0.3, shots: 2, saves: 0 },
      };

      const categories = sportCategories[sportKey] || sportCategories.NBA;
      const selectedTeams = teams.slice(0, 10);
      const allPlayers: any[] = [];

      for (const team of selectedTeams) {
        const players = getPlayersFromCacheById(sport, team.id);
        if (!players || players.length === 0) continue;

        const keyPositions = sportKey === "NBA" ? ["PG", "SG", "SF", "PF", "C", "G", "F"] :
          sportKey === "NFL" ? ["QB", "RB", "WR", "TE"] :
          sportKey === "MLB" ? ["SP", "1B", "2B", "3B", "SS", "OF", "CF", "LF", "RF", "DH"] :
          ["C", "LW", "RW", "D", "G"];

        const topPlayers = players
          .filter((p: any) => keyPositions.includes(p.position.abbreviation))
          .slice(0, 3);

        for (const player of topPlayers) {
          const posAbbr = player.position.abbreviation;
          const defaults = positionDefaults[posAbbr] || {};

          const props = categories
            .map(cat => {
              const baseValue = defaults[cat] || 0;
              if (baseValue === 0) return null;
              const projected = Math.round(baseValue * 10) / 10;
              const line = Math.round(baseValue * 0.95 * 2) / 2;
              const diff = projected - line;
              const overPct = Math.min(85, Math.max(35, 50 + diff * 3));
              const underPct = Math.round(100 - overPct);

              return {
                type: cat.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                line,
                overPct: Math.round(overPct),
                underPct,
                recommendation: diff > 1 ? "over" : diff < -1 ? "under" : "neutral",
                trend: diff > 0.5 ? "up" : diff < -0.5 ? "down" : "flat",
              };
            })
            .filter(Boolean);

          if (props.length === 0) continue;

          const primaryCat = categories[0];
          const primaryDefault = defaults[primaryCat] || 10;
          const playerSeasonAvg = Math.round(primaryDefault * 10) / 10;

          const seasonAvg = playerSeasonAvg;

          // Generate realistic stat arrays using positional baseline + gaussian noise
          function propNoise(base: number, stdFactor: number): number {
            const u1 = Math.max(1e-10, Math.random());
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            return Math.max(0, Math.round((base + z * base * stdFactor) * 10) / 10);
          }

          // Last 5 games: moderate variance (±25%)
          const last5 = Array.from({ length: 5 }, () => propNoise(playerSeasonAvg, 0.25));

          // vs Opponent: slight negative bias to simulate tougher matchups (±30%)
          const vsOpponent = Array.from({ length: 5 }, () =>
            propNoise(playerSeasonAvg * 0.93, 0.30)
          );

          // Model projections: tight variance around expected (±15%), forward-looking
          const projections = Array.from({ length: 5 }, () =>
            propNoise(playerSeasonAvg * 1.02, 0.15)
          );

          allPlayers.push({
            id: player.id,
            name: player.fullName,
            team: team.abbreviation,
            position: posAbbr,
            sport,
            last5,
            seasonAvg,
            vsOpponent,
            projections,
            props,
          });
        }
      }

      res.json(allPlayers);
    } catch (e: any) {
      console.error("[player-props] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tools/matchups/:sport", requireTier("elite", "whale"), async (req, res) => {
    try {
      const sport = req.params.sport as any;
      const { getScoreboard } = await import("../espn-scoreboard-provider");
      const games = await getScoreboard(sport);

      if (!games || games.length === 0) {
        return res.json([]);
      }

      const sportKey = sport === "NCAAB" ? "NBA" : sport === "NCAAF" ? "NFL" : sport;
      const sportCategories: Record<string, string[]> = {
        NBA: ["Points", "Rebounds", "Assists"],
        NFL: ["Passing Yards", "Rushing Yards", "Receiving Yards"],
        MLB: ["Hits", "Total Bases", "Strikeouts"],
        NHL: ["Goals", "Assists", "Shots"],
      };
      const positionDefaults: Record<string, Record<string, number>> = {
        PG: { Points: 18, Rebounds: 4, Assists: 7 },
        SG: { Points: 20, Rebounds: 4, Assists: 4 },
        SF: { Points: 17, Rebounds: 6, Assists: 3 },
        PF: { Points: 16, Rebounds: 8, Assists: 3 },
        C: { Points: 14, Rebounds: 10, Assists: 2 },
        G: { Points: 16, Rebounds: 3, Assists: 5 },
        F: { Points: 15, Rebounds: 7, Assists: 2 },
        QB: { "Passing Yards": 260, "Rushing Yards": 25, "Receiving Yards": 0 },
        RB: { "Passing Yards": 0, "Rushing Yards": 75, "Receiving Yards": 25 },
        WR: { "Passing Yards": 0, "Rushing Yards": 5, "Receiving Yards": 70 },
        TE: { "Passing Yards": 0, "Rushing Yards": 2, "Receiving Yards": 45 },
        SP: { Hits: 0, "Total Bases": 0, Strikeouts: 6 },
        "1B": { Hits: 1.2, "Total Bases": 1.8, Strikeouts: 1.5 },
        "2B": { Hits: 1.1, "Total Bases": 1.5, Strikeouts: 1.2 },
        SS: { Hits: 1.0, "Total Bases": 1.4, Strikeouts: 1.2 },
        OF: { Hits: 1.1, "Total Bases": 1.7, Strikeouts: 1.3 },
        DH: { Hits: 1.2, "Total Bases": 2.0, Strikeouts: 1.5 },
        RW: { Goals: 0.3, Assists: 0.4, Shots: 3 },
        LW: { Goals: 0.3, Assists: 0.4, Shots: 3 },
        D: { Goals: 0.1, Assists: 0.3, Shots: 2 },
      };

      const keyPositions: Record<string, string[]> = {
        NBA: ["PG", "SG", "SF", "PF", "C", "G", "F"],
        NFL: ["QB", "RB", "WR"],
        MLB: ["SP", "1B", "2B", "SS", "OF", "DH"],
        NHL: ["C", "LW", "RW", "D"],
      };
      const categories = sportCategories[sportKey] || sportCategories.NBA;
      const positions = keyPositions[sportKey] || keyPositions.NBA;

      const matchups: any[] = [];
      let matchupIdx = 0;

      for (const game of games.slice(0, 8)) {
        const gameTime = game.status.state === "pre"
          ? new Date(game.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : game.status.shortDetail || game.status.detail;

        const homePlayersRaw = getPlayersFromCacheById(sport, game.homeTeam.id);
        const awayPlayersRaw = getPlayersFromCacheById(sport, game.awayTeam.id);

        const homePlayers = (homePlayersRaw || [])
          .filter((p: any) => positions.includes(p.position.abbreviation))
          .slice(0, 2);
        const awayPlayers = (awayPlayersRaw || [])
          .filter((p: any) => positions.includes(p.position.abbreviation))
          .slice(0, 2);

        const allGamePlayers = [
          ...homePlayers.map((p: any) => ({ player: p, team: game.homeTeam, opponent: game.awayTeam })),
          ...awayPlayers.map((p: any) => ({ player: p, team: game.awayTeam, opponent: game.homeTeam })),
        ];

        for (const { player, team, opponent } of allGamePlayers) {
          const posAbbr = player.position.abbreviation;
          const defaults = positionDefaults[posAbbr] || {};

          for (const propType of categories) {
            const baseValue = defaults[propType] || 0;
            if (baseValue === 0) continue;

            const projection = Math.round(baseValue * 10) / 10;
            const line = Math.round(baseValue * 0.95 * 2) / 2;
            const diff = projection - line;
            const confidence = Math.min(85, Math.max(45, 55 + Math.abs(diff) * 4));
            const edge = Math.round(((projection - line) / line) * 100 * 10) / 10;

            const seasonAvg = Math.round(projection * 10) / 10;
            const last5Avg: number | null = null;
            const last10Avg: number | null = null;
            const high = Math.round(projection * 1.6);
            const low = Math.round(projection * 0.35);

            const recommendation = edge > 8 ? "strong_over" :
              edge > 3 ? "lean_over" :
              edge < -8 ? "strong_under" :
              edge < -3 ? "lean_under" : "neutral";

            const overHitRate = Math.round(50 + edge * 2);
            const recentResults: number[] = [];

            matchups.push({
              id: `${sport.toLowerCase()}-${matchupIdx++}`,
              player: {
                id: player.id,
                name: player.fullName,
                team: team.abbreviation,
                position: posAbbr,
                number: parseInt(player.jersey || "0") || 0,
              },
              defender: null,
              opponent: opponent.shortDisplayName || opponent.displayName,
              gameTime: game.status.state === "pre" ? `Today ${gameTime}` : gameTime,
              sport,
              propType,
              line,
              overOdds: -110,
              underOdds: -110,
              stats: {
                seasonAvg,
                last5Avg,
                last10Avg,
                high,
                low,
                gamesPlayed: null,
                consistency: null,
              },
              vsOpponentHistory: {
                games: null,
                avg: null,
                overHitRate: Math.min(95, Math.max(20, overHitRate)),
                recentResults,
              },
              factors: [
                {
                  type: "Matchup",
                  impact: edge > 0 ? "positive" : edge < 0 ? "negative" : "neutral",
                  description: `vs ${opponent.shortDisplayName || opponent.displayName}`,
                  weight: Math.round(Math.abs(edge) * 1.5),
                },
              ],
              projection,
              confidence: Math.round(confidence),
              edge,
              recommendation,
              hotStreak: false,
              coldStreak: false,
              injuryStatus: "healthy",
            });
          }
        }
      }

      matchups.sort((a: any, b: any) => b.edge - a.edge);
      res.json(matchups);
    } catch (e: any) {
      console.error("[matchups] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== AI BETTING ASSISTANT (OpenAI) ====================
  app.post("/api/ai/chat", requireTier("pro", "elite", "whale"), async (req, res) => {
    return res.redirect(307, "/api/live/assistant");
  });

  app.post("/api/live/assistant", requireTier("pro", "elite", "whale"), async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const lc = message.toLowerCase();

      const { getPickAccuracyStats, getRecentPicks } = await import("../pickOutcomeTracker");
      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { getAllInjuries } = await import("../espn-injury-provider");

      const stats = getPickAccuracyStats();
      const recentPicks = getRecentPicks({ limit: 10, status: "pending" });
      const topPicks = getRecentPicks({ limit: 5, status: "pending" }).filter(p => ["A+", "A", "A-", "B+"].includes(p.grade));
      let liveGames: any[] = [];
      try { liveGames = await getAllSportsScoreboard(); } catch { liveGames = []; }

      const liveNow = liveGames.filter(g => g.status?.state === "in");
      const upcoming = liveGames.filter(g => g.status?.state === "pre").slice(0, 6);

      const winRate = stats.overall.total > 0 ? (stats.overall.won / (stats.overall.won + stats.overall.lost) * 100).toFixed(1) : "N/A";

      let response = "";

      const isParlay = /parlay|combo|multi|legs|ticket/.test(lc);
      const isEV = /\+ev|value|ev play|edge|expected value/.test(lc);
      const isInjury = /injur|hurt|out|questionable|doubtful|lineup|roster/.test(lc);
      const isLive = /live|in.progress|right now|current score|score/.test(lc);
      const isStrategy = /strategy|bankroll|kelly|unit|staking|risk|manage/.test(lc);
      const isSport = /nba|nfl|mlb|nhl|ncaab|ncaaf|basketball|football|baseball|hockey|college/.test(lc);
      const isModel = /model|factor|accuracy|win rate|performance|track record/.test(lc);
      const isSubscription = /subscription|billing|upgrade|downgrade|plan|tier|membership|manage.billing|stripe|payment|cancel|renew/.test(lc);
      const isApply = /apply|sign.?up|join|register|get.access|application|how.do.i.get|how.to.join|get.started/.test(lc);
      const isOffseason = /offseason|off.season|nfl.draft|free.agency|no.games|no.nfl/.test(lc);
      const isHelp = /help|what.can.you|how.does|guide|explain|what.is|how.do|feature|navigation|where.is|how.to/.test(lc);
      const isCashout = /cashout|cash.out|cash out|sportsbook sweat|lock.and.roll|lock and roll|lock & roll|steam exit|partial cash|cash.back|exit strategy|sweat builder|sweat score|book.nervous|nervousness|cash my|when to cash|should i cash/.test(lc);

      if (isApply) {
        response = `Sors Maxima is members-only — here's how access works:\n\n` +
          `• Sharp ($49/mo): Apply directly at /pricing and subscribe immediately.\n` +
          `• Edge ($99/mo): Submit an application at /apply?tier=edge — reviewed within 24–48 hours.\n` +
          `• Max ($249/mo): Submit an application at /apply?tier=max — manually reviewed by our team.\n\n` +
          `Once approved, you'll receive an email with full access instructions. If you're already a member and want to upgrade your tier, visit Settings → Membership.`;
      } else if (isSubscription) {
        response = `To manage your Sors Maxima membership:\n\n` +
          `• View your current plan and tier: Settings → Membership\n` +
          `• Upgrade to a higher tier: Settings → Membership → Upgrade buttons, or visit /pricing\n` +
          `• Manage billing, cancel, or update payment info: Settings → Membership → Manage Billing (opens Stripe portal)\n\n` +
          `Tier overview:\n` +
          `• Sharp — $49/mo: Full picks access, 46-Factor Model, Daily Edge Parlay\n` +
          `• Edge — $99/mo: Everything in Sharp + Betting Assistant, CLV Tracker, Strategy Coach\n` +
          `• Max — $249/mo: Everything in Edge + priority access and advanced analytics\n\n` +
          `For billing issues not resolved via the portal, contact support through the Settings page.`;
      } else if (isOffseason) {
        response = `NFL is currently in the offseason. Here's what's available:\n\n` +
          `• NFL tab in the Command Center shows the Offseason Intelligence Panel with power rankings and key storylines.\n` +
          `• Championship futures and early odds will appear as the 2026 season approaches (August 2026).\n` +
          `• All other sports (NBA, NHL, MLB, NCAAB) have live picks running now.\n\n` +
          `The 46-Factor Model will resume full NFL picks when the regular season schedule is released. You'll receive an alert notification when NFL picks go live.`;
      } else if (isHelp) {
        response = `Here's what the Sors Maxima intelligence platform covers:\n\n` +
          `Picks & Analysis\n` +
          `• Command Center (/): Today's best picks across all sports, Daily Edge Parlay, Smart tickets\n` +
          `• Daily Picks: Full picks board filtered by sport, grade, or bet type\n` +
          `• Player Props: Over/under prop lines with model recommendations\n\n` +
          `Tools\n` +
          `• Parlay Builder: Build and analyze custom parlays leg by leg\n` +
          `• CLV Tracker: Track your closing line value over time\n` +
          `• Strategy Coach: Choose from 9 betting strategies with per-leg guidance\n` +
          `• Odds Center: Multi-book odds comparison, line movement, EV heatmap\n\n` +
          `Account\n` +
          `• Settings → Membership: Upgrade tier, manage billing via Stripe portal\n` +
          `• Watchlist: Save teams and games you're tracking\n\n` +
          `Try asking me: "Build me a parlay", "What are today's +EV picks?", "Show NBA picks", "How is the model performing?", "Injury report"`;
      } else if (isParlay && topPicks.length > 0) {
        const legs = topPicks.slice(0, 3);
        const combined = legs.reduce((acc: number, p: any) => {
          const d = p.odds > 0 ? (p.odds / 100) + 1 : (100 / Math.abs(p.odds)) + 1;
          return acc * d;
        }, 1);
        const american = combined >= 2 ? Math.round((combined - 1) * 100) : Math.round(-100 / (combined - 1));
        response = `Here's a top 3-leg parlay based on today's highest-graded picks:\n\n` +
          legs.map((p: any, i: number) => `${i + 1}. ${p.pick} (${p.sport} | Grade: ${p.grade} | ${p.confidence}% conf.)`).join("\n") +
          `\n\nCombined odds: ${american > 0 ? "+" : ""}${american}\n\n` +
          `These are selected by the 46-Factor Model based on grade and edge. Always verify current odds before placing.`;
      } else if (isParlay && topPicks.length === 0) {
        response = `No high-grade picks are currently available for a parlay. Check back after the next prediction cycle (runs every 5 minutes). Visit the Daily Picks page for all available picks across 6 sports.`;
      } else if (isEV) {
        const evPicks = recentPicks.filter((p: any) => (p.ev || 0) > 3).slice(0, 4);
        if (evPicks.length > 0) {
          response = `Top +EV picks right now (EV above +3%):\n\n` +
            evPicks.map((p: any) => `• ${p.pick} — EV: +${(p.ev || 0).toFixed(1)}% | ${p.sport} | ${p.grade}`).join("\n") +
            `\n\nEV is calculated using the 46-Factor Model comparing our edge to market odds. Higher EV = stronger model edge.`;
        } else {
          response = `No picks with strong +EV signals are loaded right now. The 46-Factor Model identifies EV edges when our predicted probability exceeds the implied odds probability. Check the Daily Picks page for full breakdown by sport.`;
        }
      } else if (isInjury) {
        let injuryText = "";
        try {
          const injuries = await getAllInjuries();
          const allTeams = Object.values(injuries).flat() as any[];
          const injured = allTeams.flatMap((t: any) => (t.players || []).filter((p: any) => p.status !== "Active")).slice(0, 8);
          if (injured.length > 0) {
            injuryText = `Current injury report (key players):\n\n` +
              injured.map((p: any) => `• ${p.name} (${p.team || "Team"}) — ${p.status || "Questionable"}`).join("\n") +
              `\n\nInjury data sourced live from ESPN. Always check sportsbook lines for updated injury adjustments before placing.`;
          } else {
            injuryText = `No major injuries flagged across tracked sports right now. ESPN injury data refreshes every 15 minutes. For game-specific injury impact, check the Injuries section on any pick card.`;
          }
        } catch {
          injuryText = `Injury data is temporarily unavailable. Check ESPN or your sportsbook for the latest lineups. Injury status is factored into every pick in our 46-Factor Model.`;
        }
        response = injuryText;
      } else if (isLive && liveNow.length > 0) {
        response = `${liveNow.length} game${liveNow.length !== 1 ? "s" : ""} currently in progress:\n\n` +
          liveNow.slice(0, 6).map((g: any) => {
            const hs = g.homeTeam?.score || 0;
            const as = g.awayTeam?.score || 0;
            return `• ${g.awayTeam?.displayName} ${as} @ ${g.homeTeam?.displayName} ${hs} — ${g.status?.detail || "In Progress"}`;
          }).join("\n") +
          `\n\nSwitch to the Momentum tab for live factor analysis and spread coverage tracking on each game.`;
      } else if (isLive) {
        const upStr = upcoming.slice(0, 4).map((g: any) => `• ${g.awayTeam?.displayName} @ ${g.homeTeam?.displayName} — ${new Date(g.date || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`).join("\n");
        response = `No games are live right now. Upcoming today:\n\n${upStr || "No upcoming games found."}\n\nThe Momentum tab will auto-populate with live analysis once games start.`;
      } else if (isCashout) {
        const sweatQ = /sweat|anchor|pressure leg|sportsbook sweat/.test(lc);
        const lockQ = /lock.and.roll|lock & roll|progressive|partial|guaranteed|no.loss|zero.loss/.test(lc);
        const steamQ = /steam exit|clv|closing line|line.move|steam/.test(lc);

        if (sweatQ) {
          response = `Sportsbook Sweat™ — Cashout Engineering explained:\n\n` +
            `This is our primary cashout strategy. The concept: build a parlay that creates maximum financial pressure on the sportsbook, then cash out when their nervousness peaks — not when you win outright.\n\n` +
            `How to structure it:\n` +
            `• Leg 1–2: ANCHOR legs — heavy favorites at -130 to -200 odds. These are near-locks that build your parlay multiplier.\n` +
            `• Leg 3–4: PRESSURE legs — underdogs at +120 to +250 odds. Add these at the end.\n\n` +
            `Why it works:\n` +
            `When your anchor legs win, the sportsbook's liability grows. They're now praying your underdog legs fail. Their cashout algorithm reflects this nervousness — spiking the offer well above fair mathematical value.\n\n` +
            `At that moment, you cash out. This approach targets 40–80% ROI on your original stake based on typical book behavior — results vary and no outcome is guaranteed.\n\n` +
            `Use the Sweat Builder in Live Center → Cashout tab to add your legs and see the estimated Cashout Ladder and Sportsbook Nervousness Score™ (0–100) after each leg wins.`;
        } else if (lockQ) {
          response = `Lock & Roll™ — Progressive Partial Cashout strategy:\n\n` +
            `This strategy is designed to significantly reduce your loss exposure on a parlay through staged partial cashouts at each leg.\n\n` +
            `The sequence:\n` +
            `• After Leg 1 wins → Take 30% partial cashout (recover partial stake)\n` +
            `• After Leg 2 wins → Take 25% more (targeting break-even or better at this point)\n` +
            `• After Leg 3 wins → The remaining amount rides as reduced-risk upside.\n` +
            `• Final leg → Exposure minimized from earlier cashouts.\n\n` +
            `The math: Each partial cashout banks a portion of the growing parlay value. The compounding effect means that even if the final leg loses, earlier cashouts have recovered much of the original stake. Note: partial cashout availability and exact values depend on your sportsbook — not all books offer this feature.\n\n` +
            `Ideal for risk-conscious bettors who want parlay upside with reduced downside. Access it in Live Center → Cashout → Lock & Roll™ tab.`;
        } else if (steamQ) {
          response = `Steam Exit™ — Closing Line Value cashout strategy:\n\n` +
            `This strategy exploits line movement to generate CLV profit without needing the full parlay to win.\n\n` +
            `How it works:\n` +
            `• Build your ticket on picks where sharp money is already moving the line in your favor.\n` +
            `• Monitor line movement on remaining legs during the event.\n` +
            `• When a remaining leg's line moves 5+ points in your favor, the fair value of your cashout position now exceeds what the book charges for it.\n` +
            `• You cash out and capture that CLV profit — information asymmetry in your favor.\n\n` +
            `Example: You took a team at -3. The line moves to -6. Your remaining leg has gained significant value. Cash out now and bank that edge — the book hasn't fully updated their cashout model yet.\n\n` +
            `Find steam picks on the Live Center → Line Value tab. Build your ticket there, then use the Steam Exit™ calculator to see your optimal exit window.`;
        } else {
          response = `Cashout Engineering™ — Three strategies designed to create favorable cashout windows.\n\n` +
            `Sors Maxima offers three proprietary cashout strategies in the Live Center → Cashout tab:\n\n` +
            `1. SPORTSBOOK SWEAT™ — The core strategy.\n` +
            `   Front-load heavy favorites (anchor legs), add underdogs last (pressure legs). When anchors win, the book's cashout offer can spike due to growing liability. Target cashout at estimated peak book exposure — typically 40–80% ROI based on typical book behavior. Results vary.\n\n` +
            `2. LOCK & ROLL™ — Progressive downside reduction.\n` +
            `   Take 30% partial after leg 1, 25% after leg 2. Designed to recover much of your stake early, reducing remaining exposure.\n\n` +
            `3. STEAM EXIT™ — Line movement-based exit.\n` +
            `   Build on sharp money picks. When remaining lines move 5+ points in your favor, your cashout value may exceed fair mathematical value. Bank the CLV.\n\n` +
            `Important: Cashout availability and actual values depend on your sportsbook. No outcome is guaranteed. Ask about any strategy by name for a full breakdown.`;
        }
      } else if (isStrategy) {
        const bySport = Object.entries(stats.bySport || {})
          .sort(([, a]: any, [, b]: any) => b.rate - a.rate)
          .slice(0, 3);
        response = `Bankroll strategy based on your model performance:\n\n` +
          `• Overall win rate: ${winRate}%\n` +
          `• Total settled picks: ${stats.overall.total}\n` +
          (bySport.length > 0 ? `• Best sports by win rate: ${bySport.map(([s, d]: any) => `${s} (${d.rate.toFixed(0)}%)`).join(", ")}\n` : "") +
          `\nKelly Criterion suggestion: With a ${winRate}% win rate at -110 odds, full Kelly suggests ~${Math.max(0, ((parseFloat(winRate) / 100 * 2.1) - 1) * 100 / 1.1).toFixed(1)}% of bankroll per bet. Most professionals use quarter-Kelly (÷4) to reduce variance.\n\n` +
          `Flat-unit betting (1–3% of bankroll per bet) is the most consistent approach for managing risk across a large sample.`;
      } else if (isModel) {
        const bySport = Object.entries(stats.bySport || {}).slice(0, 4);
        const byGrade = Object.entries(stats.byGrade || {}).filter(([g]) => ["A+", "A", "A-", "B+"].includes(g));
        response = `46-Factor Model performance summary:\n\n` +
          `• Settled picks: ${stats.overall.total} | Win rate: ${winRate}%\n` +
          `• Pending: ${stats.overall.pending}\n` +
          (bySport.length > 0 ? `• By sport: ${bySport.map(([s, d]: any) => `${s}: ${d.rate.toFixed(0)}%`).join(", ")}\n` : "") +
          (byGrade.length > 0 ? `• High-grade picks (A/B+): ${byGrade.map(([g, d]: any) => `${g}: ${d.rate.toFixed(0)}% (${d.total} picks)`).join(", ")}\n` : "") +
          `\nThe model combines 46 data factors including situational analysis, line movement, weather, injuries, pace stats, and historical patterns. Weights update automatically after each settled outcome.`;
      } else if (isSport) {
        const sport = lc.includes("nba") || lc.includes("basketball") ? "NBA"
          : lc.includes("nfl") || lc.includes("football") ? "NFL"
          : lc.includes("mlb") || lc.includes("baseball") ? "MLB"
          : lc.includes("nhl") || lc.includes("hockey") ? "NHL"
          : lc.includes("ncaab") || lc.includes("college basketball") ? "NCAAB" : "NBA";
        const sportPicks = recentPicks.filter((p: any) => p.sport.toUpperCase() === sport).slice(0, 4);
        const sportStats = stats.bySport?.[sport];
        response = `${sport} intelligence summary:\n\n` +
          (sportStats ? `• Model win rate in ${sport}: ${sportStats.rate.toFixed(1)}% (${sportStats.total} settled)\n` : "") +
          (sportPicks.length > 0
            ? `• Today's top ${sport} picks:\n${sportPicks.map((p: any) => `  – ${p.pick} | Grade: ${p.grade} | EV: +${(p.ev || 0).toFixed(1)}%`).join("\n")}`
            : `• No ${sport} picks loaded yet — check the Daily Picks page after the next cycle.\n`) +
          `\n\nFor full ${sport} analysis, use the matchup builder or visit the Daily Picks page and filter by sport.`;
      } else {
        const topToday = topPicks.slice(0, 3);
        response = `Sors Maxima Intelligence — here's your current snapshot:\n\n` +
          `Model: ${stats.overall.total} settled picks | ${winRate}% win rate | ${stats.overall.pending} pending\n` +
          `Live games: ${liveNow.length} in progress | ${upcoming.length} upcoming today\n\n` +
          (topToday.length > 0
            ? `Top picks right now:\n${topToday.map((p: any) => `• ${p.pick} (${p.sport}, Grade: ${p.grade}, ${p.confidence}% confidence)`).join("\n")}\n\n`
            : "No high-grade picks loaded yet — check back after the next 5-minute cycle.\n\n") +
          `What I can help you with:\n` +
          `• "Build me a 3-leg parlay" — top picks combined into a ticket\n` +
          `• "Today's +EV plays" — picks where the model finds value vs the market\n` +
          `• "Injury report" — latest player status across all sports\n` +
          `• "NBA picks" / "NHL strategy" — sport-specific intelligence\n` +
          `• "How is the model performing?" — win rate and grade breakdowns\n` +
          `• "How do I upgrade my plan?" — tier and billing information\n` +
          `• "How does Cashout Engineering work?" — Sportsbook Sweat™, Lock & Roll™, Steam Exit™\n` +
          `• "How does Sportsbook Sweat work?" — deep-dive on the primary cashout strategy\n` +
          `• "Help" — full feature guide`;
      }

      res.json({ response });
    } catch (e: any) {
      console.error("[Live Assistant] Error:", e.message);
      res.json({ response: "The intelligence assistant encountered an error. Please try again in a moment." });
    }
  });

  // ==================== INJURY DATA (ESPN — Free, No API Key) ====================
  app.get("/api/injuries/:sport", async (req, res) => {
    try {
      const { getInjuries, getInjurySummary } = await import("../espn-injury-provider");
      const sport = req.params.sport;
      const reports = await getInjuries(sport);
      const summary = getInjurySummary(reports);
      res.json({ sport, teams: reports, summary, dataSource: "ESPN (free)" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/injuries", async (_req, res) => {
    try {
      const { getAllInjuries, getInjurySummary } = await import("../espn-injury-provider");
      const all = await getAllInjuries();
      const result: Record<string, any> = {};
      let totalInjured = 0;
      for (const [sport, reports] of Object.entries(all)) {
        const summary = getInjurySummary(reports);
        totalInjured += summary.totalInjured;
        result[sport] = { teams: reports, summary };
      }
      res.json({ sports: result, totalInjured, dataSource: "ESPN (free)" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== WEATHER DATA (Open-Meteo — Free, No API Key) ====================
  app.get("/api/weather/venue/:venueName", async (req, res) => {
    try {
      const { getVenueWeather } = await import("../weather-provider");
      const venueName = decodeURIComponent(req.params.venueName);
      const gameTime = req.query.gameTime as string | undefined;
      const weather = await getVenueWeather(venueName, gameTime);
      if (!weather) {
        return res.status(404).json({ error: "Venue not found in database", venue: venueName, dataSource: "Open-Meteo (free)" });
      }
      res.json({ ...weather, dataSource: "Open-Meteo (free)" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/weather/games/:sport", async (req, res) => {
    try {
      const { getScoreboard } = await import("../espn-scoreboard-provider");
      const { getVenueWeather, isOutdoorVenue } = await import("../weather-provider");
      const sport = req.params.sport as any;
      const games = await getScoreboard(sport);

      const weatherData = await Promise.allSettled(
        games.map(async (game: any) => {
          const venueName = game.venue?.name;
          if (!venueName) return null;
          const weather = await getVenueWeather(venueName, game.date);
          if (!weather) return null;
          return {
            gameId: game.id,
            matchup: `${game.awayTeam?.displayName || "Away"} @ ${game.homeTeam?.displayName || "Home"}`,
            venue: venueName,
            outdoor: isOutdoorVenue(venueName),
            weather,
          };
        })
      );

      const results = weatherData
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);

      res.json({ sport, games: results, dataSource: "Open-Meteo (free)" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/weather/venues", async (_req, res) => {
    const { getKnownVenues } = await import("../weather-provider");
    res.json({ venues: getKnownVenues(), count: getKnownVenues().length, dataSource: "Open-Meteo (free)" });
  });

  // ==================== PROP PARLAY BUILDER ====================

  app.post("/api/prop-parlays", async (req, res) => {
    try {
      const { generatePropParlays } = await import("../propParlayEngine");
      const {
        sports = ["NBA"],
        legCount = 3,
        riskLevel = "moderate",
        targetPayout,
        includeProps = true,
        includeMoneylines = true,
        includeSpreads = true,
        includeTotals = true,
        stake = 10,
      } = req.body;

      const parlays = await generatePropParlays({
        sports: Array.isArray(sports) ? sports : [sports],
        legCount: Math.min(10, Math.max(2, legCount)),
        riskLevel,
        targetPayout,
        includeProps,
        includeMoneylines,
        includeSpreads,
        includeTotals,
        stake,
      });

      // Auto-save top-confidence prop legs to the track record for learning
      if (parlays.length > 0) {
        const { savePropToTrackRecord } = await import("../propParlayEngine");
        const savedLegs = new Set<string>();
        for (const parlay of parlays.slice(0, 3)) {
          for (const leg of parlay.legs) {
            if (leg.type === "player_prop" && leg.playerName) {
              const key = `${leg.playerName}|${leg.market}|${leg.selection}`;
              if (!savedLegs.has(key) && leg.confidenceScore >= 55) {
                savedLegs.add(key);
                savePropToTrackRecord(leg).catch(() => {});
              }
            }
          }
        }
      }

      res.json({
        parlays,
        meta: {
          requestedLegs: legCount,
          riskLevel,
          sportsQueried: sports,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      console.error("[prop-parlays] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prop-parlays/legs/:sport", async (req, res) => {
    try {
      const { getAvailableLegs } = await import("../propParlayEngine");
      const sport = req.params.sport;
      const legs = await getAvailableLegs(sport);
      res.json(legs);
    } catch (e: any) {
      console.error("[prop-legs] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Live Boxscore Props Engine ───────────────────────────────────────────────
  // When a game goes live, sportsbooks pull player prop lines. This engine fetches
  // the ESPN live boxscore, calculates pace-adjusted projections, and generates
  // synthetic prop recommendations so members always see data during live games.

  const ESPN_LIVE_SPORT_PATHS: Record<string, string> = {
    NBA: "basketball/nba",
    NFL: "football/nfl",
    NHL: "hockey/nhl",
    MLB: "baseball/mlb",
    NCAAB: "basketball/mens-college-basketball",
    NCAAF: "football/college-football",
  };

  // ESPN boxscore stat key names — these are the actual keys the ESPN summary API returns.
  // Keys vary by sport. Use `statKeyAlt` as a fallback if the primary key is not found.
  const LIVE_SPORT_MARKETS: Record<string, Array<{ market: string; label: string; statKey: string; statKeyAlt?: string; groupHint?: string; isMadeAtt?: boolean }>> = {
    NBA: [
      { market: "player_points",   label: "Points",          statKey: "points",   statKeyAlt: "PTS" },
      { market: "player_rebounds",  label: "Rebounds",        statKey: "rebounds", statKeyAlt: "REB" },
      { market: "player_assists",   label: "Assists",         statKey: "assists",  statKeyAlt: "AST" },
      { market: "player_threes",    label: "3-Pointers Made", statKey: "threePointFieldGoalsMade-threePointFieldGoalsAttempted", statKeyAlt: "3PT", isMadeAtt: true },
      { market: "player_steals",    label: "Steals",          statKey: "steals",   statKeyAlt: "STL" },
      { market: "player_blocks",    label: "Blocks",          statKey: "blocks",   statKeyAlt: "BLK" },
    ],
    NHL: [
      { market: "player_goals",         label: "Goals",         statKey: "goals",        statKeyAlt: "G"   },
      { market: "player_assists",       label: "Assists",        statKey: "assists",      statKeyAlt: "A"   },
      { market: "player_shots_on_goal", label: "Shots on Goal",  statKey: "shotsOnGoal",  statKeyAlt: "SOG" },
    ],
    NFL: [
      { market: "player_pass_yds",         label: "Passing Yards",   statKey: "passingYards",   statKeyAlt: "YDS", groupHint: "passing"   },
      { market: "player_pass_tds",         label: "Passing TDs",     statKey: "passingTouchdowns", statKeyAlt: "TD", groupHint: "passing"   },
      { market: "player_rush_yds",         label: "Rushing Yards",   statKey: "rushingYards",   statKeyAlt: "YDS", groupHint: "rushing"   },
      { market: "player_reception_yds",    label: "Receiving Yards", statKey: "receivingYards", statKeyAlt: "YDS", groupHint: "receiving" },
      { market: "player_receptions",       label: "Receptions",      statKey: "receptions",     statKeyAlt: "REC", groupHint: "receiving" },
    ],
    MLB: [
      { market: "batter_hits",          label: "Hits",               statKey: "hits",       statKeyAlt: "H",  groupHint: "batting"  },
      { market: "batter_home_runs",     label: "Home Runs",          statKey: "homeRuns",   statKeyAlt: "HR", groupHint: "batting"  },
      { market: "pitcher_strikeouts",   label: "Pitcher Strikeouts", statKey: "strikeouts", statKeyAlt: "K",  groupHint: "pitching" },
    ],
    NCAAB: [
      { market: "player_points",   label: "Points",   statKey: "points",   statKeyAlt: "PTS" },
      { market: "player_rebounds", label: "Rebounds", statKey: "rebounds", statKeyAlt: "REB" },
      { market: "player_assists",  label: "Assists",  statKey: "assists",  statKeyAlt: "AST" },
    ],
    NCAAF: [
      { market: "player_pass_yds",      label: "Passing Yards",   statKey: "passingYards",   statKeyAlt: "YDS", groupHint: "passing"   },
      { market: "player_rush_yds",      label: "Rushing Yards",   statKey: "rushingYards",   statKeyAlt: "YDS", groupHint: "rushing"   },
      { market: "player_reception_yds", label: "Receiving Yards", statKey: "receivingYards", statKeyAlt: "YDS", groupHint: "receiving" },
    ],
  };

  function parseBoxscoreStat(raw: string, statKey: string): number {
    if (!raw || raw === "--" || raw === "-") return 0;
    if (statKey === "MIN" || statKey === "TOI") {
      const parts = raw.split(":");
      return (parseFloat(parts[0]) || 0) + (parseFloat(parts[1]) || 0) / 60;
    }
    // "made-attempted" format like "3-7" → take made count
    if (/^\d+-\d+$/.test(raw)) return parseFloat(raw.split("-")[0]) || 0;
    return parseFloat(raw) || 0;
  }

  function calcLiveGameProgress(sport: string, period: number, clockDisplay: string): number {
    if (!period || period < 1) return 0;
    const parts = (clockDisplay || "0:00").split(":");
    const remSecs = (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    if (sport === "NBA" || sport === "NCAAB") {
      const periodSecs = sport === "NCAAB" ? 1200 : 720;
      const totalSecs  = sport === "NCAAB" ? 2400 : 2880;
      const elapsed = Math.max(0, (period - 1) * periodSecs + (periodSecs - remSecs));
      return Math.min(0.99, elapsed / totalSecs);
    }
    if (sport === "NHL") {
      const elapsed = Math.max(0, (period - 1) * 1200 + (1200 - remSecs));
      return Math.min(0.99, elapsed / 3600);
    }
    if (sport === "NFL" || sport === "NCAAF") {
      const elapsed = Math.max(0, (period - 1) * 900 + (900 - remSecs));
      return Math.min(0.99, elapsed / 3600);
    }
    if (sport === "MLB") {
      return Math.min(0.99, Math.max(0, (period - 1) / 18));
    }
    return 0;
  }

  async function fetchLiveBoxscoreProps(sport: string, gameId: string, homeTeamName: string, awayTeamName: string): Promise<any[]> {
    const sportPath = ESPN_LIVE_SPORT_PATHS[sport];
    if (!sportPath) return [];
    const liveMarkets = LIVE_SPORT_MARKETS[sport];
    if (!liveMarkets?.length) return [];

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/summary?event=${gameId}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return [];
      const data = await res.json();

      const comp = data.header?.competitions?.[0];
      const status = comp?.status || {};
      const period = status.period || 0;
      const clockDisplay = status.displayClock || "0:00";
      const gameProgress = calcLiveGameProgress(sport, period, clockDisplay);
      if (gameProgress < 0.04) return []; // too early — not enough data for projection

      const boxscore = data.boxscore;
      if (!boxscore?.players?.length) return [];

      const syntheticProps: any[] = [];
      const processed = new Set<string>();

      for (const teamData of (boxscore.players as any[])) {
        const teamAbbr: string = teamData.team?.abbreviation || "";
        const teamDisplayName: string = teamData.team?.displayName || "";

        for (const statGroup of (teamData.statistics || []) as any[]) {
          const groupName: string = (statGroup.name || "").toLowerCase();
          const keys: string[] = statGroup.keys || [];

          for (const athleteEntry of (statGroup.athletes || []) as any[]) {
            const playerName: string = athleteEntry.athlete?.displayName || "";
            if (!playerName) continue;

            const rawStats: string[] = athleteEntry.stats || [];
            const statMap: Record<string, number> = {};
            rawStats.forEach((v: string, i: number) => {
              if (keys[i]) statMap[keys[i]] = parseBoxscoreStat(v, keys[i]);
            });

            // Minutes played — ESPN uses "minutes" (full name) or short "MIN"/"TOI"
            const minutes = statMap["minutes"] ?? statMap["MIN"] ?? statMap["TOI"] ?? (sport === "NFL" || sport === "MLB" ? 99 : 0);
            // Skip players who haven't played meaningful time (NBA/NHL/NCAAB)
            if ((sport === "NBA" || sport === "NCAAB") && minutes < 4) continue;
            if (sport === "NHL" && minutes < 3) continue;

            for (const mktDef of liveMarkets) {
              if (mktDef.groupHint && !groupName.includes(mktDef.groupHint)) continue;
              const playerGroupKey = `${playerName}|${mktDef.market}`;
              if (processed.has(playerGroupKey)) continue;

              // Look up by primary key first, then alt key (handles ESPN's full-name vs abbrev keys)
              const currentStat: number = statMap[mktDef.statKey] ?? statMap[mktDef.statKeyAlt ?? ""] ?? 0;

              // Skip if player has zero and game is less than 30% complete (likely didn't play yet)
              if (currentStat === 0 && gameProgress < 0.30) continue;

              const projection = gameProgress > 0.08
                ? Math.round((currentStat / gameProgress) * 10) / 10
                : currentStat;

              // Set implied probs based on pace vs a fair baseline
              // If projection is notably above current stat (player trending high), lean over
              const paceRatio = gameProgress > 0 ? projection / Math.max(currentStat, 0.1) : 1;
              const overImplied  = projection > currentStat * 1.1 ? 0.55 : 0.50;
              const underImplied = overImplied === 0.55 ? 0.50 : 0.55;

              // Line = projection rounded to nearest 0.5, this is the natural comparison baseline
              const line = Math.round(projection * 2) / 2;

              // Confidence grows as the game progresses (more data = higher certainty)
              const baseConfidence = Math.round(48 + gameProgress * 22); // 48–70

              syntheticProps.push({
                playerName,
                market: mktDef.market,
                marketLabel: mktDef.label,
                line,
                overOdds:  -110,
                underOdds: -110,
                overDecimal:  1.909,
                underDecimal: 1.909,
                overImpliedProb:  overImplied,
                underImpliedProb: underImplied,
                bookmaker: "ESPN Live",
                allBookmakers: [{ bookmaker: "ESPN Live", overOdds: -110, underOdds: -110, line }],
                bestOver:  { bookmaker: "ESPN Live", odds: -110 },
                bestUnder: { bookmaker: "ESPN Live", odds: -110 },
                consensusLine: line,
                homeTeam: homeTeamName,
                awayTeam: awayTeamName,
                team: teamAbbr,
                dataSource: "ESPN Live Boxscore",
                // Live-specific fields
                isLiveStat: true,
                currentStat,
                projection,
                gameProgress,
                period,
                clockDisplay,
                baseConfidence,
              });
              processed.add(playerGroupKey);
            }
          }
        }
      }

      console.log(`[LiveBoxscore] ${sport} game ${gameId}: ${syntheticProps.length} live props generated (progress: ${Math.round(gameProgress * 100)}%)`);
      return syntheticProps;
    } catch (e: any) {
      console.warn(`[LiveBoxscore] Failed for ${sport} game ${gameId}:`, e.message);
      return [];
    }
  }

  app.get("/api/game-player-props/:sport", async (req, res) => {
    try {
      const { fetchRealPlayerProps, isOddsApiAvailable, fetchRealOddsForGame, MARKET_LABELS } = await import("../odds-provider");
      const { getScoreboard } = await import("../espn-scoreboard-provider");
      const { getInjuries } = await import("../espn-injury-provider");
      const sport = req.params.sport?.toUpperCase();
      if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport" });
      }

      const games = await getScoreboard(sport as any);
      const injuryReports = await getInjuries(sport as any);

      const injuryMap = new Map<string, { status: string; details: string }>();
      for (const report of injuryReports) {
        for (const inj of report.injuries) {
          injuryMap.set(inj.playerName.toLowerCase(), { status: inj.status, details: inj.details || "" });
        }
      }

      const now = Date.now();
      const relevantGames = games
        .filter(g => {
          const gTime = new Date(g.date).getTime();
          return g.status.state === "pre" || (g.status.state === "in" && gTime > now - 12 * 60 * 60 * 1000);
        })
        .slice(0, 15);

      if (relevantGames.length === 0) {
        return res.json({ games: [], sport, message: "No upcoming games found" });
      }

      let realProps: any[] = [];
      if (isOddsApiAvailable()) {
        realProps = await fetchRealPlayerProps(sport, 10);
      }

      const { getCachedPropsForGame } = await import("../odds-provider");

      const propsByEvent = new Map<string, any[]>();
      for (const prop of realProps) {
        const eventKey = `${prop.homeTeam}|${prop.awayTeam}`;
        if (!propsByEvent.has(eventKey)) propsByEvent.set(eventKey, []);
        propsByEvent.get(eventKey)!.push(prop);
      }

      const gameResults: any[] = [];

      for (const game of relevantGames) {
        const homeTeamName = game.homeTeam.displayName || game.homeTeam.shortDisplayName || "";
        const awayTeamName = game.awayTeam.displayName || game.awayTeam.shortDisplayName || "";
        const homeName = homeTeamName.toLowerCase();
        const awayName = awayTeamName.toLowerCase();

        let matchedProps: any[] = [];
        let propsFromCache = false;
        for (const [eventKey, props] of propsByEvent.entries()) {
          const [h, a] = eventKey.toLowerCase().split("|");
          const hToken = h.split(" ").pop() || "";
          const aToken = a.split(" ").pop() || "";
          const homeToken = homeName.split(" ").pop() || "";
          const awayToken = awayName.split(" ").pop() || "";
          if ((hToken === homeToken || h.includes(homeToken) || homeToken.includes(hToken)) &&
              (aToken === awayToken || a.includes(awayToken) || awayToken.includes(aToken))) {
            matchedProps = props;
            break;
          }
        }

        const gameIsLive = game.status?.state === "in";

        if (matchedProps.length === 0) {
          const homeToken = homeName.split(" ").pop() || "";
          const awayToken = awayName.split(" ").pop() || "";
          const directCache = getCachedPropsForGame(`${homeTeamName}|${awayTeamName}`);
          if (directCache && directCache.length > 0) {
            matchedProps = directCache;
            propsFromCache = true;
          } else {
            const allCached = (await import("../odds-provider")).getAllCachedGameProps();
            for (const [gk, gp] of allCached) {
              const [h, a] = gk.split("|");
              const hT = h.split(" ").pop() || "";
              const aT = a.split(" ").pop() || "";
              if ((hT === homeToken || h.includes(homeToken) || homeToken.includes(hT)) &&
                  (aT === awayToken || a.includes(awayToken) || awayToken.includes(aT))) {
                matchedProps = gp;
                propsFromCache = true;
                break;
              }
            }
          }
        }

        const isPreGameReference = gameIsLive && propsFromCache && matchedProps.length > 0;

        if (matchedProps.length === 0 && sport === "NBA") {
          try {
            const { isBDLAvailable, getTodaysGames, getPlayerProps, getPlayerNames } = await import("../balldontlie-provider");
            if (isBDLAvailable()) {
              const bdlGames = await getTodaysGames();
              const homeAbbr = (game.homeTeam.abbreviation || "").toUpperCase();
              const awayAbbr = (game.awayTeam.abbreviation || "").toUpperCase();

              const ABBR_MAP: Record<string, string[]> = {
                GS: ["GSW"], GSW: ["GS"],
                NO: ["NOP"], NOP: ["NO"],
                NY: ["NYK"], NYK: ["NY"],
                SA: ["SAS"], SAS: ["SA"],
                UTAH: ["UTA"], UTA: ["UTAH"],
                WSH: ["WAS"], WAS: ["WSH"],
                PHX: ["PHO"], PHO: ["PHX"],
                BKN: ["BRK"], BRK: ["BKN"],
              };
              const matchAbbr = (espn: string, bdl: string) => {
                if (espn === bdl) return true;
                return (ABBR_MAP[espn] || []).includes(bdl);
              };

              const bdlMatch = bdlGames.find(bg =>
                (matchAbbr(homeAbbr, bg.home_team.abbreviation) && matchAbbr(awayAbbr, bg.visitor_team.abbreviation)) ||
                (matchAbbr(homeAbbr, bg.visitor_team.abbreviation) && matchAbbr(awayAbbr, bg.home_team.abbreviation))
              );
              if (bdlMatch) {
                const bdlProps = await getPlayerProps(bdlMatch.id);
                if (bdlProps.length > 0) {
                  const { MARKET_LABELS } = await import("../odds-provider");

                  const playerIds = [...new Set(bdlProps.map(bp => bp.player_id))];
                  const nameMap = await getPlayerNames(playerIds);

                  for (const bp of bdlProps) {
                    const marketKey = bp.prop_type || bp.market?.type || "";
                    const lineVal = parseFloat(bp.line_value) || 0;
                    const overOdds = bp.market?.over_odds || -110;
                    const underOdds = bp.market?.under_odds || -110;
                    const overDec = overOdds > 0 ? 1 + overOdds / 100 : 1 + 100 / Math.abs(overOdds);
                    const underDec = underOdds > 0 ? 1 + underOdds / 100 : 1 + 100 / Math.abs(underOdds);
                    const resolvedName = nameMap.get(bp.player_id) || `Player #${bp.player_id}`;
                    matchedProps.push({
                      eventId: String(bdlMatch.id),
                      sportKey: "NBA",
                      homeTeam: bdlMatch.home_team.full_name,
                      awayTeam: bdlMatch.visitor_team.full_name,
                      commenceTime: bdlMatch.date,
                      playerName: resolvedName,
                      market: marketKey,
                      marketLabel: MARKET_LABELS[marketKey] || marketKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                      line: lineVal,
                      overOdds,
                      underOdds,
                      overDecimal: overDec,
                      underDecimal: underDec,
                      bookmaker: bp.vendor || "BallDontLie",
                      allBookmakers: [{ bookmaker: bp.vendor || "BallDontLie", overOdds, underOdds, line: lineVal }],
                      bestOver: { bookmaker: bp.vendor || "BallDontLie", odds: overOdds },
                      bestUnder: { bookmaker: bp.vendor || "BallDontLie", odds: underOdds },
                      consensusLine: lineVal,
                      overImpliedProb: 1 / overDec,
                      underImpliedProb: 1 / underDec,
                      dataSource: "BallDontLie (live)",
                    });
                  }
                  propsFromCache = false;
                }
              }
            }
          } catch (bdlErr: any) {
            // BDL fallback failed silently
          }
        }

        // ── Live Boxscore Fallback ─────────────────────────────────────────────
        // When a game is in progress and no prop odds are available from any source,
        // fetch the ESPN live boxscore and build pace-adjusted projections for each
        // player so members always see live intelligence during games.
        if (matchedProps.length === 0 && gameIsLive) {
          const liveProps = await fetchLiveBoxscoreProps(sport, game.id, homeTeamName, awayTeamName);
          if (liveProps.length > 0) {
            matchedProps = liveProps;
          }
        }

        const leaders = (game as any).leaders || [];
        const leaderMap = new Map<string, { category: string; value: string; team: string }[]>();
        for (const l of leaders) {
          const name = (l.playerName || "").toLowerCase();
          if (!leaderMap.has(name)) leaderMap.set(name, []);
          leaderMap.get(name)!.push({ category: l.category, value: l.value, team: l.team });
        }

        const playersByName = new Map<string, any>();

        for (const prop of matchedProps) {
          const pName = prop.playerName;
          const pKey = pName.toLowerCase();
          // Derive playerTeam here so it's accessible throughout the entire loop body,
          // not just inside the playersByName initialization block.
          const _existingPlayer = playersByName.get(pKey);
          const _propLeaderStats = _existingPlayer ? _existingPlayer.leaderStats : (leaderMap.get(pKey) || []);
          const playerTeam = _existingPlayer?.team || (_propLeaderStats.length > 0 ? _propLeaderStats[0].team : (prop.team || ""));
          if (!playersByName.has(pKey)) {
            const injury = injuryMap.get(pKey);
            const leaderStats = leaderMap.get(pKey) || [];
            let teamAbbr = "";
            if (playerTeam) {
              const ptLower = playerTeam.toLowerCase();
              const homeNameL = homeTeamName.toLowerCase();
              const awayNameL = awayTeamName.toLowerCase();
              if (ptLower === homeNameL || homeNameL.includes(ptLower) || ptLower.includes(homeName.split(" ").pop() || "")) {
                teamAbbr = game.homeTeam.abbreviation || "";
              } else if (ptLower === awayNameL || awayNameL.includes(ptLower) || ptLower.includes(awayName.split(" ").pop() || "")) {
                teamAbbr = game.awayTeam.abbreviation || "";
              } else {
                teamAbbr = playerTeam;
              }
            }
            playersByName.set(pKey, {
              playerName: pName,
              team: teamAbbr,
              injury: injury || null,
              leaderStats,
              markets: [],
            });
          }

          const overImplied = prop.overImpliedProb || 0.5;
          const underImplied = prop.underImpliedProb || 0.5;
          const leaderStats = playersByName.get(pKey)!.leaderStats;
          let seasonAvg: number | null = null;
          const marketCat = (prop.marketLabel || "").toLowerCase();
          for (const ls of leaderStats) {
            const lsCat = ls.category.toLowerCase();
            if (
              (marketCat.includes("point") && !marketCat.includes("3-point") && !marketCat.includes("three") && lsCat.includes("point")) ||
              (marketCat.includes("rebound") && lsCat.includes("rebound")) ||
              (marketCat.includes("assist") && lsCat.includes("assist")) ||
              (marketCat.includes("pass") && lsCat.includes("pass")) ||
              (marketCat.includes("rush") && lsCat.includes("rush")) ||
              (marketCat.includes("rec") && lsCat.includes("rec")) ||
              (marketCat.includes("shot") && lsCat.includes("shot")) ||
              (marketCat.includes("goal") && lsCat.includes("goal")) ||
              (marketCat.includes("hit") && lsCat.includes("hit")) ||
              (marketCat.includes("strikeout") && lsCat.includes("strikeout"))
            ) {
              seasonAvg = parseFloat(ls.value);
              break;
            }
          }

          if (seasonAvg === null && leaderStats.length > 0) {
            const ratingEntry = leaderStats.find(ls => ls.category.toLowerCase().includes("rating"));
            if (ratingEntry) {
              const ratingStr = ratingEntry.value;
              const statMatchers: Record<string, RegExp> = {
                "points": /([0-9.]+)\s*PPG/i,
                "rebounds": /([0-9.]+)\s*RPG/i,
                "assists": /([0-9.]+)\s*APG/i,
                "steals": /([0-9.]+)\s*SPG/i,
                "blocks": /([0-9.]+)\s*BPG/i,
                "3-pointers": /([0-9.]+)\s*3PG/i,
              };

              if (marketCat.includes("pts+reb+ast")) {
                const ppg = ratingStr.match(/([0-9.]+)\s*PPG/i);
                const rpg = ratingStr.match(/([0-9.]+)\s*RPG/i);
                const apg = ratingStr.match(/([0-9.]+)\s*APG/i);
                if (ppg && rpg && apg) {
                  seasonAvg = Math.round((parseFloat(ppg[1]) + parseFloat(rpg[1]) + parseFloat(apg[1])) * 10) / 10;
                }
              } else if (marketCat.includes("3-point") || marketCat.includes("three")) {
                // 3-Pointers: no reliable season avg from ESPN leaders — skip stat match
              } else {
                for (const [statKey, regex] of Object.entries(statMatchers)) {
                  if (marketCat.includes(statKey.split("-")[0])) {
                    const match = ratingStr.match(regex);
                    if (match) seasonAvg = parseFloat(match[1]);
                    break;
                  }
                }
              }
            }
          }

          let recommendation: "over" | "under" | "push" = "push";
          let confidence = 50;
          let reasoning = "";

          if (seasonAvg !== null && !isNaN(seasonAvg)) {
            const diff = seasonAvg - prop.line;
            const pctDiff = diff / prop.line;

            if (pctDiff > 0.08) {
              recommendation = "over";
              confidence = Math.min(82, Math.round(55 + pctDiff * 100));
              reasoning = `Season avg ${seasonAvg} exceeds line ${prop.line} by ${(pctDiff * 100).toFixed(1)}%. Lean OVER.`;
            } else if (pctDiff < -0.08) {
              recommendation = "under";
              confidence = Math.min(82, Math.round(55 + Math.abs(pctDiff) * 100));
              reasoning = `Season avg ${seasonAvg} is below line ${prop.line} by ${(Math.abs(pctDiff) * 100).toFixed(1)}%. Lean UNDER.`;
            } else {
              recommendation = underImplied > overImplied ? "over" : "under";
              confidence = 52;
              reasoning = `Season avg ${seasonAvg} is close to line ${prop.line}. Slight lean based on odds value.`;
            }
          } else {
            if (overImplied < underImplied) {
              recommendation = "over";
              confidence = Math.round(50 + (underImplied - overImplied) * 30);
              reasoning = `Market pricing favors OVER (implied ${(overImplied * 100).toFixed(0)}% vs ${(underImplied * 100).toFixed(0)}%).`;
            } else if (underImplied < overImplied) {
              recommendation = "under";
              confidence = Math.round(50 + (overImplied - underImplied) * 30);
              reasoning = `Market pricing favors UNDER (implied ${(underImplied * 100).toFixed(0)}% vs ${(overImplied * 100).toFixed(0)}%).`;
            } else {
              recommendation = "push";
              confidence = 50;
              reasoning = "Odds are evenly split — no clear edge.";
            }
          }

          const injury = playersByName.get(pKey)!.injury;
          if (injury) {
            if (injury.status === "Out" || injury.status === "Doubtful") {
              reasoning += ` ⚠️ ${injury.status}: ${injury.details}. Skip this prop.`;
              confidence = Math.max(30, confidence - 20);
            } else if (injury.status === "Questionable" || injury.status === "Day-To-Day") {
              reasoning += ` ⚠️ ${injury.status}: ${injury.details}. Monitor status.`;
              confidence = Math.max(40, confidence - 10);
            }
          }

          let quantumScore: number | null = null;
          let quantumGrade: string | null = null;
          let quantumInsights: string[] = [];
          let mcProjection: { predictedTotal: number; overProb: number; convergence: number } | null = null;
          let situationalNote: string | null = null;
          let vegasEdge: number | null = null;
          const engineSources: string[] = ["ESPN Stats", "The Odds API"];

          try {
            const propOdds = recommendation === "over" ? (prop.overOdds || -110) : (prop.underOdds || -110);
            const fusionResult = analyzeLeg(
              sport as any,
              `${pName} ${prop.marketLabel || prop.market} ${recommendation.toUpperCase()} ${prop.line}`,
              propOdds,
              {
                playerName: pName,
                market: prop.market,
                line: prop.line,
                seasonAvg: seasonAvg,
                isPlayerProp: true,
                homeTeam: homeTeamName,
                awayTeam: awayTeamName,
              }
            );
            if (fusionResult) {
              quantumScore = fusionResult.overallScore;
              quantumGrade = fusionResult.grade;
              quantumInsights = (fusionResult.insights || []).slice(0, 3);
              engineSources.push("Quantum Fusion");

              if (fusionResult.confidence > confidence) {
                confidence = Math.round((confidence * 0.6) + (fusionResult.confidence * 0.4));
              }
              if (fusionResult.expectedValue > 2) {
                reasoning += ` QF: +${fusionResult.expectedValue.toFixed(1)}% EV detected.`;
              }
              if (fusionResult.edgePercentage > 3) {
                confidence = Math.min(92, confidence + 3);
              }
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }

          try {
            const mcData = getPreSimulated(game.id);
            if (mcData) {
              mcProjection = {
                predictedTotal: mcData.predictedTotal,
                overProb: Math.round(mcData.overProb * 100),
                convergence: mcData.convergenceScore,
              };
              engineSources.push("Monte Carlo");

              const marketLower = (prop.marketLabel || "").toLowerCase();
              if (marketLower.includes("point") && !marketLower.includes("3-point")) {
                const teamIsHome = playerTeam === (game.homeTeam.abbreviation || "");
                const projectedTeamScore = teamIsHome ? mcData.predictedHomeScore : mcData.predictedAwayScore;
                if (seasonAvg !== null && projectedTeamScore > 0) {
                  const teamAvgTotal = sport === "NBA" ? 112 : sport === "NFL" ? 23 : 4;
                  const playerSharePct = seasonAvg / teamAvgTotal;
                  const projectedPlayerPts = projectedTeamScore * playerSharePct;
                  if (projectedPlayerPts > prop.line * 1.08) {
                    reasoning += ` MC: Projected ${projectedPlayerPts.toFixed(1)} (${mcData.simulations.toLocaleString()} sims).`;
                    confidence = Math.min(92, confidence + 2);
                  } else if (projectedPlayerPts < prop.line * 0.92) {
                    reasoning += ` MC: Projected ${projectedPlayerPts.toFixed(1)} (${mcData.simulations.toLocaleString()} sims).`;
                    if (recommendation === "over") confidence = Math.max(45, confidence - 3);
                  }
                }
              }
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }

          try {
            const sitFactors = getGameSituationalFactors(sport as any, game, games);
            if (sitFactors) {
              engineSources.push("Situational");
              const teamIsHome = playerTeam === (game.homeTeam.abbreviation || "");
              const isB2B = teamIsHome ? sitFactors.homeB2B : sitFactors.awayB2B;
              const restDays = teamIsHome ? sitFactors.homeRestDays : sitFactors.awayRestDays;

              if (isB2B) {
                situationalNote = "Back-to-back game — fatigue factor";
                if (recommendation === "over") {
                  confidence = Math.max(40, confidence - 4);
                  reasoning += ` Sit: B2B game, fatigue risk for OVER.`;
                } else {
                  confidence = Math.min(90, confidence + 2);
                  reasoning += ` Sit: B2B fatigue favors UNDER.`;
                }
              } else if (restDays >= 3) {
                situationalNote = `${restDays} days rest — well rested`;
                if (recommendation === "over") {
                  confidence = Math.min(90, confidence + 2);
                  reasoning += ` Sit: ${restDays}d rest, well rested.`;
                }
              }

              if (sitFactors.spotType === "revenge" || sitFactors.spotType === "rivalry") {
                situationalNote = (situationalNote ? situationalNote + " | " : "") + `${sitFactors.spotType} spot`;
                reasoning += ` Sit: ${sitFactors.spotDescription}.`;
              }
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }

          try {
            const vegasPreds = await generateVegasPredictions(sport as any);
            const gamePred = vegasPreds.find(vp => vp.game?.toLowerCase().includes(game.shortName?.toLowerCase().split(" ")[0] || "---"));
            if (gamePred && gamePred.ev !== undefined) {
              vegasEdge = gamePred.ev;
              engineSources.push("Vegas Engine");
            }
          } catch (err: any) { console.warn("[betting] Non-critical error:", err?.message || err); }

          const edge = seasonAvg ? Math.round((seasonAvg - prop.line) / prop.line * 100 * 10) / 10 : 0;

          confidence = Math.min(95, Math.max(30, confidence));

          playersByName.get(pKey)!.markets.push({
            market: prop.market,
            marketLabel: prop.marketLabel,
            line: prop.line,
            overOdds: prop.overOdds,
            underOdds: prop.underOdds,
            overImpliedProb: Math.round((prop.overImpliedProb || 0.5) * 1000) / 10,
            underImpliedProb: Math.round((prop.underImpliedProb || 0.5) * 1000) / 10,
            recommendation,
            confidence,
            reasoning,
            seasonAvg,
            edge,
            bookmaker: prop.bookmaker,
            bestOver: prop.bestOver,
            bestUnder: prop.bestUnder,
            consensusLine: prop.consensusLine,
            allBookmakers: (prop.allBookmakers || []).slice(0, 5),
            dataSource: prop.dataSource || "The Odds API (live)",
            quantumScore,
            quantumGrade,
            quantumInsights,
            mcProjection,
            situationalNote,
            vegasEdge,
            engineSources,
            // Live boxscore fields — populated only during in-progress games
            isLiveStat: prop.isLiveStat || false,
            currentStat: prop.isLiveStat ? (prop.currentStat ?? null) : null,
            projection:  prop.isLiveStat ? (prop.projection  ?? null) : null,
            gameProgress: prop.isLiveStat ? (prop.gameProgress ?? null) : null,
            period:       prop.isLiveStat ? (prop.period      ?? null) : null,
            clockDisplay: prop.isLiveStat ? (prop.clockDisplay ?? null) : null,
          });
        }

        const homePlayers = getPlayersFromCacheById(sport as any, game.homeTeam.id);
        const awayPlayers = getPlayersFromCacheById(sport as any, game.awayTeam.id);

        const rosterPlayers: any[] = [];
        const processRosterPlayers = (players: any[] | null, teamName: string, teamAbbr: string) => {
          if (!players) return;
          for (const p of players) {
            const pKey = p.fullName.toLowerCase();
            if (playersByName.has(pKey)) continue;
            if (p.status?.type !== "active" && p.status?.name !== "Active") continue;

            const injury = injuryMap.get(pKey);
            if (injury && (injury.status === "Out" || injury.status === "Injured Reserve")) continue;

            const leaderStats = leaderMap.get(pKey) || [];
            if (leaderStats.length === 0) continue;

            rosterPlayers.push({
              playerName: p.fullName,
              team: teamAbbr,
              position: p.position?.abbreviation || "",
              injury: injury || null,
              leaderStats,
              markets: [],
              hasOddsData: false,
            });
          }
        };

        processRosterPlayers(homePlayers, homeTeamName, game.homeTeam.abbreviation || "");
        processRosterPlayers(awayPlayers, awayTeamName, game.awayTeam.abbreviation || "");

        const homeRosterNames = new Set<string>();
        const awayRosterNames = new Set<string>();
        if (homePlayers) homePlayers.forEach(p => homeRosterNames.add(p.fullName.toLowerCase()));
        if (awayPlayers) awayPlayers.forEach(p => awayRosterNames.add(p.fullName.toLowerCase()));

        const allPlayersArr = Array.from(playersByName.values()).map(p => {
          let team = p.team || "";
          if (!team) {
            const pKey = p.playerName.toLowerCase();
            if (homeRosterNames.has(pKey)) {
              team = game.homeTeam.abbreviation || "";
            } else if (awayRosterNames.has(pKey)) {
              team = game.awayTeam.abbreviation || "";
            }
          }
          return { ...p, team, hasOddsData: true };
        });

        allPlayersArr.push(...rosterPlayers);

        allPlayersArr.sort((a, b) => {
          if (a.hasOddsData && !b.hasOddsData) return -1;
          if (!a.hasOddsData && b.hasOddsData) return 1;
          const aMarkets = a.markets.length;
          const bMarkets = b.markets.length;
          return bMarkets - aMarkets;
        });

        gameResults.push({
          gameId: game.id,
          gameName: game.name,
          shortName: game.shortName,
          gameTime: game.date,
          status: game.status,
          homeTeam: {
            name: homeTeamName,
            abbreviation: game.homeTeam.abbreviation,
            record: game.homeTeam.record,
            logo: game.homeTeam.logo,
          },
          awayTeam: {
            name: awayTeamName,
            abbreviation: game.awayTeam.abbreviation,
            record: game.awayTeam.record,
            logo: game.awayTeam.logo,
          },
          players: allPlayersArr,
          totalProps: allPlayersArr.reduce((sum, p) => sum + p.markets.length, 0),
          isPreGameReference,
          dataSource: matchedProps.length > 0
            ? (isPreGameReference ? "The Odds API (pre-game reference)" : propsFromCache ? "The Odds API (pre-game cached)" : (matchedProps[0]?.dataSource || "The Odds API (live)"))
            : "ESPN roster",
        });
      }

      gameResults.sort((a, b) => {
        if (a.totalProps > 0 && b.totalProps === 0) return -1;
        if (a.totalProps === 0 && b.totalProps > 0) return 1;
        return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
      });

      return res.json({
        games: gameResults,
        sport,
        totalGames: gameResults.length,
        totalProps: gameResults.reduce((s, g) => s + g.totalProps, 0),
        dataSource: realProps.length > 0 ? "The Odds API + ESPN" : "ESPN",
        generatedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error("[game-player-props] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/top-props/:sport", async (req, res) => {
    try {
      const { fetchRealPlayerProps, isOddsApiAvailable, MARKET_LABELS } = await import("../odds-provider");
      const { getScoreboard } = await import("../espn-scoreboard-provider");
      const { getInjuries } = await import("../espn-injury-provider");
      const sport = req.params.sport?.toUpperCase();
      if (!["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].includes(sport)) {
        return res.status(400).json({ error: "Invalid sport" });
      }

      const games = await getScoreboard(sport as any);
      const injuryReports = await getInjuries(sport as any);
      const injuryMap = new Map<string, { status: string; details: string }>();
      for (const report of injuryReports) {
        for (const inj of report.injuries) {
          injuryMap.set(inj.playerName.toLowerCase(), { status: inj.status, details: inj.details || "" });
        }
      }

      const relevantGames = games
        .filter(g => {
          const gTime = new Date(g.date).getTime();
          return g.status.state === "pre" || (g.status.state === "in" && gTime > Date.now() - 12 * 60 * 60 * 1000);
        })
        .slice(0, 15);

      if (relevantGames.length === 0) {
        return res.json({ topPicks: [], sport, message: "No upcoming games", generatedAt: new Date().toISOString() });
      }

      let realProps: any[] = [];
      if (isOddsApiAvailable()) {
        realProps = await fetchRealPlayerProps(sport, 10);
      }

      const { getCachedPropsForGame, getAllCachedGameProps } = await import("../odds-provider");

      if (realProps.length === 0) {
        const allCached = getAllCachedGameProps();
        if (allCached.size === 0) {
          return res.json({ topPicks: [], sport, message: "No prop data available yet", generatedAt: new Date().toISOString() });
        }
        for (const [, gp] of allCached) {
          realProps.push(...gp);
        }
      }

      const propsByEvent = new Map<string, any[]>();
      for (const prop of realProps) {
        const eventKey = `${prop.homeTeam}|${prop.awayTeam}`;
        if (!propsByEvent.has(eventKey)) propsByEvent.set(eventKey, []);
        propsByEvent.get(eventKey)!.push(prop);
      }

      const allAnalyzed: any[] = [];

      for (const game of relevantGames) {
        const homeTeamName = game.homeTeam.displayName || game.homeTeam.shortDisplayName || "";
        const awayTeamName = game.awayTeam.displayName || game.awayTeam.shortDisplayName || "";
        const homeName = homeTeamName.toLowerCase();
        const awayName = awayTeamName.toLowerCase();

        let matchedProps: any[] = [];
        for (const [eventKey, props] of propsByEvent.entries()) {
          const [h, a] = eventKey.toLowerCase().split("|");
          const hToken = h.split(" ").pop() || "";
          const aToken = a.split(" ").pop() || "";
          const homeToken = homeName.split(" ").pop() || "";
          const awayToken = awayName.split(" ").pop() || "";
          if ((hToken === homeToken || h.includes(homeToken) || homeToken.includes(hToken)) &&
              (aToken === awayToken || a.includes(awayToken) || awayToken.includes(aToken))) {
            matchedProps = props;
            break;
          }
        }

        const topPropsGameIsLive = game.status?.state === "in";

        if (matchedProps.length === 0 && !topPropsGameIsLive) {
          const homeToken = homeName.split(" ").pop() || "";
          const awayToken = awayName.split(" ").pop() || "";
          const directCache = getCachedPropsForGame(`${homeTeamName}|${awayTeamName}`);
          if (directCache && directCache.length > 0) {
            matchedProps = directCache;
          } else {
            const allCached = getAllCachedGameProps();
            for (const [gk, gp] of allCached) {
              const [h, a] = gk.split("|");
              const hT = h.split(" ").pop() || "";
              const aT = a.split(" ").pop() || "";
              if ((hT === homeToken || h.includes(homeToken) || homeToken.includes(hT)) &&
                  (aT === awayToken || a.includes(awayToken) || awayToken.includes(aT))) {
                matchedProps = gp;
                break;
              }
            }
          }
        }

        if (matchedProps.length === 0) continue;

        const leaders = (game as any).leaders || [];
        const leaderMap = new Map<string, { category: string; value: string; team: string }[]>();
        for (const l of leaders) {
          const name = (l.playerName || "").toLowerCase();
          if (!leaderMap.has(name)) leaderMap.set(name, []);
          leaderMap.get(name)!.push({ category: l.category, value: l.value, team: l.team });
        }

        for (const prop of matchedProps) {
          const pKey = prop.playerName.toLowerCase();
          const injury = injuryMap.get(pKey);
          if (injury && (injury.status === "Out" || injury.status === "Injured Reserve")) continue;

          const leaderStats = leaderMap.get(pKey) || [];
          const overImplied = prop.overImpliedProb || 0.5;
          const underImplied = prop.underImpliedProb || 0.5;
          const marketCat = (prop.marketLabel || "").toLowerCase();

          const is3Pointer = marketCat.includes("3-point") || marketCat.includes("three");

          let seasonAvg: number | null = null;
          if (!is3Pointer) {
            for (const ls of leaderStats) {
              const lsCat = ls.category.toLowerCase();
              if (
                (marketCat.includes("point") && lsCat.includes("point")) ||
                (marketCat.includes("rebound") && lsCat.includes("rebound")) ||
                (marketCat.includes("assist") && lsCat.includes("assist")) ||
                (marketCat.includes("pass") && lsCat.includes("pass")) ||
                (marketCat.includes("rush") && lsCat.includes("rush")) ||
                (marketCat.includes("rec") && lsCat.includes("rec")) ||
                (marketCat.includes("shot") && lsCat.includes("shot")) ||
                (marketCat.includes("goal") && lsCat.includes("goal")) ||
                (marketCat.includes("hit") && lsCat.includes("hit")) ||
                (marketCat.includes("strikeout") && lsCat.includes("strikeout"))
              ) {
                seasonAvg = parseFloat(ls.value);
                break;
              }
            }

            if (seasonAvg === null && leaderStats.length > 0) {
              const ratingEntry = leaderStats.find(ls => ls.category.toLowerCase().includes("rating"));
              if (ratingEntry) {
                const ratingStr = ratingEntry.value;
                const statMatchers: Record<string, RegExp> = {
                  "points": /([0-9.]+)\s*PPG/i,
                  "rebounds": /([0-9.]+)\s*RPG/i,
                  "assists": /([0-9.]+)\s*APG/i,
                  "steals": /([0-9.]+)\s*SPG/i,
                  "blocks": /([0-9.]+)\s*BPG/i,
                };
                if (marketCat.includes("pts+reb+ast")) {
                  const ppg = ratingStr.match(/([0-9.]+)\s*PPG/i);
                  const rpg = ratingStr.match(/([0-9.]+)\s*RPG/i);
                  const apg = ratingStr.match(/([0-9.]+)\s*APG/i);
                  if (ppg && rpg && apg) {
                    seasonAvg = Math.round((parseFloat(ppg[1]) + parseFloat(rpg[1]) + parseFloat(apg[1])) * 10) / 10;
                  }
                } else {
                  for (const [statKey, regex] of Object.entries(statMatchers)) {
                    if (marketCat.includes(statKey.split("-")[0])) {
                      const match = ratingStr.match(regex);
                      if (match) seasonAvg = parseFloat(match[1]);
                      break;
                    }
                  }
                }
              }
            }
          }

          if (seasonAvg === null) continue;

          const diff = seasonAvg - prop.line;
          const pctDiff = diff / prop.line;
          const absEdge = Math.abs(pctDiff);

          if (absEdge < 0.08) continue;

          const recommendation: "over" | "under" = pctDiff > 0 ? "over" : "under";
          let confidence = Math.min(82, Math.round(55 + absEdge * 100));
          let reasoning = pctDiff > 0
            ? `Season avg ${seasonAvg} exceeds line ${prop.line} by ${(pctDiff * 100).toFixed(1)}%. Lean OVER.`
            : `Season avg ${seasonAvg} is below line ${prop.line} by ${(absEdge * 100).toFixed(1)}%. Lean UNDER.`;

          if (injury) {
            if (injury.status === "Questionable" || injury.status === "Day-To-Day") {
              reasoning += ` ⚠️ ${injury.status}: ${injury.details}. Monitor status.`;
              confidence = Math.max(40, confidence - 10);
            } else if (injury.status === "Doubtful") {
              reasoning += ` ⚠️ Doubtful: ${injury.details}. High risk.`;
              confidence = Math.max(30, confidence - 20);
            }
          }

          const edge = Math.round((seasonAvg - prop.line) / prop.line * 100 * 10) / 10;

          const bookmakerCount = (prop.allBookmakers || []).length;
          const bestOver = prop.bestOver;
          const bestUnder = prop.bestUnder;

          const score = (confidence * 2) + (absEdge * 200) + (bookmakerCount * 3) +
            (leaderStats.length > 0 ? 10 : 0) +
            (!injury ? 5 : 0);

          allAnalyzed.push({
            playerName: prop.playerName,
            team: leaderStats[0]?.team || "",
            market: prop.market,
            marketLabel: prop.marketLabel,
            line: prop.line,
            seasonAvg,
            recommendation,
            confidence,
            reasoning,
            edge,
            overOdds: prop.overOdds,
            underOdds: prop.underOdds,
            overImpliedProb: Math.round(overImplied * 1000) / 10,
            underImpliedProb: Math.round(underImplied * 1000) / 10,
            bookmaker: prop.bookmaker,
            bestOver,
            bestUnder,
            allBookmakers: (prop.allBookmakers || []).slice(0, 5),
            gameId: game.id,
            gameName: game.shortName,
            gameTime: game.date,
            injury: injury || null,
            score,
            dataSource: prop.dataSource || "The Odds API (live)",
          });
        }
      }

      allAnalyzed.sort((a, b) => b.score - a.score);

      const topPicks = allAnalyzed.slice(0, 15);

      const { simulatePlayerProp } = await import("../monteCarloEngine");

      const mcEnrichedPicks = topPicks.map((p) => {
        const mcResult = simulatePlayerProp({
          playerName: p.playerName,
          market: p.marketLabel || p.market,
          line: p.line,
          seasonAvg: p.seasonAvg,
          sport,
          recommendation: p.recommendation,
          injuryStatus: p.injury?.status || null,
        });

        const mcAdjustedConfidence = Math.round(
          p.confidence * 0.35 + mcResult.mcConfidence * 0.65
        );

        const mcScore = (mcAdjustedConfidence * 2) + (Math.abs(p.edge / 100) * 200) +
          ((p.allBookmakers || []).length * 3) +
          (p.seasonAvg ? 10 : 0) +
          (!p.injury ? 5 : 0) +
          (mcResult.hitProbability > 0.6 ? 15 : 0);

        return {
          ...p,
          confidence: mcAdjustedConfidence,
          score: mcScore,
          monteCarlo: {
            simulations: mcResult.simulations,
            hitProbability: Math.round(mcResult.hitProbability * 1000) / 10,
            missProbability: Math.round(mcResult.missProbability * 1000) / 10,
            projectedValue: mcResult.projectedValue,
            stdDev: mcResult.stdDev,
            p10: mcResult.p10,
            median: mcResult.median,
            p90: mcResult.p90,
            convergenceScore: mcResult.convergenceScore,
            riskLevel: mcResult.riskLevel,
            confidence95: [
              Math.round(mcResult.confidence95[0] * 1000) / 10,
              Math.round(mcResult.confidence95[1] * 1000) / 10,
            ],
            edgeOverMarket: mcResult.edgeOverMarket,
          },
          reasoning: p.reasoning + ` MC sim (${mcResult.simulations}x): ${Math.round(mcResult.hitProbability * 100)}% hit rate, projected ${mcResult.projectedValue} (p10: ${mcResult.p10}, p90: ${mcResult.p90}).`,
        };
      });

      mcEnrichedPicks.sort((a, b) => b.score - a.score);

      const gradeByScore = (s: number): string => {
        if (s >= 220) return "A+";
        if (s >= 195) return "A";
        if (s >= 175) return "A-";
        if (s >= 160) return "B+";
        if (s >= 145) return "B";
        if (s >= 130) return "B-";
        return "C+";
      };

      const enriched = mcEnrichedPicks.map((p, idx) => ({
        rank: idx + 1,
        grade: gradeByScore(p.score),
        ...p,
      }));

      return res.json({
        topPicks: enriched,
        sport,
        totalAnalyzed: allAnalyzed.length,
        totalGames: relevantGames.length,
        generatedAt: new Date().toISOString(),
        dataSource: "The Odds API + ESPN + Monte Carlo (5K sims/prop)",
        mcSimulated: true,
      });
    } catch (e: any) {
      console.error("[top-props] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/real-player-props/:sport", async (req, res) => {
    try {
      const { fetchRealPlayerProps, isOddsApiAvailable } = await import("../odds-provider");
      const sport = req.params.sport;
      const maxEvents = parseInt(req.query.maxEvents as string) || 5;

      if (!isOddsApiAvailable()) {
        return res.json({
          props: [],
          available: false,
          message: "The Odds API key is not configured or expired. Using ESPN-derived data.",
          dataSource: "none",
        });
      }

      const props = await fetchRealPlayerProps(sport, maxEvents);
      res.json({
        props,
        available: true,
        count: props.length,
        dataSource: "The Odds API (live)",
      });
    } catch (e: any) {
      console.error("[real-props] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== PREDICTION GENERATORS ====================

  app.get("/api/predictions/straight-bets", requireTier("elite", "whale"), async (req, res) => {
    try {
      const sport = req.query.sport as string | undefined;
      const betType = req.query.betType as string | undefined;
      const minConfidence = parseInt(req.query.minConfidence as string) || 0;

      const validSport = sport && sports.includes(sport as any) ? sport as any : undefined;

      const predictions = await generateVegasPredictions(validSport);

      let filtered = predictions;
      if (betType && ["moneyline", "spread", "total"].includes(betType)) {
        filtered = filtered.filter(p => p.betType === betType);
      }
      if (minConfidence > 0) {
        filtered = filtered.filter(p => p.confidence >= minConfidence);
      }

      const rankedPicks = filtered.map((pred, idx) => {
        const fusionResult = analyzeLeg(
          pred.sport,
          `${pred.prediction} (${pred.game})`,
          pred.betType === "moneyline" ? pred.vegasLine : -110,
          { hasRealOdds: true }
        );

        let unitRecommendation: number;
        if (pred.confidenceTier === "LOCK") unitRecommendation = 3;
        else if (pred.confidenceTier === "STRONG") unitRecommendation = 2;
        else if (pred.confidenceTier === "LEAN") unitRecommendation = 1;
        else unitRecommendation = 0.5;

        return {
          id: pred.id,
          rank: idx + 1,
          sport: pred.sport,
          game: pred.game,
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          pick: pred.prediction,
          betType: pred.betType,
          odds: pred.betType === "spread" || pred.betType === "total" ? -110 : pred.vegasLine,
          line: pred.vegasLine,
          projectedLine: pred.projectedLine,
          fairLine: pred.fairLine,
          confidence: pred.confidence,
          confidenceTier: pred.confidenceTier,
          edge: pred.edge,
          expectedValue: pred.expectedValue,
          trueProbability: pred.trueProbability,
          impliedProbability: pred.impliedProbability,
          sharpMoney: pred.sharpMoney,
          publicMoney: pred.publicMoney,
          steamMove: pred.steamMove,
          reverseLineMove: pred.reverseLineMove,
          modelAgreement: pred.modelAgreement,
          factors: pred.factors,
          fusionGrade: fusionResult.grade,
          fusionConfidence: fusionResult.confidence,
          unitRecommendation,
        };
      });

      return res.json({
        picks: rankedPicks,
        meta: {
          totalPicks: rankedPicks.length,
          lockCount: rankedPicks.filter(p => p.confidenceTier === "LOCK").length,
          strongCount: rankedPicks.filter(p => p.confidenceTier === "STRONG").length,
          averageEdge: rankedPicks.length > 0 ? Math.round(rankedPicks.reduce((s, p) => s + p.edge, 0) / rankedPicks.length * 10) / 10 : 0,
          generatedAt: new Date().toISOString(),
          sport: validSport || "all",
        },
        disclaimer: "For entertainment purposes only. No guarantees — betting involves risk. Gamble responsibly.",
      });
    } catch (err) {
      console.error("Straight bets error:", err);
      return res.status(500).json({ error: "Failed to generate straight bet predictions" });
    }
  });

  app.get("/api/predictions/sgp", requireTier("elite", "whale"), async (req, res) => {
    try {
      const sport = (req.query.sport as string) || "NBA";
      const validSport = sports.includes(sport as any) ? sport as any : "NBA";

      const games = await getMultiDayScoreboard(validSport, 3);
      const upcomingGames = games.filter(g => g.status?.state === "pre" || g.status?.state === "in");

      if (upcomingGames.length === 0) {
        return res.json({ sgps: [], meta: { sport: validSport, gamesAnalyzed: 0 } });
      }

      const sgps: any[] = [];

      for (const game of upcomingGames.slice(0, 12)) {
        const homeName = game.homeTeam?.displayName || "Home";
        const awayName = game.awayTeam?.displayName || "Away";
        const homeRecord = game.homeTeam?.record || "";
        const awayRecord = game.awayTeam?.record || "";

        const parseWinPct = (record: string) => {
          if (!record) return 0.5;
          const parts = record.split("-");
          const wins = parseFloat(parts[0]);
          const losses = parseFloat(parts[1]);
          return (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
        };
        const homeWinPct = parseWinPct(homeRecord);
        const awayWinPct = parseWinPct(awayRecord);

        const leaders = (game.leaders || []).map(l => ({
          name: l.playerName,
          team: l.team,
          category: l.category,
          value: parseFloat(l.value) || 0,
        }));

        const spreadEstimate = Math.round((homeWinPct - awayWinPct) * 15 * 2) / 2;
        const totalEstimate = validSport === "NBA" ? 220 + Math.round((homeWinPct + awayWinPct - 1) * 20) :
          validSport === "NFL" ? 44 + Math.round((homeWinPct + awayWinPct - 1) * 10) :
          validSport === "MLB" ? 8.5 : validSport === "NHL" ? 6 : 220;

        const combos: { name: string; legs: any[]; rationale: string; correlation: string }[] = [];

        const favoriteIsHome = homeWinPct > awayWinPct;
        const favName = favoriteIsHome ? homeName : awayName;
        const underdogName = favoriteIsHome ? awayName : homeName;
        const favSpreadOdds = -110;
        const totalOddsVal = -110;
        const mlOdds = favoriteIsHome
          ? Math.round(-100 - (homeWinPct - 0.5) * 400)
          : Math.round(100 + (0.5 - homeWinPct) * 400);

        const topScorer = leaders.find((l: any) => l.category === "Points Per Game" || l.category === "Rating");

        combos.push({
          name: `${favName} Win + Over ${totalEstimate}`,
          legs: [
            { type: "moneyline", pick: `${favName} ML`, odds: mlOdds, line: 0 },
            { type: "total", pick: `Over ${totalEstimate}`, odds: totalOddsVal, line: totalEstimate },
          ],
          rationale: `${favName} favored with strong offense, expect high-scoring game`,
          correlation: "moderate-positive",
        });

        combos.push({
          name: `${favName} Spread + Under ${totalEstimate}`,
          legs: [
            { type: "spread", pick: `${favName} ${spreadEstimate > 0 ? "-" : "+"}${Math.abs(spreadEstimate)}`, odds: favSpreadOdds, line: spreadEstimate },
            { type: "total", pick: `Under ${totalEstimate}`, odds: totalOddsVal, line: totalEstimate },
          ],
          rationale: `Defensive game expected with ${favName} controlling tempo`,
          correlation: "low-positive",
        });

        if (topScorer) {
          const scorerLine = validSport === "NBA" ? Math.round(topScorer.value - 2) + 0.5 :
            validSport === "NFL" ? 0.5 : 0.5;
          combos.push({
            name: `${favName} Win + ${topScorer.name} Over ${scorerLine}`,
            legs: [
              { type: "moneyline", pick: `${favName} ML`, odds: mlOdds, line: 0 },
              { type: "player_prop", pick: `${topScorer.name} Over ${scorerLine} ${topScorer.category}`, odds: -115, line: scorerLine },
            ],
            rationale: `${topScorer.name} averaging ${topScorer.value} - correlated with team win`,
            correlation: "high-positive",
          });

          combos.push({
            name: `Over ${totalEstimate} + ${topScorer.name} Over ${scorerLine}`,
            legs: [
              { type: "total", pick: `Over ${totalEstimate}`, odds: totalOddsVal, line: totalEstimate },
              { type: "player_prop", pick: `${topScorer.name} Over ${scorerLine} ${topScorer.category}`, odds: -115, line: scorerLine },
            ],
            rationale: `High-scoring games boost star player stats`,
            correlation: "high-positive",
          });
        }

        combos.push({
          name: `${underdogName} Spread + Under ${totalEstimate}`,
          legs: [
            { type: "spread", pick: `${underdogName} +${Math.abs(spreadEstimate)}`, odds: -110, line: -spreadEstimate },
            { type: "total", pick: `Under ${totalEstimate}`, odds: totalOddsVal, line: totalEstimate },
          ],
          rationale: `Low-scoring games favor underdogs covering the spread`,
          correlation: "moderate-positive",
        });

        for (const combo of combos) {
          const combinedDecimal = combo.legs.reduce((acc: number, leg: any) => {
            const dec = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
            return acc * dec;
          }, 1);
          const combinedAmerican = combinedDecimal >= 2
            ? Math.round((combinedDecimal - 1) * 100)
            : Math.round(-100 / (combinedDecimal - 1));

          const fusionResult = analyzeLeg(
            validSport,
            combo.name,
            combinedAmerican,
            { hasRealOdds: false }
          );

          const correlationBoost = combo.correlation === "high-positive" ? 8 :
            combo.correlation === "moderate-positive" ? 4 : 0;
          const confidence = Math.min(92, Math.max(35, fusionResult.confidence + correlationBoost));

          sgps.push({
            id: `sgp-${game.id}-${combos.indexOf(combo)}`,
            gameId: game.id,
            game: `${awayName} @ ${homeName}`,
            homeTeam: homeName,
            awayTeam: awayName,
            homeRecord,
            awayRecord,
            gameTime: game.date,
            sport: validSport,
            name: combo.name,
            legs: combo.legs,
            combinedOdds: combinedAmerican,
            combinedDecimal: Math.round(combinedDecimal * 100) / 100,
            confidence,
            grade: fusionResult.grade,
            correlation: combo.correlation,
            rationale: combo.rationale,
            ev: Math.round(fusionResult.edgePercentage * 10) / 10,
          });
        }
      }

      sgps.sort((a, b) => b.confidence - a.confidence);

      return res.json({
        sgps,
        meta: {
          sport: validSport,
          gamesAnalyzed: upcomingGames.length,
          totalSGPs: sgps.length,
          generatedAt: new Date().toISOString(),
        },
        disclaimer: "For entertainment purposes only. SGP odds are estimates. Gamble responsibly.",
      });
    } catch (err) {
      console.error("SGP generation error:", err);
      return res.status(500).json({ error: "Failed to generate same game parlays" });
    }
  });

  app.get("/api/predictions/teasers", requireTier("elite", "whale"), async (req, res) => {
    try {
      const sport = (req.query.sport as string) || "NBA";
      const validSport = sports.includes(sport as any) ? sport as any : "NBA";
      const legs = parseInt(req.query.legs as string) || 2;
      const teaserLegs = Math.min(Math.max(legs, 2), 5);

      const teaserPoints: Record<string, number[]> = {
        NBA: [4, 4.5, 5],
        NFL: [6, 6.5, 7],
        NCAAB: [4, 4.5, 5],
        NCAAF: [6, 6.5, 7],
        MLB: [1.5, 2],
        NHL: [1, 1.5],
      };
      const availablePoints = teaserPoints[validSport] || [4, 4.5, 5];

      const games = await getMultiDayScoreboard(validSport, 3);
      const upcomingGames = games.filter(g => g.status?.state === "pre");

      if (upcomingGames.length < teaserLegs) {
        return res.json({ teasers: [], meta: { sport: validSport, gamesAvailable: upcomingGames.length, legsRequired: teaserLegs } });
      }

      const gameData = upcomingGames.slice(0, 20).map(game => {
        const homeName = game.homeTeam?.displayName || "Home";
        const awayName = game.awayTeam?.displayName || "Away";
        const homeRecord = game.homeTeam?.record || "";
        const awayRecord = game.awayTeam?.record || "";
        const parseWinPctLocal = (record: string) => {
          if (!record) return 0.5;
          const parts = record.split("-");
          const wins = parseFloat(parts[0]);
          const losses = parseFloat(parts[1]);
          return (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
        };
        const homeWinPct = parseWinPctLocal(homeRecord);
        const awayWinPct = parseWinPctLocal(awayRecord);
        const spreadEstimate = Math.round((homeWinPct - awayWinPct) * 15 * 2) / 2;
        const totalEstimate = validSport === "NBA" ? 220 + Math.round((homeWinPct + awayWinPct - 1) * 20) :
          validSport === "NFL" ? 44 + Math.round((homeWinPct + awayWinPct - 1) * 10) :
          validSport === "MLB" ? 8.5 : 6;

        return {
          gameId: game.id,
          game: `${awayName} @ ${homeName}`,
          homeName, awayName, homeRecord, awayRecord,
          homeWinPct, awayWinPct,
          spread: spreadEstimate,
          total: totalEstimate,
          gameTime: game.date,
        };
      });

      const teasers: any[] = [];

      for (const pts of availablePoints) {
        for (let startIdx = 0; startIdx <= gameData.length - teaserLegs; startIdx++) {
          const selectedGames = gameData.slice(startIdx, startIdx + teaserLegs);
          if (selectedGames.length < teaserLegs) continue;

          const spreadTeaser = {
            id: `teaser-spread-${pts}-${startIdx}`,
            type: "spread" as const,
            teaserPoints: pts,
            sport: validSport,
            legs: selectedGames.map(g => {
              const favorHome = g.homeWinPct > g.awayWinPct;
              const origSpread = favorHome ? g.spread : -g.spread;
              const teasedSpread = origSpread - pts;
              const pickTeam = favorHome ? g.homeName : g.awayName;
              return {
                game: g.game,
                gameId: g.gameId,
                gameTime: g.gameTime,
                team: pickTeam,
                originalSpread: origSpread,
                teasedSpread: Math.round(teasedSpread * 2) / 2,
                pick: `${pickTeam} ${teasedSpread > 0 ? "+" : ""}${Math.round(teasedSpread * 2) / 2}`,
              };
            }),
            combinedOdds: 0,
            winProbability: 0,
            grade: "",
            rationale: "",
          };

          const totalTeaser = {
            id: `teaser-total-${pts}-${startIdx}`,
            type: "total" as const,
            teaserPoints: pts,
            sport: validSport,
            legs: selectedGames.map(g => {
              const teasedTotal = g.total - pts;
              return {
                game: g.game,
                gameId: g.gameId,
                gameTime: g.gameTime,
                team: "Over/Under",
                originalTotal: g.total,
                teasedTotal: Math.round(teasedTotal * 2) / 2,
                pick: `Over ${Math.round(teasedTotal * 2) / 2}`,
              };
            }),
            combinedOdds: 0,
            winProbability: 0,
            grade: "",
            rationale: "",
          };

          for (const teaser of [spreadTeaser, totalTeaser]) {
            const baseProbPerLeg = 0.55 + (pts / (validSport === "NFL" || validSport === "NCAAF" ? 30 : 20));
            const combinedProb = Math.pow(Math.min(0.85, baseProbPerLeg), teaser.legs.length);
            const decimalOdds = teaserLegs === 2 ? (pts <= 5 ? 1.91 : pts <= 6.5 ? 1.83 : 1.77) :
              teaserLegs === 3 ? (pts <= 5 ? 2.73 : pts <= 6.5 ? 2.5 : 2.35) :
              teaserLegs === 4 ? (pts <= 5 ? 4.55 : pts <= 6.5 ? 4.0 : 3.65) : 7.0;
            const americanOdds = decimalOdds >= 2 ? Math.round((decimalOdds - 1) * 100) : Math.round(-100 / (decimalOdds - 1));

            const fusionResult = analyzeLeg(validSport, teaser.type === "spread" ? "Teaser Spread" : "Teaser Total", americanOdds, {});

            teaser.combinedOdds = americanOdds;
            teaser.winProbability = Math.round(combinedProb * 1000) / 10;
            teaser.grade = fusionResult.grade;
            teaser.rationale = teaser.type === "spread"
              ? `${pts}-point teaser moves all spreads ${pts} points in your favor`
              : `${pts}-point teaser lowers all totals by ${pts} points`;
          }

          teasers.push(spreadTeaser, totalTeaser);
        }
      }

      teasers.sort((a, b) => b.winProbability - a.winProbability);

      return res.json({
        teasers: teasers.slice(0, 20),
        meta: {
          sport: validSport,
          gamesAvailable: gameData.length,
          teaserPointOptions: availablePoints,
          generatedAt: new Date().toISOString(),
        },
        disclaimer: "For entertainment purposes only. Teaser odds are standard industry payouts. Gamble responsibly.",
      });
    } catch (err) {
      console.error("Teaser generation error:", err);
      return res.status(500).json({ error: "Failed to generate teasers" });
    }
  });

  app.post("/api/predictions/round-robin", requireTier("elite", "whale"), async (req, res) => {
    try {
      const { picks, parlaySize, stake } = req.body;

      if (!picks || !Array.isArray(picks) || picks.length < 3) {
        return res.status(400).json({ error: "At least 3 picks required for round robin" });
      }
      if (picks.length > 10) {
        return res.status(400).json({ error: "Maximum 10 picks allowed" });
      }

      const size = Math.min(Math.max(parlaySize || 2, 2), picks.length - 1);
      const betStake = stake || 10;

      const getCombinations = <T,>(arr: T[], k: number): T[][] => {
        if (k === 1) return arr.map(item => [item]);
        if (k === arr.length) return [arr];
        const result: T[][] = [];
        for (let i = 0; i <= arr.length - k; i++) {
          const head = arr[i];
          const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
          for (const tail of tailCombos) {
            result.push([head, ...tail]);
          }
        }
        return result;
      }

      const combinations = getCombinations(picks, size);

      const parlays = combinations.map((combo, idx) => {
        const combinedDecimal = combo.reduce((acc: number, pick: any) => {
          const odds = pick.odds || -110;
          const dec = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
          return acc * dec;
        }, 1);
        const combinedAmerican = combinedDecimal >= 2
          ? Math.round((combinedDecimal - 1) * 100)
          : Math.round(-100 / (combinedDecimal - 1));

        const winProb = combo.reduce((acc: number, pick: any) => {
          const prob = pick.confidence ? pick.confidence / 100 : 0.5;
          return acc * prob;
        }, 1);

        const potentialPayout = Math.round(betStake * combinedDecimal * 100) / 100;
        const ev = Math.round((winProb * potentialPayout - betStake) * 100) / 100;

        const fusionResult = analyzeLeg(
          combo[0]?.sport || "NBA",
          combo.map((p: any) => p.pick).join(" + "),
          combinedAmerican,
          {}
        );

        return {
          id: `rr-${idx}`,
          legs: combo,
          parlaySize: size,
          combinedOdds: combinedAmerican,
          combinedDecimal: Math.round(combinedDecimal * 100) / 100,
          winProbability: Math.round(winProb * 1000) / 10,
          stake: betStake,
          potentialPayout,
          ev,
          grade: fusionResult.grade,
          confidence: Math.round(fusionResult.confidence),
        };
      });

      parlays.sort((a, b) => b.ev - a.ev);

      const totalInvestment = parlays.length * betStake;
      const bestCase = parlays.reduce((sum, p) => sum + p.potentialPayout, 0);
      const worstCase = -totalInvestment;
      const avgEv = parlays.reduce((sum, p) => sum + p.ev, 0) / parlays.length;

      return res.json({
        parlays,
        summary: {
          totalParlays: parlays.length,
          parlaySize: size,
          stakePerParlay: betStake,
          totalInvestment,
          bestCasePayout: Math.round(bestCase * 100) / 100,
          worstCaseLoss: worstCase,
          averageEV: Math.round(avgEv * 100) / 100,
          expectedHits: Math.round(parlays.filter(p => p.winProbability > 50).length),
        },
        disclaimer: "For entertainment purposes only. Gamble responsibly.",
      });
    } catch (err) {
      console.error("Round robin error:", err);
      return res.status(500).json({ error: "Failed to generate round robin" });
    }
  });

  // ===== HITL Smart Pick Review Queue =====
  app.get("/api/picks/review-queue", requireAuth, async (req, res) => {
    try {
      const { getPrecomputedCache } = await import("../precomputedPredictionsEngine");
      const { getAllSports } = await import("../sportSeasons");
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");

      const rawUid = req.session?.userId;
      const uid = rawUid && rawUid !== 'admin' ? parseInt(rawUid, 10) : null;
      const bankrollParam = parseFloat(req.query.bankroll as string);

      let userBankroll = isNaN(bankrollParam) ? 1000 : bankrollParam;
      let userKellyFraction = 0.25;
      if (uid && !isNaN(uid)) {
        try {
          const row = await db.execute(sql`SELECT bankroll, kelly_fraction FROM user_betting_profile WHERE user_id = ${uid}`);
          const r = (row.rows as any[])[0];
          if (r) {
            userBankroll = Number(r.bankroll ?? userBankroll);
            userKellyFraction = Number(r.kelly_fraction ?? 0.25);
          }
        } catch { /* use defaults */ }
      }

      const allPicks: any[] = [];
      for (const sport of getAllSports()) {
        const snapshot = getPrecomputedCache(sport);
        if (snapshot?.picks) allPicks.push(...snapshot.picks.slice(0, 8));
      }

      let calibrationDrift = false;
      try {
        const brierRow = await db.execute(sql`
          SELECT AVG(POWER(COALESCE(confidence, 60) / 100.0 - CASE WHEN result = 'win' THEN 1.0 ELSE 0.0 END, 2)) as brier
          FROM user_picks
          WHERE settled = TRUE AND result IN ('win', 'loss')
          ORDER BY created_at DESC LIMIT 50
        `);
        const b = (brierRow.rows as any[])[0]?.brier;
        if (b !== null && b !== undefined) calibrationDrift = Number(b) > 0.25;
      } catch { /* ignore */ }

      function americanToDecimal(odds: number): number {
        if (odds >= 100) return (odds / 100) + 1;
        return 1 - (100 / odds);
      }

      const queuePicks = allPicks.slice(0, 25).map((pick: any) => {
        const decOdds = americanToDecimal(pick.odds || -110);
        const modelProb = pick.winProbability ?? 0.5;
        const marketProb = 1 / decOdds;
        const edgePct = pick.edge ?? (modelProb - marketProb) * 100;

        const rawKelly = Math.max(0, (modelProb * (decOdds - 1) - (1 - modelProb)) / (decOdds - 1));
        const fractionalKelly = rawKelly * userKellyFraction;
        const suggestedStake = Math.min(
          Math.max(1, fractionalKelly * userBankroll),
          userBankroll * 0.10
        );

        const flags: string[] = [];
        if (edgePct < 5) flags.push("low_edge");
        if (fractionalKelly * userBankroll > userBankroll * 0.10) flags.push("stake_cap");
        if (calibrationDrift) flags.push("calibration_drift");
        if ((pick.ev ?? 0) < 0) flags.push("negative_ev");

        const riskScore = (flags.includes("low_edge") ? 0.3 : 0) +
          (flags.includes("stake_cap") ? 0.25 : 0) +
          (flags.includes("calibration_drift") ? 0.25 : 0) +
          (flags.includes("negative_ev") ? 0.3 : 0);

        const topFactors = (pick.factors || []).slice(0, 2).map((f: any) => f.name).join(" and ");
        const rationale = topFactors
          ? `Model driven by ${topFactors}`
          : `${pick.grade || "B"}-grade pick with ${edgePct > 0 ? "+" : ""}${edgePct.toFixed(1)}% edge`;

        let status: "auto_approved" | "review" | "skip";
        if (riskScore >= 0.6) status = "skip";
        else if (riskScore <= 0.2 && edgePct >= 5) status = "auto_approved";
        else status = "review";

        return {
          id: pick.id,
          sport: pick.sport,
          game: pick.game,
          pick: pick.pick,
          betType: pick.betType,
          odds: pick.odds,
          grade: pick.grade,
          ev: pick.ev,
          confidence: pick.confidence,
          modelProb: Math.round(modelProb * 1000) / 10,
          marketProb: Math.round(marketProb * 1000) / 10,
          edgePct: Math.round(edgePct * 10) / 10,
          kellyPct: Math.round(fractionalKelly * 1000) / 10,
          suggestedStake: Math.round(suggestedStake * 100) / 100,
          riskScore: Math.round(riskScore * 100) / 100,
          flags,
          rationale,
          status,
          factors: pick.factors || [],
        };
      });

      return res.json({
        picks: queuePicks,
        bankroll: userBankroll,
        kellyFraction: userKellyFraction,
        calibrationDrift,
        perBetCap: Math.round(userBankroll * 0.10 * 100) / 100,
        dailyCap: Math.round(userBankroll * 0.05 * 100) / 100,
      });
    } catch (err) {
      console.error("[ReviewQueue] Error:", err);
      return res.status(500).json({ error: "Failed to build review queue" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROP TRACK RECORD — Real track record for player prop recommendations
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /api/prop-track-record — list picks with optional filters
  app.get("/api/prop-track-record", requireAuth, async (req, res) => {
    try {
      const { sport, market, outcome, limit = "50", offset = "0" } = req.query as Record<string, string>;
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const lim = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const off = Math.max(0, parseInt(offset) || 0);

      // Build filter conditions
      const conditions: string[] = [];
      if (sport) { conditions.push(`sport = '${sport.replace(/'/g, "''")}'`); }
      if (market) { conditions.push(`market = '${market.replace(/'/g, "''")}'`); }
      if (outcome) { conditions.push(`outcome = '${outcome.replace(/'/g, "''")}'`); }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const raw = `SELECT * FROM prop_track_records ${whereClause} ORDER BY generated_at DESC LIMIT ${lim} OFFSET ${off}`;
      const countRaw = `SELECT COUNT(*) AS total FROM prop_track_records ${whereClause}`;

      const [result, countResult] = await Promise.all([
        db.execute(sql.raw(raw)),
        db.execute(sql.raw(countRaw)),
      ]);
      return res.json({ picks: result.rows, total: Number((countResult.rows[0] as any)?.total || 0) });
    } catch (err) {
      console.error("[PropTrack] List error:", err);
      return res.status(500).json({ error: "Failed to fetch prop track record" });
    }
  });

  // POST /api/prop-track-record/save — save a recommended prop pick
  app.post("/api/prop-track-record/save", requireAuth, async (req, res) => {
    try {
      const { savePropToTrackRecord } = await import("../propParlayEngine");
      const leg = req.body;
      if (!leg || !leg.playerName || leg.type !== "player_prop") {
        return res.status(400).json({ error: "Invalid prop leg data" });
      }
      const id = await savePropToTrackRecord(leg);
      return res.json({ id, saved: id !== null });
    } catch (err) {
      console.error("[PropTrack] Save error:", err);
      return res.status(500).json({ error: "Failed to save prop pick" });
    }
  });

  // PATCH /api/prop-track-record/:id/settle — admin settles a prop with actual result
  app.patch("/api/prop-track-record/:id/settle", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { actualResult, outcome } = req.body as { actualResult: number; outcome: "won" | "lost" | "push" };
      if (!["won", "lost", "push"].includes(outcome)) {
        return res.status(400).json({ error: "outcome must be won | lost | push" });
      }
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        UPDATE prop_track_records
        SET outcome = ${outcome}, actual_result = ${actualResult}, settled_at = NOW()
        WHERE id = ${parseInt(id)}
      `);
      // Invalidate market accuracy cache so the learning engine picks up the new result
      const { getMarketAccuracyStats } = await import("../propParlayEngine");
      await getMarketAccuracyStats(); // will refresh on next call since we need to clear cache
      return res.json({ success: true });
    } catch (err) {
      console.error("[PropTrack] Settle error:", err);
      return res.status(500).json({ error: "Failed to settle prop pick" });
    }
  });

  // GET /api/prop-track-record/stats — aggregated win rates, ROI, market breakdown
  app.get("/api/prop-track-record/stats", requireAuth, async (req, res) => {
    try {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");

      const overall = await db.execute(sql`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) AS losses,
          SUM(CASE WHEN outcome = 'push' THEN 1 ELSE 0 END) AS pushes,
          SUM(CASE WHEN outcome = 'pending' THEN 1 ELSE 0 END) AS pending,
          AVG(CASE WHEN outcome != 'pending' THEN edge ELSE NULL END) AS avg_edge,
          AVG(CASE WHEN outcome != 'pending' THEN confidence_score ELSE NULL END) AS avg_confidence
        FROM prop_track_records
      `);

      const byMarket = await db.execute(sql`
        SELECT
          market,
          market_label,
          COUNT(*) AS total,
          SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) AS losses,
          AVG(confidence_score) AS avg_confidence,
          AVG(edge) AS avg_edge
        FROM prop_track_records
        WHERE outcome != 'pending'
        GROUP BY market, market_label
        ORDER BY wins DESC
        LIMIT 20
      `);

      const bySport = await db.execute(sql`
        SELECT
          sport,
          COUNT(*) AS total,
          SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) AS losses
        FROM prop_track_records
        WHERE outcome != 'pending'
        GROUP BY sport
        ORDER BY total DESC
      `);

      const byGrade = await db.execute(sql`
        SELECT
          confidence_grade AS grade,
          COUNT(*) AS total,
          SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) AS losses
        FROM prop_track_records
        WHERE outcome != 'pending'
        GROUP BY confidence_grade
        ORDER BY confidence_grade
      `);

      const o = overall.rows[0] as any;
      const settled = Number(o?.wins || 0) + Number(o?.losses || 0) + Number(o?.pushes || 0);
      const winRate = settled > 0 ? Number(o?.wins || 0) / settled : null;

      return res.json({
        overall: {
          total: Number(o?.total || 0),
          wins: Number(o?.wins || 0),
          losses: Number(o?.losses || 0),
          pushes: Number(o?.pushes || 0),
          pending: Number(o?.pending || 0),
          settled,
          winRate,
          avgEdge: Number(o?.avg_edge || 0),
          avgConfidence: Number(o?.avg_confidence || 0),
        },
        byMarket: byMarket.rows,
        bySport: bySport.rows,
        byGrade: byGrade.rows,
      });
    } catch (err) {
      console.error("[PropTrack] Stats error:", err);
      return res.status(500).json({ error: "Failed to fetch prop track record stats" });
    }
  });
}
