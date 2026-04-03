/**
 * Sharp Signal Detector + CLV Auto-Capture Engine
 *
 * Two responsibilities:
 * 1. SHARP SIGNALS: Polls The Odds API every 60 seconds for upcoming games.
 *    Detects line movement ≥1.5 pts (spread), ≥2 pts (total), or ≥30 cents (ML)
 *    within a 60-second window — indicative of sharp/professional money movement.
 *    Broadcasts SSE alerts and logs picks flagged as "sharp_signal".
 *
 * 2. CLV AUTO-CAPTURE: When a game transitions from pre-game to live, captures
 *    the current closing line from The Odds API and stores it on matching user_picks.
 *    CLV = odds_at_pick - closing_line (positive = beat the closing line).
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { broadcastEvent } from "./sseManager";
import { logInfo, logWarn } from "./errorLogger";
import { orchestratorEmit } from "./sorsOrchestrator";
import { isGameWindowActive, getGameWindowInfo } from "./gameWindowScheduler";

const THE_ODDS_BASE = "https://api.the-odds-api.com/v4";
const BOOKMAKER_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars", "bovada"];

interface LineSnapshot {
  spread?: number;
  total?: number;
  homeML?: number;
  awayML?: number;
  capturedAt: number;
}

interface SharpSignal {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  market: "spread" | "total" | "moneyline";
  oldLine: number;
  newLine: number;
  movement: number;
  direction: "up" | "down";
  detectedAt: string;
  bookmaker: string;
}

interface SharpSignalStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  totalSignalsDetected: number;
  totalCLVCaptures: number;
  recentSignals: SharpSignal[];
  gamesMonitored: number;
  cyclesRun: number;
}

const lineHistory = new Map<string, LineSnapshot>();
const liveGames = new Set<string>();
const engineStatus: SharpSignalStatus = {
  isRunning: false,
  lastRunAt: null,
  totalSignalsDetected: 0,
  totalCLVCaptures: 0,
  recentSignals: [],
  gamesMonitored: 0,
  cyclesRun: 0,
};

let detectorInterval: NodeJS.Timeout | null = null;

function getOddsKey(): string | null {
  return process.env.THE_ODDS_API_KEY || null;
}

async function fetchOddsJSON(path: string): Promise<any> {
  const key = getOddsKey();
  if (!key) return null;

  const url = `${THE_ODDS_BASE}${path}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (r.status === 422 || r.status === 401) return null;
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    clearTimeout(t);
    return null;
  }
}

const SPORT_KEYS: Record<string, string> = {
  NBA: "basketball_nba",
  NFL: "americanfootball_nfl",
  NHL: "icehockey_nhl",
  MLB: "baseball_mlb",
  NCAAB: "basketball_ncaab",
};

function extractLine(
  bookmakers: any[],
  market: "spreads" | "totals" | "h2h",
): { value: number | null; bookmaker: string } {
  for (const bm of BOOKMAKER_PRIORITY) {
    const found = bookmakers.find((b: any) => b.key === bm);
    if (!found) continue;
    const mkt = found.markets?.find((m: any) => m.key === market);
    if (!mkt || !mkt.outcomes?.length) continue;

    if (market === "spreads") {
      const home = mkt.outcomes.find((o: any) => o.name !== "Over" && o.name !== "Under");
      if (home?.point != null) return { value: home.point, bookmaker: bm };
    } else if (market === "totals") {
      const over = mkt.outcomes.find((o: any) => o.name === "Over");
      if (over?.point != null) return { value: over.point, bookmaker: bm };
    } else if (market === "h2h") {
      const home = mkt.outcomes[0];
      if (home?.price != null) return { value: home.price, bookmaker: bm };
    }
  }
  return { value: null, bookmaker: "" };
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

async function fetchGamesForSport(sportKey: string): Promise<any[]> {
  const data = await fetchOddsJSON(
    `/sports/${sportKey}/odds?apiKey=${getOddsKey()}&regions=us&markets=spreads,totals,h2h&oddsFormat=decimal`,
  );
  return Array.isArray(data) ? data : [];
}

async function runDetectionCycle(): Promise<void> {
  engineStatus.lastRunAt = new Date().toISOString();
  engineStatus.cyclesRun++;

  if (!isGameWindowActive()) {
    const info = getGameWindowInfo();
    logInfo(`[SharpSignal] Skipping — ${info.reason} (API quota preserved)`);
    return;
  }

  let totalGames = 0;
  const now = Date.now();
  const signals: SharpSignal[] = [];
  const clvCaptures: string[] = [];

  for (const [sport, sportKey] of Object.entries(SPORT_KEYS)) {
    try {
      const games = await fetchGamesForSport(sportKey);
      totalGames += games.length;

      for (const game of games) {
        const gameId = game.id as string;
        const homeTeam = game.home_team as string;
        const awayTeam = game.away_team as string;
        const commenceMs = new Date(game.commence_time).getTime();
        const bookmakers = game.bookmakers || [];

        const spreadLine = extractLine(bookmakers, "spreads");
        const totalLine = extractLine(bookmakers, "totals");
        const mlLine = extractLine(bookmakers, "h2h");

        const snapshot: LineSnapshot = {
          spread: spreadLine.value ?? undefined,
          total: totalLine.value ?? undefined,
          homeML: mlLine.value ?? undefined,
          capturedAt: now,
        };

        const prev = lineHistory.get(gameId);
        const isNowLive = commenceMs <= now && commenceMs > now - 4 * 60 * 60 * 1000;
        const wasNotLive = !liveGames.has(gameId);

        if (isNowLive && wasNotLive) {
          liveGames.add(gameId);
          await captureClosingLine(gameId, homeTeam, awayTeam, sport, snapshot, spreadLine.bookmaker, totalLine.bookmaker);
          clvCaptures.push(gameId);
        }

        if (prev && !isNowLive) {
          if (prev.spread != null && snapshot.spread != null) {
            const move = Math.abs(snapshot.spread - prev.spread);
            if (move >= 1.5) {
              const signal: SharpSignal = {
                gameId,
                sport,
                homeTeam,
                awayTeam,
                market: "spread",
                oldLine: prev.spread,
                newLine: snapshot.spread,
                movement: move,
                direction: snapshot.spread > prev.spread ? "up" : "down",
                detectedAt: new Date().toISOString(),
                bookmaker: spreadLine.bookmaker,
              };
              signals.push(signal);
            }
          }

          if (prev.total != null && snapshot.total != null) {
            const move = Math.abs(snapshot.total - prev.total);
            if (move >= 2) {
              const signal: SharpSignal = {
                gameId,
                sport,
                homeTeam,
                awayTeam,
                market: "total",
                oldLine: prev.total,
                newLine: snapshot.total,
                movement: move,
                direction: snapshot.total > prev.total ? "up" : "down",
                detectedAt: new Date().toISOString(),
                bookmaker: totalLine.bookmaker,
              };
              signals.push(signal);
            }
          }

          if (prev.homeML != null && snapshot.homeML != null) {
            const prevAmerican = decimalToAmerican(prev.homeML);
            const newAmerican = decimalToAmerican(snapshot.homeML);
            const move = Math.abs(newAmerican - prevAmerican);
            if (move >= 30) {
              const signal: SharpSignal = {
                gameId,
                sport,
                homeTeam,
                awayTeam,
                market: "moneyline",
                oldLine: prevAmerican,
                newLine: newAmerican,
                movement: move,
                direction: newAmerican > prevAmerican ? "up" : "down",
                detectedAt: new Date().toISOString(),
                bookmaker: mlLine.bookmaker,
              };
              signals.push(signal);
            }
          }
        }

        lineHistory.set(gameId, snapshot);
      }

      await new Promise(r => setTimeout(r, 250));
    } catch (e: any) {
      logWarn(`[SharpSignal] ${sport} detection failed: ${e.message}`);
    }
  }

  engineStatus.gamesMonitored = totalGames;

  for (const signal of signals) {
    engineStatus.totalSignalsDetected++;
    engineStatus.recentSignals.unshift(signal);
    if (engineStatus.recentSignals.length > 100) engineStatus.recentSignals.length = 100;

    broadcastEvent("sharp-signal", {
      gameId: signal.gameId,
      sport: signal.sport,
      homeTeam: signal.homeTeam,
      awayTeam: signal.awayTeam,
      market: signal.market,
      movement: signal.movement,
      direction: signal.direction,
      detectedAt: signal.detectedAt,
    });

    // Route through Sors Orchestrator for companion_alert routing
    const isSteam = Math.abs(signal.movement || 0) >= 3;
    orchestratorEmit({
      sourceAgent: "sharp_detector",
      category: isSteam ? "steam_move" : "sharp_money",
      severity: "info",
      title: isSteam
        ? `Steam move on ${signal.homeTeam} vs ${signal.awayTeam} — ${signal.market} moved ${signal.movement > 0 ? "+" : ""}${signal.movement}`
        : `Sharp money on ${signal.homeTeam} vs ${signal.awayTeam} — ${signal.market} ${signal.direction}`,
      detail: `${signal.sport}: ${signal.homeTeam} vs ${signal.awayTeam}. ${signal.market} moved ${signal.movement > 0 ? "+" : ""}${signal.movement} pts ${signal.direction}.`,
    }).catch(() => {});

    await flagPicksAsSharpSignal(signal);
  }

  engineStatus.totalCLVCaptures += clvCaptures.length;

  if (signals.length > 0) {
    logInfo(`[SharpSignal] Detected ${signals.length} sharp signal(s) across ${totalGames} games`);
  }
}

async function captureClosingLine(
  gameId: string,
  homeTeam: string,
  awayTeam: string,
  sport: string,
  snapshot: LineSnapshot,
  spreadBM: string,
  totalBM: string,
): Promise<void> {
  try {
    const unsettled = await db.execute(sql`
      SELECT id, pick, bet_type, odds_at_pick
      FROM user_picks
      WHERE settled = false
      AND closing_line_captured_at IS NULL
      AND (game_id = ${gameId}
        OR lower(pick) LIKE ${"%" + homeTeam.toLowerCase().slice(0, 8) + "%"}
        OR lower(pick) LIKE ${"%" + awayTeam.toLowerCase().slice(0, 8) + "%"})
      LIMIT 100
    `);
    const picks = unsettled.rows as any[];
    if (picks.length === 0) return;

    for (const pick of picks) {
      const betType = (pick.bet_type || "moneyline").toLowerCase();
      let closingLine: number | null = null;

      if (betType.includes("spread") && snapshot.spread != null) {
        closingLine = snapshot.spread;
      } else if ((betType.includes("total") || betType.includes("over")) && snapshot.total != null) {
        closingLine = snapshot.total;
      } else if ((betType.includes("moneyline") || betType === "h2h") && snapshot.homeML != null) {
        const pickLow = (pick.pick || "").toLowerCase();
        const picksHome = pickLow.includes(homeTeam.toLowerCase().split(" ").pop()!);
        closingLine = picksHome ? decimalToAmerican(snapshot.homeML) : (snapshot.homeML ? decimalToAmerican(1 / (1 - 1 / snapshot.homeML)) : null);
      }

      if (closingLine === null) continue;

      const clv = pick.odds_at_pick != null ? (pick.odds_at_pick - closingLine) : null;

      await db.execute(sql`
        UPDATE user_picks
        SET closing_odds = ${closingLine},
            clv_result = ${clv},
            closing_line_captured_at = NOW()
        WHERE id = ${pick.id}
          AND closing_line_captured_at IS NULL
      `);
    }

    if (picks.length > 0) {
      logInfo(`[SharpSignal] CLV captured for ${picks.length} picks on ${homeTeam} vs ${awayTeam} (${sport})`);
    }
  } catch (e: any) {
    logWarn(`[SharpSignal] CLV capture failed for game ${gameId}: ${e.message}`);
  }
}

async function flagPicksAsSharpSignal(signal: SharpSignal): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE user_picks
      SET sharp_signal = true
      WHERE settled = false
      AND (game_id = ${signal.gameId}
        OR lower(pick) LIKE ${"%" + signal.homeTeam.toLowerCase().slice(0, 8) + "%"}
        OR lower(pick) LIKE ${"%" + signal.awayTeam.toLowerCase().slice(0, 8) + "%"})
    `);
  } catch (_) {}
}

export function startSharpSignalDetector(): void {
  if (engineStatus.isRunning) return;
  engineStatus.isRunning = true;

  detectorInterval = setInterval(async () => {
    await runDetectionCycle().catch(e => logWarn(`[SharpSignal] Cycle error: ${e.message}`));
  }, 60_000);

  setTimeout(() => runDetectionCycle().catch(() => {}), 8_000);

  logInfo("[SharpSignal] Sharp Signal Detector started — monitoring line movement every 60s + CLV auto-capture on game start");
}

export function stopSharpSignalDetector(): void {
  if (detectorInterval) clearInterval(detectorInterval);
  detectorInterval = null;
  engineStatus.isRunning = false;
}

export function getSharpSignalStatus(): SharpSignalStatus {
  return { ...engineStatus, recentSignals: [...engineStatus.recentSignals.slice(0, 20)] };
}

export function getRecentSharpSignals(limit = 20): SharpSignal[] {
  return engineStatus.recentSignals.slice(0, limit);
}

export async function triggerSharpDetectionNow(): Promise<{ signalsFound: number }> {
  const before = engineStatus.totalSignalsDetected;
  await runDetectionCycle();
  return { signalsFound: engineStatus.totalSignalsDetected - before };
}
