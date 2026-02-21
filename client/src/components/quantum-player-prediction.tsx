import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, TrendingUp, TrendingDown, MapPin, Heart, Zap, Calendar, Home, AlertTriangle, Star, Target, Activity } from "lucide-react";

interface QuantumFactor {
  id: string;
  factorName: string;
  factorValue: number;
  weight: number;
  confidence: number;
  dataPoints: number;
  impactClassification: string;
  reliabilityRating: string;
  description: string;
}

interface PlayerPrediction {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  baselinePerformance: number;
  quantumAdjustment: number;
  predictedPerformance: number;
  confidenceLevel: number;
  confidenceRating: string;
  factors: QuantumFactor[];
  bettingRecommendation: string;
  riskAssessment: string;
  predictedStats: {
    points: number;
    rebounds: number;
    assists: number;
  };
}

export function QuantumPlayerPrediction() {
  const [selectedPlayer, setSelectedPlayer] = useState("jalen-brunson");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PlayerPrediction | null>(null);

  const players = [
    { id: "jalen-brunson", name: "Jalen Brunson", team: "Knicks", position: "PG" },
    { id: "luka-doncic", name: "Luka Doncic", team: "Mavericks", position: "PG" },
    { id: "giannis-antetokounmpo", name: "Giannis Antetokounmpo", team: "Bucks", position: "PF" },
    { id: "anthony-edwards", name: "Anthony Edwards", team: "Timberwolves", position: "SG" },
    { id: "nikola-jokic", name: "Nikola Jokic", team: "Nuggets", position: "C" },
  ];

  const runQuantumPrediction = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const mockPrediction: PlayerPrediction = {
        playerId: selectedPlayer,
        playerName: players.find(p => p.id === selectedPlayer)?.name || "",
        team: players.find(p => p.id === selectedPlayer)?.team || "",
        position: players.find(p => p.id === selectedPlayer)?.position || "",
        baselinePerformance: 27.4,
        quantumAdjustment: 0.087,
        predictedPerformance: 29.8,
        confidenceLevel: 0.82,
        confidenceRating: "HIGH",
        bettingRecommendation: "MODERATE_BET_OVER - Favorable conditions detected",
        riskAssessment: "LOW_RISK - Stable prediction",
        predictedStats: {
          points: 29.8,
          rebounds: 7.5,
          assists: 8.9
        },
        factors: [
          {
            id: "1",
            factorName: "Hometown Boost",
            factorValue: 0.12,
            weight: 0.12,
            confidence: 0.88,
            dataPoints: 45,
            impactClassification: "STRONG_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Playing within 100 miles of hometown"
          },
          {
            id: "2",
            factorName: "Incentive Motivation",
            factorValue: 0.08,
            weight: 0.10,
            confidence: 0.90,
            dataPoints: 3,
            impactClassification: "MODERATE_POSITIVE",
            reliabilityRating: "VERY_RELIABLE",
            description: "85% progress toward contract bonus"
          },
          {
            id: "3",
            factorName: "Injury Impact",
            factorValue: -0.03,
            weight: 0.18,
            confidence: 0.85,
            dataPoints: 1,
            impactClassification: "SLIGHT_NEGATIVE",
            reliabilityRating: "RELIABLE",
            description: "Minor ankle tweak 10 days ago"
          },
          {
            id: "4",
            factorName: "Player Mood",
            factorValue: 0.05,
            weight: 0.15,
            confidence: 0.72,
            dataPoints: 8,
            impactClassification: "MODERATE_POSITIVE",
            reliabilityRating: "MODERATELY_RELIABLE",
            description: "Positive mood indicators last 2 weeks"
          },
          {
            id: "5",
            factorName: "Team Streak Impact",
            factorValue: 0.04,
            weight: 0.11,
            confidence: 0.75,
            dataPoints: 4,
            impactClassification: "SLIGHT_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Team on 4-game winning streak"
          },
          {
            id: "6",
            factorName: "Opponent Matchup",
            factorValue: 0.09,
            weight: 0.09,
            confidence: 0.80,
            dataPoints: 12,
            impactClassification: "MODERATE_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Historically strong vs opponent"
          },
          {
            id: "7",
            factorName: "Rest Days",
            factorValue: 0.05,
            weight: 0.07,
            confidence: 0.85,
            dataPoints: 1,
            impactClassification: "MODERATE_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Optimal 3 days rest"
          },
          {
            id: "8",
            factorName: "Seasonal Fatigue",
            factorValue: -0.02,
            weight: 0.06,
            confidence: 0.80,
            dataPoints: 52,
            impactClassification: "SLIGHT_NEGATIVE",
            reliabilityRating: "RELIABLE",
            description: "52 games played this season"
          },
          {
            id: "9",
            factorName: "Coaching Stability",
            factorValue: 0.02,
            weight: 0.05,
            confidence: 0.75,
            dataPoints: 1,
            impactClassification: "SLIGHT_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Stable coaching environment"
          },
          {
            id: "10",
            factorName: "Home/Away Differential",
            factorValue: 0.06,
            weight: 0.07,
            confidence: 0.82,
            dataPoints: 38,
            impactClassification: "MODERATE_POSITIVE",
            reliabilityRating: "RELIABLE",
            description: "Strong home court advantage"
          }
        ]
      };
      setPrediction(mockPrediction);
      setIsAnalyzing(false);
    }, 2500);
  };

  const getImpactColor = (impact: string) => {
    if (impact.includes("STRONG_POSITIVE")) return "text-green-500";
    if (impact.includes("MODERATE_POSITIVE")) return "text-green-400";
    if (impact.includes("SLIGHT_POSITIVE")) return "text-green-300";
    if (impact.includes("STRONG_NEGATIVE")) return "text-red-500";
    if (impact.includes("MODERATE_NEGATIVE")) return "text-red-400";
    if (impact.includes("SLIGHT_NEGATIVE")) return "text-red-300";
    return "text-gray-500";
  };

  const getFactorIcon = (name: string) => {
    if (name.includes("Hometown")) return MapPin;
    if (name.includes("Incentive")) return Star;
    if (name.includes("Injury")) return AlertTriangle;
    if (name.includes("Mood")) return Heart;
    if (name.includes("Streak")) return TrendingUp;
    if (name.includes("Matchup")) return Target;
    if (name.includes("Rest")) return Calendar;
    if (name.includes("Fatigue")) return Activity;
    if (name.includes("Coaching")) return User;
    if (name.includes("Home")) return Home;
    return Zap;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Player Prediction</CardTitle>
              <Badge variant="secondary">
                10 Factors
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-player">
                <SelectValue placeholder="Select Player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} ({player.team})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runQuantumPrediction} disabled={isAnalyzing} data-testid="button-run-player-prediction">
              {isAnalyzing ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Computing Predictions...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Run Prediction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {prediction && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="col-span-1">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Baseline</p>
                <p className="text-3xl font-bold">{prediction.baselinePerformance}</p>
                <p className="text-xs text-muted-foreground">90-day avg</p>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">AI Adj.</p>
                <p className={`text-3xl font-bold ${prediction.quantumAdjustment >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {prediction.quantumAdjustment >= 0 ? "+" : ""}{(prediction.quantumAdjustment * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Total impact</p>
              </CardContent>
            </Card>
            <Card className="col-span-1 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Predicted</p>
                <p className="text-3xl font-bold text-blue-500" data-testid="text-predicted-performance">
                  {prediction.predictedPerformance.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Points projection</p>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                <p className="text-3xl font-bold text-purple-500">{(prediction.confidenceLevel * 100).toFixed(0)}%</p>
                <Badge className="mt-1 bg-purple-500/20 text-purple-500">{prediction.confidenceRating}</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Predicted Points</p>
                <p className="text-4xl font-bold text-green-500">{prediction.predictedStats.points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Predicted Rebounds</p>
                <p className="text-4xl font-bold text-blue-500">{prediction.predictedStats.rebounds}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Predicted Assists</p>
                <p className="text-4xl font-bold text-purple-500">{prediction.predictedStats.assists}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Factor Analysis (10 Dimensions)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prediction.factors.map((factor) => {
                const FactorIcon = getFactorIcon(factor.factorName);
                return (
                  <div key={factor.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`factor-${factor.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FactorIcon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{factor.factorName}</span>
                          <p className="text-xs text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {factor.factorValue >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`font-bold ${getImpactColor(factor.impactClassification)}`} data-testid={`text-factor-value-${factor.id}`}>
                            {factor.factorValue >= 0 ? "+" : ""}{(factor.factorValue * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {factor.reliabilityRating.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Weight: </span>
                        <span className="font-mono">{(factor.weight * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence: </span>
                        <span className="font-mono">{(factor.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data Points: </span>
                        <span className="font-mono">{factor.dataPoints}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  Betting Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="font-medium text-green-500">{prediction.bettingRecommendation.split(" - ")[0]}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prediction.bettingRecommendation.split(" - ")[1]}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="font-medium text-green-500">{prediction.riskAssessment.split(" - ")[0]}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prediction.riskAssessment.split(" - ")[1]}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
