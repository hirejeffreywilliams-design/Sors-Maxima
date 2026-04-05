import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "./helpers";
import {
  getReplay,
  getFactorAttributions,
  runWhatIf,
  getFactorAccuracy,
} from "../services/quantum-replay";

const whatIfSchema = z.object({
  modifiedFactors: z.record(z.string(), z.number().min(0).max(1)),
});

export function registerQuantumReplayRoutes(app: Express): void {
  // Full replay for a prediction
  app.get("/api/replay/:predictionId", requireAuth, async (req, res) => {
    try {
      const predictionId = parseInt(req.params.predictionId, 10);
      if (isNaN(predictionId)) return res.status(400).json({ error: "Invalid prediction ID" });

      const replay = await getReplay(predictionId);
      return res.json(replay);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Factor attributions for a prediction
  app.get("/api/replay/:predictionId/factors", requireAuth, async (req, res) => {
    try {
      const predictionId = parseInt(req.params.predictionId, 10);
      if (isNaN(predictionId)) return res.status(400).json({ error: "Invalid prediction ID" });

      const factors = await getFactorAttributions(predictionId);
      return res.json(factors);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Run a what-if scenario
  app.post("/api/replay/:predictionId/what-if", requireAuth, async (req, res) => {
    try {
      const predictionId = parseInt(req.params.predictionId, 10);
      if (isNaN(predictionId)) return res.status(400).json({ error: "Invalid prediction ID" });

      const body = whatIfSchema.parse(req.body);
      const result = await runWhatIf(predictionId, body.modifiedFactors);
      return res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: err.errors });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // Historical factor accuracy
  app.get("/api/replay/factor-accuracy", requireAuth, async (req, res) => {
    try {
      const accuracy = await getFactorAccuracy();
      return res.json(accuracy);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
