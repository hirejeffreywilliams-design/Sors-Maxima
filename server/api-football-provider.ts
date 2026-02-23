import { logInfo, logWarn, logError } from "./errorLogger";

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

const LEAGUE_MAP: Record<string, { id: number; season: number; name: string; espnSlug: string }> = {
  Soccer_EPL: { id: 39, season: 2025, name: "Premier League", espnSlug: "eng.1" },
  Soccer_LALIGA: { id: 140, season: 2025, name: "La Liga", espnSlug: "esp.1" },
  Soccer_BUNDESLIGA: { id: 78, season: 2025, name: "Bundesliga", espnSlug: "ger.1" },
  Soccer_SERIEA: { id: 135, season: 2025, name: "Serie A", espnSlug: "ita.1" },
  Soccer_LIGUE1: { id: 61, season: 2025, name: "Ligue 1", espnSlug: "fra.1" },
  Soccer_MLS: { id: 253, season: 2026, name: "MLS", espnSlug: "usa.1" },
  Soccer_UCL: { id: 2, season: 2025, name: "Champions League", espnSlug: "uefa.champions" },
  Soccer_INTL: { id: 1, season: 2025, name: "International Friendlies", espnSlug: "fifa.friendly" },
};

const fixturesCache = new Map<string, { data: SoccerFixture[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function getSoccerLeagueInfo(sportId: string): { id: number; season: number; name: string; espnSlug: string } | null {
  return LEAGUE_MAP[sportId] || null;
}

export function getAllSoccerLeagueIds(): string[] {
  return Object.keys(LEAGUE_MAP);
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

export async function fetchSoccerFixtures(sportId: string): Promise<SoccerFixture[]> {
  const leagueInfo = getSoccerLeagueInfo(sportId);
  if (!leagueInfo) return [];

  const cacheKey = `fixtures-${sportId}`;
  const cached = fixturesCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchESPNSoccerScoreboard(leagueInfo.espnSlug);
  if (!data?.events) return [];

  const fixtures: SoccerFixture[] = data.events
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
      };
    });

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
