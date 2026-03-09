import type { Sport } from "@shared/schema";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { getInjuries, getInjurySummary, type InjuryReport } from "./espn-injury-provider";
import { getWeatherForGames, isOutdoorVenue, type VenueWeather } from "./weather-provider";
import { generateMarketSnapshot, type MarketSnapshot, type MarketGame, type LineMovementData } from "./marketSnapshotEngine";
import { getPrecomputedCache } from "./precomputedPredictionsEngine";
import { getMomentumGames, type MomentumGame } from "./liveAnalyticsEngine";
import { logError, logWarn } from "./errorLogger";
import { getInSeasonSports } from "./sportSeasons";
const HUB_REFRESH_INTERVAL = 120_000;

export interface UnifiedGame {
  id: string;
  sport: Sport;
  name: string;
  shortName: string;
  date: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    period: number;
    clock: string;
    completed: boolean;
  };
  venue?: string;
  broadcast?: string;
  odds?: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  bestLines?: MarketGame["bestLines"];
  edgeAnalysis?: MarketGame["edgeAnalysis"];
  bookmakerCount: number;
  injuries: {
    home: { total: number; starters: number; keyPlayers: string[] };
    away: { total: number; starters: number; keyPlayers: string[] };
  };
  weather?: {
    temperature: number;
    windSpeed: number;
    precipitation: number;
    impactLevel: string;
    factors: string[];
  };
  momentum?: {
    direction: "home" | "away" | "neutral";
    score: number;
  };
}

export interface TopPick {
  id: string;
  sport: Sport;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  factors: { name: string; impact: number; direction: string }[];
  gameTime?: string;
  homeTeam: string;
  awayTeam: string;
  reasoning: string;
  recommendation: string;
  winProbability: number;
  insights: string[];
}

export interface EdgeAlert {
  id: string;
  type: "line_movement" | "sharp_action" | "weather_impact" | "injury_update" | "arbitrage" | "high_ev";
  severity: "info" | "warning" | "critical";
  sport: Sport;
  game: string;
  title: string;
  description: string;
  reason: string;
  timing: "early_value" | "settled" | "steam" | "unknown";
  timestamp: string;
  actionable: boolean;
}

export interface DataSourceHealth {
  name: string;
  status: "live" | "stale" | "down";
  lastUpdated: string;
  latencyMs: number;
  recordCount: number;
}

export interface IntelligenceFeed {
  topPicks: TopPick[];
  liveGames: UnifiedGame[];
  upcomingGames: UnifiedGame[];
  edgeAlerts: EdgeAlert[];
  dataSourceHealth: DataSourceHealth[];
  sportSummaries: SportSummary[];
  opportunityScore: number;
  generatedAt: string;
  nextRefresh: string;
}

export interface SportSummary {
  sport: Sport;
  gamesCount: number;
  liveCount: number;
  upcomingCount: number;
  picksAvailable: number;
  topEdge: number;
  hasWeatherAlerts: boolean;
  hasInjuryAlerts: boolean;
}

interface SportSnapshot {
  sport: Sport;
  games: ESPNScoreboardGame[];
  marketData: MarketSnapshot | null;
  injuries: InjuryReport[];
  weatherMap: Map<string, VenueWeather>;
  momentum: MomentumGame[];
  timestamp: number;
}

const sportSnapshots = new Map<Sport, SportSnapshot>();
const dataSourceTimings = new Map<string, { lastSuccess: number; latencyMs: number; recordCount: number }>();
let hubRunning = false;
let hubInterval: ReturnType<typeof setInterval> | null = null;
let totalCycles = 0;
let lastCycleTime: number | null = null;
let cachedFeed: IntelligenceFeed | null = null;
let cachedFeedTime = 0;

function parseWinPct(record: string): number {
  if (!record) return 0.5;
  const parts = record.split("-");
  const wins = parseFloat(parts[0]);
  const losses = parseFloat(parts[1]);
  return (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
}

async function fetchSportSnapshot(sport: Sport): Promise<SportSnapshot> {
  const start = Date.now();
  const snapshot: SportSnapshot = {
    sport,
    games: [],
    marketData: null,
    injuries: [],
    weatherMap: new Map(),
    momentum: [],
    timestamp: Date.now(),
  };

  const [gamesResult, marketResult, injuriesResult] = await Promise.allSettled([
    getMultiDayScoreboard(sport, 3),
    generateMarketSnapshot(sport),
    getInjuries(sport),
  ]);

  if (gamesResult.status === "fulfilled") {
    snapshot.games = gamesResult.value;
    dataSourceTimings.set(`ESPN-${sport}`, {
      lastSuccess: Date.now(),
      latencyMs: Date.now() - start,
      recordCount: gamesResult.value.length,
    });
  }

  if (marketResult.status === "fulfilled") {
    snapshot.marketData = marketResult.value;
    const hasOdds = marketResult.value.meta.gamesWithOdds > 0;
    if (hasOdds) {
      dataSourceTimings.set(`OddsAPI-${sport}`, {
        lastSuccess: Date.now(),
        latencyMs: Date.now() - start,
        recordCount: marketResult.value.meta.gamesWithOdds,
      });
    }
  }

  if (injuriesResult.status === "fulfilled") {
    snapshot.injuries = injuriesResult.value;
    dataSourceTimings.set(`Injuries-${sport}`, {
      lastSuccess: Date.now(),
      latencyMs: Date.now() - start,
      recordCount: injuriesResult.value.reduce((acc, r) => acc + r.injuries.length, 0),
    });
  }

  const outdoorGames = snapshot.games
    .filter(g => g.venue?.name && isOutdoorVenue(g.venue.name) && g.status.state !== "post")
    .map(g => ({ venue: g.venue?.name, startTime: g.date }));

  if (outdoorGames.length > 0) {
    try {
      snapshot.weatherMap = await getWeatherForGames(outdoorGames);
      if (snapshot.weatherMap.size > 0) {
        dataSourceTimings.set("Weather", {
          lastSuccess: Date.now(),
          latencyMs: Date.now() - start,
          recordCount: snapshot.weatherMap.size,
        });
      }
    } catch {}
  }

  return snapshot;
}

function buildUnifiedGame(game: ESPNScoreboardGame, snapshot: SportSnapshot): UnifiedGame {
  const marketGame = snapshot.marketData?.games.find(mg => mg.id === game.id);

  const homeInjuries = snapshot.injuries.find(
    r => r.teamAbbreviation === game.homeTeam.abbreviation || r.teamName.includes(game.homeTeam.shortDisplayName)
  );
  const awayInjuries = snapshot.injuries.find(
    r => r.teamAbbreviation === game.awayTeam.abbreviation || r.teamName.includes(game.awayTeam.shortDisplayName)
  );

  const keyInjuries = (report?: InjuryReport) => {
    if (!report) return { total: 0, starters: 0, keyPlayers: [] as string[] };
    const out = report.injuries.filter(p =>
      p.status.toLowerCase().includes("out") || p.status.toLowerCase().includes("doubtful")
    );
    return {
      total: report.injuries.length,
      starters: out.length,
      keyPlayers: out.slice(0, 3).map(p => p.playerName),
    };
  };

  const weather = game.venue?.name ? snapshot.weatherMap.get(game.venue.name) : undefined;

  const momentumGame = snapshot.momentum.find(m => m.id === game.id);

  return {
    id: game.id,
    sport: snapshot.sport,
    name: game.name,
    shortName: game.shortName,
    date: game.date,
    homeTeam: {
      name: game.homeTeam.displayName,
      abbreviation: game.homeTeam.abbreviation,
      record: game.homeTeam.record || "0-0",
      score: game.homeTeam.score,
      logo: game.homeTeam.logo,
      color: game.homeTeam.color,
      winPct: Math.round(parseWinPct(game.homeTeam.record || "0-0") * 1000) / 10,
    },
    awayTeam: {
      name: game.awayTeam.displayName,
      abbreviation: game.awayTeam.abbreviation,
      record: game.awayTeam.record || "0-0",
      score: game.awayTeam.score,
      logo: game.awayTeam.logo,
      color: game.awayTeam.color,
      winPct: Math.round(parseWinPct(game.awayTeam.record || "0-0") * 1000) / 10,
    },
    status: {
      state: game.status.state,
      detail: game.status.detail,
      period: game.status.period,
      clock: game.status.clock,
      completed: game.status.completed,
    },
    venue: game.venue?.name,
    broadcast: game.broadcast,
    odds: marketGame ? marketGame.consensus : (game.odds ? {
      homeMoneyline: game.odds.homeMoneyline,
      awayMoneyline: game.odds.awayMoneyline,
      spread: game.odds.spread ? parseFloat(game.odds.spread) || undefined : undefined,
      total: game.odds.overUnder,
    } : undefined),
    bestLines: marketGame?.bestLines,
    edgeAnalysis: marketGame?.edgeAnalysis,
    bookmakerCount: marketGame?.bookmakers?.length || 0,
    injuries: {
      home: keyInjuries(homeInjuries),
      away: keyInjuries(awayInjuries),
    },
    weather: weather ? {
      temperature: weather.current.temperature,
      windSpeed: weather.current.windSpeed,
      precipitation: weather.current.precipitation,
      impactLevel: weather.bettingImpact.level,
      factors: weather.bettingImpact.factors,
    } : undefined,
    momentum: momentumGame ? {
      direction: momentumGame.momentum,
      score: momentumGame.momentumScore,
    } : undefined,
  };
}

function determineMovementTiming(game: MarketGame, lm?: LineMovementData): "early_value" | "settled" | "steam" | "unknown" {
  const gameTime = new Date(game.date).getTime();
  const now = Date.now();
  const hoursUntilGame = (gameTime - now) / (1000 * 60 * 60);

  if (lm?.velocity === "steam") return "steam";
  if (hoursUntilGame > 24) return "early_value";
  if (hoursUntilGame < 6) return "settled";
  if (lm?.velocity === "slow" || lm?.direction === "stable") return "settled";
  return "early_value";
}

function buildLineMovementReason(
  game: MarketGame,
  lm: LineMovementData,
  snapshot: SportSnapshot,
): string {
  const parts: string[] = [];
  const moveDesc = `Line moved ${lm.market} ${lm.opening} → ${lm.current}`;
  parts.push(moveDesc);

  const homeInjuries = snapshot.injuries.find(
    r => r.teamAbbreviation === game.homeTeam.abbreviation || r.teamName.includes(game.homeTeam.name)
  );
  const awayInjuries = snapshot.injuries.find(
    r => r.teamAbbreviation === game.awayTeam.abbreviation || r.teamName.includes(game.awayTeam.name)
  );

  const homeOut = homeInjuries?.injuries.filter(p =>
    p.status.toLowerCase().includes("out") || p.status.toLowerCase().includes("doubtful")
  ) || [];
  const awayOut = awayInjuries?.injuries.filter(p =>
    p.status.toLowerCase().includes("out") || p.status.toLowerCase().includes("doubtful")
  ) || [];

  const hasInjuryContext = homeOut.length > 0 || awayOut.length > 0;

  if (hasInjuryContext) {
    if (homeOut.length > 0 && lm.direction === "down") {
      parts.push(`Possible injury factor: ${homeOut.slice(0, 2).map(p => p.playerName).join(", ")} listed OUT for ${game.homeTeam.abbreviation}.`);
    } else if (awayOut.length > 0 && lm.direction === "up") {
      parts.push(`Possible injury factor: ${awayOut.slice(0, 2).map(p => p.playerName).join(", ")} listed OUT for ${game.awayTeam.abbreviation}.`);
    } else {
      parts.push("No injury news aligns with this move.");
    }
  } else {
    parts.push("No injury news — likely professional money driving the move.");
  }

  if (lm.sharpAction) {
    if (lm.market === "spread") {
      if (lm.direction === "down") {
        parts.push("Sharp action detected — spread tightening in favor of the underdog.");
      } else if (lm.direction === "up") {
        parts.push("Sharp action detected — spread widening, bettors backing the favorite.");
      }
    } else if (lm.market === "total") {
      if (lm.direction === "down") {
        parts.push("Sharp money on the Under — total has been bet down.");
      } else if (lm.direction === "up") {
        parts.push("Sharp money on the Over — total has been bet up.");
      }
    } else {
      parts.push("Sharp money detected — professional bettors may be on this game.");
    }
  }

  const weather = game.venue ? snapshot.weatherMap.get(game.venue) : undefined;
  if (weather && (weather.bettingImpact.level === "high" || weather.bettingImpact.level === "extreme")) {
    parts.push(`Weather change may be a factor: ${weather.bettingImpact.factors.slice(0, 2).join(", ")}.`);
  }

  return parts.join(" ");
}

function generateEdgeAlerts(snapshots: SportSnapshot[]): EdgeAlert[] {
  const alerts: EdgeAlert[] = [];
  const now = new Date().toISOString();
  let alertId = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.marketData) continue;

    for (const game of snapshot.marketData.games) {
      if (game.edgeAnalysis?.hasArbitrage && game.edgeAnalysis.arbProfit) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: "arbitrage",
          severity: "critical",
          sport: snapshot.sport,
          game: game.shortName,
          title: "Arbitrage Detected",
          description: `${game.edgeAnalysis.arbProfit.toFixed(1)}% potential arb edge on ${game.shortName}`,
          reason: `Cross-book price discrepancy shows a ${game.edgeAnalysis.arbProfit.toFixed(1)}% theoretical edge. Act fast — arb windows close quickly. Verify with both books before placing; sportsbooks may limit or void arb activity.`,
          timing: determineMovementTiming(game),
          timestamp: now,
          actionable: true,
        });
      }

      const homeEV = game.edgeAnalysis?.homeEV || 0;
      const awayEV = game.edgeAnalysis?.awayEV || 0;
      const maxEV = Math.max(homeEV, awayEV);
      if (maxEV > 0.08) {
        const side = homeEV >= awayEV ? game.homeTeam.name : game.awayTeam.name;
        const timing = determineMovementTiming(game);
        const timingAdvice = timing === "early_value"
          ? "Line still settling — value may increase or disappear."
          : timing === "steam"
            ? "Line moving fast — value disappearing."
            : "Line relatively stable — window may hold.";
        alerts.push({
          id: `alert-${alertId++}`,
          type: "high_ev",
          severity: "warning",
          sport: snapshot.sport,
          game: game.shortName,
          title: "High Expected Value",
          description: `${side} shows +${(maxEV * 100).toFixed(1)}% EV in ${game.shortName}`,
          reason: `Model projects ${side} at higher win probability than the market implies, creating a +${(maxEV * 100).toFixed(1)}% expected value edge. ${timingAdvice}`,
          timing,
          timestamp: now,
          actionable: true,
        });
      }

      for (const lm of game.lineMovement) {
        if (lm.sharpAction) {
          const movementReason = buildLineMovementReason(game, lm, snapshot);
          const timing = determineMovementTiming(game, lm);
          alerts.push({
            id: `alert-${alertId++}`,
            type: "sharp_action",
            severity: lm.velocity === "steam" ? "critical" : "warning",
            sport: snapshot.sport,
            game: game.shortName,
            title: lm.velocity === "steam" ? "Steam Move Detected" : "Sharp Money Detected",
            description: `${lm.market === "spread" ? "Spread" : "Total"} shifted ${lm.opening} → ${lm.current} on ${game.shortName}`,
            reason: movementReason,
            timing,
            timestamp: now,
            actionable: true,
          });
        }

        if (!lm.sharpAction && Math.abs(lm.movement) >= 1.5) {
          const movementReason = buildLineMovementReason(game, lm, snapshot);
          alerts.push({
            id: `alert-${alertId++}`,
            type: "line_movement",
            severity: "info",
            sport: snapshot.sport,
            game: game.shortName,
            title: "Significant Line Movement",
            description: `${lm.market} shifted ${lm.opening} → ${lm.current} on ${game.shortName}`,
            reason: movementReason,
            timing: determineMovementTiming(game, lm),
            timestamp: now,
            actionable: true,
          });
        }
      }
    }

    for (const game of snapshot.games) {
      if (!game.venue?.name) continue;
      const weather = snapshot.weatherMap.get(game.venue.name);
      if (weather && (weather.bettingImpact.level === "high" || weather.bettingImpact.level === "extreme")) {
        const factors = weather.bettingImpact.factors.slice(0, 3).join(", ");
        alerts.push({
          id: `alert-${alertId++}`,
          type: "weather_impact",
          severity: weather.bettingImpact.level === "extreme" ? "critical" : "warning",
          sport: snapshot.sport,
          game: game.shortName,
          title: "Weather Alert",
          description: `${weather.bettingImpact.level} weather impact: ${weather.bettingImpact.factors.slice(0, 2).join(", ")}`,
          reason: `Weather conditions at ${game.venue.name} could affect game play: ${factors}. Consider totals and outdoor-dependent props.`,
          timing: "unknown",
          timestamp: now,
          actionable: true,
        });
      }
    }

    const injSummary = getInjurySummary(snapshot.injuries);
    const totalOut = injSummary.byStatus["Out"] || injSummary.byStatus["out"] || 0;
    if (totalOut > 5) {
      alerts.push({
        id: `alert-${alertId++}`,
        type: "injury_update",
        severity: "info",
        sport: snapshot.sport,
        game: `${snapshot.sport} Games`,
        title: "Significant Injury Load",
        description: `${totalOut} players listed as OUT across ${snapshot.sport} today`,
        reason: `${totalOut} players are confirmed OUT across ${snapshot.sport} games today. Lines may shift as books adjust for missing personnel.`,
        timing: "unknown",
        timestamp: now,
        actionable: false,
      });
    }
  }

  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
  });

  return alerts.slice(0, 25);
}

function gatherTopPicks(): TopPick[] {
  const allPicks: TopPick[] = [];

  for (const sport of getInSeasonSports()) {
    const cached = getPrecomputedCache(sport);
    if (!cached || !cached.picks) continue;

    for (const pick of cached.picks) {
      const p = pick as any;
      // Skip picks with unresolved opponents (tournament TBD bracket games)
      if (p.homeTeam === "TBD" || p.awayTeam === "TBD" || (p.game && (p.game.includes(" TBD") || p.game.startsWith("TBD ")))) continue;
      allPicks.push({
        id: p.id,
        sport,
        game: p.game,
        pick: p.pick,
        betType: p.betType,
        odds: p.odds,
        confidence: p.confidence,
        grade: p.grade,
        edge: p.edge,
        ev: p.ev,
        factors: p.factors || [],
        gameTime: p.gameTime,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        reasoning: p.reasoning || buildReasoning(p),
        recommendation: p.recommendation || "lean_bet",
        winProbability: p.winProbability || Math.round(p.confidence * 0.95),
        insights: p.insights || [],
      });
    }
  }

  allPicks.sort((a, b) => {
    const scoreA = (a.confidence / 100) * Math.max(0, a.ev + 5);
    const scoreB = (b.confidence / 100) * Math.max(0, b.ev + 5);
    return scoreB - scoreA;
  });

  return allPicks.slice(0, 20);
}

function buildReasoning(pick: any): string {
  const reasons: string[] = [];
  if (pick.confidence >= 70) reasons.push("high model confidence");
  if (pick.ev > 3) reasons.push(`strong +${pick.ev.toFixed(1)}% EV`);
  if (pick.edge > 2) reasons.push(`${pick.edge.toFixed(1)}% edge over market`);

  const topFactors = (pick.factors || [])
    .filter((f: any) => Math.abs(f.impact) >= 3)
    .slice(0, 2)
    .map((f: any) => f.name.toLowerCase());
  if (topFactors.length > 0) reasons.push(`driven by ${topFactors.join(" & ")}`);

  return reasons.length > 0 ? reasons.join(", ") : "intelligence-projected value";
}

function buildDataSourceHealth(): DataSourceHealth[] {
  const sources: DataSourceHealth[] = [];
  const now = Date.now();

  const espnAgg = { lastSuccess: 0, latencyMs: 0, records: 0, count: 0 };
  const oddsAgg = { lastSuccess: 0, latencyMs: 0, records: 0, count: 0 };
  const injAgg = { lastSuccess: 0, latencyMs: 0, records: 0, count: 0 };

  for (const [key, val] of Array.from(dataSourceTimings.entries())) {
    if (key.startsWith("ESPN-")) {
      espnAgg.lastSuccess = Math.max(espnAgg.lastSuccess, val.lastSuccess);
      espnAgg.latencyMs += val.latencyMs;
      espnAgg.records += val.recordCount;
      espnAgg.count++;
    } else if (key.startsWith("OddsAPI-")) {
      oddsAgg.lastSuccess = Math.max(oddsAgg.lastSuccess, val.lastSuccess);
      oddsAgg.latencyMs += val.latencyMs;
      oddsAgg.records += val.recordCount;
      oddsAgg.count++;
    } else if (key.startsWith("Injuries-")) {
      injAgg.lastSuccess = Math.max(injAgg.lastSuccess, val.lastSuccess);
      injAgg.latencyMs += val.latencyMs;
      injAgg.records += val.recordCount;
      injAgg.count++;
    }
  }

  const weatherTiming = dataSourceTimings.get("Weather");

  const statusFromAge = (ts: number): "live" | "stale" | "down" => {
    if (ts === 0) return "down";
    const age = now - ts;
    if (age < 5 * 60_000) return "live";
    if (age < 30 * 60_000) return "stale";
    return "down";
  };

  sources.push({
    name: "ESPN Scoreboard",
    status: statusFromAge(espnAgg.lastSuccess),
    lastUpdated: espnAgg.lastSuccess ? new Date(espnAgg.lastSuccess).toISOString() : "never",
    latencyMs: espnAgg.count > 0 ? Math.round(espnAgg.latencyMs / espnAgg.count) : 0,
    recordCount: espnAgg.records,
  });

  sources.push({
    name: "The Odds API",
    status: statusFromAge(oddsAgg.lastSuccess),
    lastUpdated: oddsAgg.lastSuccess ? new Date(oddsAgg.lastSuccess).toISOString() : "never",
    latencyMs: oddsAgg.count > 0 ? Math.round(oddsAgg.latencyMs / oddsAgg.count) : 0,
    recordCount: oddsAgg.records,
  });

  sources.push({
    name: "ESPN Injuries",
    status: statusFromAge(injAgg.lastSuccess),
    lastUpdated: injAgg.lastSuccess ? new Date(injAgg.lastSuccess).toISOString() : "never",
    latencyMs: injAgg.count > 0 ? Math.round(injAgg.latencyMs / injAgg.count) : 0,
    recordCount: injAgg.records,
  });

  sources.push({
    name: "Open-Meteo Weather",
    status: weatherTiming ? statusFromAge(weatherTiming.lastSuccess) : "down",
    lastUpdated: weatherTiming?.lastSuccess ? new Date(weatherTiming.lastSuccess).toISOString() : "never",
    latencyMs: weatherTiming?.latencyMs || 0,
    recordCount: weatherTiming?.recordCount || 0,
  });

  sources.push({
    name: "Quantum Fusion Engine",
    status: "live",
    lastUpdated: new Date().toISOString(),
    latencyMs: 0,
    recordCount: gatherTopPicks().length,
  });

  return sources;
}

function calculateOpportunityScore(topPicks: TopPick[], alerts: EdgeAlert[]): number {
  let score = 50;

  const highConfPicks = topPicks.filter(p => p.confidence >= 65).length;
  score += Math.min(20, highConfPicks * 3);

  const positiveEV = topPicks.filter(p => p.ev > 0).length;
  score += Math.min(15, positiveEV * 2);

  const criticalAlerts = alerts.filter(a => a.severity === "critical" && a.actionable).length;
  score += Math.min(10, criticalAlerts * 5);

  const warningAlerts = alerts.filter(a => a.severity === "warning" && a.actionable).length;
  score += Math.min(5, warningAlerts);

  return Math.min(100, Math.max(0, score));
}

export async function generateIntelligenceFeed(): Promise<IntelligenceFeed> {
  if (cachedFeed && (Date.now() - cachedFeedTime) < 30_000) {
    return cachedFeed;
  }

  const snapshots = Array.from(sportSnapshots.values());

  const allGames: UnifiedGame[] = [];
  for (const snapshot of snapshots) {
    for (const game of snapshot.games) {
      if (game.status.completed) continue;
      allGames.push(buildUnifiedGame(game, snapshot));
    }
  }

  const liveGames = allGames.filter(g => g.status.state === "in");
  const upcomingGames = allGames
    .filter(g => g.status.state === "pre")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let topPicks = gatherTopPicks();

  // Merge top international soccer/MMA picks into the feed so they appear in
  // the app alongside domestic picks. International engine runs every 6h and
  // caches its results; we read from the cache so this is near-zero overhead.
  try {
    const { getInternationalLifeChangerPicks } = await import("./internationalSportsEngine");
    const intlPicks = getInternationalLifeChangerPicks();
    const qualifiedIntl = intlPicks
      .filter(p => (p.confidence ?? 0) >= 55 && (p.ev ?? 0) > 0)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id || `intl-${p.fixture?.fixtureId || Math.random().toString(36).slice(2)}`,
        sport: p.sport || "SOCCER",
        game: p.fixture ? `${p.fixture.homeTeam} vs ${p.fixture.awayTeam}` : (p.game || ""),
        pick: p.pick || p.outcome || "",
        betType: p.betType || "moneyline",
        odds: p.americanOdds || p.odds || -110,
        confidence: p.confidence || 55,
        grade: p.grade || "B",
        edge: p.edge || p.ev || 0,
        ev: p.ev || 0,
        gameTime: p.gameTime || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        reasoning: p.selectionReason || p.reasoning || "International edge pick",
        factors: [],
        sharpMoneyPct: p.sharpMoneyPct,
        publicMoneyPct: p.publicMoneyPct,
        reverseLineMove: false,
        steamMove: false,
        oddsSource: p.oddsSource || "International",
        bestOddsBook: p.bestOddsBook,
      }));
    if (qualifiedIntl.length > 0) {
      topPicks = [...topPicks, ...qualifiedIntl];
    }
  } catch { /* international feed is best-effort */ }

  const edgeAlerts = generateEdgeAlerts(snapshots);

  const sportSummaries: SportSummary[] = getInSeasonSports().map(sport => {
    const snapshot = sportSnapshots.get(sport);
    const sportGames = allGames.filter(g => g.sport === sport);
    const cached = getPrecomputedCache(sport);
    const picks = (cached as any)?.picks || [];
    const topEdge = picks.reduce((max: number, p: any) => Math.max(max, p.edge || 0), 0);
    const hasWeather = sportGames.some(g => g.weather && g.weather.impactLevel !== "none");
    const hasInjuries = sportGames.some(g => g.injuries.home.starters > 0 || g.injuries.away.starters > 0);

    return {
      sport,
      gamesCount: sportGames.length,
      liveCount: sportGames.filter(g => g.status.state === "in").length,
      upcomingCount: sportGames.filter(g => g.status.state === "pre").length,
      picksAvailable: picks.length,
      topEdge: Math.round(topEdge * 10) / 10,
      hasWeatherAlerts: hasWeather,
      hasInjuryAlerts: hasInjuries,
    };
  }).filter(s => s.gamesCount > 0 || s.picksAvailable > 0);

  const opportunityScore = calculateOpportunityScore(topPicks, edgeAlerts);

  const feed: IntelligenceFeed = {
    topPicks,
    liveGames,
    upcomingGames: upcomingGames.slice(0, 30),
    edgeAlerts,
    dataSourceHealth: buildDataSourceHealth(),
    sportSummaries,
    opportunityScore,
    generatedAt: new Date().toISOString(),
    nextRefresh: new Date(Date.now() + 30_000).toISOString(),
  };

  cachedFeed = feed;
  cachedFeedTime = Date.now();

  return feed;
}

export async function getUnifiedSnapshot(sport: Sport): Promise<SportSnapshot | null> {
  return sportSnapshots.get(sport) || null;
}

async function runHubCycle(): Promise<void> {
  const cycleStart = Date.now();
  totalCycles++;
  console.log(`[IntelligenceHub] Starting cycle #${totalCycles}...`);

  const results = await Promise.allSettled(
    getInSeasonSports().map(async sport => {
      try {
        const snapshot = await fetchSportSnapshot(sport);
        sportSnapshots.set(sport, snapshot);
        return { sport, games: snapshot.games.length };
      } catch (err) {
        logWarn(`[IntelligenceHub] Failed to fetch ${sport}`, { error: String(err) });
        return { sport, games: 0 };
      }
    })
  );

  try {
    const momentum = await getMomentumGames();
    for (const m of momentum) {
      for (const [, snapshot] of Array.from(sportSnapshots.entries())) {
        const existing = snapshot.momentum.find((g: any) => g.id === m.id);
        if (!existing) {
          const hasGame = snapshot.games.find((g: any) => g.id === m.id);
          if (hasGame) snapshot.momentum.push(m);
        }
      }
    }
  } catch {}

  cachedFeed = null;
  cachedFeedTime = 0;

  lastCycleTime = Date.now() - cycleStart;

  const sportCounts = results
    .filter((r): r is PromiseFulfilledResult<{ sport: Sport; games: number }> => r.status === "fulfilled")
    .map(r => `${r.value.sport}:${r.value.games}`)
    .join(", ");

  console.log(`[IntelligenceHub] Cycle #${totalCycles} complete in ${lastCycleTime}ms [${sportCounts}]`);
}

export function startIntelligenceHub(): void {
  if (hubRunning) return;
  hubRunning = true;
  console.log("[IntelligenceHub] Starting Unified Intelligence Hub...");

  runHubCycle().catch(err => logError("[IntelligenceHub] Initial cycle failed", { error: String(err) }));

  hubInterval = setInterval(() => {
    runHubCycle().catch(err => logError("[IntelligenceHub] Cycle failed", { error: String(err) }));
  }, HUB_REFRESH_INTERVAL);
}

export function stopIntelligenceHub(): void {
  if (!hubRunning) return;
  if (hubInterval) {
    clearInterval(hubInterval);
    hubInterval = null;
  }
  hubRunning = false;
  console.log("[IntelligenceHub] Hub stopped.");
}

export function getHubStatus() {
  const sportStatus: Record<string, { games: number; age: string; hasMarketData: boolean }> = {};
  for (const [sport, snap] of Array.from(sportSnapshots.entries())) {
    sportStatus[sport] = {
      games: snap.games.length,
      age: snap.timestamp ? `${Math.round((Date.now() - snap.timestamp) / 1000)}s ago` : "never",
      hasMarketData: !!snap.marketData && snap.marketData.games.length > 0,
    };
  }

  return {
    running: hubRunning,
    totalCycles,
    lastCycleTimeMs: lastCycleTime,
    sportStatus,
    dataSourceHealth: buildDataSourceHealth(),
    feedCached: !!cachedFeed,
  };
}
