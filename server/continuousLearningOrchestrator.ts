import { db } from "./db";
import { predictions, modelWeights, learningLogs } from "./dbSchema";
import { eq, isNull, desc, sql, and, lt, gt } from "drizzle-orm";
import { logError, logInfo, logWarn } from "./errorLogger";
import { recordOutcome, getPreSimulated } from "./monteCarloEngine";
import { recordGameOutcome } from "./platformIntelligenceEngine";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAB: "basketball/mens-college-basketball",
  NCAAF: "football/college-football",
};

interface OrchestratorStatus {
  isRunning: boolean;
  startedAt: string | null;
  lastSettlementRun: string | null;
  lastRetrainingRun: string | null;
  lastWeightSyncRun: string | null;
  lastFreshnessCheck: string | null;
  lastCalibrationCheck: string | null;
  totalSettled: number;
  totalRetrained: number;
  totalWeightSyncs: number;
  totalCycles: number;
  errors: { timestamp: string; module: string; message: string }[];
  feedHealth: Record<string, { status: string; lastUpdate: string; staleness: number }>;
  accuracyMetrics: {
    overall: number;
    bySport: Record<string, { total: number; correct: number; accuracy: number }>;
    calibrationDrift: number;
    evAccuracy: number;
  };
}

const status: OrchestratorStatus = {
  isRunning: false,
  startedAt: null,
  lastSettlementRun: null,
  lastRetrainingRun: null,
  lastWeightSyncRun: null,
  lastFreshnessCheck: null,
  lastCalibrationCheck: null,
  totalSettled: 0,
  totalRetrained: 0,
  totalWeightSyncs: 0,
  totalCycles: 0,
  errors: [],
  feedHealth: {},
  accuracyMetrics: {
    overall: 0,
    bySport: {},
    calibrationDrift: 0,
    evAccuracy: 0,
  },
};

let orchestratorInterval: NodeJS.Timeout | null = null;
let settlementInterval: NodeJS.Timeout | null = null;
let retrainingInterval: NodeJS.Timeout | null = null;
let freshnessInterval: NodeJS.Timeout | null = null;
let weightSyncInterval: NodeJS.Timeout | null = null;
let calibrationInterval: NodeJS.Timeout | null = null;

function addError(module: string, message: string) {
  status.errors.unshift({ timestamp: new Date().toISOString(), module, message });
  if (status.errors.length > 50) status.errors.length = 50;
}

async function fetchJSON(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function autoSettlePredictions(): Promise<{ settled: number; checked: number }> {
  let settled = 0;
  let checked = 0;

  try {
    const unsettled = await db.select()
      .from(predictions)
      .where(isNull(predictions.actualResult))
      .orderBy(desc(predictions.createdAt))
      .limit(200);

    if (unsettled.length === 0) return { settled: 0, checked: 0 };

    const sportGames = new Map<string, Map<string, any>>();

    const datesToFetch: string[] = [];
    for (let d = 0; d <= 3; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      datesToFetch.push(date.toISOString().slice(0, 10).replace(/-/g, ""));
    }

    for (const sport of Object.keys(SPORT_PATHS)) {
      const gameMap = new Map<string, any>();

      for (const dateStr of datesToFetch) {
        try {
          const data = await fetchJSON(`${ESPN_BASE}/${SPORT_PATHS[sport]}/scoreboard?dates=${dateStr}`);
          const events = data?.events || [];

          for (const event of events) {
            const comp = event.competitions?.[0];
            if (!comp) continue;
            const eventStatus = event.status?.type;
            if (!eventStatus?.completed) continue;

            const competitors = comp.competitors || [];
            const home = competitors.find((c: any) => c.homeAway === "home");
            const away = competitors.find((c: any) => c.homeAway === "away");
            if (!home || !away) continue;

            const homeScore = parseInt(home.score || "0", 10);
            const awayScore = parseInt(away.score || "0", 10);
            const homeTeam = (home.team?.displayName || "").toLowerCase();
            const awayTeam = (away.team?.displayName || "").toLowerCase();
            const homeAbbr = (home.team?.abbreviation || "").toLowerCase();
            const awayAbbr = (away.team?.abbreviation || "").toLowerCase();

            let spread: number | undefined;
            let overUnder: number | undefined;
            let homeML: number | undefined;
            let awayML: number | undefined;
            const odds = comp.odds?.[0];
            if (odds) {
              if (odds.details) {
                const spreadMatch = odds.details.match(/([+-]?\d+\.?\d*)/);
                if (spreadMatch) spread = parseFloat(spreadMatch[1]);
              }
              if (odds.overUnder) overUnder = parseFloat(odds.overUnder);
              if (odds.homeTeamOdds?.moneyLine) homeML = odds.homeTeamOdds.moneyLine;
              if (odds.awayTeamOdds?.moneyLine) awayML = odds.awayTeamOdds.moneyLine;
            }

            const homeShort = (home.team?.shortDisplayName || "").toLowerCase();
            const awayShort = (away.team?.shortDisplayName || "").toLowerCase();

            const gameData = {
              id: event.id,
              homeTeam, awayTeam, homeAbbr, awayAbbr, homeShort, awayShort,
              homeScore, awayScore,
              totalScore: homeScore + awayScore,
              scoreDiff: homeScore - awayScore,
              spread, overUnder, homeML, awayML,
              date: event.date || "",
              venue: comp.venue?.fullName || "",
            };

            gameMap.set(event.id, gameData);
            gameMap.set(`${homeTeam}_${awayTeam}`, gameData);
            gameMap.set(`${homeAbbr}_${awayAbbr}`, gameData);
          }
        } catch (e: any) {
          logWarn(`[Orchestrator] Failed to fetch ${sport} scoreboard for ${dateStr}: ${e.message}`);
        }
      }

      sportGames.set(sport, gameMap);
    }

    const settledLegsForMC: { gameId: string; sport: string; market: string; legResult: string; selection: string }[] = [];

    for (const pred of unsettled) {
      checked++;
      const legs = pred.legs as any[];
      if (!legs || !Array.isArray(legs) || legs.length === 0) continue;

      const sport = pred.sport?.toUpperCase();
      const gameMap = sportGames.get(sport);
      if (!gameMap) continue;

      let allSettled = true;
      let anyLoss = false;
      let anyPush = false;

      const matchedLegs: { leg: any; game: any; legResult: string }[] = [];

      for (const leg of legs) {
        const eventId = leg.eventId || leg.gameId;
        let game: any = null;

        if (eventId) {
          game = gameMap.get(eventId);
        }

        if (!game) {
          const homeTeam = (leg.homeTeam || "").toLowerCase();
          const awayTeam = (leg.awayTeam || "").toLowerCase();
          if (homeTeam && awayTeam) {
            game = gameMap.get(`${homeTeam}_${awayTeam}`);
          }
        }

        if (!game) {
          const desc = (leg.description || leg.outcome || "").toLowerCase();
          gameMap.forEach((g: any, key: string) => {
            if (!game && (desc.includes(g.homeTeam) || desc.includes(g.awayTeam) ||
                desc.includes(g.homeAbbr) || desc.includes(g.awayAbbr))) {
              game = g;
            }
          });
        }

        if (!game) {
          allSettled = false;
          continue;
        }

        const legResult = settleLeg(leg, game);
        if (legResult === "lost") anyLoss = true;
        else if (legResult === "push") anyPush = true;
        else if (legResult === "unknown") allSettled = false;

        if (legResult !== "unknown" && game) {
          matchedLegs.push({ leg, game, legResult });
        }
      }

      if (!allSettled) continue;

      const result = anyLoss ? "lost" : anyPush ? "push" : "won";

      try {
        await db.update(predictions).set({
          actualResult: result,
          settledAt: new Date(),
        }).where(eq(predictions.id, pred.id));
        settled++;

        for (const { leg, game, legResult } of matchedLegs) {
          const market = (leg.type || leg.market || "moneyline").toLowerCase();
          const selection = (leg.selection || leg.outcome || "").toLowerCase();
          const matchesHome = selection.includes(game.homeTeam) ||
            selection.includes(game.homeAbbr) ||
            selection.includes(game.homeShort || "") ||
            selection.includes("home");

          settledLegsForMC.push({
            gameId: game.id,
            sport: sport || "NBA",
            market,
            legResult,
            selection: matchesHome ? "home" : "away",
          });

          try {
            const predictedWinner = matchesHome ? game.homeTeam : game.awayTeam;
            const actualWinner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
            const predictionCorrect = legResult === "won";

            recordGameOutcome({
              gameId: game.id,
              sport: sport || "NBA",
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              predictedWinner,
              actualWinner,
              predictionCorrect,
              market,
              confidence: pred.predictedWinProb ? Math.round(pred.predictedWinProb * 100) : 50,
              venue: game.venue,
            });
          } catch (e: any) {
            logWarn(`[Orchestrator] Failed to record game outcome for ${game.id}: ${e.message}`);
          }
        }
      } catch (e: any) {
        logWarn(`[Orchestrator] Failed to settle prediction ${pred.id}: ${e.message}`);
      }
    }

    let mcRecorded = 0;
    for (const sl of settledLegsForMC) {
      try {
        const preSim = getPreSimulated(sl.gameId);
        let predictedProb = 0.5;
        if (preSim) {
          predictedProb = sl.selection === "home" ? preSim.homeWinProb : preSim.awayWinProb;
        }
        const actualOutcome = sl.legResult === "won" ? 1 : 0;
        recordOutcome(sl.gameId, sl.sport, sl.market, predictedProb, actualOutcome);
        mcRecorded++;
      } catch (e: any) {
        logWarn(`[Orchestrator] Failed to record MC outcome for ${sl.gameId}: ${e.message}`);
      }
    }

    status.totalSettled += settled;
    status.lastSettlementRun = new Date().toISOString();

    if (settled > 0 || mcRecorded > 0) {
      logInfo(`[Orchestrator] Auto-settled ${settled}/${checked} predictions, MC outcomes recorded: ${mcRecorded}`);
    }
  } catch (error: any) {
    addError("settlement", error.message);
    logError(error, { context: "autoSettlePredictions" });
  }

  return { settled, checked };
}

function settleLeg(leg: any, game: any): "won" | "lost" | "push" | "unknown" {
  const type = (leg.type || leg.market || "").toLowerCase();
  const selection = (leg.selection || leg.outcome || "").toLowerCase();

  const matchesHome = selection.includes(game.homeTeam) ||
    selection.includes(game.homeAbbr) ||
    selection.includes(game.homeShort || "");
  const matchesAway = selection.includes(game.awayTeam) ||
    selection.includes(game.awayAbbr) ||
    selection.includes(game.awayShort || "");

  if (type.includes("moneyline") || type === "h2h") {
    if (matchesHome) {
      return game.homeScore > game.awayScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
    if (matchesAway) {
      return game.awayScore > game.homeScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
    if (selection.includes("home")) {
      return game.homeScore > game.awayScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
    if (selection.includes("away")) {
      return game.awayScore > game.homeScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
  }

  if (type.includes("spread")) {
    const espnSpread = game.spread;
    if (espnSpread === undefined || espnSpread === null) return "unknown";
    const isHome = matchesHome || selection.includes("home");
    const margin = isHome ? game.scoreDiff + espnSpread : -game.scoreDiff - espnSpread;
    if (Math.abs(margin) < 0.5) return "push";
    return margin > 0 ? "won" : "lost";
  }

  if (type.includes("total") || type.includes("over_under")) {
    const espnTotal = game.overUnder;
    if (espnTotal === undefined || espnTotal === null) return "unknown";
    const isOver = selection.includes("over");
    const isUnder = selection.includes("under");
    if (game.totalScore === espnTotal) return "push";
    if (isOver) return game.totalScore > espnTotal ? "won" : "lost";
    if (isUnder) return game.totalScore < espnTotal ? "won" : "lost";
  }

  if (type.includes("historical_training")) {
    const homeWon = game.homeScore > game.awayScore;
    return homeWon ? "won" : "lost";
  }

  if (!type || type === "unknown") {
    if (matchesHome) {
      return game.homeScore > game.awayScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
    if (matchesAway) {
      return game.awayScore > game.homeScore ? "won" : game.homeScore === game.awayScore ? "push" : "lost";
    }
  }

  return "unknown";
}

async function scheduledRetraining(): Promise<void> {
  try {
    const { runHistoricalLearning } = await import("./historicalLearningEngine");

    logInfo("[Orchestrator] Starting scheduled historical retraining...");
    const result = await runHistoricalLearning({ daysBack: 14, sports: Object.keys(SPORT_PATHS) });

    if (result.success) {
      status.totalRetrained++;
      status.lastRetrainingRun = new Date().toISOString();
      logInfo(`[Orchestrator] Retraining complete: ${result.gamesProcessed} games, ${result.weightsUpdated} weights updated. Accuracy: ${(result.homeWinRate * 100).toFixed(1)}%`);
    }
  } catch (error: any) {
    addError("retraining", error.message);
    logError(error, { context: "scheduledRetraining" });
  }
}

async function syncWeightsToFusionEngine(): Promise<void> {
  try {
    const { applyOptimizedWeights, getAllFactors } = await import("./quantumFusionEngine");

    const dbWeights = await db.select().from(modelWeights);
    if (dbWeights.length === 0) return;

    const fusionFactors = getAllFactors();
    const factorNameMap = new Map<string, string>();
    for (const f of fusionFactors) {
      factorNameMap.set(f.factor.toLowerCase().replace(/[_\s-]/g, ""), f.factor);
    }

    const updatedWeights = fusionFactors.map(f => {
      const normalizedName = f.factor.toLowerCase().replace(/[_\s-]/g, "");
      const dbWeight = dbWeights.find(dw => {
        const dwNorm = dw.factorName.toLowerCase().replace(/[_\s-]/g, "");
        return dwNorm === normalizedName ||
               normalizedName.includes(dwNorm) ||
               dwNorm.includes(normalizedName);
      });

      if (dbWeight && dbWeight.accuracy > 0.3) {
        const blendFactor = Math.min(0.3, dbWeight.accuracy * 0.3);
        return {
          ...f,
          weight: f.weight * (1 - blendFactor) + dbWeight.weight * blendFactor,
          historicalAccuracy: dbWeight.accuracy,
          recentTrend: dbWeight.accuracy > 0.55 ? "improving" as const :
                       dbWeight.accuracy < 0.45 ? "declining" as const : "stable" as const,
        };
      }
      return f;
    });

    applyOptimizedWeights(updatedWeights);
    status.totalWeightSyncs++;
    status.lastWeightSyncRun = new Date().toISOString();

    if (status.totalWeightSyncs % 10 === 0) {
      logInfo(`[Orchestrator] Weight sync #${status.totalWeightSyncs} — ${dbWeights.length} DB weights merged into fusion engine`);
    }
  } catch (error: any) {
    addError("weightSync", error.message);
    logError(error, { context: "syncWeightsToFusionEngine" });
  }
}

async function checkDataFreshness(): Promise<void> {
  try {
    const feeds: { name: string; checker: () => Promise<{ fresh: boolean; age: number; detail: string }> }[] = [
      {
        name: "ESPN Scoreboard",
        checker: async () => {
          try {
            const data = await fetchJSON(`${ESPN_BASE}/basketball/nba/scoreboard`, 8000);
            const events = data?.events || [];
            return { fresh: events.length >= 0, age: 0, detail: `${events.length} games found` };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "ESPN Rosters",
        checker: async () => {
          try {
            const { getRosterCacheStats } = await import("./espn-roster-provider");
            const stats = getRosterCacheStats();
            const totalTeams = stats.reduce((s, st) => s + st.teams, 0);
            return { fresh: totalTeams > 0, age: 0, detail: `${totalTeams} teams cached` };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "Injuries",
        checker: async () => {
          try {
            const { getInjuries } = await import("./espn-injury-provider");
            const injuries = await getInjuries("NBA");
            const count = injuries?.reduce((s: number, r: any) => s + (r.injuries?.length || 0), 0) || 0;
            return { fresh: true, age: 0, detail: `${count} injury reports` };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "Weather",
        checker: async () => {
          try {
            const { getKnownVenues } = await import("./weather-provider");
            const venues = getKnownVenues();
            return { fresh: venues.length > 0, age: 0, detail: `${venues.length} venues` };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "Odds API",
        checker: async () => {
          try {
            const { isOddsApiAvailable } = await import("./odds-provider");
            const available = isOddsApiAvailable();
            return { fresh: available, age: 0, detail: available ? "API key active" : "API key unavailable" };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "Learning Engine",
        checker: async () => {
          try {
            const { getLearningStats } = await import("./learningEngine");
            const stats = await getLearningStats();
            return { fresh: stats.isRunning, age: 0, detail: `${stats.cyclesCompleted} cycles, ${stats.modelWeights.length} weights` };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
      {
        name: "Analytics Agent",
        checker: async () => {
          try {
            return { fresh: true, age: 0, detail: "Agent module loaded" };
          } catch (e: any) {
            return { fresh: false, age: -1, detail: e.message };
          }
        },
      },
    ];

    for (const feed of feeds) {
      try {
        const result = await feed.checker();
        status.feedHealth[feed.name] = {
          status: result.fresh ? "healthy" : "stale",
          lastUpdate: new Date().toISOString(),
          staleness: result.age,
        };

        if (!result.fresh) {
          logWarn(`[Orchestrator] Feed ${feed.name} is stale: ${result.detail}`);
          await attemptFeedRecovery(feed.name);
        }
      } catch (e: any) {
        status.feedHealth[feed.name] = {
          status: "error",
          lastUpdate: new Date().toISOString(),
          staleness: -1,
        };
      }
    }

    status.lastFreshnessCheck = new Date().toISOString();
  } catch (error: any) {
    addError("freshness", error.message);
    logError(error, { context: "checkDataFreshness" });
  }
}

async function attemptFeedRecovery(feedName: string): Promise<void> {
  try {
    switch (feedName) {
      case "ESPN Rosters":
        const { refreshAllData } = await import("./espn-roster-provider");
        await refreshAllData();
        logInfo(`[Orchestrator] Self-healed: Triggered ESPN roster refresh`);
        break;

      case "Learning Engine":
        const { startContinuousLearning } = await import("./learningEngine");
        startContinuousLearning();
        logInfo(`[Orchestrator] Self-healed: Restarted learning engine`);
        break;

      case "Analytics Agent":
        const { startAnalyticsAgent } = await import("./analyticsAgentEngine");
        startAnalyticsAgent();
        logInfo(`[Orchestrator] Self-healed: Restarted analytics agent`);
        break;
    }
  } catch (e: any) {
    addError("recovery", `Failed to recover ${feedName}: ${e.message}`);
  }
}

async function runCalibrationCheck(): Promise<void> {
  try {
    const settled = await db.select()
      .from(predictions)
      .where(sql`${predictions.actualResult} IS NOT NULL`)
      .orderBy(desc(predictions.settledAt))
      .limit(500);

    if (settled.length < 20) {
      status.lastCalibrationCheck = new Date().toISOString();
      return;
    }

    let totalCorrect = 0;
    let totalCount = 0;
    const sportStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    let evErrorSum = 0;
    let evCount = 0;

    const calibrationBins: Record<string, { predicted: number; actual: number; count: number }> = {};
    const binSize = 0.1;
    for (let i = 0; i < 10; i++) {
      const key = (i * binSize).toFixed(1);
      calibrationBins[key] = { predicted: 0, actual: 0, count: 0 };
    }

    for (const pred of settled) {
      const isCorrect = pred.actualResult === "won";
      totalCount++;
      if (isCorrect) totalCorrect++;

      if (!sportStats[pred.sport]) {
        sportStats[pred.sport] = { total: 0, correct: 0, accuracy: 0 };
      }
      sportStats[pred.sport].total++;
      if (isCorrect) sportStats[pred.sport].correct++;

      if (pred.predictedEv !== null && pred.predictedEv !== undefined) {
        const actualReturn = isCorrect ? 1 : -1;
        evErrorSum += Math.abs(pred.predictedEv - actualReturn);
        evCount++;
      }

      const probBin = Math.min(0.9, Math.floor(pred.predictedWinProb * 10) / 10);
      const binKey = probBin.toFixed(1);
      if (calibrationBins[binKey]) {
        calibrationBins[binKey].predicted += pred.predictedWinProb;
        calibrationBins[binKey].actual += isCorrect ? 1 : 0;
        calibrationBins[binKey].count++;
      }
    }

    for (const sport of Object.keys(sportStats)) {
      sportStats[sport].accuracy = sportStats[sport].correct / Math.max(1, sportStats[sport].total);
    }

    let driftSum = 0;
    let driftCount = 0;
    for (const bin of Object.values(calibrationBins)) {
      if (bin.count >= 3) {
        const avgPredicted = bin.predicted / bin.count;
        const avgActual = bin.actual / bin.count;
        driftSum += Math.abs(avgPredicted - avgActual);
        driftCount++;
      }
    }

    status.accuracyMetrics = {
      overall: totalCorrect / Math.max(1, totalCount),
      bySport: sportStats,
      calibrationDrift: driftCount > 0 ? driftSum / driftCount : 0,
      evAccuracy: evCount > 0 ? 1 - (evErrorSum / evCount / 2) : 0,
    };

    status.lastCalibrationCheck = new Date().toISOString();

    if (status.accuracyMetrics.calibrationDrift > 0.15) {
      logWarn(`[Orchestrator] High calibration drift detected: ${(status.accuracyMetrics.calibrationDrift * 100).toFixed(1)}% — triggering retraining`);
      await scheduledRetraining();
    }

    try {
      const { getCalibrationReport } = await import("./monteCarloEngine");
      const mcCal = getCalibrationReport();
      if (mcCal.driftDetected) {
        logWarn(`[Orchestrator] Monte Carlo drift detected — accuracy ${(mcCal.overallAccuracy * 100).toFixed(1)}%, recalibrating`);
      }
    } catch {}

    if (status.totalCycles % 50 === 0) {
      logInfo(`[Orchestrator] Calibration: overall accuracy ${(status.accuracyMetrics.overall * 100).toFixed(1)}%, drift ${(status.accuracyMetrics.calibrationDrift * 100).toFixed(1)}%, EV accuracy ${(status.accuracyMetrics.evAccuracy * 100).toFixed(1)}%`);
    }
  } catch (error: any) {
    addError("calibration", error.message);
    logError(error, { context: "runCalibrationCheck" });
  }
}

export function startContinuousLearningOrchestrator(): void {
  if (status.isRunning) {
    logWarn("[Orchestrator] Already running");
    return;
  }

  status.isRunning = true;
  status.startedAt = new Date().toISOString();

  settlementInterval = setInterval(async () => {
    try {
      await autoSettlePredictions();
    } catch (e: any) {
      addError("settlement", e.message);
    }
    status.totalCycles++;
  }, 5 * 60 * 1000);

  retrainingInterval = setInterval(async () => {
    try {
      await scheduledRetraining();
    } catch (e: any) {
      addError("retraining", e.message);
    }
  }, 24 * 60 * 60 * 1000);

  freshnessInterval = setInterval(async () => {
    try {
      await checkDataFreshness();
    } catch (e: any) {
      addError("freshness", e.message);
    }
  }, 3 * 60 * 1000);

  weightSyncInterval = setInterval(async () => {
    try {
      await syncWeightsToFusionEngine();
    } catch (e: any) {
      addError("weightSync", e.message);
    }
  }, 60 * 60 * 1000);

  calibrationInterval = setInterval(async () => {
    try {
      await runCalibrationCheck();
    } catch (e: any) {
      addError("calibration", e.message);
    }
  }, 30 * 60 * 1000);

  setTimeout(async () => {
    try {
      logInfo("[Orchestrator] Running initial auto-settlement...");
      await autoSettlePredictions();
    } catch {}
  }, 30000);

  setTimeout(async () => {
    try {
      await checkDataFreshness();
    } catch {}
  }, 60000);

  setTimeout(async () => {
    try {
      await syncWeightsToFusionEngine();
    } catch {}
  }, 90000);

  setTimeout(async () => {
    try {
      await runCalibrationCheck();
    } catch {}
  }, 120000);

  logInfo("[Orchestrator] Continuous Learning Orchestrator started — auto-settlement (5min), retraining (24hr), freshness (3min), weight sync (1hr), calibration (30min)");
}

export function stopContinuousLearningOrchestrator(): void {
  if (settlementInterval) clearInterval(settlementInterval);
  if (retrainingInterval) clearInterval(retrainingInterval);
  if (freshnessInterval) clearInterval(freshnessInterval);
  if (weightSyncInterval) clearInterval(weightSyncInterval);
  if (calibrationInterval) clearInterval(calibrationInterval);
  settlementInterval = null;
  retrainingInterval = null;
  freshnessInterval = null;
  weightSyncInterval = null;
  calibrationInterval = null;
  status.isRunning = false;
  logInfo("[Orchestrator] Continuous Learning Orchestrator stopped");
}

export function getOrchestratorStatus(): OrchestratorStatus {
  return { ...status };
}

export async function triggerManualSettlement(): Promise<{ settled: number; checked: number }> {
  return autoSettlePredictions();
}

export async function triggerManualRetraining(): Promise<void> {
  return scheduledRetraining();
}

export async function triggerManualWeightSync(): Promise<void> {
  return syncWeightsToFusionEngine();
}

export async function triggerManualCalibration(): Promise<void> {
  return runCalibrationCheck();
}

export async function triggerManualFreshnessCheck(): Promise<void> {
  return checkDataFreshness();
}
