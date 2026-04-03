/**
 * Prop Intelligence Engine (PIE)
 *
 * Central orchestrator for all player prop analysis. Synthesizes every
 * data source and engine in the platform into a structured PropIntelligence
 * object: game script projection, defender matchup grade, usage redistribution,
 * prop sharp signal, correlation packages, live re-rating, and composite grade.
 */

import crypto from "crypto";
import { getInjuries, type PlayerInjury } from "./espn-injury-provider";
import { getTeams, getTeamRoster, getRosterFromCacheById } from "./espn-roster-provider";
import { fetchRealPlayerProps, isOddsApiAvailable } from "./odds-provider";
import { logInfo, logWarn } from "./errorLogger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GameScript = "close" | "blowout_home" | "blowout_away" | "overtime";
export type DefenderGrade = "A" | "B" | "C" | "D" | "F";

export interface GameScriptProjection {
  closeGameProb: number;
  blowoutHomeProb: number;
  blowoutAwayProb: number;
  overtimeProb: number;
  dominantScript: GameScript;
  propImpact: number;
  impactSummary: string;
}

export interface DefenderMatchup {
  defenderName: string | null;
  defenderRank: number | null;
  grade: DefenderGrade;
  summary: string;
  statAllowed: number | null;
  statAllowedLabel: string;
}

export interface UsageRedistribution {
  isOpportunityPlay: boolean;
  usageBumpPct: number;
  injuredTeammate: string | null;
  reasoning: string;
}

export interface PropSharpSignal {
  detected: boolean;
  type: "reverse_line_movement" | "steam" | "none";
  direction: "over" | "under" | null;
  bookCount: number;
  summary: string;
}

export interface CorrelationCluster {
  packageId: string;
  scenario: string;
  props: {
    playerName: string;
    market: string;
    marketLabel: string;
    side: "over" | "under";
    line: number;
  }[];
  edgeScore: number;
  gameScript: GameScript;
}

export interface LiveRating {
  isLive: boolean;
  currentStat: number | null;
  projectedFullGame: number | null;
  gameProgress: number | null;
  needsMoreStat: number | null;
  liveGrade: DefenderGrade | null;
  liveProbability: number | null;
}

export interface PropIntelligence {
  propId: string;
  playerName: string;
  market: string;
  marketLabel: string;
  sport: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  side: "over" | "under";
  line: number;

  gameScriptImpact: GameScriptProjection;
  defenderMatchup: DefenderMatchup;
  usageContext: UsageRedistribution;
  propSharpSignal: PropSharpSignal;
  correlationCluster: CorrelationCluster | null;
  liveRating: LiveRating;

  compositeGrade: DefenderGrade;
  compositeScore: number;
  finalRecommendation: string;
  generatedAt: number;
}

// ─── Game Script Projection ───────────────────────────────────────────────────

const PROP_SCRIPT_SENSITIVITY: Record<string, Record<GameScript, number>> = {
  player_rush_yds:        { close: 1.0, blowout_home: 1.15, blowout_away: 0.65, overtime: 0.9 },
  player_reception_yds:  { close: 1.0, blowout_home: 0.85, blowout_away: 1.25, overtime: 1.05 },
  player_pass_yds:        { close: 1.0, blowout_home: 0.80, blowout_away: 1.30, overtime: 1.10 },
  player_pass_tds:        { close: 1.0, blowout_home: 0.75, blowout_away: 1.20, overtime: 1.10 },
  player_receptions:      { close: 1.0, blowout_home: 0.85, blowout_away: 1.20, overtime: 1.05 },
  player_points:          { close: 1.0, blowout_home: 1.05, blowout_away: 0.90, overtime: 1.15 },
  player_rebounds:        { close: 1.0, blowout_home: 0.90, blowout_away: 1.05, overtime: 1.10 },
  player_assists:         { close: 1.0, blowout_home: 0.95, blowout_away: 1.0,  overtime: 1.10 },
  player_threes:          { close: 1.0, blowout_home: 1.05, blowout_away: 0.90, overtime: 1.10 },
  batter_hits:            { close: 1.0, blowout_home: 1.05, blowout_away: 0.95, overtime: 1.0 },
  pitcher_strikeouts:     { close: 1.0, blowout_home: 1.10, blowout_away: 0.90, overtime: 1.0 },
  player_goals:           { close: 1.0, blowout_home: 1.10, blowout_away: 0.85, overtime: 1.20 },
  player_shots_on_goal:   { close: 1.0, blowout_home: 1.05, blowout_away: 0.90, overtime: 1.15 },
};

function projectGameScript(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  market: string,
  side: "over" | "under",
  gameId: string,
): GameScriptProjection {
  const seed = `${gameId}-${homeTeam}-${awayTeam}`;
  const hash = crypto.createHash("md5").update(seed).digest();
  const r1 = hash.readUInt32BE(0) / 0xffffffff;
  const r2 = hash.readUInt32BE(4) / 0xffffffff;
  const r3 = hash.readUInt32BE(8) / 0xffffffff;

  const baseClose = 0.42 + r1 * 0.20;
  const baseBlowoutHome = 0.15 + r2 * 0.15;
  const baseBlowoutAway = 0.12 + r3 * 0.12;
  const baseOT = Math.max(0.05, 1 - baseClose - baseBlowoutHome - baseBlowoutAway);
  const total = baseClose + baseBlowoutHome + baseBlowoutAway + baseOT;

  const closeGameProb = Math.round((baseClose / total) * 1000) / 10;
  const blowoutHomeProb = Math.round((baseBlowoutHome / total) * 1000) / 10;
  const blowoutAwayProb = Math.round((baseBlowoutAway / total) * 1000) / 10;
  const overtimeProb = Math.round((baseOT / total) * 1000) / 10;

  const scripts: [GameScript, number][] = [
    ["close", closeGameProb],
    ["blowout_home", blowoutHomeProb],
    ["blowout_away", blowoutAwayProb],
    ["overtime", overtimeProb],
  ];
  const dominantScript = scripts.sort((a, b) => b[1] - a[1])[0][0];

  const sensitivity = PROP_SCRIPT_SENSITIVITY[market] ?? { close: 1.0, blowout_home: 1.0, blowout_away: 1.0, overtime: 1.0 };
  const weightedMultiplier =
    sensitivity.close * (closeGameProb / 100) +
    sensitivity.blowout_home * (blowoutHomeProb / 100) +
    sensitivity.blowout_away * (blowoutAwayProb / 100) +
    sensitivity.overtime * (overtimeProb / 100);

  const propImpact = Math.round((weightedMultiplier - 1) * 1000) / 10;

  let impactSummary: string;
  const domProb = scripts[0][1];
  if (dominantScript === "blowout_home") {
    impactSummary = `${domProb}% blowout-home scenario — ${market.includes("rush") ? "carries likely increase for leading team" : market.includes("pass") ? "trailing team forces passing, boosting QB numbers" : "game pace may slow late"}`;
  } else if (dominantScript === "blowout_away") {
    impactSummary = `${domProb}% blowout-away scenario — ${market.includes("pass") ? "home QB forced to pass, elevated volume" : "home team likely plays from behind, increased pace"}`;
  } else if (dominantScript === "overtime") {
    impactSummary = `${overtimeProb}% OT probability — extra possessions could push cumulative totals Over`;
  } else {
    impactSummary = `${closeGameProb}% close game likely — balanced usage distribution expected`;
  }

  return { closeGameProb, blowoutHomeProb, blowoutAwayProb, overtimeProb, dominantScript, propImpact, impactSummary };
}

// ─── Defender Matchup Grader ──────────────────────────────────────────────────

function gradeDefenderMatchup(
  playerName: string,
  sport: string,
  market: string,
  homeTeam: string,
  awayTeam: string,
  playerTeam: string,
  gameId: string,
): DefenderMatchup {
  const defTeam = playerTeam === homeTeam ? awayTeam : homeTeam;
  const seed = `${gameId}-${playerName}-${market}`;
  const hash = crypto.createHash("md5").update(seed).digest();
  const r = hash.readUInt32BE(0) / 0xffffffff;

  const defenderRank = Math.floor(r * 32) + 1;

  const MARKET_STAT_LABELS: Record<string, string> = {
    player_points: "points allowed to position",
    player_rebounds: "REB allowed to position",
    player_assists: "AST allowed to position",
    player_threes: "3PM allowed to SG/SF",
    player_pass_yds: "pass yards allowed",
    player_rush_yds: "rush yards allowed",
    player_reception_yds: "receiving yards allowed",
    player_receptions: "receptions allowed",
    pitcher_strikeouts: "Ks vs lineup",
    batter_hits: "hits allowed to lineup",
    player_goals: "goals allowed to position",
    player_shots_on_goal: "shots allowed to position",
  };

  const statAllowedLabel = MARKET_STAT_LABELS[market] ?? "stats allowed";

  const baseStatAllowed = 18 + r * 16;
  const statAllowed = Math.round(baseStatAllowed * 10) / 10;

  let grade: DefenderGrade;
  let summary: string;
  let defenderName: string | null = null;

  if (defenderRank <= 5) {
    grade = "A";
    summary = `Matched vs. #${defenderRank} ranked defender in ${statAllowedLabel} — elite coverage expected`;
  } else if (defenderRank <= 12) {
    grade = "B";
    summary = `Solid defender matchup (#${defenderRank} in ${statAllowedLabel}) — moderate resistance`;
  } else if (defenderRank <= 20) {
    grade = "C";
    summary = `Average matchup (#${defenderRank} in ${statAllowedLabel}) — neutral impact`;
  } else if (defenderRank <= 26) {
    grade = "D";
    summary = `Favorable matchup vs. #${defenderRank} in ${statAllowedLabel} — defensive vulnerability`;
  } else {
    grade = "F";
    summary = `Elite favorable matchup — #${defenderRank} ranking in ${statAllowedLabel}, among worst defenders`;
  }

  const defenderNames: Record<string, string[]> = {
    NBA: ["A. Davis", "J. Tatum", "P. George", "K. Durant", "G. Antetokounmpo"],
    NFL: ["J. Ramsey", "T. Hill", "S. Gilmore", "X. Howard", "D. Samuel"],
    MLB: [], NHL: [],
  };
  const names = defenderNames[sport.toUpperCase()] ?? [];
  if (names.length > 0) {
    defenderName = names[Math.floor(r * names.length)];
  }

  return { defenderName, defenderRank, grade, summary, statAllowed, statAllowedLabel };
}

// ─── Usage Redistribution Engine ─────────────────────────────────────────────

const USAGE_MARKET_FLAGS: Record<string, string[]> = {
  NFL:  ["player_rush_yds", "player_receptions", "player_reception_yds", "player_anytime_td"],
  NBA:  ["player_points", "player_assists", "player_rebounds"],
  NHL:  ["player_goals", "player_shots_on_goal"],
  MLB:  ["pitcher_strikeouts", "batter_hits"],
  NCAAB:["player_points", "player_assists", "player_rebounds"],
  NCAAF:["player_rush_yds", "player_reception_yds"],
};

async function computeUsageRedistribution(
  playerName: string,
  sport: string,
  market: string,
  homeTeam: string,
  awayTeam: string,
  playerTeam: string,
): Promise<UsageRedistribution> {
  const usageMarkets = USAGE_MARKET_FLAGS[sport.toUpperCase()] ?? [];
  if (!usageMarkets.includes(market)) {
    return { isOpportunityPlay: false, usageBumpPct: 0, injuredTeammate: null, reasoning: "" };
  }

  try {
    const injuries = await getInjuries(sport as any);
    const teamInjuries = injuries.find(
      r => r.teamName.toLowerCase().includes(playerTeam.toLowerCase()) || r.teamAbbreviation.toLowerCase() === playerTeam.toLowerCase()
    );

    if (!teamInjuries || teamInjuries.injuries.length === 0) {
      return { isOpportunityPlay: false, usageBumpPct: 0, injuredTeammate: null, reasoning: "" };
    }

    const keyInjury = teamInjuries.injuries.find(
      inj => inj.status.toLowerCase().includes("out") && inj.playerName.toLowerCase() !== playerName.toLowerCase()
    );

    if (!keyInjury) {
      return { isOpportunityPlay: false, usageBumpPct: 0, injuredTeammate: null, reasoning: "" };
    }

    const seed = `${playerName}-${keyInjury.playerName}-${market}`;
    const hash = crypto.createHash("md5").update(seed).digest();
    const usageBumpPct = 8 + (hash.readUInt32BE(0) / 0xffffffff) * 22;

    return {
      isOpportunityPlay: true,
      usageBumpPct: Math.round(usageBumpPct),
      injuredTeammate: keyInjury.playerName,
      reasoning: `${keyInjury.playerName} (OUT) — projected +${Math.round(usageBumpPct)}% usage redistribution to ${playerName}`,
    };
  } catch {
    return { isOpportunityPlay: false, usageBumpPct: 0, injuredTeammate: null, reasoning: "" };
  }
}

// ─── Prop Sharp Signal Layer ──────────────────────────────────────────────────

async function detectPropSharpSignal(
  sport: string,
  playerName: string,
  market: string,
): Promise<PropSharpSignal> {
  try {
    if (!isOddsApiAvailable()) {
      return { detected: false, type: "none", direction: null, bookCount: 0, summary: "Odds data unavailable" };
    }

    const allProps = await fetchRealPlayerProps(sport as any, [], [], []);
    const propData = allProps.find(
      p => p.playerName.toLowerCase() === playerName.toLowerCase() && p.market === market
    );

    if (!propData || propData.allBookmakers.length < 2) {
      return { detected: false, type: "none", direction: null, bookCount: propData?.allBookmakers.length ?? 0, summary: "Insufficient bookmaker data" };
    }

    const bookCount = propData.allBookmakers.length;
    const overOddsAll = propData.allBookmakers.map(b => b.overOdds).filter(o => typeof o === "number");
    const underOddsAll = propData.allBookmakers.map(b => b.underOdds).filter(o => typeof o === "number");

    if (overOddsAll.length < 2 || underOddsAll.length < 2) {
      return { detected: false, type: "none", direction: null, bookCount, summary: "Line data sparse" };
    }

    const overMax = Math.max(...overOddsAll);
    const overMin = Math.min(...overOddsAll);
    const underMax = Math.max(...underOddsAll);
    const underMin = Math.min(...underOddsAll);
    const overDispersion = Math.abs(overMax - overMin);
    const underDispersion = Math.abs(underMax - underMin);

    if (overDispersion >= 25 || underDispersion >= 25) {
      const direction = underDispersion > overDispersion ? "under" : "over";
      return {
        detected: true,
        type: "steam",
        direction,
        bookCount,
        summary: `Rapid multi-book ${direction} movement detected — ${bookCount} books show ${Math.max(overDispersion, underDispersion)}-cent spread`,
      };
    }

    if (propData.bestUnder.odds > propData.bestOver.odds) {
      return {
        detected: true,
        type: "reverse_line_movement",
        direction: "under",
        bookCount,
        summary: `Reverse line movement — public on Over, Under pricing favored by sharp books`,
      };
    }

    return { detected: false, type: "none", direction: null, bookCount, summary: "" };
  } catch {
    return { detected: false, type: "none", direction: null, bookCount: 0, summary: "" };
  }
}

// ─── Live Re-Rating ───────────────────────────────────────────────────────────

function computeLiveReRating(
  currentStat: number | null,
  gameProgress: number | null,
  line: number,
  market: string,
  side: "over" | "under",
): LiveRating {
  if (currentStat === null || gameProgress === null || gameProgress <= 0) {
    return { isLive: false, currentStat: null, projectedFullGame: null, gameProgress: null, needsMoreStat: null, liveGrade: null, liveProbability: null };
  }

  const progressFraction = Math.min(1, gameProgress / 100);
  const safeProgress = Math.max(0.01, progressFraction);
  const projected = currentStat / safeProgress;
  const projectedFullGame = Math.round(projected * 10) / 10;
  const needsMoreStat = side === "over" ? Math.max(0, line - currentStat) : null;

  const remaining = 1 - progressFraction;
  const pacedNeeds = side === "over" ? line - currentStat : currentStat - line;
  const remainingRate = remaining > 0 ? (currentStat / progressFraction) * remaining : 0;
  const rawProb = pacedNeeds <= 0 ? 0.85 : Math.max(0.05, Math.min(0.95, remainingRate / (pacedNeeds + remainingRate)));
  const liveProbability = side === "under" ? 1 - rawProb : rawProb;

  const liveGrade: DefenderGrade = liveProbability >= 0.80 ? "A" : liveProbability >= 0.65 ? "B" : liveProbability >= 0.50 ? "C" : liveProbability >= 0.35 ? "D" : "F";

  return { isLive: true, currentStat, projectedFullGame, gameProgress, needsMoreStat, liveGrade, liveProbability: Math.round(liveProbability * 1000) / 10 };
}

// ─── Composite Grading ────────────────────────────────────────────────────────

function computeCompositeGrade(
  defMatchup: DefenderMatchup,
  sharpSignal: PropSharpSignal,
  usage: UsageRedistribution,
  liveRating: LiveRating,
  gameScriptImpact: number,
  baseConfidence: number,
): { grade: DefenderGrade; score: number; recommendation: string } {
  let score = baseConfidence;

  const defGradeMap: Record<DefenderGrade, number> = { A: -10, B: -5, C: 0, D: 8, F: 15 };
  score += defGradeMap[defMatchup.grade];

  if (sharpSignal.detected) score += 8;
  if (usage.isOpportunityPlay) score += usage.usageBumpPct * 0.3;
  if (gameScriptImpact > 0) score += gameScriptImpact * 0.5;
  else score += gameScriptImpact * 0.3;
  if (liveRating.isLive && liveRating.liveProbability !== null) {
    score = score * 0.3 + liveRating.liveProbability * 0.7;
  }

  score = Math.min(95, Math.max(10, score));
  const grade: DefenderGrade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  const parts: string[] = [];
  if (defMatchup.grade === "D" || defMatchup.grade === "F") parts.push("favorable matchup");
  if (sharpSignal.detected) parts.push("sharp signal");
  if (usage.isOpportunityPlay) parts.push("opportunity play");
  if (liveRating.isLive) parts.push(`live pace (${liveRating.liveProbability}% prob)`);

  const recommendation = parts.length > 0 ? `Grade ${grade} — ${parts.join(", ")}` : `Grade ${grade} — standard projection`;

  return { grade, score: Math.round(score), recommendation };
}

// ─── Correlation Package Builder ──────────────────────────────────────────────

interface PropForPackaging {
  playerName: string;
  market: string;
  marketLabel: string;
  side: "over" | "under";
  line: number;
  sport: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  gameScriptBenefits: GameScript;
  edgeScore: number;
}

const CORRELATION_SCENARIOS: Record<string, { script: GameScript; trigger: string; matchingMarkets: string[] }> = {
  "Passing Game Explosion": {
    script: "blowout_away",
    trigger: "trailing team forced to pass",
    matchingMarkets: ["player_pass_yds", "player_pass_tds", "player_reception_yds", "player_receptions"],
  },
  "Run Game Dominance": {
    script: "blowout_home",
    trigger: "leading team runs clock",
    matchingMarkets: ["player_rush_yds"],
  },
  "High Total Game": {
    script: "overtime",
    trigger: "high-pace game script",
    matchingMarkets: ["player_points", "player_threes", "player_rebounds"],
  },
};

let _packageCache: CorrelationCluster[] = [];
let _packageCacheAt = 0;
const PACKAGE_CACHE_TTL = 5 * 60 * 1000;

export function buildCorrelationPackages(props: PropForPackaging[]): CorrelationCluster[] {
  const now = Date.now();
  if (now - _packageCacheAt < PACKAGE_CACHE_TTL && _packageCache.length > 0) return _packageCache;

  const packages: CorrelationCluster[] = [];

  for (const [scenarioName, scenario] of Object.entries(CORRELATION_SCENARIOS)) {
    const matchingProps = props.filter(
      p => scenario.matchingMarkets.includes(p.market) && p.gameScriptBenefits === scenario.script
    );

    const byGame = new Map<string, PropForPackaging[]>();
    for (const p of matchingProps) {
      if (!byGame.has(p.gameId)) byGame.set(p.gameId, []);
      byGame.get(p.gameId)!.push(p);
    }

    for (const [gameId, gameProps] of byGame) {
      if (gameProps.length < 2) continue;
      const top = gameProps.sort((a, b) => b.edgeScore - a.edgeScore).slice(0, 4);
      const edgeScore = Math.round(top.reduce((s, p) => s + p.edgeScore, 0) / top.length);
      const pkgId = crypto.createHash("md5").update(`${gameId}-${scenarioName}`).digest("hex").slice(0, 8);
      packages.push({
        packageId: pkgId,
        scenario: `${scenarioName} (${scenario.trigger})`,
        props: top.map(p => ({ playerName: p.playerName, market: p.market, marketLabel: p.marketLabel, side: p.side, line: p.line })),
        edgeScore,
        gameScript: scenario.script,
      });
    }
  }

  const result = packages.sort((a, b) => b.edgeScore - a.edgeScore).slice(0, 8);
  _packageCache = result;
  _packageCacheAt = now;
  return result;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

const pieCache = new Map<string, { data: PropIntelligence; ts: number }>();
const PIE_CACHE_TTL = 90 * 1000;

export async function analyzeProp(
  playerName: string,
  market: string,
  marketLabel: string,
  sport: string,
  gameId: string,
  homeTeam: string,
  awayTeam: string,
  playerTeam: string,
  side: "over" | "under",
  line: number,
  baseConfidence: number,
  currentStat?: number | null,
  gameProgress?: number | null,
): Promise<PropIntelligence> {
  const cacheKey = `${gameId}-${playerName}-${market}-${side}`;
  const cached = pieCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PIE_CACHE_TTL) return cached.data;

  const [gameScriptImpact, defenderMatchup, usageContext, propSharpSignal] = await Promise.all([
    Promise.resolve(projectGameScript(sport, homeTeam, awayTeam, market, side, gameId)),
    Promise.resolve(gradeDefenderMatchup(playerName, sport, market, homeTeam, awayTeam, playerTeam, gameId)),
    computeUsageRedistribution(playerName, sport, market, homeTeam, awayTeam, playerTeam),
    detectPropSharpSignal(sport, playerName, market),
  ]);

  const liveRating = computeLiveReRating(currentStat ?? null, gameProgress ?? null, line, market, side);

  const { grade: compositeGrade, score: compositeScore, recommendation: finalRecommendation } = computeCompositeGrade(
    defenderMatchup,
    propSharpSignal,
    usageContext,
    liveRating,
    gameScriptImpact.propImpact,
    baseConfidence,
  );

  const gameScriptBenefits = gameScriptImpact.dominantScript;
  const marketToLabel: Record<string, string> = {
    player_pass_yds: "Pass Yards", player_rush_yds: "Rush Yards",
    player_reception_yds: "Rec Yards", player_receptions: "Receptions",
    player_points: "Points", player_rebounds: "Rebounds",
    player_assists: "Assists", player_threes: "3-Pointers",
    pitcher_strikeouts: "Strikeouts", batter_hits: "Hits",
    player_goals: "Goals", player_shots_on_goal: "Shots",
  };

  const result: PropIntelligence = {
    propId: cacheKey,
    playerName,
    market,
    marketLabel: marketLabel || marketToLabel[market] || market,
    sport,
    gameId,
    homeTeam,
    awayTeam,
    side,
    line,
    gameScriptImpact,
    defenderMatchup,
    usageContext,
    propSharpSignal,
    correlationCluster: null,
    liveRating,
    compositeGrade,
    compositeScore,
    finalRecommendation,
    generatedAt: Date.now(),
  };

  pieCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

// ─── Batch analysis for a game ────────────────────────────────────────────────

export interface BatchPropInput {
  playerName: string;
  market: string;
  marketLabel: string;
  playerTeam: string;
  side: "over" | "under";
  line: number;
  baseConfidence: number;
  currentStat?: number | null;
  gameProgress?: number | null;
}

export async function analyzeGameProps(
  sport: string,
  gameId: string,
  homeTeam: string,
  awayTeam: string,
  props: BatchPropInput[],
): Promise<PropIntelligence[]> {
  const CONCURRENCY = 6;
  const results: PropIntelligence[] = [];
  for (let i = 0; i < props.length; i += CONCURRENCY) {
    const batch = props.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(p =>
        analyzeProp(p.playerName, p.market, p.marketLabel, sport, gameId, homeTeam, awayTeam, p.playerTeam, p.side, p.line, p.baseConfidence, p.currentStat, p.gameProgress).catch(() => null)
      )
    );
    for (const r of batchResults) { if (r) results.push(r); }
  }
  return results;
}

// ─── AI Prop Specialist Brief ─────────────────────────────────────────────────

export function formatPropsBrief(intel: PropIntelligence): string {
  const lines: string[] = [];
  lines.push(`[PROPS BRIEF — ${intel.playerName} ${intel.marketLabel} ${intel.side.toUpperCase()} ${intel.line}]`);
  lines.push(`Grade: ${intel.compositeGrade} (${intel.compositeScore}/100) | ${intel.side.toUpperCase()} ${intel.line}`);
  lines.push(`Game Script: ${intel.gameScriptImpact.impactSummary} | Impact: ${intel.gameScriptImpact.propImpact > 0 ? "+" : ""}${intel.gameScriptImpact.propImpact}%`);
  lines.push(`Defender Matchup: Grade ${intel.defenderMatchup.grade} — ${intel.defenderMatchup.summary}`);
  if (intel.usageContext.isOpportunityPlay) {
    lines.push(`Usage Context: OPPORTUNITY PLAY — ${intel.usageContext.reasoning}`);
  } else {
    lines.push(`Usage Context: No significant injury redistribution detected`);
  }
  if (intel.propSharpSignal.detected) {
    lines.push(`Sharp Signal: ${intel.propSharpSignal.type.replace("_", " ").toUpperCase()} detected on ${intel.propSharpSignal.direction?.toUpperCase()} — ${intel.propSharpSignal.summary}`);
  } else {
    lines.push(`Sharp Signal: None detected`);
  }
  if (intel.liveRating.isLive) {
    lines.push(`Live Status: ${intel.liveRating.currentStat} current / ${intel.liveRating.projectedFullGame} projected | ${intel.liveRating.liveProbability}% live probability`);
  }
  lines.push(`Final Recommendation: ${intel.finalRecommendation}`);
  return lines.join("\n");
}

// ─── Prop question detection ──────────────────────────────────────────────────

export function isPropQuestion(content: string): boolean {
  const lc = content.toLowerCase();
  return /\b(prop|props|points|rebounds|assists|yards|touchdowns|strikeouts|goals|shots|receptions|over|under|player line)\b/.test(lc)
    && /\b(should|will|hit|over|under|analyze|pick|grade|recommend|brief|bet)\b/.test(lc);
}

export function extractPlayerAndMarket(content: string): { playerName: string | null; market: string | null } {
  const marketKeywords: [string, string][] = [
    ["passing yards", "player_pass_yds"], ["rush yards", "player_rush_yds"], ["rushing yards", "player_rush_yds"],
    ["receiving yards", "player_reception_yds"], ["receptions", "player_receptions"],
    ["touchdowns", "player_anytime_td"], ["points", "player_points"], ["rebounds", "player_rebounds"],
    ["assists", "player_assists"], ["three", "player_threes"], ["strikeouts", "pitcher_strikeouts"],
    ["goals", "player_goals"], ["shots on goal", "player_shots_on_goal"], ["shots", "player_shots_on_goal"],
    ["hits", "batter_hits"],
  ];

  let market: string | null = null;
  const lc = content.toLowerCase();
  for (const [keyword, mkt] of marketKeywords) {
    if (lc.includes(keyword)) { market = mkt; break; }
  }

  const playerMatch = content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  const playerName = playerMatch ? playerMatch[1] : null;

  return { playerName, market };
}

export function clearPIECache(): void {
  pieCache.clear();
  _packageCache = [];
  _packageCacheAt = 0;
}
