import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp, TrendingDown, Zap, AlertTriangle } from "lucide-react";

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
  bookmakers: { book: string; spread?: number; total?: number }[];
  lineMovement: LineMovement[];
  dataSource: string;
}

interface MarketSnapshot {
  games: GameData[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

function deriveSeverity(lm: LineMovement, uniqueLineCount: number): "high" | "medium" | "low" {
  if (lm.velocity === "steam" && uniqueLineCount >= 3) return "high";
  if (lm.velocity === "steam" || (lm.velocity === "fast" && uniqueLineCount >= 2)) return "medium";
  return "low";
}

function countUniqueLines(bookmakers: GameData["bookmakers"], market: string): number {
  const values = new Set<number>();
  for (const bk of bookmakers) {
    const val = market === "spread" ? bk.spread : bk.total;
    if (val !== undefined) values.add(val);
  }
  return values.size;
}

export function SteamMoveDetector() {
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

  const steamMoves = (data?.games ?? []).flatMap((game) =>
    game.lineMovement
      .filter((lm) => lm.velocity === "steam" || lm.velocity === "fast")
      .map((lm) => {
        const uniqueLines = countUniqueLines(game.bookmakers, lm.market);
        return {
          gameId: game.id,
          gameName: game.shortName,
          market: lm.market,
          opening: lm.opening,
          current: lm.current,
          movement: lm.movement,
          direction: lm.direction,
          velocity: lm.velocity,
          severity: deriveSeverity(lm, uniqueLines),
          uniqueLineCount: uniqueLines,
          bookCount: game.bookmakers.length,
          dataSource: game.dataSource,
        };
      })
  );

  const highSeverityCount = steamMoves.filter((m) => m.severity === "high").length;

  return (
    <Card data-testid="card-steam-move-detector">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Steam Move Detector
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="gap-1" data-testid="badge-steam-active">
              <Zap className="w-3 h-3" />
              {steamMoves.length} Active
            </Badge>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-28" data-testid="select-steam-sport">
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
          <div className="space-y-3" data-testid="loading-steam">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="error-steam">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Failed to load market data. Please try again.</p>
          </div>
        )}

        {!isLoading && !isError && steamMoves.length === 0 && (
          <div className="text-center py-6" data-testid="empty-steam">
            <Flame className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No steam moves detected for {sport}</p>
          </div>
        )}

        {!isLoading && !isError && steamMoves.map((move, idx) => (
          <div
            key={`${move.gameId}-${move.market}-${idx}`}
            data-testid={`card-steam-move-${move.gameId}-${move.market}`}
            className={`p-3 rounded-lg border ${
              move.severity === "high"
                ? "bg-orange-500/10 border-orange-500/30"
                : move.severity === "medium"
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-sm" data-testid={`text-steam-game-${move.gameId}`}>{move.gameName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {move.market} | {move.velocity} | {move.uniqueLineCount} different lines across {move.bookCount} books
                </p>
              </div>
              <Badge
                variant={move.severity === "high" ? "destructive" : "secondary"}
                className="text-xs capitalize"
                data-testid={`badge-severity-${move.gameId}-${move.market}`}
              >
                {move.severity}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono" data-testid={`text-opening-${move.gameId}-${move.market}`}>{move.opening}</span>
                {move.direction === "up" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : move.direction === "down" ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
                <span className="font-mono font-bold" data-testid={`text-current-${move.gameId}-${move.market}`}>{move.current}</span>
                <span className="text-xs text-muted-foreground">
                  ({move.movement > 0 ? "+" : ""}{move.movement})
                </span>
              </div>
            </div>
          </div>
        ))}

        {data?.meta && (
          <p className="text-xs text-muted-foreground text-center pt-2" data-testid="text-data-source-steam">
            Sources: {data.meta.dataSources.join(", ")} | {data.meta.gamesWithOdds}/{data.meta.totalGames} games with odds
          </p>
        )}
      </CardContent>
    </Card>
  );
}
