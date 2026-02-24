import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Check, Info, Activity
} from "lucide-react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";

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
}

interface PredictionSnapshot {
  sport: string;
  picks: PrecomputedPick[];
  generatedAt: string;
  gamesAnalyzed: number;
  dataSource: string;
  nextRefresh: string;
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

function formatFactorName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function directionIcon(dir: string) {
  if (dir === "bullish") return <ArrowUpRight className="w-3 h-3 text-green-500" />;
  if (dir === "bearish") return <ArrowDownRight className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function PickCard({ pick, rank }: { pick: PrecomputedPick; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const legId = pick.id;
  const inSlip = isInSlip(legId);

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
      addedFrom: "Top Picks",
      addedAt: new Date().toISOString(),
      sport: pick.sport as any,
    };
    if (addLeg(slipLeg)) {
      toast({ title: "Added to Slip", description: `${slipLeg.outcome} added to your parlay slip` });
    }
  };

  const topFactors = pick.factors?.slice(0, 3) || [];

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        rank <= 3 ? "border-primary/20 bg-gradient-to-br from-primary/3 to-transparent" : "border-border hover:border-primary/20"
      }`}
      data-testid={`card-pick-${pick.id}`}
    >
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
              disabled={inSlip}
              data-testid={`button-add-pick-${pick.id}`}
            >
              {inSlip ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {pick.pick && (
          <div className="px-2.5 py-2 rounded-lg bg-muted/50">
            <p className="text-sm font-medium" data-testid={`text-pick-value-${pick.id}`}>
              {pick.pick}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className={`text-lg font-bold font-mono ${confidenceColor(pick.confidence)}`} data-testid={`text-pick-confidence-${pick.id}`}>
              {pick.confidence}%
            </p>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
          </div>
          <div>
            <p className={`text-lg font-bold font-mono ${pick.ev > 0 ? "text-green-500" : "text-red-500"}`} data-testid={`text-pick-ev-${pick.id}`}>
              {pick.ev > 0 ? "+" : ""}{pick.ev.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">EV</p>
          </div>
          <div>
            <p className="text-lg font-bold font-mono" data-testid={`text-pick-odds-${pick.id}`}>
              {pick.odds > 0 ? "+" : ""}{pick.odds}
            </p>
            <p className="text-[10px] text-muted-foreground">Odds</p>
          </div>
        </div>

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
      </div>
    </div>
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
                  Quantum Top Picks
                  {engineStatus?.running && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 gap-0.5">
                      <Activity className="w-2.5 h-2.5 animate-pulse" />
                      Engine Active
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Auto-generated from 46-factor Quantum Fusion analysis
                  {lastUpdate && <span> &middot; Updated {timeAgo}</span>}
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
                    Predictions are automatically refreshed every 5 minutes using live ESPN data through the Quantum Fusion engine.
                    Each pick is scored across 46 factors including sharp money flow, scheme analysis, and line movement.
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
              <p className="text-[10px] text-muted-foreground">Top Picks</p>
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
              <PickCard key={pick.id} pick={pick} rank={i + 1} />
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
