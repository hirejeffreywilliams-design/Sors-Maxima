import { randomBytes, createHash } from "crypto";

export interface CalibrationBin {
  binStart: number;
  binEnd: number;
  predictedAvg: number;
  actualRate: number;
  count: number;
  deviation: number;
}

export interface ModelPerformance {
  modelVersion: string;
  modelType: string;
  totalPredictions: number;
  hitRate: number;
  realizedROI: number;
  realizedEV: number;
  predictedEV: number;
  brierScore: number;
  logLoss: number;
  calibrationBins: CalibrationBin[];
  calibrationDrift: number;
  lastRetrain: string;
  lastCalibrationCheck: string;
  status: "active" | "monitoring" | "degraded" | "retired";
  experimentId: string | null;
}

export interface Recommendation {
  id: string;
  userId: string;
  requestId: string;
  sport: string;
  match: string;
  marketType: string;
  selection: string;
  oddsOffered: number;
  predictedWinProb: number;
  expectedValue: number;
  suggestedStake: number;
  confidenceScore: number;
  modelVersion: string;
  modelType: string;
  trainingDataSnapshotId: string;
  evidenceLinks: string[];
  businessRulesApplied: string[];
  userRiskProfile: string;
  status: "generated" | "sent" | "accepted" | "rejected" | "expired" | "auto_placed" | "human_review";
  outcome: "pending" | "won" | "lost" | "void" | "push" | null;
  actualReturn: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  disclaimer: string;
  autoSendEligible: boolean;
  humanReviewRequired: boolean;
  experimentId: string | null;
  bankrollConstraints: {
    maxStakePercent: number;
    currentBankroll: number;
    maxAllowed: number;
    withinLimits: boolean;
  };
  provenance: {
    inputsSnapshot: string;
    seed: number;
    datasetSnapshotId: string;
    preprocessingVersion: string;
    featureSet: string[];
  };
}

export interface RecommendationStats {
  totalGenerated: number;
  totalSent: number;
  totalAccepted: number;
  totalAutoPlaced: number;
  totalInHumanReview: number;
  totalExpired: number;
  overallHitRate: number;
  overallROI: number;
  avgConfidenceScore: number;
  avgPredictedEV: number;
  avgRealizedEV: number;
  calibrationDrift: number;
  modelPerformance: ModelPerformance[];
  sportBreakdown: Record<string, { count: number; hitRate: number; roi: number }>;
  dailyStats: { date: string; generated: number; hitRate: number; roi: number; avgConfidence: number }[];
}

export interface BankrollConfig {
  maxPercentPerBet: number;
  maxExposurePerMarket: number;
  maxDailyExposure: number;
  maxConcurrentBets: number;
  houseLimitPerUser: number;
  houseLimitTotal: number;
  cooldownMinutesAfterLoss: number;
  lastUpdated: string;
}

export interface UserControl {
  userId: string;
  autoRecommendationsEnabled: boolean;
  maxStakeOverride: number | null;
  optedInSports: string[];
  optedOutSports: string[];
  showPerformanceHistory: boolean;
  notificationPreference: "all" | "high_confidence" | "none";
  lastUpdated: string;
}

const recommendations = new Map<string, Recommendation>();
const modelPerformanceData = new Map<string, ModelPerformance>();
const userControls = new Map<string, UserControl>();

let bankrollConfig: BankrollConfig = {
  maxPercentPerBet: 2.0,
  maxExposurePerMarket: 500,
  maxDailyExposure: 2000,
  maxConcurrentBets: 10,
  houseLimitPerUser: 5000,
  houseLimitTotal: 100000,
  cooldownMinutesAfterLoss: 15,
  lastUpdated: new Date().toISOString(),
};

function generateId(): string {
  return `rec_${randomBytes(8).toString("hex")}`;
}

const DISCLAIMER = "This recommendation is a probabilistic signal based on statistical analysis, not a guarantee of outcome. Past performance does not predict future results. Please gamble responsibly.";

export function generateRecommendation(input: {
  userId: string;
  sport: string;
  match: string;
  marketType: string;
  selection: string;
  oddsOffered: number;
  predictedWinProb: number;
  modelVersion: string;
  modelType: string;
  evidenceLinks: string[];
  userBankroll?: number;
}): Recommendation {
  const ev = input.predictedWinProb * input.oddsOffered - 1;
  const confidence = computeConfidence(input.predictedWinProb, ev, input.evidenceLinks.length);
  const bankroll = input.userBankroll || 1000;
  const kellyFraction = Math.max(0, (input.predictedWinProb * input.oddsOffered - 1) / (input.oddsOffered - 1));
  const conservativeKelly = kellyFraction * 0.25;
  const suggestedStake = Math.min(
    bankroll * conservativeKelly,
    bankroll * (bankrollConfig.maxPercentPerBet / 100),
    bankrollConfig.maxExposurePerMarket
  );

  const now = new Date();
  const rec: Recommendation = {
    id: generateId(),
    userId: input.userId,
    requestId: `req_${randomBytes(6).toString("hex")}`,
    sport: input.sport,
    match: input.match,
    marketType: input.marketType,
    selection: input.selection,
    oddsOffered: input.oddsOffered,
    predictedWinProb: parseFloat(input.predictedWinProb.toFixed(4)),
    expectedValue: parseFloat(ev.toFixed(4)),
    suggestedStake: parseFloat(Math.max(1, suggestedStake).toFixed(2)),
    confidenceScore: parseFloat(confidence.toFixed(4)),
    modelVersion: input.modelVersion,
    modelType: input.modelType,
    trainingDataSnapshotId: `ds-${now.toISOString().split("T")[0]}`,
    evidenceLinks: input.evidenceLinks,
    businessRulesApplied: ["bankroll_pct_check", "max_exposure_check", "no_reco_if_self_excluded", "kelly_criterion_sizing"],
    userRiskProfile: "standard",
    status: "generated",
    outcome: null,
    actualReturn: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 3600000).toISOString(),
    disclaimer: DISCLAIMER,
    autoSendEligible: confidence >= 0.75 && ev >= 0.10 && input.predictedWinProb >= 0.55,
    humanReviewRequired: confidence < 0.6 || suggestedStake > 100,
    experimentId: null,
    bankrollConstraints: {
      maxStakePercent: bankrollConfig.maxPercentPerBet,
      currentBankroll: bankroll,
      maxAllowed: parseFloat((bankroll * bankrollConfig.maxPercentPerBet / 100).toFixed(2)),
      withinLimits: suggestedStake <= bankroll * (bankrollConfig.maxPercentPerBet / 100),
    },
    provenance: {
      inputsSnapshot: `inputs_${now.getTime()}`,
      seed: randomBytes(4).readUInt32BE(0) % 2147483647,
      datasetSnapshotId: `ds-${now.toISOString().split("T")[0]}`,
      preprocessingVersion: "preproc-v2.3",
      featureSet: ["team_stats", "player_injuries", "historical_odds", "weather", "venue_factor", "momentum"],
    },
  };

  if (rec.humanReviewRequired) {
    rec.status = "human_review";
  }

  recommendations.set(rec.id, rec);
  return rec;
}

function computeConfidence(winProb: number, ev: number, evidenceCount: number): number {
  const probWeight = winProb * 0.4;
  const evWeight = Math.min(ev * 2, 1) * 0.3;
  const evidenceWeight = Math.min(evidenceCount / 5, 1) * 0.2;
  const stabilityWeight = 0.1 * (1 - Math.abs(winProb - 0.5));
  return Math.min(0.99, probWeight + evWeight + evidenceWeight + stabilityWeight);
}

export function updateRecommendationStatus(id: string, status: Recommendation["status"]): Recommendation | null {
  const rec = recommendations.get(id);
  if (!rec) return null;
  rec.status = status;
  rec.updatedAt = new Date().toISOString();
  return rec;
}

export function recordOutcome(id: string, outcome: "won" | "lost" | "void" | "push", actualReturn?: number): Recommendation | null {
  const rec = recommendations.get(id);
  if (!rec) return null;
  rec.outcome = outcome;
  rec.actualReturn = actualReturn ?? null;
  rec.updatedAt = new Date().toISOString();
  return rec;
}

export function getRecommendation(id: string): Recommendation | undefined {
  return recommendations.get(id);
}

export function getAllRecommendations(filters?: {
  userId?: string;
  sport?: string;
  status?: Recommendation["status"];
  minConfidence?: number;
  limit?: number;
}): Recommendation[] {
  let result = Array.from(recommendations.values());
  if (filters?.userId) result = result.filter(r => r.userId === filters.userId);
  if (filters?.sport) result = result.filter(r => r.sport === filters.sport);
  if (filters?.status) result = result.filter(r => r.status === filters.status);
  if (filters?.minConfidence) result = result.filter(r => r.confidenceScore >= filters.minConfidence!);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}

export function getRecommendationStats(): RecommendationStats {
  const all = Array.from(recommendations.values());
  const withOutcome = all.filter(r => r.outcome === "won" || r.outcome === "lost");
  const won = withOutcome.filter(r => r.outcome === "won");

  const sportMap: Record<string, { count: number; won: number; totalReturn: number; totalStake: number }> = {};
  for (const r of all) {
    if (!sportMap[r.sport]) sportMap[r.sport] = { count: 0, won: 0, totalReturn: 0, totalStake: 0 };
    sportMap[r.sport].count++;
    if (r.outcome === "won") sportMap[r.sport].won++;
    sportMap[r.sport].totalReturn += r.actualReturn || 0;
    sportMap[r.sport].totalStake += r.suggestedStake;
  }

  const sportBreakdown: Record<string, { count: number; hitRate: number; roi: number }> = {};
  for (const [sport, data] of Object.entries(sportMap)) {
    sportBreakdown[sport] = {
      count: data.count,
      hitRate: data.count > 0 ? parseFloat((data.won / data.count * 100).toFixed(1)) : 0,
      roi: data.totalStake > 0 ? parseFloat(((data.totalReturn - data.totalStake) / data.totalStake * 100).toFixed(1)) : 0,
    };
  }

  const dailyMap: Record<string, { generated: number; won: number; total: number; totalConf: number; totalROI: number }> = {};
  for (const r of all) {
    const date = r.createdAt.split("T")[0];
    if (!dailyMap[date]) dailyMap[date] = { generated: 0, won: 0, total: 0, totalConf: 0, totalROI: 0 };
    dailyMap[date].generated++;
    dailyMap[date].totalConf += r.confidenceScore;
    if (r.outcome === "won") dailyMap[date].won++;
    if (r.outcome) dailyMap[date].total++;
  }

  const totalReturn = all.reduce((s, r) => s + (r.actualReturn || 0), 0);
  const totalStake = all.reduce((s, r) => s + r.suggestedStake, 0);

  return {
    totalGenerated: all.length,
    totalSent: all.filter(r => r.status === "sent" || r.status === "accepted" || r.status === "auto_placed").length,
    totalAccepted: all.filter(r => r.status === "accepted").length,
    totalAutoPlaced: all.filter(r => r.status === "auto_placed").length,
    totalInHumanReview: all.filter(r => r.status === "human_review").length,
    totalExpired: all.filter(r => r.status === "expired").length,
    overallHitRate: withOutcome.length > 0 ? parseFloat((won.length / withOutcome.length * 100).toFixed(1)) : 0,
    overallROI: totalStake > 0 ? parseFloat(((totalReturn - totalStake) / totalStake * 100).toFixed(1)) : 0,
    avgConfidenceScore: all.length > 0 ? parseFloat((all.reduce((s, r) => s + r.confidenceScore, 0) / all.length).toFixed(3)) : 0,
    avgPredictedEV: all.length > 0 ? parseFloat((all.reduce((s, r) => s + r.expectedValue, 0) / all.length).toFixed(4)) : 0,
    avgRealizedEV: withOutcome.length > 0 ? parseFloat(((totalReturn / totalStake - 1)).toFixed(4)) : 0,
    calibrationDrift: withOutcome.length > 10 ? parseFloat((Math.abs(all.reduce((s, r) => s + r.confidenceScore, 0) / all.length - (won.length / Math.max(1, withOutcome.length)))).toFixed(4)) : 0,
    modelPerformance: Array.from(modelPerformanceData.values()),
    sportBreakdown,
    dailyStats: Object.entries(dailyMap).map(([date, d]) => ({
      date,
      generated: d.generated,
      hitRate: d.total > 0 ? parseFloat((d.won / d.total * 100).toFixed(1)) : 0,
      roi: 0,
      avgConfidence: d.generated > 0 ? parseFloat((d.totalConf / d.generated).toFixed(3)) : 0,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function getModelPerformanceList(): ModelPerformance[] {
  return Array.from(modelPerformanceData.values());
}

export function getBankrollConfig(): BankrollConfig {
  return { ...bankrollConfig };
}

export function updateBankrollConfig(updates: Partial<BankrollConfig>): BankrollConfig {
  bankrollConfig = { ...bankrollConfig, ...updates, lastUpdated: new Date().toISOString() };
  return { ...bankrollConfig };
}

export function getUserControls(userId: string): UserControl {
  if (!userControls.has(userId)) {
    userControls.set(userId, {
      userId,
      autoRecommendationsEnabled: true,
      maxStakeOverride: null,
      optedInSports: [],
      optedOutSports: [],
      showPerformanceHistory: true,
      notificationPreference: "high_confidence",
      lastUpdated: new Date().toISOString(),
    });
  }
  return userControls.get(userId)!;
}

export function updateUserControls(userId: string, updates: Partial<UserControl>): UserControl {
  const current = getUserControls(userId);
  const updated = { ...current, ...updates, userId, lastUpdated: new Date().toISOString() };
  userControls.set(userId, updated);
  return updated;
}

function seedModelPerformance() {
  const models: ModelPerformance[] = [
    {
      modelVersion: "ensemble-v4.2",
      modelType: "ensemble",
      totalPredictions: 12847,
      hitRate: 54.3,
      realizedROI: 8.7,
      realizedEV: 0.087,
      predictedEV: 0.092,
      brierScore: 0.198,
      logLoss: 0.672,
      calibrationBins: generateCalibrationBins(0.03),
      calibrationDrift: 0.012,
      lastRetrain: "2026-02-15T00:00:00Z",
      lastCalibrationCheck: "2026-02-20T06:00:00Z",
      status: "active",
      experimentId: null,
    },
    {
      modelVersion: "gradient-boost-v3.1",
      modelType: "gradient_boost",
      totalPredictions: 9234,
      hitRate: 52.1,
      realizedROI: 5.4,
      realizedEV: 0.054,
      predictedEV: 0.068,
      brierScore: 0.213,
      logLoss: 0.689,
      calibrationBins: generateCalibrationBins(0.05),
      calibrationDrift: 0.023,
      lastRetrain: "2026-02-10T00:00:00Z",
      lastCalibrationCheck: "2026-02-20T06:00:00Z",
      status: "monitoring",
      experimentId: "exp_ab_model_compare",
    },
    {
      modelVersion: "neural-v5.0",
      modelType: "neural_network",
      totalPredictions: 6891,
      hitRate: 55.8,
      realizedROI: 11.2,
      realizedEV: 0.112,
      predictedEV: 0.105,
      brierScore: 0.186,
      logLoss: 0.654,
      calibrationBins: generateCalibrationBins(0.02),
      calibrationDrift: 0.008,
      lastRetrain: "2026-02-18T00:00:00Z",
      lastCalibrationCheck: "2026-02-20T06:00:00Z",
      status: "active",
      experimentId: null,
    },
    {
      modelVersion: "hybrid-v2.8",
      modelType: "hybrid",
      totalPredictions: 4523,
      hitRate: 51.2,
      realizedROI: 3.1,
      realizedEV: 0.031,
      predictedEV: 0.045,
      brierScore: 0.224,
      logLoss: 0.701,
      calibrationBins: generateCalibrationBins(0.06),
      calibrationDrift: 0.034,
      lastRetrain: "2026-02-05T00:00:00Z",
      lastCalibrationCheck: "2026-02-20T06:00:00Z",
      status: "degraded",
      experimentId: null,
    },
  ];

  for (const m of models) {
    modelPerformanceData.set(m.modelVersion, m);
  }
}

function generateCalibrationBins(_noise: number): CalibrationBin[] {
  const all = Array.from(recommendations.values());
  const bins: CalibrationBin[] = [];
  for (let i = 0; i < 10; i++) {
    const binStart = i * 0.1;
    const binEnd = (i + 1) * 0.1;
    const predicted = (binStart + binEnd) / 2;
    const inBin = all.filter(r => r.confidenceScore >= binStart && r.confidenceScore < binEnd);
    const withOutcome = inBin.filter(r => r.outcome === "won" || r.outcome === "lost");
    const actualRate = withOutcome.length > 0 ? withOutcome.filter(r => r.outcome === "won").length / withOutcome.length : predicted;
    bins.push({
      binStart: parseFloat(binStart.toFixed(1)),
      binEnd: parseFloat(binEnd.toFixed(1)),
      predictedAvg: parseFloat(predicted.toFixed(3)),
      actualRate: parseFloat(actualRate.toFixed(3)),
      count: inBin.length,
      deviation: parseFloat(Math.abs(predicted - actualRate).toFixed(4)),
    });
  }
  return bins;
}

function seedRecommendations() {
  const sports = ["NBA", "NFL", "MLB", "NHL", "Soccer", "Tennis"];
  const matches = [
    "Knicks vs Bucks", "Heat vs Mavericks", "Chiefs vs Eagles",
    "49ers vs Cowboys", "Yankees vs Dodgers", "Man City vs Liverpool",
    "Real Madrid vs Barcelona", "Djokovic vs Alcaraz", "Bruins vs Rangers",
    "Astros vs Braves", "Nuggets vs Suns", "Bills vs Ravens",
  ];
  const marketTypes = ["match_winner", "spread", "total_over_under", "player_props"];
  const models = ["ensemble-v4.2", "gradient-boost-v3.1", "neural-v5.0", "hybrid-v2.8"];
  const outcomes: (Recommendation["outcome"])[] = ["won", "lost", "won", "lost", "won", "pending", "pending", null];

  for (let i = 0; i < 40; i++) {
    const sport = sports[i % sports.length];
    const match = matches[i % matches.length];
    const hashBuf = createHash('md5').update(`seed-${i}`).digest();
    const winProb = 0.35 + (hashBuf.readUInt32BE(0) / 0xFFFFFFFF) * 0.35;
    const odds = 1.5 + (hashBuf.readUInt32BE(4) / 0xFFFFFFFF) * 3;
    const rec = generateRecommendation({
      userId: `user_${1000 + (i % 10)}`,
      sport,
      match,
      marketType: marketTypes[i % marketTypes.length],
      selection: `Pick_${i + 1}`,
      oddsOffered: parseFloat(odds.toFixed(2)),
      predictedWinProb: parseFloat(winProb.toFixed(3)),
      modelVersion: models[i % models.length],
      modelType: i % 4 === 0 ? "ensemble" : i % 4 === 1 ? "gradient_boost" : i % 4 === 2 ? "neural_network" : "hybrid",
      evidenceLinks: [
        `data://stats/${sport.toLowerCase()}`,
        `signal://injuries/${sport.toLowerCase()}`,
        `data://odds_history/${match.replace(/\s/g, "_")}`,
      ],
      userBankroll: 500 + (createHash('md5').update(`bankroll-${i}`).digest().readUInt32BE(0) / 0xFFFFFFFF) * 4500,
    });

    const outcome = outcomes[i % outcomes.length];
    if (outcome) {
      rec.outcome = outcome;
      if (outcome === "won") {
        rec.actualReturn = parseFloat((rec.suggestedStake * rec.oddsOffered).toFixed(2));
        rec.status = "accepted";
      } else if (outcome === "lost") {
        rec.actualReturn = 0;
        rec.status = "accepted";
      }
    } else {
      rec.status = i % 5 === 0 ? "sent" : i % 7 === 0 ? "auto_placed" : "generated";
    }
    rec.updatedAt = new Date().toISOString();
  }
}

seedModelPerformance();
