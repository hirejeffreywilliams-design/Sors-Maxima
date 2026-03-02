import { logInfo, logWarn, logError } from "./errorLogger";
import { recordApiFootballCall } from "./api-usage-tracker";

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
  dataSource: "API-Football" | "ESPN (free)";
}

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

const LEAGUE_MAP: Record<string, { id: number; season: number; name: string; espnSlug: string }> = {
  Soccer_EPL: { id: 39, season: 2025, name: "Premier League", espnSlug: "eng.1" },
  Soccer_LALIGA: { id: 140, season: 2025, name: "La Liga", espnSlug: "esp.1" },
  Soccer_BUNDESLIGA: { id: 78, season: 2025, name: "Bundesliga", espnSlug: "ger.1" },
  Soccer_SERIEA: { id: 135, season: 2025, name: "Serie A", espnSlug: "ita.1" },
  Soccer_LIGUE1: { id: 61, season: 2025, name: "Ligue 1", espnSlug: "fra.1" },
  Soccer_MLS: { id: 253, season: 2026, name: "MLS", espnSlug: "usa.1" },
  Soccer_UCL: { id: 2, season: 2025, name: "Champions League", espnSlug: "uefa.champions" },
  Soccer_INTL: { id: 1, season: 2025, name: "International Friendlies", espnSlug: "fifa.friendly" },
  // Expanded league coverage
  Soccer_EUROPA: { id: 3, season: 2025, name: "UEFA Europa League", espnSlug: "uefa.europa" },
  Soccer_CONFERENCE: { id: 848, season: 2025, name: "UEFA Conference League", espnSlug: "uefa.europa.conf" },
  Soccer_CHAMPIONSHIP: { id: 40, season: 2024, name: "EFL Championship", espnSlug: "eng.2" },
  Soccer_LIGAMX: { id: 262, season: 2025, name: "Liga MX", espnSlug: "mex.1" },
  Soccer_EREDIVISIE: { id: 88, season: 2024, name: "Eredivisie", espnSlug: "ned.1" },
  Soccer_PORTUGAL: { id: 94, season: 2024, name: "Primeira Liga", espnSlug: "por.1" },
  Soccer_TURKEY: { id: 203, season: 2024, name: "Super Lig", espnSlug: "tur.1" },
  Soccer_BRASIL: { id: 71, season: 2025, name: "Brasileirao", espnSlug: "bra.1" },
};

const fixturesCache = new Map<string, { data: SoccerFixture[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function isApiFootballAvailable(): boolean {
  return !!API_FOOTBALL_KEY;
}

export function getSoccerLeagueInfo(sportId: string): { id: number; season: number; name: string; espnSlug: string } | null {
  return LEAGUE_MAP[sportId] || null;
}

export function getAllSoccerLeagueIds(): string[] {
  return Object.keys(LEAGUE_MAP);
}

async function fetchApiFootballFixtures(leagueId: number, season: number): Promise<SoccerFixture[]> {
  if (!API_FOOTBALL_KEY) {
    console.warn(`[API-Football] API_FOOTBALL_KEY not set — skipping league ${leagueId}, using ESPN fallback`);
    return [];
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
  const twoWeeksAhead = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  const url = `${API_FOOTBALL_BASE}/fixtures?league=${leagueId}&season=${season}&from=${threeDaysAgo}&to=${twoWeeksAhead}`;

  console.log(`[API-Football] Fetching league ${leagueId} season ${season}: ${threeDaysAgo} to ${twoWeeksAhead}`);

  try {
    const response = await fetch(url, {
      headers: { "x-apisports-key": API_FOOTBALL_KEY },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[API-Football] HTTP ${response.status} for league ${leagueId}: ${body.slice(0, 200)}`);
      throw new Error(`API-Football error: ${response.status}`);
    }
    const json = await response.json();
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.error(`[API-Football] API errors for league ${leagueId}:`, JSON.stringify(json.errors));
      return [];
    }
    if (!json.response || !Array.isArray(json.response)) {
      console.warn(`[API-Football] No response array for league ${leagueId} — got:`, JSON.stringify(json).slice(0, 200));
      return [];
    }
    console.log(`[API-Football] League ${leagueId}: ${json.response.length} fixtures returned`);

    const leagueInfo = Object.values(LEAGUE_MAP).find(l => l.id === leagueId);

    return json.response.map((fix: any) => ({
      id: String(fix.fixture.id),
      league: leagueInfo?.name || fix.league?.name || "Unknown",
      leagueId,
      season,
      date: fix.fixture.date,
      timestamp: fix.fixture.timestamp,
      status: mapApiFootballStatus(fix.fixture.status?.short || "NS"),
      homeTeam: {
        id: fix.teams.home.id,
        name: fix.teams.home.name,
        logo: fix.teams.home.logo || "",
      },
      awayTeam: {
        id: fix.teams.away.id,
        name: fix.teams.away.name,
        logo: fix.teams.away.logo || "",
      },
      goals: {
        home: fix.goals.home,
        away: fix.goals.away,
      },
      venue: fix.fixture.venue?.name || "",
      dataSource: "API-Football" as const,
    }));
  } catch (error) {
    logWarn(`[API-Football] Failed for league ${leagueId}: ${error}`);
    return [];
  }
}

function mapApiFootballStatus(status: string): string {
  const map: Record<string, string> = {
    TBD: "NS", NS: "NS", "1H": "1H", HT: "HT", "2H": "2H",
    ET: "LIVE", P: "LIVE", FT: "FT", AET: "FT", PEN: "FT",
    BT: "LIVE", SUSP: "SUSP", INT: "LIVE", PST: "NS",
    CANC: "CANC", ABD: "CANC", AWD: "FT", WO: "FT", LIVE: "LIVE",
  };
  return map[status] || "NS";
}

async function fetchESPNSoccerScoreboard(espnSlug: string): Promise<any> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ESPN Soccer API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: `espn-soccer-${espnSlug}`,
    });
    return null;
  }
}

function parseESPNFixtures(data: any, leagueInfo: { id: number; season: number; name: string }): SoccerFixture[] {
  if (!data?.events) return [];

  return data.events
    .filter((event: any) => {
      const statusType = event.status?.type?.name;
      return statusType === "STATUS_SCHEDULED" ||
        statusType === "STATUS_IN_PROGRESS" ||
        statusType === "STATUS_HALFTIME" ||
        statusType === "STATUS_FIRST_HALF" ||
        statusType === "STATUS_SECOND_HALF" ||
        statusType === "STATUS_FULL_TIME" ||
        statusType === "STATUS_FINAL";
    })
    .map((event: any) => {
      const competition = event.competitions?.[0];
      const homeComp = competition?.competitors?.find((c: any) => c.homeAway === "home");
      const awayComp = competition?.competitors?.find((c: any) => c.homeAway === "away");

      const statusMap: Record<string, string> = {
        STATUS_SCHEDULED: "NS",
        STATUS_IN_PROGRESS: "LIVE",
        STATUS_HALFTIME: "HT",
        STATUS_FIRST_HALF: "1H",
        STATUS_SECOND_HALF: "2H",
        STATUS_FULL_TIME: "FT",
        STATUS_FINAL: "FT",
      };

      return {
        id: String(event.id),
        league: leagueInfo.name,
        leagueId: leagueInfo.id,
        season: leagueInfo.season,
        date: event.date,
        timestamp: Math.floor(new Date(event.date).getTime() / 1000),
        status: statusMap[event.status?.type?.name] || "NS",
        homeTeam: {
          id: parseInt(homeComp?.team?.id || "0"),
          name: homeComp?.team?.displayName || homeComp?.team?.name || "Unknown",
          logo: homeComp?.team?.logo || "",
        },
        awayTeam: {
          id: parseInt(awayComp?.team?.id || "0"),
          name: awayComp?.team?.displayName || awayComp?.team?.name || "Unknown",
          logo: awayComp?.team?.logo || "",
        },
        goals: {
          home: homeComp?.score ? parseInt(homeComp.score) : null,
          away: awayComp?.score ? parseInt(awayComp.score) : null,
        },
        venue: competition?.venue?.fullName || competition?.venue?.name || "",
        dataSource: "ESPN (free)" as const,
      };
    });
}

export async function fetchSoccerFixtures(sportId: string): Promise<SoccerFixture[]> {
  const leagueInfo = getSoccerLeagueInfo(sportId);
  if (!leagueInfo) return [];

  const cacheKey = `fixtures-${sportId}`;
  const cached = fixturesCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  if (API_FOOTBALL_KEY) {
    const apiFixtures = await fetchApiFootballFixtures(leagueInfo.id, leagueInfo.season);
    if (apiFixtures.length > 0) {
      fixturesCache.set(cacheKey, { data: apiFixtures, timestamp: Date.now() });
      recordApiFootballCall(sportId, apiFixtures.length, true);
      logInfo(`[API-Football] Fetched ${apiFixtures.length} fixtures for ${sportId} (${leagueInfo.name})`);
      return apiFixtures;
    }
    recordApiFootballCall(sportId, 0, false);
    logWarn(`[API-Football] No fixtures for ${sportId}, falling back to ESPN`);
  }

  const data = await fetchESPNSoccerScoreboard(leagueInfo.espnSlug);
  const fixtures = parseESPNFixtures(data, leagueInfo);

  fixturesCache.set(cacheKey, { data: fixtures, timestamp: Date.now() });
  logInfo(`[Soccer-ESPN] Fetched ${fixtures.length} fixtures for ${sportId} (${leagueInfo.name})`);

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
