// Advanced Analysis Factors for Improved Prediction Accuracy
// These 10 additional factors enhance the quantum analysis engine

export interface SituationalFactor {
  type: 'revenge' | 'playoff_implications' | 'rivalry' | 'primetime' | 'motivation';
  intensity: number; // 0-100
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface FatigueFactor {
  backToBack: boolean;
  restDays: number;
  travelDistance: number; // miles
  timeZoneChanges: number;
  gamesInLast7Days: number;
  fatigueScore: number; // 0-100, higher = more fatigued
}

export interface EnvironmentalFactor {
  altitude: number; // feet above sea level
  indoorOutdoor: 'indoor' | 'outdoor' | 'dome';
  temperature: number; // fahrenheit
  humidity: number; // percentage
  windSpeed: number; // mph
  precipitationChance: number;
  environmentalEdge: number; // -10 to +10
}

export interface OfficialTendency {
  officialName: string;
  avgFoulsPerGame: number;
  overUnderTendency: 'over' | 'under' | 'neutral';
  homeTeamBias: number; // -5 to +5
  historicalImpact: number;
}

export interface CoachingMatchup {
  homeCoach: string;
  awayCoach: string;
  headToHeadRecord: { wins: number; losses: number };
  adjustmentRating: number; // 0-100
  inGameManagement: number; // 0-100
  coachingEdge: 'home' | 'away' | 'even';
}

export interface RosterContinuity {
  lineupConsistency: number; // 0-100
  newPlayerImpact: number; // -20 to +20
  tradeDeadlineChanges: boolean;
  chemistryScore: number; // 0-100
  injuryAdjustedRating: number;
}

export interface MarketEfficiency {
  openingLine: number;
  currentLine: number;
  lineMovement: number;
  steamMoveDetected: boolean;
  reverseLineMovement: boolean;
  closingLinePrediction: number;
  marketEdge: number; // -10 to +10
}

export interface AdvancedMetrics {
  // Basketball
  netRating?: number;
  trueShooting?: number;
  pace?: number;
  offensiveRating?: number;
  defensiveRating?: number;
  
  // Football
  dvoa?: number;
  epa?: number;
  successRate?: number;
  
  // Baseball
  war?: number;
  ops?: number;
  fip?: number;
  
  // Hockey
  corsi?: number;
  fenwick?: number;
  expectedGoals?: number;
}

export interface InjuryReplacementValue {
  injuredPlayer: string;
  replacementPlayer: string;
  productionLoss: number; // percentage
  adjustedWinProbability: number;
  impactSeverity: 'minimal' | 'moderate' | 'significant' | 'critical';
}

export interface HistoricalPattern {
  dayOfWeekRecord: { wins: number; losses: number };
  monthlyPerformance: number; // -10 to +10
  primetimeRecord: { wins: number; losses: number };
  afterLossRecord: { wins: number; losses: number };
  afterWinRecord: { wins: number; losses: number };
  patternEdge: number;
}

// Compute situational factors for a matchup
export function analyzeSituationalFactors(
  homeTeam: string,
  awayTeam: string,
  previousMatchups: any[]
): SituationalFactor[] {
  const factors: SituationalFactor[] = [];
  
  // Revenge game detection
  const lastMeeting = previousMatchups[0];
  if (lastMeeting && lastMeeting.loser === homeTeam && lastMeeting.marginOfLoss > 15) {
    factors.push({
      type: 'revenge',
      intensity: Math.min(100, lastMeeting.marginOfLoss * 3),
      description: `${homeTeam} looking to avenge ${lastMeeting.marginOfLoss}-point loss`,
      impact: 'positive'
    });
  }
  
  // Rivalry detection
  const rivalries = [
    // NFL
    ['Packers', 'Bears'], ['Steelers', 'Ravens'], ['49ers', 'Seahawks'], ['Rams', '49ers'], ['Patriots', 'Jets'],
    // MLB
    ['Yankees', 'Red Sox'],
    // NBA
    ['Lakers', 'Celtics'], ['Heat', 'Knicks'], ['Warriors', 'Cavaliers'], ['Bulls', 'Pistons'],
    // NFL
    ['Chiefs', 'Bills'], ['Cowboys', 'Eagles'], ['Chiefs', 'Raiders'],
    // MLB
    ['Dodgers', 'Giants'], ['Cubs', 'Cardinals'], ['Mets', 'Phillies'],
    // NHL
    ['Bruins', 'Canadiens'], ['Penguins', 'Flyers'], ['Rangers', 'Islanders'],
    // NCAAB
    ['Duke', 'UNC'], ['Kentucky', 'Louisville'], ['Kansas', 'Missouri'], ['UCLA', 'USC'], ['North Carolina', 'Duke']
  ];
  
  const isRivalry = rivalries.some(
    r => (r.includes(homeTeam) && r.includes(awayTeam))
  );
  
  if (isRivalry) {
    factors.push({
      type: 'rivalry',
      intensity: 85,
      description: `Historic rivalry matchup - elevated intensity expected`,
      impact: 'neutral'
    });
  }
  
  return factors;
}

// Calculate fatigue score
export function calculateFatigueFactor(
  restDays: number,
  travelDistance: number,
  timeZoneChanges: number,
  gamesInLast7Days: number
): FatigueFactor {
  let fatigueScore = 0;
  
  // Rest days impact (0 = back-to-back)
  if (restDays === 0) fatigueScore += 40;
  else if (restDays === 1) fatigueScore += 20;
  else if (restDays === 2) fatigueScore += 10;
  
  // Travel impact
  if (travelDistance > 2000) fatigueScore += 25;
  else if (travelDistance > 1000) fatigueScore += 15;
  else if (travelDistance > 500) fatigueScore += 8;
  
  // Time zone impact
  fatigueScore += timeZoneChanges * 8;
  
  // Game load
  if (gamesInLast7Days >= 4) fatigueScore += 20;
  else if (gamesInLast7Days >= 3) fatigueScore += 10;
  
  return {
    backToBack: restDays === 0,
    restDays,
    travelDistance,
    timeZoneChanges,
    gamesInLast7Days,
    fatigueScore: Math.min(100, fatigueScore)
  };
}

// Analyze environmental factors
export function analyzeEnvironmentalFactors(
  venue: string,
  altitude: number,
  weather: { temp: number; humidity: number; wind: number; precip: number },
  homeTeamAltitude: number
): EnvironmentalFactor {
  let environmentalEdge = 0;
  
  // Altitude advantage (Denver effect)
  if (altitude > 5000 && homeTeamAltitude > 5000) {
    environmentalEdge += 3; // Home team acclimated
  } else if (altitude > 5000) {
    environmentalEdge += 5; // Visiting team disadvantaged
  }
  
  // Weather factors for outdoor games
  if (weather.wind > 15) {
    environmentalEdge -= 2; // Affects passing games
  }
  
  if (weather.precip > 50) {
    environmentalEdge -= 1; // Slippery conditions
  }
  
  return {
    altitude,
    indoorOutdoor: altitude > 0 ? 'outdoor' : 'indoor',
    temperature: weather.temp,
    humidity: weather.humidity,
    windSpeed: weather.wind,
    precipitationChance: weather.precip,
    environmentalEdge: Math.max(-10, Math.min(10, environmentalEdge))
  };
}

// Calculate injury replacement value
export function calculateInjuryReplacementValue(
  injuredPlayerStats: { ppg?: number; mpg?: number; war?: number },
  replacementPlayerStats: { ppg?: number; mpg?: number; war?: number },
  baseWinProbability: number
): InjuryReplacementValue {
  const starThreshold = 20; // PPG for star player
  const rolePlayerThreshold = 10;
  
  const injuredPPG = injuredPlayerStats.ppg || 0;
  const replacementPPG = replacementPlayerStats.ppg || 0;
  
  const productionLoss = injuredPPG > 0 
    ? ((injuredPPG - replacementPPG) / injuredPPG) * 100 
    : 0;
  
  let impactSeverity: 'minimal' | 'moderate' | 'significant' | 'critical';
  let winProbAdjustment = 0;
  
  if (injuredPPG >= starThreshold) {
    if (productionLoss > 50) {
      impactSeverity = 'critical';
      winProbAdjustment = -15;
    } else {
      impactSeverity = 'significant';
      winProbAdjustment = -10;
    }
  } else if (injuredPPG >= rolePlayerThreshold) {
    impactSeverity = 'moderate';
    winProbAdjustment = -5;
  } else {
    impactSeverity = 'minimal';
    winProbAdjustment = -2;
  }
  
  return {
    injuredPlayer: 'Unknown',
    replacementPlayer: 'Unknown',
    productionLoss: Math.max(0, productionLoss),
    adjustedWinProbability: Math.max(0, Math.min(100, baseWinProbability + winProbAdjustment)),
    impactSeverity
  };
}

// Analyze market efficiency
export function analyzeMarketEfficiency(
  openingLine: number,
  currentLine: number,
  publicBettingPercentage: number,
  sharpBettingPercentage: number
): MarketEfficiency {
  const lineMovement = currentLine - openingLine;
  
  // Steam move: sharp money causing rapid line movement
  const steamMoveDetected = Math.abs(lineMovement) >= 2 && sharpBettingPercentage > 70;
  
  // Reverse line movement: line moves opposite to public betting
  const reverseLineMovement = (publicBettingPercentage > 65 && lineMovement > 0) ||
                               (publicBettingPercentage < 35 && lineMovement < 0);
  
  // Predict closing line based on sharp action
  const closingLinePrediction = currentLine + (sharpBettingPercentage > 60 ? lineMovement * 0.5 : 0);
  
  // Market edge calculation
  let marketEdge = 0;
  if (reverseLineMovement) marketEdge += 3;
  if (steamMoveDetected) marketEdge += 5;
  if (sharpBettingPercentage > 75) marketEdge += 2;
  
  return {
    openingLine,
    currentLine,
    lineMovement,
    steamMoveDetected,
    reverseLineMovement,
    closingLinePrediction,
    marketEdge: Math.max(-10, Math.min(10, marketEdge))
  };
}

// Calculate historical pattern edge
export function calculateHistoricalPatterns(
  team: string,
  dayOfWeek: string,
  month: number,
  isPrimetime: boolean,
  lastGameResult: 'win' | 'loss'
): HistoricalPattern {
  // Mock historical data - would use real team statistics
  const patterns: HistoricalPattern = {
    dayOfWeekRecord: { wins: 45, losses: 35 },
    monthlyPerformance: month >= 3 && month <= 5 ? 3 : -1, // Better in spring
    primetimeRecord: { wins: 22, losses: 18 },
    afterLossRecord: { wins: 35, losses: 25 },
    afterWinRecord: { wins: 40, losses: 30 },
    patternEdge: 0
  };
  
  // Calculate overall pattern edge
  const dowWinRate = patterns.dayOfWeekRecord.wins / 
    (patterns.dayOfWeekRecord.wins + patterns.dayOfWeekRecord.losses);
  
  patterns.patternEdge = (dowWinRate - 0.5) * 10 + patterns.monthlyPerformance;
  
  if (isPrimetime) {
    const primetimeWinRate = patterns.primetimeRecord.wins / 
      (patterns.primetimeRecord.wins + patterns.primetimeRecord.losses);
    patterns.patternEdge += (primetimeWinRate - 0.5) * 5;
  }
  
  return patterns;
}

// Master analysis function combining all factors
export interface ComprehensiveAnalysis {
  situational: SituationalFactor[];
  fatigue: FatigueFactor;
  environmental: EnvironmentalFactor;
  marketEfficiency: MarketEfficiency;
  historicalPatterns: HistoricalPattern;
  advancedMetrics: AdvancedMetrics;
  overallConfidenceBoost: number;
  keyInsights: string[];
}

export function performComprehensiveAnalysis(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  gameData: any
): ComprehensiveAnalysis {
  const situational = analyzeSituationalFactors(homeTeam, awayTeam, []);
  
  const fatigue = calculateFatigueFactor(
    gameData.restDays || 2,
    gameData.travelDistance || 500,
    gameData.timeZoneChanges || 0,
    gameData.gamesLast7 || 2
  );
  
  const environmental = analyzeEnvironmentalFactors(
    gameData.venue || '',
    gameData.altitude || 0,
    { temp: 72, humidity: 50, wind: 5, precip: 10 },
    gameData.homeAltitude || 0
  );
  
  const marketEfficiency = analyzeMarketEfficiency(
    gameData.openingLine || -3,
    gameData.currentLine || -3.5,
    gameData.publicPct || 55,
    gameData.sharpPct || 45
  );
  
  const historicalPatterns = calculateHistoricalPatterns(
    homeTeam,
    'Monday',
    new Date().getMonth() + 1,
    gameData.isPrimetime || false,
    'win'
  );
  
  // Advanced metrics by sport
  let advancedMetrics: AdvancedMetrics = {};
  if (sport === 'NBA' || sport === 'NCAAB') {
    advancedMetrics = {
      netRating: 5.2,
      trueShooting: 0.58,
      pace: 100.5,
      offensiveRating: 115.2,
      defensiveRating: 110.0
    };
  } else if (sport === 'NFL' || sport === 'NCAAF') {
    advancedMetrics = {
      dvoa: 12.5,
      epa: 0.15,
      successRate: 0.48
    };
  } else if (sport === 'MLB') {
    advancedMetrics = {
      war: 4.5,
      ops: 0.785,
      fip: 3.82
    };
  } else if (sport === 'NHL') {
    advancedMetrics = {
      corsi: 52.3,
      fenwick: 51.8,
      expectedGoals: 2.8
    };
  }
  
  // Calculate overall confidence boost from all factors
  let confidenceBoost = 0;
  confidenceBoost += situational.reduce((sum, f) => sum + (f.impact === 'positive' ? 2 : 0), 0);
  confidenceBoost -= fatigue.fatigueScore > 50 ? 3 : 0;
  confidenceBoost += environmental.environmentalEdge;
  confidenceBoost += marketEfficiency.marketEdge;
  confidenceBoost += historicalPatterns.patternEdge;
  
  // Generate key insights
  const keyInsights: string[] = [];
  
  if (fatigue.backToBack) {
    keyInsights.push(`${awayTeam} on back-to-back - potential fatigue factor`);
  }
  
  if (marketEfficiency.steamMoveDetected) {
    keyInsights.push('Steam move detected - sharp money has moved the line significantly');
  }
  
  if (marketEfficiency.reverseLineMovement) {
    keyInsights.push('Reverse line movement - line moving opposite to public betting');
  }
  
  if (situational.some(s => s.type === 'revenge')) {
    keyInsights.push('Revenge game situation - elevated motivation for home team');
  }
  
  if (environmental.altitude > 5000) {
    keyInsights.push('High altitude venue - visiting team may struggle with conditioning');
  }
  
  return {
    situational,
    fatigue,
    environmental,
    marketEfficiency,
    historicalPatterns,
    advancedMetrics,
    overallConfidenceBoost: Math.max(-20, Math.min(20, confidenceBoost)),
    keyInsights
  };
}
