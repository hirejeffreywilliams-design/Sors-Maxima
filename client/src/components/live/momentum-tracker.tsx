import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, Zap, TrendingUp, TrendingDown, Clock,
  Flame, Snowflake, Timer, Atom, Star, Check
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";

interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  timeRemaining: string;
  momentum: number;
  momentumTeam: "home" | "away" | "neutral";
  recentEvents: string[];
  homeML: number;
  awayML: number;
  liveTotal: number;
  trend: "home_hot" | "away_hot" | "neutral";
}

const mockLiveGames: LiveGame[] = [
  {
    id: "1",
    sport: "NBA",
    homeTeam: "Lakers",
    awayTeam: "Celtics",
    homeScore: 78,
    awayScore: 72,
    period: "3rd",
    timeRemaining: "4:32",
    momentum: 72,
    momentumTeam: "home",
    recentEvents: ["LAL 3-pointer", "LAL steal", "LAL fast break dunk"],
    homeML: -180,
    awayML: +155,
    liveTotal: 218.5,
    trend: "home_hot",
  },
  {
    id: "2",
    sport: "NFL",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    homeScore: 21,
    awayScore: 24,
    period: "3rd",
    timeRemaining: "8:15",
    momentum: 35,
    momentumTeam: "away",
    recentEvents: ["BUF touchdown", "KC turnover", "BUF field goal"],
    homeML: +130,
    awayML: -150,
    liveTotal: 52.5,
    trend: "away_hot",
  },
  {
    id: "3",
    sport: "NHL",
    homeTeam: "Rangers",
    awayTeam: "Bruins",
    homeScore: 2,
    awayScore: 2,
    period: "2nd",
    timeRemaining: "12:45",
    momentum: 50,
    momentumTeam: "neutral",
    recentEvents: ["Even play", "Rangers power play", "Bruins penalty killed"],
    homeML: -105,
    awayML: -105,
    liveTotal: 5.5,
    trend: "neutral",
  },
];

function getMomentumColor(momentum: number) {
  if (momentum >= 65) return "from-green-500 to-emerald-500";
  if (momentum <= 35) return "from-red-500 to-rose-500";
  return "from-yellow-500 to-amber-500";
}

function getTrendIcon(trend: string, team: string) {
  if (trend === `${team}_hot`) return <Flame className="w-4 h-4 text-orange-500" />;
  if (trend !== "neutral" && trend !== `${team}_hot`) return <Snowflake className="w-4 h-4 text-blue-500" />;
  return null;
}

export function MomentumTracker() {
  const [games, setGames] = useState<LiveGame[]>(mockLiveGames);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const handleAddTeamToSlip = (game: LiveGame, side: "home" | "away") => {
    const team = side === "home" ? game.homeTeam : game.awayTeam;
    const opponent = side === "home" ? game.awayTeam : game.homeTeam;
    const ml = side === "home" ? game.homeML : game.awayML;
    const decimalOdds = ml > 0 ? 1 + (ml / 100) : 1 + (100 / Math.abs(ml));
    const legId = `live_${game.id}_${side}`;

    const slipLeg: ParlaySlipLeg = {
      id: legId,
      team,
      opponent,
      market: "moneyline",
      outcome: `${team} ML`,
      decimalOdds,
      americanOdds: ml,
      addedFrom: "Live Center",
      addedAt: new Date().toISOString(),
      sport: game.sport,
    };
    const added = addLeg(slipLeg);
    if (added) {
      toast({ title: "Added to Slip", description: `${team} moneyline added from live game` });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

        {games.map((game) => (
          <div key={game.id} className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge>{game.sport}</Badge>
                <span className="text-sm text-muted-foreground">
                  {game.period} • {game.timeRemaining}
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
                  {getTrendIcon(game.trend, "away")}
                </div>
                <p className="text-3xl font-bold">{game.awayScore}</p>
                <Badge variant="outline">{game.awayML > 0 ? "+" : ""}{game.awayML}</Badge>
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
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getMomentumColor(game.momentum)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{game.momentum}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {game.momentumTeam === "home" ? game.homeTeam : game.momentumTeam === "away" ? game.awayTeam : "Even"}
                </span>
              </div>

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-bold">{game.homeTeam}</span>
                  {getTrendIcon(game.trend, "home")}
                </div>
                <p className="text-3xl font-bold">{game.homeScore}</p>
                <Badge variant="outline">{game.homeML > 0 ? "+" : ""}{game.homeML}</Badge>
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
                  className={`h-full bg-gradient-to-r ${getMomentumColor(game.momentum)} transition-all duration-500`}
                  style={{ width: `${game.momentum}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Recent Events</p>
              <div className="flex gap-1 flex-wrap">
                {game.recentEvents.map((event, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
