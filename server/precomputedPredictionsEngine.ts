import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getMultiDayScoreboard } from "./espn-scoreboard-provider";
import { generateVegasPredictions } from "./vegas-engine";
import {
  getSportPropCategories,
  isSportPropsEnabled,
  enrichLeadersWithPerGameStats,
  getSportLeaderForProp,
  getPropLineForLeader,
  logSeasonStatus,
} from "./sport-leaders-provider";
import { analyzeLeg, type MarketContext } from "./quantumFusionEngine";
import { getAllInjuries } from "./espn-injury-provider";
import { getGameSituationalFactors, type SituationalFactors } from "./situationalEngine";
import { generateMarketSnapshot, type MarketSnapshot, type LineMovementData } from "./marketSnapshotEngine";
import { isExclusivePick } from "./pickProtectionEngine";
import { isBDLAvailable, getEnrichedTeamData, lookupTeamByName, type BDLEnrichedTeamData } from "./balldontlie-provider";
import { getInternationalLifeChangerPicks, type SoccerPick } from "./internationalSportsEngine";
import { getSharpPropAlerts, type PropMovement } from "./notificationEngine";
import { savePrecomputedPicks } from "./pickOutcomeTracker";
import type { Sport } from "@shared/schema";

const DIVISION_GROUPS: Record<string, string[][]> = {
  NFL: [
    ["BUF","MIA","NE","NYJ"], ["BAL","CIN","CLE","PIT"], ["HOU","IND","JAX","TEN"], ["DEN","KC","LV","LAC"],
    ["DAL","NYG","PHI","WSH"], ["CHI","DET","GB","MIN"], ["ATL","CAR","NO","TB"], ["ARI","LAR","SEA","SF"],
  ],
  NBA: [
    ["BOS","BKN","NY","PHI","TOR"], ["CHI","CLE","DET","IND","MIL"], ["ATL","CHA","MIA","ORL","WSH"],
    ["DEN","MIN","OKC","POR","UTA"], ["GS","LAC","LAL","PHO","SAC"], ["DAL","HOU","MEM","NO","SA"],
  ],
  NHL: [
    ["BOS","BUF","DET","FLA","MTL","OTT","TB","TOR"], ["CAR","CBJ","NJ","NYI","NYR","PHI","PIT","WSH"],
    ["ARI","CHI","COL","DAL","MIN","NSH","STL","WPG"], ["ANA","CGY","EDM","LA","SJS","SEA","VAN","VGK"],
  ],
  MLB: [
    ["BAL","BOS","NYY","TB","TOR"], ["CWS","CLE","DET","KC","MIN"], ["HOU","LAA","OAK","SEA","TEX"],
    ["ATL","MIA","NYM","PHI","WSH"], ["CHC","CIN","MIL","PIT","STL"], ["ARI","COL","LAD","SD","SF"],
  ],
};

function areSameDivision(sport: string, abbr1: string, abbr2: string): boolean {
  const groups = DIVISION_GROUPS[sport];
  if (!groups || !abbr1 || !abbr2) return false;
  const a1 = abbr1.toUpperCase();
  const a2 = abbr2.toUpperCase();
  return groups.some(div =>
    div.some(t => a1 === t || a1.includes(t) || t.includes(a1)) &&
    div.some(t => a2 === t || a2.includes(t) || t.includes(a2))
  );
}

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
  sharpPropAlert?: {
    playerName: string;
    market: string;
    previousLine: number;
    currentLine: number;
    lineShift: number;
    velocity: string;
    direction: string;
    detectedAt: string;
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
  conditioning_trend: "Conditioning Trend",
  availability_pattern: "Availability Pattern",
  roster_depth: "Roster Depth",
  matchup_efficiency: "Matchup Efficiency",
  usage_patterns: "Usage Patterns",
  film_tendency: "Tendency Analysis",
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

// ── Disk cache: persist predictions across restarts so users get instant results ──
const __filename_pe = fileURLToPath(import.meta.url);
const __dirname_pe = path.dirname(__filename_pe);
const CACHE_PERSIST_FILE = path.join(__dirname_pe, "..", "precomputed-picks-cache.json");
const CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours — stale beyond this

function loadPersistedCache(): void {
  try {
    if (!fs.existsSync(CACHE_PERSIST_FILE)) return;
    const raw = fs.readFileSync(CACHE_PERSIST_FILE, "utf8");
    const entries: CacheEntry[] = JSON.parse(raw);
    const now = Date.now();
    let loaded = 0;
    for (const entry of entries) {
      if (!entry.sport || !entry.snapshot) continue;
      // Accept cache up to 4 hours old — better than nothing while engine warms up
      if (now - entry.timestamp < CACHE_MAX_AGE_MS) {
        predictionCache.set(entry.sport, entry);
        loaded++;
      }
    }
    if (loaded > 0) {
      console.log(`[PrecomputedEngine] Loaded ${loaded} sport(s) from disk cache — users get instant picks while engine warms up`);
    }
  } catch (e) {
    // Silently ignore corrupt cache — engine will regenerate
  }
}

function persistCacheToDisk(): void {
  try {
    const entries = Array.from(predictionCache.values());
    fs.writeFileSync(CACHE_PERSIST_FILE, JSON.stringify(entries));
  } catch {
    // Non-critical — next cycle will retry
  }
}

// Load immediately at module init (synchronous, runs before any engine starts)
loadPersistedCache();

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
  if (confidence >= 67) return "A+";
  if (confidence >= 63) return "A";
  if (confidence >= 59) return "A-";
  if (confidence >= 55) return "B+";
  if (confidence >= 51) return "B";
  if (confidence >= 47) return "B-";
  if (confidence >= 43) return "C+";
  if (confidence >= 39) return "C";
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
    allInjuries = await getAllInjuries();
  } catch {}

  const sportInjuries = allInjuries[sport] || allInjuries[sport.toLowerCase()] || [];

  let bdlTeams: BDLEnrichedTeamData[] = [];
  if (sport === "NBA" && isBDLAvailable()) {
    try {
      bdlTeams = await getEnrichedTeamData();
      if (bdlTeams.length > 0) {
        console.log(`[PrecomputedEngine] BallDontLie: loaded ${bdlTeams.length} NBA team enrichments`);
      }
    } catch (err) {
      console.log(`[PrecomputedEngine] BallDontLie data unavailable: ${err}`);
    }
  }

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
      const teamName = (inj.teamName || inj.team || "").toLowerCase();
      const teamAbbr = (inj.teamAbbreviation || inj.abbreviation || "").toLowerCase();
      const homeLast = homeName.toLowerCase().split(" ").pop() || "";
      const awayLast = awayName.toLowerCase().split(" ").pop() || "";
      const isHome = teamName.includes(homeLast) || teamAbbr === homeAbbr.toLowerCase() || teamName.includes(homeAbbr.toLowerCase());
      const isAway = teamName.includes(awayLast) || teamAbbr === awayAbbr.toLowerCase() || teamName.includes(awayAbbr.toLowerCase());
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
        const mcInput: any = {
          gameId: game.id,
          sport,
          homeTeam: homeName,
          awayTeam: awayName,
          homeWinPct: homeWinPct * 100,
          awayWinPct: awayWinPct * 100,
          isHomeGame: true,
          gameState: game.status?.state === "in" ? "live" : "pre",
          injuryImpact: { home: homeStartersOut * 0.03, away: awayStartersOut * 0.03 },
        };
        if (sport === "NBA" && homeBDL) {
          mcInput.homeAvgPts = homeBDL.avgPts;
          mcInput.homeDefRating = homeBDL.defRating;
          mcInput.homePace = homeBDL.pace;
        }
        if (sport === "NBA" && awayBDL) {
          mcInput.awayAvgPts = awayBDL.avgPts;
          mcInput.awayDefRating = awayBDL.defRating;
          mcInput.awayPace = awayBDL.pace;
        }
        mcSim = simulateMatchup(mcInput);
      }
    } catch {}

    const parseRecord = (rec: string): { wins: number; losses: number } => {
      if (!rec) return { wins: 0, losses: 0 };
      const parts = rec.split("-");
      return { wins: parseInt(parts[0]) || 0, losses: parseInt(parts[1]) || 0 };
    };

    const homeRec = parseRecord(homeRecord);
    const awayRec = parseRecord(awayRecord);
    const homeGames = homeRec.wins + homeRec.losses;
    const awayGames = awayRec.wins + awayRec.losses;

    const deriveStreak = (winPct: number, totalGames: number): { type: "W" | "L"; length: number } => {
      if (totalGames < 5) return { type: "W", length: 0 };
      const recentBias = winPct > 0.6 ? "W" : winPct < 0.4 ? "L" : (winPct > 0.5 ? "W" : "L");
      const intensity = Math.abs(winPct - 0.5) * 10;
      return { type: recentBias as "W" | "L", length: Math.min(10, Math.max(1, Math.round(intensity))) };
    };

    const sportAvgScores: Record<string, number> = { NBA: 112, NFL: 23, MLB: 4.5, NHL: 3.1, NCAAB: 72, NCAAF: 28, MLS: 1.4 };
    const avgScore = sportAvgScores[sport] || 100;
    const deriveScoring = (winPct: number): { avgFor: number; avgAgainst: number } => {
      const offFactor = 1 + (winPct - 0.5) * 0.3;
      const defFactor = 1 - (winPct - 0.5) * 0.2;
      return { avgFor: Math.round(avgScore * offFactor * 10) / 10, avgAgainst: Math.round(avgScore * defFactor * 10) / 10 };
    };

    let homeLastNWinPct = homeGames >= 10 ? homeWinPct + (homeWinPct > 0.5 ? 0.05 : -0.05) : homeWinPct;
    let awayLastNWinPct = awayGames >= 10 ? awayWinPct + (awayWinPct > 0.5 ? 0.05 : -0.05) : awayWinPct;

    const homeBDL = bdlTeams.find(t =>
      t.teamName.toLowerCase().includes(homeName.toLowerCase().split(" ").pop()!) ||
      t.abbreviation.toLowerCase() === homeAbbr.toLowerCase()
    );
    const awayBDL = bdlTeams.find(t =>
      t.teamName.toLowerCase().includes(awayName.toLowerCase().split(" ").pop()!) ||
      t.abbreviation.toLowerCase() === awayAbbr.toLowerCase()
    );

    let homeStreakData = deriveStreak(homeWinPct, homeGames);
    let awayStreakData = deriveStreak(awayWinPct, awayGames);
    let homeScoringData = deriveScoring(homeWinPct);
    let awayScoringData = deriveScoring(awayWinPct);
    let homeHomeRec = { wins: Math.round(homeRec.wins * 0.55), losses: Math.round(homeRec.losses * 0.45) };
    let awayAwayRec = { wins: Math.round(awayRec.wins * 0.45), losses: Math.round(awayRec.losses * 0.55) };

    if (homeBDL) {
      homeStreakData = { type: homeBDL.streakType === "win" ? "W" : "L", length: homeBDL.streak };
      homeScoringData = { avgFor: homeBDL.avgPts, avgAgainst: homeBDL.avgPts > 0 ? Math.round((homeBDL.avgPts / ((homeBDL.offRating || 110) / (homeBDL.defRating || 110))) * 10) / 10 : deriveScoring(homeWinPct).avgAgainst };
      homeHomeRec = { wins: homeBDL.homeWins, losses: homeBDL.homeLosses };
      homeLastNWinPct = homeBDL.last10Wins / Math.max(1, homeBDL.last10Wins + homeBDL.last10Losses);
    }
    if (awayBDL) {
      awayStreakData = { type: awayBDL.streakType === "win" ? "W" : "L", length: awayBDL.streak };
      awayScoringData = { avgFor: awayBDL.avgPts, avgAgainst: awayBDL.avgPts > 0 ? Math.round((awayBDL.avgPts / ((awayBDL.offRating || 110) / (awayBDL.defRating || 110))) * 10) / 10 : deriveScoring(awayWinPct).avgAgainst };
      awayAwayRec = { wins: awayBDL.awayWins, losses: awayBDL.awayLosses };
      awayLastNWinPct = awayBDL.last10Wins / Math.max(1, awayBDL.last10Wins + awayBDL.last10Losses);
    }

    const sameDivision = areSameDivision(sport, homeAbbr, awayAbbr);
    const isRivalryGame = sameDivision;

    const marketGameData = marketData?.games.find(mg => mg.id === game.id);
    const gameLineMovementsEarly: LineMovementData[] = marketGameData?.lineMovement || [];

    const latestLineMove = gameLineMovementsEarly[0];
    let derivedLineMovement: { direction: "up" | "down" | "stable"; magnitude: number } | undefined;
    if (latestLineMove) {
      const openNum = parseFloat(String(latestLineMove.opening)) || 0;
      const currNum = parseFloat(String(latestLineMove.current)) || 0;
      const mag = Math.abs(currNum - openNum);
      if (mag > 0.1) {
        derivedLineMovement = {
          direction: currNum > openNum ? "up" : "down",
          magnitude: Math.round(mag * 10) / 10,
        };
      } else {
        derivedLineMovement = { direction: "stable", magnitude: 0 };
      }
    }

    const sharpLineMove = gameLineMovementsEarly.find(lm => lm.sharpAction || lm.velocity === "steam");
    let derivedSharpMoney: { direction: "home" | "away"; percentage: number } | undefined;
    if (sharpLineMove) {
      const sharpDir: "home" | "away" = sharpLineMove.direction === "up" ? "home" : "away";
      derivedSharpMoney = {
        direction: sharpDir,
        percentage: sharpLineMove.velocity === "steam" ? 82 : 68,
      };
    }

    const derivedBookmakerCount = marketGameData?.bookmakers?.length || 0;

    const isPlayoffGame = !!(game.name && (
      game.name.toLowerCase().includes("playoff") ||
      game.name.toLowerCase().includes("postseason") ||
      game.name.toLowerCase().includes("championship") ||
      game.name.toLowerCase().includes("finals") ||
      game.name.toLowerCase().includes("cup")
    ));

    const marketCtx: MarketContext = {
      winPct: { home: homeWinPct, away: awayWinPct },
      homeRecord,
      awayRecord,
      injuryCount: { home: homeInjuryCount, away: awayInjuryCount },
      startersOut: { home: homeStartersOut, away: awayStartersOut },
      homeMoneyline: game.odds?.homeMoneyline || undefined,
      awayMoneyline: game.odds?.awayMoneyline || undefined,
      spreadLine: game.odds?.spread ? parseFloat(game.odds.spread) : undefined,
      totalLine: game.odds?.overUnder || undefined,
      venue: game.venue?.name || undefined,
      restDays: sitFactors ? { home: sitFactors.homeRestDays, away: sitFactors.awayRestDays } : undefined,
      homeB2B: sitFactors?.homeB2B,
      awayB2B: sitFactors?.awayB2B,
      situationalSpot: sitFactors ? { spotType: sitFactors.spotType, spotDescription: sitFactors.spotDescription } : undefined,
      homeStreak: homeStreakData,
      awayStreak: awayStreakData,
      homeScoring: homeScoringData,
      awayScoring: awayScoringData,
      homeHomeRecord: homeHomeRec,
      awayAwayRecord: awayAwayRec,
      homeLastNWinPct: Math.max(0, Math.min(1, homeLastNWinPct)),
      awayLastNWinPct: Math.max(0, Math.min(1, awayLastNWinPct)),
      rosterChanges: { home: homeInjuryCount, away: awayInjuryCount },
      isDivision: sameDivision,
      isRivalry: isRivalryGame,
      isPlayoff: isPlayoffGame,
      lineMovement: derivedLineMovement,
      sharpMoney: derivedSharpMoney,
      bookmakerCount: derivedBookmakerCount,
      homeTeamAbbr: homeAbbr,
      awayTeamAbbr: awayAbbr,
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

    const h1Spread = Math.round((actualSpread * 0.55) * 2) / 2;
    const h1Total = Math.round((actualTotal * 0.48) * 2) / 2;
    const homeTeamTotal = Math.round((actualTotal / 2 + actualSpread * -0.5) * 2) / 2;
    const awayTeamTotal = Math.round((actualTotal / 2 + actualSpread * 0.5) * 2) / 2;

    const h1SpreadOdds = marketGame?.bookmakers?.[0]?.h1SpreadHome || -110;
    const h1SpreadAwayOdds = marketGame?.bookmakers?.[0]?.h1SpreadAway || -110;
    const h1OverOdds = marketGame?.bookmakers?.[0]?.h1OverPrice || -110;
    const h1UnderOdds = marketGame?.bookmakers?.[0]?.h1UnderPrice || -110;
    const actualH1Spread = marketGame?.bookmakers?.[0]?.h1Spread ?? h1Spread;
    const actualH1Total = marketGame?.bookmakers?.[0]?.h1Total ?? h1Total;

    const betOptions = [
      { pick: `${favName} ML`, betType: "moneyline", odds: favoriteIsHome ? actualHomeML : actualAwayML, desc: `${favName} Moneyline` },
      { pick: `${underdogName} ML`, betType: "moneyline", odds: favoriteIsHome ? actualAwayML : actualHomeML, desc: `${underdogName} Moneyline` },
      { pick: `${homeName} ${actualSpread > 0 ? "+" : ""}${actualSpread}`, betType: "spread", odds: actualSpreadHomeOdds, desc: `${homeName} Spread ${actualSpread}` },
      { pick: `${awayName} ${actualSpread > 0 ? "-" : "+"}${Math.abs(actualSpread)}`, betType: "spread", odds: actualSpreadAwayOdds, desc: `${awayName} Spread ${actualSpread > 0 ? "-" : "+"}${Math.abs(actualSpread)}` },
      { pick: `Over ${actualTotal}`, betType: "total", odds: actualOverOdds, desc: `Over ${actualTotal}` },
      { pick: `Under ${actualTotal}`, betType: "total", odds: actualUnderOdds, desc: `Under ${actualTotal}` },
      { pick: `1H ${homeName} ${actualH1Spread > 0 ? "+" : ""}${actualH1Spread}`, betType: "first_half_spread", odds: h1SpreadOdds, desc: `1H ${homeName} Spread ${actualH1Spread}` },
      { pick: `1H ${awayName} ${actualH1Spread > 0 ? "-" : "+"}${Math.abs(actualH1Spread)}`, betType: "first_half_spread", odds: h1SpreadAwayOdds, desc: `1H ${awayName} Spread ${actualH1Spread}` },
      { pick: `1H Over ${actualH1Total}`, betType: "first_half_total", odds: h1OverOdds, desc: `1H Over ${actualH1Total}` },
      { pick: `1H Under ${actualH1Total}`, betType: "first_half_total", odds: h1UnderOdds, desc: `1H Under ${actualH1Total}` },
      { pick: `${homeName} Over ${homeTeamTotal}`, betType: "team_total", odds: -110, desc: `${homeName} Team Total Over ${homeTeamTotal}` },
      { pick: `${homeName} Under ${homeTeamTotal}`, betType: "team_total", odds: -110, desc: `${homeName} Team Total Under ${homeTeamTotal}` },
      { pick: `${awayName} Over ${awayTeamTotal}`, betType: "team_total", odds: -110, desc: `${awayName} Team Total Over ${awayTeamTotal}` },
      { pick: `${awayName} Under ${awayTeamTotal}`, betType: "team_total", odds: -110, desc: `${awayName} Team Total Under ${awayTeamTotal}` },
    ];

    for (const bet of betOptions) {
      const fusion = analyzeLeg(sport, bet.desc, bet.odds, {
        hasRealOdds: !!(game.odds?.homeMoneyline),
        gameId: game.id,
        bookmakerCount: game.bookmakers?.length || 0,
        oddsSource: game.odds?.homeMoneyline ? "ESPN" : "model-estimated",
      }, marketCtx);
      let confidence = Math.min(68, Math.max(25, fusion.confidence));

      if (mcSim) {
        let mcConfBoost = 0;
        if (bet.betType === "moneyline") {
          const isFavPick = bet.pick.includes(favName);
          const pickWinProb = isFavPick
            ? (favoriteIsHome ? mcSim.homeWinProb : mcSim.awayWinProb)
            : (favoriteIsHome ? mcSim.awayWinProb : mcSim.homeWinProb);
          mcConfBoost = Math.round((pickWinProb - 0.5) * 20);
        } else if (bet.betType === "spread" || bet.betType === "first_half_spread") {
          const predictedMargin = mcSim.predictedHomeScore - mcSim.predictedAwayScore;
          const lineToUse = bet.betType === "first_half_spread" ? actualH1Spread : actualSpread;
          const marginScale = bet.betType === "first_half_spread" ? 0.55 : 1;
          const coverMargin = bet.pick.includes(homeName)
            ? (predictedMargin * marginScale) + lineToUse
            : -(predictedMargin * marginScale) + lineToUse;
          mcConfBoost = Math.min(15, Math.max(-10, Math.round(coverMargin * 2)));
        } else if (bet.betType === "total" || bet.betType === "first_half_total") {
          const predictedTotal = mcSim.predictedHomeScore + mcSim.predictedAwayScore;
          const totalScale = bet.betType === "first_half_total" ? 0.48 : 1;
          const lineToUse = bet.betType === "first_half_total" ? actualH1Total : actualTotal;
          const diff = bet.pick.toLowerCase().includes("over")
            ? (predictedTotal * totalScale) - lineToUse
            : lineToUse - (predictedTotal * totalScale);
          mcConfBoost = Math.min(15, Math.max(-10, Math.round(diff * 1.5)));
        } else if (bet.betType === "team_total") {
          const predictedHome = mcSim.predictedHomeScore;
          const predictedAway = mcSim.predictedAwayScore;
          const isHomePick = bet.pick.includes(homeName);
          const predictedTeamScore = isHomePick ? predictedHome : predictedAway;
          const teamLine = isHomePick ? homeTeamTotal : awayTeamTotal;
          const diff = bet.pick.toLowerCase().includes("over")
            ? predictedTeamScore - teamLine
            : teamLine - predictedTeamScore;
          mcConfBoost = Math.min(12, Math.max(-8, Math.round(diff * 1.2)));
        }
        confidence = Math.min(70, Math.max(22, confidence + mcConfBoost));
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
        id: `precomp-${sport}-${game.id}-${bet.betType}-${crypto.createHash('sha256').update(`${game.id}|${bet.betType}|${bet.pick}`).digest('hex').slice(0, 10)}`,
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

    const sportPropCats = getSportPropCategories(sport);
    const propEnabled = isSportPropsEnabled(sport);
    const enrichedLeaders = propEnabled
      ? enrichLeadersWithPerGameStats(game.leaders || [], sport)
      : [];

    let sharpPropAlerts: PropMovement[] = [];
    try { sharpPropAlerts = getSharpPropAlerts(); } catch {}

    if (propEnabled && enrichedLeaders.length > 0) {
      for (const propDef of sportPropCats) {
        const enrichedLeader = getSportLeaderForProp(enrichedLeaders, propDef);
        if (!enrichedLeader) continue;

        const perGameAvg = enrichedLeader.perGameAvg;
        if (perGameAvg <= 0) continue;

        const propLine = getPropLineForLeader(enrichedLeader, propDef);
        if (propLine <= 0) continue;

        const predictedScore = mcSim
          ? (enrichedLeader.team === homeName ? mcSim.predictedHomeScore : mcSim.predictedAwayScore)
          : null;

        const scoringPace = predictedScore && actualTotal > 0
          ? predictedScore / (actualTotal / 2)
          : 1.0;

        const adjustedProjection = perGameAvg * (scoringPace > 0 ? Math.min(1.15, Math.max(0.85, scoringPace)) : 1.0);
        const minEdge = propDef.minEdgeForPick;

        for (const direction of ["Over", "Under"] as const) {
          const isOver = direction === "Over";
          const edge = isOver ? adjustedProjection - propLine : propLine - adjustedProjection;

          if (edge < minEdge) continue;

          const propBetType = propDef.betTypeKey;
          const pickStr = `${enrichedLeader.playerName} ${direction} ${propLine} ${propDef.category}`;
          const propOdds = -110;

          const propFusion = analyzeLeg(sport, pickStr, propOdds, {
            hasRealOdds: false,
            gameId: game.id,
            bookmakerCount: 0,
            oddsSource: "ESPN-derived",
          }, marketCtx);

          const edgeRatio = edge / minEdge;
          let propConf = Math.min(68, Math.max(53, Math.floor(50 + edgeRatio * 3)));
          if (mcSim && scoringPace !== 1.0) {
            const paceAdjust = Math.round((scoringPace - 1.0) * 5);
            propConf = Math.min(68, Math.max(53, propConf + (isOver ? paceAdjust : -paceAdjust)));
          }

          const propImplied = Math.abs(propOdds) / (Math.abs(propOdds) + 100);
          const propTrue = propConf / 100;
          const propEv = ((propTrue * (1 / propImplied - 1)) - (1 - propTrue)) * 100;
          const propEvRounded = Math.round(propEv * 100) / 100;

          if (propEvRounded <= 0) continue;

          const propFactors = (propFusion.signals || []).slice(0, 4).map(s => ({ name: s.source, impact: s.strength, direction: s.direction || "neutral" }));
          propFactors.push({
            name: "Season Avg",
            impact: Math.round(perGameAvg * 10) / 10,
            direction: isOver ? "bullish" : "bearish",
          });
          propFactors.push({
            name: "Data",
            impact: enrichedLeader.estimatedGamesPlayed,
            direction: "neutral",
          });

          const propTiming = determinePickTiming(game.date, gameLineMovements, propEvRounded);

          const matchingSharp = sharpPropAlerts.find(m =>
            m.playerName.toLowerCase() === enrichedLeader.playerName.toLowerCase() &&
            (m.marketLabel.toLowerCase().includes(propDef.category.toLowerCase()) ||
             propDef.category.toLowerCase().includes(m.marketLabel.toLowerCase()))
          );

          if (matchingSharp) {
            const sharpDir = matchingSharp.direction === "up" ? "rising" : matchingSharp.direction === "down" ? "dropping" : "shifting";
            propFactors.unshift({ name: "Sharp Prop Move", impact: matchingSharp.lineShift, direction: sharpDir });
            if (matchingSharp.velocity === "steam") {
              propConf = Math.min(95, propConf + 5);
            } else if (matchingSharp.velocity === "fast") {
              propConf = Math.min(93, propConf + 3);
            }
          }

          const avgDisplay = propLine > 5
            ? perGameAvg.toFixed(1)
            : perGameAvg.toFixed(2);

          picks.push({
            id: `precomp-prop-${sport}-${game.id}-${propBetType}-${direction.toLowerCase()}-${crypto.createHash('sha256').update(`${game.id}|${propBetType}|${direction}|${enrichedLeader.playerName}`).digest('hex').slice(0, 10)}`,
            sport,
            game: `${awayName} @ ${homeName}`,
            homeTeam: homeName,
            awayTeam: awayName,
            pick: pickStr,
            betType: propBetType,
            odds: propOdds,
            confidence: propConf,
            grade: gradeFromConfidence(propConf),
            edge: Math.round(propEv * 10) / 10,
            ev: propEvRounded,
            factors: propFactors,
            generatedAt: now,
            dataSource,
            gameTime: game.date,
            reasoning: `${enrichedLeader.playerName} averages ${avgDisplay} ${propDef.category}/game (${enrichedLeader.estimatedGamesPlayed} games). ${isOver ? "Over" : "Under"} ${propLine} is ${Math.abs(edge) >= minEdge * 2 ? "well" : "slightly"} ${isOver ? "supported" : "favored"} by season stats${mcSim ? " and Monte Carlo projections" : ""}${sitFactors ? `. ${sitFactors.spotDescription || ""}` : ""}${matchingSharp ? ` Sharp ${matchingSharp.velocity} move: line ${matchingSharp.previousLine} → ${matchingSharp.currentLine}.` : ""}.`,
            recommendation: propFusion.recommendation || "lean_bet",
            winProbability: propFusion.winProbability || Math.round(propConf * 0.95),
            insights: (propFusion.insights || []).slice(0, 2),
            timing: matchingSharp?.velocity === "steam" ? "bet_now" : propTiming.timing,
            timingAdvice: matchingSharp?.velocity === "steam"
              ? `Bet now — steam move on ${enrichedLeader.playerName} ${propDef.category} (${matchingSharp.previousLine} → ${matchingSharp.currentLine}), value disappearing fast`
              : propTiming.timingAdvice,
            releaseSchedule: buildReleaseSchedule(now),
            isExclusive: false,
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
            sharpPropAlert: matchingSharp ? {
              playerName: matchingSharp.playerName,
              market: matchingSharp.market,
              previousLine: matchingSharp.previousLine,
              currentLine: matchingSharp.currentLine,
              lineShift: matchingSharp.lineShift,
              velocity: matchingSharp.velocity,
              direction: matchingSharp.direction,
              detectedAt: matchingSharp.detectedAt,
            } : undefined,
          });
        }
      }
    }
  }

  for (const vp of vegasPicks) {
    const vpMarketCtx: MarketContext = {
      winPct: vp.homeWinPct && vp.awayWinPct ? { home: vp.homeWinPct / 100, away: vp.awayWinPct / 100 } : undefined,
      homeMoneyline: vp.homeMoneyline || undefined,
      awayMoneyline: vp.awayMoneyline || undefined,
    };
    const fusion = analyzeLeg(sport, vp.description || vp.game, vp.odds || -110, { hasRealOdds: !!vp.hasRealOdds }, vpMarketCtx);
    const confidence = Math.min(68, Math.max(22, fusion.confidence));
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
      id: `precomp-vegas-${sport}-${crypto.createHash('sha256').update(`${sport}|${vp.game || ''}|${vpBetType}|${vpPick}`).digest('hex').slice(0, 12)}`,
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
    // Skip exact duplicate pick strings
    if (acc.some(p => p.game === pick.game && p.pick === pick.pick)) return acc;
    // Skip picks that conflict with an already-accepted pick for the same market.
    // Because picks are sorted confidence-descending, the first pick for any
    // market is always the highest-confidence one — we never want to track both
    // sides of the same bet (e.g. Over AND Under for the same total).
    if (acc.some(p => hasConflict(p, pick))) return acc;
    acc.push(pick);
    return acc;
  }, []);

  const finalPicks = dedupedPicks.slice(0, 80);
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

  // Persist to disk in the background — users get instant picks on next restart
  setImmediate(persistCacheToDisk);

  try {
    savePrecomputedPicks(finalPicks.map(p => ({
      id: p.id,
      sport: p.sport,
      game: p.game,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      pick: p.pick,
      betType: p.betType,
      odds: p.odds,
      grade: p.grade,
      confidence: p.confidence,
      ev: p.ev,
      gameTime: p.gameTime,
    })));
  } catch {}

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

  import("./sportSeasons").then(({ getAllSports }) => {
    for (const sport of getAllSports()) {
      logSeasonStatus(sport);
    }
  }).catch(() => {});

  import("./featureFlags").then(({ featureFlags }) => {
    featureFlags.syncSeasonFlags();
  }).catch(() => {});

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
  if (a.betType === "first_half_spread" && b.betType === "first_half_spread") return true;
  if (a.betType === "total" && b.betType === "total") {
    const aIsOver = a.pick.toLowerCase().includes("over");
    const bIsOver = b.pick.toLowerCase().includes("over");
    return aIsOver !== bIsOver;
  }
  if (a.betType === "first_half_total" && b.betType === "first_half_total") {
    const aIsOver = a.pick.toLowerCase().includes("over");
    const bIsOver = b.pick.toLowerCase().includes("over");
    return aIsOver !== bIsOver;
  }
  if (a.betType === "team_total" && b.betType === "team_total") {
    const sameTeam = a.pick.split(" ")[0] === b.pick.split(" ")[0];
    if (!sameTeam) return false;
    const aIsOver = a.pick.toLowerCase().includes("over");
    const bIsOver = b.pick.toLowerCase().includes("over");
    return aIsOver !== bIsOver;
  }
  if (a.betType.startsWith("player_") && b.betType.startsWith("player_")) {
    const aPlayer = a.pick.split(" Over ")[0] || a.pick.split(" Under ")[0] || "";
    const bPlayer = b.pick.split(" Over ")[0] || b.pick.split(" Under ")[0] || "";
    if (aPlayer === bPlayer && a.betType === b.betType) return true;
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

    const optimalHashInput = [riskLevel, t, legs.length, ...legs.map(l => l.pickId).sort()].join('|');
    const optimalHash = crypto.createHash('sha256').update(optimalHashInput).digest('hex').slice(0, 16);
    tickets.push({
      id: `optimal-${optimalHash}`,
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

export interface MatchupTicket {
  id: string;
  matchupGame: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  legs: OptimalTicketLeg[];
  legCount: number;
  totalOdds: number;
  americanOdds: number;
  combinedGrade: string;
  combinedConfidence: number;
  combinedEV: number;
  winProbability: number;
  recommendedStake: number;
  potentialPayout: number;
  reasoning: string;
  marketBreakdown: {
    spreads: OptimalTicketLeg[];
    totals: OptimalTicketLeg[];
    moneylines: OptimalTicketLeg[];
    playerProps: OptimalTicketLeg[];
    other: OptimalTicketLeg[];
  };
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

export function buildMatchupTickets(options: {
  sports: string[];
  maxLegs: number;
  bankroll: number;
}): MatchupTicket[] {
  const { sports, maxLegs = 20, bankroll = 1000 } = options;

  const allPicks: PrecomputedPick[] = [];
  for (const sport of sports) {
    const cached = predictionCache.get(sport as Sport);
    if (cached?.snapshot?.picks) {
      allPicks.push(...cached.snapshot.picks);
    }
  }

  if (allPicks.length === 0) return [];

  const gameGroups = new Map<string, PrecomputedPick[]>();
  for (const pick of allPicks) {
    const existing = gameGroups.get(pick.game) || [];
    existing.push(pick);
    gameGroups.set(pick.game, existing);
  }

  const tickets: MatchupTicket[] = [];

  for (const [gameName, gamePicks] of gameGroups) {
    const eligible = gamePicks
      .filter(p => {
        const gs = gradeToScore(p.grade);
        return gs >= 2 && p.confidence >= 45 && p.recommendation !== "fade";
      })
      .sort((a, b) => {
        const scoreA = gradeToScore(a.grade) * 2 + a.ev + a.confidence / 20 + a.edge;
        const scoreB = gradeToScore(b.grade) * 2 + b.ev + b.confidence / 20 + b.edge;
        return scoreB - scoreA;
      });

    if (eligible.length < 3) continue;

    const ticketLegs: PrecomputedPick[] = [];
    for (const pick of eligible) {
      if (ticketLegs.length >= maxLegs) break;
      let conflicts = false;
      for (const existing of ticketLegs) {
        if (hasConflict(pick, existing)) {
          conflicts = true;
          break;
        }
      }
      if (!conflicts) {
        ticketLegs.push(pick);
      }
    }

    if (ticketLegs.length < 3) continue;

    const legs = ticketLegs.map(pickToLeg);
    const totalOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
    const totalAmerican = decimalToAmerican(totalOdds);
    const avgGradeScore = legs.reduce((s, l) => s + gradeToScore(l.grade), 0) / legs.length;
    const combinedGrade = scoreToGrade(avgGradeScore);
    const combinedConf = legs.reduce((s, l) => s + l.confidence, 0) / legs.length;
    const combinedEV = legs.reduce((s, l) => s + l.ev, 0) / legs.length;
    const winProb = legs.reduce((acc, l) => acc * (l.winProbability / 100), 1);

    const kellyEdge = (winProb * totalOdds - 1) / (totalOdds - 1);
    const kellyFraction = Math.max(0, kellyEdge) * 0.15;
    const stake = Math.max(5, Math.round(bankroll * Math.min(kellyFraction, 0.03)));
    const payout = Math.round(stake * totalOdds * 100) / 100;

    const spreads: OptimalTicketLeg[] = [];
    const totals: OptimalTicketLeg[] = [];
    const moneylines: OptimalTicketLeg[] = [];
    const playerProps: OptimalTicketLeg[] = [];
    const other: OptimalTicketLeg[] = [];

    for (const leg of legs) {
      const m = leg.market.toLowerCase();
      if (m.includes("spread")) spreads.push(leg);
      else if (m.includes("total") || m.includes("over") || m.includes("under")) totals.push(leg);
      else if (m.includes("moneyline") || m === "h2h") moneylines.push(leg);
      else if (m.includes("player") || m.includes("prop")) playerProps.push(leg);
      else other.push(leg);
    }

    const hasMC = legs.some(l => l.monteCarloData);
    const hasSit = legs.some(l => l.situationalData);
    const hasInj = legs.some(l => l.injuryData);
    const hasFactors = legs.every(l => l.factors.length > 0);

    const firstPick = ticketLegs[0];
    const reasoning = buildTicketReasoning(legs);

    const matchupHashInput = [firstPick.sport, gameName, legs.length, ...legs.map(l => l.pickId).sort()].join('|');
    const matchupHash = crypto.createHash('sha256').update(matchupHashInput).digest('hex').slice(0, 16);
    tickets.push({
      id: `matchup-${matchupHash}`,
      matchupGame: gameName,
      homeTeam: firstPick.homeTeam,
      awayTeam: firstPick.awayTeam,
      sport: firstPick.sport,
      legs,
      legCount: legs.length,
      totalOdds: Math.round(totalOdds * 100) / 100,
      americanOdds: totalAmerican,
      combinedGrade,
      combinedConfidence: Math.round(combinedConf * 10) / 10,
      combinedEV: Math.round(combinedEV * 10) / 10,
      winProbability: Math.round(winProb * 10000) / 100,
      recommendedStake: stake,
      potentialPayout: payout,
      reasoning,
      marketBreakdown: { spreads, totals, moneylines, playerProps, other },
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

  return tickets.sort((a, b) => {
    const scoreA = gradeToScore(a.combinedGrade) * 3 + a.combinedEV + a.combinedConfidence / 10 + a.legCount;
    const scoreB = gradeToScore(b.combinedGrade) * 3 + b.combinedEV + b.combinedConfidence / 10 + b.legCount;
    return scoreB - scoreA;
  });
}

// === Life Changer Ticket Builder ===

export interface LifeChangerLeg {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  americanOdds: number;
  decimalOdds: number;
  selectionReason: string;
  selectionCategory: "underdog" | "contrarian" | "alternative" | "sleeper";
  gameTime?: string;
  ev: number;
  confidence: number;
  isUnderdog: boolean;
}

export interface LifeChangerTicket {
  id: string;
  legs: LifeChangerLeg[];
  totalDecimalOdds: number;
  americanOdds: string;
  legCount: number;
  sports: string[];
  potentialPayouts: { stake: number; payout: number; formatted: string }[];
  selectionLogic: string;
  generatedAt: string;
  disclaimer: string;
}

function dateSeededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function soccerPickToPrecomputed(sp: SoccerPick): PrecomputedPick {
  const now = new Date().toISOString();
  return {
    id: sp.id,
    sport: sp.sport,
    game: sp.game,
    homeTeam: sp.homeTeam,
    awayTeam: sp.awayTeam,
    pick: sp.pick,
    betType: sp.betType,
    odds: sp.odds,
    confidence: sp.confidence,
    grade: sp.grade,
    edge: Math.abs(sp.ev),
    ev: sp.ev,
    factors: [],
    generatedAt: now,
    dataSource: "live" as const,
    gameTime: sp.gameTime,
    reasoning: sp.reasoning,
    recommendation: sp.pick,
    winProbability: sp.confidence / 100,
    insights: [sp.reasoning],
    timing: "bet_now" as const,
    timingAdvice: "Place before kickoff",
    releaseSchedule: {
      whaleRelease: now,
      eliteRelease: now,
      proRelease: now,
      freeRelease: now,
    },
    isExclusive: false,
  };
}

export function buildLifeChangerTicket(): LifeChangerTicket | null {
  const allPicks: PrecomputedPick[] = [];
  const sports: Sport[] = ["NBA", "NHL", "NCAAB", "NFL", "MLB"] as Sport[];

  for (const sport of sports) {
    const cache = predictionCache.get(sport);
    if (!cache) continue;
    allPicks.push(...cache.snapshot.picks.filter(p => p.timing !== "line_locked"));
  }

  // Inject international soccer picks into the Life Changer pool
  const soccerPicks = getInternationalLifeChangerPicks();
  const soccerConverted = soccerPicks
    .filter(sp => !sp.isLive) // only upcoming games
    .map(soccerPickToPrecomputed);
  allPicks.push(...soccerConverted);

  if (allPicks.length < 6) return null;

  const today = new Date().toISOString().slice(0, 10);
  const shuffled = dateSeededShuffle(allPicks, today);

  const underdogPool = shuffled.filter(p => p.odds >= 110 && p.odds <= 450 && p.ev > -2);
  const contrarianPool = shuffled.filter(p => p.odds < 0 && p.odds > -180 && p.ev > 2.5 && !["A+", "A"].includes(p.grade));
  const alternativePool = shuffled.filter(p => ["total", "first_half_total", "team_total", "first_half_spread"].includes(p.betType) && p.ev > 0);
  const sleeperPool = shuffled.filter(p => p.odds >= 200 && p.odds <= 600 && p.confidence >= 40);

  const selectedLegs: PrecomputedPick[] = [];
  const usedGames = new Set<string>();
  const sportCounts = new Map<string, number>();
  const MAX_PER_SPORT = 2;

  function tryAdd(pool: PrecomputedPick[], needed: number) {
    let added = 0;
    for (const pick of pool) {
      if (added >= needed) break;
      if (usedGames.has(pick.game)) continue;
      if ((sportCounts.get(pick.sport) || 0) >= MAX_PER_SPORT) continue;
      selectedLegs.push(pick);
      usedGames.add(pick.game);
      sportCounts.set(pick.sport, (sportCounts.get(pick.sport) || 0) + 1);
      added++;
    }
  }

  tryAdd(underdogPool, 4);
  tryAdd(contrarianPool, 3);
  tryAdd(alternativePool, 2);
  tryAdd(sleeperPool, 2);
  if (selectedLegs.length < 6) tryAdd(shuffled.filter(p => !selectedLegs.includes(p)), 8 - selectedLegs.length);

  if (selectedLegs.length < 4) return null;

  const totalDecimalOdds = selectedLegs.reduce((acc, p) => acc * americanToDecimal(p.odds), 1);
  const rawAmerican = decimalToAmerican(totalDecimalOdds);
  const americanOddsStr = rawAmerican > 0 ? `+${rawAmerican.toLocaleString()}` : rawAmerican.toLocaleString();

  const stakes = [10, 25, 50, 100];
  const potentialPayouts = stakes.map(s => {
    const raw = Math.round(s * totalDecimalOdds * 100) / 100;
    return {
      stake: s,
      payout: raw,
      formatted: raw >= 1000
        ? `$${(raw / 1000).toFixed(1)}K`
        : `$${raw.toFixed(0)}`,
    };
  });

  function getCategory(p: PrecomputedPick): LifeChangerLeg["selectionCategory"] {
    if (p.odds >= 200) return "sleeper";
    if (p.odds >= 110) return "underdog";
    if (["total", "first_half_total", "team_total", "first_half_spread"].includes(p.betType)) return "alternative";
    return "contrarian";
  }

  function getReason(p: PrecomputedPick): string {
    const cat = getCategory(p);
    if (cat === "sleeper") return `Long-shot sleeper — most bettors ignore ${p.sport} underdogs at this price`;
    if (cat === "underdog") return `Underdog value — model sees edge the market is underpricing`;
    if (cat === "alternative") return `Unorthodox market — public ignores ${p.betType.replace(/_/g, " ")} lines`;
    return `Contrarian play — going against the public lean for hidden value`;
  }

  const uniqueSports = [...new Set(selectedLegs.map(p => p.sport))];

  return {
    id: `lc-${today}`,
    legs: selectedLegs.map(p => ({
      sport: p.sport,
      game: p.game,
      pick: p.pick,
      betType: p.betType,
      americanOdds: p.odds,
      decimalOdds: americanToDecimal(p.odds),
      selectionReason: getReason(p),
      selectionCategory: getCategory(p),
      gameTime: p.gameTime,
      ev: p.ev,
      confidence: p.confidence,
      isUnderdog: p.odds >= 100,
    })),
    totalDecimalOdds: Math.round(totalDecimalOdds * 100) / 100,
    americanOdds: americanOddsStr,
    legCount: selectedLegs.length,
    sports: uniqueSports,
    potentialPayouts,
    selectionLogic: `${selectedLegs.length}-leg cross-sport parlay: underdogs + contrarian plays + alternative markets across ${uniqueSports.join(", ")}`,
    generatedAt: new Date().toISOString(),
    disclaimer: "High-risk parlay for entertainment purposes. Bet responsibly. Past results do not predict future outcomes.",
  };
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
