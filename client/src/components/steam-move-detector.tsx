import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Clock, TrendingUp, TrendingDown, Bell, Zap, AlertTriangle } from "lucide-react";

interface SteamMove {
  id: string;
  game: string;
  market: string;
  side: string;
  originalLine: number;
  newLine: number;
  booksAffected: number;
  severity: "high" | "medium" | "low";
  direction: "up" | "down";
  timeAgo: string;
  sport: string;
}

function generateMockSteamMoves(): SteamMove[] {
  const moves: SteamMove[] = [
    {
      id: "steam-1",
      game: "Chiefs @ Bills",
      market: "spread",
      side: "Chiefs",
      originalLine: -3.5,
      newLine: -5,
      booksAffected: 6,
      severity: "high",
      direction: "down",
      timeAgo: "2 min ago",
      sport: "NFL",
    },
    {
      id: "steam-2",
      game: "Chiefs @ Bills",
      market: "total",
      side: "Over",
      originalLine: 48.5,
      newLine: 50,
      booksAffected: 5,
      severity: "high",
      direction: "up",
      timeAgo: "5 min ago",
      sport: "NFL",
    },
    {
      id: "steam-3",
      game: "Warriors @ Bucks",
      market: "moneyline",
      side: "Warriors",
      originalLine: 145,
      newLine: 130,
      booksAffected: 4,
      severity: "medium",
      direction: "down",
      timeAgo: "12 min ago",
      sport: "NBA",
    },
    {
      id: "steam-4",
      game: "Yankees @ Dodgers",
      market: "spread",
      side: "Dodgers",
      originalLine: -1.5,
      newLine: -1.5,
      booksAffected: 3,
      severity: "low",
      direction: "down",
      timeAgo: "18 min ago",
      sport: "MLB",
    },
  ];
  
  return moves;
}

export function SteamMoveDetector() {
  const [steamMoves, setSteamMoves] = useState<SteamMove[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  useEffect(() => {
    setSteamMoves(generateMockSteamMoves());
  }, []);

  const highSeverityCount = steamMoves.filter(m => m.severity === "high").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Steam Move Detector
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <Zap className="w-3 h-3" />
              {highSeverityCount} Active
            </Badge>
            <Button
              variant={alertsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="gap-1"
              data-testid="button-toggle-steam-alerts"
            >
              <Bell className="w-3 h-3" />
              {alertsEnabled ? "Alerts On" : "Alerts Off"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-steam">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        {steamMoves.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No steam moves detected in the last hour
          </p>
        ) : (
          steamMoves.map((move) => (
            <div
              key={move.id}
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {move.sport}
                    </Badge>
                    <p className="font-medium text-sm">{move.game}</p>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {move.market} • {move.side}
                  </p>
                </div>
                <Badge
                  variant={move.severity === "high" ? "destructive" : "secondary"}
                  className="text-xs capitalize"
                >
                  {move.severity}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{move.originalLine}</span>
                  {move.direction === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-mono font-bold">{move.newLine}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{move.booksAffected} books</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {move.timeAgo}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Steam moves occur when 3+ sportsbooks move lines simultaneously
        </div>
      </CardContent>
    </Card>
  );
}
