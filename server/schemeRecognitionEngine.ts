import type { Sport } from "@shared/schema";
import { getScoreboard, getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { getTeamsFromCache, getRosterFromCacheById, type ESPNTeam, type ESPNCoach, type ESPNPlayer } from "./espn-roster-provider";
import { fetchRealOddsForGame } from "./odds-provider";
import { isBDLAvailable, getEnrichedTeamData, type BDLEnrichedTeamData } from "./balldontlie-provider";

export interface TeamSchemeData {
  teamName: string;
  teamId: string;
  sport: string;
  record: string;
  offensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    keyPlays: string[];
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  defensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    formation: string;
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  situationalPatterns: {
    homeAdvantage: number;
    awayPerformance: number;
    primetime: number;
    underdog: number;
    favorite: number;
  };
  dataSource: string;
}

export interface CoachProfileData {
  name: string;
  team: string;
  teamId: string;
  sport: string;
  experience: number;
  tendencies: {
    riskTolerance: "high" | "medium" | "low";
    fourthDownAggression?: number;
    tempoPreference: "fast" | "moderate" | "slow";
    adjustmentRating: number;
    clutchDecisions: number;
  };
  historicalPatterns: {
    vsSpread: number;
    overUnderTrend: "over" | "under" | "balanced";
    rivalryBoost: number;
    restAdvantage: number;
  };
  recentForm: {
    lastFive: string;
    coverRate: number;
    trend: "hot" | "cold" | "neutral";
  };
  dataSource: string;
}

export interface SchemeAlertData {
  id: string;
  type: "advantage" | "warning" | "neutral";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  affectedLegs: string[];
  confidence: number;
  dataSource: string;
}

export interface MatchupAnalysisData {
  matchup: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  gameTime: string;
  venue?: string;
  broadcast?: string;
  schemeAdvantage: "home" | "away" | "even";
  keyFactors: string[];
  predictionImpact: number;
  alerts: SchemeAlertData[];
  odds?: {
    spread?: string;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  };
  dataSource: string;
}

export interface SchemeAnalysisResponse {
  teamSchemes: TeamSchemeData[];
  coachProfiles: CoachProfileData[];
  alerts: SchemeAlertData[];
  matchupAnalysis: MatchupAnalysisData[];
  meta: {
    sport: string;
    gamesAnalyzed: number;
    teamsAnalyzed: number;
    generatedAt: string;
    dataSources: string[];
  };
}

function parseRecord(record: string): { wins: number; losses: number; pct: number } {
  const parts = record.split("-").map(s => parseInt(s.trim(), 10));
  const wins = parts[0] || 0;
  const losses = parts[1] || 0;
  const total = wins + losses;
  return { wins, losses, pct: total > 0 ? wins / total : 0.5 };
}

interface SchemeStats {
  pace?: number;
  offRating?: number;
  defRating?: number;
  avgPts?: number;
  avgAst?: number;
  fg3Pct?: number;
  last10Wins?: number;
  homeWinPct?: number;
  awayWinPct?: number;
  streak?: number;
  streakType?: string;
}

function getOffensiveScheme(sport: string, winPct: number, _rosterSize: number, stats?: SchemeStats): TeamSchemeData["offensiveScheme"] {
  let name: string;
  let keyPlays: string[];

  if (sport === "NBA" && stats) {
    const pace = stats.pace ?? 98;
    const avgAst = stats.avgAst ?? 25;
    const fg3Pct = stats.fg3Pct ?? 0.35;
    const avgPts = stats.avgPts ?? 110;

    const astRatio = avgPts > 0 ? avgAst / avgPts : 0.23;

    if (pace >= 101 && astRatio >= 0.24) {
      name = "Motion Offense"; keyPlays = ["Ball Movement", "High-Volume 3PT", "Pick and Roll", "Drive and Kick"];
    } else if (pace >= 101 && astRatio < 0.24) {
      name = "Fast Break Tempo"; keyPlays = ["Transition Scoring", "Push Pace", "Early Offense", "Leak-Outs"];
    } else if (fg3Pct >= 0.375 && pace >= 98) {
      name = "Spread Pick and Roll"; keyPlays = ["Corner 3s", "Spacing", "PnR Actions", "Floor Spacing"];
    } else if (pace < 97) {
      name = "Half-Court ISO"; keyPlays = ["Star Isolation", "Post-Up", "Mid-Range Pull-Up", "Late-Clock Sets"];
    } else {
      name = "Balanced Attack"; keyPlays = ["Inside-Out Play", "Screen Actions", "Pick and Pop", "Secondary Break"];
    }

    const style: "aggressive" | "balanced" | "conservative" =
      pace >= 100 ? "aggressive" : pace >= 96 ? "balanced" : "conservative";
    const successRate = Math.round(Math.max(45, Math.min(88,
      45 + winPct * 25 + (stats.offRating ? Math.max(0, stats.offRating - 108) * 1.5 : 0)
    )));
    const last10 = stats.last10Wins ?? Math.round(winPct * 10);
    const trend: "up" | "down" | "stable" =
      last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
    return { name, style, keyPlays, successRate, trendDirection: trend };
  }

  // Non-NBA: use win%, home/away record, streak to differentiate
  const homeWinPct = stats?.homeWinPct ?? winPct + 0.05;
  const awayWinPct = stats?.awayWinPct ?? winPct - 0.05;
  const isHotStreak = stats?.streakType === "win" && (stats.streak ?? 0) >= 3;

  if (sport === "NFL" || sport === "NCAAF") {
    if (winPct >= 0.65 && homeWinPct >= 0.7) {
      name = "Air Raid"; keyPlays = ["Deep Routes", "Quick Slants", "4-Wide Sets", "Tempo Attack"];
    } else if (winPct >= 0.5 && awayWinPct >= 0.5) {
      name = "West Coast Spread"; keyPlays = ["Short Passing", "RPO", "Screen Games", "Route Trees"];
    } else if (winPct >= 0.45) {
      name = "Power Run Scheme"; keyPlays = ["Zone Runs", "Play Action", "Boot Legs", "Downhill Runs"];
    } else {
      name = "Spread Option"; keyPlays = ["Read Option", "RPO", "QB Scramble", "Constraint Routes"];
    }
  } else if (sport === "MLB") {
    if (winPct >= 0.58) {
      name = "Analytics-Driven"; keyPlays = ["Launch Angle Hitting", "Patient At-Bats", "Power Focus", "Platoon Splits"];
    } else if (winPct >= 0.48) {
      name = "Contact & Speed"; keyPlays = ["Line Drives", "Situational Hitting", "Base Running", "Hit and Run"];
    } else {
      name = "Small Ball"; keyPlays = ["Sacrifice Bunts", "Stolen Bases", "Hit and Run", "Squeeze Plays"];
    }
  } else if (sport === "NHL") {
    if (winPct >= 0.6 || isHotStreak) {
      name = "Puck Possession"; keyPlays = ["Cycle Game", "Point Shots", "Net-Front Presence", "Extended Zone Time"];
    } else if (winPct >= 0.5) {
      name = "Speed Transition"; keyPlays = ["Stretch Passes", "Odd-Man Rushes", "Dump and Chase", "Forecheck Pressure"];
    } else {
      name = "Defensive Counter"; keyPlays = ["Neutral Zone Trap", "Shot Blocking", "Counterattack", "Low-Event Hockey"];
    }
  } else if (sport === "NCAAB") {
    if (winPct >= 0.7) {
      name = "Motion Offense"; keyPlays = ["Ball Screens", "Off-Ball Cuts", "Drive and Kick", "Handoffs"];
    } else if (winPct >= 0.55) {
      name = "High-Tempo Attack"; keyPlays = ["Fast Break", "Early Offense", "Press Break", "Quick Hitters"];
    } else {
      name = "Princeton Offense"; keyPlays = ["Backdoor Cuts", "High Post Entry", "Patience", "Late Clock Sets"];
    }
  } else {
    name = winPct >= 0.55 ? "Aggressive Offense" : "Balanced Offense";
    keyPlays = ["Standard Plays"];
  }

  const style: "aggressive" | "balanced" | "conservative" =
    winPct > 0.6 ? "aggressive" : winPct > 0.45 ? "balanced" : "conservative";
  const successRate = Math.round(Math.max(40, Math.min(85, 45 + winPct * 35 + (isHotStreak ? 5 : 0))));
  const last10 = stats?.last10Wins ?? Math.round(winPct * 10);
  const trend: "up" | "down" | "stable" =
    last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";

  return { name, style, keyPlays, successRate, trendDirection: trend };
}

function getDefensiveScheme(sport: string, winPct: number, stats?: SchemeStats): TeamSchemeData["defensiveScheme"] {
  let name: string;
  let formation: string;

  if (sport === "NBA" && stats) {
    const defRating = stats.defRating ?? 113;
    const pace = stats.pace ?? 98;

    if (defRating <= 109) {
      name = "Elite Shot Suppression"; formation = "Switching Man-to-Man";
    } else if (defRating <= 111) {
      name = "Switch Everything"; formation = "Versatile Man Defense";
    } else if (pace >= 100) {
      name = "Aggressive Hedge"; formation = "Man + Blitz PnR";
    } else if (defRating >= 116) {
      name = "Drop Coverage"; formation = "Passive Zone Hybrid";
    } else {
      name = "Matchup Zone"; formation = "2-3 Zone Hybrid";
    }

    const style: "aggressive" | "balanced" | "conservative" =
      defRating <= 111 ? "aggressive" : defRating <= 115 ? "balanced" : "conservative";
    const successRate = Math.round(Math.max(38, Math.min(88,
      95 - (stats.defRating ? stats.defRating - 100 : 15) * 1.8
    )));
    const last10 = stats.last10Wins ?? Math.round(winPct * 10);
    const trend: "up" | "down" | "stable" =
      last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
    return { name, style, formation, successRate, trendDirection: trend };
  }

  // Non-NBA fallback with record-based differentiation
  const homeWinPct = stats?.homeWinPct ?? winPct + 0.05;
  const isHotStreak = stats?.streakType === "win" && (stats.streak ?? 0) >= 3;

  if (sport === "NFL" || sport === "NCAAF") {
    if (winPct >= 0.65 && homeWinPct >= 0.7) {
      name = "4-3 Under / Pressure"; formation = "Multiple Fronts + Blitz";
    } else if (winPct >= 0.5) {
      name = "3-4 Odd Zone Mix"; formation = "Edge Pressure Package";
    } else {
      name = "Nickel Zone Coverage"; formation = "Zone Coverage Soft";
    }
  } else if (sport === "MLB") {
    if (winPct >= 0.55) {
      name = "Power Pitching Staff"; formation = "Strikeout-First Approach";
    } else if (winPct >= 0.45) {
      name = "Pitch to Contact"; formation = "Ground Ball Focus";
    } else {
      name = "Shift + Positioning"; formation = "Analytics Infield Setup";
    }
  } else if (sport === "NHL") {
    if (winPct >= 0.58 || isHotStreak) {
      name = "Aggressive Forecheck"; formation = "1-2-2 Forecheck";
    } else if (winPct >= 0.48) {
      name = "Shot Suppression"; formation = "Collapsing Zone";
    } else {
      name = "Neutral Zone Trap"; formation = "1-3-1 Passive";
    }
  } else if (sport === "NCAAB") {
    if (winPct >= 0.65) {
      name = "Pack-Line Man Defense"; formation = "Help-Side Emphasis";
    } else if (winPct >= 0.5) {
      name = "Man-to-Man Pressure"; formation = "Ball Denial";
    } else {
      name = "2-3 Zone"; formation = "Passive Zone Defense";
    }
  } else {
    name = winPct >= 0.55 ? "Aggressive Defense" : "Zone Coverage";
    formation = "Standard";
  }

  const style: "aggressive" | "balanced" | "conservative" =
    winPct > 0.6 ? "aggressive" : winPct > 0.45 ? "balanced" : "conservative";
  const successRate = Math.round(Math.max(38, Math.min(85, 42 + winPct * 38 + (isHotStreak ? 4 : 0))));
  const last10 = stats?.last10Wins ?? Math.round(winPct * 10);
  const trend: "up" | "down" | "stable" =
    last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";

  return { name, style, formation, successRate, trendDirection: trend };
}

function deriveCoachProfile(
  coach: ESPNCoach,
  team: ESPNTeam,
  sport: string,
  record: string,
  stats?: SchemeStats
): CoachProfileData {
  const { wins, losses, pct } = parseRecord(record);
  const total = wins + losses;

  // Use real stats to determine coaching style where available
  const pace = stats?.pace;
  const offRating = stats?.offRating;
  const defRating = stats?.defRating;
  const last10Wins = stats?.last10Wins ?? Math.round(pct * 10);
  const streak = stats?.streak ?? 0;
  const streakType = stats?.streakType ?? (pct >= 0.5 ? "win" : "loss");

  // Tempo: for NBA use pace, for others use win% and away performance
  const tempoPreference: "fast" | "moderate" | "slow" =
    pace !== undefined
      ? (pace >= 100 ? "fast" : pace >= 96 ? "moderate" : "slow")
      : (pct > 0.55 ? "fast" : pct > 0.4 ? "moderate" : "slow");

  // Risk tolerance: strong offense + high win% = aggressive, weak = conservative
  const offFactor = offRating !== undefined ? offRating >= 114 : pct > 0.6;
  const riskTolerance: "high" | "medium" | "low" =
    offFactor && pct >= 0.55 ? "high" : pct > 0.45 ? "medium" : "low";

  // Adjustment rating: based on last 10 performance vs overall win%
  const last10Pct = last10Wins / 10;
  const adjustmentDelta = last10Pct - pct;  // positive = improving, negative = declining
  const adjustmentRating = Math.round(Math.max(40, Math.min(95,
    55 + pct * 30 + adjustmentDelta * 15 + (coach.experience ? Math.min(coach.experience, 15) * 0.5 : 0)
  )));

  // Clutch decisions: affected by close-game performance (approximated from home/away split)
  const homeWinPct = stats?.homeWinPct ?? pct + 0.05;
  const awayWinPct = stats?.awayWinPct ?? pct - 0.05;
  const splitGap = homeWinPct - awayWinPct;  // large gap = heavily home-dependent
  const clutchDecisions = Math.round(Math.max(42, Math.min(92,
    50 + pct * 30 - splitGap * 10 + (adjustmentDelta > 0 ? 5 : -3)
  )));

  // ATS and cover rates — vary by streak and recent form
  const vsSpread = Math.round((47 + pct * 8 + (streakType === "win" ? streak * 0.4 : -streak * 0.3)) * 10) / 10;
  const coverRate = Math.round(Math.max(35, Math.min(68, 44 + pct * 18 + (last10Wins >= 7 ? 4 : last10Wins <= 3 ? -4 : 0))));

  const trend: "hot" | "cold" | "neutral" =
    last10Wins >= 7 ? "hot" : last10Wins <= 3 ? "cold" : "neutral";

  // Construct recent form string from actual last10 record
  const recentWins = last10Wins;
  const recentLosses = 10 - last10Wins;

  // Defense-focused vs offense-focused (for strengths/weaknesses)
  const isDefensiveTeam = defRating !== undefined ? defRating < 111 : false;
  const isOffensiveTeam = offRating !== undefined ? offRating > 115 : pct > 0.6;
  const isHighPace = pace !== undefined ? pace >= 101 : pct > 0.55;

  return {
    name: `${coach.firstName} ${coach.lastName}`,
    team: team.displayName,
    teamId: team.id,
    sport,
    experience: coach.experience || 1,
    tendencies: {
      riskTolerance,
      fourthDownAggression: (sport === "NFL" || sport === "NCAAF") ? Math.round(50 + pct * 35) : undefined,
      tempoPreference,
      adjustmentRating,
      clutchDecisions,
    },
    historicalPatterns: {
      vsSpread: Math.round(vsSpread * 10) / 10,
      overUnderTrend: isOffensiveTeam && isHighPace ? "over" : isDefensiveTeam ? "under" : pct > 0.55 ? "over" : "balanced",
      rivalryBoost: Math.round(5 + pct * 15 + (streak >= 3 && streakType === "win" ? 4 : 0)),
      restAdvantage: Math.round(3 + pct * 10 + (homeWinPct - awayWinPct) * 5),
    },
    recentForm: {
      lastFive: `${recentWins}-${recentLosses} (L10)`,
      coverRate,
      trend,
    },
    dataSource: defRating !== undefined ? "ESPN + BallDontLie" : "ESPN",
  };
}

function generateMatchupAlerts(
  game: ESPNScoreboardGame,
  homeWinPct: number,
  awayWinPct: number,
  realOdds?: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number }
): SchemeAlertData[] {
  const alerts: SchemeAlertData[] = [];
  const gameId = game.id;
  const homeName = game.homeTeam.shortDisplayName;
  const awayName = game.awayTeam.shortDisplayName;

  if (homeWinPct > 0.65 && awayWinPct < 0.4) {
    alerts.push({
      id: `${gameId}-mismatch`,
      type: "advantage",
      title: `Significant Scheme Mismatch: ${homeName} Advantage`,
      description: `${game.homeTeam.displayName} (${game.homeTeam.record}) has a dominant record vs ${game.awayTeam.displayName} (${game.awayTeam.record}). Home team's win rate suggests strong scheme execution.`,
      impact: "high",
      affectedLegs: [`${homeName} ML`, `${homeName} Spread`],
      confidence: Math.round(55 + homeWinPct * 35),
      dataSource: "ESPN",
    });
  }

  if (awayWinPct > 0.65 && homeWinPct < 0.4) {
    alerts.push({
      id: `${gameId}-away-edge`,
      type: "advantage",
      title: `Road Favorite Edge: ${awayName}`,
      description: `${game.awayTeam.displayName} (${game.awayTeam.record}) is significantly stronger despite playing away. Road strength often indicates superior scheme adaptability.`,
      impact: "high",
      affectedLegs: [`${awayName} ML`, `${awayName} Spread`],
      confidence: Math.round(50 + awayWinPct * 35),
      dataSource: "ESPN",
    });
  }

  if (realOdds?.spread !== undefined) {
    const absSpread = Math.abs(realOdds.spread);
    if (absSpread >= 10) {
      const favored = realOdds.spread < 0 ? homeName : awayName;
      alerts.push({
        id: `${gameId}-spread-alert`,
        type: "warning",
        title: `Large Spread Warning: ${favored} -${absSpread}`,
        description: `${favored} is heavily favored with a ${absSpread}-point spread. Large spreads historically have lower ATS cover rates. Consider the total instead.`,
        impact: "medium",
        affectedLegs: [`${favored} -${absSpread}`],
        confidence: 68,
        dataSource: "The Odds API",
      });
    }
  }

  if (Math.abs(homeWinPct - awayWinPct) < 0.08 && homeWinPct > 0.4) {
    alerts.push({
      id: `${gameId}-even-match`,
      type: "neutral",
      title: `Even Matchup: ${homeName} vs ${awayName}`,
      description: `Both teams have similar records (${game.homeTeam.record} vs ${game.awayTeam.record}). Home court advantage may be the deciding factor. Consider the total market.`,
      impact: "medium",
      affectedLegs: [`${homeName} ML`, `${awayName} ML`, `Game Total`],
      confidence: 62,
      dataSource: "ESPN",
    });
  }

  if (homeWinPct > 0.55 && game.status.state === "pre") {
    const homeAdv = Math.round(50 + homeWinPct * 10);
    alerts.push({
      id: `${gameId}-home-adv`,
      type: "advantage",
      title: `Home Court Edge: ${homeName}`,
      description: `${game.homeTeam.displayName} plays at ${game.venue?.name || "home"} with a ${game.homeTeam.record} record. Estimated ${homeAdv}% home advantage factor.`,
      impact: homeWinPct > 0.65 ? "high" : "low",
      affectedLegs: [`${homeName} ML`],
      confidence: homeAdv,
      dataSource: "ESPN",
    });
  }

  if (realOdds?.homeMoneyline && realOdds?.awayMoneyline) {
    const homeML = realOdds.homeMoneyline;
    const awayML = realOdds.awayMoneyline;
    if (homeML > 0 && homeWinPct > 0.55) {
      alerts.push({
        id: `${gameId}-value-home`,
        type: "advantage",
        title: `Potential Value: ${homeName} Underdog`,
        description: `${homeName} has a winning record (${game.homeTeam.record}) but is listed as an underdog at +${homeML}. Market may be undervaluing them.`,
        impact: "high",
        affectedLegs: [`${homeName} ML +${homeML}`],
        confidence: 72,
        dataSource: "The Odds API + ESPN",
      });
    }
    if (awayML > 0 && awayWinPct > 0.55) {
      alerts.push({
        id: `${gameId}-value-away`,
        type: "advantage",
        title: `Potential Value: ${awayName} Underdog`,
        description: `${awayName} has a winning record (${game.awayTeam.record}) but is listed as an underdog at +${awayML}. Market may be undervaluing them.`,
        impact: "high",
        affectedLegs: [`${awayName} ML +${awayML}`],
        confidence: 72,
        dataSource: "The Odds API + ESPN",
      });
    }
  }

  return alerts;
}

export async function analyzeSchemes(sport: Sport): Promise<SchemeAnalysisResponse> {
  const games = await getMultiDayScoreboard(sport, 3);
  const upcomingGames = games.filter(g => g.status.state === "pre" || g.status.state === "in");

  const teamSchemes: TeamSchemeData[] = [];
  const coachProfiles: CoachProfileData[] = [];
  const allAlerts: SchemeAlertData[] = [];
  const matchupAnalysis: MatchupAnalysisData[] = [];
  const seenTeams = new Set<string>();
  const dataSources = new Set<string>(["ESPN"]);

  // Load BDL enriched data for NBA
  let bdlTeams: BDLEnrichedTeamData[] = [];
  if (sport === "NBA" && isBDLAvailable()) {
    try {
      bdlTeams = await getEnrichedTeamData();
      if (bdlTeams.length > 0) dataSources.add("BallDontLie");
    } catch {}
  }

  function findBDL(teamName: string): BDLEnrichedTeamData | undefined {
    if (!bdlTeams.length) return undefined;
    const lower = teamName.toLowerCase();
    return bdlTeams.find(t =>
      lower.includes(t.teamName.toLowerCase()) ||
      t.teamName.toLowerCase().includes(lower.split(" ").pop()?.toLowerCase() || "") ||
      lower.includes(t.abbreviation.toLowerCase())
    );
  }

  function buildStats(teamData: { team: ESPNTeam; record: string; parsed: { wins: number; losses: number; pct: number } }, bdl?: BDLEnrichedTeamData): SchemeStats {
    const homeWins = bdl?.homeWins ?? Math.round(teamData.parsed.pct * (teamData.parsed.wins + teamData.parsed.losses) * 0.55);
    const homeLosses = bdl?.homeLosses ?? Math.round(teamData.parsed.losses * 0.45);
    const awayWins = bdl?.awayWins ?? (teamData.parsed.wins - homeWins);
    const awayLosses = bdl?.awayLosses ?? (teamData.parsed.losses - homeLosses);
    const homeTotal = homeWins + homeLosses;
    const awayTotal = awayWins + awayLosses;

    return {
      pace: bdl?.pace,
      offRating: bdl?.offRating,
      defRating: bdl?.defRating,
      avgPts: bdl?.avgPts,
      avgAst: bdl?.avgAst,
      fg3Pct: bdl?.fgPct ? bdl.fg3Pct : undefined,
      last10Wins: bdl?.last10Wins,
      homeWinPct: homeTotal > 0 ? homeWins / homeTotal : teamData.parsed.pct + 0.05,
      awayWinPct: awayTotal > 0 ? awayWins / awayTotal : teamData.parsed.pct - 0.05,
      streak: bdl?.streak,
      streakType: bdl?.streakType,
    };
  }

  for (const game of upcomingGames) {
    const homeRecord = game.homeTeam.record || "0-0";
    const awayRecord = game.awayTeam.record || "0-0";
    const homeParsed = parseRecord(homeRecord);
    const awayParsed = parseRecord(awayRecord);

    const homeBDL = findBDL(game.homeTeam.displayName);
    const awayBDL = findBDL(game.awayTeam.displayName);

    let realOdds: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number } | undefined;
    try {
      const oddsResult = await fetchRealOddsForGame(
        sport,
        game.homeTeam.displayName,
        game.awayTeam.displayName
      );
      if (oddsResult) {
        realOdds = oddsResult;
        dataSources.add("The Odds API");
      }
    } catch {}

    const homeTeamData = { team: game.homeTeam, record: homeRecord, parsed: homeParsed };
    const awayTeamData = { team: game.awayTeam, record: awayRecord, parsed: awayParsed };

    for (const [teamData, bdl] of [
      [homeTeamData, homeBDL] as const,
      [awayTeamData, awayBDL] as const,
    ]) {
      if (seenTeams.has(teamData.team.id)) continue;
      seenTeams.add(teamData.team.id);

      const stats = buildStats(teamData, bdl);
      const offScheme = getOffensiveScheme(sport, teamData.parsed.pct, 0, stats);
      const defScheme = getDefensiveScheme(sport, teamData.parsed.pct, stats);

      // Situational patterns from real stats
      const hw = stats.homeWinPct ?? teamData.parsed.pct + 0.05;
      const aw = stats.awayWinPct ?? teamData.parsed.pct - 0.05;
      const homeAdv = Math.round(Math.max(35, Math.min(90, hw * 100)));
      const awayPerf = Math.round(Math.max(30, Math.min(88, aw * 100)));
      const last10 = stats.last10Wins ?? Math.round(teamData.parsed.pct * 10);
      const primetime = Math.round(Math.max(35, Math.min(88, 40 + teamData.parsed.pct * 35 + (last10 >= 7 ? 5 : 0))));

      teamSchemes.push({
        teamName: teamData.team.displayName,
        teamId: teamData.team.id,
        sport,
        record: teamData.record,
        offensiveScheme: offScheme,
        defensiveScheme: defScheme,
        situationalPatterns: {
          homeAdvantage: homeAdv,
          awayPerformance: awayPerf,
          primetime,
          underdog: Math.round(Math.max(30, Math.min(75, 35 + teamData.parsed.pct * 28 + (stats.streak && stats.streakType === "win" ? stats.streak * 1.5 : 0)))),
          favorite: Math.round(Math.max(38, Math.min(85, 45 + teamData.parsed.pct * 32))),
        },
        dataSource: bdl ? "ESPN + BallDontLie" : "ESPN",
      });

      const roster = getRosterFromCacheById(sport, teamData.team.id);
      if (roster && roster.coach.length > 0) {
        const coach = roster.coach[0];
        coachProfiles.push(deriveCoachProfile(coach, roster.team, sport, teamData.record, stats));
      }
    }

    const gameAlerts = generateMatchupAlerts(game, homeParsed.pct, awayParsed.pct, realOdds);
    allAlerts.push(...gameAlerts);

    const diffPct = homeParsed.pct - awayParsed.pct;
    const schemeAdvantage: "home" | "away" | "even" =
      diffPct > 0.1 ? "home" : diffPct < -0.1 ? "away" : "even";

    const keyFactors: string[] = [];
    keyFactors.push(`${game.homeTeam.shortDisplayName} record: ${homeRecord} (${Math.round(homeParsed.pct * 100)}% win rate)`);
    keyFactors.push(`${game.awayTeam.shortDisplayName} record: ${awayRecord} (${Math.round(awayParsed.pct * 100)}% win rate)`);

    if (game.venue?.name) {
      keyFactors.push(`Venue: ${game.venue.name}${game.venue.city ? `, ${game.venue.city}` : ""}`);
    }

    if (realOdds?.spread !== undefined) {
      const favored = realOdds.spread < 0 ? game.homeTeam.shortDisplayName : game.awayTeam.shortDisplayName;
      keyFactors.push(`Spread: ${favored} ${realOdds.spread < 0 ? realOdds.spread : -realOdds.spread}`);
    }
    if (realOdds?.total !== undefined) {
      keyFactors.push(`Total: O/U ${realOdds.total}`);
    }

    if (game.leaders && game.leaders.length > 0) {
      const topLeaders = game.leaders.slice(0, 2);
      for (const leader of topLeaders) {
        keyFactors.push(`${leader.team} ${leader.category} leader: ${leader.playerName} (${leader.value})`);
      }
    }

    const predictionImpact = Math.round(Math.abs(diffPct) * 25);

    matchupAnalysis.push({
      matchup: game.shortName || `${game.awayTeam.shortDisplayName} @ ${game.homeTeam.shortDisplayName}`,
      gameId: game.id,
      homeTeam: game.homeTeam.displayName,
      awayTeam: game.awayTeam.displayName,
      homeRecord,
      awayRecord,
      gameTime: game.date,
      venue: game.venue?.name,
      broadcast: game.broadcast,
      schemeAdvantage,
      keyFactors,
      predictionImpact,
      alerts: gameAlerts,
      odds: realOdds ? {
        spread: realOdds.spread !== undefined ? `${realOdds.spread > 0 ? '+' : ''}${realOdds.spread}` : undefined,
        overUnder: realOdds.total,
        homeMoneyline: realOdds.homeMoneyline,
        awayMoneyline: realOdds.awayMoneyline,
      } : game.odds,
      dataSource: realOdds ? "ESPN + The Odds API" : "ESPN",
    });
  }

  allAlerts.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
  });

  return {
    teamSchemes: teamSchemes.sort((a, b) => {
      const aPct = parseRecord(a.record).pct;
      const bPct = parseRecord(b.record).pct;
      return bPct - aPct;
    }),
    coachProfiles,
    alerts: allAlerts,
    matchupAnalysis,
    meta: {
      sport,
      gamesAnalyzed: upcomingGames.length,
      teamsAnalyzed: seenTeams.size,
      generatedAt: new Date().toISOString(),
      dataSources: Array.from(dataSources),
    },
  };
}
