import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Zap, Target, ArrowUp, ArrowDown } from "lucide-react";

interface LinePrediction {
  id: string;
  game: string;
  sport: string;
  market: string;
  currentLine: number;
  currentOdds: number;
  predictedLine: number;
  predictedMove: number;
  confidence: number;
  direction: "up" | "down" | "stable";
  timeToClose: string;
  sharpAction: number;
  publicAction: number;
  recommendation: string;
}

function getMockPredictions(): LinePrediction[] {
  return [
    {
      id: "1",
      game: "Chiefs vs Raiders",
      sport: "NFL",
      market: "Spread",
      currentLine: -6.5,
      currentOdds: -110,
      predictedLine: -7,
      predictedMove: -0.5,
      confidence: 82,
      direction: "down",
      timeToClose: "4h 30m",
      sharpAction: 72,
      publicAction: 45,
      recommendation: "BET NOW - Line moving against you",
    },
    {
      id: "2",
      game: "Bills vs Dolphins",
      sport: "NFL",
      market: "Total",
      currentLine: 48.5,
      currentOdds: -110,
      predictedLine: 49.5,
      predictedMove: 1,
      confidence: 76,
      direction: "up",
      timeToClose: "6h 15m",
      sharpAction: 68,
      publicAction: 71,
      recommendation: "Wait for better number if betting Under",
    },
    {
      id: "3",
      game: "Heat vs Timberwolves",
      sport: "NBA",
      market: "Spread",
      currentLine: 5.5,
      currentOdds: -108,
      predictedLine: 5,
      predictedMove: 0.5,
      confidence: 71,
      direction: "up",
      timeToClose: "8h 45m",
      sharpAction: 55,
      publicAction: 62,
      recommendation: "Stable line - bet when ready",
    },
    {
      id: "4",
      game: "Cowboys vs Eagles",
      sport: "NFL",
      market: "Moneyline",
      currentLine: 125,
      currentOdds: 125,
      predictedLine: 115,
      predictedMove: -10,
      confidence: 85,
      direction: "down",
      timeToClose: "2h 00m",
      sharpAction: 78,
      publicAction: 38,
      recommendation: "STRONG BUY - Sharp money incoming",
    },
    {
      id: "5",
      game: "Oilers vs Flames",
      sport: "NHL",
      market: "Total",
      currentLine: 6.5,
      currentOdds: -115,
      predictedLine: 6.5,
      predictedMove: 0,
      confidence: 68,
      direction: "stable",
      timeToClose: "5h 30m",
      sharpAction: 50,
      publicAction: 52,
      recommendation: "No significant move expected",
    },
  ];
}

export function CLVPredictor() {
  const [predictions] = useState<LinePrediction[]>(getMockPredictions());
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? predictions : predictions.filter(p => p.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium">Closing Line Value Predictor</span>
          <Badge variant="outline">AI Forecasting</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-clv-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map(pred => (
          <Card 
            key={pred.id}
            className={`${
              pred.confidence >= 80 && pred.direction !== "stable" 
                ? "border-primary/30 bg-primary/5" 
                : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{pred.sport}</Badge>
                    <span className="font-medium">{pred.game}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{pred.market}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{pred.timeToClose} to close</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="font-bold text-lg" data-testid={`text-current-line-${pred.id}`}>
                    {pred.market === "Moneyline" 
                      ? (pred.currentLine > 0 ? "+" : "") + pred.currentLine
                      : pred.currentLine}
                  </p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Predicted Close</p>
                  <p className={`font-bold text-lg ${
                    pred.direction === "up" ? "text-green-500" :
                    pred.direction === "down" ? "text-red-500" :
                    ""
                  }`} data-testid={`text-predicted-line-${pred.id}`}>
                    {pred.market === "Moneyline" 
                      ? (pred.predictedLine > 0 ? "+" : "") + pred.predictedLine
                      : pred.predictedLine}
                  </p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Move</p>
                  <div className="flex items-center justify-center gap-1">
                    {pred.direction === "up" && <ArrowUp className="w-4 h-4 text-green-500" />}
                    {pred.direction === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                    <p className={`font-bold text-lg ${
                      pred.predictedMove > 0 ? "text-green-500" :
                      pred.predictedMove < 0 ? "text-red-500" :
                      ""
                    }`} data-testid={`text-move-${pred.id}`}>
                      {pred.predictedMove > 0 ? "+" : ""}{pred.predictedMove}
                    </p>
                  </div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-bold text-lg" data-testid={`text-clv-confidence-${pred.id}`}>{pred.confidence}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sharp Money</span>
                    <span className={pred.sharpAction >= 65 ? "text-green-500 font-medium" : ""}>
                      {pred.sharpAction}%
                    </span>
                  </div>
                  <Progress value={pred.sharpAction} className="h-2" />
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Public Money</span>
                    <span>{pred.publicAction}%</span>
                  </div>
                  <Progress value={pred.publicAction} className="h-2" />
                </div>
              </div>

              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                pred.recommendation.includes("STRONG") || pred.recommendation.includes("NOW")
                  ? "bg-green-500/10 text-green-500"
                  : pred.recommendation.includes("Wait")
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-muted/50 text-muted-foreground"
              }`}>
                {pred.recommendation.includes("STRONG") ? (
                  <Zap className="w-4 h-4" />
                ) : pred.recommendation.includes("Wait") ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Target className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{pred.recommendation}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
