import type { Express } from "express";
import { requireAuth } from "./helpers";
import { omnidlosClient } from "../services/omnidlos-client";
import { pool } from "../db";

export function registerEcosystemRoutes(app: Express): void {
  /**
   * POST /api/ecosystem/link-account
   * Link a 4everacy account to the current Sors Maxima user.
   */
  app.post("/api/ecosystem/link-account", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { externalUserId, platform, accessToken, refreshToken } = req.body;

      if (!externalUserId || !platform || !accessToken) {
        return res.status(400).json({ error: "externalUserId, platform, and accessToken are required" });
      }

      const result = await omnidlosClient.linkAccount(
        userId,
        externalUserId,
        platform,
        accessToken,
        refreshToken
      );

      // Send linking event to OmniDLOS
      await omnidlosClient.sendEvent({
        type: "risk_tolerance_change",
        userId,
        timestamp: new Date().toISOString(),
        payload: { action: "account_linked", platform },
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[Ecosystem] link-account error:", err.message);
      return res.status(500).json({ error: "Failed to link account" });
    }
  });

  /**
   * GET /api/ecosystem/context
   * Get enriched user context from the OmniDLOS bridge.
   */
  app.get("/api/ecosystem/context", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Look up the linked external user ID
      const link = await pool.query(
        `SELECT external_user_id FROM ecosystem_links
         WHERE user_id = $1 ORDER BY linked_at DESC LIMIT 1`,
        [userId]
      );

      if (link.rows.length === 0) {
        return res.status(404).json({ error: "No linked ecosystem account found" });
      }

      const context = await omnidlosClient.getUserContext(userId, link.rows[0].external_user_id);
      return res.json(context);
    } catch (err: any) {
      console.error("[Ecosystem] context error:", err.message);
      return res.status(500).json({ error: "Failed to fetch ecosystem context" });
    }
  });

  /**
   * POST /api/ecosystem/sync-achievements
   * Push unsynced achievements to 4everacy.
   */
  app.post("/api/ecosystem/sync-achievements", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await omnidlosClient.syncAchievements(userId);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[Ecosystem] sync-achievements error:", err.message);
      return res.status(500).json({ error: "Failed to sync achievements" });
    }
  });

  /**
   * GET /api/ecosystem/momentum-boost
   * Calculate sports contribution to Life Momentum score.
   */
  app.get("/api/ecosystem/momentum-boost", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const boost = await omnidlosClient.calculateMomentumBoost(userId);
      return res.json(boost);
    } catch (err: any) {
      console.error("[Ecosystem] momentum-boost error:", err.message);
      return res.status(500).json({ error: "Failed to calculate momentum boost" });
    }
  });
}
