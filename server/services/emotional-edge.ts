/**
 * Emotional Edge — Emotion-Aware Prediction Engine
 *
 * Maps 20 emotional states to decision-making biases, calculates a
 * "Decision Clarity Score", enforces cool-down timers on volatility,
 * and tracks historical correlation between emotional states and
 * prediction outcomes. Integrates as Factor #47 in the Quantum Fusion Engine.
 */

import { pool } from "../db";

// ─── Types ──────────────────────────────────────────────────────────────────

export type EmotionalState =
  | "euphoria"
  | "anxiety"
  | "confidence"
  | "frustration"
  | "calm"
  | "excitement"
  | "fear"
  | "hope"
  | "anger"
  | "relief"
  | "desperation"
  | "boredom"
  | "greed"
  | "regret"
  | "focus"
  | "impulsiveness"
  | "resignation"
  | "vindictiveness"
  | "gratitude"
  | "apathy";

export interface EmotionBias {
  emotion: EmotionalState;
  bias: string;
  riskAdjustment: number;    // -1 to +1: negative = lower risk, positive = higher risk
  clarityPenalty: number;     // 0 to 1: how much this emotion degrades clarity
  recommendation: string;
}

export interface DecisionClarityScore {
  score: number;              // 0-100 final score
  predictionConfidence: number;
  emotionalStability: number;
  adjustedConfidence: number;
  warnings: string[];
  recommendation: "proceed" | "caution" | "wait";
}

export interface EmotionalAssessment {
  currentEmotion: EmotionalState;
  intensity: number;
  bias: EmotionBias;
  clarityScore: DecisionClarityScore;
  coolDownActive: boolean;
  coolDownExpiresAt: string | null;
}

export interface CorrelationEntry {
  emotion: EmotionalState;
  totalPredictions: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
}

// ─── Emotion → Bias Mapping (20 states) ─────────────────────────────────────

const EMOTION_BIAS_MAP: Record<EmotionalState, Omit<EmotionBias, "emotion">> = {
  euphoria:        { bias: "overconfidence_warning",  riskAdjustment: 0.4,  clarityPenalty: 0.35, recommendation: "Euphoria inflates perceived edge. Consider smaller position sizes." },
  anxiety:         { bias: "suggest_lower_risk",      riskAdjustment: -0.3, clarityPenalty: 0.25, recommendation: "Anxiety may cause premature cash-outs. Stick to your pre-set limits." },
  confidence:      { bias: "slight_overconfidence",   riskAdjustment: 0.15, clarityPenalty: 0.05, recommendation: "Confidence is healthy but verify your analysis before increasing stakes." },
  frustration:     { bias: "revenge_betting_risk",    riskAdjustment: 0.5,  clarityPenalty: 0.45, recommendation: "Frustration drives chasing losses. Take a break before your next bet." },
  calm:            { bias: "optimal_state",           riskAdjustment: 0.0,  clarityPenalty: 0.0,  recommendation: "Calm is the optimal betting state. Trust your analysis." },
  excitement:      { bias: "impulse_risk",            riskAdjustment: 0.25, clarityPenalty: 0.2,  recommendation: "Excitement can rush decisions. Double-check your picks." },
  fear:            { bias: "excessive_caution",       riskAdjustment: -0.4, clarityPenalty: 0.3,  recommendation: "Fear may cause you to miss +EV opportunities. Review the data objectively." },
  hope:            { bias: "wishful_thinking",        riskAdjustment: 0.2,  clarityPenalty: 0.15, recommendation: "Hope is not a strategy. Base decisions on data, not feelings." },
  anger:           { bias: "reckless_risk",           riskAdjustment: 0.6,  clarityPenalty: 0.5,  recommendation: "Anger leads to reckless bets. Step away and cool down." },
  relief:          { bias: "premature_satisfaction",  riskAdjustment: 0.1,  clarityPenalty: 0.1,  recommendation: "Relief after a win can lower your guard. Stay disciplined." },
  desperation:     { bias: "hail_mary_risk",          riskAdjustment: 0.7,  clarityPenalty: 0.6,  recommendation: "Desperation leads to max-risk bets. Cool-down strongly recommended." },
  boredom:         { bias: "action_seeking",          riskAdjustment: 0.3,  clarityPenalty: 0.25, recommendation: "Boredom leads to betting for entertainment, not value. Wait for real edges." },
  greed:           { bias: "overexposure_risk",       riskAdjustment: 0.5,  clarityPenalty: 0.4,  recommendation: "Greed pushes oversized positions. Respect your bankroll limits." },
  regret:          { bias: "outcome_bias",            riskAdjustment: 0.2,  clarityPenalty: 0.3,  recommendation: "Regret distorts analysis of past decisions. Judge process, not outcome." },
  focus:           { bias: "optimal_analysis",        riskAdjustment: 0.0,  clarityPenalty: 0.0,  recommendation: "Focused state is ideal. Proceed with your analysis." },
  impulsiveness:   { bias: "snap_decision_risk",      riskAdjustment: 0.45, clarityPenalty: 0.4,  recommendation: "Impulse bets skip analysis. Wait 10 minutes before confirming." },
  resignation:     { bias: "reduced_effort",          riskAdjustment: -0.1, clarityPenalty: 0.35, recommendation: "Resignation reduces analytical effort. Re-engage or skip this session." },
  vindictiveness:  { bias: "spite_betting",           riskAdjustment: 0.55, clarityPenalty: 0.5,  recommendation: "Betting to prove a point is costly. Let the data decide." },
  gratitude:       { bias: "slight_optimism",         riskAdjustment: 0.05, clarityPenalty: 0.02, recommendation: "Gratitude is a positive state. Minor optimism bias — stay data-driven." },
  apathy:          { bias: "disengaged_risk",         riskAdjustment: 0.0,  clarityPenalty: 0.4,  recommendation: "Apathy means you're not fully analyzing. Come back when motivated." },
};

// ─── Service ────────────────────────────────────────────────────────────────

class EmotionalEdgeService {
  /**
   * Get the bias profile for an emotional state.
   */
  getBias(emotion: EmotionalState): EmotionBias {
    const mapping = EMOTION_BIAS_MAP[emotion];
    return { emotion, ...mapping };
  }

  /**
   * Calculate Decision Clarity Score.
   * clarity = prediction_confidence * emotional_stability
   */
  calculateClarityScore(
    predictionConfidence: number,
    emotion: EmotionalState,
    intensity: number
  ): DecisionClarityScore {
    const bias = EMOTION_BIAS_MAP[emotion];
    const clarityPenalty = bias.clarityPenalty * Math.min(intensity, 1);
    const emotionalStability = Math.max(0, 1 - clarityPenalty);
    const score = Math.round(predictionConfidence * emotionalStability * 100);
    const adjustedConfidence = predictionConfidence * (1 - bias.riskAdjustment * 0.5);

    const warnings: string[] = [];
    if (clarityPenalty > 0.3) {
      warnings.push(`High emotional interference detected (${emotion})`);
    }
    if (bias.riskAdjustment > 0.4) {
      warnings.push("Risk tolerance may be artificially elevated");
    }
    if (bias.riskAdjustment < -0.3) {
      warnings.push("Risk aversion may be causing missed opportunities");
    }
    if (intensity > 0.8) {
      warnings.push("Emotional intensity is very high — consider waiting");
    }

    let recommendation: "proceed" | "caution" | "wait" = "proceed";
    if (score < 40) recommendation = "wait";
    else if (score < 65) recommendation = "caution";

    return {
      score,
      predictionConfidence: Math.round(predictionConfidence * 100),
      emotionalStability: Math.round(emotionalStability * 100),
      adjustedConfidence: Math.round(Math.max(0, Math.min(1, adjustedConfidence)) * 100),
      warnings,
      recommendation,
    };
  }

  /**
   * Record an emotional snapshot to the database.
   */
  async recordSnapshot(
    userId: string,
    emotion: EmotionalState,
    intensity: number,
    source?: string
  ): Promise<{ id: number; coolDownTriggered: boolean }> {
    const result = await pool.query(
      `INSERT INTO emotional_snapshots (user_id, emotion, intensity, source)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, emotion, Math.min(Math.max(intensity, 0), 1), source || null]
    );

    const coolDownTriggered = await this.checkAndTriggerCoolDown(userId, emotion, intensity);
    return { id: result.rows[0].id, coolDownTriggered };
  }

  /**
   * Check recent emotional volatility and trigger cool-down if needed.
   */
  private async checkAndTriggerCoolDown(
    userId: string,
    currentEmotion: EmotionalState,
    intensity: number
  ): Promise<boolean> {
    // Check if already in cool-down
    const activeCoolDown = await pool.query(
      `SELECT id FROM cool_down_events
       WHERE user_id = $1 AND triggered_at + (duration_minutes || ' minutes')::interval > NOW()
       LIMIT 1`,
      [userId]
    );
    if (activeCoolDown.rows.length > 0) return false;

    // Check for volatility: 3+ distinct high-intensity emotions in last 30 minutes
    const recentEmotions = await pool.query(
      `SELECT DISTINCT emotion FROM emotional_snapshots
       WHERE user_id = $1 AND intensity > 0.6 AND created_at > NOW() - INTERVAL '30 minutes'`,
      [userId]
    );

    const bias = EMOTION_BIAS_MAP[currentEmotion];
    const highRisk = bias.riskAdjustment > 0.4 && intensity > 0.7;
    const volatile = recentEmotions.rows.length >= 3;

    if (highRisk || volatile) {
      const reason = highRisk
        ? `High-risk emotional state: ${currentEmotion} at intensity ${intensity}`
        : `Emotional volatility detected: ${recentEmotions.rows.length} distinct states in 30 minutes`;
      const duration = highRisk ? 15 : 10;

      await pool.query(
        `INSERT INTO cool_down_events (user_id, reason, duration_minutes) VALUES ($1, $2, $3)`,
        [userId, reason, duration]
      );
      return true;
    }

    return false;
  }

  /**
   * Get current emotional assessment for a user.
   */
  async getAssessment(userId: string, predictionConfidence: number = 0.7): Promise<EmotionalAssessment> {
    // Get latest snapshot
    const latest = await pool.query(
      `SELECT emotion, intensity, source FROM emotional_snapshots
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const emotion: EmotionalState = latest.rows[0]?.emotion || "calm";
    const intensity: number = latest.rows[0]?.intensity || 0.5;

    const bias = this.getBias(emotion);
    const clarityScore = this.calculateClarityScore(predictionConfidence, emotion, intensity);

    // Check active cool-down
    const activeCoolDown = await pool.query(
      `SELECT triggered_at, duration_minutes FROM cool_down_events
       WHERE user_id = $1 AND triggered_at + (duration_minutes || ' minutes')::interval > NOW()
       ORDER BY triggered_at DESC LIMIT 1`,
      [userId]
    );

    let coolDownActive = false;
    let coolDownExpiresAt: string | null = null;
    if (activeCoolDown.rows.length > 0) {
      coolDownActive = true;
      const row = activeCoolDown.rows[0];
      const expires = new Date(row.triggered_at);
      expires.setMinutes(expires.getMinutes() + row.duration_minutes);
      coolDownExpiresAt = expires.toISOString();
    }

    return {
      currentEmotion: emotion,
      intensity,
      bias,
      clarityScore,
      coolDownActive,
      coolDownExpiresAt,
    };
  }

  /**
   * Get historical correlation between emotional states and prediction outcomes.
   */
  async getCorrelation(userId: string): Promise<CorrelationEntry[]> {
    const result = await pool.query(
      `SELECT
         epc.emotion_at_prediction AS emotion,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE epc.outcome = 'win') AS wins,
         COUNT(*) FILTER (WHERE epc.outcome = 'loss') AS losses,
         COALESCE(AVG(p.confidence_score), 0) AS avg_confidence
       FROM emotion_prediction_correlation epc
       LEFT JOIN predictions p ON p.id = epc.prediction_id
       WHERE epc.user_id = $1 AND epc.outcome IS NOT NULL
       GROUP BY epc.emotion_at_prediction
       ORDER BY total DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      emotion: row.emotion as EmotionalState,
      totalPredictions: Number(row.total),
      wins: Number(row.wins),
      losses: Number(row.losses),
      winRate: Number(row.total) > 0 ? Number(row.wins) / Number(row.total) : 0,
      avgConfidence: Math.round(Number(row.avg_confidence) * 100) / 100,
    }));
  }

  /**
   * Record a correlation entry linking emotion to a prediction.
   */
  async recordCorrelation(
    userId: string,
    emotion: EmotionalState,
    predictionId: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO emotion_prediction_correlation (user_id, emotion_at_prediction, prediction_id)
       VALUES ($1, $2, $3)`,
      [userId, emotion, predictionId]
    );
  }

  /**
   * Compute Factor #47 contribution for the Quantum Fusion Engine.
   * Returns a score from 0-100 representing emotional edge factor.
   */
  computeFusionFactor(emotion: EmotionalState, intensity: number): number {
    const bias = EMOTION_BIAS_MAP[emotion];
    const stability = 1 - bias.clarityPenalty * intensity;
    const riskPenalty = Math.abs(bias.riskAdjustment) * intensity * 0.3;
    return Math.round(Math.max(0, Math.min(100, stability * 100 - riskPenalty * 100)));
  }

  /**
   * Get all 20 emotional states and their bias profiles.
   */
  getAllEmotionProfiles(): EmotionBias[] {
    return (Object.keys(EMOTION_BIAS_MAP) as EmotionalState[]).map((emotion) => ({
      emotion,
      ...EMOTION_BIAS_MAP[emotion],
    }));
  }
}

export const emotionalEdgeService = new EmotionalEdgeService();
