/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    Sors Maxima — Sports Intelligence Platform
 * @license    Proprietary
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type Platform = "sors_maxima" | "4everacy";

export type SignalType =
  | "sports_emotion"
  | "life_context"
  | "mood_update"
  | "betting_decision_flag"
  | "vibe_credit_transfer"
  | "safety_alert";

export interface SharedSignal {
  id: string;
  type: SignalType;
  sourcePlatform: Platform;
  targetPlatform: Platform;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface SportsEmotionalData {
  userId: string;
  sport: string;
  gameId?: string;
  emotion: string;
  intensity: number;
  trigger: string;
  timestamp: string;
}

export interface MoodMapping {
  sportsEmotion: string;
  mappedMood: string;
  confidence: number;
  context: string;
}

export interface LifeContext {
  userId: string;
  stressLevel: number;
  sleepQuality: number;
  energyLevel: number;
  majorEvents: string[];
  updatedAt: string;
}

export interface BettingDecisionFlag {
  userId: string;
  flag: string;
  severity: "info" | "warning" | "critical";
  reason: string;
  lifeContextFactors: string[];
  recommendation: string;
  timestamp: string;
}

export interface VibeCredit {
  id: string;
  userId: string;
  amount: number;
  sourcePlatform: Platform;
  targetPlatform: Platform;
  reason: string;
  timestamp: string;
}

export interface FamilyBettingSafety {
  userId: string;
  isActive: boolean;
  flags: SafetyFlag[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  lastAssessment: string;
  recommendations: string[];
}

export interface SafetyFlag {
  id: string;
  type: string;
  description: string;
  severity: "warning" | "critical";
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface DataSovereigntyControl {
  userId: string;
  permissions: PlatformPermission[];
  dataRetentionDays: number;
  shareEmotionalData: boolean;
  shareLifeContext: boolean;
  shareBettingActivity: boolean;
  shareVibeCredits: boolean;
  lastUpdated: string;
}

export interface PlatformPermission {
  platform: Platform;
  canRead: boolean;
  canWrite: boolean;
  dataTypes: string[];
}

export interface SyncStatus {
  userId: string;
  lastSyncAt: string | null;
  signalsSent: number;
  signalsReceived: number;
  pendingSignals: number;
  connectionHealth: "healthy" | "degraded" | "disconnected";
  platforms: PlatformSyncDetail[];
}

export interface PlatformSyncDetail {
  platform: Platform;
  connected: boolean;
  lastActivity: string | null;
  queueDepth: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMOTION_TO_MOOD: Record<string, MoodMapping> = {
  excitement: { sportsEmotion: "excitement", mappedMood: "energized", confidence: 0.85, context: "Game win or big play" },
  frustration: { sportsEmotion: "frustration", mappedMood: "irritable", confidence: 0.80, context: "Bad beat or loss" },
  anxiety: { sportsEmotion: "anxiety", mappedMood: "stressed", confidence: 0.75, context: "Close game or big stake" },
  elation: { sportsEmotion: "elation", mappedMood: "joyful", confidence: 0.90, context: "Big win or streak" },
  despair: { sportsEmotion: "despair", mappedMood: "low", confidence: 0.70, context: "Heavy loss or bad streak" },
};

const STRESS_BETTING_THRESHOLDS = { warning: 70, critical: 85 };
const SLEEP_QUALITY_MINIMUM = 40;
const MAX_SIGNAL_QUEUE = 1000;

// ── Engine ────────────────────────────────────────────────────────────────────

class CrossPlatformBridge {
  private signals: Map<string, SharedSignal[]> = new Map();
  private lifeContexts: Map<string, LifeContext> = new Map();
  private sportsEmotions: Map<string, SportsEmotionalData[]> = new Map();
  private vibeCredits: Map<string, VibeCredit[]> = new Map();
  private safetyProfiles: Map<string, FamilyBettingSafety> = new Map();
  private sovereigntyControls: Map<string, DataSovereigntyControl> = new Map();
  private syncStatuses: Map<string, SyncStatus> = new Map();

  // ── Shared Signal Protocol ─────────────────────────────────────────────

  sendSignal(params: {
    type: SignalType;
    sourcePlatform: Platform;
    targetPlatform: Platform;
    userId: string;
    payload: Record<string, unknown>;
  }): SharedSignal | undefined {
    // Check sovereignty permissions
    const controls = this.sovereigntyControls.get(params.userId);
    if (controls) {
      const perm = controls.permissions.find((p) => p.platform === params.targetPlatform);
      if (perm && !perm.canWrite) return undefined;
    }

    const signal: SharedSignal = {
      id: `sig_${crypto.randomUUID()}`,
      ...params,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    const key = `${params.userId}_${params.targetPlatform}`;
    if (!this.signals.has(key)) this.signals.set(key, []);
    const queue = this.signals.get(key)!;
    queue.push(signal);
    if (queue.length > MAX_SIGNAL_QUEUE) queue.splice(0, queue.length - MAX_SIGNAL_QUEUE);

    this.updateSyncStatus(params.userId, "sent");
    return signal;
  }

  acknowledgeSignal(signalId: string, userId: string): boolean {
    for (const [key, queue] of this.signals) {
      if (!key.startsWith(`${userId}_`)) continue;
      const signal = queue.find((s) => s.id === signalId);
      if (signal) {
        signal.acknowledged = true;
        signal.acknowledgedAt = new Date().toISOString();
        this.updateSyncStatus(userId, "received");
        return true;
      }
    }
    return false;
  }

  getPendingSignals(userId: string, platform: Platform): SharedSignal[] {
    const key = `${userId}_${platform}`;
    return (this.signals.get(key) || []).filter((s) => !s.acknowledged);
  }

  // ── Sports Emotion → Mood Tracking ─────────────────────────────────────

  recordSportsEmotion(data: SportsEmotionalData): MoodMapping | undefined {
    if (!this.sportsEmotions.has(data.userId)) this.sportsEmotions.set(data.userId, []);
    this.sportsEmotions.get(data.userId)!.push(data);

    const mapping = EMOTION_TO_MOOD[data.emotion];
    if (mapping) {
      this.sendSignal({
        type: "sports_emotion",
        sourcePlatform: "sors_maxima",
        targetPlatform: "4everacy",
        userId: data.userId,
        payload: { emotion: data.emotion, mood: mapping.mappedMood, intensity: data.intensity, sport: data.sport },
      });
    }
    return mapping;
  }

  getSportsEmotions(userId: string, limit = 20): SportsEmotionalData[] {
    return (this.sportsEmotions.get(userId) || []).slice(-limit);
  }

  getMoodFromEmotion(emotion: string): MoodMapping | undefined {
    return EMOTION_TO_MOOD[emotion];
  }

  // ── Life Context → Betting Decision Flags ──────────────────────────────

  updateLifeContext(userId: string, context: Omit<LifeContext, "userId" | "updatedAt">): { context: LifeContext; flags: BettingDecisionFlag[] } {
    const full: LifeContext = { ...context, userId, updatedAt: new Date().toISOString() };
    this.lifeContexts.set(userId, full);

    const flags = this.evaluateBettingFlags(userId, full);

    // Send flags to Sors Maxima
    if (flags.length > 0) {
      this.sendSignal({
        type: "betting_decision_flag",
        sourcePlatform: "4everacy",
        targetPlatform: "sors_maxima",
        userId,
        payload: { flags },
      });
    }

    return { context: full, flags };
  }

  getLifeContext(userId: string): LifeContext | undefined {
    return this.lifeContexts.get(userId);
  }

  private evaluateBettingFlags(userId: string, context: LifeContext): BettingDecisionFlag[] {
    const flags: BettingDecisionFlag[] = [];
    const now = new Date().toISOString();

    if (context.stressLevel >= STRESS_BETTING_THRESHOLDS.critical) {
      flags.push({
        userId,
        flag: "high_stress_betting",
        severity: "critical",
        reason: "Extremely high stress levels detected",
        lifeContextFactors: ["stress"],
        recommendation: "Consider pausing betting activity until stress levels decrease",
        timestamp: now,
      });
    } else if (context.stressLevel >= STRESS_BETTING_THRESHOLDS.warning) {
      flags.push({
        userId,
        flag: "elevated_stress",
        severity: "warning",
        reason: "Elevated stress may affect betting decisions",
        lifeContextFactors: ["stress"],
        recommendation: "Reduce stake sizes and avoid impulsive bets",
        timestamp: now,
      });
    }

    if (context.sleepQuality < SLEEP_QUALITY_MINIMUM) {
      flags.push({
        userId,
        flag: "poor_sleep_quality",
        severity: "warning",
        reason: "Poor sleep quality impacts decision-making",
        lifeContextFactors: ["sleep"],
        recommendation: "Sleep-deprived decisions tend to be riskier — stick to pre-planned picks",
        timestamp: now,
      });
    }

    if (context.majorEvents.length > 0 && context.stressLevel >= 60) {
      flags.push({
        userId,
        flag: "major_life_events",
        severity: "info",
        reason: "Major life events detected alongside elevated stress",
        lifeContextFactors: ["stress", "major_events"],
        recommendation: "Major events can affect focus — consider reducing betting volume",
        timestamp: now,
      });
    }

    return flags;
  }

  // ── Vibe Credit System ─────────────────────────────────────────────────

  transferVibeCredits(userId: string, amount: number, from: Platform, to: Platform, reason: string): VibeCredit | undefined {
    const controls = this.sovereigntyControls.get(userId);
    if (controls && !controls.shareVibeCredits) return undefined;

    const credit: VibeCredit = {
      id: `vc_${crypto.randomUUID()}`,
      userId,
      amount,
      sourcePlatform: from,
      targetPlatform: to,
      reason,
      timestamp: new Date().toISOString(),
    };

    if (!this.vibeCredits.has(userId)) this.vibeCredits.set(userId, []);
    this.vibeCredits.get(userId)!.push(credit);

    this.sendSignal({
      type: "vibe_credit_transfer",
      sourcePlatform: from,
      targetPlatform: to,
      userId,
      payload: { amount, reason, creditId: credit.id },
    });

    return credit;
  }

  getVibeCredits(userId: string): VibeCredit[] {
    return this.vibeCredits.get(userId) || [];
  }

  getVibeCreditBalance(userId: string): { earned: number; spent: number; balance: number } {
    const credits = this.vibeCredits.get(userId) || [];
    const earned = credits.filter((c) => c.targetPlatform === "sors_maxima").reduce((s, c) => s + c.amount, 0);
    const spent = credits.filter((c) => c.sourcePlatform === "sors_maxima").reduce((s, c) => s + c.amount, 0);
    return { earned, spent, balance: earned - spent };
  }

  // ── Family Betting Safety ──────────────────────────────────────────────

  assessSafety(userId: string): FamilyBettingSafety {
    const existing = this.safetyProfiles.get(userId);
    const lifeContext = this.lifeContexts.get(userId);
    const emotions = this.sportsEmotions.get(userId) || [];

    const flags: SafetyFlag[] = existing?.flags.filter((f) => !f.resolved) || [];

    // Emotional volatility check
    if (emotions.length >= 5) {
      const recent = emotions.slice(-10);
      const intensities = recent.map((e) => e.intensity);
      const avg = intensities.reduce((s, i) => s + i, 0) / intensities.length;
      const variance = intensities.reduce((s, i) => s + Math.pow(i - avg, 2), 0) / intensities.length;
      if (variance > 0.3) {
        const existingVolatility = flags.find((f) => f.type === "emotional_volatility");
        if (!existingVolatility) {
          flags.push({
            id: `sf_${crypto.randomUUID()}`,
            type: "emotional_volatility",
            description: "High emotional volatility detected during betting",
            severity: "warning",
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }
    }

    // Chasing losses detection
    const negativeEmotions = emotions.filter((e) => ["frustration", "despair"].includes(e.emotion));
    if (negativeEmotions.length >= 3) {
      const recentNeg = negativeEmotions.slice(-3);
      const allRecent = recentNeg.every((e) => Date.now() - new Date(e.timestamp).getTime() < 3600000);
      if (allRecent) {
        const existingChase = flags.find((f) => f.type === "chasing_losses");
        if (!existingChase) {
          flags.push({
            id: `sf_${crypto.randomUUID()}`,
            type: "chasing_losses",
            description: "Pattern suggests chasing losses — multiple negative emotions in short window",
            severity: "critical",
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }
    }

    // Risk level calculation
    const criticalCount = flags.filter((f) => f.severity === "critical").length;
    const warningCount = flags.filter((f) => f.severity === "warning").length;
    const riskLevel: FamilyBettingSafety["riskLevel"] =
      criticalCount >= 2 ? "critical" : criticalCount >= 1 ? "high" : warningCount >= 2 ? "moderate" : "low";

    const recommendations: string[] = [];
    if (riskLevel === "critical") recommendations.push("Strongly consider a betting pause", "Reach out to support resources");
    if (riskLevel === "high") recommendations.push("Reduce stake sizes significantly", "Review betting patterns with a trusted person");
    if (riskLevel === "moderate") recommendations.push("Set daily loss limits", "Take breaks between bets");

    const profile: FamilyBettingSafety = {
      userId,
      isActive: true,
      flags,
      riskLevel,
      lastAssessment: new Date().toISOString(),
      recommendations,
    };
    this.safetyProfiles.set(userId, profile);

    if (riskLevel === "high" || riskLevel === "critical") {
      this.sendSignal({
        type: "safety_alert",
        sourcePlatform: "sors_maxima",
        targetPlatform: "4everacy",
        userId,
        payload: { riskLevel, flagCount: flags.length, recommendations },
      });
    }

    return profile;
  }

  getSafetyProfile(userId: string): FamilyBettingSafety | undefined {
    return this.safetyProfiles.get(userId);
  }

  resolveSafetyFlag(userId: string, flagId: string): boolean {
    const profile = this.safetyProfiles.get(userId);
    if (!profile) return false;
    const flag = profile.flags.find((f) => f.id === flagId);
    if (!flag) return false;
    flag.resolved = true;
    flag.resolvedAt = new Date().toISOString();
    return true;
  }

  // ── Data Sovereignty Controls ──────────────────────────────────────────

  setPermissions(userId: string, controls: Omit<DataSovereigntyControl, "userId" | "lastUpdated">): DataSovereigntyControl {
    const full: DataSovereigntyControl = { ...controls, userId, lastUpdated: new Date().toISOString() };
    this.sovereigntyControls.set(userId, full);
    return full;
  }

  getPermissions(userId: string): DataSovereigntyControl | undefined {
    return this.sovereigntyControls.get(userId);
  }

  // ── Sync Status ────────────────────────────────────────────────────────

  private updateSyncStatus(userId: string, action: "sent" | "received"): void {
    let status = this.syncStatuses.get(userId);
    if (!status) {
      status = {
        userId,
        lastSyncAt: null,
        signalsSent: 0,
        signalsReceived: 0,
        pendingSignals: 0,
        connectionHealth: "healthy",
        platforms: [
          { platform: "sors_maxima", connected: true, lastActivity: null, queueDepth: 0 },
          { platform: "4everacy", connected: true, lastActivity: null, queueDepth: 0 },
        ],
      };
      this.syncStatuses.set(userId, status);
    }

    status.lastSyncAt = new Date().toISOString();
    if (action === "sent") status.signalsSent++;
    if (action === "received") status.signalsReceived++;

    // Update pending count
    let pending = 0;
    for (const [key, queue] of this.signals) {
      if (key.startsWith(`${userId}_`)) {
        pending += queue.filter((s) => !s.acknowledged).length;
      }
    }
    status.pendingSignals = pending;
    status.connectionHealth = pending > 50 ? "degraded" : "healthy";
  }

  getSyncStatus(userId: string): SyncStatus {
    return (
      this.syncStatuses.get(userId) || {
        userId,
        lastSyncAt: null,
        signalsSent: 0,
        signalsReceived: 0,
        pendingSignals: 0,
        connectionHealth: "disconnected",
        platforms: [
          { platform: "sors_maxima" as Platform, connected: false, lastActivity: null, queueDepth: 0 },
          { platform: "4everacy" as Platform, connected: false, lastActivity: null, queueDepth: 0 },
        ],
      }
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  getStats(): { totalUsers: number; totalSignals: number; activeSafetyProfiles: number } {
    let totalSignals = 0;
    for (const queue of this.signals.values()) totalSignals += queue.length;
    return {
      totalUsers: this.syncStatuses.size,
      totalSignals,
      activeSafetyProfiles: Array.from(this.safetyProfiles.values()).filter((p) => p.isActive).length,
    };
  }
}

export const crossPlatformBridge = new CrossPlatformBridge();
