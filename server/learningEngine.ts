import { db } from "./db";
import { predictions, modelWeights, learningLogs } from "./dbSchema";
import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { logError, logInfo, logWarn } from "./errorLogger";

const LEARNING_FACTORS = [
  // Core Analysis (Original 20)
  "quantum_coherence",
  "player_analysis",
  "team_dynamics",
  "ml_projections",
  "sharp_money",
  "line_movement",
  "public_sentiment",
  "injury_impact",
  "weather_factor",
  "fatigue_model",
  "correlation_engine",
  "historical_trends",
  "situational_factors",
  "pace_projection",
  "key_numbers",
  "steam_moves",
  "reverse_line",
  "closing_line_value",
  "arbitrage_detection",
  "prop_correlation",
  // Player-Specific Factors
  "player_prop_correlation_matrix",
  "matchup_defensive_assignments",
  "player_usage_distribution",
  "minutes_fatigue_modeling",
  "career_milestone_pressure",
  // Game Context Factors
  "tv_game_analysis",
  "arena_crowd_impact",
  "referee_assignment_patterns",
  "rivalry_intensity_index",
  "schedule_trap_spots",
  // Market Intelligence Factors
  "sportsbook_liability_exposure",
  "clv_tracking_accuracy",
  "early_vs_gameday_movement",
  "cross_sport_correlation",
  // Team Dynamics Factors
  "team_chemistry_index",
  "coaching_matchup_analysis",
  "time_zone_adjustment",
  "altitude_impact",
  "stadium_surface_type",
  // Performance Metrics
  "historical_spread_performance",
  "over_under_tendency",
  "first_half_second_half_splits",
  "garbage_time_adjustments",
  "motivation_metrics",
];

const LEARNING_RATE = 0.05;
const MIN_PREDICTIONS_FOR_UPDATE = 10;

// Maps QFE signal source names → one or more LEARNING_FACTORS keys
// This is what allows the engine to credit only the factors that were
// actually active in a given prediction instead of all 57 equally.
const SIGNAL_TO_FACTOR: Record<string, string[]> = {
  sharp_money_flow:     ["sharp_money", "steam_moves"],
  steam_move:           ["steam_moves", "sharp_money"],
  line_movement:        ["line_movement"],
  public_fade:          ["public_sentiment", "reverse_line"],
  reverse_line:         ["reverse_line"],
  rest_advantage:       ["situational_factors", "fatigue_model"],
  situational_spot:     ["situational_factors"],
  historical_h2h:       ["historical_trends"],
  home_field:           ["situational_factors"],
  monte_carlo:          ["ml_projections", "correlation_engine"],
  predictive_model:     ["ml_projections"],
  player_efficiency:    ["player_analysis"],
  pace_tempo:           ["pace_projection"],
  clutch_index:         ["team_dynamics"],
  coaching_tendency:    ["coaching_matchup_analysis"],
  scheme_mismatch:      ["correlation_engine"],
  momentum_score:       ["team_dynamics"],
  tipster_consensus:    ["closing_line_value"],
  scouting_data:        ["player_analysis"],
  injury_report:        ["injury_impact"],
  weather_impact:       ["weather_factor"],
  arbitrage:            ["arbitrage_detection"],
  prop_correlation:     ["prop_correlation"],
  player_prop:          ["player_prop_correlation_matrix"],
  defensive_assignment: ["matchup_defensive_assignments"],
  usage_rate:           ["player_usage_distribution"],
  minutes_fatigue:      ["minutes_fatigue_modeling"],
  milestone:            ["career_milestone_pressure"],
  tv_game:              ["tv_game_analysis"],
  crowd_impact:         ["arena_crowd_impact"],
  referee:              ["referee_assignment_patterns"],
  rivalry:              ["rivalry_intensity_index"],
  schedule_trap:        ["schedule_trap_spots"],
  sportsbook_liability: ["sportsbook_liability_exposure"],
  clv:                  ["clv_tracking_accuracy", "closing_line_value"],
  early_movement:       ["early_vs_gameday_movement"],
  cross_sport:          ["cross_sport_correlation"],
  chemistry:            ["team_chemistry_index"],
  time_zone:            ["time_zone_adjustment"],
  altitude:             ["altitude_impact"],
  surface:              ["stadium_surface_type"],
  spread_performance:   ["historical_spread_performance"],
  over_under:           ["over_under_tendency"],
  first_half:           ["first_half_second_half_splits"],
  garbage_time:         ["garbage_time_adjustments"],
  motivation:           ["motivation_metrics"],
  quantum:              ["quantum_coherence"],
};

function signalNamesToFactors(signalNames: string[]): Set<string> {
  const factors = new Set<string>();
  for (const sig of signalNames) {
    const normalized = sig.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    // Exact mapping
    if (SIGNAL_TO_FACTOR[normalized]) {
      for (const f of SIGNAL_TO_FACTOR[normalized]) factors.add(f);
      continue;
    }
    // Substring fallback: find LEARNING_FACTORS whose key is contained in
    // the signal name or vice-versa
    for (const [key, targets] of Object.entries(SIGNAL_TO_FACTOR)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        for (const f of targets) factors.add(f);
      }
    }
  }
  return factors;
}

function extractFactorNamesFromPrediction(pred: any): Set<string> {
  try {
    const legs = Array.isArray(pred.legs) ? pred.legs : JSON.parse(pred.legs || "[]");
    const signalNames: string[] = [];
    for (const leg of legs) {
      if (Array.isArray(leg.factors)) {
        for (const f of leg.factors) {
          if (f?.name) signalNames.push(f.name);
        }
      }
    }
    const mapped = signalNamesToFactors(signalNames);
    // Always include quantum_coherence and ml_projections as baseline factors
    // so they always have data and don't get starved
    mapped.add("quantum_coherence");
    mapped.add("ml_projections");
    return mapped.size > 2 ? mapped : new Set<string>(); // If only baselines, return empty (use all)
  } catch {
    return new Set<string>(); // Parse failure → credit all factors (safe fallback)
  }
}
const MOMENTUM_DECAY = 0.9;
const WEIGHT_DECAY_RATE = 0.001;
const CONFIDENCE_WEIGHT_POWER = 1.5;

let learningInterval: NodeJS.Timeout | null = null;
let cycleCount = 0;
let isLearning = false;

const momentumState: Record<string, { velocity: number; direction: number; consecutiveGains: number }> = {};

export async function initializeModelWeights(): Promise<void> {
  try {
    for (const factor of LEARNING_FACTORS) {
      const existing = await db.select().from(modelWeights).where(eq(modelWeights.factorName, factor)).limit(1);
      if (existing.length === 0) {
        await db.insert(modelWeights).values({
          factorName: factor,
          weight: 1.0,
          totalPredictions: 0,
          correctPredictions: 0,
          accuracy: 0.5,
        });
      }
    }
    logInfo("Model weights initialized");
  } catch (error: any) {
    logError(error, { context: "initializeModelWeights" });
  }
}

export async function recordPrediction(data: {
  ticketId: string;
  userId?: number;
  sport: string;
  legs: any[];
  predictedWinProb: number;
  predictedEv: number;
  confidenceScore: number;
  grade?: string;
}): Promise<number | null> {
  try {
    const [result] = await db.insert(predictions).values({
      ticketId: data.ticketId,
      userId: data.userId || null,
      sport: data.sport,
      legs: data.legs,
      predictedWinProb: data.predictedWinProb,
      predictedEv: data.predictedEv,
      confidenceScore: data.confidenceScore,
      grade: data.grade || null,
    }).returning();
    return result.id;
  } catch (error: any) {
    logError(error, { context: "recordPrediction", ticketId: data.ticketId });
    return null;
  }
}

export async function settlePrediction(ticketId: string, result: "won" | "lost" | "push"): Promise<boolean> {
  try {
    await db.update(predictions).set({
      actualResult: result,
      settledAt: new Date(),
    }).where(eq(predictions.ticketId, ticketId));
    
    logInfo(`Prediction settled: ${ticketId} = ${result}`);
    return true;
  } catch (error: any) {
    logError(error, { context: "settlePrediction", ticketId });
    return false;
  }
}

async function analyzeAndAdjustWeights(): Promise<{
  predictionsAnalyzed: number;
  weightsAdjusted: number;
  overallAccuracy: number;
  topFactor: string | null;
  bottomFactor: string | null;
}> {
  const settledPredictions = await db.select()
    .from(predictions)
    .where(isNotNull(predictions.actualResult))
    .orderBy(desc(predictions.settledAt))
    .limit(1000);

  if (settledPredictions.length < MIN_PREDICTIONS_FOR_UPDATE) {
    return {
      predictionsAnalyzed: settledPredictions.length,
      weightsAdjusted: 0,
      overallAccuracy: 0,
      topFactor: null,
      bottomFactor: null,
    };
  }

  let totalWins = 0;
  let totalLosses = 0;
  const factorPerformance: Record<string, { wins: number; losses: number; confidenceSum: number }> = {};

  for (const factor of LEARNING_FACTORS) {
    factorPerformance[factor] = { wins: 0, losses: 0, confidenceSum: 0 };
  }

  for (let i = 0; i < settledPredictions.length; i++) {
    const pred = settledPredictions[i];
    const isWin = pred.actualResult === "won";
    const confidence = pred.confidenceScore;
    const recencyWeight = Math.pow(0.995, i);
    const confidenceWeight = Math.pow(confidence / 100, CONFIDENCE_WEIGHT_POWER);
    const combinedWeight = recencyWeight * confidenceWeight * confidence;

    if (isWin) totalWins++;
    else if (pred.actualResult === "lost") totalLosses++;

    // Identify which specific factors were active in this prediction.
    // Only credit/blame those factors — not all 57 equally.
    // If we can't resolve any specific factors (old data, parse error),
    // fall back to crediting all factors so no data is wasted.
    const activeFaktors = extractFactorNamesFromPrediction(pred);
    const useAllFactors = activeFaktors.size === 0;

    for (const factor of LEARNING_FACTORS) {
      if (!useAllFactors && !activeFaktors.has(factor)) continue;
      if (isWin) {
        factorPerformance[factor].wins += combinedWeight;
      } else if (pred.actualResult === "lost") {
        factorPerformance[factor].losses += combinedWeight;
      }
      factorPerformance[factor].confidenceSum += combinedWeight;
    }
  }

  const overallAccuracy = totalWins / Math.max(1, totalWins + totalLosses);
  let weightsAdjusted = 0;
  let topFactor: string | null = null;
  let bottomFactor: string | null = null;
  let topAccuracy = 0;
  let bottomAccuracy = 1;

  for (const [factor, perf] of Object.entries(factorPerformance)) {
    const total = perf.wins + perf.losses;
    if (total < 5) continue;

    const factorAccuracy = perf.wins / total;
    
    if (factorAccuracy > topAccuracy) {
      topAccuracy = factorAccuracy;
      topFactor = factor;
    }
    if (factorAccuracy < bottomAccuracy) {
      bottomAccuracy = factorAccuracy;
      bottomFactor = factor;
    }

    const [currentWeight] = await db.select().from(modelWeights).where(eq(modelWeights.factorName, factor)).limit(1);
    if (!currentWeight) continue;

    const performanceDiff = factorAccuracy - 0.5;

    if (!momentumState[factor]) {
      momentumState[factor] = { velocity: 0, direction: 0, consecutiveGains: 0 };
    }
    const momentum = momentumState[factor];

    const currentDirection = Math.sign(performanceDiff);
    if (currentDirection === momentum.direction && currentDirection !== 0) {
      momentum.consecutiveGains++;
    } else {
      momentum.consecutiveGains = 0;
    }
    momentum.direction = currentDirection;

    const momentumMultiplier = 1 + Math.min(0.5, momentum.consecutiveGains * 0.1);
    momentum.velocity = MOMENTUM_DECAY * momentum.velocity + performanceDiff * LEARNING_RATE;
    const adjustment = momentum.velocity * momentumMultiplier;

    const decayedWeight = currentWeight.weight * (1 - WEIGHT_DECAY_RATE);
    const newWeight = Math.max(0.1, Math.min(2.5, decayedWeight + adjustment));

    await db.update(modelWeights).set({
      weight: newWeight,
      totalPredictions: currentWeight.totalPredictions + Math.round(total),
      correctPredictions: currentWeight.correctPredictions + Math.round(perf.wins),
      accuracy: factorAccuracy,
      lastUpdated: new Date(),
    }).where(eq(modelWeights.factorName, factor));

    weightsAdjusted++;
  }

  return {
    predictionsAnalyzed: settledPredictions.length,
    weightsAdjusted,
    overallAccuracy,
    topFactor,
    bottomFactor,
  };
}

async function runLearningCycle(): Promise<void> {
  if (isLearning) return;
  
  isLearning = true;
  cycleCount++;

  try {
    const results = await analyzeAndAdjustWeights();

    await db.insert(learningLogs).values({
      cycleNumber: cycleCount,
      predictionsAnalyzed: results.predictionsAnalyzed,
      weightsAdjusted: results.weightsAdjusted,
      overallAccuracy: results.overallAccuracy,
      topPerformingFactor: results.topFactor,
      bottomPerformingFactor: results.bottomFactor,
      notes: `Cycle ${cycleCount}: Analyzed ${results.predictionsAnalyzed} predictions, adjusted ${results.weightsAdjusted} weights. Overall accuracy: ${(results.overallAccuracy * 100).toFixed(1)}%`,
    });

    if (cycleCount % 60 === 0) {
      logInfo(`Learning cycle ${cycleCount} complete. Accuracy: ${(results.overallAccuracy * 100).toFixed(1)}%, Top: ${results.topFactor}, Bottom: ${results.bottomFactor}`);
    }
  } catch (error: any) {
    logError(error, { context: "runLearningCycle", cycleNumber: cycleCount });
  } finally {
    isLearning = false;
  }
}

export function startContinuousLearning(): void {
  if (learningInterval) {
    logWarn("Learning engine already running");
    return;
  }

  initializeModelWeights().then(() => {
    logInfo("Learning engine initialized (weight updates handled by orchestrator)");
  });
}

export function stopContinuousLearning(): void {
  if (learningInterval) {
    clearInterval(learningInterval);
    learningInterval = null;
    logInfo("Continuous learning engine stopped");
  }
}

export async function getLearningStats(): Promise<{
  cyclesCompleted: number;
  isRunning: boolean;
  recentLogs: any[];
  modelWeights: any[];
}> {
  try {
    const recentLogs = await db.select()
      .from(learningLogs)
      .orderBy(desc(learningLogs.createdAt))
      .limit(10);

    const weights = await db.select().from(modelWeights).orderBy(desc(modelWeights.accuracy));

    return {
      cyclesCompleted: cycleCount,
      isRunning: learningInterval !== null,
      recentLogs,
      modelWeights: weights,
    };
  } catch (error: any) {
    logError(error, { context: "getLearningStats" });
    return {
      cyclesCompleted: cycleCount,
      isRunning: learningInterval !== null,
      recentLogs: [],
      modelWeights: [],
    };
  }
}

export async function getFactorWeight(factorName: string): Promise<number> {
  try {
    const [weight] = await db.select().from(modelWeights).where(eq(modelWeights.factorName, factorName)).limit(1);
    return weight?.weight || 1.0;
  } catch {
    return 1.0;
  }
}

export async function getAllFactorWeights(): Promise<Record<string, number>> {
  try {
    const weights = await db.select().from(modelWeights);
    const result: Record<string, number> = {};
    for (const w of weights) {
      result[w.factorName] = w.weight;
    }
    return result;
  } catch {
    return {};
  }
}
