import type { Sport } from "@shared/schema";

const ESPN_INJURY_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_PATHS: Record<string, { sport: string; league: string }> = {
  NBA: { sport: "basketball", league: "nba" },
  NFL: { sport: "football", league: "nfl" },
  MLB: { sport: "baseball", league: "mlb" },
  NHL: { sport: "hockey", league: "nhl" },
  NCAAF: { sport: "football", league: "college-football" },
  NCAAB: { sport: "basketball", league: "mens-college-basketball" },
};

export interface InjuryReport {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamLogo?: string;
  injuries: PlayerInjury[];
}

export interface PlayerInjury {
  playerId: string;
  playerName: string;
  position: string;
  status: string;
  date: string;
  details?: string;
  jersey?: string;
  headshot?: string;
}

interface InjuryCache {
  data: InjuryReport[];
  timestamp: number;
}

const injuryCache = new Map<string, InjuryCache>();
const CACHE_TTL = 15 * 60 * 1000;

export async function getInjuries(sport: Sport | string): Promise<InjuryReport[]> {
  const sportKey = String(sport).toUpperCase();
  const paths = SPORT_PATHS[sportKey];
  if (!paths) return [];

  const cached = injuryCache.get(sportKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${ESPN_INJURY_BASE}/${paths.sport}/${paths.league}/injuries`;
    const response = await fetch(url);
    if (!response.ok) return cached?.data || [];

    const data = await response.json();
    const reports: InjuryReport[] = [];

    const teamsArray = data.injuries || data.teams || [];
    for (const team of teamsArray) {
      const injuries: PlayerInjury[] = [];
      const teamInjuries = team.injuries || [];

      for (const inj of teamInjuries) {
        const athlete = inj.athlete || {};
        injuries.push({
          playerId: inj.id || athlete.id || "",
          playerName: athlete.displayName || athlete.fullName || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() || "Unknown",
          position: athlete.position?.abbreviation || athlete.position?.name || "",
          status: inj.status || inj.type?.name || "Unknown",
          date: inj.date || "",
          details: inj.longComment || inj.shortComment || "",
          jersey: athlete.jersey || "",
          headshot: athlete.headshot?.href || athlete.links?.[0]?.href || "",
        });
      }

      if (injuries.length > 0) {
        reports.push({
          teamId: team.id || "",
          teamName: team.displayName || team.team?.displayName || team.name || "",
          teamAbbreviation: team.abbreviation || team.team?.abbreviation || "",
          teamLogo: team.logo || team.team?.logos?.[0]?.href || "",
          injuries,
        });
      }
    }

    injuryCache.set(sportKey, { data: reports, timestamp: Date.now() });
    // Suppress verbose injury load logs
    return reports;
  } catch (err) {
    console.error(`[Injuries] Error fetching ${sportKey}:`, err);
    return cached?.data || [];
  }
}

export async function getTeamInjuries(sport: Sport | string, teamAbbr: string): Promise<InjuryReport | null> {
  const reports = await getInjuries(sport);
  const match = reports.find(
    (r) => r.teamAbbreviation.toLowerCase() === teamAbbr.toLowerCase() ||
           r.teamName.toLowerCase().includes(teamAbbr.toLowerCase())
  );
  return match || null;
}

export async function getAllInjuries(): Promise<Record<string, InjuryReport[]>> {
  const sports = ["NBA", "NFL", "MLB", "NHL"];
  const results: Record<string, InjuryReport[]> = {};
  await Promise.all(
    sports.map(async (sport) => {
      results[sport] = await getInjuries(sport);
    })
  );
  return results;
}

export function getInjurySummary(reports: InjuryReport[]): {
  totalInjured: number;
  teamsAffected: number;
  byStatus: Record<string, number>;
} {
  let totalInjured = 0;
  const byStatus: Record<string, number> = {};

  for (const report of reports) {
    totalInjured += report.injuries.length;
    for (const inj of report.injuries) {
      const status = inj.status || "Unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
  }

  return {
    totalInjured,
    teamsAffected: reports.length,
    byStatus,
  };
}
