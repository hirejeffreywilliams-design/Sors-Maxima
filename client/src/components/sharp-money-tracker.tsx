import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Eye, Zap, AlertTriangle, ArrowRightLeft } from "lucide-react";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"] as const;

interface LineMovement {
  market: string;
  opening: number;
  current: number;
  movement: number;
  direction: "up" | "down" | "stable";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
}

interface GameData {
  id: string;
  shortName: string;
  homeTeam: { name: string; abbreviation: string; record: string };
  awayTeam: { name: string; abbreviation: string; record: string };
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number };
  bookmakers: { book: string; homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number }[];
  lineMovement: LineMovement[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: string };
  dataSource: string;
}

interface MarketSnapshot {
  games: GameData[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

function deriveSharpIndicator(lm: LineMovement, bookmakerCount: number): "strong" | "moderate" | "weak" {
  const absMov = Math.abs(lm.movement);
  if (lm.sharpAction && (lm.velocity === "steam" || lm.velocity === "fast") && bookmakerCount >= 3) return "strong";
  if (lm.sharpAction || lm.velocity === "fast") return "moderate";
  if (absMov > 0.5) return "weak";
  return "weak";
}

function isReverseLineMove(lm: LineMovement): boolean {
  return lm.sharpAction && lm.velocity !== "slow";
}

export function SharpMoneyTracker() {
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, isError } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const sharpSignals = (data?.games ?? []).flatMap((game) =>
    game.lineMovement
      .filter((lm) => lm.sharpAction || lm.velocity === "fast" || lm.velocity === "steam" || Math.abs(lm.movement) > 0.5)
      .map((lm) => ({
        gameId: game.id,
        gameName: game.shortName,
        market: lm.market,
        opening: lm.opening,
        current: lm.current,
        movement: lm.movement,
        direction: lm.direction,
        velocity: lm.velocity,
        sharpAction: lm.sharpAction,
        indicator: deriveSharpIndicator(lm, game.bookmakers.length),
        reverseMove: isReverseLineMove(lm),
        bookmakerCount: game.bookmakers.length,
        dataSource: game.dataSource,
      }))
  );

  const strongSignals = sharpSignals.filter((s) => s.indicator === "strong").length;

  return (
    <Card data-testid="card-sharp-money-tracker">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-chart-1" />
            Sors Signal Tracker™
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1" data-testid="badge-strong-signals">
              <Zap className="w-3 h-3" />
              {strongSignals} Strong
            </Badge>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-28" data-testid="select-sharp-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" data-testid="loading-sharp">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="error-sharp">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Failed to load market data. Please try again.</p>
          </div>
        )}

        {!isLoading && !isError && sharpSignals.length === 0 && (
          <div className="text-center py-6" data-testid="empty-sharp">
            <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No Sors signals detected for {sport}</p>
          </div>
        )}

        {!isLoading && !isError && sharpSignals.map((signal, idx) => (
          <div
            key={`${signal.gameId}-${signal.market}-${idx}`}
            data-testid={`card-sharp-signal-${signal.gameId}-${signal.market}`}
            className={`p-3 rounded-lg border ${
              signal.indicator === "strong"
                ? "bg-chart-1/10 border-chart-1/30"
                : signal.indicator === "moderate"
                ? "bg-chart-3/10 border-chart-3/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-sm" data-testid={`text-game-name-${signal.gameId}`}>{signal.gameName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {signal.market} | {signal.velocity} velocity | {signal.bookmakerCount} books
                </p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {signal.reverseMove && (
                  <Badge variant="destructive" className="text-xs">
                    <ArrowRightLeft className="w-3 h-3 mr-1" />
                    Reverse
                  </Badge>
                )}
                <Badge
                  variant={signal.indicator === "strong" ? "default" : "secondary"}
                  className="text-xs capitalize"
                  data-testid={`badge-indicator-${signal.gameId}-${signal.market}`}
                >
                  {signal.indicator}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                {signal.direction === "down" ? (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                ) : signal.direction === "up" ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="font-mono" data-testid={`text-line-movement-${signal.gameId}-${signal.market}`}>
                  {signal.opening} {"\u2192"} {signal.current}
                </span>
              </div>
              <span className="text-muted-foreground">
                ({signal.movement > 0 ? "+" : ""}{signal.movement})
              </span>
              {signal.sharpAction && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  Sors Signal™
                </Badge>
              )}
            </div>
          </div>
        ))}

        {data?.meta && (
          <p className="text-xs text-muted-foreground text-center pt-2" data-testid="text-data-source-sharp">
            Sources: {data.meta.dataSources.join(", ")} | {data.meta.gamesWithOdds}/{data.meta.totalGames} games with odds
          </p>
        )}
      </CardContent>
    </Card>
  );
}
