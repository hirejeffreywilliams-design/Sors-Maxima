import type { Sport } from "@shared/schema";

export interface ESPNPlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jersey?: string;
  position: {
    abbreviation: string;
    displayName: string;
  };
  age?: number;
  height?: string;
  weight?: string;
  experience?: number;
  college?: string;
  birthDate?: string;
  status?: {
    type: string;
    name: string;
  };
  headshot?: string;
}

export interface ESPNCoach {
  id: string;
  firstName: string;
  lastName: string;
  experience?: number;
}

export interface ESPNTeam {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  location: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  conference?: string;
  division?: string;
}

export interface TeamRoster {
  team: ESPNTeam;
  coach: ESPNCoach[];
  players: ESPNPlayer[];
  lastUpdated: string;
}

const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAF: "football/college-football",
  NCAAB: "basketball/mens-college-basketball",
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_TEAMS = 6 * 60 * 60 * 1000;
const CACHE_TTL_ROSTER = 30 * 60 * 1000;

const teamsCache = new Map<string, CacheEntry<ESPNTeam[]>>();
const rosterCache = new Map<string, CacheEntry<TeamRoster>>();

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

export async function getTeams(sport: Sport): Promise<ESPNTeam[]> {
  const path = SPORT_PATHS[sport];
  if (!path) return [];

  const cacheKey = sport;
  const cached = teamsCache.get(cacheKey);
  if (isCacheValid(cached, CACHE_TTL_TEAMS)) return cached.data;

  try {
    const data = await fetchJSON(`${ESPN_BASE}/${path}/teams`);
    const rawTeams = data.sports?.[0]?.leagues?.[0]?.teams || [];

    const teams: ESPNTeam[] = rawTeams.map((t: any) => {
      const team = t.team;
      return {
        id: team.id,
        displayName: team.displayName,
        shortDisplayName: team.shortDisplayName,
        abbreviation: team.abbreviation,
        location: team.location,
        color: team.color ? `#${team.color}` : undefined,
        alternateColor: team.alternateColor ? `#${team.alternateColor}` : undefined,
        logo: team.logos?.[0]?.href,
      };
    });

    teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
    teamsCache.set(cacheKey, { data: teams, timestamp: Date.now() });
    return teams;
  } catch (err) {
    console.error(`Failed to fetch ${sport} teams from ESPN:`, err);
    const stale = teamsCache.get(cacheKey);
    if (stale) return stale.data;
    return [];
  }
}

function parseNBARoster(data: any): ESPNPlayer[] {
  const athletes = data.athletes || [];
  return athletes.map((a: any) => parsePlayerFields(a));
}

function parseNFLRoster(data: any): ESPNPlayer[] {
  const groups = data.athletes || [];
  const players: ESPNPlayer[] = [];
  for (const group of groups) {
    const items = group.items || [];
    for (const a of items) {
      players.push(parsePlayerFields(a));
    }
  }
  return players;
}

function parsePlayerFields(a: any): ESPNPlayer {
  const pos = a.position || {};
  const posAbbr = typeof pos === "string" ? pos : (pos.abbreviation || pos.displayName || "");
  const posName = typeof pos === "string" ? pos : (pos.displayName || pos.abbreviation || "");

  return {
    id: a.id || "",
    fullName: a.fullName || a.displayName || `${a.firstName || ""} ${a.lastName || ""}`.trim(),
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    jersey: a.jersey,
    position: {
      abbreviation: posAbbr,
      displayName: posName,
    },
    age: a.age,
    height: a.displayHeight,
    weight: a.displayWeight,
    experience: a.experience?.years,
    college: a.college?.name,
    birthDate: a.dateOfBirth,
    status: a.status ? {
      type: a.status.type || a.status.name?.toLowerCase() || "active",
      name: a.status.name || "Active",
    } : undefined,
    headshot: a.headshot?.href,
  };
}

export async function getTeamRoster(sport: Sport, teamId: string): Promise<TeamRoster | null> {
  const path = SPORT_PATHS[sport];
  if (!path) return null;

  const cacheKey = `${sport}-${teamId}`;
  const cached = rosterCache.get(cacheKey);
  if (isCacheValid(cached, CACHE_TTL_ROSTER)) return cached.data;

  try {
    const rosterData = await fetchJSON(`${ESPN_BASE}/${path}/teams/${teamId}/roster`);

    let players: ESPNPlayer[];
    if (sport === "NFL" || sport === "NCAAF") {
      players = parseNFLRoster(rosterData);
    } else {
      players = parseNBARoster(rosterData);
    }

    const coach: ESPNCoach[] = (rosterData.coach || []).map((c: any) => ({
      id: c.id || "",
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      experience: c.experience,
    }));

    const teamInfo = rosterData.team || {};
    const team: ESPNTeam = {
      id: teamInfo.id || teamId,
      displayName: teamInfo.displayName || teamInfo.name || "",
      shortDisplayName: teamInfo.shortDisplayName || teamInfo.nickname || "",
      abbreviation: teamInfo.abbreviation || "",
      location: teamInfo.location || "",
      color: teamInfo.color ? `#${teamInfo.color}` : undefined,
      alternateColor: teamInfo.alternateColor ? `#${teamInfo.alternateColor}` : undefined,
      logo: teamInfo.logos?.[0]?.href,
    };

    const roster: TeamRoster = {
      team,
      coach,
      players,
      lastUpdated: new Date().toISOString(),
    };

    rosterCache.set(cacheKey, { data: roster, timestamp: Date.now() });
    return roster;
  } catch (err) {
    console.error(`Failed to fetch roster for ${sport} team ${teamId}:`, err);
    const stale = rosterCache.get(cacheKey);
    if (stale) return stale.data;
    return null;
  }
}

export async function getAllRostersForSport(sport: Sport): Promise<TeamRoster[]> {
  const teams = await getTeams(sport);
  const results: TeamRoster[] = [];

  const batchSize = 5;
  for (let i = 0; i < teams.length; i += batchSize) {
    const batch = teams.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(t => getTeamRoster(sport, t.id).catch(() => null))
    );
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results;
}

export function getPlayersFromCache(sport: Sport, teamName: string): ESPNPlayer[] {
  const entries = Array.from(rosterCache.entries());
  for (const [key, entry] of entries) {
    if (key.startsWith(sport) && entry.data.team.displayName === teamName) {
      return entry.data.players.filter((p: ESPNPlayer) => 
        !p.status || p.status.type === "active"
      );
    }
  }
  return [];
}

export function clearCache(): void {
  teamsCache.clear();
  rosterCache.clear();
}
