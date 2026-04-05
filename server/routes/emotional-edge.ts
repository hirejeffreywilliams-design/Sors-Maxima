import type { Express } from "express";
import { requireAuth } from "./helpers";
import { emotionalEdgeService, type EmotionalState } from "../services/emotional-edge";

const VALID_EMOTIONS: EmotionalState[] = [
  "euphoria", "anxiety", "confidence", "frustration", "calm", "excitement",
  "fear", "hope", "anger", "relief", "desperation", "boredom", "greed",
  "regret", "focus", "impulsiveness", "resignation", "vindictiveness",
  "gratitude", "apathy",
];

export function registerEmotionalEdgeRoutes(app: Express): void {
  /**
   * GET /api/emotional-edge/status
   * Current emotional assessment for the authenticated user.
   */
  app.get("/api/emotional-edge/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const confidence = req.query.confidence ? Number(req.query.confidence) : 0.7;
      const assessment = await emotionalEdgeService.getAssessment(userId, confidence);
      return res.json(assessment);
    } catch (err: any) {
      console.error("[EmotionalEdge] status error:", err.message);
      return res.status(500).json({ error: "Failed to get emotional status" });
    }
  });

  /**
   * POST /api/emotional-edge/snapshot
   * Record an emotional state snapshot.
   */
  app.post("/api/emotional-edge/snapshot", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { emotion, intensity, source } = req.body;

      if (!emotion || !VALID_EMOTIONS.includes(emotion)) {
        return res.status(400).json({
          error: `Invalid emotion. Must be one of: ${VALID_EMOTIONS.join(", ")}`,
        });
      }

      if (typeof intensity !== "number" || intensity < 0 || intensity > 1) {
        return res.status(400).json({ error: "Intensity must be a number between 0 and 1" });
      }

      const result = await emotionalEdgeService.recordSnapshot(userId, emotion, intensity, source);
      const assessment = await emotionalEdgeService.getAssessment(userId);

      return res.json({
        success: true,
        snapshotId: result.id,
        coolDownTriggered: result.coolDownTriggered,
        assessment,
      });
    } catch (err: any) {
      console.error("[EmotionalEdge] snapshot error:", err.message);
      return res.status(500).json({ error: "Failed to record emotional snapshot" });
    }
  });

  /**
   * GET /api/emotional-edge/correlation
   * Historical correlation between emotional states and prediction outcomes.
   */
  app.get("/api/emotional-edge/correlation", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const correlations = await emotionalEdgeService.getCorrelation(userId);
      return res.json({ correlations });
    } catch (err: any) {
      console.error("[EmotionalEdge] correlation error:", err.message);
      return res.status(500).json({ error: "Failed to get correlation data" });
    }
  });

  /**
   * GET /api/emotional-edge/clarity-score
   * Calculate the Decision Clarity Score for current state.
   */
  app.get("/api/emotional-edge/clarity-score", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const confidence = req.query.confidence ? Number(req.query.confidence) : 0.7;
      const assessment = await emotionalEdgeService.getAssessment(userId, confidence);
      return res.json({
        clarityScore: assessment.clarityScore,
        emotion: assessment.currentEmotion,
        intensity: assessment.intensity,
        coolDownActive: assessment.coolDownActive,
      });
    } catch (err: any) {
      console.error("[EmotionalEdge] clarity-score error:", err.message);
      return res.status(500).json({ error: "Failed to calculate clarity score" });
    }
  });
}
