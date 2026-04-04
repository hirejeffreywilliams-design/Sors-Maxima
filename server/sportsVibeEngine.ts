/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type RoomTheme =
  | "tailgate_party"
  | "war_room"
  | "sweat_session"
  | "victory_lap"
  | "comeback_mode";

export interface VibeRoom {
  id: string;
  name: string;
  theme: RoomTheme;
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  creatorId: string;
  creatorUsername: string;
  members: Map<string, VibeRoomMember>;
  collectiveConfidence: Map<string, CollectiveConfidence>;
  emotionalMomentum: EmotionalMomentum;
  fanEnergy: number;
  isLive: boolean;
  createdAt: string;
  closedAt?: string;
}

export interface VibeRoomMember {
  userId: string;
  username: string;
  joinedAt: string;
  energyScore: number;
  reactionCount: number;
  currentMood: string;
}

export interface CollectiveConfidence {
  targetId: string;
  targetLabel: string;
  totalVotes: number;
  confidenceSum: number;
  averageConfidence: number;
  swarmTriggered: boolean;
  swarmTimestamp?: string;
}

export interface EmotionalMomentum {
  current: number;
  trend: "rising" | "falling" | "stable";
  peak: number;
  peakTimestamp?: string;
  history: EmotionalSnapshot[];
}

export interface EmotionalSnapshot {
  timestamp: string;
  value: number;
  trigger?: string;
}

export interface SwarmSignal {
  roomId: string;
  targetId: string;
  targetLabel: string;
  collectiveConfidence: number;
  memberCount: number;
  threshold: number;
  triggered: boolean;
  triggeredAt?: string;
}

export interface FanEnergyScore {
  userId: string;
  username: string;
  energy: number;
  reactionRate: number;
  streakLength: number;
  topReaction: string;
}

export interface RivalComparison {
  roomA: { id: string; name: string; fanEnergy: number; memberCount: number };
  roomB: { id: string; name: string; fanEnergy: number; memberCount: number };
  energyDelta: number;
  dominantRoom: string;
}

export interface EmotionalJourney {
  roomId: string;
  gameId: string;
  phases: JourneyPhase[];
  peakMoment: EmotionalSnapshot;
  finalSentiment: string;
  totalReactions: number;
  duration: number;
}

export interface JourneyPhase {
  label: string;
  startTime: string;
  endTime: string;
  averageMood: number;
  dominantEmotion: string;
  reactionCount: number;
}

export interface Reaction {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  type: string;
  intensity: number;
  timestamp: string;
}

export interface VibeCredits {
  userId: string;
  balance: number;
  earned: number;
  spent: number;
  history: VibeCreditEntry[];
}

export interface VibeCreditEntry {
  id: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export interface VibeLeaderboard {
  roomId: string;
  entries: VibeLeaderboardEntry[];
  updatedAt: string;
}

export interface VibeLeaderboardEntry {
  userId: string;
  username: string;
  energyScore: number;
  reactionCount: number;
  rank: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SWARM_CONFIDENCE_THRESHOLD = 0.75;
const MIN_SWARM_VOTERS = 5;
const ENERGY_DECAY_RATE = 0.02;
const MAX_MOMENTUM_HISTORY = 500;
const ROOM_THEMES: Record<RoomTheme, { label: string; emoji: string; description: string }> = {
  tailgate_party: { label: "Tailgate Party", emoji: "🏈", description: "Pre-game hype and social energy" },
  war_room: { label: "War Room", emoji: "🎯", description: "Serious analysis and sharp picks" },
  sweat_session: { label: "Sweat Session", emoji: "😰", description: "Nail-biter games and live sweat" },
  victory_lap: { label: "Victory Lap", emoji: "🏆", description: "Celebrate wins together" },
  comeback_mode: { label: "Comeback Mode", emoji: "🔥", description: "Rally when things look grim" },
};

// ── Engine ────────────────────────────────────────────────────────────────────

class SportsVibeEngine {
  private rooms: Map<string, VibeRoom> = new Map();
  private reactions: Map<string, Reaction[]> = new Map();
  private credits: Map<string, VibeCredits> = new Map();
  private journeys: Map<string, EmotionalJourney> = new Map();

  // ── Room CRUD ──────────────────────────────────────────────────────────

  createRoom(params: {
    name: string;
    theme: RoomTheme;
    gameId: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    creatorId: string;
    creatorUsername: string;
  }): VibeRoom {
    const id = `vibe_${crypto.randomUUID()}`;
    const room: VibeRoom = {
      id,
      name: params.name,
      theme: params.theme,
      gameId: params.gameId,
      sport: params.sport,
      homeTeam: params.homeTeam,
      awayTeam: params.awayTeam,
      creatorId: params.creatorId,
      creatorUsername: params.creatorUsername,
      members: new Map(),
      collectiveConfidence: new Map(),
      emotionalMomentum: { current: 50, trend: "stable", peak: 50, history: [] },
      fanEnergy: 0,
      isLive: true,
      createdAt: new Date().toISOString(),
    };

    // Creator auto-joins
    room.members.set(params.creatorId, {
      userId: params.creatorId,
      username: params.creatorUsername,
      joinedAt: room.createdAt,
      energyScore: 0,
      reactionCount: 0,
      currentMood: "hyped",
    });

    this.rooms.set(id, room);
    this.reactions.set(id, []);
    return room;
  }

  getRoom(roomId: string): VibeRoom | undefined {
    return this.rooms.get(roomId);
  }

  listRooms(filters?: { sport?: string; theme?: RoomTheme; liveOnly?: boolean }): VibeRoom[] {
    let rooms = Array.from(this.rooms.values());
    if (filters?.sport) rooms = rooms.filter((r) => r.sport === filters.sport);
    if (filters?.theme) rooms = rooms.filter((r) => r.theme === filters.theme);
    if (filters?.liveOnly) rooms = rooms.filter((r) => r.isLive);
    return rooms;
  }

  closeRoom(roomId: string): VibeRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.isLive = false;
    room.closedAt = new Date().toISOString();
    this.buildJourney(roomId);
    return room;
  }

  // ── Membership ─────────────────────────────────────────────────────────

  joinRoom(roomId: string, userId: string, username: string): VibeRoomMember | undefined {
    const room = this.rooms.get(roomId);
    if (!room || !room.isLive) return undefined;
    if (room.members.has(userId)) return room.members.get(userId);

    const member: VibeRoomMember = {
      userId,
      username,
      joinedAt: new Date().toISOString(),
      energyScore: 0,
      reactionCount: 0,
      currentMood: "neutral",
    };
    room.members.set(userId, member);
    return member;
  }

  // ── Collective Confidence & Swarm Intelligence ─────────────────────────

  submitConfidenceVote(roomId: string, userId: string, targetId: string, targetLabel: string, confidence: number): CollectiveConfidence | undefined {
    const room = this.rooms.get(roomId);
    if (!room || !room.isLive || !room.members.has(userId)) return undefined;

    const clamped = Math.max(0, Math.min(1, confidence));
    let entry = room.collectiveConfidence.get(targetId);
    if (!entry) {
      entry = { targetId, targetLabel, totalVotes: 0, confidenceSum: 0, averageConfidence: 0, swarmTriggered: false };
      room.collectiveConfidence.set(targetId, entry);
    }

    entry.totalVotes += 1;
    entry.confidenceSum += clamped;
    entry.averageConfidence = entry.confidenceSum / entry.totalVotes;

    // Swarm trigger check
    if (!entry.swarmTriggered && entry.totalVotes >= MIN_SWARM_VOTERS && entry.averageConfidence >= SWARM_CONFIDENCE_THRESHOLD) {
      entry.swarmTriggered = true;
      entry.swarmTimestamp = new Date().toISOString();
    }

    return entry;
  }

  getSwarmSignals(roomId: string): SwarmSignal[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.collectiveConfidence.values()).map((cc) => ({
      roomId,
      targetId: cc.targetId,
      targetLabel: cc.targetLabel,
      collectiveConfidence: cc.averageConfidence,
      memberCount: cc.totalVotes,
      threshold: SWARM_CONFIDENCE_THRESHOLD,
      triggered: cc.swarmTriggered,
      triggeredAt: cc.swarmTimestamp,
    }));
  }

  // ── Emotional Momentum ─────────────────────────────────────────────────

  pushEmotionalPulse(roomId: string, userId: string, mood: number, trigger?: string): EmotionalMomentum | undefined {
    const room = this.rooms.get(roomId);
    if (!room || !room.isLive || !room.members.has(userId)) return undefined;

    const snapshot: EmotionalSnapshot = { timestamp: new Date().toISOString(), value: mood, trigger };
    const momentum = room.emotionalMomentum;
    momentum.history.push(snapshot);
    if (momentum.history.length > MAX_MOMENTUM_HISTORY) {
      momentum.history = momentum.history.slice(-MAX_MOMENTUM_HISTORY);
    }

    // Recalculate current from recent window
    const recent = momentum.history.slice(-20);
    const avg = recent.reduce((s, h) => s + h.value, 0) / recent.length;
    const prev = momentum.current;
    momentum.current = Math.round(avg * 100) / 100;
    momentum.trend = momentum.current > prev + 2 ? "rising" : momentum.current < prev - 2 ? "falling" : "stable";

    if (momentum.current > momentum.peak) {
      momentum.peak = momentum.current;
      momentum.peakTimestamp = snapshot.timestamp;
    }

    // Update member mood
    const member = room.members.get(userId);
    if (member) {
      member.currentMood = mood >= 70 ? "hyped" : mood >= 40 ? "neutral" : "anxious";
    }

    return momentum;
  }

  getEmotionalMomentum(roomId: string): EmotionalMomentum | undefined {
    return this.rooms.get(roomId)?.emotionalMomentum;
  }

  // ── Fan Energy & Reactions ─────────────────────────────────────────────

  addReaction(roomId: string, userId: string, username: string, type: string, intensity: number): Reaction | undefined {
    const room = this.rooms.get(roomId);
    if (!room || !room.isLive || !room.members.has(userId)) return undefined;

    const reaction: Reaction = {
      id: `rxn_${crypto.randomUUID()}`,
      roomId,
      userId,
      username,
      type,
      intensity: Math.max(0, Math.min(1, intensity)),
      timestamp: new Date().toISOString(),
    };

    const list = this.reactions.get(roomId) || [];
    list.push(reaction);
    this.reactions.set(roomId, list);

    // Update member energy
    const member = room.members.get(userId);
    if (member) {
      member.reactionCount += 1;
      member.energyScore = Math.min(100, member.energyScore + intensity * 5);
    }

    // Update room fan energy
    const members = Array.from(room.members.values());
    room.fanEnergy = members.reduce((s, m) => s + m.energyScore, 0) / Math.max(1, members.length);

    return reaction;
  }

  getFanEnergyScores(roomId: string): FanEnergyScore[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const roomReactions = this.reactions.get(roomId) || [];
    return Array.from(room.members.values())
      .map((m) => {
        const userReactions = roomReactions.filter((r) => r.userId === m.userId);
        const reactionTypes = userReactions.map((r) => r.type);
        const typeCounts: Record<string, number> = {};
        for (const t of reactionTypes) typeCounts[t] = (typeCounts[t] || 0) + 1;
        const topReaction = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";

        return {
          userId: m.userId,
          username: m.username,
          energy: m.energyScore,
          reactionRate: m.reactionCount / Math.max(1, (Date.now() - new Date(m.joinedAt).getTime()) / 60000),
          streakLength: 0,
          topReaction,
        };
      })
      .sort((a, b) => b.energy - a.energy);
  }

  // ── Rival Room Comparisons ─────────────────────────────────────────────

  compareRooms(roomAId: string, roomBId: string): RivalComparison | undefined {
    const a = this.rooms.get(roomAId);
    const b = this.rooms.get(roomBId);
    if (!a || !b) return undefined;

    const aEnergy = a.fanEnergy;
    const bEnergy = b.fanEnergy;
    return {
      roomA: { id: a.id, name: a.name, fanEnergy: aEnergy, memberCount: a.members.size },
      roomB: { id: b.id, name: b.name, fanEnergy: bEnergy, memberCount: b.members.size },
      energyDelta: Math.abs(aEnergy - bEnergy),
      dominantRoom: aEnergy >= bEnergy ? a.id : b.id,
    };
  }

  // ── Post-Game Emotional Journey ────────────────────────────────────────

  private buildJourney(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const momentum = room.emotionalMomentum;
    const reactions = this.reactions.get(roomId) || [];
    if (momentum.history.length === 0) return;

    // Chunk into phases (every ~10 snapshots)
    const chunkSize = Math.max(1, Math.floor(momentum.history.length / 5));
    const phases: JourneyPhase[] = [];
    for (let i = 0; i < momentum.history.length; i += chunkSize) {
      const chunk = momentum.history.slice(i, i + chunkSize);
      const avgMood = chunk.reduce((s, h) => s + h.value, 0) / chunk.length;
      phases.push({
        label: i === 0 ? "Opening" : i + chunkSize >= momentum.history.length ? "Closing" : `Phase ${Math.floor(i / chunkSize) + 1}`,
        startTime: chunk[0].timestamp,
        endTime: chunk[chunk.length - 1].timestamp,
        averageMood: Math.round(avgMood * 100) / 100,
        dominantEmotion: avgMood >= 70 ? "excitement" : avgMood >= 40 ? "tension" : "despair",
        reactionCount: reactions.filter((r) => r.timestamp >= chunk[0].timestamp && r.timestamp <= chunk[chunk.length - 1].timestamp).length,
      });
    }

    const peakSnapshot = momentum.history.reduce((best, h) => (h.value > best.value ? h : best), momentum.history[0]);
    const start = new Date(momentum.history[0].timestamp).getTime();
    const end = new Date(momentum.history[momentum.history.length - 1].timestamp).getTime();

    const journey: EmotionalJourney = {
      roomId,
      gameId: room.gameId,
      phases,
      peakMoment: peakSnapshot,
      finalSentiment: momentum.current >= 70 ? "elated" : momentum.current >= 40 ? "neutral" : "defeated",
      totalReactions: reactions.length,
      duration: Math.round((end - start) / 1000),
    };

    this.journeys.set(roomId, journey);
  }

  getJourney(roomId: string): EmotionalJourney | undefined {
    return this.journeys.get(roomId);
  }

  // ── Vibe Credits ───────────────────────────────────────────────────────

  getCredits(userId: string): VibeCredits {
    if (!this.credits.has(userId)) {
      this.credits.set(userId, { userId, balance: 0, earned: 0, spent: 0, history: [] });
    }
    return this.credits.get(userId)!;
  }

  awardCredits(userId: string, amount: number, reason: string): VibeCredits {
    const credits = this.getCredits(userId);
    credits.balance += amount;
    credits.earned += amount;
    credits.history.push({ id: `vc_${crypto.randomUUID()}`, amount, reason, timestamp: new Date().toISOString() });
    return credits;
  }

  spendCredits(userId: string, amount: number, reason: string): VibeCredits | undefined {
    const credits = this.getCredits(userId);
    if (credits.balance < amount) return undefined;
    credits.balance -= amount;
    credits.spent += amount;
    credits.history.push({ id: `vc_${crypto.randomUUID()}`, amount: -amount, reason, timestamp: new Date().toISOString() });
    return credits;
  }

  // ── Leaderboard ────────────────────────────────────────────────────────

  getLeaderboard(roomId: string): VibeLeaderboard | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const entries: VibeLeaderboardEntry[] = Array.from(room.members.values())
      .sort((a, b) => b.energyScore - a.energyScore)
      .map((m, i) => ({
        userId: m.userId,
        username: m.username,
        energyScore: m.energyScore,
        reactionCount: m.reactionCount,
        rank: i + 1,
      }));

    return { roomId, entries, updatedAt: new Date().toISOString() };
  }

  // ── Utilities ──────────────────────────────────────────────────────────

  getRoomThemes(): typeof ROOM_THEMES {
    return ROOM_THEMES;
  }

  getStats(): { totalRooms: number; liveRooms: number; totalMembers: number; totalReactions: number } {
    const rooms = Array.from(this.rooms.values());
    return {
      totalRooms: rooms.length,
      liveRooms: rooms.filter((r) => r.isLive).length,
      totalMembers: rooms.reduce((s, r) => s + r.members.size, 0),
      totalReactions: Array.from(this.reactions.values()).reduce((s, list) => s + list.length, 0),
    };
  }
}

export const sportsVibeEngine = new SportsVibeEngine();
