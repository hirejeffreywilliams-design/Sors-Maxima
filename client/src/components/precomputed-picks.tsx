import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Atom, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Zap, Target, BarChart3, Clock, Shield, Flame,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Star,
  Check, Info, Activity, Lock, Crown, Users, AlertTriangle,
  Timer, Sparkles
} from "lucide-react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { gradeAmbientGlow, getGradeShimmerClass } from "@/lib/grade-utils";
import { OddsAttribution } from "@/components/ui/odds-attribution";

interface CapacityInfo {
  tailCount: number;
  capacityStatus: "available" | "filling" | "diminished";
  tailersRemaining: number;
  capacityLimit: number;
}

interface PrecomputedPick {
  id: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  betType: string;
  odds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  factors: { name: string; impact: number; direction: string }[];
  generatedAt: string;
  dataSource: string;
  reasoning?: string;
  recommendation?: string;
  winProbability?: number;
  insights?: string[];
  timing?: "bet_now" | "wait" | "line_locked";
  timingAdvice?: string;
  isExclusive?: boolean;
  releaseSchedule?: {
    whaleRelease: string;
    eliteRelease: string;
    proRelease: string;
    freeRelease: string;
  };
  capacity?: CapacityInfo;
  monteCarloData?: {
    simulations: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
    homeWinProb: number;
    awayWinProb: number;
    convergenceScore: number;
  };
  situationalData?: {
    homeRestDays: number;
    awayRestDays: number;
    homeB2B: boolean;
    awayB2B: boolean;
    spotType: string;
    spotDescription: string;
  };
  injuryData?: {
    homeInjuryCount: number;
    awayInjuryCount: number;
    homeStartersOut: number;
    awayStartersOut: number;
    homePlayers?: { name: string; position: string; status: string }[];
    awayPlayers?: { name: string; position: string; status: string }[];
  };
  aiInsight?: string;
  oddsSourceBook?: string;
  oddsBookCount?: number;
  oddsApiSource?: string;
  allBookOdds?: { book: string; odds: number }[];
}

interface PredictionSnapshot {
  sport: string;
  picks: PrecomputedPick[];
  generatedAt: string;
  gamesAnalyzed: number;
  dataSource: string;
  nextRefresh: string;
  exclusivePickCount?: number;
  totalPickPool?: number;
  userTier?: string;
  pendingReleaseCount?: number;
  nextPickRelease?: string | null;
  pickProtection?: {
    staggeredRelease: boolean;
    capacityLimits: boolean;
    diversifiedDistribution: boolean;
    exclusiveAccess: boolean;
  };
}

interface EngineStatus {
  running: boolean;
  lastRunTime: string | null;
  totalRuns: number;
  failedRuns: number;
  refreshIntervalMs: number;
  cacheStatus: Record<string, { hasPicks: boolean; pickCount: number; dataSource: string; age: string; generatedAt: string }>;
}

const engineSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

function gradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500/10 border-green-500/30 text-green-500";
  if (grade.startsWith("B")) return "bg-blue-500/10 border-blue-500/30 text-blue-500";
  if (grade.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
  return "bg-red-500/10 border-red-500/30 text-red-500";
}

function confidenceColor(conf: number): string {
  if (conf >= 80) return "text-green-500";
  if (conf >= 65) return "text-blue-500";
  if (conf >= 50) return "text-yellow-500";
  return "text-red-500";
}

const FACTOR_LABELS: Record<string, string> = {
  scheme_mismatch: "Favorable Matchup", coaching_tendency: "Coaching Edge",
  sharp_money_flow: "Sors Signal™", public_fade: "Contrarian Value",
  line_movement: "Market Drift™", momentum_score: "Team Momentum",
  monte_carlo: "Sors Simulation", player_efficiency: "Player Performance",
  injury_adjustment: "Injury Impact", weather_impact: "Weather Factor",
  home_field: "Home Court/Field", rest_advantage: "Rest Advantage",
  pace_tempo: "Pace & Tempo", clutch_index: "Clutch Factor",
  point_differential: "Point Differential", strength_schedule: "Schedule Strength",
  historical_h2h: "Head-to-Head", predictive_model: "Sors Intelligence",
};

function formatFactorName(name: string): string {
  return FACTOR_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function directionIcon(dir: string) {
  if (dir === "bullish") return <ArrowUpRight className="w-3 h-3 text-green-500" />;
  if (dir === "bearish") return <ArrowDownRight className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function CapacityBar({ capacity }: { capacity: CapacityInfo }) {
  if (capacity.capacityLimit === -1) return null;

  const used = capacity.tailCount;
  const total = capacity.capacityLimit;
  const pct = Math.min(100, (used / total) * 100);

  const barColor = capacity.capacityStatus === "diminished"
    ? "bg-red-500"
    : capacity.capacityStatus === "filling"
    ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className="flex items-center gap-2 text-[10px]" data-testid="capacity-bar">
      <Users className="w-3 h-3 text-muted-foreground shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground whitespace-nowrap">
        {capacity.tailCount}/{total}
      </span>
    </div>
  );
}

function PickSignalRow({ pick }: { pick: PrecomputedPick }) {
  if (!pick.winProbability) return null;

  function americanToDecimal(odds: number): number {
    if (odds >= 100) return (odds / 100) + 1;
    return 1 - (100 / odds);
  }

  const modelPct = Math.round(pick.winProbability * 1000) / 10;
  const decOdds = americanToDecimal(pick.odds || -110);
  const marketPct = Math.round((1 / decOdds) * 1000) / 10;
  const edgePct = pick.edge !== undefined ? pick.edge : modelPct - marketPct;
  const edgePositive = edgePct >= 5;
  const edgeNeutral = edgePct >= 0 && edgePct < 5;

  return (
    <div className="space-y-1.5" data-testid={`pick-model-edge-row-${pick.id}`}>
      <div className="flex items-center justify-between text-[10px] px-0.5">
        <span className="text-muted-foreground">
          Model <span className="font-mono font-semibold text-foreground">{modelPct}%</span>
        </span>
        <span className="text-muted-foreground">
          Market <span className="font-mono font-semibold text-foreground">{marketPct}%</span>
        </span>
        <span className={edgePositive ? "text-green-500 font-semibold" : edgeNeutral ? "text-yellow-500 font-semibold" : "text-red-500 font-semibold"}>
          Edge™ {edgePct >= 0 ? "+" : ""}{edgePct.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-wrap gap-1" data-testid={`pick-risk-flags-${pick.id}`}>
        {(pick.ev ?? 0) >= 8 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20 font-medium">
            Intelligence Edge™
          </span>
        )}
        {(pick.ev ?? 0) >= 0 && (pick.ev ?? 0) < 3 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
            Low Edge
          </span>
        )}
        {pick.winProbability !== undefined && pick.winProbability >= 0.60 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
            Strong Model
          </span>
        )}
      </div>
    </div>
  );
}

function PickCard({ pick, rank, userTier, activeSport }: { pick: PrecomputedPick; rank: number; userTier: string; activeSport: string }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const legId = pick.id;
  const inSlip = isInSlip(legId);

  const tailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/picks/${pick.id}/tail`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/precomputed-predictions", activeSport.toLowerCase()] });
    },
  });

  const handleAdd = () => {
    const decimalOdds = pick.odds > 0 ? (pick.odds / 100) + 1 : (-100 / pick.odds) + 1;
    const slipLeg: ParlaySlipLeg = {
      id: legId,
      team: pick.homeTeam,
      opponent: pick.awayTeam,
      market: (["moneyline", "spread", "total", "player_prop"].includes(pick.betType) ? pick.betType : "moneyline") as "moneyline" | "spread" | "total" | "player_prop",
      outcome: pick.pick || `${pick.homeTeam} vs ${pick.awayTeam}`,
      decimalOdds,
      americanOdds: pick.odds,
      addedFrom: "46-Factor Model Analysis",
      addedAt: new Date().toISOString(),
      sport: pick.sport as any,
      confidence: pick.confidence,
      evPercent: pick.ev,
      grade: pick.grade,
      edge: pick.edge,
      reasoning: pick.reasoning,
      recommendation: pick.recommendation,
      winProbability: pick.winProbability,
      timing: pick.timing,
      timingAdvice: pick.timingAdvice,
      insights: pick.insights,
      monteCarloData: pick.monteCarloData,
      factors: pick.factors,
      gameTime: pick.gameTime,
    };
    if (addLeg(slipLeg)) {
      tailMutation.mutate();
      toast({ title: "Added to Slip", description: `${slipLeg.outcome} (Grade ${pick.grade}) added to your parlay slip` });
    }
  };

  const topFactors = pick.factors?.slice(0, 3) || [];
  const isDiminished = pick.capacity?.capacityStatus === "diminished";

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        pick.isExclusive
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 ring-1 ring-amber-500/10"
          : rank <= 3
          ? "border-primary/20 bg-gradient-to-br from-primary/3 to-transparent"
          : "border-border hover:border-primary/20"
      } ${isDiminished ? "opacity-75" : ""} ${getGradeShimmerClass(pick.grade)}`}
      style={gradeAmbientGlow(pick.grade)}
      data-testid={`card-pick-${pick.id}`}
    >
      {isDiminished && (
        <div className="absolute top-2 right-2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-500/10 border-red-500/30 text-red-500 gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                Line Risk
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Many users have tailed this pick. Line value may be diminished.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              rank === 1 ? "bg-yellow-500 text-white" :
              rank === 2 ? "bg-gray-400 text-white" :
              rank === 3 ? "bg-orange-700 text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {rank}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-pick-game-${pick.id}`}>
                {pick.game}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{pick.betType}</Badge>
                {pick.dataSource === "live" && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 gap-0.5">
                    <Activity className="w-2.5 h-2.5" />
                    Live
                  </Badge>
                )}
                {pick.isExclusive && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    Exclusive
                  </Badge>
                )}
                {userTier !== "free" && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    Early Access
                  </Badge>
                )}
                {((pick.injuryData?.homeStartersOut || 0) + (pick.injuryData?.awayStartersOut || 0)) > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 gap-0.5" data-testid={`badge-injury-alert-${pick.id}`}>
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Injury Alert
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`font-mono font-bold text-sm ${gradeBg(pick.grade)}`} data-testid={`text-pick-grade-${pick.id}`}>
              {pick.grade}
            </Badge>
            <Button
              size="icon"
              variant={inSlip ? "secondary" : "outline"}
              className="h-7 w-7"
              onClick={handleAdd}
              disabled={inSlip || isDiminished}
              data-testid={`button-add-pick-${pick.id}`}
            >
              {inSlip ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {pick.pick && (
          <div className="px-2.5 py-2 rounded-lg bg-muted/50 overflow-hidden">
            <p className="text-sm font-medium break-words" data-testid={`text-pick-value-${pick.id}`}>
              {pick.pick}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className={`text-lg font-bold font-mono ${confidenceColor(pick.confidence)}`} data-testid={`text-pick-confidence-${pick.id}`}>
              {pick.confidence}%
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Confidence</p>
          </div>
          <div>
            <p className={`text-lg font-bold font-mono ${pick.ev > 0 ? "text-green-500" : "text-red-500"}`} data-testid={`text-pick-ev-${pick.id}`}>
              {pick.ev > 0 ? "+" : ""}{pick.ev.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Edge™</p>
          </div>
          <div>
            <p className="text-lg font-bold font-mono" data-testid={`text-pick-odds-${pick.id}`}>
              {pick.odds > 0 ? "+" : ""}{pick.odds}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Odds</p>
          </div>
        </div>

        <OddsAttribution
          oddsSourceBook={pick.oddsSourceBook}
          oddsBookCount={pick.oddsBookCount}
          oddsApiSource={pick.oddsApiSource}
          allBookOdds={pick.allBookOdds}
        />

        {pick.winProbability !== undefined && (
          <PickSignalRow pick={pick} />
        )}

        {pick.capacity && pick.capacity.capacityLimit !== -1 && (
          <CapacityBar capacity={pick.capacity} />
        )}

        {topFactors.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {topFactors.map((f, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px]">
                    {directionIcon(f.direction)}
                    <span className="truncate max-w-[80px]">{formatFactorName(f.name)}</span>
                    <span className="font-mono font-bold">{f.impact}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatFactorName(f.name)}: Impact {f.impact}/100 ({f.direction})</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {pick.factors.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] text-muted-foreground transition-colors"
                data-testid={`button-expand-factors-${pick.id}`}
              >
                +{pick.factors.length - 3}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {expanded && pick.factors.length > 3 && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {pick.factors.slice(3).map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs px-1">
                <div className="flex items-center gap-1.5">
                  {directionIcon(f.direction)}
                  <span>{formatFactorName(f.name)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={f.impact} className="w-16 h-1.5" />
                  <span className="font-mono text-muted-foreground w-6 text-right">{f.impact}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {pick.aiInsight && (
          <div
            className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 px-3 py-2 flex items-start gap-2"
            data-testid={`ai-insight-${pick.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{pick.aiInsight}</p>
          </div>
        )}

        {pick.injuryData && ((pick.injuryData.homePlayers?.length || 0) + (pick.injuryData.awayPlayers?.length || 0)) > 0 && (
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2 space-y-1.5" data-testid={`injury-report-${pick.id}`}>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              <AlertTriangle className="w-3 h-3" />
              Injury Report
            </div>
            {[
              ...(pick.injuryData.homePlayers || []).map(p => ({ ...p, teamShort: pick.homeTeam.split(" ").pop() || pick.homeTeam })),
              ...(pick.injuryData.awayPlayers || []).map(p => ({ ...p, teamShort: pick.awayTeam.split(" ").pop() || pick.awayTeam })),
            ].slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium truncate">{p.name}</span>
                  {p.position && <span className="text-muted-foreground shrink-0 text-[10px]">{p.position}</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground text-[10px]">{p.teamShort}</span>
                  <Badge variant="outline" className={`text-[9px] h-4 px-1 ${p.status === "Out" ? "border-red-500/40 text-red-500 bg-red-500/10" : "border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"}`}>
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExclusivePicksBanner({ count, userTier }: { count: number; userTier: string }) {
  if (count === 0 || userTier === "whale") return null;

  return (
    <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-amber-500/5" data-testid="banner-exclusive-picks">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 truncate">
                {count} Exclusive Max Pick{count > 1 ? "s" : ""} Available
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Visible only to Max tier members
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 shrink-0" asChild data-testid="button-upgrade-exclusive">
            <a href="/pricing">Upgrade</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingReleaseBanner({ count, nextRelease, userTier }: { count: number; nextRelease: string | null; userTier: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextRelease) return;
    const update = () => {
      const diff = new Date(nextRelease).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Available now");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextRelease]);

  if (count === 0 || !nextRelease) return null;

  const tierUpgrade = userTier === "free" ? "Sharp" : userTier === "pro" ? "Edge" : "Max";
  const upgradeDelay = userTier === "free" ? "60→30 min" : userTier === "pro" ? "30→15 min" : "15→0 min";

  return (
    <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5" data-testid="banner-pending-picks">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                {count} Pick{count > 1 ? "s" : ""} releasing in {timeLeft}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Upgrade to {tierUpgrade} for faster access
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10 shrink-0 whitespace-nowrap" asChild data-testid="button-upgrade-early-access">
            <a href="/pricing">Get Early Access</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProtectionShield({ protection }: { protection: PredictionSnapshot["pickProtection"] }) {
  if (!protection) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 cursor-help">
          <Shield className="w-3 h-3" />
          <span>Line Protected</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-medium">Pick Protection Active</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {protection.staggeredRelease && <li>Staggered release by tier</li>}
            {protection.capacityLimits && <li>Tail capacity limits prevent line moves</li>}
            {protection.diversifiedDistribution && <li>Diversified pick distribution</li>}
            {protection.exclusiveAccess && <li>Full exclusive pick access</li>}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function PrecomputedPicks() {
  const [activeSport, setActiveSport] = useState<string>("NBA");
  const [sortBy, setSortBy] = useState<"confidence" | "ev" | "grade">("confidence");
  const [showCount, setShowCount] = useState(12);

  const { data: engineStatus } = useQuery<EngineStatus>({
    queryKey: ["/api/precomputed-engine/status"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: snapshot, isLoading, isError } = useQuery<PredictionSnapshot>({
    queryKey: ["/api/precomputed-predictions", activeSport.toLowerCase()],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const sortedPicks = useMemo(() => {
    if (!snapshot?.picks) return [];
    const picks = [...snapshot.picks];
    if (sortBy === "confidence") picks.sort((a, b) => b.confidence - a.confidence);
    else if (sortBy === "ev") picks.sort((a, b) => b.ev - a.ev);
    else if (sortBy === "grade") {
      const gradeOrder: Record<string, number> = { "A+": 0, "A": 1, "A-": 2, "B+": 3, "B": 4, "B-": 5, "C+": 6, "C": 7, "C-": 8, "D": 9 };
      picks.sort((a, b) => (gradeOrder[a.grade] ?? 10) - (gradeOrder[b.grade] ?? 10));
    }
    return picks;
  }, [snapshot?.picks, sortBy]);

  const visiblePicks = sortedPicks.slice(0, showCount);

  const gradeBreakdown = useMemo(() => {
    if (!snapshot?.picks) return { a: 0, b: 0, c: 0, d: 0 };
    return snapshot.picks.reduce((acc, p) => {
      if (p.grade.startsWith("A")) acc.a++;
      else if (p.grade.startsWith("B")) acc.b++;
      else if (p.grade.startsWith("C")) acc.c++;
      else acc.d++;
      return acc;
    }, { a: 0, b: 0, c: 0, d: 0 });
  }, [snapshot?.picks]);

  const avgConfidence = useMemo(() => {
    if (!snapshot?.picks?.length) return 0;
    return Math.round(snapshot.picks.reduce((s, p) => s + p.confidence, 0) / snapshot.picks.length);
  }, [snapshot?.picks]);

  const avgEv = useMemo(() => {
    if (!snapshot?.picks?.length) return 0;
    return snapshot.picks.reduce((s, p) => s + p.ev, 0) / snapshot.picks.length;
  }, [snapshot?.picks]);

  const lastUpdate = snapshot?.generatedAt ? new Date(snapshot.generatedAt) : null;
  const timeAgo = lastUpdate ? getTimeAgo(lastUpdate) : "—";
  const userTier = snapshot?.userTier || "free";

  return (
    <div className="space-y-4" data-testid="section-precomputed-picks">
      <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Atom className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2" data-testid="text-top-picks-title">
                  Intelligence Picks™
                  {engineStatus?.running && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 gap-0.5">
                      <Activity className="w-2.5 h-2.5 animate-pulse" />
                      Engine Active
                    </Badge>
                  )}
                  <ProtectionShield protection={snapshot?.pickProtection} />
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Auto-generated from 46-factor model analysis
                  {lastUpdate && <span> &middot; Updated {timeAgo}</span>}
                  {snapshot?.totalPickPool && snapshot.totalPickPool > (snapshot?.picks?.length || 0) && (
                    <span> &middot; Showing {snapshot.picks.length} of {snapshot.totalPickPool} picks</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    Predictions are automatically refreshed every 5 minutes.
                    Each pick is scored across 46 factors including sharp money flow, matchup analysis, and line movement.
                    Picks are protected with staggered release timing and capacity limits to preserve line value.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-purple-500" data-testid="text-total-picks">{snapshot?.picks?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">Your Picks</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-blue-500" data-testid="text-games-analyzed">{snapshot?.gamesAnalyzed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Games Analyzed</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className={`text-2xl font-bold ${confidenceColor(avgConfidence)}`} data-testid="text-avg-confidence">{avgConfidence}%</p>
              <p className="text-[10px] text-muted-foreground">Avg Confidence</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className={`text-2xl font-bold ${avgEv > 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-avg-ev">
                {avgEv > 0 ? "+" : ""}{avgEv.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Avg EV</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExclusivePicksBanner count={snapshot?.exclusivePickCount || 0} userTier={userTier} />
      <PendingReleaseBanner
        count={snapshot?.pendingReleaseCount || 0}
        nextRelease={snapshot?.nextPickRelease || null}
        userTier={userTier}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={activeSport} onValueChange={setActiveSport} className="flex-1">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto">
              {engineSports.map(sport => {
                const cache = engineStatus?.cacheStatus?.[sport];
                return (
                  <TabsTrigger key={sport} value={sport} className="gap-1.5 px-3" data-testid={`tab-sport-${sport.toLowerCase()}`}>
                    {sport}
                    {cache?.hasPicks && (
                      <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1">
                        {cache.pickCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </Tabs>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          {(["confidence", "ev", "grade"] as const).map(s => (
            <Button
              key={s}
              variant={sortBy === s ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setSortBy(s)}
              data-testid={`button-sort-${s}`}
            >
              {s === "confidence" ? "Confidence" : s === "ev" ? "EV" : "Grade"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading {activeSport} predictions...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-red-500/20">
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <p className="text-sm text-red-500">Unable to load predictions right now.</p>
              <p className="text-xs text-muted-foreground">The engine may still be processing. Try again in a moment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && visiblePicks.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-3">
              <span>Grades: <span className="text-green-500 font-medium">{gradeBreakdown.a} A</span> &middot; <span className="text-blue-500 font-medium">{gradeBreakdown.b} B</span> &middot; <span className="text-yellow-500 font-medium">{gradeBreakdown.c} C</span></span>
            </div>
            <span>Showing {visiblePicks.length} of {sortedPicks.length}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePicks.map((pick, i) => (
              <PickCard key={pick.id} pick={pick} rank={i + 1} userTier={userTier} activeSport={activeSport} />
            ))}
          </div>

          {showCount < sortedPicks.length && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCount(prev => Math.min(prev + 12, sortedPicks.length))}
                className="gap-2"
                data-testid="button-load-more-picks"
              >
                <ChevronDown className="w-4 h-4" />
                Show More ({sortedPicks.length - showCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && (!snapshot?.picks || snapshot.picks.length === 0) && (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-2">
              <Atom className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No {activeSport} predictions available yet.</p>
              <p className="text-xs text-muted-foreground">The engine processes new picks every 5 minutes.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
