import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, Flame, Snowflake, Timer, Star, Check, Info,
  Clock, Tv, MapPin, ChevronDown, ChevronUp
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
  gameDate?: string;
  broadcast?: string;
  venue?: string;
}

function getMomentumColor(momentum: number) {
  if (momentum >= 65) return "from-green-500 to-emerald-500";
  if (momentum <= 35) return "from-red-500 to-rose-500";
  return "from-yellow-500 to-amber-500";
}

function getMomentumBarColor(momentum: number) {
  if (momentum >= 65) return "bg-green-500";
  if (momentum <= 35) return "bg-red-500";
  return "bg-yellow-500";
}

function getTrendIcon(momentum: string, side: string) {
  if (momentum === side) return <Flame className="w-4 h-4 text-orange-500" />;
  if (momentum !== "neutral" && momentum !== side) return <Snowflake className="w-4 h-4 text-blue-400" />;
  return null;
}

function formatGameTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Today ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function LiveGameCard({ game, isInSlip, handleAddTeamToSlip }: {
  game: MomentumGame;
  isInSlip: (id: string) => boolean;
  handleAddTeamToSlip: (game: MomentumGame, side: "home" | "away") => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-green-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="text-xs">{game.sport}</Badge>
          <span className="text-sm text-muted-foreground">
            {game.period ? `Q${game.period}` : ""}{game.clock ? ` • ${game.clock}` : ""}
          </span>
        </div>
        <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-500 border-red-500/30 text-xs">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <span className="font-semibold text-sm">{game.awayTeam}</span>
            {getTrendIcon(game.momentum, "away")}
          </div>
          <p className="text-3xl font-bold">{game.awayScore}</p>
          {game.awayRecord && <p className="text-xs text-muted-foreground">{game.awayRecord}</p>}
          <Button
            size="sm"
            variant={isInSlip(`live_${game.id}_away`) ? "secondary" : "outline"}
            className="text-xs h-7 px-2 mt-1"
            onClick={() => handleAddTeamToSlip(game, "away")}
            disabled={isInSlip(`live_${game.id}_away`)}
            data-testid={`button-add-live-away-${game.id}`}
          >
            {isInSlip(`live_${game.id}_away`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
            {isInSlip(`live_${game.id}_away`) ? "In Slip" : "Add"}
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground mb-1">Momentum</span>
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getMomentumColor(game.momentumScore)} flex items-center justify-center`}>
            <span className="text-white font-bold">{game.momentumScore}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">
            {game.momentum === "home" ? game.homeTeam.split(" ").pop() : game.momentum === "away" ? game.awayTeam.split(" ").pop() : "Even"}
          </span>
        </div>

        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <span className="font-semibold text-sm">{game.homeTeam}</span>
            {getTrendIcon(game.momentum, "home")}
          </div>
          <p className="text-3xl font-bold">{game.homeScore}</p>
          {game.homeRecord && <p className="text-xs text-muted-foreground">{game.homeRecord}</p>}
          <Button
            size="sm"
            variant={isInSlip(`live_${game.id}_home`) ? "secondary" : "outline"}
            className="text-xs h-7 px-2 mt-1"
            onClick={() => handleAddTeamToSlip(game, "home")}
            disabled={isInSlip(`live_${game.id}_home`)}
            data-testid={`button-add-live-home-${game.id}`}
          >
            {isInSlip(`live_${game.id}_home`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
            {isInSlip(`live_${game.id}_home`) ? "In Slip" : "Add"}
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{game.awayTeam.split(" ").pop()}</span>
          <span>Momentum Flow</span>
          <span>{game.homeTeam.split(" ").pop()}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getMomentumBarColor(game.momentumScore)} transition-all duration-500`}
            style={{ width: `${game.momentumScore}%` }}
          />
        </div>
      </div>

      {(game.spreadLine || game.totalLine) && (
        <div className="flex gap-2 flex-wrap">
          {game.spreadLine && <Badge variant="secondary" className="text-xs">Spread: {game.spreadLine}</Badge>}
          {game.totalLine && <Badge variant="secondary" className="text-xs">O/U: {game.totalLine}</Badge>}
        </div>
      )}
    </div>
  );
}

function PreGameCard({ game, isInSlip, handleAddTeamToSlip }: {
  game: MomentumGame;
  isInSlip: (id: string) => boolean;
  handleAddTeamToSlip: (game: MomentumGame, side: "home" | "away") => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/20 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">{game.sport}</Badge>
          <span className="font-medium text-sm truncate">
            {game.awayTeam} <span className="text-muted-foreground">@</span> {game.homeTeam}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {game.gameDate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatGameTime(game.gameDate)}
            </span>
          )}
          <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">Upcoming</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {game.awayRecord && <span className="text-xs text-muted-foreground">{game.awayTeam.split(" ").pop()}: {game.awayRecord}</span>}
        {game.homeRecord && <span className="text-xs text-muted-foreground">{game.homeTeam.split(" ").pop()}: {game.homeRecord}</span>}
        {game.spreadLine && <Badge variant="secondary" className="text-xs">Spread: {game.spreadLine}</Badge>}
        {game.totalLine && <Badge variant="secondary" className="text-xs">O/U: {game.totalLine}</Badge>}
        {game.broadcast && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Tv className="w-3 h-3" />{game.broadcast}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant={isInSlip(`live_${game.id}_away`) ? "secondary" : "ghost"}
          className="text-xs h-7 px-2"
          onClick={() => handleAddTeamToSlip(game, "away")}
          disabled={isInSlip(`live_${game.id}_away`)}
          data-testid={`button-add-pre-away-${game.id}`}
        >
          {isInSlip(`live_${game.id}_away`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
          {game.awayTeam.split(" ").pop()}
        </Button>
        <Button
          size="sm"
          variant={isInSlip(`live_${game.id}_home`) ? "secondary" : "ghost"}
          className="text-xs h-7 px-2"
          onClick={() => handleAddTeamToSlip(game, "home")}
          disabled={isInSlip(`live_${game.id}_home`)}
          data-testid={`button-add-pre-home-${game.id}`}
        >
          {isInSlip(`live_${game.id}_home`) ? <Check className="w-3 h-3 mr-1" /> : <Star className="w-3 h-3 mr-1" />}
          {game.homeTeam.split(" ").pop()}
        </Button>
      </div>
    </div>
  );
}

function FinalGameCard({ game }: { game: MomentumGame }) {
  return (
    <div className="p-3 rounded-lg bg-muted/10 border border-dashed opacity-70">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">{game.sport}</Badge>
          <span className="text-sm truncate">
            {game.awayTeam} <span className="font-bold">{game.awayScore}</span>
            <span className="text-muted-foreground mx-1">@</span>
            {game.homeTeam} <span className="font-bold">{game.homeScore}</span>
          </span>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0 ml-2">Final</Badge>
      </div>
    </div>
  );
}

export function MomentumTracker() {
  const { data: games, isLoading } = useQuery<MomentumGame[]>({
    queryKey: ["/api/live/momentum"],
    refetchInterval: 30000,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showAll, setShowAll] = useState(false);
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
      toast({ title: "Added to Slip", description: `${team} moneyline added` });
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
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const allGames = games || [];
  const liveGames = allGames.filter(g => g.status === "live" || g.status === "halftime");
  const preGames = allGames.filter(g => g.status === "pre");
  const finalGames = allGames.filter(g => g.status === "final");

  const visiblePre = showAll ? preGames : preGames.slice(0, 5);
  const visibleFinal = showAll ? finalGames : finalGames.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
              <Activity className="w-5 h-5 text-green-500" />
              Live Game Momentum
              <QuantumBadge />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time swing detection — signals when a game is shifting before the line moves. Feeds live cashout and hedge decisions.
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-xs shrink-0">
            <Timer className="w-3 h-3" />
            Updated {lastUpdate.toLocaleTimeString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {liveGames.length} live · {preGames.length} upcoming · {finalGames.length} completed · Scores and odds updated in real time
          </p>
        </div>

        {liveGames.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              In Progress ({liveGames.length})
            </h3>
            {liveGames.map(game => (
              <LiveGameCard
                key={game.id}
                game={game}
                isInSlip={isInSlip}
                handleAddTeamToSlip={handleAddTeamToSlip}
              />
            ))}
          </div>
        )}

        {preGames.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming ({preGames.length})
            </h3>
            {visiblePre.map(game => (
              <PreGameCard
                key={game.id}
                game={game}
                isInSlip={isInSlip}
                handleAddTeamToSlip={handleAddTeamToSlip}
              />
            ))}
            {preGames.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAll(!showAll)}
                data-testid="button-toggle-all-games"
              >
                {showAll ? <><ChevronUp className="w-3 h-3 mr-1" />Show less</> : <><ChevronDown className="w-3 h-3 mr-1" />Show {preGames.length - 5} more</>}
              </Button>
            )}
          </div>
        )}

        {finalGames.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent Finals</h3>
            {visibleFinal.map(game => (
              <FinalGameCard key={game.id} game={game} />
            ))}
          </div>
        )}

        {allGames.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No games found</p>
            <p className="text-sm mt-1">Live data will load shortly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
