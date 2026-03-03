import type { Sport } from "@shared/schema";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { getRosterFromCacheById, type ESPNTeam, type ESPNCoach } from "./espn-roster-provider";
import { getOddsForSport, type SportEvent } from "./odds-provider";
import { isBDLAvailable, getEnrichedTeamData, type BDLEnrichedTeamData, isBDLNFLAvailable, getNFLTeamStatsBDL, type BDLNFLTeamData } from "./balldontlie-provider";
import { getPrecomputedCache } from "./precomputedPredictionsEngine";
import { getNHLTeamStats, findNHLTeam, type NHLTeamStats } from "./nhl-stats-provider";
import { getMLBTeamStats, findMLBTeam, type MLBTeamStats } from "./mlb-stats-provider";

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
    vsSpreadEstimated: true;
    overUnderTrend: "over" | "under" | "balanced";
    rivalryBoost: number;
    restAdvantage: number;
  };
  recentForm: {
    lastFive: string;
    coverRate: number;
    coverRateEstimated: true;
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

export interface LinkedPickData {
  grade: string;
  confidence: number;
  pick: string;
  betType: string;
  recommendation: string;
  winProbability: number;
  timing: string;
}

export interface MatchupAnalysisData {
  matchup: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  gameTime: string;
  gameState: "pre" | "in" | "post";
  venue?: string;
  broadcast?: string;
  schemeAdvantage: "home" | "away" | "even";
  keyFactors: string[];
  schemeClash?: string;
  predictionImpact: number;
  alerts: SchemeAlertData[];
  odds?: {
    spread?: string;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  };
  linkedPicks: LinkedPickData[];
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
    oddsFromCache: boolean;
    picksLinked: number;
    transparencyNote: string;
  };
}

function parseRecord(record: string): { wins: number; losses: number; pct: number } {
  const parts = record.split("-").map(s => parseInt(s.trim(), 10));
  const wins = isNaN(parts[0]) ? 0 : parts[0];
  const losses = isNaN(parts[1]) ? 0 : parts[1];
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
  pointsAllowed?: number;
  rosterSize?: number;
  // NHL-specific stats from api.nhle.com
  goalsForPG?: number;
  goalsAgainstPG?: number;
  powerPlayPct?: number;
  penaltyKillPct?: number;
  shotsPG?: number;
  shotsAgainstPG?: number;
  faceoffWinPct?: number;
  // MLB-specific stats from statsapi.mlb.com
  era?: number;
  whip?: number;
  runsScored?: number;
  runsAllowed?: number;
  strikeoutsPer9?: number;
  walksPer9?: number;
  // NFL-specific stats from BallDontLie (paid)
  passingYPG?: number;
  rushingYPG?: number;
  pointsPerGame?: number;
  pointsAllowedPerGame?: number;
  turnoverDiff?: number;
  thirdDownPct?: number;
  qbRating?: number;
  oppPassingYPG?: number;
  oppRushingYPG?: number;
}

function getOffensiveScheme(sport: string, winPct: number, teamId: string, stats?: SchemeStats): TeamSchemeData["offensiveScheme"] {
  let name: string;
  let keyPlays: string[];

  if (sport === "NBA" && stats) {
    const pace = stats.pace ?? 98;
    const avgAst = stats.avgAst ?? 25;
    const fg3Pct = stats.fg3Pct ?? 0.35;
    const avgPts = stats.avgPts ?? 110;
    const offRating = stats.offRating ?? 110;

    const astRatio = avgPts > 0 ? avgAst / avgPts : 0.23;
    const highVolumeThree = (stats.fg3Pct ?? 0.35) >= 0.37;

    if (pace >= 102 && astRatio >= 0.24 && highVolumeThree) {
      name = "3-Point Heavy Motion"; keyPlays = ["High-Volume 3PT", "Ball Movement", "Drive and Kick", "Pick and Roll"];
    } else if (pace >= 101 && astRatio >= 0.24) {
      name = "Motion Offense"; keyPlays = ["Ball Movement", "Off-Ball Cuts", "Pick and Roll", "Secondary Break"];
    } else if (pace >= 102 && astRatio < 0.22) {
      name = "Fast Break Tempo"; keyPlays = ["Transition Scoring", "Push Pace", "Early Offense", "Leak-Outs"];
    } else if (fg3Pct >= 0.38 && pace >= 98) {
      name = "Spread Pick and Roll"; keyPlays = ["Corner 3s", "Floor Spacing", "PnR Actions", "Drive and Kick"];
    } else if (offRating >= 116 && pace < 100) {
      name = "Efficient Half-Court"; keyPlays = ["Pick and Pop", "Post-Up", "Mid-Range Pull-Up", "ISO Sets"];
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
    const trend: "up" | "down" | "stable" = last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
    return { name, style, keyPlays, successRate, trendDirection: trend };
  }

  // For non-NBA: use win%, home/away split, streak, and roster data to differentiate
  const homeWinPct = stats?.homeWinPct ?? winPct + 0.05;
  const awayWinPct = stats?.awayWinPct ?? winPct - 0.05;
  const isHotStreak = stats?.streakType === "win" && (stats.streak ?? 0) >= 3;
  const isOnRoad = awayWinPct > homeWinPct + 0.05;  // teams that travel well = pass-heavy
  const last10 = stats?.last10Wins ?? Math.round(winPct * 10);

  // Use teamId last digit to add natural variation between equal-record teams
  const teamVariant = parseInt(teamId.slice(-2), 10) % 3;

  if (sport === "NFL" || sport === "NCAAF") {
    const passingYPG = stats?.passingYPG;
    const rushingYPG = stats?.rushingYPG;
    const thirdDownPct = stats?.thirdDownPct;
    const ppg = stats?.pointsPerGame;

    if (passingYPG !== undefined && rushingYPG !== undefined) {
      // Stats-driven scheme names using real BDL data
      if (passingYPG >= 280 && rushingYPG < 110) {
        name = "Air Raid"; keyPlays = ["Deep Routes", "Quick Slants", "4-Wide Sets", "Tempo Attack"];
      } else if (passingYPG >= 265 && rushingYPG >= 130) {
        name = "West Coast Spread"; keyPlays = ["Short Passing", "RPO", "Screen Games", "Route Trees"];
      } else if (rushingYPG >= 160) {
        name = "Power Run Game"; keyPlays = ["Gap Scheme Runs", "Fullback Lead", "Counter Trey", "Play Action"];
      } else if (rushingYPG >= 140 && passingYPG < 220) {
        name = "Pro-Style Run Game"; keyPlays = ["Zone Runs", "Play Action", "Boot Legs", "Downhill Runs"];
      } else if (thirdDownPct !== undefined && thirdDownPct >= 0.43) {
        name = "Efficient Offense"; keyPlays = ["Money-Down Execution", "Short Routes", "RPO", "Bootleg Passes"];
      } else if (ppg !== undefined && ppg >= 28) {
        name = "High-Powered Offense"; keyPlays = ["Balanced Attack", "Red-Zone Efficiency", "Play-Action", "Screen Game"];
      } else if (passingYPG >= 240 && rushingYPG >= 100) {
        name = "Spread Option"; keyPlays = ["Read Option", "RPO", "QB Scramble", "Constraint Routes"];
      } else {
        name = "Ball-Control Offense"; keyPlays = ["Short Routes", "Screen Game", "Run-Heavy Sets", "Clock Control"];
      }
    } else if (winPct >= 0.65 && homeWinPct >= 0.72) {
      name = "Air Raid"; keyPlays = ["Deep Routes", "Quick Slants", "4-Wide Sets", "Tempo Attack"];
    } else if (winPct >= 0.6 && isOnRoad) {
      name = "West Coast Spread"; keyPlays = ["Short Passing", "RPO", "Screen Games", "Route Trees"];
    } else if (winPct >= 0.55 && teamVariant === 0) {
      name = "Pro-Style Run Game"; keyPlays = ["Zone Runs", "Play Action", "Boot Legs", "Downhill Runs"];
    } else if (winPct >= 0.5 && isHotStreak) {
      name = "Spread Option"; keyPlays = ["Read Option", "RPO", "QB Scramble", "Constraint Routes"];
    } else if (winPct >= 0.45 && teamVariant === 1) {
      name = "Power Run Scheme"; keyPlays = ["Gap Scheme Runs", "Fullback Lead", "Counter Trey", "Play Action"];
    } else if (winPct >= 0.4) {
      name = "Ball-Control Offense"; keyPlays = ["Short Routes", "Screen Game", "Run-Heavy Sets", "Clock Control"];
    } else {
      name = "Survival Offense"; keyPlays = ["Checkdown Routes", "Screen Passes", "QB Keeper", "Field Goals"];
    }
  } else if (sport === "MLB") {
    const runsScored = stats?.runsScored;
    const gamesPlayed = 162;
    const runsPG = runsScored ? runsScored / gamesPlayed : (stats?.avgPts ?? 4.2);
    // Use real MLB runs/game when available
    if (runsPG >= 5.2) {
      name = "High-Powered Lineup"; keyPlays = ["Launch Angle Hitting", "Patient At-Bats", "Power Focus", "Platoon Splits"];
    } else if (runsPG >= 4.5 && awayWinPct >= 0.5) {
      name = "Balanced Offense"; keyPlays = ["Line Drives", "Situational Hitting", "Two-Strike Approach", "Hit and Run"];
    } else if (runsPG >= 4.0 && isHotStreak) {
      name = "Station-to-Station"; keyPlays = ["Extra-Base Hits", "Sacrifice Flies", "RBI Situations", "Power Corners"];
    } else if (runsPG >= 3.8) {
      name = "Pitching-First Approach"; keyPlays = ["Small Ball", "Manufacturing Runs", "Speed Game", "Bunt Sets"];
    } else {
      name = "Small Ball"; keyPlays = ["Sacrifice Bunts", "Stolen Bases", "Hit and Run", "Squeeze Plays"];
    }
  } else if (sport === "NHL") {
    const gpg = stats?.goalsForPG ?? 2.8;
    const shotsPG = stats?.shotsPG ?? 29;
    const ppPct = stats?.powerPlayPct ?? 19;
    // Use real NHL stats when available for more specific scheme names
    if (gpg >= 3.5 && shotsPG >= 33) {
      name = "High-Octane Offense"; keyPlays = ["Power Play Dominance", "Slot Attacks", "Net-Front Presence", "High Volume Shots"];
    } else if (gpg >= 3.2 && shotsPG >= 30) {
      name = "Puck Possession"; keyPlays = ["Cycle Game", "Point Shots", "Net-Front Presence", "Extended Zone Time"];
    } else if (gpg >= 3.0 && ppPct >= 22) {
      name = "Power Play-Driven"; keyPlays = ["Overload Formations", "Cross-Ice Passes", "One-Timers", "PP Unit Depth"];
    } else if (gpg >= 2.8 && awayWinPct >= 0.48) {
      name = "Speed Transition"; keyPlays = ["Stretch Passes", "Odd-Man Rushes", "Dump and Chase", "Forecheck Pressure"];
    } else if (isHotStreak && winPct >= 0.52) {
      name = "Cycle & Crash"; keyPlays = ["Below-the-Goal Line", "Net Traffic", "Rebound Goals", "Grinding Forecheck"];
    } else if (gpg < 2.5 || (shotsPG < 26 && winPct < 0.48)) {
      name = "Trap Counter"; keyPlays = ["Defensive Counter", "Odd-Man Rushes", "Dump and Chase", "Shot-First Mentality"];
    } else {
      name = "Balanced Attack"; keyPlays = ["Inside-Out Play", "Quick Transitions", "Power Play Setup", "Forecheck"];
    }
  } else if (sport === "NCAAB") {
    const pace = stats?.pace ?? 68;
    if (winPct >= 0.72) {
      name = "Motion Offense"; keyPlays = ["Ball Screens", "Off-Ball Cuts", "Drive and Kick", "Handoffs"];
    } else if (winPct >= 0.62 && pace > 70) {
      name = "High-Tempo Attack"; keyPlays = ["Fast Break", "Early Offense", "Press Break", "Quick Hitters"];
    } else if (winPct >= 0.55 && isHotStreak) {
      name = "Dribble Drive"; keyPlays = ["Drive and Kick", "Pull-Up Mid", "Corner 3s", "Secondary Break"];
    } else if (winPct >= 0.5 && teamVariant === 0) {
      name = "Zone Offense"; keyPlays = ["Skip Passes", "Weak-Side Entry", "High-Low Post", "Zone Attack Sets"];
    } else if (pace < 64) {
      name = "Princeton Offense"; keyPlays = ["Backdoor Cuts", "High Post Entry", "Patience", "Late Clock Sets"];
    } else {
      name = "Spread Four"; keyPlays = ["3-Point Heavy", "Floor Spacing", "Guard-Dominated", "Secondary Breaks"];
    }
  } else {
    name = winPct >= 0.55 ? "Aggressive Offense" : "Balanced Offense";
    keyPlays = ["Standard Plays"];
  }

  const style: "aggressive" | "balanced" | "conservative" =
    winPct > 0.6 ? "aggressive" : winPct > 0.45 ? "balanced" : "conservative";
  const successRate = Math.round(Math.max(40, Math.min(85, 45 + winPct * 35 + (isHotStreak ? 5 : 0))));
  const trend: "up" | "down" | "stable" = last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
  return { name, style, keyPlays, successRate, trendDirection: trend };
}

function getDefensiveScheme(sport: string, winPct: number, teamId: string, stats?: SchemeStats): TeamSchemeData["defensiveScheme"] {
  let name: string;
  let formation: string;

  if (sport === "NBA" && stats) {
    const defRating = stats.defRating ?? 113;
    const pace = stats.pace ?? 98;

    if (defRating <= 108) {
      name = "Elite Defensive Shell"; formation = "Switching Man-to-Man + Help";
    } else if (defRating <= 110) {
      name = "Elite Shot Suppression"; formation = "Switch Everything";
    } else if (defRating <= 112) {
      name = "Aggressive Hedge"; formation = "Man + Blitz PnR";
    } else if (pace >= 101 && defRating > 115) {
      name = "Drop Coverage"; formation = "Passive Zone Hybrid";
    } else if (defRating >= 117) {
      name = "Soft Zone"; formation = "Zone Coverage Passive";
    } else {
      name = "Matchup Zone"; formation = "2-3 Zone Hybrid";
    }

    const style: "aggressive" | "balanced" | "conservative" =
      defRating <= 111 ? "aggressive" : defRating <= 115 ? "balanced" : "conservative";
    const successRate = Math.round(Math.max(38, Math.min(88,
      95 - (stats.defRating ? stats.defRating - 100 : 15) * 1.8
    )));
    const last10 = stats.last10Wins ?? Math.round(winPct * 10);
    const trend: "up" | "down" | "stable" = last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
    return { name, style, formation, successRate, trendDirection: trend };
  }

  const homeWinPct = stats?.homeWinPct ?? winPct + 0.05;
  const awayWinPct = stats?.awayWinPct ?? winPct - 0.05;
  const isHotStreak = stats?.streakType === "win" && (stats.streak ?? 0) >= 3;
  const last10 = stats?.last10Wins ?? Math.round(winPct * 10);
  const teamVariant = parseInt(teamId.slice(-2), 10) % 3;

  if (sport === "NFL" || sport === "NCAAF") {
    const papg = stats?.pointsAllowedPerGame;
    const turnoverDiff = stats?.turnoverDiff;
    const oppPassYPG = stats?.oppPassingYPG;
    const oppRushYPG = stats?.oppRushingYPG;

    if (papg !== undefined) {
      // Stats-driven scheme names using real BDL data
      if (papg < 17 && turnoverDiff !== undefined && turnoverDiff >= 5) {
        name = "Turnover Machine"; formation = "Ball-Hawking Coverage + Blitz";
      } else if (papg < 17) {
        name = "Elite Defense"; formation = "Multiple Fronts + Pressure";
      } else if (papg < 20 && oppPassYPG !== undefined && oppPassYPG < 200) {
        name = "Pass-Stuffing 4-3"; formation = "4-3 Coverage Shell";
      } else if (papg < 21 && oppRushYPG !== undefined && oppRushYPG < 90) {
        name = "Run-Stopping 3-4"; formation = "3-4 Gap Control";
      } else if (papg < 21) {
        name = "Strong 4-3"; formation = "Two-High Safety Shell";
      } else if (papg < 24 && turnoverDiff !== undefined && turnoverDiff >= 3) {
        name = "Opportunistic Defense"; formation = "Coverage-First + Blitz Packages";
      } else if (papg < 24) {
        name = "Cover-2 Tampa"; formation = "Two-High Safety Shell";
      } else if (papg >= 28) {
        name = "High-Risk Defense"; formation = "Soft Zone + Bracket";
      } else {
        name = "Nickel Zone Coverage"; formation = "Zone Coverage Soft";
      }
    } else if (winPct >= 0.65 && homeWinPct >= 0.72) {
      name = "4-3 Under Pressure Package"; formation = "Multiple Fronts + Blitz";
    } else if (winPct >= 0.6 && awayWinPct >= 0.55) {
      name = "3-4 Odd Zone Mix"; formation = "Edge Pressure Package";
    } else if (winPct >= 0.5 && teamVariant === 0) {
      name = "Cover-2 Tampa"; formation = "Two-High Safety Shell";
    } else if (winPct >= 0.5 && isHotStreak) {
      name = "Bear Defense"; formation = "8-Man Box Fronts";
    } else if (winPct >= 0.45) {
      name = "Nickel Zone Coverage"; formation = "Zone Coverage Soft";
    } else {
      name = "Prevent Zone"; formation = "Soft Zone + Bracket";
    }
  } else if (sport === "MLB") {
    const era = stats?.era;
    const whip = stats?.whip;
    const k9 = stats?.strikeoutsPer9;
    // Use real ERA/WHIP when available
    if (era !== undefined && era < 3.5) {
      name = "Ace-Led Pitching Staff"; formation = "Strikeout-First Approach";
    } else if (era !== undefined && era < 4.0 && (k9 ?? 8) >= 9) {
      name = "Power Pitching Staff"; formation = "High-K Rotation";
    } else if (era !== undefined && era < 4.2) {
      name = "Quality Rotation"; formation = "Pitch to Contact + Analytics Shift";
    } else if (era !== undefined && era >= 4.8) {
      name = "Bullpen-Heavy Approach"; formation = "Opener + Bulk Reliever";
    } else if (winPct >= 0.55 && awayWinPct >= 0.5) {
      name = "Ground Ball Focus"; formation = "Pitch to Contact + Shift";
    } else if (winPct >= 0.45) {
      name = "Defensive Positioning"; formation = "Shift + Spray Charts";
    } else {
      name = "Fly Ball Defense"; formation = "Standard Positioning";
    }
  } else if (sport === "NHL") {
    const gapg = stats?.goalsAgainstPG;
    const pkPct = stats?.penaltyKillPct;
    const shotsAgainst = stats?.shotsAgainstPG;
    // Use real NHL defensive stats when available
    if (gapg !== undefined && gapg < 2.5 && (pkPct ?? 80) >= 82) {
      name = "Elite Defensive System"; formation = "1-2-2 Lockdown + PK Unit";
    } else if (gapg !== undefined && gapg < 2.8) {
      name = "Disciplined Structure"; formation = "Collapsing Zone";
    } else if (gapg !== undefined && gapg >= 3.2) {
      name = "High-Risk Style"; formation = "Aggressive Forecheck + Open Ice";
    } else if (winPct >= 0.60 || (isHotStreak && winPct >= 0.52)) {
      name = "Aggressive Forecheck"; formation = "1-2-2 Forecheck";
    } else if (winPct >= 0.52 && teamVariant !== 2) {
      name = "Shot Suppression"; formation = "Collapsing Zone";
    } else if (winPct >= 0.48) {
      name = "Defensive Structure"; formation = "Left-Wing Lock";
    } else {
      name = "Neutral Zone Trap"; formation = "1-3-1 Passive";
    }
  } else if (sport === "NCAAB") {
    if (winPct >= 0.70) {
      name = "Pack-Line Man Defense"; formation = "Help-Side Emphasis";
    } else if (winPct >= 0.62 && isHotStreak) {
      name = "Pressure Defense"; formation = "Full-Court Press";
    } else if (winPct >= 0.55) {
      name = "Man-to-Man Pressure"; formation = "Ball Denial";
    } else if (winPct >= 0.45 && teamVariant === 0) {
      name = "Switching Man Defense"; formation = "Switch All Screens";
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
  const trend: "up" | "down" | "stable" = last10 >= 7 ? "up" : last10 <= 3 ? "down" : "stable";
  return { name, style, formation, successRate, trendDirection: trend };
}

function detectSchemeClash(
  sport: string,
  homeOff: string,
  homeDef: string,
  awayOff: string,
  awayDef: string
): string | undefined {
  // Identify notable stylistic mismatches that create betting edges
  if (sport === "NBA" || sport === "NCAAB") {
    if (homeOff.includes("Tempo") && awayDef.includes("Trap")) {
      return "Pace Clash: Fast-tempo home offense vs. trap defense — expect pace battle, lean Over";
    }
    if (homeOff.includes("3-Point") && awayDef.includes("Drop Coverage")) {
      return "3PT Edge: High-volume 3PT offense vs. drop coverage — open looks for home shooters";
    }
    if (awayOff.includes("ISO") && homeDef.includes("Switch")) {
      return "ISO vs Switch: Away team's star isolation runs into home's switching defense — lean Under";
    }
    if (homeOff.includes("Motion") && awayDef.includes("Zone")) {
      return "Motion vs Zone: Home team's ball movement can exploit zone gaps — home scoring edge";
    }
  }
  if (sport === "NFL" || sport === "NCAAF") {
    if (homeOff.includes("Air Raid") && awayDef.includes("Pressure")) {
      return "Pass Rush vs Air Raid: Away pressure package threatens high-tempo pass game — volatility alert";
    }
    if (homeOff.includes("Run") && awayDef.includes("Bear")) {
      return "Run vs Stacked Box: Run-heavy offense vs. loaded box — look for play action or Over";
    }
  }
  if (sport === "NHL") {
    if (homeOff.includes("Possession") && awayDef.includes("Trap")) {
      return "Cycle vs Trap: Puck possession offense vs. neutral zone trap — lower scoring expected";
    }
    if (homeOff.includes("Transition") && awayDef.includes("Forecheck")) {
      return "Speed vs Forecheck: Transition offense countered by aggressive forecheck — scrappy game ahead";
    }
  }
  return undefined;
}

function deriveCoachProfile(
  coach: ESPNCoach,
  team: ESPNTeam,
  sport: string,
  record: string,
  stats?: SchemeStats
): CoachProfileData {
  const { wins, losses, pct } = parseRecord(record);

  const last10Wins = stats?.last10Wins ?? Math.round(pct * 10);
  const streak = stats?.streak ?? 0;
  const streakType = stats?.streakType ?? (pct >= 0.5 ? "win" : "loss");
  const pace = stats?.pace;
  const offRating = stats?.offRating;
  const defRating = stats?.defRating;

  const tempoPreference: "fast" | "moderate" | "slow" =
    pace !== undefined
      ? (pace >= 100 ? "fast" : pace >= 96 ? "moderate" : "slow")
      : (pct > 0.55 ? "fast" : pct > 0.4 ? "moderate" : "slow");

  const offFactor = offRating !== undefined ? offRating >= 114 : pct > 0.6;
  const riskTolerance: "high" | "medium" | "low" =
    offFactor && pct >= 0.55 ? "high" : pct > 0.45 ? "medium" : "low";

  const last10Pct = last10Wins / 10;
  const adjustmentDelta = last10Pct - pct;
  const adjustmentRating = Math.round(Math.max(40, Math.min(95,
    55 + pct * 30 + adjustmentDelta * 15 + (coach.experience ? Math.min(coach.experience, 15) * 0.5 : 0)
  )));

  const homeWinPct = stats?.homeWinPct ?? pct + 0.05;
  const awayWinPct = stats?.awayWinPct ?? pct - 0.05;
  const splitGap = homeWinPct - awayWinPct;
  const clutchDecisions = Math.round(Math.max(42, Math.min(92,
    50 + pct * 30 - splitGap * 10 + (adjustmentDelta > 0 ? 5 : -3)
  )));

  const isDefensiveTeam = defRating !== undefined ? defRating < 111 : false;
  const isOffensiveTeam = offRating !== undefined ? offRating > 115 : pct > 0.6;
  const isHighPace = pace !== undefined ? pace >= 101 : pct > 0.55;

  // ATS stats are model-estimated from win% and recent form (not real ATS records)
  const vsSpread = Math.round((47 + pct * 8 + (streakType === "win" ? streak * 0.4 : -streak * 0.3)) * 10) / 10;
  const coverRate = Math.round(Math.max(35, Math.min(68, 44 + pct * 18 + (last10Wins >= 7 ? 4 : last10Wins <= 3 ? -4 : 0))));

  const trend: "hot" | "cold" | "neutral" = last10Wins >= 7 ? "hot" : last10Wins <= 3 ? "cold" : "neutral";

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
      vsSpreadEstimated: true,
      overUnderTrend: isOffensiveTeam && isHighPace ? "over" : isDefensiveTeam ? "under" : pct > 0.55 ? "over" : "balanced",
      rivalryBoost: Math.round(5 + pct * 15 + (streak >= 3 && streakType === "win" ? 4 : 0)),
      restAdvantage: Math.round(3 + pct * 10 + (homeWinPct - awayWinPct) * 5),
    },
    recentForm: {
      lastFive: `${last10Wins}-${10 - last10Wins} (L10)`,
      coverRate,
      coverRateEstimated: true,
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
      title: `Scheme Mismatch: ${homeName} Dominant`,
      description: `${game.homeTeam.displayName} (${game.homeTeam.record}) holds a record-based dominant advantage over ${game.awayTeam.displayName} (${game.awayTeam.record}).`,
      impact: "high",
      affectedLegs: [`${homeName} ML`, `${homeName} Spread`],
      confidence: Math.round(55 + homeWinPct * 35),
      dataSource: "ESPN Records",
    });
  }

  if (awayWinPct > 0.65 && homeWinPct < 0.4) {
    alerts.push({
      id: `${gameId}-away-edge`,
      type: "advantage",
      title: `Road Favorite Edge: ${awayName}`,
      description: `${game.awayTeam.displayName} (${game.awayTeam.record}) is the stronger team despite playing away. Road strength signals superior scheme adaptability.`,
      impact: "high",
      affectedLegs: [`${awayName} ML`, `${awayName} Spread`],
      confidence: Math.round(50 + awayWinPct * 35),
      dataSource: "ESPN Records",
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
        description: `${favored} is a heavy ${absSpread}-point favorite. Historically, blowout spreads have lower ATS cover rates — consider the total instead.`,
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
      title: `Coin-Flip Matchup: ${homeName} vs ${awayName}`,
      description: `Both teams have similar records (${game.homeTeam.record} vs ${game.awayTeam.record}). Home court advantage may be the key differentiator here.`,
      impact: "medium",
      affectedLegs: [`${homeName} ML`, `${awayName} ML`, `Game Total`],
      confidence: 62,
      dataSource: "ESPN Records",
    });
  }

  if (homeWinPct > 0.55 && game.status.state === "pre") {
    const homeAdv = Math.round(50 + homeWinPct * 10);
    const venueName = typeof game.venue === "object"
      ? (game.venue as any)?.fullName || (game.venue as any)?.name || "home"
      : game.venue || "home";
    alerts.push({
      id: `${gameId}-home-adv`,
      type: "advantage",
      title: `Home Edge: ${homeName} at ${venueName}`,
      description: `${game.homeTeam.displayName} has a ${game.homeTeam.record} record and estimated ${homeAdv}% home-court advantage factor.`,
      impact: homeWinPct > 0.65 ? "high" : "low",
      affectedLegs: [`${homeName} ML`],
      confidence: homeAdv,
      dataSource: "ESPN Records",
    });
  }

  if (realOdds?.homeMoneyline && realOdds?.awayMoneyline) {
    const homeML = realOdds.homeMoneyline;
    const awayML = realOdds.awayMoneyline;
    if (homeML > 0 && homeWinPct > 0.55) {
      alerts.push({
        id: `${gameId}-value-home`,
        type: "advantage",
        title: `Value Spot: ${homeName} Underdog`,
        description: `${homeName} has a winning record (${game.homeTeam.record}) but the market has them as +${homeML} underdogs. Potential market inefficiency.`,
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
        title: `Value Spot: ${awayName} Underdog`,
        description: `${awayName} has a winning record (${game.awayTeam.record}) but is listed at +${awayML}. Market may be undervaluing their scheme quality.`,
        impact: "high",
        affectedLegs: [`${awayName} ML +${awayML}`],
        confidence: 72,
        dataSource: "The Odds API + ESPN",
      });
    }
  }

  return alerts;
}

// Match a cached SportEvent to an ESPN game by team name similarity
function matchOddsToGame(
  cachedEvents: SportEvent[],
  homeTeam: string,
  awayTeam: string
): { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number } | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const homeN = normalize(homeTeam);
  const awayN = normalize(awayTeam);

  for (const ev of cachedEvents) {
    const evHome = normalize(ev.homeTeam);
    const evAway = normalize(ev.awayTeam);

    const homeMatch = evHome.includes(homeN.slice(-6)) || homeN.includes(evHome.slice(-6));
    const awayMatch = evAway.includes(awayN.slice(-6)) || awayN.includes(evAway.slice(-6));

    if (homeMatch && awayMatch) {
      // Pull ML from the legs
      let homeMoneyline: number | undefined;
      let awayMoneyline: number | undefined;
      let spread: number | undefined;
      let total: number | undefined;

      for (const leg of ev.legs || []) {
        if (leg.market === "moneyline" || leg.market === "h2h") {
          if (normalize(leg.outcome).includes(homeN.slice(-5))) homeMoneyline = leg.odds;
          if (normalize(leg.outcome).includes(awayN.slice(-5))) awayMoneyline = leg.odds;
        }
        if (leg.market === "spreads" || leg.market === "spread") {
          if (normalize(leg.outcome).includes(homeN.slice(-5))) spread = leg.point;
        }
        if (leg.market === "totals" || leg.market === "over_under") {
          total = leg.point;
        }
      }

      if (homeMoneyline || awayMoneyline || spread || total) {
        return { homeMoneyline, awayMoneyline, spread, total };
      }

      // Try ev.odds if legs didn't yield results
      if ((ev as any).odds) {
        const o = (ev as any).odds;
        return {
          homeMoneyline: o.homeMoneyline,
          awayMoneyline: o.awayMoneyline,
          spread: o.spread,
          total: o.overUnder,
        };
      }
    }
  }
  return undefined;
}

// Match precomputed picks to a game
function findLinkedPicks(
  sport: string,
  homeTeam: string,
  awayTeam: string
): LinkedPickData[] {
  try {
    const snapshot = getPrecomputedCache(sport as any);
    if (!snapshot?.picks) return [];

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    const homeN = normalize(homeTeam);
    const awayN = normalize(awayTeam);

    return snapshot.picks
      .filter(p => {
        const pHome = normalize(p.homeTeam || "");
        const pAway = normalize(p.awayTeam || "");
        const pGame = normalize(p.game || "");
        return (
          (pHome.includes(homeN.slice(-5)) || homeN.includes(pHome.slice(-5))) &&
          (pAway.includes(awayN.slice(-5)) || awayN.includes(pAway.slice(-5)))
        ) || (
          pGame.includes(homeN.slice(-5)) && pGame.includes(awayN.slice(-5))
        );
      })
      .slice(0, 3)
      .map(p => ({
        grade: p.grade,
        confidence: p.confidence,
        pick: p.pick,
        betType: p.betType,
        recommendation: p.recommendation,
        winProbability: p.winProbability,
        timing: p.timing,
      }));
  } catch {
    return [];
  }
}

export async function analyzeSchemes(sport: Sport): Promise<SchemeAnalysisResponse> {
  // Use wider window — 7 days ahead, include in-progress and recent completed (last 24h)
  const allGames = await getMultiDayScoreboard(sport, 7);

  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  // Include: upcoming + live + recently completed (last 24h)
  const games = allGames.filter(g => {
    if (g.status.state === "pre" || g.status.state === "in") return true;
    if (g.status.state === "post") {
      const gameMs = new Date(g.date).getTime();
      return gameMs >= twentyFourHoursAgo;
    }
    return false;
  }).slice(0, 12); // Cap at 12 games to keep response fast

  const teamSchemes: TeamSchemeData[] = [];
  const coachProfiles: CoachProfileData[] = [];
  const allAlerts: SchemeAlertData[] = [];
  const matchupAnalysis: MatchupAnalysisData[] = [];
  const seenTeams = new Set<string>();
  const dataSources = new Set<string>(["ESPN"]);
  let picksLinked = 0;

  // Load BDL enriched data for NBA — one call, no per-game fetching
  let bdlTeams: BDLEnrichedTeamData[] = [];
  if (sport === "NBA" && isBDLAvailable()) {
    try {
      bdlTeams = await getEnrichedTeamData();
      if (bdlTeams.length > 0) dataSources.add("BallDontLie");
    } catch {}
  }

  // Load BDL NFL stats (paid API — primary for NFL)
  let nflBDLTeams: BDLNFLTeamData[] = [];
  if (sport === "NFL" && isBDLNFLAvailable()) {
    try {
      nflBDLTeams = await getNFLTeamStatsBDL();
      if (nflBDLTeams.length > 0) dataSources.add("BallDontLie NFL");
    } catch {}
  }

  // Load NHL Official API stats (free, no key)
  let nhlTeamStats: NHLTeamStats[] = [];
  if (sport === "NHL") {
    try {
      nhlTeamStats = await getNHLTeamStats();
      if (nhlTeamStats.length > 0) dataSources.add("NHL Stats API");
    } catch {}
  }

  // Load MLB Official API stats (free, no key)
  let mlbTeamStats: MLBTeamStats[] = [];
  if (sport === "MLB") {
    try {
      mlbTeamStats = await getMLBTeamStats();
      if (mlbTeamStats.length > 0) dataSources.add("MLB Stats API");
    } catch {}
  }

  // Load cached odds for the whole sport once — no per-game API calls
  let cachedEvents: SportEvent[] = [];
  try {
    cachedEvents = getOddsForSport(sport);
    if (cachedEvents.length > 0) dataSources.add("The Odds API");
  } catch {}

  const oddsFromCache = cachedEvents.length > 0;

  function findBDL(teamName: string): BDLEnrichedTeamData | undefined {
    if (!bdlTeams.length) return undefined;
    const lower = teamName.toLowerCase();
    return bdlTeams.find(t =>
      lower.includes(t.teamName.toLowerCase()) ||
      t.teamName.toLowerCase().includes(lower.split(" ").pop()?.toLowerCase() || "") ||
      lower.includes(t.abbreviation.toLowerCase())
    );
  }

  function findNFLBDL(teamName: string): BDLNFLTeamData | undefined {
    if (!nflBDLTeams.length) return undefined;
    const lower = teamName.toLowerCase();
    const lastWord = lower.split(" ").pop() || "";
    return nflBDLTeams.find(t =>
      lower.includes(t.teamName.toLowerCase()) ||
      t.teamName.toLowerCase().includes(lastWord) ||
      t.abbreviation.toLowerCase() === lower.split(" ").pop()?.toLowerCase() ||
      lower.includes(t.abbreviation.toLowerCase())
    );
  }

  function findNHL(teamName: string): NHLTeamStats | undefined {
    if (!nhlTeamStats.length) return undefined;
    return findNHLTeam(teamName);
  }

  function findMLB(teamName: string): MLBTeamStats | undefined {
    if (!mlbTeamStats.length) return undefined;
    return findMLBTeam(teamName);
  }

  function buildStats(
    teamData: { team: ESPNTeam; record: string; parsed: { wins: number; losses: number; pct: number } },
    bdl?: BDLEnrichedTeamData,
    nhl?: NHLTeamStats,
    mlb?: MLBTeamStats,
    nfl?: BDLNFLTeamData
  ): SchemeStats {
    const total = teamData.parsed.wins + teamData.parsed.losses;
    const homeGames = Math.round(total * 0.5);
    const homeWins = bdl?.homeWins ?? Math.round(teamData.parsed.pct * homeGames * 1.08);
    const homeLosses = bdl?.homeLosses ?? Math.max(0, homeGames - homeWins);
    const awayWins = bdl?.awayWins ?? (teamData.parsed.wins - homeWins);
    const awayLosses = bdl?.awayLosses ?? Math.max(0, total - homeGames - awayWins);
    const homeTotal = homeWins + homeLosses;
    const awayTotal = awayWins + awayLosses;

    return {
      pace: bdl?.pace,
      offRating: bdl?.offRating,
      defRating: bdl?.defRating,
      avgPts: bdl?.avgPts,
      avgAst: bdl?.avgAst,
      fg3Pct: bdl?.fg3Pct,
      last10Wins: bdl?.last10Wins,
      homeWinPct: homeTotal > 0 ? Math.min(0.95, homeWins / homeTotal) : teamData.parsed.pct + 0.05,
      awayWinPct: awayTotal > 0 ? Math.min(0.90, awayWins / awayTotal) : Math.max(0.05, teamData.parsed.pct - 0.05),
      streak: bdl?.streak,
      streakType: bdl?.streakType,
      // NHL Official API stats
      goalsForPG: nhl?.goalsForPerGame,
      goalsAgainstPG: nhl?.goalsAgainstPerGame,
      powerPlayPct: nhl?.powerPlayPct !== undefined ? nhl.powerPlayPct * 100 : undefined,
      penaltyKillPct: nhl?.penaltyKillPct !== undefined ? nhl.penaltyKillPct * 100 : undefined,
      shotsPG: nhl?.shotsForPerGame,
      shotsAgainstPG: nhl?.shotsAgainstPerGame,
      faceoffWinPct: nhl?.faceoffWinPct !== undefined ? nhl.faceoffWinPct * 100 : undefined,
      // MLB Official API stats
      era: mlb?.era,
      whip: mlb?.whip,
      runsScored: mlb?.runsScored,
      runsAllowed: mlb?.runsAllowed,
      strikeoutsPer9: mlb?.strikeoutsPer9,
      walksPer9: mlb?.walksPer9,
      // NFL BDL paid stats
      passingYPG: nfl?.passingYardsPerGame,
      rushingYPG: nfl?.rushingYardsPerGame,
      pointsPerGame: nfl?.pointsPerGame,
      pointsAllowedPerGame: nfl?.pointsAllowedPerGame,
      turnoverDiff: nfl?.turnoverDifferential,
      thirdDownPct: nfl?.thirdDownPct,
      qbRating: nfl?.qbRating,
      oppPassingYPG: nfl?.oppPassingYardsPerGame,
      oppRushingYPG: nfl?.oppRushingYardsPerGame,
    };
  }

  for (const game of games) {
    const homeRecord = game.homeTeam.record || "0-0";
    const awayRecord = game.awayTeam.record || "0-0";
    const homeParsed = parseRecord(homeRecord);
    const awayParsed = parseRecord(awayRecord);

    const homeBDL = findBDL(game.homeTeam.displayName);
    const awayBDL = findBDL(game.awayTeam.displayName);
    const homeNHL = findNHL(game.homeTeam.displayName);
    const awayNHL = findNHL(game.awayTeam.displayName);
    const homeMLB = findMLB(game.homeTeam.displayName);
    const awayMLB = findMLB(game.awayTeam.displayName);
    const homeNFLBDL = sport === "NFL" ? findNFLBDL(game.homeTeam.displayName) : undefined;
    const awayNFLBDL = sport === "NFL" ? findNFLBDL(game.awayTeam.displayName) : undefined;

    // Use cached odds — no new API calls
    const realOdds = matchOddsToGame(
      cachedEvents,
      game.homeTeam.displayName,
      game.awayTeam.displayName
    );

    const homeTeamData = { team: game.homeTeam, record: homeRecord, parsed: homeParsed };
    const awayTeamData = { team: game.awayTeam, record: awayRecord, parsed: awayParsed };

    const homeStats = buildStats(homeTeamData, homeBDL, homeNHL, homeMLB, homeNFLBDL);
    const awayStats = buildStats(awayTeamData, awayBDL, awayNHL, awayMLB, awayNFLBDL);

    for (const [teamData, bdl, stats, nflBDL] of [
      [homeTeamData, homeBDL, homeStats, homeNFLBDL] as const,
      [awayTeamData, awayBDL, awayStats, awayNFLBDL] as const,
    ]) {
      if (seenTeams.has(teamData.team.id)) continue;
      seenTeams.add(teamData.team.id);

      const offScheme = getOffensiveScheme(sport, teamData.parsed.pct, teamData.team.id, stats);
      const defScheme = getDefensiveScheme(sport, teamData.parsed.pct, teamData.team.id, stats);

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
        dataSource: nflBDL
          ? "ESPN + BallDontLie NFL"
          : bdl
          ? "ESPN + BallDontLie"
          : stats.goalsForPG !== undefined
          ? "ESPN + NHL Stats API"
          : stats.era !== undefined
          ? "ESPN + MLB Stats API"
          : "ESPN",
      });

      const roster = getRosterFromCacheById(sport, teamData.team.id);
      if (roster && roster.coach.length > 0) {
        const coach = roster.coach[0];
        coachProfiles.push(deriveCoachProfile(coach, roster.team, sport, teamData.record, stats));
      }
    }

    const gameAlerts = generateMatchupAlerts(game, homeParsed.pct, awayParsed.pct, realOdds);
    allAlerts.push(...gameAlerts);

    // Scheme clash detection
    const homeOffScheme = getOffensiveScheme(sport, homeParsed.pct, game.homeTeam.id, homeStats);
    const homeDefScheme = getDefensiveScheme(sport, homeParsed.pct, game.homeTeam.id, homeStats);
    const awayOffScheme = getOffensiveScheme(sport, awayParsed.pct, game.awayTeam.id, awayStats);
    const awayDefScheme = getDefensiveScheme(sport, awayParsed.pct, game.awayTeam.id, awayStats);
    const schemeClash = detectSchemeClash(
      sport,
      homeOffScheme.name, homeDefScheme.name,
      awayOffScheme.name, awayDefScheme.name
    );

    const diffPct = homeParsed.pct - awayParsed.pct;
    const schemeAdvantage: "home" | "away" | "even" =
      diffPct > 0.1 ? "home" : diffPct < -0.1 ? "away" : "even";

    const keyFactors: string[] = [];
    keyFactors.push(`${game.homeTeam.shortDisplayName}: ${homeRecord} (${Math.round(homeParsed.pct * 100)}% win rate)`);
    keyFactors.push(`${game.awayTeam.shortDisplayName}: ${awayRecord} (${Math.round(awayParsed.pct * 100)}% win rate)`);

    const venueRaw = game.venue as any;
    const venueName = venueRaw?.fullName || venueRaw?.name || (typeof venueRaw === "string" ? venueRaw : null);
    if (venueName) {
      const city = venueRaw?.city || venueRaw?.address?.city || "";
      keyFactors.push(`Venue: ${venueName}${city ? `, ${city}` : ""}`);
    }

    if (realOdds?.spread !== undefined) {
      const favored = realOdds.spread < 0 ? game.homeTeam.shortDisplayName : game.awayTeam.shortDisplayName;
      keyFactors.push(`Spread: ${favored} ${realOdds.spread < 0 ? realOdds.spread : "+" + Math.abs(realOdds.spread)}`);
    }
    if (realOdds?.total !== undefined) {
      keyFactors.push(`Total: O/U ${realOdds.total}`);
    }

    if (game.leaders && game.leaders.length > 0) {
      for (const leader of game.leaders.slice(0, 2)) {
        keyFactors.push(`${leader.team} leader: ${leader.playerName} — ${leader.category} (${leader.value})`);
      }
    }

    // Add home/away split notes from BDL if available
    if (homeBDL?.homeWins !== undefined && homeBDL?.homeLosses !== undefined) {
      const homeHomePct = Math.round((homeBDL.homeWins / (homeBDL.homeWins + homeBDL.homeLosses)) * 100);
      keyFactors.push(`${game.homeTeam.shortDisplayName} at home: ${homeBDL.homeWins}-${homeBDL.homeLosses} (${homeHomePct}%)`);
    }
    if (awayBDL?.awayWins !== undefined && awayBDL?.awayLosses !== undefined) {
      const awayAwayPct = Math.round((awayBDL.awayWins / (awayBDL.awayWins + awayBDL.awayLosses)) * 100);
      keyFactors.push(`${game.awayTeam.shortDisplayName} on road: ${awayBDL.awayWins}-${awayBDL.awayLosses} (${awayAwayPct}%)`);
    }

    // Link to precomputed picks for this matchup
    const linkedPicks = findLinkedPicks(sport, game.homeTeam.displayName, game.awayTeam.displayName);
    picksLinked += linkedPicks.length;

    const predictionImpact = Math.round(Math.abs(diffPct) * 25 + (linkedPicks.length > 0 ? 5 : 0));

    const oddsForMatchup = realOdds ? {
      spread: realOdds.spread !== undefined ? `${realOdds.spread > 0 ? '+' : ''}${realOdds.spread}` : undefined,
      overUnder: realOdds.total,
      homeMoneyline: realOdds.homeMoneyline,
      awayMoneyline: realOdds.awayMoneyline,
    } : (game.odds ? game.odds : undefined);

    matchupAnalysis.push({
      matchup: game.shortName || `${game.awayTeam.shortDisplayName} @ ${game.homeTeam.shortDisplayName}`,
      gameId: game.id,
      homeTeam: game.homeTeam.displayName,
      awayTeam: game.awayTeam.displayName,
      homeRecord,
      awayRecord,
      gameTime: game.date,
      gameState: game.status.state as "pre" | "in" | "post",
      venue: venueName || undefined,
      broadcast: game.broadcast,
      schemeAdvantage,
      keyFactors,
      schemeClash,
      predictionImpact,
      alerts: gameAlerts,
      odds: oddsForMatchup,
      linkedPicks,
      dataSource: realOdds ? "ESPN + The Odds API" : "ESPN",
    });
  }

  allAlerts.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
  });

  // Sort matchups: live first, then upcoming by time, then recent completed
  matchupAnalysis.sort((a, b) => {
    const order = { in: 0, pre: 1, post: 2 };
    const stateOrder = (order[a.gameState] ?? 3) - (order[b.gameState] ?? 3);
    if (stateOrder !== 0) return stateOrder;
    return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
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
      gamesAnalyzed: games.length,
      teamsAnalyzed: seenTeams.size,
      generatedAt: new Date().toISOString(),
      dataSources: Array.from(dataSources),
      oddsFromCache,
      picksLinked,
      transparencyNote: "Scheme names derived from live ESPN records, BallDontLie stats (NBA), and team-specific signals. ATS coach stats are intelligence-projected from win% and form — not real ATS records.",
    },
  };
}
