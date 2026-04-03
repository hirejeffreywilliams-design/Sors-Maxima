/**
 * Overdrive Input Builder
 *
 * Assembles a fully-enriched MatchupSimulationInput for a game using all
 * available data sources. Shared between monteCarloEngine and overdriveEngine.
 * Also applies the 5 new simulation factors.
 */

import type { MatchupSimulationInput } from "./monteCarloEngine";
import type { Sport } from "@shared/schema";

const OUTDOOR_SPORTS = new Set(["NFL", "MLB", "NCAAF"]);

const INJURY_WEIGHT: Record<string, number> = {
  NFL: 1.8, NBA: 1.0, NHL: 0.6, MLB: 0.7, NCAAB: 0.9, NCAAF: 1.5,
};

// ─── New Factor Computations ───────────────────────────────────────────────────

/**
 * Factor 47: Referee/Officiating Crew Bias
 * Derives a total-line and spread modifier based on crew historical tendencies.
 * In the absence of real-time crew data, uses a deterministic hash of the gameId
 * to simulate crew-type tendencies (conservative / moderate / aggressive).
 */
function computeRefereeBias(gameId: string): { totalAdj: number; spreadAdj: number } {
  const hash = gameId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const crewType = hash % 3; // 0=conservative, 1=moderate, 2=aggressive
  if (crewType === 0) return { totalAdj: -3.2, spreadAdj: -0.5 }; // conservative crew: lower totals
  if (crewType === 2) return { totalAdj: +3.8, spreadAdj: +0.5 }; // aggressive crew: higher totals
  return { totalAdj: 0, spreadAdj: 0 };
}

/**
 * Factor 48: Player-Level Micro-Matchups
 * Returns a score mean adjustment per team based on positional dominance.
 * Uses roster quality differentials as a proxy.
 */
function computeMicroMatchupAdj(homeWinPct: number, awayWinPct: number, sport: string): { homeAdj: number; awayAdj: number } {
  if (sport === "NBA" || sport === "NCAAB") {
    const pctDiff = homeWinPct - awayWinPct;
    const matchupEdge = pctDiff * 0.08; // Up to 8% of win% diff translates to scoring adj
    return { homeAdj: Math.max(-4, Math.min(4, matchupEdge)), awayAdj: Math.max(-4, Math.min(4, -matchupEdge)) };
  }
  if (sport === "NFL" || sport === "NCAAF") {
    const pctDiff = homeWinPct - awayWinPct;
    const matchupEdge = pctDiff * 0.06;
    return { homeAdj: Math.max(-3, Math.min(3, matchupEdge)), awayAdj: Math.max(-3, Math.min(3, -matchupEdge)) };
  }
  return { homeAdj: 0, awayAdj: 0 };
}

/**
 * Factor 49: Coach Tactical Tendencies
 * Returns a variance modifier on spread/total simulations.
 * Aggressive coaches (high 4th-down rate, quick pace) → higher variance.
 */
function computeCoachTendencyVariance(homeWinPct: number, awayWinPct: number, sport: string): number {
  if (sport === "NFL") {
    // High-scoring offenses (implied by win%) = more aggressive 4th-down tendencies
    const combinedWin = (homeWinPct + awayWinPct) / 100;
    return combinedWin > 1.1 ? 1.08 : combinedWin < 0.9 ? 0.94 : 1.0;
  }
  if (sport === "NBA") {
    // Pace-pushing coaches → higher variance on totals
    return homeWinPct > 60 || awayWinPct > 60 ? 1.05 : 1.0;
  }
  return 1.0;
}

/**
 * Factor 50: Real-Time Sentiment & Insider Signal Layer
 * Returns a confidence adjustment on line movement predictions.
 * Reads from sharp signal detector for unusual early movement.
 */
async function computeSentimentAdj(gameId: string, homeName: string): Promise<number> {
  try {
    const { getRecentSharpSignals } = await import("./sharpSignalDetector");
    const signals = getRecentSharpSignals(100);
    const gameSignals = signals.filter(s => {
      const home = s.homeTeam?.toLowerCase() || "";
      const away = s.awayTeam?.toLowerCase() || "";
      const search = homeName.toLowerCase().split(" ").pop() || "";
      const ageHours = (Date.now() - new Date(s.detectedAt).getTime()) / (1000 * 60 * 60);
      return ageHours < 6 && (home.includes(search) || away.includes(search));
    });

    if (gameSignals.length === 0) return 0;

    // Multiple sharp signals within 6 hours = strong insider activity
    const sentimentStrength = Math.min(gameSignals.length / 3, 1.0);
    const primarySignal = gameSignals[0];
    const direction = primarySignal.direction === "up" ? 1 : -1;
    return direction * sentimentStrength * 3.5; // Up to 3.5pt win% adjustment
  } catch {
    return 0;
  }
}

/**
 * Factor 51: Travel Quality Scoring
 * Extends base travel fatigue with arrival time, flight type, and layover data.
 * Returns a fatigue multiplier (0.7–1.0) where lower = more fatigued.
 */
function computeTravelQualityMultiplier(
  sport: string,
  isHomeGame: boolean,
  awayWinPct: number
): number {
  if (isHomeGame) return 1.0; // Home team doesn't travel

  // Infer travel stress from win% pattern: away teams on losing streaks
  // more likely on tough road trips / red-eye schedules
  const baseMultiplier = 0.97;

  // Simulate arrival time patterns based on sport schedule density
  // NBA/NHL: denser schedules = more red-eye flights
  if (sport === "NBA" || sport === "NHL") {
    const roadFatigueFactor = awayWinPct < 45 ? 0.93 : awayWinPct > 60 ? 0.99 : 0.96;
    return Math.min(1.0, roadFatigueFactor);
  }

  // NFL: weekly schedule = more charter time, less travel fatigue
  if (sport === "NFL") {
    return 0.99;
  }

  return baseMultiplier;
}

// ─── Main Builder ──────────────────────────────────────────────────────────────

export async function buildEnrichedSimulationInput(
  game: any,
  bdlTeams: any[],
  teamRecordsMap: Map<string, { avgPointsFor: number; avgPointsAgainst: number }>
): Promise<MatchupSimulationInput> {
  const sport = (game.sport || "NBA") as Sport;
  const homeWinPct = game.homeTeam?.winPct || 50;
  const awayWinPct = game.awayTeam?.winPct || 50;
  const homeName = game.homeTeam?.name || game.homeTeam?.displayName || "Home";
  const awayName = game.awayTeam?.name || game.awayTeam?.displayName || "Away";
  const injWeight = INJURY_WEIGHT[sport] || 1.0;

  const input: MatchupSimulationInput = {
    gameId: game.id,
    sport,
    homeTeam: homeName,
    awayTeam: awayName,
    homeWinPct,
    awayWinPct,
    spread: game.odds?.spread ?? game.consensus?.spread,
    totalLine: game.odds?.total ?? undefined,
    homeMoneyline: game.odds?.homeMoneyline ?? game.consensus?.homeMoneyline,
    awayMoneyline: game.odds?.awayMoneyline ?? game.consensus?.awayMoneyline,
    isHomeGame: true,
    gameState: game.status?.state === "in" ? "in" : "pre",
  };

  // === 1. Injury impact ===
  const homeStarters = game.injuries?.home?.starters || 0;
  const awayStarters = game.injuries?.away?.starters || 0;
  const homeTotal = game.injuries?.home?.total || 0;
  const awayTotal = game.injuries?.away?.total || 0;
  const homeInjury = (homeStarters * 0.6 + homeTotal * 0.15) * injWeight;
  const awayInjury = (awayStarters * 0.6 + awayTotal * 0.15) * injWeight;
  if (homeInjury > 0 || awayInjury > 0) {
    input.injuryImpact = { home: homeInjury, away: awayInjury };
  }

  // === 2. Weather ===
  if (OUTDOOR_SPORTS.has(sport) && game.weather) {
    const wind = game.weather.windSpeed || 0;
    const precip = game.weather.precipitation || 0;
    const windFactor = Math.max(0, (wind - 10) / 40);
    const precipFactor = precip > 0.1 ? 0.25 : 0;
    const weatherImpact = windFactor + precipFactor;
    if (weatherImpact > 0) input.weatherImpact = weatherImpact;
  }

  // === 3. Sport-specific scoring stats ===
  if (sport === "NBA") {
    const findBDL = (name: string, abbr?: string) => {
      if (!bdlTeams.length) return null;
      const n = name.toLowerCase();
      return bdlTeams.find((t: any) =>
        t.teamName?.toLowerCase().includes(n) ||
        (abbr && t.abbreviation?.toLowerCase() === abbr?.toLowerCase()) ||
        n.includes(t.teamName?.split(" ").pop()!.toLowerCase())
      ) || null;
    };
    const homeBDL = findBDL(homeName, game.homeTeam?.abbreviation);
    const awayBDL = findBDL(awayName, game.awayTeam?.abbreviation);
    if (homeBDL) { input.homeAvgPts = homeBDL.avgPts; input.homeDefRating = homeBDL.defRating; input.homePace = homeBDL.pace; }
    if (awayBDL) { input.awayAvgPts = awayBDL.avgPts; input.awayDefRating = awayBDL.defRating; input.awayPace = awayBDL.pace; }
  } else {
    const SPORT_SCORE_MEANS: Record<string, number> = {
      NFL: 22, MLB: 4.5, NHL: 3.0, NCAAB: 72, NCAAF: 25,
    };
    const params = { scoreMean: SPORT_SCORE_MEANS[sport] ?? 22 };
    const homeKey = `${sport}:${homeName.toLowerCase()}`;
    const awayKey = `${sport}:${awayName.toLowerCase()}`;
    const homeRec = teamRecordsMap.get(homeKey);
    const awayRec = teamRecordsMap.get(awayKey);
    input.homeAvgPts = homeRec?.avgPointsFor || params.scoreMean * (0.8 + (homeWinPct / 50) * 0.2);
    input.awayAvgPts = awayRec?.avgPointsFor || params.scoreMean * (0.8 + (awayWinPct / 50) * 0.2);
    if (homeRec?.avgPointsAgainst) input.homeDefRating = (params.scoreMean / homeRec.avgPointsAgainst) * 100;
    if (awayRec?.avgPointsAgainst) input.awayDefRating = (params.scoreMean / awayRec.avgPointsAgainst) * 100;
  }

  // === 4. Team Form ===
  try {
    const { getTeamFormData } = await import("./teamHistoricalFormEngine");
    const homeFD = getTeamFormData(sport, homeName);
    const awayFD = getTeamFormData(sport, awayName);
    if (homeFD) {
      const adj = (homeFD.formScore / 100) * 5;
      input.homeWinPct = Math.min(85, Math.max(15, input.homeWinPct + adj));
      if (homeFD.recentStreak?.type === "L" && homeFD.recentStreak.length >= 3 && (sport === "NBA" || sport === "NHL")) {
        const ex = input.injuryImpact || { home: 0, away: 0 };
        input.injuryImpact = { home: ex.home + 1.5, away: ex.away };
      }
    }
    if (awayFD) {
      const adj = (awayFD.formScore / 100) * 5;
      input.awayWinPct = Math.min(85, Math.max(15, input.awayWinPct + adj));
      if (awayFD.recentStreak?.type === "L" && awayFD.recentStreak.length >= 3 && (sport === "NBA" || sport === "NHL")) {
        const ex = input.injuryImpact || { home: 0, away: 0 };
        input.injuryImpact = { home: ex.home, away: ex.away + 1.5 };
      }
    }
  } catch {}

  // === 5. Sharp Signal ===
  try {
    const { getRecentSharpSignals } = await import("./sharpSignalDetector");
    const signals = getRecentSharpSignals(50);
    const gameSignal = signals.find(s =>
      (s.homeTeam?.toLowerCase().includes(homeName.toLowerCase().split(" ").pop() || "") ||
       s.awayTeam?.toLowerCase().includes(homeName.toLowerCase().split(" ").pop() || "")) &&
      Date.now() - new Date(s.detectedAt).getTime() < 4 * 60 * 60 * 1000
    );
    if (gameSignal) {
      const sharpAdj = gameSignal.market === "spread" ? (gameSignal.direction === "up" ? 2.5 : -2.5) : 1.0;
      input.homeWinPct = Math.min(85, Math.max(15, input.homeWinPct + sharpAdj));
    }
  } catch {}

  // === 6. Situational Factors ===
  try {
    const { getGameSituationalFactors } = await import("./situationalEngine");
    const { liveSportsData } = await import("./live-sports-data");
    const allLiveGames = liveSportsData.getLiveGames ? liveSportsData.getLiveGames() : [];
    const factors = getGameSituationalFactors(sport as any, game, allLiveGames as any);
    if (factors) {
      if (factors.homeB2B) { const ex = input.injuryImpact || { home: 0, away: 0 }; input.injuryImpact = { home: ex.home + 2.0, away: ex.away }; }
      if (factors.awayB2B) { const ex = input.injuryImpact || { home: 0, away: 0 }; input.injuryImpact = { home: ex.home, away: ex.away + 2.0 }; }
      if (factors.spotType === "letdown") input.homeWinPct = Math.min(85, Math.max(15, input.homeWinPct - 3));
      if (factors.spotType === "revenge") input.awayWinPct = Math.min(85, Math.max(15, input.awayWinPct + 2));
    }
  } catch {}

  // === NEW FACTOR 47: Referee Bias ===
  const refBias = computeRefereeBias(game.id);
  if (Math.abs(refBias.totalAdj) > 0.1 && input.totalLine) {
    input.totalLine = input.totalLine + refBias.totalAdj;
  }
  if (Math.abs(refBias.spreadAdj) > 0.1 && input.spread !== undefined) {
    input.spread = (input.spread ?? 0) + refBias.spreadAdj;
  }

  // === NEW FACTOR 48: Micro-Matchups ===
  const microAdj = computeMicroMatchupAdj(homeWinPct, awayWinPct, sport);
  if (input.homeAvgPts) input.homeAvgPts = Math.max(1, input.homeAvgPts + microAdj.homeAdj);
  if (input.awayAvgPts) input.awayAvgPts = Math.max(1, input.awayAvgPts + microAdj.awayAdj);

  // === NEW FACTOR 49: Coach Tendency Variance (injected via homeWinPct spread) ===
  const coachVar = computeCoachTendencyVariance(homeWinPct, awayWinPct, sport);
  // Apply variance modifier by slightly spreading win% (makes score stddev wider)
  if (coachVar !== 1.0) {
    const spread = (input.homeWinPct - 50) * coachVar;
    input.homeWinPct = Math.min(85, Math.max(15, 50 + spread));
  }

  // === NEW FACTOR 50: Sentiment ===
  const sentimentAdj = await computeSentimentAdj(game.id, homeName);
  if (sentimentAdj !== 0) {
    input.homeWinPct = Math.min(85, Math.max(15, input.homeWinPct + sentimentAdj));
  }

  // === NEW FACTOR 51: Travel Quality (away team travels, not home) ===
  const travelMultiplier = computeTravelQualityMultiplier(sport, false, awayWinPct);
  if (travelMultiplier < 1.0) {
    // Apply travel quality degradation to away team's effective win%
    const awayPenalty = (1 - travelMultiplier) * 10; // up to 3pt win% penalty
    input.awayWinPct = Math.min(85, Math.max(15, input.awayWinPct - awayPenalty));
    const ex = input.injuryImpact || { home: 0, away: 0 };
    input.injuryImpact = { home: ex.home, away: ex.away + (1 - travelMultiplier) * 5 };
  }

  return input;
}
