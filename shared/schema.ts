import { z } from "zod";

export const sports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;
export type Sport = (typeof sports)[number];

export const injuryStatusSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  team: z.string(),
  status: z.enum(["out", "doubtful", "questionable", "probable", "healthy"]),
  injury: z.string().optional(),
  impactRating: z.number().min(-1).max(1),
});
export type InjuryStatus = z.infer<typeof injuryStatusSchema>;

export const weatherDataSchema = z.object({
  gameId: z.string(),
  temperature: z.number(),
  windSpeed: z.number(),
  precipitation: z.number(),
  conditions: z.enum(["clear", "cloudy", "rain", "snow", "dome"]),
  impactOnTotal: z.number(),
});
export type WeatherData = z.infer<typeof weatherDataSchema>;

export const lineMovementSchema = z.object({
  gameId: z.string(),
  market: z.string(),
  outcome: z.string(),
  openingOdds: z.number(),
  currentOdds: z.number(),
  movement: z.number(),
  direction: z.enum(["steam", "reverse", "stable"]),
  sharpAction: z.boolean(),
});
export type LineMovement = z.infer<typeof lineMovementSchema>;

export const bettingPercentagesSchema = z.object({
  gameId: z.string(),
  market: z.string(),
  outcome: z.string(),
  publicPercentage: z.number(),
  moneyPercentage: z.number(),
  sharpSide: z.boolean(),
});
export type BettingPercentages = z.infer<typeof bettingPercentagesSchema>;

export const historicalTrendSchema = z.object({
  playerId: z.string().optional(),
  team: z.string().optional(),
  category: z.string(),
  line: z.number(),
  hitRate: z.number(),
  last10: z.number(),
  streak: z.number(),
  streakType: z.enum(["over", "under", "none"]),
  homeAwayFactor: z.number().optional(),
});
export type HistoricalTrend = z.infer<typeof historicalTrendSchema>;

export const situationalFactorSchema = z.object({
  gameId: z.string(),
  team: z.string(),
  factors: z.array(z.object({
    type: z.enum(["back_to_back", "rest_advantage", "revenge_game", "divisional", "primetime", "travel"]),
    description: z.string(),
    impactRating: z.number(),
  })),
});
export type SituationalFactor = z.infer<typeof situationalFactorSchema>;

export const bankrollSettingsSchema = z.object({
  totalBankroll: z.number(),
  sessionLimit: z.number(),
  dailyLimit: z.number(),
  maxExposurePerTeam: z.number(),
  maxExposurePerPlayer: z.number(),
  kellyMultiplier: z.number().default(0.25),
});
export type BankrollSettings = z.infer<typeof bankrollSettingsSchema>;

export const evAnalysisSchema = z.object({
  legId: z.string(),
  impliedProbability: z.number(),
  modelProbability: z.number(),
  edge: z.number(),
  isPositiveEV: z.boolean(),
  evRating: z.enum(["strong", "moderate", "weak", "negative"]),
});
export type EVAnalysis = z.infer<typeof evAnalysisSchema>;

export const hedgeRecommendationSchema = z.object({
  originalParlay: z.object({
    potentialWin: z.number(),
    remainingLegs: z.number(),
    currentValue: z.number(),
  }),
  hedgeBet: z.object({
    team: z.string(),
    odds: z.number(),
    stake: z.number(),
  }),
  guaranteedProfit: z.number(),
  maxProfit: z.number(),
});
export type HedgeRecommendation = z.infer<typeof hedgeRecommendationSchema>;

export const marketTypes = ["moneyline", "spread", "total", "player_prop"] as const;
export type MarketType = (typeof marketTypes)[number];

export const propCategories = {
  NFL: ["passing_yards", "passing_tds", "rushing_yards", "rushing_tds", "receiving_yards", "receptions", "receiving_tds", "anytime_td"] as const,
  NCAAF: ["passing_yards", "passing_tds", "rushing_yards", "rushing_tds", "receiving_yards", "receptions"] as const,
  NBA: ["points", "rebounds", "assists", "threes", "pts_rebs_asts", "steals_blocks"] as const,
  NCAAB: ["points", "rebounds", "assists", "threes"] as const,
  MLB: ["hits", "rbis", "runs", "total_bases", "strikeouts_pitcher", "hits_allowed"] as const,
  NHL: ["goals", "assists", "points", "shots", "saves"] as const,
} as const;

export type NFLPropCategory = (typeof propCategories.NFL)[number];
export type NBAPropCategory = (typeof propCategories.NBA)[number];
export type MLBPropCategory = (typeof propCategories.MLB)[number];
export type NHLPropCategory = (typeof propCategories.NHL)[number];
export type PropCategory = NFLPropCategory | NBAPropCategory | MLBPropCategory | NHLPropCategory;

export const propCategoryLabels: Record<string, string> = {
  passing_yards: "Passing Yards",
  passing_tds: "Passing TDs",
  rushing_yards: "Rushing Yards",
  rushing_tds: "Rushing TDs",
  receiving_yards: "Receiving Yards",
  receptions: "Receptions",
  receiving_tds: "Receiving TDs",
  anytime_td: "Anytime TD",
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  threes: "3-Pointers Made",
  pts_rebs_asts: "Pts+Rebs+Asts",
  steals_blocks: "Steals+Blocks",
  hits: "Hits",
  rbis: "RBIs",
  runs: "Runs",
  total_bases: "Total Bases",
  strikeouts_pitcher: "Strikeouts (Pitcher)",
  hits_allowed: "Hits Allowed",
  goals: "Goals",
  shots: "Shots on Goal",
  saves: "Saves",
};

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
  playerId: z.string().optional(),
  playerName: z.string().optional(),
  propCategory: z.string().optional(),
  propLine: z.number().optional(),
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

export const playerPropSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  team: z.string(),
  position: z.string(),
  category: z.string(),
  line: z.number(),
  overOdds: z.object({
    americanOdds: z.number(),
    decimalOdds: z.number(),
  }),
  underOdds: z.object({
    americanOdds: z.number(),
    decimalOdds: z.number(),
  }),
});

export type PlayerProp = z.infer<typeof playerPropSchema>;

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
      evAnalysis: evAnalysisSchema.optional(),
      lineMovement: lineMovementSchema.optional(),
      bettingPercentages: bettingPercentagesSchema.optional(),
    })),
  })),
  playerProps: z.array(playerPropSchema).optional(),
  injuries: z.array(injuryStatusSchema).optional(),
  weather: weatherDataSchema.optional(),
  situationalFactors: z.array(situationalFactorSchema).optional(),
  historicalTrends: z.array(historicalTrendSchema).optional(),
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
  selectedEventIds: z.array(z.string()).optional(),
  selectedTotals: z.array(z.object({
    gameId: z.string(),
    selection: z.enum(["over", "under"]),
  })).optional(),
  selectedProps: z.array(z.object({
    gameId: z.string(),
    playerId: z.string(),
    category: z.string(),
    selection: z.enum(["over", "under"]),
  })).optional(),
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
