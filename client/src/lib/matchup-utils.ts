/**
 * Shared utilities for displaying game matchups and team names consistently.
 * Full names are always the primary label; abbreviations are secondary/compact.
 */

export interface TeamInfo {
  name: string;
  abbreviation?: string;
  abbr?: string;
  record?: string;
  score?: number;
}

export interface GameInfo {
  sport?: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  status?: { state?: string; detail?: string; period?: number; clock?: string };
  periodLabel?: string;
  clock?: string;
}

/** Returns the abbreviation from either field name */
export function teamAbbr(team: TeamInfo): string {
  return team.abbreviation || team.abbr || team.name;
}

/** Returns the full name with fallback to abbreviation */
export function teamFullName(team: TeamInfo): string {
  return team.name || team.abbreviation || team.abbr || "";
}

/**
 * Formats a game as a full matchup string: "Away Team vs Home Team — SPORT, Period"
 * Always uses full team names as the primary label.
 */
export function formatMatchup(game: GameInfo, opts?: { includePeriod?: boolean }): string {
  const away = teamFullName(game.awayTeam);
  const home = teamFullName(game.homeTeam);
  let str = `${away} vs ${home}`;

  const parts: string[] = [];
  if (game.sport) parts.push(game.sport);

  const period = game.periodLabel || game.status?.detail;
  if (opts?.includePeriod !== false && period) parts.push(period);

  if (parts.length > 0) str += ` — ${parts.join(", ")}`;
  return str;
}

/**
 * Formats a compact matchup for tight spaces: "AWAY @ HOME"
 * Uses abbreviations for compactness.
 */
export function formatMatchupCompact(game: GameInfo): string {
  const away = teamAbbr(game.awayTeam);
  const home = teamAbbr(game.homeTeam);
  return `${away} @ ${home}`;
}

/**
 * Returns the "short" display name for a team — the last word if abbreviation isn't available,
 * but prefers using abbreviation + city context. For use ONLY in ultra-compact situations.
 * Prefer teamFullName() for all other cases.
 */
export function teamShortName(team: TeamInfo): string {
  if (team.abbreviation || team.abbr) return team.abbreviation || team.abbr || "";
  const words = (team.name || "").split(" ");
  return words[words.length - 1] || team.name || "";
}
