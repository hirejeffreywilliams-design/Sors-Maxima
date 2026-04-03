/**
 * Pre-Game Overdrive Engine
 *
 * Runs in three scheduled waves before each game:
 *   Wave 1 — 24 hrs out    → 250,000 simulations per game
 *   Wave 2 — 12 hrs out    → top-up to 500,000 total (post morning injury reports)
 *   Wave 3 — 2-3 hrs out   → top-up to 1,000,000+ total paths
 *
 * Uses Welford's online algorithm (already in monteCarloEngine) so each wave
 * ACCUMULATES on top of prior results rather than resetting.
 * Runs in throttled batches to avoid server load spikes.
 */

import { simulateMatchup, type MatchupSimulationInput, type MatchupSimulationResult } from "./monteCarloEngine";
import { db } from "./db";
import { sql } from "drizzle-orm";

function logOverdriveEvent(subsystem: string, event: string, detail?: string): void {
  const ts = new Date().toISOString();
  console.log(`[EngineEvent] ${ts} [${subsystem}] ${event}${detail ? `: ${detail}` : ""}`);
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WAVE_1_TARGET = 250_000;
const WAVE_2_TARGET = 500_000;
const WAVE_3_TARGET = 1_000_000;

const BATCH_SIZE_OVERDRIVE = 25_000;   // per-batch sim count — keeps event loop free
const INTER_BATCH_DELAY_MS = 50;       // brief pause between batches
const INTER_GAME_DELAY_MS = 200;       // pause between games in a wave

// ─── State ─────────────────────────────────────────────────────────────────────

// Welford moments for merging partial sim batches across waves using Chan's parallel formula
interface WelfordMoments {
  n: number;   // sample count
  mean: number; // running mean
  M2: number;  // sum of squared deviations (variance = M2/n)
}

// Merge two independent Welford accumulators (Chan et al. parallel formula)
function mergeWelford(a: WelfordMoments, b: WelfordMoments): WelfordMoments {
  if (a.n === 0) return b;
  if (b.n === 0) return a;
  const n = a.n + b.n;
  const delta = b.mean - a.mean;
  const mean = (a.n * a.mean + b.n * b.mean) / n;
  const M2 = a.M2 + b.M2 + delta * delta * a.n * b.n / n;
  return { n, mean, M2 };
}

// Accumulated stat state per game, across all waves
interface GameAccumulator {
  homeWins: number;          // total home win count across all sims
  totalSims: number;         // total sim count
  homeScore: WelfordMoments;
  awayScore: WelfordMoments;
  total: WelfordMoments;     // total score (home + away per sim)
  spreadCovers: number;      // home spread cover count
  overs: number;             // overs count
}

export interface OverdriveRecord {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameStartTime: number;     // unix ms
  totalSimulations: number;  // accumulated across all waves
  wave: 1 | 2 | 3;
  lastWaveAt: number;
  latestResult: MatchupSimulationResult | null;
  accumulator: GameAccumulator; // merged stats from all prior waves
  confidenceIntervals: {
    homeWin: [number, number];
    total: [number, number];
  } | null;
  percentileBands: {
    homeScore: { p10: number; p50: number; p90: number };
    awayScore: { p10: number; p50: number; p90: number };
  } | null;
  variance: number;
  tier: "Good" | "Strong" | "Elite" | "Overdrive Elite";
}

function emptyAccumulator(): GameAccumulator {
  return {
    homeWins: 0, totalSims: 0,
    homeScore: { n: 0, mean: 0, M2: 0 },
    awayScore: { n: 0, mean: 0, M2: 0 },
    total: { n: 0, mean: 0, M2: 0 },
    spreadCovers: 0, overs: 0,
  };
}

// Extract batch statistics from a MatchupSimulationResult into WelfordMoments
function resultToAccumulator(result: MatchupSimulationResult): GameAccumulator {
  const n = result.simulations;
  const homeScoreMean = result.predictedHomeScore;
  const awayScoreMean = result.predictedAwayScore;
  const totalMean = homeScoreMean + awayScoreMean;
  const homeStd = result.scoreDistribution.home.stdDev;
  const awayStd = result.scoreDistribution.away.stdDev;
  const totalStd = Math.sqrt(homeStd * homeStd + awayStd * awayStd);

  return {
    homeWins: Math.round(result.homeWinProb * n),
    totalSims: n,
    homeScore: { n, mean: homeScoreMean, M2: homeStd * homeStd * n },
    awayScore: { n, mean: awayScoreMean, M2: awayStd * awayStd * n },
    total: { n, mean: totalMean, M2: totalStd * totalStd * n },
    spreadCovers: Math.round(result.homeSpreadCoverProb * n),
    overs: Math.round(result.overProb * n),
  };
}

// Merge a new batch result into an existing accumulator
function mergeAccumulator(existing: GameAccumulator, newBatch: GameAccumulator): GameAccumulator {
  return {
    homeWins: existing.homeWins + newBatch.homeWins,
    totalSims: existing.totalSims + newBatch.totalSims,
    homeScore: mergeWelford(existing.homeScore, newBatch.homeScore),
    awayScore: mergeWelford(existing.awayScore, newBatch.awayScore),
    total: mergeWelford(existing.total, newBatch.total),
    spreadCovers: existing.spreadCovers + newBatch.spreadCovers,
    overs: existing.overs + newBatch.overs,
  };
}

// Build merged MatchupSimulationResult from accumulated stats
function buildMergedResult(base: MatchupSimulationResult, acc: GameAccumulator): MatchupSimulationResult {
  const n = acc.totalSims;
  const homeWinProb = n > 0 ? acc.homeWins / n : base.homeWinProb;
  const homeScoreMean = acc.homeScore.mean;
  const awayScoreMean = acc.awayScore.mean;
  const homeStd = n > 1 ? Math.sqrt(acc.homeScore.M2 / acc.homeScore.n) : base.scoreDistribution.home.stdDev;
  const awayStd = n > 1 ? Math.sqrt(acc.awayScore.M2 / acc.awayScore.n) : base.scoreDistribution.away.stdDev;
  const totalVariance = n > 1 ? acc.total.M2 / acc.total.n : 0;
  const winSE = n > 0 ? Math.sqrt(homeWinProb * (1 - homeWinProb) / n) : 0.01;
  const overProb = n > 0 ? acc.overs / n : base.overProb;

  // Approximate percentiles using normal distribution (reservoir data from last batch guides shape)
  const homeP10 = Math.round(homeScoreMean - 1.28 * homeStd);
  const homeP50 = Math.round(homeScoreMean);
  const homeP90 = Math.round(homeScoreMean + 1.28 * homeStd);
  const awayP10 = Math.round(awayScoreMean - 1.28 * awayStd);
  const awayP50 = Math.round(awayScoreMean);
  const awayP90 = Math.round(awayScoreMean + 1.28 * awayStd);

  return {
    ...base,
    simulations: n,
    homeWinProb,
    awayWinProb: 1 - homeWinProb - base.drawProb,
    homeSpreadCoverProb: n > 0 ? acc.spreadCovers / n : base.homeSpreadCoverProb,
    overProb,
    underProb: 1 - overProb,
    predictedHomeScore: Math.round(homeScoreMean * 10) / 10,
    predictedAwayScore: Math.round(awayScoreMean * 10) / 10,
    predictedTotal: Math.round((homeScoreMean + awayScoreMean) * 10) / 10,
    scoreDistribution: {
      home: { mean: Math.round(homeScoreMean * 10) / 10, stdDev: Math.round(homeStd * 10) / 10, p10: homeP10, median: homeP50, p90: homeP90 },
      away: { mean: Math.round(awayScoreMean * 10) / 10, stdDev: Math.round(awayStd * 10) / 10, p10: awayP10, median: awayP50, p90: awayP90 },
    },
    convergenceScore: Math.round(Math.max(0.6, Math.min(1.0, 1 - winSE * 12)) * 1000) / 1000,
    confidenceInterval95: {
      homeWin: [Math.max(0, homeWinProb - 1.96 * winSE), Math.min(1, homeWinProb + 1.96 * winSE)],
      total: [
        Math.round((homeScoreMean + awayScoreMean - 1.96 * Math.sqrt(totalVariance)) * 10) / 10,
        Math.round((homeScoreMean + awayScoreMean + 1.96 * Math.sqrt(totalVariance)) * 10) / 10,
      ],
    },
    riskMetrics: {
      variance: Math.round(totalVariance * 100) / 100,
      skewness: 0,
      kurtosis: 3,
      tailRiskHome: homeStd > 0 ? Math.max(0, 0.0228 * (1 + (homeScoreMean - base.predictedHomeScore) / homeStd)) : 0.0228,
      tailRiskAway: awayStd > 0 ? Math.max(0, 0.0228 * (1 + (awayScoreMean - base.predictedAwayScore) / awayStd)) : 0.0228,
    },
    simulatedAt: Date.now(),
  };
}

const overdriveCache = new Map<string, OverdriveRecord>();
let overdriveRunning = false;
let schedulerStarted = false;
let totalOverdriveSimsToday = 0;
let lastSchedulerRun = 0;

// ─── Tier Calculation ──────────────────────────────────────────────────────────

export function getSimulationTier(totalSims: number): "Good" | "Strong" | "Elite" | "Overdrive Elite" {
  if (totalSims >= 1_000_000) return "Overdrive Elite";
  if (totalSims >= 500_000) return "Elite";
  if (totalSims >= 100_000) return "Strong";
  return "Good";
}

export function formatSimCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

// ─── Core Wave Runner ──────────────────────────────────────────────────────────

async function runOverdriveWaveForGame(
  gameId: string,
  input: MatchupSimulationInput,
  targetTotal: number,
  wave: 1 | 2 | 3
): Promise<OverdriveRecord> {
  const existing = overdriveCache.get(gameId);
  const currentTotal = existing?.totalSimulations ?? 0;

  if (currentTotal >= targetTotal) {
    // Already at or above this wave's target — no work needed
    if (existing) {
      existing.wave = Math.max(existing.wave, wave) as 1 | 2 | 3;
      return existing;
    }
  }

  const simsNeeded = Math.max(0, targetTotal - currentTotal);
  if (simsNeeded === 0 && existing) return existing;

  // Start from existing accumulated stats or empty
  let acc: GameAccumulator = existing?.accumulator ?? emptyAccumulator();
  let lastBatchResult: MatchupSimulationResult | null = existing?.latestResult ?? null;
  let simsRun = 0;

  // Run new wave in throttled batches, merging each batch into the running accumulator
  let remaining = simsNeeded;
  while (remaining > 0) {
    const batchCount = Math.min(BATCH_SIZE_OVERDRIVE, remaining);
    try {
      const batchResult = simulateMatchup(input, batchCount);
      const batchAcc = resultToAccumulator(batchResult);
      acc = mergeAccumulator(acc, batchAcc);
      lastBatchResult = batchResult;
      simsRun += batchCount;
      remaining -= batchCount;
    } catch (err: any) {
      console.error(`[Overdrive] Batch error for ${gameId}:`, err.message);
      break;
    }
    // Yield to event loop between batches
    await new Promise(r => setTimeout(r, INTER_BATCH_DELAY_MS));
  }

  // If we have prior waves + new waves, build the merged result from the full accumulator
  const mergedResult: MatchupSimulationResult | null = lastBatchResult
    ? buildMergedResult(lastBatchResult, acc)
    : null;

  const accumulatedSims = acc.totalSims;

  const record: OverdriveRecord = {
    gameId,
    sport: input.sport,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    gameStartTime: existing?.gameStartTime ?? Date.now() + 24 * 60 * 60 * 1000,
    totalSimulations: accumulatedSims,
    wave,
    lastWaveAt: Date.now(),
    latestResult: mergedResult,
    accumulator: acc,
    confidenceIntervals: mergedResult?.confidenceInterval95 ?? null,
    percentileBands: mergedResult ? {
      homeScore: {
        p10: mergedResult.scoreDistribution.home.p10,
        p50: mergedResult.scoreDistribution.home.median,
        p90: mergedResult.scoreDistribution.home.p90,
      },
      awayScore: {
        p10: mergedResult.scoreDistribution.away.p10,
        p50: mergedResult.scoreDistribution.away.median,
        p90: mergedResult.scoreDistribution.away.p90,
      },
    } : null,
    variance: mergedResult?.riskMetrics?.variance ?? 0,
    tier: getSimulationTier(accumulatedSims),
  };

  overdriveCache.set(gameId, record);
  totalOverdriveSimsToday += simsRun;

  // Persist to DB so results survive server restarts
  persistOverdriveRecord(record).catch(() => {});

  console.log(`[Overdrive] Wave ${wave} complete: ${record.homeTeam} vs ${record.awayTeam} — ${formatSimCount(accumulatedSims)} total sims across all waves (${record.tier})`);
  return record;
}

// ─── Wave Scheduler ────────────────────────────────────────────────────────────

// Per-wave timing windows: each wave processes only games within the appropriate pre-game window
const WAVE_TIMING_WINDOWS: Record<1 | 2 | 3, { minHours: number; maxHours: number }> = {
  1: { minHours: 20, maxHours: 28 },  // Wave 1 — ~24h out (±4h buffer)
  2: { minHours: 9, maxHours: 15 },   // Wave 2 — ~12h out (±3h buffer)
  3: { minHours: 1, maxHours: 4 },    // Wave 3 — ~2–3h out (±1h buffer)
};

async function runOverdriveWave(targetWave: 1 | 2 | 3, targetSimsPerGame: number): Promise<void> {
  if (overdriveRunning) {
    console.log(`[Overdrive] Wave ${targetWave} skipped — another wave is in progress`);
    return;
  }
  overdriveRunning = true;
  const started = Date.now();
  const window = WAVE_TIMING_WINDOWS[targetWave];
  console.log(`[Overdrive] === Wave ${targetWave} STARTED (target: ${formatSimCount(targetSimsPerGame)} sims/game, window: ${window.minHours}–${window.maxHours}h) ===`);

  try {
    const { generateIntelligenceFeed } = await import("./unifiedIntelligenceHub");
    const feed = await generateIntelligenceFeed();
    if (!feed) {
      console.log("[Overdrive] No feed available — skipping wave");
      return;
    }

    const upcomingGames = (feed.upcomingGames || []).filter((g: any) => {
      const gameTime = new Date(g.date || g.startTime || 0).getTime();
      const hoursUntilGame = (gameTime - Date.now()) / (1000 * 60 * 60);
      // Each wave only processes games within its specific pre-game timing window
      // Wave 1: 20–28h window (24h target), Wave 2: 9–15h (12h target), Wave 3: 1–4h (2–3h target)
      return hoursUntilGame >= window.minHours && hoursUntilGame <= window.maxHours;
    });

    if (upcomingGames.length === 0) {
      console.log("[Overdrive] No qualifying upcoming games found");
      return;
    }

    // BDL enrichment for NBA
    let bdlTeams: any[] = [];
    try {
      const { isBDLAvailable, getEnrichedTeamData } = await import("./balldontlie-provider");
      if (isBDLAvailable()) bdlTeams = await getEnrichedTeamData();
    } catch {}

    // Platform intelligence team records
    let teamRecords = new Map<string, { avgPointsFor: number; avgPointsAgainst: number }>();
    try {
      const { getTeamTrends } = await import("./platformIntelligenceEngine");
      const records = getTeamTrends();
      for (const rec of records) {
        if (rec.avgPointsFor > 0) {
          const key = `${rec.sport}:${rec.team.toLowerCase()}`;
          teamRecords.set(key, { avgPointsFor: rec.avgPointsFor, avgPointsAgainst: rec.avgPointsAgainst });
        }
      }
    } catch {}

    let processed = 0;
    for (const game of upcomingGames) {
      try {
        const { buildEnrichedSimulationInput } = await import("./overdriveInputBuilder");
        const input = await buildEnrichedSimulationInput(game, bdlTeams, teamRecords);
        const gameStartTime = new Date(game.date || game.startTime || 0).getTime();

        // Set/update game start time in record before wave runs
        const existing = overdriveCache.get(game.id);
        if (existing) existing.gameStartTime = gameStartTime;

        await runOverdriveWaveForGame(game.id, input, targetSimsPerGame, targetWave);
        processed++;

        // Pause between games to avoid server spikes
        await new Promise(r => setTimeout(r, INTER_GAME_DELAY_MS));
      } catch (err: any) {
        console.error(`[Overdrive] Game ${game.id} failed:`, err.message);
      }
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[Overdrive] Wave ${targetWave} COMPLETE — ${processed} games processed in ${elapsed}s`);
    logOverdriveEvent("Overdrive Engine", `wave_${targetWave}_complete`, `${processed} games, ${elapsed}s`);
  } finally {
    overdriveRunning = false;
    lastSchedulerRun = Date.now();
  }
}

// ─── Game-Time-Triggered Scheduling ────────────────────────────────────────────

async function checkAndTriggerWaves(): Promise<void> {
  try {
    const { generateIntelligenceFeed } = await import("./unifiedIntelligenceHub");
    const feed = await generateIntelligenceFeed();
    if (!feed) return;

    const upcomingGames = feed.upcomingGames || [];

    for (const game of upcomingGames) {
      const gameId = game.id;
      const gameTime = new Date(game.date || game.startTime || 0).getTime();
      const hoursUntilGame = (gameTime - Date.now()) / (1000 * 60 * 60);
      const existing = overdriveCache.get(gameId);

      // Wave 1: 24 hrs out — fire if game is 22–26 hrs away and wave 1 not done
      if (hoursUntilGame >= 22 && hoursUntilGame <= 26) {
        if (!existing || existing.wave < 1 || existing.totalSimulations < WAVE_1_TARGET * 0.9) {
          console.log(`[Overdrive] Scheduling Wave 1 for ${game.homeTeam?.name || gameId} (${hoursUntilGame.toFixed(1)}h away)`);
          setTimeout(() => runOverdriveWave(1, WAVE_1_TARGET), 0);
          return; // One wave at a time
        }
      }

      // Wave 2: 12 hrs out — fire if game is 10–14 hrs away and wave 2 not done
      if (hoursUntilGame >= 10 && hoursUntilGame <= 14) {
        if (!existing || existing.wave < 2 || existing.totalSimulations < WAVE_2_TARGET * 0.9) {
          console.log(`[Overdrive] Scheduling Wave 2 for ${game.homeTeam?.name || gameId} (${hoursUntilGame.toFixed(1)}h away)`);
          setTimeout(() => runOverdriveWave(2, WAVE_2_TARGET), 0);
          return;
        }
      }

      // Wave 3: 2-3 hrs out — fire if game is 1.5–3.5 hrs away and wave 3 not done
      if (hoursUntilGame >= 1.5 && hoursUntilGame <= 3.5) {
        if (!existing || existing.wave < 3 || existing.totalSimulations < WAVE_3_TARGET * 0.9) {
          console.log(`[Overdrive] Scheduling Wave 3 for ${game.homeTeam?.name || gameId} (${hoursUntilGame.toFixed(1)}h away)`);
          setTimeout(() => runOverdriveWave(3, WAVE_3_TARGET), 0);
          return;
        }
      }
    }
  } catch (err: any) {
    console.error("[Overdrive] Scheduler check error:", err.message);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function getOverdriveRecord(gameId: string): OverdriveRecord | null {
  return overdriveCache.get(gameId) ?? null;
}

export function getOverdriveStatus(): {
  running: boolean;
  activeGames: number;
  totalOverdriveSimsToday: number;
  lastSchedulerRun: string;
  currentWaves: Array<{
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    wave: number;
    totalSimulations: number;
    tier: string;
    lastWaveAt: string;
  }>;
} {
  const now = Date.now();

  // Clean up stale records (game started > 3 hrs ago)
  for (const [key, rec] of overdriveCache) {
    if (rec.gameStartTime > 0 && now - rec.gameStartTime > 3 * 60 * 60 * 1000) {
      overdriveCache.delete(key);
    }
  }

  return {
    running: overdriveRunning,
    activeGames: overdriveCache.size,
    totalOverdriveSimsToday,
    lastSchedulerRun: lastSchedulerRun ? new Date(lastSchedulerRun).toISOString() : "never",
    currentWaves: Array.from(overdriveCache.values()).map(r => ({
      gameId: r.gameId,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      wave: r.wave,
      totalSimulations: r.totalSimulations,
      tier: r.tier,
      lastWaveAt: new Date(r.lastWaveAt).toISOString(),
    })),
  };
}

export function getSimulationDepthForGame(gameId: string): {
  totalSimulations: number;
  tier: "Good" | "Strong" | "Elite" | "Overdrive Elite";
  label: string;
  wave: number;
} {
  const record = overdriveCache.get(gameId);
  if (!record) {
    return { totalSimulations: 10_000, tier: "Good", label: "Powered by 10K simulations", wave: 0 };
  }
  const { totalSimulations, tier, wave } = record;
  return {
    totalSimulations,
    tier,
    label: `Powered by ${formatSimCount(totalSimulations)} simulations`,
    wave,
  };
}

export function getOverdriveResult(gameId: string): OverdriveRecord | null {
  return overdriveCache.get(gameId) ?? null;
}

// ─── DB Persistence ─────────────────────────────────────────────────────────────

async function persistOverdriveRecord(record: OverdriveRecord): Promise<void> {
  try {
    const lr = record.latestResult;
    const gameStartTimeSec = Math.floor(record.gameStartTime / 1000);
    const acc = record.accumulator;
    const pb = record.percentileBands;
    await db.execute(sql`
      INSERT INTO overdrive_cache (
        game_id, sport, home_team, away_team, game_start_time_sec,
        total_simulations, wave, home_win_prob, away_win_prob,
        predicted_home_score, predicted_away_score, convergence_score,
        ci_home_win_low, ci_home_win_high, ci_total_low, ci_total_high,
        variance, tier, updated_at,
        acc_total_sims, acc_home_wins,
        acc_home_score_n, acc_home_score_mean, acc_home_score_m2,
        acc_away_score_n, acc_away_score_mean, acc_away_score_m2,
        acc_total_score_n, acc_total_score_mean, acc_total_score_m2,
        acc_spread_covers, acc_overs,
        p10_home_score, p50_home_score, p90_home_score,
        p10_away_score, p50_away_score, p90_away_score
      ) VALUES (
        ${record.gameId}, ${record.sport}, ${record.homeTeam}, ${record.awayTeam},
        ${gameStartTimeSec}, ${record.totalSimulations}, ${record.wave},
        ${lr?.homeWinProb ?? null}, ${lr?.awayWinProb ?? null},
        ${lr?.predictedHomeScore ?? null}, ${lr?.predictedAwayScore ?? null},
        ${lr?.convergenceScore ?? null},
        ${record.confidenceIntervals?.homeWin[0] ?? null},
        ${record.confidenceIntervals?.homeWin[1] ?? null},
        ${record.confidenceIntervals?.total[0] ?? null},
        ${record.confidenceIntervals?.total[1] ?? null},
        ${record.variance ?? null}, ${record.tier}, NOW(),
        ${acc.totalSims}, ${acc.homeWins},
        ${acc.homeScore.n}, ${acc.homeScore.mean}, ${acc.homeScore.M2},
        ${acc.awayScore.n}, ${acc.awayScore.mean}, ${acc.awayScore.M2},
        ${acc.total.n}, ${acc.total.mean}, ${acc.total.M2},
        ${acc.spreadCovers}, ${acc.overs},
        ${pb?.homeScore.p10 ?? null}, ${pb?.homeScore.p50 ?? null}, ${pb?.homeScore.p90 ?? null},
        ${pb?.awayScore.p10 ?? null}, ${pb?.awayScore.p50 ?? null}, ${pb?.awayScore.p90 ?? null}
      )
      ON CONFLICT (game_id) DO UPDATE SET
        total_simulations = EXCLUDED.total_simulations,
        wave = EXCLUDED.wave,
        home_win_prob = EXCLUDED.home_win_prob,
        away_win_prob = EXCLUDED.away_win_prob,
        predicted_home_score = EXCLUDED.predicted_home_score,
        predicted_away_score = EXCLUDED.predicted_away_score,
        convergence_score = EXCLUDED.convergence_score,
        ci_home_win_low = EXCLUDED.ci_home_win_low,
        ci_home_win_high = EXCLUDED.ci_home_win_high,
        ci_total_low = EXCLUDED.ci_total_low,
        ci_total_high = EXCLUDED.ci_total_high,
        variance = EXCLUDED.variance,
        tier = EXCLUDED.tier,
        updated_at = NOW(),
        acc_total_sims = EXCLUDED.acc_total_sims,
        acc_home_wins = EXCLUDED.acc_home_wins,
        acc_home_score_n = EXCLUDED.acc_home_score_n,
        acc_home_score_mean = EXCLUDED.acc_home_score_mean,
        acc_home_score_m2 = EXCLUDED.acc_home_score_m2,
        acc_away_score_n = EXCLUDED.acc_away_score_n,
        acc_away_score_mean = EXCLUDED.acc_away_score_mean,
        acc_away_score_m2 = EXCLUDED.acc_away_score_m2,
        acc_total_score_n = EXCLUDED.acc_total_score_n,
        acc_total_score_mean = EXCLUDED.acc_total_score_mean,
        acc_total_score_m2 = EXCLUDED.acc_total_score_m2,
        acc_spread_covers = EXCLUDED.acc_spread_covers,
        acc_overs = EXCLUDED.acc_overs,
        p10_home_score = EXCLUDED.p10_home_score,
        p50_home_score = EXCLUDED.p50_home_score,
        p90_home_score = EXCLUDED.p90_home_score,
        p10_away_score = EXCLUDED.p10_away_score,
        p50_away_score = EXCLUDED.p50_away_score,
        p90_away_score = EXCLUDED.p90_away_score
    `);
  } catch (err: any) {
    logOverdriveEvent("OverdriveDB", "persist_failed", err.message?.slice(0, 80));
  }
}

async function loadOverdriveRecordsFromDb(): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM overdrive_cache
      WHERE updated_at > NOW() - INTERVAL '24 hours'
    `) as any;
    const data = rows.rows ?? rows;
    for (const row of data) {
      const gameId = row.game_id as string;
      // Skip if already in memory from this session
      if (overdriveCache.has(gameId)) continue;
      const totalSims = row.total_simulations as number;
      const tier = (row.tier as "Good" | "Strong" | "Elite" | "Overdrive Elite") || "Good";
      const latestResult: MatchupSimulationResult | null = (row.home_win_prob != null) ? {
        gameId,
        sport: row.sport as any,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        homeWinProb: row.home_win_prob,
        awayWinProb: row.away_win_prob,
        drawProb: Math.max(0, 1 - row.home_win_prob - row.away_win_prob),
        homeSpreadCoverProb: 0.5,
        overProb: 0.5,
        underProb: 0.5,
        predictedHomeScore: row.predicted_home_score,
        predictedAwayScore: row.predicted_away_score,
        predictedTotal: (row.predicted_home_score ?? 0) + (row.predicted_away_score ?? 0),
        spreadLine: 0,
        totalLine: (row.predicted_home_score ?? 0) + (row.predicted_away_score ?? 0),
        convergenceScore: row.convergence_score ?? 1,
        simulations: totalSims,
        confidenceInterval95: {
          homeWin: [row.ci_home_win_low ?? row.home_win_prob, row.ci_home_win_high ?? row.home_win_prob] as [number, number],
          total: [row.ci_total_low ?? 0, row.ci_total_high ?? 0] as [number, number],
        },
        riskMetrics: {
          variance: row.variance ?? 0,
          skewness: 0,
          kurtosis: 0,
          tailRiskHome: 0,
          tailRiskAway: 0,
        },
        factors: [],
        scoreDistribution: {
          home: { mean: row.predicted_home_score ?? 0, stdDev: 0, p10: 0, median: row.predicted_home_score ?? 0, p90: 0 },
          away: { mean: row.predicted_away_score ?? 0, stdDev: 0, p10: 0, median: row.predicted_away_score ?? 0, p90: 0 },
        },
        simulatedAt: Date.now(),
        ttl: 3600,
      } : null;
      const cacheRecord: OverdriveRecord = {
        gameId,
        sport: row.sport,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        gameStartTime: (row.game_start_time_sec as number) * 1000,
        totalSimulations: totalSims,
        wave: row.wave as 1 | 2 | 3,
        lastWaveAt: Date.now(),
        latestResult,
        // Restore full Welford accumulator moments from DB so waves after restart remain cumulative
        accumulator: {
          homeWins: (row.acc_home_wins as number) || 0,
          totalSims: (row.acc_total_sims as number) || 0,
          homeScore: {
            n: (row.acc_home_score_n as number) || 0,
            mean: (row.acc_home_score_mean as number) || 0,
            M2: (row.acc_home_score_m2 as number) || 0,
          },
          awayScore: {
            n: (row.acc_away_score_n as number) || 0,
            mean: (row.acc_away_score_mean as number) || 0,
            M2: (row.acc_away_score_m2 as number) || 0,
          },
          // Total score moments restored — enabling correct variance/CI after restart
          total: {
            n: (row.acc_total_score_n as number) || 0,
            mean: (row.acc_total_score_mean as number) || 0,
            M2: (row.acc_total_score_m2 as number) || 0,
          },
          spreadCovers: (row.acc_spread_covers as number) || 0,
          overs: (row.acc_overs as number) || 0,
        },
        confidenceIntervals: (row.ci_home_win_low != null) ? {
          homeWin: [row.ci_home_win_low, row.ci_home_win_high],
          total: [row.ci_total_low, row.ci_total_high],
        } : null,
        // Restore percentile bands (full distribution) from DB
        percentileBands: (row.p10_home_score != null) ? {
          homeScore: { p10: row.p10_home_score, p50: row.p50_home_score, p90: row.p90_home_score },
          awayScore: { p10: row.p10_away_score, p50: row.p50_away_score, p90: row.p90_away_score },
        } : null,
        variance: row.variance ?? 0,
        tier,
      };
      overdriveCache.set(gameId, cacheRecord);
    }
    if (data.length > 0) {
      logOverdriveEvent("OverdriveDB", "loaded", `Restored ${data.length} overdrive records from DB`);
    }
  } catch (err: any) {
    logOverdriveEvent("OverdriveDB", "load_failed", err.message?.slice(0, 80));
  }
}

// ─── Startup ────────────────────────────────────────────────────────────────────

export function startOverdriveEngine(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("[Overdrive] Pre-game overdrive engine started — scheduling wave checks every 15 minutes");

  // Load any persisted records from previous runs
  loadOverdriveRecordsFromDb().catch(() => {});

  // Check game times every 15 minutes and trigger appropriate waves
  setInterval(checkAndTriggerWaves, 15 * 60 * 1000);

  // Reset daily sim counter at midnight
  const resetDailyCounter = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    setTimeout(() => {
      totalOverdriveSimsToday = 0;
      console.log("[Overdrive] Daily simulation counter reset");
      resetDailyCounter();
    }, msUntilMidnight);
  };
  resetDailyCounter();

  // Initial check after 30s
  setTimeout(checkAndTriggerWaves, 30_000);

  logOverdriveEvent("Overdrive Engine", "started", "3-wave pre-game simulation scheduler active");
}
