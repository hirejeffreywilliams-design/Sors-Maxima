/**
 * Game Window Scheduler
 *
 * Determines whether a "game window" is currently active based on live and
 * scheduled game data already cached by LiveSportsDataService.
 *
 * A game window is ACTIVE when:
 *   • Any game is currently in progress, OR
 *   • Any game starts within the next 90 minutes (pre-game warm-up), OR
 *   • Any game ended within the last 60 minutes (post-game settlement window)
 *
 * Engines that call The Odds API (SharpSignalDetector, MarketSnapshot) check
 * this before making network requests, skipping them when the window is idle
 * and saving significant API quota during overnight / off-season hours.
 *
 * ESPN data (free, no key) continues polling at its normal rate so we always
 * have fresh schedule data to compute window state.
 */

import { liveSportsData } from "./live-sports-data";

const WAKEUP_BEFORE_MS  = 90 * 60 * 1000;  // 90 min before game start
const COOLDOWN_AFTER_MS = 60 * 60 * 1000;  // 60 min after estimated game end
const EST_GAME_DURATION = 3  * 60 * 60 * 1000; // 3-hour game estimate

export interface GameWindowInfo {
  active: boolean;
  reason: string;
  liveGames: number;
  upcomingSoonGames: number;
  nextWindowStartMs: number | null;
  estimatedSavingsPercent: number;
}

export function getGameWindowInfo(): GameWindowInfo {
  const games = liveSportsData.getLiveGames();
  const now = Date.now();

  const live = games.filter(g => g.status === "in_progress");
  if (live.length > 0) {
    return {
      active: true,
      reason: `${live.length} game${live.length > 1 ? "s" : ""} in progress`,
      liveGames: live.length,
      upcomingSoonGames: 0,
      nextWindowStartMs: null,
      estimatedSavingsPercent: 0,
    };
  }

  const soon = games.filter(g => {
    if (g.status !== "scheduled") return false;
    const ms = g.startTime.getTime() - now;
    return ms > 0 && ms < WAKEUP_BEFORE_MS;
  });
  if (soon.length > 0) {
    return {
      active: true,
      reason: `Pre-game: ${soon.length} game${soon.length > 1 ? "s" : ""} starting within 90 min`,
      liveGames: 0,
      upcomingSoonGames: soon.length,
      nextWindowStartMs: null,
      estimatedSavingsPercent: 0,
    };
  }

  const recentlyEnded = games.filter(g => {
    if (g.status !== "final") return false;
    const est = g.startTime.getTime() + EST_GAME_DURATION;
    return now - est < COOLDOWN_AFTER_MS;
  });
  if (recentlyEnded.length > 0) {
    return {
      active: true,
      reason: `Post-game: ${recentlyEnded.length} game${recentlyEnded.length > 1 ? "s" : ""} recently ended (settlement window)`,
      liveGames: 0,
      upcomingSoonGames: 0,
      nextWindowStartMs: null,
      estimatedSavingsPercent: 0,
    };
  }

  const upcoming = games
    .filter(g => g.status === "scheduled" && g.startTime.getTime() > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  if (upcoming.length === 0) {
    return {
      active: false,
      reason: "No games scheduled — engines idle until schedule refreshes",
      liveGames: 0,
      upcomingSoonGames: 0,
      nextWindowStartMs: 4 * 60 * 60 * 1000,
      estimatedSavingsPercent: 100,
    };
  }

  const nextStart     = upcoming[0].startTime.getTime();
  const nextWindowMs  = Math.max(0, nextStart - WAKEUP_BEFORE_MS - now);
  const hoursUntil    = nextWindowMs / (60 * 60 * 1000);

  const hoursInDay    = 24;
  const activeHoursEst = upcoming.reduce((sum, g) => {
    return sum + (EST_GAME_DURATION + WAKEUP_BEFORE_MS + COOLDOWN_AFTER_MS) / (60 * 60 * 1000);
  }, 0);
  const savings = Math.max(0, Math.min(100, Math.round(
    ((hoursInDay - Math.min(activeHoursEst, hoursInDay)) / hoursInDay) * 100
  )));

  return {
    active: false,
    reason: `Idle — next window in ${hoursUntil < 1 ? `${Math.round(hoursUntil * 60)}m` : `${hoursUntil.toFixed(1)}h`} (${upcoming[0].homeTeam} vs ${upcoming[0].awayTeam})`,
    liveGames: 0,
    upcomingSoonGames: upcoming.length,
    nextWindowStartMs: nextWindowMs,
    estimatedSavingsPercent: savings,
  };
}

export function isGameWindowActive(): boolean {
  return getGameWindowInfo().active;
}

export function msUntilNextGameWindow(): number {
  const info = getGameWindowInfo();
  if (info.active) return 0;
  return info.nextWindowStartMs ?? 4 * 60 * 60 * 1000;
}
