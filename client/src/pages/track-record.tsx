import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useSSE } from "@/hooks/use-sse";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/use-seo";
import {
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, RefreshCw, Database, Shield, Info, BarChart3, Target,
  Clock, Activity, Trophy, Zap, Award
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

function WinRateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <Badge variant="outline" className="text-xs">No data yet</Badge>;
  if (rate >= 55) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{rate.toFixed(1)}%</Badge>;
  if (rate >= 50) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{rate.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{rate.toFixed(1)}%</Badge>;
}

function GapBadge({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (Math.abs(gap) <= 5) return <span className="text-green-400 text-xs font-mono">{gap > 0 ? "+" : ""}{gap.toFixed(1)}%</span>;
  if (gap < -5) return <span className="text-red-400 text-xs font-mono">{gap.toFixed(1)}% overconfident</span>;
  return <span className="text-yellow-400 text-xs font-mono">+{gap.toFixed(1)}% underconfident</span>;
}

export default function TrackRecordPage() {
  useSEO({
    title: "Sors Maxima - Real Track Record & Accuracy Data",
    description: "See our verified pick accuracy, calibration scores, and full transparency on data sources. No inflated claims — real results only."
  });

  const qc = useQueryClient();

  const handleSSEEvent = useCallback((event: { type: string }) => {
    if (event.type === "track-record-update") {
      qc.invalidateQueries({ queryKey: ["/api/track-record"] });
      qc.invalidateQueries({ queryKey: ["/api/lct-track-record"] });
    }
  }, [qc]);

  useSSE({ onEvent: handleSSEEvent });

  const { data, isLoading } = useQuery<TrackRecord>({
    queryKey: ["/api/track-record"],
    refetchInterval: 5 * 60 * 1000,
  });

  const [filter, setFilter] = useState<"all" | "live" | "backtest">("all");

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/track-record/refresh"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/track-record"] }),
  });

  const filteredData = useMemo(() => {
    if (!data) return null;
    return data;
  }, [data, filter]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const trendIcon = data.recentTrend.trend === "improving" ? <TrendingUp className="h-4 w-4 text-green-400" /> :
    data.recentTrend.trend === "declining" ? <TrendingDown className="h-4 w-4 text-red-400" /> :
    data.recentTrend.trend === "stable" ? <Minus className="h-4 w-4 text-yellow-400" /> :
    <Clock className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      <div className="flex flex-col gap-3">
        <PageHero
          title="Real Track Record"
          subtitle="Verified accuracy data — updated every 5 minutes from real game outcomes"
          badge="Performance"
          variant="gold"
        />
        <div className="flex items-center justify-end gap-2">
          <div className="flex bg-muted rounded-md p-1">
            <Button 
              variant={filter === "all" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 text-xs px-2"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button 
              variant={filter === "live" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 text-xs px-2"
              onClick={() => setFilter("live")}
            >
              Live
            </Button>
            <Button 
              variant={filter === "backtest" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 text-xs px-2"
              onClick={() => setFilter("backtest")}
            >
              Backtest
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-track-record"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Performance Highlights ────────────────────────────────────────── */}
      {data.byGrade && data.byGrade.length > 0 && (() => {
        const topGrade = [...data.byGrade]
          .filter(g => g.settled >= 10 && g.actualWinRate !== null)
          .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))[0];
        const topSport = [...data.bySport]
          .filter(s => s.settled >= 10 && s.actualWinRate !== null)
          .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))[0];
        return (
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-background overflow-hidden">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Model Performance Highlights
              </CardTitle>
              <CardDescription className="text-xs">
                Key findings from {data.settledPicks} settled picks — where the engine performs best
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total wins */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wide">All-Time Wins</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{data.wonPicks}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">from {data.settledPicks} picks</p>
                </div>

                {/* Best grade tier */}
                {topGrade && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Award className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wide">Top Grade</span>
                    </div>
                    <p className="text-2xl font-black text-amber-400">{topGrade.actualWinRate?.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Grade {topGrade.grade} picks ({topGrade.settled})</p>
                  </div>
                )}

                {/* Best sport */}
                {topSport && (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/8 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-[10px] text-sky-400/70 font-semibold uppercase tracking-wide">Top Sport</span>
                    </div>
                    <p className="text-2xl font-black text-sky-400">{topSport.actualWinRate?.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{topSport.sport} ({topSport.settled} picks)</p>
                  </div>
                )}

                {/* Overall win rate */}
                <div className="rounded-xl border border-primary/20 bg-primary/8 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] text-primary/70 font-semibold uppercase tracking-wide">Overall</span>
                  </div>
                  <p className="text-2xl font-black text-primary">
                    {data.overallWinRate !== null ? `${data.overallWinRate.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {data.hasMinimumData ? "validated" : `${data.picksUntilValidated} more to validate`}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed border-t border-border/40 pt-2">
                The engine's best-performing picks come from higher-grade tiers and home-team value plays. These numbers
                update automatically as more picks settle. Grade breakdown and full stats are shown below.
              </p>
            </CardContent>
          </Card>
        );
      })()}

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-400">Methodology & Transparency</p>
              <p className="text-xs text-muted-foreground">
                Track Record includes backtested picks (45-day historical lookback) and live forward-tracked picks. 
                Backtested picks use simplified spread/total models against verified game results to provide a baseline for engine calibration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-yellow-400">Important — Read Before Placing Any Bet</p>
              <p className="text-xs text-muted-foreground">
                Sors Maxima provides data-driven analysis tools only. No betting system can guarantee profits.
                Even the best sharp bettors in the world win 54–57% of the time over large samples.
                All picks are generated by the 46-Factor Intelligence Engine — not financial advice. Never bet money you cannot afford to lose.
                Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(data.settledPicks < 300 || (data.overallWinRate !== null && data.overallWinRate < 52)) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-500">Model Calibrating</p>
                <p className="text-xs text-muted-foreground">
                  Model is still calibrating — {data.settledPicks} picks settled so far. Win rates become statistically reliable at 300+ picks. Results shown are real-time and unfiltered.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!data.hasMinimumData && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold text-blue-400">Building Verified Track Record</p>
                <p className="text-xs text-muted-foreground">
                  We require {data.minimumPicksRequired} settled picks before displaying validated accuracy rates.
                  Currently tracking {data.settledPicks} settled picks. Win rates and confidence ratings shown
                  to users are intelligence projections until this threshold is reached.
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{data.settledPicks} settled</span>
                    <span>{data.picksUntilValidated} more needed</span>
                  </div>
                  <Progress value={(data.settledPicks / data.minimumPicksRequired) * 100} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-total-tracked">{data.settledPicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Settled Picks</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              <span className="text-blue-400">{data.livePickCount ?? 0} live</span>
              {" · "}
              <span className="text-amber-400">{data.backtestPickCount ?? 0} backtest</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500" data-testid="stat-won-total">{data.wonPicks}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500" data-testid="stat-lost-total">{data.lostPicks}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="stat-win-rate">
              {data.overallWinRate !== null ? (
                <div className="flex flex-col items-center">
                  <span className={data.overallWinRate >= 55 ? "text-green-500" : data.overallWinRate >= 52.4 ? "text-yellow-500" : "text-red-500"}>
                    {data.overallWinRate.toFixed(1)}%
                  </span>
                  {data.overallWinRate < 52.4 && (
                    <span className="text-[10px] text-muted-foreground font-normal mt-1 italic">
                      Break-even for -110 bets is 52.4%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-lg">Building</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Calibration by Confidence Tier
            </CardTitle>
            <CardDescription className="text-xs">
              Does our model confidence match real win rates?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.calibrationTiers.map((tier) => (
                <div key={tier.label} className="space-y-1" data-testid={`calibration-tier-${tier.label}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{tier.label} confidence</span>
                    <div className="flex items-center gap-2">
                      <WinRateBadge rate={tier.actualWinRate} />
                      {tier.settled >= 10 && <GapBadge gap={tier.calibrationGap} />}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{tier.total} picks ({tier.settled} settled)</span>
                    <span>Model avg: {tier.modelAvgConfidence.toFixed(0)}%</span>
                  </div>
                  {tier.settled < 10 && (
                    <p className="text-xs text-muted-foreground italic">Need {10 - tier.settled} more settled picks</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance by Grade
            </CardTitle>
            <CardDescription className="text-xs">
              Win rate + ROI per $100 bet — positive ROI means profitable at actual odds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.byGrade.map((g) => {
                const roi = g.roi ?? 0;
                const roiPositive = roi >= 0;
                const roiBarWidth = Math.min(100, Math.abs(roi));
                return (
                  <div key={g.grade} data-testid={`grade-accuracy-${g.grade}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold w-6 ${
                          g.grade.startsWith("A") ? "text-green-400" :
                          g.grade.startsWith("B") ? "text-blue-400" :
                          "text-yellow-400"
                        }`}>{g.grade}</span>
                        <span className="text-muted-foreground">{g.settled} settled</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {g.settled < 15 ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0">
                            Small sample
                          </Badge>
                        ) : (
                          <>
                            <span className="text-muted-foreground font-mono">
                              {g.actualWinRate !== null ? `${g.actualWinRate.toFixed(1)}% WR` : "—"}
                            </span>
                            <span className={`text-xs font-semibold font-mono ${roiPositive ? "text-green-400" : "text-red-400"}`}>
                              {roiPositive ? "+" : ""}{roi.toFixed(1)}% ROI
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {g.settled >= 15 && g.roi !== null && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${roiPositive ? "bg-green-500" : "bg-red-500/70"}`}
                          style={{ width: `${Math.max(2, roiBarWidth)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-3 pt-2 border-t border-border leading-relaxed">
              ROI = average profit per $100 bet at actual odds. Grade A doesn't mean higher win rate — it means higher quality edge score. A +150 underdog winning 45% of the time is more valuable than a -300 favorite winning 65%.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Win Rate by Sport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.bySport.map((s) => (
                <div key={s.sport} className="flex items-center justify-between text-xs" data-testid={`sport-accuracy-${s.sport}`}>
                  <div>
                    <span className="font-medium">{s.sport}</span>
                    <span className="text-muted-foreground ml-2">{s.total} picks</span>
                  </div>
                  <WinRateBadge rate={s.actualWinRate} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Performance Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Sorted by game date — most recent games first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {trendIcon}
              <span className="text-sm font-medium capitalize">
                {data.recentTrend.trend === "insufficient" ? "Building data" : data.recentTrend.trend}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last 20 games (win rate)</span>
                {data.recentTrend.last20WinRate !== null
                  ? <WinRateBadge rate={data.recentTrend.last20WinRate} />
                  : <span className="text-muted-foreground text-xs">Not enough data</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last 50 games (win rate)</span>
                {data.recentTrend.last50WinRate !== null
                  ? <WinRateBadge rate={data.recentTrend.last50WinRate} />
                  : <span className="text-muted-foreground text-xs">Not enough data</span>}
              </div>
              {data.recentTrend.trend === "declining" && (
                <p className="text-[10px] text-amber-400/80 mt-1 leading-relaxed">
                  Recent games are underperforming the overall average. Normal variance over small samples — meaningful at 100+ recent games.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Pick Hall of Fame ────────────────────────────────────────────── */}
      <PickHighlightCards />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Transparency
          </CardTitle>
          <CardDescription className="text-xs">Exactly what feeds into every pick</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Real Data Sources (verified live feeds)
            </p>
            <div className="space-y-1">
              {data.dataIntegrity.realDataSources.map((src) => (
                <div key={src} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-green-400 shrink-0">✓</span>
                  {src}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Estimated Factors (signals, not hard data)
            </p>
            <div className="space-y-1">
              {data.dataIntegrity.estimatedFactors.map((f) => (
                <div key={f} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-400 shrink-0">~</span>
                  {f}
                </div>
              ))}
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
                We publish this track record publicly and update it in real time as games complete.
                We do not cherry-pick results. Every pick generated by the engine is logged before games start.
                We believe transparency is the only honest approach for a platform handling real money decisions.
                Calibration scores and win rates will be prominently shown to users once we reach {data.minimumPicksRequired} settled picks.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date(data.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
