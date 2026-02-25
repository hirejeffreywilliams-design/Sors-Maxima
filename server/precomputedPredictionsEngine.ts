import crypto from "crypto";
import { getMultiDayScoreboard } from "./espn-scoreboard-provider";
import { generateVegasPredictions } from "./vegas-engine";
import { analyzeLeg } from "./quantumFusionEngine";
import type { Sport } from "@shared/schema";

export interface PrecomputedPick {
  id: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  factors: { name: string; impact: number; direction: string }[];
  generatedAt: string;
  dataSource: "live" | "cached";
  gameTime?: string;
}

export interface PrecomputedSnapshot {
  picks: PrecomputedPick[];
  generatedAt: string;
  dataSource: "live" | "cached";
  sport: string;
  gamesAnalyzed: number;
  nextRefresh: string;
}

interface CacheEntry {
  snapshot: PrecomputedSnapshot;
  timestamp: number;
  sport: string;
}

const predictionCache = new Map<string, CacheEntry>();
const lastSuccessfulData = new Map<string, any[]>();

const REFRESH_INTERVAL = 5 * 60 * 1000;
const STALE_THRESHOLD = 30 * 60 * 1000;

let engineRunning = false;
let lastRunTime: number | null = null;
let totalRuns = 0;
let failedRuns = 0;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function gradeFromConfidence(confidence: number): string {
  if (confidence >= 80) return "A";
  if (confidence >= 70) return "A-";
  if (confidence >= 65) return "B+";
  if (confidence >= 58) return "B";
  if (confidence >= 52) return "B-";
  if (confidence >= 45) return "C+";
  if (confidence >= 40) return "C";
  if (confidence >= 35) return "C-";
  return "D";
}

async function fetchLiveGames(sport: Sport): Promise<{ games: any[]; isLive: boolean }> {
  try {
    const games = await getMultiDayScoreboard(sport, 3);
    if (games && games.length > 0) {
      lastSuccessfulData.set(sport, games);
      return { games, isLive: true };
    }

    const cached = lastSuccessfulData.get(sport);
    if (cached && cached.length > 0) {
      console.log(`[PrecomputedEngine] No live ${sport} games, using last cached data (${cached.length} games)`);
      return { games: cached, isLive: false };
    }

    return { games: [], isLive: false };
  } catch (error) {
    console.error(`[PrecomputedEngine] Failed to fetch live ${sport} data:`, error);

    const cached = lastSuccessfulData.get(sport);
    if (cached && cached.length > 0) {
      console.log(`[PrecomputedEngine] Connection error for ${sport}, falling back to cached data (${cached.length} games)`);
      return { games: cached, isLive: false };
    }

    return { games: [], isLive: false };
  }
}

async function generatePredictionsForSport(sport: Sport): Promise<PrecomputedSnapshot> {
  const { games, isLive } = await fetchLiveGames(sport);
  const dataSource = isLive ? "live" : "cached";

  const upcomingGames = games.filter(g =>
    g.status?.state === "pre" || g.status?.state === "in"
  );

  if (upcomingGames.length === 0) {
    const cached = predictionCache.get(sport);
    if (cached) {
      return {
        ...cached.snapshot,
        dataSource: "cached",
        generatedAt: cached.snapshot.generatedAt,
        nextRefresh: new Date(Date.now() + REFRESH_INTERVAL).toISOString(),
      };
    }

    return {
      picks: [],
      generatedAt: new Date().toISOString(),
      dataSource,
      sport,
      gamesAnalyzed: 0,
      nextRefresh: new Date(Date.now() + REFRESH_INTERVAL).toISOString(),
    };
  }

  let vegasPicks: any[] = [];
  try {
    vegasPicks = await generateVegasPredictions(sport);
  } catch {
    console.log(`[PrecomputedEngine] Vegas predictions unavailable for ${sport}, using game analysis`);
  }

  const picks: PrecomputedPick[] = [];
  const now = new Date().toISOString();

  for (const game of upcomingGames.slice(0, 15)) {
    const homeName = game.homeTeam?.displayName || "Home";
    const awayName = game.awayTeam?.displayName || "Away";
    const homeRecord = game.homeTeam?.record || "";
    const awayRecord = game.awayTeam?.record || "";

    const parseWinPct = (record: string) => {
      if (!record) return 0.5;
      const parts = record.split("-");
      const wins = parseFloat(parts[0]);
      const losses = parseFloat(parts[1]);
      return (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
    };

    const homeWinPct = parseWinPct(homeRecord);
    const awayWinPct = parseWinPct(awayRecord);

    let mcSim: any = null;
    try {
      const { simulateMatchup, getPreSimulated } = await import("./monteCarloEngine");
      mcSim = getPreSimulated(game.id);
      if (!mcSim) {
        mcSim = simulateMatchup({
          gameId: game.id,
          sport,
          homeTeam: homeName,
          awayTeam: awayName,
          homeWinPct: homeWinPct * 100,
          awayWinPct: awayWinPct * 100,
          isHomeGame: true,
          gameState: game.status?.state === "in" ? "live" : "pre",
        });
      }
    } catch {}

    const spreadEstimate = mcSim
      ? Math.round((mcSim.predictedHomeScore - mcSim.predictedAwayScore) * 2) / 2
      : Math.round((homeWinPct - awayWinPct) * 15 * 2) / 2;
    const favoriteIsHome = mcSim ? mcSim.homeWinProb > 0.5 : homeWinPct > awayWinPct;
    const favName = favoriteIsHome ? homeName : awayName;

    const totalEstimate = mcSim
      ? Math.round((mcSim.predictedHomeScore + mcSim.predictedAwayScore) * 2) / 2
      : sport === "NBA" ? 220 + Math.round((homeWinPct + awayWinPct - 1) * 20) :
        sport === "NFL" ? 44 + Math.round((homeWinPct + awayWinPct - 1) * 10) :
        sport === "MLB" ? 8.5 : sport === "NHL" ? 6 :
        sport === "NCAAB" ? 145 + Math.round((homeWinPct + awayWinPct - 1) * 15) :
        sport === "NCAAF" ? 50 + Math.round((homeWinPct + awayWinPct - 1) * 12) : 220;

    const mlOdds = favoriteIsHome
      ? Math.round(-100 - (homeWinPct - 0.5) * 400)
      : Math.round(100 + (0.5 - homeWinPct) * 400);

    const betOptions = [
      { pick: `${favName} ML`, betType: "moneyline", odds: mlOdds, desc: `${favName} Moneyline` },
      { pick: `${homeName} ${spreadEstimate > 0 ? "-" : "+"}${Math.abs(spreadEstimate)}`, betType: "spread", odds: -110, desc: `${homeName} Spread` },
      { pick: `Over ${totalEstimate}`, betType: "total", odds: -110, desc: `Over ${totalEstimate}` },
      { pick: `Under ${totalEstimate}`, betType: "total", odds: -110, desc: `Under ${totalEstimate}` },
    ];

    for (const bet of betOptions) {
      const fusion = analyzeLeg(sport, bet.desc, bet.odds, { hasRealOdds: false });
      let confidence = Math.min(92, Math.max(30, fusion.confidence));

      if (mcSim) {
        let mcConfBoost = 0;
        if (bet.betType === "moneyline") {
          const winProb = favoriteIsHome ? mcSim.homeWinProb : mcSim.awayWinProb;
          mcConfBoost = Math.round((winProb - 0.5) * 20);
        } else if (bet.betType === "spread") {
          mcConfBoost = Math.round((mcSim.convergenceScore - 0.5) * 10);
        } else if (bet.betType === "total") {
          mcConfBoost = Math.round(mcSim.convergenceScore * 5);
        }
        confidence = Math.min(95, Math.max(25, confidence + mcConfBoost));
      }

      const impliedProb = bet.odds < 0 ? Math.abs(bet.odds) / (Math.abs(bet.odds) + 100) : 100 / (bet.odds + 100);
      const trueProb = confidence / 100;
      const ev = ((trueProb * (1 / impliedProb - 1)) - (1 - trueProb)) * 100;

      picks.push({
        id: `precomp-${sport}-${game.id}-${bet.betType}-${Date.now().toString(36)}`,
        sport,
        game: `${awayName} @ ${homeName}`,
        homeTeam: homeName,
        awayTeam: awayName,
        pick: bet.pick,
        betType: bet.betType,
        odds: bet.odds,
        confidence,
        grade: gradeFromConfidence(confidence),
        edge: Math.round(ev * 10) / 10,
        ev: Math.round(ev * 100) / 100,
        factors: (fusion.signals || []).slice(0, 5).map(s => ({ name: s.source, impact: s.strength, direction: s.direction || "neutral" })),
        generatedAt: now,
        dataSource,
        gameTime: game.date,
      });
    }
  }

  for (const vp of vegasPicks) {
    const fusion = analyzeLeg(sport, vp.description || vp.game, vp.odds || -110, { hasRealOdds: !!vp.hasRealOdds });
    const confidence = Math.min(92, Math.max(30, fusion.confidence));
    const impliedProb = (vp.odds || -110) < 0 ? Math.abs(vp.odds || -110) / (Math.abs(vp.odds || -110) + 100) : 100 / ((vp.odds || -110) + 100);
    const trueProb = confidence / 100;
    const ev = ((trueProb * (1 / impliedProb - 1)) - (1 - trueProb)) * 100;

    picks.push({
      id: `precomp-vegas-${sport}-${crypto.randomUUID().slice(0, 12)}`,
      sport,
      game: vp.game || "Unknown",
      homeTeam: vp.homeTeam || "",
      awayTeam: vp.awayTeam || "",
      pick: vp.pick || vp.description || "",
      betType: vp.betType || "moneyline",
      odds: vp.odds || -110,
      confidence,
      grade: gradeFromConfidence(confidence),
      edge: Math.round(ev * 10) / 10,
      ev: Math.round(ev * 100) / 100,
      factors: (fusion.signals || []).slice(0, 5).map(s => ({ name: s.source, impact: s.strength, direction: s.direction || "neutral" })),
      generatedAt: now,
      dataSource,
      gameTime: vp.gameTime,
    });
  }

  picks.sort((a, b) => b.confidence - a.confidence);
  const dedupedPicks = picks.reduce((acc: PrecomputedPick[], pick) => {
    const key = `${pick.game}-${pick.pick}`;
    if (!acc.find(p => `${p.game}-${p.pick}` === key)) acc.push(pick);
    return acc;
  }, []);

  const snapshot: PrecomputedSnapshot = {
    picks: dedupedPicks.slice(0, 50),
    generatedAt: now,
    dataSource,
    sport,
    gamesAnalyzed: upcomingGames.length,
    nextRefresh: new Date(Date.now() + REFRESH_INTERVAL).toISOString(),
  };

  predictionCache.set(sport, { snapshot, timestamp: Date.now(), sport });
  return snapshot;
}

async function runPredictionCycle(): Promise<void> {
  const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
  totalRuns++;

  console.log(`[PrecomputedEngine] Starting prediction cycle #${totalRuns}...`);

  for (const sport of sports) {
    try {
      await generatePredictionsForSport(sport);
      console.log(`[PrecomputedEngine] ${sport} predictions generated successfully`);
    } catch (error) {
      failedRuns++;
      console.error(`[PrecomputedEngine] Failed to generate ${sport} predictions:`, error);
    }
  }

  lastRunTime = Date.now();
  console.log(`[PrecomputedEngine] Prediction cycle #${totalRuns} complete`);
}

export function startPrecomputedEngine(): void {
  if (engineRunning) return;
  engineRunning = true;

  console.log(`[PrecomputedEngine] Starting precomputed predictions engine (${REFRESH_INTERVAL / 1000}s interval)`);

  setTimeout(() => runPredictionCycle(), 5000);

  intervalHandle = setInterval(() => runPredictionCycle(), REFRESH_INTERVAL);
}

export function stopPrecomputedEngine(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  engineRunning = false;
  console.log("[PrecomputedEngine] Engine stopped");
}

export async function getPrecomputedPredictions(sport: Sport): Promise<PrecomputedSnapshot> {
  const cached = predictionCache.get(sport);

  if (cached && (Date.now() - cached.timestamp) < STALE_THRESHOLD) {
    return cached.snapshot;
  }

  return generatePredictionsForSport(sport);
}

export function getPrecomputedCache(sport: Sport): PrecomputedSnapshot | null {
  const cached = predictionCache.get(sport);
  return cached?.snapshot || null;
}

export function getEngineStatus() {
  const cacheStatus: Record<string, { hasPicks: boolean; pickCount: number; dataSource: string; age: string; generatedAt: string }> = {};
  const entries = Array.from(predictionCache.entries());
  for (const [sport, entry] of entries) {
    const ageMs = Date.now() - entry.timestamp;
    const ageMinutes = Math.floor(ageMs / 60000);
    cacheStatus[sport] = {
      hasPicks: entry.snapshot.picks.length > 0,
      pickCount: entry.snapshot.picks.length,
      dataSource: entry.snapshot.dataSource,
      age: ageMinutes < 1 ? "< 1m" : `${ageMinutes}m`,
      generatedAt: entry.snapshot.generatedAt,
    };
  }

  return {
    running: engineRunning,
    lastRunTime: lastRunTime ? new Date(lastRunTime).toISOString() : null,
    totalRuns,
    failedRuns,
    refreshIntervalMs: REFRESH_INTERVAL,
    cacheStatus,
  };
}
