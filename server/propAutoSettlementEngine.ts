/**
 * Prop Auto-Settlement Engine
 *
 * Automatically settles prop_track_records by fetching completed game
 * boxscores from the ESPN Summary API and comparing player stats to
 * the saved prop line.  Zero admin manual work required.
 *
 * Supports: NBA, NCAAB, NFL, NCAAF, MLB, NHL
 *
 * Called by settlementEngine.ts after every normal settlement cycle
 * (every 5 minutes) and on the 14-day historical backfill.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { logInfo, logWarn } from "./errorLogger";

// ── ESPN API config ───────────────────────────────────────────────────────────

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const SPORT_PATHS: Record<string, string> = {
  NBA:   "basketball/nba",
  NCAAB: "basketball/mens-college-basketball",
  NFL:   "football/nfl",
  NCAAF: "football/college-football",
  MLB:   "baseball/mlb",
  NHL:   "hockey/nhl",
};

// ── Market → ESPN label mapping ───────────────────────────────────────────────
// Format:  market key  →  { label: ESPN label column header, group: partial group type match }
// `group` is optional; for multi-group sports (NFL) it filters to the right stat category.

interface StatMapping { label: string; group?: string }

const MARKET_MAP: Record<string, Record<string, StatMapping>> = {
  NBA: {
    points:           { label: "PTS" },
    rebounds:         { label: "REB" },
    assists:          { label: "AST" },
    steals:           { label: "STL" },
    blocks:           { label: "BLK" },
    threes:           { label: "3PM" },
    "3pt_made":       { label: "3PM" },
    turnovers:        { label: "TO" },
  },
  NCAAB: {
    points:    { label: "PTS" },
    rebounds:  { label: "REB" },
    assists:   { label: "AST" },
    steals:    { label: "STL" },
    blocks:    { label: "BLK" },
    threes:    { label: "3PM" },
    turnovers: { label: "TO" },
  },
  NFL: {
    passing_yards:           { label: "YDS",   group: "passing" },
    passing_touchdowns:      { label: "TD",    group: "passing" },
    completions:             { label: "COMP",  group: "passing" },
    interceptions:           { label: "INT",   group: "passing" },
    rushing_yards:           { label: "YDS",   group: "rushing" },
    rushing_touchdowns:      { label: "TD",    group: "rushing" },
    carries:                 { label: "CAR",   group: "rushing" },
    receiving_yards:         { label: "YDS",   group: "receiving" },
    receiving_touchdowns:    { label: "TD",    group: "receiving" },
    receptions:              { label: "REC",   group: "receiving" },
    reception_targets:       { label: "TGTS",  group: "receiving" },
  },
  NCAAF: {
    passing_yards:        { label: "YDS",  group: "passing" },
    passing_touchdowns:   { label: "TD",   group: "passing" },
    rushing_yards:        { label: "YDS",  group: "rushing" },
    rushing_touchdowns:   { label: "TD",   group: "rushing" },
    receiving_yards:      { label: "YDS",  group: "receiving" },
    receptions:           { label: "REC",  group: "receiving" },
  },
  MLB: {
    hits:          { label: "H",   group: "hitting" },
    runs:          { label: "R",   group: "hitting" },
    rbis:          { label: "RBI", group: "hitting" },
    home_runs:     { label: "HR",  group: "hitting" },
    strikeouts:    { label: "K",   group: "pitching" },
    walks:         { label: "BB",  group: "hitting" },
    stolen_bases:  { label: "SB",  group: "hitting" },
    pitch_strikeouts: { label: "K", group: "pitching" },
  },
  NHL: {
    goals:   { label: "G" },
    assists:  { label: "A" },
    points:   { label: "PTS" },
    shots:    { label: "SOG" },
    saves:    { label: "SV" },
  },
};

// ── Status tracking ───────────────────────────────────────────────────────────

interface PropSettlementStatus {
  totalSettled: number;
  totalSkipped: number;
  totalNoMatch: number;
  lastRunAt: string | null;
  lastSettledCount: number;
  recentLog: Array<{ playerName: string; market: string; line: number; actual: number; outcome: string; settledAt: string }>;
}

const engineStatus: PropSettlementStatus = {
  totalSettled: 0,
  totalSkipped: 0,
  totalNoMatch: 0,
  lastRunAt: null,
  lastSettledCount: 0,
  recentLog: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJSON(url: string, timeoutMs = 10000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch player-level stats from the ESPN game summary API.
 * Returns Map<normalizedPlayerName, Map<marketKey, statValue>>
 */
async function fetchBoxscoreStats(
  sport: string,
  gameId: string,
): Promise<Map<string, Map<string, number>>> {
  const path = SPORT_PATHS[sport];
  if (!path) return new Map();

  const result = new Map<string, Map<string, number>>();
  const marketMap = MARKET_MAP[sport] || {};

  try {
    const data = await fetchJSON(`${ESPN_BASE}/${path}/summary?event=${gameId}`);
    const teamBlocks = data?.boxscore?.players || [];

    for (const teamBlock of teamBlocks) {
      for (const statGroup of (teamBlock.statistics || [])) {
        const groupType = (statGroup.type || statGroup.name || "").toLowerCase();
        const labels: string[] = statGroup.labels || statGroup.keys || [];

        // Build label → column-index map for this group
        const labelIdx: Record<string, number> = {};
        for (let i = 0; i < labels.length; i++) {
          labelIdx[labels[i].toUpperCase()] = i;
        }

        for (const athleteEntry of (statGroup.athletes || [])) {
          const displayName = (
            athleteEntry.athlete?.displayName ||
            athleteEntry.athlete?.fullName ||
            ""
          ).trim();
          if (!displayName) continue;
          const normName = displayName.toLowerCase();

          const rawStats: string[] = athleteEntry.stats || [];

          if (!result.has(normName)) result.set(normName, new Map());
          const playerMap = result.get(normName)!;

          // For each market this sport tracks, see if this stat group has it
          for (const [market, mapping] of Object.entries(marketMap)) {
            // If this mapping requires a specific group, check it
            if (mapping.group && !groupType.includes(mapping.group)) continue;

            const colIdx = labelIdx[mapping.label.toUpperCase()];
            if (colIdx === undefined) continue;

            const rawVal = rawStats[colIdx];
            if (rawVal === undefined || rawVal === null || rawVal === "--") continue;

            // Handle "C/ATT" style completions (take numerator)
            const numericStr = rawVal.includes("/") ? rawVal.split("/")[0] : rawVal;
            const val = parseFloat(numericStr);
            if (!isNaN(val)) {
              playerMap.set(market, val);
            }
          }
        }
      }
    }
  } catch (e: any) {
    logWarn(`[PropAutoSettle] Boxscore fetch failed — ${sport} game ${gameId}: ${e.message}`);
  }

  return result;
}

/**
 * Fuzzy player name matching.
 * Priority: exact → last name + first initial → last name only (≥5 chars).
 */
function findPlayer(
  storedName: string,
  statsMap: Map<string, Map<string, number>>,
): Map<string, number> | null {
  const norm = storedName.toLowerCase().trim();

  if (statsMap.has(norm)) return statsMap.get(norm)!;

  const parts = norm.split(/\s+/);
  const lastName = parts[parts.length - 1];
  const firstInit = parts[0]?.[0] ?? "";

  // Last + first initial
  if (lastName.length >= 3) {
    for (const [key, val] of statsMap) {
      const kp = key.split(/\s+/);
      const kLast = kp[kp.length - 1];
      const kFirst = kp[0]?.[0] ?? "";
      if (kLast === lastName && kFirst === firstInit) return val;
    }
  }

  // Last name only (5+ chars to avoid false matches like "Lee", "Kim")
  if (lastName.length >= 5) {
    for (const [key, val] of statsMap) {
      const kLast = key.split(/\s+/).pop() ?? "";
      if (kLast === lastName) return val;
    }
  }

  return null;
}

function determineOutcome(
  selection: string,
  line: number,
  actual: number,
): "won" | "lost" | "push" {
  const isOver = selection.toLowerCase().includes("over");
  if (Math.abs(actual - line) < 0.01) return "push";
  return isOver ? (actual > line ? "won" : "lost") : (actual < line ? "won" : "lost");
}

// ── Main settlement function ──────────────────────────────────────────────────

export interface CompletedGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbr?: string;
  awayAbbr?: string;
}

/**
 * Settle pending prop_track_records using already-fetched completed game data.
 * Called by settlementEngine.ts after every 5-minute cycle.
 */
export async function settlePropsFromGames(games: CompletedGame[]): Promise<number> {
  if (games.length === 0) return 0;

  engineStatus.lastRunAt = new Date().toISOString();
  let settled = 0;

  try {
    // Pull all pending props from the last 7 days, must be >3h old (game is over)
    const pending = await db.execute(sql`
      SELECT id, player_name, sport, market, line, selection, home_team, away_team
      FROM prop_track_records
      WHERE outcome = 'pending'
        AND generated_at < NOW() - INTERVAL '3 hours'
        AND generated_at > NOW() - INTERVAL '7 days'
      ORDER BY generated_at DESC
      LIMIT 500
    `);

    const props = pending.rows as any[];
    if (props.length === 0) return 0;

    // Build game lookup: sport+homeTeam+awayTeam → gameId
    const gameIndex = new Map<string, CompletedGame>();
    for (const g of games) {
      // Index by sport+home+away (normalized, first 6 chars each for fuzzy)
      const key = `${g.sport}::${g.homeTeam.slice(0, 6)}::${g.awayTeam.slice(0, 6)}`;
      gameIndex.set(key, g);
      // Also index reversed (in case home/away stored differently)
      const rev = `${g.sport}::${g.awayTeam.slice(0, 6)}::${g.homeTeam.slice(0, 6)}`;
      gameIndex.set(rev, g);
    }

    // Cache boxscore stats per game to avoid redundant API calls
    const boxscoreCache = new Map<string, Map<string, Map<string, number>>>();

    for (const prop of props) {
      const sport = (prop.sport || "NBA").toUpperCase();
      const playerName: string = prop.player_name || "";
      const market: string = prop.market || "";
      const line = parseFloat(prop.line ?? "0");
      const selection: string = prop.selection || "over";
      const homeTeam: string = (prop.home_team || "").toLowerCase();
      const awayTeam: string = (prop.away_team || "").toLowerCase();

      if (!MARKET_MAP[sport]) {
        engineStatus.totalSkipped++;
        continue;
      }

      // Find the matching completed game
      let matchedGame: CompletedGame | undefined;

      const lookupKey1 = `${sport}::${homeTeam.slice(0, 6)}::${awayTeam.slice(0, 6)}`;
      const lookupKey2 = `${sport}::${awayTeam.slice(0, 6)}::${homeTeam.slice(0, 6)}`;
      matchedGame = gameIndex.get(lookupKey1) ?? gameIndex.get(lookupKey2);

      // Fallback: scan all games for this sport and match on partial names
      if (!matchedGame && homeTeam.length >= 4) {
        for (const g of games) {
          if (g.sport.toUpperCase() !== sport) continue;
          const hMatch = g.homeTeam.includes(homeTeam.slice(0, 4)) || homeTeam.includes(g.homeTeam.slice(0, 4));
          const aMatch = g.awayTeam.includes(awayTeam.slice(0, 4)) || awayTeam.includes(g.awayTeam.slice(0, 4));
          if (hMatch || aMatch) {
            matchedGame = g;
            break;
          }
        }
      }

      if (!matchedGame) {
        engineStatus.totalNoMatch++;
        engineStatus.totalSkipped++;
        continue;
      }

      // Fetch boxscore (cached per game)
      if (!boxscoreCache.has(matchedGame.id)) {
        const stats = await fetchBoxscoreStats(sport, matchedGame.id);
        boxscoreCache.set(matchedGame.id, stats);
        await new Promise(r => setTimeout(r, 150)); // gentle rate limit
      }

      const boxscore = boxscoreCache.get(matchedGame.id)!;
      const playerStats = findPlayer(playerName, boxscore);

      if (!playerStats) {
        engineStatus.totalNoMatch++;
        engineStatus.totalSkipped++;
        continue;
      }

      const actualResult = playerStats.get(market);
      if (actualResult === undefined) {
        engineStatus.totalSkipped++;
        continue;
      }

      const outcome = determineOutcome(selection, line, actualResult);

      await db.execute(sql`
        UPDATE prop_track_records
        SET outcome = ${outcome},
            actual_result = ${actualResult},
            settled_at = NOW()
        WHERE id = ${prop.id}
      `);

      settled++;
      engineStatus.totalSettled++;

      const logEntry = {
        playerName,
        market,
        line,
        actual: actualResult,
        outcome,
        settledAt: new Date().toISOString(),
      };
      engineStatus.recentLog.unshift(logEntry);
      if (engineStatus.recentLog.length > 100) engineStatus.recentLog.length = 100;

      logInfo(`[PropAutoSettle] ${playerName} ${market} ${selection} ${line} → actual ${actualResult} = ${outcome.toUpperCase()}`);
    }
  } catch (e: any) {
    logWarn(`[PropAutoSettle] Settlement cycle error: ${e.message}`);
  }

  engineStatus.lastSettledCount = settled;
  return settled;
}

/**
 * Standalone run — fetches completed games itself (for manual trigger / admin).
 */
export async function autoSettlePropTrackRecords(lookbackDays = 3): Promise<{ settled: number }> {
  const games: CompletedGame[] = [];
  const seen = new Set<string>();

  for (let d = 0; d <= lookbackDays; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    for (const [sport, path] of Object.entries(SPORT_PATHS)) {
      try {
        const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard?dates=${dateStr}`);
        for (const event of (data?.events || [])) {
          if (!event.status?.type?.completed) continue;
          const comp = event.competitions?.[0];
          if (!comp || seen.has(event.id)) continue;
          seen.add(event.id);

          const home = comp.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp.competitors?.find((c: any) => c.homeAway === "away");
          if (!home || !away) continue;

          games.push({
            id: event.id,
            sport,
            homeTeam: (home.team?.displayName || "").toLowerCase(),
            awayTeam: (away.team?.displayName || "").toLowerCase(),
            homeAbbr: (home.team?.abbreviation || "").toLowerCase(),
            awayAbbr: (away.team?.abbreviation || "").toLowerCase(),
          });
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 120));
    }
  }

  const settled = await settlePropsFromGames(games);
  return { settled };
}

export function getPropSettlementStatus(): PropSettlementStatus {
  return { ...engineStatus, recentLog: engineStatus.recentLog.slice(0, 20) };
}
