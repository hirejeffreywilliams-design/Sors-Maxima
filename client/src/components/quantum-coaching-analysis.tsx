import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Target, TrendingUp, Clock, Users, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CoachingDecision {
  id: string;
  decisionType: string;
  finalProbability: number;
  historicalFrequency: number;
  successRate: number;
  pressureFactor: number;
  momentumCorrelation: number;
  quantumInterference: number;
  predictionLevel: "HIGHLY_LIKELY" | "LIKELY" | "POSSIBLE" | "UNLIKELY";
  bettingRecommendation: string;
  expectedValue: number;
}

interface QuantumAnalysisResult {
  coachName: string;
  team: string;
  overallConfidence: number;
  totalPatterns: number;
  decisions: CoachingDecision[];
  situationalContext: {
    scoreDifferential: number;
    timeRemaining: string;
    quarter: string;
    pressureLevel: string;
  };
}

export function QuantumCoachingAnalysis() {
  const [selectedCoach, setSelectedCoach] = useState("andy-reid");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuantumAnalysisResult | null>(null);

  const coaches = [
    { id: "andy-reid", name: "Andy Reid", team: "Chiefs" },
    { id: "kyle-shanahan", name: "Kyle Shanahan", team: "49ers" },
    { id: "sean-mcvay", name: "Sean McVay", team: "Rams" },
    { id: "bill-belichick", name: "Bill Belichick", team: "Patriots" },
    { id: "mike-tomlin", name: "Mike Tomlin", team: "Steelers" },
  ];

  const runQuantumAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const mockAnalysis: QuantumAnalysisResult = {
        coachName: coaches.find(c => c.id === selectedCoach)?.name || "",
        team: coaches.find(c => c.id === selectedCoach)?.team || "",
        overallConfidence: 0.847,
        totalPatterns: 2847,
        situationalContext: {
          scoreDifferential: -3,
          timeRemaining: "4:32",
          quarter: "4th",
          pressureLevel: "HIGH"
        },
        decisions: [
          {
            id: "1",
            decisionType: "Fourth Down Aggressive",
            finalProbability: 0.42,
            historicalFrequency: 187,
            successRate: 0.73,
            pressureFactor: 0.81,
            momentumCorrelation: 0.68,
            quantumInterference: 0.12,
            predictionLevel: "HIGHLY_LIKELY",
            bettingRecommendation: "LIVE_BET_OVER_TOTAL",
            expectedValue: 30.66
          },
          {
            id: "2",
            decisionType: "Strategic Timeout",
            finalProbability: 0.28,
            historicalFrequency: 234,
            successRate: 0.78,
            pressureFactor: 0.85,
            momentumCorrelation: 0.72,
            quantumInterference: 0.08,
            predictionLevel: "LIKELY",
            bettingRecommendation: "BET_TEAM_AFTER_TIMEOUT",
            expectedValue: 21.84
          },
          {
            id: "3",
            decisionType: "Two-Minute Drill",
            finalProbability: 0.18,
            historicalFrequency: 156,
            successRate: 0.69,
            pressureFactor: 0.77,
            momentumCorrelation: 0.65,
            quantumInterference: 0.15,
            predictionLevel: "POSSIBLE",
            bettingRecommendation: "EXPECT_HIGH_SCORING",
            expectedValue: 12.42
          },
          {
            id: "4",
            decisionType: "Challenge Play",
            finalProbability: 0.08,
            historicalFrequency: 89,
            successRate: 0.67,
            pressureFactor: 0.62,
            momentumCorrelation: 0.54,
            quantumInterference: 0.22,
            predictionLevel: "UNLIKELY",
            bettingRecommendation: "MOMENTUM_SHIFT_OPPORTUNITY",
            expectedValue: 5.36
          }
        ]
      };
      setAnalysis(mockAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  const getPredictionColor = (level: string) => {
    switch(level) {
      case "HIGHLY_LIKELY": return "bg-green-500";
      case "LIKELY": return "bg-blue-500";
      case "POSSIBLE": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getBettingBadge = (rec: string) => {
    if (rec.includes("OVER")) return "bg-green-500/20 text-green-500";
    if (rec.includes("UNDER")) return "bg-red-500/20 text-red-500";
    if (rec.includes("TIMEOUT")) return "bg-blue-500/20 text-blue-500";
    return "bg-yellow-500/20 text-yellow-500";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Brain className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Coaching Analysis</CardTitle>
              <Badge variant="secondary">
                10,000+ Patterns
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-coach">
                <SelectValue placeholder="Select Coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map(coach => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.name} ({coach.team})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runQuantumAnalysis} disabled={isAnalyzing} data-testid="button-run-quantum-analysis">
              {isAnalyzing ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing Patterns...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Current Game Situation</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span>Score: -3</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>4:32 4th Qtr</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>High Pressure</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Momentum: +12%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Overall Confidence</p>
                <p className="text-4xl font-bold text-purple-500" data-testid="text-confidence-score">
                  {(analysis.overallConfidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {analysis.totalPatterns.toLocaleString()} patterns
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Decision Accuracy</p>
                <p className="text-4xl font-bold text-green-500">
                  {(analysis.decisions.reduce((acc, d) => acc + d.successRate, 0) / analysis.decisions.length * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Historical success rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Top Prediction</p>
                <p className="text-lg font-bold text-blue-500">
                  {analysis.decisions[0].decisionType}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(analysis.decisions[0].finalProbability * 100).toFixed(0)}% probability
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Decision Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.decisions.map((decision) => (
                <div key={decision.id} className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid={`decision-${decision.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold" data-testid={`text-decision-type-${decision.id}`}>{decision.decisionType}</span>
                        <Badge className={getPredictionColor(decision.predictionLevel)}>
                          {decision.predictionLevel.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {decision.historicalFrequency} historical occurrences
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" data-testid={`text-decision-probability-${decision.id}`}>{(decision.finalProbability * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Probability</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <div className="flex items-center gap-2">
                        <Progress value={decision.successRate * 100} className="h-2 flex-1" />
                        <span className="font-mono">{(decision.successRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pressure Factor</p>
                      <div className="flex items-center gap-2">
                        <Progress value={decision.pressureFactor * 100} className="h-2 flex-1" />
                        <span className="font-mono">{(decision.pressureFactor * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Momentum</p>
                      <div className="flex items-center gap-2">
                        <Progress value={decision.momentumCorrelation * 100} className="h-2 flex-1" />
                        <span className="font-mono">{(decision.momentumCorrelation * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Uncertainty</p>
                      <div className="flex items-center gap-2">
                        <Progress value={decision.quantumInterference * 100} className="h-2 flex-1" />
                        <span className="font-mono">{(decision.quantumInterference * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border flex-wrap">
                    <Badge variant="outline" data-testid={`badge-recommendation-${decision.id}`}>
                      {decision.bettingRecommendation.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">EV Score:</span>
                      <span className="font-bold text-green-500" data-testid={`text-ev-${decision.id}`}>+{decision.expectedValue.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Analysis Layers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "Historical Patterns", value: 25, icon: Clock },
                  { name: "Success Rate", value: 20, icon: CheckCircle2 },
                  { name: "Recency Weight", value: 15, icon: TrendingUp },
                  { name: "Pressure Factor", value: 15, icon: AlertTriangle },
                  { name: "Momentum", value: 10, icon: Zap },
                  { name: "Personnel Match", value: 10, icon: Users },
                  { name: "Time Context", value: 5, icon: Clock }
                ].map((layer, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg text-center">
                    <layer.icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{layer.name}</p>
                    <p className="font-bold">{layer.value}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
