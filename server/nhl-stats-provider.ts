import { recordNHLStatsCall } from "./api-usage-tracker";

const NHL_STATS_URL = "https://api.nhle.com/stats/rest/en/team/summary";
const CACHE_TTL = 6 * 60 * 60 * 1000;

export interface NHLTeamStats {
  teamId: number;
  teamName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPct: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  shotsForPerGame: number;
  shotsAgainstPerGame: number;
  powerPlayPct: number;
  penaltyKillPct: number;
  faceoffWinPct: number;
  winsInRegulation: number;
}

interface CacheEntry {
  data: NHLTeamStats[];
  timestamp: number;
}

let cache: CacheEntry | null = null;
let fetchedSuccessfully = false;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

export async function getNHLTeamStats(): Promise<NHLTeamStats[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const url = `${NHL_STATS_URL}?season=20242025&gameType=2&limit=50`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SorsMaxima/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[NHLStats] API returned ${res.status}`);
      return cache?.data || [];
    }

    const json = await res.json() as { data: any[] };
    const data: NHLTeamStats[] = (json.data || []).map((t: any) => ({
      teamId: t.teamId,
      teamName: t.teamFullName || "",
      gamesPlayed: t.gamesPlayed || 0,
      wins: t.wins || 0,
      losses: t.losses || 0,
      otLosses: t.otLosses || 0,
      points: t.points || 0,
      pointPct: t.pointPct || 0,
      goalsForPerGame: t.goalsForPerGame || 0,
      goalsAgainstPerGame: t.goalsAgainstPerGame || 0,
      shotsForPerGame: t.shotsForPerGame || 0,
      shotsAgainstPerGame: t.shotsAgainstPerGame || 0,
      powerPlayPct: t.powerPlayPct || 0,
      penaltyKillPct: t.penaltyKillPct || 0,
      faceoffWinPct: t.faceoffWinPct || 0,
      winsInRegulation: t.winsInRegulation || 0,
    }));

    cache = { data, timestamp: Date.now() };
    fetchedSuccessfully = true;
    recordNHLStatsCall(data.length, true);
    console.log(`[NHLStats] Loaded ${data.length} teams — GPG range: ${Math.min(...data.map(t => t.goalsForPerGame)).toFixed(2)}–${Math.max(...data.map(t => t.goalsForPerGame)).toFixed(2)}`);
    return data;
  } catch (err: any) {
    recordNHLStatsCall(0, false);
    console.warn(`[NHLStats] Fetch failed: ${err.message}`);
    return cache?.data || [];
  }
}

export function findNHLTeam(teamName: string): NHLTeamStats | undefined {
  if (!cache?.data.length) return undefined;
  const norm = normalize(teamName);
  const words = norm.split(" ").filter(Boolean);

  // Try exact match first
  let match = cache.data.find(t => normalize(t.teamName) === norm);
  if (match) return match;

  // Try last word (team nickname)
  const lastWord = words[words.length - 1];
  if (lastWord && lastWord.length > 3) {
    match = cache.data.find(t => normalize(t.teamName).endsWith(lastWord));
    if (match) return match;
  }

  // Try any word overlap
  match = cache.data.find(t => {
    const tWords = normalize(t.teamName).split(" ");
    return words.some(w => w.length > 3 && tWords.includes(w));
  });

  return match;
}

export function isNHLStatsAvailable(): boolean {
  return fetchedSuccessfully && (cache?.data.length || 0) > 0;
}

export async function preloadNHLStats(): Promise<void> {
  await getNHLTeamStats();
}
