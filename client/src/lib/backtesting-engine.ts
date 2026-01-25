import { analyzeTicket, recordOutcome, getEngineStats, type TicketFusion, type FusionAnalysis } from "./quantum-fusion-engine";
import type { Sport } from "@shared/schema";

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
      { home: "Lakers", away: "Celtics" },
      { home: "Warriors", away: "Nuggets" },
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

  for (let i = 0; i < count; i++) {
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const matchup = teams[sport][Math.floor(Math.random() * teams[sport].length)];
    const market = markets[Math.floor(Math.random() * markets.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    
    const homeWinProb = 0.4 + Math.random() * 0.2;
    const isHomeWin = Math.random() < homeWinProb;
    const isPush = Math.random() < 0.03;
    
    events.push({
      id: `hist-${i}-${Date.now()}`,
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      sport,
      homeTeam: matchup.home,
      awayTeam: matchup.away,
      market,
      line: market === "Spread" ? (Math.random() > 0.5 ? -3.5 : 3.5) : undefined,
      odds: -110 + Math.floor(Math.random() * 40) - 20,
      outcome: isPush ? "push" : (isHomeWin ? "win" : "loss"),
      finalScore: {
        home: Math.floor(Math.random() * 30) + 80,
        away: Math.floor(Math.random() * 30) + 80,
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
}

export const backtestingEngine = new BacktestingEngine();
