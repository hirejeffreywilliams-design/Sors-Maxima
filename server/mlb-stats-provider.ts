const MLB_API_BASE = "https://statsapi.mlb.com/api/v1";
const CACHE_TTL = 6 * 60 * 60 * 1000;

export interface MLBTeamStats {
  teamId: number;
  teamName: string;
  abbreviation: string;
  wins: number;
  losses: number;
  winPct: number;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  era: number;
  whip: number;
  strikeouts: number;
  strikeoutsPer9: number;
  walksPer9: number;
  hitsPer9: number;
  homeRunsAllowed: number;
}

interface CacheEntry {
  data: MLBTeamStats[];
  timestamp: number;
}

let cache: CacheEntry | null = null;
let fetchedSuccessfully = false;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

async function fetchMLB<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MLB_API_BASE}${path}`, {
      headers: { "User-Agent": "SorsMaxima/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function getMLBTeamStats(): Promise<MLBTeamStats[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    // Step 1: Get all teams
    const teamsResp = await fetchMLB<any>("/teams?sportId=1&season=2024");
    const teams: { id: number; name: string; abbreviation: string }[] =
      (teamsResp?.teams || []).map((t: any) => ({
        id: t.id,
        name: t.name || "",
        abbreviation: t.abbreviation || "",
      }));

    if (!teams.length) {
      console.warn("[MLBStats] No teams returned");
      return cache?.data || [];
    }

    // Step 2: Get standings (wins/losses/runs)
    const standingsResp = await fetchMLB<any>("/standings?leagueId=103,104&season=2024");
    const standingsMap = new Map<number, { wins: number; losses: number; winPct: number; runsScored: number; runsAllowed: number; runDifferential: number }>();
    for (const record of standingsResp?.records || []) {
      for (const tr of record.teamRecords || []) {
        standingsMap.set(tr.team.id, {
          wins: tr.wins || 0,
          losses: tr.losses || 0,
          winPct: parseFloat(tr.winningPercentage || "0"),
          runsScored: tr.runsScored || 0,
          runsAllowed: tr.runsAllowed || 0,
          runDifferential: tr.runDifferential || 0,
        });
      }
    }

    // Step 3: Fetch pitching stats per team (5 at a time to avoid overwhelming the API)
    const pitchingMap = new Map<number, { era: number; whip: number; strikeouts: number; strikeoutsPer9: number; walksPer9: number; hitsPer9: number; homeRunsAllowed: number }>();

    const BATCH_SIZE = 5;
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (team) => {
        const pitchResp = await fetchMLB<any>(`/teams/${team.id}/stats?stats=season&group=pitching&season=2024`);
        const stat = pitchResp?.stats?.[0]?.splits?.[0]?.stat;
        if (stat) {
          pitchingMap.set(team.id, {
            era: parseFloat(stat.era || "4.50"),
            whip: parseFloat(stat.whip || "1.30"),
            strikeouts: parseInt(stat.strikeOuts || "0"),
            strikeoutsPer9: parseFloat(stat.strikeoutsPer9Inn || "8.5"),
            walksPer9: parseFloat(stat.walksPer9Inn || "3.2"),
            hitsPer9: parseFloat(stat.hitsPer9Inn || "8.8"),
            homeRunsAllowed: parseInt(stat.homeRuns || "0"),
          });
        }
      }));
    }

    // Step 4: Merge into unified list (only teams with standings)
    const data: MLBTeamStats[] = [];
    for (const team of teams) {
      const s = standingsMap.get(team.id);
      if (!s) continue;
      const p = pitchingMap.get(team.id);
      data.push({
        teamId: team.id,
        teamName: team.name,
        abbreviation: team.abbreviation,
        wins: s.wins,
        losses: s.losses,
        winPct: s.winPct,
        runsScored: s.runsScored,
        runsAllowed: s.runsAllowed,
        runDifferential: s.runDifferential,
        era: p?.era ?? 4.5,
        whip: p?.whip ?? 1.3,
        strikeouts: p?.strikeouts ?? 0,
        strikeoutsPer9: p?.strikeoutsPer9 ?? 8.5,
        walksPer9: p?.walksPer9 ?? 3.2,
        hitsPer9: p?.hitsPer9 ?? 8.8,
        homeRunsAllowed: p?.homeRunsAllowed ?? 0,
      });
    }

    cache = { data, timestamp: Date.now() };
    fetchedSuccessfully = true;
    const withPitching = data.filter(t => t.era !== 4.5).length;
    console.log(`[MLBStats] Loaded ${data.length} teams (${withPitching} with pitching stats) — ERA range: ${Math.min(...data.map(t => t.era)).toFixed(2)}–${Math.max(...data.map(t => t.era)).toFixed(2)}`);
    return data;
  } catch (err: any) {
    console.warn(`[MLBStats] Fetch failed: ${err.message}`);
    return cache?.data || [];
  }
}

export function findMLBTeam(teamName: string): MLBTeamStats | undefined {
  if (!cache?.data.length) return undefined;
  const norm = normalize(teamName);
  const words = norm.split(" ").filter(Boolean);

  let match = cache.data.find(t => normalize(t.teamName) === norm);
  if (match) return match;

  // Try abbreviation
  match = cache.data.find(t => t.abbreviation.toLowerCase() === norm);
  if (match) return match;

  // Try last word (team city or nickname)
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (word.length > 3) {
      match = cache.data.find(t => normalize(t.teamName).includes(word));
      if (match) return match;
    }
  }

  return undefined;
}

export function isMLBStatsAvailable(): boolean {
  return fetchedSuccessfully && (cache?.data.length || 0) > 0;
}

export async function preloadMLBStats(): Promise<void> {
  await getMLBTeamStats();
}
