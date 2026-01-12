import { randomUUID } from "crypto";
import type { Sport, SportEvent, ParlayLeg, PlayerProp } from "@shared/schema";
import { americanToDecimal, propCategories } from "@shared/schema";

const nbaTeams = [
  "Los Angeles Lakers", "Boston Celtics", "Golden State Warriors", "Miami Heat",
  "Milwaukee Bucks", "Phoenix Suns", "Denver Nuggets", "Philadelphia 76ers",
  "Brooklyn Nets", "Dallas Mavericks", "Cleveland Cavaliers", "Memphis Grizzlies",
  "Sacramento Kings", "New York Knicks", "Atlanta Hawks", "Minnesota Timberwolves"
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
  "Los Angeles Lakers": [
    { id: "lal1", name: "LeBron James", position: "SF", team: "Los Angeles Lakers" },
    { id: "lal2", name: "Anthony Davis", position: "PF", team: "Los Angeles Lakers" },
    { id: "lal3", name: "D'Angelo Russell", position: "PG", team: "Los Angeles Lakers" },
  ],
  "Boston Celtics": [
    { id: "bos1", name: "Jayson Tatum", position: "SF", team: "Boston Celtics" },
    { id: "bos2", name: "Jaylen Brown", position: "SG", team: "Boston Celtics" },
    { id: "bos3", name: "Derrick White", position: "PG", team: "Boston Celtics" },
  ],
  "Golden State Warriors": [
    { id: "gsw1", name: "Stephen Curry", position: "PG", team: "Golden State Warriors" },
    { id: "gsw2", name: "Klay Thompson", position: "SG", team: "Golden State Warriors" },
    { id: "gsw3", name: "Draymond Green", position: "PF", team: "Golden State Warriors" },
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

function getPlayersForTeam(team: string, sport: Sport): MockPlayer[] {
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

function generatePlayerProps(team: string, sport: Sport): PlayerProp[] {
  const players = getPlayersForTeam(team, sport);
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

export function generateMockEvents(sport: Sport): SportEvent[] {
  const teams = shuffleArray(getTeamsForSport(sport));
  const events: SportEvent[] = [];
  const numGames = Math.min(6, Math.floor(teams.length / 2));

  for (let i = 0; i < numGames; i++) {
    const homeTeam = teams[i * 2];
    const awayTeam = teams[i * 2 + 1];
    const homeIsFavorite = Math.random() > 0.5;

    const moneylineHome = generateRandomOdds(homeIsFavorite);
    const moneylineAway = generateRandomOdds(!homeIsFavorite);
    const spread = generateSpread();
    const total = generateTotal(sport);

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + Math.floor(Math.random() * 48) + 1);

    const homeProps = generatePlayerProps(homeTeam, sport);
    const awayProps = generatePlayerProps(awayTeam, sport);

    events.push({
      id: randomUUID(),
      sport,
      homeTeam,
      awayTeam,
      startTime: startTime.toISOString(),
      markets: [
        {
          type: "moneyline",
          outcomes: [
            { name: `${homeTeam} ML`, team: homeTeam, ...moneylineHome },
            { name: `${awayTeam} ML`, team: awayTeam, ...moneylineAway },
          ],
        },
        {
          type: "spread",
          outcomes: [
            { name: `${homeTeam} ${spread.line > 0 ? "+" : ""}${spread.line}`, team: homeTeam, line: spread.line, ...spread.homeOdds },
            { name: `${awayTeam} ${-spread.line > 0 ? "+" : ""}${-spread.line}`, team: awayTeam, line: -spread.line, ...spread.awayOdds },
          ],
        },
        {
          type: "total",
          outcomes: [
            { name: `Over ${total.line}`, line: total.line, ...total.overOdds },
            { name: `Under ${total.line}`, line: total.line, ...total.underOdds },
          ],
        },
      ],
      playerProps: [...homeProps, ...awayProps],
    });
  }

  return events;
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

export function getOddsForSport(sport: Sport): SportEvent[] {
  const cached = oddsCache.get(sport);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.events;
  }

  const events = generateMockEvents(sport);
  oddsCache.set(sport, { events, timestamp: now });
  return events;
}

export function refreshOddsForSport(sport: Sport): SportEvent[] {
  const events = generateMockEvents(sport);
  oddsCache.set(sport, { events, timestamp: Date.now() });
  return events;
}
