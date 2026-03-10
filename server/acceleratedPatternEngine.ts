/**
 * Accelerated Pattern Intelligence Engine™
 *
 * Mines ALL historical settled picks at once rather than learning incrementally,
 * finding factor-combination win-rate patterns that boost or penalize confidence
 * on new picks. The engine re-mines every 15 minutes and applies learning
 * at 5x the rate of the standard weight-update system.
 *
 * Algorithm:
 *  1. Load every settled pick from pick-outcomes-data.json
 *  2. Classify each pick into derivable feature dimensions:
 *       sport × betType × oddsTier × confBand × evTier
 *  3. Compute win rate + edge-over-base for every pattern cell
 *  4. Export getPatternBoost() for real-time confidence adjustment
 *  5. Refresh every 15 min — newly settled picks absorbed immediately
 */

import * as fs from "fs";
import * as path from "path";
import { logInfo } from "./errorLogger";

const PICK_FILE = path.join(process.cwd(), "pick-outcomes-data.json");
const PATTERN_CACHE_FILE = path.join(process.cwd(), "accelerated-pattern-cache.json");

const REFRESH_INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes
const MIN_SAMPLE_SIZE      = 8;   // min picks before a pattern is trusted
const MAX_BOOST            = 14;  // max confidence points added
const MAX_PENALTY          = 10;  // max confidence points removed
const BASE_WIN_RATE        = 0.52; // expected baseline (52% market edge)

// ── Feature extractors ────────────────────────────────────────────────────

type OddsTier = "heavy_fav" | "fav" | "neutral" | "slight_dog" | "heavy_dog";
type ConfBand = "50s" | "60s" | "70s" | "80s" | "90s";
type EvTier   = "low" | "medium" | "high" | "very_high";

function classifyOdds(american: number): OddsTier {
  if (american <= -200)       return "heavy_fav";
  if (american < -110)        return "fav";
  if (american <= 110)        return "neutral";
  if (american <= 250)        return "slight_dog";
  return "heavy_dog";
}

function classifyConf(confidence: number): ConfBand {
  if (confidence >= 90) return "90s";
  if (confidence >= 80) return "80s";
  if (confidence >= 70) return "70s";
  if (confidence >= 60) return "60s";
  return "50s";
}

function classifyEv(ev: number): EvTier {
  if (ev >= 50)  return "very_high";
  if (ev >= 20)  return "high";
  if (ev >= 8)   return "medium";
  return "low";
}

// ── Pattern key builders ──────────────────────────────────────────────────

/** Full-detail pattern: sport × market × odds × conf × ev */
function fullKey(sport: string, betType: string, oddsTier: OddsTier, confBand: ConfBand, evTier: EvTier): string {
  return `${sport}:${betType}:${oddsTier}:${confBand}:${evTier}`;
}

/** Mid-level pattern: sport × market × odds (ignores conf+ev) */
function midKey(sport: string, betType: string, oddsTier: OddsTier): string {
  return `${sport}:${betType}:${oddsTier}`;
}

/** Broad pattern: sport × market only */
function broadKey(sport: string, betType: string): string {
  return `${sport}:${betType}`;
}

/** Underdog-intelligence pattern: any sport where odds > +200 */
function underdogKey(sport: string, confBand: ConfBand): string {
  return `DOG:${sport}:${confBand}`;
}

// ── Win rate cell ─────────────────────────────────────────────────────────

interface PatternCell {
  wins:    number;
  losses:  number;
  total:   number;
  winRate: number;
  edgeOverBase: number; // winRate - BASE_WIN_RATE
  lastUpdated: string;
}

type PatternMap = Record<string, PatternCell>;

interface EngineState {
  patterns:      PatternMap;
  sportAccuracy: Record<string, { wins: number; total: number; winRate: number }>;
  marketAccuracy: Record<string, { wins: number; total: number; winRate: number }>;
  topWinPatterns:  Array<{ key: string; winRate: number; total: number; boost: number }>;
  topLosePatterns: Array<{ key: string; winRate: number; total: number; penalty: number }>;
  totalSettled:  number;
  lastMined:     string | null;
  cycleCount:    number;
}

let state: EngineState = {
  patterns:       {},
  sportAccuracy:  {},
  marketAccuracy: {},
  topWinPatterns:  [],
  topLosePatterns: [],
  totalSettled:   0,
  lastMined:      null,
  cycleCount:     0,
};

// ── Main mining function ──────────────────────────────────────────────────

function loadSettledPicks(): any[] {
  try {
    if (!fs.existsSync(PICK_FILE)) return [];
    const raw = fs.readFileSync(PICK_FILE, "utf-8");
    const data = JSON.parse(raw);
    const picks = Array.isArray(data) ? data : (data.picks || data.settled || []);
    return picks.filter((p: any) => p.result === "won" || p.result === "lost");
  } catch {
    return [];
  }
}

function minePatterns(): void {
  const settled = loadSettledPicks();
  if (settled.length === 0) return;

  const newPatterns: PatternMap = {};
  const sportAcc:   Record<string, { wins: number; total: number }> = {};
  const marketAcc:  Record<string, { wins: number; total: number }> = {};

  function inc(map: PatternMap, key: string, won: boolean): void {
    if (!map[key]) map[key] = { wins: 0, losses: 0, total: 0, winRate: 0, edgeOverBase: 0, lastUpdated: "" };
    map[key].total++;
    if (won) map[key].wins++;
    else     map[key].losses++;
  }

  for (const pick of settled) {
    const sport    = (pick.sport || "UNKNOWN").toUpperCase();
    const betType  = (pick.betType || "moneyline").toLowerCase();
    const odds     = Number(pick.odds) || -110;
    const conf     = Number(pick.confidence) || 55;
    const ev       = Number(pick.ev) || 0;
    const won      = pick.result === "won";

    const oddsTier = classifyOdds(odds);
    const confBand = classifyConf(conf);
    const evTier   = classifyEv(ev);

    // Register across all pattern granularities
    inc(newPatterns, fullKey(sport, betType, oddsTier, confBand, evTier), won);
    inc(newPatterns, midKey(sport, betType, oddsTier), won);
    inc(newPatterns, broadKey(sport, betType), won);
    if (odds > 200) inc(newPatterns, underdogKey(sport, confBand), won);

    // Sport accuracy
    if (!sportAcc[sport]) sportAcc[sport] = { wins: 0, total: 0 };
    sportAcc[sport].total++;
    if (won) sportAcc[sport].wins++;

    // Market accuracy
    if (!marketAcc[betType]) marketAcc[betType] = { wins: 0, total: 0 };
    marketAcc[betType].total++;
    if (won) marketAcc[betType].wins++;
  }

  // Finalize win rates and edges
  const now = new Date().toISOString();
  for (const [key, cell] of Object.entries(newPatterns)) {
    cell.winRate      = cell.total > 0 ? cell.wins / cell.total : BASE_WIN_RATE;
    cell.edgeOverBase = cell.winRate - BASE_WIN_RATE;
    cell.lastUpdated  = now;
  }

  // Rank top winning and losing patterns (min sample = MIN_SAMPLE_SIZE)
  const ranked = Object.entries(newPatterns)
    .filter(([, c]) => c.total >= MIN_SAMPLE_SIZE)
    .sort(([, a], [, b]) => b.edgeOverBase - a.edgeOverBase);

  const topWin = ranked.slice(0, 12).map(([key, c]) => ({
    key,
    winRate: Math.round(c.winRate * 1000) / 10,
    total: c.total,
    boost: computeBoost(c.winRate, c.total),
  }));

  const topLose = ranked.slice(-8).reverse().map(([key, c]) => ({
    key,
    winRate: Math.round(c.winRate * 1000) / 10,
    total: c.total,
    penalty: computePenalty(c.winRate, c.total),
  }));

  // Build final sport/market accuracy maps
  const sportAccuracy: Record<string, { wins: number; total: number; winRate: number }> = {};
  for (const [sport, acc] of Object.entries(sportAcc)) {
    sportAccuracy[sport] = { wins: acc.wins, total: acc.total, winRate: acc.total > 0 ? Math.round(acc.wins / acc.total * 1000) / 10 : 50 };
  }
  const marketAccuracy: Record<string, { wins: number; total: number; winRate: number }> = {};
  for (const [market, acc] of Object.entries(marketAcc)) {
    marketAccuracy[market] = { wins: acc.wins, total: acc.total, winRate: acc.total > 0 ? Math.round(acc.wins / acc.total * 1000) / 10 : 50 };
  }

  state = {
    patterns:       newPatterns,
    sportAccuracy,
    marketAccuracy,
    topWinPatterns:  topWin,
    topLosePatterns: topLose,
    totalSettled:   settled.length,
    lastMined:      now,
    cycleCount:     state.cycleCount + 1,
  };

  // Persist to disk for admin inspection
  try {
    const { patterns: _p, ...rest } = state;
    fs.writeFileSync(PATTERN_CACHE_FILE, JSON.stringify({ ...rest, patternCount: Object.keys(newPatterns).length }, null, 2));
  } catch {}

  logInfo(`[AcceleratedPattern] Cycle #${state.cycleCount}: mined ${settled.length} picks → ${Object.keys(newPatterns).length} patterns | top boost: +${topWin[0]?.boost ?? 0} | top penalty: -${topLose[0]?.penalty ?? 0}`);
}

// ── Boost / penalty calculators ───────────────────────────────────────────

/**
 * Boost formula: scales from 0 → MAX_BOOST as edgeOverBase goes from 0 → +0.20
 * Confidence in the pattern increases with sample size (capped at n=50).
 */
function computeBoost(winRate: number, total: number): number {
  const edge    = winRate - BASE_WIN_RATE;
  if (edge <= 0) return 0;
  const sizeConf = Math.min(1.0, total / 50); // 0→1 as total 0→50
  const rawBoost = (edge / 0.20) * MAX_BOOST;
  return Math.round(Math.min(MAX_BOOST, rawBoost * sizeConf));
}

/**
 * Penalty formula: scales from 0 → MAX_PENALTY as edge goes from 0 → -0.15
 */
function computePenalty(winRate: number, total: number): number {
  const edge = winRate - BASE_WIN_RATE;
  if (edge >= 0) return 0;
  const sizeConf  = Math.min(1.0, total / 40);
  const rawPenalty = (Math.abs(edge) / 0.15) * MAX_PENALTY;
  return Math.round(Math.min(MAX_PENALTY, rawPenalty * sizeConf));
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a confidence adjustment (positive = boost, negative = penalty)
 * for a pick based on mined historical patterns. Falls through from most
 * specific to least specific pattern until a statistically reliable match
 * is found.
 */
export function getPatternBoost(
  sport:      string,
  betType:    string,
  odds:       number,
  confidence: number,
  ev:         number,
): number {
  if (state.totalSettled < 20) return 0; // not enough data yet

  const sp       = sport.toUpperCase();
  const bt       = betType.toLowerCase();
  const oddsTier = classifyOdds(odds);
  const confBand = classifyConf(confidence);
  const evTier   = classifyEv(ev);

  // Try most-specific pattern first
  const keys = [
    fullKey(sp, bt, oddsTier, confBand, evTier),
    midKey(sp, bt, oddsTier),
    broadKey(sp, bt),
    odds > 200 ? underdogKey(sp, confBand) : null,
  ].filter(Boolean) as string[];

  for (const key of keys) {
    const cell = state.patterns[key];
    if (cell && cell.total >= MIN_SAMPLE_SIZE) {
      if (cell.edgeOverBase > 0.01)  return  computeBoost(cell.winRate, cell.total);
      if (cell.edgeOverBase < -0.01) return -computePenalty(cell.winRate, cell.total);
      return 0; // pattern exists but no meaningful edge
    }
  }

  return 0; // no reliable pattern found
}

/**
 * Returns sport-level accuracy metadata for admin display.
 */
export function getSportAccuracy(): EngineState["sportAccuracy"] {
  return state.sportAccuracy;
}

/**
 * Returns market-level accuracy metadata for admin display.
 */
export function getMarketAccuracy(): EngineState["marketAccuracy"] {
  return state.marketAccuracy;
}

/**
 * Returns full engine state for admin status endpoint.
 */
export function getAcceleratedPatternStatus(): Omit<EngineState, "patterns"> & { patternCount: number } {
  return {
    sportAccuracy:   state.sportAccuracy,
    marketAccuracy:  state.marketAccuracy,
    topWinPatterns:  state.topWinPatterns,
    topLosePatterns: state.topLosePatterns,
    totalSettled:    state.totalSettled,
    lastMined:       state.lastMined,
    cycleCount:      state.cycleCount,
    patternCount:    Object.keys(state.patterns).length,
  };
}

// ── Startup + scheduler ───────────────────────────────────────────────────

let _started = false;

export function startAcceleratedPatternEngine(): void {
  if (_started) return;
  _started = true;

  // Initial mine — synchronous so picks are available immediately
  minePatterns();

  // Re-mine every 15 minutes
  setInterval(() => {
    minePatterns();
  }, REFRESH_INTERVAL_MS);

  logInfo("[AcceleratedPattern] Engine started — pattern boost active for all new picks");
}
