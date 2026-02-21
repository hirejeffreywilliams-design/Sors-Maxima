import { randomUUID } from "crypto";
import type { Sport, SportEvent, ParlayLeg, PlayerProp, InjuryStatus, WeatherData, SituationalFactor, HistoricalTrend, LineMovement, BettingPercentages, EVAnalysis } from "@shared/schema";
import { americanToDecimal, propCategories } from "@shared/schema";
import { getPlayersFromCache, getPlayersFromCacheById, getInjuredPlayersFromCache, getTeamRoster, getTeams, preloadAllRosters, isRosterPreloaded, type ESPNPlayer } from "./espn-roster-provider";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";

function generateEVAnalysis(decimalOdds: number, outcomeId: string): EVAnalysis {
  const impliedProbability = 1 / decimalOdds;
  const variance = (Math.random() - 0.5) * 0.15;
  const modelProbability = Math.min(0.95, Math.max(0.05, impliedProbability + variance));
  const edge = (modelProbability - impliedProbability) / impliedProbability;
  
  let evRating: "strong" | "moderate" | "weak" | "negative";
  if (edge > 0.08) evRating = "strong";
  else if (edge > 0.03) evRating = "moderate";
  else if (edge > 0) evRating = "weak";
  else evRating = "negative";
  
  return {
    legId: outcomeId,
    impliedProbability,
    modelProbability,
    edge,
    isPositiveEV: edge > 0,
    evRating,
  };
}

function generateLineMovement(gameId: string, market: string, outcome: string, currentOdds: number): LineMovement {
  const movementAmount = (Math.random() - 0.5) * 30;
  const openingOdds = currentOdds - movementAmount;
  const sharpAction = Math.abs(movementAmount) > 10 && Math.random() > 0.6;
  
  let direction: "steam" | "reverse" | "stable";
  if (Math.abs(movementAmount) < 5) direction = "stable";
  else if (movementAmount > 0) direction = "steam";
  else direction = "reverse";
  
  return {
    gameId,
    market,
    outcome,
    openingOdds,
    currentOdds,
    movement: movementAmount,
    direction,
    sharpAction,
  };
}

function generateBettingPercentages(gameId: string, market: string, outcome: string): BettingPercentages {
  const publicPercentage = Math.floor(Math.random() * 40) + 30;
  const moneyPercentage = Math.floor(Math.random() * 60) + 20;
  const sharpSide = moneyPercentage > 60 && publicPercentage < 45;
  
  return {
    gameId,
    market,
    outcome,
    publicPercentage,
    moneyPercentage,
    sharpSide,
  };
}

function generateInjuries(homeTeam: string, awayTeam: string, sport: Sport): InjuryStatus[] {
  const injuries: InjuryStatus[] = [];
  const statuses: Array<"out" | "doubtful" | "questionable" | "probable" | "healthy"> = ["out", "doubtful", "questionable", "probable", "healthy"];
  const injuryTypes = sport === "NFL" ? ["knee", "ankle", "hamstring", "concussion", "shoulder"] :
                      sport === "NBA" ? ["ankle", "knee", "back", "hamstring", "illness"] :
                      sport === "MLB" ? ["elbow", "shoulder", "oblique", "back", "wrist"] :
                      ["lower body", "upper body", "illness", "undisclosed"];
  
  [homeTeam, awayTeam].forEach(team => {
    if (Math.random() > 0.6) {
      const status = statuses[Math.floor(Math.random() * 4)];
      const impactRating = status === "out" ? -0.8 : status === "doubtful" ? -0.5 : status === "questionable" ? -0.3 : -0.1;
      injuries.push({
        playerId: randomUUID(),
        playerName: `${team.split(" ").pop()} Key Player`,
        team,
        status,
        injury: injuryTypes[Math.floor(Math.random() * injuryTypes.length)],
        impactRating,
      });
    }
  });
  
  return injuries;
}

function generateInjuriesFromRosters(homeTeam: string, awayTeam: string, sport: Sport, homeTeamId?: string, awayTeamId?: string): InjuryStatus[] {
  const injuries: InjuryStatus[] = [];

  const statusMap: Record<string, "out" | "doubtful" | "questionable" | "probable"> = {
    "day-to-day": "questionable",
    "out": "out",
    "injured reserve": "out",
    "suspended": "out",
    "injured": "out",
    "questionable": "questionable",
    "doubtful": "doubtful",
    "probable": "probable",
    "10-day injured list": "out",
    "15-day injured list": "out",
    "60-day injured list": "out",
    "injured list": "out",
    "paternity list": "out",
    "bereavement list": "out",
    "reserve/injured": "out",
    "reserve/suspended": "out",
    "practice squad": "out",
  };

  const teams = [
    { name: homeTeam, id: homeTeamId },
    { name: awayTeam, id: awayTeamId },
  ];

  for (const team of teams) {
    if (!team.id) continue;
    const injuredPlayers = getInjuredPlayersFromCache(sport, team.id);

    for (const player of injuredPlayers) {
      const statusType = player.status?.type?.toLowerCase() || "";
      const statusName = player.status?.name?.toLowerCase() || "";
      const mappedStatus = statusMap[statusType] || statusMap[statusName] || "questionable";
      const impactRating = mappedStatus === "out" ? -0.8 : mappedStatus === "doubtful" ? -0.5 : mappedStatus === "questionable" ? -0.3 : -0.1;

      injuries.push({
        playerId: player.id,
        playerName: player.fullName,
        team: team.name,
        status: mappedStatus,
        injury: player.status?.name || "Unknown",
        impactRating,
      });
    }
  }

  if (injuries.length === 0) {
    return generateInjuries(homeTeam, awayTeam, sport);
  }

  return injuries;
}

function generateWeather(gameId: string, sport: Sport): WeatherData | undefined {
  if (sport === "NBA" || sport === "NCAAB" || sport === "NHL") {
    return { gameId, temperature: 70, windSpeed: 0, precipitation: 0, conditions: "dome", impactOnTotal: 0 };
  }
  
  const conditions: Array<"clear" | "cloudy" | "rain" | "snow"> = ["clear", "cloudy", "rain", "snow"];
  const condition = conditions[Math.floor(Math.random() * 4)];
  const temperature = Math.floor(Math.random() * 50) + 30;
  const windSpeed = Math.floor(Math.random() * 25);
  const precipitation = condition === "rain" ? Math.random() * 0.5 : condition === "snow" ? Math.random() * 0.3 : 0;
  
  let impactOnTotal = 0;
  if (windSpeed > 15) impactOnTotal -= 3;
  if (temperature < 40) impactOnTotal -= 2;
  if (precipitation > 0.2) impactOnTotal -= 4;
  
  return { gameId, temperature, windSpeed, precipitation, conditions: condition, impactOnTotal };
}

function generateSituationalFactors(gameId: string, homeTeam: string, awayTeam: string): SituationalFactor[] {
  const factors: SituationalFactor[] = [];
  const possibleFactors: Array<{ type: "back_to_back" | "rest_advantage" | "revenge_game" | "divisional" | "primetime" | "travel"; description: string; impactRating: number }> = [
    { type: "back_to_back", description: "Playing second of back-to-back games", impactRating: -0.15 },
    { type: "rest_advantage", description: "3+ days rest advantage", impactRating: 0.1 },
    { type: "revenge_game", description: "Lost to opponent by 20+ last meeting", impactRating: 0.08 },
    { type: "divisional", description: "Divisional rivalry matchup", impactRating: 0.05 },
    { type: "primetime", description: "National TV primetime game", impactRating: 0.03 },
    { type: "travel", description: "Cross-country travel (3+ time zones)", impactRating: -0.08 },
  ];
  
  [homeTeam, awayTeam].forEach(team => {
    const teamFactors = possibleFactors.filter(() => Math.random() > 0.7);
    if (teamFactors.length > 0) {
      factors.push({
        gameId,
        team,
        factors: teamFactors,
      });
    }
  });
  
  return factors;
}

function generateHistoricalTrends(playerId: string, playerName: string, category: string, line: number): HistoricalTrend {
  const hitRate = Math.random() * 0.4 + 0.4;
  const last10 = Math.floor(Math.random() * 6) + 4;
  const streak = Math.floor(Math.random() * 8);
  const streakType: "over" | "under" | "none" = streak > 2 ? (Math.random() > 0.5 ? "over" : "under") : "none";
  
  return {
    playerId,
    category,
    line,
    hitRate,
    last10,
    streak,
    streakType,
    homeAwayFactor: Math.random() * 0.2 - 0.1,
  };
}

const nbaTeams = [
  "New York Knicks", "Dallas Mavericks", "Denver Nuggets", "Miami Heat",
  "Milwaukee Bucks", "Phoenix Suns", "Philadelphia 76ers", "Brooklyn Nets",
  "Cleveland Cavaliers", "Memphis Grizzlies", "Sacramento Kings", "Atlanta Hawks",
  "Minnesota Timberwolves", "Indiana Pacers", "Orlando Magic", "Chicago Bulls"
];

const nflTeams = [
  "Kansas City Chiefs", "Philadelphia Eagles", "San Francisco 49ers", "Buffalo Bills",
  "Dallas Cowboys", "Cincinnati Bengals", "Miami Dolphins", "Baltimore Ravens",
  "Detroit Lions", "Jacksonville Jaguars", "New York Jets", "Los Angeles Chargers",
  "Seattle Seahawks", "Cleveland Browns", "Minnesota Vikings", "Green Bay Packers"
];

const mlbTeams = [
  "Los Angeles Dodgers", "Atlanta Braves", "Houston Astros", "New York Yankees",
  "Tampa Bay Rays", "San Diego Padres", "Philadelphia Phillies", "Toronto Blue Jays",
  "Seattle Mariners", "New York Mets", "Cleveland Guardians", "St. Louis Cardinals",
  "Baltimore Orioles", "Texas Rangers", "Minnesota Twins", "Chicago Cubs"
];

const nhlTeams = [
  "Boston Bruins", "Carolina Hurricanes", "New Jersey Devils", "Toronto Maple Leafs",
  "Tampa Bay Lightning", "New York Rangers", "Edmonton Oilers", "Vegas Golden Knights",
  "Colorado Avalanche", "Dallas Stars", "Los Angeles Kings", "Seattle Kraken",
  "Minnesota Wild", "Winnipeg Jets", "Florida Panthers", "Detroit Red Wings"
];

interface MockPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
}

const nflPlayers: Record<string, MockPlayer[]> = {
  "Kansas City Chiefs": [
    { id: "kc1", name: "Patrick Mahomes", position: "QB", team: "Kansas City Chiefs" },
    { id: "kc2", name: "Travis Kelce", position: "TE", team: "Kansas City Chiefs" },
    { id: "kc3", name: "Isiah Pacheco", position: "RB", team: "Kansas City Chiefs" },
    { id: "kc4", name: "Rashee Rice", position: "WR", team: "Kansas City Chiefs" },
  ],
  "Philadelphia Eagles": [
    { id: "phi1", name: "Jalen Hurts", position: "QB", team: "Philadelphia Eagles" },
    { id: "phi2", name: "A.J. Brown", position: "WR", team: "Philadelphia Eagles" },
    { id: "phi3", name: "Saquon Barkley", position: "RB", team: "Philadelphia Eagles" },
    { id: "phi4", name: "DeVonta Smith", position: "WR", team: "Philadelphia Eagles" },
  ],
  "San Francisco 49ers": [
    { id: "sf1", name: "Brock Purdy", position: "QB", team: "San Francisco 49ers" },
    { id: "sf2", name: "Christian McCaffrey", position: "RB", team: "San Francisco 49ers" },
    { id: "sf3", name: "Deebo Samuel", position: "WR", team: "San Francisco 49ers" },
    { id: "sf4", name: "George Kittle", position: "TE", team: "San Francisco 49ers" },
  ],
  "Buffalo Bills": [
    { id: "buf1", name: "Josh Allen", position: "QB", team: "Buffalo Bills" },
    { id: "buf2", name: "Stefon Diggs", position: "WR", team: "Buffalo Bills" },
    { id: "buf3", name: "James Cook", position: "RB", team: "Buffalo Bills" },
    { id: "buf4", name: "Dalton Kincaid", position: "TE", team: "Buffalo Bills" },
  ],
};

const nbaPlayers: Record<string, MockPlayer[]> = {
  "New York Knicks": [
    { id: "nyk1", name: "Jalen Brunson", position: "PG", team: "New York Knicks" },
    { id: "nyk2", name: "Julius Randle", position: "PF", team: "New York Knicks" },
    { id: "nyk3", name: "OG Anunoby", position: "SF", team: "New York Knicks" },
  ],
  "Dallas Mavericks": [
    { id: "dal1", name: "Luka Doncic", position: "PG", team: "Dallas Mavericks" },
    { id: "dal2", name: "Kyrie Irving", position: "SG", team: "Dallas Mavericks" },
    { id: "dal3", name: "Dereck Lively", position: "C", team: "Dallas Mavericks" },
  ],
  "Denver Nuggets": [
    { id: "den1", name: "Nikola Jokic", position: "C", team: "Denver Nuggets" },
    { id: "den2", name: "Jamal Murray", position: "PG", team: "Denver Nuggets" },
    { id: "den3", name: "Michael Porter Jr", position: "SF", team: "Denver Nuggets" },
  ],
  "Milwaukee Bucks": [
    { id: "mil1", name: "Giannis Antetokounmpo", position: "PF", team: "Milwaukee Bucks" },
    { id: "mil2", name: "Damian Lillard", position: "PG", team: "Milwaukee Bucks" },
    { id: "mil3", name: "Khris Middleton", position: "SF", team: "Milwaukee Bucks" },
  ],
};

const mlbPlayers: Record<string, MockPlayer[]> = {
  "Los Angeles Dodgers": [
    { id: "lad1", name: "Shohei Ohtani", position: "DH", team: "Los Angeles Dodgers" },
    { id: "lad2", name: "Mookie Betts", position: "RF", team: "Los Angeles Dodgers" },
    { id: "lad3", name: "Freddie Freeman", position: "1B", team: "Los Angeles Dodgers" },
  ],
  "New York Yankees": [
    { id: "nyy1", name: "Aaron Judge", position: "RF", team: "New York Yankees" },
    { id: "nyy2", name: "Juan Soto", position: "LF", team: "New York Yankees" },
    { id: "nyy3", name: "Giancarlo Stanton", position: "DH", team: "New York Yankees" },
  ],
  "Atlanta Braves": [
    { id: "atl1", name: "Ronald Acuña Jr.", position: "RF", team: "Atlanta Braves" },
    { id: "atl2", name: "Matt Olson", position: "1B", team: "Atlanta Braves" },
    { id: "atl3", name: "Austin Riley", position: "3B", team: "Atlanta Braves" },
  ],
};

const nhlPlayers: Record<string, MockPlayer[]> = {
  "Edmonton Oilers": [
    { id: "edm1", name: "Connor McDavid", position: "C", team: "Edmonton Oilers" },
    { id: "edm2", name: "Leon Draisaitl", position: "C", team: "Edmonton Oilers" },
    { id: "edm3", name: "Stuart Skinner", position: "G", team: "Edmonton Oilers" },
  ],
  "Toronto Maple Leafs": [
    { id: "tor1", name: "Auston Matthews", position: "C", team: "Toronto Maple Leafs" },
    { id: "tor2", name: "Mitch Marner", position: "RW", team: "Toronto Maple Leafs" },
    { id: "tor3", name: "Joseph Woll", position: "G", team: "Toronto Maple Leafs" },
  ],
  "Colorado Avalanche": [
    { id: "col1", name: "Nathan MacKinnon", position: "C", team: "Colorado Avalanche" },
    { id: "col2", name: "Cale Makar", position: "D", team: "Colorado Avalanche" },
    { id: "col3", name: "Mikko Rantanen", position: "RW", team: "Colorado Avalanche" },
  ],
};

function getPlayersForTeam(team: string, sport: Sport, teamId?: string): MockPlayer[] {
  let espnPlayers: ESPNPlayer[] = [];

  if (teamId) {
    espnPlayers = getPlayersFromCacheById(sport, teamId);
  }
  if (espnPlayers.length === 0) {
    espnPlayers = getPlayersFromCache(sport, team);
  }

  if (espnPlayers.length > 0) {
    return espnPlayers.slice(0, 8).map((p: ESPNPlayer) => ({
      id: p.id,
      name: p.fullName,
      position: p.position.abbreviation,
      team,
    }));
  }

  let roster: Record<string, MockPlayer[]>;
  switch (sport) {
    case "NFL":
    case "NCAAF":
      roster = nflPlayers;
      break;
    case "NBA":
    case "NCAAB":
      roster = nbaPlayers;
      break;
    case "MLB":
      roster = mlbPlayers;
      break;
    case "NHL":
      roster = nhlPlayers;
      break;
    default:
      roster = nbaPlayers;
  }
  
  if (roster[team]) {
    return roster[team];
  }
  
  const genericNames = ["Player A", "Player B", "Player C"];
  const positions = sport === "NFL" ? ["QB", "RB", "WR"] : 
                    sport === "NBA" ? ["PG", "SF", "C"] :
                    sport === "MLB" ? ["P", "1B", "OF"] : ["C", "RW", "G"];
  
  return genericNames.map((name, i) => ({
    id: randomUUID(),
    name: `${team.split(" ").pop()} ${name}`,
    position: positions[i],
    team,
  }));
}

function getPropLinesForCategory(category: string, position: string): { line: number; variance: number } {
  switch (category) {
    case "passing_yards":
      return { line: 240 + Math.floor(Math.random() * 60), variance: 0.5 };
    case "passing_tds":
      return { line: 1.5 + (Math.random() > 0.5 ? 0.5 : 0), variance: 0.5 };
    case "rushing_yards":
      return position === "QB" 
        ? { line: 25 + Math.floor(Math.random() * 20), variance: 0.5 }
        : { line: 60 + Math.floor(Math.random() * 40), variance: 0.5 };
    case "rushing_tds":
      return { line: 0.5, variance: 0.5 };
    case "receiving_yards":
      return { line: 50 + Math.floor(Math.random() * 40), variance: 0.5 };
    case "receptions":
      return { line: 4 + Math.floor(Math.random() * 4), variance: 0.5 };
    case "receiving_tds":
      return { line: 0.5, variance: 0.5 };
    case "anytime_td":
      return { line: 0.5, variance: 0.5 };
    case "points":
      return { line: 20 + Math.floor(Math.random() * 15), variance: 0.5 };
    case "rebounds":
      return { line: 6 + Math.floor(Math.random() * 6), variance: 0.5 };
    case "assists":
      return { line: 4 + Math.floor(Math.random() * 5), variance: 0.5 };
    case "threes":
      return { line: 2 + Math.floor(Math.random() * 3), variance: 0.5 };
    case "pts_rebs_asts":
      return { line: 30 + Math.floor(Math.random() * 20), variance: 0.5 };
    case "steals_blocks":
      return { line: 1.5 + Math.floor(Math.random() * 2), variance: 0.5 };
    case "hits":
      return { line: 0.5 + (Math.random() > 0.5 ? 0.5 : 0), variance: 0.5 };
    case "rbis":
      return { line: 0.5 + (Math.random() > 0.5 ? 0.5 : 0), variance: 0.5 };
    case "runs":
      return { line: 0.5 + (Math.random() > 0.5 ? 0.5 : 0), variance: 0.5 };
    case "total_bases":
      return { line: 1.5 + Math.floor(Math.random() * 2), variance: 0.5 };
    case "strikeouts_pitcher":
      return { line: 5 + Math.floor(Math.random() * 4), variance: 0.5 };
    case "hits_allowed":
      return { line: 5 + Math.floor(Math.random() * 3), variance: 0.5 };
    case "goals":
      return { line: 0.5, variance: 0.5 };
    case "assists":
      return { line: 0.5 + (Math.random() > 0.5 ? 0.5 : 0), variance: 0.5 };
    case "shots":
      return { line: 3 + Math.floor(Math.random() * 3), variance: 0.5 };
    case "saves":
      return { line: 25 + Math.floor(Math.random() * 10), variance: 0.5 };
    default:
      return { line: 10, variance: 0.5 };
  }
}

function generatePropOdds(): { overOdds: { americanOdds: number; decimalOdds: number }; underOdds: { americanOdds: number; decimalOdds: number } } {
  const variation = Math.floor(Math.random() * 30) - 15;
  const overAmerican = -110 + variation;
  const underAmerican = -110 - variation;
  
  return {
    overOdds: { americanOdds: overAmerican, decimalOdds: americanToDecimal(overAmerican) },
    underOdds: { americanOdds: underAmerican, decimalOdds: americanToDecimal(underAmerican) },
  };
}

function getPropCategoriesForPosition(sport: Sport, position: string): readonly string[] {
  switch (sport) {
    case "NFL":
    case "NCAAF":
      if (position === "QB") return ["passing_yards", "passing_tds", "rushing_yards", "anytime_td"];
      if (position === "RB") return ["rushing_yards", "rushing_tds", "receptions", "receiving_yards", "anytime_td"];
      if (position === "WR" || position === "TE") return ["receiving_yards", "receptions", "receiving_tds", "anytime_td"];
      return ["anytime_td"];
    case "NBA":
    case "NCAAB":
      return propCategories.NBA;
    case "MLB":
      if (position === "P") return ["strikeouts_pitcher", "hits_allowed"];
      return ["hits", "rbis", "runs", "total_bases"];
    case "NHL":
      if (position === "G") return ["saves"];
      return ["goals", "assists", "shots"];
    default:
      return [];
  }
}

function generatePlayerProps(team: string, sport: Sport, teamId?: string): PlayerProp[] {
  const players = getPlayersForTeam(team, sport, teamId);
  const props: PlayerProp[] = [];
  
  for (const player of players) {
    const categories = getPropCategoriesForPosition(sport, player.position);
    
    for (const category of categories) {
      const { line } = getPropLinesForCategory(category, player.position);
      const { overOdds, underOdds } = generatePropOdds();
      
      props.push({
        playerId: player.id,
        playerName: player.name,
        team: player.team,
        position: player.position,
        category,
        line,
        overOdds,
        underOdds,
      });
    }
  }
  
  return props;
}

function getTeamsForSport(sport: Sport): string[] {
  switch (sport) {
    case "NBA":
    case "NCAAB":
      return nbaTeams;
    case "NFL":
    case "NCAAF":
      return nflTeams;
    case "MLB":
      return mlbTeams;
    case "NHL":
      return nhlTeams;
    default:
      return nbaTeams;
  }
}

function generateRandomOdds(favorite: boolean): { americanOdds: number; decimalOdds: number } {
  let american: number;
  if (favorite) {
    american = -100 - Math.floor(Math.random() * 200);
  } else {
    american = 100 + Math.floor(Math.random() * 200);
  }
  return {
    americanOdds: american,
    decimalOdds: americanToDecimal(american),
  };
}

function generateSpread(): { line: number; homeOdds: { americanOdds: number; decimalOdds: number }; awayOdds: { americanOdds: number; decimalOdds: number } } {
  const spread = (Math.floor(Math.random() * 15) + 1) * (Math.random() > 0.5 ? 1 : -1) + 0.5;
  const homeOdds = generateRandomOdds(Math.random() > 0.5);
  const awayOdds = { americanOdds: -110, decimalOdds: americanToDecimal(-110) };
  return { line: spread, homeOdds, awayOdds };
}

function generateTotal(sport: Sport): { line: number; overOdds: { americanOdds: number; decimalOdds: number }; underOdds: { americanOdds: number; decimalOdds: number } } {
  let baseLine: number;
  switch (sport) {
    case "NBA":
    case "NCAAB":
      baseLine = 210 + Math.floor(Math.random() * 40);
      break;
    case "NFL":
    case "NCAAF":
      baseLine = 40 + Math.floor(Math.random() * 20);
      break;
    case "MLB":
      baseLine = 7 + Math.floor(Math.random() * 4);
      break;
    case "NHL":
      baseLine = 5 + Math.floor(Math.random() * 3);
      break;
    default:
      baseLine = 200;
  }
  return {
    line: baseLine + 0.5,
    overOdds: { americanOdds: -110, decimalOdds: americanToDecimal(-110) },
    underOdds: { americanOdds: -110, decimalOdds: americanToDecimal(-110) },
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateGameStartTime(gameIndex: number, totalGames: number): Date {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (gameIndex < Math.ceil(totalGames * 0.5)) {
    const startTime = new Date(now);
    if (currentHour < 12) {
      startTime.setHours(13 + gameIndex * 2, 0, 0, 0);
    } else if (currentHour < 18) {
      startTime.setHours(currentHour + 1 + gameIndex, Math.floor(Math.random() * 30) + 15, 0, 0);
    } else {
      startTime.setHours(19 + gameIndex, Math.floor(Math.random() * 30), 0, 0);
    }
    
    if (startTime <= now) {
      startTime.setHours(startTime.getHours() + 1);
    }
    return startTime;
  } else if (gameIndex < Math.ceil(totalGames * 0.8)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12 + (gameIndex - Math.ceil(totalGames * 0.5)) * 3, Math.floor(Math.random() * 30), 0, 0);
    return tomorrow;
  } else {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(14 + (gameIndex - Math.ceil(totalGames * 0.8)) * 2, Math.floor(Math.random() * 30), 0, 0);
    return dayAfter;
  }
}

function espnGameToEvent(game: ESPNScoreboardGame, sport: Sport): SportEvent {
  const homeTeam = game.homeTeam.displayName;
  const awayTeam = game.awayTeam.displayName;
  const homeTeamId = game.homeTeam.id;
  const awayTeamId = game.awayTeam.id;
  const gameId = game.id;

  const spreadVal = estimateSpreadFromRecords(game.homeTeam.record, game.awayTeam.record, sport);
  const homeIsFavorite = spreadVal < 0;

  const moneylineHome = generateRandomOdds(homeIsFavorite);
  const moneylineAway = generateRandomOdds(!homeIsFavorite);

  if (game.odds?.spread) {
    const parsed = parseFloat(game.odds.spread.replace(/[^0-9.\-+]/g, '') || '0');
    if (!isNaN(parsed) && parsed !== 0) {
      const adjustedSpread = parsed;
      moneylineHome.americanOdds = estimateMoneylineFromSpread(adjustedSpread, true);
      moneylineHome.decimalOdds = americanToDecimal(moneylineHome.americanOdds);
      moneylineAway.americanOdds = estimateMoneylineFromSpread(adjustedSpread, false);
      moneylineAway.decimalOdds = americanToDecimal(moneylineAway.americanOdds);
    }
  }

  const spread = generateSpreadFromValue(spreadVal);
  const total = game.odds?.overUnder
    ? generateTotalFromValue(game.odds.overUnder)
    : generateTotal(sport);

  const homeProps = generatePlayerProps(homeTeam, sport, homeTeamId);
  const awayProps = generatePlayerProps(awayTeam, sport, awayTeamId);
  const injuries = generateInjuriesFromRosters(homeTeam, awayTeam, sport, homeTeamId, awayTeamId);
  const weather = generateWeather(gameId, sport);
  const situationalFactors = generateSituationalFactors(gameId, homeTeam, awayTeam);

  const historicalTrends: HistoricalTrend[] = [...homeProps, ...awayProps].slice(0, 6).map(prop =>
    generateHistoricalTrends(prop.playerId, prop.playerName, prop.category, prop.line)
  );

  return {
    id: gameId,
    sport,
    homeTeam,
    awayTeam,
    startTime: game.date,
    markets: [
      {
        type: "moneyline",
        outcomes: [
          {
            name: `${homeTeam} ML`,
            team: homeTeam,
            ...moneylineHome,
            evAnalysis: generateEVAnalysis(moneylineHome.decimalOdds, `${gameId}-ml-home`),
            lineMovement: generateLineMovement(gameId, "moneyline", `${homeTeam} ML`, moneylineHome.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "moneyline", `${homeTeam} ML`),
          },
          {
            name: `${awayTeam} ML`,
            team: awayTeam,
            ...moneylineAway,
            evAnalysis: generateEVAnalysis(moneylineAway.decimalOdds, `${gameId}-ml-away`),
            lineMovement: generateLineMovement(gameId, "moneyline", `${awayTeam} ML`, moneylineAway.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "moneyline", `${awayTeam} ML`),
          },
        ],
      },
      {
        type: "spread",
        outcomes: [
          {
            name: `${homeTeam} ${spread.line > 0 ? "+" : ""}${spread.line}`,
            team: homeTeam,
            line: spread.line,
            ...spread.homeOdds,
            evAnalysis: generateEVAnalysis(spread.homeOdds.decimalOdds, `${gameId}-spread-home`),
            lineMovement: generateLineMovement(gameId, "spread", `${homeTeam} spread`, spread.homeOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "spread", `${homeTeam} spread`),
          },
          {
            name: `${awayTeam} ${-spread.line > 0 ? "+" : ""}${-spread.line}`,
            team: awayTeam,
            line: -spread.line,
            ...spread.awayOdds,
            evAnalysis: generateEVAnalysis(spread.awayOdds.decimalOdds, `${gameId}-spread-away`),
            lineMovement: generateLineMovement(gameId, "spread", `${awayTeam} spread`, spread.awayOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "spread", `${awayTeam} spread`),
          },
        ],
      },
      {
        type: "total",
        outcomes: [
          {
            name: `Over ${total.line}`,
            line: total.line,
            ...total.overOdds,
            evAnalysis: generateEVAnalysis(total.overOdds.decimalOdds, `${gameId}-total-over`),
            lineMovement: generateLineMovement(gameId, "total", `Over ${total.line}`, total.overOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "total", `Over ${total.line}`),
          },
          {
            name: `Under ${total.line}`,
            line: total.line,
            ...total.underOdds,
            evAnalysis: generateEVAnalysis(total.underOdds.decimalOdds, `${gameId}-total-under`),
            lineMovement: generateLineMovement(gameId, "total", `Under ${total.line}`, total.underOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "total", `Under ${total.line}`),
          },
        ],
      },
    ],
    playerProps: [...homeProps, ...awayProps],
    injuries,
    weather,
    situationalFactors,
    historicalTrends,
  };
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

function estimateMoneylineFromSpread(spread: number, isHome: boolean): number {
  const s = isHome ? -spread : spread;
  if (Math.abs(s) < 1) return -110;
  if (s < -10) return -(Math.floor(Math.abs(s) * 20) + 100);
  if (s < 0) return -(Math.floor(Math.abs(s) * 15) + 100);
  if (s > 10) return Math.floor(s * 18) + 100;
  return Math.floor(s * 12) + 100;
}

function generateSpreadFromValue(value: number): { line: number; homeOdds: { americanOdds: number; decimalOdds: number }; awayOdds: { americanOdds: number; decimalOdds: number } } {
  const line = Math.round(value * 2) / 2 || 0.5;
  const variation = Math.floor(Math.random() * 10) - 5;
  const homeAmerican = -110 + variation;
  const awayAmerican = -110 - variation;
  return {
    line,
    homeOdds: { americanOdds: homeAmerican, decimalOdds: americanToDecimal(homeAmerican) },
    awayOdds: { americanOdds: awayAmerican, decimalOdds: americanToDecimal(awayAmerican) },
  };
}

function generateTotalFromValue(value: number): { line: number; overOdds: { americanOdds: number; decimalOdds: number }; underOdds: { americanOdds: number; decimalOdds: number } } {
  return {
    line: value,
    overOdds: { americanOdds: -110, decimalOdds: americanToDecimal(-110) },
    underOdds: { americanOdds: -110, decimalOdds: americanToDecimal(-110) },
  };
}

export async function generateEventsFromESPN(sport: Sport): Promise<SportEvent[]> {
  try {
    const espnGames = await getMultiDayScoreboard(sport, 3);
    const upcomingGames = espnGames.filter(g => g.status.state === "pre" || g.status.state === "in");

    if (upcomingGames.length === 0) {
      console.log(`[Odds] No upcoming ${sport} games from ESPN, using fallback`);
      return generateFallbackEvents(sport);
    }

    console.log(`[Odds] Building events from ${upcomingGames.length} real ${sport} games`);
    return upcomingGames.map(game => espnGameToEvent(game, sport));
  } catch (error) {
    console.error(`[Odds] ESPN fetch failed for ${sport}, using fallback:`, error);
    return generateFallbackEvents(sport);
  }
}

function generateFallbackEvents(sport: Sport): SportEvent[] {
  const teams = shuffleArray(getTeamsForSport(sport));
  const events: SportEvent[] = [];
  const numGames = Math.min(8, Math.floor(teams.length / 2));

  for (let i = 0; i < numGames; i++) {
    const homeTeam = teams[i * 2];
    const awayTeam = teams[i * 2 + 1];
    const homeIsFavorite = Math.random() > 0.5;
    const gameId = randomUUID();

    const moneylineHome = generateRandomOdds(homeIsFavorite);
    const moneylineAway = generateRandomOdds(!homeIsFavorite);
    const spread = generateSpread();
    const total = generateTotal(sport);
    const startTime = generateGameStartTime(i, numGames);

    const homeProps = generatePlayerProps(homeTeam, sport);
    const awayProps = generatePlayerProps(awayTeam, sport);
    const injuries = generateInjuries(homeTeam, awayTeam, sport);
    const weather = generateWeather(gameId, sport);
    const situationalFactors = generateSituationalFactors(gameId, homeTeam, awayTeam);
    const historicalTrends: HistoricalTrend[] = [...homeProps, ...awayProps].slice(0, 6).map(prop =>
      generateHistoricalTrends(prop.playerId, prop.playerName, prop.category, prop.line)
    );

    events.push({
      id: gameId, sport, homeTeam, awayTeam, startTime: startTime.toISOString(),
      markets: [
        { type: "moneyline", outcomes: [
          { name: `${homeTeam} ML`, team: homeTeam, ...moneylineHome, evAnalysis: generateEVAnalysis(moneylineHome.decimalOdds, `${gameId}-ml-home`), lineMovement: generateLineMovement(gameId, "moneyline", `${homeTeam} ML`, moneylineHome.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "moneyline", `${homeTeam} ML`) },
          { name: `${awayTeam} ML`, team: awayTeam, ...moneylineAway, evAnalysis: generateEVAnalysis(moneylineAway.decimalOdds, `${gameId}-ml-away`), lineMovement: generateLineMovement(gameId, "moneyline", `${awayTeam} ML`, moneylineAway.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "moneyline", `${awayTeam} ML`) },
        ]},
        { type: "spread", outcomes: [
          { name: `${homeTeam} ${spread.line > 0 ? "+" : ""}${spread.line}`, team: homeTeam, line: spread.line, ...spread.homeOdds, evAnalysis: generateEVAnalysis(spread.homeOdds.decimalOdds, `${gameId}-spread-home`), lineMovement: generateLineMovement(gameId, "spread", `${homeTeam} spread`, spread.homeOdds.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "spread", `${homeTeam} spread`) },
          { name: `${awayTeam} ${-spread.line > 0 ? "+" : ""}${-spread.line}`, team: awayTeam, line: -spread.line, ...spread.awayOdds, evAnalysis: generateEVAnalysis(spread.awayOdds.decimalOdds, `${gameId}-spread-away`), lineMovement: generateLineMovement(gameId, "spread", `${awayTeam} spread`, spread.awayOdds.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "spread", `${awayTeam} spread`) },
        ]},
        { type: "total", outcomes: [
          { name: `Over ${total.line}`, line: total.line, ...total.overOdds, evAnalysis: generateEVAnalysis(total.overOdds.decimalOdds, `${gameId}-total-over`), lineMovement: generateLineMovement(gameId, "total", `Over ${total.line}`, total.overOdds.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "total", `Over ${total.line}`) },
          { name: `Under ${total.line}`, line: total.line, ...total.underOdds, evAnalysis: generateEVAnalysis(total.underOdds.decimalOdds, `${gameId}-total-under`), lineMovement: generateLineMovement(gameId, "total", `Under ${total.line}`, total.underOdds.americanOdds), bettingPercentages: generateBettingPercentages(gameId, "total", `Under ${total.line}`) },
        ]},
      ],
      playerProps: [...homeProps, ...awayProps], injuries, weather, situationalFactors, historicalTrends,
    });
  }
  return events;
}

export function generateMockEvents(sport: Sport): SportEvent[] {
  return generateFallbackEvents(sport);
}

export function eventsToLegs(events: SportEvent[]): ParlayLeg[] {
  const legs: ParlayLeg[] = [];

  for (const event of events) {
    for (const market of event.markets) {
      for (const outcome of market.outcomes) {
        legs.push({
          id: randomUUID(),
          eventId: event.id,
          team: outcome.team || event.homeTeam,
          opponent: outcome.team === event.homeTeam ? event.awayTeam : event.homeTeam,
          market: market.type,
          outcome: outcome.name,
          decimalOdds: outcome.decimalOdds,
          americanOdds: outcome.americanOdds,
        });
      }
    }
    
    if (event.playerProps) {
      for (const prop of event.playerProps) {
        legs.push({
          id: randomUUID(),
          eventId: event.id,
          team: prop.team,
          market: "player_prop",
          outcome: `${prop.playerName} Over ${prop.line}`,
          decimalOdds: prop.overOdds.decimalOdds,
          americanOdds: prop.overOdds.americanOdds,
          playerId: prop.playerId,
          playerName: prop.playerName,
          propCategory: prop.category,
          propLine: prop.line,
        });
        
        legs.push({
          id: randomUUID(),
          eventId: event.id,
          team: prop.team,
          market: "player_prop",
          outcome: `${prop.playerName} Under ${prop.line}`,
          decimalOdds: prop.underOdds.decimalOdds,
          americanOdds: prop.underOdds.americanOdds,
          playerId: prop.playerId,
          playerName: prop.playerName,
          propCategory: prop.category,
          propLine: prop.line,
        });
      }
    }
  }

  return legs;
}

const oddsCache: Map<Sport, { events: SportEvent[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function ensureRostersLoaded(sport: Sport) {
  if (!isRosterPreloaded(sport)) {
    preloadAllRosters().catch(() => {});
  }
}

export async function getOddsForSportAsync(sport: Sport): Promise<SportEvent[]> {
  ensureRostersLoaded(sport);

  const cached = oddsCache.get(sport);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.events.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  const events = await generateEventsFromESPN(sport);
  events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  oddsCache.set(sport, { events, timestamp: now });
  return events;
}

export function getOddsForSport(sport: Sport): SportEvent[] {
  ensureRostersLoaded(sport);

  const cached = oddsCache.get(sport);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.events.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  generateEventsFromESPN(sport).then(events => {
    events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    oddsCache.set(sport, { events, timestamp: Date.now() });
  }).catch(() => {});

  if (cached) return cached.events;

  const fallback = generateFallbackEvents(sport);
  oddsCache.set(sport, { events: fallback, timestamp: now - CACHE_TTL + 30000 });
  return fallback;
}

export async function refreshOddsForSport(sport: Sport): Promise<SportEvent[]> {
  const events = await generateEventsFromESPN(sport);
  events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  oddsCache.set(sport, { events, timestamp: Date.now() });
  return events;
}
