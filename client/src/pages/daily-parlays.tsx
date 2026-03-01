import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Atom, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Zap, Target, BarChart3, Clock, Flame,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Star,
  Check, Activity, Crown, Brain, Shield,
  Sparkles, Filter, ArrowRight, ChevronRight, Eye, Plus,
  Trophy, Timer, Lock, AlertTriangle,
} from "lucide-react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Sport, GeneratedParlay } from "@shared/schema";
import { sports } from "@shared/schema";
import { useSEO } from "@/hooks/use-seo";
import { PickDisclaimer } from "@/components/pick-disclaimer";

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
  gameTime?: string;
  reasoning?: string;
  recommendation?: string;
  winProbability?: number;
  insights?: string[];
  timing?: "bet_now" | "wait" | "line_locked";
  timingAdvice?: string;
}

const FACTOR_LABELS: Record<string, string> = {
  scheme_mismatch: "Favorable Matchup", coaching_tendency: "Coaching Edge",
  sharp_money_flow: "Sharp Money", public_fade: "Contrarian Value",
  line_movement: "Line Movement", momentum_score: "Team Momentum",
  monte_carlo: "Simulation Model", player_efficiency: "Player Performance",
  injury_adjustment: "Injury Impact", weather_impact: "Weather Factor",
  home_field: "Home Court/Field", rest_advantage: "Rest Advantage",
  pace_tempo: "Pace & Tempo", clutch_index: "Clutch Factor",
  point_differential: "Point Differential", strength_schedule: "Schedule Strength",
  historical_h2h: "Head-to-Head", predictive_model: "Predictive Model",
  situational_spot: "Situational Advantage", tipster_consensus: "Expert Consensus",
  win_probability: "Win Probability", scouting_data: "Scouting Report",
  confidence_index: "Confidence Level", team_chemistry: "Team Chemistry",
};

function humanFactor(name: string): string {
  return FACTOR_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const REC_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  strong_bet: { label: "Strong Bet", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: "fire" },
  moderate_bet: { label: "Good Bet", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: "target" },
  lean_bet: { label: "Lean", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: "eye" },
  avoid: { label: "Risky", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: "shield" },
  fade: { label: "Fade", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: "shield" },
};

const TIMING_CONFIG: Record<string, { label: string; color: string; Icon: typeof Zap }> = {
  bet_now: { label: "Bet Now", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: Zap },
  wait: { label: "Wait", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Timer },
  line_locked: { label: "Locked", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", Icon: Lock },
};

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

const fallbackSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;

type GradeFilter = "all" | "A" | "B" | "C";
type SortMode = "confidence" | "ev" | "grade" | "odds";

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

function gradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
  if (grade.startsWith("B")) return "bg-blue-500/15 border-blue-500/30 text-blue-400";
  if (grade.startsWith("C")) return "bg-amber-500/15 border-amber-500/30 text-amber-400";
  return "bg-red-500/15 border-red-500/30 text-red-400";
}

function confidenceColor(conf: number): string {
  if (conf >= 80) return "text-emerald-400";
  if (conf >= 65) return "text-blue-400";
  if (conf >= 50) return "text-amber-400";
  return "text-red-400";
}

function formatOdds(odds: number): string {
  if (odds === 0) return "N/A";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatDecimalOdds(decimal: number): string {
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
}

function formatFactorName(name: string): string {
  return humanFactor(name);
}

function directionIcon(dir: string) {
  if (dir === "bullish") return <ArrowUpRight className="w-3 h-3 text-emerald-400" />;
  if (dir === "bearish") return <ArrowDownRight className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
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

function PickCard({ pick, rank, onAdd, inSlip }: {
  pick: PrecomputedPick;
  rank: number;
  onAdd: () => void;
  inSlip: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const topFactors = pick.factors?.slice(0, 3) || [];
  const isTopPick = rank <= 3;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
        isTopPick
          ? "border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-primary/3"
          : "border-border/60 hover:border-primary/20 bg-card"
      }`}
      data-testid={`card-pick-${pick.id}`}
    >
      {isTopPick && (
        <div className="absolute -top-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-xl" />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
              rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/20" :
              rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
              rank === 3 ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {rank <= 3 ? (
                <Trophy className="w-4 h-4" />
              ) : (
                rank
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-pick-game-${pick.id}`}>
                {pick.game}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">{pick.betType}</Badge>
                {pick.dataSource === "live" && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-0.5">
                    <Activity className="w-2.5 h-2.5 animate-pulse" />
                    Live
                  </Badge>
                )}
                {pick.gameTime && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {pick.gameTime}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`font-mono font-bold text-sm px-2.5 ${gradeBg(pick.grade)}`} data-testid={`text-pick-grade-${pick.id}`}>
              {pick.grade}
            </Badge>
          </div>
        </div>

        {pick.pick && (
          <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold" data-testid={`text-pick-value-${pick.id}`}>
                {pick.pick}
              </p>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {pick.timing && TIMING_CONFIG[pick.timing] && (() => {
                  const tc = TIMING_CONFIG[pick.timing!];
                  const TimingIcon = tc.Icon;
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-0.5 ${tc.color}`} data-testid={`badge-timing-${pick.id}`}>
                          <TimingIcon className="w-2.5 h-2.5" />
                          {tc.label}
                        </Badge>
                      </TooltipTrigger>
                      {pick.timingAdvice && (
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{pick.timingAdvice}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })()}
                {pick.recommendation && REC_CONFIG[pick.recommendation] && (
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${REC_CONFIG[pick.recommendation].color}`}>
                    {pick.recommendation === "strong_bet" && <Flame className="w-2.5 h-2.5 mr-0.5" />}
                    {pick.recommendation === "moderate_bet" && <Target className="w-2.5 h-2.5 mr-0.5" />}
                    {REC_CONFIG[pick.recommendation].label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {pick.reasoning && (
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <Brain className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground/80 leading-relaxed" data-testid={`text-reasoning-${pick.id}`}>
                {pick.reasoning}
              </p>
            </div>
          </div>
        )}

        <div className={`grid gap-2 ${pick.winProbability ? "grid-cols-4" : "grid-cols-3"}`}>
          {pick.winProbability && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-lg font-bold font-mono text-primary" data-testid={`text-pick-winprob-${pick.id}`}>
                {pick.winProbability}%
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Win Prob</p>
            </div>
          )}
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <p className={`text-lg font-bold font-mono ${confidenceColor(pick.confidence)}`} data-testid={`text-pick-confidence-${pick.id}`}>
              {pick.confidence}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Confidence</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <p className={`text-lg font-bold font-mono ${pick.ev > 0 ? "text-emerald-400" : "text-red-400"}`} data-testid={`text-pick-ev-${pick.id}`}>
              {pick.ev > 0 ? "+" : ""}{pick.ev.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Edge</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <p className="text-lg font-bold font-mono" data-testid={`text-pick-odds-${pick.id}`}>
              {formatOdds(pick.odds)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Odds</p>
          </div>
        </div>

        {pick.insights && pick.insights.length > 0 && (
          <div className="space-y-1">
            {pick.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <Sparkles className="w-2.5 h-2.5 text-amber-400 mt-0.5 shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {topFactors.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {topFactors.map((f, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-[10px] border border-border/30 transition-colors hover:bg-muted">
                      {directionIcon(f.direction)}
                      <span className="truncate max-w-[80px]">{formatFactorName(f.name)}</span>
                      <span className="font-mono font-bold text-primary">{f.impact}</span>
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
                  className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-muted/50 text-[10px] text-muted-foreground border border-border/30 hover:bg-muted transition-colors"
                  data-testid={`button-expand-factors-${pick.id}`}
                >
                  +{pick.factors.length - 3} factors
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        )}

        {expanded && pick.factors.length > 3 && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 px-1">
            {pick.factors.slice(3).map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
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

        <Button
          size="sm"
          variant={inSlip ? "secondary" : "default"}
          className={`w-full h-8 text-xs font-medium gap-1.5 ${
            inSlip ? "" : "bg-primary/90 hover:bg-primary"
          }`}
          onClick={onAdd}
          disabled={inSlip}
          data-testid={`button-add-pick-${pick.id}`}
        >
          {inSlip ? (
            <><Check className="w-3.5 h-3.5" /> In Your Slip</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Add to Parlay Slip</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ParlayCard({ parlay, index, sport, onAddParlay, onAddLeg, isInSlip }: {
  parlay: GeneratedParlay;
  index: number;
  sport: Sport;
  onAddParlay: () => void;
  onAddLeg: (leg: any) => void;
  isInSlip: (id: string) => boolean;
}) {
  const [showAllLegs, setShowAllLegs] = useState(false);
  const visibleLegs = showAllLegs ? parlay.legs : parlay.legs.slice(0, 4);

  return (
    <Card className={`overflow-visible transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
      index === 0 ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent" : ""
    }`} data-testid={`card-parlay-${index}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {index === 0 && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{index === 0 ? "Best Parlay" : `Parlay ${index + 1}`}</span>
                <Badge variant="outline" className="text-[10px]">{parlay.legs.length} legs</Badge>
                <Badge className={`text-[10px] ${
                  parlay.riskRating === "low" ? "bg-emerald-500/80" :
                  parlay.riskRating === "medium" ? "bg-amber-500/80" :
                  "bg-red-500/80"
                }`}>
                  {parlay.riskRating}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold font-mono text-emerald-400" data-testid={`text-parlay-odds-${index}`}>
              {formatDecimalOdds(parlay.combinedOdds)}
            </p>
            <p className="text-[10px] text-muted-foreground">potential ${parlay.potentialReturn.toFixed(0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 rounded bg-muted/30">
            <p className="font-bold text-emerald-400">{(parlay.winProbability * 100).toFixed(1)}%</p>
            <p className="text-[9px] text-muted-foreground">Win Prob</p>
          </div>
          <div className="p-1.5 rounded bg-muted/30">
            <p className="font-bold">{(parlay.expectedValue * 100).toFixed(1)}%</p>
            <p className="text-[9px] text-muted-foreground">EV</p>
          </div>
          <div className="p-1.5 rounded bg-muted/30">
            <p className="font-bold">${parlay.kellyStake.toFixed(0)}</p>
            <p className="text-[9px] text-muted-foreground">Kelly</p>
          </div>
          <div className="p-1.5 rounded bg-muted/30">
            <p className="font-bold text-emerald-400">${parlay.potentialReturn.toFixed(0)}</p>
            <p className="text-[9px] text-muted-foreground">Payout</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {visibleLegs.map((leg) => (
            <div key={leg.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{leg.outcome}</p>
                <p className="text-[10px] text-muted-foreground truncate">{leg.team}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-xs">{formatDecimalOdds(leg.decimalOdds)}</span>
                <Button
                  size="icon"
                  variant={isInSlip(leg.id) ? "secondary" : "ghost"}
                  className="h-6 w-6"
                  onClick={() => onAddLeg(leg)}
                  disabled={isInSlip(leg.id)}
                  data-testid={`button-add-leg-${leg.id}`}
                >
                  {isInSlip(leg.id) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          ))}
          {parlay.legs.length > 4 && !showAllLegs && (
            <button
              onClick={() => setShowAllLegs(true)}
              className="w-full text-center text-[11px] text-primary hover:underline py-1"
              data-testid={`button-show-all-legs-${index}`}
            >
              Show {parlay.legs.length - 4} more legs
            </button>
          )}
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs font-medium gap-1.5 bg-primary/90 hover:bg-primary"
          onClick={onAddParlay}
          data-testid={`button-add-full-parlay-${index}`}
        >
          <Star className="w-3.5 h-3.5" />
          Add Full Parlay to Slip
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DailyParlays() {
  useSEO({ title: "Daily Parlays", description: "Today's AI-generated parlay recommendations" });
  const [, navigate] = useLocation();
  const [activeSport, setActiveSport] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortMode>("confidence");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [showCount, setShowCount] = useState(12);
  const [activeTab, setActiveTab] = useState<"picks" | "parlays">("picks");
  const [generatingParlays, setGeneratingParlays] = useState(false);
  const [generatedParlays, setGeneratedParlays] = useState<GeneratedParlay[]>([]);
  const [parlayMeta, setParlayMeta] = useState<{ eventsAnalyzed: number } | null>(null);

  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const { data: inSeasonSports } = useQuery<string[]>({
    queryKey: ["/api/sports/in-season"],
    staleTime: 300_000,
  });

  const sportTabs = inSeasonSports && inSeasonSports.length > 0 ? inSeasonSports : [...fallbackSports];

  useEffect(() => {
    if (sportTabs.length > 0 && (activeSport === "" || !sportTabs.includes(activeSport))) {
      setActiveSport(sportTabs[0]);
    }
  }, [sportTabs, activeSport]);

  const { data: engineStatus } = useQuery<EngineStatus>({
    queryKey: ["/api/precomputed-engine/status"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: snapshot, isLoading } = useQuery<PredictionSnapshot>({
    queryKey: ["/api/precomputed-predictions", activeSport.toLowerCase()],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const sortedPicks = useMemo(() => {
    if (!snapshot?.picks) return [];
    let picks = [...snapshot.picks];

    if (gradeFilter !== "all") {
      picks = picks.filter(p => p.grade.startsWith(gradeFilter));
    }

    if (sortBy === "confidence") picks.sort((a, b) => b.confidence - a.confidence);
    else if (sortBy === "ev") picks.sort((a, b) => b.ev - a.ev);
    else if (sortBy === "odds") picks.sort((a, b) => Math.abs(b.odds) - Math.abs(a.odds));
    else if (sortBy === "grade") {
      const gradeOrder: Record<string, number> = { "A+": 0, "A": 1, "A-": 2, "B+": 3, "B": 4, "B-": 5, "C+": 6, "C": 7, "C-": 8, "D": 9 };
      picks.sort((a, b) => (gradeOrder[a.grade] ?? 10) - (gradeOrder[b.grade] ?? 10));
    }
    return picks;
  }, [snapshot?.picks, sortBy, gradeFilter]);

  const visiblePicks = sortedPicks.slice(0, showCount);

  const gradeBreakdown = useMemo(() => {
    if (!snapshot?.picks) return { a: 0, b: 0, c: 0, d: 0, total: 0 };
    const bd = snapshot.picks.reduce((acc, p) => {
      if (p.grade.startsWith("A")) acc.a++;
      else if (p.grade.startsWith("B")) acc.b++;
      else if (p.grade.startsWith("C")) acc.c++;
      else acc.d++;
      acc.total++;
      return acc;
    }, { a: 0, b: 0, c: 0, d: 0, total: 0 });
    return bd;
  }, [snapshot?.picks]);

  const avgConfidence = useMemo(() => {
    if (!snapshot?.picks?.length) return 0;
    return Math.round(snapshot.picks.reduce((s, p) => s + p.confidence, 0) / snapshot.picks.length);
  }, [snapshot?.picks]);

  const avgEv = useMemo(() => {
    if (!snapshot?.picks?.length) return 0;
    return snapshot.picks.reduce((s, p) => s + p.ev, 0) / snapshot.picks.length;
  }, [snapshot?.picks]);

  const topPickEv = useMemo(() => {
    if (!snapshot?.picks?.length) return 0;
    return Math.max(...snapshot.picks.map(p => p.ev));
  }, [snapshot?.picks]);

  const lastUpdate = snapshot?.generatedAt ? new Date(snapshot.generatedAt) : null;

  const handleAddPick = (pick: PrecomputedPick) => {
    const decimalOdds = pick.odds > 0 ? (pick.odds / 100) + 1 : (-100 / pick.odds) + 1;
    const slipLeg: ParlaySlipLeg = {
      id: pick.id,
      team: pick.homeTeam,
      opponent: pick.awayTeam,
      market: (["moneyline", "spread", "total", "player_prop"].includes(pick.betType) ? pick.betType : "moneyline") as any,
      outcome: pick.pick || `${pick.homeTeam} vs ${pick.awayTeam}`,
      decimalOdds,
      americanOdds: pick.odds,
      addedFrom: "Daily Picks",
      addedAt: new Date().toISOString(),
      sport: pick.sport as any,
      confidence: pick.confidence,
      evPercent: pick.ev,
    };
    if (addLeg(slipLeg)) {
      toast({ title: "Added to Slip", description: `${slipLeg.outcome} added to your parlay slip` });
    }
  };

  const handleAddLegToSlip = (leg: any) => {
    const slipLeg: ParlaySlipLeg = {
      id: leg.id,
      team: leg.team || "",
      opponent: leg.opponent || "",
      market: leg.market || "moneyline",
      outcome: leg.outcome || "",
      decimalOdds: leg.decimalOdds || 1.5,
      americanOdds: leg.americanOdds,
      addedFrom: "Daily Parlays",
      addedAt: new Date().toISOString(),
      sport: activeSport as Sport,
    };
    if (addLeg(slipLeg)) {
      toast({ title: "Added to Slip", description: `${slipLeg.outcome} added to your parlay slip` });
    }
  };

  const handleAddParlayToSlip = (parlay: GeneratedParlay) => {
    let addedCount = 0;
    parlay.legs.forEach(leg => {
      if (!isInSlip(leg.id)) {
        const slipLeg: ParlaySlipLeg = {
          id: leg.id,
          team: leg.team || "",
          opponent: leg.opponent || "",
          market: leg.market || "moneyline",
          outcome: leg.outcome || "",
          decimalOdds: leg.decimalOdds || 1.5,
          americanOdds: leg.americanOdds,
          addedFrom: "Daily Parlays",
          addedAt: new Date().toISOString(),
          sport: activeSport as Sport,
        };
        if (addLeg(slipLeg)) addedCount++;
      }
    });
    if (addedCount > 0) {
      toast({ title: "Added to Slip", description: `${addedCount} leg${addedCount > 1 ? "s" : ""} added to your parlay slip` });
    }
  };

  const handleGenerateParlays = async () => {
    setGeneratingParlays(true);
    setGeneratedParlays([]);
    setParlayMeta(null);
    try {
      const response = await apiRequest("POST", "/api/generate-parlays", {
        sport: activeSport,
        stake: 20,
        minLegs: 3,
        maxLegs: 6,
        bankroll: 1000,
        riskLevel: "moderate",
        topN: 5,
      });
      const data = await response.json();
      setGeneratedParlays(data.parlays || []);
      setParlayMeta(data.meta || null);
    } catch {
      toast({ title: "Generation Failed", description: "Could not generate parlays. Try again.", variant: "destructive" });
    } finally {
      setGeneratingParlays(false);
    }
  };

  const totalSportPicks = useMemo(() => {
    if (!engineStatus?.cacheStatus) return {};
    const counts: Record<string, number> = {};
    for (const [sport, cache] of Object.entries(engineStatus.cacheStatus)) {
      counts[sport] = cache.pickCount;
    }
    return counts;
  }, [engineStatus?.cacheStatus]);

  return (
    <div className="min-h-full" data-testid="page-daily-picks">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-purple-500/5 p-6" data-testid="section-hero">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Atom className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
                  Daily Picks
                  {engineStatus?.running && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-0.5 font-normal">
                      <Activity className="w-2.5 h-2.5 animate-pulse" />
                      Live Engine
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  38-factor model analysis across all sports
                  {lastUpdate && <span className="text-primary"> · Updated {getTimeAgo(lastUpdate)}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate("/generate")}
                data-testid="button-smart-generator"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Smart Generator
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate("/insights")}
                data-testid="button-my-insights"
              >
                <Brain className="w-3.5 h-3.5" />
                My Insights
              </Button>
            </div>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-primary" data-testid="text-total-picks">{gradeBreakdown.total}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Picks Today</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className="text-2xl font-bold text-blue-400" data-testid="text-games-analyzed">{snapshot?.gamesAnalyzed || 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Games Analyzed</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className={`text-2xl font-bold ${confidenceColor(avgConfidence)}`} data-testid="text-avg-confidence">{avgConfidence}%</p>
              <p className="text-[10px] text-muted-foreground font-medium">Avg Confidence</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border/40 text-center">
              <p className={`text-2xl font-bold ${topPickEv > 0 ? "text-emerald-400" : "text-red-400"}`} data-testid="text-top-ev">
                +{topPickEv.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Best Edge</p>
            </div>
          </div>
        </div>

        <PickDisclaimer variant="banner" />

        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/30 border border-border/40" data-testid="section-view-toggle">
          <button
            onClick={() => setActiveTab("picks")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "picks"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-picks"
          >
            <Target className="w-4 h-4" />
            Individual Picks
          </button>
          <button
            onClick={() => setActiveTab("parlays")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "parlays"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-parlays"
          >
            <Crown className="w-4 h-4" />
            Auto Parlays
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/40">
              {sportTabs.map(sport => {
                const cache = engineStatus?.cacheStatus?.[sport];
                const isActive = activeSport === sport;
                return (
                  <button
                    key={sport}
                    onClick={() => { setActiveSport(sport); setShowCount(12); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`tab-sport-${sport.toLowerCase()}`}
                  >
                    {sport}
                    {cache?.hasPicks && (
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {cache.pickCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "picks" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3 h-3 text-muted-foreground" />
                {(["all", "A", "B", "C"] as GradeFilter[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      gradeFilter === g
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`button-filter-${g}`}
                  >
                    {g === "all" ? "All" : `${g}+`}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1 text-xs">
                {(["confidence", "ev", "grade", "odds"] as SortMode[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors capitalize ${
                      sortBy === s
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`button-sort-${s}`}
                  >
                    {s === "ev" ? "EV" : s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeTab === "picks" && (
          <>
            {isLoading && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="overflow-visible">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-14 rounded-lg" />
                        <Skeleton className="h-14 rounded-lg" />
                        <Skeleton className="h-14 rounded-lg" />
                      </div>
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && visiblePicks.length > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="text-emerald-400 font-medium">{gradeBreakdown.a}A</span> ·{" "}
                      <span className="text-blue-400 font-medium">{gradeBreakdown.b}B</span> ·{" "}
                      <span className="text-amber-400 font-medium">{gradeBreakdown.c}C</span>
                    </span>
                    <span className="text-border">|</span>
                    <span>Avg EV: <span className={avgEv > 0 ? "text-emerald-400" : "text-red-400"}>{avgEv > 0 ? "+" : ""}{avgEv.toFixed(1)}%</span></span>
                  </div>
                  <span>Showing {visiblePicks.length} of {sortedPicks.length}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visiblePicks.map((pick, i) => (
                    <PickCard
                      key={pick.id}
                      pick={pick}
                      rank={i + 1}
                      onAdd={() => handleAddPick(pick)}
                      inSlip={isInSlip(pick.id)}
                    />
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

            {!isLoading && (!snapshot?.picks || snapshot.picks.length === 0) && (
              <Card className="overflow-visible border-dashed">
                <CardContent className="py-12">
                  <div className="text-center space-y-3">
                    <Atom className="h-10 w-10 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No {activeSport} predictions available yet.</p>
                    <p className="text-xs text-muted-foreground">The engine processes picks every 5 minutes from live ESPN data.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "parlays" && (
          <div className="space-y-4">
            {generatedParlays.length === 0 && !generatingParlays && (
              <Card className="overflow-visible border-dashed border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <CardContent className="py-10">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                      <Crown className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Generate {activeSport} Parlays</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Analyze all {activeSport} games and build optimized parlays with EV, win probability, and Kelly sizing.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleGenerateParlays}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20"
                      data-testid="button-generate-parlays"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate Optimal Parlays
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {generatingParlays && (
              <Card className="overflow-visible">
                <CardContent className="py-10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Analyzing {activeSport} Games...</p>
                      <p className="text-sm text-muted-foreground mt-1">Running Monte Carlo simulations and correlation analysis</p>
                    </div>
                    <Progress value={66} className="w-64" />
                  </div>
                </CardContent>
              </Card>
            )}

            {generatedParlays.length > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {parlayMeta?.eventsAnalyzed || 0} games analyzed · {generatedParlays.length} parlays generated
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={handleGenerateParlays}
                    disabled={generatingParlays}
                    data-testid="button-regenerate-parlays"
                  >
                    <RefreshCw className={`w-3 h-3 ${generatingParlays ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedParlays.map((parlay, i) => (
                    <ParlayCard
                      key={parlay.id}
                      parlay={parlay}
                      index={i}
                      sport={activeSport as Sport}
                      onAddParlay={() => handleAddParlayToSlip(parlay)}
                      onAddLeg={handleAddLegToSlip}
                      isInSlip={isInSlip}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-muted-foreground pt-2" data-testid="text-data-source">
          Powered by Quantum Fusion Engine · {snapshot?.dataSource || "ESPN"} data
          {lastUpdate && ` · Last analysis ${getTimeAgo(lastUpdate)}`}
          {engineStatus?.running && " · Auto-refreshing every 5 min"}
        </div>
      </div>
    </div>
  );
}
