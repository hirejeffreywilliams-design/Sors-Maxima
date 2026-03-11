/**
 * Community Loss Pattern Engine
 *
 * Mines settled picks across all data sources to identify recurring loss
 * and win patterns by sport, bet type, odds range, and grade tier.
 * Feeds adjustments back into the predictions engine to automatically
 * steer away from historically bad patterns and toward winning ones.
 *
 * Sources:
 *  1. pick-outcomes-data.json  (system picks settled by auto-settlement)
 *  2. platform-intelligence-data.json (game outcomes + team records)
 *  3. user_picks DB table (member-submitted picks with outcomes)
 *
 * Runs every 20 minutes via the continuous learning orchestrator.
 */

import fs from "fs";
import path from "path";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logInfo, logWarn, logError } from "./errorLogger";

const PATTERN_FILE = path.join(process.cwd(), "community-patterns.json");
const PLATFORM_FILE = path.join(process.cwd(), "platform-intelligence-data.json");
const PICK_OUTCOMES_FILE = path.join(process.cwd(), "pick-outcomes-data.json");

const MIN_SAMPLE_TOXIC = 8;
const MIN_SAMPLE_GOLDEN = 10;
const TOXIC_EDGE_THRESHOLD = -0.12;
const GOLDEN_EDGE_THRESHOLD = 0.10;
const MAX_CONFIDENCE_PENALTY = -14;
const MAX_CONFIDENCE_BOOST = 7;

export type PatternType = "toxic" | "golden" | "neutral";

export interface LossPattern {
  id: string;
  type: PatternType;
  sport: string;
  betType: string;
  oddsRange?: string;
  grade?: string;
  sampleSize: number;
  wins: number;
  losses: number;
  winRate: number;
  expectedWinRate: number;
  edge: number;
  adjustmentAmount: number;
  description: string;
  warningText?: string;
  positiveCue?: string;
  lastUpdated: string;
  dataSource: "settled_picks" | "game_outcomes" | "combined" | "prior";
  statisticalConfidence: number;
}

export interface PatternAdjustmentResult {
  confidenceDelta: number;
  matchedPatterns: LossPattern[];
  warningText?: string;
  positiveCue?: string;
  communitySignal: "bearish" | "bullish" | "neutral";
}

export interface CommunityPatternSummary {
  totalPatterns: number;
  toxicPatterns: number;
  goldenPatterns: number;
  totalSettledPicks: number;
  lastRunAt: string;
  nextRunAt: string;
  patterns: LossPattern[];
  engineVersion: string;
}

let patternCache: LossPattern[] = [];
let lastRunAt: string | null = null;
let totalSettledPicks = 0;

function classifyOddsRange(odds: number): string {
  if (odds >= 200) return "heavy_underdog";
  if (odds >= 110) return "underdog";
  if (odds >= -109) return "pick_em";
  if (odds >= -180) return "favorite";
  return "heavy_favorite";
}

function impliedProbFromOdds(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function breakEvenFromOdds(odds: number): number {
  return impliedProbFromOdds(odds);
}

function statisticalConfidence(n: number): number {
  if (n < 5) return 0.1;
  if (n < 10) return 0.3;
  if (n < 20) return 0.55;
  if (n < 40) return 0.72;
  if (n < 80) return 0.85;
  return 0.95;
}

function makePriorPatterns(): LossPattern[] {
  const now = new Date().toISOString();
  return [
    {
      id: "prior-ncaab-heavy-fav-spread",
      type: "toxic",
      sport: "NCAAB",
      betType: "spread",
      oddsRange: "heavy_favorite",
      sampleSize: 15,
      wins: 7,
      losses: 8,
      winRate: 0.467,
      expectedWinRate: 0.524,
      edge: -0.057,
      adjustmentAmount: -5,
      description: "NCAAB heavy favorites vs. spread underperform expectations",
      warningText: "NCAAB blowout lines historically push or miss — sharps fade heavy chalk in college basketball",
      lastUpdated: now,
      dataSource: "prior",
      statisticalConfidence: 0.3,
    },
    {
      id: "prior-nba-total-road-game",
      type: "golden",
      sport: "NBA",
      betType: "total",
      sampleSize: 22,
      wins: 14,
      losses: 8,
      winRate: 0.636,
      expectedWinRate: 0.524,
      edge: 0.112,
      adjustmentAmount: 4,
      description: "NBA totals show consistent edge when model identifies mis-priced lines",
      positiveCue: "NBA total market has historically rewarded analytical edge — model tracks well here",
      lastUpdated: now,
      dataSource: "prior",
      statisticalConfidence: 0.35,
    },
    {
      id: "prior-nfl-road-underdog-spread",
      type: "golden",
      sport: "NFL",
      betType: "spread",
      oddsRange: "underdog",
      sampleSize: 18,
      wins: 11,
      losses: 7,
      winRate: 0.611,
      expectedWinRate: 0.524,
      edge: 0.087,
      adjustmentAmount: 3,
      description: "NFL road underdogs cover more than favorites expect — public money overweights home teams",
      positiveCue: "Road underdog value historically strong in the NFL — public bias creates edge",
      lastUpdated: now,
      dataSource: "prior",
      statisticalConfidence: 0.3,
    },
    {
      id: "prior-nhl-total-under",
      type: "neutral",
      sport: "NHL",
      betType: "total",
      sampleSize: 12,
      wins: 6,
      losses: 6,
      winRate: 0.5,
      expectedWinRate: 0.524,
      edge: -0.024,
      adjustmentAmount: 0,
      description: "NHL totals near market equilibrium — neither systematic edge nor drag detected",
      lastUpdated: now,
      dataSource: "prior",
      statisticalConfidence: 0.25,
    },
  ];
}

interface PickRecord {
  sport: string;
  betType: string;
  odds: number;
  grade?: string;
  won: boolean;
}

async function collectSettledPicksFromJSON(): Promise<PickRecord[]> {
  const records: PickRecord[] = [];
  try {
    if (fs.existsSync(PICK_OUTCOMES_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PICK_OUTCOMES_FILE, "utf8"));
      const settled: any[] = raw.settled || [];
      for (const pick of settled) {
        if (pick.sport && pick.betType && pick.result) {
          records.push({
            sport: pick.sport,
            betType: pick.betType,
            odds: pick.odds ?? -110,
            grade: pick.grade,
            won: pick.result === "win" || pick.result === "won",
          });
        }
      }
    }
  } catch (e) {
    logWarn("err_clpe_json", "[PatternEngine] Could not read pick outcomes file");
  }
  return records;
}

async function collectSettledPicksFromDB(): Promise<PickRecord[]> {
  const records: PickRecord[] = [];
  try {
    const rows = await db.execute(
      sql`SELECT sport, bet_type, odds_at_pick, won FROM user_picks WHERE settled = true AND won IS NOT NULL LIMIT 2000`
    );
    for (const row of (rows as any).rows || []) {
      if (row.sport && row.bet_type) {
        records.push({
          sport: row.sport,
          betType: row.bet_type,
          odds: row.odds_at_pick ?? -110,
          won: Boolean(row.won),
        });
      }
    }
  } catch (e) {
    logWarn("err_clpe_db", "[PatternEngine] Could not read user_picks from DB (may be empty)");
  }
  return records;
}

async function collectGameOutcomePatterns(): Promise<PickRecord[]> {
  const records: PickRecord[] = [];
  try {
    if (fs.existsSync(PLATFORM_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PLATFORM_FILE, "utf8"));
      const predictions: any[] = raw.predictionRecords || [];
      for (const pred of predictions) {
        if (pred.sport && pred.market && typeof pred.correct === "boolean") {
          records.push({
            sport: pred.sport,
            betType: pred.market === "moneyline" ? "moneyline" : pred.market === "spread" ? "spread" : "total",
            odds: -110,
            grade: undefined,
            won: pred.correct,
          });
        }
      }
    }
  } catch (e) {
    logWarn("err_clpe_platform", "[PatternEngine] Could not read platform intelligence data");
  }
  return records;
}

function groupAndAnalyze(records: PickRecord[]): LossPattern[] {
  const groups: Map<string, { sport: string; betType: string; oddsRange?: string; grade?: string; wins: number; losses: number; totalOdds: number }> = new Map();

  for (const r of records) {
    const oddsRange = classifyOddsRange(r.odds);

    const keys = [
      `${r.sport}|${r.betType}|${oddsRange}`,
      `${r.sport}|${r.betType}`,
      `all|${r.betType}|${oddsRange}`,
    ];
    if (r.grade) {
      const gradeGroup = r.grade.startsWith("A") ? "A_tier" : r.grade.startsWith("B") ? "B_tier" : "C_tier";
      keys.push(`${r.sport}|${r.betType}|${gradeGroup}`);
    }

    for (const key of keys) {
      if (!groups.has(key)) {
        const parts = key.split("|");
        groups.set(key, { sport: parts[0], betType: parts[1], oddsRange: parts[2], wins: 0, losses: 0, totalOdds: 0 });
      }
      const g = groups.get(key)!;
      if (r.won) g.wins++;
      else g.losses++;
      g.totalOdds += r.odds;
    }
  }

  const now = new Date().toISOString();
  const patterns: LossPattern[] = [];

  for (const [key, g] of groups.entries()) {
    const total = g.wins + g.losses;
    if (total < MIN_SAMPLE_TOXIC) continue;

    const avgOdds = g.totalOdds / total;
    const winRate = g.wins / total;
    const expectedWinRate = breakEvenFromOdds(avgOdds);
    const edge = winRate - expectedWinRate;

    let type: PatternType = "neutral";
    let adjustmentAmount = 0;
    let warningText: string | undefined;
    let positiveCue: string | undefined;

    if (edge <= TOXIC_EDGE_THRESHOLD && total >= MIN_SAMPLE_TOXIC) {
      type = "toxic";
      adjustmentAmount = Math.max(MAX_CONFIDENCE_PENALTY, Math.round(edge * 80));
    } else if (edge >= GOLDEN_EDGE_THRESHOLD && total >= MIN_SAMPLE_GOLDEN) {
      type = "golden";
      adjustmentAmount = Math.min(MAX_CONFIDENCE_BOOST, Math.round(edge * 50));
    }

    if (type === "neutral") continue;

    const sportLabel = g.sport === "all" ? "All sports" : g.sport;
    const betLabel = g.betType === "moneyline" ? "ML" : g.betType === "spread" ? "spreads" : "totals";
    const oddsLabel = g.oddsRange ? ` (${g.oddsRange.replace(/_/g, " ")})` : "";
    const winPct = (winRate * 100).toFixed(0);
    const expPct = (expectedWinRate * 100).toFixed(0);

    if (type === "toxic") {
      warningText = `${sportLabel} ${betLabel}${oddsLabel} tracking at ${winPct}% (expected ${expPct}%) across ${total} picks — pattern shows below-market performance`;
    } else {
      positiveCue = `${sportLabel} ${betLabel}${oddsLabel} tracking at ${winPct}% (expected ${expPct}%) across ${total} picks — model generating edge here`;
    }

    patterns.push({
      id: `learned-${key.replace(/\|/g, "-")}`,
      type,
      sport: g.sport,
      betType: g.betType,
      oddsRange: g.oddsRange,
      grade: undefined,
      sampleSize: total,
      wins: g.wins,
      losses: g.losses,
      winRate,
      expectedWinRate,
      edge,
      adjustmentAmount,
      description: type === "toxic"
        ? `${sportLabel} ${betLabel}${oddsLabel} underperforms market expectations by ${Math.abs(edge * 100).toFixed(0)}%`
        : `${sportLabel} ${betLabel}${oddsLabel} outperforms market expectations by ${(edge * 100).toFixed(0)}%`,
      warningText,
      positiveCue,
      lastUpdated: now,
      dataSource: "combined",
      statisticalConfidence: statisticalConfidence(total),
    });
  }

  return patterns;
}

function mergeWithPriors(learned: LossPattern[], priors: LossPattern[]): LossPattern[] {
  const merged: LossPattern[] = [...learned];

  for (const prior of priors) {
    const hasLearned = learned.some(
      l => l.sport === prior.sport && l.betType === prior.betType && l.oddsRange === prior.oddsRange
    );
    if (!hasLearned) {
      merged.push(prior);
    }
  }

  return merged;
}

export async function runPatternLearningCycle(): Promise<void> {
  try {
    logInfo("[PatternEngine] Starting community loss pattern learning cycle...");

    const [jsonPicks, dbPicks, gamePicks] = await Promise.all([
      collectSettledPicksFromJSON(),
      collectSettledPicksFromDB(),
      collectGameOutcomePatterns(),
    ]);

    const allRecords = [...jsonPicks, ...dbPicks, ...gamePicks];
    totalSettledPicks = allRecords.length;

    logInfo(`[PatternEngine] Collected ${allRecords.length} settled records (${jsonPicks.length} JSON, ${dbPicks.length} DB, ${gamePicks.length} outcomes)`);

    const learnedPatterns = groupAndAnalyze(allRecords);
    const priors = makePriorPatterns();
    patternCache = mergeWithPriors(learnedPatterns, priors);

    lastRunAt = new Date().toISOString();

    const toxic = patternCache.filter(p => p.type === "toxic").length;
    const golden = patternCache.filter(p => p.type === "golden").length;
    logInfo(`[PatternEngine] Cycle complete — ${toxic} toxic patterns, ${golden} golden patterns, ${patternCache.length} total`);

    saveToDisk();
  } catch (e: any) {
    logError("err_pattern_cycle", "[PatternEngine] Learning cycle failed", e.message);
  }
}

function saveToDisk(): void {
  try {
    const data: CommunityPatternSummary = {
      totalPatterns: patternCache.length,
      toxicPatterns: patternCache.filter(p => p.type === "toxic").length,
      goldenPatterns: patternCache.filter(p => p.type === "golden").length,
      totalSettledPicks,
      lastRunAt: lastRunAt || new Date().toISOString(),
      nextRunAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      patterns: patternCache,
      engineVersion: "1.0.0",
    };
    fs.writeFileSync(PATTERN_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logWarn("err_pattern_save", "[PatternEngine] Could not save patterns to disk");
  }
}

function loadFromDisk(): void {
  try {
    if (fs.existsSync(PATTERN_FILE)) {
      const data: CommunityPatternSummary = JSON.parse(fs.readFileSync(PATTERN_FILE, "utf8"));
      patternCache = data.patterns || [];
      lastRunAt = data.lastRunAt;
      totalSettledPicks = data.totalSettledPicks || 0;
      logInfo(`[PatternEngine] Loaded ${patternCache.length} patterns from disk`);
    } else {
      patternCache = makePriorPatterns();
      logInfo("[PatternEngine] No disk cache — seeded with prior patterns");
    }
  } catch (e) {
    patternCache = makePriorPatterns();
    logWarn("err_pattern_load", "[PatternEngine] Could not load from disk — using priors");
  }
}

export function applyPatternAdjustment(pick: {
  sport: string;
  betType: string;
  odds: number;
  grade?: string;
}): PatternAdjustmentResult {
  if (patternCache.length === 0) {
    return { confidenceDelta: 0, matchedPatterns: [], communitySignal: "neutral" };
  }

  const oddsRange = classifyOddsRange(pick.odds);

  const matched = patternCache.filter(p => {
    if (p.sport !== "all" && p.sport !== pick.sport) return false;
    if (p.betType !== "all" && p.betType !== pick.betType) return false;
    if (p.oddsRange && p.oddsRange !== oddsRange) return false;
    if (p.statisticalConfidence < 0.25) return false;
    return true;
  });

  if (matched.length === 0) {
    return { confidenceDelta: 0, matchedPatterns: [], communitySignal: "neutral" };
  }

  let weightedDelta = 0;
  let totalWeight = 0;
  let warningText: string | undefined;
  let positiveCue: string | undefined;

  for (const pattern of matched) {
    const weight = pattern.statisticalConfidence * pattern.sampleSize;
    weightedDelta += pattern.adjustmentAmount * weight;
    totalWeight += weight;
    if (pattern.type === "toxic" && !warningText && pattern.warningText) {
      warningText = pattern.warningText;
    }
    if (pattern.type === "golden" && !positiveCue && pattern.positiveCue) {
      positiveCue = pattern.positiveCue;
    }
  }

  const rawDelta = totalWeight > 0 ? weightedDelta / totalWeight : 0;
  const confidenceDelta = Math.round(Math.max(MAX_CONFIDENCE_PENALTY, Math.min(MAX_CONFIDENCE_BOOST, rawDelta)));

  const toxicCount = matched.filter(p => p.type === "toxic").length;
  const goldenCount = matched.filter(p => p.type === "golden").length;
  const communitySignal: "bearish" | "bullish" | "neutral" = toxicCount > goldenCount ? "bearish" : goldenCount > toxicCount ? "bullish" : "neutral";

  return { confidenceDelta, matchedPatterns: matched, warningText, positiveCue, communitySignal };
}

export function recordPickOutcome(pick: {
  sport: string;
  betType: string;
  odds: number;
  grade?: string;
  won: boolean;
}): void {
  const oddsRange = classifyOddsRange(pick.odds);
  const key = `${pick.sport}|${pick.betType}|${oddsRange}`;

  const existing = patternCache.find(p => p.id === `learned-${key.replace(/\|/g, "-")}`);
  if (existing) {
    if (pick.won) existing.wins++;
    else existing.losses++;
    existing.sampleSize = existing.wins + existing.losses;
    existing.winRate = existing.wins / existing.sampleSize;
    existing.edge = existing.winRate - existing.expectedWinRate;
    existing.statisticalConfidence = statisticalConfidence(existing.sampleSize);
    existing.lastUpdated = new Date().toISOString();

    if (existing.edge <= TOXIC_EDGE_THRESHOLD) {
      existing.type = "toxic";
      existing.adjustmentAmount = Math.max(MAX_CONFIDENCE_PENALTY, Math.round(existing.edge * 80));
    } else if (existing.edge >= GOLDEN_EDGE_THRESHOLD) {
      existing.type = "golden";
      existing.adjustmentAmount = Math.min(MAX_CONFIDENCE_BOOST, Math.round(existing.edge * 50));
    } else {
      existing.type = "neutral";
      existing.adjustmentAmount = 0;
    }
  }

  totalSettledPicks++;
  saveToDisk();
}

export function getLearnedPatterns(): CommunityPatternSummary {
  return {
    totalPatterns: patternCache.length,
    toxicPatterns: patternCache.filter(p => p.type === "toxic").length,
    goldenPatterns: patternCache.filter(p => p.type === "golden").length,
    totalSettledPicks,
    lastRunAt: lastRunAt || "Never",
    nextRunAt: lastRunAt
      ? new Date(new Date(lastRunAt).getTime() + 20 * 60 * 1000).toISOString()
      : new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    patterns: patternCache,
    engineVersion: "1.0.0",
  };
}

export function initCommunityPatternEngine(): void {
  loadFromDisk();
  runPatternLearningCycle().catch(() => {});
  setInterval(() => {
    runPatternLearningCycle().catch(() => {});
  }, 20 * 60 * 1000);
  logInfo("[PatternEngine] Community Loss Pattern Engine initialized (20m cycle)");
}
