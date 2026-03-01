/**
 * Unified Stacking Meta-Learner (USML)
 *
 * A stacked ensemble engine that treats every prediction source (QFE,
 * Monte Carlo, Vegas, Situational, Market Snapshot, Learning Engine) as
 * a "weak expert". It dynamically reweights each source based on its
 * historical accuracy per sport, per bet type, and per game context.
 *
 * Learning algorithm:
 *  - Exponential Moving Average (EMA) of accuracy per source × sport × betType
 *  - Momentum term: recent-10 win rate minus overall EMA → temporary boost/penalty
 *  - Agreement scoring: cross-source variance → epistemic uncertainty penalty
 *  - Online Bayesian credit assignment after every settled outcome
 *
 * The more outcomes the system sees, the more precisely each source is
 * calibrated, and the better the ensemble becomes.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logInfo, logWarn } from "./errorLogger";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const STATE_FILE  = path.join(__dirname, "..", ".usml-state.json");

// ─── Source IDs ────────────────────────────────────────────────────────────
export type SourceId =
  | "qfe"           // Quantum Fusion Engine (46-factor model)
  | "monte_carlo"   // Monte Carlo simulation
  | "vegas"         // Vegas engine (power-rating lines)
  | "situational"   // Situational factors (rest/travel/spot)
  | "market"        // Market snapshot (sharp money / line movement)
  | "learning";     // Continuous learning engine factor weights

// ─── Source signal submitted for a pick ────────────────────────────────────
export interface SourceSignal {
  sourceId: SourceId;
  /** Normalised pick-direction confidence from this source, 0–100 */
  confidence: number;
  /** How strong / present is this signal? 0 = no signal, 1 = full signal */
  strength: number;
}

// ─── Votes recorded at prediction time (kept for feedback) ─────────────────
interface SignalVote {
  sourceId: SourceId;
  confidence: number;
  strength: number;
  weight: number; // weight used at prediction time
}

interface PendingPrediction {
  pickId: string;
  sport: string;
  betType: string;
  votes: SignalVote[];
  ensembleConfidence: number;
  createdAt: string;
}

// ─── Per-source stat block ──────────────────────────────────────────────────
interface SourceStat {
  total: number;
  correct: number;
  ema: number;     // exponential moving average of accuracy [0,1]
  weight: number;  // derived weight [0.4, 2.0]
}

function defaultStat(baseWeight: number): SourceStat {
  return { total: 0, correct: 0, ema: 0.55, weight: baseWeight };
}

// ─── Per-source profile ─────────────────────────────────────────────────────
interface SourceProfile {
  id: SourceId;
  displayName: string;
  /** Starting weight — reflects prior belief in this source */
  baseWeight: number;
  /** Dynamic global weight (0.4–2.0), updated by learning */
  currentWeight: number;
  overall: SourceStat;
  bySport: Record<string, SourceStat>;
  byBetType: Record<string, SourceStat>;
  /** Rolling window of last 30 outcomes (true = correct) */
  recentWindow: boolean[];
  /** Momentum: last-10 avg – overall EMA. Range [-0.2, +0.2] */
  momentum: number;
  totalOutcomes: number;
  lastUpdated: string;
}

// ─── Global USML state ──────────────────────────────────────────────────────
interface USMLState {
  sources: Record<SourceId, SourceProfile>;
  /** Map of pickId → votes, kept until outcome arrives */
  pending: Record<string, PendingPrediction>;
  /**
   * Secondary index: `${sport}|${gameId}|${betType}` → pickId[]
   * Lets the settlement loop feed outcomes without needing the full pick text.
   */
  pendingByGame: Record<string, string[]>;
  totalEnsemblePredictions: number;
  totalEnsembleSettled: number;
  ensembleWins: number;
  ensembleEMA: number;      // overall ensemble EMA accuracy
  ensembleMomentum: number;
  learningCycles: number;
  lastCycleAt: string | null;
  version: number;
}

// ─── Initial source configurations (based on domain expertise) ────────────
const SOURCE_CONFIGS: Array<{
  id: SourceId;
  displayName: string;
  baseWeight: number;
}> = [
  { id: "qfe",         displayName: "46-Factor Model (QFE)",      baseWeight: 1.10 },
  { id: "monte_carlo", displayName: "Monte Carlo Engine",          baseWeight: 1.05 },
  { id: "vegas",       displayName: "Vegas Power Rating Engine",   baseWeight: 0.95 },
  { id: "situational", displayName: "Situational Factors Engine",  baseWeight: 0.85 },
  { id: "market",      displayName: "Market Snapshot / Sharp $",   baseWeight: 1.00 },
  { id: "learning",    displayName: "Continuous Learning Engine",  baseWeight: 0.90 },
];

function buildDefaultState(): USMLState {
  const sources = {} as Record<SourceId, SourceProfile>;
  for (const cfg of SOURCE_CONFIGS) {
    sources[cfg.id] = {
      id: cfg.id,
      displayName: cfg.displayName,
      baseWeight: cfg.baseWeight,
      currentWeight: cfg.baseWeight,
      overall: defaultStat(cfg.baseWeight),
      bySport: {},
      byBetType: {},
      recentWindow: [],
      momentum: 0,
      totalOutcomes: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  return {
    sources,
    pending: {},
    pendingByGame: {},
    totalEnsemblePredictions: 0,
    totalEnsembleSettled: 0,
    ensembleWins: 0,
    ensembleEMA: 0.52,
    ensembleMomentum: 0,
    learningCycles: 0,
    lastCycleAt: null,
    version: 1,
  };
}

// ─── Load / save state ──────────────────────────────────────────────────────
let state: USMLState = buildDefaultState();

function loadState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as USMLState;
      // Merge: preserve structure for any new sources added
      if (parsed.version === 1) {
        state = { ...buildDefaultState(), ...parsed };
        // Ensure all source profiles exist
        for (const cfg of SOURCE_CONFIGS) {
          if (!state.sources[cfg.id]) {
            state.sources[cfg.id] = {
              id: cfg.id,
              displayName: cfg.displayName,
              baseWeight: cfg.baseWeight,
              currentWeight: cfg.baseWeight,
              overall: defaultStat(cfg.baseWeight),
              bySport: {},
              byBetType: {},
              recentWindow: [],
              momentum: 0,
              totalOutcomes: 0,
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      }
    }
  } catch (e: any) {
    logWarn(`[USML] State load failed, using defaults: ${e.message}`);
    state = buildDefaultState();
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      // Limit pending map to 5000 entries to prevent unbounded growth
      const pendingEntries = Object.entries(state.pending);
      if (pendingEntries.length > 5000) {
        const keep = Object.fromEntries(pendingEntries.slice(-5000));
        state.pending = keep;
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e: any) {
      logWarn(`[USML] State save failed: ${e.message}`);
    }
  }, 5000);
}

// Initialise on module load
loadState();

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMA_ALPHA    = 0.08;  // ~window of 25 outcomes
const EMA_SPORT    = 0.12;  // faster sport-specific adaptation
const EMA_BETTYPE  = 0.10;
const WEIGHT_MIN   = 0.40;
const WEIGHT_MAX   = 2.00;
const CONF_HARD_MIN = 24;
const CONF_HARD_MAX = 72;

/** Map EMA accuracy [0,1] to a dynamic weight [0.4, 2.0] */
function emaToWeight(ema: number): number {
  // Linear: 0.50 accuracy → weight 1.0; 0.70 → weight 1.8; 0.30 → weight 0.4
  const w = 0.4 + (ema - 0.30) / (0.70 - 0.30) * (2.0 - 0.4);
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, w));
}

function computeMomentum(window: boolean[]): number {
  if (window.length < 10) return 0;
  const last10 = window.slice(-10);
  const last30 = window.slice(-30);
  const avg10 = last10.filter(Boolean).length / last10.length;
  const avg30 = last30.filter(Boolean).length / last30.length;
  return Math.max(-0.2, Math.min(0.2, (avg10 - avg30) * 1.5));
}

function ensureSourceStat(
  profile: SourceProfile,
  sport: string,
  betType: string,
): void {
  if (!profile.bySport[sport]) {
    profile.bySport[sport] = defaultStat(profile.baseWeight);
  }
  if (!profile.byBetType[betType]) {
    profile.byBetType[betType] = defaultStat(profile.baseWeight);
  }
}

/**
 * Effective weight for a source in a specific context.
 * Blends global weight, sport-specific weight, and bet-type weight.
 * Applies momentum bonus.
 */
function effectiveWeight(
  profile: SourceProfile,
  sport: string,
  betType: string,
): number {
  ensureSourceStat(profile, sport, betType);
  const global   = profile.currentWeight;
  const sportW   = profile.bySport[sport]?.weight   ?? profile.baseWeight;
  const betTypeW = profile.byBetType[betType]?.weight ?? profile.baseWeight;
  // Blend: 50% global, 30% sport-specific, 20% bet-type-specific
  const blended  = 0.50 * global + 0.30 * sportW + 0.20 * betTypeW;
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, blended + profile.momentum));
}

// ─── Core: compute ensemble confidence ────────────────────────────────────

export interface EnsembleResult {
  /** Final ensemble confidence (24–72) */
  ensembleConfidence: number;
  /** Per-source weight used in this prediction */
  sourceWeights: Partial<Record<SourceId, number>>;
  /** How much the sources agree: 0 (chaos) → 1 (perfect agreement) */
  signalAgreement: number;
  /** Which source has the highest effective weight */
  dominantSource: SourceId;
  /** Epistemic uncertainty classification */
  epistemic: "high" | "medium" | "low";
  /** Internal votes for feedback recording */
  _votes: SignalVote[];
}

export function getEnsembleConfidence(
  sport: string,
  betType: string,
  signals: SourceSignal[],
): EnsembleResult {
  if (signals.length === 0) {
    return {
      ensembleConfidence: 50,
      sourceWeights: {},
      signalAgreement: 0.5,
      dominantSource: "qfe",
      epistemic: "high",
      _votes: [],
    };
  }

  // Filter to signals with non-trivial strength
  const activeSignals = signals.filter(s => s.strength > 0.05);
  if (activeSignals.length === 0) {
    return {
      ensembleConfidence: 50,
      sourceWeights: {},
      signalAgreement: 0.5,
      dominantSource: "qfe",
      epistemic: "high",
      _votes: [],
    };
  }

  const votes: SignalVote[] = [];
  let totalWeight     = 0;
  let weightedConfSum = 0;
  let dominantId: SourceId = activeSignals[0].sourceId;
  let dominantW = -Infinity;

  for (const sig of activeSignals) {
    const profile = state.sources[sig.sourceId];
    if (!profile) continue;
    const w = effectiveWeight(profile, sport, betType) * sig.strength;
    votes.push({ sourceId: sig.sourceId, confidence: sig.confidence, strength: sig.strength, weight: w });
    totalWeight     += w;
    weightedConfSum += w * sig.confidence;
    if (w > dominantW) { dominantW = w; dominantId = sig.sourceId; }
  }

  let ensembleRaw = totalWeight > 0 ? weightedConfSum / totalWeight : 50;

  // ── Agreement scoring ───────────────────────────────────────────────────
  // Standard deviation of signal confidences (strength-weighted)
  const mean = ensembleRaw;
  const variance = votes.reduce((acc, v) => acc + v.strength * Math.pow(v.confidence - mean, 2), 0)
                 / Math.max(votes.reduce((a, v) => a + v.strength, 0), 1);
  const stdDev = Math.sqrt(variance);

  // Agreement ∈ [0,1]: 0 std → 1.0 agreement; 25 std → 0.0 agreement
  const signalAgreement = Math.max(0, Math.min(1, 1 - stdDev / 25));

  // Boost when all sources converge on a high-confidence pick
  let agreementAdj = 0;
  if (signalAgreement > 0.82 && ensembleRaw >= 60) agreementAdj = +3;
  else if (signalAgreement > 0.70) agreementAdj = +1;
  else if (signalAgreement < 0.40) agreementAdj = -4;
  else if (signalAgreement < 0.55) agreementAdj = -2;

  const ensembleConfidence = Math.round(
    Math.max(CONF_HARD_MIN, Math.min(CONF_HARD_MAX, ensembleRaw + agreementAdj))
  );

  const epistemic: "high" | "medium" | "low" =
    signalAgreement > 0.72 ? "low" :
    signalAgreement > 0.48 ? "medium" : "high";

  const sourceWeights: Partial<Record<SourceId, number>> = {};
  for (const v of votes) sourceWeights[v.sourceId] = parseFloat(v.weight.toFixed(3));

  return {
    ensembleConfidence,
    sourceWeights,
    signalAgreement: parseFloat(signalAgreement.toFixed(3)),
    dominantSource: dominantId,
    epistemic,
    _votes: votes,
  };
}

// ─── Record prediction (for feedback tracking) ────────────────────────────

export function recordEnsemblePrediction(
  pickId: string,
  sport: string,
  betType: string,
  result: EnsembleResult,
  gameId?: string,
): void {
  state.pending[pickId] = {
    pickId,
    sport,
    betType,
    votes: result._votes,
    ensembleConfidence: result.ensembleConfidence,
    createdAt: new Date().toISOString(),
  };
  // Populate secondary index for settlement feedback via gameId+betType
  if (gameId) {
    const gameKey = `${sport}|${gameId}|${betType}`;
    if (!state.pendingByGame[gameKey]) state.pendingByGame[gameKey] = [];
    if (!state.pendingByGame[gameKey].includes(pickId)) {
      state.pendingByGame[gameKey].push(pickId);
    }
  }
  state.totalEnsemblePredictions++;
  scheduleSave();
}

/**
 * Feed an outcome using sport + gameId + betType (without needing full pickId).
 * Called from the settlement loop in the orchestrator.
 */
export function feedEnsembleOutcomeByGame(
  gameId: string,
  sport: string,
  betType: string,
  outcome: "won" | "lost" | "push",
): void {
  const gameKey = `${sport}|${gameId}|${betType}`;
  const pickIds = state.pendingByGame[gameKey];
  if (!pickIds || pickIds.length === 0) return;
  // Feed outcome to all picks for this game+betType
  for (const pid of pickIds) {
    feedEnsembleOutcome(pid, outcome);
  }
  delete state.pendingByGame[gameKey];
  scheduleSave();
}

// ─── Feedback: record outcome and update source weights ───────────────────

/**
 * Called after a pick is settled.
 * Updates EMA accuracy and dynamic weight for every source that voted.
 */
export function feedEnsembleOutcome(
  pickId: string,
  outcome: "won" | "lost" | "push",
): void {
  if (outcome === "push") {
    // Pushes are neutral — remove from pending but don't update weights
    delete state.pending[pickId];
    scheduleSave();
    return;
  }

  const pred = state.pending[pickId];
  if (!pred) return; // no record — source may have been fresh restart

  const won = outcome === "won";
  const { sport, betType, votes } = pred;

  state.totalEnsembleSettled++;
  if (won) state.ensembleWins++;

  // Update overall ensemble EMA
  state.ensembleEMA = (1 - EMA_ALPHA) * state.ensembleEMA + EMA_ALPHA * (won ? 1 : 0);

  // Credit assignment per source:
  // A source is considered "correct" if its confidence was in the right half
  // (>50 for won, <50 for lost) — weighted by how strongly it voted.
  for (const vote of votes) {
    const profile = state.sources[vote.sourceId];
    if (!profile) continue;

    ensureSourceStat(profile, sport, betType);

    // Direction: correct if confidence > 50 and won, or < 50 and lost
    const directionCorrect = won ? vote.confidence > 50 : vote.confidence < 50;

    // Update overall EMA
    const update = directionCorrect ? 1 : 0;
    profile.overall.ema    = (1 - EMA_ALPHA) * profile.overall.ema + EMA_ALPHA * update;
    profile.overall.total++;
    if (directionCorrect) profile.overall.correct++;
    profile.overall.weight = emaToWeight(profile.overall.ema);

    // Update sport-specific EMA
    const sp = profile.bySport[sport]!;
    sp.ema    = (1 - EMA_SPORT) * sp.ema + EMA_SPORT * update;
    sp.total++;
    if (directionCorrect) sp.correct++;
    sp.weight = emaToWeight(sp.ema);

    // Update bet-type-specific EMA
    const bt = profile.byBetType[betType]!;
    bt.ema    = (1 - EMA_BETTYPE) * bt.ema + EMA_BETTYPE * update;
    bt.total++;
    if (directionCorrect) bt.correct++;
    bt.weight = emaToWeight(bt.ema);

    // Update rolling window
    profile.recentWindow.push(directionCorrect);
    if (profile.recentWindow.length > 50) profile.recentWindow.shift();

    // Recompute momentum and global weight
    profile.momentum      = computeMomentum(profile.recentWindow);
    profile.currentWeight = emaToWeight(profile.overall.ema);
    profile.totalOutcomes++;
    profile.lastUpdated   = new Date().toISOString();
  }

  // Compute ensemble-level momentum (last-10 wins vs overall EMA)
  // We track a rolling window on the state object itself
  if (!Array.isArray((state as any)._ensembleWindow)) {
    (state as any)._ensembleWindow = [] as boolean[];
  }
  const ew = (state as any)._ensembleWindow as boolean[];
  ew.push(won);
  if (ew.length > 50) ew.shift();
  state.ensembleMomentum = computeMomentum(ew);

  delete state.pending[pickId];
  scheduleSave();
}

// ─── Daily learning cycle ─────────────────────────────────────────────────

/**
 * Runs a cross-source correlation analysis and logs the current weights.
 * Called once per day by the orchestrator.
 */
export function runUSMLLearningCycle(): void {
  state.learningCycles++;
  state.lastCycleAt = new Date().toISOString();

  const lines: string[] = [];
  for (const sid of Object.keys(state.sources) as SourceId[]) {
    const p = state.sources[sid];
    const acc = p.overall.total > 0
      ? ((p.overall.correct / p.overall.total) * 100).toFixed(1)
      : "n/a";
    lines.push(
      `  ${p.displayName}: weight=${p.currentWeight.toFixed(3)}, acc=${acc}% (n=${p.overall.total}), momentum=${p.momentum > 0 ? "+" : ""}${p.momentum.toFixed(3)}`
    );
  }

  logInfo(
    `[USML] Learning cycle #${state.learningCycles} — ensemble EMA=${(state.ensembleEMA * 100).toFixed(1)}% (${state.totalEnsembleSettled} settled)\n${lines.join("\n")}`
  );

  scheduleSave();
}

// ─── Admin stats ──────────────────────────────────────────────────────────

export function getUSMLStats() {
  const sourceStats = (Object.keys(state.sources) as SourceId[]).map(sid => {
    const p = state.sources[sid];
    const acc = p.overall.total > 0
      ? parseFloat(((p.overall.correct / p.overall.total) * 100).toFixed(1))
      : null;

    const sportBreakdown = Object.entries(p.bySport).map(([sp, s]) => ({
      sport: sp,
      total: s.total,
      correct: s.correct,
      ema: parseFloat((s.ema * 100).toFixed(1)),
      weight: parseFloat(s.weight.toFixed(3)),
    }));

    const betTypeBreakdown = Object.entries(p.byBetType).map(([bt, s]) => ({
      betType: bt,
      total: s.total,
      correct: s.correct,
      ema: parseFloat((s.ema * 100).toFixed(1)),
      weight: parseFloat(s.weight.toFixed(3)),
    }));

    return {
      id: p.id,
      displayName: p.displayName,
      baseWeight: p.baseWeight,
      currentWeight: parseFloat(p.currentWeight.toFixed(3)),
      ema: parseFloat((p.overall.ema * 100).toFixed(1)),
      accuracy: acc,
      totalOutcomes: p.totalOutcomes,
      momentum: parseFloat(p.momentum.toFixed(3)),
      momentumLabel: p.momentum > 0.05 ? "rising" : p.momentum < -0.05 ? "falling" : "stable",
      sportBreakdown,
      betTypeBreakdown,
    };
  });

  return {
    ensembleEMA: parseFloat((state.ensembleEMA * 100).toFixed(1)),
    ensembleMomentum: parseFloat(state.ensembleMomentum.toFixed(3)),
    totalPredictions: state.totalEnsemblePredictions,
    totalSettled: state.totalEnsembleSettled,
    ensembleWins: state.ensembleWins,
    ensembleWinRate: state.totalEnsembleSettled > 0
      ? parseFloat(((state.ensembleWins / state.totalEnsembleSettled) * 100).toFixed(1))
      : null,
    learningCycles: state.learningCycles,
    lastCycleAt: state.lastCycleAt,
    pendingCount: Object.keys(state.pending).length,
    sources: sourceStats,
  };
}
