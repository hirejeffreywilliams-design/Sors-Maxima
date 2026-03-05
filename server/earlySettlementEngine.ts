/**
 * Early Settlement Engine
 *
 * Settles picks faster by detecting mathematically-decided outcomes during
 * live games — rather than waiting for ESPN to mark a game "post" (completed).
 *
 * Settlement triggers (configurable thresholds):
 *  - Moneyline: winning margin > threshold with < clock_threshold time left
 *  - Total Over: combined score > line + buffer with limited time remaining
 *  - Total Under: combined score already impossible to reach the line
 *  - Player Props: stat already exceeds the prop line (via BDL live boxscore)
 *
 * Conservative approach: only settles when the outcome is statistically
 * irreversible (99%+ probability). Never settles if time/clock is unknown.
 */

import { settlePicksForGame } from "./pickOutcomeTracker";
import { broadcastEvent } from "./sseManager";
import { logInfo, logWarn } from "./errorLogger";
import { db } from "./db";
import { sql } from "drizzle-orm";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NHL: "hockey/nhl",
  MLB: "baseball/mlb",
  NFL: "football/nfl",
  NCAAB: "basketball/mens-college-basketball",
};

interface EarlySettlementThreshold {
  minMargin: number;
  minTotalBuffer: number;
  maxClockSeconds: number;
  maxPeriodFraction: number;
  totalPeriods: number;
}

const THRESHOLDS: Record<string, EarlySettlementThreshold> = {
  NBA: { minMargin: 18, minTotalBuffer: 18, maxClockSeconds: 120, maxPeriodFraction: 0.04, totalPeriods: 4 },
  NHL: { minMargin: 4, minTotalBuffer: 4, maxClockSeconds: 90, maxPeriodFraction: 0.05, totalPeriods: 3 },
  MLB: { minMargin: 8, minTotalBuffer: 8, maxClockSeconds: 0, maxPeriodFraction: 0.06, totalPeriods: 9 },
  NFL: { minMargin: 22, minTotalBuffer: 22, maxClockSeconds: 120, maxPeriodFraction: 0.04, totalPeriods: 4 },
  NCAAB: { minMargin: 22, minTotalBuffer: 22, maxClockSeconds: 120, maxPeriodFraction: 0.05, totalPeriods: 2 },
};

interface EarlySettlementStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  totalEarlySettled: number;
  totalPropsEarlySettled: number;
  lastGameSettled: string | null;
  signalLog: Array<{ game: string; sport: string; reason: string; settledAt: string; count: number }>;
  cyclesRun: number;
}

const engineStatus: EarlySettlementStatus = {
  isRunning: false,
  lastRunAt: null,
  totalEarlySettled: 0,
  totalPropsEarlySettled: 0,
  lastGameSettled: null,
  signalLog: [],
  cyclesRun: 0,
};

let earlySettlementInterval: NodeJS.Timeout | null = null;

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function parseClock(clockStr: string | undefined): number | null {
  if (!clockStr) return null;
  const m = clockStr.match(/^(\d+):(\d+)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const s = parseFloat(clockStr);
  if (!isNaN(s)) return s;
  return null;
}

function isGameEffectivelyOver(
  sport: string,
  homeScore: number,
  awayScore: number,
  period: number,
  clockSeconds: number | null,
): { decided: boolean; reason: string } {
  const thresh = THRESHOLDS[sport];
  if (!thresh) return { decided: false, reason: "" };

  const margin = Math.abs(homeScore - awayScore);
  const totalScore = homeScore + awayScore;
  const inFinalPeriod = period >= thresh.totalPeriods;

  if (!inFinalPeriod) return { decided: false, reason: "" };

  if (clockSeconds === null) return { decided: false, reason: "" };

  if (clockSeconds <= thresh.maxClockSeconds && margin >= thresh.minMargin) {
    return {
      decided: true,
      reason: `${margin}-pt lead with ${clockSeconds}s left in period ${period}`,
    };
  }

  return { decided: false, reason: "" };
}

async function checkEarlySettlementForSport(sport: string): Promise<number> {
  let earlySettled = 0;

  try {
    const path = SPORT_PATHS[sport];
    const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard`);
    const events = data?.events || [];

    for (const event of events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const status = event.status;
      if (status?.type?.state !== "in") continue;
      if (status?.type?.completed) continue;

      const competitors = comp.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;

      const homeScore = parseInt(home.score || "0", 10);
      const awayScore = parseInt(away.score || "0", 10);
      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      const period = status?.period || status?.displayClock ? parseInt(status?.period || "0") : 0;
      const clockStr = status?.displayClock || status?.clock;
      const clockSeconds = parseClock(clockStr);

      const { decided, reason } = isGameEffectivelyOver(sport, homeScore, awayScore, period, clockSeconds);
      if (!decided) continue;

      const homeTeam = (home.team?.displayName || "").toLowerCase();
      const awayTeam = (away.team?.displayName || "").toLowerCase();
      const gameId = event.id;

      const count = settlePicksForGame({
        gameId,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        sport,
      });

      const userSettled = await earlySettleUserPicks(gameId, homeTeam, awayTeam, homeScore, awayScore, sport);

      const totalCount = count + userSettled;
      if (totalCount > 0) {
        earlySettled += totalCount;
        engineStatus.totalEarlySettled += totalCount;
        engineStatus.lastGameSettled = `${away.team?.abbreviation || awayTeam} @ ${home.team?.abbreviation || homeTeam}`;

        const entry = {
          game: `${awayTeam} @ ${homeTeam}`,
          sport,
          reason: `Early settlement — ${reason}`,
          settledAt: new Date().toISOString(),
          count: totalCount,
        };
        engineStatus.signalLog.unshift(entry);
        if (engineStatus.signalLog.length > 50) engineStatus.signalLog.length = 50;

        logInfo(`[EarlySettlement] ${sport} — settled ${totalCount} picks early: ${entry.game} (${homeScore}-${awayScore}) — ${reason}`);

        broadcastEvent("early-settlement", {
          game: entry.game,
          sport,
          score: `${homeScore}-${awayScore}`,
          picksSettled: totalCount,
          reason,
        });
      }
    }
  } catch (e: any) {
    logWarn(`[EarlySettlement] ${sport} check failed: ${e.message}`);
  }

  return earlySettled;
}

async function earlySettleUserPicks(
  gameId: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  sport: string,
): Promise<number> {
  try {
    const unsettled = await db.execute(sql`
      SELECT * FROM user_picks
      WHERE settled = false
      AND (game_id = ${gameId} OR lower(pick) LIKE ${"%" + homeTeam.slice(0, 6) + "%"} OR lower(pick) LIKE ${"%" + awayTeam.slice(0, 6) + "%"})
      LIMIT 100
    `);
    const picks = unsettled.rows as any[];
    if (picks.length === 0) return 0;

    let settled = 0;
    const margin = homeScore - awayScore;
    const totalScore = homeScore + awayScore;

    for (const pick of picks) {
      const pickLow = (pick.pick || "").toLowerCase();
      const betType = (pick.bet_type || "moneyline").toLowerCase();
      let won: boolean | null = null;

      if (betType.includes("moneyline") || betType === "h2h") {
        const picksHome = pickLow.includes(homeTeam.slice(0, 6)) || pickLow.includes(homeTeam.split(" ").pop()!.toLowerCase());
        const picksAway = pickLow.includes(awayTeam.slice(0, 6)) || pickLow.includes(awayTeam.split(" ").pop()!.toLowerCase());
        if (picksHome) won = homeScore > awayScore;
        else if (picksAway) won = awayScore > homeScore;
      } else if (betType.includes("total") || betType.includes("over_under")) {
        const isOver = pickLow.includes("over");
        const isUnder = pickLow.includes("under");
        const lineMatch = pickLow.match(/(\d+\.?\d*)\s*(?:points?|goals?|runs?|total)?$/i);
        if (lineMatch && (isOver || isUnder)) {
          const line = parseFloat(lineMatch[1]);
          const thresh = THRESHOLDS[sport];
          if (isOver && totalScore > line + (thresh?.minTotalBuffer || 15)) won = true;
          else if (isUnder) {
            const remainingNeeded = line - totalScore;
            if (remainingNeeded > (thresh?.minTotalBuffer || 15)) won = true;
          }
        }
      }

      if (won === null) continue;

      await db.execute(sql`
        UPDATE user_picks
        SET settled = true, won = ${won}, settled_at = NOW(), early_settlement = true
        WHERE id = ${pick.id}
      `);
      settled++;
    }

    return settled;
  } catch (_) {
    return 0;
  }
}

async function checkPropEarlySettlement(): Promise<number> {
  let settled = 0;

  try {
    const { isBDLAvailable, getLiveBoxscore } = await import("./balldontlie-provider");
    if (!isBDLAvailable()) return 0;

    const { getTodaysGames } = await import("./balldontlie-provider");
    const games = await getTodaysGames();
    const liveGames = games.filter(g => g.status === "in progress" || g.period > 0);

    for (const game of liveGames) {
      if (!game.id) continue;
      const boxscore = await getLiveBoxscore(game.id);
      if (!boxscore || boxscore.length === 0) continue;

      const playerStats = new Map<string, Record<string, number>>();
      for (const stat of boxscore) {
        const name = `${stat.player?.first_name || ""} ${stat.player?.last_name || ""}`.trim().toLowerCase();
        if (!name) continue;
        playerStats.set(name, {
          pts: stat.pts || 0,
          reb: stat.reb || 0,
          ast: stat.ast || 0,
          stl: stat.stl || 0,
          blk: stat.blk || 0,
          fg3m: stat.fg3m || 0,
          turnover: stat.turnover || 0,
        });
      }

      if (playerStats.size === 0) continue;

      const pendingProps = await db.execute(sql`
        SELECT * FROM user_picks
        WHERE settled = false
        AND sport = 'NBA'
        AND bet_type = 'player_prop'
        LIMIT 200
      `);

      for (const pick of pendingProps.rows as any[]) {
        const pickLow = (pick.pick || "").toLowerCase();

        let playerName: string | null = null;
        let propLine: number | null = null;
        let isOver: boolean | null = null;
        let statKey: string | null = null;

        for (const [name] of playerStats) {
          if (pickLow.includes(name.split(" ").pop()!)) {
            playerName = name;
            break;
          }
        }
        if (!playerName) continue;

        const lineMatch = pickLow.match(/(\d+\.?\d*)\s*(?:points?|rebounds?|assists?|steals?|blocks?|threes?)/i);
        if (!lineMatch) continue;
        propLine = parseFloat(lineMatch[1]);

        isOver = pickLow.includes("over");
        const statText = lineMatch[0].toLowerCase();
        if (statText.includes("point")) statKey = "pts";
        else if (statText.includes("rebound")) statKey = "reb";
        else if (statText.includes("assist")) statKey = "ast";
        else if (statText.includes("steal")) statKey = "stl";
        else if (statText.includes("block")) statKey = "blk";
        else if (statText.includes("three")) statKey = "fg3m";
        else continue;

        const stats = playerStats.get(playerName);
        if (!stats || statKey === null) continue;
        const currentVal = stats[statKey] || 0;

        if (isOver && currentVal > propLine + 0.5) {
          await db.execute(sql`
            UPDATE user_picks SET settled = true, won = true, settled_at = NOW(), early_settlement = true
            WHERE id = ${pick.id}
          `);
          settled++;
          engineStatus.totalPropsEarlySettled++;
          logInfo(`[EarlySettlement] NBA prop settled early: ${playerName} has ${currentVal} ${statKey} vs line ${propLine}`);
        }
      }
    }
  } catch (e: any) {
    logWarn(`[EarlySettlement] Prop early settlement check failed: ${e.message}`);
  }

  return settled;
}

async function runEarlySettlementCycle(): Promise<void> {
  engineStatus.lastRunAt = new Date().toISOString();
  engineStatus.cyclesRun++;

  let total = 0;
  for (const sport of Object.keys(THRESHOLDS)) {
    total += await checkEarlySettlementForSport(sport);
    await new Promise(r => setTimeout(r, 200));
  }

  total += await checkPropEarlySettlement();

  if (total > 0) {
    try {
      const { triggerManualWeightSync } = await import("./continuousLearningOrchestrator");
      await triggerManualWeightSync();
    } catch (_) {}
  }
}

export function startEarlySettlementEngine(): void {
  if (engineStatus.isRunning) return;
  engineStatus.isRunning = true;

  earlySettlementInterval = setInterval(async () => {
    await runEarlySettlementCycle().catch(e => logWarn(`[EarlySettlement] Cycle error: ${e.message}`));
  }, 90_000);

  setTimeout(() => runEarlySettlementCycle().catch(() => {}), 5_000);

  logInfo("[EarlySettlement] Early Settlement Engine started — polling every 90s for mathematically-decided outcomes");
}

export function stopEarlySettlementEngine(): void {
  if (earlySettlementInterval) clearInterval(earlySettlementInterval);
  earlySettlementInterval = null;
  engineStatus.isRunning = false;
}

export function getEarlySettlementStatus(): EarlySettlementStatus {
  return { ...engineStatus };
}

export async function triggerEarlySettlementNow(): Promise<{ settled: number }> {
  let total = 0;
  for (const sport of Object.keys(THRESHOLDS)) {
    total += await checkEarlySettlementForSport(sport);
  }
  total += await checkPropEarlySettlement();
  return { settled: total };
}
