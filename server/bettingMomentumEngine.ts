/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type StreamType =
  | "value_betting"
  | "underdog_hunting"
  | "prop_master"
  | "parlay_king"
  | "live_betting";

export interface BettingMomentumScore {
  userId: string;
  overall: number;
  winRate: number;
  roi: number;
  currentStreak: number;
  streakType: "win" | "loss" | "neutral";
  hotHandActive: boolean;
  bankrollVelocity: number;
  sportBreakdown: Record<string, SportMomentum>;
  updatedAt: string;
}

export interface SportMomentum {
  sport: string;
  winRate: number;
  roi: number;
  streak: number;
  streakType: "win" | "loss" | "neutral";
  totalPicks: number;
  recentResults: PickResult[];
}

export interface PickResult {
  id: string;
  sport: string;
  result: "win" | "loss" | "push";
  odds: number;
  stake: number;
  payout: number;
  timestamp: string;
}

export interface MomentumStream {
  id: string;
  type: StreamType;
  label: string;
  description: string;
  members: Map<string, StreamMember>;
  leaderboard: StreamLeaderboardEntry[];
  createdAt: string;
}

export interface StreamMember {
  userId: string;
  username: string;
  joinedAt: string;
  score: number;
  contributions: number;
}

export interface StreamLeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export interface HotHandDetection {
  userId: string;
  sport: string;
  streakLength: number;
  streakWinRate: number;
  expectedWinRate: number;
  zScore: number;
  isStatisticallySignificant: boolean;
  confidence: number;
  detectedAt: string;
}

export interface CrossSportTransfer {
  userId: string;
  fromSport: string;
  toSport: string;
  transferStrength: number;
  sharedEdges: string[];
  recommendation: string;
}

export interface BankrollVelocity {
  userId: string;
  currentBankroll: number;
  startingBankroll: number;
  velocityPerDay: number;
  velocityPerWeek: number;
  projectedMonthly: number;
  trend: "accelerating" | "decelerating" | "steady";
  history: BankrollSnapshot[];
}

export interface BankrollSnapshot {
  timestamp: string;
  bankroll: number;
  delta: number;
}

export interface Mentor {
  userId: string;
  username: string;
  specialties: string[];
  winRate: number;
  roi: number;
  menteeCount: number;
  rating: number;
  bio: string;
}

export interface Milestone {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  achievedAt: string;
  value: number;
}

export interface StreakAnalytics {
  userId: string;
  longestWin: number;
  longestLoss: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | "neutral";
  averageStreakLength: number;
  streakHistory: StreakEntry[];
}

export interface StreakEntry {
  type: "win" | "loss";
  length: number;
  startDate: string;
  endDate: string;
  sport: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const HOT_HAND_Z_THRESHOLD = 1.96; // 95% confidence
const MIN_STREAK_FOR_HOT_HAND = 5;
const MOMENTUM_WEIGHTS = { winRate: 0.35, roi: 0.30, streak: 0.20, consistency: 0.15 };
const STREAM_DEFINITIONS: Record<StreamType, { label: string; description: string }> = {
  value_betting: { label: "Value Betting", description: "Finding +EV lines and market inefficiencies" },
  underdog_hunting: { label: "Underdog Hunting", description: "Specializing in profitable underdog picks" },
  prop_master: { label: "Prop Master", description: "Player props and alternative market expertise" },
  parlay_king: { label: "Parlay King", description: "Multi-leg parlay construction and correlation plays" },
  live_betting: { label: "Live Betting", description: "In-game momentum reads and live market edges" },
};

// ── Engine ────────────────────────────────────────────────────────────────────

class BettingMomentumEngine {
  private scores: Map<string, BettingMomentumScore> = new Map();
  private pickHistory: Map<string, PickResult[]> = new Map();
  private streams: Map<string, MomentumStream> = new Map();
  private hotHands: Map<string, HotHandDetection[]> = new Map();
  private bankrolls: Map<string, BankrollVelocity> = new Map();
  private mentors: Map<string, Mentor> = new Map();
  private milestones: Map<string, Milestone[]> = new Map();

  constructor() {
    this.initializeStreams();
  }

  private initializeStreams(): void {
    for (const [type, def] of Object.entries(STREAM_DEFINITIONS)) {
      const id = `stream_${type}`;
      this.streams.set(id, {
        id,
        type: type as StreamType,
        label: def.label,
        description: def.description,
        members: new Map(),
        leaderboard: [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── Momentum Score ─────────────────────────────────────────────────────

  calculateScore(userId: string): BettingMomentumScore {
    const picks = this.pickHistory.get(userId) || [];
    if (picks.length === 0) {
      const empty: BettingMomentumScore = {
        userId,
        overall: 0,
        winRate: 0,
        roi: 0,
        currentStreak: 0,
        streakType: "neutral",
        hotHandActive: false,
        bankrollVelocity: 0,
        sportBreakdown: {},
        updatedAt: new Date().toISOString(),
      };
      this.scores.set(userId, empty);
      return empty;
    }

    const wins = picks.filter((p) => p.result === "win").length;
    const winRate = wins / picks.length;
    const totalStaked = picks.reduce((s, p) => s + p.stake, 0);
    const totalReturn = picks.reduce((s, p) => s + p.payout, 0);
    const roi = totalStaked > 0 ? (totalReturn - totalStaked) / totalStaked : 0;

    // Current streak
    let streak = 0;
    let streakType: "win" | "loss" | "neutral" = "neutral";
    if (picks.length > 0) {
      const sorted = [...picks].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      streakType = sorted[0].result === "push" ? "neutral" : sorted[0].result;
      if (streakType !== "neutral") {
        for (const p of sorted) {
          if (p.result === streakType) streak++;
          else break;
        }
      }
    }

    // Sport breakdown
    const sportBreakdown: Record<string, SportMomentum> = {};
    const bySport = new Map<string, PickResult[]>();
    for (const p of picks) {
      if (!bySport.has(p.sport)) bySport.set(p.sport, []);
      bySport.get(p.sport)!.push(p);
    }
    for (const [sport, sportPicks] of bySport) {
      const sw = sportPicks.filter((p) => p.result === "win").length;
      const sStaked = sportPicks.reduce((s, p) => s + p.stake, 0);
      const sReturn = sportPicks.reduce((s, p) => s + p.payout, 0);
      const sorted = [...sportPicks].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      let sStreak = 0;
      let sStreakType: "win" | "loss" | "neutral" = sorted[0].result === "push" ? "neutral" : sorted[0].result;
      if (sStreakType !== "neutral") {
        for (const p of sorted) {
          if (p.result === sStreakType) sStreak++;
          else break;
        }
      }
      sportBreakdown[sport] = {
        sport,
        winRate: sw / sportPicks.length,
        roi: sStaked > 0 ? (sReturn - sStaked) / sStaked : 0,
        streak: sStreak,
        streakType: sStreakType,
        totalPicks: sportPicks.length,
        recentResults: sorted.slice(0, 10),
      };
    }

    // Composite score
    const bankroll = this.bankrolls.get(userId);
    const velocity = bankroll?.velocityPerDay || 0;
    const consistency = picks.length >= 10 ? 1 - Math.abs(winRate - 0.55) : 0;
    const overall = Math.round(
      (MOMENTUM_WEIGHTS.winRate * winRate * 100 +
        MOMENTUM_WEIGHTS.roi * Math.min(roi * 100, 50) +
        MOMENTUM_WEIGHTS.streak * Math.min(streak * 5, 25) +
        MOMENTUM_WEIGHTS.consistency * consistency * 100) * 100
    ) / 100;

    const hotHands = this.hotHands.get(userId) || [];
    const score: BettingMomentumScore = {
      userId,
      overall: Math.max(0, Math.min(100, overall)),
      winRate,
      roi,
      currentStreak: streak,
      streakType,
      hotHandActive: hotHands.some((h) => h.isStatisticallySignificant),
      bankrollVelocity: velocity,
      sportBreakdown,
      updatedAt: new Date().toISOString(),
    };
    this.scores.set(userId, score);
    return score;
  }

  getScore(userId: string): BettingMomentumScore | undefined {
    return this.scores.get(userId);
  }

  // ── Pick Recording ─────────────────────────────────────────────────────

  recordPick(userId: string, pick: Omit<PickResult, "id" | "timestamp">): PickResult {
    const result: PickResult = {
      id: `pick_${crypto.randomUUID()}`,
      ...pick,
      timestamp: new Date().toISOString(),
    };
    if (!this.pickHistory.has(userId)) this.pickHistory.set(userId, []);
    this.pickHistory.get(userId)!.push(result);

    // Re-evaluate
    this.calculateScore(userId);
    this.detectHotHand(userId, pick.sport);
    this.checkMilestones(userId);

    return result;
  }

  // ── Streams ────────────────────────────────────────────────────────────

  getStreams(): MomentumStream[] {
    return Array.from(this.streams.values());
  }

  getStream(streamId: string): MomentumStream | undefined {
    return this.streams.get(streamId);
  }

  joinStream(streamId: string, userId: string, username: string): StreamMember | undefined {
    const stream = this.streams.get(streamId);
    if (!stream) return undefined;
    if (stream.members.has(userId)) return stream.members.get(userId);

    const member: StreamMember = {
      userId,
      username,
      joinedAt: new Date().toISOString(),
      score: 0,
      contributions: 0,
    };
    stream.members.set(userId, member);
    return member;
  }

  // ── Hot Hand Detection ─────────────────────────────────────────────────

  detectHotHand(userId: string, sport: string): HotHandDetection | undefined {
    const picks = (this.pickHistory.get(userId) || []).filter((p) => p.sport === sport);
    if (picks.length < MIN_STREAK_FOR_HOT_HAND) return undefined;

    const sorted = [...picks].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    let streakLen = 0;
    for (const p of sorted) {
      if (p.result === "win") streakLen++;
      else break;
    }
    if (streakLen < MIN_STREAK_FOR_HOT_HAND) return undefined;

    const expectedWinRate = picks.filter((p) => p.result === "win").length / picks.length;
    const streakWinRate = 1.0;
    const n = streakLen;
    const p = expectedWinRate;
    const zScore = (streakWinRate - p) / Math.sqrt((p * (1 - p)) / n);

    const detection: HotHandDetection = {
      userId,
      sport,
      streakLength: streakLen,
      streakWinRate,
      expectedWinRate,
      zScore,
      isStatisticallySignificant: zScore >= HOT_HAND_Z_THRESHOLD,
      confidence: Math.min(0.99, 1 - 2 * (1 - this.normalCDF(Math.abs(zScore)))),
      detectedAt: new Date().toISOString(),
    };

    if (!this.hotHands.has(userId)) this.hotHands.set(userId, []);
    this.hotHands.get(userId)!.push(detection);
    return detection;
  }

  getHotHands(userId: string): HotHandDetection[] {
    return (this.hotHands.get(userId) || []).filter((h) => h.isStatisticallySignificant);
  }

  // ── Cross-Sport Momentum Transfer ──────────────────────────────────────

  analyzeCrossSportTransfer(userId: string, fromSport: string, toSport: string): CrossSportTransfer {
    const score = this.scores.get(userId);
    const fromMomentum = score?.sportBreakdown[fromSport];
    const toMomentum = score?.sportBreakdown[toSport];

    const sharedEdges: string[] = [];
    if (fromMomentum && fromMomentum.winRate > 0.55) sharedEdges.push("strong_win_rate");
    if (fromMomentum && fromMomentum.roi > 0.05) sharedEdges.push("positive_roi");
    if (fromMomentum && fromMomentum.streakType === "win" && fromMomentum.streak >= 3) sharedEdges.push("active_hot_streak");

    const transferStrength = sharedEdges.length / 3;
    const recommendation =
      transferStrength > 0.6
        ? `Strong momentum transfer from ${fromSport} — consider increasing ${toSport} exposure`
        : transferStrength > 0.3
          ? `Moderate momentum — maintain current ${toSport} sizing`
          : `Low transfer signal — stick to established ${toSport} strategy`;

    return { userId, fromSport, toSport, transferStrength, sharedEdges, recommendation };
  }

  // ── Bankroll Velocity ──────────────────────────────────────────────────

  updateBankroll(userId: string, currentBankroll: number): BankrollVelocity {
    let velocity = this.bankrolls.get(userId);
    const now = new Date().toISOString();

    if (!velocity) {
      velocity = {
        userId,
        currentBankroll,
        startingBankroll: currentBankroll,
        velocityPerDay: 0,
        velocityPerWeek: 0,
        projectedMonthly: 0,
        trend: "steady",
        history: [{ timestamp: now, bankroll: currentBankroll, delta: 0 }],
      };
      this.bankrolls.set(userId, velocity);
      return velocity;
    }

    const prevBankroll = velocity.currentBankroll;
    const delta = currentBankroll - prevBankroll;
    velocity.currentBankroll = currentBankroll;
    velocity.history.push({ timestamp: now, bankroll: currentBankroll, delta });

    // Calculate daily velocity from history
    if (velocity.history.length >= 2) {
      const first = velocity.history[0];
      const elapsed = (Date.now() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const totalDelta = currentBankroll - first.bankroll;
      velocity.velocityPerDay = elapsed > 0 ? totalDelta / elapsed : 0;
      velocity.velocityPerWeek = velocity.velocityPerDay * 7;
      velocity.projectedMonthly = velocity.velocityPerDay * 30;
    }

    // Trend from recent deltas
    const recentDeltas = velocity.history.slice(-5).map((h) => h.delta);
    const avgDelta = recentDeltas.reduce((s, d) => s + d, 0) / recentDeltas.length;
    velocity.trend = avgDelta > 10 ? "accelerating" : avgDelta < -10 ? "decelerating" : "steady";

    return velocity;
  }

  getBankrollVelocity(userId: string): BankrollVelocity | undefined {
    return this.bankrolls.get(userId);
  }

  // ── Mentors ────────────────────────────────────────────────────────────

  registerMentor(mentor: Omit<Mentor, "menteeCount" | "rating">): Mentor {
    const full: Mentor = { ...mentor, menteeCount: 0, rating: 0 };
    this.mentors.set(mentor.userId, full);
    return full;
  }

  getMentors(filters?: { specialty?: string; minWinRate?: number }): Mentor[] {
    let list = Array.from(this.mentors.values());
    if (filters?.specialty) list = list.filter((m) => m.specialties.includes(filters.specialty!));
    if (filters?.minWinRate) list = list.filter((m) => m.winRate >= filters.minWinRate!);
    return list.sort((a, b) => b.rating - a.rating);
  }

  // ── Milestones ─────────────────────────────────────────────────────────

  private checkMilestones(userId: string): void {
    const picks = this.pickHistory.get(userId) || [];
    const score = this.scores.get(userId);
    if (!score) return;

    const existing = this.milestones.get(userId) || [];
    const existingTypes = new Set(existing.map((m) => m.type));
    const newMilestones: Milestone[] = [];

    if (picks.length >= 100 && !existingTypes.has("100_picks")) {
      newMilestones.push({ id: `ms_${crypto.randomUUID()}`, userId, type: "100_picks", title: "Century Club", description: "Recorded 100 picks", achievedAt: new Date().toISOString(), value: 100 });
    }
    if (score.winRate >= 0.6 && picks.length >= 20 && !existingTypes.has("60_win_rate")) {
      newMilestones.push({ id: `ms_${crypto.randomUUID()}`, userId, type: "60_win_rate", title: "Sharp Shooter", description: "60%+ win rate over 20+ picks", achievedAt: new Date().toISOString(), value: 60 });
    }
    if (score.currentStreak >= 10 && score.streakType === "win" && !existingTypes.has("10_win_streak")) {
      newMilestones.push({ id: `ms_${crypto.randomUUID()}`, userId, type: "10_win_streak", title: "On Fire", description: "10-game win streak", achievedAt: new Date().toISOString(), value: 10 });
    }
    if (score.roi >= 0.2 && picks.length >= 30 && !existingTypes.has("20_roi")) {
      newMilestones.push({ id: `ms_${crypto.randomUUID()}`, userId, type: "20_roi", title: "Profit Machine", description: "20%+ ROI over 30+ picks", achievedAt: new Date().toISOString(), value: 20 });
    }

    if (newMilestones.length > 0) {
      this.milestones.set(userId, [...existing, ...newMilestones]);
    }
  }

  getMilestones(userId: string): Milestone[] {
    return this.milestones.get(userId) || [];
  }

  // ── Streak Analytics ───────────────────────────────────────────────────

  getStreakAnalytics(userId: string): StreakAnalytics {
    const picks = this.pickHistory.get(userId) || [];
    const sorted = [...picks].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const streakHistory: StreakEntry[] = [];
    let longestWin = 0;
    let longestLoss = 0;
    let currentLen = 0;
    let currentType: "win" | "loss" | null = null;
    let streakStart = "";

    for (const p of sorted) {
      if (p.result === "push") continue;
      if (p.result === currentType) {
        currentLen++;
      } else {
        if (currentType && currentLen > 0) {
          streakHistory.push({ type: currentType, length: currentLen, startDate: streakStart, endDate: p.timestamp, sport: p.sport });
          if (currentType === "win" && currentLen > longestWin) longestWin = currentLen;
          if (currentType === "loss" && currentLen > longestLoss) longestLoss = currentLen;
        }
        currentType = p.result as "win" | "loss";
        currentLen = 1;
        streakStart = p.timestamp;
      }
    }
    if (currentType && currentLen > 0) {
      streakHistory.push({ type: currentType, length: currentLen, startDate: streakStart, endDate: sorted[sorted.length - 1]?.timestamp || "", sport: sorted[sorted.length - 1]?.sport || "" });
      if (currentType === "win" && currentLen > longestWin) longestWin = currentLen;
      if (currentType === "loss" && currentLen > longestLoss) longestLoss = currentLen;
    }

    const score = this.scores.get(userId);
    const avgLen = streakHistory.length > 0 ? streakHistory.reduce((s, e) => s + e.length, 0) / streakHistory.length : 0;

    return {
      userId,
      longestWin,
      longestLoss,
      currentStreak: score?.currentStreak || 0,
      currentStreakType: score?.streakType || "neutral",
      averageStreakLength: Math.round(avgLen * 100) / 100,
      streakHistory: streakHistory.slice(-20),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327;
    const p = d * Math.exp((-x * x) / 2) * (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744)))));
    return x > 0 ? 1 - p : p;
  }

  getStats(): { totalUsers: number; totalPicks: number; activeStreams: number; activeMentors: number } {
    return {
      totalUsers: this.scores.size,
      totalPicks: Array.from(this.pickHistory.values()).reduce((s, list) => s + list.length, 0),
      activeStreams: this.streams.size,
      activeMentors: this.mentors.size,
    };
  }
}

export const bettingMomentumEngine = new BettingMomentumEngine();
