import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSEO } from "@/hooks/use-seo";
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronUp, Clock,
  AlertTriangle, Check, TrendingUp, Activity, Heart
} from "lucide-react";

interface MarketProp {
  market: string;
  marketLabel: string;
  line: number;
  overOdds: number;
  underOdds: number;
  overImpliedProb: number;
  underImpliedProb: number;
  recommendation: "over" | "under" | "push";
  confidence: number;
  reasoning: string;
  seasonAvg: number | null;
  edge: number;
  bookmaker: string;
  bestOver?: { bookmaker: string; odds: number };
  bestUnder?: { bookmaker: string; odds: number };
  consensusLine?: number;
  allBookmakers?: { bookmaker: string; overOdds: number; underOdds: number; line: number }[];
  dataSource: string;
}

interface GamePlayer {
  playerName: string;
  team?: string;
  position?: string;
  injury: { status: string; details: string } | null;
  leaderStats: { category: string; value: string; team: string }[];
  markets: MarketProp[];
  hasOddsData: boolean;
}

interface GameData {
  gameId: string;
  gameName: string;
  shortName: string;
  gameTime: string;
  status: { state: string; detail: string };
  homeTeam: { name: string; abbreviation: string; record: string; logo?: string };
  awayTeam: { name: string; abbreviation: string; record: string; logo?: string };
  players: GamePlayer[];
  totalProps: number;
  dataSource: string;
}

interface PropsResponse {
  games: GameData[];
  sport: string;
  totalGames: number;
  totalProps: number;
  dataSource: string;
  generatedAt: string;
}

const SPORT_TABS = ["NBA", "NFL", "NHL", "MLB", "NCAAB", "NCAAF"];

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function PropCard({ prop, playerName, sport, addLeg, overInSlip, underInSlip }: {
  prop: MarketProp;
  playerName: string;
  sport: string;
  addLeg: (leg: any) => boolean;
  overInSlip: boolean;
  underInSlip: boolean;
}) {
  const [showBooks, setShowBooks] = useState(false);

  const handleAdd = (side: "over" | "under") => {
    const odds = side === "over" ? prop.overOdds : prop.underOdds;
    const decOdds = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
    addLeg({
      id: `prop-${playerName}-${prop.market}-${side}`.replace(/\s+/g, "-").toLowerCase(),
      team: playerName,
      opponent: `${prop.marketLabel} ${prop.line}`,
      market: "player_prop" as any,
      outcome: `${playerName} ${side === "over" ? "Over" : "Under"} ${prop.line} ${prop.marketLabel}`,
      decimalOdds: decOdds,
      americanOdds: odds,
      addedFrom: "Player Props Analyzer",
      addedAt: new Date().toISOString(),
      sport,
      confidence: prop.confidence,
      evPercent: prop.edge,
      reasoning: prop.reasoning,
    });
  };

  const isOver = prop.recommendation === "over";
  const isUnder = prop.recommendation === "under";
  const hasEdge = prop.confidence >= 60 && prop.recommendation !== "push";

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${hasEdge ? "border-primary/30 bg-primary/[0.02]" : ""}`} data-testid={`prop-${playerName}-${prop.market}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{prop.marketLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">Line: <span className="font-mono font-medium text-foreground">{prop.line}</span></span>
            {prop.seasonAvg !== null && (
              <span className="text-[10px] text-muted-foreground">Avg: <span className="font-mono font-medium text-foreground">{prop.seasonAvg}</span></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasEdge && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 border-primary/30 text-primary whitespace-nowrap">
              {prop.confidence}% conf
            </Badge>
          )}
          {(overInSlip || underInSlip) && <Check className="w-4 h-4 text-primary" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${prop.marketLabel} over under selection`}>
        <button
          onClick={() => handleAdd("over")}
          disabled={overInSlip}
          aria-label={`${playerName} Over ${prop.line} ${prop.marketLabel} at ${formatOdds(prop.overOdds)}`}
          className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-all touch-target ${
            isOver
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20"
              : "border-border hover:border-emerald-500/40 hover:bg-emerald-500/5"
          } ${overInSlip ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
          data-testid={`button-over-${playerName}-${prop.market}`}
        >
          <div className="flex items-center gap-1">
            <ArrowUp className={`w-4 h-4 ${isOver ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className={`text-sm font-bold ${isOver ? "text-emerald-500" : "text-foreground"}`}>OVER</span>
          </div>
          <span className={`text-lg font-mono font-bold mt-0.5 ${isOver ? "text-emerald-500" : "text-foreground"}`}>
            {formatOdds(prop.overOdds)}
          </span>
          {isOver && (
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Recommended</span>
          )}
          {overInSlip && (
            <span className="text-[10px] font-medium text-primary mt-0.5">In Slip</span>
          )}
        </button>

        <button
          onClick={() => handleAdd("under")}
          disabled={underInSlip}
          aria-label={`${playerName} Under ${prop.line} ${prop.marketLabel} at ${formatOdds(prop.underOdds)}`}
          className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-all touch-target ${
            isUnder
              ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/20"
              : "border-border hover:border-red-500/40 hover:bg-red-500/5"
          } ${underInSlip ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
          data-testid={`button-under-${playerName}-${prop.market}`}
        >
          <div className="flex items-center gap-1">
            <ArrowDown className={`w-4 h-4 ${isUnder ? "text-red-500" : "text-muted-foreground"}`} />
            <span className={`text-sm font-bold ${isUnder ? "text-red-500" : "text-foreground"}`}>UNDER</span>
          </div>
          <span className={`text-lg font-mono font-bold mt-0.5 ${isUnder ? "text-red-500" : "text-foreground"}`}>
            {formatOdds(prop.underOdds)}
          </span>
          {isUnder && (
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-0.5">Recommended</span>
          )}
          {underInSlip && (
            <span className="text-[10px] font-medium text-primary mt-0.5">In Slip</span>
          )}
        </button>
      </div>

      {prop.reasoning && (
        <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid={`text-reasoning-${playerName}-${prop.market}`}>
          {prop.reasoning}
        </p>
      )}

      {prop.allBookmakers && prop.allBookmakers.length > 1 && (
        <button
          onClick={() => setShowBooks(!showBooks)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
          data-testid={`button-toggle-books-${playerName}-${prop.market}`}
        >
          <Activity className="w-3 h-3" />
          <span>{prop.allBookmakers.length} sportsbooks</span>
          {showBooks ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
      )}

      {showBooks && prop.allBookmakers && prop.allBookmakers.length > 0 && (
        <div className="rounded border overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-2 py-1.5 font-medium">Book</th>
                <th className="text-center px-2 py-1.5 font-medium">Line</th>
                <th className="text-center px-2 py-1.5 font-medium text-emerald-500">Over</th>
                <th className="text-center px-2 py-1.5 font-medium text-red-500">Under</th>
              </tr>
            </thead>
            <tbody>
              {prop.allBookmakers.map((bk, idx) => {
                const isBestOver = prop.bestOver && bk.bookmaker === prop.bestOver.bookmaker;
                const isBestUnder = prop.bestUnder && bk.bookmaker === prop.bestUnder.bookmaker;
                const shortName = bk.bookmaker.replace(".ag", "").replace("Sportsbook", "").replace("Online", "").trim();
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-2 py-1.5 font-medium">{shortName}</td>
                    <td className="px-2 py-1.5 text-center font-mono">{bk.line}</td>
                    <td className={`px-2 py-1.5 text-center font-mono ${isBestOver ? "text-emerald-500 font-bold" : ""}`}>
                      {formatOdds(bk.overOdds)}
                    </td>
                    <td className={`px-2 py-1.5 text-center font-mono ${isBestUnder ? "text-red-500 font-bold" : ""}`}>
                      {formatOdds(bk.underOdds)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlayerSection({ player, sport, addLeg, slipLegIds }: {
  player: GamePlayer;
  sport: string;
  addLeg: (leg: any) => boolean;
  slipLegIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(player.hasOddsData && player.markets.length > 0);

  if (player.markets.length === 0) return null;

  return (
    <div data-testid={`card-player-${player.playerName}`}>
      <button
        className="flex items-center gap-2 w-full py-2 px-1 hover:bg-muted/30 rounded transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        data-testid={`button-toggle-player-${player.playerName}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
          {player.playerName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate" data-testid={`text-player-name-${player.playerName}`}>
            {player.playerName}
          </p>
          <div className="flex items-center gap-1.5">
            {player.position && (
              <span className="text-[10px] text-muted-foreground">{player.position}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{player.markets.length} props</span>
            {player.injury && (
              <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" /> {player.injury.status}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="grid gap-2 pt-1 pb-2">
          {player.markets.map((prop) => {
            const overId = `prop-${player.playerName}-${prop.market}-over`.replace(/\s+/g, "-").toLowerCase();
            const underId = `prop-${player.playerName}-${prop.market}-under`.replace(/\s+/g, "-").toLowerCase();
            return (
              <PropCard
                key={prop.market}
                prop={prop}
                playerName={player.playerName}
                sport={sport}
                addLeg={addLeg}
                overInSlip={slipLegIds.has(overId)}
                underInSlip={slipLegIds.has(underId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GameSection({ game, sport, addLeg, slipLegIds }: {
  game: GameData;
  sport: string;
  addLeg: (leg: any) => boolean;
  slipLegIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const gameTime = new Date(game.gameTime);
  const timeStr = gameTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateStr = gameTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const isLive = game.status.state === "in";

  const playersWithProps = game.players.filter(p => p.markets.length > 0);

  return (
    <Card className="overflow-hidden" data-testid={`card-game-${game.gameId}`}>
      <button
        className="flex items-center w-full p-3 sm:p-4 border-b hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        data-testid={`button-toggle-game-${game.gameId}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {game.awayTeam.logo && <img src={game.awayTeam.logo} alt="" className="w-6 h-6" />}
            <span className="text-xs font-bold">{game.awayTeam.abbreviation}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">@</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {game.homeTeam.logo && <img src={game.homeTeam.logo} alt="" className="w-6 h-6" />}
            <span className="text-xs font-bold">{game.homeTeam.abbreviation}</span>
          </div>
          <span className="text-[10px] text-muted-foreground ml-1">{isLive ? "" : `${dateStr}, ${timeStr}`}</span>
          {isLive && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 border-red-500/30 text-red-500 gap-0.5 ml-1">
              <Activity className="w-2.5 h-2.5 animate-pulse" /> LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground">{playersWithProps.length} players</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="p-3 sm:p-4">
          {playersWithProps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No player props available yet. Props typically post 1-2 days before game time.
            </p>
          ) : (
            <div className="divide-y">
              {playersWithProps.map((player) => (
                <PlayerSection
                  key={player.playerName}
                  player={player}
                  sport={sport}
                  addLeg={addLeg}
                  slipLegIds={slipLegIds}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function PlayerPropsPage() {
  useSEO({ title: "Player Props — Over/Under", description: "Real-time player prop over/under picks from The Odds API" });
  const [selectedSport, setSelectedSport] = useState("NBA");
  const { legs, addLeg } = useParlaySlip();

  const slipLegIds = new Set(legs.map(l => l.id));

  const { data, isLoading, error, dataUpdatedAt } = useQuery<PropsResponse>({
    queryKey: ["/api/game-player-props", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/game-player-props/${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch player props");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <div className="min-h-full">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <header className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="heading-player-props">
              Player Props
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Over/Under picks &middot; Tap a side to add to your slip
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="sport-tabs">
            {SPORT_TABS.map((sport) => (
              <Button
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                size="sm"
                className="text-xs shrink-0 touch-target"
                onClick={() => setSelectedSport(sport)}
                data-testid={`button-sport-${sport}`}
              >
                {sport}
              </Button>
            ))}
          </div>

          {data && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {data.totalGames} games &middot; {data.totalProps} props
              </span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                data.dataSource.includes("Odds API") ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-muted"
              }`} data-testid="badge-data-source">
                {data.dataSource}
              </Badge>
              {lastUpdate && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {lastUpdate}
                </span>
              )}
            </div>
          )}
        </header>

        {isLoading && (
          <div className="space-y-4" data-testid="loading-skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-4" />
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-500">Failed to load player props. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && (
          <>
            {data.games.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-base font-medium">No {selectedSport} games found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different sport or check back when games are scheduled.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.games.map((game) => (
                  <GameSection
                    key={game.gameId}
                    game={game}
                    sport={selectedSport}
                    addLeg={addLeg}
                    slipLegIds={slipLegIds}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
