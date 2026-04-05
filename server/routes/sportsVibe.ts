/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import type { Express } from "express";
import { sportsVibeEngine } from "../sportsVibeEngine";
import { requireAuth, requireAdmin } from "./helpers";

export function registerSportsVibeRoutes(app: Express): void {
  // ── Rooms CRUD ─────────────────────────────────────────────────────────

  app.get("/api/vibe/rooms", (_req, res) => {
    try {
      const { sport, theme, liveOnly } = _req.query;
      const rooms = sportsVibeEngine.listRooms({
        sport: sport as string | undefined,
        theme: theme as any,
        liveOnly: liveOnly === "true",
      });
      res.json(rooms.map((r) => ({ ...r, members: Array.from(r.members.values()), collectiveConfidence: Array.from(r.collectiveConfidence.values()) })));
    } catch (err) {
      console.error("[SportsVibe] List rooms error:", err);
      res.status(500).json({ error: "Failed to list rooms" });
    }
  });

  app.get("/api/vibe/rooms/:id", (req, res) => {
    try {
      const room = sportsVibeEngine.getRoom(req.params.id);
      if (!room) return res.status(404).json({ error: "Room not found" });
      res.json({ ...room, members: Array.from(room.members.values()), collectiveConfidence: Array.from(room.collectiveConfidence.values()) });
    } catch (err) {
      console.error("[SportsVibe] Get room error:", err);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  app.post("/api/vibe/rooms", (req, res) => {
    try {
      const { name, theme, gameId, sport, homeTeam, awayTeam, creatorId, creatorUsername } = req.body;
      if (!name || !theme || !gameId || !sport || !homeTeam || !awayTeam || !creatorId || !creatorUsername) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const room = sportsVibeEngine.createRoom({ name, theme, gameId, sport, homeTeam, awayTeam, creatorId, creatorUsername });
      res.status(201).json({ ...room, members: Array.from(room.members.values()), collectiveConfidence: Array.from(room.collectiveConfidence.values()) });
    } catch (err) {
      console.error("[SportsVibe] Create room error:", err);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.post("/api/vibe/rooms/:id/close", (req, res) => {
    try {
      const room = sportsVibeEngine.closeRoom(req.params.id);
      if (!room) return res.status(404).json({ error: "Room not found" });
      res.json({ ...room, members: Array.from(room.members.values()), collectiveConfidence: Array.from(room.collectiveConfidence.values()) });
    } catch (err) {
      console.error("[SportsVibe] Close room error:", err);
      res.status(500).json({ error: "Failed to close room" });
    }
  });

  // ── Join ───────────────────────────────────────────────────────────────

  app.post("/api/vibe/rooms/:id/join", (req, res) => {
    try {
      const { userId, username } = req.body;
      if (!userId || !username) return res.status(400).json({ error: "userId and username required" });
      const member = sportsVibeEngine.joinRoom(req.params.id, userId, username);
      if (!member) return res.status(404).json({ error: "Room not found or not live" });
      res.json(member);
    } catch (err) {
      console.error("[SportsVibe] Join room error:", err);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // ── Pulse (Emotional Momentum) ─────────────────────────────────────────

  app.post("/api/vibe/rooms/:id/pulse", (req, res) => {
    try {
      const { userId, mood, trigger } = req.body;
      if (!userId || mood === undefined) return res.status(400).json({ error: "userId and mood required" });
      const momentum = sportsVibeEngine.pushEmotionalPulse(req.params.id, userId, mood, trigger);
      if (!momentum) return res.status(404).json({ error: "Room not found, not live, or user not a member" });
      res.json(momentum);
    } catch (err) {
      console.error("[SportsVibe] Pulse error:", err);
      res.status(500).json({ error: "Failed to record pulse" });
    }
  });

  // ── Swarm Intelligence ─────────────────────────────────────────────────

  app.post("/api/vibe/rooms/:id/swarm", (req, res) => {
    try {
      const { userId, targetId, targetLabel, confidence } = req.body;
      if (!userId || !targetId || !targetLabel || confidence === undefined) {
        return res.status(400).json({ error: "userId, targetId, targetLabel, and confidence required" });
      }
      const result = sportsVibeEngine.submitConfidenceVote(req.params.id, userId, targetId, targetLabel, confidence);
      if (!result) return res.status(404).json({ error: "Room not found, not live, or user not a member" });
      res.json(result);
    } catch (err) {
      console.error("[SportsVibe] Swarm vote error:", err);
      res.status(500).json({ error: "Failed to submit swarm vote" });
    }
  });

  app.get("/api/vibe/rooms/:id/swarm", (req, res) => {
    try {
      const signals = sportsVibeEngine.getSwarmSignals(req.params.id);
      res.json(signals);
    } catch (err) {
      console.error("[SportsVibe] Get swarm signals error:", err);
      res.status(500).json({ error: "Failed to get swarm signals" });
    }
  });

  // ── Momentum ───────────────────────────────────────────────────────────

  app.get("/api/vibe/rooms/:id/momentum", (req, res) => {
    try {
      const momentum = sportsVibeEngine.getEmotionalMomentum(req.params.id);
      if (!momentum) return res.status(404).json({ error: "Room not found" });
      res.json(momentum);
    } catch (err) {
      console.error("[SportsVibe] Get momentum error:", err);
      res.status(500).json({ error: "Failed to get momentum" });
    }
  });

  // ── Journey (Post-Game) ────────────────────────────────────────────────

  app.get("/api/vibe/rooms/:id/journey", (req, res) => {
    try {
      const journey = sportsVibeEngine.getJourney(req.params.id);
      if (!journey) return res.status(404).json({ error: "Journey not found — room may still be live" });
      res.json(journey);
    } catch (err) {
      console.error("[SportsVibe] Get journey error:", err);
      res.status(500).json({ error: "Failed to get journey" });
    }
  });

  // ── Reactions ──────────────────────────────────────────────────────────

  app.post("/api/vibe/rooms/:id/reactions", (req, res) => {
    try {
      const { userId, username, type, intensity } = req.body;
      if (!userId || !username || !type) return res.status(400).json({ error: "userId, username, and type required" });
      const reaction = sportsVibeEngine.addReaction(req.params.id, userId, username, type, intensity ?? 0.5);
      if (!reaction) return res.status(404).json({ error: "Room not found, not live, or user not a member" });
      res.status(201).json(reaction);
    } catch (err) {
      console.error("[SportsVibe] Add reaction error:", err);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // ── Rivals ─────────────────────────────────────────────────────────────

  app.get("/api/vibe/rivals", (req, res) => {
    try {
      const { roomA, roomB } = req.query;
      if (!roomA || !roomB) return res.status(400).json({ error: "roomA and roomB query params required" });
      const comparison = sportsVibeEngine.compareRooms(roomA as string, roomB as string);
      if (!comparison) return res.status(404).json({ error: "One or both rooms not found" });
      res.json(comparison);
    } catch (err) {
      console.error("[SportsVibe] Rival comparison error:", err);
      res.status(500).json({ error: "Failed to compare rooms" });
    }
  });

  // ── Leaderboard ────────────────────────────────────────────────────────

  app.get("/api/vibe/rooms/:id/leaderboard", (req, res) => {
    try {
      const leaderboard = sportsVibeEngine.getLeaderboard(req.params.id);
      if (!leaderboard) return res.status(404).json({ error: "Room not found" });
      res.json(leaderboard);
    } catch (err) {
      console.error("[SportsVibe] Get leaderboard error:", err);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // ── Credits ────────────────────────────────────────────────────────────

  app.get("/api/vibe/credits/:userId", requireAuth, (req, res) => {
    try {
      if (req.params.userId !== req.session?.userId && !req.session?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const credits = sportsVibeEngine.getCredits(req.params.userId);
      res.json(credits);
    } catch (err) {
      console.error("[SportsVibe] Get credits error:", err);
      res.status(500).json({ error: "Failed to get credits" });
    }
  });

  app.post("/api/vibe/credits/:userId/award", requireAdmin, (req, res) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || !reason) return res.status(400).json({ error: "amount and reason required" });
      const credits = sportsVibeEngine.awardCredits(req.params.userId, amount, reason);
      res.json(credits);
    } catch (err) {
      console.error("[SportsVibe] Award credits error:", err);
      res.status(500).json({ error: "Failed to award credits" });
    }
  });

  app.post("/api/vibe/credits/:userId/spend", requireAuth, (req, res) => {
    try {
      if (req.params.userId !== req.session?.userId && !req.session?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { amount, reason } = req.body;
      if (!amount || !reason) return res.status(400).json({ error: "amount and reason required" });
      const credits = sportsVibeEngine.spendCredits(req.params.userId, amount, reason);
      if (!credits) return res.status(400).json({ error: "Insufficient credits" });
      res.json(credits);
    } catch (err) {
      console.error("[SportsVibe] Spend credits error:", err);
      res.status(500).json({ error: "Failed to spend credits" });
    }
  });

  // ── Themes & Stats ────────────────────────────────────────────────────

  app.get("/api/vibe/themes", (_req, res) => {
    res.json(sportsVibeEngine.getRoomThemes());
  });

  app.get("/api/vibe/stats", (_req, res) => {
    res.json(sportsVibeEngine.getStats());
  });
}
