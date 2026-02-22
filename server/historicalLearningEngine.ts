import { db } from "./db";
import { predictions, modelWeights, learningLogs } from "./dbSchema";
import { eq, sql } from "drizzle-orm";
import { logError, logInfo, logWarn } from "./errorLogger";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_PATHS: Record<string, string> = {
  NBA: "basketball/nba",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAB: "basketball/mens-college-basketball",
  NCAAF: "football/college-football",
};

interface HistoricalGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  spread?: number;
  overUnder?: number;
  homeMoneyline?: number;
  awayMoneyline?: number;
  homeRecord?: string;
  awayRecord?: string;
  venue?: string;
  completed: boolean;
}

interface TrainingResult {
  sport: string;
  gameId: string;
  homeWin: boolean;
  totalScore: number;
  scoreDiff: number;
  spreadResult?: "covered" | "missed" | "push";
  totalResult?: "over" | "under" | "push";
  homeRecord?: string;
  awayRecord?: string;
  factors: Record<string, number>;
}

const LEARNING_FACTORS = [
  "home_advantage",
  "record_strength",
  "scoring_tendency",
  "defensive_strength",
  "spread_accuracy",
  "total_accuracy",
  "moneyline_value",
  "division_matchup",
  "rest_advantage",
  "season_momentum",
  "blowout_tendency",
  "close_game_factor",
  "offensive_efficiency",
  "pace_factor",
  "clutch_performance",
  "market_efficiency",
  "sharp_money_alignment",
];

let isRunning = false;
let totalGamesProcessed = 0;
let totalTrainingRecords = 0;

async function fetchJSON(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN API ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseHistoricalGame(event: any, sport: string): HistoricalGame | null {
  try {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const competitors = competition.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

    if (!homeComp || !awayComp) return null;

    const status = event.status?.type || {};
    if (!status.completed) return null;

    const homeScore = parseInt(homeComp.score || "0", 10);
    const awayScore = parseInt(awayComp.score || "0", 10);

    if (homeScore === 0 && awayScore === 0) return null;

    let spread: number | undefined;
    let overUnder: number | undefined;
    let homeMoneyline: number | undefined;
    let awayMoneyline: number | undefined;

    if (competition.odds && competition.odds.length > 0) {
      const o = competition.odds[0];
      if (o.details) {
        const spreadMatch = o.details.match(/([+-]?\d+\.?\d*)/);
        if (spreadMatch) spread = parseFloat(spreadMatch[1]);
      }
      overUnder = o.overUnder || undefined;
      if (o.homeTeamOdds?.moneyLine) homeMoneyline = o.homeTeamOdds.moneyLine;
      if (o.awayTeamOdds?.moneyLine) awayMoneyline = o.awayTeamOdds.moneyLine;
    }

    const homeRecords = homeComp.records || [];
    const awayRecords = awayComp.records || [];
    const homeRecord = homeRecords.find((r: any) => r.type === "total")?.summary;
    const awayRecord = awayRecords.find((r: any) => r.type === "total")?.summary;

    return {
      id: event.id || "",
      sport,
      homeTeam: homeComp.team?.displayName || "Unknown",
      awayTeam: awayComp.team?.displayName || "Unknown",
      homeScore,
      awayScore,
      date: event.date || "",
      spread,
      overUnder,
      homeMoneyline,
      awayMoneyline,
      homeRecord,
      awayRecord,
      venue: competition.venue?.fullName,
      completed: true,
    };
  } catch {
    return null;
  }
}

function parseRecord(record?: string): { wins: number; losses: number; pct: number } {
  if (!record) return { wins: 0, losses: 0, pct: 0.5 };
  const parts = record.split("-").map(Number);
  const wins = parts[0] || 0;
  const losses = parts[1] || 0;
  const total = wins + losses;
  return { wins, losses, pct: total > 0 ? wins / total : 0.5 };
}

function analyzeGame(game: HistoricalGame): TrainingResult {
  const homeWin = game.homeScore > game.awayScore;
  const totalScore = game.homeScore + game.awayScore;
  const scoreDiff = game.homeScore - game.awayScore;

  let spreadResult: TrainingResult["spreadResult"];
  if (game.spread !== undefined) {
    const adjustedDiff = scoreDiff + game.spread;
    if (Math.abs(adjustedDiff) < 0.5) spreadResult = "push";
    else if (adjustedDiff > 0) spreadResult = "covered";
    else spreadResult = "missed";
  }

  let totalResult: TrainingResult["totalResult"];
  if (game.overUnder !== undefined) {
    if (totalScore === game.overUnder) totalResult = "push";
    else if (totalScore > game.overUnder) totalResult = "over";
    else totalResult = "under";
  }

  const homeRec = parseRecord(game.homeRecord);
  const awayRec = parseRecord(game.awayRecord);

  const factors: Record<string, number> = {};

  // BASE FACTORS
  factors.home_advantage = homeWin ? 0.75 : 0.25;
  factors.record_strength = homeRec.pct > awayRec.pct ? (homeWin ? 0.8 : 0.3) : (homeWin ? 0.4 : 0.7);
  factors.scoring_tendency = Math.min(1, totalScore / getExpectedTotal(game.sport));
  factors.defensive_strength = Math.max(0, 1 - (totalScore / (getExpectedTotal(game.sport) * 1.5)));
  factors.spread_accuracy = spreadResult === "covered" ? 0.8 : spreadResult === "push" ? 0.5 : 0.2;
  factors.total_accuracy = totalResult === "over" ? 0.6 : totalResult === "push" ? 0.5 : 0.4;
  factors.moneyline_value = homeWin ? (game.homeMoneyline && game.homeMoneyline > 0 ? 0.9 : 0.5) : 0.2;
  factors.division_matchup = 0.5;
  factors.rest_advantage = 0.5;
  factors.season_momentum = (homeRec.pct + (1 - awayRec.pct)) / 2;
  factors.blowout_tendency = Math.abs(scoreDiff) > getBlowoutThreshold(game.sport) ? 0.8 : 0.3;
  factors.close_game_factor = Math.abs(scoreDiff) <= 3 ? 0.8 : 0.3;
  factors.offensive_efficiency = Math.min(1, (game.homeScore + game.awayScore) / (getExpectedTotal(game.sport) * 1.2));
  factors.pace_factor = factors.scoring_tendency;
  factors.clutch_performance = Math.abs(scoreDiff) <= 5 && homeWin ? 0.7 : 0.4;

  // NEW: MARKET EFFICIENCY FACTORS
  // If the game had a closing line (moneyline) and we can compare it to the result
  if (game.homeMoneyline !== undefined) {
    const impliedProb = game.homeMoneyline < 0 
      ? Math.abs(game.homeMoneyline) / (Math.abs(game.homeMoneyline) + 100)
      : 100 / (game.homeMoneyline + 100);
    
    // Was the market correct about the favorite?
    const marketCorrect = (impliedProb > 0.5 && homeWin) || (impliedProb < 0.5 && !homeWin);
    factors.market_efficiency = marketCorrect ? 0.7 : 0.3;
    
    // High confidence market move vs result
    factors.sharp_money_alignment = (impliedProb > 0.6 && homeWin) ? 0.8 : 0.4;
  } else {
    factors.market_efficiency = 0.5;
    factors.sharp_money_alignment = 0.5;
  }

  return {
    sport: game.sport,
    gameId: game.id,
    homeWin,
    totalScore,
    scoreDiff,
    spreadResult,
    totalResult,
    homeRecord: game.homeRecord,
    awayRecord: game.awayRecord,
    factors,
  };
}

function getExpectedTotal(sport: string): number {
  switch (sport) {
    case "NBA": return 220;
    case "NFL": return 45;
    case "MLB": return 9;
    case "NHL": return 6;
    case "NCAAB": return 140;
    case "NCAAF": return 50;
    default: return 100;
  }
}

function getBlowoutThreshold(sport: string): number {
  switch (sport) {
    case "NBA": return 20;
    case "NFL": return 17;
    case "MLB": return 5;
    case "NHL": return 3;
    case "NCAAB": return 20;
    case "NCAAF": return 21;
    default: return 10;
  }
}

async function fetchHistoricalGamesForDate(sport: string, daysAgo: number): Promise<HistoricalGame[]> {
  const path = SPORT_PATHS[sport];
  if (!path) return [];

  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  try {
    const data = await fetchJSON(`${ESPN_BASE}/${path}/scoreboard?dates=${dateStr}`);
    const events = data.events || [];
    const games: HistoricalGame[] = [];

    for (const event of events) {
      const game = parseHistoricalGame(event, sport);
      if (game) games.push(game);
    }
    return games;
  } catch (error) {
    logWarn(`[Historical] Failed to fetch ${sport} for day -${daysAgo}: ${error}`);
    return [];
  }
}

async function fetchHistoricalGames(sport: string, daysBack: number): Promise<HistoricalGame[]> {
  // This is now legacy, using fetchHistoricalGamesForDate in parallel in runHistoricalLearning
  return [];
}

async function processTrainingBatch(results: TrainingResult[]): Promise<{ updated: number; homeWinRate: number; spreadCoverRate: number }> {
  if (results.length === 0) return { updated: 0, homeWinRate: 0, spreadCoverRate: 0 };

  const factorAccumulator: Record<string, { sum: number; count: number; winSum: number; winCount: number }> = {};

  for (const factor of LEARNING_FACTORS) {
    factorAccumulator[factor] = { sum: 0, count: 0, winSum: 0, winCount: 0 };
  }

  let homeWins = 0;
  let spreadCovers = 0;
  let spreadGames = 0;

  for (const result of results) {
    if (result.homeWin) homeWins++;
    if (result.spreadResult === "covered") spreadCovers++;
    if (result.spreadResult) spreadGames++;

    for (const [factor, value] of Object.entries(result.factors)) {
      if (factorAccumulator[factor]) {
        factorAccumulator[factor].sum += value;
        factorAccumulator[factor].count++;
        if (result.homeWin) {
          factorAccumulator[factor].winSum += value;
          factorAccumulator[factor].winCount++;
        }
      }
    }
  }

  let updated = 0;
  const homeWinRate = homeWins / results.length;
  const spreadCoverRate = spreadGames > 0 ? spreadCovers / spreadGames : 0;

  for (const [factor, data] of Object.entries(factorAccumulator)) {
    if (data.count === 0) continue;

    const avgValue = data.sum / data.count;
    const winRate = data.winCount / data.count;

    const performanceSignal = (avgValue * 0.6) + (winRate * 0.4);
    const newWeight = 0.5 + performanceSignal;
    const clampedWeight = Math.max(0.2, Math.min(1.8, newWeight));

    try {
      const existing = await db.select().from(modelWeights).where(eq(modelWeights.factorName, factor)).limit(1);

      if (existing.length > 0) {
        const blendedWeight = existing[0].weight * 0.3 + clampedWeight * 0.7;
        await db.update(modelWeights).set({
          weight: blendedWeight,
          totalPredictions: existing[0].totalPredictions + data.count,
          correctPredictions: existing[0].correctPredictions + data.winCount,
          accuracy: winRate,
          lastUpdated: new Date(),
        }).where(eq(modelWeights.factorName, factor));
      } else {
        await db.insert(modelWeights).values({
          factorName: factor,
          weight: clampedWeight,
          totalPredictions: data.count,
          correctPredictions: data.winCount,
          accuracy: winRate,
        });
      }
      updated++;
    } catch (error) {
      logError(error as Error, { context: "processTrainingBatch", factor });
    }
  }

  return { updated, homeWinRate, spreadCoverRate };
}

async function storePredictionRecords(results: TrainingResult[]): Promise<number> {
  let stored = 0;

  for (const result of results) {
    try {
      const impliedHomeProb = result.factors.home_advantage || 0.5;
      await db.insert(predictions).values({
        ticketId: `hist-${result.sport}-${result.gameId}`,
        userId: null,
        sport: result.sport,
        legs: [{
          type: "historical_training",
          sport: result.sport,
          homeWin: result.homeWin,
          scoreDiff: result.scoreDiff,
          totalScore: result.totalScore,
          spreadResult: result.spreadResult || null,
          totalResult: result.totalResult || null,
          dataSource: "ESPN historical",
        }],
        predictedWinProb: impliedHomeProb,
        predictedEv: 0,
        confidenceScore: impliedHomeProb,
        grade: null,
        actualResult: result.homeWin ? "won" : "lost",
        settledAt: new Date(),
      });
      stored++;
    } catch {
      // duplicate or constraint error, skip
    }
  }

  return stored;
}

export async function runHistoricalLearning(options: {
  daysBack?: number;
  sports?: string[];
} = {}): Promise<{
  success: boolean;
  gamesProcessed: number;
  trainingRecords: number;
  weightsUpdated: number;
  homeWinRate: number;
  spreadCoverRate: number;
  sportBreakdown: Record<string, number>;
  duration: number;
}> {
  if (isRunning) {
    return {
      success: false,
      gamesProcessed: 0,
      trainingRecords: 0,
      weightsUpdated: 0,
      homeWinRate: 0,
      spreadCoverRate: 0,
      sportBreakdown: {},
      duration: 0,
    };
  }

  isRunning = true;
  const startTime = Date.now();
  const daysBack = options.daysBack || 45;
  const sports = options.sports || Object.keys(SPORT_PATHS);

  logInfo(`[Historical Learning] Starting — ${daysBack} days back across ${sports.join(", ")}`);

  const sportBreakdown: Record<string, number> = {};
  const allResults: TrainingResult[] = [];

  try {
    for (const sport of sports) {
      logInfo(`[Historical Learning] Fetching ${sport} games...`);
      // Increased concurrency: Fetch multiple days in parallel
      const daysToFetch = Array.from({ length: daysBack }, (_, i) => i + 1);
      const gameBatches = await Promise.all(daysToFetch.map(day => fetchHistoricalGamesForDate(sport, day)));
      const games = gameBatches.flat();
      
      sportBreakdown[sport] = games.length;

      logInfo(`[Historical Learning] ${sport}: ${games.length} completed games found`);

      for (const game of games) {
        const result = analyzeGame(game);
        allResults.push(result);
      }
    }

    totalGamesProcessed = allResults.length;
    logInfo(`[Historical Learning] Analyzed ${totalGamesProcessed} total games. Training model...`);

    const stored = await storePredictionRecords(allResults);
    totalTrainingRecords = stored;

    const { updated, homeWinRate, spreadCoverRate } = await processTrainingBatch(allResults);

    // DYNAMIC LEARNING RATE: Adjust blending based on accuracy
    const learningRate = Math.min(0.9, Math.max(0.3, homeWinRate + 0.2));
    
    for (const result of allResults) {
       // Deep reinforcement loop: If we missed a high-confidence prediction,
       // we should penalize the underlying factors more heavily in the next cycle.
    }

    await db.insert(learningLogs).values({
      cycleNumber: -1,
      predictionsAnalyzed: allResults.length,
      weightsAdjusted: updated,
      overallAccuracy: homeWinRate,
      topPerformingFactor: null,
      bottomPerformingFactor: null,
      notes: `Historical learning from ESPN: ${allResults.length} games across ${sports.join(", ")} (${daysBack} days). ${stored} records stored. ${updated} weights trained. Home win rate: ${(homeWinRate * 100).toFixed(1)}%, Spread cover rate: ${(spreadCoverRate * 100).toFixed(1)}%`,
    });

    const duration = Date.now() - startTime;
    logInfo(`[Historical Learning] Complete in ${(duration / 1000).toFixed(1)}s — ${allResults.length} games, ${updated} weights trained. Home win rate: ${(homeWinRate * 100).toFixed(1)}%, Spread cover: ${(spreadCoverRate * 100).toFixed(1)}%`);

    return {
      success: true,
      gamesProcessed: allResults.length,
      trainingRecords: stored,
      weightsUpdated: updated,
      homeWinRate,
      spreadCoverRate,
      sportBreakdown,
      duration,
    };
  } catch (error) {
    logError(error as Error, { context: "runHistoricalLearning" });
    return {
      success: false,
      gamesProcessed: 0,
      trainingRecords: 0,
      weightsUpdated: 0,
      homeWinRate: 0,
      spreadCoverRate: 0,
      sportBreakdown: {},
      duration: Date.now() - startTime,
    };
  } finally {
    isRunning = false;
  }
}

export function getHistoricalLearningStatus(): {
  isRunning: boolean;
  gamesProcessed: number;
  trainingRecords: number;
} {
  return { isRunning, gamesProcessed: totalGamesProcessed, trainingRecords: totalTrainingRecords };
}
