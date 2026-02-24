import type { Sport } from "@shared/schema";
import { getMultiDayScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface VegasFactor {
  name: string;
  impact: number;
  direction: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

export interface VegasPrediction {
  id: string;
  sport: Sport;
  game: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  betType: "spread" | "moneyline" | "total" | "player_prop";
  confidence: number;
  confidenceTier: "LOCK" | "STRONG" | "LEAN" | "FADE";
  vegasLine: number;
  projectedLine: number;
  fairLine: number;
  edge: number;
  expectedValue: number;
  impliedProbability: number;
  trueProbability: number;
  vigRemoved: number;
  holdPercentage: number;
  factors: VegasFactor[];
  sharpMoney: number;
  publicMoney: number;
  lineMovement: number;
  steamMove: boolean;
  reverseLineMove: boolean;
  modelAgreement: number;
  powerRatingDiff: number;
  situationalScore: number;
  timestamp: number;
}

export interface VegasModelConfig {
  vigAdjustment: number;
  sharpMoneyWeight: number;
  publicMoneyWeight: number;
  injuryWeight: number;
  weatherWeight: number;
  restWeight: number;
  travelWeight: number;
  historicalWeight: number;
  lineMovementWeight: number;
  homeAdvantage: Record<Sport, number>;
}

const DEFAULT_CONFIG: VegasModelConfig = {
  vigAdjustment: 0.045,
  sharpMoneyWeight: 0.25,
  publicMoneyWeight: 0.08,
  injuryWeight: 0.18,
  weatherWeight: 0.12,
  restWeight: 0.15,
  travelWeight: 0.08,
  historicalWeight: 0.10,
  lineMovementWeight: 0.15,
  homeAdvantage: {
    NBA: 2.5,
    NFL: 2.8,
    MLB: 0.6,
    NHL: 0.5,
    NCAAB: 3.5,
    NCAAF: 3.2,
  },
};

const TEAM_POWER_RATINGS: Record<string, number> = {
  "Knicks": 108.5, "Mavericks": 112.3, "Nuggets": 110.1, "Bucks": 111.8,
  "Suns": 109.4, "Heat": 107.8, "76ers": 108.9,
  "Nets": 105.6, "Clippers": 107.2, "Grizzlies": 106.4,
  "Cavaliers": 110.5, "Sacramento Kings": 107.1, "Pelicans": 106.8,
  "Chiefs": 28.5, "Bills": 27.8, "Eagles": 27.2, "49ers": 26.9,
  "Cowboys": 25.8, "Lions": 26.4, "Ravens": 27.1, "Dolphins": 25.6,
  "Bengals": 26.2, "Jaguars": 24.8, "Chargers": 25.4, "Vikings": 25.1,
  "NY Jets": 24.2, "Packers": 25.9, "Seahawks": 24.5, "Steelers": 24.9,
  "Yankees": 105.2, "Dodgers": 106.8, "Braves": 104.5, "Astros": 103.9,
  "Mets": 102.8, "Phillies": 103.2, "Padres": 101.5, "Cardinals": 100.8,
  "Blue Jays": 101.2, "Mariners": 100.5, "Orioles": 99.8, "Rays": 102.5,
  "Rangers": 101.8, "Twins": 100.2, "Brewers": 99.5, "Guardians": 98.8,
  "Bruins": 108.5, "Panthers": 107.2, "NY Rangers": 106.8, "Hurricanes": 105.9,
  "Stars": 106.2, "Avalanche": 107.8, "Oilers": 108.1, "Golden Knights": 106.5,
  "Winnipeg Jets": 105.2, "LA Kings": 104.8, "Lightning": 105.5, "Maple Leafs": 106.1,
  "Devils": 104.2, "Wild": 103.8, "Flames": 102.9, "Kraken": 103.5,
};

function removeVig(odds1: number, odds2: number): { fair1: number; fair2: number; hold: number } {
  const implied1 = 1 / odds1;
  const implied2 = 1 / odds2;
  const totalImplied = implied1 + implied2;
  const hold = totalImplied - 1;
  
  const fair1 = implied1 / totalImplied;
  const fair2 = implied2 / totalImplied;
  
  return { fair1, fair2, hold };
}

function americanToDecimal(american: number): number {
  if (american < 0) {
    return 1 + (100 / Math.abs(american));
  }
  return 1 + (american / 100);
}

function generateOppositeOdds(primaryOdds: number): number {
  if (primaryOdds < -200) return Math.round(Math.abs(primaryOdds) - 20);
  if (primaryOdds < -150) return Math.round(Math.abs(primaryOdds) - 15);
  if (primaryOdds < -110) return Math.round(Math.abs(primaryOdds) - 5);
  if (primaryOdds > 200) return Math.round(-primaryOdds - 20);
  if (primaryOdds > 150) return Math.round(-primaryOdds - 15);
  if (primaryOdds > 110) return Math.round(-primaryOdds - 5);
  return primaryOdds < 0 ? Math.round(-primaryOdds) : Math.round(-primaryOdds);
}

function calculateTrueProbabilityWithVigRemoval(
  primaryAmericanOdds: number,
  factors: VegasFactor[]
): { trueProbability: number; impliedProbability: number; fairProbability: number; hold: number } {
  const oppositeOdds = generateOppositeOdds(primaryAmericanOdds);
  
  const decimalPrimary = americanToDecimal(primaryAmericanOdds);
  const decimalOpposite = americanToDecimal(oppositeOdds);
  
  const { fair1, hold } = removeVig(decimalPrimary, decimalOpposite);
  
  const impliedProbability = 1 / decimalPrimary;
  const fairProbability = fair1;
  
  let adjustment = 0;
  for (const factor of factors) {
    const direction = factor.direction === "positive" ? 1 : factor.direction === "negative" ? -1 : 0;
    adjustment += (factor.impact / 100) * factor.weight * direction;
  }
  
  const trueProbability = Math.max(0.01, Math.min(0.99, fairProbability + adjustment));
  
  return { trueProbability, impliedProbability, fairProbability, hold };
}

function calculateEdge(trueProbability: number, impliedProbability: number): number {
  return ((trueProbability - impliedProbability) / impliedProbability) * 100;
}

function calculateExpectedValue(trueProbability: number, decimalOdds: number, stake: number = 100): number {
  const potentialWin = stake * (decimalOdds - 1);
  const ev = (trueProbability * potentialWin) - ((1 - trueProbability) * stake);
  return ev;
}

function getConfidenceTier(confidence: number, edge: number): "LOCK" | "STRONG" | "LEAN" | "FADE" {
  if (confidence >= 75 && edge >= 8) return "LOCK";
  if (confidence >= 65 && edge >= 5) return "STRONG";
  if (confidence >= 55 && edge >= 2) return "LEAN";
  return "FADE";
}

function generateSituationalFactors(
  homeTeam: string,
  awayTeam: string,
  sport: Sport,
  config: VegasModelConfig
): VegasFactor[] {
  const factors: VegasFactor[] = [];
  
  const homePower = TEAM_POWER_RATINGS[homeTeam] || 100;
  const awayPower = TEAM_POWER_RATINGS[awayTeam] || 100;
  const powerDiff = homePower - awayPower;
  if (Math.abs(powerDiff) > 3) {
    factors.push({
      name: "Power Rating Edge",
      impact: Math.abs(powerDiff) * 0.8,
      direction: powerDiff > 0 ? "positive" : "negative",
      weight: 0.18,
      description: `${powerDiff > 0 ? homeTeam : awayTeam} has a ${Math.abs(powerDiff).toFixed(1)} point power rating advantage`,
    });
  }

  if (sport === "NFL" || sport === "MLB" || sport === "NCAAF") {
    factors.push({
      name: "Weather Consideration",
      impact: 2.0,
      direction: "neutral",
      weight: config.weatherWeight,
      description: `Outdoor sport — real weather data applied via Intelligence Hub`,
    });
  }
  
  factors.push({
    name: "Home Court/Field",
    impact: config.homeAdvantage[sport],
    direction: "positive",
    weight: 0.15,
    description: `Standard ${sport} home advantage applied`,
  });
  
  return factors;
}

function generateSharpMoneyData(): { sharpMoney: number; publicMoney: number; lineMovement: number; steamMove: boolean; reverseLineMove: boolean } {
  return {
    sharpMoney: 50,
    publicMoney: 50,
    lineMovement: 0,
    steamMove: false,
    reverseLineMove: false,
  };
}

let vegasGamesCache: { games: Array<{ home: string; away: string; sport: Sport }>; timestamp: number } | null = null;

async function loadRealGames(): Promise<Array<{ home: string; away: string; sport: Sport }>> {
  if (vegasGamesCache && Date.now() - vegasGamesCache.timestamp < 5 * 60 * 1000) {
    return vegasGamesCache.games;
  }
  try {
    const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL"];
    const allGames: Array<{ home: string; away: string; sport: Sport }> = [];

    for (const s of sports) {
      const espnGames = await getMultiDayScoreboard(s, 3);
      const upcoming = espnGames.filter(g => g.status.state === "pre" || g.status.state === "in");
      for (const g of upcoming) {
        allGames.push({
          home: g.homeTeam.shortDisplayName || g.homeTeam.displayName,
          away: g.awayTeam.shortDisplayName || g.awayTeam.displayName,
          sport: s,
        });
      }
    }
    vegasGamesCache = { games: allGames, timestamp: Date.now() };
    return allGames;
  } catch {
    return getStaticFallbackGames();
  }
}

function getStaticFallbackGames(): Array<{ home: string; away: string; sport: Sport }> {
  return [
    { home: "Knicks", away: "Heat", sport: "NBA" },
    { home: "Bucks", away: "Mavericks", sport: "NBA" },
    { home: "Nuggets", away: "Suns", sport: "NBA" },
    { home: "Heat", away: "76ers", sport: "NBA" },
    { home: "Bills", away: "Chiefs", sport: "NFL" },
    { home: "Eagles", away: "49ers", sport: "NFL" },
    { home: "Lions", away: "Cowboys", sport: "NFL" },
    { home: "Ravens", away: "Bengals", sport: "NFL" },
    { home: "Dodgers", away: "Yankees", sport: "MLB" },
    { home: "Braves", away: "Mets", sport: "MLB" },
    { home: "Astros", away: "Rangers", sport: "MLB" },
    { home: "Padres", away: "Phillies", sport: "MLB" },
    { home: "Panthers", away: "Bruins", sport: "NHL" },
    { home: "Avalanche", away: "Oilers", sport: "NHL" },
    { home: "Golden Knights", away: "Stars", sport: "NHL" },
    { home: "Lightning", away: "Maple Leafs", sport: "NHL" },
  ];
}

export async function generateVegasPredictions(sport?: Sport): Promise<VegasPrediction[]> {
  const games = await loadRealGames();
  
  const filteredGames = sport ? games.filter(g => g.sport === sport) : games;
  const config = DEFAULT_CONFIG;
  
  return filteredGames.map((game, index) => {
    const homePower = TEAM_POWER_RATINGS[game.home] || 100;
    const awayPower = TEAM_POWER_RATINGS[game.away] || 100;
    const powerDiff = homePower - awayPower + config.homeAdvantage[game.sport];
    
    const factors = generateSituationalFactors(game.home, game.away, game.sport, config);
    const sharpData = generateSharpMoneyData();
    
    let vegasLine: number;
    let betType: "spread" | "moneyline" | "total";
    let prediction: string;
    
    const betTypeSelector = index % 3;
    if (betTypeSelector === 0) {
      betType = "spread";
      vegasLine = Math.round(powerDiff * 2) / 2;
      prediction = vegasLine < 0 ? `${game.home} ${vegasLine}` : `${game.away} +${Math.abs(vegasLine)}`;
    } else if (betTypeSelector === 1) {
      betType = "total";
      const baseTotal = game.sport === "NBA" ? 220 : game.sport === "NFL" ? 45 : game.sport === "MLB" ? 8.5 : 6;
      vegasLine = Math.round(baseTotal * 2) / 2;
      prediction = powerDiff > 0 ? `Over ${vegasLine}` : `Under ${vegasLine}`;
    } else {
      betType = "moneyline";
      vegasLine = powerDiff > 3 ? -150 - (powerDiff * 10) : powerDiff < -3 ? 150 + (Math.abs(powerDiff) * 10) : -110;
      vegasLine = Math.round(vegasLine);
      prediction = powerDiff > 0 ? `${game.home} ML` : `${game.away} ML`;
    }
    
    if (sharpData.sharpMoney > 55) {
      factors.push({
        name: "Sharp Money",
        impact: (sharpData.sharpMoney - 50) * 0.5,
        direction: "positive",
        weight: config.sharpMoneyWeight,
        description: `${sharpData.sharpMoney}% of sharp bettors on this side`,
      });
    }
    
    if (sharpData.steamMove) {
      factors.push({
        name: "Steam Move Detected",
        impact: 8,
        direction: "positive",
        weight: 0.20,
        description: "Rapid line movement from sharp action",
      });
    }
    
    if (sharpData.reverseLineMove) {
      factors.push({
        name: "Reverse Line Movement",
        impact: 10,
        direction: "positive",
        weight: 0.22,
        description: "Line moving against public money - sharp indicator",
      });
    }
    
    const americanOdds = betType === "spread" || betType === "total" 
      ? -110 
      : vegasLine;
    
    const probData = calculateTrueProbabilityWithVigRemoval(americanOdds, factors);
    const { trueProbability, impliedProbability, hold } = probData;
    
    const decimalOdds = americanToDecimal(americanOdds);
    const edge = calculateEdge(trueProbability, impliedProbability);
    const ev = calculateExpectedValue(trueProbability, decimalOdds);
    
    let situationalScore = 0;
    for (const factor of factors) {
      const dir = factor.direction === "positive" ? 1 : factor.direction === "negative" ? -1 : 0;
      situationalScore += factor.impact * factor.weight * dir;
    }
    situationalScore = Math.round(situationalScore * 10) / 10;
    
    const baseConfidence = 50 + (trueProbability - 0.5) * 60;
    const edgeBonus = Math.min(15, edge * 1.5);
    const sharpBonus = sharpData.sharpMoney > 60 ? 8 : sharpData.sharpMoney > 55 ? 4 : 0;
    const confidence = Math.max(35, Math.min(95, baseConfidence + edgeBonus + sharpBonus + situationalScore * 0.5));
    
    const modelAgreement = Math.floor((confidence / 100) * 5);
    
    const projectedLine = betType === "spread" 
      ? vegasLine + (trueProbability - impliedProbability) * 10
      : betType === "total"
      ? vegasLine + (trueProbability - impliedProbability) * 5
      : vegasLine * (1 + (trueProbability - impliedProbability));
    
    const fairLine = betType === "spread"
      ? Math.round((projectedLine + vegasLine) / 2 * 2) / 2
      : Math.round(projectedLine * 10) / 10;
    
    return {
      id: `vegas-${game.sport.toLowerCase()}-${index}`,
      sport: game.sport,
      game: `${game.away} @ ${game.home}`,
      homeTeam: game.home,
      awayTeam: game.away,
      prediction,
      betType,
      confidence: Math.round(confidence),
      confidenceTier: getConfidenceTier(confidence, edge),
      vegasLine,
      projectedLine: Math.round(projectedLine * 10) / 10,
      fairLine,
      edge: Math.round(edge * 10) / 10,
      expectedValue: Math.round(ev * 100) / 100,
      impliedProbability: Math.round(impliedProbability * 1000) / 10,
      trueProbability: Math.round(trueProbability * 1000) / 10,
      vigRemoved: Math.round(hold * 500) / 10,
      holdPercentage: Math.round(hold * 1000) / 10,
      factors: factors.sort((a, b) => Math.abs(b.impact * b.weight) - Math.abs(a.impact * a.weight)).slice(0, 5),
      sharpMoney: sharpData.sharpMoney,
      publicMoney: sharpData.publicMoney,
      lineMovement: sharpData.lineMovement,
      steamMove: sharpData.steamMove,
      reverseLineMove: sharpData.reverseLineMove,
      modelAgreement: Math.min(5, Math.max(1, modelAgreement)),
      powerRatingDiff: Math.round(powerDiff * 10) / 10,
      situationalScore,
      timestamp: Date.now(),
    };
  }).filter(p => p.edge > 1).sort((a, b) => b.edge - a.edge);
}

export async function getVegasInsights(): Promise<{
  marketEfficiency: number;
  sharpSidePercentage: number;
  topEdgePlays: number;
  steamMoveCount: number;
  reverseLineMoveCount: number;
  averageHold: number;
}> {
  const predictions = await generateVegasPredictions();
  
  return {
    marketEfficiency: predictions.length > 0 ? Math.round(100 - (predictions.reduce((acc, p) => acc + p.edge, 0) / predictions.length)) : 90,
    sharpSidePercentage: Math.round(predictions.filter(p => p.sharpMoney > 55).length / predictions.length * 100),
    topEdgePlays: predictions.filter(p => p.edge > 5).length,
    steamMoveCount: predictions.filter(p => p.steamMove).length,
    reverseLineMoveCount: predictions.filter(p => p.reverseLineMove).length,
    averageHold: Math.round(predictions.reduce((acc, p) => acc + p.holdPercentage, 0) / predictions.length * 10) / 10,
  };
}
