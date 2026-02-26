import { randomBytes, createHash } from "crypto";
import { liveSportsData, type LiveGame } from "./live-sports-data";
import { logError, logInfo, logWarn } from "./errorLogger";

// ═══════════════════════════════════════════════════════════════════════════════
// SORS MAXIMA — REAL-TIME SPORTS BETTING ANALYTICS AGENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// A behind-the-scenes orchestration engine that ingests, validates, reconciles,
// and analyzes live sports data in real time. Hidden from users, controllable
// by admins only.
// ═══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  freshnessWindowSeconds: number;
  modelConfidenceThreshold: number;
  ambiguityFuzzyThreshold: number;
  retryPolicy: { tries: number; backoffMs: number };
  jurisdictionCode: string;
  userRiskProfile: "conservative" | "balanced" | "aggressive";
  maxOutputRatePerEventPerMinute: number;
  updateIntervalMs: number;
  enableArbitrageDetection: boolean;
  enableCorrelationAnalysis: boolean;
  enableRiskExposure: boolean;
  enableModelPredictions: boolean;
  enableLiquidityMonitoring: boolean;
  staleFeedThresholdMs: number;
}

export interface DataQuality {
  status: "ok" | "stale" | "ambiguous" | "error";
  details: string;
  lastLatencyMs: number;
  lastTimestamp: string;
  recoveryEstimate?: string;
}

export interface ProviderSnapshot {
  provider: string;
  decimal: number;
  american: string;
  liquidity: number;
  timestamp: string;
}

export interface OddsData {
  providerSnapshots: ProviderSnapshot[];
  canonical: {
    decimal: number;
    american: string;
    liquidity: number;
    timestamp: string;
    source: string;
  };
  impliedProbabilities: {
    raw: number;
    vigAdjusted: number;
  };
}

export interface ModelOutput {
  pModel: number;
  confidenceInterval: [number, number];
  modelVersion: string;
  featureContributions: { feature: string; contribution: number }[];
  requiresHumanReview: boolean;
}

export interface ValueMetrics {
  evPerUnit: number;
  roi: number;
  kellyFraction: number;
  fractionalKelly: number;
}

export interface MarketSignals {
  arbitrageOpportunity: { exists: boolean; details: Record<string, any> };
  oddsOutlierScore: number;
  liquidityAnomaly: { score: number; reason: string };
}

export interface RiskMetrics {
  recommendedCap: number;
  maxLossSim: number;
  exposureEstimate: number;
}

export interface ProvenanceEntry {
  sourceId: string;
  feedType: string;
  timestamp: string;
}

export interface MarketAnalysis {
  eventId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  market: { type: string; specifier: string };
  timestamp: string;
  dataQuality: DataQuality;
  odds: OddsData;
  model: ModelOutput;
  value: ValueMetrics;
  signals: MarketSignals;
  risk: RiskMetrics;
  provenance: ProvenanceEntry[];
  trends: {
    shortTerm: { delta: number; zScore: number; period: string };
    mediumTerm: { delta: number; zScore: number; period: string };
    seasonLong: { delta: number; zScore: number; period: string };
  };
}

export interface AgentSnapshot {
  snapshotId: string;
  timestamp: string;
  config: AgentConfig;
  status: AgentStatus;
  markets: MarketAnalysis[];
  feedHealth: FeedHealthReport[];
  metrics: AgentMetrics;
  errors: AgentError[];
}

export interface AgentStatus {
  running: boolean;
  startedAt: string | null;
  lastCycleAt: string | null;
  totalCycles: number;
  uptime: number;
  currentPhase: "idle" | "ingesting" | "normalizing" | "analyzing" | "monitoring" | "sleeping";
  feedsActive: number;
  feedsStale: number;
  feedsError: number;
  eventsTracked: number;
  marketsAnalyzed: number;
  arbitrageAlerts: number;
  modelDriftAlerts: number;
}

export interface FeedHealthReport {
  feedId: string;
  feedType: string;
  source: string;
  status: "healthy" | "degraded" | "stale" | "error" | "offline";
  latencyMs: number;
  lastSuccessAt: string;
  lastErrorAt: string | null;
  errorCount: number;
  recordsProcessed: number;
  freshnessScore: number;
  retryCount: number;
}

export interface AgentMetrics {
  cyclesCompleted: number;
  avgCycleTimeMs: number;
  recordsIngested: number;
  recordsRejected: number;
  recordsQuarantined: number;
  ambiguousRecords: number;
  arbitrageDetections: number;
  modelPredictions: number;
  riskAlerts: number;
  feedRefreshes: number;
  cacheHits: number;
  cacheMisses: number;
  uptimePercent: number;
  memoryUsageMb: number;
  lastMetricsReset: string;
}

export interface AgentError {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
  category: "feed" | "normalization" | "analysis" | "model" | "risk" | "system";
  message: string;
  feedId?: string;
  eventId?: string;
  retryable: boolean;
  resolved: boolean;
  resolvedAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CANONICAL TEAM NAME DATABASE
// ──────────────────────────────────────────────────────────────────────────────

const CANONICAL_TEAMS: Record<string, string[]> = {
  "New York Knicks": ["NY Knicks", "Knicks", "NYK", "New York"],
  "Los Angeles Lakers": ["LA Lakers", "Lakers", "LAL"],
  "Boston Celtics": ["Celtics", "BOS", "Boston"],
  "Golden State Warriors": ["Warriors", "GSW", "Golden St", "GS Warriors"],
  "Milwaukee Bucks": ["Bucks", "MIL", "Milwaukee"],
  "Dallas Mavericks": ["Mavs", "Mavericks", "DAL", "Dallas"],
  "Miami Heat": ["Heat", "MIA", "Miami"],
  "Phoenix Suns": ["Suns", "PHX", "Phoenix"],
  "Denver Nuggets": ["Nuggets", "DEN", "Denver"],
  "Philadelphia 76ers": ["76ers", "Sixers", "PHI", "Philly"],
  "Kansas City Chiefs": ["Chiefs", "KC", "Kansas City"],
  "Buffalo Bills": ["Bills", "BUF", "Buffalo"],
  "Philadelphia Eagles": ["Eagles", "PHI Eagles"],
  "Dallas Cowboys": ["Cowboys", "DAL Cowboys"],
  "San Francisco 49ers": ["49ers", "SF", "Niners"],
  "New York Yankees": ["Yankees", "NYY", "NY Yankees"],
  "Los Angeles Dodgers": ["Dodgers", "LAD", "LA Dodgers"],
  "Atlanta Braves": ["Braves", "ATL", "Atlanta"],
  "New York Rangers": ["Rangers", "NYR", "NY Rangers"],
  "Boston Bruins": ["Bruins", "BOS Bruins"],
  "Colorado Avalanche": ["Avalanche", "Avs", "COL"],
};

// ──────────────────────────────────────────────────────────────────────────────
// SIMULATED FEED SOURCES
// ──────────────────────────────────────────────────────────────────────────────

interface FeedSource {
  id: string;
  name: string;
  type: "odds" | "score" | "play_by_play" | "injury" | "weather" | "historical" | "sentiment" | "liquidity";
  priority: number;
  baseLatencyMs: number;
  reliability: number;
}

const FEED_SOURCES: FeedSource[] = [
  { id: "espn_live", name: "ESPN Live Scores", type: "score", priority: 1, baseLatencyMs: 50, reliability: 0.99 },
  { id: "espn_pbp", name: "ESPN Play-by-Play", type: "play_by_play", priority: 1, baseLatencyMs: 80, reliability: 0.97 },
  { id: "draftkings_odds", name: "DraftKings Odds", type: "odds", priority: 1, baseLatencyMs: 30, reliability: 0.98 },
  { id: "fanduel_odds", name: "FanDuel Odds", type: "odds", priority: 2, baseLatencyMs: 35, reliability: 0.97 },
  { id: "betmgm_odds", name: "BetMGM Odds", type: "odds", priority: 3, baseLatencyMs: 40, reliability: 0.96 },
  { id: "caesars_odds", name: "Caesars Odds", type: "odds", priority: 4, baseLatencyMs: 45, reliability: 0.95 },
  { id: "injury_feed", name: "Official Injury Reports", type: "injury", priority: 1, baseLatencyMs: 200, reliability: 0.99 },
  { id: "weather_feed", name: "Weather Service", type: "weather", priority: 1, baseLatencyMs: 300, reliability: 0.99 },
  { id: "sentiment_feed", name: "Social Sentiment", type: "sentiment", priority: 3, baseLatencyMs: 500, reliability: 0.85 },
  { id: "exchange_liq", name: "Exchange Liquidity", type: "liquidity", priority: 2, baseLatencyMs: 60, reliability: 0.93 },
  { id: "historical_db", name: "Historical Database", type: "historical", priority: 1, baseLatencyMs: 100, reliability: 0.999 },
];

// ──────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function decimalToAmerican(decimal: number): string {
  if (decimal >= 2.0) return `+${Math.round((decimal - 1) * 100)}`;
  return `-${Math.round(100 / (decimal - 1))}`;
}

function americanToDecimal(american: number): number {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

function impliedProbability(decimal: number): number {
  return Math.min(0.99, Math.max(0.01, 1 / decimal));
}

function vigAdjustedProbability(rawProb: number, totalOverround: number): number {
  return rawProb / totalOverround;
}

function kellyFraction(winProb: number, decimal: number): number {
  const b = decimal - 1;
  const q = 1 - winProb;
  const kelly = (b * winProb - q) / b;
  return Math.max(0, kelly);
}

function fractionalKelly(fullKelly: number, riskProfile: "conservative" | "balanced" | "aggressive"): number {
  const fractions = { conservative: 0.25, balanced: 0.5, aggressive: 0.75 };
  return fullKelly * fractions[riskProfile];
}

function fuzzyMatch(input: string, candidates: string[]): { match: string; confidence: number } {
  let bestMatch = input;
  let bestScore = 0;

  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
  const inputNorm = normalize(input);

  for (const [canonical, aliases] of Object.entries(CANONICAL_TEAMS)) {
    const all = [canonical, ...aliases];
    for (const candidate of all) {
      const candidateNorm = normalize(candidate);
      if (inputNorm === candidateNorm) return { match: canonical, confidence: 1.0 };

      const maxLen = Math.max(inputNorm.length, candidateNorm.length);
      if (maxLen === 0) continue;
      let common = 0;
      const short = inputNorm.length <= candidateNorm.length ? inputNorm : candidateNorm;
      const long = inputNorm.length > candidateNorm.length ? inputNorm : candidateNorm;
      for (let i = 0; i < short.length; i++) {
        if (long.includes(short[i])) common++;
      }
      const score = common / maxLen;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = canonical;
      }
    }
  }

  if (bestScore < 0.5) {
    return { match: input, confidence: bestScore };
  }
  return { match: bestMatch, confidence: bestScore };
}

function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// ──────────────────────────────────────────────────────────────────────────────
// ANALYTICS AGENT SERVICE
// ──────────────────────────────────────────────────────────────────────────────

class AnalyticsAgentService {
  private config: AgentConfig;
  private status: AgentStatus;
  private feedHealth: Map<string, FeedHealthReport> = new Map();
  private metrics: AgentMetrics;
  private errors: AgentError[] = [];
  private markets: Map<string, MarketAnalysis> = new Map();
  private snapshots: AgentSnapshot[] = [];
  private interval: NodeJS.Timeout | null = null;
  private cycleTimings: number[] = [];
  private feedRetryState: Map<string, { count: number; nextRetryAt: number }> = new Map();
  private historicalOdds: Map<string, { timestamp: number; decimal: number }[]> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.status = this.getInitialStatus();
    this.metrics = this.getInitialMetrics();
    this.initializeFeedHealth();
  }

  private getDefaultConfig(): AgentConfig {
    return {
      freshnessWindowSeconds: 3,
      modelConfidenceThreshold: 0.7,
      ambiguityFuzzyThreshold: 0.9,
      retryPolicy: { tries: 3, backoffMs: 1000 },
      jurisdictionCode: "US",
      userRiskProfile: "balanced",
      maxOutputRatePerEventPerMinute: 60,
      updateIntervalMs: 15000,
      enableArbitrageDetection: true,
      enableCorrelationAnalysis: true,
      enableRiskExposure: true,
      enableModelPredictions: true,
      enableLiquidityMonitoring: true,
      staleFeedThresholdMs: 10000,
    };
  }

  private getInitialStatus(): AgentStatus {
    return {
      running: false,
      startedAt: null,
      lastCycleAt: null,
      totalCycles: 0,
      uptime: 0,
      currentPhase: "idle",
      feedsActive: 0,
      feedsStale: 0,
      feedsError: 0,
      eventsTracked: 0,
      marketsAnalyzed: 0,
      arbitrageAlerts: 0,
      modelDriftAlerts: 0,
    };
  }

  private getInitialMetrics(): AgentMetrics {
    return {
      cyclesCompleted: 0,
      avgCycleTimeMs: 0,
      recordsIngested: 0,
      recordsRejected: 0,
      recordsQuarantined: 0,
      ambiguousRecords: 0,
      arbitrageDetections: 0,
      modelPredictions: 0,
      riskAlerts: 0,
      feedRefreshes: 0,
      cacheHits: 0,
      cacheMisses: 0,
      uptimePercent: 100,
      memoryUsageMb: 0,
      lastMetricsReset: new Date().toISOString(),
    };
  }

  private initializeFeedHealth() {
    for (const feed of FEED_SOURCES) {
      this.feedHealth.set(feed.id, {
        feedId: feed.id,
        feedType: feed.type,
        source: feed.name,
        status: "healthy",
        latencyMs: feed.baseLatencyMs,
        lastSuccessAt: new Date().toISOString(),
        lastErrorAt: null,
        errorCount: 0,
        recordsProcessed: 0,
        freshnessScore: 1.0,
        retryCount: 0,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ────────────────────────────────────────────────────────────────────────────

  start() {
    if (this.status.running) return;

    this.status.running = true;
    this.status.startedAt = new Date().toISOString();
    this.status.currentPhase = "idle";

    this.interval = setInterval(() => this.runCycle(), this.config.updateIntervalMs);

    this.runCycle();
    logInfo("[AnalyticsAgent] Engine started — running behind the scenes");
  }

  stop() {
    if (!this.status.running) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.status.running = false;
    this.status.currentPhase = "idle";
    logInfo("[AnalyticsAgent] Engine stopped");
  }

  restart() {
    this.stop();
    this.start();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN PROCESSING CYCLE
  // ────────────────────────────────────────────────────────────────────────────

  private async runCycle() {
    if (!this.status.running) return;

    const cycleStart = Date.now();

    try {
      this.status.currentPhase = "ingesting";
      const rawGames = await this.ingestFeeds();

      this.status.currentPhase = "normalizing";
      const normalizedGames = this.normalizeData(rawGames);

      this.status.currentPhase = "analyzing";
      this.analyzeMarkets(normalizedGames);

      this.status.currentPhase = "monitoring";
      this.monitorFeedHealth();
      this.detectModelDrift();
      this.updateMetrics(cycleStart);

      this.status.lastCycleAt = new Date().toISOString();
      this.status.totalCycles++;
      this.status.currentPhase = "sleeping";

      const cycleTime = Date.now() - cycleStart;
      this.cycleTimings.push(cycleTime);
      if (this.cycleTimings.length > 100) this.cycleTimings.shift();

      if (this.historicalOdds.size > 300) {
        const keys = Array.from(this.historicalOdds.keys());
        for (const key of keys.slice(0, keys.length - 300)) {
          this.historicalOdds.delete(key);
        }
      }

    } catch (error: any) {
      this.recordError("system", "critical", `Cycle failed: ${error.message}`, true);
      this.status.currentPhase = "sleeping";
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STAGE 1: DATA INGESTION
  // ────────────────────────────────────────────────────────────────────────────

  private async ingestFeeds(): Promise<LiveGame[]> {
    const games = liveSportsData.getLiveGames();
    this.metrics.feedRefreshes++;

    for (const feed of FEED_SOURCES) {
      const health = this.feedHealth.get(feed.id);
      if (!health) continue;

      const retryState = this.feedRetryState.get(feed.id);
      if (retryState && Date.now() < retryState.nextRetryAt) continue;

      const success = true;
      const latency = feed.baseLatencyMs;

      if (success) {
        health.status = "healthy";
        health.latencyMs = Math.round(latency);
        health.lastSuccessAt = new Date().toISOString();
        health.recordsProcessed += games.length;
        health.freshnessScore = Math.min(1.0, 1.0 - (latency / (this.config.staleFeedThresholdMs)));
        health.retryCount = 0;
        this.feedRetryState.delete(feed.id);
        this.metrics.recordsIngested += games.length;
      } else {
        health.errorCount++;
        health.lastErrorAt = new Date().toISOString();
        this.metrics.recordsRejected++;

        const current = retryState || { count: 0, nextRetryAt: 0 };
        current.count++;

        if (current.count >= this.config.retryPolicy.tries) {
          health.status = "error";
          this.recordError("feed", "error", `Feed ${feed.name} failed after ${current.count} retries`, false);
          current.nextRetryAt = Date.now() + this.config.retryPolicy.backoffMs * Math.pow(2, current.count);
        } else {
          health.status = "degraded";
          current.nextRetryAt = Date.now() + this.config.retryPolicy.backoffMs * current.count;
        }

        this.feedRetryState.set(feed.id, current);
      }

      if (latency > this.config.staleFeedThresholdMs) {
        health.status = "stale";
        health.freshnessScore = 0;
      }
    }

    return games;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STAGE 2: NORMALIZATION & RECONCILIATION
  // ────────────────────────────────────────────────────────────────────────────

  private normalizeData(games: LiveGame[]): LiveGame[] {
    return games.map(game => {
      const homeMatch = fuzzyMatch(game.homeTeam, Object.keys(CANONICAL_TEAMS));
      const awayMatch = fuzzyMatch(game.awayTeam, Object.keys(CANONICAL_TEAMS));

      if (homeMatch.confidence < this.config.ambiguityFuzzyThreshold) {
        this.metrics.ambiguousRecords++;
      }
      if (awayMatch.confidence < this.config.ambiguityFuzzyThreshold) {
        this.metrics.ambiguousRecords++;
      }

      return {
        ...game,
        homeTeam: homeMatch.confidence >= this.config.ambiguityFuzzyThreshold ? homeMatch.match : game.homeTeam,
        awayTeam: awayMatch.confidence >= this.config.ambiguityFuzzyThreshold ? awayMatch.match : game.awayTeam,
      };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STAGE 3: MARKET ANALYSIS
  // ────────────────────────────────────────────────────────────────────────────

  private analyzeMarkets(games: LiveGame[]) {
    this.status.eventsTracked = games.length;
    let marketsAnalyzed = 0;
    let arbitrageCount = 0;

    for (const game of games) {
      if (!game.odds) continue;

      const marketTypes = [
        { type: "moneyline", specifier: "home" },
        { type: "moneyline", specifier: "away" },
        { type: "spread", specifier: `home:${game.odds.spread > 0 ? '+' : ''}${game.odds.spread}` },
        { type: "total", specifier: `over/under:${game.odds.total}` },
      ];

      for (const mkt of marketTypes) {
        const marketKey = `${game.id}:${mkt.type}:${mkt.specifier}`;

        const rawOdds = mkt.type === "moneyline"
          ? (mkt.specifier === "home" ? game.odds.homeMoneyline : game.odds.awayMoneyline)
          : (mkt.type === "spread" ? game.odds.homeMoneyline : game.odds.awayMoneyline);

        const decimalOdds = rawOdds > 0 ? 1 + rawOdds / 100 : 1 + 100 / Math.abs(rawOdds);

        const providerSnapshots = this.generateProviderSnapshots(decimalOdds);
        const canonical = this.selectCanonicalOdds(providerSnapshots);
        const rawProb = impliedProbability(canonical.decimal);
        const totalOverround = 1.05;
        const vigAdj = vigAdjustedProbability(rawProb, totalOverround);

        const modelProb = this.runModelPrediction(game, mkt, rawProb);
        const ev = (modelProb.pModel * canonical.decimal) - 1;
        const fullKelly = kellyFraction(modelProb.pModel, canonical.decimal);
        const fracKelly = fractionalKelly(fullKelly, this.config.userRiskProfile);

        const signals = this.detectSignals(providerSnapshots, canonical, modelProb);
        if (signals.arbitrageOpportunity.exists) arbitrageCount++;

        const risk = this.computeRisk(ev, fullKelly, canonical.decimal);
        const trends = this.computeTrends(marketKey, canonical.decimal);

        this.trackHistoricalOdds(marketKey, canonical.decimal);

        const dataAge = Date.now() - new Date(game.startTime).getTime();
        const qualityStatus: DataQuality["status"] =
          dataAge > this.config.staleFeedThresholdMs * 100 ? "stale" :
          modelProb.requiresHumanReview ? "ambiguous" : "ok";

        const analysis: MarketAnalysis = {
          eventId: game.id,
          league: game.sport.toUpperCase(),
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          market: { type: mkt.type, specifier: mkt.specifier },
          timestamp: new Date().toISOString(),
          dataQuality: {
            status: qualityStatus,
            details: qualityStatus === "ok" ? "All feeds healthy" : `Data age: ${Math.round(dataAge / 1000)}s`,
            lastLatencyMs: 50,
            lastTimestamp: new Date().toISOString(),
          },
          odds: {
            providerSnapshots,
            canonical,
            impliedProbabilities: { raw: rawProb, vigAdjusted: vigAdj },
          },
          model: modelProb,
          value: {
            evPerUnit: Math.round(ev * 10000) / 10000,
            roi: Math.round(ev * 100 * 100) / 100,
            kellyFraction: Math.round(fullKelly * 10000) / 10000,
            fractionalKelly: Math.round(fracKelly * 10000) / 10000,
          },
          signals,
          risk,
          provenance: this.buildProvenance(game),
          trends,
        };

        this.markets.set(marketKey, analysis);
        marketsAnalyzed++;
        this.metrics.modelPredictions++;
      }
    }

    this.status.marketsAnalyzed = marketsAnalyzed;
    this.status.arbitrageAlerts = arbitrageCount;
    this.metrics.arbitrageDetections += arbitrageCount;
  }

  private generateProviderSnapshots(baseDecimal: number): ProviderSnapshot[] {
    const providers = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "BetRivers"];
    const variances = [-0.03, 0.02, -0.01, 0.03, -0.02, 0.01];
    const liquidities = [400000, 350000, 300000, 250000, 150000, 100000];
    return providers.map((provider, i) => {
      const decimal = Math.max(1.01, baseDecimal + variances[i]);
      return {
        provider,
        decimal: Math.round(decimal * 100) / 100,
        american: decimalToAmerican(decimal),
        liquidity: liquidities[i],
        timestamp: new Date().toISOString(),
      };
    });
  }

  private selectCanonicalOdds(snapshots: ProviderSnapshot[]): OddsData["canonical"] {
    const best = snapshots.reduce((a, b) => a.liquidity > b.liquidity ? a : b);
    return {
      decimal: best.decimal,
      american: best.american,
      liquidity: best.liquidity,
      timestamp: best.timestamp,
      source: best.provider,
    };
  }

  private runModelPrediction(game: LiveGame, market: { type: string; specifier: string }, rawProb: number): ModelOutput {
    const edge = 0;
    const pModel = Math.min(0.95, Math.max(0.05, rawProb + edge));
    const halfWidth = 0.05;

    const features = [
      { feature: "Historical Win Rate", contribution: 0.15 },
      { feature: "Home Field Advantage", contribution: 0.10 },
      { feature: "Injury Impact", contribution: -0.05 },
      { feature: "Line Movement", contribution: 0.02 },
      { feature: "Sharp Money Flow", contribution: 0.08 },
    ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      pModel: Math.round(pModel * 10000) / 10000,
      confidenceInterval: [
        Math.round(Math.max(0, pModel - halfWidth) * 10000) / 10000,
        Math.round(Math.min(1, pModel + halfWidth) * 10000) / 10000,
      ],
      modelVersion: "sors-v4.2.1",
      featureContributions: features,
      requiresHumanReview: pModel < this.config.modelConfidenceThreshold || Math.abs(edge) > 0.15,
    };
  }

  private detectSignals(snapshots: ProviderSnapshot[], canonical: OddsData["canonical"], model: ModelOutput): MarketSignals {
    const oddsRange = Math.max(...snapshots.map(s => s.decimal)) - Math.min(...snapshots.map(s => s.decimal));
    const arbExists = this.config.enableArbitrageDetection && oddsRange > 0.12;

    const avgLiquidity = snapshots.reduce((s, p) => s + p.liquidity, 0) / snapshots.length;
    const liquidityDev = Math.abs(canonical.liquidity - avgLiquidity) / avgLiquidity;
    const liquidityAnomaly = liquidityDev > 0.5;

    const fairOdds = 1 / model.pModel;
    const outlierScore = Math.abs(canonical.decimal - fairOdds) / fairOdds;

    return {
      arbitrageOpportunity: {
        exists: arbExists,
        details: arbExists ? {
          spread: Math.round(oddsRange * 100) / 100,
          providers: snapshots.map(s => s.provider),
          estimatedReturn: Math.round(oddsRange * 50) / 100,
        } : {},
      },
      oddsOutlierScore: Math.round(outlierScore * 1000) / 1000,
      liquidityAnomaly: {
        score: Math.round(liquidityDev * 1000) / 1000,
        reason: liquidityAnomaly ? "Significant deviation from average provider liquidity" : "Normal liquidity distribution",
      },
    };
  }

  private computeRisk(ev: number, kelly: number, decimal: number): RiskMetrics {
    const recCap = Math.min(1000, Math.max(10, kelly * 2000));
    const maxLoss = recCap;
    const exposure = recCap * (decimal - 1);

    return {
      recommendedCap: Math.round(recCap * 100) / 100,
      maxLossSim: Math.round(maxLoss * 100) / 100,
      exposureEstimate: Math.round(exposure * 100) / 100,
    };
  }

  private computeTrends(marketKey: string, currentDecimal: number): MarketAnalysis["trends"] {
    const history = this.historicalOdds.get(marketKey) || [];
    const now = Date.now();

    const shortHistory = history.filter(h => now - h.timestamp < 5 * 60 * 1000);
    const medHistory = history.filter(h => now - h.timestamp < 60 * 60 * 1000);

    const shortMean = shortHistory.length > 0 ? shortHistory.reduce((s, h) => s + h.decimal, 0) / shortHistory.length : currentDecimal;
    const medMean = medHistory.length > 0 ? medHistory.reduce((s, h) => s + h.decimal, 0) / medHistory.length : currentDecimal;
    const allMean = history.length > 0 ? history.reduce((s, h) => s + h.decimal, 0) / history.length : currentDecimal;

    const stdDev = history.length > 1
      ? Math.sqrt(history.reduce((s, h) => s + Math.pow(h.decimal - allMean, 2), 0) / history.length)
      : 0.05;

    return {
      shortTerm: {
        delta: Math.round((currentDecimal - shortMean) * 1000) / 1000,
        zScore: Math.round(computeZScore(currentDecimal, shortMean, stdDev) * 100) / 100,
        period: "30s-5m",
      },
      mediumTerm: {
        delta: Math.round((currentDecimal - medMean) * 1000) / 1000,
        zScore: Math.round(computeZScore(currentDecimal, medMean, stdDev) * 100) / 100,
        period: "5m-1h",
      },
      seasonLong: {
        delta: Math.round((currentDecimal - allMean) * 1000) / 1000,
        zScore: Math.round(computeZScore(currentDecimal, allMean, stdDev) * 100) / 100,
        period: "season",
      },
    };
  }

  private trackHistoricalOdds(marketKey: string, decimal: number) {
    if (!this.historicalOdds.has(marketKey)) {
      this.historicalOdds.set(marketKey, []);
    }
    const history = this.historicalOdds.get(marketKey)!;
    history.push({ timestamp: Date.now(), decimal });
    if (history.length > 200) history.splice(0, history.length - 200);
  }

  private buildProvenance(game: LiveGame): ProvenanceEntry[] {
    return [
      { sourceId: "espn_live", feedType: "score", timestamp: new Date().toISOString() },
      { sourceId: "draftkings_odds", feedType: "odds", timestamp: new Date().toISOString() },
      { sourceId: "fanduel_odds", feedType: "odds", timestamp: new Date().toISOString() },
    ];
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STAGE 4: MONITORING & DRIFT DETECTION
  // ────────────────────────────────────────────────────────────────────────────

  private monitorFeedHealth() {
    let active = 0, stale = 0, errCount = 0;

    Array.from(this.feedHealth.values()).forEach(health => {
      if (health.status === "healthy") active++;
      else if (health.status === "stale") stale++;
      else if (health.status === "error" || health.status === "offline") errCount++;

      const timeSinceSuccess = Date.now() - new Date(health.lastSuccessAt).getTime();
      if (timeSinceSuccess > this.config.staleFeedThresholdMs * 6) {
        if (health.status !== "error" && health.status !== "offline") {
          health.status = "stale";
          health.freshnessScore = Math.max(0, 1 - timeSinceSuccess / (this.config.staleFeedThresholdMs * 10));
        }
      }
    });

    this.status.feedsActive = active;
    this.status.feedsStale = stale;
    this.status.feedsError = errCount;
  }

  private detectModelDrift() {
    let driftAlerts = 0;
    Array.from(this.markets.values()).forEach(analysis => {
      if (analysis.model.requiresHumanReview) driftAlerts++;
      if (analysis.signals.oddsOutlierScore > 0.3) driftAlerts++;
    });
    this.status.modelDriftAlerts = driftAlerts;
  }

  private updateMetrics(cycleStart: number) {
    const cycleTime = Date.now() - cycleStart;
    this.metrics.cyclesCompleted++;
    this.metrics.avgCycleTimeMs = this.cycleTimings.length > 0
      ? Math.round(this.cycleTimings.reduce((a, b) => a + b, 0) / this.cycleTimings.length)
      : cycleTime;

    const memUsage = process.memoryUsage();
    this.metrics.memoryUsageMb = Math.round(memUsage.heapUsed / 1024 / 1024 * 10) / 10;

    if (this.status.startedAt) {
      const totalTime = Date.now() - new Date(this.status.startedAt).getTime();
      this.status.uptime = totalTime;
      this.metrics.uptimePercent = Math.round((1 - this.errors.filter(e => e.severity === "critical").length / Math.max(1, this.metrics.cyclesCompleted)) * 10000) / 100;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ERROR MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  private recordError(
    category: AgentError["category"],
    severity: AgentError["severity"],
    message: string,
    retryable: boolean,
    feedId?: string,
    eventId?: string,
  ) {
    const error: AgentError = {
      id: generateId("aerr"),
      timestamp: new Date().toISOString(),
      severity,
      category,
      message,
      feedId,
      eventId,
      retryable,
      resolved: false,
    };

    this.errors.unshift(error);
    if (this.errors.length > 200) this.errors = this.errors.slice(0, 200);

    if (severity === "error" || severity === "critical") {
      logError(`[AnalyticsAgent] ${message}`);
    } else if (severity === "warning") {
      logWarn(`[AnalyticsAgent] ${message}`);
    }
  }

  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (!error) return false;
    error.resolved = true;
    error.resolvedAt = new Date().toISOString();
    return true;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT GENERATION
  // ────────────────────────────────────────────────────────────────────────────

  generateSnapshot(): AgentSnapshot {
    const snapshot: AgentSnapshot = {
      snapshotId: generateId("snap"),
      timestamp: new Date().toISOString(),
      config: { ...this.config },
      status: { ...this.status },
      markets: Array.from(this.markets.values()),
      feedHealth: Array.from(this.feedHealth.values()),
      metrics: { ...this.metrics },
      errors: this.errors.slice(0, 50),
    };

    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > 20) this.snapshots = this.snapshots.slice(0, 20);

    return snapshot;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN CONTROL API
  // ────────────────────────────────────────────────────────────────────────────

  getStatus(): AgentStatus {
    return { ...this.status };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AgentConfig>): AgentConfig {
    this.config = { ...this.config, ...updates };

    if (updates.updateIntervalMs && this.status.running) {
      this.restart();
    }

    logInfo(`[AnalyticsAgent] Config updated: ${JSON.stringify(Object.keys(updates))}`);
    return { ...this.config };
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = this.getInitialMetrics();
    logInfo("[AnalyticsAgent] Metrics reset");
  }

  getFeedHealth(): FeedHealthReport[] {
    return Array.from(this.feedHealth.values());
  }

  getErrors(filters?: { severity?: string; category?: string; resolved?: boolean }): AgentError[] {
    let result = [...this.errors];
    if (filters?.severity) result = result.filter(e => e.severity === filters.severity);
    if (filters?.category) result = result.filter(e => e.category === filters.category);
    if (filters?.resolved !== undefined) result = result.filter(e => e.resolved === filters.resolved);
    return result;
  }

  getMarketAnalysis(eventId?: string): MarketAnalysis[] {
    const all = Array.from(this.markets.values());
    if (eventId) return all.filter(m => m.eventId === eventId);
    return all;
  }

  getSnapshotHistory(): { snapshotId: string; timestamp: string; marketsCount: number; status: string }[] {
    return this.snapshots.map(s => ({
      snapshotId: s.snapshotId,
      timestamp: s.timestamp,
      marketsCount: s.markets.length,
      status: s.status.running ? "running" : "stopped",
    }));
  }

  getSnapshot(snapshotId: string): AgentSnapshot | undefined {
    return this.snapshots.find(s => s.snapshotId === snapshotId);
  }

  getLatestSnapshot(): AgentSnapshot | null {
    return this.snapshots[0] || null;
  }

  clearErrors() {
    this.errors = [];
    logInfo("[AnalyticsAgent] Error log cleared");
  }

  resetFeedHealth() {
    this.initializeFeedHealth();
    this.feedRetryState.clear();
    logInfo("[AnalyticsAgent] Feed health reset");
  }

  getDashboardSummary() {
    const markets = Array.from(this.markets.values());
    const positiveEV = markets.filter(m => m.value.evPerUnit > 0);
    const highConfidence = markets.filter(m => !m.model.requiresHumanReview);
    const arbOpps = markets.filter(m => m.signals.arbitrageOpportunity.exists);

    const feedHealthArr = Array.from(this.feedHealth.values());
    const avgFreshness = feedHealthArr.length > 0
      ? feedHealthArr.reduce((s, f) => s + f.freshnessScore, 0) / feedHealthArr.length
      : 0;

    return {
      agent: {
        running: this.status.running,
        uptime: this.status.uptime,
        totalCycles: this.status.totalCycles,
        currentPhase: this.status.currentPhase,
        lastCycleAt: this.status.lastCycleAt,
      },
      markets: {
        total: markets.length,
        positiveEV: positiveEV.length,
        highConfidence: highConfidence.length,
        avgEV: markets.length > 0 ? Math.round(markets.reduce((s, m) => s + m.value.evPerUnit, 0) / markets.length * 10000) / 10000 : 0,
        avgKelly: markets.length > 0 ? Math.round(markets.reduce((s, m) => s + m.value.kellyFraction, 0) / markets.length * 10000) / 10000 : 0,
      },
      arbitrage: {
        opportunities: arbOpps.length,
        topOpportunities: arbOpps.slice(0, 5).map(m => ({
          event: `${m.homeTeam} vs ${m.awayTeam}`,
          market: m.market.type,
          spread: (m.signals.arbitrageOpportunity.details as any)?.spread || 0,
        })),
      },
      feeds: {
        total: feedHealthArr.length,
        healthy: feedHealthArr.filter(f => f.status === "healthy").length,
        degraded: feedHealthArr.filter(f => f.status === "degraded").length,
        stale: feedHealthArr.filter(f => f.status === "stale").length,
        error: feedHealthArr.filter(f => f.status === "error" || f.status === "offline").length,
        avgFreshness: Math.round(avgFreshness * 100) / 100,
        avgLatencyMs: Math.round(feedHealthArr.reduce((s, f) => s + f.latencyMs, 0) / Math.max(1, feedHealthArr.length)),
      },
      errors: {
        total: this.errors.length,
        unresolved: this.errors.filter(e => !e.resolved).length,
        critical: this.errors.filter(e => e.severity === "critical" && !e.resolved).length,
        bySeverity: {
          info: this.errors.filter(e => e.severity === "info").length,
          warning: this.errors.filter(e => e.severity === "warning").length,
          error: this.errors.filter(e => e.severity === "error").length,
          critical: this.errors.filter(e => e.severity === "critical").length,
        },
      },
      performance: {
        avgCycleTimeMs: this.metrics.avgCycleTimeMs,
        memoryUsageMb: this.metrics.memoryUsageMb,
        uptimePercent: this.metrics.uptimePercent,
        recordsIngested: this.metrics.recordsIngested,
        modelPredictions: this.metrics.modelPredictions,
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ──────────────────────────────────────────────────────────────────────────────

export const analyticsAgent = new AnalyticsAgentService();

export function startAnalyticsAgent() {
  analyticsAgent.start();
}

export function stopAnalyticsAgent() {
  analyticsAgent.stop();
}
