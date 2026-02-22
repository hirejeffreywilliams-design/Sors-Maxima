import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DailyParlayGenerator } from "@/components/daily-parlay-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Clock, Target, Users, AlertCircle } from "lucide-react";

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export default function DailyParlays() {
  const [bankroll, setBankroll] = useState(1000);
  const countdown = useCountdown();

  const { data: liveGames, isLoading: gamesLoading } = useQuery<any[]>({
    queryKey: ["/api/live-games"],
    staleTime: 60 * 1000,
  });

  const todaysGames = liveGames?.filter((g: any) => g.status === "scheduled" || g.status === "in_progress") || [];
  const firstGame = todaysGames[0];

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">Daily Parlays</h1>
            <p className="text-sm text-muted-foreground">
              Generated from today's real ESPN game data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="bankroll" className="whitespace-nowrap text-sm">Bankroll:</Label>
            <div className="relative w-28">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bankroll"
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="pl-7"
                min={100}
                step={100}
                data-testid="input-bankroll"
              />
            </div>
          </div>
        </header>

        <Card data-testid="card-free-pick">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Today's Featured Game
              <Badge variant="secondary" className="text-xs font-normal">ESPN Data</Badge>
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              Available to all users
            </Badge>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading today's games from ESPN...</span>
              </div>
            ) : firstGame ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid="text-free-pick-sport">{firstGame.sport}</Badge>
                    <span className="text-sm font-medium" data-testid="text-free-pick-event">
                      {firstGame.awayTeam} @ {firstGame.homeTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {firstGame.odds && (
                      <>
                        <span className="font-semibold" data-testid="text-free-pick-value">
                          Total: O/U {firstGame.odds.total}
                        </span>
                        <Badge variant="outline" data-testid="text-free-pick-odds">
                          Spread: {firstGame.odds.spread > 0 ? "+" : ""}{firstGame.odds.spread}
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {firstGame.homeRecord && (
                      <span className="text-sm text-muted-foreground" data-testid="text-free-pick-records">
                        {firstGame.homeTeam} ({firstGame.homeRecord}) vs {firstGame.awayTeam} ({firstGame.awayRecord})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Refreshes in</span>
                  <span className="font-mono text-sm font-medium" data-testid="text-free-pick-countdown">{countdown}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No games scheduled right now. Check back when games are on the schedule.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <DailyParlayGenerator bankroll={bankroll} />
      </div>
    </div>
  );
}
