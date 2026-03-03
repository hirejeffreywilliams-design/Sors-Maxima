import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Target, Zap, AlertCircle, Database } from "lucide-react";

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
  venue?: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  bookmakers: { book: string; homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number }[];
  lineMovement: LineMovementData[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: string; hasArbitrage: boolean };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface SharpPickDerived {
  id: string;
  game: string;
  pick: string;
  odds: number | undefined;
  confidence: number;
  sharpIndicators: string[];
  market: string;
  movement: LineMovementData;
  bookmakerCount: number;
  homeEV: number;
  awayEV: number;
  valueSide: string;
  grade: "A" | "B" | "C";
}

function deriveSharpPicks(games: MarketGame[]): SharpPickDerived[] {
  const picks: SharpPickDerived[] = [];

  for (const game of games) {
    for (const lm of game.lineMovement) {
      if (!lm.sharpAction && lm.velocity !== "steam" && lm.velocity !== "fast") continue;

      const indicators: string[] = [];
      let confidence = 50;

      if (lm.sharpAction) {
        indicators.push("Sharp action detected");
        confidence += 15;
      }
      if (lm.velocity === "steam") {
        indicators.push("Steam move");
        confidence += 20;
      } else if (lm.velocity === "fast") {
        indicators.push("Fast movement");
        confidence += 10;
      }

      if (game.edgeAnalysis.valueSide && game.edgeAnalysis.valueSide !== "none") {
        indicators.push(`Value on ${game.edgeAnalysis.valueSide === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}`);
        confidence += 10;
      }

      if (game.bookmakers.length >= 5) {
        indicators.push(`${game.bookmakers.length} books tracked`);
        confidence += 5;
      }

      confidence = Math.min(confidence, 95);

      let pick = "";
      let odds: number | undefined;

      if (lm.market === "spread") {
        if (lm.direction === "down") {
          pick = `${game.homeTeam.abbreviation} ${lm.current}`;
          odds = game.consensus.homeMoneyline;
        } else {
          pick = `${game.awayTeam.abbreviation} ${-lm.current}`;
          odds = game.consensus.awayMoneyline;
        }
      } else if (lm.market === "total") {
        if (lm.direction === "up") {
          pick = `Over ${lm.current}`;
        } else {
          pick = `Under ${lm.current}`;
        }
        odds = -110;
      }

      if (game.edgeAnalysis.valueSide === "home" && lm.market === "spread") {
        pick = `${game.homeTeam.abbreviation} ${lm.current}`;
        odds = game.consensus.homeMoneyline;
      } else if (game.edgeAnalysis.valueSide === "away" && lm.market === "spread") {
        pick = `${game.awayTeam.abbreviation} ${-lm.current}`;
        odds = game.consensus.awayMoneyline;
      }

      // Align grade thresholds with platform-wide pick card grades.
      // Sharp consensus confidence runs 50–95; map to same A/B/C tiers proportionally.
      const grade: SharpPickDerived["grade"] = confidence >= 85 ? "A" : confidence >= 70 ? "B" : "C";

      picks.push({
        id: `${game.id}-${lm.market}`,
        game: game.shortName,
        pick,
        odds,
        confidence,
        sharpIndicators: indicators,
        market: lm.market,
        movement: lm,
        bookmakerCount: game.bookmakers.length,
        homeEV: game.edgeAnalysis.homeEV,
        awayEV: game.edgeAnalysis.awayEV,
        valueSide: game.edgeAnalysis.valueSide || "none",
        grade,
      });
    }
  }

  return picks.sort((a, b) => b.confidence - a.confidence);
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A": return "bg-green-500 text-white";
    case "B": return "bg-green-400 text-white";
    case "C": return "bg-yellow-500 text-black";
    default: return "bg-muted";
  }
}

export function SharpConsensus() {
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const picks = useMemo(() => {
    if (!data?.games) return [];
    return deriveSharpPicks(data.games);
  }, [data]);

  return (
    <div className="space-y-4" data-testid="sharp-consensus">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">Sharp Consensus</span>
          <Badge variant="outline" className="gap-1">
            <Zap className="w-3 h-3" />
            Pro Intel
          </Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-sharp-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Failed to load sharp consensus data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && picks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-sharp-picks">
              No sharp action detected for {sport} games right now.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {picks.map(pick => (
          <Card
            key={pick.id}
            className={pick.confidence >= 75 ? "border-green-500/30 bg-green-500/5" : ""}
            data-testid={`card-sharp-${pick.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge>{sport}</Badge>
                    <span className="font-medium" data-testid={`text-game-${pick.id}`}>{pick.game}</span>
                    <Badge className={getGradeColor(pick.grade)}>Grade: {pick.grade}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold" data-testid={`text-pick-${pick.id}`}>{pick.pick}</span>
                    {pick.odds !== undefined && (
                      <Badge variant="outline">{pick.odds > 0 ? "+" : ""}{pick.odds}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className={`text-2xl font-bold ${pick.confidence >= 75 ? "text-green-500" : ""}`} data-testid={`text-confidence-${pick.id}`}>
                    {pick.confidence}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sharp Confidence</span>
                    <span className={pick.confidence >= 70 ? "text-green-500 font-medium" : ""}>
                      {pick.confidence}%
                    </span>
                  </div>
                  <Progress value={pick.confidence} className="h-2" />
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Line Movement</span>
                    <span className="capitalize">{pick.movement.velocity}</span>
                  </div>
                  <Progress value={pick.movement.velocity === "steam" ? 100 : pick.movement.velocity === "fast" ? 75 : pick.movement.velocity === "moderate" ? 50 : 25} className="h-2" />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Sharp Indicators ({pick.sharpIndicators.length})</p>
                <div className="flex flex-wrap gap-2">
                  {pick.sharpIndicators.map((indicator, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Market</p>
                  <p className="font-bold capitalize">{pick.market}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Movement</p>
                  <p className="font-bold">
                    {pick.movement.opening} <TrendingUp className="w-3 h-3 inline" /> {pick.movement.current}
                  </p>
                </div>
              </div>

              {pick.valueSide !== "none" && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <p className="text-sm">
                      EV Analysis: Home {pick.homeEV > 0 ? "+" : ""}{pick.homeEV.toFixed(2)} | Away {pick.awayEV > 0 ? "+" : ""}{pick.awayEV.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-data-source">
          <Database className="w-3 h-3" />
          <span>Data: {data.meta.dataSources.join(", ")} | {data.meta.bookmakerCount} bookmakers | Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
