/**
 * Two-Way Contract Intelligence Engine
 *
 * Detects players on two-way NBA contracts who split time between the NBA roster
 * and the G-League. These players create roster uncertainty that standard odds
 * models often underweight — a two-way player called up or sent down changes
 * rotations, depth, and scoring distribution.
 *
 * Data flow:
 *  1. ESPN Roster API → identifies two-way contract players per team
 *  2. BallDontLie player data → confirms two_way_player boolean (if available)
 *  3. Role/minutes inference → estimates how much each two-way player matters
 *  4. Outputs a RosterDepthAnalysis for use in the predictions engine
 */

import { logInfo, logWarn, logError } from "./errorLogger";

const ESPN_ROSTER_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const BDL_BASE = "https://api.balldontlie.io/v1";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — two-way status rarely changes intra-day

interface TwoWayPlayer {
  id: string;
  name: string;
  position: string;
  jerseyNumber: string;
  isCurrentlyActive: boolean; // with NBA team (not in G-League)
  gamesPlayedNBA: number; // estimated from stats (cap is ~45 two-way days)
  minutesPerGame: number;
  impactScore: number; // 0–10, higher = more influence on rotation
  confirmationSource: "espn" | "bdl" | "inferred";
}

export interface RosterDepthAnalysis {
  teamId: string;
  teamName: string;
  twoWayPlayers: TwoWayPlayer[];
  twoWayCount: number;
  activeTwoWayCount: number; // currently with NBA team
  rosterStabilityScore: number; // 0–100, higher = more stable (fewer active two-ways)
  riskLevel: "none" | "low" | "moderate" | "high";
  riskExplanation: string;
  analysisSource: string;
}

interface CacheEntry {
  data: RosterDepthAnalysis;
  ts: number;
}

const rosterCache = new Map<string, CacheEntry>();

function getCached(key: string): RosterDepthAnalysis | null {
  const entry = rosterCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCache(key: string, data: RosterDepthAnalysis) {
  rosterCache.set(key, { data, ts: Date.now() });
}

async function fetchESPNRoster(espnTeamId: string): Promise<any[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `${ESPN_ROSTER_BASE}/${espnTeamId}/roster`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.athletes || null;
  } catch {
    return null;
  }
}

async function fetchBDLTeamRoster(teamName: string): Promise<any[] | null> {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = new URL(`${BDL_BASE}/players`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("two_way_player", "true");
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    const players: any[] = json.data || [];
    return players.filter((p: any) => {
      const t = p.team?.full_name || p.team?.name || "";
      return teamName && (t.toLowerCase().includes(teamName.toLowerCase().split(" ").pop() || "") || teamName.toLowerCase().includes(t.toLowerCase().split(" ").pop() || ""));
    });
  } catch {
    return null;
  }
}

function identifyTwoWayFromESPN(athletes: any[]): TwoWayPlayer[] {
  const twoWayPlayers: TwoWayPlayer[] = [];

  for (const athlete of athletes) {
    const contracts: any[] = athlete.contracts || [];
    const isTwoWay =
      contracts.some((c: any) => {
        const type = (c.type?.text || c.type?.name || c.contractType || "").toLowerCase();
        return type.includes("two-way") || type.includes("two way") || type === "tw";
      }) ||
      (athlete.experience?.years !== undefined && athlete.experience.years <= 1 && athlete.salary !== undefined && athlete.salary < 600000) ||
      (athlete.contractType || "").toLowerCase().includes("two") ||
      (athlete.status?.name || "").toLowerCase().includes("two-way");

    if (!isTwoWay) continue;

    const statsSummary = athlete.statsSummary || {};
    const minutesPerGame = parseFloat(statsSummary.minutesPerGame || statsSummary.avgMinutes || "0") || 0;
    const gamesPlayed = parseInt(statsSummary.gamesPlayed || "0") || 0;

    const impactScore = Math.min(10, (minutesPerGame / 30) * 10);

    twoWayPlayers.push({
      id: athlete.id || "",
      name: athlete.displayName || athlete.fullName || "",
      position: athlete.position?.abbreviation || athlete.position?.name || "G",
      jerseyNumber: athlete.jersey || "",
      isCurrentlyActive: (athlete.status?.name || "").toLowerCase() !== "out" && (athlete.status?.name || "").toLowerCase() !== "inactive",
      gamesPlayedNBA: gamesPlayed,
      minutesPerGame,
      impactScore,
      confirmationSource: "espn",
    });
  }

  return twoWayPlayers;
}

function inferTwoWayFromDepth(athletes: any[]): TwoWayPlayer[] {
  if (!athletes.length) return [];
  const inferred: TwoWayPlayer[] = [];
  const totalPlayers = athletes.length;

  athletes.forEach((athlete, index) => {
    const rosterPosition = index + 1;
    const isEndOfBench = rosterPosition > 13;
    if (!isEndOfBench) return;

    const statsSummary = athlete.statsSummary || {};
    const gamesPlayed = parseInt(statsSummary.gamesPlayed || "0") || 0;
    const minutesPerGame = parseFloat(statsSummary.minutesPerGame || "0") || 0;
    const isLimitedAvailability = gamesPlayed > 0 && gamesPlayed < 30 && minutesPerGame < 15;

    if (!isLimitedAvailability) return;

    inferred.push({
      id: athlete.id || "",
      name: athlete.displayName || "",
      position: athlete.position?.abbreviation || "G",
      jerseyNumber: athlete.jersey || "",
      isCurrentlyActive: true,
      gamesPlayedNBA: gamesPlayed,
      minutesPerGame,
      impactScore: Math.min(5, (minutesPerGame / 30) * 10),
      confirmationSource: "inferred",
    });
  });

  return inferred;
}

function buildAnalysis(
  teamId: string,
  teamName: string,
  twoWayPlayers: TwoWayPlayer[],
  source: string
): RosterDepthAnalysis {
  const activeTwoWayCount = twoWayPlayers.filter(p => p.isCurrentlyActive).length;
  const totalImpact = twoWayPlayers.reduce((sum, p) => sum + (p.isCurrentlyActive ? p.impactScore : 0), 0);

  let riskLevel: "none" | "low" | "moderate" | "high" = "none";
  let riskExplanation = "";

  if (activeTwoWayCount === 0) {
    riskLevel = "none";
    riskExplanation = "Full roster stability — no two-way contract players in active rotation";
  } else if (activeTwoWayCount === 1 && totalImpact < 4) {
    riskLevel = "low";
    const p = twoWayPlayers.find(pl => pl.isCurrentlyActive);
    riskExplanation = `${p?.name || "A two-way player"} is on a two-way contract — low rotation impact`;
  } else if (activeTwoWayCount <= 2 && totalImpact < 8) {
    riskLevel = "moderate";
    const names = twoWayPlayers.filter(p => p.isCurrentlyActive).map(p => p.name).join(", ");
    riskExplanation = `${names} on two-way contracts — rotation uncertainty present`;
  } else {
    riskLevel = "high";
    const names = twoWayPlayers.filter(p => p.isCurrentlyActive).map(p => p.name).join(", ");
    riskExplanation = `Multiple two-way contract players in rotation (${names}) — significant roster depth risk`;
  }

  const stabilityScore = Math.max(0, 100 - (activeTwoWayCount * 15) - (totalImpact * 2));

  return {
    teamId,
    teamName,
    twoWayPlayers,
    twoWayCount: twoWayPlayers.length,
    activeTwoWayCount,
    rosterStabilityScore: Math.round(stabilityScore),
    riskLevel,
    riskExplanation,
    analysisSource: source,
  };
}

export async function analyzeTwoWayContracts(
  espnTeamId: string,
  teamName: string
): Promise<RosterDepthAnalysis> {
  const cacheKey = `two_way_${espnTeamId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let twoWayPlayers: TwoWayPlayer[] = [];
  let source = "no-data";

  // Step 1: Try ESPN roster API
  const athletes = await fetchESPNRoster(espnTeamId);
  if (athletes && athletes.length > 0) {
    const espnDetected = identifyTwoWayFromESPN(athletes);
    if (espnDetected.length > 0) {
      twoWayPlayers = espnDetected;
      source = "espn-roster";
      logInfo(`[TwoWay] ${teamName}: ${espnDetected.length} two-way player(s) detected via ESPN roster`);
    } else {
      // Try depth-based inference from bench players
      const inferred = inferTwoWayFromDepth(athletes);
      if (inferred.length > 0) {
        twoWayPlayers = inferred;
        source = "espn-inferred";
        logInfo(`[TwoWay] ${teamName}: ${inferred.length} potential two-way player(s) inferred from roster depth`);
      } else {
        source = "espn-clean";
      }
    }
  }

  // Step 2: Cross-reference with BDL two_way_player flag
  try {
    const bdlRoster = await fetchBDLTeamRoster(teamName);
    if (bdlRoster && bdlRoster.length > 0) {
      const bdlNames = new Set(bdlRoster.map((p: any) => (p.first_name + " " + p.last_name).toLowerCase()));
      if (twoWayPlayers.length === 0) {
        twoWayPlayers = bdlRoster.map((p: any) => ({
          id: String(p.id),
          name: `${p.first_name} ${p.last_name}`,
          position: p.position || "G",
          jerseyNumber: "",
          isCurrentlyActive: true,
          gamesPlayedNBA: 0,
          minutesPerGame: 0,
          impactScore: 3,
          confirmationSource: "bdl" as const,
        }));
        source = "bdl";
      } else {
        twoWayPlayers = twoWayPlayers.map(p => ({
          ...p,
          confirmationSource: bdlNames.has(p.name.toLowerCase()) ? "bdl" : p.confirmationSource,
        }));
        source = source + "+bdl";
      }
    }
  } catch {}

  const analysis = buildAnalysis(espnTeamId, teamName, twoWayPlayers, source);
  setCache(cacheKey, analysis);
  return analysis;
}

export interface TwoWayMatchupImpact {
  homeAnalysis: RosterDepthAnalysis;
  awayAnalysis: RosterDepthAnalysis;
  hasMeaningfulImpact: boolean;
  factorName: string;
  factorImpact: number;
  factorDirection: "positive" | "negative" | "neutral";
  factorExplanation: string;
  confidenceAdjustment: number; // negative = reduce confidence, 0 = no change
}

export async function getTwoWayMatchupImpact(
  homeTeamId: string,
  homeTeamName: string,
  awayTeamId: string,
  awayTeamName: string
): Promise<TwoWayMatchupImpact | null> {
  try {
    const [homeAnalysis, awayAnalysis] = await Promise.all([
      analyzeTwoWayContracts(homeTeamId, homeTeamName),
      analyzeTwoWayContracts(awayTeamId, awayTeamName),
    ]);

    const homeRisk = homeAnalysis.riskLevel;
    const awayRisk = awayAnalysis.riskLevel;

    const homeRiskScore = { none: 0, low: 1, moderate: 2, high: 3 }[homeRisk];
    const awayRiskScore = { none: 0, low: 1, moderate: 2, high: 3 }[awayRisk];
    const riskDiff = awayRiskScore - homeRiskScore; // positive = away team has more risk

    const hasMeaningfulImpact = homeRiskScore >= 2 || awayRiskScore >= 2;

    if (!hasMeaningfulImpact) {
      return {
        homeAnalysis,
        awayAnalysis,
        hasMeaningfulImpact: false,
        factorName: "Roster Depth",
        factorImpact: 0,
        factorDirection: "neutral",
        factorExplanation: "Both teams have stable rosters with no significant two-way contract risk",
        confidenceAdjustment: 0,
      };
    }

    let factorDirection: "positive" | "negative" | "neutral" = "neutral";
    let factorImpact = 0;
    let factorExplanation = "";
    let confidenceAdjustment = 0;

    if (homeRisk === "high" && awayRisk === "none") {
      factorDirection = "negative";
      factorImpact = 8;
      factorExplanation = `${homeTeamName} has ${homeAnalysis.activeTwoWayCount} two-way contract players in rotation — rotation instability disadvantages the home team`;
      confidenceAdjustment = -3;
    } else if (awayRisk === "high" && homeRisk === "none") {
      factorDirection = "positive";
      factorImpact = 8;
      factorExplanation = `${awayTeamName} is carrying ${awayAnalysis.activeTwoWayCount} two-way contract players — unpredictable rotation gives ${homeTeamName} roster edge`;
      confidenceAdjustment = -2;
    } else if (homeRisk === "high" && awayRisk === "high") {
      factorDirection = "neutral";
      factorImpact = 5;
      factorExplanation = `Both teams relying on two-way contract players — mutual roster uncertainty reduces predictability`;
      confidenceAdjustment = -4;
    } else if (homeRisk === "moderate" || awayRisk === "moderate") {
      const riskTeam = homeRisk === "moderate" ? homeTeamName : awayTeamName;
      const analysis = homeRisk === "moderate" ? homeAnalysis : awayAnalysis;
      factorDirection = homeRisk === "moderate" ? "negative" : "positive";
      factorImpact = 4;
      factorExplanation = `${riskTeam} has two-way contract players in rotation — ${analysis.riskExplanation}`;
      confidenceAdjustment = -2;
    } else {
      factorDirection = "neutral";
      factorImpact = 2;
      factorExplanation = "Minor two-way roster considerations noted for both teams";
      confidenceAdjustment = -1;
    }

    return {
      homeAnalysis,
      awayAnalysis,
      hasMeaningfulImpact,
      factorName: "Two-Way Roster Risk",
      factorImpact,
      factorDirection,
      factorExplanation,
      confidenceAdjustment,
    };
  } catch (err: any) {
    logError(err, { context: "getTwoWayMatchupImpact", homeTeamName, awayTeamName });
    return null;
  }
}

export function clearTwoWayCache() {
  rosterCache.clear();
}
