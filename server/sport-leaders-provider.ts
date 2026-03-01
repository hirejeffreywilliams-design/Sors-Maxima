/**
 * Sport Leaders Provider
 *
 * Fetches ESPN season leader data and converts season totals to per-game averages
 * for use in player prop generation. Season-aware: automatically enables/disables
 * per sport based on the calendar. NFL player props are disabled in offseason
 * and automatically re-activate when the preseason starts in August.
 */

import { isSportInSeason } from "./sportSeasons";
import { logInfo, logWarn } from "./errorLogger";
import type { ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface SportPropLeader {
  playerName: string;
  playerId: string;
  team: string;
  category: string;
  perGameAvg: number;
  seasonTotal: number;
  estimatedGamesPlayed: number;
  position: string;
  sport: string;
}

export interface SportPropCategory {
  category: string;
  avgLine: number;
  leaderKey: string;
  position?: string;
  betTypeKey: string;
  minEdgeForPick: number;
  isSeasonTotal: boolean;
}

const SPORT_PROP_CATEGORIES: Record<string, SportPropCategory[]> = {
  NBA: [
    { category: "Points", avgLine: 22.5, leaderKey: "Points", betTypeKey: "player_points", minEdgeForPick: 0.5, isSeasonTotal: false },
    { category: "Rebounds", avgLine: 8.5, leaderKey: "Rebounds", betTypeKey: "player_rebounds", minEdgeForPick: 0.3, isSeasonTotal: false },
    { category: "Assists", avgLine: 6.5, leaderKey: "Assists", betTypeKey: "player_assists", minEdgeForPick: 0.3, isSeasonTotal: false },
    { category: "Steals", avgLine: 1.5, leaderKey: "Steals", betTypeKey: "player_steals", minEdgeForPick: 0.1, isSeasonTotal: false },
    { category: "Blocks", avgLine: 1.5, leaderKey: "Blocks", betTypeKey: "player_blocks", minEdgeForPick: 0.1, isSeasonTotal: false },
    { category: "Threes", avgLine: 2.5, leaderKey: "3-Pointers Made", betTypeKey: "player_threes", minEdgeForPick: 0.2, isSeasonTotal: false },
  ],
  NFL: [
    { category: "Passing Yards", avgLine: 237.5, leaderKey: "Passing Yards", position: "QB", betTypeKey: "player_passing_yards", minEdgeForPick: 8, isSeasonTotal: true },
    { category: "Rushing Yards", avgLine: 67.5, leaderKey: "Rushing Yards", position: "RB", betTypeKey: "player_rushing_yards", minEdgeForPick: 4, isSeasonTotal: true },
    { category: "Receiving Yards", avgLine: 57.5, leaderKey: "Receiving Yards", position: "WR", betTypeKey: "player_receiving_yards", minEdgeForPick: 4, isSeasonTotal: true },
    { category: "Passing TDs", avgLine: 1.5, leaderKey: "Passing TDs", position: "QB", betTypeKey: "player_passing_tds", minEdgeForPick: 0.15, isSeasonTotal: true },
    { category: "Rushing TDs", avgLine: 0.5, leaderKey: "Rushing TDs", position: "RB", betTypeKey: "player_rushing_tds", minEdgeForPick: 0.08, isSeasonTotal: true },
    { category: "Receptions", avgLine: 5.5, leaderKey: "Receptions", position: "WR", betTypeKey: "player_receptions", minEdgeForPick: 0.4, isSeasonTotal: true },
    { category: "Pass Completions", avgLine: 22.5, leaderKey: "Completions", position: "QB", betTypeKey: "player_pass_completions", minEdgeForPick: 1.5, isSeasonTotal: true },
  ],
  NHL: [
    { category: "Goals", avgLine: 0.5, leaderKey: "Goals", betTypeKey: "player_goals", minEdgeForPick: 0.04, isSeasonTotal: true },
    { category: "Assists", avgLine: 0.5, leaderKey: "Assists", betTypeKey: "player_assists_nhl", minEdgeForPick: 0.04, isSeasonTotal: true },
    { category: "Points", avgLine: 0.5, leaderKey: "Points", betTypeKey: "player_points_nhl", minEdgeForPick: 0.06, isSeasonTotal: true },
    { category: "Shots on Goal", avgLine: 3.5, leaderKey: "Shots on Goal", betTypeKey: "player_shots_on_goal", minEdgeForPick: 0.25, isSeasonTotal: true },
  ],
  MLB: [
    { category: "Strikeouts", avgLine: 5.5, leaderKey: "Strikeouts", position: "P", betTypeKey: "player_strikeouts", minEdgeForPick: 0.3, isSeasonTotal: true },
    { category: "Hits", avgLine: 0.5, leaderKey: "Hits", betTypeKey: "player_hits", minEdgeForPick: 0.04, isSeasonTotal: true },
    { category: "RBIs", avgLine: 0.5, leaderKey: "RBI", betTypeKey: "player_rbis", minEdgeForPick: 0.04, isSeasonTotal: true },
    { category: "Home Runs", avgLine: 0.5, leaderKey: "Home Runs", betTypeKey: "player_home_runs", minEdgeForPick: 0.03, isSeasonTotal: true },
  ],
  NCAAB: [
    { category: "Points", avgLine: 18.5, leaderKey: "Points", betTypeKey: "player_points_ncaab", minEdgeForPick: 0.5, isSeasonTotal: false },
    { category: "Rebounds", avgLine: 7.5, leaderKey: "Rebounds", betTypeKey: "player_rebounds_ncaab", minEdgeForPick: 0.3, isSeasonTotal: false },
    { category: "Assists", avgLine: 4.5, leaderKey: "Assists", betTypeKey: "player_assists_ncaab", minEdgeForPick: 0.2, isSeasonTotal: false },
  ],
  NCAAF: [
    { category: "Passing Yards", avgLine: 257.5, leaderKey: "Passing Yards", position: "QB", betTypeKey: "player_passing_yards_ncaaf", minEdgeForPick: 10 },
    { category: "Rushing Yards", avgLine: 87.5, leaderKey: "Rushing Yards", position: "RB", betTypeKey: "player_rushing_yards_ncaaf", minEdgeForPick: 6 },
    { category: "Receiving Yards", avgLine: 57.5, leaderKey: "Receiving Yards", position: "WR", betTypeKey: "player_receiving_yards_ncaaf", minEdgeForPick: 5 },
  ],
};

const SEASON_PACE_CONFIG: Record<string, {
  seasonStartMonth: number;
  seasonStartDay: number;
  crossesYearEnd: boolean;
  totalGames: number;
  seasonDays: number;
  gamesPerTeamPerDay: number;
}> = {
  NFL: {
    seasonStartMonth: 9,
    seasonStartDay: 5,
    crossesYearEnd: true,
    totalGames: 17,
    seasonDays: 140,
    gamesPerTeamPerDay: 17 / 140,
  },
  MLB: {
    seasonStartMonth: 4,
    seasonStartDay: 1,
    crossesYearEnd: false,
    totalGames: 162,
    seasonDays: 182,
    gamesPerTeamPerDay: 162 / 182,
  },
  NHL: {
    seasonStartMonth: 10,
    seasonStartDay: 5,
    crossesYearEnd: true,
    totalGames: 82,
    seasonDays: 210,
    gamesPerTeamPerDay: 82 / 210,
  },
  NBA: {
    seasonStartMonth: 10,
    seasonStartDay: 20,
    crossesYearEnd: true,
    totalGames: 82,
    seasonDays: 185,
    gamesPerTeamPerDay: 82 / 185,
  },
  NCAAB: {
    seasonStartMonth: 11,
    seasonStartDay: 5,
    crossesYearEnd: true,
    totalGames: 30,
    seasonDays: 150,
    gamesPerTeamPerDay: 30 / 150,
  },
  NCAAF: {
    seasonStartMonth: 8,
    seasonStartDay: 26,
    crossesYearEnd: false,
    totalGames: 13,
    seasonDays: 110,
    gamesPerTeamPerDay: 13 / 110,
  },
};

function estimateGamesPlayed(sport: string, date: Date = new Date()): number {
  const cfg = SEASON_PACE_CONFIG[sport];
  if (!cfg) return 15;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  let seasonStart: Date;
  if (cfg.crossesYearEnd && month <= 6) {
    seasonStart = new Date(year - 1, cfg.seasonStartMonth - 1, cfg.seasonStartDay);
  } else {
    seasonStart = new Date(year, cfg.seasonStartMonth - 1, cfg.seasonStartDay);
  }

  const daysSinceStart = Math.max(0, (date.getTime() - seasonStart.getTime()) / 86400000);
  const estimated = Math.round(cfg.gamesPerTeamPerDay * daysSinceStart);
  return Math.min(cfg.totalGames, Math.max(1, estimated));
}

const leaderCache = new Map<string, { data: SportPropLeader[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export function getSportPropCategories(sport: string): SportPropCategory[] {
  return SPORT_PROP_CATEGORIES[sport] || [];
}

export function isSportPropsEnabled(sport: string): boolean {
  const inSeason = isSportInSeason(sport as any);
  if (!inSeason) {
    logInfo(`[SportLeaders] ${sport} is in offseason — player props disabled until next season`);
  }
  return inSeason;
}

function getSeasonStartNote(sport: string): string {
  const notes: Record<string, string> = {
    NFL: "NFL preseason starts in August. Player props will auto-activate at that time.",
    MLB: "MLB season starts in April. Player props will auto-activate at that time.",
    NHL: "NHL season starts in October. Player props will auto-activate at that time.",
    NBA: "NBA season starts in October. Player props will auto-activate at that time.",
    NCAAB: "NCAAB season starts in November. Player props will auto-activate at that time.",
    NCAAF: "NCAAF season starts in August. Player props will auto-activate at that time.",
  };
  return notes[sport] || `${sport} season is currently inactive.`;
}

export function enrichLeadersWithPerGameStats(
  rawLeaders: ESPNScoreboardGame["leaders"],
  sport: string,
  date: Date = new Date()
): SportPropLeader[] {
  if (!rawLeaders || rawLeaders.length === 0) return [];

  const gamesPlayed = estimateGamesPlayed(sport, date);
  const propCats = SPORT_PROP_CATEGORIES[sport] || [];

  const result: SportPropLeader[] = [];

  for (const leader of rawLeaders) {
    const matchingCat = propCats.find(c =>
      c.leaderKey.toLowerCase() === leader.category.toLowerCase() ||
      leader.category.toLowerCase().includes(c.leaderKey.toLowerCase().replace(" per game", "")) ||
      c.category.toLowerCase() === leader.category.toLowerCase()
    );
    if (!matchingCat) continue;

    const seasonTotal = parseFloat(leader.value) || 0;
    if (seasonTotal <= 0) continue;

    let perGameAvg: number;

    const isAlreadyPerGame = (
      !matchingCat.isSeasonTotal ||
      leader.category.toLowerCase().includes("per game") ||
      leader.category.toLowerCase().includes("average") ||
      leader.category.toLowerCase().includes("avg")
    );

    if (isAlreadyPerGame) {
      perGameAvg = seasonTotal;
    } else {
      perGameAvg = seasonTotal / Math.max(1, gamesPlayed);
    }

    perGameAvg = Math.round(perGameAvg * 100) / 100;

    result.push({
      playerName: leader.playerName,
      playerId: `${sport}-${leader.playerName.replace(/\s+/g, "-").toLowerCase()}`,
      team: (leader as any).team || "",
      category: matchingCat.category,
      perGameAvg,
      seasonTotal,
      estimatedGamesPlayed: gamesPlayed,
      position: matchingCat.position || "Unknown",
      sport,
    });
  }

  return result;
}

export function getSportLeaderForProp(
  enrichedLeaders: SportPropLeader[],
  propCategory: SportPropCategory
): SportPropLeader | null {
  return enrichedLeaders.find(l =>
    l.category.toLowerCase() === propCategory.category.toLowerCase()
  ) || null;
}

export function getPropLineForLeader(
  leader: SportPropLeader,
  propCategory: SportPropCategory
): number {
  const perGame = leader.perGameAvg;
  if (perGame <= 0) return propCategory.avgLine;

  const rounded = Math.round(perGame * 2) / 2;

  if (rounded < propCategory.avgLine * 0.3 || rounded > propCategory.avgLine * 3) {
    return propCategory.avgLine;
  }

  return rounded;
}

export function logSeasonStatus(sport: string): void {
  if (isSportInSeason(sport as any)) {
    const gamesPlayed = estimateGamesPlayed(sport);
    const cfg = SEASON_PACE_CONFIG[sport];
    const remaining = cfg ? cfg.totalGames - gamesPlayed : 0;
    logInfo(`[SportLeaders] ${sport} in season — est. ${gamesPlayed}/${cfg?.totalGames || '?'} games played, ${remaining} remaining`);
  } else {
    logInfo(`[SportLeaders] ${sport} offseason — ${getSeasonStartNote(sport)}`);
  }
}
