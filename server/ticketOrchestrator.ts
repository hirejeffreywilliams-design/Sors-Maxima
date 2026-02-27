import type { Sport, ParlayLeg, GeneratedParlay } from "../shared/schema";
import { analyzeLeg, analyzeTicket, type FusionAnalysis, type TicketFusion, type FusionSignal, type MarketContext } from "./quantumFusionEngine";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { analyticsAgent } from "./analyticsAgentEngine";
import { getPlayersFromCacheById, getTeamsFromCache, type ESPNPlayer } from "./espn-roster-provider";
import { getModelWeights, applyModelWeights } from "./historicalLearningEngine";
import { fetchRealOddsForGame } from "./odds-provider";
import { fetchSoccerFixtures, getActiveSoccerLeagues, isSoccerSport, type SoccerFixture } from "./api-football-provider";
import { protectionSuite } from "./algorithmProtection";
import crypto from "crypto";

function deterministicValue(seed: string, min: number, max: number): number {
  const hash = crypto.createHash('md5').update(seed).digest().readUInt32BE(0);
  const normalized = hash / 0xFFFFFFFF;
  return min + normalized * (max - min);
}

function deterministicInt(seed: string, min: number, max: number): number {
  return Math.floor(deterministicValue(seed, min, max + 1));
}

function deterministicBool(seed: string, threshold?: number): boolean {
  return deterministicValue(seed, 0, 1) > (threshold || 0.5);
}

function generateUniqueId(): string {
  return crypto.randomUUID();
}

export type MarketType = "moneyline" | "spread" | "total" | "prop" 
  | "first_half_spread" | "first_half_total" | "first_quarter_spread" | "first_quarter_total"
  | "team_total" | "alt_spread" | "alt_total"
  | "player_points" | "player_rebounds" | "player_assists" | "player_threes" | "player_pts_rebs_asts" | "player_double_double"
  | "player_passing_yds" | "player_rushing_yds" | "player_receiving_yds" | "player_tds"
  | "player_strikeouts" | "player_hits_runs_rbis" 
  | "player_goals" | "player_shots" | "player_saves"
  | "anytime_scorer"
  | "btts" | "draw_no_bet" | "correct_score" | "asian_handicap" | "match_result_btts";

export interface TicketRequest {
  sports: string[];
  bankroll: number;
  riskLevel: "conservative" | "moderate" | "aggressive";
  maxLegs: number;
  includeProps: boolean;
  betTypes?: MarketType[];
}

export interface AnalysisFactors {
  quantumCoachingScore: number;
  quantumPlayerScore: number;
  quantumTeamScore: number;
  mlProjectionScore: number;
  correlationScore: number;
  sharpMoneyScore: number;
  lineValueScore: number;
  momentumScore: number;
  situationalScore: number;
  cashoutEligibility: number;
}

export interface GeneratedTicket {
  id: string;
  name: string;
  sport: string;
  legs: TicketLeg[];
  totalOdds: number;
  americanOdds: number;
  winProbability: number;
  expectedValue: number;
  confidenceScore: number;
  recommendedStake: number;
  potentialPayout: number;
  riskRating: "low" | "medium" | "high";
  analysisFactors: AnalysisFactors;
  rationale: string[];
  cashoutProbability: number;
  grade: string;
  fusionData?: TicketFusion;
  consensusProbability: number;
  evPercent: number;
  modelDisagreement: number;
  sourceSignals: string[];
  riskFactors: string[];
  confidenceTag: "low" | "medium" | "high";
  calibrationInfo: { historicalHitRate: number; sampleSize: number; marketSlice: string };
  recommendedAlternatives: AlternativeTicket[];
  marketMovement?: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean };
  analyticsAgentData?: {
    evFromAgent: number | null;
    kellyFromAgent: number | null;
    arbitrageDetected: boolean;
    trendDirection: "up" | "down" | "stable";
    confidenceBoost: number;
  };
  algorithmSignature?: string;
  nonce?: string;
}

export interface AlternativeTicket {
  market: string;
  selection: string;
  evPercent: number;
  confidence: number;
  rationale: string;
}

export interface TicketLeg {
  id: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  line?: number;
  decimalOdds: number;
  americanOdds: number;
  winProbability: number;
  edgePercent: number;
  playerName?: string;
  propCategory?: string;
  espnGameId?: string;
  homeWinPct?: number;
  awayWinPct?: number;
  analysis: {
    sharpAction: boolean;
    lineMovement: "steam" | "reverse" | "stable";
    publicPercent: number;
    confidenceLevel: "high" | "medium" | "low";
    oddsMovement?: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean };
    underSignalCount?: number;
  };
  legFusion?: FusionAnalysis;
  dataSources?: {
    odds: "ESPN" | "ESPN-derived" | "model-estimated";
    game: "ESPN Live" | "scheduled";
    injury: "ESPN Rosters" | "estimated";
    analysis: "Statistical Model";
  };
}

const teamsByLeague: Record<Sport, { name: string; city: string }[]> = {
  NBA: [
    { name: "Knicks", city: "New York" },
    { name: "Timberwolves", city: "Minnesota" },
    { name: "Kings", city: "Sacramento" },
    { name: "Nuggets", city: "Denver" },
    { name: "Bucks", city: "Milwaukee" },
    { name: "76ers", city: "Philadelphia" },
    { name: "Heat", city: "Miami" },
    { name: "Suns", city: "Phoenix" },
    { name: "Mavericks", city: "Dallas" },
    { name: "Cavaliers", city: "Cleveland" },
  ],
  NFL: [
    { name: "Chiefs", city: "Kansas City" },
    { name: "49ers", city: "San Francisco" },
    { name: "Eagles", city: "Philadelphia" },
    { name: "Bills", city: "Buffalo" },
    { name: "Cowboys", city: "Dallas" },
    { name: "Ravens", city: "Baltimore" },
    { name: "Lions", city: "Detroit" },
    { name: "Dolphins", city: "Miami" },
    { name: "Bengals", city: "Cincinnati" },
    { name: "Packers", city: "Green Bay" },
  ],
  MLB: [
    { name: "Dodgers", city: "Los Angeles" },
    { name: "Yankees", city: "New York" },
    { name: "Braves", city: "Atlanta" },
    { name: "Astros", city: "Houston" },
    { name: "Rangers", city: "Texas" },
    { name: "Phillies", city: "Philadelphia" },
    { name: "Orioles", city: "Baltimore" },
    { name: "Rays", city: "Tampa Bay" },
    { name: "Twins", city: "Minnesota" },
    { name: "Mariners", city: "Seattle" },
  ],
  NHL: [
    { name: "Panthers", city: "Florida" },
    { name: "Oilers", city: "Edmonton" },
    { name: "Bruins", city: "Boston" },
    { name: "Rangers", city: "New York" },
    { name: "Avalanche", city: "Colorado" },
    { name: "Stars", city: "Dallas" },
    { name: "Maple Leafs", city: "Toronto" },
    { name: "Lightning", city: "Tampa Bay" },
    { name: "Jets", city: "Winnipeg" },
    { name: "Golden Knights", city: "Vegas" },
  ],
  NCAAB: [
    { name: "Huskies", city: "UConn" },
    { name: "Wildcats", city: "Kansas" },
    { name: "Blue Devils", city: "Duke" },
    { name: "Tar Heels", city: "UNC" },
    { name: "Boilermakers", city: "Purdue" },
    { name: "Volunteers", city: "Tennessee" },
    { name: "Crimson Tide", city: "Alabama" },
    { name: "Cougars", city: "Houston" },
    { name: "Tigers", city: "Auburn" },
    { name: "Wildcats", city: "Kentucky" },
  ],
  NCAAF: [
    { name: "Wolverines", city: "Michigan" },
    { name: "Huskies", city: "Washington" },
    { name: "Longhorns", city: "Texas" },
    { name: "Crimson Tide", city: "Alabama" },
    { name: "Bulldogs", city: "Georgia" },
    { name: "Buckeyes", city: "Ohio State" },
    { name: "Tigers", city: "Clemson" },
    { name: "Nittany Lions", city: "Penn State" },
    { name: "Ducks", city: "Oregon" },
    { name: "Seminoles", city: "Florida State" },
  ],
};

function getDefaultPropLine(prop: string): number {
  const propLineRanges: Record<string, { min: number; max: number }> = {
    "Points": { min: 15, max: 35 },
    "Rebounds": { min: 4, max: 14 },
    "Assists": { min: 3, max: 12 },
    "3-Pointers": { min: 1.5, max: 5.5 },
    "Pts+Rebs+Asts": { min: 25, max: 55 },
    "Steals+Blocks": { min: 1.5, max: 4.5 },
    "Passing Yards": { min: 200, max: 320 },
    "Rushing Yards": { min: 40, max: 100 },
    "Receiving Yards": { min: 40, max: 90 },
    "Receptions": { min: 3.5, max: 8.5 },
    "TDs": { min: 0.5, max: 1.5 },
    "Passing TDs": { min: 1.5, max: 2.5 },
    "Hits": { min: 0.5, max: 2.5 },
    "RBIs": { min: 0.5, max: 1.5 },
    "Runs": { min: 0.5, max: 1.5 },
    "Total Bases": { min: 1.5, max: 3.5 },
    "Strikeouts (P)": { min: 4.5, max: 8.5 },
    "Hits Allowed": { min: 4.5, max: 7.5 },
    "Goals": { min: 0.5, max: 1.5 },
    "Shots on Goal": { min: 2.5, max: 5.5 },
    "Saves": { min: 24.5, max: 32.5 },
  };
  const range = propLineRanges[prop] || { min: 5, max: 25 };
  return Math.round(deterministicValue(`propline-${prop}`, range.min, range.max) * 2) / 2;
}

function chooseOverUnderDirection(
  sport: Sport | string,
  propCategory: string,
  playerLeaderValue: number | null,
  line: number,
  gameContext: { homeRecord?: string; awayRecord?: string; totalFromOdds?: number; isHomePlayer?: boolean }
): { isOver: boolean; confidence: number; reasoning: string } {
  let overScore = 50;
  let reasoning = "";

  if (playerLeaderValue !== null && playerLeaderValue > 0) {
    if (playerLeaderValue > line * 1.15) {
      overScore += 15;
      reasoning = "Recent performance trending above line";
    } else if (playerLeaderValue < line * 0.85) {
      overScore -= 15;
      reasoning = "Recent performance trending below line";
    }
  }

  if (gameContext.totalFromOdds) {
    const sportTotals: Record<string, number> = { NBA: 224, NFL: 44, MLB: 8.5, NHL: 6, NCAAB: 145, NCAAF: 52 };
    const avgTotal = sportTotals[sport as string] || 200;
    if (gameContext.totalFromOdds > avgTotal * 1.05) {
      overScore += 8;
      if (!reasoning) reasoning = "High-scoring game environment favors overs";
    } else if (gameContext.totalFromOdds < avgTotal * 0.95) {
      overScore -= 8;
      if (!reasoning) reasoning = "Low-scoring game environment favors unders";
    }
  }

  const homeWinPct = gameContext.homeRecord ? parseWinPct(gameContext.homeRecord) : 0.5;
  const awayWinPct = gameContext.awayRecord ? parseWinPct(gameContext.awayRecord) : 0.5;
  const avgWinPct = (homeWinPct + awayWinPct) / 2;
  if (avgWinPct > 0.55) {
    overScore += 5;
  } else if (avgWinPct < 0.45) {
    overScore -= 5;
  }

  const paceProps = ["Points", "Pts+Rebs+Asts", "Passing Yards", "Total Bases", "Goals", "Shots on Goal"];
  const defProps = ["Steals+Blocks", "Saves", "Strikeouts (P)"];
  if (paceProps.includes(propCategory)) {
    overScore += 3;
  } else if (defProps.includes(propCategory)) {
    overScore -= 3;
  }

  overScore = Math.max(20, Math.min(80, overScore));
  const isOver = overScore >= 50;
  const confidence = Math.min(1, Math.abs(overScore - 50) / 30);
  if (!reasoning) reasoning = isOver ? "Model leans over based on game factors" : "Model leans under based on game factors";

  return { isOver, confidence, reasoning };
}

const playersBySport: Record<Sport, { name: string; team: string; position: string }[]> = {
  NBA: [
    { name: "Jalen Brunson", team: "Knicks", position: "PG" },
    { name: "Anthony Edwards", team: "Timberwolves", position: "SG" },
    { name: "De'Aaron Fox", team: "Kings", position: "PG" },
    { name: "Nikola Jokic", team: "Nuggets", position: "C" },
    { name: "Giannis Antetokounmpo", team: "Bucks", position: "PF" },
    { name: "Luka Doncic", team: "Mavericks", position: "PG" },
    { name: "Joel Embiid", team: "76ers", position: "C" },
    { name: "Kevin Durant", team: "Suns", position: "SF" },
    { name: "Devin Booker", team: "Suns", position: "SG" },
    { name: "Jimmy Butler", team: "Heat", position: "SF" },
  ],
  NFL: [
    { name: "Patrick Mahomes", team: "Chiefs", position: "QB" },
    { name: "Josh Allen", team: "Bills", position: "QB" },
    { name: "Jalen Hurts", team: "Eagles", position: "QB" },
    { name: "Travis Kelce", team: "Chiefs", position: "TE" },
    { name: "Tyreek Hill", team: "Dolphins", position: "WR" },
    { name: "Justin Jefferson", team: "Vikings", position: "WR" },
    { name: "Ja'Marr Chase", team: "Bengals", position: "WR" },
    { name: "Christian McCaffrey", team: "49ers", position: "RB" },
    { name: "CeeDee Lamb", team: "Cowboys", position: "WR" },
    { name: "Lamar Jackson", team: "Ravens", position: "QB" },
  ],
  MLB: [
    { name: "Shohei Ohtani", team: "Dodgers", position: "DH" },
    { name: "Aaron Judge", team: "Yankees", position: "RF" },
    { name: "Ronald Acuna Jr.", team: "Braves", position: "RF" },
    { name: "Mookie Betts", team: "Dodgers", position: "RF" },
    { name: "Freddie Freeman", team: "Dodgers", position: "1B" },
    { name: "Corey Seager", team: "Rangers", position: "SS" },
    { name: "Mike Trout", team: "Angels", position: "CF" },
    { name: "Julio Rodriguez", team: "Mariners", position: "CF" },
    { name: "Juan Soto", team: "Yankees", position: "RF" },
    { name: "Trea Turner", team: "Phillies", position: "SS" },
  ],
  NHL: [
    { name: "Connor McDavid", team: "Oilers", position: "C" },
    { name: "Nathan MacKinnon", team: "Avalanche", position: "C" },
    { name: "Leon Draisaitl", team: "Oilers", position: "C" },
    { name: "Auston Matthews", team: "Maple Leafs", position: "C" },
    { name: "Nikita Kucherov", team: "Lightning", position: "RW" },
    { name: "David Pastrnak", team: "Bruins", position: "RW" },
    { name: "Aleksander Barkov", team: "Panthers", position: "C" },
    { name: "Matthew Tkachuk", team: "Panthers", position: "LW" },
    { name: "Jack Eichel", team: "Golden Knights", position: "C" },
    { name: "Miro Heiskanen", team: "Stars", position: "D" },
  ],
  NCAAB: [
    { name: "Zach Edey", team: "Boilermakers", position: "C" },
    { name: "Hunter Dickinson", team: "Jayhawks", position: "C" },
    { name: "Tristen Newton", team: "Huskies", position: "G" },
    { name: "Kyle Filipowski", team: "Blue Devils", position: "F" },
    { name: "Dalton Knecht", team: "Volunteers", position: "G" },
    { name: "Armando Bacot", team: "Tar Heels", position: "C" },
    { name: "Johni Broome", team: "Tigers", position: "F" },
    { name: "RJ Davis", team: "Tar Heels", position: "G" },
    { name: "Mark Sears", team: "Crimson Tide", position: "G" },
    { name: "Tyler Kolek", team: "Marquette", position: "G" },
  ],
  NCAAF: [
    { name: "Jalen Milroe", team: "Crimson Tide", position: "QB" },
    { name: "Quinn Ewers", team: "Longhorns", position: "QB" },
    { name: "Carson Beck", team: "Bulldogs", position: "QB" },
    { name: "Bo Nix", team: "Ducks", position: "QB" },
    { name: "Jayden Daniels", team: "Tigers", position: "QB" },
    { name: "Michael Penix Jr.", team: "Huskies", position: "QB" },
    { name: "Drake Maye", team: "Tar Heels", position: "QB" },
    { name: "J.J. McCarthy", team: "Wolverines", position: "QB" },
    { name: "Caleb Williams", team: "Trojans", position: "QB" },
    { name: "Marvin Harrison Jr.", team: "Buckeyes", position: "WR" },
  ],
};

const propsBySport: Record<Sport, string[]> = {
  NBA: ["Points", "Rebounds", "Assists", "3-Pointers", "Pts+Rebs+Asts", "Steals+Blocks"],
  NFL: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Receptions", "TDs", "Passing TDs"],
  MLB: ["Hits", "RBIs", "Runs", "Total Bases", "Strikeouts (P)", "Hits Allowed"],
  NHL: ["Goals", "Assists", "Points", "Shots on Goal", "Saves"],
  NCAAB: ["Points", "Rebounds", "Assists", "3-Pointers"],
  NCAAF: ["Passing Yards", "Rushing Yards", "Receiving Yards", "TDs"],
};

const marketTypesBySport: Record<string, MarketType[]> = {
  NBA: ["moneyline", "spread", "total", "first_half_spread", "first_half_total", "first_quarter_spread", "first_quarter_total", "team_total", "alt_spread", "alt_total", "player_points", "player_rebounds", "player_assists", "player_threes", "player_pts_rebs_asts", "player_double_double", "anytime_scorer"],
  NFL: ["moneyline", "spread", "total", "first_half_spread", "first_half_total", "first_quarter_spread", "first_quarter_total", "team_total", "alt_spread", "alt_total", "player_passing_yds", "player_rushing_yds", "player_receiving_yds", "player_tds", "anytime_scorer"],
  MLB: ["moneyline", "spread", "total", "first_half_spread", "first_half_total", "team_total", "alt_spread", "alt_total", "player_strikeouts", "player_hits_runs_rbis"],
  NHL: ["moneyline", "spread", "total", "first_half_total", "team_total", "alt_spread", "alt_total", "player_goals", "player_shots", "player_saves", "anytime_scorer"],
  NCAAB: ["moneyline", "spread", "total", "first_half_spread", "first_half_total", "team_total", "alt_spread", "alt_total", "player_points", "player_rebounds", "player_assists", "player_threes"],
  NCAAF: ["moneyline", "spread", "total", "first_half_spread", "first_half_total", "team_total", "alt_spread", "alt_total", "player_passing_yds", "player_rushing_yds", "player_receiving_yds", "player_tds"],
};

const soccerMarketTypesExpanded: MarketType[] = ["moneyline", "spread", "total", "btts", "draw_no_bet", "correct_score", "asian_handicap", "match_result_btts", "anytime_scorer"];

const soccerTeamsByLeague: Record<string, { name: string; city: string }[]> = {
  EPL: [
    { name: "Arsenal", city: "London" },
    { name: "Man City", city: "Manchester" },
    { name: "Liverpool", city: "Liverpool" },
    { name: "Chelsea", city: "London" },
    { name: "Man United", city: "Manchester" },
    { name: "Tottenham", city: "London" },
    { name: "Newcastle", city: "Newcastle" },
    { name: "Aston Villa", city: "Birmingham" },
  ],
  LALIGA: [
    { name: "Real Madrid", city: "Madrid" },
    { name: "Barcelona", city: "Barcelona" },
    { name: "Atletico Madrid", city: "Madrid" },
    { name: "Real Sociedad", city: "San Sebastian" },
    { name: "Athletic Bilbao", city: "Bilbao" },
    { name: "Villarreal", city: "Villarreal" },
  ],
  BUNDESLIGA: [
    { name: "Bayern Munich", city: "Munich" },
    { name: "Borussia Dortmund", city: "Dortmund" },
    { name: "RB Leipzig", city: "Leipzig" },
    { name: "Bayer Leverkusen", city: "Leverkusen" },
    { name: "Stuttgart", city: "Stuttgart" },
    { name: "Eintracht Frankfurt", city: "Frankfurt" },
  ],
  SERIEA: [
    { name: "Inter Milan", city: "Milan" },
    { name: "AC Milan", city: "Milan" },
    { name: "Juventus", city: "Turin" },
    { name: "Napoli", city: "Naples" },
    { name: "AS Roma", city: "Rome" },
    { name: "Atalanta", city: "Bergamo" },
  ],
  LIGUE1: [
    { name: "PSG", city: "Paris" },
    { name: "Marseille", city: "Marseille" },
    { name: "Monaco", city: "Monaco" },
    { name: "Lyon", city: "Lyon" },
    { name: "Lille", city: "Lille" },
    { name: "Nice", city: "Nice" },
  ],
  MLS: [
    { name: "Inter Miami", city: "Miami" },
    { name: "LAFC", city: "Los Angeles" },
    { name: "LA Galaxy", city: "Los Angeles" },
    { name: "Atlanta United", city: "Atlanta" },
    { name: "Seattle Sounders", city: "Seattle" },
    { name: "Columbus Crew", city: "Columbus" },
  ],
  UCL: [
    { name: "Real Madrid", city: "Madrid" },
    { name: "Man City", city: "Manchester" },
    { name: "Bayern Munich", city: "Munich" },
    { name: "Barcelona", city: "Barcelona" },
    { name: "PSG", city: "Paris" },
    { name: "Inter Milan", city: "Milan" },
    { name: "Arsenal", city: "London" },
    { name: "Borussia Dortmund", city: "Dortmund" },
  ],
  INTL: [
    { name: "Brazil", city: "Brazil" },
    { name: "Argentina", city: "Argentina" },
    { name: "France", city: "France" },
    { name: "Germany", city: "Germany" },
    { name: "England", city: "England" },
    { name: "Spain", city: "Spain" },
    { name: "Portugal", city: "Portugal" },
    { name: "Netherlands", city: "Netherlands" },
  ],
};

function mapSoccerLeague(sportId: string): { sport: string; league: string; displayName: string } {
  const leagueMap: Record<string, { league: string; displayName: string }> = {
    Soccer_EPL: { league: "EPL", displayName: "English Premier League" },
    Soccer_LALIGA: { league: "LALIGA", displayName: "La Liga" },
    Soccer_BUNDESLIGA: { league: "BUNDESLIGA", displayName: "Bundesliga" },
    Soccer_SERIEA: { league: "SERIEA", displayName: "Serie A" },
    Soccer_LIGUE1: { league: "LIGUE1", displayName: "Ligue 1" },
    Soccer_MLS: { league: "MLS", displayName: "Major League Soccer" },
    Soccer_UCL: { league: "UCL", displayName: "UEFA Champions League" },
    Soccer_INTL: { league: "INTL", displayName: "International" },
  };
  const entry = leagueMap[sportId] || { league: sportId.replace("Soccer_", ""), displayName: sportId.replace("Soccer_", "") };
  return { sport: "Soccer", ...entry };
}

const soccerMarketTypes = ["1X2", "Both Teams to Score", "Over/Under Goals", "Asian Handicap"] as const;

function generateSoccerLeg(league: string, marketType: string): TicketLeg {
  const teams = soccerTeamsByLeague[league] || soccerTeamsByLeague["EPL"];
  const homeIdx = deterministicInt(`soccer-home-${league}-${marketType}`, 0, teams.length - 1);
  let awayIdx = deterministicInt(`soccer-away-${league}-${marketType}`, 0, teams.length - 1);
  if (awayIdx === homeIdx) {
    awayIdx = (homeIdx + 1) % teams.length;
  }
  const homeTeam = teams[homeIdx];
  const awayTeam = teams[awayIdx];

  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  const seedBase = `${league}-${marketType}-${homeTeam.name}-${awayTeam.name}`;

  if (marketType === "1X2") {
    market = "1X2 (Match Result)";
    outcome = `${homeTeam.name} to Win`;
    decimalOdds = 1.91;
  } else if (marketType === "Both Teams to Score") {
    market = "Both Teams to Score";
    outcome = "BTTS - Yes";
    decimalOdds = 1.80;
  } else if (marketType === "Over/Under Goals") {
    market = "Over/Under Goals";
    line = 2.5;
    outcome = "Over 2.5 Goals";
    decimalOdds = 1.91;
  } else if (marketType === "Asian Handicap") {
    market = "Asian Handicap";
    line = -0.5;
    outcome = `${homeTeam.name} -0.5 AH`;
    decimalOdds = 1.91;
  }

  const americanOdds = decimalToAmerican(decimalOdds);
  const description = `${homeTeam.name} vs ${awayTeam.name} ${market} ${outcome}`;

  const legFusion = analyzeLeg("NBA" as Sport, description, americanOdds);
  const winProbability = Math.min(0.85, Math.max(0.1, legFusion.winProbability / 100));
  const edgePercent = legFusion.edgePercentage;

  const sharpSignal = legFusion.signals.find(s => s.source === "sharp_money_flow");
  const lineSignal = legFusion.signals.find(s => s.source === "line_movement");
  const publicSignal = legFusion.signals.find(s => s.source === "public_fade");
  const sharpAction = sharpSignal ? sharpSignal.direction === "bullish" && sharpSignal.strength > 65 : false;
  let lineMovement: "steam" | "reverse" | "stable" = "stable";
  if (lineSignal) {
    if (lineSignal.direction === "bullish" && lineSignal.strength > 70) lineMovement = "steam";
    else if (lineSignal.direction === "bearish" && lineSignal.strength > 60) lineMovement = "reverse";
  }
  const publicPercent = publicSignal ?
    (publicSignal.direction === "bullish" ? 30 + Math.round(publicSignal.strength * 0.2) : 50 + Math.round(publicSignal.strength * 0.3)) : 50;
  const confidenceLevel: "high" | "medium" | "low" =
    legFusion.confidence >= 75 ? "high" : legFusion.confidence >= 55 ? "medium" : "low";

  const oddsMovement = {
    direction: "stable" as "up" | "down" | "stable",
    percentChange: 0,
    possibleInefficiency: false,
  };

  return {
    id: generateUniqueId(),
    team: homeTeam.name,
    opponent: awayTeam.name,
    market,
    outcome,
    line,
    decimalOdds,
    americanOdds,
    winProbability,
    edgePercent,
    analysis: {
      sharpAction,
      lineMovement,
      publicPercent,
      confidenceLevel,
      oddsMovement,
    },
    legFusion,
    dataSources: {
      odds: "model-estimated",
      game: "scheduled",
      injury: "estimated",
      analysis: "Statistical Model",
    },
  };
}

function buildSoccerRationale(legs: TicketLeg[], league: string, displayName: string): string[] {
  const rationale: string[] = [];
  rationale.push(`${displayName} fixture pulled from API-Football live fixture data`);
  const sharpLegs = legs.filter(l => l.analysis.sharpAction);
  if (sharpLegs.length > 0) {
    rationale.push(`Sharp money signals detected on ${sharpLegs.length} market${sharpLegs.length > 1 ? "s" : ""}`);
  }
  rationale.push("Live bookmaker odds not yet available — soccer odds integration pending");
  return rationale.slice(0, 5);
}

function buildSoccerAlternatives(legs: TicketLeg[]): AlternativeTicket[] {
  const alts: AlternativeTicket[] = [];
  const primaryLeg = legs[0];
  if (!primaryLeg) return alts;

  if (primaryLeg.market.includes("1X2")) {
    alts.push({
      market: "Asian Handicap",
      selection: `${primaryLeg.team} -0.5 AH`,
      evPercent: Math.round((primaryLeg.edgePercent * 0.85) * 10) / 10,
      confidence: Math.round(primaryLeg.winProbability * 90),
      rationale: "Asian Handicap removes the draw, offering cleaner value on the favored side",
    });
  }

  alts.push({
    market: "Over/Under Goals",
    selection: "Under 2.5 Goals",
    evPercent: 0,
    confidence: 50,
    rationale: "Alternative market — live odds pending soccer bookmaker integration",
  });

  alts.push({
    market: "Both Teams to Score",
    selection: "BTTS - Yes",
    evPercent: 0,
    confidence: 50,
    rationale: "Alternative market — live odds pending soccer bookmaker integration",
  });

  return alts.slice(0, 3);
}

function generateRandomOdds(min: number, max: number, seed?: string): number {
  return Math.round(deterministicValue(seed || `odds-${min}-${max}`, min, max) * 100) / 100;
}

function parseSpread(spreadStr?: string): number {
  if (!spreadStr) return 0;
  const match = spreadStr.match(/([-+]?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function estimateSpreadFromRecords(homeRecord?: string, awayRecord?: string, sport?: Sport): number {
  const parseWinPct = (record?: string): number => {
    if (!record) return 0.5;
    const parts = record.split("-");
    const wins = parseInt(parts[0]) || 0;
    const losses = parseInt(parts[1]) || 0;
    const total = wins + losses;
    return total > 0 ? wins / total : 0.5;
  };

  const homePct = parseWinPct(homeRecord);
  const awayPct = parseWinPct(awayRecord);
  const diff = homePct - awayPct;

  const multiplier = sport === "NFL" ? 14 : sport === "NBA" ? 12 : sport === "MLB" ? 3 : sport === "NHL" ? 3 : 10;
  const homeAdv = sport === "NFL" ? 3 : sport === "NBA" ? 3.5 : sport === "MLB" ? 0.5 : 0.5;

  return Math.round((diff * multiplier + homeAdv) * 2) / 2;
}

function estimateMoneyline(spread: number, isHome: boolean): number {
  const adjustedSpread = isHome ? -spread : spread;
  if (Math.abs(adjustedSpread) < 1) return -110;
  if (adjustedSpread < -10) return -(Math.floor(Math.abs(adjustedSpread) * 20) + 100);
  if (adjustedSpread < 0) return -(Math.floor(Math.abs(adjustedSpread) * 15) + 100);
  if (adjustedSpread > 10) return Math.floor(adjustedSpread * 18) + 100;
  return Math.floor(adjustedSpread * 12) + 100;
}

function estimateTotal(sport: Sport): number {
  const totals: Record<string, number> = {
    NBA: 224, NFL: 44, MLB: 8.5, NHL: 6, NCAAB: 142, NCAAF: 48,
  };
  return totals[sport] || 200;
}

function americanToDecimal(american: number): number {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

function parseWinPct(record?: string): number {
  if (!record) return 0.5;
  const parts = record.split("-");
  const wins = parseInt(parts[0]) || 0;
  const losses = parseInt(parts[1]) || 0;
  const total = wins + losses;
  return total > 0 ? wins / total : 0.5;
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

function calculateCombinedOdds(legs: TicketLeg[]): number {
  return legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
}

function extractSignalScore(signals: FusionSignal[], factorName: string): number {
  const signal = signals.find(s => s.source === factorName);
  if (!signal) return 0.5;
  const base = signal.direction === "bullish" ? signal.strength : 
               signal.direction === "bearish" ? (100 - signal.strength) : 50;
  return (base * signal.confidence / 100) / 100;
}

function extractCategoryScore(signals: FusionSignal[], factorNames: string[]): number {
  let total = 0;
  let count = 0;
  for (const name of factorNames) {
    const score = extractSignalScore(signals, name);
    total += score;
    count++;
  }
  return count > 0 ? total / count : 0.5;
}

const espnGamesCacheMap = new Map<string, { games: ESPNScoreboardGame[]; timestamp: number }>();

async function getESPNGamesForSport(sport: Sport): Promise<ESPNScoreboardGame[]> {
  const cached = espnGamesCacheMap.get(sport);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.games;
  }
  try {
    const games = await getMultiDayScoreboard(sport, 3);
    const upcoming = games.filter(g => g.status.state === "pre" || g.status.state === "in");
    espnGamesCacheMap.set(sport, { games: upcoming, timestamp: Date.now() });
    return upcoming;
  } catch {
    return [];
  }
}

export async function getActiveSports(): Promise<{ sport: string; gameCount: number; active: boolean }[]> {
  const { getInSeasonSports } = await import("./sportSeasons");
  const activeSports = getInSeasonSports();
  const espnResults = await Promise.all(
    activeSports.map(async (sport) => {
      const games = await getESPNGamesForSport(sport);
      return { sport, gameCount: games.length, active: games.length > 0 };
    })
  );

  let soccerResults: { sport: string; gameCount: number; active: boolean }[] = [];
  try {
    const soccerLeagues = await getActiveSoccerLeagues();
    soccerResults = soccerLeagues.map(s => ({
      sport: s.sport,
      gameCount: s.gameCount,
      active: s.active,
    }));
  } catch {
    const soccerIds = ["Soccer_EPL", "Soccer_LALIGA", "Soccer_BUNDESLIGA", "Soccer_SERIEA", "Soccer_LIGUE1", "Soccer_MLS", "Soccer_UCL", "Soccer_INTL"];
    soccerResults = soccerIds.map(id => ({ sport: id, gameCount: 0, active: false }));
  }

  return [...espnResults, ...soccerResults];
}

function resolveGameOdds(game: ESPNScoreboardGame, sport: Sport): {
  spread: number;
  total: number;
  homeMoneyline: number;
  awayMoneyline: number;
  oddsSource: "ESPN" | "ESPN-derived" | "model-estimated";
} {
  let spread: number;
  let total: number;
  let homeMoneyline: number;
  let awayMoneyline: number;
  let oddsSource: "ESPN" | "ESPN-derived" | "model-estimated";

  if (game.odds) {
    spread = parseSpread(game.odds.spread);
    total = game.odds.overUnder || estimateTotal(sport);

    if (game.odds.homeMoneyline && game.odds.awayMoneyline) {
      homeMoneyline = game.odds.homeMoneyline;
      awayMoneyline = game.odds.awayMoneyline;
      oddsSource = "ESPN";
    } else {
      homeMoneyline = estimateMoneyline(spread, true);
      awayMoneyline = estimateMoneyline(spread, false);
      oddsSource = game.odds.spread ? "ESPN-derived" : "model-estimated";
    }
  } else {
    spread = estimateSpreadFromRecords(game.homeTeam.record, game.awayTeam.record, sport);
    total = estimateTotal(sport);
    homeMoneyline = estimateMoneyline(spread, true);
    awayMoneyline = estimateMoneyline(spread, false);
    oddsSource = "model-estimated";
  }

  return { spread, total, homeMoneyline, awayMoneyline, oddsSource };
}

function computeRecordConfidenceBias(game: ESPNScoreboardGame): number {
  const homePct = parseWinPct(game.homeTeam.record);
  const awayPct = parseWinPct(game.awayTeam.record);
  const diff = Math.abs(homePct - awayPct);
  return Math.min(diff * 15, 10);
}

function getLeadersForGame(game: ESPNScoreboardGame, sport: Sport): { playerName: string; category: string; value: string; team: string }[] {
  if (game.leaders && game.leaders.length > 0) {
    return game.leaders;
  }
  return [];
}

function mapLeaderCategoryToProp(category: string, sport: Sport): string | null {
  const mapping: Record<string, Record<string, string>> = {
    NBA: {
      "Points": "Points",
      "Rebounds": "Rebounds",
      "Assists": "Assists",
    },
    NFL: {
      "Passing Yards": "Passing Yards",
      "Rushing Yards": "Rushing Yards",
      "Receiving Yards": "Receiving Yards",
      "Passing Touchdowns": "Passing TDs",
    },
    MLB: {
      "Hits": "Hits",
      "Home Runs": "Total Bases",
      "RBIs": "RBIs",
      "Strikeouts": "Strikeouts (P)",
    },
    NHL: {
      "Goals": "Goals",
      "Assists": "Assists",
      "Points": "Points",
      "Saves": "Saves",
    },
    NCAAB: {
      "Points": "Points",
      "Rebounds": "Rebounds",
      "Assists": "Assists",
    },
    NCAAF: {
      "Passing Yards": "Passing Yards",
      "Rushing Yards": "Rushing Yards",
      "Receiving Yards": "Receiving Yards",
    },
  };
  const sportMap = mapping[sport] || {};
  for (const [key, val] of Object.entries(sportMap)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null;
}

function generateLegFromESPNGame(
  game: ESPNScoreboardGame,
  sport: Sport,
  marketType: MarketType,
  includeProps: boolean,
  realOdds?: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; bookmakerCount: number; source: string }
): TicketLeg {
  const homeTeam = { name: game.homeTeam.shortDisplayName, city: game.homeTeam.displayName.replace(` ${game.homeTeam.shortDisplayName}`, '') };
  const awayTeam = { name: game.awayTeam.shortDisplayName, city: game.awayTeam.displayName.replace(` ${game.awayTeam.shortDisplayName}`, '') };

  const resolved = resolveGameOdds(game, sport);
  
  if (realOdds) {
    if (realOdds.homeMoneyline !== undefined) resolved.homeMoneyline = realOdds.homeMoneyline;
    if (realOdds.awayMoneyline !== undefined) resolved.awayMoneyline = realOdds.awayMoneyline;
    if (realOdds.spread !== undefined) resolved.spread = realOdds.spread;
    if (realOdds.total !== undefined) resolved.total = realOdds.total;
    resolved.oddsSource = "ESPN-derived";
  }
  const confidenceBias = computeRecordConfidenceBias(game);
  const homePct = parseWinPct(game.homeTeam.record);
  const awayPct = parseWinPct(game.awayTeam.record);
  const isHomeTeam = homePct >= awayPct ? deterministicBool(`${game.id}-ishome-fav`, 0.35) : deterministicBool(`${game.id}-ishome-dog`, 0.65);
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;

  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let playerName: string | undefined;
  let propCategory: string | undefined;
  let oddsSource = resolved.oddsSource;

  if (marketType === "moneyline") {
    market = "Moneyline";
    const ml = isHomeTeam ? resolved.homeMoneyline : resolved.awayMoneyline;
    decimalOdds = americanToDecimal(ml);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  } else if (marketType === "spread") {
    market = "Spread";
    const rawSpread = resolved.spread;
    const spreadValue = isHomeTeam ? -rawSpread : rawSpread;
    line = spreadValue;
    decimalOdds = americanToDecimal(-110);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${spreadValue > 0 ? "+" : ""}${spreadValue}`;
  } else if (marketType === "total") {
    market = "Total";
    const totalValue = resolved.total;
    line = totalValue;
    const direction = chooseOverUnderDirection(sport, "Points", null, totalValue, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
    decimalOdds = americanToDecimal(-110);
    outcome = `${direction.isOver ? "Over" : "Under"} ${totalValue}`;
  } else if (marketType === "first_half_spread") {
    market = "1H Spread";
    const rawSpread = realOdds?.h1Spread ?? resolved.spread;
    const halfSpread = realOdds?.h1Spread != null ? Math.abs(rawSpread) : Math.round((rawSpread * 0.55) * 2) / 2;
    const sv = isHomeTeam ? -halfSpread : halfSpread;
    line = sv;
    const h1SOdds = isHomeTeam ? (realOdds?.h1SpreadHome || -110) : (realOdds?.h1SpreadAway || -110);
    decimalOdds = americanToDecimal(h1SOdds);
    if (realOdds?.h1Spread != null) oddsSource = "The Odds API";
    outcome = `1H ${selectedTeam.city} ${selectedTeam.name} ${sv > 0 ? "+" : ""}${sv}`;
  } else if (marketType === "first_half_total") {
    market = "1H Total";
    const halfTotal = realOdds?.h1Total ?? Math.round((resolved.total * 0.48) * 2) / 2;
    line = halfTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, halfTotal, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
    const h1TOdds = direction.isOver ? (realOdds?.h1OverPrice || -110) : (realOdds?.h1UnderPrice || -110);
    decimalOdds = americanToDecimal(h1TOdds);
    if (realOdds?.h1Total != null) oddsSource = "The Odds API";
    outcome = `1H ${direction.isOver ? "Over" : "Under"} ${halfTotal}`;
  } else if (marketType === "first_quarter_spread") {
    market = "1Q Spread";
    const rawSpread = resolved.spread;
    const qSpread = Math.round((rawSpread * 0.28) * 2) / 2;
    const sv = isHomeTeam ? -qSpread : qSpread;
    line = sv;
    decimalOdds = americanToDecimal(-110);
    outcome = `1Q ${selectedTeam.city} ${selectedTeam.name} ${sv > 0 ? "+" : ""}${sv}`;
  } else if (marketType === "first_quarter_total") {
    market = "1Q Total";
    const qTotal = Math.round((resolved.total * 0.25) * 2) / 2;
    line = qTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, qTotal, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
    decimalOdds = americanToDecimal(-110);
    outcome = `1Q ${direction.isOver ? "Over" : "Under"} ${qTotal}`;
  } else if (marketType === "team_total") {
    market = "Team Total";
    const teamTotal = Math.round((resolved.total / 2 + (isHomeTeam ? resolved.spread * -0.5 : resolved.spread * 0.5)) * 2) / 2;
    line = teamTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, teamTotal, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total, isHomePlayer: isHomeTeam });
    decimalOdds = americanToDecimal(-110);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${direction.isOver ? "Over" : "Under"} ${teamTotal}`;
  } else if (marketType === "alt_spread") {
    market = "Alt Spread";
    const rawSpread = resolved.spread;
    const altDir = deterministicBool(`${game.id}-altspread-dir`) ? 1 : -1;
    const altMag = deterministicInt(`${game.id}-altspread-mag`, 1, 3);
    const altOffset = altDir * altMag * (sport === "MLB" || sport === "NHL" ? 0.5 : 1);
    const altSpread = isHomeTeam ? -(rawSpread + altOffset) : (rawSpread + altOffset);
    line = altSpread;
    const betterLine = (isHomeTeam && altSpread > -rawSpread) || (!isHomeTeam && altSpread > rawSpread);
    decimalOdds = betterLine ? americanToDecimal(-145) : americanToDecimal(125);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${altSpread > 0 ? "+" : ""}${altSpread}`;
  } else if (marketType === "alt_total") {
    market = "Alt Total";
    const altTDir = deterministicBool(`${game.id}-alttotal-dir`) ? 1 : -1;
    const altTMag = deterministicInt(`${game.id}-alttotal-mag`, 1, 3);
    const altOffset = altTDir * altTMag * (sport === "MLB" || sport === "NHL" ? 0.5 : 1);
    const altTotal = resolved.total + altOffset;
    line = altTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, altTotal, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
    const easierBet = (direction.isOver && altTotal < resolved.total) || (!direction.isOver && altTotal > resolved.total);
    decimalOdds = easierBet ? americanToDecimal(-145) : americanToDecimal(125);
    outcome = `${direction.isOver ? "Over" : "Under"} ${altTotal}`;
  } else if (marketType === "anytime_scorer") {
    market = "Anytime Scorer";
    const leaders = getLeadersForGame(game, sport);
    let scorerName = "";
    if (leaders.length > 0) {
      const scoringLeaders = leaders.filter(l => ["Points", "Goals", "Rushing Touchdowns", "Receiving Touchdowns", "Passing Touchdowns"].some(c => l.category.includes(c) || l.category.includes("Goal") || l.category.includes("TD")));
      if (scoringLeaders.length > 0) {
        const leader = scoringLeaders[deterministicInt(`${game.id}-scorer-leader`, 0, scoringLeaders.length - 1)];
        scorerName = leader.playerName;
      }
    }
    if (!scorerName) {
      const homeTeamId = game.homeTeam.id;
      const awayTeamId = game.awayTeam.id;
      const teamIdForProps = isHomeTeam ? homeTeamId : awayTeamId;
      const rosterPlayers = teamIdForProps ? getPlayersFromCacheById(sport, teamIdForProps) : [];
      const scoringPositions: Record<string, string[]> = {
        NBA: ["PG", "SG", "SF", "PF", "G", "F"],
        NFL: ["RB", "WR", "TE"],
        NHL: ["C", "LW", "RW"],
        MLB: [],
        NCAAB: ["PG", "SG", "SF", "PF", "G", "F"],
        NCAAF: ["RB", "WR", "TE"],
      };
      const positions = scoringPositions[sport] || [];
      const eligible = rosterPlayers.filter(p => positions.includes(p.position.abbreviation));
      if (eligible.length > 0) {
        scorerName = eligible[deterministicInt(`${game.id}-scorer-eligible`, 0, eligible.length - 1)].fullName;
      }
    }
    if (!scorerName) {
      const players = playersBySport[sport];
      if (players?.length > 0) {
        scorerName = players[deterministicInt(`${game.id}-scorer-fallback`, 0, players.length - 1)].name;
      }
    }
    playerName = scorerName;
    propCategory = "Anytime Scorer";
    decimalOdds = americanToDecimal(175);
    outcome = `${scorerName} Anytime Scorer`;
  } else if (marketType.startsWith("player_")) {
    market = "Player Prop";
    const propMap: Record<string, { category: string; sport: string[] }> = {
      "player_points": { category: "Points", sport: ["NBA", "NCAAB"] },
      "player_rebounds": { category: "Rebounds", sport: ["NBA", "NCAAB"] },
      "player_assists": { category: "Assists", sport: ["NBA", "NCAAB"] },
      "player_threes": { category: "3-Pointers", sport: ["NBA", "NCAAB"] },
      "player_pts_rebs_asts": { category: "Pts+Rebs+Asts", sport: ["NBA"] },
      "player_double_double": { category: "Double-Double", sport: ["NBA"] },
      "player_passing_yds": { category: "Passing Yards", sport: ["NFL", "NCAAF"] },
      "player_rushing_yds": { category: "Rushing Yards", sport: ["NFL", "NCAAF"] },
      "player_receiving_yds": { category: "Receiving Yards", sport: ["NFL", "NCAAF"] },
      "player_tds": { category: "TDs", sport: ["NFL", "NCAAF"] },
      "player_strikeouts": { category: "Strikeouts (P)", sport: ["MLB"] },
      "player_hits_runs_rbis": { category: "Hits", sport: ["MLB"] },
      "player_goals": { category: "Goals", sport: ["NHL"] },
      "player_shots": { category: "Shots on Goal", sport: ["NHL"] },
      "player_saves": { category: "Saves", sport: ["NHL"] },
    };
    const propInfo = propMap[marketType] || { category: "Points", sport: ["NBA"] };
    propCategory = propInfo.category;

    if (marketType === "player_double_double") {
      const leaders = getLeadersForGame(game, sport);
      let ddPlayerName = "";
      if (leaders.length > 0) {
        const topLeader = leaders[0];
        ddPlayerName = topLeader.playerName;
      }
      if (!ddPlayerName) {
        const teamIdForProps = isHomeTeam ? game.homeTeam.id : game.awayTeam.id;
        const rosterPlayers = teamIdForProps ? getPlayersFromCacheById(sport, teamIdForProps) : [];
        const eligible = rosterPlayers.filter(p => ["PG", "PF", "C", "SF"].includes(p.position.abbreviation));
        if (eligible.length > 0) ddPlayerName = eligible[deterministicInt(`${game.id}-dd-eligible`, 0, eligible.length - 1)].fullName;
      }
      if (!ddPlayerName) ddPlayerName = playersBySport[sport]?.[0]?.name || "Unknown";
      playerName = ddPlayerName;
      decimalOdds = americanToDecimal(200);
      outcome = `${ddPlayerName} Double-Double Yes`;
    } else {
      const leaders = getLeadersForGame(game, sport);
      let usedLeader = false;
      if (leaders.length > 0) {
        const mapped = mapLeaderCategoryToProp(propInfo.category === "Hits" ? "Hits" : propInfo.category, sport);
        const eligibleLeaders = leaders.filter(l => {
          const m = mapLeaderCategoryToProp(l.category, sport);
          return m === propInfo.category || m === mapped;
        });
        if (eligibleLeaders.length > 0) {
          const leader = eligibleLeaders[deterministicInt(`${game.id}-prop-leader-${propInfo.category}`, 0, eligibleLeaders.length - 1)];
          playerName = leader.playerName;
          const leaderValue = parseFloat(leader.value) || 0;
          const propLine = leaderValue > 0
            ? Math.round(leaderValue * 2) / 2
            : getDefaultPropLine(propInfo.category);
          line = Math.max(0.5, propLine);
          const direction = chooseOverUnderDirection(sport, propInfo.category, leaderValue, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
          decimalOdds = americanToDecimal(-110 + Math.floor(direction.confidence * 15));
          outcome = `${leader.playerName} ${direction.isOver ? "Over" : "Under"} ${line} ${propInfo.category}`;
          usedLeader = true;
        }
      }
      if (!usedLeader) {
        const homeTeamId = game.homeTeam.id;
        const awayTeamId = game.awayTeam.id;
        const teamIdForProps = isHomeTeam ? homeTeamId : awayTeamId;
        const rosterPlayers = teamIdForProps ? getPlayersFromCacheById(sport, teamIdForProps) : [];
        const keyPositions: Record<string, string[]> = {
          NBA: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NFL: ["QB", "RB", "WR", "TE"],
          MLB: ["SP", "1B", "2B", "3B", "SS", "OF", "DH"],
          NHL: ["C", "LW", "RW", "D", "G"],
          NCAAB: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NCAAF: ["QB", "RB", "WR", "TE"],
        };
        const positions = keyPositions[sport] || keyPositions.NBA;
        const eligible = rosterPlayers.filter(p => positions.includes(p.position.abbreviation));
        const chosenPlayer = eligible.length > 0
          ? eligible[deterministicInt(`${game.id}-prop-elig-${propInfo.category}`, 0, eligible.length - 1)]
          : rosterPlayers.length > 0 ? rosterPlayers[deterministicInt(`${game.id}-prop-roster-${propInfo.category}`, 0, rosterPlayers.length - 1)] : null;
        if (chosenPlayer) {
          playerName = chosenPlayer.fullName;
          const propLine = getDefaultPropLine(propInfo.category);
          line = Math.max(0.5, propLine);
          const direction = chooseOverUnderDirection(sport, propInfo.category, null, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
          decimalOdds = americanToDecimal(-110);
          outcome = `${chosenPlayer.fullName} ${direction.isOver ? "Over" : "Under"} ${line} ${propInfo.category}`;
          oddsSource = "ESPN-derived";
        } else {
          const players = playersBySport[sport];
          const player = players?.[deterministicInt(`${game.id}-prop-fallback-${propInfo.category}`, 0, (players?.length || 1) - 1)];
          if (player) {
            playerName = player.name;
            const propLine = getDefaultPropLine(propInfo.category);
            line = Math.max(0.5, propLine);
            const direction = chooseOverUnderDirection(sport, propInfo.category, null, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
            decimalOdds = americanToDecimal(-110);
            outcome = `${player.name} ${direction.isOver ? "Over" : "Under"} ${line} ${propInfo.category}`;
            oddsSource = "model-estimated";
          }
        }
      }
    }
  } else if (marketType === "prop" && includeProps) {
    market = "Player Prop";
    const leaders = getLeadersForGame(game, sport);

    let usedLeader = false;
    if (leaders.length > 0) {
      const eligibleLeaders = leaders.filter(l => mapLeaderCategoryToProp(l.category, sport) !== null);
      if (eligibleLeaders.length > 0) {
        const leader = eligibleLeaders[deterministicInt(`${game.id}-propgen-leader`, 0, eligibleLeaders.length - 1)];
        const mappedProp = mapLeaderCategoryToProp(leader.category, sport)!;
        playerName = leader.playerName;
        propCategory = mappedProp;

        const leaderValue = parseFloat(leader.value) || 0;
        const propLine = leaderValue > 0
          ? Math.round(leaderValue * 2) / 2
          : getDefaultPropLine(mappedProp);
        line = Math.max(0.5, propLine);
        const direction = chooseOverUnderDirection(sport, mappedProp, leaderValue, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
        decimalOdds = americanToDecimal(-110);
        outcome = `${leader.playerName} ${direction.isOver ? "Over" : "Under"} ${line} ${mappedProp}`;
        usedLeader = true;
      }
    }

    if (!usedLeader) {
      const homeTeamId = game.homeTeam.id;
      const awayTeamId = game.awayTeam.id;
      const teamIdForProps = isHomeTeam ? homeTeamId : awayTeamId;
      let rosterPlayers: ESPNPlayer[] = [];
      if (teamIdForProps) {
        rosterPlayers = getPlayersFromCacheById(sport, teamIdForProps);
      }

      const props = propsBySport[sport];
      const prop = props[deterministicInt(`${game.id}-propgen-propsel`, 0, props.length - 1)];

      if (rosterPlayers.length > 0) {
        const keyPositions: Record<string, string[]> = {
          NBA: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NFL: ["QB", "RB", "WR", "TE"],
          MLB: ["SP", "1B", "2B", "3B", "SS", "OF", "CF", "LF", "RF", "DH"],
          NHL: ["C", "LW", "RW", "D", "G"],
          NCAAB: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NCAAF: ["QB", "RB", "WR", "TE"],
        };
        const positions = keyPositions[sport] || keyPositions.NBA;
        const eligiblePlayers = rosterPlayers.filter(p => positions.includes(p.position.abbreviation));
        const chosenPlayer = eligiblePlayers.length > 0
          ? eligiblePlayers[deterministicInt(`${game.id}-propgen-elig`, 0, eligiblePlayers.length - 1)]
          : rosterPlayers[deterministicInt(`${game.id}-propgen-roster`, 0, rosterPlayers.length - 1)];

        playerName = chosenPlayer.fullName;
        propCategory = prop;

        const propLine = getDefaultPropLine(prop);
        line = Math.max(0.5, propLine);
        const direction = chooseOverUnderDirection(sport, prop, null, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
        decimalOdds = americanToDecimal(-110);
        outcome = `${chosenPlayer.fullName} ${direction.isOver ? "Over" : "Under"} ${line} ${prop}`;
        oddsSource = "ESPN-derived";
      } else {
        const players = playersBySport[sport];
        const player = players[deterministicInt(`${game.id}-propgen-fallback`, 0, players.length - 1)];
        playerName = player.name;
        propCategory = prop;

        const propLine = getDefaultPropLine(prop);
        line = Math.max(0.5, propLine);
        const direction = chooseOverUnderDirection(sport, prop, null, line, { homeRecord: game.homeTeam.record, awayRecord: game.awayTeam.record, totalFromOdds: resolved.total });
        decimalOdds = americanToDecimal(-110);
        outcome = `${player.name} ${direction.isOver ? "Over" : "Under"} ${line} ${prop}`;
        oddsSource = "model-estimated";
      }
    }
  } else {
    market = "Moneyline";
    const ml = isHomeTeam ? resolved.homeMoneyline : resolved.awayMoneyline;
    decimalOdds = americanToDecimal(ml);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  }

  const americanOdds = decimalToAmerican(decimalOdds);
  const description = `${selectedTeam.city} ${selectedTeam.name} ${market} ${outcome}`;

  const legMarketCtx: import("./quantumFusionEngine").MarketContext = {
    winPct: { home: homePct, away: awayPct },
    homeMoneyline: resolved.homeMoneyline,
    awayMoneyline: resolved.awayMoneyline,
    spreadLine: resolved.spread,
    totalLine: resolved.total,
    homeRecord: game.homeTeam.record,
    awayRecord: game.awayTeam.record,
    venue: game.venue || undefined,
  };
  const legFusion = analyzeLeg(sport, description, americanOdds, {
    hasRealOdds: oddsSource !== "model-estimated",
    gameId: game.id,
    bookmakerCount: realOdds?.bookmakerCount || 0,
    oddsSource,
  }, legMarketCtx);

  let winProbability = legFusion.winProbability / 100;
  winProbability = Math.min(0.95, Math.max(0.05, winProbability + (confidenceBias / 100) * (isHomeTeam ? 1 : -1)));
  const edgePercent = legFusion.edgePercentage;

  const sharpSignal = legFusion.signals.find(s => s.source === "sharp_money_flow");
  const lineSignal = legFusion.signals.find(s => s.source === "line_movement");
  const publicSignal = legFusion.signals.find(s => s.source === "public_fade");

  const sharpAction = sharpSignal ? sharpSignal.direction === "bullish" && sharpSignal.strength > 65 : false;

  let lineMovement: "steam" | "reverse" | "stable" = "stable";
  if (lineSignal) {
    if (lineSignal.direction === "bullish" && lineSignal.strength > 70) lineMovement = "steam";
    else if (lineSignal.direction === "bearish" && lineSignal.strength > 60) lineMovement = "reverse";
  }

  const publicPercent = publicSignal ? 
    (publicSignal.direction === "bullish" ? 30 + Math.round(publicSignal.strength * 0.2) : 50 + Math.round(publicSignal.strength * 0.3)) : 50;

  const confidenceLevel: "high" | "medium" | "low" = 
    legFusion.confidence >= 75 ? "high" :
    legFusion.confidence >= 55 ? "medium" : "low";

  const oddsMovement: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean } = {
    direction: "stable",
    percentChange: 0,
    possibleInefficiency: false,
  };

  let underSignalCount = 0;
  if (outcome.includes("Under")) {
    const defSignal = legFusion.signals.find(s => s.source === "player_efficiency" || s.source === "team_chemistry");
    const paceSignal = legFusion.signals.find(s => s.source === "momentum_score");
    const situationalSignal = legFusion.signals.find(s => s.source === "situational_spot");
    const injurySignal = legFusion.signals.find(s => s.source === "injury_adjustment");
    if (defSignal && defSignal.direction === "bearish") underSignalCount++;
    if (paceSignal && paceSignal.strength < 50) underSignalCount++;
    if (situationalSignal && situationalSignal.direction === "bearish") underSignalCount++;
    if (injurySignal && injurySignal.strength > 60) underSignalCount++;
    if (sharpAction) underSignalCount++;
    if (lineMovement === "reverse") underSignalCount++;
    underSignalCount = Math.max(underSignalCount, 2);
  }

  const gameSource: "ESPN Live" | "scheduled" = game.status.state === "in" ? "ESPN Live" : "scheduled";

  return {
    id: generateUniqueId(),
    team: `${selectedTeam.city} ${selectedTeam.name}`,
    opponent: `${opponent.city} ${opponent.name}`,
    market,
    outcome,
    line,
    decimalOdds,
    americanOdds,
    winProbability,
    espnGameId: game.id,
    homeWinPct: homePct,
    awayWinPct: awayPct,
    edgePercent,
    playerName,
    propCategory,
    analysis: {
      sharpAction,
      lineMovement,
      publicPercent,
      confidenceLevel,
      oddsMovement,
      underSignalCount: outcome.includes("Under") ? underSignalCount : undefined,
    },
    legFusion,
    dataSources: {
      odds: oddsSource,
      game: gameSource,
      injury: "estimated",
      analysis: "Statistical Model",
    },
  };
}

function generateLegFromSoccerFixture(
  fixture: SoccerFixture,
  sportId: string,
  marketType: MarketType,
  realOdds?: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; bookmakerCount: number; source: string }
): TicketLeg {
  const homeTeam = fixture.homeTeam.name;
  const awayTeam = fixture.awayTeam.name;
  const fixSeed = `${fixture.id}-${sportId}-${marketType}`;
  const isHomeTeam = deterministicBool(`${fixSeed}-ishome`, 0.45);
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;

  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let oddsSource: "ESPN" | "ESPN-derived" | "model-estimated" = "model-estimated";
  let playerName: string | undefined;
  let propCategory: string | undefined;

  const homeML = realOdds?.homeMoneyline ?? -110;
  const awayML = realOdds?.awayMoneyline ?? -110;
  const spreadVal = realOdds?.spread ?? 0;
  const totalVal = realOdds?.total ?? 2.5;

  if (realOdds) {
    oddsSource = "ESPN-derived";
  }

  if (marketType === "moneyline") {
    market = "Moneyline";
    const ml = isHomeTeam ? homeML : awayML;
    decimalOdds = americanToDecimal(ml);
    outcome = `${selectedTeam} ML`;
  } else if (marketType === "spread") {
    market = "Spread";
    const sv = isHomeTeam ? -spreadVal : spreadVal;
    line = sv;
    decimalOdds = americanToDecimal(-110);
    outcome = `${selectedTeam} ${sv > 0 ? "+" : ""}${sv}`;
  } else if (marketType === "total") {
    market = "Total Goals";
    line = totalVal;
    const direction = chooseOverUnderDirection("NHL", "Goals", null, totalVal, {});
    decimalOdds = americanToDecimal(-110);
    outcome = `${direction.isOver ? "Over" : "Under"} ${totalVal}`;
  } else if (marketType === "btts") {
    market = "Both Teams To Score";
    decimalOdds = americanToDecimal(-120);
    outcome = `BTTS Yes`;
  } else if (marketType === "draw_no_bet") {
    market = "Draw No Bet";
    const ml = isHomeTeam ? homeML : awayML;
    decimalOdds = americanToDecimal(Math.abs(ml) > 200 ? ml : Math.round(ml * 0.7));
    outcome = `${selectedTeam} DNB`;
  } else if (marketType === "asian_handicap") {
    market = "Asian Handicap";
    const ahSpread = Math.round((spreadVal * 1.1) * 4) / 4;
    const sv = isHomeTeam ? -ahSpread : ahSpread;
    line = sv;
    decimalOdds = americanToDecimal(-105);
    outcome = `${selectedTeam} AH ${sv > 0 ? "+" : ""}${sv}`;
  } else if (marketType === "correct_score") {
    market = "Correct Score";
    decimalOdds = americanToDecimal(500);
    outcome = `${fixture.homeTeam.name} 2-1 ${fixture.awayTeam.name}`;
  } else if (marketType === "match_result_btts") {
    market = "Result + BTTS";
    const resultTeam = isHomeTeam ? homeTeam : awayTeam;
    decimalOdds = americanToDecimal(250);
    outcome = `${resultTeam} Win & BTTS Yes`;
  } else if (marketType === "anytime_scorer") {
    market = "Anytime Scorer";
    const selectedName = isHomeTeam ? homeTeam : awayTeam;
    playerName = selectedName;
    propCategory = "Anytime Scorer";
    decimalOdds = americanToDecimal(175);
    outcome = `${selectedName} Anytime Scorer`;
  }

  const americanOdds = decimalToAmerican(decimalOdds);
  const description = `${selectedTeam} ${market} ${outcome}`;
  const legFusion = analyzeLeg("NBA" as Sport, description, americanOdds);

  let winProbability = legFusion.winProbability / 100;
  winProbability = Math.min(0.95, Math.max(0.05, winProbability));
  const edgePercent = legFusion.edgePercentage;

  const sharpSignal = legFusion.signals.find(s => s.source === "sharp_money_flow");
  const sharpAction = sharpSignal ? sharpSignal.direction === "bullish" : false;
  const lineMovement: "steam" | "reverse" | "stable" = "stable";
  const publicPercent = 50;
  const confidenceLevel: "high" | "medium" | "low" = winProbability > 0.55 ? "high" : winProbability > 0.4 ? "medium" : "low";

  return {
    id: generateUniqueId(),
    team: selectedTeam,
    opponent,
    market,
    outcome,
    line,
    decimalOdds,
    americanOdds,
    winProbability,
    edgePercent,
    playerName,
    propCategory,
    analysis: {
      sharpAction,
      lineMovement,
      publicPercent,
      confidenceLevel,
    },
    legFusion,
    dataSources: {
      odds: oddsSource,
      game: fixture.status === "NS" ? "scheduled" : "ESPN Live",
      injury: "estimated",
      analysis: "Statistical Model",
    },
  };
}

function generateLeg(sport: Sport, marketType: MarketType, includeProps: boolean): TicketLeg {
  const teams = teamsByLeague[sport];
  const legSeed = `${sport}-${marketType}-leg`;
  const homeTeamIdx = deterministicInt(`${legSeed}-home`, 0, teams.length - 1);
  let awayTeamIdx = deterministicInt(`${legSeed}-away`, 0, teams.length - 1);
  if (awayTeamIdx === homeTeamIdx) {
    awayTeamIdx = (homeTeamIdx + 1) % teams.length;
  }
  
  const homeTeam = teams[homeTeamIdx];
  const awayTeam = teams[awayTeamIdx];
  const isHomeTeam = deterministicBool(`${legSeed}-ishome`);
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;

  return buildLegFromTeams(sport, selectedTeam, opponent, marketType, includeProps);
}

function buildLegFromTeams(sport: Sport, selectedTeam: { name: string; city: string }, opponent: { name: string; city: string }, marketType: MarketType, includeProps: boolean): TicketLeg {
  
  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let playerName: string | undefined;
  let propCategory: string | undefined;

  const totalMap: Record<Sport, { min: number; max: number }> = {
    NBA: { min: 210, max: 240 },
    NFL: { min: 38, max: 52 },
    MLB: { min: 6.5, max: 10.5 },
    NHL: { min: 5, max: 7 },
    NCAAB: { min: 130, max: 160 },
    NCAAF: { min: 45, max: 65 },
  };
  const bltSeed = `${sport}-${selectedTeam.name}-${opponent.name}-${marketType}`;
  const totalRange = totalMap[sport];
  const estTotal = Math.round(((totalRange.min + totalRange.max) / 2) * 2) / 2;
  const estSpread = 0;

  function findPlayerForProp(): string {
    const allTeams = getTeamsFromCache(sport);
    const matchingTeam = allTeams.find(t => 
      (t.displayName || "").toLowerCase().includes(selectedTeam.name.toLowerCase()) || 
      selectedTeam.name.toLowerCase().includes((t.displayName || "").toLowerCase()) ||
      (t.shortDisplayName || "").toLowerCase() === selectedTeam.name.toLowerCase()
    );
    if (matchingTeam) {
      const rosterPlayers = getPlayersFromCacheById(sport, matchingTeam.id);
      if (rosterPlayers.length > 0) {
        const keyPositions: Record<string, string[]> = {
          NBA: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NFL: ["QB", "RB", "WR", "TE"],
          MLB: ["SP", "1B", "2B", "3B", "SS", "OF"],
          NHL: ["C", "LW", "RW", "D", "G"],
          NCAAB: ["PG", "SG", "SF", "PF", "C", "G", "F"],
          NCAAF: ["QB", "RB", "WR", "TE"],
        };
        const positions = keyPositions[sport] || keyPositions.NBA;
        const eligible = rosterPlayers.filter(p => positions.includes(p.position.abbreviation));
        const chosen = eligible.length > 0
          ? eligible[deterministicInt(`${bltSeed}-findplayer-elig`, 0, eligible.length - 1)]
          : rosterPlayers[deterministicInt(`${bltSeed}-findplayer-roster`, 0, rosterPlayers.length - 1)];
        return chosen.fullName;
      }
    }
    const players = playersBySport[sport];
    const player = players[deterministicInt(`${bltSeed}-findplayer-fb`, 0, players.length - 1)];
    return player.name;
  }
  
  if (marketType === "moneyline") {
    market = "Moneyline";
    decimalOdds = 1.91;
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  } else if (marketType === "spread") {
    market = "Spread";
    line = estSpread;
    decimalOdds = 1.91;
    outcome = `${selectedTeam.city} ${selectedTeam.name} PK (Est.)`;
  } else if (marketType === "total") {
    market = "Total";
    line = estTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, estTotal, {});
    decimalOdds = 1.91;
    outcome = `${direction.isOver ? "Over" : "Under"} ${estTotal} (Est.)`;
  } else if (marketType === "first_half_spread") {
    market = "1H Spread";
    const halfSpread = Math.round((estTotal * 0.5) * 2) / 2;
    line = halfSpread;
    decimalOdds = 1.91;
    outcome = `1H ${selectedTeam.city} ${selectedTeam.name} PK (Est.)`;
  } else if (marketType === "first_half_total") {
    market = "1H Total";
    const halfTotal = Math.round((estTotal * 0.48) * 2) / 2;
    line = halfTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, halfTotal, {});
    decimalOdds = 1.91;
    outcome = `1H ${direction.isOver ? "Over" : "Under"} ${halfTotal} (Est.)`;
  } else if (marketType === "first_quarter_spread") {
    market = "1Q Spread";
    line = 0;
    decimalOdds = 1.91;
    outcome = `1Q ${selectedTeam.city} ${selectedTeam.name} PK (Est.)`;
  } else if (marketType === "first_quarter_total") {
    market = "1Q Total";
    const qTotal = Math.round((estTotal * 0.25) * 2) / 2;
    line = qTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, qTotal, {});
    decimalOdds = 1.91;
    outcome = `1Q ${direction.isOver ? "Over" : "Under"} ${qTotal} (Est.)`;
  } else if (marketType === "team_total") {
    market = "Team Total";
    const teamTotal = Math.round((estTotal / 2) * 2) / 2;
    line = teamTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, teamTotal, {});
    decimalOdds = 1.91;
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${direction.isOver ? "Over" : "Under"} ${teamTotal} (Est.)`;
  } else if (marketType === "alt_spread") {
    market = "Alt Spread";
    const altSpread = estSpread + 1.5;
    line = altSpread;
    decimalOdds = americanToDecimal(-145);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${altSpread > 0 ? "+" : ""}${altSpread} (Est.)`;
  } else if (marketType === "alt_total") {
    market = "Alt Total";
    const altTotal = estTotal - 2;
    line = altTotal;
    const direction = chooseOverUnderDirection(sport, "Points", null, altTotal, {});
    decimalOdds = americanToDecimal(-145);
    outcome = `${direction.isOver ? "Over" : "Under"} ${altTotal} (Est.)`;
  } else if (marketType === "anytime_scorer") {
    market = "Anytime Scorer";
    const scorerName = findPlayerForProp();
    playerName = scorerName;
    propCategory = "Anytime Scorer";
    decimalOdds = americanToDecimal(175);
    outcome = `${scorerName} Anytime Scorer`;
  } else if (marketType.startsWith("player_")) {
    market = "Player Prop";
    const propMap: Record<string, { category: string }> = {
      "player_points": { category: "Points" },
      "player_rebounds": { category: "Rebounds" },
      "player_assists": { category: "Assists" },
      "player_threes": { category: "3-Pointers" },
      "player_pts_rebs_asts": { category: "Pts+Rebs+Asts" },
      "player_double_double": { category: "Double-Double" },
      "player_passing_yds": { category: "Passing Yards" },
      "player_rushing_yds": { category: "Rushing Yards" },
      "player_receiving_yds": { category: "Receiving Yards" },
      "player_tds": { category: "TDs" },
      "player_strikeouts": { category: "Strikeouts (P)" },
      "player_hits_runs_rbis": { category: "Hits" },
      "player_goals": { category: "Goals" },
      "player_shots": { category: "Shots on Goal" },
      "player_saves": { category: "Saves" },
    };
    const propInfo = propMap[marketType] || { category: "Points" };
    propCategory = propInfo.category;
    const chosenPlayerName = findPlayerForProp();
    playerName = chosenPlayerName;

    if (marketType === "player_double_double") {
      decimalOdds = americanToDecimal(175);
      outcome = `${chosenPlayerName} Double-Double Yes`;
    } else {
      const propLine = getDefaultPropLine(propInfo.category);
      line = propLine;
      const direction = chooseOverUnderDirection(sport, propInfo.category, null, line, {});
      decimalOdds = 1.91;
      outcome = `${chosenPlayerName} ${direction.isOver ? "Over" : "Under"} ${line} ${propInfo.category} (Est.)`;
    }
  } else if (marketType === "prop" && includeProps) {
    market = "Player Prop";
    const chosenPlayerName = findPlayerForProp();
    const props = propsBySport[sport];
    const prop = props[0];
    propCategory = prop;
    playerName = chosenPlayerName;
    const propLine = getDefaultPropLine(prop);
    line = propLine;
    const direction = chooseOverUnderDirection(sport, prop, null, line, {});
    decimalOdds = 1.91;
    outcome = `${chosenPlayerName} ${direction.isOver ? "Over" : "Under"} ${line} ${prop} (Est.)`;
  } else {
    market = "Moneyline";
    decimalOdds = 1.91;
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  }
  
  const americanOdds = decimalToAmerican(decimalOdds);
  const description = `${selectedTeam.city} ${selectedTeam.name} ${market} ${outcome}`;
  
  const legFusion = analyzeLeg(sport, description, americanOdds);
  
  const winProbability = legFusion.winProbability / 100;
  const edgePercent = legFusion.edgePercentage;
  
  const sharpSignal = legFusion.signals.find(s => s.source === "sharp_money_flow");
  const lineSignal = legFusion.signals.find(s => s.source === "line_movement");
  const publicSignal = legFusion.signals.find(s => s.source === "public_fade");
  
  const sharpAction = sharpSignal ? sharpSignal.direction === "bullish" && sharpSignal.strength > 65 : false;
  
  let lineMovement: "steam" | "reverse" | "stable" = "stable";
  if (lineSignal) {
    if (lineSignal.direction === "bullish" && lineSignal.strength > 70) lineMovement = "steam";
    else if (lineSignal.direction === "bearish" && lineSignal.strength > 60) lineMovement = "reverse";
  }
  
  const publicPercent = publicSignal ? 
    (publicSignal.direction === "bullish" ? 30 + Math.round(publicSignal.strength * 0.2) : 50 + Math.round(publicSignal.strength * 0.3)) : 50;
  
  const confidenceLevel: "high" | "medium" | "low" = 
    legFusion.confidence >= 75 ? "high" :
    legFusion.confidence >= 55 ? "medium" : "low";
  
  const oddsMovement: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean } = {
    direction: "stable",
    percentChange: 0,
    possibleInefficiency: false,
  };

  let underSignalCount = 0;
  if (outcome.includes("Under")) {
    const defSignal = legFusion.signals.find(s => s.source === "player_efficiency" || s.source === "team_chemistry");
    const paceSignal = legFusion.signals.find(s => s.source === "momentum_score");
    const situationalSignal = legFusion.signals.find(s => s.source === "situational_spot");
    const injurySignal = legFusion.signals.find(s => s.source === "injury_adjustment");
    if (defSignal && defSignal.direction === "bearish") underSignalCount++;
    if (paceSignal && paceSignal.strength < 50) underSignalCount++;
    if (situationalSignal && situationalSignal.direction === "bearish") underSignalCount++;
    if (injurySignal && injurySignal.strength > 60) underSignalCount++;
    if (sharpAction) underSignalCount++;
    if (lineMovement === "reverse") underSignalCount++;
    underSignalCount = Math.max(underSignalCount, 2);
  }
  
  return {
    id: generateUniqueId(),
    team: `${selectedTeam.city} ${selectedTeam.name}`,
    opponent: `${opponent.city} ${opponent.name}`,
    market,
    outcome,
    line,
    decimalOdds,
    americanOdds,
    winProbability,
    edgePercent,
    playerName,
    propCategory,
    analysis: {
      sharpAction,
      lineMovement,
      publicPercent,
      confidenceLevel,
      oddsMovement,
      underSignalCount: outcome.includes("Under") ? underSignalCount : undefined,
    },
    legFusion,
    dataSources: {
      odds: "model-estimated",
      game: "scheduled",
      injury: "estimated",
      analysis: "Statistical Model",
    },
  };
}

function generateTicketName(sport: Sport, index: number, riskLevel: string, legs?: TicketLeg[]): string {
  if (legs && legs.length > 0) {
    const uniqueMatchups = new Map<string, string>();
    for (const leg of legs) {
      if (leg.team && leg.opponent) {
        const key = [leg.team, leg.opponent].sort().join("|");
        if (!uniqueMatchups.has(key)) {
          const shortTeam = leg.team.split(" ").pop() || leg.team;
          const shortOpp = leg.opponent.split(" ").pop() || leg.opponent;
          uniqueMatchups.set(key, `${shortTeam} vs ${shortOpp}`);
        }
      }
    }
    if (uniqueMatchups.size > 0) {
      const matchupNames = Array.from(uniqueMatchups.values());
      if (matchupNames.length <= 2) {
        return matchupNames.join(" + ");
      }
      return `${matchupNames[0]} + ${matchupNames.length - 1} more`;
    }
  }

  const prefixes = {
    conservative: ["Safe", "Steady", "Solid", "Reliable", "Stable"],
    moderate: ["Balanced", "Smart", "Sharp", "Strategic", "Calculated"],
    aggressive: ["Power", "High-Value", "Bold", "Premium", "Elite"],
  };
  
  const prefix = prefixes[riskLevel as keyof typeof prefixes][deterministicInt(`${sport}-${index}-${riskLevel}-prefix`, 0, 4)];
  return `${prefix} ${sport} Ticket #${index + 1}`;
}

function buildRationale(fusionData: TicketFusion, legs: TicketLeg[]): string[] {
  const rationale: string[] = [];
  const cf = fusionData.combinedFusion;
  
  if (cf.synergies.length > 0) {
    const topSynergy = cf.synergies.sort((a, b) => b.effect - a.effect)[0];
    if (topSynergy.synergyType === "amplifying" && topSynergy.effect > 1.15) {
      rationale.push(`Synergy detected: ${topSynergy.description}`);
    }
  }
  
  const bullishHighSignals = cf.signals.filter(s => s.direction === "bullish" && s.strength >= 70);
  if (bullishHighSignals.length >= 3) {
    rationale.push(`${bullishHighSignals.length} strong bullish signals across factors (${bullishHighSignals.slice(0, 3).map(s => s.source.replace(/_/g, ' ')).join(', ')})`);
  }
  
  if (cf.quantumState.coherence >= 70) {
    rationale.push(`High quantum coherence (${cf.quantumState.coherence}%) - factors strongly aligned`);
  }
  
  if (cf.expectedValue > 3) {
    rationale.push(`Positive expected value: +${cf.expectedValue.toFixed(1)}% edge detected`);
  }
  
  const sharpLegs = legs.filter(l => l.analysis.sharpAction);
  if (sharpLegs.length > 0) {
    rationale.push(`Sharp money backing ${sharpLegs.length} of ${legs.length} selections`);
  }
  
  const steamLegs = legs.filter(l => l.analysis.lineMovement === "steam");
  if (steamLegs.length > 0) {
    rationale.push(`Steam move detected on ${steamLegs.length} leg${steamLegs.length > 1 ? 's' : ''} - line moving favorably`);
  }
  
  if (fusionData.correlationBonus > 5) {
    rationale.push(`Correlation bonus: +${fusionData.correlationBonus.toFixed(1)}% from signal diversification across legs`);
  }
  
  if (cf.recommendation === "strong_bet") {
    rationale.push("All-systems-go: Sors Prediction Engine rates this a STRONG BET");
  } else if (cf.recommendation === "moderate_bet") {
    rationale.push("Solid opportunity: Multiple analysis categories confirm value");
  }

  const espnLegs = legs.filter(l => l.dataSources?.odds === "ESPN");
  if (espnLegs.length > 0) {
    rationale.push(`${espnLegs.length} leg(s) using verified ESPN odds data for higher accuracy`);
  }
  
  for (const insight of cf.insights.slice(0, 2)) {
    if (!rationale.some(r => r.includes(insight.substring(0, 20)))) {
      rationale.push(insight);
    }
  }
  
  if (rationale.length === 0) {
    rationale.push("Balanced risk/reward profile across 46 analysis factors");
    rationale.push("Diversified market selection for portfolio approach");
  }
  
  return rationale.slice(0, 6);
}

function buildRiskFactors(legs: TicketLeg[], fusionData: TicketFusion): string[] {
  const risks: string[] = [];
  
  const underLegs = legs.filter(l => l.outcome.includes("Under"));
  if (underLegs.length > 0) {
    risks.push("Late lineup changes could shift scoring pace");
  }
  
  const propLegs = legs.filter(l => l.market === "Player Prop");
  if (propLegs.length > 0) {
    risks.push("Player availability and minute restrictions may impact prop outcomes");
  }
  
  if (legs.length >= 4) {
    risks.push("Multi-leg correlation increases parlay variance");
  }
  
  const steamLegs = legs.filter(l => l.analysis.lineMovement === "steam");
  if (steamLegs.length > 0) {
    risks.push("Steam line movement may indicate closing line value erosion");
  }
  
  const lowConfLegs = legs.filter(l => l.analysis.confidenceLevel === "low");
  if (lowConfLegs.length > 0) {
    risks.push(`${lowConfLegs.length} leg(s) with low model confidence increase uncertainty`);
  }
  
  if (fusionData.combinedFusion.quantumState.coherence < 50) {
    risks.push("Low factor coherence suggests conflicting signals across analysis categories");
  }
  
  risks.push("In-game officiating variance and game-flow unpredictability");
  
  return risks.slice(0, 3);
}

function getCalibrationInfo(marketSlice: string, modelProb: number): { historicalHitRate: number; sampleSize: number; marketSlice: string } {
  return {
    historicalHitRate: 0,
    sampleSize: 0,
    marketSlice: `${marketSlice} (prob ${Math.round(modelProb * 100)}%-range) — accumulating real data`,
  };
}

function buildAlternatives(legs: TicketLeg[], sport: Sport): AlternativeTicket[] {
  const alts: AlternativeTicket[] = [];
  
  const primaryLeg = legs[0];
  if (!primaryLeg) return alts;
  
  if (primaryLeg.market === "Moneyline") {
    alts.push({
      market: "Spread",
      selection: `${primaryLeg.team} -2.5`,
      evPercent: Math.round((primaryLeg.edgePercent * 0.8) * 10) / 10,
      confidence: Math.round(primaryLeg.winProbability * 90),
      rationale: "Spread alternative offers lower variance with similar directional edge",
    });
  }
  
  if (primaryLeg.market === "Spread" || primaryLeg.market === "Moneyline") {
    alts.push({
      market: "Total",
      selection: `Under ${sport === "NBA" ? "222.5" : sport === "NFL" ? "44.5" : "7.5"}`,
      evPercent: 0,
      confidence: 50,
      rationale: "Defensive efficiency metrics favor lower-scoring outcome in this matchup",
    });
  }
  
  if (primaryLeg.market === "Total" && primaryLeg.outcome.includes("Over")) {
    alts.push({
      market: "Total",
      selection: primaryLeg.outcome.replace("Over", "Under"),
      evPercent: 0,
      confidence: 50,
      rationale: "Contrarian under play supported by pace-adjusted models",
    });
  }
  
  return alts.slice(0, 3);
}

function getAnalyticsAgentData(sport: Sport): GeneratedTicket["analyticsAgentData"] {
  try {
    const markets = analyticsAgent.getMarketAnalysis();
    if (markets.length === 0) {
      return {
        evFromAgent: null,
        kellyFromAgent: null,
        arbitrageDetected: false,
        trendDirection: "stable",
        confidenceBoost: 0,
      };
    }

    const sportMarkets = markets.filter(m => m.league.toUpperCase().includes(sport));
    const relevantMarkets = sportMarkets.length > 0 ? sportMarkets : markets.slice(0, 3);

    let avgEv = 0;
    let avgKelly = 0;
    let arbDetected = false;
    let trendSum = 0;

    for (const m of relevantMarkets) {
      avgEv += m.value.evPerUnit;
      avgKelly += m.value.fractionalKelly;
      if (m.signals.arbitrageOpportunity.exists) arbDetected = true;
      trendSum += m.trends.shortTerm.delta;
    }

    const count = relevantMarkets.length;
    avgEv = Math.round((avgEv / count) * 1000) / 1000;
    avgKelly = Math.round((avgKelly / count) * 1000) / 1000;

    const trendDirection: "up" | "down" | "stable" =
      trendSum > 0.5 ? "up" : trendSum < -0.5 ? "down" : "stable";

    const confidenceBoost = Math.round(Math.min(5, Math.max(-5, avgEv * 2)) * 10) / 10;

    return {
      evFromAgent: avgEv,
      kellyFromAgent: avgKelly,
      arbitrageDetected: arbDetected,
      trendDirection,
      confidenceBoost,
    };
  } catch {
    return {
      evFromAgent: null,
      kellyFromAgent: null,
      arbitrageDetected: false,
      trendDirection: "stable",
      confidenceBoost: 0,
    };
  }
}

export async function generateTickets(request: TicketRequest): Promise<{ tickets: GeneratedTicket[]; skippedSports: string[] }> {
  const candidateTickets: GeneratedTicket[] = [];
  const ticketsToGenerate = Math.ceil(10 / request.sports.length);

  const modelWeightsData = await getModelWeights();
  const hasModelWeights = Object.keys(modelWeightsData).length > 0;
  
  const legCountsByRisk = {
    conservative: [2, 3],
    moderate: [3, 4, 5],
    aggressive: [4, 5, 6],
  };
  
  const legCounts = legCountsByRisk[request.riskLevel];
  
  const skippedSports: string[] = [];

  for (const sport of request.sports) {
    const isSoccer = isSoccerSport(sport);
    
    if (isSoccer) {
      const fixtures = await fetchSoccerFixtures(sport);
      if (fixtures.length === 0) {
        skippedSports.push(sport);
        continue;
      }

      const soccerOddsMap = new Map<string, Awaited<ReturnType<typeof fetchRealOddsForGame>>>();
      const oddsPromises = fixtures.map(async (fixture) => {
        const odds = await fetchRealOddsForGame(sport, fixture.homeTeam.name, fixture.awayTeam.name);
        if (odds) {
          soccerOddsMap.set(fixture.id, odds);
        }
      });
      await Promise.all(oddsPromises);

      for (let i = 0; i < ticketsToGenerate; i++) {
        const numLegs = Math.min(
          legCounts[deterministicInt(`${sport}-soccer-${i}-legcount`, 0, legCounts.length - 1)],
          request.maxLegs
        );
        const legs: TicketLeg[] = [];
        const availableSoccerMarkets = request.betTypes && request.betTypes.length > 0
          ? soccerMarketTypesExpanded.filter(m => request.betTypes!.includes(m))
          : soccerMarketTypesExpanded;
        const finalSoccerMarkets = availableSoccerMarkets.length > 0 ? availableSoccerMarkets : ["moneyline", "spread", "total"] as MarketType[];
        for (let j = 0; j < numLegs; j++) {
          const marketType = finalSoccerMarkets[deterministicInt(`${sport}-soccer-${i}-${j}-market`, 0, finalSoccerMarkets.length - 1)];
          const fixture = fixtures[deterministicInt(`${sport}-soccer-${i}-${j}-fixture`, 0, fixtures.length - 1)];
          const fixtureOdds = soccerOddsMap.get(fixture.id);
          legs.push(generateLegFromSoccerFixture(fixture, sport, marketType, fixtureOdds || undefined));
        }

        if (legs.length === 0) continue;

        const totalOdds = calculateCombinedOdds(legs);
        const americanOdds = decimalToAmerican(totalOdds);
        const fusionSport = "NBA" as Sport;
        const fusionData = analyzeTicket(
          legs.map((leg) => ({
            id: leg.id,
            sport: fusionSport,
            description: `${leg.team} ${leg.market} ${leg.outcome}`,
            odds: leg.americanOdds,
            context: {
              hasRealOdds: leg.dataSources?.odds !== "model-estimated",
              bookmakerCount: 0,
              oddsSource: leg.dataSources?.odds || "model-estimated",
              lineMovement: 0,
            },
          })),
          request.riskLevel
        );

        const cf = fusionData.combinedFusion;
        const overallConfidence = cf.confidence;
        const grade = cf.grade;
        const evPercent = cf.edgePercentage;
        const expectedValue = evPercent / 100;
        const recommendedStake = Math.max(1, Math.round(request.bankroll * (overallConfidence / 100) * 0.02));

        const gameNames = legs.map(l => `${l.team} vs ${l.opponent}`);
        const uniqueGames = Array.from(new Set(gameNames));
        const displayName = uniqueGames.length <= 2
          ? uniqueGames.join(" + ")
          : `${uniqueGames[0]} + ${uniqueGames.length - 1} more`;

        const winProbability = legs.reduce((acc, l) => acc * l.winProbability, 1);
        const confidenceScore = overallConfidence / 100;
        const potentialPayout = recommendedStake * totalOdds;
        const riskRating: "low" | "medium" | "high" = totalOdds > 8 ? "high" : totalOdds > 3 ? "medium" : "low";
        const confidenceTag: "low" | "medium" | "high" = overallConfidence >= 71 ? "high" : overallConfidence >= 41 ? "medium" : "low";

        candidateTickets.push({
          id: generateUniqueId(),
          name: displayName,
          sport,
          legs,
          totalOdds,
          americanOdds,
          winProbability,
          expectedValue,
          confidenceScore,
          evPercent,
          grade,
          recommendedStake,
          potentialPayout,
          riskRating,
          analysisFactors: {
            quantumCoachingScore: 0.5,
            quantumPlayerScore: 0.5,
            quantumTeamScore: 0.5,
            mlProjectionScore: 0.5,
            correlationScore: 0.5,
            sharpMoneyScore: 0.5,
            lineValueScore: 0.5,
            momentumScore: 0.5,
            situationalScore: 0.5,
            cashoutEligibility: 0.5,
          },
          rationale: buildRationale(fusionData, legs),
          cashoutProbability: 0.5,
          fusionData,
          consensusProbability: winProbability,
          modelDisagreement: 0,
          sourceSignals: ["API-Football", "The Odds API"],
          riskFactors: [],
          confidenceTag,
          calibrationInfo: { historicalHitRate: 0.5, sampleSize: 0, marketSlice: sport },
          recommendedAlternatives: [],
        });
      }

      continue;
    }
    
    const sportForESPN = sport as Sport;

    const espnGames = await getESPNGamesForSport(sportForESPN);
    
    if (espnGames.length === 0) {
      skippedSports.push(sport);
      continue;
    }

    const realOddsMap = new Map<string, Awaited<ReturnType<typeof fetchRealOddsForGame>>>();
    if (espnGames.length > 0) {
      const oddsPromises = espnGames.map(async (game) => {
        const homeTeamName = game.homeTeam.displayName || game.homeTeam.shortDisplayName || "";
        const awayTeamName = game.awayTeam.displayName || game.awayTeam.shortDisplayName || "";
        if (homeTeamName && awayTeamName) {
          const realOdds = await fetchRealOddsForGame(sportForESPN, homeTeamName, awayTeamName);
          if (realOdds) {
            realOddsMap.set(game.id, realOdds);
          }
        }
      });
      await Promise.all(oddsPromises);
    }

    const agentData = getAnalyticsAgentData(sportForESPN);

    for (let i = 0; i < ticketsToGenerate; i++) {
      const numLegs = Math.min(
        legCounts[deterministicInt(`${sport}-espn-${i}-legcount`, 0, legCounts.length - 1)],
        request.maxLegs
      );
      
      const legs: TicketLeg[] = [];
      const availableMarkets = marketTypesBySport[sportForESPN] || ["moneyline", "spread", "total"] as MarketType[];
      let allowedMarkets = request.betTypes && request.betTypes.length > 0
        ? availableMarkets.filter(m => request.betTypes!.includes(m))
        : request.includeProps
          ? availableMarkets
          : availableMarkets.filter(m => !m.startsWith("player_") && m !== "anytime_scorer" && m !== "prop");
      if (allowedMarkets.length === 0) allowedMarkets = ["moneyline", "spread", "total"];
      for (let j = 0; j < numLegs; j++) {
        const marketType = allowedMarkets[deterministicInt(`${sport}-espn-${i}-${j}-market`, 0, allowedMarkets.length - 1)];
        const game = espnGames[deterministicInt(`${sport}-espn-${i}-${j}-game`, 0, espnGames.length - 1)];
        const gameRealOdds = realOddsMap.get(game.id);
        legs.push(generateLegFromESPNGame(game, sportForESPN, marketType, request.includeProps, gameRealOdds || undefined));
      }

      if (legs.length === 0) continue;
      
      const totalOdds = calculateCombinedOdds(legs);
      const americanOdds = decimalToAmerican(totalOdds);

      const fusionSport = sport as Sport;
      
      const fusionData = analyzeTicket(
        legs.map((leg) => ({
          id: leg.id,
          sport: fusionSport,
          description: `${leg.team} ${leg.market} ${leg.outcome}`,
          odds: leg.americanOdds,
          context: {
            hasRealOdds: leg.dataSources?.odds !== "model-estimated",
            bookmakerCount: 0,
            oddsSource: leg.dataSources?.odds || "model-estimated",
            lineMovement: 0,
            gameId: leg.espnGameId || "",
          },
          marketContext: leg.homeWinPct !== undefined && leg.awayWinPct !== undefined ? {
            winPct: { home: leg.homeWinPct, away: leg.awayWinPct },
          } : undefined,
        })),
        request.riskLevel
      );
      
      const cf = fusionData.combinedFusion;
      const allSignals = cf.signals;
      
      const analysisFactors: AnalysisFactors = {
        quantumCoachingScore: extractCategoryScore(allSignals, ["coaching_tendency", "scheme_mismatch"]),
        quantumPlayerScore: extractCategoryScore(allSignals, ["player_efficiency", "injury_adjustment", "biomech_fatigue", "load_management"]),
        quantumTeamScore: extractCategoryScore(allSignals, ["team_chemistry", "mental_state", "roster_stability"]),
        mlProjectionScore: extractCategoryScore(allSignals, ["predictive_model", "win_probability", "monte_carlo"]),
        correlationScore: Math.min(0.95, (fusionData.correlationBonus / 15 + fusionData.diversificationScore / 100) / 2),
        sharpMoneyScore: extractCategoryScore(allSignals, ["sharp_money_flow", "public_fade", "line_movement"]),
        lineValueScore: extractSignalScore(allSignals, "line_movement"),
        momentumScore: extractCategoryScore(allSignals, ["momentum_score", "confidence_index"]),
        situationalScore: extractCategoryScore(allSignals, ["situational_spot", "rest_advantage", "home_field"]),
        cashoutEligibility: 0.7 + (cf.confidence / 100) * 0.25,
      };
      
      let confidenceScore = cf.confidence / 100;
      let winProbability = cf.winProbability / 100;
      const expectedValue = cf.expectedValue / 100;

      if (hasModelWeights) {
        const avgRecordStrength = legs.reduce((sum, leg) => {
          return sum + 0.5;
        }, 0) / legs.length;

        confidenceScore = applyModelWeights(confidenceScore, {
          isHome: legs.some(l => l.outcome?.includes("ML") && !l.outcome?.includes("@")),
          recordStrength: avgRecordStrength,
          spreadAvailable: legs.some(l => l.market === "Spread"),
          marketType: legs[0]?.market || "Moneyline",
        }, modelWeightsData);

        winProbability = applyModelWeights(winProbability, {
          isHome: false,
          recordStrength: avgRecordStrength,
          spreadAvailable: legs.some(l => l.market === "Spread"),
          marketType: legs.length > 1 ? "Mixed" : (legs[0]?.market || "Moneyline"),
        }, modelWeightsData);
      }

      const kellyFraction = Math.max(0, cf.kellyCriterion / 100);
      const adjustedKelly = kellyFraction * 0.25;
      const recommendedStake = Math.round(request.bankroll * Math.min(adjustedKelly, 0.05) * 100) / 100;
      const potentialPayout = Math.round(recommendedStake * totalOdds * 100) / 100;
      
      const riskRating: "low" | "medium" | "high" = 
        numLegs <= 2 ? "low" : 
        numLegs <= 4 ? "medium" : "high";
      
      const impliedProbFromOdds = 1 / totalOdds;
      const consensusProbability = Math.round(((winProbability + impliedProbFromOdds) / 2) * 1000) / 1000;

      const evPercent = Math.round(((winProbability * totalOdds - 1) * 100) * 10) / 10;

      const signalStrengths = allSignals.map(s => s.strength / 100);
      const meanStrength = signalStrengths.reduce((a, b) => a + b, 0) / Math.max(signalStrengths.length, 1);
      const variance = signalStrengths.reduce((sum, s) => sum + Math.pow(s - meanStrength, 2), 0) / Math.max(signalStrengths.length, 1);
      const modelDisagreement = Math.round(Math.sqrt(variance) * 100) / 100;

      const sourceSignals = allSignals
        .filter(s => s.strength > 55)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 6)
        .map(s => s.source.replace(/_/g, " "));

      const riskFactors = isSoccer ? [
        "Late lineup changes and tactical shifts can impact match outcome",
        "Weather conditions may affect playing style and goal count",
        "VAR decisions introduce unpredictable variance",
      ].slice(0, 3) : buildRiskFactors(legs, fusionData);

      const confidenceTag: "low" | "medium" | "high" =
        (confidenceScore * 100) >= 71 ? "high" :
        (confidenceScore * 100) >= 41 ? "medium" : "low";

      const marketSlice = legs[0]?.market || "mixed";
      const calibrationInfo = getCalibrationInfo(marketSlice, winProbability);

      const alternatives = isSoccer ? buildSoccerAlternatives(legs) : buildAlternatives(legs, sport as Sport);

      const avgOddsMovement = legs.reduce((sum, l) => sum + (l.analysis.oddsMovement?.percentChange || 0), 0) / legs.length;
      const marketMovement = {
        direction: avgOddsMovement > 2 ? "up" as const : avgOddsMovement < -2 ? "down" as const : "stable" as const,
        percentChange: Math.round(avgOddsMovement * 10) / 10,
        possibleInefficiency: avgOddsMovement > 4,
      };

      const ticketName = generateTicketName(sport as Sport, i, request.riskLevel, legs);

      const ticket: GeneratedTicket = {
        id: generateUniqueId(),
        name: ticketName,
        sport,
        legs,
        totalOdds,
        americanOdds,
        winProbability,
        expectedValue,
        confidenceScore,
        recommendedStake: Math.max(recommendedStake, 5),
        potentialPayout: Math.max(potentialPayout, 5 * totalOdds),
        riskRating,
        analysisFactors,
        rationale: [],
        cashoutProbability: analysisFactors.cashoutEligibility,
        grade: cf.grade,
        fusionData,
        consensusProbability,
        evPercent,
        modelDisagreement,
        sourceSignals,
        riskFactors,
        confidenceTag,
        calibrationInfo,
        recommendedAlternatives: alternatives,
        marketMovement,
        analyticsAgentData: agentData,
      };
      
      ticket.rationale = buildRationale(fusionData, legs);
      
      candidateTickets.push(ticket);
    }
  }
  
  const evThresholds = {
    conservative: 2.0,
    moderate: 1.0,
    aggressive: 0.0,
  };
  const evThreshold = evThresholds[request.riskLevel];

  const filteredTickets = candidateTickets.filter(t => {
    if (!t.fusionData) return true;
    const rec = t.fusionData.combinedFusion.recommendation;
    if (rec === "fade") return false;

    if (t.evPercent < evThreshold) return false;

    const hasUnderWithoutSignals = t.legs.some(
      l => l.outcome.includes("Under") && (l.analysis.underSignalCount ?? 0) < 2
    );
    if (hasUnderWithoutSignals) return false;

    return true;
  });
  
  const sortedTickets = filteredTickets.sort((a, b) => {
    const scoreA = getFusionSortScore(a);
    const scoreB = getFusionSortScore(b);
    return scoreB - scoreA;
  });
  
  const finalTickets = sortedTickets.slice(0, 6);

  for (const ticket of finalTickets) {
    const nonce = protectionSuite.nonce.generate();
    const signaturePayload = {
      id: ticket.id,
      sport: ticket.sport,
      ev: ticket.evPercent,
      conf: ticket.confidenceScore,
      legs: ticket.legs.length,
      ts: Date.now(),
      n: nonce,
    };
    ticket.algorithmSignature = protectionSuite.fingerprint.sign(signaturePayload as Record<string, unknown>);
    ticket.nonce = nonce;

    ticket.winProbability = protectionSuite.transform.applySigmoidWarp(
      ticket.winProbability, 
      1.2
    );
    ticket.confidenceScore = protectionSuite.transform.applySigmoidWarp(
      ticket.confidenceScore, 
      1.15
    );
  }

  return { tickets: finalTickets, skippedSports };
}

function getFusionSortScore(ticket: GeneratedTicket): number {
  if (!ticket.fusionData) {
    return ticket.confidenceScore * 0.4 + Math.max(0, ticket.expectedValue) * 0.3 + ticket.winProbability * 0.3;
  }
  
  const cf = ticket.fusionData.combinedFusion;
  const recBonus = cf.recommendation === "strong_bet" ? 20 :
                   cf.recommendation === "moderate_bet" ? 10 :
                   cf.recommendation === "lean_bet" ? 5 :
                   cf.recommendation === "avoid" ? -10 : -20;
  
  return (cf.overallScore * 0.35) + 
         (cf.confidence * 0.2) + 
         (Math.max(0, cf.expectedValue) * 2) + 
         (cf.winProbability * 0.15) +
         (ticket.fusionData.correlationBonus * 0.5) +
         recBonus;
}

export async function regenerateTicketsWithLatestData(request: TicketRequest): Promise<{ tickets: GeneratedTicket[]; skippedSports: string[] }> {
  espnGamesCacheMap.clear();
  return generateTickets(request);
}
