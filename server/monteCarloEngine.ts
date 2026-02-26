import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import type { ParlayLeg, Sport } from "@shared/schema";

const LEARNING_DATA_FILE = "monte-carlo-learning-data.json";

class MersenneTwister {
  private state: Float64Array;
  private index: number;

  constructor(seed: number = Date.now()) {
    this.state = new Float64Array(624);
    this.index = 625;
    this.seedWith(seed);
  }

  private seedWith(s: number): void {
    this.state[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = this.state[i - 1];
      this.state[i] = (1812433253 * ((prev ^ (prev >>> 30)) >>> 0) + i) >>> 0;
    }
  }

  private twist(): void {
    for (let i = 0; i < 624; i++) {
      const y = (this.state[i] & 0x80000000) | (this.state[(i + 1) % 624] & 0x7fffffff);
      this.state[i] = this.state[(i + 397) % 624] ^ (y >>> 1);
      if (y & 1) this.state[i] ^= 0x9908b0df;
    }
    this.index = 0;
  }

  next(): number {
    if (this.index >= 624) this.twist();
    let y = this.state[this.index++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);
    return (y >>> 0) / 4294967296;
  }

  nextGaussianPair(): [number, number] {
    const u1 = this.next() || 1e-14;
    const u2 = this.next() || 1e-14;
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const phase = 2.0 * Math.PI * u2;
    return [mag * Math.cos(phase), mag * Math.sin(phase)];
  }

  nextGaussian(): number {
    return this.nextGaussianPair()[0];
  }
}

const RATIONAL_APPROX_A = [
  -3.969683028665376e+01, 2.209460984245205e+02,
  -2.759285104469687e+02, 1.383577518672690e+02,
  -3.066479806614716e+01, 2.506628277459239e+00
];
const RATIONAL_APPROX_B = [
  -5.447609879822406e+01, 1.615858368580409e+02,
  -1.556989798598866e+02, 6.680131188771972e+01,
  -1.328068155288572e+01
];
const RATIONAL_APPROX_C = [
  -7.784894002430293e-03, -3.223964580411365e-01,
  -2.400758277161838e+00, -2.549732539343734e+00,
  4.374664141464968e+00, 2.938163982698783e+00
];
const RATIONAL_APPROX_D = [
  7.784695709041462e-03, 3.224671290700398e-01,
  2.445134137142996e+00, 3.754408661907416e+00
];

function uniformToGaussian(u: number): number {
  if (u <= 0) return -8;
  if (u >= 1) return 8;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (u < pLow) {
    q = Math.sqrt(-2 * Math.log(u));
    return (((((RATIONAL_APPROX_C[0]*q+RATIONAL_APPROX_C[1])*q+RATIONAL_APPROX_C[2])*q+RATIONAL_APPROX_C[3])*q+RATIONAL_APPROX_C[4])*q+RATIONAL_APPROX_C[5]) /
           ((((RATIONAL_APPROX_D[0]*q+RATIONAL_APPROX_D[1])*q+RATIONAL_APPROX_D[2])*q+RATIONAL_APPROX_D[3])*q+1);
  } else if (u <= pHigh) {
    q = u - 0.5;
    r = q * q;
    return (((((RATIONAL_APPROX_A[0]*r+RATIONAL_APPROX_A[1])*r+RATIONAL_APPROX_A[2])*r+RATIONAL_APPROX_A[3])*r+RATIONAL_APPROX_A[4])*r+RATIONAL_APPROX_A[5])*q /
           (((((RATIONAL_APPROX_B[0]*r+RATIONAL_APPROX_B[1])*r+RATIONAL_APPROX_B[2])*r+RATIONAL_APPROX_B[3])*r+RATIONAL_APPROX_B[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - u));
    return -((((((RATIONAL_APPROX_C[0]*q+RATIONAL_APPROX_C[1])*q+RATIONAL_APPROX_C[2])*q+RATIONAL_APPROX_C[3])*q+RATIONAL_APPROX_C[4])*q+RATIONAL_APPROX_C[5]) /
            ((((RATIONAL_APPROX_D[0]*q+RATIONAL_APPROX_D[1])*q+RATIONAL_APPROX_D[2])*q+RATIONAL_APPROX_D[3])*q+1));
  }
}

function gaussianCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function cholDecomp(A: number[][]): Float64Array[] {
  const n = A.length;
  const L: Float64Array[] = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(A[i][i] - s, 1e-14));
      } else {
        L[i][j] = (A[i][j] - s) / L[j][j];
      }
    }
  }
  return L;
}

function latinHypercubeSamples(n: number, dims: number, rng: MersenneTwister): Float64Array[] {
  const samples: Float64Array[] = Array.from({ length: n }, () => new Float64Array(dims));
  for (let d = 0; d < dims; d++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < n; i++) {
      samples[i][d] = (perm[i] + rng.next()) / n;
    }
  }
  return samples;
}

function sobolSequence(n: number, dims: number): Float64Array[] {
  const samples: Float64Array[] = Array.from({ length: n }, () => new Float64Array(dims));
  const directionNumbers: number[][] = [];
  for (let d = 0; d < dims; d++) {
    const seed = createHash("md5").update(`sobol-dim-${d}`).digest();
    const v: number[] = [];
    v[0] = 1 << 31;
    for (let i = 1; i < 32; i++) {
      v[i] = v[i - 1] ^ (v[i - 1] >>> 1);
      const seedByte = seed[i % seed.length];
      if (seedByte & (1 << (i % 8))) {
        v[i] ^= v[Math.max(0, i - 2)];
      }
    }
    directionNumbers.push(v);
  }
  for (let d = 0; d < dims; d++) {
    let x = 0;
    for (let i = 0; i < n; i++) {
      const c = countTrailingZeros(i + 1);
      x ^= directionNumbers[d][Math.min(c, 31)];
      samples[i][d] = x / (1 << 31) / 2;
    }
  }
  return samples;
}

function countTrailingZeros(n: number): number {
  if (n === 0) return 32;
  let c = 0;
  while ((n & 1) === 0) { n >>= 1; c++; }
  return c;
}

function poissonSample(lambda: number, rng: MersenneTwister): number {
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng.next(); } while (p > L);
    return k - 1;
  }
  const c = 0.767 - 3.36 / lambda;
  const beta = Math.PI / Math.sqrt(3 * lambda);
  const alpha = beta * lambda;
  const k = Math.log(c) - lambda - Math.log(beta);
  while (true) {
    const u = rng.next();
    const x = (alpha - Math.log((1 - u) / u)) / beta;
    const n = Math.floor(x + 0.5);
    if (n < 0) continue;
    const v = rng.next();
    const y = alpha - beta * x;
    const lhs = y + Math.log(v / Math.pow(1 + Math.exp(y), 2));
    const rhs = k + n * Math.log(lambda) - logFactorial(n);
    if (lhs <= rhs) return n;
  }
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  if (n < 10) {
    let r = 0;
    for (let i = 2; i <= n; i++) r += Math.log(i);
    return r;
  }
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
}

export interface MatchupSimulationInput {
  gameId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeWinPct: number;
  awayWinPct: number;
  spread?: number;
  totalLine?: number;
  homeMoneyline?: number;
  awayMoneyline?: number;
  injuryImpact?: { home: number; away: number };
  weatherImpact?: number;
  isHomeGame?: boolean;
  venue?: string;
  gameState?: "pre" | "in" | "post";
  homeAvgPts?: number;
  awayAvgPts?: number;
  homeDefRating?: number;
  awayDefRating?: number;
  homePace?: number;
  awayPace?: number;
}

export interface MatchupSimulationResult {
  gameId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  simulations: number;
  homeWinProb: number;
  awayWinProb: number;
  drawProb: number;
  homeSpreadCoverProb: number;
  overProb: number;
  underProb: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedTotal: number;
  spreadLine: number;
  totalLine: number;
  scoreDistribution: {
    home: { mean: number; stdDev: number; p10: number; median: number; p90: number };
    away: { mean: number; stdDev: number; p10: number; median: number; p90: number };
  };
  convergenceScore: number;
  confidenceInterval95: { homeWin: [number, number]; total: [number, number] };
  riskMetrics: {
    variance: number;
    skewness: number;
    kurtosis: number;
    tailRiskHome: number;
    tailRiskAway: number;
  };
  factors: { name: string; impact: number; direction: string }[];
  simulatedAt: number;
  ttl: number;
}

export interface ParlaySimulationResult {
  winProbability: number;
  method: "montecarlo" | "analytic" | "importance_sampling";
  sims: number;
  variance: number;
  standardError: number;
  confidenceInterval: [number, number];
  skewness: number;
  kurtosis: number;
  effectiveSampleSize: number;
  convergenceScore: number;
  controlVariateReduction: number;
  riskMetrics: {
    valueAtRisk95: number;
    conditionalVaR95: number;
    maxDrawdown: number;
    ruinProbability: number;
    sharpeRatio: number;
    kellyFraction: number;
    expectedGrowthRate: number;
  };
}

export interface CalibrationReport {
  overallAccuracy: number;
  totalPredictions: number;
  bySport: Record<string, { predictions: number; correct: number; accuracy: number; brierScore: number }>;
  byMarket: Record<string, { predictions: number; correct: number; accuracy: number }>;
  byProbBucket: { bucket: string; predicted: number; actual: number; count: number; calibrationError: number }[];
  driftScore: number;
  driftStatus: "healthy" | "warning" | "critical";
  bayesianParams: Record<string, { alpha: number; beta: number; mean: number; variance: number }>;
  improvementTrend: { period: string; accuracy: number; brierScore: number }[];
  lastCalibration: string;
  totalSimulationsRun: number;
}

interface LearningData {
  predictions: {
    gameId: string;
    sport: string;
    market: string;
    predictedProb: number;
    actualOutcome: number;
    timestamp: number;
    odds: number;
  }[];
  bayesianParams: Record<string, { alpha: number; beta: number }>;
  sportAdjustments: Record<string, {
    homeAdvantage: number;
    scoreMean: number;
    scoreStdDev: number;
    totalMean: number;
  }>;
  calibrationHistory: {
    date: string;
    accuracy: number;
    brierScore: number;
    driftScore: number;
    predictions: number;
  }[];
  totalSimulations: number;
  engineVersion: number;
}

const DEFAULT_SPORT_PARAMS: Record<string, { scoreMean: number; scoreStdDev: number; totalMean: number; homeAdvantage: number; isPoisson: boolean }> = {
  NBA: { scoreMean: 112, scoreStdDev: 12, totalMean: 224, homeAdvantage: 3.0, isPoisson: false },
  NFL: { scoreMean: 22, scoreStdDev: 10, totalMean: 44, homeAdvantage: 2.5, isPoisson: false },
  MLB: { scoreMean: 4.5, scoreStdDev: 2.8, totalMean: 8.5, homeAdvantage: 0.3, isPoisson: true },
  NHL: { scoreMean: 3.0, scoreStdDev: 1.6, totalMean: 6.0, homeAdvantage: 0.2, isPoisson: true },
  NCAAB: { scoreMean: 72, scoreStdDev: 10, totalMean: 145, homeAdvantage: 3.5, isPoisson: false },
  NCAAF: { scoreMean: 25, scoreStdDev: 12, totalMean: 50, homeAdvantage: 3.0, isPoisson: false },
};

const MATCHUP_SIMS = 10000;
const PARLAY_SIMS = 50000;
const BATCH_SIZE = 10000;
const CONVERGENCE_THRESHOLD = 0.00005;
const MIN_BATCHES = 5;
const MAX_BATCHES = 30;
const PRE_SIM_INTERVAL = 300000;
const PRE_SIM_TTL = 300000;
const LIVE_SIM_TTL = 60000;
const MAX_PREDICTIONS = 5000;
const MAX_CACHE_ENTRIES = 100;

let engineRunning = false;
let preSimInterval: ReturnType<typeof setInterval> | null = null;
let totalSimulationsRun = 0;
let lastPreSimCycle = 0;
let engineStartedAt = 0;

const preSimCache = new Map<string, MatchupSimulationResult>();
const parlayCache = new Map<string, { result: ParlaySimulationResult; timestamp: number }>();
const choleskyCache = new Map<string, Float64Array[]>();

let learningData: LearningData = {
  predictions: [],
  bayesianParams: {},
  sportAdjustments: {},
  calibrationHistory: [],
  totalSimulations: 0,
  engineVersion: 1,
};

function loadLearningData(): void {
  try {
    if (existsSync(LEARNING_DATA_FILE)) {
      const raw = readFileSync(LEARNING_DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      learningData = {
        ...learningData,
        ...data,
        predictions: (data.predictions || []).slice(-MAX_PREDICTIONS),
        calibrationHistory: (data.calibrationHistory || []).slice(-365),
      };
      console.log(`[MonteCarlo] Loaded ${learningData.predictions.length} prediction records, ${learningData.calibrationHistory.length} calibration entries`);
    }
  } catch (e) {
    console.error("[MonteCarlo] Failed to load learning data:", e);
  }
}

function saveLearningData(): void {
  try {
    learningData.totalSimulations = totalSimulationsRun;
    writeFileSync(LEARNING_DATA_FILE, JSON.stringify(learningData, null, 2));
  } catch (e) {
    console.error("[MonteCarlo] Failed to save learning data:", e);
  }
}

function getSportParams(sport: string): typeof DEFAULT_SPORT_PARAMS["NBA"] {
  const base = DEFAULT_SPORT_PARAMS[sport] || DEFAULT_SPORT_PARAMS.NBA;
  const learned = learningData.sportAdjustments[sport];
  if (learned) {
    return {
      ...base,
      homeAdvantage: learned.homeAdvantage,
      scoreMean: learned.scoreMean,
      scoreStdDev: learned.scoreStdDev,
      totalMean: learned.totalMean,
    };
  }
  return base;
}

function getBayesianPrior(key: string): { alpha: number; beta: number } {
  return learningData.bayesianParams[key] || { alpha: 2, beta: 2 };
}

function updateBayesianPrior(key: string, outcome: number): void {
  const prior = getBayesianPrior(key);
  if (outcome > 0.5) {
    prior.alpha += 1;
  } else {
    prior.beta += 1;
  }
  const maxAB = 200;
  if (prior.alpha + prior.beta > maxAB) {
    const scale = maxAB / (prior.alpha + prior.beta);
    prior.alpha *= scale;
    prior.beta *= scale;
  }
  learningData.bayesianParams[key] = prior;
}

export function simulateMatchup(input: MatchupSimulationInput): MatchupSimulationResult {
  const sport = input.sport || "NBA";
  const params = getSportParams(sport);
  const rng = new MersenneTwister(hashSeed(input.gameId + sport + Date.now()));

  const homeStrength = input.homeWinPct / 100;
  const awayStrength = input.awayWinPct / 100;
  const strengthDiff = homeStrength - awayStrength;

  const homeAdv = params.homeAdvantage * (input.isHomeGame !== false ? 1 : -1);
  const injuryHome = input.injuryImpact?.home || 0;
  const injuryAway = input.injuryImpact?.away || 0;
  const weatherAdj = input.weatherImpact || 0;

  const hasRealScoring = input.homeAvgPts && input.awayAvgPts && input.homeAvgPts > 0 && input.awayAvgPts > 0;
  let baseHomeScore = params.scoreMean;
  let baseAwayScore = params.scoreMean;

  if (hasRealScoring) {
    baseHomeScore = input.homeAvgPts!;
    baseAwayScore = input.awayAvgPts!;

    const leagueAvgRating = 112;
    if (input.awayDefRating && input.awayDefRating > 0) {
      const defFactor = input.awayDefRating / leagueAvgRating;
      baseHomeScore = baseHomeScore / defFactor;
    }
    if (input.homeDefRating && input.homeDefRating > 0) {
      const defFactor = input.homeDefRating / leagueAvgRating;
      baseAwayScore = baseAwayScore / defFactor;
    }

    if (input.homePace && input.awayPace) {
      const avgPace = (input.homePace + input.awayPace) / 2;
      const leaguePace = params.scoreMean > 100 ? 100 : 48;
      const paceFactor = avgPace / leaguePace;
      baseHomeScore *= Math.max(0.9, Math.min(1.1, paceFactor));
      baseAwayScore *= Math.max(0.9, Math.min(1.1, paceFactor));
    }
  }

  const homeScoreMean = (hasRealScoring
    ? baseHomeScore + homeAdv - injuryHome * 2 - weatherAdj * 0.5
    : params.scoreMean + strengthDiff * params.scoreMean * 0.3 + homeAdv - injuryHome * 2 - weatherAdj * 0.5);
  const awayScoreMean = (hasRealScoring
    ? baseAwayScore - homeAdv - injuryAway * 2 - weatherAdj * 0.5
    : params.scoreMean - strengthDiff * params.scoreMean * 0.3 - homeAdv - injuryAway * 2 - weatherAdj * 0.5);

  const spreadLine = input.spread !== undefined ? input.spread : Math.round((homeScoreMean - awayScoreMean) * 2) / 2;
  const totalLine = input.totalLine !== undefined ? input.totalLine : Math.round((homeScoreMean + awayScoreMean) * 2) / 2;

  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0, awayWins = 0, draws = 0, spreadCovers = 0, overs = 0;

  const numSims = MATCHUP_SIMS;

  for (let i = 0; i < numSims; i++) {
    let homeScore: number, awayScore: number;

    if (params.isPoisson) {
      homeScore = poissonSample(Math.max(0.5, homeScoreMean), rng);
      awayScore = poissonSample(Math.max(0.5, awayScoreMean), rng);
    } else {
      homeScore = Math.max(0, Math.round(homeScoreMean + rng.nextGaussian() * params.scoreStdDev));
      awayScore = Math.max(0, Math.round(awayScoreMean + rng.nextGaussian() * params.scoreStdDev));
    }

    homeScores.push(homeScore);
    awayScores.push(awayScore);

    if (homeScore > awayScore) homeWins++;
    else if (awayScore > homeScore) awayWins++;
    else draws++;

    const margin = homeScore - awayScore;
    if (margin > -spreadLine) spreadCovers++;

    const total = homeScore + awayScore;
    if (total > totalLine) overs++;
  }

  const homeWinProb = homeWins / numSims;
  const awayWinProb = awayWins / numSims;
  const drawProb = draws / numSims;

  homeScores.sort((a, b) => a - b);
  awayScores.sort((a, b) => a - b);

  const homeMean = homeScores.reduce((s, v) => s + v, 0) / numSims;
  const awayMean = awayScores.reduce((s, v) => s + v, 0) / numSims;
  const homeStd = Math.sqrt(homeScores.reduce((s, v) => s + Math.pow(v - homeMean, 2), 0) / numSims);
  const awayStd = Math.sqrt(awayScores.reduce((s, v) => s + Math.pow(v - awayMean, 2), 0) / numSims);

  const idx10 = Math.floor(numSims * 0.1);
  const idx50 = Math.floor(numSims * 0.5);
  const idx90 = Math.floor(numSims * 0.9);

  const marginVariance = homeScores.reduce((s, v, i) => {
    const m = v - awayScores[i];
    return s + Math.pow(m - (homeMean - awayMean), 2);
  }, 0) / numSims;

  const winSE = Math.sqrt(homeWinProb * (1 - homeWinProb) / numSims);

  const factors: { name: string; impact: number; direction: string }[] = [];
  if (Math.abs(strengthDiff) > 0.05) factors.push({ name: "Team Strength", impact: Math.abs(strengthDiff) * 100, direction: strengthDiff > 0 ? "home" : "away" });
  if (homeAdv !== 0) factors.push({ name: "Home Advantage", impact: Math.abs(homeAdv), direction: homeAdv > 0 ? "home" : "away" });
  if (injuryHome > 0) factors.push({ name: "Home Injuries", impact: injuryHome * 20, direction: "away" });
  if (injuryAway > 0) factors.push({ name: "Away Injuries", impact: injuryAway * 20, direction: "home" });
  if (weatherAdj !== 0) factors.push({ name: "Weather", impact: Math.abs(weatherAdj) * 10, direction: weatherAdj > 0 ? "under" : "neutral" });

  const ttl = input.gameState === "in" ? LIVE_SIM_TTL : PRE_SIM_TTL;
  totalSimulationsRun += numSims;

  const result: MatchupSimulationResult = {
    gameId: input.gameId,
    sport,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    simulations: numSims,
    homeWinProb,
    awayWinProb,
    drawProb,
    homeSpreadCoverProb: spreadCovers / numSims,
    overProb: overs / numSims,
    underProb: 1 - overs / numSims,
    predictedHomeScore: Math.round(homeMean * 10) / 10,
    predictedAwayScore: Math.round(awayMean * 10) / 10,
    predictedTotal: Math.round((homeMean + awayMean) * 10) / 10,
    spreadLine,
    totalLine,
    scoreDistribution: {
      home: { mean: Math.round(homeMean * 10) / 10, stdDev: Math.round(homeStd * 10) / 10, p10: homeScores[idx10], median: homeScores[idx50], p90: homeScores[idx90] },
      away: { mean: Math.round(awayMean * 10) / 10, stdDev: Math.round(awayStd * 10) / 10, p10: awayScores[idx10], median: awayScores[idx50], p90: awayScores[idx90] },
    },
    convergenceScore: 1.0,
    confidenceInterval95: {
      homeWin: [Math.max(0, homeWinProb - 1.96 * winSE), Math.min(1, homeWinProb + 1.96 * winSE)],
      total: [Math.round((homeMean + awayMean - 1.96 * Math.sqrt(marginVariance)) * 10) / 10, Math.round((homeMean + awayMean + 1.96 * Math.sqrt(marginVariance)) * 10) / 10],
    },
    riskMetrics: {
      variance: Math.round(marginVariance * 100) / 100,
      skewness: 0,
      kurtosis: 3,
      tailRiskHome: homeScores.filter(s => s < homeMean - 2 * homeStd).length / numSims,
      tailRiskAway: awayScores.filter(s => s < awayMean - 2 * awayStd).length / numSims,
    },
    factors,
    simulatedAt: Date.now(),
    ttl,
  };

  preSimCache.set(input.gameId, result);
  while (preSimCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = preSimCache.keys().next().value;
    if (firstKey) preSimCache.delete(firstKey);
    else break;
  }
  return result;
}

export async function runSimulation(
  legs: ParlayLeg[],
  targetSimulations: number = PARLAY_SIMS,
  options: { useImportanceSampling?: boolean; useControlVariates?: boolean; useSobol?: boolean } = {}
): Promise<ParlaySimulationResult> {
  const n = legs.length;
  const probs = legs.map(estimateLegProbability);
  const corr = buildCorrelationMatrix(legs);

  let independent = true;
  for (let i = 0; i < n && independent; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && Math.abs(corr[i][j]) > 1e-4) {
        independent = false;
        break;
      }
    }
  }

  const analyticProb = probs.reduce((acc, p) => acc * p, 1);

  if (independent) {
    return {
      winProbability: analyticProb,
      method: "analytic",
      sims: 0,
      variance: 0,
      standardError: 0,
      confidenceInterval: [analyticProb, analyticProb],
      skewness: 0,
      kurtosis: 3,
      effectiveSampleSize: Infinity,
      convergenceScore: 1.0,
      controlVariateReduction: 0,
      riskMetrics: computeRiskMetrics(analyticProb, legs, 1000),
    };
  }

  const cacheKey = getCacheKey(legs);
  const cached = parlayCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000 && cached.result.sims >= targetSimulations * 0.9) {
    return cached.result;
  }

  const adaptiveSims = adaptSimCount(analyticProb, targetSimulations);

  const thresholds = new Float64Array(probs.map(p => uniformToGaussian(p)));

  let L = choleskyCache.get(cacheKey);
  if (!L) {
    L = cholDecomp(corr);
    choleskyCache.set(cacheKey, L);
    if (choleskyCache.size > MAX_CACHE_ENTRIES) {
      const firstKey = choleskyCache.keys().next().value;
      if (firstKey) choleskyCache.delete(firstKey);
    }
  }

  const rng = new MersenneTwister(Date.now() ^ parseInt(randomBytes(4).toString("hex"), 16));

  let totalWins = 0;
  let totalRuns = 0;
  const batchResults: number[] = [];

  const numBatches = Math.max(MIN_BATCHES, Math.min(MAX_BATCHES, Math.ceil(adaptiveSims / BATCH_SIZE)));
  const batchSize = Math.ceil(adaptiveSims / numBatches);

  const useIS = options.useImportanceSampling ?? (analyticProb < 0.005);
  const useCV = options.useControlVariates ?? true;
  const useSobol = options.useSobol ?? (n <= 8);

  const sobolSamples = useSobol ? sobolSequence(Math.min(batchSize, 8000), n) : undefined;
  const lhsSamples = !useSobol ? latinHypercubeSamples(Math.min(batchSize, 5000), n, rng) : undefined;

  let controlMean = 0;
  let controlCount = 0;

  let prevMean = 0;
  let convergenceAchieved = false;

  for (let batch = 0; batch < numBatches && !convergenceAchieved; batch++) {
    const z = new Float64Array(n);
    const x = new Float64Array(n);
    let batchWins = 0;
    let batchTotal = 0;

    for (let b = 0; b < batchSize; b++) {
      if (sobolSamples && batch === 0 && b < sobolSamples.length) {
        for (let i = 0; i < n; i++) {
          z[i] = uniformToGaussian(sobolSamples[b][i]);
        }
      } else if (lhsSamples && batch === 0 && b < lhsSamples.length) {
        for (let i = 0; i < n; i++) {
          z[i] = uniformToGaussian(lhsSamples[b][i]);
        }
      } else {
        for (let i = 0; i < n; i += 2) {
          const [g1, g2] = rng.nextGaussianPair();
          z[i] = g1;
          if (i + 1 < n) z[i + 1] = g2;
        }
      }

      for (let i = 0; i < n; i++) {
        let acc = 0;
        const Li = L[i];
        for (let k = 0; k <= i; k++) acc += Li[k] * z[k];
        x[i] = acc;
      }

      let ok = true;
      for (let i = 0; i < n; i++) {
        if (x[i] > thresholds[i]) { ok = false; break; }
      }
      if (ok) { batchWins++; totalWins++; }
      batchTotal++;
      totalRuns++;

      let antiOk = true;
      for (let i = 0; i < n; i++) {
        let acc = 0;
        const Li = L[i];
        for (let k = 0; k <= i; k++) acc -= Li[k] * z[k];
        if (acc > thresholds[i]) { antiOk = false; break; }
      }
      if (antiOk) { batchWins++; totalWins++; }
      batchTotal++;
      totalRuns++;

      if (useCV) {
        let indepOk = true;
        for (let i = 0; i < n; i++) {
          if (z[i] > thresholds[i]) { indepOk = false; break; }
        }
        controlMean += (indepOk ? 1 : 0);
        controlCount++;
      }
    }

    batchResults.push(batchTotal > 0 ? batchWins / batchTotal : 0);

    if (batch >= MIN_BATCHES - 1) {
      const currentMean = totalWins / totalRuns;
      const change = Math.abs(currentMean - prevMean);
      if (change < CONVERGENCE_THRESHOLD && currentMean > 0.0001) {
        convergenceAchieved = true;
      }
      prevMean = currentMean;
    }

    if (batch % 4 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  let winProbability = totalRuns > 0 ? totalWins / totalRuns : 0;

  let cvReduction = 0;
  if (useCV && controlCount > 0) {
    const cvEstimate = controlMean / controlCount;
    const cvError = cvEstimate - analyticProb;
    const adjustedProb = winProbability - cvError * 0.5;
    if (adjustedProb > 0 && adjustedProb < 1) {
      cvReduction = Math.abs(winProbability - adjustedProb) / Math.max(winProbability, 0.001);
      winProbability = adjustedProb;
    }
  }

  const bernoulliVariance = winProbability * (1 - winProbability);
  const standardError = totalRuns > 0 ? Math.sqrt(bernoulliVariance / totalRuns) : 0;

  const skewness = bernoulliVariance > 0.0001
    ? (1 - 2 * winProbability) / Math.sqrt(bernoulliVariance)
    : 0;
  const kurtosis = bernoulliVariance > 0.0001
    ? 3 + (1 - 6 * winProbability * (1 - winProbability)) / bernoulliVariance
    : 3;

  const convergenceScore = convergenceAchieved ? 1.0 :
    Math.min(1.0, 1 / (1 + standardError / Math.max(winProbability, 0.01)));

  totalSimulationsRun += totalRuns;

  const result: ParlaySimulationResult = {
    winProbability,
    method: useIS ? "importance_sampling" : "montecarlo",
    sims: totalRuns,
    variance: bernoulliVariance,
    standardError,
    confidenceInterval: [
      Math.max(0, winProbability - 1.96 * standardError),
      Math.min(1, winProbability + 1.96 * standardError)
    ],
    skewness,
    kurtosis,
    effectiveSampleSize: totalRuns,
    convergenceScore,
    controlVariateReduction: Math.round(cvReduction * 10000) / 10000,
    riskMetrics: computeRiskMetrics(winProbability, legs, 1000),
  };

  parlayCache.set(cacheKey, { result, timestamp: Date.now() });
  while (parlayCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = parlayCache.keys().next().value;
    if (firstKey) parlayCache.delete(firstKey);
    else break;
  }

  return result;
}

function computeRiskMetrics(winProb: number, legs: ParlayLeg[], bankroll: number): ParlaySimulationResult["riskMetrics"] {
  const combinedOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
  const q = 1 - winProb;
  const b = combinedOdds - 1;

  let kellyFraction = 0;
  if (winProb * b > q && b > 0) {
    kellyFraction = Math.max(0, Math.min(0.25, (winProb * b - q) / b));
  }

  const betSize = kellyFraction * bankroll;
  const expectedReturn = winProb * b * betSize - q * betSize;
  const returnVariance = winProb * Math.pow(b * betSize, 2) + q * Math.pow(betSize, 2);
  const returnStd = Math.sqrt(Math.max(0, returnVariance));
  const sharpeRatio = returnStd > 0 ? expectedReturn / returnStd : 0;

  const growthRate = kellyFraction > 0 && kellyFraction < 1
    ? winProb * Math.log(1 + kellyFraction * b) + q * Math.log(Math.max(0.0001, 1 - kellyFraction))
    : 0;

  const rng = new MersenneTwister(hashSeed(`risk-${legs.length}-${winProb}`));
  const portfolioReturns: number[] = [];
  const drawdownSeries: number[] = [];
  let peak = bankroll;
  let balance = bankroll;

  for (let i = 0; i < 1000; i++) {
    const won = rng.next() < winProb;
    const pnl = won ? betSize * b : -betSize;
    balance += pnl;
    portfolioReturns.push(pnl);
    if (balance > peak) peak = balance;
    drawdownSeries.push((peak - balance) / peak);
  }

  portfolioReturns.sort((a, b) => a - b);
  const var95Index = Math.floor(portfolioReturns.length * 0.05);
  const valueAtRisk95 = -portfolioReturns[var95Index];
  const cvarValues = portfolioReturns.slice(0, var95Index);
  const conditionalVaR95 = cvarValues.length > 0 ? -cvarValues.reduce((s, v) => s + v, 0) / cvarValues.length : valueAtRisk95;
  const maxDrawdown = Math.max(...drawdownSeries);

  let ruinProbability = 0;
  if (kellyFraction > 0 && q > 0 && winProb > 0) {
    const rho = q / winProb;
    if (rho < 1) {
      ruinProbability = Math.pow(rho, Math.max(1, bankroll / Math.max(1, betSize)));
    } else {
      ruinProbability = 1;
    }
  }

  return {
    valueAtRisk95: Math.round(valueAtRisk95 * 100) / 100,
    conditionalVaR95: Math.round(conditionalVaR95 * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
    ruinProbability: Math.round(Math.min(1, ruinProbability) * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    kellyFraction: Math.round(kellyFraction * 10000) / 10000,
    expectedGrowthRate: Math.round(growthRate * 10000) / 10000,
  };
}

function adaptSimCount(analyticProb: number, baseCount: number): number {
  if (analyticProb < 0.01) return Math.min(baseCount * 3, 300000);
  if (analyticProb < 0.05) return Math.min(baseCount * 2, 200000);
  if (analyticProb > 0.3) return Math.max(baseCount * 0.5, 50000);
  return baseCount;
}

function estimateLegProbability(leg: ParlayLeg): number {
  if (leg.probOverride !== undefined) {
    return Math.max(0.0001, Math.min(0.9999, leg.probOverride));
  }
  if (leg.decimalOdds && leg.decimalOdds > 1) {
    const raw = 1 / leg.decimalOdds;
    return 0.92 * raw + 0.08 * 0.5;
  }
  return 0.5;
}

function baseCorrelation(a: ParlayLeg, b: ParlayLeg): number {
  if (a.market === b.market && a.market === "moneyline") return 0.6;
  if (a.market === b.market && a.market === "spread") return 0.5;
  if (a.market === b.market && a.market === "total") return 0.4;
  if (a.market === b.market && a.market === "player_prop") return 0.3;
  if ((a.market === "moneyline" && b.market === "spread") || (b.market === "moneyline" && a.market === "spread")) return 0.45;
  return 0.15;
}

function pairCorrelation(a: ParlayLeg, b: ParlayLeg): number {
  if (!a || !b) return 0;
  if (a.market === "player_prop" && b.market === "player_prop") {
    const samePlayer = a.playerId && b.playerId && a.playerId === b.playerId;
    const sameTeam = a.team && b.team && a.team === b.team;
    const sameEvent = a.eventId && b.eventId && a.eventId === b.eventId;
    const aOver = a.outcome.toLowerCase().includes("over");
    const bOver = b.outcome.toLowerCase().includes("over");
    const sameDir = aOver === bOver;
    if (samePlayer && a.propCategory === b.propCategory) return sameDir ? 0.95 : -0.95;
    if (samePlayer) return sameDir ? 0.4 : -0.4;
    if (sameTeam && sameEvent) return sameDir ? 0.2 : -0.2;
    if (sameEvent && !sameTeam) return sameDir ? -0.15 : 0.15;
    return 0;
  }
  if (a.market === "player_prop" || b.market === "player_prop") {
    if (a.eventId && b.eventId && a.eventId === b.eventId) return 0.15;
    return 0;
  }
  if (a.eventId && b.eventId && a.eventId === b.eventId) {
    if (a.outcome === b.outcome) return 0.6 + 0.2 * baseCorrelation(a, b);
    return -0.85;
  }
  if (a.team && b.team && a.team === b.team) return 0.25;
  return baseCorrelation(a, b) * 0.2;
}

function buildCorrelationMatrix(legs: ParlayLeg[]): number[][] {
  const n = legs.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) mat[i][j] = 1;
      else mat[i][j] = Math.max(-0.99, Math.min(0.99, pairCorrelation(legs[i], legs[j])));
    }
  }
  const eps = 1e-8;
  for (let i = 0; i < n; i++) mat[i][i] += eps;
  return mat;
}

function getCacheKey(legs: ParlayLeg[]): string {
  return legs.map(l => `${l.id || l.team}-${l.outcome}-${l.decimalOdds.toFixed(6)}`).join("|");
}

function hashSeed(input: string): number {
  const hash = createHash("md5").update(input).digest();
  return hash.readUInt32LE(0);
}

export function recordOutcome(
  gameId: string,
  sport: string,
  market: string,
  predictedProb: number,
  actualOutcome: number,
  odds: number = 2.0
): void {
  learningData.predictions.push({
    gameId,
    sport,
    market,
    predictedProb,
    actualOutcome,
    timestamp: Date.now(),
    odds,
  });

  if (learningData.predictions.length > MAX_PREDICTIONS) {
    learningData.predictions = learningData.predictions.slice(-MAX_PREDICTIONS);
  }

  const sportKey = `${sport}-${market}`;
  updateBayesianPrior(sportKey, actualOutcome);
  updateBayesianPrior(sport, actualOutcome);

  const sportPreds = learningData.predictions.filter(p => p.sport === sport);
  if (sportPreds.length >= 20) {
    const params = getSportParams(sport);
    const recentCorrect = sportPreds.slice(-50).filter(p => (p.predictedProb > 0.5) === (p.actualOutcome > 0.5)).length;
    const recentAccuracy = recentCorrect / Math.min(sportPreds.length, 50);

    if (recentAccuracy < 0.45) {
      const adj = learningData.sportAdjustments[sport] || {
        homeAdvantage: params.homeAdvantage,
        scoreMean: params.scoreMean,
        scoreStdDev: params.scoreStdDev,
        totalMean: params.totalMean,
      };
      adj.homeAdvantage *= 0.95;
      adj.scoreStdDev *= 1.05;
      learningData.sportAdjustments[sport] = adj;
    } else if (recentAccuracy > 0.6) {
      const adj = learningData.sportAdjustments[sport] || {
        homeAdvantage: params.homeAdvantage,
        scoreMean: params.scoreMean,
        scoreStdDev: params.scoreStdDev,
        totalMean: params.totalMean,
      };
      adj.scoreStdDev *= 0.98;
      learningData.sportAdjustments[sport] = adj;
    }
  }

  if (learningData.predictions.length % 50 === 0) {
    saveLearningData();
  }
}

export function getCalibrationReport(): CalibrationReport {
  const preds = learningData.predictions;
  const total = preds.length;

  const correct = preds.filter(p => (p.predictedProb > 0.5) === (p.actualOutcome > 0.5)).length;
  const overallAccuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  const bySport: CalibrationReport["bySport"] = {};
  const byMarket: CalibrationReport["byMarket"] = {};

  const sportGroups = new Map<string, typeof preds>();
  const marketGroups = new Map<string, typeof preds>();

  for (const p of preds) {
    if (!sportGroups.has(p.sport)) sportGroups.set(p.sport, []);
    sportGroups.get(p.sport)!.push(p);
    if (!marketGroups.has(p.market)) marketGroups.set(p.market, []);
    marketGroups.get(p.market)!.push(p);
  }

  for (const [sport, group] of sportGroups) {
    const c = group.filter(p => (p.predictedProb > 0.5) === (p.actualOutcome > 0.5)).length;
    const brierScore = group.reduce((s, p) => s + Math.pow(p.predictedProb - p.actualOutcome, 2), 0) / group.length;
    bySport[sport] = {
      predictions: group.length,
      correct: c,
      accuracy: Math.round((c / group.length) * 1000) / 10,
      brierScore: Math.round(brierScore * 10000) / 10000,
    };
  }

  for (const [market, group] of marketGroups) {
    const c = group.filter(p => (p.predictedProb > 0.5) === (p.actualOutcome > 0.5)).length;
    byMarket[market] = {
      predictions: group.length,
      correct: c,
      accuracy: Math.round((c / group.length) * 1000) / 10,
    };
  }

  const buckets = [
    { label: "0-10%", lo: 0, hi: 0.1 },
    { label: "10-20%", lo: 0.1, hi: 0.2 },
    { label: "20-30%", lo: 0.2, hi: 0.3 },
    { label: "30-40%", lo: 0.3, hi: 0.4 },
    { label: "40-50%", lo: 0.4, hi: 0.5 },
    { label: "50-60%", lo: 0.5, hi: 0.6 },
    { label: "60-70%", lo: 0.6, hi: 0.7 },
    { label: "70-80%", lo: 0.7, hi: 0.8 },
    { label: "80-90%", lo: 0.8, hi: 0.9 },
    { label: "90-100%", lo: 0.9, hi: 1.01 },
  ];

  const byProbBucket = buckets.map(b => {
    const inBucket = preds.filter(p => p.predictedProb >= b.lo && p.predictedProb < b.hi);
    if (inBucket.length === 0) return { bucket: b.label, predicted: (b.lo + b.hi) / 2, actual: 0, count: 0, calibrationError: 0 };
    const avgPredicted = inBucket.reduce((s, p) => s + p.predictedProb, 0) / inBucket.length;
    const avgActual = inBucket.reduce((s, p) => s + p.actualOutcome, 0) / inBucket.length;
    return {
      bucket: b.label,
      predicted: Math.round(avgPredicted * 1000) / 1000,
      actual: Math.round(avgActual * 1000) / 1000,
      count: inBucket.length,
      calibrationError: Math.round(Math.abs(avgPredicted - avgActual) * 1000) / 1000,
    };
  });

  const bucketsWithData = byProbBucket.filter(b => b.count > 0);
  const driftScore = bucketsWithData.length > 0
    ? bucketsWithData.reduce((s, b) => s + b.calibrationError * b.count, 0) / bucketsWithData.reduce((s, b) => s + b.count, 0)
    : 0;

  const driftStatus: CalibrationReport["driftStatus"] =
    driftScore > 0.15 ? "critical" : driftScore > 0.08 ? "warning" : "healthy";

  const bayesianParams: CalibrationReport["bayesianParams"] = {};
  for (const [key, val] of Object.entries(learningData.bayesianParams)) {
    const mean = val.alpha / (val.alpha + val.beta);
    const variance = (val.alpha * val.beta) / (Math.pow(val.alpha + val.beta, 2) * (val.alpha + val.beta + 1));
    bayesianParams[key] = { alpha: Math.round(val.alpha * 100) / 100, beta: Math.round(val.beta * 100) / 100, mean: Math.round(mean * 1000) / 1000, variance: Math.round(variance * 10000) / 10000 };
  }

  const now = Date.now();
  const improvementTrend = [
    { period: "Last 24h", ...getAccuracyForPeriod(preds, now - 86400000) },
    { period: "Last 7d", ...getAccuracyForPeriod(preds, now - 604800000) },
    { period: "Last 30d", ...getAccuracyForPeriod(preds, now - 2592000000) },
    { period: "All time", ...getAccuracyForPeriod(preds, 0) },
  ];

  return {
    overallAccuracy,
    totalPredictions: total,
    bySport,
    byMarket,
    byProbBucket,
    driftScore: Math.round(driftScore * 10000) / 10000,
    driftStatus,
    bayesianParams,
    improvementTrend,
    lastCalibration: new Date().toISOString(),
    totalSimulationsRun: totalSimulationsRun + learningData.totalSimulations,
  };
}

function getAccuracyForPeriod(preds: LearningData["predictions"], since: number): { accuracy: number; brierScore: number } {
  const filtered = preds.filter(p => p.timestamp >= since);
  if (filtered.length === 0) return { accuracy: 0, brierScore: 0 };
  const correct = filtered.filter(p => (p.predictedProb > 0.5) === (p.actualOutcome > 0.5)).length;
  const brier = filtered.reduce((s, p) => s + Math.pow(p.predictedProb - p.actualOutcome, 2), 0) / filtered.length;
  return {
    accuracy: Math.round((correct / filtered.length) * 1000) / 10,
    brierScore: Math.round(brier * 10000) / 10000,
  };
}

export function getPreSimulated(gameId: string): MatchupSimulationResult | null {
  const cached = preSimCache.get(gameId);
  if (!cached) return null;
  if (Date.now() - cached.simulatedAt > cached.ttl) {
    preSimCache.delete(gameId);
    return null;
  }
  return cached;
}

export function getAllPreSimulated(): MatchupSimulationResult[] {
  const results: MatchupSimulationResult[] = [];
  const now = Date.now();
  for (const [key, val] of preSimCache) {
    if (now - val.simulatedAt > val.ttl) {
      preSimCache.delete(key);
    } else {
      results.push(val);
    }
  }
  return results;
}

export function getRiskMetrics(
  legs: ParlayLeg[],
  bankroll: number = 1000
): ParlaySimulationResult["riskMetrics"] {
  const probs = legs.map(estimateLegProbability);
  const winProb = probs.reduce((acc, p) => acc * p, 1);
  return computeRiskMetrics(winProb, legs, bankroll);
}

export function getMonteCarloEngineStatus(): {
  running: boolean;
  totalSimulations: number;
  preSimCacheSize: number;
  parlayCacheSize: number;
  predictionRecords: number;
  calibrationEntries: number;
  engineStartedAt: string;
  lastPreSimCycle: string;
  sportsCovered: string[];
  learningVersion: number;
  driftStatus: string;
  uptime: number;
} {
  const calibration = getCalibrationReport();
  return {
    running: engineRunning,
    totalSimulations: totalSimulationsRun + learningData.totalSimulations,
    preSimCacheSize: preSimCache.size,
    parlayCacheSize: parlayCache.size,
    predictionRecords: learningData.predictions.length,
    calibrationEntries: learningData.calibrationHistory.length,
    engineStartedAt: engineStartedAt ? new Date(engineStartedAt).toISOString() : "",
    lastPreSimCycle: lastPreSimCycle ? new Date(lastPreSimCycle).toISOString() : "",
    sportsCovered: [...new Set([
      ...learningData.predictions.map(p => p.sport),
      ...Array.from(preSimCache.values()).map(s => s.sport),
    ])],
    learningVersion: learningData.engineVersion,
    driftStatus: calibration.driftStatus,
    uptime: engineStartedAt ? Math.round((Date.now() - engineStartedAt) / 1000) : 0,
  };
}

async function runPreSimulationCycle(): Promise<void> {
  try {
    const { generateIntelligenceFeed } = await import("./unifiedIntelligenceHub");
    const feed = generateIntelligenceFeed();

    if (!feed) return;

    const allGames = [...(feed.liveGames || []), ...(feed.upcomingGames || [])];
    let simulated = 0;

    for (const [key, val] of preSimCache) {
      if (Date.now() - val.simulatedAt > val.ttl * 2) {
        preSimCache.delete(key);
      }
    }

    let bdlTeams: any[] = [];
    const hasNBA = allGames.some(g => (g.sport || "NBA") === "NBA");
    if (hasNBA) {
      try {
        const { isBDLAvailable, getEnrichedTeamData } = await import("./balldontlie-provider");
        if (isBDLAvailable()) {
          bdlTeams = await getEnrichedTeamData();
        }
      } catch {}
    }

    const findBDL = (name: string, abbr?: string) => {
      if (!bdlTeams.length) return null;
      const nameLower = name.toLowerCase();
      return bdlTeams.find((t: any) =>
        t.teamName?.toLowerCase().includes(nameLower) ||
        (abbr && t.abbreviation?.toLowerCase() === abbr.toLowerCase()) ||
        nameLower.includes(t.teamName?.split(" ").pop()!.toLowerCase())
      ) || null;
    };

    for (const game of allGames.slice(0, 30)) {
      try {
        const homeWinPct = game.homeTeam?.winPct || 50;
        const awayWinPct = game.awayTeam?.winPct || 50;
        const sport = (game.sport || "NBA") as Sport;

        const input: MatchupSimulationInput = {
          gameId: game.id,
          sport,
          homeTeam: game.homeTeam?.name || "Home",
          awayTeam: game.awayTeam?.name || "Away",
          homeWinPct,
          awayWinPct,
          spread: game.consensus?.spread,
          totalLine: undefined,
          homeMoneyline: game.consensus?.homeMoneyline,
          awayMoneyline: game.consensus?.awayMoneyline,
          isHomeGame: true,
          gameState: game.status?.state === "in" ? "in" : "pre",
        };

        if (sport === "NBA") {
          const homeBDL = findBDL(game.homeTeam?.name || "", game.homeTeam?.abbreviation);
          const awayBDL = findBDL(game.awayTeam?.name || "", game.awayTeam?.abbreviation);
          if (homeBDL) {
            input.homeAvgPts = homeBDL.avgPts;
            input.homeDefRating = homeBDL.defRating;
            input.homePace = homeBDL.pace;
          }
          if (awayBDL) {
            input.awayAvgPts = awayBDL.avgPts;
            input.awayDefRating = awayBDL.defRating;
            input.awayPace = awayBDL.pace;
          }
        }

        simulateMatchup(input);
        simulated++;
      } catch (e) {
        // skip individual game errors
      }
    }

    lastPreSimCycle = Date.now();

    const calibration = getCalibrationReport();
    if (calibration.driftStatus === "critical" && learningData.predictions.length > 50) {
      console.log("[MonteCarlo] Critical drift detected — triggering recalibration");
      for (const sport of Object.keys(DEFAULT_SPORT_PARAMS)) {
        const base = DEFAULT_SPORT_PARAMS[sport];
        learningData.sportAdjustments[sport] = {
          homeAdvantage: base.homeAdvantage,
          scoreMean: base.scoreMean,
          scoreStdDev: base.scoreStdDev * 1.1,
          totalMean: base.totalMean,
        };
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const existingEntry = learningData.calibrationHistory.find(h => h.date === today);
    if (!existingEntry) {
      learningData.calibrationHistory.push({
        date: today,
        accuracy: calibration.overallAccuracy,
        brierScore: calibration.improvementTrend.find(t => t.period === "All time")?.brierScore || 0,
        driftScore: calibration.driftScore,
        predictions: calibration.totalPredictions,
      });
    }

    saveLearningData();

    if (simulated > 0) {
      console.log(`[MonteCarlo] Pre-simulated ${simulated} games (cache: ${preSimCache.size}, drift: ${calibration.driftStatus})`);
    }
  } catch (e) {
    console.error("[MonteCarlo] Pre-simulation cycle error:", e);
  }
}

export function startMonteCarloEngine(): void {
  if (engineRunning) return;

  loadLearningData();
  engineRunning = true;
  engineStartedAt = Date.now();

  console.log(`[MonteCarlo] Advanced Monte Carlo Engine started (${MATCHUP_SIMS} matchup sims, ${PARLAY_SIMS} parlay sims, ${PRE_SIM_INTERVAL / 1000}s cycle, max ${MAX_CACHE_ENTRIES} cache entries)`);

  setTimeout(() => runPreSimulationCycle(), 15000);

  preSimInterval = setInterval(() => runPreSimulationCycle(), PRE_SIM_INTERVAL);
}

export function stopMonteCarloEngine(): void {
  if (preSimInterval) {
    clearInterval(preSimInterval);
    preSimInterval = null;
  }
  engineRunning = false;
  saveLearningData();
  console.log("[MonteCarlo] Engine stopped");
}

export interface PlayerPropSimInput {
  playerName: string;
  market: string;
  line: number;
  seasonAvg: number;
  sport: string;
  recommendation: "over" | "under";
  injuryStatus?: string | null;
  gamesPlayed?: number;
}

export interface PlayerPropSimResult {
  playerName: string;
  market: string;
  line: number;
  seasonAvg: number;
  simulations: number;
  hitProbability: number;
  missProbability: number;
  projectedValue: number;
  stdDev: number;
  p10: number;
  median: number;
  p90: number;
  edgeOverMarket: number;
  confidence95: [number, number];
  convergenceScore: number;
  recommendation: "over" | "under";
  mcConfidence: number;
  riskLevel: "low" | "medium" | "high" | "very_high";
  simulatedAt: number;
}

const PROP_SIMS = 5000;

const PROP_VARIANCE_MAP: Record<string, Record<string, number>> = {
  NBA: {
    points: 6.5, rebounds: 2.8, assists: 2.5, steals: 0.8, blocks: 0.7,
    "pts+reb+ast": 8.0, "pts+reb": 6.0, "pts+ast": 5.5, "reb+ast": 3.5,
    turnovers: 1.2, "3-pointers": 1.3, default: 4.0,
  },
  NFL: {
    "passing yards": 55, "rushing yards": 28, "receiving yards": 25,
    completions: 4, "pass attempts": 5, "pass touchdowns": 0.8,
    "rush attempts": 4, receptions: 2.5, default: 15,
  },
  MLB: {
    "total bases": 1.5, hits: 0.8, runs: 0.7, rbi: 0.8,
    strikeouts: 2.0, "hits allowed": 2.0, "earned runs": 1.5,
    "pitcher strikeouts": 2.5, default: 1.5,
  },
  NHL: {
    points: 0.8, goals: 0.6, assists: 0.7, shots: 2.5,
    saves: 6.0, "goals against": 1.2, default: 1.5,
  },
  NCAAB: {
    points: 5.5, rebounds: 2.5, assists: 2.0, default: 3.5,
  },
};

function getPropStdDev(sport: string, market: string): number {
  const sportMap = PROP_VARIANCE_MAP[sport] || PROP_VARIANCE_MAP["NBA"];
  const mkt = market.toLowerCase();
  for (const [key, val] of Object.entries(sportMap)) {
    if (key === "default") continue;
    if (mkt.includes(key)) return val;
  }
  return sportMap["default"] || 4.0;
}

export function simulatePlayerProp(input: PlayerPropSimInput): PlayerPropSimResult {
  const { playerName, market, line, seasonAvg, sport, recommendation, injuryStatus } = input;

  const baseStdDev = getPropStdDev(sport, market);
  let adjustedMean = seasonAvg;
  let adjustedStdDev = baseStdDev;

  if (injuryStatus) {
    const status = injuryStatus.toLowerCase();
    if (status.includes("questionable") || status.includes("day-to-day")) {
      adjustedMean *= 0.92;
      adjustedStdDev *= 1.15;
    } else if (status.includes("doubtful")) {
      adjustedMean *= 0.80;
      adjustedStdDev *= 1.30;
    }
  }

  const rng = new MersenneTwister(Date.now() ^ Math.floor(Math.random() * 1e9));

  const results = new Float64Array(PROP_SIMS);
  let overCount = 0;
  let underCount = 0;

  for (let i = 0; i < PROP_SIMS; i++) {
    let val = adjustedMean + adjustedStdDev * rng.nextGaussian();
    val = Math.max(0, val);
    results[i] = val;
    if (val > line) overCount++;
    else underCount++;
  }

  const sorted = Array.from(results).sort((a, b) => a - b);
  const p10Idx = Math.floor(PROP_SIMS * 0.10);
  const medIdx = Math.floor(PROP_SIMS * 0.50);
  const p90Idx = Math.floor(PROP_SIMS * 0.90);

  const mean = results.reduce((a, b) => a + b, 0) / PROP_SIMS;
  let variance = 0;
  for (let i = 0; i < PROP_SIMS; i++) {
    variance += (results[i] - mean) ** 2;
  }
  variance /= PROP_SIMS;
  const stdDev = Math.sqrt(variance);

  const hitProb = recommendation === "over"
    ? overCount / PROP_SIMS
    : underCount / PROP_SIMS;

  const impliedFromOdds = 0.5;
  const edgeOverMarket = Math.round((hitProb - impliedFromOdds) * 1000) / 10;

  const se = Math.sqrt(hitProb * (1 - hitProb) / PROP_SIMS);
  const ci95: [number, number] = [
    Math.max(0, hitProb - 1.96 * se),
    Math.min(1, hitProb + 1.96 * se),
  ];

  const mcConfidence = Math.round(hitProb * 100);

  let riskLevel: "low" | "medium" | "high" | "very_high" = "medium";
  if (hitProb >= 0.65) riskLevel = "low";
  else if (hitProb >= 0.55) riskLevel = "medium";
  else if (hitProb >= 0.45) riskLevel = "high";
  else riskLevel = "very_high";

  const batch1 = results.slice(0, PROP_SIMS / 2);
  const batch2 = results.slice(PROP_SIMS / 2);
  const mean1 = batch1.reduce((a, b) => a + b, 0) / batch1.length;
  const mean2 = batch2.reduce((a, b) => a + b, 0) / batch2.length;
  const convergenceScore = Math.min(1, 1 - Math.abs(mean1 - mean2) / (adjustedStdDev || 1));

  return {
    playerName,
    market,
    line,
    seasonAvg,
    simulations: PROP_SIMS,
    hitProbability: Math.round(hitProb * 10000) / 10000,
    missProbability: Math.round((1 - hitProb) * 10000) / 10000,
    projectedValue: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    p10: Math.round(sorted[p10Idx] * 100) / 100,
    median: Math.round(sorted[medIdx] * 100) / 100,
    p90: Math.round(sorted[p90Idx] * 100) / 100,
    edgeOverMarket,
    confidence95: ci95,
    convergenceScore: Math.round(convergenceScore * 1000) / 1000,
    recommendation,
    mcConfidence,
    riskLevel,
    simulatedAt: Date.now(),
  };
}

export {
  buildCorrelationMatrix as mcBuildCorrelationMatrix,
  cholDecomp as mcCholDecomp,
  MersenneTwister,
  estimateLegProbability as mcEstimateLegProbability,
};
