import { randomUUID, createHash } from "crypto";
import { Sport, SportEvent, ParlayLeg, PlayerProp, InjuryStatus, WeatherData, SituationalFactor, HistoricalTrend, LineMovement, BettingPercentages, EVAnalysis } from "@shared/schema";
type AmericanOdds = number;
type DecimalOdds = number;
import { americanToDecimal, propCategories } from "@shared/schema";
import { getPlayersFromCache, getPlayersFromCacheById, getInjuredPlayersFromCache, getTeamRoster, getTeams, preloadAllRosters, isRosterPreloaded, type ESPNPlayer } from "./espn-roster-provider";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { logInfo, logWarn, logError } from "./errorLogger";
import { apiKeyManager } from "./apiKeyManager";
import { apiBudgetOptimizer } from "./apiBudgetOptimizer";

const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports";
function getOddsApiKey(): string | undefined {
  return apiKeyManager.getKey("odds") ?? process.env.THE_ODDS_API_KEY?.trim();
}

function reportOddsUsage(response: Response, key: string) {
  const remaining = parseInt(response.headers.get("x-requests-remaining") || "");
  if (!isNaN(remaining)) {
    apiKeyManager.reportUsage("odds", key, remaining);
    apiBudgetOptimizer.reportRemaining("odds", remaining);
  } else {
    apiBudgetOptimizer.trackCall("odds", 1);
  }
}

function reportOddsError(statusCode: number, key: string) {
  apiKeyManager.reportError("odds", key, statusCode);
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

const oddsApiCache = new Map<string, { data: OddsApiGame[]; timestamp: number }>();
const ODDS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes baseline for real-time accuracy
const ODDS_CACHE_TTL_THROTTLED = 20 * 60 * 1000; // 20 minutes when budget optimizer signals throttle

function getEffectiveOddsCacheTTL(): number {
  try {
    const opt = apiBudgetOptimizer.getOptimization("odds");
    return opt.shouldThrottle ? ODDS_CACHE_TTL_THROTTLED : ODDS_CACHE_TTL;
  } catch {
    return ODDS_CACHE_TTL;
  }
}

interface ApiPlayerProp {
  playerName: string;
  market: string;
  line: number;
  bookmakers: { bookmaker: string; overOdds: number; underOdds: number; line: number }[];
  bestOver: { bookmaker: string; odds: number };
  bestUnder: { bookmaker: string; odds: number };
  consensusLine: number;
}

const gamePlayerPropsCache = new Map<string, { data: Map<string, ApiPlayerProp[]>; timestamp: number }>();
const GAME_PROPS_CACHE_TTL = 5 * 60 * 1000;

const PROP_MARKETS_BY_SPORT: Record<string, string[]> = {
  NBA: ["player_points", "player_rebounds", "player_assists", "player_threes", "player_points_rebounds_assists"],
  NFL: ["player_pass_yds", "player_pass_tds", "player_rush_yds", "player_reception_yds", "player_receptions", "player_anytime_td"],
  MLB: ["batter_hits", "batter_rbis", "batter_runs_scored", "batter_total_bases", "pitcher_strikeouts", "pitcher_hits_allowed"],
  NHL: ["player_goals", "player_assists", "player_shots_on_goal", "goalie_saves"],
  NCAAB: ["player_points", "player_rebounds", "player_assists"],
  NCAAF: ["player_pass_yds", "player_rush_yds", "player_reception_yds"],
};

const API_MARKET_TO_CATEGORY: Record<string, string> = {
  player_points: "points", player_rebounds: "rebounds", player_assists: "assists",
  player_threes: "threes", player_points_rebounds_assists: "pts_rebs_asts",
  player_pass_yds: "passing_yards", player_pass_tds: "passing_tds",
  player_rush_yds: "rushing_yards", player_reception_yds: "receiving_yards",
  player_receptions: "receptions", player_anytime_td: "anytime_td",
  batter_hits: "hits", batter_rbis: "rbis", batter_runs_scored: "runs",
  batter_total_bases: "total_bases", pitcher_strikeouts: "strikeouts_pitcher",
  pitcher_hits_allowed: "hits_allowed", player_goals: "goals",
  player_shots_on_goal: "shots", goalie_saves: "saves",
};

async function fetchPlayerPropsFromApi(sport: string, eventIds: { id: string; home: string; away: string }[]): Promise<Map<string, ApiPlayerProp[]>> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return new Map();

  const sportKey = mapSportToOddsApiKey(sport);
  if (!sportKey) return new Map();

  const cacheKey = `game-props-${sport}`;
  const cached = gamePlayerPropsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < GAME_PROPS_CACHE_TTL) {
    return cached.data;
  }

  const markets = PROP_MARKETS_BY_SPORT[sport.toUpperCase()];
  if (!markets || markets.length === 0) return new Map();

  const allProps = new Map<string, ApiPlayerProp[]>();
  const marketsParam = markets.join(",");

  const eventsToFetch = eventIds.slice(0, 8);

  for (const event of eventsToFetch) {
    try {
      const url = `${THE_ODDS_API_BASE}/${sportKey}/events/${event.id}/odds?apiKey=${apiKey}&regions=us&markets=${marketsParam}&oddsFormat=american`;
      const response = await fetch(url);
      reportOddsUsage(response, apiKey!);
      if (!response.ok) {
        if (response.status !== 422) reportOddsError(response.status, apiKey!);
        if (response.status === 422) continue;
        logWarn(`[Props API] Failed for event ${event.id}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data.bookmakers || data.bookmakers.length === 0) continue;

      const propsByPlayer = new Map<string, Map<string, ApiPlayerProp>>();

      for (const bookmaker of data.bookmakers) {
        for (const market of bookmaker.markets) {
          const category = API_MARKET_TO_CATEGORY[market.key];
          if (!category) continue;

          for (let i = 0; i < market.outcomes.length; i += 2) {
            const outcome = market.outcomes[i];
            if (!outcome?.description) continue;

            const playerName = outcome.description;
            const overOutcome = market.outcomes.find((o: any) => o.description === playerName && o.name === "Over");
            const underOutcome = market.outcomes.find((o: any) => o.description === playerName && o.name === "Under");
            if (!overOutcome || !underOutcome) continue;

            const key = `${playerName}-${category}`;
            if (!propsByPlayer.has(playerName)) propsByPlayer.set(playerName, new Map());
            const playerMap = propsByPlayer.get(playerName)!;

            if (!playerMap.has(category)) {
              playerMap.set(category, {
                playerName,
                market: category,
                line: overOutcome.point ?? 0,
                bookmakers: [],
                bestOver: { bookmaker: bookmaker.title, odds: overOutcome.price },
                bestUnder: { bookmaker: bookmaker.title, odds: underOutcome.price },
                consensusLine: overOutcome.point ?? 0,
              });
            }

            const prop = playerMap.get(category)!;
            prop.bookmakers.push({
              bookmaker: bookmaker.title,
              overOdds: overOutcome.price,
              underOdds: underOutcome.price,
              line: overOutcome.point ?? prop.line,
            });

            if (overOutcome.price > prop.bestOver.odds) {
              prop.bestOver = { bookmaker: bookmaker.title, odds: overOutcome.price };
            }
            if (underOutcome.price > prop.bestUnder.odds) {
              prop.bestUnder = { bookmaker: bookmaker.title, odds: underOutcome.price };
            }

            const allLines = prop.bookmakers.map(b => b.line);
            prop.consensusLine = allLines.reduce((a, b) => a + b, 0) / allLines.length;
          }
        }
      }

      const gameKey = `${event.home} vs ${event.away}`;
      const gameProps: ApiPlayerProp[] = [];
      for (const [, playerMap] of propsByPlayer) {
        for (const [, prop] of playerMap) {
          gameProps.push(prop);
        }
      }
      if (gameProps.length > 0) {
        allProps.set(gameKey, gameProps);
        logInfo(`[Props API] Loaded ${gameProps.length} real player props for ${gameKey} from ${data.bookmakers.length} bookmakers`);
      }
    } catch (err) {
      logWarn(`[Props API] Error fetching props for event ${event.id}: ${err}`);
    }
  }

  if (allProps.size > 0) {
    gamePlayerPropsCache.set(cacheKey, { data: allProps, timestamp: Date.now() });
  }

  return allProps;
}

function mergeApiPropsIntoGenerated(
  generatedProps: PlayerProp[],
  apiProps: ApiPlayerProp[],
  team: string
): PlayerProp[] {
  const merged = [...generatedProps];

  for (const apiProp of apiProps) {
    const existing = merged.find(
      p => p.playerName.toLowerCase() === apiProp.playerName.toLowerCase() && p.category === apiProp.market
    );

    if (existing) {
      existing.line = apiProp.consensusLine;
      if (apiProp.bookmakers.length > 0) {
        const best = apiProp.bookmakers[0];
        existing.overOdds = { americanOdds: apiProp.bestOver.odds, decimalOdds: americanToDecimal(apiProp.bestOver.odds) };
        existing.underOdds = { americanOdds: apiProp.bestUnder.odds, decimalOdds: americanToDecimal(apiProp.bestUnder.odds) };
      }
    } else {
      merged.push({
        playerId: `api-${apiProp.playerName.replace(/\s+/g, "-").toLowerCase()}`,
        playerName: apiProp.playerName,
        team,
        position: "",
        category: apiProp.market,
        line: apiProp.consensusLine,
        overOdds: { americanOdds: apiProp.bestOver.odds, decimalOdds: americanToDecimal(apiProp.bestOver.odds) },
        underOdds: { americanOdds: apiProp.bestUnder.odds, decimalOdds: americanToDecimal(apiProp.bestUnder.odds) },
      });
    }
  }

  return merged;
}

function mapSportToOddsApiKey(sport: string): string | null {
  const mapping: Record<string, string> = {
    NBA: "basketball_nba",
    NFL: "americanfootball_nfl",
    MLB: "baseball_mlb",
    NHL: "icehockey_nhl",
    NCAAB: "basketball_ncaab",
    NCAAF: "americanfootball_ncaaf",
    Soccer_EPL: "soccer_epl",
    Soccer_LALIGA: "soccer_spain_la_liga",
    Soccer_BUNDESLIGA: "soccer_germany_bundesliga",
    Soccer_SERIEA: "soccer_italy_serie_a",
    Soccer_LIGUE1: "soccer_france_ligue_one",
    Soccer_MLS: "soccer_usa_mls",
    Soccer_UCL: "soccer_uefa_champs_league",
    Soccer_INTL: "soccer_fifa_world_cup",
    Soccer_EUROPA: "soccer_uefa_europa_league",
    Soccer_CONFERENCE: "soccer_uefa_europa_conference_league",
    Soccer_CHAMPIONSHIP: "soccer_efl_champ",
    Soccer_LIGAMX: "soccer_mexico_ligamx",
    Soccer_EREDIVISIE: "soccer_netherlands_eredivisie",
    Soccer_PORTUGAL: "soccer_portugal_primeira_liga",
    Soccer_TURKEY: "soccer_turkey_super_league",
    Soccer_BRASIL: "soccer_brazil_campeonato",
  };
  return mapping[sport] || mapping[sport.toUpperCase()] || null;
}

async function fetchOddsApi(sport: string): Promise<OddsApiGame[]> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return [];
  if (apiBudgetOptimizer.isSuspended("odds")) {
    logInfo("[OddsAPI] Skipping fetch — service suspended");
    return [];
  }

  const sportKey = mapSportToOddsApiKey(sport);
  if (!sportKey) return [];

  const cacheKey = `odds-${sport}`;
  const cached = oddsApiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < getEffectiveOddsCacheTTL()) {
    return cached.data;
  }

  const regions = "us";
  const markets = "h2h,spreads,totals";
  const url = `${THE_ODDS_API_BASE}/${sportKey}/odds/?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=american`;

  try {
    const response = await fetch(url);
    reportOddsUsage(response, apiKey!);
    if (!response.ok) {
      reportOddsError(response.status, apiKey!);
      const body = await response.text().catch(() => "");
      let reason = `HTTP ${response.status}`;
      try { const p = JSON.parse(body); if (p.message) reason = p.message; } catch {}
      logWarn(`Odds API error for ${sport}: ${reason}`);
      return [];
    }
    const data = await response.json();
    oddsApiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    logWarn(`Failed to fetch odds for ${sport}: ${error}`);
    return [];
  }
}

function generateEVAnalysis(decimalOdds: number, outcomeId: string, marketOdds?: OddsApiGame): EVAnalysis {
  const impliedProbability = 1 / decimalOdds;
  let modelProbability = impliedProbability;
  let edge = 0;
  let evRating: "strong" | "moderate" | "weak" | "negative" = "weak";

  if (marketOdds && marketOdds.bookmakers && marketOdds.bookmakers.length > 0) {
    const allPrices: number[] = [];
    const marketTypes = ["h2h", "spreads", "totals"];

    for (const book of marketOdds.bookmakers) {
      for (const mType of marketTypes) {
        const market = book.markets.find(m => m.key === mType);
        if (market) {
          for (const outcome of market.outcomes) {
            const outcomeName = outcome.name.toLowerCase();
            const searchId = outcomeId.toLowerCase();
            if (searchId.includes(outcomeName) || outcomeName.includes(searchId.split("-").pop() || "")) {
              allPrices.push(outcome.price);
            }
          }
        }
      }
    }

    if (allPrices.length > 0) {
      const avgAmerican = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const avgDecimal = americanToDecimal(avgAmerican);
      const consensusProb = 1 / avgDecimal;

      const SHARP_BOOK_KEYS = [
        "pinnacle", "betfair_ex_uk", "betfair_ex_eu", "betfair",
        "betcris", "bookmaker_eu", "bookmaker", "lowvig_ag",
      ];
      const sharpBooks = marketOdds.bookmakers.filter(b =>
        SHARP_BOOK_KEYS.includes(b.key.toLowerCase())
      );
      let sharpProb = consensusProb;
      if (sharpBooks.length > 0) {
        const sharpPrices: number[] = [];
        for (const book of sharpBooks) {
          for (const mType of marketTypes) {
            const market = book.markets.find(m => m.key === mType);
            if (market) {
              for (const outcome of market.outcomes) {
                const outcomeName = outcome.name.toLowerCase();
                const searchId = outcomeId.toLowerCase();
                if (searchId.includes(outcomeName) || outcomeName.includes(searchId.split("-").pop() || "")) {
                  sharpPrices.push(outcome.price);
                }
              }
            }
          }
        }
        if (sharpPrices.length > 0) {
          const sharpAvg = sharpPrices.reduce((a, b) => a + b, 0) / sharpPrices.length;
          sharpProb = 1 / americanToDecimal(sharpAvg);
        }
      }

      modelProbability = (sharpProb * 0.5) + (consensusProb * 0.3) + (impliedProbability * 0.2);
      edge = (modelProbability / impliedProbability) - 1;

      if (edge > 0.08) evRating = "strong";
      else if (edge > 0.04) evRating = "moderate";
      else if (edge > 0.01) evRating = "weak";
      else evRating = "negative";
    }
  }

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
  return {
    gameId,
    market,
    outcome,
    openingOdds: currentOdds,
    currentOdds,
    movement: 0,
    direction: "stable" as "steam" | "reverse" | "stable",
    sharpAction: false,
  };
}

function generateBettingPercentages(gameId: string, market: string, outcome: string): BettingPercentages {
  return {
    gameId,
    market,
    outcome,
    publicPercentage: 50,
    moneyPercentage: 50,
    sharpSide: false,
  };
}

function generateInjuries(homeTeam: string, awayTeam: string, sport: Sport): InjuryStatus[] {
  return [];
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
  return undefined;
}

function generateSituationalFactors(_gameId: string, _homeTeam: string, _awayTeam: string): SituationalFactor[] {
  return [];
}

function generateHistoricalTrends(playerId: string, _playerName: string, category: string, line: number): HistoricalTrend {
  return {
    playerId,
    category,
    line,
    hitRate: 0.5,
    last10: 5,
    streak: 0,
    streakType: "none" as "over" | "under" | "none",
    homeAwayFactor: 0,
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

interface PlayerInfo {
  id: string;
  name: string;
  position: string;
  team: string;
}

function getPlayersForTeam(team: string, sport: Sport, teamId?: string): PlayerInfo[] {
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

  return [];
}

function getPropLinesForCategory(category: string, position: string): { line: number; variance: number } {
  switch (category) {
    case "passing_yards":
      return { line: 250.5, variance: 0.5 };
    case "passing_tds":
      return { line: 1.5, variance: 0.5 };
    case "rushing_yards":
      return position === "QB" ? { line: 29.5, variance: 0.5 } : { line: 69.5, variance: 0.5 };
    case "rushing_tds":
      return { line: 0.5, variance: 0.5 };
    case "receiving_yards":
      return { line: 59.5, variance: 0.5 };
    case "receptions":
      return { line: 4.5, variance: 0.5 };
    case "receiving_tds":
      return { line: 0.5, variance: 0.5 };
    case "anytime_td":
      return { line: 0.5, variance: 0.5 };
    case "points":
      return { line: 24.5, variance: 0.5 };
    case "rebounds":
      return { line: 7.5, variance: 0.5 };
    case "assists":
      return { line: 5.5, variance: 0.5 };
    case "threes":
      return { line: 2.5, variance: 0.5 };
    case "pts_rebs_asts":
      return { line: 39.5, variance: 0.5 };
    case "steals_blocks":
      return { line: 1.5, variance: 0.5 };
    case "hits":
      return { line: 0.5, variance: 0.5 };
    case "rbis":
      return { line: 0.5, variance: 0.5 };
    case "runs":
      return { line: 0.5, variance: 0.5 };
    case "total_bases":
      return { line: 1.5, variance: 0.5 };
    case "strikeouts_pitcher":
      return { line: 6.5, variance: 0.5 };
    case "hits_allowed":
      return { line: 5.5, variance: 0.5 };
    case "goals":
      return { line: 0.5, variance: 0.5 };
    case "shots":
      return { line: 3.5, variance: 0.5 };
    case "saves":
      return { line: 27.5, variance: 0.5 };
    default:
      return { line: 10, variance: 0.5 };
  }
}

function generatePropOdds(): { overOdds: { americanOdds: number; decimalOdds: number }; underOdds: { americanOdds: number; decimalOdds: number } } {
  const overAmerican = -110;
  const underAmerican = -110;
  
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
    american = -150;
  } else {
    american = 130;
  }
  return {
    americanOdds: american,
    decimalOdds: americanToDecimal(american),
  };
}

function generateSpread(): { line: number; homeOdds: { americanOdds: number; decimalOdds: number }; awayOdds: { americanOdds: number; decimalOdds: number } } {
  const spread = -3.5;
  const homeOdds = generateRandomOdds(true);
  const awayOdds = { americanOdds: -110, decimalOdds: americanToDecimal(-110) };
  return { line: spread, homeOdds, awayOdds };
}

function generateTotal(sport: Sport): { line: number; overOdds: { americanOdds: number; decimalOdds: number }; underOdds: { americanOdds: number; decimalOdds: number } } {
  let baseLine: number;
  switch (sport) {
    case "NBA":
    case "NCAAB":
      baseLine = 225;
      break;
    case "NFL":
    case "NCAAF":
      baseLine = 47;
      break;
    case "MLB":
      baseLine = 9;
      break;
    case "NHL":
      baseLine = 6;
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
  const seed = createHash('md5').update(JSON.stringify(array)).digest().readUInt32BE(0);
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
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
      startTime.setHours(currentHour + 1 + gameIndex, 0, 0, 0);
    } else {
      startTime.setHours(19 + gameIndex, 0, 0, 0);
    }
    
    if (startTime <= now) {
      startTime.setHours(startTime.getHours() + 1);
    }
    return startTime;
  } else if (gameIndex < Math.ceil(totalGames * 0.8)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12 + (gameIndex - Math.ceil(totalGames * 0.5)) * 3, 0, 0, 0);
    return tomorrow;
  } else {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(14 + (gameIndex - Math.ceil(totalGames * 0.8)) * 2, 0, 0, 0);
    return dayAfter;
  }
}

async function espnGameToEvent(game: ESPNScoreboardGame, sport: Sport): Promise<SportEvent> {
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
    const parsed = parseFloat(game.odds.spread.replace(/[^0-9.\-+]/g, "") || "0");
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

  const oddsApiGames = await fetchOddsApi(sport);
  const marketOdds = oddsApiGames.find(g =>
    (g.home_team.toLowerCase().includes(homeTeam.toLowerCase()) || homeTeam.toLowerCase().includes(g.home_team.toLowerCase())) &&
    (g.away_team.toLowerCase().includes(awayTeam.toLowerCase()) || awayTeam.toLowerCase().includes(g.away_team.toLowerCase()))
  );

  if (marketOdds && marketOdds.bookmakers.length > 0) {
    const h2hMarket = marketOdds.bookmakers[0]?.markets?.find(m => m.key === "h2h");
    if (h2hMarket) {
      const homeOutcome = h2hMarket.outcomes.find(o => o.name.toLowerCase().includes(homeTeam.split(" ").pop()!.toLowerCase()));
      const awayOutcome = h2hMarket.outcomes.find(o => o.name.toLowerCase().includes(awayTeam.split(" ").pop()!.toLowerCase()));
      if (homeOutcome) {
        moneylineHome.americanOdds = homeOutcome.price;
        moneylineHome.decimalOdds = americanToDecimal(homeOutcome.price);
      }
      if (awayOutcome) {
        moneylineAway.americanOdds = awayOutcome.price;
        moneylineAway.decimalOdds = americanToDecimal(awayOutcome.price);
      }
    }

    const spreadsMarket = marketOdds.bookmakers[0]?.markets?.find(m => m.key === "spreads");
    if (spreadsMarket) {
      const homeSpread = spreadsMarket.outcomes.find(o => o.name.toLowerCase().includes(homeTeam.split(" ").pop()!.toLowerCase()));
      if (homeSpread?.point !== undefined) {
        spread.line = homeSpread.point;
        spread.homeOdds.americanOdds = homeSpread.price;
        spread.homeOdds.decimalOdds = americanToDecimal(homeSpread.price);
        const awaySpread = spreadsMarket.outcomes.find(o => o.name !== homeSpread.name);
        if (awaySpread) {
          spread.awayOdds.americanOdds = awaySpread.price;
          spread.awayOdds.decimalOdds = americanToDecimal(awaySpread.price);
        }
      }
    }

    const totalsMarket = marketOdds.bookmakers[0]?.markets?.find(m => m.key === "totals");
    if (totalsMarket) {
      const overOutcome = totalsMarket.outcomes.find(o => o.name === "Over");
      const underOutcome = totalsMarket.outcomes.find(o => o.name === "Under");
      if (overOutcome?.point !== undefined) {
        total.line = overOutcome.point;
        total.overOdds.americanOdds = overOutcome.price;
        total.overOdds.decimalOdds = americanToDecimal(overOutcome.price);
      }
      if (underOutcome) {
        total.underOdds.americanOdds = underOutcome.price;
        total.underOdds.decimalOdds = americanToDecimal(underOutcome.price);
      }
    }
    logInfo(`[Odds] Real market odds loaded for ${homeTeam} vs ${awayTeam} from The Odds API`);
  }

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
            evAnalysis: generateEVAnalysis(moneylineHome.decimalOdds, `${gameId}-ml-home`, marketOdds),
            lineMovement: generateLineMovement(gameId, "moneyline", `${homeTeam} ML`, moneylineHome.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "moneyline", `${homeTeam} ML`),
          },
          {
            name: `${awayTeam} ML`,
            team: awayTeam,
            ...moneylineAway,
            evAnalysis: generateEVAnalysis(moneylineAway.decimalOdds, `${gameId}-ml-away`, marketOdds),
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
            evAnalysis: generateEVAnalysis(spread.homeOdds.decimalOdds, `${gameId}-spread-home`, marketOdds),
            lineMovement: generateLineMovement(gameId, "spread", `${homeTeam} spread`, spread.homeOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "spread", `${homeTeam} spread`),
          },
          {
            name: `${awayTeam} ${-spread.line > 0 ? "+" : ""}${-spread.line}`,
            team: awayTeam,
            line: -spread.line,
            ...spread.awayOdds,
            evAnalysis: generateEVAnalysis(spread.awayOdds.decimalOdds, `${gameId}-spread-away`, marketOdds),
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
            evAnalysis: generateEVAnalysis(total.overOdds.decimalOdds, `${gameId}-total-over`, marketOdds),
            lineMovement: generateLineMovement(gameId, "total", `Over ${total.line}`, total.overOdds.americanOdds),
            bettingPercentages: generateBettingPercentages(gameId, "total", `Over ${total.line}`),
          },
          {
            name: `Under ${total.line}`,
            line: total.line,
            ...total.underOdds,
            evAnalysis: generateEVAnalysis(total.underOdds.decimalOdds, `${gameId}-total-under`, marketOdds),
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
  const homeAmerican = -110;
  const awayAmerican = -110;
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

    const oddsApiGames = await fetchOddsApi(sport);
    let realPropsByGame = new Map<string, ApiPlayerProp[]>();
    if (oddsApiGames.length > 0) {
      const eventIds = oddsApiGames.map(g => ({ id: g.id, home: g.home_team, away: g.away_team }));
      try {
        realPropsByGame = await fetchPlayerPropsFromApi(sport, eventIds);
      } catch (err) {
        logWarn(`[Odds] Player prop fetch failed for ${sport}: ${err}`);
      }
    }

    const events = await Promise.all(upcomingGames.map(async (game) => {
      const event = await espnGameToEvent(game, sport);

      for (const [gameKey, apiProps] of realPropsByGame) {
        const homeMatch = gameKey.toLowerCase().includes(game.homeTeam.displayName.split(" ").pop()!.toLowerCase());
        const awayMatch = gameKey.toLowerCase().includes(game.awayTeam.displayName.split(" ").pop()!.toLowerCase());
        if (homeMatch || awayMatch) {
          if (event.playerProps) {
            event.playerProps = mergeApiPropsIntoGenerated(event.playerProps, apiProps, game.homeTeam.displayName);
            logInfo(`[Odds] Merged ${apiProps.length} real player props into ${game.homeTeam.displayName} vs ${game.awayTeam.displayName}`);
          }
          break;
        }
      }

      return event;
    }));

    return events;
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
    const homeIsFavorite = homeTeam < awayTeam;
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

export function generateMockEvents(_sport: Sport): SportEvent[] {
  return [];
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
const CACHE_TTL_THROTTLED = 25 * 60 * 1000;

function getEffectiveOddsEventCacheTTL(): number {
  try {
    const opt = apiBudgetOptimizer.getOptimization("odds");
    return opt.shouldThrottle ? CACHE_TTL_THROTTLED : CACHE_TTL;
  } catch {
    return CACHE_TTL;
  }
}

function ensureRostersLoaded(sport: Sport) {
  if (!isRosterPreloaded(sport)) {
    preloadAllRosters().catch(() => {});
  }
}

export async function getOddsForSportAsync(sport: Sport): Promise<SportEvent[]> {
  ensureRostersLoaded(sport);

  const cached = oddsCache.get(sport);
  const now = Date.now();

  if (cached && now - cached.timestamp < getEffectiveOddsEventCacheTTL()) {
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

export async function fetchRealOddsForGame(
  sport: Sport | string,
  homeTeam: string,
  awayTeam: string
): Promise<{
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  total?: number;
  h1HomeMoneyline?: number;
  h1AwayMoneyline?: number;
  h1Spread?: number;
  h1SpreadHome?: number;
  h1SpreadAway?: number;
  h1Total?: number;
  h1OverPrice?: number;
  h1UnderPrice?: number;
  bookmakerCount: number;
  source: "The Odds API" | "none";
} | null> {
  const oddsGames = await fetchOddsApi(sport as string);
  if (oddsGames.length === 0) return null;

  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  const homeNorm = homeLower.split(" ").pop() || "";
  const awayNorm = awayLower.split(" ").pop() || "";

  const match = oddsGames.find(g => {
    const gHome = g.home_team.toLowerCase();
    const gAway = g.away_team.toLowerCase();
    if (gHome === homeLower && gAway === awayLower) return true;
    if (gHome.includes(homeLower) && gAway.includes(awayLower)) return true;
    if (homeLower.includes(gHome) && awayLower.includes(gAway)) return true;
    const gHomeToken = gHome.split(" ").pop() || "";
    const gAwayToken = gAway.split(" ").pop() || "";
    return (gHomeToken === homeNorm || gHome.includes(homeNorm) || homeNorm.includes(gHomeToken)) &&
           (gAwayToken === awayNorm || gAway.includes(awayNorm) || awayNorm.includes(gAwayToken));
  });

  if (!match || match.bookmakers.length === 0) return null;

  const result: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    h1HomeMoneyline?: number;
    h1AwayMoneyline?: number;
    h1Spread?: number;
    h1SpreadHome?: number;
    h1SpreadAway?: number;
    h1Total?: number;
    h1OverPrice?: number;
    h1UnderPrice?: number;
    bookmakerCount: number;
    source: "The Odds API" | "none";
  } = {
    bookmakerCount: match.bookmakers.length,
    source: "The Odds API",
  };

  const bk = match.bookmakers[0];

  const h2h = bk?.markets?.find(m => m.key === "h2h");
  if (h2h) {
    const homeO = h2h.outcomes.find(o => o.name.toLowerCase().includes(homeNorm));
    const awayO = h2h.outcomes.find(o => o.name.toLowerCase().includes(awayNorm));
    if (homeO) result.homeMoneyline = homeO.price;
    if (awayO) result.awayMoneyline = awayO.price;
  }

  const spreads = bk?.markets?.find(m => m.key === "spreads");
  if (spreads) {
    const homeSpread = spreads.outcomes.find(o => o.name.toLowerCase().includes(homeNorm));
    if (homeSpread?.point !== undefined) result.spread = homeSpread.point;
  }

  const totals = bk?.markets?.find(m => m.key === "totals");
  if (totals) {
    const over = totals.outcomes.find(o => o.name === "Over");
    if (over?.point !== undefined) result.total = over.point;
  }

  const h2hH1 = bk?.markets?.find(m => m.key === "h2h_h1");
  if (h2hH1) {
    const homeH1 = h2hH1.outcomes.find(o => o.name.toLowerCase().includes(homeNorm));
    const awayH1 = h2hH1.outcomes.find(o => o.name.toLowerCase().includes(awayNorm));
    if (homeH1) result.h1HomeMoneyline = homeH1.price;
    if (awayH1) result.h1AwayMoneyline = awayH1.price;
  }

  const spreadsH1 = bk?.markets?.find(m => m.key === "spreads_h1");
  if (spreadsH1) {
    const homeH1S = spreadsH1.outcomes.find(o => o.name.toLowerCase().includes(homeNorm));
    const awayH1S = spreadsH1.outcomes.find(o => o.name.toLowerCase().includes(awayNorm));
    if (homeH1S?.point !== undefined) {
      result.h1Spread = homeH1S.point;
      result.h1SpreadHome = homeH1S.price;
    }
    if (awayH1S) result.h1SpreadAway = awayH1S.price;
  }

  const totalsH1 = bk?.markets?.find(m => m.key === "totals_h1");
  if (totalsH1) {
    const overH1 = totalsH1.outcomes.find(o => o.name === "Over");
    const underH1 = totalsH1.outcomes.find(o => o.name === "Under");
    if (overH1?.point !== undefined) {
      result.h1Total = overH1.point;
      result.h1OverPrice = overH1.price;
    }
    if (underH1) result.h1UnderPrice = underH1.price;
  }

  return result;
}

export async function refreshOddsForSport(sport: Sport): Promise<SportEvent[]> {
  const events = await generateEventsFromESPN(sport);
  events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  oddsCache.set(sport, { events, timestamp: Date.now() });
  return events;
}

export interface RealPlayerProp {
  eventId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  playerName: string;
  market: string;
  marketLabel: string;
  line: number;
  overOdds: number;
  underOdds: number;
  overDecimal: number;
  underDecimal: number;
  bookmaker: string;
  allBookmakers: {
    bookmaker: string;
    overOdds: number;
    underOdds: number;
    line: number;
  }[];
  bestOver: { bookmaker: string; odds: number };
  bestUnder: { bookmaker: string; odds: number };
  consensusLine: number;
  overImpliedProb: number;
  underImpliedProb: number;
  dataSource: "The Odds API (live)";
}

const PLAYER_PROP_MARKETS: Record<string, string[]> = {
  NBA: [
    "player_points", "player_rebounds", "player_assists",
    "player_threes", "player_steals", "player_blocks",
    "player_points_rebounds_assists", "player_points_rebounds",
    "player_points_assists", "player_rebounds_assists",
  ],
  NFL: ["player_pass_yds", "player_pass_tds", "player_rush_yds", "player_reception_yds", "player_receptions", "player_anytime_td"],
  MLB: ["batter_hits", "batter_total_bases", "batter_rbis", "batter_home_runs", "pitcher_strikeouts"],
  NHL: ["player_points", "player_shots_on_goal", "player_goals", "player_assists"],
  NCAAB: ["player_points", "player_rebounds", "player_assists"],
  NCAAF: ["player_pass_yds", "player_rush_yds", "player_reception_yds", "player_anytime_td"],
};

const MARKET_LABELS: Record<string, string> = {
  player_points: "Points", player_rebounds: "Rebounds", player_assists: "Assists",
  player_threes: "3-Pointers", player_blocks: "Blocks", player_steals: "Steals",
  player_points_rebounds_assists: "Pts+Reb+Ast", player_points_rebounds: "Pts+Reb",
  player_points_assists: "Pts+Ast", player_rebounds_assists: "Reb+Ast",
  player_pass_yds: "Pass Yards", player_pass_tds: "Pass TDs", player_pass_completions: "Completions",
  player_rush_yds: "Rush Yards", player_rush_attempts: "Rush Attempts",
  player_reception_yds: "Rec Yards", player_receptions: "Receptions",
  player_anytime_td: "Anytime TD", player_1st_td: "First TD",
  batter_hits: "Hits", batter_total_bases: "Total Bases", batter_rbis: "RBIs",
  batter_home_runs: "Home Runs", batter_runs_scored: "Runs", batter_strikeouts: "Strikeouts",
  pitcher_strikeouts: "Strikeouts (K)", pitcher_hits_allowed: "Hits Allowed",
  player_shots_on_goal: "Shots on Goal", player_anytime_goalscorer: "Anytime Goal",
};

const playerPropsCache = new Map<string, { data: RealPlayerProp[]; timestamp: number }>();
const PROPS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for real-time player props

const perGamePropsCache = new Map<string, { data: RealPlayerProp[]; timestamp: number }>();
const PER_GAME_PROPS_TTL = 6 * 60 * 60 * 1000; // 6 hours — persists props through live games

export function getCachedPropsForGame(eventKey: string): RealPlayerProp[] | null {
  const cached = perGamePropsCache.get(eventKey.toLowerCase());
  if (cached && (Date.now() - cached.timestamp) < PER_GAME_PROPS_TTL) {
    return cached.data;
  }
  return null;
}

export function getAllCachedGameProps(): Map<string, RealPlayerProp[]> {
  const result = new Map<string, RealPlayerProp[]>();
  const now = Date.now();
  for (const [key, val] of perGamePropsCache) {
    if (now - val.timestamp < PER_GAME_PROPS_TTL) {
      result.set(key, val.data);
    }
  }
  return result;
}

async function fetchEventIds(sport: string): Promise<{ id: string; home_team: string; away_team: string; commence_time: string }[]> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return [];
  const sportKey = mapSportToOddsApiKey(sport);
  if (!sportKey) return [];

  const cacheKey = `events-${sport}`;
  const cached = oddsApiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < getEffectiveOddsCacheTTL()) {
    return cached.data.map(g => ({ id: g.id, home_team: g.home_team, away_team: g.away_team, commence_time: g.commence_time }));
  }

  const url = `${THE_ODDS_API_BASE}/${sportKey}/events?apiKey=${apiKey}`;
  try {
    const response = await fetch(url);
    reportOddsUsage(response, apiKey!);
    if (!response.ok) {
      reportOddsError(response.status, apiKey!);
      throw new Error(`Events API error: ${response.status}`);
    }
    const data = await response.json();
    return data.map((e: any) => ({ id: e.id, home_team: e.home_team, away_team: e.away_team, commence_time: e.commence_time }));
  } catch (error) {
    logWarn(`Failed to fetch events for ${sport}: ${error}`);
    return [];
  }
}

async function fetchPlayerPropsForEvent(
  sport: string,
  eventId: string,
  markets: string[]
): Promise<any> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return null;
  const sportKey = mapSportToOddsApiKey(sport);
  if (!sportKey) return null;

  const marketsStr = markets.join(",");
  const url = `${THE_ODDS_API_BASE}/${sportKey}/events/${eventId}/odds?apiKey=${apiKey}&regions=us&markets=${marketsStr}&oddsFormat=american`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 422) return null;
      throw new Error(`Props API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logWarn(`Failed to fetch props for event ${eventId}: ${error}`);
    return null;
  }
}

const STALE_PROPS_TTL = 15 * 60 * 1000;

export async function fetchRealPlayerProps(sport: string, maxEvents: number = 5, callerIsScheduler: boolean = false): Promise<RealPlayerProp[]> {
  const cacheKey = `props-${sport}`;
  const cached = playerPropsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < PROPS_CACHE_TTL) {
    return cached.data;
  }

  if (!callerIsScheduler && cached && (Date.now() - cached.timestamp) < STALE_PROPS_TTL) {
    return cached.data;
  }

  if (!callerIsScheduler && !cached) {
    return [];
  }

  const sportUpper = sport.toUpperCase();
  const markets = PLAYER_PROP_MARKETS[sportUpper];
  if (!markets || !getOddsApiKey()) return [];

  const events = await fetchEventIds(sport);
  const now = Date.now();
  const sixHoursAgo = now - 6 * 60 * 60 * 1000;

  const upcoming: typeof events = [];
  const live: typeof events = [];
  for (const e of events) {
    const eTime = new Date(e.commence_time).getTime();
    if (eTime <= sixHoursAgo) continue;
    if (eTime <= now) {
      live.push(e);
    } else {
      upcoming.push(e);
    }
  }
  upcoming.sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
  live.sort((a, b) => new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime());

  const upcomingSlots = Math.min(upcoming.length, maxEvents);
  const liveSlots = Math.min(live.length, Math.max(2, maxEvents - upcomingSlots));
  const relevantEvents = [
    ...upcoming.slice(0, upcomingSlots),
    ...live.slice(0, liveSlots),
  ];

  if (relevantEvents.length === 0) return [];

  const allProps: RealPlayerProp[] = [];

  const batchSize = 3;
  for (let i = 0; i < relevantEvents.length; i += batchSize) {
    const batch = relevantEvents.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(event => fetchPlayerPropsForEvent(sport, event.id, markets))
    );

    for (let j = 0; j < results.length; j++) {
      const data = results[j];
      const event = batch[j];
      if (!data || !data.bookmakers) continue;

      for (const marketKey of markets) {
        const playerMap = new Map<string, {
          overPrices: { bookmaker: string; price: number; point: number }[];
          underPrices: { bookmaker: string; price: number; point: number }[];
        }>();

        for (const bookmaker of data.bookmakers) {
          const market = bookmaker.markets?.find((m: any) => m.key === marketKey);
          if (!market) continue;

          for (const outcome of market.outcomes) {
            const playerName = outcome.description;
            if (!playerName) continue;

            if (!playerMap.has(playerName)) {
              playerMap.set(playerName, { overPrices: [], underPrices: [] });
            }
            const entry = playerMap.get(playerName)!;

            if (outcome.name === "Over") {
              entry.overPrices.push({ bookmaker: bookmaker.title, price: outcome.price, point: outcome.point || 0 });
            } else if (outcome.name === "Under") {
              entry.underPrices.push({ bookmaker: bookmaker.title, price: outcome.price, point: outcome.point || 0 });
            }
          }
        }

        const playerEntries = Array.from(playerMap.entries());
        for (const [playerName, prices] of playerEntries) {
          if (prices.overPrices.length === 0 || prices.underPrices.length === 0) continue;

          type PriceEntry = { bookmaker: string; price: number; point: number };
          const consensusLine = prices.overPrices.reduce((s: number, p: PriceEntry) => s + p.point, 0) / prices.overPrices.length;
          const bestOver = prices.overPrices.reduce((best: PriceEntry, p: PriceEntry) => p.price > best.price ? p : best, prices.overPrices[0]);
          const bestUnder = prices.underPrices.reduce((best: PriceEntry, p: PriceEntry) => p.price > best.price ? p : best, prices.underPrices[0]);
          const firstOver = prices.overPrices[0];
          const firstUnder = prices.underPrices[0];

          const overDecimal = americanToDecimal(firstOver.price);
          const underDecimal = americanToDecimal(firstUnder.price);

          allProps.push({
            eventId: event.id,
            sportKey: sport,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime: event.commence_time,
            playerName,
            market: marketKey,
            marketLabel: MARKET_LABELS[marketKey] || marketKey,
            line: firstOver.point,
            overOdds: firstOver.price,
            underOdds: firstUnder.price,
            overDecimal,
            underDecimal,
            bookmaker: firstOver.bookmaker,
            allBookmakers: prices.overPrices.map((op: PriceEntry, idx: number) => ({
              bookmaker: op.bookmaker,
              overOdds: op.price,
              underOdds: prices.underPrices[idx]?.price || firstUnder.price,
              line: op.point,
            })),
            bestOver: { bookmaker: bestOver.bookmaker, odds: bestOver.price },
            bestUnder: { bookmaker: bestUnder.bookmaker, odds: bestUnder.price },
            consensusLine,
            overImpliedProb: 1 / overDecimal,
            underImpliedProb: 1 / underDecimal,
            dataSource: "The Odds API (live)",
          });
        }
      }
    }
  }

  const propsByGame = new Map<string, RealPlayerProp[]>();
  for (const prop of allProps) {
    const gameKey = `${prop.homeTeam}|${prop.awayTeam}`.toLowerCase();
    if (!propsByGame.has(gameKey)) propsByGame.set(gameKey, []);
    propsByGame.get(gameKey)!.push(prop);
  }
  for (const [gameKey, gameProps] of propsByGame) {
    perGamePropsCache.set(gameKey, { data: gameProps, timestamp: Date.now() });
  }

  playerPropsCache.set(cacheKey, { data: allProps, timestamp: Date.now() });

  logInfo(`[Props] Fetched ${allProps.length} real player props for ${sport} across ${relevantEvents.length} events (${propsByGame.size} games cached)`);
  return allProps;
}

export function isOddsApiAvailable(): boolean {
  return !!getOddsApiKey();
}

export { mapSportToOddsApiKey, fetchOddsApi, MARKET_LABELS, PLAYER_PROP_MARKETS };
