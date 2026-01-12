import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { evaluateRequestSchema, generateParlaysRequestSchema, sports } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { getOddsForSport, refreshOddsForSport, eventsToLegs } from "./odds-provider";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

      const { sport, stake, minLegs, maxLegs, bankroll, riskLevel, topN } =
        parseResult.data;

      const events = getOddsForSport(sport);
      const legs = eventsToLegs(events);

      if (legs.length < minLegs) {
        return res.status(400).json({
          error: "Not enough betting options available",
          available: legs.length,
          required: minLegs,
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
