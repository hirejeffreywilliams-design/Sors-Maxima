import type { Sport } from "@shared/schema";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAF: "football/college-football",
  NCAAB: "basketball/mens-college-basketball",
};

export interface ESPNScoreboardGame {
  id: string;
  sport: Sport;
  name: string;
  shortName: string;
  date: string;
  homeTeam: {
    id: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    logo?: string;
    color?: string;
    record?: string;
    score: number;
  };
  awayTeam: {
    id: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    logo?: string;
    color?: string;
    record?: string;
    score: number;
  };
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    shortDetail: string;
    period: number;
    clock: string;
    completed: boolean;
  };
  venue?: {
    name: string;
    city?: string;
    state?: string;
  };
  broadcast?: string;
  odds?: {
    spread?: string;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  };
  leaders?: {
    team: string;
    category: string;
    playerName: string;
    value: string;
  }[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const scoreboardCache = new Map<string, CacheEntry<ESPNScoreboardGame[]>>();
const CACHE_TTL_LIVE = 60 * 1000;
const CACHE_TTL_PRE = 5 * 60 * 1000;

function isCacheValid<T>(entry: CacheEntry<T> | undefined, ttl: number): entry is CacheEntry<T> {
  return !!entry && (Date.now() - entry.timestamp) < ttl;
}

async function fetchJSON(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN API ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseCompetitor(comp: any): ESPNScoreboardGame["homeTeam"] {
  const team = comp.team || {};
  const records = comp.records || [];
  const overallRecord = records.find((r: any) => r.type === "total");

  return {
    id: team.id || "",
    displayName: team.displayName || team.name || "",
    shortDisplayName: team.shortDisplayName || team.abbreviation || "",
    abbreviation: team.abbreviation || "",
    logo: team.logo || team.logos?.[0]?.href,
    color: team.color ? `#${team.color}` : undefined,
    record: overallRecord?.summary || "",
    score: parseInt(comp.score || "0", 10) || 0,
  };
}

function parseLeaders(competitors: any[]): ESPNScoreboardGame["leaders"] {
  const leaders: ESPNScoreboardGame["leaders"] = [];
  for (const comp of competitors) {
    const teamName = comp.team?.displayName || "";
    const compLeaders = comp.leaders || [];
    for (const category of compLeaders) {
      const topLeader = category.leaders?.[0];
      if (topLeader) {
        leaders.push({
          team: teamName,
          category: category.displayName || category.name || "",
          playerName: topLeader.athlete?.displayName || topLeader.athlete?.fullName || "",
          value: topLeader.displayValue || String(topLeader.value || ""),
        });
      }
    }
  }
  return leaders;
}

function parseGame(event: any, sport: Sport): ESPNScoreboardGame {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
  const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

  const status = event.status || {};
  const statusType = status.type || {};

  const venue = competition.venue;
  const broadcasts = competition.broadcasts || [];
  const broadcastStr = broadcasts.map((b: any) => b.names?.join(", ")).filter(Boolean).join(" | ");

  let odds: ESPNScoreboardGame["odds"];
  if (competition.odds && competition.odds.length > 0) {
    const o = competition.odds[0];
    odds = {
      spread: o.details || undefined,
      overUnder: o.overUnder || undefined,
    };
  }

  return {
    id: event.id || "",
    sport,
    name: event.name || "",
    shortName: event.shortName || "",
    date: event.date || competition.date || "",
    homeTeam: homeComp ? parseCompetitor(homeComp) : {
      id: "", displayName: "TBD", shortDisplayName: "TBD", abbreviation: "TBD", score: 0
    },
    awayTeam: awayComp ? parseCompetitor(awayComp) : {
      id: "", displayName: "TBD", shortDisplayName: "TBD", abbreviation: "TBD", score: 0
    },
    status: {
      state: statusType.state === "in" ? "in" : statusType.state === "post" ? "post" : "pre",
      detail: statusType.detail || statusType.description || "",
      shortDetail: statusType.shortDetail || "",
      period: status.period || 0,
      clock: status.displayClock || "",
      completed: !!statusType.completed,
    },
    venue: venue ? {
      name: venue.fullName || venue.shortName || "",
      city: venue.address?.city,
      state: venue.address?.state,
    } : undefined,
    broadcast: broadcastStr || undefined,
    odds,
    leaders: parseLeaders(competitors),
  };
}

export async function getScoreboard(sport: Sport): Promise<ESPNScoreboardGame[]> {
  const path = SPORT_PATHS[sport];
  if (!path) return [];

  const cacheKey = `scoreboard-${sport}`;
  const cached = scoreboardCache.get(cacheKey);
  const hasLiveGames = cached?.data?.some(g => g.status.state === "in");
  const ttl = hasLiveGames ? CACHE_TTL_LIVE : CACHE_TTL_PRE;

  if (isCacheValid(cached, ttl)) return cached.data;

  try {
    const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard`);
    const events = data.events || [];
    const games = events.map((e: any) => parseGame(e, sport));

    scoreboardCache.set(cacheKey, { data: games, timestamp: Date.now() });
    console.log(`[ESPN-Scoreboard] Fetched ${games.length} ${sport} games`);
    return games;
  } catch (error) {
    console.error(`[ESPN-Scoreboard] Error fetching ${sport}:`, error);
    return cached?.data || [];
  }
}

export async function getMultiDayScoreboard(sport: Sport, daysAhead: number = 3): Promise<ESPNScoreboardGame[]> {
  const path = SPORT_PATHS[sport];
  if (!path) return [];

  const cacheKey = `scoreboard-multi-${sport}`;
  const cached = scoreboardCache.get(cacheKey);
  if (isCacheValid(cached, CACHE_TTL_PRE)) return cached.data;

  const allGames: ESPNScoreboardGame[] = [];
  const today = new Date();

  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    try {
      const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard?dates=${dateStr}`);
      const events = data.events || [];
      const games = events.map((e: any) => parseGame(e, sport));
      allGames.push(...games);
    } catch (error) {
      console.error(`[ESPN-Scoreboard] Error fetching ${sport} for ${dateStr}:`, error);
    }
  }

  const uniqueGames = Array.from(new Map(allGames.map(g => [g.id, g])).values());
  scoreboardCache.set(cacheKey, { data: uniqueGames, timestamp: Date.now() });
  console.log(`[ESPN-Scoreboard] Fetched ${uniqueGames.length} ${sport} games across ${daysAhead + 1} days`);
  return uniqueGames;
}

export async function getAllSportsScoreboard(): Promise<ESPNScoreboardGame[]> {
  const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL"];
  const results = await Promise.all(sports.map(s => getScoreboard(s)));
  return results.flat();
}

export async function getAllSportsMultiDay(daysAhead: number = 3): Promise<ESPNScoreboardGame[]> {
  const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL"];
  const results = await Promise.all(sports.map(s => getMultiDayScoreboard(s, daysAhead)));
  return results.flat();
}

export async function getLiveGames(): Promise<ESPNScoreboardGame[]> {
  const all = await getAllSportsScoreboard();
  return all.filter(g => g.status.state === "in");
}

export async function getUpcomingGames(): Promise<ESPNScoreboardGame[]> {
  const all = await getAllSportsMultiDay(3);
  return all.filter(g => g.status.state === "pre").sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function clearScoreboardCache(): void {
  scoreboardCache.clear();
  console.log("[ESPN-Scoreboard] Cache cleared");
}
