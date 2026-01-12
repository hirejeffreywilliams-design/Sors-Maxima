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
  if (
    (a.market === "moneyline" && b.market === "spread") ||
    (b.market === "moneyline" && a.market === "spread")
  ) {
    return 0.45;
  }
  return 0.15;
}

function estimatePairCorrelation(a: ParlayLeg, b: ParlayLeg): number {
  if (!a || !b) return 0;

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

function cholDecomp(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

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

function gaussianSampleVector(n: number): number[] {
  const out: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.random() || 1e-12;
    const u2 = Math.random() || 1e-12;
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    out[i] = z0;
    if (i + 1 < n) out[i + 1] = z1;
  }
  return out;
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

async function runMonteCarloSimulation(
  legs: ParlayLeg[],
  simulations: number
): Promise<{
  winProbability: number;
  method: "analytic" | "montecarlo";
  sims: number;
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
    return { winProbability: winProb, method: "analytic", sims: 0 };
  }

  const thresholds = probs.map((p) => normInv(p));
  const L = cholDecomp(corr);

  let wins = 0;
  const batchSize = Math.min(5000, simulations);
  let run = 0;

  while (run < simulations) {
    const thisBatch = Math.min(batchSize, simulations - run);
    for (let b = 0; b < thisBatch; b++) {
      const z = gaussianSampleVector(n);
      const x: number[] = Array(n).fill(0);

      for (let i = 0; i < n; i++) {
        let acc = 0;
        for (let k = 0; k <= i; k++) acc += L[i][k] * z[k];
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
    run += thisBatch;

    if (run % 10000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return {
    winProbability: wins / simulations,
    method: "montecarlo",
    sims: simulations,
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

function filterConflictingLegs(legs: ParlayLeg[]): ParlayLeg[] {
  const eventOutcomes = new Map<string, Set<string>>();
  const result: ParlayLeg[] = [];
  
  for (const leg of legs) {
    if (!leg.eventId) {
      result.push(leg);
      continue;
    }
    
    const key = `${leg.eventId}-${leg.market}`;
    const existing = eventOutcomes.get(key);
    
    if (!existing) {
      eventOutcomes.set(key, new Set([leg.outcome]));
      result.push(leg);
    }
  }
  
  return result;
}

function hasConflictingLegs(combo: ParlayLeg[]): boolean {
  const seen = new Map<string, string>();
  
  for (const leg of combo) {
    if (!leg.eventId) continue;
    
    const key = `${leg.eventId}-${leg.market}`;
    const existingOutcome = seen.get(key);
    
    if (existingOutcome && existingOutcome !== leg.outcome) {
      return true;
    }
    seen.set(key, leg.outcome);
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

    const legProbabilities = legs.map(estimateLegProbability);
    const combinedOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
    const correlationMatrix = buildCorrelationMatrix(legs);

    const { winProbability, method, sims } = await runMonteCarloSimulation(
      legs,
      simulations
    );

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
      const { winProbability } = await runMonteCarloSimulation(
        candidate.legs,
        5000
      );

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
      });
    }

    results.sort((a, b) => b.score - a.score);

    return results;
  }
}

export const storage = new MemStorage();
