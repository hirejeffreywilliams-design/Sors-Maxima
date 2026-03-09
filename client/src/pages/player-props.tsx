import { useState, useMemo } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSEO } from "@/hooks/use-seo";
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronUp, Clock,
  AlertTriangle, Check, TrendingUp, Activity, Heart,
  Zap, Star, Target, Shield, Search, X, SlidersHorizontal,
  Minus, Plus, RotateCcw, BarChart3, Trophy, BookOpen,
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
  quantumScore?: number | null;
  quantumGrade?: string | null;
  quantumInsights?: string[];
  mcProjection?: { predictedTotal: number; overProb: number; convergence: number } | null;
  situationalNote?: string | null;
  vegasEdge?: number | null;
  engineSources?: string[];
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
  isPreGameReference?: boolean;
}

interface PropsResponse {
  games: GameData[];
  sport: string;
  totalGames: number;
  totalProps: number;
  dataSource: string;
  generatedAt: string;
}

interface TopPick {
  rank: number;
  grade: string;
  playerName: string;
  team: string;
  market: string;
  marketLabel: string;
  line: number;
  seasonAvg: number;
  recommendation: "over" | "under";
  confidence: number;
  reasoning: string;
  edge: number;
  overOdds: number;
  underOdds: number;
  overImpliedProb: number;
  underImpliedProb: number;
  bookmaker: string;
  bestOver?: { bookmaker: string; odds: number };
  bestUnder?: { bookmaker: string; odds: number };
  allBookmakers?: { bookmaker: string; overOdds: number; underOdds: number; line: number }[];
  gameId: string;
  gameName: string;
  gameTime: string;
  injury: { status: string; details: string } | null;
  score: number;
  dataSource: string;
  monteCarlo?: {
    simulations: number;
    hitProbability: number;
    missProbability: number;
    projectedValue: number;
    stdDev: number;
    p10: number;
    median: number;
    p90: number;
    convergenceScore: number;
    riskLevel: string;
    confidence95: [number, number];
    edgeOverMarket: number;
  };
}

interface TopPropsResponse {
  topPicks: TopPick[];
  sport: string;
  totalAnalyzed: number;
  totalGames: number;
  generatedAt: string;
  dataSource: string;
  mcSimulated?: boolean;
}

const SPORT_TABS = ["NBA", "NFL", "NHL", "MLB", "NCAAB", "NCAAF"];

const MARKET_GROUPS: Record<string, { label: string; markets: string[] }[]> = {
  NBA: [
    { label: "All", markets: [] },
    { label: "Points", markets: ["player_points"] },
    { label: "Rebounds", markets: ["player_rebounds"] },
    { label: "Assists", markets: ["player_assists"] },
    { label: "Steals", markets: ["player_steals"] },
    { label: "Blocks", markets: ["player_blocks"] },
    { label: "3-Ptrs", markets: ["player_threes"] },
    { label: "Combos", markets: ["player_points_rebounds_assists", "player_points_rebounds", "player_points_assists", "player_rebounds_assists"] },
  ],
  NFL: [
    { label: "All", markets: [] },
    { label: "Pass Yds", markets: ["player_pass_yds"] },
    { label: "Pass TDs", markets: ["player_pass_tds"] },
    { label: "Rush Yds", markets: ["player_rush_yds"] },
    { label: "Rec Yds", markets: ["player_reception_yds"] },
    { label: "Receptions", markets: ["player_receptions"] },
    { label: "Anytime TD", markets: ["player_anytime_td"] },
  ],
  NHL: [
    { label: "All", markets: [] },
    { label: "Goals", markets: ["player_goals"] },
    { label: "Assists", markets: ["player_assists"] },
    { label: "Points", markets: ["player_points"] },
    { label: "Shots", markets: ["player_shots_on_goal"] },
  ],
  MLB: [
    { label: "All", markets: [] },
    { label: "Hits", markets: ["batter_hits"] },
    { label: "Total Bases", markets: ["batter_total_bases"] },
    { label: "RBIs", markets: ["batter_rbis"] },
    { label: "Home Runs", markets: ["batter_home_runs"] },
    { label: "Ks", markets: ["pitcher_strikeouts"] },
  ],
  NCAAB: [
    { label: "All", markets: [] },
    { label: "Points", markets: ["player_points"] },
    { label: "Rebounds", markets: ["player_rebounds"] },
    { label: "Assists", markets: ["player_assists"] },
  ],
  NCAAF: [
    { label: "All", markets: [] },
    { label: "Pass Yds", markets: ["player_pass_yds"] },
    { label: "Rush Yds", markets: ["player_rush_yds"] },
    { label: "Rec Yds", markets: ["player_reception_yds"] },
  ],
};

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

const STAT_TO_MARKET_MAP: Record<string, string[]> = {
  points: ["player_points"],
  pts: ["player_points"],
  rebounds: ["player_rebounds"],
  reb: ["player_rebounds"],
  assists: ["player_assists"],
  ast: ["player_assists"],
  steals: ["player_steals"],
  stl: ["player_steals"],
  blocks: ["player_blocks"],
  blk: ["player_blocks"],
  turnovers: ["player_turnovers"],
  goals: ["player_goals"],
  shots: ["player_shots_on_goal"],
  strikeouts: ["player_strikeouts", "batter_strikeouts"],
  hits: ["player_hits", "batter_hits"],
  "passing yards": ["player_passing_yards", "player_pass_yds"],
  "rushing yards": ["player_rushing_yards", "player_rush_yds"],
  "receiving yards": ["player_receiving_yards", "player_reception_yds"],
  touchdowns: ["player_anytime_td", "player_touchdowns"],
  receptions: ["player_receptions"],
};

function matchStatToMarket(category: string, market: string): boolean {
  const cat = category.toLowerCase();
  const m = market.toLowerCase();
  const matchingMarkets = STAT_TO_MARKET_MAP[cat];
  if (matchingMarkets) {
    return matchingMarkets.some(mk => m === mk);
  }
  return false;
}

function PropCard({ prop, playerName, sport, addLeg, removeLeg, overInSlip, underInSlip, currentStat, isReadOnly }: {
  prop: MarketProp;
  playerName: string;
  sport: string;
  addLeg: (leg: any) => boolean;
  removeLeg: (legId: string) => void;
  overInSlip: boolean;
  underInSlip: boolean;
  currentStat?: { value: string; category: string } | null;
  isReadOnly?: boolean;
}) {
  const [showBooks, setShowBooks] = useState(false);
  const [customLine, setCustomLine] = useState<number | null>(null);

  const step = 0.5;
  const effectiveLine = customLine ?? prop.line;
  const adjustment = effectiveLine - prop.line;
  const isAdjusted = customLine !== null && adjustment !== 0;

  const sensitivityPct = Math.abs(adjustment) / Math.max(prop.line, 1);
  const confDelta = Math.round(sensitivityPct * 130);

  let adjustedConf = prop.confidence;
  let adjustedRec = prop.recommendation;

  if (isAdjusted) {
    if (adjustment > 0) {
      if (prop.recommendation === "over") adjustedConf = Math.max(22, prop.confidence - confDelta);
      else if (prop.recommendation === "under") adjustedConf = Math.min(94, prop.confidence + confDelta);
      if (prop.seasonAvg !== null && effectiveLine > prop.seasonAvg + 1.5) adjustedRec = "under";
    } else {
      if (prop.recommendation === "over") adjustedConf = Math.min(94, prop.confidence + confDelta);
      else if (prop.recommendation === "under") adjustedConf = Math.max(22, prop.confidence - confDelta);
      if (prop.seasonAvg !== null && effectiveLine < prop.seasonAvg - 1.5) adjustedRec = "over";
    }
  }

  const adjustedEdge = isAdjusted
    ? Math.max(-20, Math.min(40, prop.edge + (adjustment < 0 ? confDelta * 0.35 : -confDelta * 0.35)))
    : prop.edge;

  const getGrade = (conf: number): string => {
    if (conf >= 85) return "A+";
    if (conf >= 75) return "A";
    if (conf >= 65) return "B";
    if (conf >= 55) return "C";
    if (conf >= 45) return "D";
    return "F";
  };

  const adjustedGrade = getGrade(adjustedConf);
  const gradeColorClass =
    adjustedGrade === "A+" || adjustedGrade === "A"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
      : adjustedGrade === "B"
      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
      : adjustedGrade === "C"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";

  const handleAdd = (side: "over" | "under") => {
    const legId = `prop-${playerName}-${prop.market}-${side}`.replace(/\s+/g, "-").toLowerCase();
    const alreadyInSlip = side === "over" ? overInSlip : underInSlip;
    if (alreadyInSlip) {
      removeLeg(legId);
      return;
    }
    const odds = side === "over" ? prop.overOdds : prop.underOdds;
    const decOdds = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
    addLeg({
      id: legId,
      team: playerName,
      opponent: `${prop.marketLabel} ${effectiveLine}`,
      market: "player_prop" as any,
      outcome: `${playerName} ${side === "over" ? "Over" : "Under"} ${effectiveLine} ${prop.marketLabel}${isAdjusted ? " (custom)" : ""}`,
      decimalOdds: decOdds,
      americanOdds: odds,
      addedFrom: "Player Props Analyzer",
      addedAt: new Date().toISOString(),
      sport,
      confidence: adjustedConf,
      evPercent: adjustedEdge,
      reasoning: isAdjusted
        ? `[Custom Line ${effectiveLine}] ${prop.reasoning}`
        : prop.reasoning,
    });
  };

  const isOver = adjustedRec === "over";
  const isUnder = adjustedRec === "under";
  const hasEdge = adjustedConf >= 60 && adjustedRec !== "push";

  const hasAvg = prop.seasonAvg !== null && prop.seasonAvg !== undefined;
  const avgVsLine = hasAvg ? (prop.seasonAvg! - effectiveLine) : 0;
  const avgLeanOver = avgVsLine > 0.5;
  const avgLeanUnder = avgVsLine < -0.5;
  const bestBookSpread = prop.bestOver && prop.bestUnder
    ? Math.abs(prop.bestOver.odds - prop.overOdds) + Math.abs(prop.bestUnder.odds - prop.underOdds)
    : 0;
  const hasBestBook = bestBookSpread > 5;

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${isAdjusted ? "border-amber-500/30 bg-amber-500/[0.02]" : hasEdge ? "border-primary/30 bg-primary/[0.02]" : ""}`} data-testid={`prop-${playerName}-${prop.market}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold">{prop.marketLabel}</p>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold ${gradeColorClass}`} data-testid={`badge-grade-${playerName}-${prop.market}`}>
              {adjustedGrade}
            </Badge>
            {isAdjusted && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                <SlidersHorizontal className="w-2.5 h-2.5 mr-0.5" />Custom
              </Badge>
            )}
            {hasEdge && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 border-primary/30 text-primary">
                {adjustedConf}% conf
              </Badge>
            )}
            {hasAvg && avgLeanOver && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                <ArrowUp className="w-2.5 h-2.5 mr-0.5" />avg over line
              </Badge>
            )}
            {hasAvg && avgLeanUnder && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 border-red-500/30 text-red-500">
                <ArrowDown className="w-2.5 h-2.5 mr-0.5" />avg under line
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1" data-testid={`line-adjuster-${playerName}-${prop.market}`}>
              <span className="text-[10px] text-muted-foreground font-medium">Line:</span>
              <button
                onClick={() => setCustomLine(Math.max(0.5, effectiveLine - step))}
                className="w-5 h-5 rounded flex items-center justify-center bg-muted/60 hover:bg-muted border border-border/60 hover:border-border transition-colors"
                aria-label="Decrease line"
                data-testid={`button-line-down-${playerName}-${prop.market}`}
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className={`text-sm font-mono font-bold px-1 min-w-[3.5rem] text-center ${isAdjusted ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {effectiveLine % 1 === 0 ? effectiveLine.toFixed(1) : effectiveLine}
              </span>
              <button
                onClick={() => setCustomLine(effectiveLine + step)}
                className="w-5 h-5 rounded flex items-center justify-center bg-muted/60 hover:bg-muted border border-border/60 hover:border-border transition-colors"
                aria-label="Increase line"
                data-testid={`button-line-up-${playerName}-${prop.market}`}
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
              {isAdjusted && (
                <button
                  onClick={() => setCustomLine(null)}
                  className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                  aria-label="Reset to original line"
                  data-testid={`button-line-reset-${playerName}-${prop.market}`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{prop.line}</span>
                </button>
              )}
            </div>
            {hasAvg && (
              <span className="text-[10px] text-muted-foreground">
                Avg: <span className={`font-mono font-medium ${avgLeanOver ? "text-emerald-500" : avgLeanUnder ? "text-red-500" : "text-foreground"}`}>{prop.seasonAvg}</span>
              </span>
            )}
            {currentStat && (
              <span className="text-[10px] font-medium text-amber-500 flex items-center gap-0.5">
                <Activity className="w-2.5 h-2.5" />
                Live: <span className="font-mono font-bold">{currentStat.value}</span>
              </span>
            )}
          </div>

          {isAdjusted && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground">Original:</span>
              <span className="font-mono font-medium text-muted-foreground line-through">{prop.line}</span>
              <span className={`font-medium ${adjustment > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {adjustment > 0 ? `+${adjustment}` : adjustment} ({adjustedRec === "over" ? "leans OVER" : adjustedRec === "under" ? "leans UNDER" : "push"})
              </span>
            </div>
          )}

          {hasAvg && (
            <div className="mt-1.5">
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-border z-10" />
                {avgLeanOver && (
                  <div
                    className="absolute inset-y-0 left-1/2 bg-emerald-500/60 rounded-r-full"
                    style={{ width: `${Math.min(50, (avgVsLine / (effectiveLine || 1)) * 200)}%` }}
                  />
                )}
                {avgLeanUnder && (
                  <div
                    className="absolute inset-y-0 right-1/2 bg-red-500/60 rounded-l-full"
                    style={{ width: `${Math.min(50, (Math.abs(avgVsLine) / (effectiveLine || 1)) * 200)}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground/60 mt-0.5 px-0.5">
                <span>Under</span>
                <span>Line {effectiveLine}</span>
                <span>Over</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(overInSlip || underInSlip) && <Check className="w-4 h-4 text-primary" />}
        </div>
      </div>

      {isReadOnly ? (
        <div className="grid grid-cols-2 gap-2" data-testid={`ref-lines-${playerName}-${prop.market}`}>
          <div className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 border-border/40 bg-muted/20 opacity-75 ${isOver ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
            <div className="flex items-center gap-1">
              <ArrowUp className={`w-4 h-4 ${isOver ? "text-emerald-500/70" : "text-muted-foreground/60"}`} />
              <span className={`text-sm font-bold ${isOver ? "text-emerald-500/70" : "text-muted-foreground/60"}`}>OVER</span>
            </div>
            <span className={`text-lg font-mono font-bold mt-0.5 ${isOver ? "text-emerald-500/70" : "text-muted-foreground/60"}`}>
              {formatOdds(prop.overOdds)}
            </span>
            {isOver && (
              <span className="text-[9px] font-medium text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">Pre-game pick</span>
            )}
          </div>
          <div className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 border-border/40 bg-muted/20 opacity-75 ${isUnder ? "border-red-500/30 bg-red-500/5" : ""}`}>
            <div className="flex items-center gap-1">
              <ArrowDown className={`w-4 h-4 ${isUnder ? "text-red-500/70" : "text-muted-foreground/60"}`} />
              <span className={`text-sm font-bold ${isUnder ? "text-red-500/70" : "text-muted-foreground/60"}`}>UNDER</span>
            </div>
            <span className={`text-lg font-mono font-bold mt-0.5 ${isUnder ? "text-red-500/70" : "text-muted-foreground/60"}`}>
              {formatOdds(prop.underOdds)}
            </span>
            {isUnder && (
              <span className="text-[9px] font-medium text-red-600/60 dark:text-red-400/60 mt-0.5">Pre-game pick</span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${prop.marketLabel} over under selection`}>
          <button
            onClick={() => handleAdd("over")}
            aria-label={overInSlip ? `Remove ${playerName} Over from slip` : `${playerName} Over ${effectiveLine} ${prop.marketLabel} at ${formatOdds(prop.overOdds)}`}
            className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-all cursor-pointer active:scale-[0.98] ${
              overInSlip
                ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                : "border-border hover:border-emerald-500/40 hover:bg-emerald-500/5"
            }`}
            data-testid={`button-over-${playerName}-${prop.market}`}
          >
            <div className="flex items-center gap-1">
              <ArrowUp className={`w-4 h-4 ${overInSlip ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className={`text-sm font-bold ${overInSlip ? "text-emerald-500" : "text-foreground"}`}>OVER</span>
              {isOver && !overInSlip && (
                <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-wide">REC</span>
              )}
            </div>
            <span className={`text-lg font-mono font-bold mt-0.5 ${overInSlip ? "text-emerald-500" : "text-foreground"}`}>
              {formatOdds(prop.overOdds)}
            </span>
            {overInSlip ? (
              <span className="text-[10px] font-medium text-emerald-500 mt-0.5 flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" /> In Slip · tap to remove
              </span>
            ) : isOver ? (
              <span className="text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">
                {isAdjusted ? `Grade ${adjustedGrade} · ${adjustedConf}%` : "Recommended"}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => handleAdd("under")}
            aria-label={underInSlip ? `Remove ${playerName} Under from slip` : `${playerName} Under ${effectiveLine} ${prop.marketLabel} at ${formatOdds(prop.underOdds)}`}
            className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-all cursor-pointer active:scale-[0.98] ${
              underInSlip
                ? "border-red-500 bg-red-500/15 ring-2 ring-red-500/30"
                : "border-border hover:border-red-500/40 hover:bg-red-500/5"
            }`}
            data-testid={`button-under-${playerName}-${prop.market}`}
          >
            <div className="flex items-center gap-1">
              <ArrowDown className={`w-4 h-4 ${underInSlip ? "text-red-500" : "text-muted-foreground"}`} />
              <span className={`text-sm font-bold ${underInSlip ? "text-red-500" : "text-foreground"}`}>UNDER</span>
              {isUnder && !underInSlip && (
                <span className="text-[8px] font-bold text-red-500/60 uppercase tracking-wide">REC</span>
              )}
            </div>
            <span className={`text-lg font-mono font-bold mt-0.5 ${underInSlip ? "text-red-500" : "text-foreground"}`}>
              {formatOdds(prop.underOdds)}
            </span>
            {underInSlip ? (
              <span className="text-[10px] font-medium text-red-500 mt-0.5 flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" /> In Slip · tap to remove
              </span>
            ) : isUnder ? (
              <span className="text-[10px] font-medium text-red-600/60 dark:text-red-400/60 mt-0.5">
                {isAdjusted ? `Grade ${adjustedGrade} · ${adjustedConf}%` : "Recommended"}
              </span>
            ) : null}
          </button>
        </div>
      )}

      {prop.reasoning && (
        <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid={`text-reasoning-${playerName}-${prop.market}`}>
          {prop.reasoning}
        </p>
      )}

      {(prop.quantumGrade || prop.mcProjection || prop.situationalNote) && (
        <div className="flex items-center gap-1.5 flex-wrap" data-testid={`engines-${playerName}-${prop.market}`}>
          {prop.quantumGrade && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
              prop.quantumGrade.startsWith("A") ? "bg-green-500/10 text-green-600 border-green-500/30" :
              prop.quantumGrade.startsWith("B") ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
              "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
            }`}>
              <Zap className="w-2.5 h-2.5 mr-0.5" />QF: {prop.quantumGrade}
            </Badge>
          )}
          {prop.mcProjection && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30">
              <Target className="w-2.5 h-2.5 mr-0.5" />MC: {prop.mcProjection.overProb}% over
            </Badge>
          )}
          {prop.situationalNote && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/30">
              <Shield className="w-2.5 h-2.5 mr-0.5" />{prop.situationalNote}
            </Badge>
          )}
        </div>
      )}

      {prop.engineSources && prop.engineSources.length > 2 && (
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Activity className="w-2.5 h-2.5" />
          <span>46-Factor Model · {prop.engineSources.length} signals confirmed</span>
        </div>
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

function PlayerSection({ player, sport, addLeg, removeLeg, slipLegIds, isLive, isReadOnly }: {
  player: GamePlayer;
  sport: string;
  addLeg: (leg: any) => boolean;
  removeLeg: (legId: string) => void;
  slipLegIds: Set<string>;
  isLive?: boolean;
  isReadOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (player.markets.length === 0) return null;

  const hasLiveStats = isLive && player.leaderStats && player.leaderStats.length > 0;

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
          <div className="flex items-center gap-1.5 flex-wrap">
            {player.position && (
              <span className="text-[10px] text-muted-foreground">{player.position}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{player.markets.length} props</span>
            {player.injury && (
              <span className="text-[10px] text-red-500 flex items-center gap-0.5 font-medium">
                <Heart className="w-2.5 h-2.5 shrink-0" /> {player.injury.status}
              </span>
            )}
          </div>
          {player.injury?.details && (
            <p className="text-[10px] text-red-400/80 mt-0.5 leading-snug flex items-start gap-0.5 line-clamp-2">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-px" />
              <span>{player.injury.details}</span>
            </p>
          )}
          {hasLiveStats && (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Activity className="w-2.5 h-2.5 text-amber-500 shrink-0" />
              {player.leaderStats.slice(0, 4).map((s, i) => (
                <span key={i} className="text-[10px] font-medium text-amber-500">
                  {s.value} <span className="text-amber-500/70 uppercase">{s.category}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="grid gap-2 pt-1 pb-2">
          {player.injury?.details && (
            <div className="mx-1 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 flex items-start gap-1.5">
              <Heart className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">{player.injury.status}</span>
                <p className="text-[11px] text-red-400/90 leading-relaxed mt-0.5">{player.injury.details}</p>
              </div>
            </div>
          )}
          {player.markets.map((prop) => {
            const overId = `prop-${player.playerName}-${prop.market}-over`.replace(/\s+/g, "-").toLowerCase();
            const underId = `prop-${player.playerName}-${prop.market}-under`.replace(/\s+/g, "-").toLowerCase();
            const matchedStat = isLive && player.leaderStats
              ? player.leaderStats.find(s => matchStatToMarket(s.category, prop.market)) || null
              : null;
            return (
              <PropCard
                key={prop.market}
                prop={prop}
                playerName={player.playerName}
                sport={sport}
                addLeg={addLeg}
                removeLeg={removeLeg}
                overInSlip={slipLegIds.has(overId)}
                underInSlip={slipLegIds.has(underId)}
                currentStat={matchedStat}
                isReadOnly={isReadOnly}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GameSection({ game, sport, addLeg, removeLeg, slipLegIds }: {
  game: GameData;
  sport: string;
  addLeg: (leg: any) => boolean;
  removeLeg: (legId: string) => void;
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
        <CardContent className="p-3 sm:p-4 space-y-4">
          {playersWithProps.length === 0 ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {isLive
                    ? "Prop markets suspended — sportsbooks pull player prop lines during live play. Game odds and analysis remain active."
                    : "No player props available yet. Props typically post 1-2 days before game time."}
                </p>
              </div>
              {game.players && game.players.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Roster ({game.players.length} players)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {game.players.slice(0, 12).map((player) => (
                      <div key={player.playerName} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/30">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{player.playerName}</p>
                          <div className="flex items-center gap-1.5">
                            {player.position && <span className="text-[10px] text-muted-foreground">{player.position}</span>}
                            {player.injury && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-500/30 text-red-400 cursor-help">
                                    <Heart className="w-2 h-2 mr-0.5" />{player.injury.status}
                                  </Badge>
                                </TooltipTrigger>
                                {player.injury.details && (
                                  <TooltipContent side="top" className="max-w-[200px]">
                                    <p className="text-xs font-medium">{player.injury.status}</p>
                                    <p className="text-xs text-muted-foreground">{player.injury.details}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          </div>
                          {player.leaderStats && player.leaderStats.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {player.leaderStats.slice(0, 2).map(s => `${s.value} ${s.category}`).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {game.players.length > 12 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">+{game.players.length - 12} more players</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {isLive && game.isPreGameReference && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25" data-testid="banner-pregame-reference">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pre-Game Reference Lines</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      These were the final odds before tip-off. Prop markets are now suspended — sportsbooks pull lines once the game goes live. Use these as a reference to compare against your pre-game picks.
                    </p>
                  </div>
                </div>
              )}
              {[
                { label: game.awayTeam.abbreviation, logo: game.awayTeam.logo, name: game.awayTeam.name },
                { label: game.homeTeam.abbreviation, logo: game.homeTeam.logo, name: game.homeTeam.name },
              ].map((teamInfo) => {
                const teamPlayers = playersWithProps.filter(p => {
                  const pTeam = (p.team || "").toLowerCase();
                  const abbr = teamInfo.label.toLowerCase();
                  const tName = teamInfo.name.toLowerCase();
                  return pTeam === abbr || pTeam === tName || tName.includes(pTeam) || pTeam.includes(abbr);
                });
                if (teamPlayers.length === 0) return null;
                return (
                  <div key={teamInfo.label} data-testid={`team-section-${teamInfo.label}`}>
                    <div className="flex items-center gap-2 py-1.5 mb-1 border-b border-border/50">
                      {teamInfo.logo && <img src={teamInfo.logo} alt="" className="w-5 h-5" />}
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{teamInfo.label}</span>
                      <span className="text-[10px] text-muted-foreground">{teamPlayers.length} players</span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {teamPlayers.map((player) => (
                        <PlayerSection
                          key={player.playerName}
                          player={player}
                          sport={sport}
                          addLeg={addLeg}
                          removeLeg={removeLeg}
                          slipLegIds={slipLegIds}
                          isLive={isLive}
                          isReadOnly={isLive && game.isPreGameReference}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {(() => {
                const categorized = new Set<string>();
                [game.awayTeam, game.homeTeam].forEach(t => {
                  playersWithProps.forEach(p => {
                    const pTeam = (p.team || "").toLowerCase();
                    const abbr = t.abbreviation.toLowerCase();
                    const tName = t.name.toLowerCase();
                    if (pTeam === abbr || pTeam === tName || tName.includes(pTeam) || pTeam.includes(abbr)) {
                      categorized.add(p.playerName);
                    }
                  });
                });
                const uncategorized = playersWithProps.filter(p => !categorized.has(p.playerName));
                if (uncategorized.length === 0) return null;
                return (
                  <div>
                    <div className="divide-y divide-border/30">
                      {uncategorized.map((player) => (
                        <PlayerSection
                          key={player.playerName}
                          player={player}
                          sport={sport}
                          addLeg={addLeg}
                          removeLeg={removeLeg}
                          slipLegIds={slipLegIds}
                          isLive={isLive}
                          isReadOnly={isLive && game.isPreGameReference}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-500";
  if (grade.startsWith("B")) return "text-amber-500";
  return "text-muted-foreground";
}

function gradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/10 border-emerald-500/30";
  if (grade.startsWith("B")) return "bg-amber-500/10 border-amber-500/30";
  return "bg-muted/50 border-border";
}

function TopPickCard({ pick, addLeg, removeLeg, slipLegIds, sport }: {
  pick: TopPick;
  addLeg: (leg: any) => boolean;
  removeLeg: (legId: string) => void;
  slipLegIds: Set<string>;
  sport: string;
}) {
  const isOver = pick.recommendation === "over";
  const side = pick.recommendation;
  const odds = isOver ? pick.overOdds : pick.underOdds;
  const decOdds = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
  const legId = `prop-${pick.playerName}-${pick.market}-${side}`.replace(/\s+/g, "-").toLowerCase();
  const inSlip = slipLegIds.has(legId);

  const handleAdd = () => {
    if (inSlip) {
      removeLeg(legId);
      return;
    }
    addLeg({
      id: legId,
      team: pick.playerName,
      opponent: `${pick.marketLabel} ${pick.line}`,
      market: "player_prop" as any,
      outcome: `${pick.playerName} ${isOver ? "Over" : "Under"} ${pick.line} ${pick.marketLabel}`,
      decimalOdds: decOdds,
      americanOdds: odds,
      addedFrom: "Top Props Engine",
      addedAt: new Date().toISOString(),
      sport,
      confidence: pick.confidence,
      evPercent: pick.edge,
      reasoning: pick.reasoning,
    });
  };

  return (
    <div
      className={`rounded-xl border-2 p-3 sm:p-4 space-y-2 min-w-[260px] sm:min-w-[300px] snap-start shrink-0 ${gradeBg(pick.grade)}`}
      data-testid={`top-pick-card-${pick.rank}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`text-lg font-bold font-mono ${gradeColor(pick.grade)}`} data-testid={`text-grade-${pick.rank}`}>
            {pick.grade}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" data-testid={`text-top-player-${pick.rank}`}>{pick.playerName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{pick.gameName}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
          #{pick.rank}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium">{pick.marketLabel}</span>
        <span className="text-muted-foreground">Line: <span className="font-mono font-bold text-foreground">{pick.line}</span></span>
        <span className="text-muted-foreground">Avg: <span className="font-mono font-bold text-foreground">{pick.seasonAvg}</span></span>
      </div>

      <button
        onClick={handleAdd}
        disabled={inSlip}
        className={`w-full flex items-center justify-between rounded-lg border-2 p-3 transition-all touch-target ${
          isOver
            ? "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
            : "border-red-500 bg-red-500/10 hover:bg-red-500/20"
        } ${inSlip ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
        aria-label={`Add ${pick.playerName} ${isOver ? "Over" : "Under"} ${pick.line} ${pick.marketLabel}`}
        data-testid={`button-add-top-pick-${pick.rank}`}
      >
        <div className="flex items-center gap-2">
          {isOver ? (
            <ArrowUp className="w-5 h-5 text-emerald-500" />
          ) : (
            <ArrowDown className="w-5 h-5 text-red-500" />
          )}
          <span className={`text-base font-bold ${isOver ? "text-emerald-500" : "text-red-500"}`}>
            {isOver ? "OVER" : "UNDER"} {pick.line}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-mono font-bold ${isOver ? "text-emerald-500" : "text-red-500"}`}>
            {formatOdds(odds)}
          </span>
          {inSlip ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <span className="text-[10px] text-muted-foreground">+ Slip</span>
          )}
        </div>
      </button>

      {pick.monteCarlo && (
        <div className="rounded-md bg-muted/50 border px-2 py-1.5 space-y-1" data-testid={`mc-data-${pick.rank}`}>
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="w-3 h-3 text-primary" />
              MC Hit: <span className="font-bold text-primary">{pick.monteCarlo.hitProbability.toFixed(1)}%</span>
            </span>
            <span className="text-muted-foreground font-mono">
              {pick.monteCarlo.p10}–{pick.monteCarlo.p90} range
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pick.monteCarlo.hitProbability >= 60 ? "bg-emerald-500" :
                pick.monteCarlo.hitProbability >= 50 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, pick.monteCarlo.hitProbability)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Proj: {pick.monteCarlo.projectedValue}</span>
            <span>{(pick.monteCarlo.simulations / 1000).toFixed(0)}K sims</span>
            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
              pick.monteCarlo.riskLevel === "low" ? "text-emerald-600 border-emerald-500/30" :
              pick.monteCarlo.riskLevel === "medium" ? "text-yellow-600 border-yellow-500/30" :
              "text-red-500 border-red-500/30"
            }`}>
              {pick.monteCarlo.riskLevel}
            </Badge>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Target className="w-3 h-3" /> {pick.confidence}%
          </span>
          <span className={`flex items-center gap-0.5 font-medium ${pick.edge > 0 ? "text-emerald-500" : "text-red-500"}`}>
            <TrendingUp className="w-3 h-3" /> {pick.edge > 0 ? "+" : ""}{pick.edge}%
          </span>
        </div>
        {pick.bestOver && isOver && (
          <span className="text-muted-foreground">Best: {pick.bestOver.bookmaker.replace(".ag", "").split(" ")[0]} {formatOdds(pick.bestOver.odds)}</span>
        )}
        {pick.bestUnder && !isOver && (
          <span className="text-muted-foreground">Best: {pick.bestUnder.bookmaker.replace(".ag", "").split(" ")[0]} {formatOdds(pick.bestUnder.odds)}</span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid={`text-top-reasoning-${pick.rank}`}>
        {pick.reasoning}
      </p>
    </div>
  );
}

function TopPicksHero({ sport, addLeg, removeLeg, slipLegIds }: {
  sport: string;
  addLeg: (leg: any) => boolean;
  removeLeg: (legId: string) => void;
  slipLegIds: Set<string>;
}) {
  const { data, isLoading } = useQuery<TopPropsResponse>({
    queryKey: ["/api/top-props", sport],
    queryFn: async () => {
      const res = await fetch(`/api/top-props/${sport}`);
      if (!res.ok) throw new Error("Failed to fetch top props");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-[280px] rounded-xl shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.topPicks.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]" data-testid="section-top-picks">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold" data-testid="heading-top-picks">Engine Top Picks</h2>
              <p className="text-[10px] text-muted-foreground">
                {data.totalAnalyzed} props analyzed across {data.totalGames} games
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 border-primary/30 text-primary">
              <Shield className="w-3 h-3 mr-0.5" /> {data.topPicks.length} picks
            </Badge>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1" data-testid="top-picks-scroll">
          {data.topPicks.map((pick) => (
            <TopPickCard
              key={`${pick.playerName}-${pick.market}`}
              pick={pick}
              addLeg={addLeg}
              removeLeg={removeLeg}
              slipLegIds={slipLegIds}
              sport={sport}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t pt-2 flex-wrap">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-emerald-500" /> A+ = highest conviction</span>
          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Edge = season avg vs line</span>
          {data.dataSource && <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Live from {data.dataSource}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Prop Track Record Section ─────────────────────────────────────────────────
interface PropTrackStats {
  overall: {
    total: number; wins: number; losses: number; pushes: number;
    pending: number; settled: number; winRate: number | null;
    avgEdge: number; avgConfidence: number;
  };
  byMarket: { market: string; market_label: string; total: string; wins: string; losses: string; avg_confidence: string; avg_edge: string }[];
  bySport: { sport: string; total: string; wins: string; losses: string }[];
  byGrade: { grade: string; total: string; wins: string; losses: string }[];
}

function PropTrackRecord() {
  const [open, setOpen] = useState(false);

  const { data: stats, isLoading } = useQuery<PropTrackStats>({
    queryKey: ["/api/prop-track-record/stats"],
    enabled: open,
    refetchInterval: open ? 60000 : false,
  });

  const { data: recentData } = useQuery<{ picks: any[]; total: number }>({
    queryKey: ["/api/prop-track-record"],
    enabled: open,
    refetchInterval: open ? 60000 : false,
  });

  const outcomeColor = (outcome: string) => {
    if (outcome === "won") return "text-green-500 bg-green-500/10 border-green-500/30";
    if (outcome === "lost") return "text-red-500 bg-red-500/10 border-red-500/30";
    if (outcome === "push") return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    return "text-muted-foreground bg-muted/40";
  };

  const winRatePct = stats?.overall?.winRate != null
    ? `${(stats.overall.winRate * 100).toFixed(1)}%`
    : "—";

  return (
    <div data-testid="section-prop-track-record">
      <Separator />
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-3 py-4 text-left"
            data-testid="button-toggle-track-record"
          >
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Prop Intelligence Track Record</p>
              <p className="text-xs text-muted-foreground">
                Live record of every model-recommended prop pick — learning in real time
              </p>
            </div>
            {stats?.overall?.settled != null && stats.overall.settled > 0 && (
              <Badge variant="outline" className="text-xs shrink-0">
                {winRatePct} on {stats.overall.settled} settled
              </Badge>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pb-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          )}

          {stats && (
            <>
              {/* Overall Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="track-record-overall">
                {[
                  { label: "Win Rate", value: winRatePct, sub: `${stats.overall.settled} settled` },
                  { label: "Record", value: `${stats.overall.wins}–${stats.overall.losses}`, sub: `${stats.overall.pushes} push` },
                  { label: "Avg Confidence", value: stats.overall.avgConfidence > 0 ? `${Math.round(stats.overall.avgConfidence)}%` : "—", sub: "model score" },
                  { label: "Pending", value: stats.overall.pending.toString(), sub: "awaiting results" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl border bg-card p-3 text-center" data-testid={`track-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Learning notice */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">Self-improving system:</span> As picks are settled, the model automatically adjusts its confidence for each market type. Markets where it's historically accurate receive higher confidence boosts. Markets where it underperforms are down-weighted — so every settled pick makes future recommendations smarter.
                </p>
              </div>

              {/* Per-market breakdown */}
              {stats.byMarket.length > 0 && (
                <div className="space-y-2" data-testid="track-record-by-market">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance by Market</p>
                  <div className="space-y-1.5">
                    {stats.byMarket.map(m => {
                      const wins = Number(m.wins);
                      const losses = Number(m.losses);
                      const total = wins + losses;
                      const rate = total > 0 ? wins / total : 0;
                      return (
                        <div key={m.market} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2" data-testid={`market-row-${m.market}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.market_label || m.market}</p>
                            <p className="text-[10px] text-muted-foreground">{total} settled</p>
                          </div>
                          <div className="text-xs font-bold">
                            {wins}–{losses}
                          </div>
                          <div className={`text-xs font-bold w-14 text-right ${rate >= 0.55 ? "text-green-500" : rate >= 0.50 ? "text-amber-500" : "text-red-500"}`}>
                            {total > 0 ? `${(rate * 100).toFixed(0)}%` : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent picks */}
              {recentData && recentData.picks.length > 0 && (
                <div className="space-y-2" data-testid="track-record-recent">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Picks ({recentData.total} total)</p>
                  <div className="space-y-1.5">
                    {recentData.picks.slice(0, 10).map((pick: any) => (
                      <div key={pick.id} className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2" data-testid={`pick-row-${pick.id}`}>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold truncate">{pick.player_name}</p>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{pick.sport}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {pick.selection === "under" ? "Under" : "Over"} {pick.line} {pick.market_label}
                            {pick.actual_result != null && (
                              <span className="ml-1 font-medium">→ Actual: {pick.actual_result}</span>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{pick.confidence_grade}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 border ${outcomeColor(pick.outcome)}`}>
                            {pick.outcome}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.overall.total === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No picks recorded yet.</p>
                  <p className="text-xs mt-1">Picks are automatically saved as the model generates prop recommendations.</p>
                </div>
              )}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function PlayerPropsPage() {
  useSEO({ title: "Player Props — Over/Under", description: "Real-time player prop over/under picks powered by Sors Intelligence" });
  const [selectedSport, setSelectedSport] = useState("NBA");
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("All");
  const { legs, addLeg, removeLeg } = useParlaySlip();

  const slipLegIds = new Set(legs.map(l => l.id));

  const { data, isLoading, error, dataUpdatedAt } = useQuery<PropsResponse>({
    queryKey: ["/api/game-player-props", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/game-player-props/${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch player props");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";

  const marketGroups = MARKET_GROUPS[selectedSport] || [{ label: "All", markets: [] }];

  const filteredGames = useMemo(() => {
    if (!data?.games) return [];
    const activeGroup = marketGroups.find(g => g.label === marketFilter);
    const activeMarkets = activeGroup?.markets || [];
    return data.games
      .map(game => ({
        ...game,
        players: game.players
          .filter(p => !searchQuery.trim() || p.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(p => ({
            ...p,
            markets: activeMarkets.length > 0
              ? p.markets.filter(m => activeMarkets.includes(m.market))
              : p.markets,
          }))
          .filter(p => p.markets.length > 0),
      }))
      .filter(game => game.players.length > 0);
  }, [data, searchQuery, marketFilter, selectedSport]);

  const totalFilteredProps = filteredGames.reduce((sum, g) => sum + g.players.reduce((s, p) => s + p.markets.length, 0), 0);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <header className="space-y-3">
          <PageHero
            icon={<Target className="w-6 h-6" />}
            title="Player Props"
            subtitle="Over/Under picks — tap a side to add to your slip"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="sport-tabs">
            {SPORT_TABS.map((sport) => (
              <Button
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                size="sm"
                className="text-xs shrink-0 touch-target"
                onClick={() => { setSelectedSport(sport); setMarketFilter("All"); setSearchQuery(""); }}
                data-testid={`button-sport-${sport}`}
              >
                {sport}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="pl-8 pr-8 h-8 text-xs"
                data-testid="input-player-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {(searchQuery || marketFilter !== "All") && (
              <button
                onClick={() => { setSearchQuery(""); setMarketFilter("All"); }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid="button-clear-filters"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="market-filter-chips">
            <SlidersHorizontal className="w-3 h-3 text-muted-foreground shrink-0" />
            {marketGroups.map(group => (
              <button
                key={group.label}
                onClick={() => setMarketFilter(group.label)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors shrink-0 whitespace-nowrap ${
                  marketFilter === group.label
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`button-market-filter-${group.label}`}
              >
                {group.label}
              </button>
            ))}
          </div>

          {data && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {searchQuery || marketFilter !== "All"
                  ? <>{filteredGames.length} games &middot; {totalFilteredProps} props <span className="text-primary">(filtered)</span></>
                  : <>{data.totalGames} games &middot; {data.totalProps} props</>
                }
              </span>
              {data.dataSource && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                  data.dataSource.includes("Odds API") ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-muted"
                }`} data-testid="badge-data-source">
                  {data.dataSource}
                </Badge>
              )}
              {lastUpdate && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {lastUpdate}
                </span>
              )}
            </div>
          )}
        </header>

        <TopPicksHero sport={selectedSport} addLeg={addLeg} removeLeg={removeLeg} slipLegIds={slipLegIds} />

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
            {filteredGames.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  {searchQuery || marketFilter !== "All" ? (
                    <>
                      <p className="text-base font-medium">No results found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? `No players matching "${searchQuery}"` : `No ${marketFilter} props available`} for {selectedSport}.
                      </p>
                      <button
                        onClick={() => { setSearchQuery(""); setMarketFilter("All"); }}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium">No {selectedSport} games found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try a different sport or check back when games are scheduled.</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredGames.map((game) => (
                  <GameSection
                    key={game.gameId}
                    game={game}
                    sport={selectedSport}
                    addLeg={addLeg}
                    removeLeg={removeLeg}
                    slipLegIds={slipLegIds}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <PropTrackRecord />
      </div>
    </div>
  );
}
