import { randomUUID } from "crypto";
import type { Sport, SportEvent, ParlayLeg } from "@shared/schema";
import { americanToDecimal, decimalToAmerican } from "@shared/schema";

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
