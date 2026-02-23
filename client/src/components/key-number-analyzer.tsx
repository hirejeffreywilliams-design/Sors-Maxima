import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash, AlertCircle, Info } from "lucide-react";

const KEY_NUMBERS: Record<string, number[]> = {
  NFL: [3, 7, 10, 6, 4, 14, 17, 21],
  NBA: [5, 7, 8, 9, 10],
  MLB: [1.5],
  NHL: [1.5, 2.5],
};

interface KeyNumberGame {
  id: string;
  game: string;
  spread: number;
  distanceFromKey: number;
  keyNumber: number;
  recommendation: string;
  sport: string;
  value: "high" | "medium" | "low";
}

function deriveKeyNumberGames(games: any[], sport: string): KeyNumberGame[] {
  const keyNums = KEY_NUMBERS[sport] || KEY_NUMBERS.NFL;

  return games
    .filter((g: any) => g.consensus?.spread !== undefined && g.consensus.spread !== null)
    .map((g: any) => {
      const spread = g.consensus.spread;
      const absSpread = Math.abs(spread);

      let nearestKey = keyNums[0];
      let minDist = Math.abs(absSpread - keyNums[0]);
      for (const kn of keyNums) {
        const dist = Math.abs(absSpread - kn);
        if (dist < minDist) {
          minDist = dist;
          nearestKey = kn;
        }
      }

      const distance = Math.round(minDist * 10) / 10;

      let value: "high" | "medium" | "low" = "low";
      if (distance === 0) value = "high";
      else if (distance <= 0.5) value = "high";
      else if (distance <= 1.5) value = "medium";

      let recommendation = "";
      if (distance === 0) {
        recommendation = `ON key number ${nearestKey} - expect higher push frequency`;
      } else if (distance <= 0.5) {
        recommendation = `Buy half point to ${nearestKey} if available (-120 max)`;
      } else if (distance <= 1) {
        recommendation = `Consider buying to ${nearestKey} for push protection`;
      } else if (distance <= 1.5) {
        recommendation = `Near key number ${nearestKey} - monitor for movement`;
      } else {
        recommendation = `${distance} points from nearest key number (${nearestKey})`;
      }

      return {
        id: g.id,
        game: g.shortName,
        spread,
        distanceFromKey: distance,
        keyNumber: nearestKey,
        recommendation,
        sport,
        value,
      };
    })
    .sort((a: KeyNumberGame, b: KeyNumberGame) => a.distanceFromKey - b.distanceFromKey);
}

export function KeyNumberAnalyzer() {
  const [sport, setSport] = useState("NFL");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
  });

  const games = data?.games ? deriveKeyNumberGames(data.games, sport) : [];
  const highValueCount = games.filter(g => g.value === "high").length;
  const keyNums = KEY_NUMBERS[sport] || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-chart-2" />
            Key Number Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {games.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                {highValueCount} High Value
              </Badge>
            )}
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-keynumber-sport">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-xs">
          <div>
            <p className="font-medium mb-1">{sport} Key Numbers</p>
            <div className="flex flex-wrap gap-1">
              {keyNums.map(n => (
                <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
              ))}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3" data-testid="loading-keynumbers">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-destructive" data-testid="error-keynumbers">
            Failed to load game data. Please try again.
          </div>
        )}

        {!isLoading && !error && games.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground" data-testid="empty-keynumbers">
            No games with spread data available for {sport}.
          </div>
        )}

        {games.map((game) => (
          <div
            key={game.id}
            data-testid={`card-keynumber-${game.id}`}
            className={`p-3 rounded-lg border ${
              game.value === "high"
                ? "bg-chart-2/10 border-chart-2/30"
                : game.value === "medium"
                ? "bg-chart-3/10 border-chart-3/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {game.sport}
                  </Badge>
                  <p className="font-medium text-sm" data-testid={`text-game-${game.id}`}>{game.game}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">
                  {game.spread > 0 ? "+" : ""}{game.spread}
                </span>
                <Badge
                  variant={game.value === "high" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {game.value}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <p>{game.recommendation}</p>
            </div>
          </div>
        ))}

        {data?.meta?.dataSources && (
          <div className="pt-2 text-xs text-muted-foreground text-center" data-testid="text-datasource-keynumbers">
            Data: {data.meta.dataSources.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
