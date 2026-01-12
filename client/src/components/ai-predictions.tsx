import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, TrendingUp, Target, Zap, RefreshCw, DollarSign, AlertTriangle, CheckCircle, Activity, BarChart3 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface VegasFactor {
  name: string;
  impact: number;
  direction: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

interface VegasPrediction {
  id: string;
  sport: string;
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
}

interface VegasInsights {
  marketEfficiency: number;
  sharpSidePercentage: number;
  topEdgePlays: number;
  steamMoveCount: number;
  reverseLineMoveCount: number;
  averageHold: number;
}

interface VegasResponse {
  predictions: VegasPrediction[];
  insights: VegasInsights;
  timestamp: string;
  source: string;
}

function getConfidenceTierStyles(tier: string) {
  switch (tier) {
    case "LOCK":
      return "bg-green-500/20 border-green-500/50 text-green-400";
    case "STRONG":
      return "bg-purple-500/20 border-purple-500/50 text-purple-400";
    case "LEAN":
      return "bg-blue-500/20 border-blue-500/50 text-blue-400";
    default:
      return "bg-muted/50 border-border text-muted-foreground";
  }
}

function getFactorIcon(direction: string) {
  if (direction === "positive") return <TrendingUp className="w-3 h-3 text-green-500" />;
  if (direction === "negative") return <AlertTriangle className="w-3 h-3 text-red-500" />;
  return <Activity className="w-3 h-3 text-muted-foreground" />;
}

export function AIPredictions() {
  const [sport, setSport] = useState("all");

  const { data, isLoading, refetch, isFetching } = useQuery<VegasResponse>({
    queryKey: ["/api/vegas/predictions", sport === "all" ? "" : sport],
    queryFn: async () => {
      const url = sport === "all" 
        ? "/api/vegas/predictions" 
        : `/api/vegas/predictions?sport=${sport.toUpperCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch predictions");
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const predictions = data?.predictions || [];
  const insights = data?.insights;

  const refreshPredictions = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/vegas/predictions"] });
    refetch();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
              <Brain className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Vegas AI Predictions</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Vegas Modeling Engine v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-vegas-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
                <SelectItem value="nhl">NHL</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshPredictions}
              disabled={isFetching}
              data-testid="button-refresh-vegas"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-muted-foreground">Top Edge Plays</span>
              </div>
              <p className="text-lg font-bold text-purple-400">{insights.topEdgePlays}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Steam Moves</span>
              </div>
              <p className="text-lg font-bold text-yellow-400">{insights.steamMoveCount}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-green-400" />
                <span className="text-xs text-muted-foreground">RLM Signals</span>
              </div>
              <p className="text-lg font-bold text-green-400">{insights.reverseLineMoveCount}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No edge plays found for the selected sport
          </div>
        ) : (
          predictions.slice(0, 8).map((pred) => (
            <div
              key={pred.id}
              className={`p-4 rounded-lg border ${
                pred.confidenceTier === "LOCK"
                  ? "bg-green-500/5 border-green-500/30"
                  : pred.confidenceTier === "STRONG"
                  ? "bg-purple-500/5 border-purple-500/30"
                  : pred.confidenceTier === "LEAN"
                  ? "bg-blue-500/5 border-blue-500/30"
                  : "bg-muted/30 border-border"
              }`}
              data-testid={`prediction-card-${pred.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{pred.sport}</Badge>
                    <Badge className={`text-xs ${getConfidenceTierStyles(pred.confidenceTier)}`}>
                      {pred.confidenceTier}
                    </Badge>
                    {pred.steamMove && (
                      <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Zap className="w-3 h-3 mr-1" />
                        STEAM
                      </Badge>
                    )}
                    {pred.reverseLineMove && (
                      <Badge className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        <Activity className="w-3 h-3 mr-1" />
                        RLM
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm mt-1">{pred.game}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-purple-400 text-lg">{pred.prediction}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-xl font-bold">{pred.confidence}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{pred.modelAgreement}/5 models agree</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground mb-0.5">Vegas Line</p>
                  <p className="font-bold">{pred.vegasLine > 0 ? `+${pred.vegasLine}` : pred.vegasLine}</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground mb-0.5">Fair Line</p>
                  <p className="font-bold text-blue-400">{pred.fairLine > 0 ? `+${pred.fairLine}` : pred.fairLine}</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground mb-0.5">Edge</p>
                  <p className="font-bold text-green-500">+{pred.edge}%</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground mb-0.5">EV ($100)</p>
                  <p className={`font-bold ${pred.expectedValue > 0 ? "text-green-500" : "text-red-500"}`}>
                    {pred.expectedValue > 0 ? "+" : ""}{pred.expectedValue.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                  <span className="text-muted-foreground">True Prob</span>
                  <span className="font-medium text-green-400">{pred.trueProbability}%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                  <span className="text-muted-foreground">Implied</span>
                  <span className="font-medium">{pred.impliedProbability}%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                  <span className="text-muted-foreground">Vig Removed</span>
                  <span className="font-medium text-yellow-400">{pred.vigRemoved}%</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs mb-3 p-2 bg-background/30 rounded">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3 text-purple-400" />
                  <span className="text-muted-foreground">Sharp:</span>
                  <span className={`font-medium ${pred.sharpMoney > 55 ? "text-green-400" : ""}`}>
                    {pred.sharpMoney}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3 text-blue-400" />
                  <span className="text-muted-foreground">Public:</span>
                  <span className="font-medium">{pred.publicMoney}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  <span className="text-muted-foreground">Movement:</span>
                  <span className={`font-medium ${pred.lineMovement > 0 ? "text-green-400" : pred.lineMovement < 0 ? "text-red-400" : ""}`}>
                    {pred.lineMovement > 0 ? "+" : ""}{pred.lineMovement}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Key Factors:</p>
                <div className="flex flex-wrap gap-1.5">
                  {pred.factors.slice(0, 4).map((factor, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className={`text-xs ${
                        factor.direction === "positive" 
                          ? "bg-green-500/10 text-green-400 border-green-500/20" 
                          : factor.direction === "negative"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : ""
                      }`}
                    >
                      {getFactorIcon(factor.direction)}
                      <span className="ml-1">{factor.name}</span>
                      <span className="ml-1 opacity-60">({factor.impact.toFixed(1)})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}

        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Vegas-calibrated probabilities with vig removed</span>
            </div>
            <span>{data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ""}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
