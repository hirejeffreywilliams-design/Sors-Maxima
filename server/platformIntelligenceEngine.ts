import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Sport } from "@shared/schema";

const DATA_FILE = path.join(process.cwd(), "platform-intelligence-data.json");
const ACCUMULATE_INTERVAL = 5 * 60 * 1000;
const MAX_GAME_HISTORY = 5000;
const MAX_PREDICTION_HISTORY = 3000;
const MAX_ODDS_HISTORY = 2000;
const MAX_INJURY_RECORDS = 1000;

interface TeamRecord {
  team: string;
  sport: Sport;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  lastResults: ("W" | "L")[];
  avgPointsFor: number;
  avgPointsAgainst: number;
  totalGamesTracked: number;
  streakType: "W" | "L" | "none";
  streakLength: number;
  lastUpdated: string;
}

interface GameOutcome {
  gameId: string;
  sport: Sport;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away";
  venue?: string;
  recordedAt: string;
}

interface PredictionRecord {
  id: string;
  sport: Sport;
  date: string;
  predictedWinner: string;
  actualWinner: string;
  confidence: number;
  correct: boolean;
  market: string;
  recordedAt: string;
}

interface OddsRecord {
  eventId: string;
  sport: Sport;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeML: number;
  awayML: number;
  spread: number;
  bestBook: string;
  recordedAt: string;
}

interface InjuryImpactRecord {
  sport: Sport;
  team: string;
  playerName: string;
  status: string;
  gamesWithout: number;
  teamWinsWithout: number;
  teamLossesWithout: number;
  impactScore: number;
  lastUpdated: string;
}

interface CommunityInsight {
  sport: Sport;
  totalPicks: number;
  winningPicks: number;
  winRate: number;
  mostPickedTeam: string;
  mostSuccessfulMarket: string;
  avgConfidence: number;
  lastUpdated: string;
}

interface PlatformStats {
  totalGamesTracked: number;
  totalPredictionsMade: number;
  totalOddsSnapshots: number;
  totalUserBetsTracked: number;
  overallPredictionAccuracy: number;
  accuracyBySport: Record<string, { correct: number; total: number; accuracy: number }>;
  accuracyByMarket: Record<string, { correct: number; total: number; accuracy: number }>;
  bestPerformingSport: string;
  bestPerformingMarket: string;
  dataPointsIngested: number;
  engineStartedAt: string;
  lastAccumulationAt: string;
  accumulationCycles: number;
  daysOfData: number;
}

interface BookmakerInsight {
  book: string;
  timesBestOdds: number;
  totalComparisons: number;
  bestOddsRate: number;
  bestForSports: string[];
}

interface PlatformIntelligenceData {
  version: number;
  teamRecords: Record<string, TeamRecord>;
  gameOutcomes: GameOutcome[];
  predictionRecords: PredictionRecord[];
  oddsRecords: OddsRecord[];
  injuryImpacts: Record<string, InjuryImpactRecord>;
  communityInsights: Record<string, CommunityInsight>;
  bookmakerInsights: Record<string, BookmakerInsight>;
  platformStats: PlatformStats;
  dailySummaries: DailySummary[];
}

interface DailySummary {
  date: string;
  gamesCompleted: number;
  predictionsCorrect: number;
  predictionsTotal: number;
  accuracy: number;
  topSport: string;
  dataPointsAdded: number;
}

function createEmptyData(): PlatformIntelligenceData {
  return {
    version: 1,
    teamRecords: {},
    gameOutcomes: [],
    predictionRecords: [],
    oddsRecords: [],
    injuryImpacts: {},
    communityInsights: {},
    bookmakerInsights: {},
    platformStats: {
      totalGamesTracked: 0,
      totalPredictionsMade: 0,
      totalOddsSnapshots: 0,
      totalUserBetsTracked: 0,
      overallPredictionAccuracy: 0,
      accuracyBySport: {},
      accuracyByMarket: {},
      bestPerformingSport: "N/A",
      bestPerformingMarket: "N/A",
      dataPointsIngested: 0,
      engineStartedAt: new Date().toISOString(),
      lastAccumulationAt: "",
      accumulationCycles: 0,
      daysOfData: 0,
    },
    dailySummaries: [],
  };
}

let data: PlatformIntelligenceData = createEmptyData();
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function loadData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.version === 1) {
        data = parsed;
        console.log(`[PlatformIntelligence] Loaded ${data.gameOutcomes.length} game outcomes, ${data.predictionRecords.length} predictions, ${Object.keys(data.teamRecords).length} team records from disk`);
      }
    }
  } catch (err) {
    console.error("[PlatformIntelligence] Failed to load data, starting fresh:", err);
    data = createEmptyData();
  }
}

function saveData(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("[PlatformIntelligence] Failed to save data:", err);
  }
}

function teamKey(team: string, sport: Sport): string {
  return `${sport}:${team}`;
}

async function accumulateGameOutcomes(): Promise<number> {
  try {
    const { getAllSportsScoreboard } = await import("./espn-scoreboard-provider");
    const allGames = await getAllSportsScoreboard();
    let newOutcomes = 0;

    const completedGames = allGames.filter(g => g.status?.state === "post" || g.status?.completed);
    const existingIds = new Set(data.gameOutcomes.map(o => o.gameId));

    for (const game of completedGames) {
      if (existingIds.has(game.id)) continue;

      const homeScore = game.homeTeam.score || 0;
      const awayScore = game.awayTeam.score || 0;
      if (homeScore === 0 && awayScore === 0) continue;

      const sportStr = (game as any).sport || detectSport(game);
      const winner: "home" | "away" = homeScore > awayScore ? "home" : "away";

      const outcome: GameOutcome = {
        gameId: game.id,
        sport: sportStr as Sport,
        date: game.date,
        homeTeam: game.homeTeam.shortDisplayName || game.homeTeam.displayName || game.homeTeam.abbreviation,
        awayTeam: game.awayTeam.shortDisplayName || game.awayTeam.displayName || game.awayTeam.abbreviation,
        homeScore,
        awayScore,
        winner,
        venue: game.venue,
        recordedAt: new Date().toISOString(),
      };

      data.gameOutcomes.push(outcome);
      existingIds.add(game.id);
      newOutcomes++;

      updateTeamRecord(outcome);

      try {
        const { recordOutcome, getPreSimulated } = await import("./monteCarloEngine");
        const preSim = getPreSimulated(game.id);
        if (preSim) {
          const actualHomeWin = winner === "home" ? 1 : 0;
          recordOutcome(game.id, sportStr, "moneyline", preSim.homeWinProb, actualHomeWin);
        }
      } catch {}

    }

    if (data.gameOutcomes.length > MAX_GAME_HISTORY) {
      data.gameOutcomes = data.gameOutcomes.slice(-MAX_GAME_HISTORY);
    }

    return newOutcomes;
  } catch (err) {
    console.error("[PlatformIntelligence] Game accumulation error:", err);
    return 0;
  }
}

function detectSport(game: any): Sport {
  const name = (game.name || game.shortName || "").toLowerCase();
  if (name.includes("nba") || name.includes("basketball")) return "NBA";
  if (name.includes("nfl") || name.includes("football")) return "NFL";
  if (name.includes("mlb") || name.includes("baseball")) return "MLB";
  if (name.includes("nhl") || name.includes("hockey")) return "NHL";
  return "NBA";
}

function updateTeamRecord(outcome: GameOutcome): void {
  const homeKey = teamKey(outcome.homeTeam, outcome.sport);
  const awayKey = teamKey(outcome.awayTeam, outcome.sport);

  if (!data.teamRecords[homeKey]) {
    data.teamRecords[homeKey] = createEmptyTeamRecord(outcome.homeTeam, outcome.sport);
  }
  if (!data.teamRecords[awayKey]) {
    data.teamRecords[awayKey] = createEmptyTeamRecord(outcome.awayTeam, outcome.sport);
  }

  const homeRec = data.teamRecords[homeKey];
  const awayRec = data.teamRecords[awayKey];

  if (outcome.winner === "home") {
    homeRec.wins++;
    homeRec.homeWins++;
    homeRec.lastResults.push("W");
    awayRec.losses++;
    awayRec.awayLosses++;
    awayRec.lastResults.push("L");
  } else {
    homeRec.losses++;
    homeRec.homeLosses++;
    homeRec.lastResults.push("L");
    awayRec.wins++;
    awayRec.awayWins++;
    awayRec.lastResults.push("W");
  }

  for (const rec of [homeRec, awayRec]) {
    if (rec.lastResults.length > 20) rec.lastResults = rec.lastResults.slice(-20);
    rec.totalGamesTracked++;
    const lastResult = rec.lastResults[rec.lastResults.length - 1];
    if (rec.streakType === lastResult) {
      rec.streakLength++;
    } else {
      rec.streakType = lastResult;
      rec.streakLength = 1;
    }
    rec.lastUpdated = new Date().toISOString();
  }

  const totalHomeGames = homeRec.totalGamesTracked;
  homeRec.avgPointsFor = ((homeRec.avgPointsFor * (totalHomeGames - 1)) + outcome.homeScore) / totalHomeGames;
  homeRec.avgPointsAgainst = ((homeRec.avgPointsAgainst * (totalHomeGames - 1)) + outcome.awayScore) / totalHomeGames;

  const totalAwayGames = awayRec.totalGamesTracked;
  awayRec.avgPointsFor = ((awayRec.avgPointsFor * (totalAwayGames - 1)) + outcome.awayScore) / totalAwayGames;
  awayRec.avgPointsAgainst = ((awayRec.avgPointsAgainst * (totalAwayGames - 1)) + outcome.homeScore) / totalAwayGames;
}

function createEmptyTeamRecord(team: string, sport: Sport): TeamRecord {
  return {
    team,
    sport,
    wins: 0,
    losses: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    lastResults: [],
    avgPointsFor: 0,
    avgPointsAgainst: 0,
    totalGamesTracked: 0,
    streakType: "none",
    streakLength: 0,
    lastUpdated: new Date().toISOString(),
  };
}

async function accumulatePredictions(): Promise<number> {
  try {
    const { getPrecomputedCache } = await import("./precomputedPredictionsEngine");
    let newPredictions = 0;
    const existingIds = new Set(data.predictionRecords.map(p => p.id));

    for (const sport of ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as Sport[]) {
      const cached = getPrecomputedCache(sport);
      if (!cached || !cached.picks || cached.picks.length === 0) continue;

      for (const pick of cached.picks) {
        if (pick.betType !== "moneyline") continue;

        const predId = crypto.createHash("md5").update(`${pick.id}-${sport}-${pick.pick}`).digest("hex").slice(0, 12);
        if (existingIds.has(predId)) continue;

        const pickTeamName = pick.pick.replace(" ML", "").trim();
        const isHomePick = pickTeamName.toLowerCase() === (pick.homeTeam || "").toLowerCase();

        const matchedOutcome = data.gameOutcomes.find(o => {
          const gameStr = `${pick.awayTeam} @ ${pick.homeTeam}`;
          return o.sport === sport && (
            pick.game === gameStr ||
            (o.homeTeam.toLowerCase().includes((pick.homeTeam || "").toLowerCase().slice(0, 5)) &&
             o.awayTeam.toLowerCase().includes((pick.awayTeam || "").toLowerCase().slice(0, 5)))
          );
        });

        if (matchedOutcome) {
          const predictedWinner = pickTeamName;
          const actualWinner = matchedOutcome.winner === "home" ? matchedOutcome.homeTeam : matchedOutcome.awayTeam;
          const correct = (isHomePick && matchedOutcome.winner === "home") || (!isHomePick && matchedOutcome.winner === "away");

          data.predictionRecords.push({
            id: predId,
            sport,
            date: pick.gameTime || pick.generatedAt || new Date().toISOString(),
            predictedWinner,
            actualWinner,
            confidence: pick.confidence || 50,
            correct,
            market: pick.betType || "moneyline",
            recordedAt: new Date().toISOString(),
          });
          existingIds.add(predId);
          newPredictions++;
        }
      }
    }

    if (data.predictionRecords.length > MAX_PREDICTION_HISTORY) {
      data.predictionRecords = data.predictionRecords.slice(-MAX_PREDICTION_HISTORY);
    }

    return newPredictions;
  } catch (err) {
    console.error("[PlatformIntelligence] Prediction accumulation error:", err);
    return 0;
  }
}

async function accumulateOddsData(): Promise<number> {
  try {
    const { generateMarketSnapshot } = await import("./marketSnapshotEngine");
    let newSnapshots = 0;

    for (const sport of ["NBA", "NFL", "MLB", "NHL"] as Sport[]) {
      try {
        const snapshot = await generateMarketSnapshot(sport);
        if (!snapshot || !snapshot.games) continue;

        const today = new Date().toISOString().split("T")[0];

        for (const game of snapshot.games) {
          const snapId = `${game.id}-${today}`;
          const exists = data.oddsRecords.some(r => r.eventId === snapId);
          if (exists) continue;

          const bestBook = game.bestLines?.bestHomeML?.book || "ESPN";

          data.oddsRecords.push({
            eventId: snapId,
            sport,
            date: game.date,
            homeTeam: game.homeTeam.name || game.homeTeam.abbreviation,
            awayTeam: game.awayTeam.name || game.awayTeam.abbreviation,
            homeML: game.consensus?.homeMoneyline || 0,
            awayML: game.consensus?.awayMoneyline || 0,
            spread: game.consensus?.spread || 0,
            bestBook,
            recordedAt: new Date().toISOString(),
          });

          const bookKey = bestBook;
          if (!data.bookmakerInsights[bookKey]) {
            data.bookmakerInsights[bookKey] = { book: bestBook, timesBestOdds: 0, totalComparisons: 0, bestOddsRate: 0, bestForSports: [] };
          }
          data.bookmakerInsights[bookKey].timesBestOdds++;
          data.bookmakerInsights[bookKey].totalComparisons++;
          data.bookmakerInsights[bookKey].bestOddsRate = data.bookmakerInsights[bookKey].timesBestOdds / data.bookmakerInsights[bookKey].totalComparisons;

          if (!data.bookmakerInsights[bookKey].bestForSports.includes(sport)) {
            data.bookmakerInsights[bookKey].bestForSports.push(sport);
          }

          newSnapshots++;
        }
      } catch {}
    }

    if (data.oddsRecords.length > MAX_ODDS_HISTORY) {
      data.oddsRecords = data.oddsRecords.slice(-MAX_ODDS_HISTORY);
    }

    return newSnapshots;
  } catch (err) {
    console.error("[PlatformIntelligence] Odds accumulation error:", err);
    return 0;
  }
}

async function accumulateInjuryData(): Promise<number> {
  try {
    const { getAllInjuries } = await import("./espn-injury-provider");
    let newRecords = 0;

    const allInjuries = await getAllInjuries();

    for (const sport of ["NBA", "NFL", "MLB", "NHL"] as Sport[]) {
      try {
        const injuries = allInjuries[sport] || [];
        for (const teamInjury of injuries) {
          const teamName = teamInjury.team || (teamInjury as any).teamAbbreviation || "unknown";
          for (const player of (teamInjury.injuries || [])) {
            if (player.status !== "Out" && player.status !== "Doubtful") continue;

            const key = `${sport}:${teamName}:${player.name || "unknown"}`;
            if (!data.injuryImpacts[key]) {
              data.injuryImpacts[key] = {
                sport,
                team: teamName,
                playerName: player.name || "unknown",
                status: player.status,
                gamesWithout: 0,
                teamWinsWithout: 0,
                teamLossesWithout: 0,
                impactScore: 0,
                lastUpdated: new Date().toISOString(),
              };
              newRecords++;
            }

            const rec = data.injuryImpacts[key];
            rec.status = player.status;
            rec.lastUpdated = new Date().toISOString();

            const recentGames = data.gameOutcomes.filter(
              o => o.sport === sport && (o.homeTeam.includes(teamName) || o.awayTeam.includes(teamName))
            ).slice(-10);

            rec.gamesWithout = recentGames.length;
            rec.teamWinsWithout = recentGames.filter(g =>
              (g.homeTeam.includes(teamName) && g.winner === "home") ||
              (g.awayTeam.includes(teamName) && g.winner === "away")
            ).length;
            rec.teamLossesWithout = rec.gamesWithout - rec.teamWinsWithout;

            const winRate = rec.gamesWithout > 0 ? rec.teamWinsWithout / rec.gamesWithout : 0.5;
            const tKey = teamKey(teamName, sport);
            const teamRec = data.teamRecords[tKey];
            const overallWinRate = teamRec ? teamRec.wins / Math.max(teamRec.wins + teamRec.losses, 1) : 0.5;
            rec.impactScore = Math.round((overallWinRate - winRate) * 100);
          }
        }
      } catch {}
    }

    const impactKeys = Object.keys(data.injuryImpacts);
    if (impactKeys.length > MAX_INJURY_RECORDS) {
      const sorted = impactKeys.sort((a, b) =>
        new Date(data.injuryImpacts[a].lastUpdated).getTime() - new Date(data.injuryImpacts[b].lastUpdated).getTime()
      );
      for (const key of sorted.slice(0, impactKeys.length - MAX_INJURY_RECORDS)) {
        delete data.injuryImpacts[key];
      }
    }

    return newRecords;
  } catch (err) {
    console.error("[PlatformIntelligence] Injury accumulation error:", err);
    return 0;
  }
}

async function accumulateCommunityData(): Promise<void> {
  try {
    const { communityService } = await import("./communityService");
    const communities = communityService.getCommunities();
    const sportPicks: Record<string, { total: number; wins: number; teams: Record<string, number>; markets: Record<string, number>; confidenceSum: number }> = {};

    for (const community of communities) {
      const picks = communityService.getPicks(community.id);
      for (const pick of picks) {
        const sport = (pick.sport || "NBA").toUpperCase();
        if (!sportPicks[sport]) {
          sportPicks[sport] = { total: 0, wins: 0, teams: {}, markets: {}, confidenceSum: 0 };
        }
        sportPicks[sport].total++;
        if (pick.status === "won") sportPicks[sport].wins++;

        const teamName = pick.title?.split(" ")[0] || "Unknown";
        sportPicks[sport].teams[teamName] = (sportPicks[sport].teams[teamName] || 0) + 1;

        const market = pick.description?.includes("spread") ? "spread" : pick.description?.includes("over") ? "total" : "moneyline";
        sportPicks[sport].markets[market] = (sportPicks[sport].markets[market] || 0) + 1;

        const confMap: Record<string, number> = { low: 30, medium: 50, high: 70, max: 90 };
        sportPicks[sport].confidenceSum += confMap[pick.confidence || "medium"] || 50;
      }
    }

    for (const [sport, picks] of Object.entries(sportPicks)) {
      const mostPickedTeam = Object.entries(picks.teams).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      const mostSuccessfulMarket = Object.entries(picks.markets).sort((a, b) => b[1] - a[1])[0]?.[0] || "moneyline";

      data.communityInsights[sport] = {
        sport: sport as Sport,
        totalPicks: picks.total,
        winningPicks: picks.wins,
        winRate: picks.total > 0 ? Math.round((picks.wins / picks.total) * 1000) / 10 : 0,
        mostPickedTeam,
        mostSuccessfulMarket,
        avgConfidence: picks.total > 0 ? Math.round(picks.confidenceSum / picks.total) : 50,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("[PlatformIntelligence] Community accumulation error:", err);
  }
}

function updatePlatformStats(newGames: number, newPredictions: number, newOdds: number): void {
  const stats = data.platformStats;
  stats.totalGamesTracked = data.gameOutcomes.length;
  stats.totalPredictionsMade = data.predictionRecords.length;
  stats.totalOddsSnapshots = data.oddsRecords.length;
  stats.dataPointsIngested += newGames + newPredictions + newOdds;
  stats.lastAccumulationAt = new Date().toISOString();
  stats.accumulationCycles++;

  const correctPredictions = data.predictionRecords.filter(p => p.correct).length;
  stats.overallPredictionAccuracy = data.predictionRecords.length > 0
    ? Math.round((correctPredictions / data.predictionRecords.length) * 1000) / 10
    : 0;

  stats.accuracyBySport = {};
  stats.accuracyByMarket = {};

  for (const pred of data.predictionRecords) {
    if (!stats.accuracyBySport[pred.sport]) {
      stats.accuracyBySport[pred.sport] = { correct: 0, total: 0, accuracy: 0 };
    }
    stats.accuracyBySport[pred.sport].total++;
    if (pred.correct) stats.accuracyBySport[pred.sport].correct++;
    stats.accuracyBySport[pred.sport].accuracy = Math.round(
      (stats.accuracyBySport[pred.sport].correct / stats.accuracyBySport[pred.sport].total) * 1000
    ) / 10;

    if (!stats.accuracyByMarket[pred.market]) {
      stats.accuracyByMarket[pred.market] = { correct: 0, total: 0, accuracy: 0 };
    }
    stats.accuracyByMarket[pred.market].total++;
    if (pred.correct) stats.accuracyByMarket[pred.market].correct++;
    stats.accuracyByMarket[pred.market].accuracy = Math.round(
      (stats.accuracyByMarket[pred.market].correct / stats.accuracyByMarket[pred.market].total) * 1000
    ) / 10;
  }

  let bestSportAcc = 0;
  let bestMarketAcc = 0;
  for (const [sport, acc] of Object.entries(stats.accuracyBySport)) {
    if (acc.total >= 5 && acc.accuracy > bestSportAcc) {
      bestSportAcc = acc.accuracy;
      stats.bestPerformingSport = sport;
    }
  }
  for (const [market, acc] of Object.entries(stats.accuracyByMarket)) {
    if (acc.total >= 5 && acc.accuracy > bestMarketAcc) {
      bestMarketAcc = acc.accuracy;
      stats.bestPerformingMarket = market;
    }
  }

  const dates = new Set(data.gameOutcomes.map(g => g.date.split("T")[0]));
  stats.daysOfData = dates.size;

  const today = new Date().toISOString().split("T")[0];
  const todayGames = data.gameOutcomes.filter(g => g.recordedAt.startsWith(today));
  const todayPreds = data.predictionRecords.filter(p => p.recordedAt.startsWith(today));
  const todayCorrect = todayPreds.filter(p => p.correct).length;

  const existingSummary = data.dailySummaries.find(s => s.date === today);
  if (existingSummary) {
    existingSummary.gamesCompleted = todayGames.length;
    existingSummary.predictionsCorrect = todayCorrect;
    existingSummary.predictionsTotal = todayPreds.length;
    existingSummary.accuracy = todayPreds.length > 0 ? Math.round((todayCorrect / todayPreds.length) * 1000) / 10 : 0;
    existingSummary.dataPointsAdded = newGames + newPredictions + newOdds;
  } else {
    data.dailySummaries.push({
      date: today,
      gamesCompleted: todayGames.length,
      predictionsCorrect: todayCorrect,
      predictionsTotal: todayPreds.length,
      accuracy: todayPreds.length > 0 ? Math.round((todayCorrect / todayPreds.length) * 1000) / 10 : 0,
      topSport: stats.bestPerformingSport,
      dataPointsAdded: newGames + newPredictions + newOdds,
    });
  }

  if (data.dailySummaries.length > 365) {
    data.dailySummaries = data.dailySummaries.slice(-365);
  }
}

async function runAccumulationCycle(): Promise<void> {
  const cycleStart = Date.now();
  try {
    const newGames = await accumulateGameOutcomes();
    const newPredictions = await accumulatePredictions();
    const newOdds = await accumulateOddsData();
    await accumulateInjuryData();
    await accumulateCommunityData();
    updatePlatformStats(newGames, newPredictions, newOdds);
    saveData();

    const elapsed = Date.now() - cycleStart;
    console.log(`[PlatformIntelligence] Cycle #${data.platformStats.accumulationCycles} complete in ${elapsed}ms [+${newGames} games, +${newPredictions} preds, +${newOdds} odds | Total: ${data.gameOutcomes.length} games, ${data.predictionRecords.length} preds, ${Object.keys(data.teamRecords).length} teams]`);
  } catch (err) {
    console.error("[PlatformIntelligence] Accumulation cycle error:", err);
  }
}

export function startPlatformIntelligenceEngine(): void {
  loadData();
  console.log("[PlatformIntelligence] Starting Platform Intelligence Engine (5m accumulation interval)");

  setTimeout(() => runAccumulationCycle(), 30_000);

  intervalHandle = setInterval(() => runAccumulationCycle(), ACCUMULATE_INTERVAL);
}

export function getTeamTrends(sport?: Sport): TeamRecord[] {
  const records = Object.values(data.teamRecords);
  const filtered = sport ? records.filter(r => r.sport === sport) : records;
  return filtered
    .filter(r => r.totalGamesTracked >= 2)
    .sort((a, b) => {
      const aWinPct = a.wins / Math.max(a.wins + a.losses, 1);
      const bWinPct = b.wins / Math.max(b.wins + b.losses, 1);
      return bWinPct - aWinPct;
    });
}

export function getTeamDetail(team: string, sport: Sport): {
  record: TeamRecord | null;
  recentGames: GameOutcome[];
  injuryImpact: InjuryImpactRecord[];
} {
  const key = teamKey(team, sport);
  const record = data.teamRecords[key] || null;
  const recentGames = data.gameOutcomes
    .filter(g => g.sport === sport && (g.homeTeam.includes(team) || g.awayTeam.includes(team)))
    .slice(-10);
  const injuryImpact = Object.values(data.injuryImpacts)
    .filter(i => i.sport === sport && i.team.includes(team));

  return { record, recentGames, injuryImpact };
}

export function getPredictionAccuracy(): {
  overall: number;
  bySport: Record<string, { correct: number; total: number; accuracy: number }>;
  byMarket: Record<string, { correct: number; total: number; accuracy: number }>;
  recentTrend: { period: string; accuracy: number }[];
} {
  const stats = data.platformStats;
  const now = Date.now();

  const periods = [
    { label: "Last 24h", ms: 24 * 60 * 60 * 1000 },
    { label: "Last 7d", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "Last 30d", ms: 30 * 24 * 60 * 60 * 1000 },
    { label: "All time", ms: Infinity },
  ];

  const recentTrend = periods.map(({ label, ms }) => {
    const cutoff = ms === Infinity ? 0 : now - ms;
    const preds = data.predictionRecords.filter(p => new Date(p.recordedAt).getTime() >= cutoff);
    const correct = preds.filter(p => p.correct).length;
    return {
      period: label,
      accuracy: preds.length > 0 ? Math.round((correct / preds.length) * 1000) / 10 : 0,
    };
  });

  return {
    overall: stats.overallPredictionAccuracy,
    bySport: stats.accuracyBySport,
    byMarket: stats.accuracyByMarket,
    recentTrend,
  };
}

export function getBookmakerRankings(): BookmakerInsight[] {
  return Object.values(data.bookmakerInsights)
    .sort((a, b) => b.bestOddsRate - a.bestOddsRate);
}

export function getInjuryImpactDatabase(sport?: Sport): InjuryImpactRecord[] {
  const records = Object.values(data.injuryImpacts);
  const filtered = sport ? records.filter(r => r.sport === sport) : records;
  return filtered
    .filter(r => r.gamesWithout >= 1)
    .sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));
}

export function getCommunityInsights(): Record<string, CommunityInsight> {
  return data.communityInsights;
}

export function getPlatformStats(): PlatformStats {
  return data.platformStats;
}

export function getDailySummaries(limit?: number): DailySummary[] {
  const summaries = data.dailySummaries.slice().reverse();
  return limit ? summaries.slice(0, limit) : summaries;
}

export function getFullIntelligenceReport(): {
  stats: PlatformStats;
  topTeams: TeamRecord[];
  predictionAccuracy: ReturnType<typeof getPredictionAccuracy>;
  bookmakerRankings: BookmakerInsight[];
  highImpactInjuries: InjuryImpactRecord[];
  communityInsights: Record<string, CommunityInsight>;
  dailySummaries: DailySummary[];
  dataGrowth: { totalRecords: number; teamsCovered: number; sportsCovered: number };
} {
  const topTeams = getTeamTrends().slice(0, 20);
  const predictionAccuracy = getPredictionAccuracy();
  const bookmakerRankings = getBookmakerRankings();
  const highImpactInjuries = getInjuryImpactDatabase().slice(0, 20);
  const communityInsights = getCommunityInsights();
  const dailySummaries = getDailySummaries(30);

  const sportsCovered = new Set(Object.values(data.teamRecords).map(r => r.sport));

  return {
    stats: data.platformStats,
    topTeams,
    predictionAccuracy,
    bookmakerRankings,
    highImpactInjuries,
    communityInsights,
    dailySummaries,
    dataGrowth: {
      totalRecords: data.gameOutcomes.length + data.predictionRecords.length + data.oddsRecords.length,
      teamsCovered: Object.keys(data.teamRecords).length,
      sportsCovered: sportsCovered.size,
    },
  };
}

export function getEngineStatus(): {
  running: boolean;
  cycles: number;
  lastCycle: string;
  totalDataPoints: number;
  gameOutcomes: number;
  predictions: number;
  oddsSnapshots: number;
  teams: number;
  injuries: number;
  daysOfData: number;
} {
  return {
    running: intervalHandle !== null,
    cycles: data.platformStats.accumulationCycles,
    lastCycle: data.platformStats.lastAccumulationAt,
    totalDataPoints: data.platformStats.dataPointsIngested,
    gameOutcomes: data.gameOutcomes.length,
    predictions: data.predictionRecords.length,
    oddsSnapshots: data.oddsRecords.length,
    teams: Object.keys(data.teamRecords).length,
    injuries: Object.keys(data.injuryImpacts).length,
    daysOfData: data.platformStats.daysOfData,
  };
}
