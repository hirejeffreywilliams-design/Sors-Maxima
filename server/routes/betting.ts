import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { requireAdmin, requireAuth, requireTier, getClientIp, idempotencyMiddleware, creditUsageTracker, formatUptime } from "./helpers";
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

  app.post("/api/odds/refresh", (req, res) => {
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

  app.get("/api/market-snapshot", async (req, res) => {
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

  app.post("/api/generate-tickets", requireTier("pro", "elite", "whale"), async (req, res) => {
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
          note: "Odds and game data sourced from ESPN. Analysis is model-estimated, not guaranteed.",
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

  app.post("/api/recalculate-predictions", requireTier("pro", "elite", "whale"), async (req, res) => {
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
          note: "Odds and game data sourced from ESPN. Analysis is model-estimated, not guaranteed.",
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
      const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
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

  app.post("/api/generate-parlays", requireTier("pro", "elite", "whale"), idempotencyMiddleware, async (req, res) => {
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

  app.post("/api/evaluate", requireTier("pro", "elite", "whale"), idempotencyMiddleware, async (req, res) => {
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

  app.post("/api/grade-parlay", requireTier("pro", "elite", "whale"), async (req, res) => {
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

  liveSportsData.startSimulation();

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
          } catch {}
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
          } catch {}
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
            } catch {}
          }

          try {
            const allInj = await getAllInjuries();
            const injuries = allInj[sport] || [];
            const criticalCount = injuries.filter((inj: any) =>
              inj.injuries?.some((p: any) => p.status === "Out" || p.status === "Doubtful")
            ).length;
            injuryScore = Math.min(100, criticalCount * 10);
          } catch {}
        } catch {}
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
              const jitter = 1 + (deterministicValue(`${player.id}-${cat}`, 0, 0.3) - 0.15);
              const projected = Math.round(baseValue * jitter * 10) / 10;
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

          const baseVal = defaults[categories[0]] || 10;
          const last5 = Array.from({ length: 5 }, (_, i) =>
            Math.round((baseVal + (deterministicValue(`${player.id}-last5-${i}`, 0, baseVal * 0.4) - baseVal * 0.2)) * 10) / 10
          );
          const seasonAvg = Math.round(baseVal * 10) / 10;
          const vsOpponent = Array.from({ length: 4 }, (_, i) =>
            Math.round((baseVal * 1.05 + (deterministicValue(`${player.id}-vs-${i}`, 0, baseVal * 0.3) - baseVal * 0.15)) * 10) / 10
          );
          const projections = Array.from({ length: 4 }, (_, i) =>
            Math.round((baseVal * 1.02 + (deterministicValue(`${player.id}-proj-${i}`, 0, baseVal * 0.2) - baseVal * 0.1)) * 10) / 10
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

            const jitter = 1 + (deterministicValue(`${player.id}-${propType}-jitter`, 0, 0.3) - 0.15);
            const projection = Math.round(baseValue * jitter * 10) / 10;
            const line = Math.round(baseValue * 0.95 * 2) / 2;
            const diff = projection - line;
            const confidence = Math.min(85, Math.max(45, 55 + Math.abs(diff) * 4));
            const edge = Math.round(((projection - line) / line) * 100 * 10) / 10;

            const seasonAvg = Math.round(baseValue * 10) / 10;
            const last5Avg = Math.round((baseValue * (1 + deterministicValue(`${player.id}-${propType}-l5`, 0, 0.2) - 0.1)) * 10) / 10;
            const last10Avg = Math.round((baseValue * (1 + deterministicValue(`${player.id}-${propType}-l10`, 0, 0.1) - 0.05)) * 10) / 10;
            const high = Math.round(baseValue * 1.8);
            const low = Math.round(baseValue * 0.3);

            const recommendation = edge > 8 ? "strong_over" :
              edge > 3 ? "lean_over" :
              edge < -8 ? "strong_under" :
              edge < -3 ? "lean_under" : "neutral";

            const overHitRate = Math.round(50 + edge * 2);
            const recentResults = Array.from({ length: 5 }, (_, i) =>
              Math.round(baseValue + (deterministicValue(`${player.id}-${propType}-recent-${i}`, 0, baseValue * 0.5) - baseValue * 0.25))
            );

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
              overOdds: -110 + Math.round(deterministicValue(`${player.id}-${propType}-overOdds`, 0, 20) - 10),
              underOdds: -110 + Math.round(deterministicValue(`${player.id}-${propType}-underOdds`, 0, 20) - 10),
              stats: {
                seasonAvg,
                last5Avg,
                last10Avg,
                high,
                low,
                gamesPlayed: Math.round(20 + deterministicValue(`${player.id}-gp`, 0, 40)),
                consistency: Math.round(55 + deterministicValue(`${player.id}-cons`, 0, 30)),
              },
              vsOpponentHistory: {
                games: Math.round(3 + deterministicValue(`${player.id}-vsGames`, 0, 7)),
                avg: Math.round((baseValue * 1.05) * 10) / 10,
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
                {
                  type: "Form",
                  impact: last5Avg > seasonAvg ? "positive" : "negative",
                  description: `L5 avg ${last5Avg} vs season ${seasonAvg}`,
                  weight: Math.round(Math.abs(last5Avg - seasonAvg) * 3),
                },
              ],
              projection,
              confidence: Math.round(confidence),
              edge,
              recommendation,
              hotStreak: last5Avg > seasonAvg * 1.1,
              coldStreak: last5Avg < seasonAvg * 0.9,
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
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const bets = userDataEngine.getBets();
      const stats = userDataEngine.getBetStats();

      const systemPrompt = `You are Sors Maxima's betting intelligence assistant. You help users with sports betting analysis, strategy, and bankroll management.

User's betting stats:
- Total bets tracked: ${stats.totalBets}
- Win rate: ${stats.winRate.toFixed(1)}%
- ROI: ${stats.roi.toFixed(1)}%
- Total profit: $${stats.totalProfit.toFixed(2)}
- Recent bets: ${bets.slice(-5).map(b => `${b.sport} ${b.result}`).join(', ')}

Be concise, data-driven, and honest. If you don't have enough data to make a recommendation, say so. Never guarantee outcomes. Always emphasize responsible gambling.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_completion_tokens: 500,
      });

      res.json({ response: completion.choices[0]?.message?.content || "I couldn't generate a response." });
    } catch (e: any) {
      console.error("AI chat error:", e.message);
      res.json({ response: "AI assistant is currently unavailable. Please check your API configuration.", error: true });
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
}
