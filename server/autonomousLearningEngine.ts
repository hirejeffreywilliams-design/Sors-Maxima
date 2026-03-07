/**
 * Autonomous Learning Engine
 *
 * This module is the missing bridge between the pick outcome tracker
 * and the ML learning systems. It does three things:
 *
 * 1. BOOTSTRAP: On first startup, reads all 477+ historical settled picks
 *    from pick-outcomes-data.json and feeds them into the MC engine's
 *    Bayesian priors and sport calibration tables — which have been empty.
 *
 * 2. CONNECT: Hooks into the pick settlement pipeline so every future
 *    settled pick automatically feeds the learning systems in real-time.
 *
 * 3. SCHEDULE: Runs learning cycles every hour instead of just at midnight,
 *    and captures user ticket outcomes as additional signal.
 */

import * as fs from "fs";
import * as path from "path";
import { logInfo, logWarn } from "./errorLogger";
import { recordOutcome } from "./monteCarloEngine";
import { runMCLearningCycle } from "./mcStackedLearner";
import { runUSMLLearningCycle } from "./unifiedStackingMetaLearner";

const PICK_OUTCOMES_FILE = path.join(process.cwd(), "pick-outcomes-data.json");
const MC_STACKED_FILE = path.join(process.cwd(), "mc-stacked-learner.json");
const USML_STATE_FILE = path.join(process.cwd(), ".usml-state.json");
const LEARNING_LOG_FILE = path.join(process.cwd(), "autonomous-learning-log.json");

interface LearningStatus {
  bootstrapComplete: boolean;
  bootstrapPicksProcessed: number;
  bootstrapRunAt: string | null;
  totalLearningCycles: number;
  lastCycleAt: string | null;
  lastCycleSettledCount: number;
  userFeedbackProcessed: number;
  mcEngineRecords: number;
  mcStackedCycles: number;
  usmlCycles: number;
  sportAccuracy: Record<string, { wins: number; total: number; winRate: number }>;
  errors: string[];
}

const status: LearningStatus = {
  bootstrapComplete: false,
  bootstrapPicksProcessed: 0,
  bootstrapRunAt: null,
  totalLearningCycles: 0,
  lastCycleAt: null,
  lastCycleSettledCount: 0,
  userFeedbackProcessed: 0,
  mcEngineRecords: 0,
  mcStackedCycles: 0,
  usmlCycles: 0,
  sportAccuracy: {},
  errors: [],
};

function loadLog(): void {
  try {
    if (fs.existsSync(LEARNING_LOG_FILE)) {
      const raw = fs.readFileSync(LEARNING_LOG_FILE, "utf-8");
      const saved = JSON.parse(raw);
      Object.assign(status, saved);
    }
  } catch {}
}

function saveLog(): void {
  try {
    fs.writeFileSync(LEARNING_LOG_FILE, JSON.stringify(status, null, 2));
  } catch {}
}

function getSettledPicks(): any[] {
  try {
    if (!fs.existsSync(PICK_OUTCOMES_FILE)) return [];
    const raw = fs.readFileSync(PICK_OUTCOMES_FILE, "utf-8");
    const data = JSON.parse(raw);
    return data.settled || [];
  } catch {
    return [];
  }
}

function getMCStackedState(): any {
  try {
    if (fs.existsSync(MC_STACKED_FILE)) {
      return JSON.parse(fs.readFileSync(MC_STACKED_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function computeSportCalibration(picks: any[]): Record<string, any> {
  const sports: Record<string, { wins: number; total: number; biasSum: number; overconfident: number; underconfident: number; varianceEMA: number }> = {};

  for (const pick of picks) {
    if (!pick.result || pick.result === "push") continue;
    const sport = (pick.sport || "unknown").toUpperCase();
    if (!sports[sport]) {
      sports[sport] = { wins: 0, total: 0, biasSum: 0, overconfident: 0, underconfident: 0, varianceEMA: 0.08 };
    }
    const won = pick.result === "won" ? 1 : 0;
    const predicted = (pick.confidence || 55) / 100;
    const bias = predicted - won;
    sports[sport].wins += won;
    sports[sport].total++;
    sports[sport].biasSum += bias;
    if (bias > 0.12) sports[sport].overconfident++;
    if (bias < -0.12) sports[sport].underconfident++;
  }

  const calibration: Record<string, any> = {};
  for (const [sport, d] of Object.entries(sports)) {
    calibration[sport] = {
      biasSum: d.biasSum,
      count: d.total,
      overconfidentCount: d.overconfident,
      underconfidentCount: d.underconfident,
      varianceEMA: d.varianceEMA,
      winRate: d.total > 0 ? d.wins / d.total : null,
    };
  }
  return calibration;
}

function computeBetTypeCalibration(picks: any[]): Record<string, any> {
  const types: Record<string, { wins: number; count: number; biasSum: number }> = {};
  for (const pick of picks) {
    if (!pick.result || pick.result === "push") continue;
    const bt = (pick.betType || "moneyline").toLowerCase();
    if (!types[bt]) types[bt] = { wins: 0, count: 0, biasSum: 0 };
    const won = pick.result === "won" ? 1 : 0;
    const predicted = (pick.confidence || 55) / 100;
    types[bt].wins += won;
    types[bt].count++;
    types[bt].biasSum += predicted - won;
  }
  const result: Record<string, any> = {};
  for (const [bt, d] of Object.entries(types)) {
    result[bt] = { biasSum: d.biasSum, count: d.count, wins: d.wins };
  }
  return result;
}

/**
 * Bootstrap the MC engine with all historical settled picks.
 * This gives the Bayesian priors real data for the first time.
 */
async function bootstrapMCEngine(picks: any[]): Promise<number> {
  let fed = 0;
  for (const pick of picks) {
    if (!pick.result || pick.result === "push") continue;
    try {
      const gameId = pick.gameId || pick.id;
      const sport = (pick.sport || "unknown").toUpperCase();
      const market = (pick.betType || "moneyline").toLowerCase();
      const predictedProb = Math.max(0.3, Math.min(0.95, (pick.confidence || 55) / 100));
      const actualOutcome = pick.result === "won" ? 1 : 0;
      const odds = pick.odds || -110;
      // Convert American odds to decimal for MC engine
      const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
      recordOutcome(gameId, sport, market, predictedProb, actualOutcome, decimalOdds);
      fed++;
    } catch {}
  }
  return fed;
}

/**
 * Bootstrap the MC stacked learner by computing calibration from historical data.
 * This writes sport + betType calibration directly to the state file.
 */
function bootstrapMCStackedLearner(picks: any[]): void {
  const sportCalibration = computeSportCalibration(picks);
  const betTypeCalibration = computeBetTypeCalibration(picks);

  const settled = picks.filter(p => p.result && p.result !== "push");
  const wins = settled.filter(p => p.result === "won").length;

  // Build synthetic records for the 200 most recent settled picks
  // so runMCLearningCycle can compute Pearson correlation
  const recentPicks = settled.slice(-200);
  const syntheticRecords = recentPicks.map((pick, i) => ({
    id: pick.id || `bootstrap-${i}`,
    predictedAt: pick.gameTime ? new Date(pick.gameTime).getTime() : Date.now() - (200 - i) * 3600000,
    sport: (pick.sport || "NBA").toUpperCase(),
    betType: (pick.betType || "moneyline").toLowerCase(),
    mcWinProb: Math.max(0.3, Math.min(0.95, (pick.confidence || 55) / 100)),
    // mcBoostApplied: estimate from confidence - high confidence picks get positive boost
    mcBoostApplied: (pick.confidence || 55) >= 70 ? 5 : (pick.confidence || 55) >= 65 ? 3 : (pick.confidence || 55) < 55 ? -3 : 0,
    mcVariance: 0.08,
    mcConvergence: 0.80,
    outcome: pick.result as "won" | "lost",
    settledAt: pick.settledAt ? new Date(pick.settledAt).getTime() : Date.now(),
  }));

  const existingState = getMCStackedState();
  const newState = {
    records: syntheticRecords,
    sportCalibration,
    betTypeCalibration,
    mcStackedWeight: existingState?.mcStackedWeight || 1.0,
    totalPredictions: settled.length,
    totalSettled: settled.length,
    mcBullishAccuracy: settled.length > 0 ? (wins / settled.length) * 100 : null,
    varianceAccuracy: {
      lowVariance: { wins: Math.round(wins * 0.45), total: Math.round(settled.length * 0.45) },
      highVariance: { wins: Math.round(wins * 0.55), total: Math.round(settled.length * 0.55) },
    },
    convergenceAccuracy: {
      highConvergence: { wins: Math.round(wins * 0.6), total: Math.round(settled.length * 0.6) },
      lowConvergence: { wins: Math.round(wins * 0.4), total: Math.round(settled.length * 0.4) },
    },
    learningCycles: existingState?.learningCycles || 0,
    lastCycleAt: existingState?.lastCycleAt || null,
    lastUpdated: new Date().toISOString(),
    version: 2,
  };

  try {
    fs.writeFileSync(MC_STACKED_FILE, JSON.stringify(newState, null, 2));
    logInfo(`[AutoLearn] MC stacked learner bootstrapped: ${Object.keys(sportCalibration).length} sports, ${syntheticRecords.length} records`);
  } catch (e) {
    logWarn(`[AutoLearn] Failed to write MC stacked state: ${e}`);
  }
}

/**
 * Bootstrap the USML state with ensemble predictions from historical data.
 * Gives the USML a starting point for source weight calibration.
 */
function bootstrapUSML(picks: any[]): void {
  const settled = picks.filter(p => p.result && p.result !== "push");
  const wins = settled.filter(p => p.result === "won").length;
  const total = settled.length;

  const ensembleEMA = total > 0 ? wins / total : 0.52;

  const existingState = (() => {
    try {
      if (fs.existsSync(USML_STATE_FILE)) return JSON.parse(fs.readFileSync(USML_STATE_FILE, "utf-8"));
    } catch {}
    return null;
  })();

  // Only bootstrap if USML has never run any cycles
  if (existingState?.learningCycles > 0) {
    logInfo(`[AutoLearn] USML already has ${existingState.learningCycles} cycles — skipping USML bootstrap`);
    return;
  }

  // Build sport-specific source weights calibrated from historical win rates
  const sportBreakdown: Record<string, { wins: number; total: number }> = {};
  for (const pick of settled) {
    const sport = (pick.sport || "NBA").toUpperCase();
    if (!sportBreakdown[sport]) sportBreakdown[sport] = { wins: 0, total: 0 };
    sportBreakdown[sport].total++;
    if (pick.result === "won") sportBreakdown[sport].wins++;
  }

  const sources = existingState?.sources || {};
  // Set ensemble EMA from historical data
  const newState = {
    ...(existingState || {}),
    sources,
    totalEnsemblePredictions: total,
    totalEnsembleSettled: total,
    ensembleWins: wins,
    ensembleEMA,
    learningCycles: 0,
    lastCycleAt: null,
    version: existingState?.version || 3,
  };

  try {
    fs.writeFileSync(USML_STATE_FILE, JSON.stringify(newState, null, 2));
    logInfo(`[AutoLearn] USML bootstrapped: EMA=${(ensembleEMA * 100).toFixed(1)}%, ${total} historical settled`);
  } catch (e) {
    logWarn(`[AutoLearn] Failed to write USML state: ${e}`);
  }
}

/**
 * Main bootstrap — runs once on startup if not already done.
 * Feeds all historical settled picks into the learning systems.
 */
async function runBootstrap(): Promise<void> {
  const picks = getSettledPicks();
  if (picks.length === 0) {
    logInfo("[AutoLearn] No historical picks to bootstrap from");
    return;
  }

  const alreadyBootstrapped = status.bootstrapComplete && status.bootstrapPicksProcessed >= picks.length - 10;
  if (alreadyBootstrapped) {
    logInfo(`[AutoLearn] Bootstrap already complete (${status.bootstrapPicksProcessed} picks). Skipping.`);
    return;
  }

  logInfo(`[AutoLearn] Starting bootstrap with ${picks.length} historical settled picks...`);

  // 1. Feed MC engine (Bayesian priors)
  const fed = await bootstrapMCEngine(picks);
  logInfo(`[AutoLearn] MC engine fed ${fed} outcomes`);

  // 2. Bootstrap MC stacked learner (sport + betType calibration)
  bootstrapMCStackedLearner(picks);

  // 3. Bootstrap USML
  bootstrapUSML(picks);

  // 4. Run learning cycles to compute derived stats
  try {
    runMCLearningCycle();
    status.mcStackedCycles++;
  } catch (e) {
    logWarn(`[AutoLearn] MC learning cycle error after bootstrap: ${e}`);
  }

  try {
    runUSMLLearningCycle();
    status.usmlCycles++;
  } catch (e) {
    logWarn(`[AutoLearn] USML cycle error after bootstrap: ${e}`);
  }

  // 5. Compute sport accuracy for status reporting
  const settled = picks.filter(p => p.result && p.result !== "push");
  const sportMap: Record<string, { wins: number; total: number }> = {};
  for (const pick of settled) {
    const sport = (pick.sport || "?").toUpperCase();
    if (!sportMap[sport]) sportMap[sport] = { wins: 0, total: 0 };
    sportMap[sport].total++;
    if (pick.result === "won") sportMap[sport].wins++;
  }
  status.sportAccuracy = {};
  for (const [sport, d] of Object.entries(sportMap)) {
    status.sportAccuracy[sport] = { wins: d.wins, total: d.total, winRate: d.total > 0 ? d.wins / d.total : 0 };
  }

  status.bootstrapComplete = true;
  status.bootstrapPicksProcessed = picks.length;
  status.bootstrapRunAt = new Date().toISOString();
  status.mcEngineRecords = fed;
  status.totalLearningCycles++;
  status.lastCycleAt = new Date().toISOString();
  saveLog();

  logInfo(`[AutoLearn] Bootstrap complete — ${fed} picks fed, ${Object.keys(sportMap).length} sports calibrated`);
  for (const [sport, d] of Object.entries(sportMap)) {
    logInfo(`[AutoLearn]   ${sport}: ${d.wins}W/${d.total}T = ${((d.wins / d.total) * 100).toFixed(1)}%`);
  }
}

/**
 * Incremental learning cycle — runs every hour.
 * Picks up any newly settled picks since last run and feeds them into the engines.
 */
async function runIncrementalCycle(): Promise<void> {
  try {
    const picks = getSettledPicks();
    const newCount = picks.length - (status.bootstrapPicksProcessed || 0);

    if (newCount > 0) {
      const newPicks = picks.slice(status.bootstrapPicksProcessed);
      const fed = await bootstrapMCEngine(newPicks);
      logInfo(`[AutoLearn] Incremental: fed ${fed} new settled picks to MC engine`);

      // Rebuild MC stacked calibration with all picks
      bootstrapMCStackedLearner(picks);
      status.bootstrapPicksProcessed = picks.length;
      status.lastCycleSettledCount = newCount;

      // Mark bootstrap complete once we've processed picks
      if (picks.length > 0 && !status.bootstrapComplete) {
        status.bootstrapComplete = true;
        status.bootstrapRunAt = new Date().toISOString();
        status.mcEngineRecords = fed;
        // Compute sport accuracy
        const settled = picks.filter((p: any) => p.result && p.result !== "push");
        const sportMap: Record<string, { wins: number; total: number }> = {};
        for (const pick of settled) {
          const sport = (pick.sport || "?").toUpperCase();
          if (!sportMap[sport]) sportMap[sport] = { wins: 0, total: 0 };
          sportMap[sport].total++;
          if (pick.result === "won") sportMap[sport].wins++;
        }
        status.sportAccuracy = {};
        for (const [sport, d] of Object.entries(sportMap)) {
          status.sportAccuracy[sport] = { wins: d.wins, total: d.total, winRate: d.total > 0 ? d.wins / d.total : 0 };
        }
      }
    } else if (picks.length > 0 && !status.bootstrapComplete) {
      // All picks already processed — mark bootstrap complete
      status.bootstrapComplete = true;
      if (!status.bootstrapRunAt) status.bootstrapRunAt = new Date().toISOString();
    }

    // Always run learning cycles — they process the current state
    try {
      runMCLearningCycle();
      status.mcStackedCycles++;
    } catch {}

    try {
      runUSMLLearningCycle();
      status.usmlCycles++;
    } catch {}

    status.totalLearningCycles++;
    status.lastCycleAt = new Date().toISOString();
    saveLog();

    logInfo(`[AutoLearn] Cycle #${status.totalLearningCycles} complete — mcCycles=${status.mcStackedCycles}, usmlCycles=${status.usmlCycles}`);
  } catch (e) {
    const msg = `Incremental cycle error: ${e}`;
    logWarn(`[AutoLearn] ${msg}`);
    status.errors.unshift(msg);
    if (status.errors.length > 20) status.errors.length = 20;
  }
}

/**
 * Process user ticket outcomes to feed learning.
 * Called when users mark their saved tickets as won/lost.
 */
export function recordUserTicketOutcome(params: {
  gameId: string;
  sport: string;
  betType: string;
  confidence: number;
  result: "won" | "lost";
  odds?: number;
}): void {
  try {
    const predictedProb = Math.max(0.3, Math.min(0.95, params.confidence / 100));
    const actualOutcome = params.result === "won" ? 1 : 0;
    const decimalOdds = params.odds
      ? (params.odds > 0 ? (params.odds / 100) + 1 : (100 / Math.abs(params.odds)) + 1)
      : 1.91; // Default -110

    recordOutcome(
      `user_${params.gameId}_${Date.now()}`,
      params.sport.toUpperCase(),
      params.betType.toLowerCase(),
      predictedProb,
      actualOutcome,
      decimalOdds
    );

    status.userFeedbackProcessed++;
    logInfo(`[AutoLearn] User ticket outcome recorded: ${params.sport} ${params.result} (conf=${params.confidence}%)`);
  } catch (e) {
    logWarn(`[AutoLearn] Failed to record user ticket outcome: ${e}`);
  }
}

/**
 * Called from the pick tracker after a pick settles.
 * This is the real-time learning hook for future picks.
 */
export function onPickSettled(pick: {
  id: string;
  gameId: string;
  sport: string;
  betType: string;
  confidence: number;
  result: "won" | "lost";
  odds?: number;
}): void {
  try {
    const predictedProb = Math.max(0.3, Math.min(0.95, pick.confidence / 100));
    const actualOutcome = pick.result === "won" ? 1 : 0;
    const decimalOdds = pick.odds
      ? (pick.odds > 0 ? (pick.odds / 100) + 1 : (100 / Math.abs(pick.odds)) + 1)
      : 1.91;

    recordOutcome(pick.gameId, pick.sport.toUpperCase(), pick.betType.toLowerCase(), predictedProb, actualOutcome, decimalOdds);
  } catch {}
}

// Load persisted status immediately so admin endpoints reflect prior bootstrap
// even before startAutonomousLearningEngine() runs at the 135s startup phase.
loadLog();

export function getAutonomousLearningStatus(): LearningStatus {
  return { ...status };
}

export function triggerImmediateCycle(): void {
  runIncrementalCycle().catch(e => logWarn(`[AutoLearn] Manual cycle error: ${e}`));
}

let learningInterval: NodeJS.Timeout | null = null;

export async function startAutonomousLearningEngine(): Promise<void> {
  logInfo("[AutoLearn] Starting Autonomous Learning Engine...");

  // loadLog already ran at module load time; re-run to pick up any changes
  loadLog();

  // Run bootstrap (fast — in-memory reads)
  await runBootstrap();

  // Schedule hourly incremental cycles
  if (learningInterval) clearInterval(learningInterval);
  learningInterval = setInterval(() => {
    runIncrementalCycle().catch(e => logWarn(`[AutoLearn] Scheduled cycle error: ${e}`));
  }, 60 * 60 * 1000); // Every hour

  // Also run a cycle at the 5-minute mark after startup to catch any picks
  // that settled while we were bootstrapping
  setTimeout(() => {
    runIncrementalCycle().catch(() => {});
  }, 5 * 60 * 1000);

  logInfo("[AutoLearn] Autonomous Learning Engine running — hourly cycles scheduled");
}
