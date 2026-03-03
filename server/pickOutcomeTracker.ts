import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { recordPickOutcome } from "./communityLossPatternEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "pick-outcomes-data.json");

const MAX_SETTLED = 5000;
const MAX_PENDING = 2000;

export interface TrackedPick {
  id: string;
  gameId: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  ev: number;
  gameTime: string;
  savedAt: string;
  result?: "won" | "lost" | "push";
  homeScore?: number;
  awayScore?: number;
  settledAt?: string;
  isBacktest?: boolean;
}

export interface PickAccuracyStats {
  overall: { total: number; won: number; lost: number; push: number; rate: number; pending: number };
  bySport: Record<string, { total: number; won: number; rate: number }>;
  byGrade: Record<string, { total: number; won: number; rate: number }>;
  byMarket: Record<string, { total: number; won: number; rate: number; roi: number }>;
  recentForm: { won: number; lost: number; push: number; rate: number };
  lastUpdated: string;
  roi: number;
  brierScore: number | null;
  maxDrawdown: number;
  sharpeRatio: number | null;
  homeAwayBias: { homeWinRate: number; awayWinRate: number; homeTotal: number; awayTotal: number };
  calibrationBuckets: Array<{ range: string; predicted: number; actual: number; total: number }>;
}

interface StoredData {
  pending: TrackedPick[];
  settled: TrackedPick[];
  stats: PickAccuracyStats;
  version: number;
}

function defaultStats(): PickAccuracyStats {
  return {
    overall: { total: 0, won: 0, lost: 0, push: 0, rate: 0, pending: 0 },
    bySport: {},
    byGrade: {},
    byMarket: {},
    recentForm: { won: 0, lost: 0, push: 0, rate: 0 },
    lastUpdated: new Date().toISOString(),
    roi: 0,
    brierScore: null,
    maxDrawdown: 0,
    sharpeRatio: null,
    homeAwayBias: { homeWinRate: 0, awayWinRate: 0, homeTotal: 0, awayTotal: 0 },
    calibrationBuckets: [],
  };
}

function computePickPayout(pick: TrackedPick): number {
  if (pick.result === "push") return 0;
  if (pick.result === "won") {
    const o = pick.odds || -110;
    return o > 0 ? o / 100 : 100 / Math.abs(o);
  }
  return -1;
}

function matchesHome(pickText: string, homeTeam: string): boolean {
  const t = pickText.toLowerCase();
  const h = homeTeam.toLowerCase();
  const tokens = h.split(/\s+/);
  return tokens.some(tok => tok.length > 2 && t.includes(tok));
}

function loadData(): StoredData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {}
  return { pending: [], settled: [], stats: defaultStats(), version: 1 };
}

function saveData(data: StoredData): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[PickTracker] Failed to save data:", err);
  }
}

let cache: StoredData | null = null;

function getData(): StoredData {
  if (!cache) cache = loadData();
  return cache;
}

function recomputeStats(data: StoredData): void {
  const settled = data.settled;
  const stats = defaultStats();

  stats.overall.pending = data.pending.length;
  stats.overall.total = settled.length;

  const marketPayouts: Record<string, number[]> = {};
  const allPayouts: number[] = [];
  let brierSum = 0;
  let brierCount = 0;
  let homeWon = 0, homeTotal = 0, awayWon = 0, awayTotal = 0;

  const calibBuckets: Record<string, { won: number; total: number; predSum: number }> = {};
  const bucketRanges = ["50-55", "55-60", "60-65", "65-70", "70-75", "75-80", "80+"];
  for (const r of bucketRanges) calibBuckets[r] = { won: 0, total: 0, predSum: 0 };

  for (const pick of settled) {
    if (!pick.result) continue;
    const isWon = pick.result === "won";
    const isPush = pick.result === "push";

    if (isWon) stats.overall.won++;
    else if (isPush) stats.overall.push++;
    else stats.overall.lost++;

    const sport = pick.sport;
    if (!stats.bySport[sport]) stats.bySport[sport] = { total: 0, won: 0, rate: 0 };
    stats.bySport[sport].total++;
    if (isWon) stats.bySport[sport].won++;

    const grade = pick.grade;
    if (!stats.byGrade[grade]) stats.byGrade[grade] = { total: 0, won: 0, rate: 0 };
    stats.byGrade[grade].total++;
    if (isWon) stats.byGrade[grade].won++;

    const market = normalizeMarket(pick.betType);
    if (!stats.byMarket[market]) stats.byMarket[market] = { total: 0, won: 0, rate: 0, roi: 0 };
    stats.byMarket[market].total++;
    if (isWon) stats.byMarket[market].won++;
    if (!isPush) {
      if (!marketPayouts[market]) marketPayouts[market] = [];
      marketPayouts[market].push(computePickPayout(pick));
    }

    if (!isPush) {
      const payout = computePickPayout(pick);
      allPayouts.push(payout);

      const conf = typeof pick.confidence === "number" ? Math.max(0, Math.min(100, pick.confidence)) : 50;
      const prob = conf / 100;
      const outcome = isWon ? 1 : 0;
      brierSum += Math.pow(prob - outcome, 2);
      brierCount++;

      const bucket = conf >= 80 ? "80+" :
        conf >= 75 ? "75-80" : conf >= 70 ? "70-75" : conf >= 65 ? "65-70" :
        conf >= 60 ? "60-65" : conf >= 55 ? "55-60" : "50-55";
      calibBuckets[bucket].total++;
      calibBuckets[bucket].predSum += prob;
      if (isWon) calibBuckets[bucket].won++;

      const pickText = (pick.pick || "").toLowerCase();
      const betType = (pick.betType || "").toLowerCase();
      if (!betType.includes("total") && !betType.includes("over_under") && !betType.includes("team_total")) {
        const isHome = matchesHome(pickText, pick.homeTeam || "");
        if (isHome) {
          homeTotal++;
          if (isWon) homeWon++;
        } else {
          awayTotal++;
          if (isWon) awayWon++;
        }
      }
    }
  }

  stats.overall.rate = stats.overall.total > 0
    ? Math.round((stats.overall.won / stats.overall.total) * 1000) / 10
    : 0;

  for (const s of Object.values(stats.bySport)) {
    s.rate = s.total > 0 ? Math.round((s.won / s.total) * 1000) / 10 : 0;
  }
  for (const g of Object.values(stats.byGrade)) {
    g.rate = g.total > 0 ? Math.round((g.won / g.total) * 1000) / 10 : 0;
  }
  for (const [mkt, m] of Object.entries(stats.byMarket)) {
    m.rate = m.total > 0 ? Math.round((m.won / m.total) * 1000) / 10 : 0;
    const pays = marketPayouts[mkt] || [];
    m.roi = pays.length > 0 ? Math.round((pays.reduce((a, b) => a + b, 0) / pays.length) * 1000) / 10 : 0;
  }

  const recent = settled.slice(-50);
  const rWon = recent.filter(p => p.result === "won").length;
  const rPush = recent.filter(p => p.result === "push").length;
  const rLost = recent.filter(p => p.result === "lost").length;
  stats.recentForm = {
    won: rWon, lost: rLost, push: rPush,
    rate: recent.length > 0 ? Math.round((rWon / recent.length) * 1000) / 10 : 0,
  };

  if (allPayouts.length > 0) {
    const totalPayout = allPayouts.reduce((a, b) => a + b, 0);
    stats.roi = Math.round((totalPayout / allPayouts.length) * 1000) / 10;

    let bankroll = 100;
    let peak = 100;
    let maxDD = 0;
    for (const p of allPayouts) {
      bankroll += p;
      if (bankroll > peak) peak = bankroll;
      const dd = peak > 0 ? ((peak - bankroll) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }
    stats.maxDrawdown = Math.round(maxDD * 10) / 10;

    const mean = totalPayout / allPayouts.length;
    if (allPayouts.length > 1) {
      const variance = allPayouts.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / (allPayouts.length - 1);
      const std = Math.sqrt(variance);
      stats.sharpeRatio = std > 0 ? Math.round((mean / std) * 1000) / 1000 : null;
    }
  }

  stats.brierScore = brierCount > 0 ? Math.round((brierSum / brierCount) * 10000) / 10000 : null;

  stats.homeAwayBias = {
    homeWinRate: homeTotal > 0 ? Math.round((homeWon / homeTotal) * 1000) / 10 : 0,
    awayWinRate: awayTotal > 0 ? Math.round((awayWon / awayTotal) * 1000) / 10 : 0,
    homeTotal,
    awayTotal,
  };

  stats.calibrationBuckets = bucketRanges.map(range => {
    const b = calibBuckets[range];
    return {
      range,
      predicted: b.total > 0 ? Math.round((b.predSum / b.total) * 1000) / 10 : parseFloat(range.split("-")[0]) || 80,
      actual: b.total > 0 ? Math.round((b.won / b.total) * 1000) / 10 : 0,
      total: b.total,
    };
  });

  stats.lastUpdated = new Date().toISOString();
  data.stats = stats;
}

function normalizeMarket(betType: string): string {
  const t = betType.toLowerCase();
  if (t.includes("moneyline") || t === "h2h") return "Moneyline";
  if (t.includes("first_half") || t.includes("1h")) return "1st Half";
  if (t === "team_total") return "Team Total";
  if (t.includes("spread")) return "Spread";
  if (t.includes("total") || t.includes("over_under")) return "Total";
  if (t.startsWith("player_")) return "Player Props";
  return betType;
}

function matchesTeam(text: string, teamName: string): boolean {
  const tl = text.toLowerCase();
  const teamLow = teamName.toLowerCase();
  if (tl.includes(teamLow)) return true;
  const words = teamLow.split(" ").filter(w => w.length > 3);
  return words.some(w => tl.includes(w));
}

function settleOnePick(
  pick: TrackedPick,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "push" | "pending_data" {
  const betType = pick.betType.toLowerCase();
  const pickText = pick.pick.toLowerCase();
  const margin = homeScore - awayScore;
  const totalScore = homeScore + awayScore;

  const matchesHome = matchesTeam(pickText, pick.homeTeam);
  const matchesAway = matchesTeam(pickText, pick.awayTeam);

  if (betType.includes("first_half") || betType.includes("1h")) return "pending_data";
  if (betType.startsWith("player_")) return "pending_data";

  if (betType.includes("moneyline") || betType === "h2h") {
    if (matchesHome) return homeScore > awayScore ? "won" : homeScore === awayScore ? "push" : "lost";
    if (matchesAway) return awayScore > homeScore ? "won" : homeScore === awayScore ? "push" : "lost";
    return "pending_data";
  }

  if (betType.includes("spread")) {
    const spreadMatch = pickText.match(/([+-]?\d+\.?\d*)\s*$/);
    if (!spreadMatch) return "pending_data";
    const spread = parseFloat(spreadMatch[1]);
    if (isNaN(spread)) return "pending_data";
    const isHome = matchesHome || (!matchesAway && pickText.includes("home"));
    const adjustedMargin = isHome ? margin + spread : -margin + spread;
    if (Math.abs(adjustedMargin) < 0.01) return "push";
    return adjustedMargin > 0 ? "won" : "lost";
  }

  if (betType === "team_total") {
    const isOver = pickText.includes("over");
    const isUnder = pickText.includes("under");
    if (!isOver && !isUnder) return "pending_data";
    const lineMatch = pickText.match(/(\d+\.?\d*)\s*$/);
    if (!lineMatch) return "pending_data";
    const line = parseFloat(lineMatch[1]);
    const teamScore = matchesHome ? homeScore : matchesAway ? awayScore : totalScore;
    if (teamScore === line) return "push";
    if (isOver) return teamScore > line ? "won" : "lost";
    return teamScore < line ? "won" : "lost";
  }

  if (betType.includes("total") || betType.includes("over_under")) {
    const isOver = pickText.includes("over");
    const isUnder = pickText.includes("under");
    if (!isOver && !isUnder) return "pending_data";
    const lineMatch = pickText.match(/(\d+\.?\d*)\s*$/);
    if (!lineMatch) return "pending_data";
    const line = parseFloat(lineMatch[1]);
    if (totalScore === line) return "push";
    if (isOver) return totalScore > line ? "won" : "lost";
    return totalScore < line ? "won" : "lost";
  }

  return "pending_data";
}

export function savePrecomputedPicks(picks: Array<{
  id: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  ev: number;
  gameTime?: string;
}>): void {
  try {
    const data = getData();
    const existingIds = new Set([
      ...data.pending.map(p => p.id),
      ...data.settled.map(p => p.id),
    ]);

    let added = 0;
    const now = new Date().toISOString();

    for (const pick of picks) {
      if (existingIds.has(pick.id)) continue;

      // Skip bet types that can never produce a final result.
      // First-half lines need halftime scores (not tracked by ESPN final score feed).
      // Player props need individual player stat lines (not tracked here either).
      // Tracking them permanently inflates the pending count and starves the
      // learning engine of real settlement signal.
      const bt = pick.betType.toLowerCase();
      if (bt.includes("first_half") || bt.includes("1h") || bt.startsWith("player_")) continue;

      const gameId = pick.id.split("-").slice(2, 3).join("-") || pick.id;

      const tracked: TrackedPick = {
        id: pick.id,
        gameId,
        sport: pick.sport,
        game: pick.game,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        pick: pick.pick,
        betType: pick.betType,
        odds: pick.odds,
        grade: pick.grade,
        confidence: pick.confidence,
        ev: pick.ev,
        gameTime: pick.gameTime || now,
        savedAt: now,
      };

      data.pending.push(tracked);
      existingIds.add(pick.id);
      added++;
    }

    if (data.pending.length > MAX_PENDING) {
      data.pending = data.pending.slice(-MAX_PENDING);
    }

    if (added > 0) {
      data.stats.overall.pending = data.pending.length;
      saveData(data);
    }
  } catch (err) {
    console.error("[PickTracker] savePrecomputedPicks error:", err);
  }
}

export function saveBacktestPicks(picks: TrackedPick[]): number {
  try {
    const data = getData();
    const existingIds = new Set([
      ...data.pending.map(p => p.id),
      ...data.settled.map(p => p.id),
    ]);

    let added = 0;
    const now = new Date().toISOString();

    for (const pick of picks) {
      if (existingIds.has(pick.id)) continue;

      const tracked: TrackedPick = {
        ...pick,
        savedAt: pick.savedAt || now,
        settledAt: pick.settledAt || now,
        isBacktest: true,
      };

      data.settled.push(tracked);
      existingIds.add(pick.id);
      added++;
    }

    if (data.settled.length > MAX_SETTLED) {
      data.settled = data.settled.slice(-MAX_SETTLED);
    }

    if (added > 0) {
      recomputeStats(data);
      saveData(data);
    }
    return added;
  } catch (err) {
    console.error("[PickTracker] saveBacktestPicks error:", err);
    return 0;
  }
}

export function settlePicksForGame(params: {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  sport: string;
}): number {
  try {
    const data = getData();
    const now = new Date().toISOString();
    let settled = 0;

    const gameIdLow = params.gameId.toLowerCase();
    const homeTeamLow = params.homeTeam.toLowerCase();
    const awayTeamLow = params.awayTeam.toLowerCase();

    const toSettle = data.pending.filter(pick => {
      if (pick.gameId === params.gameId) return true;
      if (pick.sport.toUpperCase() !== params.sport.toUpperCase()) return false;
      const gameLow = pick.game.toLowerCase();
      return gameLow.includes(homeTeamLow) || gameLow.includes(awayTeamLow) ||
        pick.homeTeam.toLowerCase() === homeTeamLow ||
        pick.awayTeam.toLowerCase() === awayTeamLow;
    });

    if (toSettle.length === 0) return 0;

    const settledIds = new Set<string>();

    for (const pick of toSettle) {
      const result = settleOnePick(pick, params.homeScore, params.awayScore);
      if (result === "pending_data") continue;

      pick.result = result;
      pick.homeScore = params.homeScore;
      pick.awayScore = params.awayScore;
      pick.settledAt = now;
      data.settled.push(pick);
      settledIds.add(pick.id);
      settled++;

      // Feed outcome back into community loss pattern engine
      try {
        recordPickOutcome({
          sport: pick.sport,
          betType: pick.betType || "moneyline",
          odds: pick.odds ?? -110,
          grade: pick.grade,
          won: result === "won",
        });
      } catch (_) {}
    }

    data.pending = data.pending.filter(p => !settledIds.has(p.id));

    if (data.settled.length > MAX_SETTLED) {
      data.settled = data.settled.slice(-MAX_SETTLED);
    }

    if (settled > 0) {
      recomputeStats(data);
      saveData(data);
      console.log(`[PickTracker] Settled ${settled} picks for ${params.homeTeam} vs ${params.awayTeam} (${params.homeScore}-${params.awayScore})`);
    }

    return settled;
  } catch (err) {
    console.error("[PickTracker] settlePicksForGame error:", err);
    return 0;
  }
}

export function getPickAccuracyStats(): PickAccuracyStats {
  const data = getData();
  return data.stats;
}

export function getBacktestCount(): number {
  const data = getData();
  return data.settled.filter(p => p.isBacktest).length;
}

export function getRecentPicks(options: {
  limit?: number;
  sport?: string;
  status?: "settled" | "pending" | "all";
  grade?: string;
}): TrackedPick[] {
  const data = getData();
  const { limit = 50, sport, status = "all", grade } = options;

  let picks: TrackedPick[] = [];

  if (status === "settled" || status === "all") {
    picks = picks.concat([...data.settled].reverse());
  }
  if (status === "pending" || status === "all") {
    picks = picks.concat([...data.pending].reverse());
  }

  if (sport) picks = picks.filter(p => p.sport.toUpperCase() === sport.toUpperCase());
  if (grade) picks = picks.filter(p => p.grade === grade);

  return picks.slice(0, limit);
}

export function getPickTrackerStatus(): {
  pendingCount: number;
  settledCount: number;
  hitRate: number;
  lastUpdated: string;
} {
  const data = getData();
  return {
    pendingCount: data.pending.length,
    settledCount: data.settled.length,
    hitRate: data.stats.overall.rate,
    lastUpdated: data.stats.lastUpdated,
  };
}

export function resetPickTracker(): void {
  cache = { pending: [], settled: [], stats: defaultStats(), version: 1 };
  saveData(cache);
  console.log("[PickTracker] Reset all pick tracking data");
}

// Removes unsettleable bet types and deduplicates picks by game+betType+pick text.
// Safe to call multiple times — idempotent.
export function cleanupPickTracker(): { removedUnsettleable: number; removedDuplicates: number } {
  try {
    const data = getData();
    const originalPendingCount = data.pending.length;

    // 1. Remove pick types that can never settle via final-score data
    const unsettleableTypes = (bt: string) => {
      const b = bt.toLowerCase();
      return b.includes("first_half") || b.includes("1h") || b.startsWith("player_");
    };
    data.pending = data.pending.filter(p => !unsettleableTypes(p.betType));
    const afterTypeFilter = data.pending.length;
    const removedUnsettleable = originalPendingCount - afterTypeFilter;

    // 2. Deduplicate pending picks by game + betType + pick string.
    //    With deterministic IDs, future picks self-deduplicate via existingIds check.
    //    This pass cleans up old random-ID duplicates already in the file.
    const seen = new Set<string>();
    data.pending = data.pending.filter(p => {
      const key = `${p.game}|${p.betType}|${p.pick}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removedDuplicates = afterTypeFilter - data.pending.length;

    // 3. Also deduplicate settled picks the same way (keeps most recently settled)
    const seenSettled = new Set<string>();
    data.settled = [...data.settled].reverse().filter(p => {
      const key = `${p.game}|${p.betType}|${p.pick}`;
      if (seenSettled.has(key)) return false;
      seenSettled.add(key);
      return true;
    }).reverse();

    recomputeStats(data);
    saveData(data);

    console.log(`[PickTracker] Cleanup: removed ${removedUnsettleable} unsettleable + ${removedDuplicates} duplicate pending picks`);
    return { removedUnsettleable, removedDuplicates };
  } catch (err) {
    console.error("[PickTracker] cleanup error:", err);
    return { removedUnsettleable: 0, removedDuplicates: 0 };
  }
}

