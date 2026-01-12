import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, TrendingUp, Zap, Star, Timer, Calendar } from "lucide-react";
import type { SportEvent, ParlayLeg } from "@shared/schema";
import { getGameTimeBucket, formatGameTime, getTimeUrgencyScore, type GameTimeBucket } from "@shared/schema";

interface TodaysBestBetsProps {
  events: SportEvent[];
  onAddLeg: (leg: Omit<ParlayLeg, "id">) => void;
}

interface BestBet {
  event: SportEvent;
  market: string;
  outcome: string;
  team?: string;
  odds: number;
  americanOdds: number;
  edge: number;
  confidence: "high" | "medium" | "low";
  reason: string;
  timeBucket: GameTimeBucket;
  timeDisplay: string;
  urgencyScore: number;
}

function getBucketLabel(bucket: GameTimeBucket): string {
  switch (bucket) {
    case "live": return "LIVE";
    case "starting_soon": return "Starting Soon";
    case "today": return "Today";
    case "tonight": return "Tonight";
    case "tomorrow": return "Tomorrow";
    case "upcoming": return "Upcoming";
  }
}

function getBucketColor(bucket: GameTimeBucket): string {
  switch (bucket) {
    case "live": return "bg-red-500";
    case "starting_soon": return "bg-orange-500";
    case "today": return "bg-green-500";
    case "tonight": return "bg-blue-500";
    case "tomorrow": return "bg-purple-500/80";
    case "upcoming": return "bg-muted";
  }
}

export function TodaysBestBets({ events, onAddLeg }: TodaysBestBetsProps) {
  const bestBets = useMemo(() => {
    const bets: BestBet[] = [];
    
    for (const event of events) {
      const timeBucket = getGameTimeBucket(event.startTime);
      const timeDisplay = formatGameTime(event.startTime);
      const urgencyScore = getTimeUrgencyScore(event.startTime);
      
      if (timeBucket === "upcoming" && urgencyScore < 0.5) continue;
      
      for (const market of event.markets) {
        for (const outcome of market.outcomes) {
          if (outcome.evAnalysis && outcome.evAnalysis.isPositiveEV && outcome.evAnalysis.edge > 0.02) {
            const confidence = outcome.evAnalysis.edge > 0.08 ? "high" : 
                             outcome.evAnalysis.edge > 0.04 ? "medium" : "low";
            
            let reason = "";
            if (outcome.bettingPercentages?.sharpSide) {
              reason = "Sharp money aligned";
            } else if (outcome.lineMovement?.direction === "steam") {
              reason = "Steam move detected";
            } else if (outcome.evAnalysis.edge > 0.06) {
              reason = "Strong +EV opportunity";
            } else {
              reason = "Model edge found";
            }
            
            bets.push({
              event,
              market: market.type,
              outcome: outcome.name,
              team: outcome.team,
              odds: outcome.decimalOdds,
              americanOdds: outcome.americanOdds,
              edge: outcome.evAnalysis.edge,
              confidence,
              reason,
              timeBucket,
              timeDisplay,
              urgencyScore,
            });
          }
        }
      }
    }
    
    return bets
      .sort((a, b) => {
        const timeDiff = b.urgencyScore - a.urgencyScore;
        if (Math.abs(timeDiff) > 0.2) return timeDiff;
        return b.edge - a.edge;
      })
      .slice(0, 6);
  }, [events]);

  const handleAddBet = (bet: BestBet) => {
    onAddLeg({
      eventId: bet.event.id,
      team: bet.team || `${bet.event.awayTeam} @ ${bet.event.homeTeam}`,
      opponent: bet.team === bet.event.homeTeam ? bet.event.awayTeam : bet.event.homeTeam,
      market: bet.market as any,
      outcome: bet.outcome,
      decimalOdds: bet.odds,
      americanOdds: bet.americanOdds,
    });
  };

  if (bestBets.length === 0) {
    return null;
  }

  const todayCount = bestBets.filter(b => 
    b.timeBucket === "today" || b.timeBucket === "tonight" || b.timeBucket === "starting_soon" || b.timeBucket === "live"
  ).length;

  return (
    <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Today's Best Bets
            {todayCount > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                {todayCount} Today
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            Algorithm focused on imminent games
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {bestBets.map((bet, index) => (
            <div
              key={`${bet.event.id}-${bet.outcome}-${index}`}
              className="relative rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getBucketColor(bet.timeBucket)} text-white text-xs`}>
                    {bet.timeBucket === "live" && <Zap className="h-3 w-3 mr-1" />}
                    {getBucketLabel(bet.timeBucket)}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {bet.timeDisplay}
                  </span>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    bet.confidence === "high" ? "border-green-500 text-green-500" :
                    bet.confidence === "medium" ? "border-yellow-500 text-yellow-500" :
                    "border-muted-foreground"
                  }
                >
                  {bet.confidence === "high" && <Star className="h-3 w-3 mr-1" />}
                  {(bet.edge * 100).toFixed(1)}% edge
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {bet.event.awayTeam} @ {bet.event.homeTeam}
                </p>
                <p className="font-medium text-sm">{bet.outcome}</p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">
                    {bet.americanOdds > 0 ? `+${bet.americanOdds}` : bet.americanOdds}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    {bet.reason}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAddBet(bet)}
                  data-testid={`button-add-bet-${index}`}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>

        {bestBets.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                <strong className="text-foreground">{bestBets.length} top opportunities</strong> found. 
                Games happening sooner get priority for the most accurate odds analysis.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
