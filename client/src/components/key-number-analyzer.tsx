import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash, AlertCircle, TrendingUp, Info } from "lucide-react";

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

const KEY_NUMBERS = {
  NFL: [3, 7, 10, 6, 4, 14, 17, 21],
  NBA: [5, 7, 8, 9, 10],
  MLB: [1.5],
  NHL: [1.5, 2.5],
};

function generateMockKeyNumberGames(): KeyNumberGame[] {
  const games: KeyNumberGame[] = [
    {
      id: "key-1",
      game: "Chiefs @ Bills",
      spread: -2.5,
      distanceFromKey: 0.5,
      keyNumber: 3,
      recommendation: "Buy half point to 3 if available (-120 max)",
      sport: "NFL",
      value: "high",
    },
    {
      id: "key-2",
      game: "Cowboys @ Eagles",
      spread: -7,
      distanceFromKey: 0,
      keyNumber: 7,
      recommendation: "ON key number - expect push frequency of ~9%",
      sport: "NFL",
      value: "high",
    },
    {
      id: "key-3",
      game: "49ers @ Seahawks",
      spread: -6.5,
      distanceFromKey: 0.5,
      keyNumber: 7,
      recommendation: "Consider buying to 7 for push protection",
      sport: "NFL",
      value: "medium",
    },
    {
      id: "key-4",
      game: "Packers @ Bears",
      spread: -3,
      distanceFromKey: 0,
      keyNumber: 3,
      recommendation: "Most important NFL key number - 15% of games land here",
      sport: "NFL",
      value: "high",
    },
    {
      id: "key-5",
      game: "Lakers @ Celtics",
      spread: -4.5,
      distanceFromKey: 0.5,
      keyNumber: 5,
      recommendation: "Near NBA key number of 5",
      sport: "NBA",
      value: "medium",
    },
  ];
  
  return games;
}

export function KeyNumberAnalyzer() {
  const [games] = useState<KeyNumberGame[]>(generateMockKeyNumberGames());

  const highValueCount = games.filter(g => g.value === "high").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-chart-2" />
            Key Number Analysis
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {highValueCount} High Value
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-xs">
          <div>
            <p className="font-medium mb-1">NFL Key Numbers</p>
            <div className="flex flex-wrap gap-1">
              {KEY_NUMBERS.NFL.map(n => (
                <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">NBA Key Numbers</p>
            <div className="flex flex-wrap gap-1">
              {KEY_NUMBERS.NBA.map(n => (
                <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
              ))}
            </div>
          </div>
        </div>

        {games.map((game) => (
          <div
            key={game.id}
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
                  <p className="font-medium text-sm">{game.game}</p>
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

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Key numbers are spreads where games frequently land
        </div>
      </CardContent>
    </Card>
  );
}
