/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import type { Express } from "express";
import { bettingMomentumEngine } from "../bettingMomentumEngine";

export function registerBettingMomentumRoutes(app: Express): void {
  // ── Momentum Score ─────────────────────────────────────────────────────

  app.get("/api/momentum/score/:userId", (req, res) => {
    try {
      const score = bettingMomentumEngine.getScore(req.params.userId);
      if (!score) {
        // Calculate on-demand if not cached
        const calculated = bettingMomentumEngine.calculateScore(req.params.userId);
        return res.json(calculated);
      }
      res.json(score);
    } catch (err) {
      console.error("[BettingMomentum] Get score error:", err);
      res.status(500).json({ error: "Failed to get momentum score" });
    }
  });

  app.post("/api/momentum/score/:userId/calculate", (req, res) => {
    try {
      const score = bettingMomentumEngine.calculateScore(req.params.userId);
      res.json(score);
    } catch (err) {
      console.error("[BettingMomentum] Calculate score error:", err);
      res.status(500).json({ error: "Failed to calculate momentum score" });
    }
  });

  // ── Streams ────────────────────────────────────────────────────────────

  app.get("/api/momentum/streams", (_req, res) => {
    try {
      const streams = bettingMomentumEngine.getStreams();
      res.json(streams.map((s) => ({ ...s, members: Array.from(s.members.values()) })));
    } catch (err) {
      console.error("[BettingMomentum] List streams error:", err);
      res.status(500).json({ error: "Failed to list streams" });
    }
  });

  app.get("/api/momentum/streams/:id", (req, res) => {
    try {
      const stream = bettingMomentumEngine.getStream(req.params.id);
      if (!stream) return res.status(404).json({ error: "Stream not found" });
      res.json({ ...stream, members: Array.from(stream.members.values()) });
    } catch (err) {
      console.error("[BettingMomentum] Get stream error:", err);
      res.status(500).json({ error: "Failed to get stream" });
    }
  });

  // ── Join Stream ────────────────────────────────────────────────────────

  app.post("/api/momentum/streams/:id/join", (req, res) => {
    try {
      const { userId, username } = req.body;
      if (!userId || !username) return res.status(400).json({ error: "userId and username required" });
      const member = bettingMomentumEngine.joinStream(req.params.id, userId, username);
      if (!member) return res.status(404).json({ error: "Stream not found" });
      res.json(member);
    } catch (err) {
      console.error("[BettingMomentum] Join stream error:", err);
      res.status(500).json({ error: "Failed to join stream" });
    }
  });

  // ── Milestones ─────────────────────────────────────────────────────────

  app.get("/api/momentum/milestones/:userId", (req, res) => {
    try {
      const milestones = bettingMomentumEngine.getMilestones(req.params.userId);
      res.json(milestones);
    } catch (err) {
      console.error("[BettingMomentum] Get milestones error:", err);
      res.status(500).json({ error: "Failed to get milestones" });
    }
  });

  // ── Hot Hands ──────────────────────────────────────────────────────────

  app.get("/api/momentum/hot-hands/:userId", (req, res) => {
    try {
      const hotHands = bettingMomentumEngine.getHotHands(req.params.userId);
      res.json(hotHands);
    } catch (err) {
      console.error("[BettingMomentum] Get hot hands error:", err);
      res.status(500).json({ error: "Failed to get hot hand detections" });
    }
  });

  app.post("/api/momentum/hot-hands/:userId/detect", (req, res) => {
    try {
      const { sport } = req.body;
      if (!sport) return res.status(400).json({ error: "sport required" });
      const detection = bettingMomentumEngine.detectHotHand(req.params.userId, sport);
      if (!detection) return res.json({ detected: false, message: "Insufficient data or no active streak" });
      res.json({ detected: true, ...detection });
    } catch (err) {
      console.error("[BettingMomentum] Detect hot hand error:", err);
      res.status(500).json({ error: "Failed to detect hot hand" });
    }
  });

  // ── Mentors ────────────────────────────────────────────────────────────

  app.get("/api/momentum/mentors", (req, res) => {
    try {
      const { specialty, minWinRate } = req.query;
      const mentors = bettingMomentumEngine.getMentors({
        specialty: specialty as string | undefined,
        minWinRate: minWinRate ? parseFloat(minWinRate as string) : undefined,
      });
      res.json(mentors);
    } catch (err) {
      console.error("[BettingMomentum] Get mentors error:", err);
      res.status(500).json({ error: "Failed to get mentors" });
    }
  });

  app.post("/api/momentum/mentors", (req, res) => {
    try {
      const { userId, username, specialties, winRate, roi, bio } = req.body;
      if (!userId || !username || !specialties) return res.status(400).json({ error: "userId, username, and specialties required" });
      const mentor = bettingMomentumEngine.registerMentor({ userId, username, specialties, winRate: winRate || 0, roi: roi || 0, bio: bio || "" });
      res.status(201).json(mentor);
    } catch (err) {
      console.error("[BettingMomentum] Register mentor error:", err);
      res.status(500).json({ error: "Failed to register mentor" });
    }
  });

  // ── Analytics ──────────────────────────────────────────────────────────

  app.get("/api/momentum/analytics/:userId", (req, res) => {
    try {
      const score = bettingMomentumEngine.calculateScore(req.params.userId);
      const streaks = bettingMomentumEngine.getStreakAnalytics(req.params.userId);
      const hotHands = bettingMomentumEngine.getHotHands(req.params.userId);
      const milestones = bettingMomentumEngine.getMilestones(req.params.userId);
      const bankroll = bettingMomentumEngine.getBankrollVelocity(req.params.userId);

      res.json({ score, streaks, hotHands, milestones, bankroll });
    } catch (err) {
      console.error("[BettingMomentum] Get analytics error:", err);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // ── Streaks ────────────────────────────────────────────────────────────

  app.get("/api/momentum/streaks/:userId", (req, res) => {
    try {
      const streaks = bettingMomentumEngine.getStreakAnalytics(req.params.userId);
      res.json(streaks);
    } catch (err) {
      console.error("[BettingMomentum] Get streaks error:", err);
      res.status(500).json({ error: "Failed to get streak analytics" });
    }
  });

  // ── Record Pick & Bankroll ─────────────────────────────────────────────

  app.post("/api/momentum/picks", (req, res) => {
    try {
      const { userId, sport, result, odds, stake, payout } = req.body;
      if (!userId || !sport || !result || odds === undefined || stake === undefined || payout === undefined) {
        return res.status(400).json({ error: "userId, sport, result, odds, stake, and payout required" });
      }
      const pick = bettingMomentumEngine.recordPick(userId, { sport, result, odds, stake, payout });
      res.status(201).json(pick);
    } catch (err) {
      console.error("[BettingMomentum] Record pick error:", err);
      res.status(500).json({ error: "Failed to record pick" });
    }
  });

  app.post("/api/momentum/bankroll/:userId", (req, res) => {
    try {
      const { currentBankroll } = req.body;
      if (currentBankroll === undefined) return res.status(400).json({ error: "currentBankroll required" });
      const velocity = bettingMomentumEngine.updateBankroll(req.params.userId, currentBankroll);
      res.json(velocity);
    } catch (err) {
      console.error("[BettingMomentum] Update bankroll error:", err);
      res.status(500).json({ error: "Failed to update bankroll" });
    }
  });

  // ── Cross-Sport Transfer ───────────────────────────────────────────────

  app.get("/api/momentum/transfer/:userId", (req, res) => {
    try {
      const { fromSport, toSport } = req.query;
      if (!fromSport || !toSport) return res.status(400).json({ error: "fromSport and toSport query params required" });
      const transfer = bettingMomentumEngine.analyzeCrossSportTransfer(req.params.userId, fromSport as string, toSport as string);
      res.json(transfer);
    } catch (err) {
      console.error("[BettingMomentum] Cross-sport transfer error:", err);
      res.status(500).json({ error: "Failed to analyze cross-sport transfer" });
    }
  });

  // ── Stats ──────────────────────────────────────────────────────────────

  app.get("/api/momentum/stats", (_req, res) => {
    res.json(bettingMomentumEngine.getStats());
  });
}
