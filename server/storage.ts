import { randomUUID } from "crypto";
import type { ParlayLeg, EvaluationResult, Sport, GeneratedParlay } from "@shared/schema";

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
}

const DEFAULT_SIMULATIONS = 100000;
const BATCH_SIZE = 10000;
const CONVERGENCE_THRESHOLD = 0.0001;
const MIN_BATCHES = 5;
const MAX_BATCHES = 20;

const simulationCache = new Map<string, {
  winProbability: number;
  simulations: number;
  timestamp: number;
  variance: number;
}>();

const choleskyCache = new Map<string, Float64Array[]>();

function getCacheKey(legs: ParlayLeg[]): string {
  return legs.map(l => `${l.id || l.team}-${l.outcome}-${l.decimalOdds}`).join('|');
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
  const alpha = 0.9;
  return alpha * rawP + (1 - alpha) * 0.5;
}

function estimateLegProbability(leg: ParlayLeg): number {
  if (leg.probOverride !== undefined) {
    return Math.max(0.001, Math.min(0.999, leg.probOverride));
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

  const eps = 1e-6;
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
        L[i][j] = Math.sqrt(Math.max(val, 1e-12));
      } else {
        L[i][j] = (A[i][j] - s) / L[j][j];
      }
    }
  }
  return L;
}

class SeededRNG {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextGaussian(): number {
    const u1 = this.next() || 1e-12;
    const u2 = this.next() || 1e-12;
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

function gaussianSampleVectorTyped(n: number, out: Float64Array, rng: SeededRNG): void {
  for (let i = 0; i < n; i += 2) {
    const u1 = rng.next() || 1e-12;
    const u2 = rng.next() || 1e-12;
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const phase = 2.0 * Math.PI * u2;
    out[i] = mag * Math.cos(phase);
    if (i + 1 < n) out[i + 1] = mag * Math.sin(phase);
  }
}

function erfinv(x: number): number {
  const a = 0.147;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const ln1MinusXSqrd = Math.log(1 - x * x);
  const term1 = 2 / (Math.PI * a) + ln1MinusXSqrd / 2;
  const term2 = ln1MinusXSqrd / a;

  return sign * Math.sqrt(Math.sqrt(term1 * term1 - term2) - term1);
}

function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  return Math.SQRT2 * erfinv(2 * p - 1);
}

function runBatchSimulation(
  n: number,
  L: Float64Array[],
  thresholds: Float64Array,
  batchSize: number,
  rng: SeededRNG
): number {
  const z = new Float64Array(n);
  const x = new Float64Array(n);
  let wins = 0;

  for (let b = 0; b < batchSize; b++) {
    gaussianSampleVectorTyped(n, z, rng);
    
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
  }

  return wins;
}

async function runAdaptiveMonteCarloSimulation(
  legs: ParlayLeg[],
  targetSimulations: number
): Promise<{
  winProbability: number;
  method: "analytic" | "montecarlo";
  sims: number;
  variance: number;
  standardError: number;
  confidenceInterval: [number, number];
}> {
  const n = legs.length;
  const probs = legs.map(estimateLegProbability);
  const corr = buildCorrelationMatrix(legs);

  let independent = true;
  for (let i = 0; i < n && independent; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && Math.abs(corr[i][j]) > 1e-3) {
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
      confidenceInterval: [winProb, winProb]
    };
  }

  const cacheKey = getCacheKey(legs);
  const cachedResult = simulationCache.get(cacheKey);
  if (cachedResult && cachedResult.simulations >= targetSimulations * 0.9 && 
      Date.now() - cachedResult.timestamp < 60000) {
    return {
      winProbability: cachedResult.winProbability,
      method: "montecarlo",
      sims: cachedResult.simulations,
      variance: cachedResult.variance,
      standardError: Math.sqrt(cachedResult.variance / cachedResult.simulations),
      confidenceInterval: [
        cachedResult.winProbability - 1.96 * Math.sqrt(cachedResult.variance / cachedResult.simulations),
        cachedResult.winProbability + 1.96 * Math.sqrt(cachedResult.variance / cachedResult.simulations)
      ]
    };
  }

  const thresholds = new Float64Array(probs.map((p) => normInv(p)));
  
  let L = choleskyCache.get(cacheKey);
  if (!L) {
    L = cholDecompTyped(corr);
    choleskyCache.set(cacheKey, L);
    if (choleskyCache.size > 100) {
      const firstKey = choleskyCache.keys().next().value;
      if (firstKey) choleskyCache.delete(firstKey);
    }
  }

  const rng = new SeededRNG(Date.now() + Math.floor(Math.random() * 1000000));
  
  let totalWins = 0;
  let totalRuns = 0;
  const batchResults: number[] = [];
  
  const numBatches = Math.max(MIN_BATCHES, Math.min(MAX_BATCHES, Math.ceil(targetSimulations / BATCH_SIZE)));
  const batchSize = Math.ceil(targetSimulations / numBatches);
  
  for (let batch = 0; batch < numBatches; batch++) {
    const wins = runBatchSimulation(n, L, thresholds, batchSize, rng);
    totalWins += wins;
    totalRuns += batchSize;
    batchResults.push(wins / batchSize);
    
    if (batch >= MIN_BATCHES - 1 && batch < numBatches - 1) {
      const currentProb = totalWins / totalRuns;
      const variance = batchResults.reduce((sum, p) => sum + Math.pow(p - currentProb, 2), 0) / batchResults.length;
      const standardError = Math.sqrt(variance / batchResults.length);
      
      if (standardError < CONVERGENCE_THRESHOLD && currentProb > 0.001) {
        break;
      }
    }
    
    if (batch % 3 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const winProbability = totalWins / totalRuns;
  const variance = batchResults.reduce((sum, p) => sum + Math.pow(p - winProbability, 2), 0) / batchResults.length;
  const standardError = Math.sqrt(variance / batchResults.length);
  
  simulationCache.set(cacheKey, {
    winProbability,
    simulations: totalRuns,
    timestamp: Date.now(),
    variance
  });
  
  if (simulationCache.size > 50) {
    const firstKey = simulationCache.keys().next().value;
    if (firstKey) simulationCache.delete(firstKey);
  }

  return {
    winProbability,
    method: "montecarlo",
    sims: totalRuns,
    variance,
    standardError,
    confidenceInterval: [
      Math.max(0, winProbability - 1.96 * standardError),
      Math.min(1, winProbability + 1.96 * standardError)
    ]
  };
}

function calculateKellyStake(
  winProb: number,
  combinedOdds: number,
  bankroll: number
): number {
  const q = 1 - winProb;
  const b = combinedOdds - 1;

  const kelly = (winProb * b - q) / b;

  if (kelly <= 0) return 0;

  const fractionalKelly = kelly * 0.25;
  return Math.min(fractionalKelly * bankroll, bankroll * 0.1);
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

    const { winProbability, method, sims, standardError, confidenceInterval } = 
      await runAdaptiveMonteCarloSimulation(legs, effectiveSimulations);

    const impliedWinProb = 1 / combinedOdds;
    const expectedValue = winProbability / impliedWinProb - 1;

    const kellyStake = calculateKellyStake(winProbability, combinedOdds, 1000);
    const potentialReturn = stake * combinedOdds;

    return {
      winProbability,
      expectedValue,
      kellyStake,
      potentialReturn,
      combinedOdds,
      method,
      simulations: sims,
      legProbabilities,
      correlationMatrix,
      standardError,
      confidenceInterval,
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
      const { winProbability, standardError, confidenceInterval } = 
        await runAdaptiveMonteCarloSimulation(candidate.legs, 50000);

      const kellyStake = calculateKellyStake(
        winProbability,
        candidate.combinedOdds,
        bankroll
      );

      const potentialReturn = stake * candidate.combinedOdds;
      const impliedProb = 1 / candidate.combinedOdds;
      const expectedValue = winProbability / impliedProb - 1;

      let riskRating: "low" | "medium" | "high";
      if (winProbability >= 0.15) {
        riskRating = "low";
      } else if (winProbability >= 0.05) {
        riskRating = "medium";
      } else {
        riskRating = "high";
      }

      let score: number;
      switch (riskLevel) {
        case "conservative":
          score = winProbability * 2 + expectedValue * 0.5;
          break;
        case "aggressive":
          score = expectedValue * 2 + winProbability * 0.5;
          break;
        default:
          score = winProbability + expectedValue;
      }

      results.push({
        id: randomUUID(),
        legs: candidate.legs,
        winProbability,
        expectedValue,
        kellyStake,
        potentialReturn,
        combinedOdds: candidate.combinedOdds,
        score,
        riskRating,
        sport,
        standardError,
        confidenceInterval,
      });
    }

    results.sort((a, b) => b.score - a.score);

    return results;
  }
}

export const storage = new MemStorage();