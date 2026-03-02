import { logInfo, logWarn } from "./errorLogger";
import { fetchSoccerFixtures, getAllSoccerLeagueIds, getSoccerLeagueInfo, type SoccerFixture } from "./api-football-provider";

export interface SoccerPick {
  id: string;
  sport: string;
  league: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  ev: number;
  gameTime?: string;
  reasoning: string;
  selectionCategory: "underdog" | "contrarian" | "alternative" | "sleeper";
  isLive: boolean;
  venue: string;
}

export interface SoccerLeagueStatus {
  sport: string;
  league: string;
  active: boolean;
  gameCount: number;
  pickCount: number;
  lastUpdated: string;
}

export interface InternationalFeed {
  picks: SoccerPick[];
  leagueStatus: SoccerLeagueStatus[];
  lastUpdated: string;
  totalGames: number;
  totalPicks: number;
}

// ── Odds API soccer sport keys ───────────────────────────────────────────────
const ODDS_API_SOCCER_KEYS: Record<string, string> = {
  Soccer_EPL: "soccer_epl",
  Soccer_LALIGA: "soccer_spain_la_liga",
  Soccer_BUNDESLIGA: "soccer_germany_bundesliga",
  Soccer_SERIEA: "soccer_italy_serie_a",
  Soccer_LIGUE1: "soccer_france_ligue_one",
  Soccer_UCL: "soccer_uefa_champs_league",
  Soccer_MLS: "soccer_usa_mls",
  Soccer_EUROPA: "soccer_uefa_europa_league",
  Soccer_CONFERENCE: "soccer_uefa_europa_conference_league",
  Soccer_CHAMPIONSHIP: "soccer_efl_champ",
  Soccer_LIGAMX: "soccer_mexico_ligamx",
  Soccer_EREDIVISIE: "soccer_netherlands_eredivisie",
  Soccer_PORTUGAL: "soccer_portugal_primeira_liga",
  Soccer_TURKEY: "soccer_turkey_super_league",
  Soccer_BRASIL: "soccer_brazil_campeonato",
};

const LEAGUE_DISPLAY: Record<string, string> = {
  Soccer_EPL: "Premier League",
  Soccer_LALIGA: "La Liga",
  Soccer_BUNDESLIGA: "Bundesliga",
  Soccer_SERIEA: "Serie A",
  Soccer_LIGUE1: "Ligue 1",
  Soccer_UCL: "Champions League",
  Soccer_MLS: "MLS",
  Soccer_INTL: "International",
  Soccer_EUROPA: "Europa League",
  Soccer_CONFERENCE: "Conference League",
  Soccer_CHAMPIONSHIP: "EFL Championship",
  Soccer_LIGAMX: "Liga MX",
  Soccer_EREDIVISIE: "Eredivisie",
  Soccer_PORTUGAL: "Primeira Liga",
  Soccer_TURKEY: "Super Lig",
  Soccer_BRASIL: "Brasileirao",
};

const LEAGUE_EMOJI: Record<string, string> = {
  Soccer_EPL: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Soccer_LALIGA: "🇪🇸",
  Soccer_BUNDESLIGA: "🇩🇪",
  Soccer_SERIEA: "🇮🇹",
  Soccer_LIGUE1: "🇫🇷",
  Soccer_UCL: "⭐",
  Soccer_MLS: "🇺🇸",
  Soccer_INTL: "🌍",
  Soccer_EUROPA: "🏆",
  Soccer_CONFERENCE: "🌟",
  Soccer_CHAMPIONSHIP: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Soccer_LIGAMX: "🇲🇽",
  Soccer_EREDIVISIE: "🇳🇱",
  Soccer_PORTUGAL: "🇵🇹",
  Soccer_TURKEY: "🇹🇷",
  Soccer_BRASIL: "🇧🇷",
};

// Soccer home advantage probabilities by league (based on historical data)
const LEAGUE_HOME_WIN_PROB: Record<string, number> = {
  Soccer_EPL: 0.45,
  Soccer_LALIGA: 0.47,
  Soccer_BUNDESLIGA: 0.46,
  Soccer_SERIEA: 0.46,
  Soccer_LIGUE1: 0.45,
  Soccer_UCL: 0.44,
  Soccer_MLS: 0.44,
  Soccer_INTL: 0.43,
  Soccer_EUROPA: 0.44,
  Soccer_CONFERENCE: 0.44,
  Soccer_CHAMPIONSHIP: 0.43,
  Soccer_LIGAMX: 0.47,
  Soccer_EREDIVISIE: 0.48,
  Soccer_PORTUGAL: 0.46,
  Soccer_TURKEY: 0.48,
  Soccer_BRASIL: 0.46,
};

const DRAW_PROB_BASE = 0.27; // ~27% draws in soccer globally

// ── Cache ────────────────────────────────────────────────────────────────────
let feedCache: InternationalFeed | null = null;
let feedCacheTime = 0;
const FEED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Odds cache from The Odds API
const oddsCache = new Map<string, { odds: SoccerOddsData[]; timestamp: number }>();
const ODDS_CACHE_TTL = 8 * 60 * 1000;

interface SoccerOddsData {
  gameId: string;
  home: string;
  away: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  overOdds?: number;
  underOdds?: number;
  totalLine?: number;
  bttsYesOdds?: number;
  bttsNoOdds?: number;
  bookmaker: string;
}

// ── Odds API fetch ────────────────────────────────────────────────────────────
async function fetchSoccerOdds(sportKey: string): Promise<SoccerOddsData[]> {
  const cached = oddsCache.get(sportKey);
  if (cached && Date.now() - cached.timestamp < ODDS_CACHE_TTL) return cached.odds;

  const apiKey = process.env.THE_ODDS_API_KEY?.trim();
  if (!apiKey) return [];

  const results: SoccerOddsData[] = [];

  try {
    // Try US region first, then UK for better soccer coverage
    const regions = ["us", "uk"];
    let eventData: any[] = [];

    for (const region of regions) {
      try {
        const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=${region}&markets=h2h,totals&oddsFormat=american`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          eventData = data;
          break;
        }
      } catch {
        continue;
      }
    }

    for (const event of eventData) {
      const homeTeam = event.home_team || "";
      const awayTeam = event.away_team || "";

      let homeOdds: number | null = null;
      let drawOdds: number | null = null;
      let awayOdds: number | null = null;
      let overOdds: number | undefined;
      let underOdds: number | undefined;
      let totalLine: number | undefined;
      let bookmakerName = "";

      // Find best bookmaker data
      const bookmakers = event.bookmakers || [];
      const bk = bookmakers[0];
      if (!bk) continue;
      bookmakerName = bk.key;

      for (const market of bk.markets || []) {
        if (market.key === "h2h") {
          for (const outcome of market.outcomes || []) {
            if (outcome.name === homeTeam) homeOdds = outcome.price;
            else if (outcome.name === awayTeam) awayOdds = outcome.price;
            else if (outcome.name === "Draw") drawOdds = outcome.price;
          }
        }
        if (market.key === "totals") {
          const overOutcome = market.outcomes?.find((o: any) => o.name === "Over");
          const underOutcome = market.outcomes?.find((o: any) => o.name === "Under");
          if (overOutcome) {
            overOdds = overOutcome.price;
            totalLine = overOutcome.point;
          }
          if (underOutcome) underOdds = underOutcome.price;
        }
      }

      if (!homeOdds || !awayOdds) continue;

      results.push({
        gameId: event.id,
        home: homeTeam,
        away: awayTeam,
        homeOdds,
        drawOdds: drawOdds ?? 250,
        awayOdds,
        overOdds,
        underOdds,
        totalLine,
        bookmaker: bookmakerName,
      });
    }
  } catch (err) {
    logWarn(`[International] Failed to fetch odds for ${sportKey}: ${err}`);
  }

  oddsCache.set(sportKey, { odds: results, timestamp: Date.now() });
  return results;
}

// ── Pick generation ───────────────────────────────────────────────────────────
function americanToDecimal(american: number): number {
  return american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1;
}

function impliedProb(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

function gradeFromEv(ev: number, confidence: number): string {
  if (ev >= 6 && confidence >= 65) return "A";
  if (ev >= 4 && confidence >= 58) return "B+";
  if (ev >= 2.5 && confidence >= 52) return "B";
  if (ev >= 1) return "B-";
  if (ev >= 0) return "C+";
  return "C";
}

function genPickId(gameId: string, betType: string): string {
  const str = `soccer-${gameId}-${betType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `intl-${Math.abs(hash).toString(16).slice(0, 12)}`;
}

function generatePicksForFixture(
  fixture: SoccerFixture,
  oddsData: SoccerOddsData | null,
  sport: string,
): SoccerPick[] {
  const picks: SoccerPick[] = [];
  const league = LEAGUE_DISPLAY[sport] || sport;
  const game = `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`;
  const isLive = ["1H", "2H", "HT", "LIVE"].includes(fixture.status);

  // Base probabilities from odds or estimated from league averages
  let homeWinProb: number;
  let drawProb: number;
  let awayWinProb: number;
  let homeOdds: number;
  let drawOdds: number;
  let awayOdds: number;

  if (oddsData) {
    homeOdds = oddsData.homeOdds;
    drawOdds = oddsData.drawOdds;
    awayOdds = oddsData.awayOdds;
    // Back-calculate true probs with devig (remove ~8% bookmaker margin)
    const rawHome = impliedProb(homeOdds);
    const rawDraw = impliedProb(drawOdds);
    const rawAway = impliedProb(awayOdds);
    const total = rawHome + rawDraw + rawAway;
    homeWinProb = rawHome / total;
    drawProb = rawDraw / total;
    awayWinProb = rawAway / total;
  } else {
    // Estimate: use league base rates
    const leagueHomeProb = LEAGUE_HOME_WIN_PROB[sport] || 0.45;
    homeWinProb = leagueHomeProb;
    drawProb = DRAW_PROB_BASE;
    awayWinProb = 1 - homeWinProb - drawProb;
    // Synthetic odds (with 8% margin)
    homeOdds = Math.round(homeWinProb > 0.5 ? -(homeWinProb * 100) / (1 - homeWinProb) : (1 - homeWinProb) / homeWinProb * 100);
    drawOdds = Math.round((1 / drawProb) * 100 - 100);
    awayOdds = Math.round(awayWinProb > 0.5 ? -(awayWinProb * 100) / (1 - awayWinProb) : (1 / awayWinProb) * 100);
  }

  // ── Pick 1: Team win (underdog or value moneyline) ─────────────────────────
  // Look for value: pick the underdog if the implied odds seem too wide
  const homeImp = impliedProb(homeOdds);
  const awayImp = impliedProb(awayOdds);

  // If away team is underdog with reasonable odds, pick them (unorthodox)
  if (awayOdds >= 120 && awayOdds <= 500 && awayWinProb > awayImp * 1.02) {
    const ev = (awayWinProb * americanToDecimal(awayOdds) - 1) * 100;
    const confidence = Math.round(awayWinProb * 100);
    picks.push({
      id: genPickId(fixture.id, "away_ml"),
      sport,
      league,
      game,
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      pick: `${fixture.awayTeam.name} ML`,
      betType: "moneyline",
      odds: awayOdds,
      decimalOdds: americanToDecimal(awayOdds),
      confidence,
      grade: gradeFromEv(ev, confidence),
      ev: Math.round(ev * 10) / 10,
      gameTime: fixture.date,
      reasoning: `Away value in ${league} — books may be inflating home advantage`,
      selectionCategory: awayOdds >= 200 ? "sleeper" : "underdog",
      isLive,
      venue: fixture.venue,
    });
  }

  // ── Pick 2: Draw (the most unorthodox pick for US bettors) ────────────────
  if (drawOdds >= 180 && drawOdds <= 400) {
    const trueDrawProb = drawProb;
    const impliedDrawProb = impliedProb(drawOdds);
    const ev = (trueDrawProb * americanToDecimal(drawOdds) - 1) * 100;
    const confidence = Math.round(trueDrawProb * 100);
    if (ev > -3) {
      picks.push({
        id: genPickId(fixture.id, "draw"),
        sport,
        league,
        game,
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        pick: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} — Draw`,
        betType: "draw",
        odds: drawOdds,
        decimalOdds: americanToDecimal(drawOdds),
        confidence,
        grade: gradeFromEv(ev, confidence),
        ev: Math.round(ev * 10) / 10,
        gameTime: fixture.date,
        reasoning: `Draws are +${drawOdds} — US bettors ignore them completely. ~27% base probability in ${league}.`,
        selectionCategory: "contrarian",
        isLive,
        venue: fixture.venue,
      });
    }
  }

  // ── Pick 3: Home win (if strong value/favorite with edge) ─────────────────
  if (homeOdds <= -110 && homeOdds >= -280 && homeWinProb > homeImp * 1.03) {
    const ev = (homeWinProb * americanToDecimal(homeOdds) - 1) * 100;
    const confidence = Math.round(homeWinProb * 100);
    if (ev > 1) {
      picks.push({
        id: genPickId(fixture.id, "home_ml"),
        sport,
        league,
        game,
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        pick: `${fixture.homeTeam.name} ML`,
        betType: "moneyline",
        odds: homeOdds,
        decimalOdds: americanToDecimal(homeOdds),
        confidence,
        grade: gradeFromEv(ev, confidence),
        ev: Math.round(ev * 10) / 10,
        gameTime: fixture.date,
        reasoning: `Home favorite with real edge in ${league} — strong home advantage factor`,
        selectionCategory: "contrarian",
        isLive,
        venue: fixture.venue,
      });
    }
  }

  // ── Pick 4: Total goals (if odds available) ────────────────────────────────
  if (oddsData?.overOdds && oddsData?.totalLine && oddsData.overOdds >= -130 && oddsData.overOdds <= 150) {
    const overImp = impliedProb(oddsData.overOdds);
    // Soccer games: ~52% of EPL games go over 2.5, varies by league
    const leagueOverProb = sport === "Soccer_BUNDESLIGA" ? 0.56 : sport === "Soccer_UCL" ? 0.54 : 0.51;
    const ev = (leagueOverProb * americanToDecimal(oddsData.overOdds) - 1) * 100;
    const confidence = Math.round(leagueOverProb * 100);
    if (ev > 0.5 && oddsData.overOdds >= -120) {
      picks.push({
        id: genPickId(fixture.id, `over_${oddsData.totalLine}`),
        sport,
        league,
        game,
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        pick: `Over ${oddsData.totalLine} Goals`,
        betType: "total",
        odds: oddsData.overOdds,
        decimalOdds: americanToDecimal(oddsData.overOdds),
        confidence,
        grade: gradeFromEv(ev, confidence),
        ev: Math.round(ev * 10) / 10,
        gameTime: fixture.date,
        reasoning: `Goals total market in ${league} — unorthodox for US parlays, strong statistical base`,
        selectionCategory: "alternative",
        isLive,
        venue: fixture.venue,
      });
    }
  }

  return picks;
}

// ── Main engine ───────────────────────────────────────────────────────────────
let isRunning = false;

export async function generateInternationalFeed(): Promise<InternationalFeed> {
  if (feedCache && Date.now() - feedCacheTime < FEED_CACHE_TTL) return feedCache;
  if (isRunning && feedCache) return feedCache;

  isRunning = true;
  const allPicks: SoccerPick[] = [];
  const leagueStatus: SoccerLeagueStatus[] = [];
  const leagues = getAllSoccerLeagueIds();

  for (const sportId of leagues) {
    const leagueName = LEAGUE_DISPLAY[sportId] || sportId;
    try {
      const fixtures = await fetchSoccerFixtures(sportId);
      const upcoming = fixtures.filter(f => ["NS", "1H", "HT", "2H", "LIVE"].includes(f.status));

      const oddsKey = ODDS_API_SOCCER_KEYS[sportId];
      const oddsData = oddsKey ? await fetchSoccerOdds(oddsKey) : [];
      const oddsMap = new Map<string, SoccerOddsData>();
      for (const od of oddsData) {
        oddsMap.set(`${od.home}-${od.away}`, od);
      }

      const leaguePicks: SoccerPick[] = [];
      for (const fixture of upcoming.slice(0, 10)) {
        const oddsEntry = oddsMap.get(`${fixture.homeTeam.name}-${fixture.awayTeam.name}`)
          || Array.from(oddsMap.values()).find(
            o => o.home.toLowerCase().includes(fixture.homeTeam.name.toLowerCase().slice(0, 5)) ||
                 fixture.homeTeam.name.toLowerCase().includes(o.home.toLowerCase().slice(0, 5))
          )
          || null;
        const picks = generatePicksForFixture(fixture, oddsEntry, sportId);
        leaguePicks.push(...picks);
      }

      allPicks.push(...leaguePicks);
      leagueStatus.push({
        sport: sportId,
        league: leagueName,
        active: upcoming.length > 0,
        gameCount: upcoming.length,
        pickCount: leaguePicks.length,
        lastUpdated: new Date().toISOString(),
      });

      if (upcoming.length > 0) {
        logInfo(`[International] ${leagueName}: ${upcoming.length} games, ${leaguePicks.length} picks generated`);
      }
    } catch (err) {
      logWarn(`[International] Failed to process ${leagueName}: ${err}`);
      leagueStatus.push({
        sport: sportId,
        league: leagueName,
        active: false,
        gameCount: 0,
        pickCount: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  isRunning = false;

  feedCache = {
    picks: allPicks,
    leagueStatus,
    lastUpdated: new Date().toISOString(),
    totalGames: leagueStatus.reduce((s, l) => s + l.gameCount, 0),
    totalPicks: allPicks.length,
  };
  feedCacheTime = Date.now();

  logInfo(`[International] Feed generated: ${allPicks.length} picks from ${leagueStatus.filter(l => l.active).length} active leagues`);
  return feedCache;
}

// ── Life Changer pool export ─────────────────────────────────────────────────
// Called from buildLifeChangerTicket() to add soccer legs to the pool
export function getInternationalLifeChangerPicks(): SoccerPick[] {
  if (!feedCache || Date.now() - feedCacheTime > FEED_CACHE_TTL * 2) return [];
  return feedCache.picks;
}

export function getLeagueEmoji(sport: string): string {
  return LEAGUE_EMOJI[sport] || "⚽";
}

export function invalidateInternationalCache(): void {
  feedCache = null;
  feedCacheTime = 0;
  oddsCache.clear();
}
