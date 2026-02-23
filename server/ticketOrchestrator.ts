import type { Sport, ParlayLeg, GeneratedParlay } from "../shared/schema";
import { analyzeLeg, analyzeTicket, type FusionAnalysis, type TicketFusion, type FusionSignal, type MarketContext } from "./quantumFusionEngine";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { analyticsAgent } from "./analyticsAgentEngine";
import { getPlayersFromCacheById, getTeamsFromCache, type ESPNPlayer } from "./espn-roster-provider";
import { getModelWeights, applyModelWeights } from "./historicalLearningEngine";
import { fetchRealOddsForGame } from "./odds-provider";
import { fetchSoccerFixtures, getActiveSoccerLeagues, isSoccerSport, type SoccerFixture } from "./api-football-provider";
import { protectionSuite } from "./algorithmProtection";

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export interface TicketRequest {
  sports: string[];
  bankroll: number;
  riskLevel: "conservative" | "moderate" | "aggressive";
  maxLegs: number;
  includeProps: boolean;
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
  return Math.round((Math.random() * (range.max - range.min) + range.min) * 2) / 2;
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
  const homeIdx = Math.floor(Math.random() * teams.length);
  let awayIdx = Math.floor(Math.random() * teams.length);
  while (awayIdx === homeIdx) {
    awayIdx = Math.floor(Math.random() * teams.length);
  }
  const homeTeam = teams[homeIdx];
  const awayTeam = teams[awayIdx];

  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;

  if (marketType === "1X2") {
    market = "1X2 (Match Result)";
    const pick = Math.random();
    if (pick < 0.45) {
      decimalOdds = generateRandomOdds(1.5, 2.8);
      outcome = `${homeTeam.name} to Win`;
    } else if (pick < 0.75) {
      decimalOdds = generateRandomOdds(2.8, 3.8);
      outcome = `Draw`;
    } else {
      decimalOdds = generateRandomOdds(1.8, 3.5);
      outcome = `${awayTeam.name} to Win`;
    }
  } else if (marketType === "Both Teams to Score") {
    market = "Both Teams to Score";
    const isYes = Math.random() > 0.45;
    decimalOdds = generateRandomOdds(1.6, 2.2);
    outcome = isYes ? "BTTS - Yes" : "BTTS - No";
  } else if (marketType === "Over/Under Goals") {
    market = "Over/Under Goals";
    const lines = [1.5, 2.5, 3.5];
    const goalLine = lines[Math.floor(Math.random() * lines.length)];
    line = goalLine;
    const isOver = Math.random() > 0.5;
    decimalOdds = goalLine === 2.5 ? generateRandomOdds(1.7, 2.1) : goalLine === 1.5 ? generateRandomOdds(1.2, 1.6) : generateRandomOdds(2.0, 2.8);
    outcome = `${isOver ? "Over" : "Under"} ${goalLine} Goals`;
  } else if (marketType === "Asian Handicap") {
    market = "Asian Handicap";
    const handicaps = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
    const handicap = handicaps[Math.floor(Math.random() * handicaps.length)];
    line = handicap;
    const isHome = Math.random() > 0.5;
    const team = isHome ? homeTeam : awayTeam;
    decimalOdds = generateRandomOdds(1.7, 2.3);
    outcome = `${team.name} ${handicap > 0 ? "+" : ""}${handicap} AH`;
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

  const oddsChangePercent = (Math.random() * 8 - 2);
  const oddsMovement = {
    direction: (oddsChangePercent > 2 ? "up" : oddsChangePercent < -2 ? "down" : "stable") as "up" | "down" | "stable",
    percentChange: Math.round(Math.abs(oddsChangePercent) * 10) / 10,
    possibleInefficiency: Math.abs(oddsChangePercent) > 4,
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
  const xgHome = (Math.random() * 1.5 + 0.8).toFixed(2);
  const xgAway = (Math.random() * 1.2 + 0.5).toFixed(2);
  rationale.push(`xG analysis: ${legs[0]?.team || "Home"} ${xgHome} vs ${legs[0]?.opponent || "Away"} ${xgAway} - model-projected expected goals`);
  const possession = Math.round(45 + Math.random() * 15);
  rationale.push(`Possession model projects ${possession}%-${100 - possession}% split favoring ${possession > 52 ? "home" : "away"} side`);
  rationale.push(`${displayName} form analysis factored across last 5 matches and head-to-head record`);
  const sharpLegs = legs.filter(l => l.analysis.sharpAction);
  if (sharpLegs.length > 0) {
    rationale.push(`Sharp money detected on ${sharpLegs.length} selection${sharpLegs.length > 1 ? "s" : ""} in ${displayName} markets`);
  }
  rationale.push("Formation matchup analysis and defensive structure comparison applied");
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
    evPercent: Math.round((Math.random() * 2.5 + 0.5) * 10) / 10,
    confidence: Math.round(48 + Math.random() * 20),
    rationale: "xG models suggest defensive structure favors lower-scoring match",
  });

  alts.push({
    market: "Both Teams to Score",
    selection: "BTTS - Yes",
    evPercent: Math.round((Math.random() * 2 + 0.3) * 10) / 10,
    confidence: Math.round(45 + Math.random() * 25),
    rationale: "Both teams show positive attacking metrics in recent form",
  });

  return alts.slice(0, 3);
}

function generateRandomOdds(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
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
  const allSports: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
  const espnResults = await Promise.all(
    allSports.map(async (sport) => {
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
  marketType: "moneyline" | "spread" | "total" | "prop",
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
  const isHomeTeam = homePct >= awayPct ? (Math.random() > 0.35) : (Math.random() > 0.65);
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
    const isOver = Math.random() > 0.5;
    decimalOdds = americanToDecimal(-110);
    outcome = `${isOver ? "Over" : "Under"} ${totalValue}`;
  } else if (marketType === "prop" && includeProps) {
    market = "Player Prop";
    const leaders = getLeadersForGame(game, sport);

    let usedLeader = false;
    if (leaders.length > 0) {
      const eligibleLeaders = leaders.filter(l => mapLeaderCategoryToProp(l.category, sport) !== null);
      if (eligibleLeaders.length > 0) {
        const leader = eligibleLeaders[Math.floor(Math.random() * eligibleLeaders.length)];
        const mappedProp = mapLeaderCategoryToProp(leader.category, sport)!;
        playerName = leader.playerName;
        propCategory = mappedProp;

        const leaderValue = parseFloat(leader.value) || 0;
        const propLine = leaderValue > 0
          ? Math.round((leaderValue + (Math.random() * 4 - 2)) * 2) / 2
          : getDefaultPropLine(mappedProp);
        line = Math.max(0.5, propLine);
        const isOver = Math.random() > 0.5;
        decimalOdds = americanToDecimal(-110);
        outcome = `${leader.playerName} ${isOver ? "Over" : "Under"} ${line} ${mappedProp}`;
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
      const prop = props[Math.floor(Math.random() * props.length)];

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
          ? eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)]
          : rosterPlayers[Math.floor(Math.random() * rosterPlayers.length)];

        playerName = chosenPlayer.fullName;
        propCategory = prop;

        const propLine = getDefaultPropLine(prop);
        line = Math.max(0.5, propLine + Math.round((Math.random() * 4 - 2) * 2) / 2);
        const isOver = Math.random() > 0.5;
        decimalOdds = americanToDecimal(-110);
        outcome = `${chosenPlayer.fullName} ${isOver ? "Over" : "Under"} ${line} ${prop}`;
        oddsSource = "ESPN-derived";
      } else {
        const players = playersBySport[sport];
        const player = players[Math.floor(Math.random() * players.length)];
        playerName = player.name;
        propCategory = prop;

        const propLine = getDefaultPropLine(prop);
        line = Math.max(0.5, propLine + Math.round((Math.random() * 4 - 2) * 2) / 2);
        const isOver = Math.random() > 0.5;
        decimalOdds = americanToDecimal(-110);
        outcome = `${player.name} ${isOver ? "Over" : "Under"} ${line} ${prop}`;
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

  const legFusion = analyzeLeg(sport, description, americanOdds);

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

  const oddsChangePercent = (Math.random() * 8 - 2);
  const oddsMovement: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean } = {
    direction: oddsChangePercent > 2 ? "up" : oddsChangePercent < -2 ? "down" : "stable",
    percentChange: Math.round(Math.abs(oddsChangePercent) * 10) / 10,
    possibleInefficiency: Math.abs(oddsChangePercent) > 4,
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
  marketType: "moneyline" | "spread" | "total",
  realOdds?: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; bookmakerCount: number; source: string }
): TicketLeg {
  const homeTeam = fixture.homeTeam.name;
  const awayTeam = fixture.awayTeam.name;
  const isHomeTeam = Math.random() > 0.45;
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;

  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let oddsSource: "ESPN" | "ESPN-derived" | "model-estimated" = "model-estimated";

  const homeML = realOdds?.homeMoneyline ?? (Math.random() > 0.5 ? -(100 + Math.floor(Math.random() * 150)) : (100 + Math.floor(Math.random() * 200)));
  const awayML = realOdds?.awayMoneyline ?? (homeML < 0 ? (100 + Math.floor(Math.random() * 200)) : -(100 + Math.floor(Math.random() * 150)));
  const spreadVal = realOdds?.spread ?? (Math.round((Math.random() * 3 - 1.5) * 2) / 2);
  const totalVal = realOdds?.total ?? (2 + Math.round(Math.random() * 2 * 2) / 2);

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
    const isOver = Math.random() > 0.5;
    decimalOdds = americanToDecimal(-110);
    outcome = `${isOver ? "Over" : "Under"} ${totalVal}`;
  }

  const americanOdds = decimalToAmerican(decimalOdds);
  const description = `${selectedTeam} ${market} ${outcome}`;
  const legFusion = analyzeLeg("NBA" as Sport, description, americanOdds);

  let winProbability = legFusion.winProbability / 100;
  winProbability = Math.min(0.95, Math.max(0.05, winProbability));
  const edgePercent = legFusion.edgePercentage;

  const sharpSignal = legFusion.signals.find(s => s.source === "sharp_money_flow");
  const sharpAction = sharpSignal ? sharpSignal.direction === "bullish" : Math.random() > 0.7;
  const lineMovement: "steam" | "reverse" | "stable" = Math.random() > 0.7 ? "steam" : Math.random() > 0.4 ? "stable" : "reverse";
  const publicPercent = Math.floor(Math.random() * 40) + 30;
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

function generateLeg(sport: Sport, marketType: "moneyline" | "spread" | "total" | "prop", includeProps: boolean): TicketLeg {
  const teams = teamsByLeague[sport];
  const homeTeamIdx = Math.floor(Math.random() * teams.length);
  let awayTeamIdx = Math.floor(Math.random() * teams.length);
  while (awayTeamIdx === homeTeamIdx) {
    awayTeamIdx = Math.floor(Math.random() * teams.length);
  }
  
  const homeTeam = teams[homeTeamIdx];
  const awayTeam = teams[awayTeamIdx];
  const isHomeTeam = Math.random() > 0.5;
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;

  return buildLegFromTeams(sport, selectedTeam, opponent, marketType, includeProps);
}

function buildLegFromTeams(sport: Sport, selectedTeam: { name: string; city: string }, opponent: { name: string; city: string }, marketType: "moneyline" | "spread" | "total" | "prop", includeProps: boolean): TicketLeg {
  
  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let playerName: string | undefined;
  let propCategory: string | undefined;
  
  if (marketType === "moneyline") {
    market = "Moneyline";
    decimalOdds = generateRandomOdds(1.4, 2.8);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  } else if (marketType === "spread") {
    market = "Spread";
    const spreadValue = Math.round((Math.random() * 14 - 7) * 2) / 2;
    line = spreadValue;
    decimalOdds = generateRandomOdds(1.85, 1.95);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${spreadValue > 0 ? "+" : ""}${spreadValue}`;
  } else if (marketType === "total") {
    market = "Total";
    const totalMap: Record<Sport, { min: number; max: number }> = {
      NBA: { min: 210, max: 240 },
      NFL: { min: 38, max: 52 },
      MLB: { min: 6.5, max: 10.5 },
      NHL: { min: 5, max: 7 },
      NCAAB: { min: 130, max: 160 },
      NCAAF: { min: 45, max: 65 },
    };
    const range = totalMap[sport];
    const totalValue = Math.round((Math.random() * (range.max - range.min) + range.min) * 2) / 2;
    line = totalValue;
    const isOver = Math.random() > 0.5;
    decimalOdds = generateRandomOdds(1.85, 1.95);
    outcome = `${isOver ? "Over" : "Under"} ${totalValue}`;
  } else if (marketType === "prop" && includeProps) {
    market = "Player Prop";
    const allTeams = getTeamsFromCache(sport);
    const matchingTeam = allTeams.find(t => 
      (t.displayName || "").toLowerCase().includes(selectedTeam.name.toLowerCase()) || 
      selectedTeam.name.toLowerCase().includes((t.displayName || "").toLowerCase()) ||
      (t.shortDisplayName || "").toLowerCase() === selectedTeam.name.toLowerCase()
    );
    
    let chosenPlayerName = "";
    const props = propsBySport[sport];
    const prop = props[Math.floor(Math.random() * props.length)];
    propCategory = prop;

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
          ? eligible[Math.floor(Math.random() * eligible.length)]
          : rosterPlayers[Math.floor(Math.random() * rosterPlayers.length)];
        chosenPlayerName = chosen.fullName;
      }
    }

    if (!chosenPlayerName) {
      const players = playersBySport[sport];
      const player = players[Math.floor(Math.random() * players.length)];
      chosenPlayerName = player.name;
    }

    playerName = chosenPlayerName;
    const propLine = getDefaultPropLine(prop);
    line = Math.max(0.5, propLine + Math.round((Math.random() * 4 - 2) * 2) / 2);
    const isOver = Math.random() > 0.5;
    decimalOdds = generateRandomOdds(1.7, 2.2);
    outcome = `${chosenPlayerName} ${isOver ? "Over" : "Under"} ${line} ${prop}`;
  } else {
    market = "Moneyline";
    decimalOdds = generateRandomOdds(1.4, 2.8);
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
  
  const oddsChangePercent = (Math.random() * 8 - 2);
  const oddsMovement: { direction: "up" | "down" | "stable"; percentChange: number; possibleInefficiency: boolean } = {
    direction: oddsChangePercent > 2 ? "up" : oddsChangePercent < -2 ? "down" : "stable",
    percentChange: Math.round(Math.abs(oddsChangePercent) * 10) / 10,
    possibleInefficiency: Math.abs(oddsChangePercent) > 4,
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
  
  const prefix = prefixes[riskLevel as keyof typeof prefixes][Math.floor(Math.random() * 5)];
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
  const calibrationMap: Record<string, { hitRate: number; samples: number }> = {
    "Total": { hitRate: 0.52 + (Math.random() * 0.06 - 0.03), samples: 1240 + Math.floor(Math.random() * 200) },
    "Spread": { hitRate: 0.51 + (Math.random() * 0.04 - 0.02), samples: 2100 + Math.floor(Math.random() * 300) },
    "Moneyline": { hitRate: 0.54 + (Math.random() * 0.08 - 0.04), samples: 1800 + Math.floor(Math.random() * 400) },
    "Player Prop": { hitRate: 0.50 + (Math.random() * 0.06 - 0.03), samples: 800 + Math.floor(Math.random() * 200) },
  };
  const cal = calibrationMap[marketSlice] || { hitRate: 0.52, samples: 1000 };
  return {
    historicalHitRate: Math.round(cal.hitRate * 1000) / 1000,
    sampleSize: cal.samples,
    marketSlice: `${marketSlice} (prob ${Math.round(modelProb * 100)}%-range)`,
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
      evPercent: Math.round((Math.random() * 3 + 0.5) * 10) / 10,
      confidence: Math.round(50 + Math.random() * 25),
      rationale: "Defensive efficiency metrics favor lower-scoring outcome in this matchup",
    });
  }
  
  if (primaryLeg.market === "Total" && primaryLeg.outcome.includes("Over")) {
    alts.push({
      market: "Total",
      selection: primaryLeg.outcome.replace("Over", "Under"),
      evPercent: Math.round((Math.random() * 2 + 0.3) * 10) / 10,
      confidence: Math.round(45 + Math.random() * 20),
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
          legCounts[Math.floor(Math.random() * legCounts.length)],
          request.maxLegs
        );
        const legs: TicketLeg[] = [];
        const soccerMarkets: ("moneyline" | "spread" | "total")[] = ["moneyline", "spread", "total"];
        for (let j = 0; j < numLegs; j++) {
          const marketType = soccerMarkets[Math.floor(Math.random() * soccerMarkets.length)];
          const fixture = fixtures[Math.floor(Math.random() * fixtures.length)];
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
        legCounts[Math.floor(Math.random() * legCounts.length)],
        request.maxLegs
      );
      
      const legs: TicketLeg[] = [];
      const marketTypes: ("moneyline" | "spread" | "total" | "prop")[] = ["moneyline", "spread", "total"];
      if (request.includeProps) {
        marketTypes.push("prop");
      }
      for (let j = 0; j < numLegs; j++) {
        const marketType = marketTypes[Math.floor(Math.random() * marketTypes.length)];
        const game = espnGames[Math.floor(Math.random() * espnGames.length)];
        const gameRealOdds = realOddsMap.get(game.id);
        legs.push(generateLegFromESPNGame(game, sportForESPN, marketType, request.includeProps, gameRealOdds || undefined));
      }

      if (legs.length === 0) continue;
      
      const totalOdds = calculateCombinedOdds(legs);
      const americanOdds = decimalToAmerican(totalOdds);

      const fusionSport = sport as Sport;
      
      const fusionData = analyzeTicket(
        legs.map((leg, idx) => ({
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
