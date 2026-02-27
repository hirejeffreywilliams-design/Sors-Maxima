import { getLiveGames, type ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface MomentumGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: "live" | "halftime" | "final" | "pre";
  momentum: "home" | "away" | "neutral";
  momentumScore: number;
  recentPlays: string[];
  spreadLine?: string;
  totalLine?: number;
  homeRecord?: string;
  awayRecord?: string;
}

export interface CLVEntry {
  id: string;
  game: string;
  market: string;
  selection: string;
  openingOdds: number;
  currentOdds: number;
  clvPercent: number;
  direction: "positive" | "negative" | "neutral";
  sport: string;
  timestamp: string;
}

export interface PublicSharpSplit {
  id: string;
  game: string;
  market: string;
  homeTeam: string;
  awayTeam: string;
  publicHome: number;
  publicAway: number;
  sharpHome: number;
  sharpAway: number;
  sport: string;
  consensus: "public" | "sharp" | "split";
}

const clvHistory = new Map<string, { opening: number; timestamps: { odds: number; time: string }[] }>();

function mapStatus(state: "pre" | "in" | "post"): "live" | "halftime" | "final" | "pre" {
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "pre";
}

export async function getMomentumGames(): Promise<MomentumGame[]> {
  const liveGames = await getLiveGames();
  if (!liveGames || liveGames.length === 0) return [];

  return liveGames.map((game: ESPNScoreboardGame) => {
    const homeScore = game.homeTeam.score || 0;
    const awayScore = game.awayTeam.score || 0;
    const scoreDiff = homeScore - awayScore;

    let momentum: "home" | "away" | "neutral" = "neutral";
    let momentumScore = 50;
    if (scoreDiff > 10) { momentum = "home"; momentumScore = Math.min(85, 50 + scoreDiff * 2); }
    else if (scoreDiff > 5) { momentum = "home"; momentumScore = Math.min(70, 50 + scoreDiff * 2); }
    else if (scoreDiff < -10) { momentum = "away"; momentumScore = Math.max(15, 50 + scoreDiff * 2); }
    else if (scoreDiff < -5) { momentum = "away"; momentumScore = Math.max(30, 50 + scoreDiff * 2); }

    return {
      id: game.id,
      sport: game.sport,
      homeTeam: game.homeTeam.displayName,
      awayTeam: game.awayTeam.displayName,
      homeScore,
      awayScore,
      period: String(game.status.period || ""),
      clock: game.status.clock || "",
      status: mapStatus(game.status.state),
      momentum,
      momentumScore,
      recentPlays: [],
      spreadLine: game.odds?.spread,
      totalLine: game.odds?.overUnder,
      homeRecord: game.homeTeam.record,
      awayRecord: game.awayTeam.record,
    };
  });
}

export function trackCLV(gameId: string, market: string, odds: number): void {
  const key = `${gameId}-${market}`;
  if (!clvHistory.has(key)) {
    clvHistory.set(key, { opening: odds, timestamps: [] });
  }
  const entry = clvHistory.get(key)!;
  entry.timestamps.push({ odds, time: new Date().toISOString() });
}

export function getCLVData(): CLVEntry[] {
  const entries: CLVEntry[] = [];
  clvHistory.forEach((data, key) => {
    if (data.timestamps.length === 0) return;
    const latest = data.timestamps[data.timestamps.length - 1];
    const clvPercent = data.opening !== 0 ? ((latest.odds - data.opening) / Math.abs(data.opening)) * 100 : 0;
    entries.push({
      id: key,
      game: key.split("-")[0],
      market: key.split("-").slice(1).join("-"),
      selection: key,
      openingOdds: data.opening,
      currentOdds: latest.odds,
      clvPercent: Math.round(clvPercent * 100) / 100,
      direction: clvPercent > 2 ? "positive" : clvPercent < -2 ? "negative" : "neutral",
      sport: "",
      timestamp: latest.time,
    });
  });
  return entries;
}

export async function getPublicSharpSplits(): Promise<PublicSharpSplit[]> {
  const liveGames = await getLiveGames();
  if (!liveGames || liveGames.length === 0) return [];

  return liveGames
    .filter((g: ESPNScoreboardGame) => g.status.state === "pre" || g.status.state === "in")
    .slice(0, 15)
    .map((game: ESPNScoreboardGame) => {
      const homeWinPct = parseWinPct(game.homeTeam.record);
      const awayWinPct = parseWinPct(game.awayTeam.record);
      const total = homeWinPct + awayWinPct || 1;

      const publicHome = Math.round((homeWinPct / total) * 100);
      const publicAway = 100 - publicHome;

      const spreadNum = game.odds?.spread ? parseFloat(game.odds.spread) : 0;
      const sharpAdjust = spreadNum < 0 ? 5 : spreadNum > 0 ? -5 : 0;
      const sharpHome = Math.max(10, Math.min(90, publicHome + sharpAdjust));
      const sharpAway = 100 - sharpHome;

      return {
        id: game.id,
        game: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
        market: "Moneyline",
        homeTeam: game.homeTeam.displayName,
        awayTeam: game.awayTeam.displayName,
        publicHome,
        publicAway,
        sharpHome,
        sharpAway,
        sport: game.sport,
        consensus: Math.abs(publicHome - sharpHome) < 5 ? "split" as const :
          sharpHome > publicHome ? "sharp" as const : "public" as const,
      };
    });
}

function parseWinPct(record?: string): number {
  if (!record) return 0.5;
  const parts = record.split("-").map(Number);
  if (parts.length < 2) return 0.5;
  const totalGames = parts[0] + parts[1];
  return totalGames > 0 ? parts[0] / totalGames : 0.5;
}

export function getActiveBetsForHedge(): { id: string; game: string; selection: string; odds: number; stake: number; sport: string; currentOdds: number; status: string }[] {
  return [];
}

export interface LiveFactor {
  key: string;
  label: string;
  value: number;
  direction: "bullish" | "bearish" | "neutral";
  description: string;
  trend: "up" | "down" | "flat";
}

export interface LiveSpreadStatus {
  line: number;
  currentMargin: number;
  coverStatus: "covering" | "push" | "not_covering";
  coverProbability: number;
  description: string;
}

export interface LiveTotalStatus {
  line: number;
  currentTotal: number;
  projectedTotal: number;
  paceStatus: "pace_over" | "pace_under" | "borderline";
  probability: number;
  description: string;
}

export interface LiveFactorAdjustment {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  timeRemainingPct: number;
  gameCompletionPct: number;
  factors: LiveFactor[];
  spread?: LiveSpreadStatus;
  total?: LiveTotalStatus;
  recommendation: "hold" | "cashout_now" | "consider_hedge" | "add_live_bet" | "monitor";
  recommendationReason: string;
  confidence: number;
  lastUpdated: string;
}

function parseClockSeconds(clock: string): number {
  if (!clock) return 0;
  const parts = clock.split(":").map(Number);
  if (parts.length >= 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  return parts[0] || 0;
}

function getGameTimings(sport: string): { totalPeriods: number; periodMinutes: number } {
  switch (sport.toUpperCase()) {
    case "NBA": return { totalPeriods: 4, periodMinutes: 12 };
    case "NFL": return { totalPeriods: 4, periodMinutes: 15 };
    case "NHL": return { totalPeriods: 3, periodMinutes: 20 };
    case "NCAAB": return { totalPeriods: 2, periodMinutes: 20 };
    case "NCAAF": return { totalPeriods: 4, periodMinutes: 15 };
    case "MLB": return { totalPeriods: 9, periodMinutes: 20 };
    default: return { totalPeriods: 4, periodMinutes: 12 };
  }
}

function logisticCDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x >= mu ? 1 : 0;
  const z = (x - mu) / sigma;
  return 1 / (1 + Math.exp(-1.7 * z));
}

function calcSpreadStatus(spreadStr: string | undefined, homeScore: number, awayScore: number, timeRemainingPct: number, sport: string): LiveSpreadStatus | undefined {
  if (!spreadStr) return undefined;
  const spreadNum = parseFloat(spreadStr);
  if (isNaN(spreadNum)) return undefined;

  const currentMargin = homeScore - awayScore;
  const homeNeedMargin = -spreadNum;
  const marginGap = currentMargin - homeNeedMargin;

  const sportSD: Record<string, number> = { NBA: 13, NFL: 11, NHL: 2.5, NCAAB: 11, MLB: 1.5 };
  const sd = (sportSD[sport.toUpperCase()] || 12) * Math.sqrt(Math.max(0.01, timeRemainingPct));

  const marginStillNeeded = homeNeedMargin - currentMargin;
  const homeProb = Math.round((1 - logisticCDF(marginStillNeeded, 0, sd)) * 100);

  const coverStatus: "covering" | "push" | "not_covering" =
    marginGap > 0.5 ? "covering" : marginGap < -0.5 ? "not_covering" : "push";

  const needsText = Math.abs(marginGap).toFixed(1);
  const description = coverStatus === "covering"
    ? `Covering by ${needsText} pts (needs ${homeNeedMargin > 0 ? "+" : ""}${homeNeedMargin.toFixed(1)})`
    : coverStatus === "not_covering"
    ? `Needs ${needsText} more pts to cover (${homeNeedMargin > 0 ? "+" : ""}${homeNeedMargin.toFixed(1)} required)`
    : `Right on the number (push territory)`;

  return { line: spreadNum, currentMargin, coverStatus, coverProbability: homeProb, description };
}

function calcTotalStatus(totalLine: number | undefined, homeScore: number, awayScore: number, timeRemainingPct: number): LiveTotalStatus | undefined {
  if (!totalLine) return undefined;
  const currentTotal = homeScore + awayScore;
  const timeElapsed = Math.max(0.05, 1 - timeRemainingPct);
  const projectedTotal = Math.round(currentTotal / timeElapsed);
  const delta = projectedTotal - totalLine;

  const paceStatus: "pace_over" | "pace_under" | "borderline" =
    delta > 6 ? "pace_over" : delta < -6 ? "pace_under" : "borderline";

  const absDelta = Math.abs(delta);
  const probability = Math.min(94, Math.max(51, 51 + absDelta * 2.5));

  const description = `Proj ${projectedTotal} pts (${delta >= 0 ? "+" : ""}${delta} vs O/U ${totalLine})`;
  return { line: totalLine, currentTotal, projectedTotal, paceStatus, probability: Math.round(probability), description };
}

function buildLiveFactors(
  game: ESPNScoreboardGame,
  timeRemainingPct: number,
  spread?: LiveSpreadStatus,
  total?: LiveTotalStatus
): LiveFactor[] {
  const homeScore = game.homeTeam.score || 0;
  const awayScore = game.awayTeam.score || 0;
  const scoreDiff = homeScore - awayScore;
  const homeWinPct = parseWinPct(game.homeTeam.record);
  const awayWinPct = parseWinPct(game.awayTeam.record);

  const momentumRaw = Math.max(5, Math.min(95, 50 + scoreDiff * 2.2));
  const momentumDir: "bullish" | "bearish" | "neutral" = momentumRaw > 58 ? "bullish" : momentumRaw < 42 ? "bearish" : "neutral";

  const coverVal = spread ? spread.coverProbability : 50;
  const coverDir: "bullish" | "bearish" | "neutral" = coverVal > 60 ? "bullish" : coverVal < 40 ? "bearish" : "neutral";

  const totalVal = total
    ? total.paceStatus === "pace_over" ? Math.min(95, total.probability) : Math.max(5, 100 - total.probability)
    : 50;
  const totalDir: "bullish" | "bearish" | "neutral" = total?.paceStatus === "pace_over" ? "bullish" : total?.paceStatus === "pace_under" ? "bearish" : "neutral";

  const timeConfidence = Math.round(100 - timeRemainingPct * 80);
  const timeDir: "bullish" | "bearish" | "neutral" = timeConfidence > 70 ? "bullish" : "neutral";

  const homeQualityAdv = Math.round(50 + (homeWinPct - awayWinPct) * 60);
  const qualDir: "bullish" | "bearish" | "neutral" = homeQualityAdv > 57 ? "bullish" : homeQualityAdv < 43 ? "bearish" : "neutral";

  const homeScoreRate = homeScore / Math.max(0.01, 1 - timeRemainingPct);
  const awayScoreRate = awayScore / Math.max(0.01, 1 - timeRemainingPct);
  const efficiencyGap = homeScoreRate - awayScoreRate;
  const efficiencyVal = Math.max(5, Math.min(95, 50 + efficiencyGap * 0.5));
  const effDir: "bullish" | "bearish" | "neutral" = efficiencyVal > 58 ? "bullish" : efficiencyVal < 42 ? "bearish" : "neutral";

  return [
    {
      key: "momentum",
      label: "Live Momentum",
      value: Math.round(momentumRaw),
      direction: momentumDir,
      description: scoreDiff > 0 ? `${game.homeTeam.shortDisplayName} on top by ${scoreDiff}` : scoreDiff < 0 ? `${game.awayTeam.shortDisplayName} ahead by ${Math.abs(scoreDiff)}` : "Tied game",
      trend: scoreDiff > 5 ? "up" : scoreDiff < -5 ? "down" : "flat",
    },
    {
      key: "cover_probability",
      label: "Cover Probability",
      value: coverVal,
      direction: coverDir,
      description: spread ? spread.description : "No spread data",
      trend: coverVal > 60 ? "up" : coverVal < 40 ? "down" : "flat",
    },
    {
      key: "total_pace",
      label: "Total Pace",
      value: Math.round(totalVal),
      direction: totalDir,
      description: total ? total.description : "No total data",
      trend: total?.paceStatus === "pace_over" ? "up" : total?.paceStatus === "pace_under" ? "down" : "flat",
    },
    {
      key: "time_certainty",
      label: "Time Certainty",
      value: timeConfidence,
      direction: timeDir,
      description: `${Math.round(timeRemainingPct * 100)}% of game remaining — ${timeConfidence > 70 ? "late-game high certainty" : "early, high variance"}`,
      trend: timeConfidence > 70 ? "up" : "flat",
    },
    {
      key: "team_quality",
      label: "Home Quality Edge",
      value: homeQualityAdv,
      direction: qualDir,
      description: `Records: ${game.homeTeam.record || "?"} vs ${game.awayTeam.record || "?"} — ${homeQualityAdv > 50 ? game.homeTeam.shortDisplayName : game.awayTeam.shortDisplayName} historically stronger`,
      trend: homeQualityAdv > 55 ? "up" : homeQualityAdv < 45 ? "down" : "flat",
    },
    {
      key: "scoring_efficiency",
      label: "Scoring Efficiency",
      value: Math.round(efficiencyVal),
      direction: effDir,
      description: `Per-min rate: ${game.homeTeam.shortDisplayName} ${homeScoreRate.toFixed(1)} vs ${game.awayTeam.shortDisplayName} ${awayScoreRate.toFixed(1)}`,
      trend: efficiencyGap > 2 ? "up" : efficiencyGap < -2 ? "down" : "flat",
    },
  ];
}

function buildRecommendation(
  spread: LiveSpreadStatus | undefined,
  total: LiveTotalStatus | undefined,
  timeRemainingPct: number
): { recommendation: LiveFactorAdjustment["recommendation"]; reason: string; confidence: number } {
  const isEarlyGame = timeRemainingPct > 0.65;
  const isLateGame = timeRemainingPct < 0.25;
  const isCritical = timeRemainingPct < 0.1;

  if (spread) {
    if (isCritical && spread.coverStatus === "not_covering" && spread.coverProbability < 25) {
      return { recommendation: "cashout_now", reason: `Cover unlikely — ${spread.coverProbability}% probability with under 10% game left. Cut losses now.`, confidence: 85 };
    }
    if (isLateGame && spread.coverStatus === "covering" && spread.coverProbability > 75) {
      return { recommendation: "hold", reason: `Strong cover position — ${spread.coverProbability}% probability. Game trends in your favor, hold the bet.`, confidence: 80 };
    }
    if (isLateGame && spread.coverStatus === "not_covering" && spread.coverProbability < 40) {
      return { recommendation: "consider_hedge", reason: `Cover at risk — ${spread.coverProbability}% probability. Consider hedging on the opposing team to recover partial value.`, confidence: 70 };
    }
  }

  if (isEarlyGame) {
    return { recommendation: "monitor", reason: "Game is still early — factors will sharpen as the game progresses. Check back in the second half.", confidence: 55 };
  }

  return { recommendation: "hold", reason: "Game within normal variance range. Factors don't strongly signal action — maintain current position.", confidence: 60 };
}

export async function getLiveFactorAdjustments(): Promise<LiveFactorAdjustment[]> {
  const liveGames = await getLiveGames();
  if (!liveGames || liveGames.length === 0) return [];

  const adjustments: LiveFactorAdjustment[] = [];

  for (const game of liveGames) {
    try {
      const { totalPeriods, periodMinutes } = getGameTimings(game.sport);
      const period = game.status.period || 1;
      const clockSec = parseClockSeconds(game.status.clock);
      const totalGameSec = totalPeriods * periodMinutes * 60;
      const periodsCompleted = Math.max(0, period - 1);
      const secondsElapsed = periodsCompleted * periodMinutes * 60 + Math.max(0, periodMinutes * 60 - clockSec);
      const timeRemainingPct = Math.max(0, Math.min(1, 1 - secondsElapsed / totalGameSec));
      const gameCompletionPct = Math.round((1 - timeRemainingPct) * 100);

      const spread = calcSpreadStatus(game.odds?.spread, game.homeTeam.score, game.awayTeam.score, timeRemainingPct, game.sport);
      const total = calcTotalStatus(game.odds?.overUnder, game.homeTeam.score, game.awayTeam.score, timeRemainingPct);
      const factors = buildLiveFactors(game, timeRemainingPct, spread, total);
      const { recommendation, reason, confidence } = buildRecommendation(spread, total, timeRemainingPct);

      adjustments.push({
        gameId: game.id,
        sport: game.sport,
        homeTeam: game.homeTeam.displayName,
        awayTeam: game.awayTeam.displayName,
        homeScore: game.homeTeam.score,
        awayScore: game.awayTeam.score,
        period: String(period),
        clock: game.status.clock || "",
        timeRemainingPct,
        gameCompletionPct,
        factors,
        spread,
        total,
        recommendation,
        recommendationReason: reason,
        confidence,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      continue;
    }
  }

  return adjustments;
}
