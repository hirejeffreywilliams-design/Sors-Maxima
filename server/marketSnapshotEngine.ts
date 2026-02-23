import type { Sport } from "@shared/schema";
import { getMultiDayScoreboard, getScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { getTeamsFromCache, getPlayersFromCacheById, getRosterFromCacheById } from "./espn-roster-provider";
import { fetchRealOddsForGame } from "./odds-provider";

export interface BookmakerOdds {
  book: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  spreadHome?: number;
  spreadAway?: number;
  total?: number;
  overPrice?: number;
  underPrice?: number;
}

export interface LineMovementData {
  market: string;
  opening: number;
  current: number;
  movement: number;
  direction: "up" | "down" | "stable";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
}

export interface MarketGame {
  id: string;
  sport: string;
  name: string;
  shortName: string;
  date: string;
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    period: number;
    clock: string;
    completed: boolean;
  };
  venue?: string;
  broadcast?: string;
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  bookmakers: BookmakerOdds[];
  lineMovement: LineMovementData[];
  bestLines: {
    bestHomeML?: { odds: number; book: string };
    bestAwayML?: { odds: number; book: string };
    bestSpreadHome?: { line: number; odds: number; book: string };
    bestSpreadAway?: { line: number; odds: number; book: string };
    bestOver?: { total: number; odds: number; book: string };
    bestUnder?: { total: number; odds: number; book: string };
  };
  edgeAnalysis: {
    homeEV: number;
    awayEV: number;
    hasArbitrage: boolean;
    arbProfit?: number;
    middleOpportunity: boolean;
    middleRange?: string;
    valueSide?: "home" | "away" | "none";
  };
  leaders?: { team: string; category: string; playerName: string; value: string }[];
  dataSource: string;
}

export interface MarketSnapshot {
  games: MarketGame[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    bookmakerCount: number;
    generatedAt: string;
    dataSources: string[];
  };
}

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports";

const snapshotCache = new Map<string, { data: MarketSnapshot; timestamp: number }>();
const SNAPSHOT_CACHE_TTL = 3 * 60 * 1000;

function mapSportToOddsApiKey(sport: string): string | null {
  const mapping: Record<string, string> = {
    NBA: "basketball_nba",
    NFL: "americanfootball_nfl",
    MLB: "baseball_mlb",
    NHL: "icehockey_nhl",
    NCAAB: "basketball_ncaab",
    NCAAF: "americanfootball_ncaaf",
  };
  return mapping[sport.toUpperCase()] || null;
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: {
    key: string;
    outcomes: {
      name: string;
      price: number;
      point?: number;
    }[];
  }[];
}

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

const oddsFullCache = new Map<string, { data: OddsApiGame[]; timestamp: number }>();
let oddsApiWarned = false;

async function fetchFullOddsApi(sport: string): Promise<OddsApiGame[]> {
  if (!THE_ODDS_API_KEY) return [];
  const sportKey = mapSportToOddsApiKey(sport);
  if (!sportKey) return [];

  const cacheKey = `full-odds-${sport}`;
  const cached = oddsFullCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) return cached.data;

  try {
    const url = `${THE_ODDS_API_BASE}/${sportKey}/odds/?apiKey=${THE_ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401 || res.status === 429) {
        if (!oddsApiWarned) {
          console.warn(`[MarketSnapshot] Odds API returned ${res.status} — odds data unavailable (key may be expired or rate-limited)`);
          oddsApiWarned = true;
        }
        return oddsFullCache.get(cacheKey)?.data || [];
      }
      throw new Error(`Odds API ${res.status}`);
    }
    oddsApiWarned = false;
    const data: OddsApiGame[] = await res.json();
    oddsFullCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.error(`[MarketSnapshot] Odds API error for ${sport}: ${(e as Error).message}`);
    return oddsFullCache.get(cacheKey)?.data || [];
  }
}

function parseWinPct(record: string): number {
  const parts = record.split("-").map(s => parseInt(s.trim(), 10));
  const w = parts[0] || 0;
  const l = parts[1] || 0;
  const total = w + l;
  return total > 0 ? w / total : 0.5;
}

function matchGameToOdds(espnGame: ESPNScoreboardGame, oddsGames: OddsApiGame[]): OddsApiGame | null {
  const homeLower = espnGame.homeTeam.displayName.toLowerCase();
  const awayLower = espnGame.awayTeam.displayName.toLowerCase();
  const homeToken = homeLower.split(" ").pop() || "";
  const awayToken = awayLower.split(" ").pop() || "";

  return oddsGames.find(g => {
    const gHome = g.home_team.toLowerCase();
    const gAway = g.away_team.toLowerCase();
    if (gHome === homeLower && gAway === awayLower) return true;
    if (gHome.includes(homeLower) && gAway.includes(awayLower)) return true;
    if (homeLower.includes(gHome) && awayLower.includes(gAway)) return true;
    const gHomeToken = gHome.split(" ").pop() || "";
    const gAwayToken = gAway.split(" ").pop() || "";
    return (gHomeToken === homeToken || gHome.includes(homeToken) || homeToken.includes(gHomeToken)) &&
           (gAwayToken === awayToken || gAway.includes(awayToken) || awayToken.includes(gAwayToken));
  }) || null;
}

function americanToImplied(american: number): number {
  if (american < 0) return (-american) / (-american + 100);
  return 100 / (american + 100);
}

function extractBookmakerOdds(oddsGame: OddsApiGame): BookmakerOdds[] {
  return oddsGame.bookmakers.map(bk => {
    const result: BookmakerOdds = { book: bk.title };

    const h2h = bk.markets.find(m => m.key === "h2h");
    if (h2h) {
      const homeOutcome = h2h.outcomes.find(o => o.name === oddsGame.home_team);
      const awayOutcome = h2h.outcomes.find(o => o.name === oddsGame.away_team);
      if (homeOutcome) result.homeMoneyline = homeOutcome.price;
      if (awayOutcome) result.awayMoneyline = awayOutcome.price;
    }

    const spreads = bk.markets.find(m => m.key === "spreads");
    if (spreads) {
      const homeSpread = spreads.outcomes.find(o => o.name === oddsGame.home_team);
      const awaySpread = spreads.outcomes.find(o => o.name === oddsGame.away_team);
      if (homeSpread) {
        result.spread = homeSpread.point;
        result.spreadHome = homeSpread.price;
      }
      if (awaySpread) result.spreadAway = awaySpread.price;
    }

    const totals = bk.markets.find(m => m.key === "totals");
    if (totals) {
      const over = totals.outcomes.find(o => o.name === "Over");
      const under = totals.outcomes.find(o => o.name === "Under");
      if (over) { result.total = over.point; result.overPrice = over.price; }
      if (under) result.underPrice = under.price;
    }

    return result;
  });
}

function computeConsensus(bookmakers: BookmakerOdds[]): MarketGame["consensus"] {
  const hMLs = bookmakers.map(b => b.homeMoneyline).filter((v): v is number => v !== undefined);
  const aMLs = bookmakers.map(b => b.awayMoneyline).filter((v): v is number => v !== undefined);
  const spreads = bookmakers.map(b => b.spread).filter((v): v is number => v !== undefined);
  const totals = bookmakers.map(b => b.total).filter((v): v is number => v !== undefined);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : undefined;
  const homeML = avg(hMLs);
  const awayML = avg(aMLs);

  return {
    homeMoneyline: homeML !== undefined ? Math.round(homeML) : undefined,
    awayMoneyline: awayML !== undefined ? Math.round(awayML) : undefined,
    spread: avg(spreads) !== undefined ? Math.round(avg(spreads)! * 2) / 2 : undefined,
    total: avg(totals) !== undefined ? Math.round(avg(totals)! * 2) / 2 : undefined,
    homeImpliedProb: homeML !== undefined ? Math.round(americanToImplied(homeML) * 1000) / 10 : undefined,
    awayImpliedProb: awayML !== undefined ? Math.round(americanToImplied(awayML) * 1000) / 10 : undefined,
  };
}

function computeBestLines(bookmakers: BookmakerOdds[]): MarketGame["bestLines"] {
  const best: MarketGame["bestLines"] = {};

  for (const bk of bookmakers) {
    if (bk.homeMoneyline !== undefined) {
      if (!best.bestHomeML || bk.homeMoneyline > best.bestHomeML.odds) {
        best.bestHomeML = { odds: bk.homeMoneyline, book: bk.book };
      }
    }
    if (bk.awayMoneyline !== undefined) {
      if (!best.bestAwayML || bk.awayMoneyline > best.bestAwayML.odds) {
        best.bestAwayML = { odds: bk.awayMoneyline, book: bk.book };
      }
    }
    if (bk.spread !== undefined && bk.spreadHome !== undefined) {
      if (!best.bestSpreadHome || bk.spread > (best.bestSpreadHome.line || -999)) {
        best.bestSpreadHome = { line: bk.spread, odds: bk.spreadHome, book: bk.book };
      }
    }
    if (bk.spread !== undefined && bk.spreadAway !== undefined) {
      const awayLine = -bk.spread;
      if (!best.bestSpreadAway || awayLine > (best.bestSpreadAway.line || -999)) {
        best.bestSpreadAway = { line: awayLine, odds: bk.spreadAway, book: bk.book };
      }
    }
    if (bk.total !== undefined && bk.overPrice !== undefined) {
      if (!best.bestOver || bk.overPrice > (best.bestOver.odds || -999)) {
        best.bestOver = { total: bk.total, odds: bk.overPrice, book: bk.book };
      }
    }
    if (bk.total !== undefined && bk.underPrice !== undefined) {
      if (!best.bestUnder || bk.underPrice > (best.bestUnder.odds || -999)) {
        best.bestUnder = { total: bk.total, odds: bk.underPrice, book: bk.book };
      }
    }
  }

  return best;
}

function detectArbitrage(bookmakers: BookmakerOdds[]): { hasArb: boolean; profit: number } {
  if (bookmakers.length < 2) return { hasArb: false, profit: 0 };

  let bestHomeML = -Infinity;
  let bestAwayML = -Infinity;
  for (const bk of bookmakers) {
    if (bk.homeMoneyline !== undefined && bk.homeMoneyline > bestHomeML) bestHomeML = bk.homeMoneyline;
    if (bk.awayMoneyline !== undefined && bk.awayMoneyline > bestAwayML) bestAwayML = bk.awayMoneyline;
  }

  if (bestHomeML === -Infinity || bestAwayML === -Infinity) return { hasArb: false, profit: 0 };

  const homeImplied = americanToImplied(bestHomeML);
  const awayImplied = americanToImplied(bestAwayML);
  const totalImplied = homeImplied + awayImplied;

  if (totalImplied < 1) {
    const profit = Math.round((1 / totalImplied - 1) * 10000) / 100;
    return { hasArb: true, profit };
  }
  return { hasArb: false, profit: 0 };
}

function detectMiddle(bookmakers: BookmakerOdds[]): { hasMiddle: boolean; range: string } {
  if (bookmakers.length < 2) return { hasMiddle: false, range: "" };

  const spreads = bookmakers.map(b => b.spread).filter((v): v is number => v !== undefined);
  if (spreads.length < 2) return { hasMiddle: false, range: "" };

  const min = Math.min(...spreads);
  const max = Math.max(...spreads);
  const gap = max - min;

  if (gap >= 2) {
    return { hasMiddle: true, range: `${min} to ${max}` };
  }
  return { hasMiddle: false, range: "" };
}

function computeLineMovement(bookmakers: BookmakerOdds[], espnOdds?: ESPNScoreboardGame["odds"]): LineMovementData[] {
  const movements: LineMovementData[] = [];
  if (bookmakers.length === 0) return movements;

  const spreads = bookmakers.map(b => b.spread).filter((v): v is number => v !== undefined);
  const totals = bookmakers.map(b => b.total).filter((v): v is number => v !== undefined);

  if (spreads.length >= 2) {
    const min = Math.min(...spreads);
    const max = Math.max(...spreads);
    const avg = spreads.reduce((s, v) => s + v, 0) / spreads.length;
    const openingGuess = espnOdds?.spread ? parseFloat(espnOdds.spread.replace(/[^-.\d]/g, "") || "0") : max;
    const movement = avg - openingGuess;
    const absMov = Math.abs(movement);

    movements.push({
      market: "spread",
      opening: openingGuess,
      current: Math.round(avg * 2) / 2,
      movement: Math.round(movement * 10) / 10,
      direction: movement > 0.25 ? "up" : movement < -0.25 ? "down" : "stable",
      velocity: absMov > 2 ? "steam" : absMov > 1 ? "fast" : absMov > 0.5 ? "moderate" : "slow",
      sharpAction: absMov > 1.5,
    });
  }

  if (totals.length >= 2) {
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
    const opening = espnOdds?.overUnder || Math.max(...totals);
    const movement = avg - opening;
    const absMov = Math.abs(movement);

    movements.push({
      market: "total",
      opening,
      current: Math.round(avg * 2) / 2,
      movement: Math.round(movement * 10) / 10,
      direction: movement > 0.25 ? "up" : movement < -0.25 ? "down" : "stable",
      velocity: absMov > 3 ? "steam" : absMov > 1.5 ? "fast" : absMov > 0.5 ? "moderate" : "slow",
      sharpAction: absMov > 2,
    });
  }

  return movements;
}

export async function generateMarketSnapshot(sport: Sport): Promise<MarketSnapshot> {
  const cacheKey = `snapshot-${sport}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SNAPSHOT_CACHE_TTL) return cached.data;

  const [espnGames, oddsGames] = await Promise.all([
    getMultiDayScoreboard(sport, 3),
    fetchFullOddsApi(sport),
  ]);

  const dataSources = new Set<string>(["ESPN"]);
  if (oddsGames.length > 0) dataSources.add("The Odds API");

  let gamesWithOdds = 0;
  const allBookNames = new Set<string>();

  const marketGames: MarketGame[] = espnGames
    .filter(g => g.status.state === "pre" || g.status.state === "in")
    .map(game => {
      const oddsMatch = matchGameToOdds(game, oddsGames);
      const bookmakers = oddsMatch ? extractBookmakerOdds(oddsMatch) : [];
      if (bookmakers.length > 0) {
        gamesWithOdds++;
        bookmakers.forEach(b => allBookNames.add(b.book));
      }

      const consensus = computeConsensus(bookmakers);
      const bestLines = computeBestLines(bookmakers);
      const lineMovement = computeLineMovement(bookmakers, game.odds);
      const arb = detectArbitrage(bookmakers);
      const middle = detectMiddle(bookmakers);

      const homeWinPct = parseWinPct(game.homeTeam.record || "0-0");
      const awayWinPct = parseWinPct(game.awayTeam.record || "0-0");

      let valueSide: "home" | "away" | "none" = "none";
      if (consensus.homeImpliedProb && consensus.awayImpliedProb) {
        const homeEdge = (homeWinPct * 100) - consensus.homeImpliedProb;
        const awayEdge = (awayWinPct * 100) - consensus.awayImpliedProb;
        if (homeEdge > 5) valueSide = "home";
        else if (awayEdge > 5) valueSide = "away";
      }

      const homeEV = consensus.homeMoneyline
        ? Math.round(((homeWinPct * (consensus.homeMoneyline > 0 ? consensus.homeMoneyline / 100 : 100 / -consensus.homeMoneyline)) - (1 - homeWinPct)) * 100) / 100
        : 0;
      const awayEV = consensus.awayMoneyline
        ? Math.round(((awayWinPct * (consensus.awayMoneyline > 0 ? consensus.awayMoneyline / 100 : 100 / -consensus.awayMoneyline)) - (1 - awayWinPct)) * 100) / 100
        : 0;

      return {
        id: game.id,
        sport,
        name: game.name,
        shortName: game.shortName,
        date: game.date,
        homeTeam: {
          id: game.homeTeam.id,
          name: game.homeTeam.displayName,
          abbreviation: game.homeTeam.abbreviation,
          record: game.homeTeam.record || "0-0",
          score: game.homeTeam.score,
          logo: game.homeTeam.logo,
          color: game.homeTeam.color,
          winPct: Math.round(homeWinPct * 1000) / 10,
        },
        awayTeam: {
          id: game.awayTeam.id,
          name: game.awayTeam.displayName,
          abbreviation: game.awayTeam.abbreviation,
          record: game.awayTeam.record || "0-0",
          score: game.awayTeam.score,
          logo: game.awayTeam.logo,
          color: game.awayTeam.color,
          winPct: Math.round(awayWinPct * 1000) / 10,
        },
        status: {
          state: game.status.state,
          detail: game.status.detail,
          period: game.status.period,
          clock: game.status.clock,
          completed: game.status.completed,
        },
        venue: game.venue?.name,
        broadcast: game.broadcast,
        consensus,
        bookmakers,
        lineMovement,
        bestLines,
        edgeAnalysis: {
          homeEV,
          awayEV,
          hasArbitrage: arb.hasArb,
          arbProfit: arb.hasArb ? arb.profit : undefined,
          middleOpportunity: middle.hasMiddle,
          middleRange: middle.hasMiddle ? middle.range : undefined,
          valueSide,
        },
        leaders: game.leaders,
        dataSource: bookmakers.length > 0 ? "Real-time ESPN + The Odds API" : "Real-time ESPN",
      } as MarketGame;
    });

  const result: MarketSnapshot = {
    games: marketGames,
    meta: {
      sport,
      totalGames: marketGames.length,
      gamesWithOdds,
      bookmakerCount: allBookNames.size,
      generatedAt: new Date().toISOString(),
      dataSources: ["Real-time ESPN", "The Odds API (Market Lines)"],
    },
  };

  snapshotCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
