import { db } from "./db";
import { sql } from "drizzle-orm";
import { settlePicksForGame, getPickTrackerStatus } from "./pickOutcomeTracker";
import { triggerManualSettlement } from "./continuousLearningOrchestrator";
import { logInfo, logWarn } from "./errorLogger";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAB: "basketball/mens-college-basketball",
  NCAAF: "football/college-football",
};

interface CompletedGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  date: string;
}

interface SettlementStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  lastSettledCount: number;
  totalSettled: number;
  backfillCompleted: boolean;
  backfillSettled: number;
  errors: string[];
  pendingPicks: number;
  settledPicks: number;
  hitRate: number;
}

const status: SettlementStatus = {
  isRunning: false,
  startedAt: null,
  lastRunAt: null,
  lastSettledCount: 0,
  totalSettled: 0,
  backfillCompleted: false,
  backfillSettled: 0,
  errors: [],
  pendingPicks: 0,
  settledPicks: 0,
  hitRate: 0,
};

let settlementInterval: ReturnType<typeof setInterval> | null = null;

async function fetchJSON(url: string, timeoutMs = 10000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchCompletedGamesForDate(sport: string, dateStr: string): Promise<CompletedGame[]> {
  const path = SPORT_PATHS[sport];
  if (!path) return [];

  try {
    const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard?dates=${dateStr}`);
    const events = data?.events || [];
    const completed: CompletedGame[] = [];

    for (const event of events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      if (!event.status?.type?.completed) continue;

      const competitors = comp.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;

      const homeScore = parseInt(home.score || "0", 10);
      const awayScore = parseInt(away.score || "0", 10);
      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      completed.push({
        id: event.id,
        sport,
        homeTeam: (home.team?.displayName || "").toLowerCase(),
        awayTeam: (away.team?.displayName || "").toLowerCase(),
        homeAbbr: (home.team?.abbreviation || "").toLowerCase(),
        awayAbbr: (away.team?.abbreviation || "").toLowerCase(),
        homeScore,
        awayScore,
        date: dateStr,
      });
    }

    return completed;
  } catch (e: any) {
    logWarn(`[Settlement] Failed to fetch ${sport} for ${dateStr}: ${e.message}`);
    return [];
  }
}

async function fetchCompletedGamesForDateRange(lookbackDays: number): Promise<CompletedGame[]> {
  const allGames: CompletedGame[] = [];
  const seen = new Set<string>();

  for (let d = 0; d <= lookbackDays; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = formatDate(date);

    for (const sport of Object.keys(SPORT_PATHS)) {
      const games = await fetchCompletedGamesForDate(sport, dateStr);
      for (const game of games) {
        const key = `${game.sport}-${game.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allGames.push(game);
        }
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }

  return allGames;
}

async function settleUserPicksFromGames(games: CompletedGame[]): Promise<number> {
  try {
    const unsettled = await db.execute(sql`
      SELECT * FROM user_picks WHERE settled = false ORDER BY placed_at DESC LIMIT 500
    `);
    const userPicks = unsettled.rows as any[];
    if (userPicks.length === 0) return 0;

    let settled = 0;
    for (const game of games) {
      const gameHomeLow = game.homeTeam.toLowerCase();
      const gameAwayLow = game.awayTeam.toLowerCase();

      for (const pick of userPicks) {
        if (pick.settled) continue;
        const pickSport = (pick.sport || "").toUpperCase();
        if (pickSport && pickSport !== game.sport.toUpperCase()) continue;

        const pickLow = (pick.pick || "").toLowerCase();
        const gameIdMatch = pick.game_id && pick.game_id === game.id;
        const nameMatch =
          pickLow.includes(gameHomeLow) || pickLow.includes(gameAwayLow) ||
          pickLow.includes(game.homeAbbr) || pickLow.includes(game.awayAbbr);

        if (!gameIdMatch && !nameMatch) continue;

        const betType = (pick.bet_type || "moneyline").toLowerCase();
        const margin = game.homeScore - game.awayScore;
        const totalScore = game.homeScore + game.awayScore;
        let won: boolean | null = null;

        if (betType.includes("moneyline") || betType === "h2h") {
          const picksHome = pickLow.includes(gameHomeLow) || pickLow.includes(game.homeAbbr);
          const picksAway = pickLow.includes(gameAwayLow) || pickLow.includes(game.awayAbbr);
          if (picksHome) won = game.homeScore > game.awayScore;
          else if (picksAway) won = game.awayScore > game.homeScore;
        } else if (betType.includes("spread")) {
          const spreadMatch = pickLow.match(/([+-]?\d+\.?\d*)\s*$/);
          if (spreadMatch) {
            const spread = parseFloat(spreadMatch[1]);
            const picksHome = pickLow.includes(gameHomeLow) || pickLow.includes(game.homeAbbr);
            const adjustedMargin = picksHome ? margin + spread : -margin + spread;
            if (Math.abs(adjustedMargin) < 0.01) won = null;
            else won = adjustedMargin > 0;
          }
        } else if (betType.includes("total") || betType.includes("over_under")) {
          const isOver = pickLow.includes("over");
          const isUnder = pickLow.includes("under");
          const lineMatch = pickLow.match(/(\d+\.?\d*)\s*$/);
          if (lineMatch && (isOver || isUnder)) {
            const line = parseFloat(lineMatch[1]);
            if (Math.abs(totalScore - line) < 0.01) won = null;
            else if (isOver) won = totalScore > line;
            else won = totalScore < line;
          }
        }

        if (won === null && !betType.includes("spread") && !betType.includes("total")) continue;

        const closingOdds = pick.odds_at_pick;
        const clvResult = closingOdds !== null
          ? (pick.odds_at_pick - closingOdds)
          : null;

        await db.execute(sql`
          UPDATE user_picks
          SET settled = true, won = ${won}, settled_at = NOW(),
              closing_odds = ${closingOdds}, clv_result = ${clvResult}
          WHERE id = ${pick.id}
        `);

        (pick as any).settled = true;
        settled++;
      }
    }

    return settled;
  } catch (e: any) {
    logWarn(`[Settlement] Failed to settle user picks: ${e.message}`);
    return 0;
  }
}

async function runSettlementCycle(lookbackDays = 3): Promise<number> {
  try {
    const games = await fetchCompletedGamesForDateRange(lookbackDays);
    if (games.length === 0) return 0;

    let totalSettled = 0;

    for (const game of games) {
      const count = settlePicksForGame({
        gameId: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        sport: game.sport,
      });
      totalSettled += count;
    }

    const userSettled = await settleUserPicksFromGames(games);
    totalSettled += userSettled;

    try {
      const dbResult = await triggerManualSettlement();
      totalSettled += dbResult.settled;
    } catch {}

    if (totalSettled > 0) {
      logInfo(`[Settlement] Settled ${totalSettled} picks from ${games.length} completed games (${lookbackDays}d lookback)`);
      try {
        const { triggerManualWeightSync } = await import("./continuousLearningOrchestrator");
        await triggerManualWeightSync();
      } catch {}
    }

    const tracker = getPickTrackerStatus();
    status.pendingPicks = tracker.pendingCount;
    status.settledPicks = tracker.settledCount;
    status.hitRate = tracker.hitRate;
    status.totalSettled += totalSettled;
    status.lastSettledCount = totalSettled;
    status.lastRunAt = new Date().toISOString();

    return totalSettled;
  } catch (e: any) {
    const msg = `Settlement cycle error: ${e.message}`;
    logWarn(`[Settlement] ${msg}`);
    status.errors = [msg, ...status.errors].slice(0, 10);
    return 0;
  }
}

export async function runHistoricalBackfill(days = 14): Promise<{ gamesFound: number; picksSettled: number }> {
  logInfo(`[Settlement] Starting historical backfill — last ${days} days...`);
  try {
    const games = await fetchCompletedGamesForDateRange(days);
    let picksSettled = 0;

    for (const game of games) {
      picksSettled += settlePicksForGame({
        gameId: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        sport: game.sport,
      });
    }

    picksSettled += await settleUserPicksFromGames(games);

    try {
      const dbResult = await triggerManualSettlement();
      picksSettled += dbResult.settled;
    } catch {}

    if (picksSettled > 0) {
      try {
        const { triggerManualWeightSync } = await import("./continuousLearningOrchestrator");
        await triggerManualWeightSync();
      } catch {}
    }

    status.backfillCompleted = true;
    status.backfillSettled = picksSettled;
    status.totalSettled += picksSettled;

    const tracker = getPickTrackerStatus();
    status.pendingPicks = tracker.pendingCount;
    status.settledPicks = tracker.settledCount;
    status.hitRate = tracker.hitRate;

    logInfo(`[Settlement] Historical backfill complete — ${games.length} games found, ${picksSettled} picks settled`);
    return { gamesFound: games.length, picksSettled };
  } catch (e: any) {
    logWarn(`[Settlement] Backfill error: ${e.message}`);
    return { gamesFound: 0, picksSettled: 0 };
  }
}

export function startAutoSettlement(): void {
  if (status.isRunning) return;
  status.isRunning = true;
  status.startedAt = new Date().toISOString();

  setTimeout(async () => {
    try {
      await runHistoricalBackfill(14);
    } catch (e: any) {
      logWarn(`[Settlement] Startup backfill failed: ${e.message}`);
    }
  }, 45000);

  settlementInterval = setInterval(async () => {
    try {
      await runSettlementCycle(3);
    } catch (e: any) {
      logWarn(`[Settlement] Auto-settlement error: ${e.message}`);
    }
  }, 5 * 60 * 1000);

  logInfo("[Settlement] Auto-settlement engine started — backfill in 45s, then every 5 min");
}

export function stopAutoSettlement(): void {
  if (settlementInterval) clearInterval(settlementInterval);
  settlementInterval = null;
  status.isRunning = false;
}

export function getSettlementStatus(): SettlementStatus {
  const tracker = getPickTrackerStatus();
  return {
    ...status,
    pendingPicks: tracker.pendingCount,
    settledPicks: tracker.settledCount,
    hitRate: tracker.hitRate,
  };
}

export async function triggerSettlement(lookbackDays = 3): Promise<number> {
  return runSettlementCycle(lookbackDays);
}
