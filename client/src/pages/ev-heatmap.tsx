import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Activity,
  AlertTriangle,
  Search,
  RefreshCw,
  Zap,
  Target,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const SPORTS = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
  { id: "NCAAB", label: "NCAAB" },
  { id: "NCAAF", label: "NCAAF" },
];

interface GameTeam {
  id: string;
  name: string;
  abbreviation: string;
  record: string;
  score: number;
  logo?: string;
  winPct: number;
}

interface BestLine {
  odds: number;
  book: string;
  line?: number;
  total?: number;
}

interface MarketGame {
  id: string;
  sport: string;
  name: string;
  shortName: string;
  date: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    period: number;
    clock: string;
    completed: boolean;
  };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  bookmakers: {
    book: string;
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    spreadHome?: number;
    spreadAway?: number;
    total?: number;
    overPrice?: number;
    underPrice?: number;
  }[];
  bestLines: {
    bestHomeML?: BestLine;
    bestAwayML?: BestLine;
    bestSpreadHome?: BestLine;
    bestSpreadAway?: BestLine;
    bestOver?: BestLine;
    bestUnder?: BestLine;
  };
  edgeAnalysis: {
    homeEV: number;
    awayEV: number;
    hasArbitrage: boolean;
    arbProfit?: number;
    middleOpportunity: boolean;
    middleRange?: string;
    valueSide?: "home" | "away" | "none";
  };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    bookmakerCount: number;
    generatedAt: string;
    dataSources: string[];
  };
}

function formatOdds(odds: number | undefined): string {
  if (odds === undefined) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function getEvColor(ev: number): string {
  if (ev > 0.1) return "bg-green-500/20 border-green-500/40";
  if (ev > 0.05) return "bg-green-500/15 border-green-500/30";
  if (ev > 0) return "bg-green-500/10 border-green-500/20";
  if (ev > -0.05) return "bg-red-500/5 border-red-500/10";
  return "bg-red-500/10 border-red-500/20";
}

function getEvTextColor(ev: number): string {
  if (ev > 0) return "text-green-500";
  if (ev < 0) return "text-red-400";
  return "text-muted-foreground";
}

function GameCard({ game }: { game: MarketGame }) {
  const maxEV = Math.max(game.edgeAnalysis.homeEV, game.edgeAnalysis.awayEV);
  const highEV = maxEV > 0.05;
  const evColorClass = getEvColor(maxEV);

  return (
    <Card
      className={`border ${evColorClass} transition-all duration-300 ${
        highEV ? "animate-pulse ring-1 ring-green-500/30" : ""
      }`}
      data-testid={`game-card-${game.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px]" data-testid={`badge-status-${game.id}`}>
            {game.status.state === "pre" ? game.status.detail : game.status.state === "in" ? `Live - ${game.status.clock}` : "Final"}
          </Badge>
          {game.edgeAnalysis.hasArbitrage && (
            <Badge className="bg-yellow-500/90 text-black text-[10px] gap-1">
              <Zap className="w-3 h-3" />
              ARB
            </Badge>
          )}
          {game.edgeAnalysis.middleOpportunity && (
            <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-500">
              Middle
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-away-team-${game.id}`}>
                {game.awayTeam.abbreviation} {game.awayTeam.name.split(" ").pop()}
              </p>
              <p className="text-[10px] text-muted-foreground">{game.awayTeam.record}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-sm font-bold ${getEvTextColor(game.edgeAnalysis.awayEV)}`} data-testid={`text-away-ev-${game.id}`}>
                {game.edgeAnalysis.awayEV > 0 ? "+" : ""}{(game.edgeAnalysis.awayEV * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-home-team-${game.id}`}>
                {game.homeTeam.abbreviation} {game.homeTeam.name.split(" ").pop()}
              </p>
              <p className="text-[10px] text-muted-foreground">{game.homeTeam.record}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-sm font-bold ${getEvTextColor(game.edgeAnalysis.homeEV)}`} data-testid={`text-home-ev-${game.id}`}>
                {game.edgeAnalysis.homeEV > 0 ? "+" : ""}{(game.edgeAnalysis.homeEV * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Spread</p>
            <p className="text-xs font-medium" data-testid={`text-spread-${game.id}`}>
              {game.consensus.spread !== undefined ? (game.consensus.spread > 0 ? `+${game.consensus.spread}` : game.consensus.spread) : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xs font-medium" data-testid={`text-total-${game.id}`}>
              {game.consensus.total !== undefined ? `O/U ${game.consensus.total}` : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">ML</p>
            <p className="text-xs font-medium" data-testid={`text-moneyline-${game.id}`}>
              {formatOdds(game.consensus.homeMoneyline)}
            </p>
          </div>
        </div>

        {(game.bestLines.bestHomeML || game.bestLines.bestAwayML) && (
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3" /> Best Lines
            </p>
            <div className="flex flex-wrap gap-1">
              {game.bestLines.bestHomeML && (
                <Badge variant="outline" className="text-[10px]">
                  {game.homeTeam.abbreviation} ML {formatOdds(game.bestLines.bestHomeML.odds)} @ {game.bestLines.bestHomeML.book}
                </Badge>
              )}
              {game.bestLines.bestAwayML && (
                <Badge variant="outline" className="text-[10px]">
                  {game.awayTeam.abbreviation} ML {formatOdds(game.bestLines.bestAwayML.odds)} @ {game.bestLines.bestAwayML.book}
                </Badge>
              )}
            </div>
          </div>
        )}

        {game.edgeAnalysis.valueSide && game.edgeAnalysis.valueSide !== "none" && (
          <div className="flex items-center gap-1.5 text-[10px] text-green-500">
            <TrendingUp className="w-3 h-3" />
            <span>Value on {game.edgeAnalysis.valueSide === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArbitrageCard({ game }: { game: MarketGame }) {
  const homeBooks = game.bookmakers
    .filter(b => b.homeMoneyline !== undefined)
    .sort((a, b) => (b.homeMoneyline ?? 0) - (a.homeMoneyline ?? 0));
  const awayBooks = game.bookmakers
    .filter(b => b.awayMoneyline !== undefined)
    .sort((a, b) => (b.awayMoneyline ?? 0) - (a.awayMoneyline ?? 0));

  const bestHome = homeBooks[0];
  const bestAway = awayBooks[0];

  return (
    <Card className="border border-yellow-500/30 bg-yellow-500/5" data-testid={`arb-card-${game.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-sm">{game.shortName}</span>
          </div>
          <Badge className="bg-green-500 text-white text-xs">
            +{game.edgeAnalysis.arbProfit?.toFixed(2)}% profit
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {bestHome && (
            <div className="p-2.5 bg-muted/30 rounded-md space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">Bet 1</p>
              <p className="text-xs font-medium">{game.homeTeam.abbreviation} ML</p>
              <p className="text-sm font-bold">{formatOdds(bestHome.homeMoneyline)}</p>
              <p className="text-[10px] text-muted-foreground">{bestHome.book}</p>
            </div>
          )}
          {bestAway && (
            <div className="p-2.5 bg-muted/30 rounded-md space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">Bet 2</p>
              <p className="text-xs font-medium">{game.awayTeam.abbreviation} ML</p>
              <p className="text-sm font-bold">{formatOdds(bestAway.awayMoneyline)}</p>
              <p className="text-[10px] text-muted-foreground">{bestAway.book}</p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Place proportional bets on both sides to guarantee a {game.edgeAnalysis.arbProfit?.toFixed(2)}% return regardless of outcome.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EvHeatmap() {
  useSEO({ title: "EV Heatmap", description: "Expected value heatmap across sports and markets" });
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot?sport=" + sport],
    refetchInterval: 30000,
  });

  const games = data?.games ?? [];

  const sortedGames = [...games].sort((a, b) => {
    const maxA = Math.max(a.edgeAnalysis.homeEV, a.edgeAnalysis.awayEV);
    const maxB = Math.max(b.edgeAnalysis.homeEV, b.edgeAnalysis.awayEV);
    return maxB - maxA;
  });

  const arbGames = games.filter(g => g.edgeAnalysis.hasArbitrage);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Flame className="w-5 h-5 text-orange-500" />
          <h1 className="text-xl md:text-2xl font-bold">Live EV Heatmap</h1>
          {isFetching && (
            <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time expected value across all markets. Cards glow green for +EV opportunities.
          {lastUpdated && <span className="ml-2">Updated {lastUpdated}</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {SPORTS.map(s => (
          <Button
            key={s.id}
            variant={sport === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSport(s.id)}
            data-testid={`button-sport-${s.id}`}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : sortedGames.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Search className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No games available</p>
            <p className="text-sm text-muted-foreground">
              No upcoming or live {sport} games found. Try selecting a different sport.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{data?.meta.totalGames ?? 0} games</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{data?.meta.gamesWithOdds ?? 0} with odds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{sortedGames.filter(g => Math.max(g.edgeAnalysis.homeEV, g.edgeAnalysis.awayEV) > 0).length} +EV games</span>
            </div>
            {arbGames.length > 0 && (
              <div className="flex items-center gap-1.5 text-yellow-500">
                <Zap className="w-3.5 h-3.5" />
                <span>{arbGames.length} arb{arbGames.length > 1 ? "s" : ""} found</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="heatmap-grid">
            {sortedGames.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </>
      )}

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg md:text-xl font-bold">Arbitrage Scanner</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Cross-book arbitrage opportunities for guaranteed profit.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : arbGames.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No arbitrage opportunities detected</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Arbitrage opportunities are extremely rare and typically last only seconds. 
                The scanner checks across all available bookmakers every 30 seconds.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="arb-grid">
            {arbGames.map(game => (
              <ArbitrageCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
