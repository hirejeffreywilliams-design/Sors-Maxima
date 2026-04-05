import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "./helpers";
import {
  createChain,
  listChains,
  joinChain,
  submitPrediction,
  getChainStatus,
  getLeaderboard,
} from "../services/momentum-chain";

const createChainSchema = z.object({
  name: z.string().min(1).max(100),
  sport: z.string().min(1).max(50),
  maxMembers: z.number().int().min(2).max(50).optional(),
});

const submitPredictionSchema = z.object({
  prediction: z.string().min(1).max(500),
});

export function registerMomentumChainRoutes(app: Express): void {
  // Create a new prediction chain
  app.post("/api/chains", requireAuth, async (req, res) => {
    try {
      const body = createChainSchema.parse(req.body);
      const userId = parseInt(req.session.userId ?? "0", 10);
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const chain = await createChain({
        name: body.name,
        creatorId: userId,
        sport: body.sport,
        maxMembers: body.maxMembers,
      });

      return res.status(201).json(chain);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: err.errors });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // List chains with optional filter
  app.get("/api/chains", requireAuth, async (req, res) => {
    try {
      const filter = req.query.filter as "open" | "active" | "completed" | undefined;
      if (filter && !["open", "active", "completed"].includes(filter)) {
        return res.status(400).json({ error: "Invalid filter. Use: open, active, completed" });
      }
      const chains = await listChains(filter);
      return res.json(chains);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Join a chain
  app.post("/api/chains/:id/join", requireAuth, async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      if (isNaN(chainId)) return res.status(400).json({ error: "Invalid chain ID" });

      const userId = parseInt(req.session.userId ?? "0", 10);
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const member = await joinChain(chainId, userId);
      return res.status(201).json(member);
    } catch (err: any) {
      if (err.message === "Chain not found") return res.status(404).json({ error: err.message });
      if (err.message === "Chain is not open for joining" || err.message === "Chain is full" || err.message === "Already a member of this chain") {
        return res.status(409).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // Submit a prediction to a chain
  app.post("/api/chains/:id/predict", requireAuth, async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      if (isNaN(chainId)) return res.status(400).json({ error: "Invalid chain ID" });

      const userId = parseInt(req.session.userId ?? "0", 10);
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const body = submitPredictionSchema.parse(req.body);
      const prediction = await submitPrediction(chainId, userId, body.prediction);
      return res.status(201).json(prediction);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: err.errors });
      }
      if (err.message === "Not a member of this chain") return res.status(403).json({ error: err.message });
      if (err.message === "Chain not found") return res.status(404).json({ error: err.message });
      if (err.message === "Chain is completed") return res.status(409).json({ error: err.message });
      return res.status(500).json({ error: err.message });
    }
  });

  // Get chain status
  app.get("/api/chains/:id/status", requireAuth, async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      if (isNaN(chainId)) return res.status(400).json({ error: "Invalid chain ID" });

      const status = await getChainStatus(chainId);
      return res.json(status);
    } catch (err: any) {
      if (err.message === "Chain not found") return res.status(404).json({ error: err.message });
      return res.status(500).json({ error: err.message });
    }
  });

  // Leaderboard
  app.get("/api/chains/leaderboard", requireAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const leaderboard = await getLeaderboard(limit);
      return res.json(leaderboard);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
