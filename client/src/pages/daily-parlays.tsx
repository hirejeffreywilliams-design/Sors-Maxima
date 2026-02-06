import { useState, useEffect } from "react";
import { DailyParlayGenerator } from "@/components/daily-parlay-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, Clock, Target, Users } from "lucide-react";

const FREE_PICK = {
  sport: "NBA",
  event: "Los Angeles Lakers vs Boston Celtics",
  pickType: "Total",
  pickValue: "Over 218.5",
  odds: "-110",
  confidence: 87,
  ev: "+3.2%",
};

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

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Power Parlays</h1>
            <p className="text-sm text-muted-foreground">
              AI-generated 12-leg parlays across all sports
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
              Today's Free Pick
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              Available to all users
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" data-testid="text-free-pick-sport">{FREE_PICK.sport}</Badge>
                  <span className="text-sm font-medium" data-testid="text-free-pick-event">{FREE_PICK.event}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold" data-testid="text-free-pick-value">
                    {FREE_PICK.pickType}: {FREE_PICK.pickValue}
                  </span>
                  <Badge variant="outline" data-testid="text-free-pick-odds">{FREE_PICK.odds}</Badge>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-sm">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="font-medium" data-testid="text-free-pick-confidence">{FREE_PICK.confidence}% confidence</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="font-medium" data-testid="text-free-pick-ev">EV: {FREE_PICK.ev}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Next pick in</span>
                <span className="font-mono text-sm font-medium" data-testid="text-free-pick-countdown">{countdown}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DailyParlayGenerator bankroll={bankroll} />
      </div>
    </div>
  );
}
