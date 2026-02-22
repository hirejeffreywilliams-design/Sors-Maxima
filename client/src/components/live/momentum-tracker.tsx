import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, Zap, TrendingUp, TrendingDown, Clock,
  Flame, Snowflake, Timer, Atom, Star, Check, AlertTriangle, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";

interface MomentumGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: "live" | "halftime" | "final" | "pre";
  momentum: "home" | "away" | "neutral";
  momentumScore: number;
  recentPlays: string[];
  spreadLine?: string;
  totalLine?: number;
  homeRecord?: string;
  awayRecord?: string;
}

function getMomentumColor(momentum: number) {
  if (momentum >= 65) return "from-green-500 to-emerald-500";
  if (momentum <= 35) return "from-red-500 to-rose-500";
  return "from-yellow-500 to-amber-500";
}

function getTrendIcon(momentum: string, side: string, momentumTeam: string) {
  if (momentumTeam === side) return <Flame className="w-4 h-4 text-orange-500" />;
  if (momentumTeam !== "neutral" && momentumTeam !== side) return <Snowflake className="w-4 h-4 text-blue-500" />;
  return null;
}

export function MomentumTracker() {
  const { data: games, isLoading } = useQuery<MomentumGame[]>({
    queryKey: ["/api/live/momentum"],
    refetchInterval: 30000,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  useEffect(() => {
    if (games) setLastUpdate(new Date());
  }, [games]);

  const handleAddTeamToSlip = (game: MomentumGame, side: "home" | "away") => {
    const team = side === "home" ? game.homeTeam : game.awayTeam;
    const opponent = side === "home" ? game.awayTeam : game.homeTeam;
    const legId = `live_${game.id}_${side}`;

    const slipLeg: ParlaySlipLeg = {
      id: legId,
      team,
      opponent,
      market: "moneyline",
      outcome: `${team} ML`,
      decimalOdds: 1.91,
      americanOdds: -110,
      addedFrom: "Live Center",
      addedAt: new Date().toISOString(),
      sport: game.sport,
    };
    const added = addLeg(slipLeg);
    if (added) {
      toast({ title: "Added to Slip", description: `${team} moneyline added from live game` });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-green-500" />
            Live Momentum Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const liveGames = (games || []).filter(g => g.status === "live" || g.status === "halftime");
  const allGames = games || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Activity className="w-5 h-5 text-green-500" />
            Live Momentum Tracker
            <QuantumBadge />
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Timer className="w-3 h-3" />
            Updated {lastUpdate.toLocaleTimeString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Track which team has momentum in live games to find optimal betting opportunities
        </p>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md mb-3">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Momentum derived from ESPN live scores. Data source: ESPN | {allGames.length} games loaded
          </p>
        </div>

        {liveGames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No live games right now</p>
            <p className="text-sm mt-1">{allGames.length > 0 ? `${allGames.length} games scheduled/completed today` : "Check back during game times"}</p>
          </div>
        ) : (
          liveGames.map((game) => (
            <div key={game.id} className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge>{game.sport}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {game.period ? `Period ${game.period}` : ""} {game.clock ? `• ${game.clock}` : ""}
                  </span>
                </div>
                <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-500 border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold">{game.awayTeam}</span>
                    {getTrendIcon(game.momentum, "away", game.momentum)}
                  </div>
                  <p className="text-3xl font-bold">{game.awayScore}</p>
                  {game.awayRecord && <p className="text-xs text-muted-foreground">{game.awayRecord}</p>}
                  <div>
                    <Button
                      size="sm"
                      variant={isInSlip(`live_${game.id}_away`) ? "secondary" : "outline"}
                      className="text-xs h-7 px-2 mt-1"
                      onClick={() => handleAddTeamToSlip(game, "away")}
                      disabled={isInSlip(`live_${game.id}_away`)}
                      data-testid={`button-add-live-away-${game.id}`}
                    >
                      {isInSlip(`live_${game.id}_away`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                      {isInSlip(`live_${game.id}_away`) ? "In Slip" : "Add to Slip"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-1">Momentum</span>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getMomentumColor(game.momentumScore)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{game.momentumScore}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {game.momentum === "home" ? game.homeTeam : game.momentum === "away" ? game.awayTeam : "Even"}
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold">{game.homeTeam}</span>
                    {getTrendIcon(game.momentum, "home", game.momentum)}
                  </div>
                  <p className="text-3xl font-bold">{game.homeScore}</p>
                  {game.homeRecord && <p className="text-xs text-muted-foreground">{game.homeRecord}</p>}
                  <div>
                    <Button
                      size="sm"
                      variant={isInSlip(`live_${game.id}_home`) ? "secondary" : "outline"}
                      className="text-xs h-7 px-2 mt-1"
                      onClick={() => handleAddTeamToSlip(game, "home")}
                      disabled={isInSlip(`live_${game.id}_home`)}
                      data-testid={`button-add-live-home-${game.id}`}
                    >
                      {isInSlip(`live_${game.id}_home`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                      {isInSlip(`live_${game.id}_home`) ? "In Slip" : "Add to Slip"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{game.awayTeam}</span>
                  <span>Momentum Flow</span>
                  <span>{game.homeTeam}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getMomentumColor(game.momentumScore)} transition-all duration-500`}
                    style={{ width: `${game.momentumScore}%` }}
                  />
                </div>
              </div>

              {(game.spreadLine || game.totalLine) && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {game.spreadLine && <Badge variant="secondary">Spread: {game.spreadLine}</Badge>}
                  {game.totalLine && <Badge variant="secondary">O/U: {game.totalLine}</Badge>}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
