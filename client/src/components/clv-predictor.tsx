import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Zap, Target, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";

interface LineMovementData {
  market: string;
  opening: number;
  current: number;
  movement: number;
  direction: "up" | "down" | "stable";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
}

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  lineMovement: LineMovementData[];
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface DerivedPrediction {
  id: string;
  game: string;
  market: string;
  currentLine: number;
  predictedLine: number;
  predictedMove: number;
  confidence: number;
  direction: "up" | "down" | "stable";
  sharpAction: number;
  publicAction: number;
  recommendation: string;
  velocity: string;
  gameId: string;
}

function derivePredictions(games: MarketGame[]): DerivedPrediction[] {
  const predictions: DerivedPrediction[] = [];

  for (const game of games) {
    if (game.lineMovement.length === 0) continue;

    for (const lm of game.lineMovement) {
      const velocityMultiplier = lm.velocity === "steam" ? 2.0 : lm.velocity === "fast" ? 1.5 : lm.velocity === "moderate" ? 1.0 : 0.5;
      const predictedMove = Math.round(lm.movement * velocityMultiplier * 10) / 10;
      const predictedLine = Math.round((lm.current + predictedMove) * 2) / 2;

      const confidence = Math.min(92, Math.max(55, Math.round(
        60 +
        (lm.sharpAction ? 15 : 0) +
        (lm.velocity === "steam" ? 12 : lm.velocity === "fast" ? 8 : lm.velocity === "moderate" ? 4 : 0) +
        Math.abs(lm.movement) * 2
      )));

      const sharpPct = lm.sharpAction
        ? Math.min(85, Math.round(65 + Math.abs(lm.movement) * 5))
        : Math.min(55, Math.round(40 + Math.abs(lm.movement) * 3));

      const publicPct = Math.min(75, Math.max(30, Math.round(50 + (lm.direction === "up" ? 5 : lm.direction === "down" ? -5 : 0))));

      let recommendation = "No significant move expected";
      if (lm.sharpAction && lm.velocity === "steam") {
        recommendation = "STRONG BUY - Sharp money incoming";
      } else if (lm.sharpAction && (lm.velocity === "fast" || lm.velocity === "moderate")) {
        recommendation = "BET NOW - Line moving against you";
      } else if (lm.velocity === "fast") {
        recommendation = lm.direction === "up"
          ? "Wait for better number if betting Under"
          : "Wait for better number if betting Over";
      } else if (lm.direction !== "stable") {
        recommendation = "Stable line - bet when ready";
      }

      predictions.push({
        id: `${game.id}-${lm.market}`,
        game: game.shortName,
        market: lm.market === "spread" ? "Spread" : lm.market === "total" ? "Total" : lm.market,
        currentLine: lm.current,
        predictedLine,
        predictedMove,
        confidence,
        direction: lm.direction,
        sharpAction: sharpPct,
        publicAction: publicPct,
        recommendation,
        velocity: lm.velocity,
        gameId: game.id,
      });
    }
  }

  return predictions.sort((a, b) => b.confidence - a.confidence);
}

export function CLVPredictor() {
  const [sport, setSport] = useState("NFL");

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const predictions = data ? derivePredictions(data.games) : [];

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="clv-predictor-loading">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium">Closing Line Value Predictor</span>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-16" />)}
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" data-testid="clv-predictor-error">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium">Closing Line Value Predictor</span>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load CLV data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="clv-predictor-container">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium">Closing Line Value Predictor</span>
          <Badge variant="outline">AI Forecasting</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-clv-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data?.meta?.dataSources && (
        <p className="text-xs text-muted-foreground" data-testid="text-clv-data-source">
          Data: {data.meta.dataSources.join(", ")}
        </p>
      )}

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center" data-testid="clv-predictor-empty">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No line movement data available for {sport}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {predictions.map(pred => (
            <Card
              key={pred.id}
              className={`${
                pred.confidence >= 80 && pred.direction !== "stable"
                  ? "border-primary/30 bg-primary/5"
                  : ""
              }`}
              data-testid={`card-clv-${pred.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline">{sport}</Badge>
                      <span className="font-medium" data-testid={`text-game-${pred.id}`}>{pred.game}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{pred.market}</p>
                      <Badge variant="secondary" className="text-xs">{pred.velocity}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-bold text-lg" data-testid={`text-current-line-${pred.id}`}>
                      {pred.currentLine}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground">Predicted Close</p>
                    <p className={`font-bold text-lg ${
                      pred.direction === "up" ? "text-green-500" :
                      pred.direction === "down" ? "text-red-500" : ""
                    }`} data-testid={`text-predicted-line-${pred.id}`}>
                      {pred.predictedLine}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground">Move</p>
                    <div className="flex items-center justify-center gap-1">
                      {pred.direction === "up" && <ArrowUp className="w-4 h-4 text-green-500" />}
                      {pred.direction === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                      <p className={`font-bold text-lg ${
                        pred.predictedMove > 0 ? "text-green-500" :
                        pred.predictedMove < 0 ? "text-red-500" : ""
                      }`} data-testid={`text-move-${pred.id}`}>
                        {pred.predictedMove > 0 ? "+" : ""}{pred.predictedMove}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-bold text-lg" data-testid={`text-clv-confidence-${pred.id}`}>{pred.confidence}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-muted/30 rounded-md">
                    <div className="flex justify-between gap-2 text-sm mb-1">
                      <span>Sharp Money</span>
                      <span className={pred.sharpAction >= 65 ? "text-green-500 font-medium" : ""}>
                        {pred.sharpAction}%
                      </span>
                    </div>
                    <Progress value={pred.sharpAction} className="h-2" />
                  </div>
                  <div className="p-3 bg-muted/30 rounded-md">
                    <div className="flex justify-between gap-2 text-sm mb-1">
                      <span>Public Money</span>
                      <span>{pred.publicAction}%</span>
                    </div>
                    <Progress value={pred.publicAction} className="h-2" />
                  </div>
                </div>

                <div className={`p-3 rounded-md flex items-center gap-2 ${
                  pred.recommendation.includes("STRONG") || pred.recommendation.includes("NOW")
                    ? "bg-green-500/10 text-green-500"
                    : pred.recommendation.includes("Wait")
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-muted/50 text-muted-foreground"
                }`} data-testid={`text-recommendation-${pred.id}`}>
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
      )}
    </div>
  );
}
