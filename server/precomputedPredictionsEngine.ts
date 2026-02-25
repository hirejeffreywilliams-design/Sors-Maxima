import crypto from "crypto";
import { getMultiDayScoreboard } from "./espn-scoreboard-provider";
import { generateVegasPredictions } from "./vegas-engine";
import { analyzeLeg, type MarketContext } from "./quantumFusionEngine";
import { getAllInjuries } from "./espn-injury-provider";
import { getGameSituationalFactors, type SituationalFactors } from "./situationalEngine";
import { generateMarketSnapshot, type MarketSnapshot, type LineMovementData } from "./marketSnapshotEngine";
import { isExclusivePick } from "./pickProtectionEngine";
import type { Sport } from "@shared/schema";

export interface PickReleaseSchedule {
  whaleRelease: string;
  eliteRelease: string;
  proRelease: string;
  freeRelease: string;
}

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
  reasoning: string;
  recommendation: string;
  winProbability: number;
  insights: string[];
  timing: "bet_now" | "wait" | "line_locked";
  timingAdvice: string;
  releaseSchedule: PickReleaseSchedule;
  isExclusive: boolean;
  monteCarloData?: {
    simulations: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
    homeWinProb: number;
    awayWinProb: number;
    convergenceScore: number;
  };
  situationalData?: {
    homeRestDays: number;
    awayRestDays: number;
    homeB2B: boolean;
    awayB2B: boolean;
    spotType: string;
    spotDescription: string;
  };
  injuryData?: {
    homeInjuryCount: number;
    awayInjuryCount: number;
    homeStartersOut: number;
    awayStartersOut: number;
  };
}

const FACTOR_LABELS: Record<string, string> = {
  scheme_mismatch: "Favorable Matchup",
  coaching_tendency: "Coaching Edge",
  sharp_money_flow: "Sharp Money",
  public_fade: "Contrarian Value",
  line_movement: "Line Movement",
  momentum_score: "Team Momentum",
  situational_spot: "Situational Advantage",
  historical_h2h: "Head-to-Head History",
  rest_advantage: "Rest Advantage",
  home_field: "Home Court/Field",
  tipster_consensus: "Expert Consensus",
  monte_carlo: "Simulation Model",
  predictive_model: "Predictive Model",
  player_efficiency: "Player Performance",
  scouting_data: "Scouting Report",
  pace_tempo: "Pace & Tempo",
  clutch_index: "Clutch Factor",
  strength_schedule: "Strength of Schedule",
  point_differential: "Point Differential",
  win_probability: "Win Probability Model",
  injury_adjustment: "Injury Impact",
  weather_impact: "Weather Factor",
  travel_fatigue: "Travel Fatigue",
  mental_state: "Team Mentality",
  confidence_index: "Confidence Level",
  pressure_response: "Pressure Performance",
  motivation_level: "Motivation Factor",
  team_chemistry: "Team Chemistry",
};

function humanizeFactorName(name: string): string {
  return FACTOR_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const REC_LABELS: Record<string, string> = {
  strong_bet: "Strong Bet",
  moderate_bet: "Good Bet",
  lean_bet: "Lean",
  avoid: "Risky",
  fade: "Fade",
};

interface ReasoningContext {
  homeRecord?: string;
  awayRecord?: string;
  mcSim?: { predictedHomeScore: number; predictedAwayScore: number; homeWinProb: number; simulations?: number };
  sitFactors?: SituationalFactors | null;
  homeInjuryCount?: number;
  awayInjuryCount?: number;
  homeStartersOut?: number;
  awayStartersOut?: number;
  venue?: string;
  odds?: number;
}

function buildPickReasoning(
  pick: string,
  betType: string,
  confidence: number,
  ev: number,
  factors: { name: string; impact: number; direction: string }[],
  recommendation: string,
  winProbability: number,
  homeTeam: string,
  awayTeam: string,
  ctx?: ReasoningContext,
): string {
  const parts: string[] = [];

  if (ctx?.homeRecord && ctx?.awayRecord) {
    parts.push(`${awayTeam} (${ctx.awayRecord}) @ ${homeTeam} (${ctx.homeRecord})`);
  }

  if (ctx?.mcSim) {
    const sims = ctx.mcSim.simulations || 10000;
    parts.push(`${(sims / 1000).toFixed(0)}K simulations project ${Math.round(ctx.mcSim.predictedHomeScore)}-${Math.round(ctx.mcSim.predictedAwayScore)} final`);
  }

  if (ctx?.sitFactors) {
    const sf = ctx.sitFactors;
    const restParts: string[] = [];
    if (sf.homeB2B) restParts.push(`${homeTeam} on back-to-back`);
    if (sf.awayB2B) restParts.push(`${awayTeam} on back-to-back`);
    if (!sf.homeB2B && !sf.awayB2B && Math.abs(sf.homeRestDays - sf.awayRestDays) >= 2) {
      const rested = sf.homeRestDays > sf.awayRestDays ? homeTeam : awayTeam;
      const tired = sf.homeRestDays > sf.awayRestDays ? awayTeam : homeTeam;
      const restedDays = Math.max(sf.homeRestDays, sf.awayRestDays);
      const tiredDays = Math.min(sf.homeRestDays, sf.awayRestDays);
      restParts.push(`${rested} with ${restedDays} days rest vs ${tired} with ${tiredDays}`);
    }
    if (sf.spotType !== "normal") {
      restParts.push(sf.spotDescription);
    }
    if (restParts.length > 0) parts.push(restParts.join("; "));
  }

  if (ctx && (ctx.homeStartersOut || 0) + (ctx.awayStartersOut || 0) > 0) {
    const homeOut = ctx.homeStartersOut || 0;
    const awayOut = ctx.awayStartersOut || 0;
    if (awayOut > homeOut && awayOut >= 2) {
      parts.push(`${awayOut} starters out for ${awayTeam} shifts matchup`);
    } else if (homeOut > awayOut && homeOut >= 2) {
      parts.push(`${homeOut} starters out for ${homeTeam} shifts matchup`);
    }
  }

  if (betType === "moneyline") {
    const team = pick.replace(" ML", "").trim();
    const impliedProb = ctx?.odds ? (ctx.odds < 0 ? Math.abs(ctx.odds) / (Math.abs(ctx.odds) + 100) * 100 : 100 / (ctx.odds + 100) * 100) : 0;
    if (impliedProb > 0 && Math.abs(winProbability - impliedProb) >= 3) {
      parts.push(`Model estimates ${winProbability}% win probability vs ${Math.round(impliedProb)}% implied by odds = +${Math.round(winProbability - impliedProb)}% edge`);
    } else {
      parts.push(`${team} at ${winProbability}% model-projected win probability`);
    }
  } else if (betType === "spread") {
    if (ev > 3) {
      parts.push(`Spread offers strong value with +${ev.toFixed(1)}% expected edge`);
    } else {
      parts.push(`Spread line is favorable based on projected scoring`);
    }
  } else if (betType === "total") {
    const isOver = pick.toLowerCase().includes("over");
    if (isOver) {
      parts.push(`Pace and scoring trends suggest this game goes over the total`);
    } else {
      parts.push(`Defensive matchup and tempo point to this game staying under`);
    }
  }

  const bullishFactors = factors
    .filter(f => f.direction === "bullish" && f.impact >= 50)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 2);
  if (bullishFactors.length > 0) {
    const primary = humanizeFactorName(bullishFactors[0].name);
    const secondary = bullishFactors.length > 1 ? ` + ${humanizeFactorName(bullishFactors[1].name).toLowerCase()}` : "";
    parts.push(`PRIMARY EDGE: ${primary}${secondary}`);
  }

  return parts.join(" — ");
}

export interface PrecomputedSnapshot {
  picks: PrecomputedPick[];
  generatedAt: string;
  dataSource: "live" | "cached";
  sport: string;
  gamesAnalyzed: number;
  nextRefresh: string;
  exclusivePickCount: number;
  totalPickPool: number;
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

function buildReleaseSchedule(generatedAt: string): PickReleaseSchedule {
  const genTime = new Date(generatedAt).getTime();
  return {
    whaleRelease: generatedAt,
    eliteRelease: new Date(genTime + 15 * 60 * 1000).toISOString(),
    proRelease: new Date(genTime + 30 * 60 * 1000).toISOString(),
    freeRelease: new Date(genTime + 60 * 60 * 1000).toISOString(),
  };
}

let engineRunning = false;
let lastRunTime: number | null = null;
let totalRuns = 0;
let failedRuns = 0;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function determinePickTiming(
  gameTime: string | undefined,
  lineMovements: LineMovementData[],
  ev: number,
): { timing: "bet_now" | "wait" | "line_locked"; timingAdvice: string } {
  const now = Date.now();
  const gameDate = gameTime ? new Date(gameTime).getTime() : 0;
  const hoursUntilGame = gameDate > 0 ? (gameDate - now) / (1000 * 60 * 60) : 12;

  const hasSteam = lineMovements.some(lm => lm.velocity === "steam");
  const hasSharp = lineMovements.some(lm => lm.sharpAction);
  const isStable = lineMovements.length === 0 ||
    lineMovements.every(lm => lm.velocity === "slow" || lm.direction === "stable");

  if (hasSteam) {
    const steamMove = lineMovements.find(lm => lm.velocity === "steam");
    return {
      timing: "bet_now",
      timingAdvice: `Bet now — steam move detected${steamMove ? ` on ${steamMove.market} (${steamMove.opening} → ${steamMove.current})` : ""}, value disappearing fast`,
    };
  }

  if (hoursUntilGame < 6) {
    return {
      timing: "line_locked",
      timingAdvice: `Line locked — game starts in ${hoursUntilGame < 1 ? "under an hour" : `${Math.round(hoursUntilGame)}h`}, not much more movement expected`,
    };
  }

  if (hoursUntilGame > 24 && hasSharp) {
    return {
      timing: "bet_now",
      timingAdvice: "Bet now — sharp money detected, line will move away from current value",
    };
  }

  if (hoursUntilGame > 24 && isStable) {
    return {
      timing: "wait",
      timingAdvice: "Wait — line opened stable with no sharp action, may settle to better value by game time",
    };
  }

  if (hasSharp) {
    return {
      timing: "bet_now",
      timingAdvice: "Bet now — sharp action detected, grab current value before line adjusts",
    };
  }

  if (ev > 5 && hoursUntilGame > 6) {
    return {
      timing: "bet_now",
      timingAdvice: `Bet now — strong +${ev.toFixed(1)}% edge available, don't risk line movement eroding value`,
    };
  }

  if (isStable && hoursUntilGame > 12) {
    return {
      timing: "wait",
      timingAdvice: "Wait — line is stable and game is not imminent, monitor for better entry",
    };
  }

  return {
    timing: "bet_now",
    timingAdvice: "Bet now — current odds offer solid value at this price point",
  };
}

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

  let marketData: MarketSnapshot | null = null;
  try {
    marketData = await generateMarketSnapshot(sport);
  } catch {
    console.log(`[PrecomputedEngine] Market snapshot unavailable for ${sport}`);
  }

  const picks: PrecomputedPick[] = [];
  const now = new Date().toISOString();

  let allInjuries: Record<string, any[]> = {};
  try {
    allInjuries = getAllInjuries();
  } catch {}

  const sportInjuries = allInjuries[sport] || allInjuries[sport.toLowerCase()] || [];

  for (const game of upcomingGames.slice(0, 15)) {
    const homeName = game.homeTeam?.displayName || "Home";
    const awayName = game.awayTeam?.displayName || "Away";
    const homeRecord = game.homeTeam?.record || "";
    const awayRecord = game.awayTeam?.record || "";
    const homeAbbr = game.homeTeam?.abbreviation || "";
    const awayAbbr = game.awayTeam?.abbreviation || "";

    const parseWinPct = (record: string) => {
      if (!record) return 0.5;
      const parts = record.split("-");
      const wins = parseFloat(parts[0]);
      const losses = parseFloat(parts[1]);
      return (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
    };

    const homeWinPct = parseWinPct(homeRecord);
    const awayWinPct = parseWinPct(awayRecord);

    let homeInjuryCount = 0, awayInjuryCount = 0;
    let homeStartersOut = 0, awayStartersOut = 0;
    for (const inj of sportInjuries) {
      const teamName = (inj.team || "").toLowerCase();
      const isHome = teamName.includes(homeName.toLowerCase().split(" ").pop() || "") || teamName.includes(homeAbbr.toLowerCase());
      const isAway = teamName.includes(awayName.toLowerCase().split(" ").pop() || "") || teamName.includes(awayAbbr.toLowerCase());
      const count = inj.injuries?.length || 0;
      const starters = (inj.injuries || []).filter((i: any) => i.status === "Out" || i.status === "Doubtful").length;
      if (isHome) { homeInjuryCount += count; homeStartersOut += starters; }
      if (isAway) { awayInjuryCount += count; awayStartersOut += starters; }
    }

    let sitFactors: SituationalFactors | null = null;
    try {
      sitFactors = getGameSituationalFactors(sport, game, games);
    } catch {}

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
          injuryImpact: { home: homeStartersOut * 0.03, away: awayStartersOut * 0.03 },
        });
      }
    } catch {}

    const marketCtx: MarketContext = {
      winPct: { home: homeWinPct, away: awayWinPct },
      homeRecord,
      awayRecord,
      injuryCount: { home: homeInjuryCount, away: awayInjuryCount },
      startersOut: { home: homeStartersOut, away: awayStartersOut },
      homeMoneyline: game.odds?.homeMoneyline || undefined,
      awayMoneyline: game.odds?.awayMoneyline || undefined,
      spreadLine: game.odds?.spread || undefined,
      totalLine: game.odds?.total || undefined,
      venue: game.venue || undefined,
      restDays: sitFactors ? { home: sitFactors.homeRestDays, away: sitFactors.awayRestDays } : undefined,
      homeB2B: sitFactors?.homeB2B,
      awayB2B: sitFactors?.awayB2B,
      situationalSpot: sitFactors ? { spotType: sitFactors.spotType, spotDescription: sitFactors.spotDescription } : undefined,
    };

    if (mcSim) {
      marketCtx.mcSimulation = {
        homeWinProb: mcSim.homeWinProb,
        awayWinProb: mcSim.awayWinProb,
        predictedHomeScore: mcSim.predictedHomeScore,
        predictedAwayScore: mcSim.predictedAwayScore,
        convergenceScore: mcSim.convergenceScore || 1.0,
        simulations: mcSim.simulations || 10000,
      };
    }

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

    const marketGame = marketData?.games.find(mg => mg.id === game.id);
    const gameLineMovements: LineMovementData[] = marketGame?.lineMovement || [];

    const underdogName = favoriteIsHome ? awayName : homeName;
    const underdogMlOdds = favoriteIsHome
      ? Math.round(100 + (homeWinPct - 0.5) * 400)
      : Math.round(-100 - (0.5 - homeWinPct) * 400);

    const marketSpread = marketGame?.consensus?.spread;
    const marketTotal = marketGame?.consensus?.total;
    const actualSpread = marketSpread != null ? marketSpread : spreadEstimate;
    const actualTotal = marketTotal != null ? marketTotal : totalEstimate;

    const actualHomeML = marketGame?.consensus?.homeMoneyline || (favoriteIsHome ? mlOdds : underdogMlOdds);
    const actualAwayML = marketGame?.consensus?.awayMoneyline || (favoriteIsHome ? underdogMlOdds : mlOdds);
    const actualOverOdds = marketGame?.bookmakers?.[0]?.overPrice || -110;
    const actualUnderOdds = marketGame?.bookmakers?.[0]?.underPrice || -110;
    const actualSpreadHomeOdds = marketGame?.bookmakers?.[0]?.spreadHome || -110;
    const actualSpreadAwayOdds = marketGame?.bookmakers?.[0]?.spreadAway || -110;

    const betOptions = [
      { pick: `${favName} ML`, betType: "moneyline", odds: favoriteIsHome ? actualHomeML : actualAwayML, desc: `${favName} Moneyline` },
      { pick: `${underdogName} ML`, betType: "moneyline", odds: favoriteIsHome ? actualAwayML : actualHomeML, desc: `${underdogName} Moneyline` },
      { pick: `${homeName} ${actualSpread > 0 ? "+" : ""}${actualSpread}`, betType: "spread", odds: actualSpreadHomeOdds, desc: `${homeName} Spread ${actualSpread}` },
      { pick: `${awayName} ${actualSpread > 0 ? "-" : "+"}${Math.abs(actualSpread)}`, betType: "spread", odds: actualSpreadAwayOdds, desc: `${awayName} Spread ${actualSpread > 0 ? "-" : "+"}${Math.abs(actualSpread)}` },
      { pick: `Over ${actualTotal}`, betType: "total", odds: actualOverOdds, desc: `Over ${actualTotal}` },
      { pick: `Under ${actualTotal}`, betType: "total", odds: actualUnderOdds, desc: `Under ${actualTotal}` },
    ];

    for (const bet of betOptions) {
      const fusion = analyzeLeg(sport, bet.desc, bet.odds, {
        hasRealOdds: !!(game.odds?.homeMoneyline),
        gameId: game.id,
        bookmakerCount: game.bookmakers?.length || 0,
        oddsSource: game.odds?.homeMoneyline ? "ESPN" : "model-estimated",
      }, marketCtx);
      let confidence = Math.min(92, Math.max(30, fusion.confidence));

      if (mcSim) {
        let mcConfBoost = 0;
        if (bet.betType === "moneyline") {
          const isFavPick = bet.pick.includes(favName);
          const pickWinProb = isFavPick
            ? (favoriteIsHome ? mcSim.homeWinProb : mcSim.awayWinProb)
            : (favoriteIsHome ? mcSim.awayWinProb : mcSim.homeWinProb);
          mcConfBoost = Math.round((pickWinProb - 0.5) * 20);
        } else if (bet.betType === "spread") {
          const predictedMargin = mcSim.predictedHomeScore - mcSim.predictedAwayScore;
          const spreadLine = actualSpread;
          const coverMargin = bet.pick.includes(homeName)
            ? predictedMargin + spreadLine
            : -predictedMargin + spreadLine;
          mcConfBoost = Math.min(15, Math.max(-10, Math.round(coverMargin * 2)));
        } else if (bet.betType === "total") {
          const predictedTotal = mcSim.predictedHomeScore + mcSim.predictedAwayScore;
          const totalLine = actualTotal;
          const diff = bet.pick.toLowerCase().includes("over")
            ? predictedTotal - totalLine
            : totalLine - predictedTotal;
          mcConfBoost = Math.min(15, Math.max(-10, Math.round(diff * 1.5)));
        }
        confidence = Math.min(95, Math.max(25, confidence + mcConfBoost));
      }

      const impliedProb = bet.odds < 0 ? Math.abs(bet.odds) / (Math.abs(bet.odds) + 100) : 100 / (bet.odds + 100);
      const trueProb = confidence / 100;
      const ev = ((trueProb * (1 / impliedProb - 1)) - (1 - trueProb)) * 100;

      const mappedFactors = (fusion.signals || []).slice(0, 5).map(s => ({ name: s.source, impact: s.strength, direction: s.direction || "neutral" }));
      const evRounded = Math.round(ev * 100) / 100;
      const rec = fusion.recommendation || "lean_bet";
      const winProb = fusion.winProbability || Math.round(confidence * 0.95);

      const betLineMovements = gameLineMovements.filter(lm =>
        lm.market.toLowerCase().includes(bet.betType) ||
        (bet.betType === "moneyline" && lm.market.toLowerCase().includes("h2h")) ||
        (bet.betType === "spread" && lm.market.toLowerCase().includes("spread")) ||
        (bet.betType === "total" && (lm.market.toLowerCase().includes("total") || lm.market.toLowerCase().includes("over")))
      );
      const relevantMovements = betLineMovements.length > 0 ? betLineMovements : gameLineMovements;
      const pickTiming = determinePickTiming(game.date, relevantMovements, evRounded);

      picks.push({
        id: `precomp-${sport}-${game.id}-${bet.betType}-${crypto.randomUUID().slice(0, 8)}`,
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
        ev: evRounded,
        factors: mappedFactors,
        generatedAt: now,
        dataSource,
        gameTime: game.date,
        reasoning: buildPickReasoning(bet.pick, bet.betType, confidence, evRounded, mappedFactors, rec, winProb, homeName, awayName, {
          homeRecord, awayRecord, mcSim, sitFactors, homeInjuryCount, awayInjuryCount, homeStartersOut, awayStartersOut, venue: game.venue, odds: bet.odds,
        }),
        recommendation: rec,
        winProbability: winProb,
        insights: (fusion.insights || []).slice(0, 3),
        timing: pickTiming.timing,
        timingAdvice: pickTiming.timingAdvice,
        releaseSchedule: buildReleaseSchedule(now),
        isExclusive: isExclusivePick({ confidence, edge: Math.round(ev * 10) / 10, grade: gradeFromConfidence(confidence) }),
        monteCarloData: mcSim ? {
          simulations: mcSim.simulations || 10000,
          predictedHomeScore: Math.round(mcSim.predictedHomeScore * 10) / 10,
          predictedAwayScore: Math.round(mcSim.predictedAwayScore * 10) / 10,
          homeWinProb: Math.round(mcSim.homeWinProb * 1000) / 10,
          awayWinProb: Math.round(mcSim.awayWinProb * 1000) / 10,
          convergenceScore: Math.round((mcSim.convergenceScore || 1) * 100) / 100,
        } : undefined,
        situationalData: sitFactors ? {
          homeRestDays: sitFactors.homeRestDays,
          awayRestDays: sitFactors.awayRestDays,
          homeB2B: sitFactors.homeB2B,
          awayB2B: sitFactors.awayB2B,
          spotType: sitFactors.spotType,
          spotDescription: sitFactors.spotDescription,
        } : undefined,
        injuryData: (homeInjuryCount + awayInjuryCount > 0) ? {
          homeInjuryCount,
          awayInjuryCount,
          homeStartersOut,
          awayStartersOut,
        } : undefined,
      });
    }
  }

  for (const vp of vegasPicks) {
    const vpMarketCtx: MarketContext = {
      winPct: vp.homeWinPct && vp.awayWinPct ? { home: vp.homeWinPct / 100, away: vp.awayWinPct / 100 } : undefined,
      homeMoneyline: vp.homeMoneyline || undefined,
      awayMoneyline: vp.awayMoneyline || undefined,
    };
    const fusion = analyzeLeg(sport, vp.description || vp.game, vp.odds || -110, { hasRealOdds: !!vp.hasRealOdds }, vpMarketCtx);
    const confidence = Math.min(92, Math.max(30, fusion.confidence));
    const impliedProb = (vp.odds || -110) < 0 ? Math.abs(vp.odds || -110) / (Math.abs(vp.odds || -110) + 100) : 100 / ((vp.odds || -110) + 100);
    const trueProb = confidence / 100;
    const ev = ((trueProb * (1 / impliedProb - 1)) - (1 - trueProb)) * 100;

    const vpFactors = (fusion.signals || []).slice(0, 5).map(s => ({ name: s.source, impact: s.strength, direction: s.direction || "neutral" }));
    const vpEvRounded = Math.round(ev * 100) / 100;
    const vpRec = fusion.recommendation || "lean_bet";
    const vpWinProb = fusion.winProbability || Math.round(confidence * 0.95);
    const vpPick = vp.pick || vp.description || "";
    const vpBetType = vp.betType || "moneyline";

    const vpTiming = determinePickTiming(vp.gameTime, [], vpEvRounded);

    picks.push({
      id: `precomp-vegas-${sport}-${crypto.randomUUID().slice(0, 12)}`,
      sport,
      game: vp.game || "Unknown",
      homeTeam: vp.homeTeam || "",
      awayTeam: vp.awayTeam || "",
      pick: vpPick,
      betType: vpBetType,
      odds: vp.odds || -110,
      confidence,
      grade: gradeFromConfidence(confidence),
      edge: Math.round(ev * 10) / 10,
      ev: vpEvRounded,
      factors: vpFactors,
      generatedAt: now,
      dataSource,
      gameTime: vp.gameTime,
      reasoning: buildPickReasoning(vpPick, vpBetType, confidence, vpEvRounded, vpFactors, vpRec, vpWinProb, vp.homeTeam || "", vp.awayTeam || ""),
      recommendation: vpRec,
      winProbability: vpWinProb,
      insights: (fusion.insights || []).slice(0, 3),
      timing: vpTiming.timing,
      timingAdvice: vpTiming.timingAdvice,
      releaseSchedule: buildReleaseSchedule(now),
      isExclusive: isExclusivePick({ confidence, edge: Math.round(ev * 10) / 10, grade: gradeFromConfidence(confidence) }),
    });
  }

  picks.sort((a, b) => b.confidence - a.confidence);
  const dedupedPicks = picks.reduce((acc: PrecomputedPick[], pick) => {
    const key = `${pick.game}-${pick.pick}`;
    if (!acc.find(p => `${p.game}-${p.pick}` === key)) acc.push(pick);
    return acc;
  }, []);

  const finalPicks = dedupedPicks.slice(0, 50);
  const exclusiveCount = finalPicks.filter(p => p.isExclusive).length;

  const snapshot: PrecomputedSnapshot = {
    picks: finalPicks,
    generatedAt: now,
    dataSource,
    sport,
    gamesAnalyzed: upcomingGames.length,
    nextRefresh: new Date(Date.now() + REFRESH_INTERVAL).toISOString(),
    exclusivePickCount: exclusiveCount,
    totalPickPool: finalPicks.length,
  };

  predictionCache.set(sport, { snapshot, timestamp: Date.now(), sport });
  return snapshot;
}

async function runPredictionCycle(): Promise<void> {
  const { getInSeasonSports } = await import("./sportSeasons");
  const sports = getInSeasonSports();
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

export interface OptimalTicketLeg {
  id: string;
  pickId: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  americanOdds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  reasoning: string;
  winProbability: number;
  factors: { name: string; impact: number; direction: string }[];
  monteCarloData?: PrecomputedPick["monteCarloData"];
  situationalData?: PrecomputedPick["situationalData"];
  injuryData?: PrecomputedPick["injuryData"];
  timing: PrecomputedPick["timing"];
  timingAdvice: string;
  sport: string;
  gameTime?: string;
}

export interface OptimalTicket {
  id: string;
  name: string;
  legs: OptimalTicketLeg[];
  totalOdds: number;
  americanOdds: number;
  combinedGrade: string;
  combinedConfidence: number;
  combinedEV: number;
  winProbability: number;
  recommendedStake: number;
  potentialPayout: number;
  riskRating: "low" | "medium" | "high";
  reasoning: string;
  sports: string[];
  engineConvergence: {
    quantumFusion: boolean;
    monteCarlo: boolean;
    situational: boolean;
    injury: boolean;
    vegas: boolean;
    market: boolean;
  };
  generatedAt: string;
}

function americanToDecimal(american: number): number {
  if (american > 0) return (american / 100) + 1;
  return (-100 / american) + 1;
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

function pickToLeg(pick: PrecomputedPick): OptimalTicketLeg {
  const dec = americanToDecimal(pick.odds);
  return {
    id: crypto.randomUUID(),
    pickId: pick.id,
    team: pick.homeTeam,
    opponent: pick.awayTeam,
    market: pick.betType,
    outcome: pick.pick,
    americanOdds: pick.odds,
    decimalOdds: dec,
    confidence: pick.confidence,
    grade: pick.grade,
    edge: pick.edge,
    ev: pick.ev,
    reasoning: pick.reasoning,
    winProbability: pick.winProbability,
    factors: pick.factors,
    monteCarloData: pick.monteCarloData,
    situationalData: pick.situationalData,
    injuryData: pick.injuryData,
    timing: pick.timing,
    timingAdvice: pick.timingAdvice,
    sport: pick.sport,
    gameTime: pick.gameTime,
  };
}

function gradeToScore(grade: string): number {
  const scores: Record<string, number> = { "A+": 10, "A": 9, "A-": 8, "B+": 7, "B": 6, "B-": 5, "C+": 4, "C": 3, "C-": 2, "D": 1 };
  return scores[grade] || 3;
}

function scoreToGrade(score: number): string {
  if (score >= 9.5) return "A+";
  if (score >= 8.5) return "A";
  if (score >= 7.5) return "A-";
  if (score >= 6.5) return "B+";
  if (score >= 5.5) return "B";
  if (score >= 4.5) return "B-";
  if (score >= 3.5) return "C+";
  if (score >= 2.5) return "C";
  return "C-";
}

function hasConflict(a: PrecomputedPick, b: PrecomputedPick): boolean {
  if (a.game !== b.game) return false;
  if (a.betType === "moneyline" && b.betType === "moneyline") return true;
  if (a.betType === "spread" && b.betType === "spread") return true;
  if (a.betType === "total" && b.betType === "total") {
    const aIsOver = a.pick.toLowerCase().includes("over");
    const bIsOver = b.pick.toLowerCase().includes("over");
    return aIsOver === bIsOver ? false : true;
  }
  return false;
}

function buildTicketReasoning(legs: OptimalTicketLeg[]): string {
  const parts: string[] = [];

  const avgConf = legs.reduce((s, l) => s + l.confidence, 0) / legs.length;
  const avgEV = legs.reduce((s, l) => s + l.ev, 0) / legs.length;
  const mcLegs = legs.filter(l => l.monteCarloData);
  const sitLegs = legs.filter(l => l.situationalData);
  const injLegs = legs.filter(l => l.injuryData);

  if (avgConf > 70) parts.push(`High confidence ticket averaging ${Math.round(avgConf)}% across ${legs.length} legs`);
  else parts.push(`${legs.length}-leg parlay with ${Math.round(avgConf)}% avg confidence`);

  if (avgEV > 3) parts.push(`Strong combined edge at +${avgEV.toFixed(1)}% EV`);
  else if (avgEV > 0) parts.push(`Positive expected value at +${avgEV.toFixed(1)}% EV`);

  if (mcLegs.length > 0) parts.push(`${mcLegs.length}/${legs.length} legs backed by Monte Carlo simulations`);
  if (sitLegs.length > 0) parts.push(`situational advantages identified in ${sitLegs.length} matchups`);
  if (injLegs.length > 0) parts.push(`injury analysis factored into ${injLegs.length} games`);

  const topFactors = new Map<string, number>();
  for (const leg of legs) {
    for (const f of leg.factors.slice(0, 2)) {
      topFactors.set(f.name, (topFactors.get(f.name) || 0) + Math.abs(f.impact));
    }
  }
  const sortedFactors = Array.from(topFactors.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (sortedFactors.length > 0) {
    const factorNames = sortedFactors.map(([name]) => humanizeFactorName(name)).join(", ");
    parts.push(`Key drivers: ${factorNames}`);
  }

  return parts.join(". ") + ".";
}

export function buildOptimalTickets(options: {
  sports: string[];
  riskLevel: string;
  bankroll: number;
  maxLegs: number;
  dateFilter?: "today" | "future" | "all";
}): OptimalTicket[] {
  const { sports, riskLevel, bankroll, maxLegs, dateFilter = "all" } = options;

  const allPicks: PrecomputedPick[] = [];
  for (const sport of sports) {
    const cached = predictionCache.get(sport as Sport);
    if (cached?.snapshot?.picks) {
      allPicks.push(...cached.snapshot.picks);
    }
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const eligible = allPicks
    .filter(p => {
      const gs = gradeToScore(p.grade);
      if (!(gs >= 5 && p.ev > 0 && p.confidence >= 50 && p.recommendation !== "fade" && p.recommendation !== "avoid")) return false;

      if (dateFilter !== "all" && p.gameTime) {
        const gameDate = new Date(p.gameTime);
        if (dateFilter === "today") {
          return gameDate >= todayStart && gameDate < todayEnd;
        } else if (dateFilter === "future") {
          return gameDate >= todayEnd;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = gradeToScore(a.grade) * 2 + a.ev + a.confidence / 20 + a.edge;
      const scoreB = gradeToScore(b.grade) * 2 + b.ev + b.confidence / 20 + b.edge;
      return scoreB - scoreA;
    });

  if (eligible.length < 2) return [];

  const legRanges: Record<string, [number, number]> = {
    conservative: [2, 3],
    moderate: [3, 4],
    aggressive: [4, 6],
  };
  const [minLegs, maxLegsForRisk] = legRanges[riskLevel] || [3, 4];
  const targetLegs = Math.min(Math.min(maxLegsForRisk, maxLegs), eligible.length);

  const tickets: OptimalTicket[] = [];
  const usedPickSets = new Set<string>();

  const ticketCount = Math.min(6, Math.floor(eligible.length / minLegs));

  for (let t = 0; t < Math.max(ticketCount, 3); t++) {
    const ticketLegs: PrecomputedPick[] = [];
    const usedGames = new Set<string>();
    const legTarget = Math.min(targetLegs, minLegs + (t % (maxLegsForRisk - minLegs + 1)));

    for (const pick of eligible) {
      if (ticketLegs.length >= legTarget) break;
      if (usedGames.has(pick.game)) continue;

      let hasConflictWithExisting = false;
      for (const existing of ticketLegs) {
        if (hasConflict(pick, existing)) {
          hasConflictWithExisting = true;
          break;
        }
      }
      if (hasConflictWithExisting) continue;

      const key = `${t}-${pick.id}`;
      if (usedPickSets.has(pick.id) && t > 0 && ticketLegs.length > 0) {
        const alternatives = eligible.filter(p =>
          !usedGames.has(p.game) &&
          !ticketLegs.some(tl => hasConflict(p, tl)) &&
          p.id !== pick.id
        );
        if (alternatives.length > t) {
          const alt = alternatives[t % alternatives.length];
          ticketLegs.push(alt);
          usedGames.add(alt.game);
          usedPickSets.add(alt.id);
          continue;
        }
      }

      ticketLegs.push(pick);
      usedGames.add(pick.game);
      usedPickSets.add(pick.id);
    }

    if (ticketLegs.length < minLegs) continue;

    const legs = ticketLegs.map(pickToLeg);
    const totalOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
    const totalAmerican = decimalToAmerican(totalOdds);
    const avgGradeScore = legs.reduce((s, l) => s + gradeToScore(l.grade), 0) / legs.length;
    const combinedGrade = scoreToGrade(avgGradeScore);
    const combinedConf = legs.reduce((s, l) => s + l.confidence, 0) / legs.length;
    const combinedEV = legs.reduce((s, l) => s + l.ev, 0) / legs.length;
    const winProb = legs.reduce((acc, l) => acc * (l.winProbability / 100), 1);

    const kellyEdge = (winProb * totalOdds - 1) / (totalOdds - 1);
    const kellyFraction = Math.max(0, kellyEdge) * 0.25;
    const stake = Math.max(5, Math.round(bankroll * Math.min(kellyFraction, 0.05)));
    const payout = Math.round(stake * totalOdds * 100) / 100;

    const riskRating: "low" | "medium" | "high" =
      legs.length <= 2 ? "low" : legs.length <= 4 ? "medium" : "high";

    const ticketSports = Array.from(new Set(legs.map(l => l.sport)));

    const hasMC = legs.some(l => l.monteCarloData);
    const hasSit = legs.some(l => l.situationalData);
    const hasInj = legs.some(l => l.injuryData);
    const hasFactors = legs.every(l => l.factors.length > 0);

    const names = [
      "Alpha", "Quantum", "Precision", "Edge", "Prime", "Apex",
      "Fusion", "Catalyst", "Nexus", "Pinnacle", "Elite", "Titan",
    ];
    const riskLabel = riskLevel === "conservative" ? "Safe" : riskLevel === "aggressive" ? "Power" : "Smart";
    const ticketName = `${riskLabel} ${names[t % names.length]} ${legs.length}-Leg`;

    tickets.push({
      id: `optimal-${crypto.randomUUID().slice(0, 8)}`,
      name: ticketName,
      legs,
      totalOdds: Math.round(totalOdds * 100) / 100,
      americanOdds: totalAmerican,
      combinedGrade,
      combinedConfidence: Math.round(combinedConf * 10) / 10,
      combinedEV: Math.round(combinedEV * 10) / 10,
      winProbability: Math.round(winProb * 10000) / 100,
      recommendedStake: stake,
      potentialPayout: payout,
      riskRating,
      reasoning: buildTicketReasoning(legs),
      sports: ticketSports,
      engineConvergence: {
        quantumFusion: hasFactors,
        monteCarlo: hasMC,
        situational: hasSit,
        injury: hasInj,
        vegas: true,
        market: true,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  return tickets
    .sort((a, b) => {
      const scoreA = gradeToScore(a.combinedGrade) * 3 + a.combinedEV + a.combinedConfidence / 10;
      const scoreB = gradeToScore(b.combinedGrade) * 3 + b.combinedEV + b.combinedConfidence / 10;
      return scoreB - scoreA;
    })
    .slice(0, 6);
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
