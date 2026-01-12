import { z } from "zod";

export const sports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;
export type Sport = (typeof sports)[number];

export const marketTypes = ["moneyline", "spread", "total", "player_prop"] as const;
export type MarketType = (typeof marketTypes)[number];

export const parlayLegSchema = z.object({
  id: z.string(),
  eventId: z.string().optional(),
  team: z.string().min(1, "Team name is required"),
  opponent: z.string().optional(),
  market: z.enum(marketTypes),
  outcome: z.string().min(1, "Outcome is required"),
  decimalOdds: z.number().min(1.01, "Odds must be greater than 1.01"),
  americanOdds: z.number().optional(),
  probOverride: z.number().min(0.01).max(0.99).optional(),
});

export type ParlayLeg = z.infer<typeof parlayLegSchema>;

export const insertParlayLegSchema = parlayLegSchema.omit({ id: true });
export type InsertParlayLeg = z.infer<typeof insertParlayLegSchema>;

export const parlaySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  legs: z.array(parlayLegSchema),
  stake: z.number().min(0).default(10),
  createdAt: z.string().optional(),
});

export type Parlay = z.infer<typeof parlaySchema>;

export const evaluationResultSchema = z.object({
  winProbability: z.number(),
  expectedValue: z.number(),
  kellyStake: z.number(),
  potentialReturn: z.number(),
  combinedOdds: z.number(),
  method: z.enum(["analytic", "montecarlo"]),
  simulations: z.number().optional(),
  legProbabilities: z.array(z.number()),
  correlationMatrix: z.array(z.array(z.number())).optional(),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

export const optimizationResultSchema = z.object({
  legs: z.array(parlayLegSchema),
  winProbability: z.number(),
  expectedValue: z.number(),
  kellyStake: z.number(),
  potentialReturn: z.number(),
  combinedOdds: z.number(),
  score: z.number(),
});

export type OptimizationResult = z.infer<typeof optimizationResultSchema>;

export const evaluateRequestSchema = z.object({
  legs: z.array(parlayLegSchema),
  stake: z.number().min(0).default(10),
  simulations: z.number().min(1000).max(100000).default(20000),
});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;

export const optimizeRequestSchema = z.object({
  availableLegs: z.array(parlayLegSchema),
  maxLegs: z.number().min(2).max(12).default(6),
  minLegs: z.number().min(2).default(2),
  bankroll: z.number().min(1).default(1000),
  targetCount: z.number().min(1).max(20).default(5),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;

export const sportEventSchema = z.object({
  id: z.string(),
  sport: z.enum(sports),
  homeTeam: z.string(),
  awayTeam: z.string(),
  startTime: z.string(),
  markets: z.array(z.object({
    type: z.enum(marketTypes),
    outcomes: z.array(z.object({
      name: z.string(),
      team: z.string().optional(),
      line: z.number().optional(),
      decimalOdds: z.number(),
      americanOdds: z.number(),
    })),
  })),
});

export type SportEvent = z.infer<typeof sportEventSchema>;

export const generateParlaysRequestSchema = z.object({
  sport: z.enum(sports),
  stake: z.number().min(1).default(10),
  minLegs: z.number().min(2).max(6).default(2),
  maxLegs: z.number().min(2).max(6).default(4),
  bankroll: z.number().min(1).default(1000),
  riskLevel: z.enum(["conservative", "moderate", "aggressive"]).default("moderate"),
  topN: z.number().min(1).max(10).default(5),
});

export type GenerateParlaysRequest = z.infer<typeof generateParlaysRequestSchema>;

export const generatedParlaySchema = z.object({
  id: z.string(),
  legs: z.array(parlayLegSchema),
  winProbability: z.number(),
  expectedValue: z.number(),
  kellyStake: z.number(),
  potentialReturn: z.number(),
  combinedOdds: z.number(),
  score: z.number(),
  riskRating: z.enum(["low", "medium", "high"]),
  sport: z.enum(sports),
});

export type GeneratedParlay = z.infer<typeof generatedParlaySchema>;

export function americanToDecimal(american: number): number {
  if (american > 0) {
    return 1 + american / 100;
  } else {
    return 1 + 100 / Math.abs(american);
  }
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

export function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}
