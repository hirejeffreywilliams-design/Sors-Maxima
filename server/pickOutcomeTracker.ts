import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
}

export interface PickAccuracyStats {
  overall: { total: number; won: number; lost: number; push: number; rate: number; pending: number };
  bySport: Record<string, { total: number; won: number; rate: number }>;
  byGrade: Record<string, { total: number; won: number; rate: number }>;
  byMarket: Record<string, { total: number; won: number; rate: number }>;
  recentForm: { won: number; lost: number; push: number; rate: number };
  lastUpdated: string;
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
  };
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
    if (!stats.byMarket[market]) stats.byMarket[market] = { total: 0, won: 0, rate: 0 };
    stats.byMarket[market].total++;
    if (isWon) stats.byMarket[market].won++;
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
  for (const m of Object.values(stats.byMarket)) {
    m.rate = m.total > 0 ? Math.round((m.won / m.total) * 1000) / 10 : 0;
  }

  const recent = settled.slice(-50);
  const rWon = recent.filter(p => p.result === "won").length;
  const rPush = recent.filter(p => p.result === "push").length;
  const rLost = recent.filter(p => p.result === "lost").length;
  stats.recentForm = {
    won: rWon, lost: rLost, push: rPush,
    rate: recent.length > 0 ? Math.round((rWon / recent.length) * 1000) / 10 : 0,
  };

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
