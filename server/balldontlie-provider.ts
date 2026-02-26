import { logError, logInfo, logWarn } from "./errorLogger";

const BASE_URL = "https://api.balldontlie.io";
const CACHE_TTL = 5 * 60 * 1000;

function getApiKey(): string | null {
  return process.env.BALLDONTLIE_API_KEY || null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 50; i++) cache.delete(oldest[i][0]);
  }
}

async function fetchBDL<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k.endsWith("[]")) {
        url.searchParams.append(k, v);
      } else {
        url.searchParams.set(k, v);
      }
    }
  }

  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      logWarn(`[BDL] API ${res.status}: ${path}`);
      return null;
    }

    const data = await res.json() as T;
    setCache(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      logError(err, { context: "fetchBDL", path });
    }
    return null;
  }
}

export interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string;
  weight: string;
  jersey_number: string;
  college: string;
  country: string;
  draft_year: number;
  draft_round: number;
  draft_number: number;
  team_id: number;
}

export interface BDLSeasonAverage {
  player_id: number;
  season: number;
  min: string;
  fgm: number;
  fga: number;
  fg_pct: number;
  fg3m: number;
  fg3a: number;
  fg3_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
  games_played: number;
}

export interface BDLAdvancedStats {
  player_id: number;
  off_rating: number;
  def_rating: number;
  net_rating: number;
  ast_pct: number;
  ast_to: number;
  ast_ratio: number;
  oreb_pct: number;
  dreb_pct: number;
  reb_pct: number;
  tm_tov_pct: number;
  efg_pct: number;
  ts_pct: number;
  usg_pct: number;
  pace: number;
  pie: number;
}

export interface BDLTeamSeasonAvg {
  team_id: number;
  team_name: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  fg3m: number;
  fg3a: number;
  fg3_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  pf: number;
  games_played: number;
  off_rating?: number;
  def_rating?: number;
  net_rating?: number;
  pace?: number;
  efg_pct?: number;
  ts_pct?: number;
}

export interface BDLInjury {
  player: BDLPlayer;
  return_date: string;
  description: string;
  status: string;
}

export interface BDLOdds {
  id: number;
  game_id: number;
  vendor: string;
  spread_home_value: string;
  spread_home_odds: number;
  spread_away_value: string;
  spread_away_odds: number;
  moneyline_home_odds: number;
  moneyline_away_odds: number;
  total_value: string;
  total_over_odds: number;
  total_under_odds: number;
  updated_at: string;
}

export interface BDLPlayerProp {
  id: number;
  game_id: number;
  player_id: number;
  vendor: string;
  prop_type: string;
  line_value: string;
  market: {
    type: string;
    odds?: number;
    over_odds?: number;
    under_odds?: number;
  };
  updated_at: string;
}

export interface BDLStanding {
  team: { id: number; full_name: string; abbreviation: string; conference: string; division: string };
  conference_rank: number;
  division_rank: number;
  wins: number;
  losses: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
  streak: number;
  streak_type: string;
  last_ten_wins: number;
  last_ten_losses: number;
}

export interface BDLLeader {
  player: BDLPlayer;
  value: number;
  stat_type: string;
  rank: number;
  season: number;
  games_played: number;
}

export interface BDLGame {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string;
  home_team: { id: number; full_name: string; abbreviation: string };
  visitor_team: { id: number; full_name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

export function isBDLAvailable(): boolean {
  return !!getApiKey();
}

export async function getPlayerSeasonAverages(playerIds: number[], season?: number): Promise<BDLSeasonAverage[]> {
  const currentSeason = season || new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
  const params: Record<string, string> = {
    season: String(currentSeason),
    season_type: "regular",
    type: "base",
  };
  for (const id of playerIds.slice(0, 25)) {
    params[`player_ids[]`] = String(id);
  }

  const result = await fetchBDL<{ data: BDLSeasonAverage[] }>(`/nba/v1/season_averages/general`, params);
  return result?.data || [];
}

export async function getTeamSeasonAverages(season?: number, type: string = "base"): Promise<BDLTeamSeasonAvg[]> {
  const currentSeason = season || new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
  const result = await fetchBDL<{ data: BDLTeamSeasonAvg[] }>(`/nba/v1/team_season_averages/general`, {
    season: String(currentSeason),
    season_type: "regular",
    type,
  });
  return result?.data || [];
}

export async function getAdvancedTeamStats(season?: number): Promise<BDLTeamSeasonAvg[]> {
  const currentSeason = season || new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
  const result = await fetchBDL<{ data: BDLTeamSeasonAvg[] }>(`/nba/v1/team_season_averages/general`, {
    season: String(currentSeason),
    season_type: "regular",
    type: "advanced",
  });
  return result?.data || [];
}

export async function getPlayerInjuries(): Promise<BDLInjury[]> {
  const allInjuries: BDLInjury[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 5; page++) {
    const params: Record<string, string> = { per_page: "100" };
    if (cursor) params.cursor = cursor;

    const result = await fetchBDL<{ data: BDLInjury[]; meta: { next_cursor?: number } }>(`/v1/player_injuries`, params);
    if (!result?.data?.length) break;

    allInjuries.push(...result.data);
    if (!result.meta?.next_cursor) break;
    cursor = String(result.meta.next_cursor);
  }

  return allInjuries;
}

export async function getBettingOdds(dates: string[]): Promise<BDLOdds[]> {
  const allOdds: BDLOdds[] = [];

  for (const date of dates.slice(0, 3)) {
    const result = await fetchBDL<{ data: BDLOdds[] }>(`/v2/odds`, { "dates[]": date });
    if (result?.data) allOdds.push(...result.data);
  }

  return allOdds;
}

export async function getPlayerProps(gameId: number): Promise<BDLPlayerProp[]> {
  const allProps: BDLPlayerProp[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params: Record<string, string> = { game_id: String(gameId), per_page: "100" };
    if (cursor) params.cursor = cursor;

    const result = await fetchBDL<{ data: BDLPlayerProp[]; meta: { next_cursor?: number } }>(`/v2/odds/player_props`, params);
    if (!result?.data?.length) break;

    allProps.push(...result.data);
    if (!result.meta?.next_cursor) break;
    cursor = String(result.meta.next_cursor);
  }

  return allProps;
}

const playerNameCache = new Map<number, string>();
const PLAYER_NAME_CACHE_TTL = 24 * 60 * 60 * 1000;
let playerNameCacheTime = 0;

export async function getPlayerNames(playerIds: number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const uncached: number[] = [];
  const now = Date.now();

  if (now - playerNameCacheTime > PLAYER_NAME_CACHE_TTL) {
    playerNameCache.clear();
    playerNameCacheTime = now;
  }

  for (const id of playerIds) {
    if (playerNameCache.has(id)) {
      result.set(id, playerNameCache.get(id)!);
    } else {
      uncached.push(id);
    }
  }

  const uniqueUncached = [...new Set(uncached)];
  for (const id of uniqueUncached.slice(0, 25)) {
    try {
      const player = await fetchBDL<{ id: number; first_name: string; last_name: string }>(`/nba/v1/players/${id}`);
      if (player?.first_name && player?.last_name) {
        const name = `${player.first_name} ${player.last_name}`;
        playerNameCache.set(id, name);
        result.set(id, name);
      }
    } catch {}
  }

  return result;
}

export async function getTeamStandings(season?: number): Promise<BDLStanding[]> {
  const currentSeason = season || new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
  const result = await fetchBDL<{ data: BDLStanding[] }>(`/v1/standings`, {
    season: String(currentSeason),
  });
  return result?.data || [];
}

export async function getLeaders(statType: string, season?: number): Promise<BDLLeader[]> {
  const currentSeason = season || new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
  const result = await fetchBDL<{ data: BDLLeader[] }>(`/v1/leaders`, {
    stat_type: statType,
    season: String(currentSeason),
  });
  return result?.data || [];
}

export async function getTodaysGames(): Promise<BDLGame[]> {
  const today = new Date().toISOString().split("T")[0];
  const result = await fetchBDL<{ data: BDLGame[] }>(`/nba/v1/games`, {
    "dates[]": today,
  });
  return result?.data || [];
}

export async function getGamesForDate(date: string): Promise<BDLGame[]> {
  const result = await fetchBDL<{ data: BDLGame[] }>(`/nba/v1/games`, {
    "dates[]": date,
  });
  return result?.data || [];
}

export interface BDLEnrichedTeamData {
  teamId: number;
  teamName: string;
  abbreviation: string;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  streak: number;
  streakType: string;
  last10Wins: number;
  last10Losses: number;
  conferenceRank: number;
  divisionRank: number;
  avgPts: number;
  avgReb: number;
  avgAst: number;
  fgPct: number;
  fg3Pct: number;
  pace?: number;
  offRating?: number;
  defRating?: number;
  netRating?: number;
}

const enrichedTeamCache: CacheEntry<BDLEnrichedTeamData[]> | null = null;

export async function getEnrichedTeamData(): Promise<BDLEnrichedTeamData[]> {
  if (enrichedTeamCache && Date.now() - enrichedTeamCache.timestamp < 30 * 60 * 1000) {
    return enrichedTeamCache.data;
  }

  const [standings, baseStats, advStats] = await Promise.all([
    getTeamStandings(),
    getTeamSeasonAverages(),
    getAdvancedTeamStats(),
  ]);

  if (!standings.length) return [];

  const baseMap = new Map<number, BDLTeamSeasonAvg>();
  const advMap = new Map<number, BDLTeamSeasonAvg>();
  for (const s of baseStats) baseMap.set(s.team_id, s);
  for (const a of advStats) advMap.set(a.team_id, a);

  const enriched: BDLEnrichedTeamData[] = standings.map(s => {
    const base = baseMap.get(s.team.id);
    const adv = advMap.get(s.team.id);
    return {
      teamId: s.team.id,
      teamName: s.team.full_name,
      abbreviation: s.team.abbreviation,
      wins: s.wins,
      losses: s.losses,
      homeWins: s.home_wins,
      homeLosses: s.home_losses,
      awayWins: s.away_wins,
      awayLosses: s.away_losses,
      streak: s.streak,
      streakType: s.streak_type,
      last10Wins: s.last_ten_wins,
      last10Losses: s.last_ten_losses,
      conferenceRank: s.conference_rank,
      divisionRank: s.division_rank,
      avgPts: base?.pts || 0,
      avgReb: base?.reb || 0,
      avgAst: base?.ast || 0,
      fgPct: base?.fg_pct || 0,
      fg3Pct: base?.fg3_pct || 0,
      pace: adv?.pace,
      offRating: adv?.off_rating,
      defRating: adv?.def_rating,
      netRating: adv?.net_rating,
    };
  });

  logInfo(`[BDL] Enriched data loaded for ${enriched.length} NBA teams`);
  return enriched;
}

export async function lookupTeamByName(teamName: string): Promise<BDLEnrichedTeamData | null> {
  const enriched = await getEnrichedTeamData();
  const nameLower = teamName.toLowerCase();
  return enriched.find(t =>
    t.teamName.toLowerCase().includes(nameLower) ||
    t.abbreviation.toLowerCase() === nameLower ||
    nameLower.includes(t.teamName.split(" ").pop()!.toLowerCase())
  ) || null;
}
