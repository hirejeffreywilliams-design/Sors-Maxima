import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

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
  standardError: z.number().optional(),
  confidenceInterval: z.tuple([z.number(), z.number()]).optional(),
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
  standardError: z.number().optional(),
  confidenceInterval: z.tuple([z.number(), z.number()]).optional(),
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

// TIME UTILITIES FOR GAME FOCUS
export type GameTimeBucket = "live" | "starting_soon" | "today" | "tonight" | "tomorrow" | "upcoming";

export function getGameTimeBucket(startTimeStr: string): GameTimeBucket {
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const diffMs = startTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffMs < 0) return "live";
  if (diffHours < 1) return "starting_soon";
  
  const isToday = startTime.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = startTime.toDateString() === tomorrow.toDateString();
  
  if (isToday && startTime.getHours() >= 18) return "tonight";
  if (isToday) return "today";
  if (isTomorrow) return "tomorrow";
  return "upcoming";
}

export function formatGameTime(startTimeStr: string): string {
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const diffMs = startTime.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMs < 0) return "LIVE";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  
  return startTime.toLocaleDateString('en-US', { 
    weekday: 'short', 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

export function getTimeUrgencyScore(startTimeStr: string): number {
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const diffHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 0) return 0;
  if (diffHours < 2) return 1.0;
  if (diffHours < 6) return 0.9;
  if (diffHours < 12) return 0.8;
  if (diffHours < 24) return 0.7;
  if (diffHours < 48) return 0.5;
  return 0.3;
}

// NEW ADVANCED FEATURES

export const betRecordSchema = z.object({
  id: z.string(),
  legs: z.array(parlayLegSchema),
  stake: z.number(),
  odds: z.number(),
  potentialWin: z.number(),
  result: z.enum(["pending", "won", "lost", "push"]),
  actualReturn: z.number().optional(),
  placedAt: z.string(),
  settledAt: z.string().optional(),
  closingOdds: z.number().optional(),
  clvPercent: z.number().optional(),
  sport: z.enum(sports),
});
export type BetRecord = z.infer<typeof betRecordSchema>;

export const betTrackingStatsSchema = z.object({
  totalBets: z.number(),
  wonBets: z.number(),
  lostBets: z.number(),
  pendingBets: z.number(),
  totalStaked: z.number(),
  totalReturns: z.number(),
  profitLoss: z.number(),
  roi: z.number(),
  avgOdds: z.number(),
  winRate: z.number(),
  clvPositive: z.number(),
  avgCLV: z.number(),
  statsBySport: z.record(z.object({
    bets: z.number(),
    won: z.number(),
    lost: z.number(),
    roi: z.number(),
  })),
  statsByMarket: z.record(z.object({
    bets: z.number(),
    won: z.number(),
    lost: z.number(),
    roi: z.number(),
  })),
});
export type BetTrackingStats = z.infer<typeof betTrackingStatsSchema>;

export const arbitrageOpportunitySchema = z.object({
  id: z.string(),
  gameId: z.string(),
  game: z.string(),
  market: z.string(),
  side1: z.object({
    book: z.string(),
    outcome: z.string(),
    odds: z.number(),
    stake: z.number(),
  }),
  side2: z.object({
    book: z.string(),
    outcome: z.string(),
    odds: z.number(),
    stake: z.number(),
  }),
  totalStake: z.number(),
  guaranteedProfit: z.number(),
  profitPercent: z.number(),
  expiresAt: z.string(),
});
export type ArbitrageOpportunity = z.infer<typeof arbitrageOpportunitySchema>;

export const middleOpportunitySchema = z.object({
  id: z.string(),
  gameId: z.string(),
  game: z.string(),
  market: z.string(),
  lowSide: z.object({
    book: z.string(),
    line: z.number(),
    odds: z.number(),
    stake: z.number(),
  }),
  highSide: z.object({
    book: z.string(),
    line: z.number(),
    odds: z.number(),
    stake: z.number(),
  }),
  middleRange: z.string(),
  middleProbability: z.number(),
  expectedValue: z.number(),
  worstCase: z.number(),
  bestCase: z.number(),
});
export type MiddleOpportunity = z.infer<typeof middleOpportunitySchema>;

export const keyNumberAlertSchema = z.object({
  gameId: z.string(),
  game: z.string(),
  currentSpread: z.number(),
  keyNumber: z.number(),
  pushProbability: z.number(),
  recommendation: z.string(),
  buyPoints: z.object({
    newSpread: z.number(),
    newOdds: z.number(),
    ev: z.number(),
  }).optional(),
});
export type KeyNumberAlert = z.infer<typeof keyNumberAlertSchema>;

export const sgpCorrelationSchema = z.object({
  leg1: z.object({
    type: z.string(),
    outcome: z.string(),
  }),
  leg2: z.object({
    type: z.string(),
    outcome: z.string(),
  }),
  correlation: z.number(),
  direction: z.enum(["positive", "negative"]),
  recommendation: z.string(),
  evBoost: z.number(),
});
export type SGPCorrelation = z.infer<typeof sgpCorrelationSchema>;

export const fadePublicAlertSchema = z.object({
  gameId: z.string(),
  game: z.string(),
  market: z.string(),
  publicSide: z.string(),
  publicPercent: z.number(),
  sharpSide: z.string(),
  sharpPercent: z.number(),
  lineMovement: z.string(),
  recommendation: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});
export type FadePublicAlert = z.infer<typeof fadePublicAlertSchema>;

export const liveBetTimingSchema = z.object({
  gameId: z.string(),
  game: z.string(),
  currentScore: z.string(),
  timeRemaining: z.string(),
  momentum: z.enum(["home", "away", "neutral"]),
  recommendation: z.string(),
  suggestedBet: z.object({
    side: z.string(),
    odds: z.number(),
    edge: z.number(),
  }).optional(),
});
export type LiveBetTiming = z.infer<typeof liveBetTimingSchema>;

export const alternateLineSchema = z.object({
  line: z.number(),
  odds: z.number(),
  impliedProb: z.number(),
  modelProb: z.number(),
  ev: z.number(),
  recommendation: z.enum(["strong_buy", "buy", "fair", "avoid"]),
});
export type AlternateLine = z.infer<typeof alternateLineSchema>;

export const unitSizeRecommendationSchema = z.object({
  legId: z.string(),
  edge: z.number(),
  kellyPercent: z.number(),
  recommendedUnits: z.number(),
  maxUnits: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string(),
});
export type UnitSizeRecommendation = z.infer<typeof unitSizeRecommendationSchema>;

export const streakBreakerAlertSchema = z.object({
  type: z.enum(["player", "team"]),
  name: z.string(),
  team: z.string().optional(),
  category: z.string(),
  currentStreak: z.number(),
  streakType: z.enum(["over", "under", "win", "loss", "cover", "fail_cover"]),
  historicalAvgStreak: z.number(),
  regressionProbability: z.number(),
  recommendation: z.string(),
});
export type StreakBreakerAlert = z.infer<typeof streakBreakerAlertSchema>;

export const propCorrelationSchema = z.object({
  prop1: z.object({
    player: z.string(),
    category: z.string(),
    line: z.number(),
  }),
  prop2: z.object({
    player: z.string(),
    category: z.string(),
    line: z.number(),
  }),
  correlation: z.number(),
  relationship: z.string(),
  combinedEV: z.number(),
});
export type PropCorrelation = z.infer<typeof propCorrelationSchema>;

export const paceProjectionSchema = z.object({
  gameId: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homePace: z.number(),
  awayPace: z.number(),
  projectedPace: z.number(),
  leagueAvgPace: z.number(),
  projectedTotal: z.number(),
  currentLine: z.number(),
  edge: z.number(),
  recommendation: z.enum(["over", "under", "pass"]),
});
export type PaceProjection = z.infer<typeof paceProjectionSchema>;

export const fatigueModelSchema = z.object({
  team: z.string(),
  restDays: z.number(),
  travelMiles: z.number(),
  timeZonesCrossed: z.number(),
  gamesInLast7Days: z.number(),
  fatigueScore: z.number(),
  performanceImpact: z.number(),
  recommendation: z.string(),
});
export type FatigueModel = z.infer<typeof fatigueModelSchema>;

export const betGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"] as const;
export type BetGrade = (typeof betGrades)[number];

export const betGradingSchema = z.object({
  grade: z.enum(betGrades),
  numericScore: z.number().min(0).max(100),
  evScore: z.number(),
  probabilityScore: z.number(),
  valueScore: z.number(),
  riskScore: z.number(),
  recommendation: z.enum(["strong_bet", "good_bet", "fair_bet", "marginal_bet", "avoid", "strong_avoid"]),
  reasoning: z.array(z.string()),
});
export type BetGrading = z.infer<typeof betGradingSchema>;

export const evIndicatorSchema = z.object({
  status: z.enum(["strong_positive", "positive", "neutral", "negative", "strong_negative"]),
  evPercent: z.number(),
  edge: z.number(),
  impliedProbability: z.number(),
  trueProbability: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
  badge: z.enum(["fire", "thumbs_up", "neutral", "thumbs_down", "warning"]),
});
export type EVIndicator = z.infer<typeof evIndicatorSchema>;

export const riskAdvisorySchema = z.object({
  level: z.enum(["safe", "moderate", "elevated", "high", "extreme"]),
  warnings: z.array(z.object({
    type: z.enum([
      "low_probability",
      "negative_ev",
      "bankroll_overexposure",
      "high_correlation",
      "poor_value",
      "steam_move_against",
      "sharp_money_against",
      "injury_impact",
      "fatigue_concern",
      "weather_impact"
    ]),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
  overallRisk: z.number().min(0).max(100),
  adjustedStake: z.number().optional(),
});
export type RiskAdvisory = z.infer<typeof riskAdvisorySchema>;

export const bettingEnvironmentSchema = z.object({
  maxStakePercent: z.number().default(0.05),
  kellyMultiplier: z.number().default(0.25),
  minEdgeRequired: z.number().default(0.02),
  maxCorrelationAllowed: z.number().default(0.8),
  includeJuiceAdjustment: z.boolean().default(true),
  juicePercent: z.number().default(0.045),
  enableRiskWarnings: z.boolean().default(true),
  enableAutoAdjust: z.boolean().default(false),
  profileType: z.enum(["conservative", "balanced", "aggressive", "sharp"]).default("balanced"),
});
export type BettingEnvironment = z.infer<typeof bettingEnvironmentSchema>;

export function calculateBetGrade(
  winProbability: number,
  expectedValue: number,
  kellyFraction: number,
  correlationPenalty: number = 0
): BetGrading {
  const evScore = Math.min(100, Math.max(0, (expectedValue + 0.5) * 100));
  const probabilityScore = Math.min(100, winProbability * 200);
  const valueScore = Math.min(100, Math.max(0, kellyFraction * 500));
  const riskScore = Math.max(0, 100 - correlationPenalty * 100);
  
  const numericScore = (evScore * 0.35) + (probabilityScore * 0.25) + (valueScore * 0.25) + (riskScore * 0.15);
  
  let grade: BetGrade;
  let recommendation: BetGrading["recommendation"];
  const reasoning: string[] = [];
  
  if (numericScore >= 90) {
    grade = "A+";
    recommendation = "strong_bet";
    reasoning.push("Exceptional value opportunity");
  } else if (numericScore >= 85) {
    grade = "A";
    recommendation = "strong_bet";
    reasoning.push("Excellent betting opportunity");
  } else if (numericScore >= 80) {
    grade = "A-";
    recommendation = "good_bet";
    reasoning.push("Very good value detected");
  } else if (numericScore >= 75) {
    grade = "B+";
    recommendation = "good_bet";
    reasoning.push("Good betting opportunity");
  } else if (numericScore >= 70) {
    grade = "B";
    recommendation = "good_bet";
    reasoning.push("Solid value proposition");
  } else if (numericScore >= 65) {
    grade = "B-";
    recommendation = "fair_bet";
    reasoning.push("Decent betting opportunity");
  } else if (numericScore >= 60) {
    grade = "C+";
    recommendation = "fair_bet";
    reasoning.push("Fair value, proceed with caution");
  } else if (numericScore >= 55) {
    grade = "C";
    recommendation = "marginal_bet";
    reasoning.push("Marginal value, consider smaller stake");
  } else if (numericScore >= 50) {
    grade = "C-";
    recommendation = "marginal_bet";
    reasoning.push("Below average value");
  } else if (numericScore >= 45) {
    grade = "D+";
    recommendation = "avoid";
    reasoning.push("Poor value, recommend avoiding");
  } else if (numericScore >= 40) {
    grade = "D";
    recommendation = "avoid";
    reasoning.push("Bad betting opportunity");
  } else if (numericScore >= 35) {
    grade = "D-";
    recommendation = "strong_avoid";
    reasoning.push("Very poor value");
  } else {
    grade = "F";
    recommendation = "strong_avoid";
    reasoning.push("Terrible betting opportunity");
  }
  
  if (expectedValue > 0.1) reasoning.push("+EV: Strong positive expected value");
  else if (expectedValue > 0.02) reasoning.push("+EV: Positive expected value");
  else if (expectedValue < -0.1) reasoning.push("-EV: Significant negative expected value");
  else if (expectedValue < 0) reasoning.push("-EV: Negative expected value");
  
  if (winProbability > 0.4) reasoning.push("High win probability");
  else if (winProbability < 0.1) reasoning.push("Very low win probability");
  
  if (correlationPenalty > 0.3) reasoning.push("High correlation risk between legs");
  
  return {
    grade,
    numericScore: Math.round(numericScore * 10) / 10,
    evScore: Math.round(evScore * 10) / 10,
    probabilityScore: Math.round(probabilityScore * 10) / 10,
    valueScore: Math.round(valueScore * 10) / 10,
    riskScore: Math.round(riskScore * 10) / 10,
    recommendation,
    reasoning,
  };
}

export function calculateEVIndicator(
  impliedProbability: number,
  trueProbability: number,
  confidence: "high" | "medium" | "low" = "medium"
): EVIndicator {
  const edge = trueProbability - impliedProbability;
  const evPercent = (edge / impliedProbability) * 100;
  
  let status: EVIndicator["status"];
  let badge: EVIndicator["badge"];
  
  if (evPercent >= 10) {
    status = "strong_positive";
    badge = "fire";
  } else if (evPercent >= 3) {
    status = "positive";
    badge = "thumbs_up";
  } else if (evPercent >= -3) {
    status = "neutral";
    badge = "neutral";
  } else if (evPercent >= -10) {
    status = "negative";
    badge = "thumbs_down";
  } else {
    status = "strong_negative";
    badge = "warning";
  }
  
  return {
    status,
    evPercent: Math.round(evPercent * 100) / 100,
    edge: Math.round(edge * 10000) / 10000,
    impliedProbability: Math.round(impliedProbability * 10000) / 10000,
    trueProbability: Math.round(trueProbability * 10000) / 10000,
    confidence,
    badge,
  };
}

export function generateRiskAdvisory(
  winProbability: number,
  expectedValue: number,
  stakePercent: number,
  correlationLevel: number,
  additionalFactors: {
    sharpMoneyAgainst?: boolean;
    steamMoveAgainst?: boolean;
    injuryImpact?: number;
    fatigueScore?: number;
    weatherImpact?: number;
  } = {}
): RiskAdvisory {
  const warnings: RiskAdvisory["warnings"] = [];
  let overallRisk = 0;
  
  if (winProbability < 0.05) {
    warnings.push({
      type: "low_probability",
      severity: "critical",
      message: "Extremely low win probability (<5%)",
      suggestion: "Consider reducing stake or avoiding this bet",
    });
    overallRisk += 30;
  } else if (winProbability < 0.15) {
    warnings.push({
      type: "low_probability",
      severity: "warning",
      message: "Low win probability (<15%)",
      suggestion: "Ensure potential payout justifies the risk",
    });
    overallRisk += 15;
  }
  
  if (expectedValue < -0.15) {
    warnings.push({
      type: "negative_ev",
      severity: "critical",
      message: "Strongly negative expected value",
      suggestion: "This bet is likely to lose money long-term",
    });
    overallRisk += 25;
  } else if (expectedValue < -0.05) {
    warnings.push({
      type: "negative_ev",
      severity: "warning",
      message: "Negative expected value",
      suggestion: "Consider finding better value elsewhere",
    });
    overallRisk += 15;
  } else if (expectedValue < 0) {
    warnings.push({
      type: "poor_value",
      severity: "info",
      message: "Slightly negative expected value",
    });
    overallRisk += 5;
  }
  
  if (stakePercent > 0.10) {
    warnings.push({
      type: "bankroll_overexposure",
      severity: "critical",
      message: "Stake exceeds 10% of bankroll",
      suggestion: "Reduce stake to protect bankroll",
    });
    overallRisk += 20;
  } else if (stakePercent > 0.05) {
    warnings.push({
      type: "bankroll_overexposure",
      severity: "warning",
      message: "Stake exceeds 5% of bankroll",
      suggestion: "Consider reducing stake for better risk management",
    });
    overallRisk += 10;
  }
  
  if (correlationLevel > 0.7) {
    warnings.push({
      type: "high_correlation",
      severity: "warning",
      message: "High correlation between parlay legs",
      suggestion: "Diversify selections to reduce correlation risk",
    });
    overallRisk += 15;
  }
  
  if (additionalFactors.sharpMoneyAgainst) {
    warnings.push({
      type: "sharp_money_against",
      severity: "warning",
      message: "Sharp money is on the opposite side",
      suggestion: "Professional bettors disagree with this selection",
    });
    overallRisk += 10;
  }
  
  if (additionalFactors.steamMoveAgainst) {
    warnings.push({
      type: "steam_move_against",
      severity: "info",
      message: "Line has moved against this selection",
    });
    overallRisk += 5;
  }
  
  if (additionalFactors.injuryImpact && additionalFactors.injuryImpact < -0.2) {
    warnings.push({
      type: "injury_impact",
      severity: "warning",
      message: "Significant injury impact on this selection",
      suggestion: "Monitor injury reports before placing bet",
    });
    overallRisk += 10;
  }
  
  if (additionalFactors.fatigueScore && additionalFactors.fatigueScore > 0.6) {
    warnings.push({
      type: "fatigue_concern",
      severity: "info",
      message: "Team/player fatigue may impact performance",
    });
    overallRisk += 5;
  }
  
  overallRisk = Math.min(100, overallRisk);
  
  let level: RiskAdvisory["level"];
  if (overallRisk >= 70) level = "extreme";
  else if (overallRisk >= 50) level = "high";
  else if (overallRisk >= 30) level = "elevated";
  else if (overallRisk >= 15) level = "moderate";
  else level = "safe";
  
  const adjustedStakeMultiplier = Math.max(0.1, 1 - (overallRisk / 100));
  
  return {
    level,
    warnings,
    overallRisk,
    adjustedStake: stakePercent * adjustedStakeMultiplier,
  };
}

// Mega Parlay Features

export const legSynergySchema = z.object({
  leg1Index: z.number(),
  leg2Index: z.number(),
  correlation: z.number(),
  synergyType: z.enum(["strong_positive", "positive", "neutral", "negative", "strong_negative"]),
  reasoning: z.string(),
  combinedBoost: z.number(),
});
export type LegSynergy = z.infer<typeof legSynergySchema>;

export const roundRobinOptionSchema = z.object({
  name: z.string(),
  legsPerParlay: z.number(),
  totalParlays: z.number(),
  totalStake: z.number(),
  stakePerParlay: z.number(),
  minPayout: z.number(),
  maxPayout: z.number(),
  expectedPayout: z.number(),
  winProbability: z.number(),
  breakEvenWins: z.number(),
});
export type RoundRobinOption = z.infer<typeof roundRobinOptionSchema>;

export const jackpotScenarioSchema = z.object({
  stake: z.number(),
  potentialPayout: z.number(),
  winProbability: z.number(),
  expectedValue: z.number(),
  millionDollarOdds: z.string(),
  riskLevel: z.enum(["low", "medium", "high", "extreme"]),
});
export type JackpotScenario = z.infer<typeof jackpotScenarioSchema>;

export const smartRecommendationSchema = z.object({
  leg: parlayLegSchema,
  score: z.number(),
  synergies: z.array(z.string()),
  reasoning: z.string(),
  evBoost: z.number(),
  confidenceLevel: z.enum(["low", "medium", "high"]),
});
export type SmartRecommendation = z.infer<typeof smartRecommendationSchema>;

export const parlayInsuranceSchema = z.object({
  hedgeBet: z.object({
    team: z.string(),
    market: z.string(),
    odds: z.number(),
    stake: z.number(),
  }),
  guaranteedProfit: z.number(),
  breakEvenOdds: z.number(),
  recommendedHedge: z.boolean(),
  legsRemaining: z.number(),
});
export type ParlayInsurance = z.infer<typeof parlayInsuranceSchema>;

export const hotStreakSchema = z.object({
  type: z.enum(["player", "team"]),
  name: z.string(),
  team: z.string().optional(),
  sport: z.string(),
  streakLength: z.number(),
  streakType: z.string(),
  hitRate: z.number(),
  recommendation: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});
export type HotStreak = z.infer<typeof hotStreakSchema>;

export const megaParlayAnalysisSchema = z.object({
  totalLegs: z.number(),
  combinedOdds: z.number(),
  potentialPayout: z.number(),
  winProbability: z.number(),
  expectedValue: z.number(),
  synergyScore: z.number(),
  riskLevel: z.enum(["low", "medium", "high", "extreme", "jackpot"]),
  legSynergies: z.array(legSynergySchema),
  roundRobinOptions: z.array(roundRobinOptionSchema),
  jackpotScenarios: z.array(jackpotScenarioSchema),
  smartRecommendations: z.array(smartRecommendationSchema),
  progressiveBreakdown: z.array(z.object({
    stage: z.number(),
    legsCompleted: z.number(),
    cumulativeOdds: z.number(),
    cumulativeProbability: z.number(),
    payoutAtStage: z.number(),
  })),
});
export type MegaParlayAnalysis = z.infer<typeof megaParlayAnalysisSchema>;

export function calculateJackpotScenarios(
  combinedOdds: number,
  winProbability: number
): JackpotScenario[] {
  const stakes = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  
  return stakes.map(stake => {
    const potentialPayout = stake * combinedOdds;
    const expectedValue = (potentialPayout * winProbability) - stake;
    const evPercent = expectedValue / stake;
    
    let riskLevel: JackpotScenario["riskLevel"];
    if (winProbability > 0.1) riskLevel = "low";
    else if (winProbability > 0.01) riskLevel = "medium";
    else if (winProbability > 0.001) riskLevel = "high";
    else riskLevel = "extreme";
    
    const oddsToMillion = 1000000 / stake / combinedOdds;
    const millionDollarOdds = oddsToMillion < 1 
      ? `${(1/oddsToMillion).toFixed(0)}:1 chance at $1M+`
      : `Need ${oddsToMillion.toFixed(0)}x more odds for $1M`;
    
    return {
      stake,
      potentialPayout,
      winProbability,
      expectedValue: evPercent,
      millionDollarOdds,
      riskLevel,
    };
  });
}

export function calculateRoundRobinOptions(
  legs: ParlayLeg[],
  totalStake: number,
  legProbabilities: number[]
): RoundRobinOption[] {
  const n = legs.length;
  if (n < 3) return [];
  
  const options: RoundRobinOption[] = [];
  
  for (let k = 2; k <= Math.min(n - 1, 6); k++) {
    const totalParlays = factorial(n) / (factorial(k) * factorial(n - k));
    const stakePerParlay = totalStake / totalParlays;
    
    const avgOdds = legs.reduce((sum, leg) => sum + leg.decimalOdds, 0) / legs.length;
    const parlayOdds = Math.pow(avgOdds, k);
    
    const avgProb = legProbabilities.length > 0 
      ? legProbabilities.reduce((a, b) => a + b, 0) / legProbabilities.length 
      : 0.5;
    const parlayProb = Math.pow(avgProb, k);
    
    const minWins = Math.ceil(totalStake / (stakePerParlay * parlayOdds));
    const maxPayout = totalParlays * stakePerParlay * parlayOdds;
    const minPayout = stakePerParlay * parlayOdds;
    
    const expectedWins = totalParlays * parlayProb;
    const expectedPayout = expectedWins * stakePerParlay * parlayOdds;
    
    options.push({
      name: `${k}-Leg Round Robin`,
      legsPerParlay: k,
      totalParlays,
      totalStake,
      stakePerParlay: Math.round(stakePerParlay * 100) / 100,
      minPayout: Math.round(minPayout * 100) / 100,
      maxPayout: Math.round(maxPayout * 100) / 100,
      expectedPayout: Math.round(expectedPayout * 100) / 100,
      winProbability: parlayProb,
      breakEvenWins: minWins,
    });
  }
  
  return options;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function calculateLegSynergies(
  legs: ParlayLeg[],
  correlationMatrix: number[][] | undefined
): LegSynergy[] {
  if (legs.length < 2) return [];
  
  const synergies: LegSynergy[] = [];
  
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      let corr = correlationMatrix?.[i]?.[j] ?? 0;
      
      if (!correlationMatrix) {
        const leg1 = legs[i];
        const leg2 = legs[j];
        if (leg1.team === leg2.team) {
          corr = 0.4;
        } else if (leg1.market === leg2.market) {
          corr = 0.1;
        } else {
          corr = 0;
        }
      }
      
      let synergyType: LegSynergy["synergyType"];
      if (corr > 0.5) synergyType = "strong_positive";
      else if (corr > 0.2) synergyType = "positive";
      else if (corr > -0.2) synergyType = "neutral";
      else if (corr > -0.5) synergyType = "negative";
      else synergyType = "strong_negative";
      
      const leg1 = legs[i];
      const leg2 = legs[j];
      
      let reasoning = "";
      if (leg1.team === leg2.team) {
        reasoning = `Same team props tend to correlate - ${leg1.team}`;
      } else if (leg1.market === leg2.market) {
        reasoning = `Same market type may move together`;
      } else if (corr > 0.3) {
        reasoning = `Historical data shows positive correlation`;
      } else if (corr < -0.3) {
        reasoning = `These outcomes tend to work against each other`;
      } else {
        reasoning = `Independent outcomes with minimal correlation`;
      }
      
      synergies.push({
        leg1Index: i,
        leg2Index: j,
        correlation: corr,
        synergyType,
        reasoning,
        combinedBoost: corr > 0 ? corr * 0.1 : 0,
      });
    }
  }
  
  return synergies.sort((a, b) => b.correlation - a.correlation);
}

export function generateSmartRecommendations(
  currentLegs: ParlayLeg[],
  availableLegs: ParlayLeg[],
  targetCount: number = 5
): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = [];
  
  const currentTeams = new Set(currentLegs.map(l => l.team));
  const currentMarkets = new Set(currentLegs.map(l => l.market));
  
  for (const leg of availableLegs) {
    if (currentLegs.some(cl => cl.id === leg.id)) continue;
    
    let score = 50;
    const synergies: string[] = [];
    let evBoost = 0;
    
    if (currentTeams.has(leg.team)) {
      score += 15;
      synergies.push(`Same team as existing leg (${leg.team})`);
      evBoost += 0.02;
    }
    
    if (leg.decimalOdds > 1.8 && leg.decimalOdds < 2.2) {
      score += 10;
      synergies.push("Near even odds - high probability");
    }
    
    if (leg.market === "moneyline" && leg.decimalOdds < 1.5) {
      score += 8;
      synergies.push("Heavy favorite - safer leg");
    }
    
    if (leg.market === "player_prop") {
      score += 5;
      synergies.push("Player prop - less correlated to game outcome");
    }
    
    const reasoning = synergies.length > 0 
      ? synergies.join("; ") 
      : "Adds diversity to your parlay";
    
    let confidence: SmartRecommendation["confidenceLevel"];
    if (score >= 70) confidence = "high";
    else if (score >= 55) confidence = "medium";
    else confidence = "low";
    
    recommendations.push({
      leg,
      score,
      synergies,
      reasoning,
      evBoost,
      confidenceLevel: confidence,
    });
  }
  
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount);
}

// ==================== DATABASE TABLES ====================

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }),
  tier: varchar("tier", { length: 50 }).notNull(),
  experience: text("experience").notNull(),
  goals: text("goals").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  status: true,
  adminNotes: true,
}).extend({
  username: z.string().optional(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailSequenceDay2Sent: boolean("email_sequence_day2_sent").default(false).notNull(),
  emailSequenceDay7Sent: boolean("email_sequence_day7_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  tier: varchar("tier", { length: 20 }).default("free").notNull(),
  status: varchar("status", { length: 20 }).default("none").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  ticketId: varchar("ticket_id", { length: 100 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sport: varchar("sport", { length: 20 }).notNull(),
  legs: jsonb("legs").notNull(),
  predictedWinProb: real("predicted_win_prob").notNull(),
  predictedEv: real("predicted_ev").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  grade: varchar("grade", { length: 5 }),
  actualResult: varchar("actual_result", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  settledAt: timestamp("settled_at"),
});

export const modelWeights = pgTable("model_weights", {
  id: serial("id").primaryKey(),
  factorName: varchar("factor_name", { length: 100 }).unique().notNull(),
  weight: real("weight").default(1.0).notNull(),
  totalPredictions: integer("total_predictions").default(0).notNull(),
  correctPredictions: integer("correct_predictions").default(0).notNull(),
  accuracy: real("accuracy").default(0.5).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const learningLogs = pgTable("learning_logs", {
  id: serial("id").primaryKey(),
  cycleNumber: integer("cycle_number").notNull(),
  predictionsAnalyzed: integer("predictions_analyzed").default(0).notNull(),
  weightsAdjusted: integer("weights_adjusted").default(0).notNull(),
  overallAccuracy: real("overall_accuracy"),
  topPerformingFactor: varchar("top_performing_factor", { length: 100 }),
  bottomPerformingFactor: varchar("bottom_performing_factor", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankrollAlerts = pgTable("bankroll_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  threshold: real("threshold").notNull(),
  currentValue: real("current_value").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const betHistory = pgTable("bet_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ticketId: varchar("ticket_id", { length: 100 }).notNull(),
  sport: varchar("sport", { length: 20 }).notNull(),
  betType: varchar("bet_type", { length: 50 }).notNull(),
  stake: real("stake").notNull(),
  odds: real("odds").notNull(),
  potentialPayout: real("potential_payout").notNull(),
  actualPayout: real("actual_payout"),
  result: varchar("result", { length: 20 }),
  grade: varchar("grade", { length: 5 }),
  predictedWinProb: real("predicted_win_prob"),
  actualOutcome: boolean("actual_outcome"),
  factors: jsonb("factors"),
  sportsbook: varchar("sportsbook", { length: 50 }),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
  settledAt: timestamp("settled_at"),
});

export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalBets: integer("total_bets").default(0).notNull(),
  totalWins: integer("total_wins").default(0).notNull(),
  totalLosses: integer("total_losses").default(0).notNull(),
  totalPushes: integer("total_pushes").default(0).notNull(),
  totalStaked: real("total_staked").default(0).notNull(),
  totalProfit: real("total_profit").default(0).notNull(),
  roi: real("roi").default(0).notNull(),
  winRate: real("win_rate").default(0).notNull(),
  avgOdds: real("avg_odds").default(0).notNull(),
  bestSport: varchar("best_sport", { length: 20 }),
  bestBetType: varchar("best_bet_type", { length: 50 }),
  bestTimeOfDay: varchar("best_time_of_day", { length: 20 }),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestWinStreak: integer("longest_win_streak").default(0).notNull(),
  longestLossStreak: integer("longest_loss_streak").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  optimalEntryAlerts: boolean("optimal_entry_alerts").default(true).notNull(),
  lineMovementAlerts: boolean("line_movement_alerts").default(true).notNull(),
  injuryAlerts: boolean("injury_alerts").default(true).notNull(),
  steamMoveAlerts: boolean("steam_move_alerts").default(false).notNull(),
  sharpMoneyAlerts: boolean("sharp_money_alerts").default(false).notNull(),
  bankrollAlerts: boolean("bankroll_alerts").default(true).notNull(),
  dailyRecapAlerts: boolean("daily_recap_alerts").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sportsbookAccounts = pgTable("sportsbook_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sportsbookName: varchar("sportsbook_name", { length: 50 }).notNull(),
  accountBalance: real("account_balance").default(0).notNull(),
  pendingBets: real("pending_bets").default(0).notNull(),
  totalDeposited: real("total_deposited").default(0).notNull(),
  totalWithdrawn: real("total_withdrawn").default(0).notNull(),
  totalProfit: real("total_profit").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const responsibleGaming = pgTable("responsible_gaming", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dailyDepositLimit: real("daily_deposit_limit"),
  weeklyDepositLimit: real("weekly_deposit_limit"),
  monthlyDepositLimit: real("monthly_deposit_limit"),
  dailyBetLimit: real("daily_bet_limit"),
  weeklyBetLimit: real("weekly_bet_limit"),
  lossLimit: real("loss_limit"),
  sessionTimeLimit: integer("session_time_limit"),
  coolOffEndDate: timestamp("cool_off_end_date"),
  selfExclusionEndDate: timestamp("self_exclusion_end_date"),
  realityCheckInterval: integer("reality_check_interval"),
  lastRealityCheck: timestamp("last_reality_check"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const betBackups = pgTable("bet_backups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  backupData: jsonb("backup_data").notNull(),
  backupType: varchar("backup_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oddsSnapshots = pgTable("odds_snapshots", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull(),
  sport: varchar("sport", { length: 20 }).notNull(),
  market: varchar("market", { length: 50 }).notNull(),
  outcome: varchar("outcome", { length: 100 }).notNull(),
  draftkingsOdds: real("draftkings_odds"),
  fanduelOdds: real("fanduel_odds"),
  betmgmOdds: real("betmgm_odds"),
  caesarsOdds: real("caesars_odds"),
  pointsbetOdds: real("pointsbet_odds"),
  betRiversOdds: real("betrivers_odds"),
  bestOdds: real("best_odds"),
  bestBook: varchar("best_book", { length: 50 }),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export const taxRecords = pgTable("tax_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  taxYear: integer("tax_year").notNull(),
  totalWinnings: real("total_winnings").default(0).notNull(),
  totalLosses: real("total_losses").default(0).notNull(),
  netProfit: real("net_profit").default(0).notNull(),
  totalBets: integer("total_bets").default(0).notNull(),
  reportGenerated: boolean("report_generated").default(false).notNull(),
  reportData: jsonb("report_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token store for password reset and email verification (survives server restarts)
export const tokenStore = pgTable("token_store", {
  token: varchar("token", { length: 128 }).primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // "reset" | "verify"
  identifier: varchar("identifier", { length: 255 }).notNull(), // email for reset, userId for verify
  code: varchar("code", { length: 10 }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  predictions: many(predictions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
}));

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export const insertModelWeightSchema = createInsertSchema(modelWeights).omit({ id: true, lastUpdated: true });
export type InsertModelWeight = z.infer<typeof insertModelWeightSchema>;
export type ModelWeight = typeof modelWeights.$inferSelect;

export const insertLearningLogSchema = createInsertSchema(learningLogs).omit({ id: true, createdAt: true });
export type InsertLearningLog = z.infer<typeof insertLearningLogSchema>;
export type LearningLog = typeof learningLogs.$inferSelect;

export const insertBankrollAlertSchema = createInsertSchema(bankrollAlerts).omit({ id: true, createdAt: true });
export type InsertBankrollAlert = z.infer<typeof insertBankrollAlertSchema>;
export type BankrollAlert = typeof bankrollAlerts.$inferSelect;

export const insertBetHistorySchema = createInsertSchema(betHistory).omit({ id: true, placedAt: true });
export type InsertBetHistory = z.infer<typeof insertBetHistorySchema>;
export type BetHistory = typeof betHistory.$inferSelect;

export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({ id: true, updatedAt: true });
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type UserAnalytics = typeof userAnalytics.$inferSelect;

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

export const insertSportsbookAccountSchema = createInsertSchema(sportsbookAccounts).omit({ id: true, createdAt: true, lastUpdated: true });
export type InsertSportsbookAccount = z.infer<typeof insertSportsbookAccountSchema>;
export type SportsbookAccount = typeof sportsbookAccounts.$inferSelect;

export const insertResponsibleGamingSchema = createInsertSchema(responsibleGaming).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResponsibleGaming = z.infer<typeof insertResponsibleGamingSchema>;
export type ResponsibleGaming = typeof responsibleGaming.$inferSelect;

export const insertBetBackupSchema = createInsertSchema(betBackups).omit({ id: true, createdAt: true });
export type InsertBetBackup = z.infer<typeof insertBetBackupSchema>;
export type BetBackup = typeof betBackups.$inferSelect;

export const insertOddsSnapshotSchema = createInsertSchema(oddsSnapshots).omit({ id: true, capturedAt: true });
export type InsertOddsSnapshot = z.infer<typeof insertOddsSnapshotSchema>;
export type OddsSnapshot = typeof oddsSnapshots.$inferSelect;

export const insertTaxRecordSchema = createInsertSchema(taxRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxRecord = z.infer<typeof insertTaxRecordSchema>;
export type TaxRecord = typeof taxRecords.$inferSelect;
