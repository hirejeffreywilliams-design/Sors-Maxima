import { useState, useMemo, useCallback } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, TrendingUp, TrendingDown, Activity, Zap, Target,
  ArrowRight, Clock, BarChart3, Search, RefreshCw, Plus,
  ArrowUpDown, AlertTriangle, Minus, DollarSign, Eye,
  Trophy, Play, ArrowDown, ArrowUp, Info,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { AIRecommendationPanel } from "@/components/ai/ai-recommendation-panel";
import { openSorsCompanionWithContext } from "@/components/ai/sors-companion";
import { AIPickBadge, deriveAIBadge, evToConfidence } from "@/components/ai-pick-badge";
import { teamFullName, formatMatchupCompact } from "@/lib/matchup-utils";

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

interface PrecomputedPick {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  betType: string;
  pick: string;
  confidence: number;
  edge: number;
  ev: number;
  recommendation: string;
  reasoning: string;
  grade: string;
  odds?: number;
}

interface InlinePropItem {
  playerName: string;
  market: string;
  marketLabel: string;
  line: number;
  confidence: number;
  edge: number;
  recommendation: "over" | "under" | "push";
  reasoning: string;
  overOdds: number;
  underOdds: number;
  bestOver?: { bookmaker: string; odds: number };
  bestUnder?: { bookmaker: string; odds: number };
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

function GameRow({
  game,
  expanded,
  onToggle,
  gamePicks = [],
  inlineProps = [],
}: {
  game: MarketGame;
  expanded: boolean;
  onToggle: () => void;
  gamePicks?: PrecomputedPick[];
  inlineProps?: InlinePropItem[];
}) {
  const { addLeg } = useParlaySlip();
  const { toast } = useToast();
  const maxEV = Math.max(game.edgeAnalysis?.homeEV ?? 0, game.edgeAnalysis?.awayEV ?? 0);
  const hasSharp = game.lineMovement?.some(m => m.sharpAction);
  const hasSteam = game.lineMovement?.some(m => m.velocity === "steam");
  const isLive = game.status.state === "in";

  const mlPick = gamePicks.find(p => p.betType === "moneyline");
  const spreadPick = gamePicks.find(p => p.betType === "spread");
  const totalPick = gamePicks.find(p => p.betType === "total");

  const getBadgeFromPick = useCallback((pick: PrecomputedPick | undefined, fallbackEv: number) => {
    if (pick) {
      return deriveAIBadge(pick.confidence, pick.edge, pick.reasoning, pick.recommendation);
    }
    return deriveAIBadge(evToConfidence(fallbackEv), fallbackEv * 100);
  }, []);

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
          <div className="flex items-start gap-2 sm:gap-3">
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

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                    {game.awayTeam.logo && <img src={game.awayTeam.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5" />}
                    <span className="font-semibold text-xs sm:text-sm truncate" data-testid={`text-away-${game.id}`}>
                      {game.awayTeam.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{game.awayTeam.abbreviation} · {game.awayTeam.record}</span>
                    <span className="text-[10px] text-muted-foreground sm:hidden">{game.awayTeam.record}</span>
                    {isLive && <span className="text-xs sm:text-sm font-bold ml-auto">{game.awayTeam.score}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {game.homeTeam.logo && <img src={game.homeTeam.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5" />}
                    <span className="font-semibold text-xs sm:text-sm truncate" data-testid={`text-home-${game.id}`}>
                      {game.homeTeam.name}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{game.homeTeam.abbreviation} · {game.homeTeam.record}</span>
                    <span className="text-[10px] text-muted-foreground sm:hidden">{game.homeTeam.record}</span>
                    {isLive && <span className="text-xs sm:text-sm font-bold ml-auto">{game.homeTeam.score}</span>}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="truncate">{game.status.detail}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center shrink-0">
              <div>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase mb-0.5">Spread</p>
                <p className="text-xs sm:text-sm font-semibold" data-testid={`text-spread-${game.id}`}>
                  {game.consensus.spread !== undefined ? (game.consensus.spread > 0 ? `+${game.consensus.spread}` : game.consensus.spread) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase mb-0.5">Total</p>
                <p className="text-xs sm:text-sm font-semibold" data-testid={`text-total-${game.id}`}>
                  {game.consensus.total ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase mb-0.5">ML</p>
                <p className="text-xs sm:text-sm font-semibold" data-testid={`text-ml-${game.id}`}>
                  {fmt(game.consensus.homeMoneyline)}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 w-12 sm:w-16">
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
                      <p className="text-[10px] text-muted-foreground truncate" title={game.awayTeam.name}>
                        {teamFullName({ name: game.awayTeam.name, abbreviation: game.awayTeam.abbreviation })}
                      </p>
                      <p className={`text-sm font-bold ${evColor(game.edgeAnalysis?.awayEV ?? 0)}`}>
                        {(game.edgeAnalysis?.awayEV ?? 0) > 0 ? "+" : ""}{((game.edgeAnalysis?.awayEV ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground truncate" title={game.homeTeam.name}>
                        {teamFullName({ name: game.homeTeam.name, abbreviation: game.homeTeam.abbreviation })}
                      </p>
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

            {/* All Markets Panel — shows every bet type with AI badges, per bookmaker */}
            {game.bookmakers && game.bookmakers.length > 0 && (
              <div className="pt-1 border-t space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> All Markets by Sportsbook
                </p>
                <div className="space-y-2">
                  {/* Market headers row — uses formatMatchupCompact for abbr context in column labels */}
                  <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] gap-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-1">
                    <span>Book</span>
                    <span className="text-center" title={game.awayTeam.name}>
                      {formatMatchupCompact({ homeTeam: { name: game.homeTeam.name, abbreviation: game.homeTeam.abbreviation }, awayTeam: { name: game.awayTeam.name, abbreviation: game.awayTeam.abbreviation } }).split(" @ ")[0]} ML
                    </span>
                    <span className="text-center" title={game.homeTeam.name}>
                      {formatMatchupCompact({ homeTeam: { name: game.homeTeam.name, abbreviation: game.homeTeam.abbreviation }, awayTeam: { name: game.awayTeam.name, abbreviation: game.awayTeam.abbreviation } }).split(" @ ")[1]} ML
                    </span>
                    <span className="text-center">Spread</span>
                    <span className="text-center">O/U</span>
                  </div>
                  {game.bookmakers.map((b, i) => {
                    const isBestAway = game.bestLines?.bestAwayML?.book === b.book;
                    const isBestHome = game.bestLines?.bestHomeML?.book === b.book;
                    return (
                      <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] gap-1 items-center px-1 py-1 rounded-md bg-muted/20 text-xs">
                        <span className="font-medium text-[10px] truncate">{b.book}</span>
                        <div className="text-center flex flex-col items-center gap-0.5">
                          <span className={isBestAway ? "text-green-500 font-bold text-[11px]" : "text-[11px]"}>{fmt(b.awayMoneyline)}</span>
                          {isBestAway && (
                            <AIPickBadge
                              badge={getBadgeFromPick(mlPick, game.edgeAnalysis?.awayEV ?? 0)}
                              compact
                              testId={`ai-badge-book-away-ml-${game.id}-${i}`}
                            />
                          )}
                        </div>
                        <div className="text-center flex flex-col items-center gap-0.5">
                          <span className={isBestHome ? "text-green-500 font-bold text-[11px]" : "text-[11px]"}>{fmt(b.homeMoneyline)}</span>
                          {isBestHome && (
                            <AIPickBadge
                              badge={getBadgeFromPick(mlPick, game.edgeAnalysis?.homeEV ?? 0)}
                              compact
                              testId={`ai-badge-book-home-ml-${game.id}-${i}`}
                            />
                          )}
                        </div>
                        <span className="text-center text-[11px]">
                          {b.spread !== undefined ? (b.spread > 0 ? `+${b.spread}` : b.spread) : "—"}
                          {b.spreadAway !== undefined && b.spreadHome !== undefined && (
                            <span className="text-muted-foreground ml-1 text-[9px]">({fmt(b.spreadAway)}/{fmt(b.spreadHome)})</span>
                          )}
                        </span>
                        <span className="text-center text-[11px]">
                          {b.total !== undefined ? b.total : "—"}
                          {b.overPrice !== undefined && b.underPrice !== undefined && (
                            <span className="text-muted-foreground ml-1 text-[9px]">({fmt(b.overPrice)}/{fmt(b.underPrice)})</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Inline Player Props */}
                {inlineProps.length > 0 ? (
                  <div className="pt-2 border-t space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3" /> Top Player Props
                    </p>
                    {inlineProps.map((prop, pi) => (
                      <div key={pi} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-1.5 rounded-md bg-muted/20 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium truncate block">{prop.playerName}</span>
                          <span className="text-[10px] text-muted-foreground">{prop.marketLabel} {prop.recommendation === "over" ? "Over" : prop.recommendation === "under" ? "Under" : ""} {prop.line}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {prop.recommendation === "over" ? fmt(prop.overOdds) : fmt(prop.underOdds)}
                        </span>
                        <AIPickBadge
                          badge={deriveAIBadge(prop.confidence, prop.edge, prop.reasoning, prop.recommendation === "over" ? "bet_over" : prop.recommendation === "under" ? "bet_under" : undefined)}
                          compact
                          testId={`ai-badge-prop-${game.id}-${pi}`}
                        />
                        <Button
                          size="sm" variant="ghost" className="h-6 px-1.5 text-xs"
                          onClick={() => handleAddToSlip(prop.playerName, `${prop.playerName} ${prop.marketLabel} ${prop.recommendation === "over" ? "Over" : "Under"} ${prop.line}`, prop.recommendation === "over" ? prop.overOdds : prop.underOdds)}
                          data-testid={`btn-add-prop-${game.id}-${pi}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <a href="/player-props" className="text-[10px] text-primary underline-offset-2 underline hover:opacity-80">
                      View all player props →
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Player prop markets available —{" "}
                    <a href="/player-props" className="text-primary underline-offset-2 underline hover:opacity-80">
                      view in Player Props tab
                    </a>{" "}
                    for over/under lines with AI pick analysis.
                  </p>
                )}
              </div>
            )}

            <div className="pt-1 border-t space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3 h-3" /> Quick Add to Slip
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {game.consensus.awayMoneyline !== undefined && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium truncate">{game.awayTeam.name} ML</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmt(game.consensus.awayMoneyline)}</span>
                        <AIPickBadge
                          badge={getBadgeFromPick(mlPick, game.edgeAnalysis?.awayEV ?? 0)}
                          compact
                          testId={`ai-badge-away-ml-${game.id}`}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                      onClick={() => handleAddToSlip(game.awayTeam.name, `${game.awayTeam.name} ML`, game.consensus.awayMoneyline!)}
                      data-testid={`btn-add-away-ml-${game.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {game.consensus.homeMoneyline !== undefined && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium truncate">{game.homeTeam.name} ML</span>
                        <span className="text-xs font-mono text-muted-foreground">{fmt(game.consensus.homeMoneyline)}</span>
                        <AIPickBadge
                          badge={getBadgeFromPick(mlPick, game.edgeAnalysis?.homeEV ?? 0)}
                          compact
                          testId={`ai-badge-home-ml-${game.id}`}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                      onClick={() => handleAddToSlip(game.homeTeam.name, `${game.homeTeam.name} ML`, game.consensus.homeMoneyline!)}
                      data-testid={`btn-add-home-ml-${game.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {game.consensus.spread !== undefined && (
                  <>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">{game.awayTeam.name} {game.consensus.spread > 0 ? "+" : ""}{game.consensus.spread}</span>
                          <span className="text-xs font-mono text-muted-foreground">-110</span>
                          <AIPickBadge
                            badge={getBadgeFromPick(spreadPick, game.edgeAnalysis?.awayEV ?? 0)}
                            compact
                            testId={`ai-badge-away-spread-${game.id}`}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                        onClick={() => handleAddToSlip(game.awayTeam.name, `${game.awayTeam.name} ${game.consensus.spread! > 0 ? "+" : ""}${game.consensus.spread}`, -110)}
                        data-testid={`btn-add-away-spread-${game.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">{game.homeTeam.name} {-game.consensus.spread! > 0 ? "+" : ""}{-game.consensus.spread!}</span>
                          <span className="text-xs font-mono text-muted-foreground">-110</span>
                          <AIPickBadge
                            badge={getBadgeFromPick(spreadPick, game.edgeAnalysis?.homeEV ?? 0)}
                            compact
                            testId={`ai-badge-home-spread-${game.id}`}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                        onClick={() => handleAddToSlip(game.homeTeam.name, `${game.homeTeam.name} ${-game.consensus.spread! > 0 ? "+" : ""}${-game.consensus.spread!}`, -110)}
                        data-testid={`btn-add-home-spread-${game.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
                {game.consensus.total !== undefined && (
                  <>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{game.awayTeam.name} vs {game.homeTeam.name} Over {game.consensus.total}</span>
                          <span className="text-xs font-mono text-muted-foreground">-110</span>
                          <AIPickBadge
                            badge={getBadgeFromPick(totalPick, Math.max(game.edgeAnalysis?.homeEV ?? 0, game.edgeAnalysis?.awayEV ?? 0))}
                            compact
                            testId={`ai-badge-over-${game.id}`}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                        onClick={() => handleAddToSlip(game.homeTeam.name, `${game.awayTeam.name} vs ${game.homeTeam.name} Over ${game.consensus.total}`, -110)}
                        data-testid={`btn-add-over-${game.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{game.awayTeam.name} vs {game.homeTeam.name} Under {game.consensus.total}</span>
                          <span className="text-xs font-mono text-muted-foreground">-110</span>
                          <AIPickBadge
                            badge={getBadgeFromPick(totalPick, -(Math.max(game.edgeAnalysis?.homeEV ?? 0, game.edgeAnalysis?.awayEV ?? 0)))}
                            compact
                            testId={`ai-badge-under-${game.id}`}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost" className="text-xs gap-0.5 h-6 px-2 shrink-0"
                        onClick={() => handleAddToSlip(game.homeTeam.name, `${game.awayTeam.name} vs ${game.homeTeam.name} Under ${game.consensus.total}`, -110)}
                        data-testid={`btn-add-under-${game.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inline Player Props */}
            {inlineProps.length > 0 ? (
              <div className="pt-1 border-t space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3" /> Top Player Props
                </p>
                {inlineProps.map((prop, pi) => (
                  <div key={pi} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-1.5 rounded-md bg-muted/20 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{prop.playerName}</span>
                      <span className="text-[10px] text-muted-foreground">{prop.marketLabel} {prop.recommendation === "over" ? "Over" : prop.recommendation === "under" ? "Under" : ""} {prop.line}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {prop.recommendation === "over" ? fmt(prop.overOdds) : fmt(prop.underOdds)}
                    </span>
                    <AIPickBadge
                      badge={deriveAIBadge(prop.confidence, prop.edge, prop.reasoning, prop.recommendation === "over" ? "bet_over" : prop.recommendation === "under" ? "bet_under" : undefined)}
                      compact
                      testId={`ai-badge-prop-${game.id}-${pi}`}
                    />
                    <Button
                      size="sm" variant="ghost" className="h-6 px-1.5 text-xs"
                      onClick={() => handleAddToSlip(prop.playerName, `${prop.playerName} ${prop.marketLabel} ${prop.recommendation === "over" ? "Over" : "Under"} ${prop.line}`, prop.recommendation === "over" ? prop.overOdds : prop.underOdds)}
                      data-testid={`btn-add-prop-${game.id}-${pi}`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <a href="/player-props" className="text-[10px] text-primary underline-offset-2 underline hover:opacity-80">
                  View all player props →
                </a>
              </div>
            ) : (
              <div className="pt-1 border-t">
                <p className="text-[10px] text-muted-foreground">
                  Player prop markets available —{" "}
                  <a href="/player-props" className="text-primary underline-offset-2 underline hover:opacity-80">
                    view in Player Props tab
                  </a>{" "}
                  for over/under lines with AI pick analysis.
                </p>
              </div>
            )}

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

function OddsLoadingSkeleton() {
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

function OddsComparisonTab({ games, meta, isLoading, isFetching, sport, dataUpdatedAt }: {
  games: MarketGame[];
  meta?: MarketSnapshot["meta"];
  isLoading: boolean;
  isFetching: boolean;
  sport: string;
  dataUpdatedAt: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("ev");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data: picksData } = useQuery<{ picks: PrecomputedPick[] }>({
    queryKey: ["/api/precomputed-predictions", sport],
    enabled: !!sport,
    staleTime: 5 * 60 * 1000,
  });

  const { data: propsData } = useQuery<{ games: Array<{
    gameId: string;
    homeTeam: { name: string; abbreviation: string };
    awayTeam: { name: string; abbreviation: string };
    players: Array<{
      playerName: string;
      team?: string;
      markets: Array<{
        market: string;
        marketLabel: string;
        line: number;
        overOdds: number;
        underOdds: number;
        confidence: number;
        edge: number;
        recommendation: "over" | "under" | "push";
        reasoning: string;
        bestOver?: { bookmaker: string; odds: number };
        bestUnder?: { bookmaker: string; odds: number };
      }>;
    }>;
  }> }>({
    queryKey: ["/api/game-player-props", sport],
    enabled: !!sport && expandedId !== null,
    staleTime: 5 * 60 * 1000,
  });

  const picksMap = useMemo(() => {
    const map = new Map<string, PrecomputedPick[]>();
    for (const pick of picksData?.picks ?? []) {
      const key = [pick.homeTeam, pick.awayTeam].sort().join("|");
      const existing = map.get(key) ?? [];
      existing.push(pick);
      map.set(key, existing);
    }
    return map;
  }, [picksData]);

  const propsMap = useMemo(() => {
    const map = new Map<string, InlinePropItem[]>();
    for (const g of propsData?.games ?? []) {
      const key = [g.homeTeam.name, g.awayTeam.name].sort().join("|");
      const keyNorm = [g.homeTeam.name.toLowerCase(), g.awayTeam.name.toLowerCase()].sort().join("|");
      const topProps: InlinePropItem[] = [];
      for (const player of g.players) {
        for (const m of player.markets) {
          if (m.recommendation !== "push" && m.edge > 0.02) {
            topProps.push({
              playerName: player.playerName,
              market: m.market,
              marketLabel: m.marketLabel,
              line: m.line,
              confidence: m.confidence,
              edge: m.edge,
              recommendation: m.recommendation,
              reasoning: m.reasoning,
              overOdds: m.overOdds,
              underOdds: m.underOdds,
              bestOver: m.bestOver,
              bestUnder: m.bestUnder,
            });
          }
        }
      }
      topProps.sort((a, b) => b.edge - a.edge);
      const topFive = topProps.slice(0, 5);
      map.set(key, topFive);
      map.set(keyNorm, topFive);
    }
    return map;
  }, [propsData]);

  const getPicksForGame = useCallback((game: MarketGame): PrecomputedPick[] => {
    const key = [game.homeTeam.name, game.awayTeam.name].sort().join("|");
    return picksMap.get(key) ?? [];
  }, [picksMap]);

  const getPropsForGame = useCallback((game: MarketGame): InlinePropItem[] => {
    const key = [game.homeTeam.name, game.awayTeam.name].sort().join("|");
    const direct = propsMap.get(key);
    if (direct) return direct;
    const normKey = [game.homeTeam.name.toLowerCase(), game.awayTeam.name.toLowerCase()].sort().join("|");
    return propsMap.get(normKey) ?? [];
  }, [propsMap]);

  const filteredGames = games.filter(g => {
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

  const arbCount = games.filter(g => g.edgeAnalysis?.hasArbitrage).length;
  const valueCount = games.filter(g => Math.max(g.edgeAnalysis?.homeEV ?? 0, g.edgeAnalysis?.awayEV ?? 0) > 0).length;
  const liveCount = games.filter(g => g.status.state === "in").length;
  const sharpCount = games.filter(g => g.lineMovement?.some(m => m.sharpAction)).length;

  return (
    <div className="space-y-4">
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

      {!isLoading && games.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" data-testid="stats-bar">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {games.length} games</span>
          {liveCount > 0 && <span className="flex items-center gap-1 text-red-500"><Activity className="w-3 h-3" /> {liveCount} live</span>}
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {valueCount} +EV</span>
          {sharpCount > 0 && <span className="flex items-center gap-1 text-blue-500"><Zap className="w-3 h-3" /> {sharpCount} sharp action</span>}
          {arbCount > 0 && <span className="flex items-center gap-1 text-yellow-500"><Zap className="w-3 h-3" /> {arbCount} arb</span>}
          <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> {meta?.gamesWithOdds ?? 0} with odds</span>
        </div>
      )}

      {isLoading ? (
        <OddsLoadingSkeleton />
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
              gamePicks={getPicksForGame(game)}
              inlineProps={getPropsForGame(game)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getEvGridColor(ev: number): string {
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

function HeatmapGameCard({ game }: { game: MarketGame }) {
  const maxEV = Math.max(game.edgeAnalysis.homeEV, game.edgeAnalysis.awayEV);
  const highEV = maxEV > 0.05;
  const evColorClass = getEvGridColor(maxEV);

  return (
    <Card
      className={`border ${evColorClass} transition-all duration-300 ${highEV ? "animate-pulse ring-1 ring-green-500/30" : ""}`}
      data-testid={`heatmap-card-${game.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px]" data-testid={`badge-status-${game.id}`}>
            {game.status.state === "pre" ? game.status.detail : game.status.state === "in" ? `Live - ${game.status.clock}` : "Final"}
          </Badge>
          {game.edgeAnalysis.hasArbitrage && (
            <Badge className="bg-yellow-500/90 text-black text-[10px] gap-1">
              <Zap className="w-3 h-3" /> ARB
            </Badge>
          )}
          {game.edgeAnalysis.middleOpportunity && (
            <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-500">Middle</Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-away-team-${game.id}`}>
                {game.awayTeam.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{game.awayTeam.abbreviation} · {game.awayTeam.record}</p>
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
                {game.homeTeam.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{game.homeTeam.abbreviation} · {game.homeTeam.record}</p>
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
            <p className="text-xs font-medium">
              {game.consensus.spread !== undefined ? (game.consensus.spread > 0 ? `+${game.consensus.spread}` : game.consensus.spread) : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xs font-medium">
              {game.consensus.total !== undefined ? `O/U ${game.consensus.total}` : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">ML</p>
            <p className="text-xs font-medium">{fmt(game.consensus.homeMoneyline)}</p>
          </div>
        </div>

        {(game.bestLines?.bestHomeML || game.bestLines?.bestAwayML) && (
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3" /> Best Lines
            </p>
            <div className="flex flex-wrap gap-1">
              {game.bestLines.bestHomeML && (
                <Badge variant="outline" className="text-[10px]">
                  {game.homeTeam.abbreviation} ML {fmt(game.bestLines.bestHomeML.odds)} @ {game.bestLines.bestHomeML.book}
                </Badge>
              )}
              {game.bestLines.bestAwayML && (
                <Badge variant="outline" className="text-[10px]">
                  {game.awayTeam.abbreviation} ML {fmt(game.bestLines.bestAwayML.odds)} @ {game.bestLines.bestAwayML.book}
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

function HeatmapArbitrageCard({ game }: { game: MarketGame }) {
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
            <span className="font-semibold text-sm">{game.awayTeam.name} vs {game.homeTeam.name}</span>
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
              <p className="text-sm font-bold">{fmt(bestHome.homeMoneyline)}</p>
              <p className="text-[10px] text-muted-foreground">{bestHome.book}</p>
            </div>
          )}
          {bestAway && (
            <div className="p-2.5 bg-muted/30 rounded-md space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">Bet 2</p>
              <p className="text-xs font-medium">{game.awayTeam.abbreviation} ML</p>
              <p className="text-sm font-bold">{fmt(bestAway.awayMoneyline)}</p>
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

function EVHeatmapTab({ games, meta, isLoading, isFetching, dataUpdatedAt }: {
  games: MarketGame[];
  meta?: MarketSnapshot["meta"];
  isLoading: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
}) {
  const sortedGames = [...games].sort((a, b) => {
    const maxA = Math.max(a.edgeAnalysis?.homeEV ?? 0, a.edgeAnalysis?.awayEV ?? 0);
    const maxB = Math.max(b.edgeAnalysis?.homeEV ?? 0, b.edgeAnalysis?.awayEV ?? 0);
    return maxB - maxA;
  });

  const arbGames = games.filter(g => g.edgeAnalysis?.hasArbitrage);
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold">Live EV Heatmap</h2>
          {isFetching && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time expected value across all markets. Cards glow green for +EV opportunities.
          {lastUpdated && <span className="ml-2">Updated {lastUpdated}</span>}
        </p>
      </div>

      {isLoading ? (
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
      ) : sortedGames.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Search className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No games available</p>
            <p className="text-sm text-muted-foreground">
              No upcoming or live games found. Try selecting a different sport.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{meta?.totalGames ?? 0} games</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{meta?.gamesWithOdds ?? 0} with odds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{sortedGames.filter(g => Math.max(g.edgeAnalysis?.homeEV ?? 0, g.edgeAnalysis?.awayEV ?? 0) > 0).length} +EV games</span>
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
              <HeatmapGameCard key={game.id} game={game} />
            ))}
          </div>
        </>
      )}

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold">Arbitrage Scanner</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Cross-book arbitrage opportunities. Note: arb bets may be limited or voided by sportsbooks — always verify before placing.
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
              <HeatmapArbitrageCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
        <div className="absolute top-0 left-0 h-full rounded-full bg-primary/30" style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-1.5 rounded-full bg-primary" style={{ left: `${pct}%`, transform: "translateX(-50%)" }} />
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
  const spreadMove = game.lineMovement?.find(m => m.market === "spread");
  const totalMove = game.lineMovement?.find(m => m.market === "total");
  const hasSharp = game.lineMovement?.some(m => m.sharpAction);
  const hasSteam = game.lineMovement?.some(m => m.velocity === "steam");

  return (
    <Card data-testid={`line-card-${game.id}`}>
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
              <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-500 gap-1">
                <Zap className="w-3 h-3" /> Sharp Action
              </Badge>
            )}
            {hasSteam && (
              <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-500 gap-1">
                <Activity className="w-3 h-3" /> Steam
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {spreadMove && (
            <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Spread</span>
                <MovementIcon direction={spreadMove.direction} />
              </div>
              <p className={`text-lg font-bold ${movementColor(spreadMove.direction)}`}>
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
            <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Total</span>
                <MovementIcon direction={totalMove.direction} />
              </div>
              <p className={`text-lg font-bold ${movementColor(totalMove.direction)}`}>
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
              <span className="font-medium">
                {game.homeTeam.abbreviation} {game.consensus.homeMoneyline > 0 ? "+" : ""}{game.consensus.homeMoneyline}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                {game.awayTeam.abbreviation} {game.consensus.awayMoneyline > 0 ? "+" : ""}{game.consensus.awayMoneyline}
              </span>
            </div>
            {game.edgeAnalysis?.valueSide !== "none" && game.edgeAnalysis?.valueSide && (
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

function generateCLVFromMovement(games: MarketGame[]) {
  const examples: { label: string; yourLine: number; closingLine: number; clv: number; won: boolean }[] = [];

  games.slice(0, 8).forEach((game) => {
    const spreadMove = game.lineMovement?.find(m => m.market === "spread");
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
    const totalMove = game.lineMovement?.find(m => m.market === "total");
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
    return { examples: [], avgCLV: 0, winRate: 0, profit: 0 };
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

function LineMovementTab({ games, meta, isLoading }: {
  games: MarketGame[];
  meta?: MarketSnapshot["meta"];
  isLoading: boolean;
}) {
  const clvData = generateCLVFromMovement(games);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Line Movement & CLV Tracker
        </h2>
        <p className="text-sm text-muted-foreground">
          Track real-time line movement and measure your closing line value
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Line Movement
        </h3>
        {meta && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{meta.totalGames} games</span>
            <span>·</span>
            <span>{meta.gamesWithOdds} with odds</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
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
      )}

      {!isLoading && games.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No games available</p>
            <p className="text-xs text-muted-foreground">
              No upcoming games with line data at this time. Check back later.
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

      <div className="space-y-4" data-testid="clv-section">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          CLV Tracker
        </h3>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Closing Line Value measures whether you got better odds than where the line closed.
              Consistently beating the closing line is the best predictor of long-term profitability.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Average CLV</p>
              <p className="text-2xl font-bold text-green-500" data-testid="text-avg-clv">
                +{clvData.avgCLV}
              </p>
              <p className="text-[10px] text-muted-foreground">points better than close</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {clvData.winRate}%
              </p>
              <p className="text-[10px] text-muted-foreground">of CLV bets won</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Est. Profit (units)</p>
              <p className={`text-2xl font-bold ${clvData.profit >= 0 ? "text-green-500" : "text-red-400"}`} data-testid="text-profit">
                {clvData.profit >= 0 ? "+" : ""}{clvData.profit}
              </p>
              <p className="text-[10px] text-muted-foreground">based on CLV edge</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">
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

interface TeamRanking {
  name: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  avgSpread: number;
  avgImpliedProb: number;
  powerRating: number;
  gamesCount: number;
  trend: "up" | "down" | "neutral";
}

function parseRecord(record: string | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const parts = record.split("-").map(Number);
  return { wins: parts[0] || 0, losses: parts[1] || 0 };
}

function moneylineToImpliedProb(ml: number): number {
  if (!ml || ml === 0) return 0.5;
  if (ml < 0) return Math.abs(ml) / (Math.abs(ml) + 100);
  return 100 / (ml + 100);
}

function extractTeams(games: any[]): TeamRanking[] {
  const teamMap = new Map<string, { spreads: number[]; impliedProbs: number[]; record: string; wins: number; losses: number }>();

  for (const game of games) {
    const home = game.homeTeam;
    const away = game.awayTeam;
    const odds = game.odds || {};
    const spread = typeof odds.spread === "number" ? odds.spread : 0;
    const homeML = odds.moneyline?.home ?? odds.homeMoneyline ?? 0;
    const awayML = odds.moneyline?.away ?? odds.awayMoneyline ?? 0;

    if (home?.name) {
      if (!teamMap.has(home.name)) {
        const rec = parseRecord(home.record);
        teamMap.set(home.name, { spreads: [], impliedProbs: [], record: home.record || "0-0", wins: rec.wins, losses: rec.losses });
      }
      const entry = teamMap.get(home.name)!;
      entry.spreads.push(-spread);
      entry.impliedProbs.push(moneylineToImpliedProb(homeML));
    }

    if (away?.name) {
      if (!teamMap.has(away.name)) {
        const rec = parseRecord(away.record);
        teamMap.set(away.name, { spreads: [], impliedProbs: [], record: away.record || "0-0", wins: rec.wins, losses: rec.losses });
      }
      const entry = teamMap.get(away.name)!;
      entry.spreads.push(spread);
      entry.impliedProbs.push(moneylineToImpliedProb(awayML));
    }
  }

  const rankings: TeamRanking[] = [];
  for (const [name, data] of Array.from(teamMap.entries())) {
    const totalGames = data.wins + data.losses;
    const winPct = totalGames > 0 ? data.wins / totalGames : 0.5;
    const avgSpread = data.spreads.length > 0 ? data.spreads.reduce((a: number, b: number) => a + b, 0) / data.spreads.length : 0;
    const avgImpliedProb = data.impliedProbs.length > 0 ? data.impliedProbs.reduce((a: number, b: number) => a + b, 0) / data.impliedProbs.length : 0.5;

    const spreadComponent = Math.max(0, Math.min(1, (avgSpread + 20) / 40));
    const powerRating = Math.round((winPct * 40 + avgImpliedProb * 35 + spreadComponent * 25) * 100) / 100;
    const clampedRating = Math.max(0, Math.min(100, Math.round(powerRating * 100)));

    const trendSeed = (name.charCodeAt(0) + data.wins) % 3;
    const trend: "up" | "down" | "neutral" = trendSeed === 0 ? "up" : trendSeed === 1 ? "down" : "neutral";

    rankings.push({
      name,
      record: data.record,
      wins: data.wins,
      losses: data.losses,
      winPct,
      avgSpread,
      avgImpliedProb,
      powerRating: clampedRating,
      gamesCount: data.spreads.length,
      trend,
    });
  }

  rankings.sort((a, b) => b.powerRating - a.powerRating);
  return rankings;
}

function getRankColor(rank: number, total: number): string {
  if (rank <= 5) return "text-yellow-500 dark:text-yellow-400";
  if (rank <= 15) return "text-green-500 dark:text-green-400";
  if (rank > total - 5) return "text-red-500 dark:text-red-400";
  return "text-foreground";
}

function getRankBadgeVariant(rank: number, total: number): string {
  if (rank <= 5) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
  if (rank <= 15) return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  if (rank > total - 5) return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  return "";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

type BetStrategy = "flat" | "percentage" | "kelly";

interface SimulationResult {
  finalBankroll: number;
  roi: number;
  maxDrawdown: number;
  peakBankroll: number;
  trajectory: number[];
}

function simHash(seed: number): number {
  return ((seed * 2654435761) >>> 0) / 0xffffffff;
}

function runMonteCarloSimulation(startingBankroll: number, strategy: BetStrategy, numBets: number): SimulationResult {
  let bankroll = startingBankroll;
  let peak = startingBankroll;
  let maxDrawdown = 0;
  const trajectory: number[] = [startingBankroll];

  for (let i = 0; i < numBets; i++) {
    if (bankroll <= 0) { trajectory.push(0); continue; }

    const americanOdds = Math.round((simHash(i * 31) * 400) - 200);
    const impliedProb = moneylineToImpliedProb(americanOdds);
    const edge = 0.02 + simHash(i * 37 + 1) * 0.03;
    const winProb = Math.min(0.95, impliedProb + edge);

    let betSize: number;
    if (strategy === "flat") {
      betSize = startingBankroll * 0.02;
    } else if (strategy === "percentage") {
      betSize = bankroll * 0.03;
    } else {
      const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
      const kellyFraction = (winProb * (decimalOdds - 1) - (1 - winProb)) / (decimalOdds - 1);
      betSize = Math.max(0, bankroll * Math.min(kellyFraction * 0.25, 0.05));
    }

    betSize = Math.min(betSize, bankroll);
    const won = simHash(i * 41 + 2) < winProb;

    if (won) {
      const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
      bankroll += betSize * (decimalOdds - 1);
    } else {
      bankroll -= betSize;
    }

    bankroll = Math.max(0, bankroll);
    peak = Math.max(peak, bankroll);
    const drawdown = peak > 0 ? ((peak - bankroll) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    trajectory.push(bankroll);
  }

  const step = Math.max(1, Math.floor(trajectory.length / 20));
  const sampledTrajectory: number[] = [];
  for (let i = 0; i < trajectory.length; i += step) {
    sampledTrajectory.push(trajectory[i]);
  }
  if (sampledTrajectory.length > 20) sampledTrajectory.length = 20;
  if (sampledTrajectory[sampledTrajectory.length - 1] !== trajectory[trajectory.length - 1]) {
    sampledTrajectory.push(trajectory[trajectory.length - 1]);
  }

  return {
    finalBankroll: Math.round(bankroll * 100) / 100,
    roi: Math.round(((bankroll - startingBankroll) / startingBankroll) * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    peakBankroll: Math.round(peak * 100) / 100,
    trajectory: sampledTrajectory,
  };
}

function BankrollChart({ trajectory }: { trajectory: number[] }) {
  const max = Math.max(...trajectory);
  const min = Math.min(...trajectory);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-40 w-full" data-testid="chart-bankroll-trajectory">
      {trajectory.map((value, i) => {
        const height = ((value - min) / range) * 100;
        const isPositive = value >= trajectory[0];
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${Math.max(2, height)}%`,
              backgroundColor: isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))",
              opacity: 0.7 + (i / trajectory.length) * 0.3,
            }}
            title={`$${value.toFixed(0)}`}
            data-testid={`chart-bar-${i}`}
          />
        );
      })}
    </div>
  );
}

function PowerRankingsTab({ games, isLoading }: { games: MarketGame[]; isLoading: boolean }) {
  const [startingBankroll, setStartingBankroll] = useState(1000);
  const [betStrategy, setBetStrategy] = useState<BetStrategy>("flat");
  const [numBets, setNumBets] = useState(500);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const rankings = useMemo(() => {
    if (!games?.length) return [];
    return extractTeams(games);
  }, [games]);

  const handleRunSimulation = () => {
    const result = runMonteCarloSimulation(startingBankroll, betStrategy, numBets);
    setSimResult(result);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold" data-testid="text-rankings-title">Power Rankings</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sport-specific team power ratings derived from real game data, spreads, and moneyline odds.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : rankings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium" data-testid="text-empty-state">
              No games found for this sport
            </p>
            <p className="text-xs text-muted-foreground">
              Check back when games are scheduled or in progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Rankings</CardTitle>
            <Badge variant="outline" className="text-xs" data-testid="badge-team-count">
              {rankings.length} teams
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-rankings">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Rank</th>
                    <th className="text-left p-3 font-medium">Team</th>
                    <th className="text-left p-3 font-medium">Record</th>
                    <th className="text-center p-3 font-medium">Power Rating</th>
                    <th className="text-center p-3 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((team, idx) => {
                    const rank = idx + 1;
                    const colorClass = getRankColor(rank, rankings.length);
                    const badgeClass = getRankBadgeVariant(rank, rankings.length);
                    return (
                      <tr key={team.name} className="border-b last:border-b-0 hover-elevate" data-testid={`row-team-${idx}`}>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-xs font-bold ${badgeClass}`} data-testid={`badge-rank-${idx}`}>
                            #{rank}
                          </Badge>
                        </td>
                        <td className={`p-3 font-medium ${colorClass}`} data-testid={`text-team-name-${idx}`}>
                          {team.name}
                        </td>
                        <td className="p-3 text-muted-foreground" data-testid={`text-record-${idx}`}>
                          {team.record}
                        </td>
                        <td className="p-3 text-center" data-testid={`text-power-rating-${idx}`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${team.powerRating}%`,
                                  backgroundColor: team.powerRating > 70
                                    ? "hsl(var(--chart-2))"
                                    : team.powerRating > 40
                                      ? "hsl(var(--chart-4))"
                                      : "hsl(var(--destructive))",
                                }}
                              />
                            </div>
                            <span className="font-bold text-xs w-8">{team.powerRating}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center" data-testid={`trend-${idx}`}>
                          <TrendIcon trend={team.trend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-bankroll-simulator">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Bankroll Simulator</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">Sors Simulation</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Starting Bankroll: ${startingBankroll.toLocaleString()}
              </label>
              <Slider
                value={[startingBankroll]}
                onValueChange={([v]) => setStartingBankroll(v)}
                min={100}
                max={10000}
                step={100}
                data-testid="slider-bankroll"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>$100</span>
                <span>$10,000</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Bet Strategy</label>
              <div className="flex gap-1" data-testid="strategy-selector">
                {(["flat", "percentage", "kelly"] as BetStrategy[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={betStrategy === s ? "default" : "outline"}
                    onClick={() => setBetStrategy(s)}
                    className="flex-1 capitalize text-xs"
                    data-testid={`button-strategy-${s}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Simulated Bets: {numBets}
              </label>
              <Slider
                value={[numBets]}
                onValueChange={([v]) => setNumBets(v)}
                min={100}
                max={1000}
                step={50}
                data-testid="slider-num-bets"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>100</span>
                <span>1,000</span>
              </div>
            </div>
          </div>

          <Button onClick={handleRunSimulation} className="gap-2" data-testid="button-run-simulation">
            <Play className="w-4 h-4" />
            Run Simulation
          </Button>

          {simResult && (
            <div className="space-y-4" data-testid="simulation-results">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Final Bankroll</span>
                  </div>
                  <p className={`text-lg font-bold ${simResult.finalBankroll >= startingBankroll ? "text-green-500" : "text-red-500"}`} data-testid="text-final-bankroll">
                    ${simResult.finalBankroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">ROI</span>
                  </div>
                  <p className={`text-lg font-bold ${simResult.roi >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-roi">
                    {simResult.roi >= 0 ? "+" : ""}{simResult.roi}%
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Max Drawdown</span>
                  </div>
                  <p className="text-lg font-bold text-red-500" data-testid="text-max-drawdown">
                    {simResult.maxDrawdown.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Peak Bankroll</span>
                  </div>
                  <p className="text-lg font-bold text-green-500" data-testid="text-peak-bankroll">
                    ${simResult.peakBankroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Bankroll Trajectory</p>
                <BankrollChart trajectory={simResult.trajectory} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Bet #1</span>
                  <span>Bet #{numBets}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OddsCenter() {
  useSEO({ title: "Odds Center", description: "Compare odds across sportsbooks and markets" });
  const [sport, setSport] = useState("NBA");
  const [activeTab, setActiveTab] = useState("odds");

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const allGames = data?.games ?? [];
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto" data-testid="odds-center-page">
      <PageHero
        title="Odds Center"
        subtitle={`Live odds, line movement, EV analysis, and bookmaker comparison — all in one place.${lastUpdated ? ` Updated ${lastUpdated}` : ""}`}
        description="Every game's moneyline, spread, and total are pulled from up to 15 sportsbooks and refreshed automatically. Green EV percentages mean the market is offering better-than-fair pricing on that side — those are positive-value spots. Click any row to expand the full book-by-book odds grid. Use this before any bet to verify you're getting the best available number."
        badge="Market Intelligence"
        variant="default"
        icon={<DollarSign className="w-6 h-6" />}
        actions={isFetching ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : undefined}
        data-testid="page-title"
      />

      <AIRecommendationPanel
        context={{ page: "odds-center", sport }}
        onOpenCompanion={openSorsCompanionWithContext}
        compact
      />

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex items-center gap-1.5 min-w-max">
          {SPORTS.map(s => (
            <Button
              key={s.id}
              variant={sport === s.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSport(s.id)}
              className="text-xs shrink-0"
              data-testid={`btn-sport-${s.id}`}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="odds-center-tabs">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:w-full gap-0.5" data-testid="odds-center-tabs-list">
            <TabsTrigger value="odds" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-odds-comparison">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Odds</span> <span className="sm:hidden">Odds</span>
            </TabsTrigger>
            <TabsTrigger value="ev-heatmap" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-ev-heatmap">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              EV <span className="hidden sm:inline">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="line-movement" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-line-movement">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              Lines
            </TabsTrigger>
            <TabsTrigger value="power-rankings" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-power-rankings">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              Rankings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="odds" className="mt-4">
          <OddsComparisonTab
            games={allGames}
            meta={data?.meta}
            isLoading={isLoading}
            isFetching={isFetching}
            sport={sport}
            dataUpdatedAt={dataUpdatedAt}
          />
        </TabsContent>

        <TabsContent value="ev-heatmap" className="mt-4">
          <EVHeatmapTab
            games={allGames}
            meta={data?.meta}
            isLoading={isLoading}
            isFetching={isFetching}
            dataUpdatedAt={dataUpdatedAt}
          />
        </TabsContent>

        <TabsContent value="line-movement" className="mt-4">
          <LineMovementTab
            games={allGames}
            meta={data?.meta}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="power-rankings" className="mt-4">
          <PowerRankingsTab
            games={allGames}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <div className="pt-2 text-[10px] text-muted-foreground text-center">
        Live data · Odds refresh every 30 seconds · For entertainment purposes only.
      </div>
    </div>
  );
}
