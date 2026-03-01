import fs from "fs";
import path from "path";
import { logInfo, logWarn } from "./errorLogger";

const DATA_FILE = path.join(process.cwd(), "mc-stacked-learner.json");
const MAX_RECORDS = 3000;
const LEARNING_RATE = 0.02;
const MIN_PICKS_FOR_CALIBRATION = 20;

// ─── Variance thresholds by sport (raw score variance from MC simulations) ───
// Below "low" = low-uncertainty game → boost confidence
// Above "high" = high-uncertainty game → reduce confidence
const VARIANCE_THRESHOLDS: Record<string, { low: number; high: number }> = {
  NBA:    { low: 600,  high: 1800 },
  NHL:    { low: 1.5,  high: 6.0  },
  MLB:    { low: 3.0,  high: 12.0 },
  NFL:    { low: 40,   high: 180  },
  NCAAB:  { low: 500,  high: 1500 },
  NCAAF:  { low: 60,   high: 220  },
  SOCCER: { low: 0.4,  high: 2.0  },
  DEFAULT:{ low: 400,  high: 1500 },
};

export interface MCPredictionRecord {
  id: string;
  gameId: string;
  sport: string;
  betType: string;
  mcWinProb: number;
  mcVariance: number;
  mcConvergence: number;
  mcBoostApplied: number;
  pickConfidence: number;
  outcome?: "won" | "lost" | "push";
  settledAt?: number;
  recordedAt: number;
}

interface SportCalibration {
  biasSum: number;
  count: number;
  overconfidentCount: number;
  underconfidentCount: number;
  varianceEMA: number;
  winRate: number | null;
}

interface MCLearningState {
  records: MCPredictionRecord[];
  sportCalibration: Record<string, SportCalibration>;
  betTypeCalibration: Record<string, { biasSum: number; count: number; wins: number }>;
  mcStackedWeight: number;
  totalPredictions: number;
  totalSettled: number;
  mcBullishAccuracy: number | null;
  varianceAccuracy: {
    lowVariance: { wins: number; total: number };
    highVariance: { wins: number; total: number };
  };
  convergenceAccuracy: {
    highConvergence: { wins: number; total: number };
    lowConvergence: { wins: number; total: number };
  };
  learningCycles: number;
  lastCycleAt: string | null;
  lastUpdated: string;
  version: number;
}

const DEFAULT_STATE: MCLearningState = {
  records: [],
  sportCalibration: {},
  betTypeCalibration: {},
  mcStackedWeight: 1.0,
  totalPredictions: 0,
  totalSettled: 0,
  mcBullishAccuracy: null,
  varianceAccuracy: {
    lowVariance: { wins: 0, total: 0 },
    highVariance: { wins: 0, total: 0 },
  },
  convergenceAccuracy: {
    highConvergence: { wins: 0, total: 0 },
    lowConvergence: { wins: 0, total: 0 },
  },
  learningCycles: 0,
  lastCycleAt: null,
  lastUpdated: new Date().toISOString(),
  version: 2,
};

let state: MCLearningState = { ...DEFAULT_STATE };

function loadState(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const loaded = JSON.parse(raw);
      if (loaded.version !== DEFAULT_STATE.version) {
        logInfo("[MCStacked] Version mismatch — resetting state");
        return;
      }
      state = {
        ...DEFAULT_STATE,
        ...loaded,
        records: (loaded.records || []).slice(-MAX_RECORDS),
        sportCalibration: loaded.sportCalibration || {},
        betTypeCalibration: loaded.betTypeCalibration || {},
        varianceAccuracy: loaded.varianceAccuracy || DEFAULT_STATE.varianceAccuracy,
        convergenceAccuracy: loaded.convergenceAccuracy || DEFAULT_STATE.convergenceAccuracy,
      };
      logInfo(`[MCStacked] Loaded ${state.records.length} records — stackedWeight=${state.mcStackedWeight.toFixed(3)}, settled=${state.totalSettled}`);
    }
  } catch (e) {
    logWarn(`[MCStacked] Failed to load state, using defaults`);
  }
}

function saveState(): void {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logWarn(`[MCStacked] Failed to save state`);
  }
}

loadState();

// ─── Variance normalization ────────────────────────────────────────────────
function normalizeVariance(sport: string, variance: number): number {
  const thresholds = VARIANCE_THRESHOLDS[sport.toUpperCase()] || VARIANCE_THRESHOLDS.DEFAULT;
  if (variance <= thresholds.low) return 0;
  if (variance >= thresholds.high) return 1;
  return (variance - thresholds.low) / (thresholds.high - thresholds.low);
}

// ─── Public: Variance-adjusted confidence multiplier ──────────────────────
/**
 * Returns a multiplier to apply to the MC confidence boost based on:
 * - MC simulation variance (high variance = uncertain = reduce confidence)
 * - Convergence score (high convergence = MC agrees with itself = boost confidence)
 *
 * Range: 0.88 - 1.06
 * - Certain game (low var + high conv): 1.06
 * - Average game: ~1.0
 * - Uncertain game (high var + low conv): 0.88
 */
export function getMCVarianceAdjustment(sport: string, variance: number, convergence: number): number {
  const normVariance = normalizeVariance(sport, variance);
  const uncertainty = normVariance * 0.65 + (1 - Math.min(1, convergence)) * 0.35;
  const multiplier = 1.06 - (uncertainty * 0.18);
  return Math.min(1.06, Math.max(0.88, multiplier));
}

// ─── Public: Stacked weight (how much to trust MC signal vs other factors) ──
/**
 * Returns current MC trust multiplier (0.7 - 1.3).
 * Starts at 1.0, rises as MC proves predictive, drops if MC hurts accuracy.
 */
export function getMCStackedWeight(): number {
  return Math.min(1.3, Math.max(0.7, state.mcStackedWeight));
}

// ─── Public: Sport-specific bias correction ────────────────────────────────
/**
 * Returns a confidence point adjustment (-5 to +5) based on historical
 * MC over/underconfidence for a given sport.
 * Positive = MC underestimates win prob for this sport → add confidence.
 * Negative = MC overestimates → subtract confidence.
 * Only applied when we have 25+ settled picks for the sport.
 */
export function getMCBiasCorrection(sport: string): number {
  const sc = state.sportCalibration[sport.toUpperCase()];
  if (!sc || sc.count < 25) return 0;
  const avgBias = sc.biasSum / sc.count;
  return Math.min(5, Math.max(-5, Math.round(-avgBias * 20)));
}

// ─── Public: Record a new prediction ──────────────────────────────────────
/**
 * Called from precomputedPredictionsEngine when a pick is generated with MC data.
 * Idempotent — won't create duplicate records for the same gameId + betType.
 */
export function recordMCPrediction(params: {
  gameId: string;
  sport: string;
  betType: string;
  mcWinProb: number;
  mcVariance: number;
  mcConvergence: number;
  mcBoostApplied: number;
  pickConfidence: number;
}): void {
  const id = `${params.gameId}_${params.betType}`;
  if (state.records.find(r => r.id === id)) return;

  state.records.push({
    id,
    gameId: params.gameId,
    sport: params.sport.toUpperCase(),
    betType: params.betType,
    mcWinProb: Math.round(params.mcWinProb * 1000) / 1000,
    mcVariance: Math.round(params.mcVariance * 100) / 100,
    mcConvergence: Math.round(params.mcConvergence * 1000) / 1000,
    mcBoostApplied: params.mcBoostApplied,
    pickConfidence: params.pickConfidence,
    recordedAt: Date.now(),
  });

  if (state.records.length > MAX_RECORDS) {
    state.records = state.records.slice(-MAX_RECORDS);
  }

  state.totalPredictions++;
}

// ─── Public: Update with settled outcome ──────────────────────────────────
/**
 * Called from continuousLearningOrchestrator after a leg is settled.
 * Updates sport calibration, variance accuracy, convergence accuracy,
 * and the stacked weight in real time.
 */
export function updateMCWithOutcome(
  gameId: string,
  betType: string,
  outcome: "won" | "lost" | "push"
): void {
  const id = `${gameId}_${betType}`;
  const record = state.records.find(r => r.id === id);
  if (!record || record.outcome) return;

  record.outcome = outcome;
  record.settledAt = Date.now();
  state.totalSettled++;

  if (outcome === "push") {
    saveState();
    return;
  }

  const won = outcome === "won" ? 1 : 0;
  const sport = record.sport;

  // ── Sport calibration ─────────────────────────────────────────────────
  if (!state.sportCalibration[sport]) {
    state.sportCalibration[sport] = {
      biasSum: 0, count: 0,
      overconfidentCount: 0, underconfidentCount: 0,
      varianceEMA: record.mcVariance, winRate: null,
    };
  }
  const sc = state.sportCalibration[sport];
  const bias = record.mcWinProb - won;
  sc.biasSum += bias;
  sc.count++;
  sc.varianceEMA = sc.varianceEMA * 0.97 + record.mcVariance * 0.03;
  if (bias > 0.12) sc.overconfidentCount++;
  if (bias < -0.12) sc.underconfidentCount++;
  const sportSettled = state.records.filter(r => r.sport === sport && r.outcome && r.outcome !== "push");
  sc.winRate = sportSettled.length > 0
    ? sportSettled.filter(r => r.outcome === "won").length / sportSettled.length
    : null;

  // ── Bet type calibration ───────────────────────────────────────────────
  const bt = record.betType;
  if (!state.betTypeCalibration[bt]) {
    state.betTypeCalibration[bt] = { biasSum: 0, count: 0, wins: 0 };
  }
  const btc = state.betTypeCalibration[bt];
  btc.biasSum += bias;
  btc.count++;
  btc.wins += won;

  // ── Variance accuracy ─────────────────────────────────────────────────
  const normVar = normalizeVariance(sport, record.mcVariance);
  if (normVar < 0.45) {
    state.varianceAccuracy.lowVariance.total++;
    if (won) state.varianceAccuracy.lowVariance.wins++;
  } else {
    state.varianceAccuracy.highVariance.total++;
    if (won) state.varianceAccuracy.highVariance.wins++;
  }

  // ── Convergence accuracy ──────────────────────────────────────────────
  if (record.mcConvergence >= 0.75) {
    state.convergenceAccuracy.highConvergence.total++;
    if (won) state.convergenceAccuracy.highConvergence.wins++;
  } else {
    state.convergenceAccuracy.lowConvergence.total++;
    if (won) state.convergenceAccuracy.lowConvergence.wins++;
  }

  // ── Stacked weight real-time update ──────────────────────────────────
  // Only update weight when MC boost was meaningful (abs >= 3 points)
  if (Math.abs(record.mcBoostApplied) >= 3) {
    const mcWasRight = (record.mcBoostApplied > 0 && won === 1) || (record.mcBoostApplied < 0 && won === 0);
    const delta = mcWasRight ? LEARNING_RATE : -LEARNING_RATE;
    state.mcStackedWeight = Math.min(1.3, Math.max(0.7, state.mcStackedWeight + delta));
  }

  // ── Bullish accuracy: when MC predicted > 60% win prob ───────────────
  const bullish = state.records.filter(r => r.outcome && r.outcome !== "push" && r.mcWinProb > 0.60);
  if (bullish.length >= 10) {
    state.mcBullishAccuracy = (bullish.filter(r => r.outcome === "won").length / bullish.length) * 100;
  }

  saveState();
}

// ─── Public: Full learning cycle ──────────────────────────────────────────
/**
 * Runs periodically (daily) to recalibrate the MC stacked weight using
 * Pearson correlation between MC boost signal and actual outcomes.
 * A strong positive correlation → MC is predictive → increase weight.
 * Zero/negative correlation → MC isn't helping → reduce weight toward 0.85.
 */
export function runMCLearningCycle(): void {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const recentSettled = state.records.filter(r =>
    r.outcome && r.outcome !== "push" && r.settledAt && r.settledAt > thirtyDaysAgo
  ).slice(-150);

  if (recentSettled.length < MIN_PICKS_FOR_CALIBRATION) {
    logInfo(`[MCStacked] Cycle skipped — insufficient data (${recentSettled.length}/${MIN_PICKS_FOR_CALIBRATION} recent settled picks)`);
    return;
  }

  const n = recentSettled.length;
  let sumMC = 0, sumOut = 0;
  for (const r of recentSettled) {
    sumMC += r.mcBoostApplied;
    sumOut += r.outcome === "won" ? 1 : 0;
  }
  const mcMean = sumMC / n;
  const outMean = sumOut / n;

  let cov = 0, varMC = 0, varOut = 0;
  for (const r of recentSettled) {
    const out = r.outcome === "won" ? 1 : 0;
    cov += (r.mcBoostApplied - mcMean) * (out - outMean);
    varMC += (r.mcBoostApplied - mcMean) ** 2;
    varOut += (out - outMean) ** 2;
  }
  const correlation = (varMC > 0 && varOut > 0) ? cov / Math.sqrt(varMC * varOut) : 0;

  // Target weight: map correlation [-1,1] → weight [0.75, 1.3]
  // Perfectly predictive MC → 1.3, random → 0.75, anti-predictive → 0.7
  const targetWeight = 0.75 + ((correlation + 1) / 2) * 0.55;
  const prevWeight = state.mcStackedWeight;

  // Smooth update — only move 15% toward target per cycle
  state.mcStackedWeight = Math.min(1.3, Math.max(0.7,
    prevWeight * 0.85 + targetWeight * 0.15
  ));

  state.learningCycles++;
  state.lastCycleAt = new Date().toISOString();
  saveState();

  logInfo(`[MCStacked] Cycle #${state.learningCycles} — n=${n}, win_rate=${(outMean * 100).toFixed(1)}%, correlation=${correlation.toFixed(3)}, weight: ${prevWeight.toFixed(3)} → ${state.mcStackedWeight.toFixed(3)}`);
}

// ─── Public: Admin stats ──────────────────────────────────────────────────
export function getMCStackedStats() {
  const settled = state.records.filter(r => r.outcome && r.outcome !== "push");
  const wl = settled.length;
  const wins = settled.filter(r => r.outcome === "won").length;

  const lvTotal = state.varianceAccuracy.lowVariance.total;
  const hvTotal = state.varianceAccuracy.highVariance.total;
  const hcTotal = state.convergenceAccuracy.highConvergence.total;
  const lcTotal = state.convergenceAccuracy.lowConvergence.total;

  const betTypeBreakdown = Object.entries(state.betTypeCalibration).map(([bt, d]) => ({
    betType: bt,
    count: d.count,
    winRate: d.count > 0 ? ((d.wins / d.count) * 100).toFixed(1) : null,
    avgBias: d.count > 0 ? (d.biasSum / d.count).toFixed(3) : "0",
  }));

  const sportBreakdown = Object.entries(state.sportCalibration).map(([sport, sc]) => ({
    sport,
    count: sc.count,
    winRate: sc.winRate !== null ? (sc.winRate * 100).toFixed(1) : null,
    avgBias: sc.count > 0 ? (sc.biasSum / sc.count).toFixed(3) : "0",
    biasCorrection: getMCBiasCorrection(sport),
    overconfidenceRate: sc.count > 0 ? ((sc.overconfidentCount / sc.count) * 100).toFixed(1) : "0",
    avgVariance: sc.varianceEMA.toFixed(1),
  }));

  const status: string =
    state.totalSettled < 30  ? "building" :
    state.mcStackedWeight > 1.15 ? "mc_dominant" :
    state.mcStackedWeight < 0.85 ? "mc_reduced" :
    "balanced";

  const statusLabel: Record<string, string> = {
    building:     "Building Data",
    mc_dominant:  "MC Dominant — High Trust",
    mc_reduced:   "MC Reduced — Low Trust",
    balanced:     "Balanced",
  };

  return {
    mcStackedWeight: parseFloat(state.mcStackedWeight.toFixed(3)),
    status,
    statusLabel: statusLabel[status],
    totalPredictions: state.totalPredictions,
    totalSettled: state.totalSettled,
    overallWinRate: wl > 0 ? parseFloat(((wins / wl) * 100).toFixed(1)) : null,
    mcBullishAccuracy: state.mcBullishAccuracy ? parseFloat(state.mcBullishAccuracy.toFixed(1)) : null,
    varianceAccuracy: {
      lowVariance: {
        wins: state.varianceAccuracy.lowVariance.wins,
        total: lvTotal,
        winRate: lvTotal > 0 ? parseFloat(((state.varianceAccuracy.lowVariance.wins / lvTotal) * 100).toFixed(1)) : null,
      },
      highVariance: {
        wins: state.varianceAccuracy.highVariance.wins,
        total: hvTotal,
        winRate: hvTotal > 0 ? parseFloat(((state.varianceAccuracy.highVariance.wins / hvTotal) * 100).toFixed(1)) : null,
      },
    },
    convergenceAccuracy: {
      highConvergence: {
        wins: state.convergenceAccuracy.highConvergence.wins,
        total: hcTotal,
        winRate: hcTotal > 0 ? parseFloat(((state.convergenceAccuracy.highConvergence.wins / hcTotal) * 100).toFixed(1)) : null,
      },
      lowConvergence: {
        wins: state.convergenceAccuracy.lowConvergence.wins,
        total: lcTotal,
        winRate: lcTotal > 0 ? parseFloat(((state.convergenceAccuracy.lowConvergence.wins / lcTotal) * 100).toFixed(1)) : null,
      },
    },
    sportBreakdown,
    betTypeBreakdown,
    learningCycles: state.learningCycles,
    lastCycleAt: state.lastCycleAt,
    lastUpdated: state.lastUpdated,
    recentRecords: state.records
      .filter(r => r.outcome)
      .slice(-20)
      .reverse()
      .map(r => ({
        sport: r.sport,
        betType: r.betType,
        mcWinProb: r.mcWinProb,
        mcConvergence: r.mcConvergence,
        mcBoostApplied: r.mcBoostApplied,
        pickConfidence: r.pickConfidence,
        outcome: r.outcome,
      })),
  };
}
