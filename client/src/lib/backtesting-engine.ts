import { analyzeTicket, recordOutcome, getEngineStats, getAllFactors, getFactorCategories, applyOptimizedWeights, type TicketFusion, type FusionAnalysis, type FusionWeight } from "./quantum-fusion-engine";
import type { Sport } from "@shared/schema";

// Launch criteria thresholds
export const LAUNCH_CRITERIA = {
  minAccuracy: 54,
  minROI: 2,
  minCalibration: 65,
  minPredictions: 500,
  minSportAccuracy: 48,
  minHighConfidenceAccuracy: 58,
  minLearningTrend: 45,
} as const;

export interface LaunchReadiness {
  overallReady: boolean;
  readinessScore: number;
  criteria: {
    name: string;
    description: string;
    threshold: number;
    current: number;
    passed: boolean;
    priority: "critical" | "important" | "recommended";
  }[];
  daysToLaunch: number;
  launchDate: Date;
}

export interface FactorAnalysis {
  factor: string;
  category: string;
  weight: number;
  accuracy: number;
  contribution: number;
  trend: "improving" | "stable" | "declining";
  rank: number;
  recommendation: string | null;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  predictions: number;
  accuracy: number;
  roi: number;
  passed: boolean;
  issues: string[];
}

export interface TrainingReport {
  generatedAt: Date;
  sessionId: string;
  summary: {
    totalPredictions: number;
    accuracy: number;
    roi: number;
    grade: string;
    readyForLaunch: boolean;
  };
  metrics: PerformanceMetrics;
  factorAnalysis: FactorAnalysis[];
  launchReadiness: LaunchReadiness;
  recommendations: string[];
}

export interface HistoricalEvent {
  id: string;
  date: Date;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  market: string;
  line?: number;
  odds: number;
  outcome: "win" | "loss" | "push";
  finalScore?: { home: number; away: number };
}

export interface BacktestResult {
  eventId: string;
  prediction: TicketFusion;
  predictedOutcome: "win" | "loss";
  actualOutcome: "win" | "loss" | "push";
  correct: boolean;
  confidenceLevel: number;
  profit: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  profitLoss: number;
  roi: number;
  averageConfidence: number;
  confidenceCalibration: number;
  bySport: Record<Sport, { predictions: number; correct: number; accuracy: number }>;
  byConfidenceLevel: {
    high: { predictions: number; correct: number; accuracy: number };
    medium: { predictions: number; correct: number; accuracy: number };
    low: { predictions: number; correct: number; accuracy: number };
  };
  learningCurve: { week: number; accuracy: number; predictions: number }[];
  factorPerformance: Record<string, { contribution: number; accuracy: number }>;
}

export interface ReportCard {
  overallGrade: string;
  gradeDetails: {
    accuracy: { grade: string; score: number; description: string };
    consistency: { grade: string; score: number; description: string };
    learning: { grade: string; score: number; description: string };
    calibration: { grade: string; score: number; description: string };
    profitability: { grade: string; score: number; description: string };
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  readyForLaunch: boolean;
  launchConfidence: number;
}

const generateHistoricalEvents = (count: number): HistoricalEvent[] => {
  const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
  const teams: Record<Sport, { home: string; away: string }[]> = {
    NBA: [
      { home: "Knicks", away: "Bucks" },
      { home: "Mavericks", away: "Suns" },
      { home: "Bucks", away: "Heat" },
      { home: "76ers", away: "Knicks" },
      { home: "Suns", away: "Mavericks" },
    ],
    NFL: [
      { home: "Chiefs", away: "49ers" },
      { home: "Eagles", away: "Cowboys" },
      { home: "Bills", away: "Dolphins" },
      { home: "Ravens", away: "Bengals" },
      { home: "Lions", away: "Packers" },
    ],
    MLB: [
      { home: "Yankees", away: "Red Sox" },
      { home: "Dodgers", away: "Giants" },
      { home: "Astros", away: "Rangers" },
      { home: "Braves", away: "Phillies" },
      { home: "Cubs", away: "Cardinals" },
    ],
    NHL: [
      { home: "Bruins", away: "Maple Leafs" },
      { home: "Rangers", away: "Devils" },
      { home: "Avalanche", away: "Stars" },
      { home: "Panthers", away: "Lightning" },
      { home: "Oilers", away: "Flames" },
    ],
    NCAAB: [
      { home: "Duke", away: "North Carolina" },
      { home: "Kentucky", away: "Kansas" },
      { home: "UCLA", away: "Gonzaga" },
      { home: "Villanova", away: "UConn" },
      { home: "Michigan St", away: "Michigan" },
    ],
    NCAAF: [
      { home: "Alabama", away: "Georgia" },
      { home: "Ohio State", away: "Michigan" },
      { home: "Clemson", away: "Florida State" },
      { home: "Texas", away: "Oklahoma" },
      { home: "USC", away: "Notre Dame" },
    ],
  };

  const markets = ["Moneyline", "Spread", "Over/Under", "Player Props"];
  const events: HistoricalEvent[] = [];

  function btHash(seed: number): number {
    return ((seed * 2654435761) >>> 0) / 0xffffffff;
  }

  for (let i = 0; i < count; i++) {
    const sport = sports[Math.floor(btHash(i * 31) * sports.length)];
    const matchup = teams[sport][Math.floor(btHash(i * 37 + 1) * teams[sport].length)];
    const market = markets[Math.floor(btHash(i * 41 + 2) * markets.length)];
    const daysAgo = Math.floor(btHash(i * 43 + 3) * 90);
    
    const homeWinProb = 0.4 + btHash(i * 47 + 4) * 0.2;
    const isHomeWin = btHash(i * 53 + 5) < homeWinProb;
    const isPush = btHash(i * 59 + 6) < 0.03;
    
    events.push({
      id: `hist-${i}-${Date.now()}`,
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      sport,
      homeTeam: matchup.home,
      awayTeam: matchup.away,
      market,
      line: market === "Spread" ? (btHash(i * 61 + 7) > 0.5 ? -3.5 : 3.5) : undefined,
      odds: -110 + Math.floor(btHash(i * 67 + 8) * 40) - 20,
      outcome: isPush ? "push" : (isHomeWin ? "win" : "loss"),
      finalScore: {
        home: Math.floor(btHash(i * 71 + 9) * 30) + 80,
        away: Math.floor(btHash(i * 73 + 10) * 30) + 80,
      },
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

class BacktestingEngine {
  private historicalEvents: HistoricalEvent[] = [];
  private results: BacktestResult[] = [];
  private isRunning: boolean = false;
  private trainingProgress: number = 0;
  private listeners: Set<() => void> = new Set();

  initialize(eventCount: number = 500) {
    this.historicalEvents = generateHistoricalEvents(eventCount);
    this.results = [];
    this.trainingProgress = 0;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  async runBacktest(batchSize: number = 50): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    for (let i = 0; i < this.historicalEvents.length; i += batchSize) {
      const batch = this.historicalEvents.slice(i, i + batchSize);
      
      for (const event of batch) {
        const prediction = analyzeTicket(
          [{
            id: event.id,
            sport: event.sport,
            description: `${event.homeTeam} ${event.market} vs ${event.awayTeam}`,
            odds: event.odds,
          }],
          "moderate"
        );

        const predictedWin = prediction.combinedFusion.overallScore >= 55;
        const correct = event.outcome === "push" ? false : 
          (predictedWin && event.outcome === "win") || 
          (!predictedWin && event.outcome === "loss");

        const profit = event.outcome === "push" ? 0 :
          correct ? (event.odds > 0 ? event.odds / 100 : 100 / Math.abs(event.odds)) : -1;

        const result: BacktestResult = {
          eventId: event.id,
          prediction,
          predictedOutcome: predictedWin ? "win" : "loss",
          actualOutcome: event.outcome,
          correct,
          confidenceLevel: prediction.combinedFusion.confidence,
          profit,
          timestamp: event.date,
        };

        this.results.push(result);

        recordOutcome(
          prediction.combinedFusion,
          event.outcome === "win" ? "win" : event.outcome === "loss" ? "loss" : "push"
        );
      }

      this.trainingProgress = Math.min(100, Math.round((i + batchSize) / this.historicalEvents.length * 100));
      this.notify();

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isRunning = false;
    this.notify();
  }

  getProgress(): number {
    return this.trainingProgress;
  }

  isTraining(): boolean {
    return this.isRunning;
  }

  getResults(): BacktestResult[] {
    return this.results;
  }

  getMetrics(): PerformanceMetrics {
    const results = this.results.filter(r => r.actualOutcome !== "push");
    
    if (results.length === 0) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        profitLoss: 0,
        roi: 0,
        averageConfidence: 0,
        confidenceCalibration: 0,
        bySport: {} as any,
        byConfidenceLevel: {
          high: { predictions: 0, correct: 0, accuracy: 0 },
          medium: { predictions: 0, correct: 0, accuracy: 0 },
          low: { predictions: 0, correct: 0, accuracy: 0 },
        },
        learningCurve: [],
        factorPerformance: {},
      };
    }

    const correct = results.filter(r => r.correct).length;
    const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidenceLevel, 0) / results.length;

    const bySport: Record<string, { predictions: number; correct: number; accuracy: number }> = {};
    for (const result of results) {
      const event = this.historicalEvents.find(e => e.id === result.eventId);
      if (!event) continue;
      
      if (!bySport[event.sport]) {
        bySport[event.sport] = { predictions: 0, correct: 0, accuracy: 0 };
      }
      bySport[event.sport].predictions++;
      if (result.correct) bySport[event.sport].correct++;
    }
    
    for (const sport of Object.keys(bySport)) {
      bySport[sport].accuracy = bySport[sport].predictions > 0 
        ? (bySport[sport].correct / bySport[sport].predictions) * 100 
        : 0;
    }

    const byConfidence = {
      high: { predictions: 0, correct: 0, accuracy: 0 },
      medium: { predictions: 0, correct: 0, accuracy: 0 },
      low: { predictions: 0, correct: 0, accuracy: 0 },
    };

    for (const result of results) {
      const level = result.confidenceLevel >= 75 ? "high" : result.confidenceLevel >= 50 ? "medium" : "low";
      byConfidence[level].predictions++;
      if (result.correct) byConfidence[level].correct++;
    }

    for (const level of Object.keys(byConfidence) as ("high" | "medium" | "low")[]) {
      byConfidence[level].accuracy = byConfidence[level].predictions > 0
        ? (byConfidence[level].correct / byConfidence[level].predictions) * 100
        : 0;
    }

    const weeklyResults: Record<number, { correct: number; total: number }> = {};
    const startDate = results[0]?.timestamp || new Date();
    
    for (const result of results) {
      const weekNum = Math.floor((result.timestamp.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (!weeklyResults[weekNum]) {
        weeklyResults[weekNum] = { correct: 0, total: 0 };
      }
      weeklyResults[weekNum].total++;
      if (result.correct) weeklyResults[weekNum].correct++;
    }

    const learningCurve = Object.entries(weeklyResults)
      .map(([week, data]) => ({
        week: parseInt(week),
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        predictions: data.total,
      }))
      .sort((a, b) => a.week - b.week);

    const calibrationDiff = results.reduce((sum, r) => {
      const expected = r.confidenceLevel / 100;
      const actual = r.correct ? 1 : 0;
      return sum + Math.abs(expected - actual);
    }, 0) / results.length;

    return {
      totalPredictions: results.length,
      correctPredictions: correct,
      accuracy: (correct / results.length) * 100,
      profitLoss: totalProfit,
      roi: (totalProfit / results.length) * 100,
      averageConfidence: avgConfidence,
      confidenceCalibration: Math.max(0, 100 - calibrationDiff * 100),
      bySport: bySport as any,
      byConfidenceLevel: byConfidence,
      learningCurve,
      factorPerformance: Object.fromEntries(
        getEngineStats().weights.map(w => [w.factor, { contribution: w.weight, accuracy: w.accuracy }])
      ),
    };
  }

  generateReportCard(): ReportCard {
    const metrics = this.getMetrics();
    const engineStats = getEngineStats();

    const getGrade = (score: number): string => {
      if (score >= 90) return "A+";
      if (score >= 85) return "A";
      if (score >= 80) return "A-";
      if (score >= 75) return "B+";
      if (score >= 70) return "B";
      if (score >= 65) return "B-";
      if (score >= 60) return "C+";
      if (score >= 55) return "C";
      if (score >= 50) return "C-";
      if (score >= 45) return "D+";
      if (score >= 40) return "D";
      return "F";
    };

    const accuracyScore = Math.min(100, metrics.accuracy * 1.5);
    
    const consistencyScore = metrics.learningCurve.length >= 2
      ? Math.max(0, 100 - (Math.max(...metrics.learningCurve.map(w => w.accuracy)) - 
          Math.min(...metrics.learningCurve.map(w => w.accuracy))))
      : 50;

    const learningScore = metrics.learningCurve.length >= 3
      ? (() => {
          const recent = metrics.learningCurve.slice(-3);
          const older = metrics.learningCurve.slice(0, 3);
          const recentAvg = recent.reduce((s, w) => s + w.accuracy, 0) / recent.length;
          const olderAvg = older.reduce((s, w) => s + w.accuracy, 0) / older.length;
          return Math.min(100, 50 + (recentAvg - olderAvg) * 2);
        })()
      : 50;

    const profitScore = Math.min(100, Math.max(0, 50 + metrics.roi * 5));

    const overallScore = (accuracyScore * 0.35 + consistencyScore * 0.2 + 
      learningScore * 0.2 + metrics.confidenceCalibration * 0.15 + profitScore * 0.1);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (metrics.accuracy >= 55) strengths.push("Strong overall prediction accuracy");
    else weaknesses.push("Prediction accuracy needs improvement");

    const sportAccuracies = Object.entries(metrics.bySport);
    const bestSport = sportAccuracies.reduce((best, [sport, data]) => 
      data.accuracy > (best.accuracy || 0) ? { sport, accuracy: data.accuracy } : best, 
      { sport: "", accuracy: 0 });
    const worstSport = sportAccuracies.reduce((worst, [sport, data]) => 
      data.accuracy < (worst.accuracy || 100) ? { sport, accuracy: data.accuracy } : worst, 
      { sport: "", accuracy: 100 });

    if (bestSport.accuracy >= 60) strengths.push(`Excellent performance in ${bestSport.sport} (${bestSport.accuracy.toFixed(1)}%)`);
    if (worstSport.accuracy < 50) {
      weaknesses.push(`Struggling with ${worstSport.sport} predictions (${worstSport.accuracy.toFixed(1)}%)`);
      recommendations.push(`Focus training on ${worstSport.sport} historical data`);
    }

    if (metrics.byConfidenceLevel.high.accuracy >= 65) {
      strengths.push("High-confidence picks are reliable");
    } else if (metrics.byConfidenceLevel.high.accuracy < 55) {
      weaknesses.push("High-confidence picks underperforming");
      recommendations.push("Recalibrate confidence thresholds");
    }

    if (metrics.confidenceCalibration >= 70) {
      strengths.push("Well-calibrated confidence scores");
    } else {
      weaknesses.push("Confidence calibration needs work");
      recommendations.push("Adjust confidence scoring algorithm");
    }

    if (learningScore >= 60) {
      strengths.push("Algorithm shows positive learning trend");
    } else if (learningScore < 45) {
      weaknesses.push("Learning rate is stagnating");
      recommendations.push("Increase training data diversity");
    }

    if (engineStats.improvingFactors >= 3) {
      strengths.push(`${engineStats.improvingFactors} analysis factors showing improvement`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue current training regimen");
      recommendations.push("Monitor performance on edge cases");
    }

    const readyForLaunch = overallScore >= 65 && metrics.accuracy >= 52 && metrics.totalPredictions >= 100;
    const launchConfidence = Math.min(100, overallScore * (metrics.totalPredictions / 500));

    return {
      overallGrade: getGrade(overallScore),
      gradeDetails: {
        accuracy: {
          grade: getGrade(accuracyScore),
          score: accuracyScore,
          description: `${metrics.accuracy.toFixed(1)}% win rate on ${metrics.totalPredictions} predictions`,
        },
        consistency: {
          grade: getGrade(consistencyScore),
          score: consistencyScore,
          description: "Performance stability across different time periods",
        },
        learning: {
          grade: getGrade(learningScore),
          score: learningScore,
          description: "Improvement trend over training period",
        },
        calibration: {
          grade: getGrade(metrics.confidenceCalibration),
          score: metrics.confidenceCalibration,
          description: "Accuracy of confidence predictions",
        },
        profitability: {
          grade: getGrade(profitScore),
          score: profitScore,
          description: `${metrics.roi >= 0 ? "+" : ""}${metrics.roi.toFixed(1)}% ROI`,
        },
      },
      strengths,
      weaknesses,
      recommendations,
      readyForLaunch,
      launchConfidence,
    };
  }

  reset() {
    this.historicalEvents = [];
    this.results = [];
    this.trainingProgress = 0;
    this.isRunning = false;
    this.notify();
  }

  // Launch Readiness Assessment
  getLaunchReadiness(launchDate: Date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)): LaunchReadiness {
    const metrics = this.getMetrics();
    const sportAccuracies = Object.values(metrics.bySport);
    const minSportAcc = sportAccuracies.length > 0 
      ? Math.min(...sportAccuracies.map(s => s.accuracy)) 
      : 0;
    
    const learningTrend = metrics.learningCurve.length >= 3
      ? (() => {
          const recent = metrics.learningCurve.slice(-2);
          const older = metrics.learningCurve.slice(0, 2);
          const recentAvg = recent.reduce((s, w) => s + w.accuracy, 0) / Math.max(1, recent.length);
          const olderAvg = older.reduce((s, w) => s + w.accuracy, 0) / Math.max(1, older.length);
          return 50 + (recentAvg - olderAvg);
        })()
      : 50;

    const criteria = [
      {
        name: "Overall Accuracy",
        description: `Prediction accuracy must be at least ${LAUNCH_CRITERIA.minAccuracy}%`,
        threshold: LAUNCH_CRITERIA.minAccuracy,
        current: metrics.accuracy,
        passed: metrics.accuracy >= LAUNCH_CRITERIA.minAccuracy,
        priority: "critical" as const,
      },
      {
        name: "Return on Investment",
        description: `ROI must be at least ${LAUNCH_CRITERIA.minROI}%`,
        threshold: LAUNCH_CRITERIA.minROI,
        current: metrics.roi,
        passed: metrics.roi >= LAUNCH_CRITERIA.minROI,
        priority: "critical" as const,
      },
      {
        name: "Confidence Calibration",
        description: `Calibration score must be at least ${LAUNCH_CRITERIA.minCalibration}`,
        threshold: LAUNCH_CRITERIA.minCalibration,
        current: metrics.confidenceCalibration,
        passed: metrics.confidenceCalibration >= LAUNCH_CRITERIA.minCalibration,
        priority: "important" as const,
      },
      {
        name: "Training Volume",
        description: `At least ${LAUNCH_CRITERIA.minPredictions} predictions required`,
        threshold: LAUNCH_CRITERIA.minPredictions,
        current: metrics.totalPredictions,
        passed: metrics.totalPredictions >= LAUNCH_CRITERIA.minPredictions,
        priority: "critical" as const,
      },
      {
        name: "Sport Coverage",
        description: `No sport below ${LAUNCH_CRITERIA.minSportAccuracy}% accuracy`,
        threshold: LAUNCH_CRITERIA.minSportAccuracy,
        current: minSportAcc,
        passed: minSportAcc >= LAUNCH_CRITERIA.minSportAccuracy,
        priority: "important" as const,
      },
      {
        name: "High Confidence Picks",
        description: `High confidence picks must be ${LAUNCH_CRITERIA.minHighConfidenceAccuracy}%+ accurate`,
        threshold: LAUNCH_CRITERIA.minHighConfidenceAccuracy,
        current: metrics.byConfidenceLevel.high.accuracy,
        passed: metrics.byConfidenceLevel.high.accuracy >= LAUNCH_CRITERIA.minHighConfidenceAccuracy,
        priority: "important" as const,
      },
      {
        name: "Learning Trend",
        description: `Algorithm must show positive learning`,
        threshold: LAUNCH_CRITERIA.minLearningTrend,
        current: learningTrend,
        passed: learningTrend >= LAUNCH_CRITERIA.minLearningTrend,
        priority: "recommended" as const,
      },
    ];

    const criticalPassed = criteria.filter(c => c.priority === "critical" && c.passed).length;
    const criticalTotal = criteria.filter(c => c.priority === "critical").length;
    const importantPassed = criteria.filter(c => c.priority === "important" && c.passed).length;
    const importantTotal = criteria.filter(c => c.priority === "important").length;
    
    const readinessScore = (criticalPassed / criticalTotal * 60) + (importantPassed / importantTotal * 30) + 
      (criteria.filter(c => c.priority === "recommended" && c.passed).length / 
       criteria.filter(c => c.priority === "recommended").length * 10);

    const daysToLaunch = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

    return {
      overallReady: criticalPassed === criticalTotal && importantPassed >= importantTotal - 1,
      readinessScore,
      criteria,
      daysToLaunch,
      launchDate,
    };
  }

  // Factor Performance Analysis
  getFactorAnalysis(): FactorAnalysis[] {
    const factors = getAllFactors();
    const categories = getFactorCategories();
    const engineStats = getEngineStats();
    
    const categoryMap: Record<string, string> = {};
    for (const [catKey, catData] of Object.entries(categories)) {
      for (const factor of catData.factors) {
        categoryMap[factor] = catKey;
      }
    }

    const factorAnalysis: FactorAnalysis[] = factors.map((f, index) => {
      const category = categoryMap[f.factor] || "unknown";
      const contribution = f.weight * f.historicalAccuracy;
      
      let recommendation: string | null = null;
      if (f.historicalAccuracy < 0.52) {
        recommendation = "Consider reducing weight or improving data sources";
      } else if (f.recentTrend === "declining" && f.historicalAccuracy > 0.6) {
        recommendation = "Monitor closely - previously strong but declining";
      } else if (f.recentTrend === "improving" && f.weight < 0.02) {
        recommendation = "Consider increasing weight - showing improvement";
      }

      return {
        factor: f.factor,
        category,
        weight: f.weight,
        accuracy: f.historicalAccuracy * 100,
        contribution,
        trend: f.recentTrend,
        rank: 0,
        recommendation,
      };
    });

    // Sort by contribution and assign ranks
    factorAnalysis.sort((a, b) => b.contribution - a.contribution);
    factorAnalysis.forEach((f, i) => f.rank = i + 1);

    return factorAnalysis;
  }

  // Stress Testing
  async runStressTest(scenario: "extreme_odds" | "high_volume" | "volatile_market" | "underdog_heavy"): Promise<StressTestResult> {
    const scenarios = {
      extreme_odds: {
        name: "Extreme Odds",
        description: "Testing with heavy favorites (-300+) and long shots (+500+)",
        oddsRange: { min: -400, max: 600 },
        count: 100,
      },
      high_volume: {
        name: "High Volume",
        description: "Rapid-fire predictions under load",
        oddsRange: { min: -150, max: 150 },
        count: 200,
      },
      volatile_market: {
        name: "Volatile Market",
        description: "Simulating rapid line movements and uncertain conditions",
        oddsRange: { min: -200, max: 200 },
        count: 100,
      },
      underdog_heavy: {
        name: "Underdog Heavy",
        description: "Majority underdog picks (+150 to +400)",
        oddsRange: { min: 150, max: 400 },
        count: 100,
      },
    };

    const config = scenarios[scenario];
    const testEvents: HistoricalEvent[] = [];
    const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    
    function stressHash(seed: number): number {
      return ((seed * 2654435761) >>> 0) / 0xffffffff;
    }

    for (let i = 0; i < config.count; i++) {
      const sport = sports[Math.floor(stressHash(i * 31) * sports.length)];
      const odds = config.oddsRange.min + Math.floor(stressHash(i * 37 + 1) * (config.oddsRange.max - config.oddsRange.min));
      const adjustedOdds = odds === 0 ? 100 : odds;
      
      testEvents.push({
        id: `stress-${scenario}-${i}`,
        date: new Date(),
        sport,
        homeTeam: "Test Home",
        awayTeam: "Test Away",
        market: "Moneyline",
        odds: adjustedOdds,
        outcome: stressHash(i * 41 + 2) > 0.5 ? "win" : "loss",
      });
    }

    let correct = 0;
    let totalProfit = 0;
    const issues: string[] = [];

    for (const event of testEvents) {
      const prediction = analyzeTicket(
        [{ id: event.id, sport: event.sport, description: `Stress test ${event.sport}`, odds: event.odds }],
        "moderate"
      );
      
      const predictedWin = prediction.combinedFusion.overallScore >= 55;
      const isCorrect = (predictedWin && event.outcome === "win") || (!predictedWin && event.outcome === "loss");
      
      if (isCorrect) correct++;
      const profit = isCorrect 
        ? (event.odds > 0 ? event.odds / 100 : 100 / Math.abs(event.odds)) 
        : -1;
      totalProfit += profit;
    }

    const accuracy = (correct / testEvents.length) * 100;
    const roi = (totalProfit / testEvents.length) * 100;
    
    if (accuracy < 48) issues.push("Accuracy below acceptable threshold");
    if (roi < -5) issues.push("Significant losses in this scenario");
    if (scenario === "high_volume" && accuracy < 50) issues.push("Performance degrades under load");

    return {
      scenario: config.name,
      description: config.description,
      predictions: testEvents.length,
      accuracy,
      roi,
      passed: accuracy >= 48 && roi >= -10,
      issues,
    };
  }

  // Weight Optimization
  optimizeWeights(): { before: FusionWeight[]; after: FusionWeight[]; improvement: number } {
    const currentFactors = getAllFactors();
    const beforeSnapshot = currentFactors.map(f => ({ ...f }));
    
    // Calculate optimized weights based on historical accuracy and learning rate
    const totalAccuracy = currentFactors.reduce((sum, f) => sum + f.historicalAccuracy, 0);
    const optimizedFactors = currentFactors.map(f => {
      let newWeight = f.weight;
      
      // Increase weight for high-accuracy factors
      if (f.historicalAccuracy > 0.65) {
        newWeight *= 1.1;
      } else if (f.historicalAccuracy > 0.60) {
        newWeight *= 1.05;
      } else if (f.historicalAccuracy < 0.52) {
        newWeight *= 0.9;
      } else if (f.historicalAccuracy < 0.48) {
        newWeight *= 0.8;
      }
      
      // Boost improving factors
      if (f.recentTrend === "improving") {
        newWeight *= 1.05;
      } else if (f.recentTrend === "declining") {
        newWeight *= 0.95;
      }
      
      return { ...f, weight: newWeight };
    });

    // Normalize to sum to 1.0
    const totalWeight = optimizedFactors.reduce((sum, f) => sum + f.weight, 0);
    optimizedFactors.forEach(f => f.weight = f.weight / totalWeight);

    // Calculate theoretical improvement
    const beforeScore = beforeSnapshot.reduce((sum, f) => sum + f.weight * f.historicalAccuracy, 0);
    const afterScore = optimizedFactors.reduce((sum, f) => sum + f.weight * f.historicalAccuracy, 0);
    const improvement = ((afterScore - beforeScore) / beforeScore) * 100;

    return {
      before: beforeSnapshot,
      after: optimizedFactors,
      improvement,
    };
  }

  // Apply the optimized weights to the fusion engine
  applyOptimization(optimizedWeights: FusionWeight[]): void {
    applyOptimizedWeights(optimizedWeights);
  }

  // Generate Training Report
  generateTrainingReport(): TrainingReport {
    const metrics = this.getMetrics();
    const reportCard = this.generateReportCard();
    const factorAnalysis = this.getFactorAnalysis();
    const launchReadiness = this.getLaunchReadiness();

    return {
      generatedAt: new Date(),
      sessionId: `training-${Date.now()}`,
      summary: {
        totalPredictions: metrics.totalPredictions,
        accuracy: metrics.accuracy,
        roi: metrics.roi,
        grade: reportCard.overallGrade,
        readyForLaunch: reportCard.readyForLaunch,
      },
      metrics,
      factorAnalysis,
      launchReadiness,
      recommendations: reportCard.recommendations,
    };
  }

  // Export report as JSON string
  exportReportJSON(): string {
    const report = this.generateTrainingReport();
    return JSON.stringify(report, null, 2);
  }

  // Export report as CSV
  exportReportCSV(): string {
    const metrics = this.getMetrics();
    const factorAnalysis = this.getFactorAnalysis();
    
    let csv = "Sors Maxima Training Report\n";
    csv += `Generated,${new Date().toISOString()}\n\n`;
    
    csv += "Summary Metrics\n";
    csv += `Total Predictions,${metrics.totalPredictions}\n`;
    csv += `Accuracy,${metrics.accuracy.toFixed(2)}%\n`;
    csv += `ROI,${metrics.roi.toFixed(2)}%\n`;
    csv += `Confidence Calibration,${metrics.confidenceCalibration.toFixed(2)}\n\n`;
    
    csv += "Performance by Sport\n";
    csv += "Sport,Predictions,Correct,Accuracy\n";
    for (const [sport, data] of Object.entries(metrics.bySport)) {
      csv += `${sport},${data.predictions},${data.correct},${data.accuracy.toFixed(2)}%\n`;
    }
    csv += "\n";
    
    csv += "Top 10 Factors by Contribution\n";
    csv += "Rank,Factor,Category,Weight,Accuracy,Trend\n";
    factorAnalysis.slice(0, 10).forEach(f => {
      csv += `${f.rank},${f.factor},${f.category},${(f.weight * 100).toFixed(2)}%,${f.accuracy.toFixed(1)}%,${f.trend}\n`;
    });
    
    return csv;
  }
}

export const backtestingEngine = new BacktestingEngine();
