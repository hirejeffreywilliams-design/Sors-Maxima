import { randomUUID } from "crypto";
import type { ParlayLeg, EvaluationResult, Sport, GeneratedParlay, User } from "@shared/schema";

export interface IStorage {
  evaluateParlay(
    legs: ParlayLeg[],
    stake: number,
    simulations: number
  ): Promise<EvaluationResult>;
  generateOptimalParlays(
    legs: ParlayLeg[],
    options: {
      minLegs: number;
      maxLegs: number;
      bankroll: number;
      riskLevel: "conservative" | "moderate" | "aggressive";
      topN: number;
      stake: number;
      sport: Sport;
    }
  ): Promise<GeneratedParlay[]>;
  getUsers(): Promise<User[]>;
}

const DEFAULT_SIMULATIONS = 100000;
const BATCH_SIZE = 10000;
const CONVERGENCE_THRESHOLD = 0.00005;
const MIN_BATCHES = 5;
const MAX_BATCHES = 30;
const ANTITHETIC_ENABLED = true;
const LATIN_HYPERCUBE_ENABLED = true;

const simulationCache = new Map<string, {
  winProbability: number;
  simulations: number;
  timestamp: number;
  variance: number;
  skewness: number;
  kurtosis: number;
}>();

const choleskyCache = new Map<string, Float64Array[]>();

function getCacheKey(legs: ParlayLeg[]): string {
  return legs.map(l => `${l.id || l.team}-${l.outcome}-${l.decimalOdds.toFixed(6)}`).join('|');
}

function clamp(x: number, lo = -0.99, hi = 0.99): number {
  return Math.max(lo, Math.min(hi, x));
}

function impliedProbabilityFromDecimal(decimalOdds: number): number | null {
  if (!decimalOdds || decimalOdds <= 1) return null;
  return 1 / decimalOdds;
}

function calibrateProbability(rawP: number | null): number {
  if (rawP === null || rawP === undefined) return 0.5;
  const alpha = 0.92;
  return alpha * rawP + (1 - alpha) * 0.5;
}

function estimateLegProbability(leg: ParlayLeg): number {
  if (leg.probOverride !== undefined) {
    return Math.max(0.0001, Math.min(0.9999, leg.probOverride));
  }
  if (leg.decimalOdds) {
    const p = impliedProbabilityFromDecimal(leg.decimalOdds);
    return calibrateProbability(p);
  }
  return 0.5;
}

function baseCorrelationForMarkets(a: ParlayLeg, b: ParlayLeg): number {
  if (a.market === b.market && a.market === "moneyline") return 0.6;
  if (a.market === b.market && a.market === "spread") return 0.5;
  if (a.market === b.market && a.market === "total") return 0.4;
  if (a.market === b.market && a.market === "player_prop") return 0.3;
  if (
    (a.market === "moneyline" && b.market === "spread") ||
    (b.market === "moneyline" && a.market === "spread")
  ) {
    return 0.45;
  }
  return 0.15;
}

function estimatePlayerPropCorrelation(a: ParlayLeg, b: ParlayLeg): number {
  if (a.market !== "player_prop" || b.market !== "player_prop") return 0;
  
  const samePlayer = a.playerId && b.playerId && a.playerId === b.playerId;
  const sameTeam = a.team && b.team && a.team === b.team;
  const sameEvent = a.eventId && b.eventId && a.eventId === b.eventId;
  
  const aIsOver = a.outcome.toLowerCase().includes("over");
  const bIsOver = b.outcome.toLowerCase().includes("over");
  const sameDirection = aIsOver === bIsOver;
  
  if (samePlayer && a.propCategory === b.propCategory) {
    return sameDirection ? 0.95 : -0.95;
  }
  
  if (samePlayer) {
    return sameDirection ? 0.4 : -0.4;
  }
  
  if (sameTeam && sameEvent) {
    const passingRecvCorr = (
      (a.propCategory === "passing_yards" && b.propCategory === "receiving_yards") ||
      (a.propCategory === "receiving_yards" && b.propCategory === "passing_yards") ||
      (a.propCategory === "passing_tds" && b.propCategory === "receiving_tds") ||
      (a.propCategory === "receiving_tds" && b.propCategory === "passing_tds")
    );
    
    if (passingRecvCorr) {
      return sameDirection ? 0.55 : -0.55;
    }
    
    return sameDirection ? 0.2 : -0.2;
  }
  
  if (sameEvent && !sameTeam) {
    return sameDirection ? -0.15 : 0.15;
  }
  
  return 0;
}

function estimatePairCorrelation(a: ParlayLeg, b: ParlayLeg): number {
  if (!a || !b) return 0;

  if (a.market === "player_prop" || b.market === "player_prop") {
    if (a.market === "player_prop" && b.market === "player_prop") {
      return clamp(estimatePlayerPropCorrelation(a, b));
    }
    if (a.eventId && b.eventId && a.eventId === b.eventId) {
      return clamp(0.15);
    }
    return 0;
  }

  if (a.eventId && b.eventId && a.eventId === b.eventId) {
    if (a.outcome === b.outcome) {
      return clamp(0.6 + 0.2 * baseCorrelationForMarkets(a, b));
    }
    return clamp(-0.85);
  }

  const teamOverlap = a.team && b.team && a.team === b.team;
  if (teamOverlap) {
    return clamp(0.25);
  }

  const base = baseCorrelationForMarkets(a, b);
  return clamp(base * 0.2);
}

function buildCorrelationMatrix(legs: ParlayLeg[]): number[][] {
  const n = legs.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) mat[i][j] = 1;
      else mat[i][j] = estimatePairCorrelation(legs[i], legs[j]);
    }
  }

  const eps = 1e-8;
  for (let i = 0; i < n; i++) mat[i][i] += eps;

  return mat;
}

function cholDecompTyped(A: number[][]): Float64Array[] {
  const n = A.length;
  const L: Float64Array[] = Array.from({ length: n }, () => new Float64Array(n));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        const val = A[i][i] - s;
        L[i][j] = Math.sqrt(Math.max(val, 1e-14));
      } else {
        L[i][j] = (A[i][j] - s) / L[j][j];
      }
    }
  }
  return L;
}

class HighPrecisionRNG {
  private state: Float64Array;
  private index: number;
  
  constructor(seed: number = Date.now()) {
    this.state = new Float64Array(624);
    this.index = 625;
    this.seed(seed);
  }
  
  private seed(s: number): void {
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
}

function generateLatinHypercubeSamples(n: number, dimensions: number, rng: HighPrecisionRNG): Float64Array[] {
  const samples: Float64Array[] = Array.from({ length: n }, () => new Float64Array(dimensions));
  
  for (let d = 0; d < dimensions; d++) {
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

function uniformToGaussian(u: number): number {
  if (u <= 0) return -8;
  if (u >= 1) return 8;
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q: number, r: number;
  
  if (u < pLow) {
    q = Math.sqrt(-2 * Math.log(u));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (u <= pHigh) {
    q = u - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - u));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

function runQuantumBatchSimulation(
  n: number,
  L: Float64Array[],
  thresholds: Float64Array,
  batchSize: number,
  rng: HighPrecisionRNG,
  useAntithetic: boolean,
  lhsSamples?: Float64Array[]
): { wins: number; totalSamples: number } {
  const z = new Float64Array(n);
  const x = new Float64Array(n);
  let wins = 0;
  let totalSamples = 0;

  for (let b = 0; b < batchSize; b++) {
    if (lhsSamples && b < lhsSamples.length) {
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
      if (x[i] > thresholds[i]) {
        ok = false;
        break;
      }
    }
    if (ok) wins++;
    totalSamples++;
    
    if (useAntithetic) {
      let antiOk = true;
      for (let i = 0; i < n; i++) {
        let acc = 0;
        const Li = L[i];
        for (let k = 0; k <= i; k++) acc -= Li[k] * z[k];
        if (acc > thresholds[i]) {
          antiOk = false;
          break;
        }
      }
      if (antiOk) wins++;
      totalSamples++;
    }
  }

  return { wins, totalSamples };
}

function calculateAdvancedKelly(
  winProbability: number,
  combinedOdds: number,
  bankroll: number,
  options: {
    multiplier?: number;
    maxBetFraction?: number;
    minEdge?: number;
    uncertaintyAdjustment?: number;
    correlationPenalty?: number;
    ruinAvoidance?: number;
  } = {}
): {
  kellyStake: number;
  fullKelly: number;
  halfKelly: number;
  quarterKelly: number;
  edge: number;
  edgePercent: number;
  isPositiveEV: boolean;
  confidence: "high" | "medium" | "low";
  ruinProbability: number;
  optimalFraction: number;
  growthRate: number;
  volatility: number;
  sharpeRatio: number;
} {
  const {
    multiplier = 0.25,
    maxBetFraction = 0.10,
    minEdge = 0.0,
    uncertaintyAdjustment = 0.05,
    correlationPenalty = 0.0,
    ruinAvoidance = 0.01,
  } = options;

  const safeBankroll = Math.max(bankroll, 1);
  const safeWinProb = Math.max(0.0001, Math.min(0.9999, winProbability));
  const safeOdds = Math.max(1.001, combinedOdds);
  
  const uncertaintyFactor = Math.max(0, 1 - uncertaintyAdjustment);
  const penaltyFactor = Math.max(0, 1 - correlationPenalty);
  const adjustedProb = Math.max(0.0001, Math.min(0.9999, 
    safeWinProb * uncertaintyFactor * penaltyFactor
  ));
  
  const q = 1 - adjustedProb;
  const b = safeOdds - 1;
  
  const edge = adjustedProb * (1 + b) - 1;
  const edgePercent = edge * 100;
  const isPositiveEV = edge > minEdge;

  let fullKellyFraction = 0;
  if (isPositiveEV && b > 0) {
    fullKellyFraction = (adjustedProb * b - q) / b;
    fullKellyFraction = Math.max(0, Math.min(1, fullKellyFraction));
  }

  const halfKellyFraction = fullKellyFraction * 0.5;
  const quarterKellyFraction = fullKellyFraction * 0.25;
  const adjustedFraction = fullKellyFraction * multiplier;

  const safeMaxFraction = Math.min(maxBetFraction, 1 - ruinAvoidance);
  const finalFraction = Math.max(0, Math.min(adjustedFraction, safeMaxFraction));

  const fullKelly = Math.max(0, fullKellyFraction * safeBankroll);
  const halfKelly = Math.max(0, halfKellyFraction * safeBankroll);
  const quarterKelly = Math.max(0, quarterKellyFraction * safeBankroll);
  const kellyStake = Math.max(0, finalFraction * safeBankroll);

  let growthRate = 0;
  if (isPositiveEV && finalFraction > 0 && finalFraction < 1) {
    const winGrowth = Math.log(1 + finalFraction * b);
    const lossGrowth = Math.log(Math.max(0.0001, 1 - finalFraction));
    growthRate = adjustedProb * winGrowth + q * lossGrowth;
  }

  const winVariance = adjustedProb * Math.pow(b * finalFraction, 2);
  const lossVariance = q * Math.pow(finalFraction, 2);
  const variance = winVariance + lossVariance;
  const volatility = Math.sqrt(Math.max(0, variance));
  
  const expectedReturn = adjustedProb * b * finalFraction - q * finalFraction;
  const sharpeRatio = volatility > 0.0001 ? expectedReturn / volatility : 0;

  let ruinProbability = 0;
  if (finalFraction > 0.0001 && q > 0.0001 && adjustedProb > 0.0001) {
    const rho = q / adjustedProb;
    if (rho < 1) {
      const unitSize = finalFraction * safeBankroll;
      const unitsInBankroll = Math.max(1, safeBankroll / Math.max(1, unitSize));
      ruinProbability = Math.pow(rho, unitsInBankroll);
    } else {
      ruinProbability = 1;
    }
  }
  ruinProbability = Math.min(1, Math.max(0, ruinProbability));

  let confidence: "high" | "medium" | "low";
  if (edge > 0.1 && adjustedProb > 0.3) {
    confidence = "high";
  } else if (edge > 0.02 && adjustedProb > 0.1) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    kellyStake: Math.round(kellyStake * 100) / 100,
    fullKelly: Math.round(fullKelly * 100) / 100,
    halfKelly: Math.round(halfKelly * 100) / 100,
    quarterKelly: Math.round(quarterKelly * 100) / 100,
    edge: Math.round(edge * 10000) / 10000,
    edgePercent: Math.round(edgePercent * 100) / 100,
    isPositiveEV,
    confidence,
    ruinProbability: Math.round(ruinProbability * 10000) / 10000,
    optimalFraction: Math.round(finalFraction * 10000) / 10000,
    growthRate: Math.round(growthRate * 10000) / 10000,
    volatility: Math.round(volatility * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
  };
}

function calculateMultiLegKelly(
  legs: ParlayLeg[],
  probs: number[],
  correlationMatrix: number[][],
  bankroll: number
): number {
  const n = legs.length;
  if (n === 0) return 0;

  const combinedOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
  const combinedProb = probs.reduce((acc, p) => acc * p, 1);

  let correlationAdjustment = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      correlationAdjustment += Math.abs(correlationMatrix[i][j]) * 0.02;
    }
  }

  const kelly = calculateAdvancedKelly(combinedProb, combinedOdds, bankroll, {
    multiplier: 0.25,
    correlationPenalty: correlationAdjustment,
    uncertaintyAdjustment: 0.03 + n * 0.01,
  });

  return kelly.kellyStake;
}

async function runQuantumMonteCarloSimulation(
  legs: ParlayLeg[],
  targetSimulations: number
): Promise<{
  winProbability: number;
  method: "analytic" | "montecarlo";
  sims: number;
  variance: number;
  standardError: number;
  confidenceInterval: [number, number];
  skewness: number;
  kurtosis: number;
  effectiveSampleSize: number;
  convergenceScore: number;
}> {
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

  if (independent) {
    const winProb = probs.reduce((acc, p) => acc * p, 1);
    return { 
      winProbability: winProb, 
      method: "analytic", 
      sims: 0,
      variance: 0,
      standardError: 0,
      confidenceInterval: [winProb, winProb],
      skewness: 0,
      kurtosis: 3,
      effectiveSampleSize: Infinity,
      convergenceScore: 1.0,
    };
  }

  const cacheKey = getCacheKey(legs);
  const cachedResult = simulationCache.get(cacheKey);
  if (cachedResult && cachedResult.simulations >= targetSimulations * 0.9 && 
      Date.now() - cachedResult.timestamp < 30000) {
    const se = Math.sqrt(cachedResult.variance / cachedResult.simulations);
    return {
      winProbability: cachedResult.winProbability,
      method: "montecarlo",
      sims: cachedResult.simulations,
      variance: cachedResult.variance,
      standardError: se,
      confidenceInterval: [
        Math.max(0, cachedResult.winProbability - 1.96 * se),
        Math.min(1, cachedResult.winProbability + 1.96 * se)
      ],
      skewness: cachedResult.skewness,
      kurtosis: cachedResult.kurtosis,
      effectiveSampleSize: cachedResult.simulations,
      convergenceScore: 1.0,
    };
  }

  const thresholds = new Float64Array(probs.map((p) => uniformToGaussian(p)));
  
  let L = choleskyCache.get(cacheKey);
  if (!L) {
    L = cholDecompTyped(corr);
    choleskyCache.set(cacheKey, L);
    if (choleskyCache.size > 200) {
      const firstKey = choleskyCache.keys().next().value;
      if (firstKey) choleskyCache.delete(firstKey);
    }
  }

  const rng = new HighPrecisionRNG(Date.now());
  
  let totalWins = 0;
  let totalRuns = 0;
  const batchResults: number[] = [];
  
  const numBatches = Math.max(MIN_BATCHES, Math.min(MAX_BATCHES, Math.ceil(targetSimulations / BATCH_SIZE)));
  const batchSize = Math.ceil(targetSimulations / numBatches);
  
  const lhsSamples = LATIN_HYPERCUBE_ENABLED ? 
    generateLatinHypercubeSamples(Math.min(batchSize, 5000), n, rng) : undefined;
  
  let prevMean = 0;
  let convergenceAchieved = false;
  
  for (let batch = 0; batch < numBatches && !convergenceAchieved; batch++) {
    const { wins, totalSamples } = runQuantumBatchSimulation(
      n, L, thresholds, batchSize, rng, 
      ANTITHETIC_ENABLED,
      batch === 0 ? lhsSamples : undefined
    );
    
    totalWins += wins;
    totalRuns += totalSamples;
    
    const batchProb = totalSamples > 0 ? wins / totalSamples : 0;
    batchResults.push(batchProb);
    
    if (batch >= MIN_BATCHES - 1) {
      const currentMean = totalWins / totalRuns;
      const change = Math.abs(currentMean - prevMean);
      
      if (change < CONVERGENCE_THRESHOLD && currentMean > 0.0001) {
        convergenceAchieved = true;
      }
      prevMean = currentMean;
    }
    
    if (batch % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const winProbability = totalRuns > 0 ? totalWins / totalRuns : 0;
  
  const bernoulliVariance = winProbability * (1 - winProbability);
  const standardError = totalRuns > 0 ? Math.sqrt(bernoulliVariance / totalRuns) : 0;
  
  const batchVariance = batchResults.length > 1 
    ? batchResults.reduce((sum, p) => sum + Math.pow(p - winProbability, 2), 0) / (batchResults.length - 1)
    : bernoulliVariance;
  
  const skewness = bernoulliVariance > 0.0001 
    ? (1 - 2 * winProbability) / Math.sqrt(bernoulliVariance)
    : 0;
  const kurtosis = bernoulliVariance > 0.0001 
    ? 3 + (1 - 6 * winProbability * (1 - winProbability)) / bernoulliVariance
    : 3;
  
  const effectiveSampleSize = totalRuns;
  
  const convergenceScore = convergenceAchieved ? 1.0 : 
    Math.min(1.0, 1 / (1 + standardError / Math.max(winProbability, 0.01)));
  
  const zScore = 1.96;
  
  simulationCache.set(cacheKey, {
    winProbability,
    simulations: totalRuns,
    timestamp: Date.now(),
    variance: bernoulliVariance,
    skewness,
    kurtosis,
  });
  
  if (simulationCache.size > 100) {
    const firstKey = simulationCache.keys().next().value;
    if (firstKey) simulationCache.delete(firstKey);
  }

  return {
    winProbability,
    method: "montecarlo",
    sims: totalRuns,
    variance: bernoulliVariance,
    standardError,
    confidenceInterval: [
      Math.max(0, winProbability - zScore * standardError),
      Math.min(1, winProbability + zScore * standardError)
    ],
    skewness,
    kurtosis,
    effectiveSampleSize,
    convergenceScore,
  };
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  
  const result: T[][] = [];
  const [first, ...rest] = arr;
  
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  for (const combo of combinations(rest, k)) {
    result.push(combo);
  }
  
  return result;
}

function hasConflictingLegs(combo: ParlayLeg[]): boolean {
  const seenEventMarkets = new Set<string>();
  const seenEvents = new Set<string>();
  
  for (const leg of combo) {
    if (!leg.eventId) continue;
    
    const eventMarketKey = `${leg.eventId}-${leg.market}`;
    if (seenEventMarkets.has(eventMarketKey)) {
      return true;
    }
    seenEventMarkets.add(eventMarketKey);
    
    if (leg.market === "moneyline" || leg.market === "spread") {
      if (seenEvents.has(leg.eventId)) {
        const existingLegs = combo.filter(l => l.eventId === leg.eventId && l !== leg);
        for (const existingLeg of existingLegs) {
          if ((existingLeg.market === "moneyline" || existingLeg.market === "spread") 
              && existingLeg.team !== leg.team) {
            return true;
          }
        }
      }
    }
    seenEvents.add(leg.eventId);
  }
  
  return false;
}

export class MemStorage implements IStorage {
  async evaluateParlay(
    legs: ParlayLeg[],
    stake: number,
    simulations: number
  ): Promise<EvaluationResult> {
    if (legs.length < 2) {
      throw new Error("At least 2 legs required for parlay evaluation");
    }

    const effectiveSimulations = Math.max(simulations, DEFAULT_SIMULATIONS);

    const legProbabilities = legs.map(estimateLegProbability);
    const combinedOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
    const correlationMatrix = buildCorrelationMatrix(legs);

    const simResult = await runQuantumMonteCarloSimulation(legs, effectiveSimulations);

    const impliedWinProb = 1 / combinedOdds;
    const expectedValue = simResult.winProbability / impliedWinProb - 1;

    const kellyResult = calculateAdvancedKelly(
      simResult.winProbability, 
      combinedOdds, 
      1000,
      {
        multiplier: 0.25,
        uncertaintyAdjustment: 0.03 + legs.length * 0.01,
      }
    );
    
    const potentialReturn = stake * combinedOdds;

    return {
      winProbability: simResult.winProbability,
      expectedValue,
      kellyStake: kellyResult.kellyStake,
      potentialReturn,
      combinedOdds,
      method: simResult.method,
      simulations: simResult.sims,
      legProbabilities,
      correlationMatrix,
      standardError: simResult.standardError,
      confidenceInterval: simResult.confidenceInterval,
    };
  }

  async generateOptimalParlays(
    allLegs: ParlayLeg[],
    options: {
      minLegs: number;
      maxLegs: number;
      bankroll: number;
      riskLevel: "conservative" | "moderate" | "aggressive";
      topN: number;
      stake: number;
      sport: Sport;
    }
  ): Promise<GeneratedParlay[]> {
    const { minLegs, maxLegs, bankroll, riskLevel, topN, stake, sport } = options;

    const legs = allLegs.sort((a, b) => {
      const probA = estimateLegProbability(a);
      const probB = estimateLegProbability(b);
      const evA = probA * a.decimalOdds - 1;
      const evB = probB * b.decimalOdds - 1;
      return evB - evA;
    });

    const topLegs = legs.slice(0, Math.min(20, legs.length));

    const candidates: Array<{
      legs: ParlayLeg[];
      winProb: number;
      ev: number;
      combinedOdds: number;
      score: number;
    }> = [];

    for (let k = minLegs; k <= maxLegs; k++) {
      for (const combo of combinations(topLegs, k)) {
        if (hasConflictingLegs(combo)) continue;

        const probs = combo.map(estimateLegProbability);
        const winProb = probs.reduce((acc: number, p: number) => acc * p, 1);
        const combinedOdds = combo.reduce((acc: number, leg: ParlayLeg) => acc * leg.decimalOdds, 1);
        const impliedProb = 1 / combinedOdds;
        const ev = winProb / impliedProb - 1;

        let score: number;
        switch (riskLevel) {
          case "conservative":
            score = winProb * 2 + ev * 0.5;
            break;
          case "aggressive":
            score = ev * 2 + winProb * 0.5;
            break;
          default:
            score = winProb + ev;
        }

        if (ev > -0.5) {
          candidates.push({
            legs: combo,
            winProb,
            ev,
            combinedOdds,
            score,
          });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    const topCandidates = candidates.slice(0, topN);

    const results: GeneratedParlay[] = [];

    for (const candidate of topCandidates) {
      const simResult = await runQuantumMonteCarloSimulation(candidate.legs, 50000);

      const kellyResult = calculateAdvancedKelly(
        simResult.winProbability,
        candidate.combinedOdds,
        bankroll,
        {
          multiplier: riskLevel === "aggressive" ? 0.5 : riskLevel === "conservative" ? 0.15 : 0.25,
        }
      );

      const potentialReturn = stake * candidate.combinedOdds;
      const impliedProb = 1 / candidate.combinedOdds;
      const expectedValue = simResult.winProbability / impliedProb - 1;

      let riskRating: "low" | "medium" | "high";
      if (simResult.winProbability >= 0.15) {
        riskRating = "low";
      } else if (simResult.winProbability >= 0.05) {
        riskRating = "medium";
      } else {
        riskRating = "high";
      }

      let score: number;
      switch (riskLevel) {
        case "conservative":
          score = simResult.winProbability * 2 + expectedValue * 0.5;
          break;
        case "aggressive":
          score = expectedValue * 2 + simResult.winProbability * 0.5;
          break;
        default:
          score = simResult.winProbability + expectedValue;
      }

      results.push({
        id: randomUUID(),
        legs: candidate.legs,
        winProbability: simResult.winProbability,
        expectedValue,
        kellyStake: kellyResult.kellyStake,
        potentialReturn,
        combinedOdds: candidate.combinedOdds,
        score,
        riskRating,
        sport,
        standardError: simResult.standardError,
        confidenceInterval: simResult.confidenceInterval,
      });
    }

    results.sort((a, b) => b.score - a.score);

    return results;
  }

  async getUsers(): Promise<User[]> {
    return [];
  }
}

export const storage = new MemStorage();