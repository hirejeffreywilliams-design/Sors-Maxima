/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import type { Express } from "express";
import { crossPlatformBridge } from "../crossPlatformBridge";

export function registerCrossPlatformBridgeRoutes(app: Express): void {
  // ── Sync ───────────────────────────────────────────────────────────────

  app.post("/api/bridge/sync", (req, res) => {
    try {
      const { type, sourcePlatform, targetPlatform, userId, payload } = req.body;
      if (!type || !sourcePlatform || !targetPlatform || !userId || !payload) {
        return res.status(400).json({ error: "type, sourcePlatform, targetPlatform, userId, and payload required" });
      }
      const signal = crossPlatformBridge.sendSignal({ type, sourcePlatform, targetPlatform, userId, payload });
      if (!signal) return res.status(403).json({ error: "Signal blocked by data sovereignty controls" });
      res.status(201).json(signal);
    } catch (err) {
      console.error("[CrossPlatformBridge] Sync error:", err);
      res.status(500).json({ error: "Failed to sync signal" });
    }
  });

  app.post("/api/bridge/sync/acknowledge", (req, res) => {
    try {
      const { signalId, userId } = req.body;
      if (!signalId || !userId) return res.status(400).json({ error: "signalId and userId required" });
      const acknowledged = crossPlatformBridge.acknowledgeSignal(signalId, userId);
      if (!acknowledged) return res.status(404).json({ error: "Signal not found" });
      res.json({ acknowledged: true });
    } catch (err) {
      console.error("[CrossPlatformBridge] Acknowledge error:", err);
      res.status(500).json({ error: "Failed to acknowledge signal" });
    }
  });

  app.get("/api/bridge/sync/pending/:userId", (req, res) => {
    try {
      const { platform } = req.query;
      if (!platform) return res.status(400).json({ error: "platform query param required" });
      const signals = crossPlatformBridge.getPendingSignals(req.params.userId, platform as any);
      res.json(signals);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get pending error:", err);
      res.status(500).json({ error: "Failed to get pending signals" });
    }
  });

  // ── Status ─────────────────────────────────────────────────────────────

  app.get("/api/bridge/status/:userId", (req, res) => {
    try {
      const status = crossPlatformBridge.getSyncStatus(req.params.userId);
      res.json(status);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get status error:", err);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // ── Permissions (Data Sovereignty) ─────────────────────────────────────

  app.get("/api/bridge/permissions/:userId", (req, res) => {
    try {
      const permissions = crossPlatformBridge.getPermissions(req.params.userId);
      if (!permissions) return res.status(404).json({ error: "No permissions configured" });
      res.json(permissions);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get permissions error:", err);
      res.status(500).json({ error: "Failed to get permissions" });
    }
  });

  app.put("/api/bridge/permissions/:userId", (req, res) => {
    try {
      const { permissions, dataRetentionDays, shareEmotionalData, shareLifeContext, shareBettingActivity, shareVibeCredits } = req.body;
      if (!permissions) return res.status(400).json({ error: "permissions array required" });
      const controls = crossPlatformBridge.setPermissions(req.params.userId, {
        permissions,
        dataRetentionDays: dataRetentionDays ?? 90,
        shareEmotionalData: shareEmotionalData ?? true,
        shareLifeContext: shareLifeContext ?? false,
        shareBettingActivity: shareBettingActivity ?? false,
        shareVibeCredits: shareVibeCredits ?? true,
      });
      res.json(controls);
    } catch (err) {
      console.error("[CrossPlatformBridge] Set permissions error:", err);
      res.status(500).json({ error: "Failed to set permissions" });
    }
  });

  // ── Life Context ───────────────────────────────────────────────────────

  app.get("/api/bridge/life-context/:userId", (req, res) => {
    try {
      const context = crossPlatformBridge.getLifeContext(req.params.userId);
      if (!context) return res.status(404).json({ error: "No life context recorded" });
      res.json(context);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get life context error:", err);
      res.status(500).json({ error: "Failed to get life context" });
    }
  });

  app.post("/api/bridge/life-context/:userId", (req, res) => {
    try {
      const { stressLevel, sleepQuality, energyLevel, majorEvents } = req.body;
      if (stressLevel === undefined || sleepQuality === undefined || energyLevel === undefined) {
        return res.status(400).json({ error: "stressLevel, sleepQuality, and energyLevel required" });
      }
      const result = crossPlatformBridge.updateLifeContext(req.params.userId, {
        stressLevel,
        sleepQuality,
        energyLevel,
        majorEvents: majorEvents || [],
      });
      res.json(result);
    } catch (err) {
      console.error("[CrossPlatformBridge] Update life context error:", err);
      res.status(500).json({ error: "Failed to update life context" });
    }
  });

  // ── Sports Mood ────────────────────────────────────────────────────────

  app.get("/api/bridge/sports-mood/:userId", (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const emotions = crossPlatformBridge.getSportsEmotions(req.params.userId, limit);
      res.json(emotions);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get sports mood error:", err);
      res.status(500).json({ error: "Failed to get sports mood data" });
    }
  });

  app.post("/api/bridge/sports-mood", (req, res) => {
    try {
      const { userId, sport, gameId, emotion, intensity, trigger } = req.body;
      if (!userId || !sport || !emotion || intensity === undefined || !trigger) {
        return res.status(400).json({ error: "userId, sport, emotion, intensity, and trigger required" });
      }
      const mapping = crossPlatformBridge.recordSportsEmotion({
        userId,
        sport,
        gameId,
        emotion,
        intensity,
        trigger,
        timestamp: new Date().toISOString(),
      });
      res.status(201).json({ recorded: true, moodMapping: mapping || null });
    } catch (err) {
      console.error("[CrossPlatformBridge] Record sports mood error:", err);
      res.status(500).json({ error: "Failed to record sports mood" });
    }
  });

  // ── Vibe Credits ───────────────────────────────────────────────────────

  app.get("/api/bridge/vibe-credits/:userId", (req, res) => {
    try {
      const credits = crossPlatformBridge.getVibeCredits(req.params.userId);
      const balance = crossPlatformBridge.getVibeCreditBalance(req.params.userId);
      res.json({ credits, ...balance });
    } catch (err) {
      console.error("[CrossPlatformBridge] Get vibe credits error:", err);
      res.status(500).json({ error: "Failed to get vibe credits" });
    }
  });

  app.post("/api/bridge/vibe-credits/transfer", (req, res) => {
    try {
      const { userId, amount, from, to, reason } = req.body;
      if (!userId || !amount || !from || !to || !reason) {
        return res.status(400).json({ error: "userId, amount, from, to, and reason required" });
      }
      const credit = crossPlatformBridge.transferVibeCredits(userId, amount, from, to, reason);
      if (!credit) return res.status(403).json({ error: "Transfer blocked by data sovereignty controls" });
      res.status(201).json(credit);
    } catch (err) {
      console.error("[CrossPlatformBridge] Transfer vibe credits error:", err);
      res.status(500).json({ error: "Failed to transfer vibe credits" });
    }
  });

  // ── Safety Flags ───────────────────────────────────────────────────────

  app.get("/api/bridge/safety-flags/:userId", (req, res) => {
    try {
      const profile = crossPlatformBridge.getSafetyProfile(req.params.userId);
      if (!profile) {
        // Assess on-demand
        const assessed = crossPlatformBridge.assessSafety(req.params.userId);
        return res.json(assessed);
      }
      res.json(profile);
    } catch (err) {
      console.error("[CrossPlatformBridge] Get safety flags error:", err);
      res.status(500).json({ error: "Failed to get safety flags" });
    }
  });

  app.post("/api/bridge/safety-flags/:userId/assess", (req, res) => {
    try {
      const profile = crossPlatformBridge.assessSafety(req.params.userId);
      res.json(profile);
    } catch (err) {
      console.error("[CrossPlatformBridge] Assess safety error:", err);
      res.status(500).json({ error: "Failed to assess safety" });
    }
  });

  app.post("/api/bridge/safety-flags/:userId/resolve/:flagId", (req, res) => {
    try {
      const resolved = crossPlatformBridge.resolveSafetyFlag(req.params.userId, req.params.flagId);
      if (!resolved) return res.status(404).json({ error: "Safety flag not found" });
      res.json({ resolved: true });
    } catch (err) {
      console.error("[CrossPlatformBridge] Resolve safety flag error:", err);
      res.status(500).json({ error: "Failed to resolve safety flag" });
    }
  });

  // ── Stats ──────────────────────────────────────────────────────────────

  app.get("/api/bridge/stats", (_req, res) => {
    res.json(crossPlatformBridge.getStats());
  });
}
