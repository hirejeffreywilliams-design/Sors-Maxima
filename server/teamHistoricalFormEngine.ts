import fs from "fs";
import path from "path";
import type { Sport } from "@shared/schema";

const CACHE_FILE = path.join(process.cwd(), "team-form-cache.json");
const CACHE_TTL_MS = 22 * 60 * 60 * 1000;
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_PATHS: Partial<Record<Sport, string>> = {
  NBA: "basketball/nba",
  NHL: "hockey/nhl",
  MLB: "baseball/mlb",
  NCAAB: "basketball/mens-college-basketball",
  NCAAF: "football/college-football",
  NFL: "football/nfl",
};

const HISTORY_DAYS: Partial<Record<Sport, number>> = {
  NBA: 60,
  NHL: 60,
  MLB: 45,
  NCAAB: 45,
  NCAAF: 30,
  NFL: 30,
};

export interface TeamFormData {
  teamName: string;
  abbreviation: string;
  sport: string;
  last10: { wins: number; losses: number };
  last10AvgMargin: number;
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
  recentStreak: { type: "W" | "L"; length: number };
  blowoutWins: number;
  blowoutLosses: number;
  formScore: number;
  gamesAnalyzed: number;
  lastUpdated: number;
}

interface GameResult {
  date: string;
  isHome: boolean;
  teamScore: number;
  oppScore: number;
  margin: number;
  won: boolean;
}

interface FormCache {
  generatedAt: number;
  sports: Partial<Record<Sport, Record<string, TeamFormData>>>;
}

let inMemoryCache: FormCache | null = null;
let buildInProgress = false;

function loadCacheFromDisk(): FormCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed: FormCache = JSON.parse(raw);
    if (Date.now() - parsed.generatedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCacheToDisk(cache: FormCache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch (e) {
    console.error("[TeamFormEngine] Failed to save cache:", e);
  }
}

async function fetchJSON(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function calcFormScore(data: {
  last10: { wins: number; losses: number };
  last10AvgMargin: number;
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
  recentStreak: { type: "W" | "L"; length: number };
  blowoutWins: number;
  blowoutLosses: number;
}): number {
  let score = 0;

  const total10 = data.last10.wins + data.last10.losses;
  if (total10 > 0) {
    const winRate = data.last10.wins / total10;
    score += (winRate - 0.5) * 8;
  }

  const marginClamped = Math.max(-20, Math.min(20, data.last10AvgMargin));
  score += marginClamped * 0.15;

  if (data.recentStreak.type === "W") {
    score += Math.min(data.recentStreak.length, 7) * 0.3;
  } else {
    score -= Math.min(data.recentStreak.length, 7) * 0.3;
  }

  score += (data.blowoutWins - data.blowoutLosses) * 0.2;

  return Math.max(-10, Math.min(10, Math.round(score * 10) / 10));
}

async function buildTeamFormForSport(sport: Sport): Promise<Record<string, TeamFormData>> {
  const path = SPORT_PATHS[sport];
  if (!path) return {};

  const days = HISTORY_DAYS[sport] || 30;
  const teamResults: Record<string, GameResult[]> = {};
  const teamAbbreviations: Record<string, string> = {};

  const today = new Date();
  const batchSize = 5;

  for (let i = days; i >= 1; i -= batchSize) {
    const batchPromises: Promise<void>[] = [];

    for (let j = 0; j < batchSize && i - j >= 1; j++) {
      const dayOffset = i - j;
      const dateObj = new Date(today);
      dateObj.setDate(dateObj.getDate() - dayOffset);
      const dateStr = formatDate(dateObj);

      batchPromises.push(
        fetchJSON(`${ESPN_BASE}/${path}/scoreboard?dates=${dateStr}`)
          .then((data: any) => {
            const events = data.events || [];
            for (const event of events) {
              const comp = event.competitions?.[0];
              if (!comp) continue;

              const statusType = event.status?.type || {};
              if (!statusType.completed) continue;

              const competitors = comp.competitors || [];
              const homeComp = competitors.find((c: any) => c.homeAway === "home");
              const awayComp = competitors.find((c: any) => c.homeAway === "away");
              if (!homeComp || !awayComp) continue;

              const homeScore = parseInt(homeComp.score || "0", 10);
              const awayScore = parseInt(awayComp.score || "0", 10);
              const margin = homeScore - awayScore;

              const homeTeam = homeComp.team || {};
              const awayTeam = awayComp.team || {};
              const homeName = homeTeam.displayName || homeTeam.name || "";
              const awayName = awayTeam.displayName || awayTeam.name || "";

              if (!homeName || !awayName) continue;

              if (!teamResults[homeName]) teamResults[homeName] = [];
              if (!teamResults[awayName]) teamResults[awayName] = [];
              teamAbbreviations[homeName] = homeTeam.abbreviation || "";
              teamAbbreviations[awayName] = awayTeam.abbreviation || "";

              teamResults[homeName].push({
                date: dateStr,
                isHome: true,
                teamScore: homeScore,
                oppScore: awayScore,
                margin,
                won: homeScore > awayScore,
              });

              teamResults[awayName].push({
                date: dateStr,
                isHome: false,
                teamScore: awayScore,
                oppScore: homeScore,
                margin: -margin,
                won: awayScore > homeScore,
              });
            }
          })
          .catch(() => {})
      );
    }

    await Promise.all(batchPromises);
    await new Promise(r => setTimeout(r, 150));
  }

  const result: Record<string, TeamFormData> = {};

  for (const [teamName, games] of Object.entries(teamResults)) {
    if (games.length < 3) continue;

    const sorted = games.sort((a, b) => b.date.localeCompare(a.date));
    const last10 = sorted.slice(0, 10);
    const homeGames = sorted.filter(g => g.isHome);
    const awayGames = sorted.filter(g => !g.isHome);

    const l10wins = last10.filter(g => g.won).length;
    const l10losses = last10.length - l10wins;
    const l10AvgMargin = last10.length > 0
      ? Math.round((last10.reduce((s, g) => s + g.margin, 0) / last10.length) * 10) / 10
      : 0;

    const homeW = homeGames.filter(g => g.won).length;
    const homeL = homeGames.length - homeW;
    const awayW = awayGames.filter(g => g.won).length;
    const awayL = awayGames.length - awayW;

    let streakType: "W" | "L" = last10[0]?.won ? "W" : "L";
    let streakLen = 0;
    for (const g of last10) {
      if (g.won === (streakType === "W")) streakLen++;
      else break;
    }

    const blowoutThresholds: Partial<Record<Sport, number>> = { NBA: 15, NFL: 14, MLB: 5, NHL: 3, NCAAB: 20, NCAAF: 21 };
    const blowoutThresh = blowoutThresholds[sport] || 10;
    const blowoutWins = last10.filter(g => g.won && g.margin >= blowoutThresh).length;
    const blowoutLosses = last10.filter(g => !g.won && g.margin <= -blowoutThresh).length;

    const formScore = calcFormScore({
      last10: { wins: l10wins, losses: l10losses },
      last10AvgMargin: l10AvgMargin,
      homeRecord: { wins: homeW, losses: homeL },
      awayRecord: { wins: awayW, losses: awayL },
      recentStreak: { type: streakType, length: streakLen },
      blowoutWins,
      blowoutLosses,
    });

    result[teamName] = {
      teamName,
      abbreviation: teamAbbreviations[teamName] || "",
      sport,
      last10: { wins: l10wins, losses: l10losses },
      last10AvgMargin: l10AvgMargin,
      homeRecord: { wins: homeW, losses: homeL },
      awayRecord: { wins: awayW, losses: awayL },
      recentStreak: { type: streakType, length: streakLen },
      blowoutWins,
      blowoutLosses,
      formScore,
      gamesAnalyzed: sorted.length,
      lastUpdated: Date.now(),
    };
  }

  console.log(`[TeamFormEngine] Built form data for ${Object.keys(result).length} ${sport} teams from ${days} days of history`);
  return result;
}

async function buildFullCache(): Promise<FormCache> {
  const sports: Sport[] = ["NBA", "NHL", "MLB", "NCAAB"];
  const sportResults = await Promise.allSettled(
    sports.map(s => buildTeamFormForSport(s))
  );

  const sportsData: Partial<Record<Sport, Record<string, TeamFormData>>> = {};
  sports.forEach((sport, i) => {
    const r = sportResults[i];
    if (r.status === "fulfilled") {
      sportsData[sport] = r.value;
    }
  });

  return {
    generatedAt: Date.now(),
    sports: sportsData,
  };
}

export async function initTeamFormEngine(): Promise<void> {
  const disk = loadCacheFromDisk();
  if (disk) {
    inMemoryCache = disk;
    const teamCount = Object.values(disk.sports).reduce((s, m) => s + Object.keys(m || {}).length, 0);
    console.log(`[TeamFormEngine] Loaded ${teamCount} team profiles from disk cache`);
    refreshFormCacheAsync();
    return;
  }

  console.log("[TeamFormEngine] Building initial team form cache from ESPN history...");
  try {
    inMemoryCache = await buildFullCache();
    saveCacheToDisk(inMemoryCache);
    const teamCount = Object.values(inMemoryCache.sports).reduce((s, m) => s + Object.keys(m || {}).length, 0);
    console.log(`[TeamFormEngine] Initial build complete: ${teamCount} teams`);
  } catch (e) {
    console.error("[TeamFormEngine] Initial build failed:", e);
  }
}

async function refreshFormCacheAsync(): Promise<void> {
  if (buildInProgress) return;
  buildInProgress = true;
  try {
    const fresh = await buildFullCache();
    inMemoryCache = fresh;
    saveCacheToDisk(fresh);
    const teamCount = Object.values(fresh.sports).reduce((s, m) => s + Object.keys(m || {}).length, 0);
    console.log(`[TeamFormEngine] Cache refreshed: ${teamCount} teams`);
  } catch (e) {
    console.error("[TeamFormEngine] Refresh failed:", e);
  } finally {
    buildInProgress = false;
  }
}

export function scheduleFormCacheRefresh(): void {
  const refreshIntervalMs = 20 * 60 * 60 * 1000;
  setInterval(() => {
    const age = inMemoryCache ? Date.now() - inMemoryCache.generatedAt : Infinity;
    if (age > CACHE_TTL_MS) {
      console.log("[TeamFormEngine] Scheduled refresh triggered");
      refreshFormCacheAsync();
    }
  }, 60 * 60 * 1000);
}

function findTeamInCache(sport: Sport, teamName: string): TeamFormData | null {
  const sportData = inMemoryCache?.sports[sport];
  if (!sportData) return null;

  const nameLower = teamName.toLowerCase();
  const nameParts = nameLower.split(" ");
  const lastWord = nameParts[nameParts.length - 1] || "";

  if (sportData[teamName]) return sportData[teamName];

  for (const [key, data] of Object.entries(sportData)) {
    const keyLower = key.toLowerCase();
    if (keyLower === nameLower) return data;
    if (keyLower.includes(lastWord) && lastWord.length > 3) return data;
    if (nameLower.includes(keyLower.split(" ").pop() || "") && (keyLower.split(" ").pop()?.length || 0) > 3) return data;
    if (data.abbreviation && data.abbreviation.toLowerCase() === nameLower) return data;
  }

  return null;
}

export function getTeamFormData(sport: Sport, teamName: string): TeamFormData | null {
  return findTeamInCache(sport, teamName);
}

export function getFormCacheStatus(): {
  loaded: boolean;
  generatedAt: number | null;
  teamCounts: Partial<Record<Sport, number>>;
  ageMins: number | null;
} {
  if (!inMemoryCache) {
    return { loaded: false, generatedAt: null, teamCounts: {}, ageMins: null };
  }
  const teamCounts: Partial<Record<Sport, number>> = {};
  for (const [sport, teams] of Object.entries(inMemoryCache.sports)) {
    teamCounts[sport as Sport] = Object.keys(teams || {}).length;
  }
  return {
    loaded: true,
    generatedAt: inMemoryCache.generatedAt,
    teamCounts,
    ageMins: Math.round((Date.now() - inMemoryCache.generatedAt) / 60000),
  };
}
