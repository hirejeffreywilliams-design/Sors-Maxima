import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { User, TrendingUp, TrendingDown, MapPin, Heart, Zap, Calendar, Home, AlertTriangle, Star, Target, Activity, Info } from "lucide-react";

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
  const [selectedSport, setSelectedSport] = useState("nba");
  const [selectedTeam, setSelectedTeam] = useState("knicks");

  const sports = [
    { id: "nba", name: "NBA" },
    { id: "nfl", name: "NFL" },
    { id: "mlb", name: "MLB" },
    { id: "nhl", name: "NHL" },
  ];

  const teams: Record<string, { id: string; name: string }[]> = {
    nba: [
      { id: "knicks", name: "Knicks" },
      { id: "mavericks", name: "Mavericks" },
      { id: "bucks", name: "Bucks" },
      { id: "timberwolves", name: "Timberwolves" },
      { id: "nuggets", name: "Nuggets" },
    ],
    nfl: [
      { id: "chiefs", name: "Chiefs" },
      { id: "49ers", name: "49ers" },
      { id: "eagles", name: "Eagles" },
      { id: "ravens", name: "Ravens" },
    ],
    mlb: [
      { id: "yankees", name: "Yankees" },
      { id: "dodgers", name: "Dodgers" },
    ],
    nhl: [
      { id: "bruins", name: "Bruins" },
      { id: "avalanche", name: "Avalanche" },
    ],
  };

  const predictionMutation = useMutation<PlayerPrediction, Error, { sport: string; teamId: string }>({
    mutationFn: async ({ sport, teamId }) => {
      const res = await apiRequest("GET", `/api/tools/player-prediction/${sport}/${teamId}`);
      return res.json();
    },
  });

  const prediction = predictionMutation.data ?? null;

  const runQuantumPrediction = () => {
    predictionMutation.mutate({ sport: selectedSport, teamId: selectedTeam });
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
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-500">
            <Info className="w-4 h-4 shrink-0" />
            <span>Select a sport and team, then run the prediction for AI-powered player analysis.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v); setSelectedTeam(teams[v]?.[0]?.id || ""); }}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-sport">
                <SelectValue placeholder="Select Sport" />
              </SelectTrigger>
              <SelectContent>
                {sports.map(sport => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-player">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {(teams[selectedSport] || []).map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runQuantumPrediction} disabled={predictionMutation.isPending} data-testid="button-run-player-prediction">
              {predictionMutation.isPending ? (
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

      {predictionMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center space-y-2">
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                Factor Analysis ({prediction.factors.length} Dimensions)
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
