import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSEO } from "@/hooks/use-seo";
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronUp, Clock,
  Minus, AlertTriangle, Check, Star, TrendingUp, Users, Zap, Activity,
  Shield, Heart
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

function sportColor(sport: string): string {
  const colors: Record<string, string> = {
    NBA: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    NFL: "bg-green-500/15 text-green-600 dark:text-green-400",
    MLB: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    NHL: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    NCAAB: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    NCAAF: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  };
  return colors[sport] || "bg-muted text-muted-foreground";
}

function recBadge(rec: "over" | "under" | "push", confidence: number) {
  if (rec === "over") {
    return (
      <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-500 whitespace-nowrap">
        <ArrowUp className="w-2.5 h-2.5" /> O {confidence}%
      </Badge>
    );
  }
  if (rec === "under") {
    return (
      <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 bg-red-500/10 border-red-500/30 text-red-500 whitespace-nowrap">
        <ArrowDown className="w-2.5 h-2.5" /> U {confidence}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 bg-muted text-muted-foreground whitespace-nowrap">
      <Minus className="w-2.5 h-2.5" /> PUSH
    </Badge>
  );
}

function PropRow({ prop, playerName, sport, addLeg, isInSlip }: {
  prop: MarketProp;
  playerName: string;
  sport: string;
  addLeg: (leg: any) => boolean;
  isInSlip: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);

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

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`prop-${playerName}-${prop.market}`}>
      <div
        className="p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-semibold whitespace-nowrap">{prop.marketLabel}</span>
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{prop.line}</span>
            {prop.seasonAvg !== null && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden xs:inline">Avg: {prop.seasonAvg}</span>
            )}
            {prop.bookmaker && (
              <span className="text-[9px] text-blue-500 font-medium hidden sm:inline">{prop.bookmaker}</span>
            )}
            {prop.allBookmakers && prop.allBookmakers.length > 1 && (
              <span className="text-[9px] text-muted-foreground hidden sm:inline">+{prop.allBookmakers.length - 1}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {recBadge(prop.recommendation, prop.confidence)}
            <button
              onClick={(e) => { e.stopPropagation(); handleAdd("over"); }}
              disabled={isInSlip}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                prop.recommendation === "over"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                  : "border-muted hover:bg-muted/50 text-muted-foreground"
              }`}
              data-testid={`button-over-${playerName}-${prop.market}`}
            >
              O {formatOdds(prop.overOdds)}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAdd("under"); }}
              disabled={isInSlip}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                prop.recommendation === "under"
                  ? "border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "border-muted hover:bg-muted/50 text-muted-foreground"
              }`}
              data-testid={`button-under-${playerName}-${prop.market}`}
            >
              U {formatOdds(prop.underOdds)}
            </button>
            {isInSlip && <Check className="w-3 h-3 text-primary" />}
            {showDetail ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {showDetail && (
        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-2 border-t bg-muted/10">
          <p className="text-[10px] sm:text-[11px] text-foreground/80 pt-2 leading-relaxed" data-testid={`text-reasoning-${playerName}-${prop.market}`}>
            {prop.reasoning}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <div className="p-1.5 rounded bg-muted/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Over Implied</p>
              <p className="text-xs font-mono font-medium">{prop.overImpliedProb}%</p>
            </div>
            <div className="p-1.5 rounded bg-muted/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Under Implied</p>
              <p className="text-xs font-mono font-medium">{prop.underImpliedProb}%</p>
            </div>
            {prop.edge !== 0 && (
              <div className="p-1.5 rounded bg-muted/40 text-center">
                <p className="text-[9px] text-muted-foreground uppercase">Edge</p>
                <p className={`text-xs font-mono font-medium ${prop.edge > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {prop.edge > 0 ? "+" : ""}{prop.edge}%
                </p>
              </div>
            )}
            {prop.bookmaker && (
              <div className="p-1.5 rounded bg-muted/40 text-center">
                <p className="text-[9px] text-muted-foreground uppercase">Source</p>
                <p className="text-xs font-medium truncate">{prop.bookmaker}</p>
              </div>
            )}
          </div>
          {prop.allBookmakers && prop.allBookmakers.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" /> Odds Comparison
              </p>
              <div className="rounded border overflow-hidden overflow-x-auto">
                <table className="w-full text-[10px] sm:text-[11px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-1.5 sm:px-2 py-1 font-medium text-muted-foreground">Book</th>
                      <th className="text-center px-1 sm:px-2 py-1 font-medium text-muted-foreground">Line</th>
                      <th className="text-center px-1 sm:px-2 py-1 font-medium text-emerald-500">Over</th>
                      <th className="text-center px-1 sm:px-2 py-1 font-medium text-red-500">Under</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prop.allBookmakers.map((bk, idx) => {
                      const isBestOver = prop.bestOver && bk.bookmaker === prop.bestOver.bookmaker;
                      const isBestUnder = prop.bestUnder && bk.bookmaker === prop.bestUnder.bookmaker;
                      const shortName = bk.bookmaker.replace(".ag", "").replace("Sportsbook", "").replace("Online", "").trim();
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-1.5 sm:px-2 py-1 font-medium truncate max-w-[80px] sm:max-w-none">{shortName}</td>
                          <td className="px-1 sm:px-2 py-1 text-center font-mono">{bk.line}</td>
                          <td className={`px-1 sm:px-2 py-1 text-center font-mono ${isBestOver ? "text-emerald-500 font-bold" : ""}`}>
                            {formatOdds(bk.overOdds)}{isBestOver ? " ★" : ""}
                          </td>
                          <td className={`px-1 sm:px-2 py-1 text-center font-mono ${isBestUnder ? "text-red-500 font-bold" : ""}`}>
                            {formatOdds(bk.underOdds)}{isBestUnder ? " ★" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {prop.consensusLine && prop.consensusLine !== prop.line && (
                <p className="text-[10px] text-muted-foreground">
                  Consensus: <span className="font-mono font-medium">{prop.consensusLine.toFixed(1)}</span>
                </p>
              )}
            </div>
          )}
          {prop.bestOver && prop.bestUnder && (!prop.allBookmakers || prop.allBookmakers.length === 0) && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Best Over: <span className="text-emerald-500 font-mono">{formatOdds(prop.bestOver.odds)}</span> ({prop.bestOver.bookmaker})</span>
              <span>Best Under: <span className="text-red-500 font-mono">{formatOdds(prop.bestUnder.odds)}</span> ({prop.bestUnder.bookmaker})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, sport, addLeg, slipLegIds }: {
  player: GamePlayer;
  sport: string;
  addLeg: (leg: any) => boolean;
  slipLegIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(player.hasOddsData && player.markets.length > 0);

  const strongRecs = player.markets.filter(m => m.confidence >= 60 && m.recommendation !== "push");

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`card-player-${player.playerName}`}>
      <div
        className="flex items-center gap-2 p-2.5 sm:p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm truncate" data-testid={`text-player-name-${player.playerName}`}>
              {player.playerName}
            </span>
            {player.position && (
              <span className="text-[9px] text-muted-foreground">{player.position}</span>
            )}
            {player.injury && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 border-red-500/30 text-red-500 gap-0.5">
                <Heart className="w-2 h-2" />
                {player.injury.status}
              </Badge>
            )}
            {player.markets.length > 0 && (
              <span className="text-[9px] text-primary font-medium">{player.markets.length} props</span>
            )}
            {strongRecs.length > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 border-primary/30 text-primary">
                {strongRecs.length} strong
              </Badge>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && player.markets.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {player.markets.map((prop) => {
            const legId = `prop-${player.playerName}-${prop.market}-${prop.recommendation}`.replace(/\s+/g, "-").toLowerCase();
            return (
              <PropRow
                key={prop.market}
                prop={prop}
                playerName={player.playerName}
                sport={sport}
                addLeg={addLeg}
                isInSlip={slipLegIds.has(legId)}
              />
            );
          })}
        </div>
      )}

      {expanded && player.markets.length === 0 && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground italic">No prop odds available yet for this player. Check closer to game time.</p>
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
  const strongPicks = game.players.reduce((sum, p) => sum + p.markets.filter(m => m.confidence >= 60 && m.recommendation !== "push").length, 0);

  return (
    <Card className="overflow-hidden" data-testid={`card-game-${game.gameId}`}>
      <div
        className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors border-b"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5">
              {game.awayTeam.logo && <img src={game.awayTeam.logo} alt="" className="w-6 h-6 sm:w-7 sm:h-7" />}
              <span className="text-xs font-bold">{game.awayTeam.abbreviation}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">@</span>
            <div className="flex items-center gap-1.5">
              {game.homeTeam.logo && <img src={game.homeTeam.logo} alt="" className="w-6 h-6 sm:w-7 sm:h-7" />}
              <span className="text-xs font-bold">{game.homeTeam.abbreviation}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isLive ? (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 border-red-500/30 text-red-500 gap-0.5">
                <Activity className="w-2.5 h-2.5 animate-pulse" /> LIVE
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeStr}</span>
            )}
            <Badge variant="secondary" className="text-[9px] px-1 py-0 hidden sm:inline-flex">{game.totalProps} props</Badge>
            {strongPicks > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hidden sm:inline-flex">
                {strongPicks} picks
              </Badge>
            )}
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
              game.dataSource.includes("Odds API") ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-muted text-muted-foreground"
            }`}>
              {game.dataSource.includes("Odds API") ? "Live" : "ESPN"}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 sm:hidden">
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
          <span className="text-[10px] text-muted-foreground">{game.totalProps} props</span>
          {strongPicks > 0 && <span className="text-[10px] text-emerald-500">{strongPicks} strong picks</span>}
        </div>
      </div>

      {expanded && (
        <CardContent className="p-3 space-y-2">
          {playersWithProps.length === 0 && game.players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No player props available yet. Props typically post 1-2 days before game time.
            </p>
          ) : (
            <>
              {playersWithProps.length > 0 && (
                <div className="space-y-2">
                  {playersWithProps.map((player) => (
                    <PlayerCard
                      key={player.playerName}
                      player={player}
                      sport={sport}
                      addLeg={addLeg}
                      slipLegIds={slipLegIds}
                    />
                  ))}
                </div>
              )}
              {game.players.filter(p => p.markets.length === 0 && p.leaderStats.length > 0).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {game.players.filter(p => p.markets.length === 0 && p.leaderStats.length > 0).length} more players (no odds yet)
                  </summary>
                  <div className="space-y-2 mt-2">
                    {game.players.filter(p => p.markets.length === 0 && p.leaderStats.length > 0).map((player) => (
                      <PlayerCard
                        key={player.playerName}
                        player={player}
                        sport={sport}
                        addLeg={addLeg}
                        slipLegIds={slipLegIds}
                      />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function PlayerPropsPage() {
  useSEO({ title: "Player Props Analyzer", description: "Real-time player prop analysis with over/under recommendations for every game" });
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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        <header className="space-y-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-player-props">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                Player Props
              </h1>
              <div className="flex items-center gap-1.5 shrink-0">
                {data && (
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                    data.dataSource.includes("Odds API") ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-muted text-muted-foreground"
                  }`} data-testid="badge-data-source">
                    {data.dataSource.includes("Odds API") ? "Odds API" : "ESPN"}
                  </Badge>
                )}
                {lastUpdate && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {lastUpdate}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Live odds from FanDuel, DraftKings, BetMGM, Caesars & more
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="sport-tabs">
            {SPORT_TABS.map((sport) => (
              <Button
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                size="sm"
                className="text-xs shrink-0"
                onClick={() => setSelectedSport(sport)}
                data-testid={`button-sport-${sport}`}
              >
                {sport}
              </Button>
            ))}
          </div>
        </header>

        {isLoading && (
          <div className="space-y-4" data-testid="loading-skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-7 h-7 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="w-7 h-7 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-48" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-14" />
                      <Skeleton className="h-6 w-14" />
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
            {data.totalProps > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card>
                  <CardContent className="p-2.5 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase">Games</p>
                    <p className="text-lg sm:text-xl font-bold" data-testid="text-total-games">{data.totalGames}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase">Props</p>
                    <p className="text-lg sm:text-xl font-bold text-primary" data-testid="text-total-props">{data.totalProps}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase">Strong Picks</p>
                    <p className="text-lg sm:text-xl font-bold text-emerald-500" data-testid="text-strong-picks">
                      {data.games.reduce((sum, g) => sum + g.players.reduce((ps, p) => ps + p.markets.filter(m => m.confidence >= 60 && m.recommendation !== "push").length, 0), 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 sm:p-3 text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase">Books</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-500" data-testid="text-sportsbooks">
                      {(() => {
                        const books = new Set<string>();
                        for (const g of data.games) {
                          for (const p of g.players) {
                            for (const m of p.markets) {
                              if (m.bookmaker) books.add(m.bookmaker);
                              if (m.allBookmakers) m.allBookmakers.forEach(b => books.add(b.bookmaker));
                            }
                          }
                        }
                        return books.size;
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

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
