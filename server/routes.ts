import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { evaluateRequestSchema, generateParlaysRequestSchema, sports } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { getOddsForSport, refreshOddsForSport, eventsToLegs } from "./odds-provider";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.warn("Warning: ADMIN_USERNAME and ADMIN_PASSWORD not set. Auth will fail until configured.");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAuthenticated = true;
      req.session.username = username;
      return res.json({ success: true, username });
    }
    
    return res.status(401).json({ error: "Invalid username or password" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    if (req.session?.isAuthenticated) {
      return res.json({ authenticated: true, username: req.session.username });
    }
    return res.json({ authenticated: false });
  });

  app.get("/api/sports", (_req, res) => {
    const sportsList = sports.map((sport) => ({
      id: sport,
      name: sport,
      available: true,
    }));
    res.json(sportsList);
  });

  app.get("/api/odds", (req, res) => {
    try {
      const sport = req.query.sport as string;
      
      if (!sport || !sports.includes(sport as any)) {
        return res.status(400).json({
          error: "Invalid sport",
          validSports: sports,
        });
      }

      const events = getOddsForSport(sport as any);
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

  app.post("/api/generate-parlays", async (req, res) => {
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

      let events = getOddsForSport(sport);
      
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

  app.post("/api/evaluate", async (req, res) => {
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

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
