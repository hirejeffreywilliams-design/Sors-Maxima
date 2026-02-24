import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Activity,
  Zap,
  BarChart3,
  Info,
  Target,
  DollarSign,
  Minus,
} from "lucide-react";

interface LineMovementData {
  market: string;
  opening: number;
  current: number;
  movement: number;
  direction: "up" | "down" | "stable";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
}

interface MarketGame {
  id: string;
  sport: string;
  shortName: string;
  date: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    record: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    record: string;
  };
  status: {
    state: "pre" | "in" | "post";
    detail: string;
  };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
  };
  lineMovement: LineMovementData[];
  edgeAnalysis: {
    homeEV: number;
    awayEV: number;
    valueSide?: "home" | "away" | "none";
  };
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    generatedAt: string;
  };
}

const sports = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
  { id: "NCAAB", label: "NCAAB" },
  { id: "NCAAF", label: "NCAAF" },
];

function MovementIcon({ direction }: { direction: "up" | "down" | "stable" }) {
  if (direction === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (direction === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function movementColor(direction: "up" | "down" | "stable") {
  if (direction === "up") return "text-green-500";
  if (direction === "down") return "text-red-400";
  return "text-muted-foreground";
}

function velocityLabel(v: string) {
  if (v === "steam") return "Steam Move";
  if (v === "fast") return "Fast";
  if (v === "moderate") return "Moderate";
  return "Slow";
}

function MiniTimeline({ opening, current, market }: { opening: number; current: number; market: string }) {
  const diff = current - opening;
  const maxRange = Math.max(Math.abs(diff) * 2, 4);
  const pct = Math.min(Math.max(((current - opening) / maxRange + 0.5) * 100, 5), 95);

  return (
    <div className="space-y-1" data-testid={`timeline-${market}`}>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Open: {opening}</span>
        <span>Current: {current}</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-primary/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-1.5 rounded-full bg-primary"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex items-center justify-center gap-1 text-[10px]">
        <span className="text-muted-foreground">{opening}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className={diff > 0 ? "text-green-500 font-medium" : diff < 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
          {current}
        </span>
        {diff !== 0 && (
          <span className={`font-medium ${diff > 0 ? "text-green-500" : "text-red-400"}`}>
            ({diff > 0 ? "+" : ""}{diff.toFixed(1)})
          </span>
        )}
      </div>
    </div>
  );
}

function GameLineCard({ game }: { game: MarketGame }) {
  const spreadMove = game.lineMovement.find(m => m.market === "spread");
  const totalMove = game.lineMovement.find(m => m.market === "total");
  const hasSharp = game.lineMovement.some(m => m.sharpAction);
  const hasSteam = game.lineMovement.some(m => m.velocity === "steam");

  return (
    <Card data-testid={`game-card-${game.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-sm truncate" data-testid={`text-matchup-${game.id}`}>
              {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {game.status.detail}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {hasSharp && (
              <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-500 gap-1" data-testid={`badge-sharp-${game.id}`}>
                <Zap className="w-3 h-3" />
                Sharp Action
              </Badge>
            )}
            {hasSteam && (
              <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-500 gap-1" data-testid={`badge-steam-${game.id}`}>
                <Activity className="w-3 h-3" />
                Steam
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {spreadMove && (
            <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-lg" data-testid={`spread-section-${game.id}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Spread</span>
                <MovementIcon direction={spreadMove.direction} />
              </div>
              <p className={`text-lg font-bold ${movementColor(spreadMove.direction)}`} data-testid={`text-spread-${game.id}`}>
                {game.consensus.spread !== undefined
                  ? (game.consensus.spread > 0 ? "+" : "") + game.consensus.spread
                  : "—"}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {velocityLabel(spreadMove.velocity)}
                </Badge>
                {spreadMove.movement !== 0 && (
                  <span className={`text-[10px] font-medium ${movementColor(spreadMove.direction)}`}>
                    {spreadMove.movement > 0 ? "+" : ""}{spreadMove.movement}
                  </span>
                )}
              </div>
              <MiniTimeline opening={spreadMove.opening} current={spreadMove.current} market={`spread-${game.id}`} />
            </div>
          )}

          {totalMove && (
            <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-lg" data-testid={`total-section-${game.id}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Total</span>
                <MovementIcon direction={totalMove.direction} />
              </div>
              <p className={`text-lg font-bold ${movementColor(totalMove.direction)}`} data-testid={`text-total-${game.id}`}>
                {game.consensus.total !== undefined ? `O/U ${game.consensus.total}` : "—"}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {velocityLabel(totalMove.velocity)}
                </Badge>
                {totalMove.movement !== 0 && (
                  <span className={`text-[10px] font-medium ${movementColor(totalMove.direction)}`}>
                    {totalMove.movement > 0 ? "+" : ""}{totalMove.movement}
                  </span>
                )}
              </div>
              <MiniTimeline opening={totalMove.opening} current={totalMove.current} market={`total-${game.id}`} />
            </div>
          )}

          {!spreadMove && !totalMove && (
            <div className="col-span-2 text-center py-4 text-sm text-muted-foreground">
              No line movement data available
            </div>
          )}
        </div>

        {game.consensus.homeMoneyline !== undefined && game.consensus.awayMoneyline !== undefined && (
          <div className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">ML:</span>
              <span className="font-medium" data-testid={`text-home-ml-${game.id}`}>
                {game.homeTeam.abbreviation} {game.consensus.homeMoneyline > 0 ? "+" : ""}{game.consensus.homeMoneyline}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium" data-testid={`text-away-ml-${game.id}`}>
                {game.awayTeam.abbreviation} {game.consensus.awayMoneyline > 0 ? "+" : ""}{game.consensus.awayMoneyline}
              </span>
            </div>
            {game.edgeAnalysis.valueSide !== "none" && game.edgeAnalysis.valueSide && (
              <Badge variant="outline" className="text-[10px] border-green-500 text-green-500 gap-1">
                <Target className="w-3 h-3" />
                Value: {game.edgeAnalysis.valueSide === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="loading-skeleton">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <Skeleton className="h-8 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function generateCLVFromMovement(games: MarketGame[]) {
  const examples: { label: string; yourLine: number; closingLine: number; clv: number; won: boolean }[] = [];

  games.slice(0, 8).forEach((game) => {
    const spreadMove = game.lineMovement.find(m => m.market === "spread");
    if (spreadMove && spreadMove.opening !== spreadMove.current) {
      const clv = Math.abs(spreadMove.current - spreadMove.opening);
      examples.push({
        label: `${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation} Spread`,
        yourLine: spreadMove.opening,
        closingLine: spreadMove.current,
        clv: Math.round(clv * 10) / 10,
        won: spreadMove.current < spreadMove.opening,
      });
    }
    const totalMove = game.lineMovement.find(m => m.market === "total");
    if (totalMove && totalMove.opening !== totalMove.current) {
      const clv = Math.abs(totalMove.current - totalMove.opening);
      examples.push({
        label: `${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation} Total`,
        yourLine: totalMove.opening,
        closingLine: totalMove.current,
        clv: Math.round(clv * 10) / 10,
        won: totalMove.current > totalMove.opening,
      });
    }
  });

  if (examples.length === 0) {
    return {
      examples: [],
      avgCLV: 0,
      winRate: 0,
      profit: 0,
    };
  }

  const avgCLV = examples.reduce((s, e) => s + e.clv, 0) / examples.length;
  const winRate = Math.round((examples.filter(e => e.won).length / examples.length) * 100);
  const profit = Math.round(avgCLV * examples.length * 10) / 10;

  return { examples: examples.slice(0, 8), avgCLV: Math.round(avgCLV * 100) / 100, winRate, profit };
}

function CLVBarChart({ examples }: { examples: { label: string; clv: number; won: boolean }[] }) {
  const maxCLV = Math.max(...examples.map(e => e.clv), 1);

  return (
    <div className="space-y-2" data-testid="clv-bar-chart">
      {examples.map((ex, i) => (
        <div key={i} className="flex items-center gap-3" data-testid={`clv-bar-${i}`}>
          <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{ex.label}</span>
          <div className="flex-1 h-5 bg-muted/40 rounded-full relative">
            <div
              className={`h-full rounded-full transition-all ${ex.won ? "bg-green-500/70" : "bg-red-400/70"}`}
              style={{ width: `${Math.max((ex.clv / maxCLV) * 100, 8)}%` }}
            />
          </div>
          <span className={`text-xs font-medium w-12 text-right shrink-0 ${ex.won ? "text-green-500" : "text-red-400"}`}>
            +{ex.clv}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LineMovementPage() {
  const [selectedSport, setSelectedSport] = useState("NBA");

  const { data, isLoading } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot?sport=" + selectedSport],
    refetchInterval: 60000,
  });

  const games = data?.games || [];
  const clvData = generateCLVFromMovement(games);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8" data-testid="line-movement-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
          <Activity className="w-6 h-6 text-primary" />
          Line Movement & CLV Tracker
        </h1>
        <p className="text-sm text-muted-foreground">
          Track real-time line movement and measure your closing line value
        </p>
      </div>

      <Tabs value={selectedSport} onValueChange={setSelectedSport} data-testid="sport-tabs">
        <TabsList className="flex flex-wrap gap-1" data-testid="sport-tabs-list">
          {sports.map(s => (
            <TabsTrigger key={s.id} value={s.id} data-testid={`tab-${s.id}`}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sports.map(s => (
          <TabsContent key={s.id} value={s.id} className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold flex items-center gap-2" data-testid={`section-title-${s.id}`}>
                <BarChart3 className="w-5 h-5 text-primary" />
                {s.label} Line Movement
              </h2>
              {data?.meta && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span data-testid="game-count">{data.meta.totalGames} games</span>
                  <span>·</span>
                  <span data-testid="odds-count">{data.meta.gamesWithOdds} with odds</span>
                </div>
              )}
            </div>

            {isLoading && <LoadingSkeleton />}

            {!isLoading && games.length === 0 && (
              <Card data-testid="empty-state">
                <CardContent className="p-8 text-center space-y-2">
                  <Activity className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">No games available</p>
                  <p className="text-xs text-muted-foreground">
                    No upcoming {s.label} games with line data at this time. Check back later.
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoading && games.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {games.map(game => (
                  <GameLineCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-4" data-testid="clv-section">
        <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="clv-title">
          <DollarSign className="w-5 h-5 text-primary" />
          CLV Tracker
        </h2>

        <Card data-testid="clv-explanation">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="clv-explanation-text">
              Closing Line Value measures whether you got better odds than where the line closed.
              Consistently beating the closing line is the best predictor of long-term profitability.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card data-testid="metric-avg-clv">
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Average CLV</p>
              <p className="text-2xl font-bold text-green-500" data-testid="text-avg-clv">
                +{clvData.avgCLV}
              </p>
              <p className="text-[10px] text-muted-foreground">points better than close</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-win-rate">
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {clvData.winRate}%
              </p>
              <p className="text-[10px] text-muted-foreground">of CLV bets won</p>
            </CardContent>
          </Card>

          <Card data-testid="metric-profit">
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Est. Profit (units)</p>
              <p className={`text-2xl font-bold ${clvData.profit >= 0 ? "text-green-500" : "text-red-400"}`} data-testid="text-profit">
                {clvData.profit >= 0 ? "+" : ""}{clvData.profit}
              </p>
              <p className="text-[10px] text-muted-foreground">based on CLV edge</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="clv-chart-card">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium" data-testid="clv-chart-title">
              CLV by Bet ({clvData.examples.length} examples)
            </p>
            {clvData.examples.length > 0 ? (
              <CLVBarChart examples={clvData.examples} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No CLV data yet. Place bets to start tracking.
              </p>
            )}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 bg-green-500/70 rounded-sm inline-block" /> Won
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 bg-red-400/70 rounded-sm inline-block" /> Lost
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
