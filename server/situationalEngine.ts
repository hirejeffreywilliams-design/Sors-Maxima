import type { Sport } from "@shared/schema";
import type { ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface SituationalFactors {
  homeRestDays: number;
  awayRestDays: number;
  homeB2B: boolean;
  awayB2B: boolean;
  spotType: "letdown" | "look-ahead" | "trap" | "revenge" | "normal";
  spotDescription: string;
}

function getTeamRecentGames(
  teamName: string,
  teamAbbr: string,
  allGames: ESPNScoreboardGame[],
  beforeDate: Date,
): ESPNScoreboardGame[] {
  return allGames
    .filter((g) => {
      if (g.status?.state !== "post") return false;
      const gameDate = new Date(g.date);
      if (gameDate >= beforeDate) return false;
      const homeName = g.homeTeam?.displayName || "";
      const awayName = g.awayTeam?.displayName || "";
      const homeAbbr = g.homeTeam?.abbreviation || "";
      const awayAbbr = g.awayTeam?.abbreviation || "";
      return (
        homeName === teamName ||
        awayName === teamName ||
        homeAbbr === teamAbbr ||
        awayAbbr === teamAbbr
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function calcRestDays(
  teamName: string,
  teamAbbr: string,
  allGames: ESPNScoreboardGame[],
  gameDate: Date,
): number {
  const recent = getTeamRecentGames(teamName, teamAbbr, allGames, gameDate);
  if (recent.length === 0) return 3;
  const lastGameDate = new Date(recent[0].date);
  const diffMs = gameDate.getTime() - lastGameDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function isB2B(
  sport: Sport,
  teamName: string,
  teamAbbr: string,
  allGames: ESPNScoreboardGame[],
  gameDate: Date,
): boolean {
  if (sport !== "NBA" && sport !== "NHL") return false;
  const restDays = calcRestDays(teamName, teamAbbr, allGames, gameDate);
  return restDays <= 1;
}

function getTeamSide(
  game: ESPNScoreboardGame,
  teamName: string,
  teamAbbr: string,
): "home" | "away" | null {
  if (
    game.homeTeam?.displayName === teamName ||
    game.homeTeam?.abbreviation === teamAbbr
  )
    return "home";
  if (
    game.awayTeam?.displayName === teamName ||
    game.awayTeam?.abbreviation === teamAbbr
  )
    return "away";
  return null;
}

function didTeamWin(
  game: ESPNScoreboardGame,
  side: "home" | "away",
): boolean {
  if (side === "home") return game.homeTeam.score > game.awayTeam.score;
  return game.awayTeam.score > game.homeTeam.score;
}

function getOpponentName(
  game: ESPNScoreboardGame,
  side: "home" | "away",
): string {
  return side === "home"
    ? game.awayTeam?.displayName || ""
    : game.homeTeam?.displayName || "";
}

function parseWinPct(record: string): number {
  if (!record) return 0.5;
  const parts = record.split("-");
  const wins = parseFloat(parts[0]);
  const losses = parseFloat(parts[1]);
  return wins + losses > 0 ? wins / (wins + losses) : 0.5;
}

function getOpponentWinPct(
  game: ESPNScoreboardGame,
  side: "home" | "away",
): number {
  const oppRecord =
    side === "home"
      ? game.awayTeam?.record || ""
      : game.homeTeam?.record || "";
  return parseWinPct(oppRecord);
}

function getUpcomingGames(
  teamName: string,
  teamAbbr: string,
  allGames: ESPNScoreboardGame[],
  afterDate: Date,
): ESPNScoreboardGame[] {
  return allGames
    .filter((g) => {
      if (g.status?.state !== "pre") return false;
      const gameDate = new Date(g.date);
      if (gameDate <= afterDate) return false;
      const homeName = g.homeTeam?.displayName || "";
      const awayName = g.awayTeam?.displayName || "";
      const homeAbbr = g.homeTeam?.abbreviation || "";
      const awayAbbr = g.awayTeam?.abbreviation || "";
      return (
        homeName === teamName ||
        awayName === teamName ||
        homeAbbr === teamAbbr ||
        awayAbbr === teamAbbr
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function classifySpot(
  sport: Sport,
  game: ESPNScoreboardGame,
  allGames: ESPNScoreboardGame[],
): { spotType: SituationalFactors["spotType"]; spotDescription: string } {
  const gameDate = new Date(game.date);
  const homeName = game.homeTeam?.displayName || "";
  const awayName = game.awayTeam?.displayName || "";
  const homeAbbr = game.homeTeam?.abbreviation || "";
  const awayAbbr = game.awayTeam?.abbreviation || "";
  const homeWinPct = parseWinPct(game.homeTeam?.record || "");
  const awayWinPct = parseWinPct(game.awayTeam?.record || "");

  const homeRecent = getTeamRecentGames(homeName, homeAbbr, allGames, gameDate);
  const awayRecent = getTeamRecentGames(awayName, awayAbbr, allGames, gameDate);

  for (const recent of homeRecent.slice(0, 3)) {
    const side = getTeamSide(recent, homeName, homeAbbr);
    if (side && !didTeamWin(recent, side)) {
      const oppName = getOpponentName(recent, side);
      if (
        oppName.toLowerCase() === awayName.toLowerCase() ||
        oppName.toLowerCase() === awayAbbr.toLowerCase()
      ) {
        return {
          spotType: "revenge",
          spotDescription: `${homeName} revenge spot — lost to ${awayName} recently`,
        };
      }
    }
  }

  for (const recent of awayRecent.slice(0, 3)) {
    const side = getTeamSide(recent, awayName, awayAbbr);
    if (side && !didTeamWin(recent, side)) {
      const oppName = getOpponentName(recent, side);
      if (
        oppName.toLowerCase() === homeName.toLowerCase() ||
        oppName.toLowerCase() === homeAbbr.toLowerCase()
      ) {
        return {
          spotType: "revenge",
          spotDescription: `${awayName} revenge spot — lost to ${homeName} recently`,
        };
      }
    }
  }

  if (homeRecent.length > 0) {
    const lastGame = homeRecent[0];
    const side = getTeamSide(lastGame, homeName, homeAbbr);
    if (side && didTeamWin(lastGame, side)) {
      const oppWinPct = getOpponentWinPct(lastGame, side);
      if (oppWinPct >= 0.6 && awayWinPct < 0.45) {
        return {
          spotType: "letdown",
          spotDescription: `${homeName} letdown spot — big win over strong opponent, now facing weaker ${awayName}`,
        };
      }
    }
  }

  if (awayRecent.length > 0) {
    const lastGame = awayRecent[0];
    const side = getTeamSide(lastGame, awayName, awayAbbr);
    if (side && didTeamWin(lastGame, side)) {
      const oppWinPct = getOpponentWinPct(lastGame, side);
      if (oppWinPct >= 0.6 && homeWinPct < 0.45) {
        return {
          spotType: "letdown",
          spotDescription: `${awayName} letdown spot — big win over strong opponent, now facing weaker ${homeName}`,
        };
      }
    }
  }

  const homeUpcoming = getUpcomingGames(
    homeName,
    homeAbbr,
    allGames,
    gameDate,
  );
  if (homeUpcoming.length > 0) {
    const nextGame = homeUpcoming[0];
    const nextSide = getTeamSide(nextGame, homeName, homeAbbr);
    if (nextSide) {
      const nextOppWinPct = getOpponentWinPct(nextGame, nextSide);
      if (nextOppWinPct >= 0.6 && awayWinPct < 0.5) {
        const nextOppName = getOpponentName(nextGame, nextSide);
        return {
          spotType: "look-ahead",
          spotDescription: `${homeName} look-ahead spot — big matchup vs ${nextOppName} coming up next`,
        };
      }
    }
  }

  const awayUpcoming = getUpcomingGames(
    awayName,
    awayAbbr,
    allGames,
    gameDate,
  );
  if (awayUpcoming.length > 0) {
    const nextGame = awayUpcoming[0];
    const nextSide = getTeamSide(nextGame, awayName, awayAbbr);
    if (nextSide) {
      const nextOppWinPct = getOpponentWinPct(nextGame, nextSide);
      if (nextOppWinPct >= 0.6 && homeWinPct < 0.5) {
        const nextOppName = getOpponentName(nextGame, nextSide);
        return {
          spotType: "look-ahead",
          spotDescription: `${awayName} look-ahead spot — big matchup vs ${nextOppName} coming up next`,
        };
      }
    }
  }

  if (homeWinPct >= 0.6 && awayWinPct < 0.4) {
    return {
      spotType: "trap",
      spotDescription: `Trap game for ${homeName} — heavy favorite in a nondescript matchup vs ${awayName}`,
    };
  }
  if (awayWinPct >= 0.6 && homeWinPct < 0.4) {
    return {
      spotType: "trap",
      spotDescription: `Trap game for ${awayName} — heavy favorite in a nondescript matchup vs ${homeName}`,
    };
  }

  return { spotType: "normal", spotDescription: "Standard game — no notable situational factors" };
}

export function getGameSituationalFactors(
  sport: Sport,
  game: ESPNScoreboardGame,
  allGames: ESPNScoreboardGame[],
): SituationalFactors {
  const gameDate = new Date(game.date);
  const homeName = game.homeTeam?.displayName || "";
  const awayName = game.awayTeam?.displayName || "";
  const homeAbbr = game.homeTeam?.abbreviation || "";
  const awayAbbr = game.awayTeam?.abbreviation || "";

  const homeRestDays = calcRestDays(homeName, homeAbbr, allGames, gameDate);
  const awayRestDays = calcRestDays(awayName, awayAbbr, allGames, gameDate);
  const homeB2B = isB2B(sport, homeName, homeAbbr, allGames, gameDate);
  const awayB2B = isB2B(sport, awayName, awayAbbr, allGames, gameDate);
  const { spotType, spotDescription } = classifySpot(sport, game, allGames);

  return {
    homeRestDays,
    awayRestDays,
    homeB2B,
    awayB2B,
    spotType,
    spotDescription,
  };
}
