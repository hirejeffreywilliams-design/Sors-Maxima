import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, TrendingUp, TrendingDown, Activity, Zap, Target,
  ArrowRight, Clock, BarChart3, Search, RefreshCw, Plus,
  ArrowUpDown, AlertTriangle, Minus, DollarSign, Eye,
} from "lucide-react";

const SPORTS = [
  { id: "NBA", label: "NBA", emoji: "🏀" },
  { id: "NFL", label: "NFL", emoji: "🏈" },
  { id: "MLB", label: "MLB", emoji: "⚾" },
  { id: "NHL", label: "NHL", emoji: "🏒" },
  { id: "NCAAB", label: "NCAAB", emoji: "🏀" },
  { id: "NCAAF", label: "NCAAF", emoji: "🏈" },
  { id: "soccer_epl", label: "EPL", emoji: "⚽" },
  { id: "soccer_la_liga", label: "La Liga", emoji: "⚽" },
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
  lineMovement: LineMovementData[];
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

function fmt(odds: number | undefined): string {
  if (odds === undefined) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function evColor(ev: number): string {
  if (ev > 0.05) return "text-green-500 font-bold";
  if (ev > 0) return "text-green-500";
  if (ev > -0.03) return "text-muted-foreground";
  return "text-red-400";
}

function evBg(ev: number): string {
  if (ev > 0.08) return "bg-green-500/15 border-green-500/30";
  if (ev > 0.03) return "bg-green-500/10 border-green-500/20";
  if (ev > 0) return "bg-green-500/5 border-green-500/10";
  return "";
}

function movDir(d: "up" | "down" | "stable") {
  if (d === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (d === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function velLabel(v: string) {
  if (v === "steam") return "Steam";
  if (v === "fast") return "Fast";
  if (v === "moderate") return "Med";
  return "Slow";
}

function GameRow({ game, expanded, onToggle }: { game: MarketGame; expanded: boolean; onToggle: () => void }) {
  const { addLeg } = useParlaySlip();
  const { toast } = useToast();
  const maxEV = Math.max(game.edgeAnalysis?.homeEV ?? 0, game.edgeAnalysis?.awayEV ?? 0);
  const hasSharp = game.lineMovement?.some(m => m.sharpAction);
  const hasSteam = game.lineMovement?.some(m => m.velocity === "steam");
  const isLive = game.status.state === "in";

  const handleAddToSlip = (team: string, outcome: string, odds: number) => {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    addLeg({
      id: `${game.id}-${outcome}`,
      team,
      outcome,
      americanOdds: odds,
      decimalOdds: Math.round(decimalOdds * 100) / 100,
      market: "moneyline",
      sport: game.sport,
      addedFrom: "odds-center",
      addedAt: new Date().toISOString(),
    });
    toast({ title: "Added to slip", description: outcome });
  };

  return (
    <Card className={`border transition-all ${evBg(maxEV)} ${maxEV > 0.08 ? "ring-1 ring-green-500/20" : ""}`} data-testid={`game-row-${game.id}`}>
      <CardContent className="p-0">
        <button
          className="w-full text-left p-3 sm:p-4 focus:outline-none"
          onClick={onToggle}
          data-testid={`button-expand-${game.id}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isLive && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-1">
                    <Activity className="w-2.5 h-2.5" /> LIVE
                  </Badge>
                )}
                {game.edgeAnalysis?.hasArbitrage && (
                  <Badge className="bg-yellow-500/90 text-black text-[10px] h-4 px-1.5 gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> ARB
                  </Badge>
                )}
                {hasSharp && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-500/50 text-blue-500">Sharp</Badge>
                )}
                {hasSteam && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-orange-500/50 text-orange-500">Steam</Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {game.awayTeam.logo && <img src={game.awayTeam.logo} alt="" className="w-5 h-5" />}
                    <span className="font-semibold text-sm truncate" data-testid={`text-away-${game.id}`}>
                      {game.awayTeam.abbreviation}
                    </span>
                    <span className="text-xs text-muted-foreground">{game.awayTeam.record}</span>
                    {isLive && <span className="text-sm font-bold ml-auto">{game.awayTeam.score}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {game.homeTeam.logo && <img src={game.homeTeam.logo} alt="" className="w-5 h-5" />}
                    <span className="font-semibold text-sm truncate" data-testid={`text-home-${game.id}`}>
                      {game.homeTeam.abbreviation}
                    </span>
                    <span className="text-xs text-muted-foreground">{game.homeTeam.record}</span>
                    {isLive && <span className="text-sm font-bold ml-auto">{game.homeTeam.score}</span>}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {game.status.detail}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center shrink-0">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Spread</p>
                <p className="text-sm font-semibold" data-testid={`text-spread-${game.id}`}>
                  {game.consensus.spread !== undefined ? (game.consensus.spread > 0 ? `+${game.consensus.spread}` : game.consensus.spread) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Total</p>
                <p className="text-sm font-semibold" data-testid={`text-total-${game.id}`}>
                  {game.consensus.total ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase mb-0.5">ML</p>
                <p className="text-sm font-semibold" data-testid={`text-ml-${game.id}`}>
                  {fmt(game.consensus.homeMoneyline)}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 w-16">
              <p className="text-[9px] text-muted-foreground uppercase mb-0.5">EV</p>
              <p className={`text-sm ${evColor(maxEV)}`} data-testid={`text-ev-${game.id}`}>
                {maxEV > 0 ? "+" : ""}{(maxEV * 100).toFixed(1)}%
              </p>
              {game.edgeAnalysis?.valueSide && game.edgeAnalysis.valueSide !== "none" && (
                <p className="text-[10px] text-green-500 mt-0.5">
                  {game.edgeAnalysis.valueSide === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}
                </p>
              )}
            </div>

            <Eye className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""} text-muted-foreground shrink-0`} />
          </div>
        </button>

        {expanded && (
          <div className="border-t px-3 sm:px-4 py-3 space-y-4 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Odds Comparison
                </p>
                {game.bookmakers && game.bookmakers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-muted-foreground border-b">
                          <th className="text-left py-1.5 pr-2">Book</th>
                          <th className="text-center py-1.5 px-1">{game.awayTeam.abbreviation} ML</th>
                          <th className="text-center py-1.5 px-1">{game.homeTeam.abbreviation} ML</th>
                          <th className="text-center py-1.5 px-1">Spread</th>
                          <th className="text-center py-1.5 px-1">O/U</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.bookmakers.map((b, i) => {
                          const isBestAwayML = game.bestLines?.bestAwayML?.book === b.book;
                          const isBestHomeML = game.bestLines?.bestHomeML?.book === b.book;
                          return (
                            <tr key={i} className="border-b border-muted/30 last:border-0">
                              <td className="py-1.5 pr-2 font-medium">{b.book}</td>
                              <td className={`text-center py-1.5 px-1 ${isBestAwayML ? "text-green-500 font-bold" : ""}`}>
                                {fmt(b.awayMoneyline)}
                              </td>
                              <td className={`text-center py-1.5 px-1 ${isBestHomeML ? "text-green-500 font-bold" : ""}`}>
                                {fmt(b.homeMoneyline)}
                              </td>
                              <td className="text-center py-1.5 px-1">
                                {b.spread !== undefined ? (b.spread > 0 ? `+${b.spread}` : b.spread) : "—"}
                              </td>
                              <td className="text-center py-1.5 px-1">
                                {b.total ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No bookmaker odds available</p>
                )}

                {(game.bestLines?.bestHomeML || game.bestLines?.bestAwayML) && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3" /> Best Available Lines
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {game.bestLines.bestAwayML && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-500">
                          {game.awayTeam.abbreviation} ML {fmt(game.bestLines.bestAwayML.odds)} @ {game.bestLines.bestAwayML.book}
                        </Badge>
                      )}
                      {game.bestLines.bestHomeML && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-500">
                          {game.homeTeam.abbreviation} ML {fmt(game.bestLines.bestHomeML.odds)} @ {game.bestLines.bestHomeML.book}
                        </Badge>
                      )}
                      {game.bestLines.bestOver && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          Over {game.bestLines.bestOver.total} {fmt(game.bestLines.bestOver.odds)} @ {game.bestLines.bestOver.book}
                        </Badge>
                      )}
                      {game.bestLines.bestUnder && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          Under {game.bestLines.bestUnder.total} {fmt(game.bestLines.bestUnder.odds)} @ {game.bestLines.bestUnder.book}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Line Movement
                </p>
                {game.lineMovement && game.lineMovement.length > 0 ? (
                  <div className="space-y-3">
                    {game.lineMovement.map((lm, i) => (
                      <div key={i} className="p-2.5 bg-muted/30 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">{lm.market}</span>
                          <div className="flex items-center gap-1.5">
                            {movDir(lm.direction)}
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              {velLabel(lm.velocity)}
                            </Badge>
                            {lm.sharpAction && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-500/50 text-blue-500">
                                <Zap className="w-2.5 h-2.5 mr-0.5" /> Sharp
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Open: {lm.opening}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-medium ${lm.direction === "up" ? "text-green-500" : lm.direction === "down" ? "text-red-400" : ""}`}>
                            Current: {lm.current}
                          </span>
                          {lm.movement !== 0 && (
                            <span className={`text-[10px] font-medium ${lm.direction === "up" ? "text-green-500" : "text-red-400"}`}>
                              ({lm.movement > 0 ? "+" : ""}{lm.movement.toFixed(1)})
                            </span>
                          )}
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full">
                          {(() => {
                            const diff = lm.current - lm.opening;
                            const maxRange = Math.max(Math.abs(diff) * 2, 4);
                            const pct = Math.min(Math.max((diff / maxRange + 0.5) * 100, 5), 95);
                            return (
                              <>
                                <div className="absolute top-0 left-0 h-full rounded-full bg-primary/30" style={{ width: `${pct}%` }} />
                                <div className="absolute top-0 h-full w-1 rounded-full bg-primary" style={{ left: `${pct}%`, transform: "translateX(-50%)" }} />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No line movement data</p>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> EV Analysis
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground">{game.awayTeam.abbreviation}</p>
                      <p className={`text-sm font-bold ${evColor(game.edgeAnalysis?.awayEV ?? 0)}`}>
                        {(game.edgeAnalysis?.awayEV ?? 0) > 0 ? "+" : ""}{((game.edgeAnalysis?.awayEV ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground">{game.homeTeam.abbreviation}</p>
                      <p className={`text-sm font-bold ${evColor(game.edgeAnalysis?.homeEV ?? 0)}`}>
                        {(game.edgeAnalysis?.homeEV ?? 0) > 0 ? "+" : ""}{((game.edgeAnalysis?.homeEV ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {game.consensus.homeImpliedProb !== undefined && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Implied: {game.awayTeam.abbreviation} {((1 - (game.consensus.homeImpliedProb ?? 0.5)) * 100).toFixed(0)}%</span>
                      <span>|</span>
                      <span>{game.homeTeam.abbreviation} {((game.consensus.homeImpliedProb ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider w-full mb-1 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Quick Add to Slip
              </p>
              {game.consensus.awayMoneyline !== undefined && (
                <Button
                  size="sm" variant="outline" className="text-xs gap-1 h-7"
                  onClick={() => handleAddToSlip(game.awayTeam.name, `${game.awayTeam.name} ML`, game.consensus.awayMoneyline!)}
                  data-testid={`btn-add-away-ml-${game.id}`}
                >
                  <Plus className="w-3 h-3" />
                  {game.awayTeam.abbreviation} ML {fmt(game.consensus.awayMoneyline)}
                </Button>
              )}
              {game.consensus.homeMoneyline !== undefined && (
                <Button
                  size="sm" variant="outline" className="text-xs gap-1 h-7"
                  onClick={() => handleAddToSlip(game.homeTeam.name, `${game.homeTeam.name} ML`, game.consensus.homeMoneyline!)}
                  data-testid={`btn-add-home-ml-${game.id}`}
                >
                  <Plus className="w-3 h-3" />
                  {game.homeTeam.abbreviation} ML {fmt(game.consensus.homeMoneyline)}
                </Button>
              )}
              {game.consensus.spread !== undefined && (
                <>
                  <Button
                    size="sm" variant="outline" className="text-xs gap-1 h-7"
                    onClick={() => handleAddToSlip(game.awayTeam.name, `${game.awayTeam.name} ${game.consensus.spread! > 0 ? "+" : ""}${game.consensus.spread}`, -110)}
                    data-testid={`btn-add-away-spread-${game.id}`}
                  >
                    <Plus className="w-3 h-3" />
                    {game.awayTeam.abbreviation} {game.consensus.spread > 0 ? "+" : ""}{game.consensus.spread}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="text-xs gap-1 h-7"
                    onClick={() => handleAddToSlip(game.homeTeam.name, `${game.homeTeam.name} ${-game.consensus.spread! > 0 ? "+" : ""}${-game.consensus.spread!}`, -110)}
                    data-testid={`btn-add-home-spread-${game.id}`}
                  >
                    <Plus className="w-3 h-3" />
                    {game.homeTeam.abbreviation} {-game.consensus.spread! > 0 ? "+" : ""}{-game.consensus.spread!}
                  </Button>
                </>
              )}
              {game.consensus.total !== undefined && (
                <>
                  <Button
                    size="sm" variant="outline" className="text-xs gap-1 h-7"
                    onClick={() => handleAddToSlip(game.homeTeam.name, `${game.shortName} Over ${game.consensus.total}`, -110)}
                    data-testid={`btn-add-over-${game.id}`}
                  >
                    <Plus className="w-3 h-3" />
                    O {game.consensus.total}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="text-xs gap-1 h-7"
                    onClick={() => handleAddToSlip(game.homeTeam.name, `${game.shortName} Under ${game.consensus.total}`, -110)}
                    data-testid={`btn-add-under-${game.id}`}
                  >
                    <Plus className="w-3 h-3" />
                    U {game.consensus.total}
                  </Button>
                </>
              )}
            </div>

            {game.edgeAnalysis?.hasArbitrage && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold">Arbitrage Opportunity</span>
                  <Badge className="bg-green-500 text-white text-[10px]">
                    +{game.edgeAnalysis.arbProfit?.toFixed(2)}% profit
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Place proportional bets on both sides across different bookmakers to guarantee a {game.edgeAnalysis.arbProfit?.toFixed(2)}% return.
                </p>
              </div>
            )}

            {game.edgeAnalysis?.middleOpportunity && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">Middle Opportunity</span>
                  {game.edgeAnalysis.middleRange && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-500">
                      {game.edgeAnalysis.middleRange}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-10 w-14" />
              </div>
              <Skeleton className="h-10 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type SortMode = "ev" | "time" | "movement";
type FilterMode = "all" | "live" | "upcoming" | "value" | "arb";

export default function OddsCenter() {
  const [sport, setSport] = useState("NBA");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("ev");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const allGames = data?.games ?? [];

  const filteredGames = allGames.filter(g => {
    if (filter === "live") return g.status.state === "in";
    if (filter === "upcoming") return g.status.state === "pre";
    if (filter === "value") return Math.max(g.edgeAnalysis?.homeEV ?? 0, g.edgeAnalysis?.awayEV ?? 0) > 0;
    if (filter === "arb") return g.edgeAnalysis?.hasArbitrage;
    return true;
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    if (sortBy === "ev") {
      const maxA = Math.max(a.edgeAnalysis?.homeEV ?? 0, a.edgeAnalysis?.awayEV ?? 0);
      const maxB = Math.max(b.edgeAnalysis?.homeEV ?? 0, b.edgeAnalysis?.awayEV ?? 0);
      return maxB - maxA;
    }
    if (sortBy === "movement") {
      const movA = Math.max(...(a.lineMovement?.map(m => Math.abs(m.movement)) ?? [0]));
      const movB = Math.max(...(b.lineMovement?.map(m => Math.abs(m.movement)) ?? [0]));
      return movB - movA;
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const arbCount = allGames.filter(g => g.edgeAnalysis?.hasArbitrage).length;
  const valueCount = allGames.filter(g => Math.max(g.edgeAnalysis?.homeEV ?? 0, g.edgeAnalysis?.awayEV ?? 0) > 0).length;
  const liveCount = allGames.filter(g => g.status.state === "in").length;
  const sharpCount = allGames.filter(g => g.lineMovement?.some(m => m.sharpAction)).length;

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto" data-testid="odds-center-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold" data-testid="page-title">Odds Center</h1>
          {isFetching && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Live odds, line movement, EV analysis, and bookmaker comparison — all in one place.
          {lastUpdated && <span className="ml-1">Updated {lastUpdated}</span>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SPORTS.map(s => (
          <Button
            key={s.id}
            variant={sport === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSport(s.id); setExpandedId(null); }}
            className="text-xs"
            data-testid={`btn-sport-${s.id}`}
          >
            <span className="mr-1">{s.emoji}</span>
            {s.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "live", "upcoming", "value", "arb"] as FilterMode[]).map(f => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 capitalize"
              onClick={() => setFilter(f)}
              data-testid={`btn-filter-${f}`}
            >
              {f === "all" ? "All" :
               f === "live" ? `Live (${liveCount})` :
               f === "upcoming" ? "Upcoming" :
               f === "value" ? `+EV (${valueCount})` :
               `Arb (${arbCount})`}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Sort:</span>
          {(["ev", "time", "movement"] as SortMode[]).map(s => (
            <Button
              key={s}
              variant={sortBy === s ? "secondary" : "ghost"}
              size="sm"
              className="text-xs h-7 capitalize"
              onClick={() => setSortBy(s)}
              data-testid={`btn-sort-${s}`}
            >
              {s === "ev" ? "Best EV" : s === "time" ? "Game Time" : "Most Movement"}
            </Button>
          ))}
        </div>
      </div>

      {!isLoading && allGames.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" data-testid="stats-bar">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {allGames.length} games</span>
          {liveCount > 0 && <span className="flex items-center gap-1 text-red-500"><Activity className="w-3 h-3" /> {liveCount} live</span>}
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {valueCount} +EV</span>
          {sharpCount > 0 && <span className="flex items-center gap-1 text-blue-500"><Zap className="w-3 h-3" /> {sharpCount} sharp action</span>}
          {arbCount > 0 && <span className="flex items-center gap-1 text-yellow-500"><Zap className="w-3 h-3" /> {arbCount} arb</span>}
          <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> {data?.meta?.gamesWithOdds ?? 0} with odds</span>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : sortedGames.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Search className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium">
              {filter !== "all" ? `No ${filter} games found` : "No games available"}
            </p>
            <p className="text-sm text-muted-foreground">
              {filter !== "all"
                ? "Try a different filter or check another sport."
                : `No upcoming or live ${sport} games found. Try another sport.`}
            </p>
            {filter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setFilter("all")} data-testid="btn-clear-filter">
                Show All Games
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="games-list">
          {sortedGames.map(game => (
            <GameRow
              key={game.id}
              game={game}
              expanded={expandedId === game.id}
              onToggle={() => setExpandedId(expandedId === game.id ? null : game.id)}
            />
          ))}
        </div>
      )}

      <div className="pt-2 text-[10px] text-muted-foreground text-center">
        Data from ESPN & The Odds API. Odds refresh every 30 seconds. For entertainment purposes only.
      </div>
    </div>
  );
}
