import { logInfo, logWarn, logError } from "./errorLogger";

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export interface SoccerFixture {
  id: string;
  league: string;
  leagueId: number;
  season: number;
  date: string;
  timestamp: number;
  status: string;
  homeTeam: {
    id: number;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: number;
    name: string;
    logo: string;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  venue: string;
}

const LEAGUE_MAP: Record<string, { id: number; season: number; name: string }> = {
  Soccer_EPL: { id: 39, season: 2024, name: "Premier League" },
  Soccer_LALIGA: { id: 140, season: 2024, name: "La Liga" },
  Soccer_BUNDESLIGA: { id: 78, season: 2024, name: "Bundesliga" },
  Soccer_SERIEA: { id: 135, season: 2024, name: "Serie A" },
  Soccer_LIGUE1: { id: 61, season: 2024, name: "Ligue 1" },
  Soccer_MLS: { id: 253, season: 2025, name: "MLS" },
  Soccer_UCL: { id: 2, season: 2024, name: "Champions League" },
  Soccer_INTL: { id: 1, season: 2024, name: "World Cup" },
};

const fixturesCache = new Map<string, { data: SoccerFixture[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export function getSoccerLeagueInfo(sportId: string): { id: number; season: number; name: string } | null {
  return LEAGUE_MAP[sportId] || null;
}

export function getAllSoccerLeagueIds(): string[] {
  return Object.keys(LEAGUE_MAP);
}

async function apiFootballRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  if (!API_FOOTBALL_KEY) {
    logWarn("API_FOOTBALL_KEY not set");
    return null;
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${API_FOOTBALL_BASE}/${endpoint}?${queryString}`;

  try {
    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": API_FOOTBALL_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    const remaining = response.headers.get("x-ratelimit-requests-remaining");
    if (remaining) {
      logInfo(`API-Football requests remaining today: ${remaining}`);
    }

    return json;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: `api-football-${endpoint}`,
    });
    return null;
  }
}

export async function fetchSoccerFixtures(sportId: string): Promise<SoccerFixture[]> {
  const leagueInfo = getSoccerLeagueInfo(sportId);
  if (!leagueInfo) return [];

  const cacheKey = `fixtures-${sportId}`;
  const cached = fixturesCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const today = new Date();
  const from = today.toISOString().split("T")[0];
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 7);
  const to = toDate.toISOString().split("T")[0];

  const result = await apiFootballRequest("fixtures", {
    league: String(leagueInfo.id),
    season: String(leagueInfo.season),
    from,
    to,
    timezone: "America/New_York",
  });

  if (!result?.response) return [];

  const fixtures: SoccerFixture[] = result.response
    .filter((item: any) => {
      const status = item.fixture?.status?.short;
      return status === "NS" || status === "1H" || status === "HT" || status === "2H" || status === "ET" || status === "LIVE";
    })
    .map((item: any) => ({
      id: String(item.fixture.id),
      league: leagueInfo.name,
      leagueId: leagueInfo.id,
      season: leagueInfo.season,
      date: item.fixture.date,
      timestamp: item.fixture.timestamp,
      status: item.fixture.status?.short || "NS",
      homeTeam: {
        id: item.teams.home.id,
        name: item.teams.home.name,
        logo: item.teams.home.logo || "",
      },
      awayTeam: {
        id: item.teams.away.id,
        name: item.teams.away.name,
        logo: item.teams.away.logo || "",
      },
      goals: {
        home: item.goals?.home ?? null,
        away: item.goals?.away ?? null,
      },
      venue: item.fixture.venue?.name || "",
    }));

  fixturesCache.set(cacheKey, { data: fixtures, timestamp: Date.now() });
  logInfo(`Fetched ${fixtures.length} upcoming fixtures for ${sportId} (${leagueInfo.name})`);

  return fixtures;
}

export async function getActiveSoccerLeagues(): Promise<{ sport: string; active: boolean; gameCount: number; leagueName: string }[]> {
  const leagues = Object.entries(LEAGUE_MAP);

  const results = await Promise.all(
    leagues.map(async ([sportId, info]) => {
      const fixtures = await fetchSoccerFixtures(sportId);
      return {
        sport: sportId,
        active: fixtures.length > 0,
        gameCount: fixtures.length,
        leagueName: info.name,
      };
    })
  );

  return results;
}

export function isSoccerSport(sportId: string): boolean {
  return sportId.startsWith("Soccer_");
}

export function clearSoccerCache(): void {
  fixturesCache.clear();
}
