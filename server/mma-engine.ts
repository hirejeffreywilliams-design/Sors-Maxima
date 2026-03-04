import { logInfo, logWarn } from "./errorLogger";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MMAFight {
  id: string;
  fighter1: string;
  fighter2: string;
  pick: string;
  pickOdds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  ev: number;
  edge: number;
  impliedProbability: number;
  trueWinProbability: number;
  consensusStrength: number;
  bookmakerCount: number;
  gameTime: string;
  reasoning: string;
  selectionCategory: "favorite" | "underdog" | "close_call";
  fighter1Odds: number;
  fighter2Odds: number;
}

export interface MMAFeed {
  fights: MMAFight[];
  lastUpdated: string;
  totalFights: number;
  nextEvent?: string;
}

export interface ChampionshipContender {
  team: string;
  consensusOdds: number;
  impliedProbability: number;
  trueWinProbability: number;
  avgOdds: number;
  bookmakerCount: number;
  tier: "elite" | "contender" | "darkhorse" | "longshot";
  bookOdds: Record<string, number>;
}

export interface ChampionshipFutures {
  sport: string;
  title: string;
  contenders: ChampionshipContender[];
  lastUpdated: string;
  eventDate?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let mmaCache: { data: MMAFeed; expiresAt: number } | null = null;
let futuresCache: { data: ChampionshipFutures; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function americanToImplied(odds: number): number {
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function americanToDecimal(odds: number): number {
  if (odds < 0) return 1 + 100 / Math.abs(odds);
  return 1 + odds / 100;
}

// ── MMA Engine ────────────────────────────────────────────────────────────────
async function fetchMMAOdds(): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds/?apiKey=${process.env.THE_ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`MMA odds API ${resp.status}`);
  return resp.json();
}

function processEvents(events: any[]): MMAFight[] {
  const now = Date.now();
  const fights: MMAFight[] = [];

  for (const event of events) {
    if (!event.bookmakers?.length) continue;
    if (new Date(event.commence_time).getTime() < now) continue;

    const fighter1 = event.home_team as string;
    const fighter2 = event.away_team as string;

    const f1Odds: number[] = [];
    const f2Odds: number[] = [];

    for (const book of event.bookmakers) {
      const market = book.markets?.find((m: any) => m.key === "h2h");
      if (!market) continue;
      const o1 = market.outcomes.find((o: any) => o.name === fighter1);
      const o2 = market.outcomes.find((o: any) => o.name === fighter2);
      if (o1 && o2) { f1Odds.push(o1.price); f2Odds.push(o2.price); }
    }

    if (f1Odds.length === 0) continue;

    const avgImp1 = f1Odds.reduce((s, o) => s + americanToImplied(o), 0) / f1Odds.length;
    const avgImp2 = f2Odds.reduce((s, o) => s + americanToImplied(o), 0) / f2Odds.length;
    const total = avgImp1 + avgImp2;
    const trueProb1 = avgImp1 / total;
    const trueProb2 = avgImp2 / total;

    const pickFighter = trueProb1 >= trueProb2 ? fighter1 : fighter2;
    const pickOddsArr = trueProb1 >= trueProb2 ? f1Odds : f2Odds;
    const oppOddsArr  = trueProb1 >= trueProb2 ? f2Odds : f1Odds;
    const trueProb    = trueProb1 >= trueProb2 ? trueProb1 : trueProb2;
    const impliedProb = trueProb1 >= trueProb2 ? avgImp1 : avgImp2;

    const avgPickOdds = Math.round(pickOddsArr.reduce((s, o) => s + o, 0) / pickOddsArr.length);
    const decimalOdds = parseFloat(americanToDecimal(avgPickOdds).toFixed(2));

    const ev  = parseFloat(((trueProb * (decimalOdds - 1)) - (1 - trueProb)).toFixed(3));
    const edge = parseFloat((trueProb - impliedProb).toFixed(3));

    const booksAgree = pickOddsArr.filter((o, i) => o < oppOddsArr[i]).length / pickOddsArr.length;
    const confidence = Math.min(92, Math.max(50, Math.round(50 + (trueProb - 0.5) * 80 + booksAgree * 15)));

    let grade = "D";
    if (confidence >= 82) grade = "A";
    else if (confidence >= 70) grade = "B";
    else if (confidence >= 58) grade = "C";

    const gap = Math.abs(trueProb - 0.5);
    const selectionCategory: MMAFight["selectionCategory"] =
      gap < 0.08 ? "close_call" : trueProb > 0.62 ? "favorite" : "underdog";

    const avgF1 = Math.round(f1Odds.reduce((s, o) => s + o, 0) / f1Odds.length);
    const avgF2 = Math.round(f2Odds.reduce((s, o) => s + o, 0) / f2Odds.length);

    const reasoning =
      selectionCategory === "close_call"
        ? `Books are near-split on this fight. ${pickFighter} holds a ${(trueProb * 100).toFixed(1)}% true win probability with ${Math.round(booksAgree * 100)}% book consensus.`
        : selectionCategory === "underdog"
        ? `${pickFighter} is the underdog at ${avgPickOdds > 0 ? "+" : ""}${avgPickOdds}, but carries ${(trueProb * 100).toFixed(1)}% true win probability — generating +${(ev * 100).toFixed(1)}% EV after vig removal.`
        : `${pickFighter} is the market favorite with ${(trueProb * 100).toFixed(1)}% true win probability and ${Math.round(booksAgree * 100)}% book consensus across ${f1Odds.length} bookmakers.`;

    fights.push({
      id: event.id,
      fighter1, fighter2,
      pick: pickFighter,
      pickOdds: avgPickOdds,
      decimalOdds,
      confidence,
      grade,
      ev: parseFloat((ev * 100).toFixed(1)),
      edge: parseFloat((edge * 100).toFixed(1)),
      impliedProbability: parseFloat((impliedProb * 100).toFixed(1)),
      trueWinProbability: parseFloat((trueProb * 100).toFixed(1)),
      consensusStrength: parseFloat((booksAgree * 100).toFixed(0)),
      bookmakerCount: f1Odds.length,
      gameTime: event.commence_time,
      reasoning,
      selectionCategory,
      fighter1Odds: avgF1,
      fighter2Odds: avgF2,
    });
  }

  return fights.sort((a, b) => b.confidence - a.confidence);
}

export function getCachedMMAFights(): MMAFight[] {
  if (mmaCache && Date.now() < mmaCache.expiresAt) {
    return mmaCache.data.fights;
  }
  return [];
}

export async function generateMMAFeed(): Promise<MMAFeed> {
  if (mmaCache && Date.now() < mmaCache.expiresAt) return mmaCache.data;

  try {
    logInfo("[MMA] Fetching MMA odds from The Odds API...");
    const events = await fetchMMAOdds();
    const fights = processEvents(events);
    logInfo(`[MMA] ${fights.length} picks generated from ${events.length} events`);

    const upcoming = events
      .filter(e => new Date(e.commence_time).getTime() > Date.now())
      .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

    const feed: MMAFeed = {
      fights,
      lastUpdated: new Date().toISOString(),
      totalFights: fights.length,
      nextEvent: upcoming[0]?.commence_time,
    };

    mmaCache = { data: feed, expiresAt: Date.now() + CACHE_TTL };
    return feed;
  } catch (err: any) {
    logWarn(`[MMA] Feed fetch failed: ${err.message}`);
    if (mmaCache) return mmaCache.data;
    return { fights: [], lastUpdated: new Date().toISOString(), totalFights: 0 };
  }
}

// ── NCAAB Championship Futures ────────────────────────────────────────────────
async function fetchNCAABFutures(): Promise<any> {
  const url = `https://api.the-odds-api.com/v4/sports/basketball_ncaab_championship_winner/odds/?apiKey=${process.env.THE_ODDS_API_KEY}&regions=us&markets=outrights&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`NCAAB futures API ${resp.status}`);
  const data = await resp.json();
  return data[0];
}

export async function generateNCAABFutures(): Promise<ChampionshipFutures> {
  if (futuresCache && Date.now() < futuresCache.expiresAt) return futuresCache.data;

  try {
    const event = await fetchNCAABFutures();
    if (!event?.bookmakers) throw new Error("No futures data returned");

    const teamData: Record<string, { odds: number[]; books: Record<string, number> }> = {};

    for (const book of event.bookmakers) {
      const market = book.markets?.find((m: any) => m.key === "outrights");
      if (!market) continue;
      for (const outcome of market.outcomes) {
        if (!teamData[outcome.name]) teamData[outcome.name] = { odds: [], books: {} };
        teamData[outcome.name].odds.push(outcome.price);
        teamData[outcome.name].books[book.title] = outcome.price;
      }
    }

    const contenders: ChampionshipContender[] = Object.entries(teamData)
      .filter(([, { odds }]) => odds.length > 0)
      .map(([team, { odds, books }]) => {
        const avgImplied = odds.reduce((s, o) => s + americanToImplied(o), 0) / odds.length;
        const bestOdds   = Math.max(...odds);
        const avgOdds    = Math.round(odds.reduce((s, o) => s + o, 0) / odds.length);
        return {
          team,
          consensusOdds: bestOdds,
          impliedProbability: parseFloat((avgImplied * 100).toFixed(1)),
          trueWinProbability: 0,
          avgOdds,
          bookmakerCount: odds.length,
          tier: (avgImplied > 0.20 ? "elite" : avgImplied > 0.08 ? "contender" : avgImplied > 0.03 ? "darkhorse" : "longshot") as ChampionshipContender["tier"],
          bookOdds: books,
        };
      });

    const totalImplied = contenders.reduce((s, c) => s + c.impliedProbability / 100, 0);
    contenders.forEach(c => {
      c.trueWinProbability = parseFloat(((c.impliedProbability / 100 / totalImplied) * 100).toFixed(1));
    });

    contenders.sort((a, b) => b.impliedProbability - a.impliedProbability);

    const feed: ChampionshipFutures = {
      sport: "NCAAB",
      title: "March Madness Championship Winner",
      contenders: contenders.slice(0, 20),
      lastUpdated: new Date().toISOString(),
      eventDate: event.commence_time,
    };

    futuresCache = { data: feed, expiresAt: Date.now() + CACHE_TTL };
    logInfo(`[Futures] NCAAB championship futures loaded: ${feed.contenders.length} teams`);
    return feed;
  } catch (err: any) {
    logWarn(`[Futures] NCAAB futures failed: ${err.message}`);
    if (futuresCache) return futuresCache.data;
    return {
      sport: "NCAAB",
      title: "March Madness Championship Winner",
      contenders: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
