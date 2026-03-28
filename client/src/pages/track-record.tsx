import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useSSE } from "@/hooks/use-sse";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/use-seo";
import {
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, RefreshCw, Database, Shield, Info, BarChart3, Target,
  Clock, Activity, Trophy, Zap, Award, Flame, Brain,
  CalendarDays, CircleDot, Star, Layers, ChevronDown, ChevronUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { PickHighlightCards } from "@/components/pick-highlight-cards";

interface CalibrationTier {
  label: string;
  minConfidence: number;
  maxConfidence: number;
  total: number;
  settled: number;
  won: number;
  lost: number;
  push: number;
  modelAvgConfidence: number;
  actualWinRate: number | null;
  calibrationGap: number | null;
}

interface TrackRecord {
  generatedAt: string;
  totalPicks: number;
  settledPicks: number;
  backtestPickCount?: number;
  livePickCount?: number;
  pendingPicks: number;
  wonPicks: number;
  lostPicks: number;
  pushPicks: number;
  overallWinRate: number | null;
  hasMinimumData: boolean;
  minimumPicksRequired: number;
  picksUntilValidated: number;
  calibrationScore: number | null;
  calibrationTiers: CalibrationTier[];
  byGrade: { grade: string; total: number; settled: number; won: number; lost: number; actualWinRate: number | null; avgOdds: number | null; breakEvenRate: number | null; roi: number | null }[];
  bySport: { sport: string; total: number; settled: number; won: number; lost: number; actualWinRate: number | null }[];
  byBetType: { betType: string; total: number; settled: number; won: number; lost: number; actualWinRate: number | null }[];
  recentTrend: { last20WinRate: number | null; last50WinRate: number | null; trend: string };
  dataIntegrity: { realDataSources: string[]; estimatedFactors: string[]; lastUpdated: string };
}

interface ModelHealth {
  status: string;
  settledCount: number;
  winRate: number;
  recentTrend: number;
  lastUpdated: string;
  backtestCount: number;
  liveCount: number;
  factorCount: number;
}

interface LctLeg {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  grade: string;
  confidence: number;
  ev: number;
  americanOdds: number;
}

interface LctEntry {
  id: number;
  date: string;
  ticketId: string;
  legs: LctLeg[];
  outcome: string | null;
  wonLegs: number | null;
  settledAt: string | null;
  mintedCardId: string | null;
}

interface LctTrackRecord {
  history: LctEntry[];
}

function WinRatePill({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground text-xs">No data</span>;
  const color = rate >= 55 ? "text-emerald-400" : rate >= 52.4 ? "text-amber-400" : "text-red-400";
  return <span className={`font-bold tabular-nums ${color}`}>{rate.toFixed(1)}%</span>;
}

function CalibrationBar({ tier }: { tier: CalibrationTier }) {
  const modelPct = tier.modelAvgConfidence;
  const actualPct = tier.actualWinRate ?? 0;
  const gap = tier.calibrationGap ?? 0;
  const isOverconfident = gap < -5;
  const isCalibrated = Math.abs(gap) <= 5;
  const hasData = tier.settled >= 10;

  return (
    <div className="space-y-2" data-testid={`calibration-tier-${tier.label}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">{tier.label}</span>
        <div className="flex items-center gap-2">
          {!hasData ? (
            <span className="text-muted-foreground italic">Need {10 - tier.settled} more picks</span>
          ) : (
            <>
              <span className="text-muted-foreground">{tier.settled} settled</span>
              {isOverconfident ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-red-500/15 text-red-400 border-red-500/30">
                  {gap.toFixed(1)}% over
                </Badge>
              ) : isCalibrated ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  Calibrated
                </Badge>
              ) : (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                  +{gap.toFixed(1)}%
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
      <div className="relative h-5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/20 transition-all"
          style={{ width: `${modelPct}%` }}
        />
        {hasData && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
              isOverconfident ? "bg-red-500/60" : isCalibrated ? "bg-emerald-500/60" : "bg-amber-500/60"
            }`}
            style={{ width: `${actualPct}%` }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-mono">
          <span className="text-muted-foreground">model {modelPct.toFixed(0)}%</span>
          {hasData && <span className="font-semibold">actual {actualPct.toFixed(1)}%</span>}
        </div>
      </div>
    </div>
  );
}

function SportBar({ s }: { s: { sport: string; total: number; settled: number; won: number; lost: number; actualWinRate: number | null } }) {
  const pct = s.actualWinRate ?? 0;
  const color = pct >= 55 ? "bg-emerald-500" : pct >= 52.4 ? "bg-amber-500" : "bg-red-500/70";
  const SPORT_ICON: Record<string, string> = { NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾", NCAAB: "🎓", NCAAF: "🏈", MLS: "⚽" };

  return (
    <div className="space-y-1" data-testid={`sport-accuracy-${s.sport}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span>{SPORT_ICON[s.sport] ?? "🎯"}</span>
          <span className="font-semibold">{s.sport}</span>
          <span className="text-muted-foreground">{s.settled}W/{s.lost}L</span>
        </div>
        <WinRatePill rate={s.actualWinRate} />
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct * 1.5)}%` }} />
      </div>
    </div>
  );
}

function BetTypeBar({ b }: { b: { betType: string; total: number; settled: number; won: number; lost: number; actualWinRate: number | null } }) {
  const pct = b.actualWinRate ?? 0;
  const color = pct >= 55 ? "bg-emerald-500" : pct >= 52.4 ? "bg-amber-500" : "bg-red-500/70";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <CircleDot className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold">{b.betType}</span>
          <span className="text-muted-foreground">{b.settled} picks</span>
        </div>
        <WinRatePill rate={b.actualWinRate} />
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct * 1.5)}%` }} />
      </div>
    </div>
  );
}

function LctStatusBadge({ outcome }: { outcome: string | null }) {
  if (!outcome || outcome === "pending") return (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
      <Clock className="h-2.5 w-2.5 mr-1" />Pending
    </Badge>
  );
  if (outcome === "won") return (
    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Won
    </Badge>
  );
  if (outcome === "partial") return (
    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
      <Star className="h-2.5 w-2.5 mr-1" />Partial
    </Badge>
  );
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
      <TrendingDown className="h-2.5 w-2.5 mr-1" />Lost
    </Badge>
  );
}

function GradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-sky-400";
  return "text-amber-400";
}

interface PropStats {
  overall: {
    total: number;
    wins: number;
    losses: number;
    pushes: number;
    pending: number;
    settled: number;
    winRate: number | null;
    avgEdge: number;
    avgConfidence: number;
  };
  byMarket: { market: string; market_label: string; total: number; wins: number; losses: number; avg_confidence: number; avg_edge: number }[];
  bySport: { sport: string; total: number; wins: number; losses: number }[];
  byGrade: { grade: string; total: number; wins: number; losses: number }[];
}

export default function TrackRecordPage() {
  useSEO({
    title: "Sors Maxima — Real Track Record & Accuracy Data",
    description: "Verified pick accuracy, calibration scores, and full transparency on data sources. No inflated claims — real results only."
  });

  const qc = useQueryClient();
  const [lctExpanded, setLctExpanded] = useState(false);

  const handleSSEEvent = useCallback((event: { type: string }) => {
    if (event.type === "track-record-update") {
      qc.invalidateQueries({ queryKey: ["/api/track-record"] });
      qc.invalidateQueries({ queryKey: ["/api/lct-track-record"] });
      qc.invalidateQueries({ queryKey: ["/api/model-health"] });
    }
  }, [qc]);

  useSSE({ onEvent: handleSSEEvent });

  const { data, isLoading } = useQuery<TrackRecord>({
    queryKey: ["/api/track-record"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: modelHealth } = useQuery<ModelHealth>({
    queryKey: ["/api/model-health"],
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: lctData } = useQuery<LctTrackRecord>({
    queryKey: ["/api/lct-track-record"],
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: propStats } = useQuery<PropStats>({
    queryKey: ["/api/prop-track-record/stats"],
    refetchInterval: 10 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/track-record/refresh"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/track-record"] }),
  });

  const topGrade = useMemo(() => {
    if (!data?.byGrade) return null;
    return [...data.byGrade]
      .filter(g => g.settled >= 15 && g.actualWinRate !== null)
      .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0];
  }, [data]);

  const topSport = useMemo(() => {
    if (!data?.bySport) return null;
    return [...data.bySport]
      .filter(s => s.settled >= 20 && s.actualWinRate !== null)
      .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))[0];
  }, [data]);

  const lctHistory = lctData?.history ?? [];
  const lctWon = lctHistory.filter(l => l.outcome === "won").length;
  const lctSettled = lctHistory.filter(l => l.outcome && l.outcome !== "pending").length;
  const visibleLct = lctExpanded ? lctHistory : lctHistory.slice(0, 3);

  const calibrationLabel = (score: number | null) => {
    if (score === null) return { text: "Initializing", color: "text-muted-foreground" };
    if (score >= 80) return { text: "Excellent", color: "text-emerald-400" };
    if (score >= 65) return { text: "Good", color: "text-sky-400" };
    if (score >= 50) return { text: "Developing", color: "text-amber-400" };
    return { text: "Calibrating", color: "text-red-400" };
  };

  const calLabel = calibrationLabel(data?.calibrationScore ?? null);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const trendIcon = data.recentTrend.trend === "improving"
    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
    : data.recentTrend.trend === "declining"
    ? <TrendingDown className="h-4 w-4 text-red-400" />
    : <Minus className="h-4 w-4 text-amber-400" />;

  const trendColor = data.recentTrend.trend === "improving"
    ? "text-emerald-400"
    : data.recentTrend.trend === "declining"
    ? "text-red-400"
    : "text-amber-400";

  const winPct = data.settledPicks > 0 ? (data.wonPicks / data.settledPicks) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <PageHero
          title="System Track Record"
          subtitle="Live accuracy data from the 46-Factor Intelligence Engine — verified against real game outcomes"
          description="Every pick generated by the model is automatically logged here with its sport, bet type, grade, and final result. Filter by sport or grade tier to see where the model performs best. Pay particular attention to win rate and average edge on A-grade picks — that's the clearest signal of model accuracy in each sport."
          badge="Performance"
          variant="gold"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-track-record"
          className="shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Hero Stat Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total tracked */}
        <Card className="border-primary/20 bg-primary/5 col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Tracked</p>
            <p className="text-2xl font-black text-primary tabular-nums" data-testid="stat-total-tracked">{data.totalPicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{data.settledPicks} settled</p>
          </CardContent>
        </Card>

        {/* Win */}
        <Card className="border-emerald-500/20 bg-emerald-500/5 col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Won</p>
            <p className="text-2xl font-black text-emerald-400 tabular-nums" data-testid="stat-won-total">{data.wonPicks}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{data.lostPicks}L · {data.pushPicks}P</p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className={`col-span-1 ${winPct >= 55 ? "border-emerald-500/30 bg-emerald-500/5" : winPct >= 52.4 ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Win Rate</p>
            <p className={`text-2xl font-black tabular-nums ${winPct >= 55 ? "text-emerald-400" : winPct >= 52.4 ? "text-amber-400" : "text-red-400"}`} data-testid="stat-win-rate">
              {data.overallWinRate !== null ? `${data.overallWinRate.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">break-even: 52.4%</p>
          </CardContent>
        </Card>

        {/* Calibration Score */}
        <Card className="border-sky-500/20 bg-sky-500/5 col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Cal. Score</p>
            <p className={`text-2xl font-black tabular-nums ${calLabel.color}`} data-testid="stat-calibration-score">
              {data.calibrationScore !== null ? `${data.calibrationScore}` : "—"}
            </p>
            <p className={`text-[10px] mt-0.5 ${calLabel.color}`}>{calLabel.text}</p>
          </CardContent>
        </Card>

        {/* Recent Trend */}
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Trend</p>
            <div className="flex flex-col items-center gap-0.5">
              {trendIcon}
              <p className={`text-sm font-bold capitalize ${trendColor}`}>{data.recentTrend.trend === "insufficient" ? "Building" : data.recentTrend.trend}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              L50: {data.recentTrend.last50WinRate !== null ? `${data.recentTrend.last50WinRate.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>

        {/* Model Status */}
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Engine</p>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${modelHealth?.status === "calibrated" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <p className={`text-sm font-bold capitalize ${modelHealth?.status === "calibrated" ? "text-emerald-400" : "text-amber-400"}`}>
                {modelHealth?.status ?? "Active"}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">{modelHealth?.factorCount ?? 46} factors</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Live vs Backtest Split ─────────────────────────────────────────── */}
      <Card className="border-primary/15">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Live Tracked Picks</p>
              <p className="text-xl font-black text-blue-400">{data.livePickCount ?? modelHealth?.liveCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Real-time outcomes</p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-12" />
            <Separator className="sm:hidden" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Backtested Picks</p>
              <p className="text-xl font-black text-amber-400">{data.backtestPickCount ?? modelHealth?.backtestCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">45-day historical validation</p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-12" />
            <Separator className="sm:hidden" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Pending</p>
              <p className="text-xl font-black text-muted-foreground">{data.pendingPicks}</p>
              <p className="text-[10px] text-muted-foreground">Awaiting outcomes</p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-12" />
            <Separator className="sm:hidden" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">Push Outcomes</p>
              <p className="text-xl font-black text-muted-foreground">{data.pushPicks}</p>
              <p className="text-[10px] text-muted-foreground">Refunded (no verdict)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Analysis Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calibration Visual */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-400" />
              Confidence Calibration Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Do our confidence scores match real win rates? Model bar shows what we predicted — result bar shows what happened.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.calibrationTiers.filter(t => t.total > 0).map((tier) => (
                <CalibrationBar key={tier.label} tier={tier} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded bg-primary/20" />
                <span>Model confidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded bg-emerald-500/60" />
                <span>Actual win rate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-4 rounded bg-red-500/60" />
                <span>Overconfident</span>
              </div>
            </div>
            {data.calibrationScore !== null && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-sky-500/8 border border-sky-500/20">
                <Brain className="h-4 w-4 text-sky-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className={`font-bold ${calLabel.color}`}>Calibration Score: {data.calibrationScore}/100</span>{" "}
                  — {data.calibrationScore >= 65 ? "Engine is self-aware of its confidence levels. Higher grades show stronger alignment between predicted and actual win rates." : "Engine is actively learning from outcomes to tighten the gap between confidence and results."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Trend Detail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              Momentum Snapshot
            </CardTitle>
            <CardDescription className="text-xs">Recent performance windows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Last 20 Games</p>
                  <p className="text-[10px] text-muted-foreground">Short-term form</p>
                </div>
                <WinRatePill rate={data.recentTrend.last20WinRate} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Last 50 Games</p>
                  <p className="text-[10px] text-muted-foreground">Medium-term trend</p>
                </div>
                <WinRatePill rate={data.recentTrend.last50WinRate} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">All-Time Overall</p>
                  <p className="text-[10px] text-muted-foreground">{data.settledPicks} picks</p>
                </div>
                <WinRatePill rate={data.overallWinRate} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
              {trendIcon}
              <div>
                <p className={`text-xs font-bold capitalize ${trendColor}`}>
                  {data.recentTrend.trend === "insufficient" ? "Building data" : data.recentTrend.trend}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {data.recentTrend.trend === "declining"
                    ? "Below recent average — normal variance at small samples"
                    : data.recentTrend.trend === "improving"
                    ? "Outperforming the long-term baseline"
                    : "Consistent with long-term average"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1 text-xs">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Model Composition</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Live picks</span><span className="font-mono">{modelHealth?.liveCount ?? data.livePickCount ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Backtest picks</span><span className="font-mono">{modelHealth?.backtestCount ?? data.backtestPickCount ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active factors</span><span className="font-mono">{modelHealth?.factorCount ?? 46}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last refreshed</span><span className="font-mono text-[10px]">{new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sport + Bet Type + Grade Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* By Sport */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Win Rate by Sport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.bySport.map((s) => <SportBar key={s.sport} s={s} />)}
            </div>
          </CardContent>
        </Card>

        {/* By Bet Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Win Rate by Bet Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.byBetType.map((b) => <BetTypeBar key={b.betType} b={b} />)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
              Moneyline and team totals have historically shown the strongest edge in this engine's model.
            </p>
          </CardContent>
        </Card>

        {/* By Grade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              Performance by Grade
            </CardTitle>
            <CardDescription className="text-xs">Win rate & ROI per grade tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.byGrade.filter(g => g.settled >= 10).map((g) => {
                const roi = g.roi ?? 0;
                const roiPos = roi >= 0;
                return (
                  <div key={g.grade} data-testid={`grade-accuracy-${g.grade}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm w-7 ${GradeColor(g.grade)}`}>{g.grade}</span>
                        <span className="text-muted-foreground">{g.settled} picks</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <WinRatePill rate={g.actualWinRate} />
                        <span className={`text-[10px] font-mono font-bold ${roiPos ? "text-emerald-400" : "text-red-400"}`}>
                          {roiPos ? "+" : ""}{roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${roiPos ? "bg-emerald-500/70" : "bg-red-500/50"}`}
                        style={{ width: `${Math.max(2, Math.min(100, Math.abs(roi) * 2))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-3 pt-2 border-t border-border leading-relaxed">
              ROI = profit per $100 bet. Grade reflects edge quality — an underdog at +150 winning 45% beats a -300 favorite winning 65%.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Player Props Track Record ────────────────────────────────────── */}
      {propStats && propStats.overall.total > 0 && (
        <Card data-testid="props-track-record-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Player Props Track Record
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {propStats.overall.settled > 0
                    ? `${propStats.overall.wins}W / ${propStats.overall.losses}L across ${propStats.overall.settled} settled props`
                    : `${propStats.overall.total} props tracked — awaiting settlement`}
                </CardDescription>
              </div>
              {propStats.overall.winRate !== null && (
                <WinRatePill rate={propStats.overall.winRate} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick stat row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Picks</p>
                <p className="text-xl font-bold tabular-nums" data-testid="props-total">{propStats.overall.total}</p>
                <p className="text-[10px] text-muted-foreground">{propStats.overall.pending} pending</p>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Win Rate</p>
                <p className={`text-xl font-bold tabular-nums ${propStats.overall.winRate !== null ? (propStats.overall.winRate >= 0.52 ? "text-emerald-400" : propStats.overall.winRate >= 0.47 ? "text-amber-400" : "text-red-400") : "text-muted-foreground"}`} data-testid="props-win-rate">
                  {propStats.overall.winRate !== null ? `${(propStats.overall.winRate * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{propStats.overall.settled} settled</p>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Avg Edge</p>
                <p className={`text-xl font-bold tabular-nums ${propStats.overall.avgEdge > 0 ? "text-emerald-400" : "text-muted-foreground"}`} data-testid="props-avg-edge">
                  {propStats.overall.avgEdge > 0 ? `+${propStats.overall.avgEdge.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">avg confidence {propStats.overall.avgConfidence > 0 ? `${propStats.overall.avgConfidence.toFixed(0)}%` : "—"}</p>
              </div>
            </div>

            {/* By Market */}
            {propStats.byMarket.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Market</p>
                <div className="space-y-2">
                  {propStats.byMarket.map((m) => {
                    const total = Number(m.wins) + Number(m.losses);
                    const rate = total > 0 ? Number(m.wins) / total : null;
                    return (
                      <div key={m.market} className="flex items-center gap-3 text-xs" data-testid={`props-market-${m.market}`}>
                        <span className="w-28 truncate font-medium text-foreground/80">{m.market_label || m.market}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rate !== null && rate >= 0.52 ? "bg-emerald-500/70" : rate !== null && rate >= 0.47 ? "bg-amber-500/60" : "bg-red-500/50"}`}
                            style={{ width: `${rate !== null ? Math.round(rate * 100) : 0}%` }}
                          />
                        </div>
                        <span className="w-10 text-right tabular-nums font-mono text-[10px]">
                          {rate !== null ? `${(rate * 100).toFixed(0)}%` : "—"}
                        </span>
                        <span className="w-14 text-right text-muted-foreground text-[10px]">{Number(m.wins)}W {Number(m.losses)}L</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Sport */}
            {propStats.bySport.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Sport</p>
                <div className="flex flex-wrap gap-2">
                  {propStats.bySport.map((s) => {
                    const total = Number(s.wins) + Number(s.losses);
                    const rate = total > 0 ? Number(s.wins) / total : null;
                    return (
                      <div key={s.sport} className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/50 px-2 py-1 text-[10px]" data-testid={`props-sport-${s.sport}`}>
                        <span className="font-semibold">{s.sport}</span>
                        <span className={`font-mono ${rate !== null && rate >= 0.52 ? "text-emerald-400" : rate !== null && rate >= 0.47 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {rate !== null ? `${(rate * 100).toFixed(0)}%` : "—"}
                        </span>
                        <span className="text-muted-foreground">({Number(s.total)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/60 pt-2 border-t border-border/40 leading-relaxed">
              Player prop picks are tracked separately. Win rate is calculated on settled outcomes only — pending picks are excluded.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Life Changer Ticket History ────────────────────────────────────── */}
      {lctHistory.length > 0 && (
        <Card className="border-amber-500/25 bg-gradient-to-br from-amber-950/15 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Life Changer Ticket™ History
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Daily high-conviction tickets — {lctSettled > 0 ? `${lctWon}/${lctSettled} settled (${((lctWon / lctSettled) * 100).toFixed(0)}%)` : "Awaiting settlements"}
                </CardDescription>
              </div>
              {lctSettled > 0 && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                  {lctWon}W / {lctSettled - lctWon}L
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleLct.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
                  data-testid={`lct-entry-${entry.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{entry.legs.length} legs</span>
                      <LctStatusBadge outcome={entry.outcome} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {entry.legs.map((leg, i) => (
                      <div key={i} className="rounded-lg bg-background/50 border border-border/40 px-2.5 py-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-muted-foreground">{leg.sport} · {leg.betType}</span>
                          <span className={`text-[10px] font-bold ${GradeColor(leg.grade)}`}>{leg.grade}</span>
                        </div>
                        <p className="text-xs font-medium leading-tight line-clamp-1">{leg.pick}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{leg.confidence}% conf</span>
                          <span className="text-[10px] text-emerald-400">+{leg.ev}% EV</span>
                          {leg.americanOdds > 0
                            ? <span className="text-[10px] text-amber-400">+{leg.americanOdds}</span>
                            : <span className="text-[10px] text-muted-foreground">{leg.americanOdds}</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                  {entry.mintedCardId && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                      <Star className="h-3 w-3" />
                      <span>S+ Intelligence Card minted: {entry.mintedCardId}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {lctHistory.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs text-muted-foreground"
                onClick={() => setLctExpanded(!lctExpanded)}
                data-testid="button-toggle-lct-history"
              >
                {lctExpanded
                  ? <><ChevronUp className="h-3.5 w-3.5 mr-1" />Show Less</>
                  : <><ChevronDown className="h-3.5 w-3.5 mr-1" />Show All {lctHistory.length} Tickets</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Performance Highlights ─────────────────────────────────────────── */}
      {(topGrade || topSport) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Where the Engine Performs Best
            </CardTitle>
            <CardDescription className="text-xs">
              Strongest signals from {data.settledPicks} settled picks across all sports and bet types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-center">
                <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wide mb-1">All-Time Wins</p>
                <p className="text-2xl font-black text-emerald-400">{data.wonPicks}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">from {data.settledPicks} picks</p>
              </div>
              {topGrade && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-center">
                  <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wide mb-1">Best Grade ROI</p>
                  <p className="text-2xl font-black text-amber-400">+{topGrade.roi?.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Grade {topGrade.grade} ({topGrade.settled} picks)</p>
                </div>
              )}
              {topSport && (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/8 p-3 text-center">
                  <p className="text-[10px] text-sky-400/70 font-semibold uppercase tracking-wide mb-1">Best Sport</p>
                  <p className="text-2xl font-black text-sky-400">{topSport.actualWinRate?.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{topSport.sport} ({topSport.settled} picks)</p>
                </div>
              )}
              <div className="rounded-xl border border-primary/20 bg-primary/8 p-3 text-center">
                <p className="text-[10px] text-primary/70 font-semibold uppercase tracking-wide mb-1">Model Status</p>
                <p className="text-lg font-black text-primary capitalize">{modelHealth?.status ?? "Active"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{data.hasMinimumData ? "Validated" : `${data.picksUntilValidated} more`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pick Highlight Hall of Fame ────────────────────────────────────── */}
      <PickHighlightCards />

      {/* ── Data Transparency ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Data Sources & Transparency
          </CardTitle>
          <CardDescription className="text-xs">Every factor that feeds the 46-Factor Intelligence Engine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Live Data Feeds
              </p>
              <div className="space-y-1.5">
                {data.dataIntegrity.realDataSources.map((src) => (
                  <div key={src} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                    {src}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Modeled Factors (Signals)
              </p>
              <div className="space-y-1.5">
                {data.dataIntegrity.estimatedFactors.map((f) => (
                  <div key={f} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">~</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Disclaimer & Accountability ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-yellow-400">Important Disclaimer</p>
                <p className="text-xs text-muted-foreground">
                  Sors Maxima provides data-driven analysis only. No system guarantees profits.
                  The sharpest bettors in the world win 54–57% over large samples.
                  Never bet money you cannot afford to lose.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/40">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium">Full Accountability Commitment</p>
                <p className="text-xs text-muted-foreground">
                  Every pick is logged before games start. We do not cherry-pick results.
                  This track record updates in real time as outcomes are confirmed.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  Updated: {new Date(data.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
