import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, TrendingUp, TrendingDown, Minus, Clock, Timer,
  AlertTriangle, CheckCircle, Eye, Zap, ChevronDown, ChevronUp,
  Shield, BarChart2, Target, Brain, Info, RefreshCw, Plus,
} from "lucide-react";

interface LiveFactor {
  key: string;
  label: string;
  value: number;
  direction: "bullish" | "bearish" | "neutral";
  description: string;
  trend: "up" | "down" | "flat";
}

interface LiveSpreadStatus {
  line: number;
  currentMargin: number;
  coverStatus: "covering" | "push" | "not_covering";
  coverProbability: number;
  description: string;
}

interface LiveTotalStatus {
  line: number;
  currentTotal: number;
  projectedTotal: number;
  paceStatus: "pace_over" | "pace_under" | "borderline";
  probability: number;
  description: string;
}

interface LiveFactorAdjustment {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  timeRemainingPct: number;
  gameCompletionPct: number;
  factors: LiveFactor[];
  spread?: LiveSpreadStatus;
  total?: LiveTotalStatus;
  recommendation: "hold" | "cashout_now" | "consider_hedge" | "add_live_bet" | "monitor";
  recommendationReason: string;
  confidence: number;
  lastUpdated: string;
}

interface FactorAdjustmentsResponse {
  adjustments: LiveFactorAdjustment[];
  count: number;
  hasLiveGames: boolean;
  generatedAt: string;
}

const RECOMMENDATION_CONFIG: Record<LiveFactorAdjustment["recommendation"], {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
}> = {
  hold: {
    label: "HOLD",
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/30",
    icon: CheckCircle,
  },
  cashout_now: {
    label: "CASHOUT NOW",
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
    icon: AlertTriangle,
  },
  consider_hedge: {
    label: "CONSIDER HEDGE",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    icon: Shield,
  },
  add_live_bet: {
    label: "ADD LIVE BET",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: Plus,
  },
  monitor: {
    label: "MONITOR",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    icon: Eye,
  },
};

function getTrendIcon(trend: "up" | "down" | "flat", direction: "bullish" | "bearish" | "neutral") {
  const colorClass = direction === "bullish" ? "text-green-500" : direction === "bearish" ? "text-red-500" : "text-muted-foreground";
  if (trend === "up") return <TrendingUp className={`w-3.5 h-3.5 ${colorClass}`} />;
  if (trend === "down") return <TrendingDown className={`w-3.5 h-3.5 ${colorClass}`} />;
  return <Minus className={`w-3.5 h-3.5 ${colorClass}`} />;
}

function getFactorBarColor(direction: "bullish" | "bearish" | "neutral") {
  if (direction === "bullish") return "bg-green-500";
  if (direction === "bearish") return "bg-red-500";
  return "bg-amber-500";
}

function getFactorIcon(key: string) {
  switch (key) {
    case "momentum": return <Activity className="w-3.5 h-3.5" />;
    case "cover_probability": return <Target className="w-3.5 h-3.5" />;
    case "total_pace": return <BarChart2 className="w-3.5 h-3.5" />;
    case "time_certainty": return <Clock className="w-3.5 h-3.5" />;
    case "team_quality": return <Brain className="w-3.5 h-3.5" />;
    case "scoring_efficiency": return <TrendingUp className="w-3.5 h-3.5" />;
    default: return <Zap className="w-3.5 h-3.5" />;
  }
}

function FactorBar({ factor }: { factor: LiveFactor }) {
  const barColor = getFactorBarColor(factor.direction);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1 cursor-help">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={factor.direction === "bullish" ? "text-green-500" : factor.direction === "bearish" ? "text-red-500" : "text-amber-500"}>
                {getFactorIcon(factor.key)}
              </span>
              {factor.label}
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(factor.trend, factor.direction)}
              <span className={`text-xs font-bold tabular-nums ${factor.direction === "bullish" ? "text-green-500" : factor.direction === "bearish" ? "text-red-500" : "text-muted-foreground"}`}>
                {factor.value}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700`}
              style={{ width: `${factor.value}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {factor.description}
      </TooltipContent>
    </Tooltip>
  );
}

function CoverStatusBadge({ spread }: { spread: LiveSpreadStatus }) {
  const config = {
    covering: { color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400", label: "✓ Covering" },
    push: { color: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400", label: "~ Push" },
    not_covering: { color: "bg-red-500/10 border-red-500/30 text-red-500", label: "✗ Not Covering" },
  }[spread.coverStatus];
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${config.color}`}>
      <span className="text-xs font-semibold">{config.label}</span>
      <span className="text-xs opacity-80">{spread.coverProbability}% prob</span>
    </div>
  );
}

function TotalStatusBadge({ total }: { total: LiveTotalStatus }) {
  const config = {
    pace_over: { color: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400", label: "📈 OVER pace" },
    pace_under: { color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400", label: "📉 UNDER pace" },
    borderline: { color: "bg-muted border text-muted-foreground", label: "↔ Borderline" },
  }[total.paceStatus];
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${config.color}`}>
      <span className="text-xs font-semibold">{config.label}</span>
      <span className="text-xs opacity-80">Proj {total.projectedTotal}</span>
    </div>
  );
}

function GameCard({ game, slipLegs }: { game: LiveFactorAdjustment; slipLegs: { id: string }[] }) {
  const [expanded, setExpanded] = useState(true);
  const { addLeg } = useParlaySlip();
  const { toast } = useToast();
  const rec = RECOMMENDATION_CONFIG[game.recommendation];
  const RecIcon = rec.icon;

  const completionWidth = game.gameCompletionPct;
  const completionColor = game.gameCompletionPct > 75 ? "bg-red-500" : game.gameCompletionPct > 50 ? "bg-amber-500" : "bg-green-500";

  const slipHasHomeML = slipLegs.some(l => l.id.includes(game.gameId) && l.id.includes("home"));
  const slipHasAwayML = slipLegs.some(l => l.id.includes(game.gameId) && l.id.includes("away"));

  const addLiveTeam = (side: "home" | "away") => {
    const team = side === "home" ? game.homeTeam : game.awayTeam;
    const opponent = side === "home" ? game.awayTeam : game.homeTeam;
    const leg: ParlaySlipLeg = {
      id: `live_fa_${game.gameId}_${side}`,
      team,
      opponent,
      market: "moneyline",
      outcome: `${team} ML (Live)`,
      decimalOdds: 1.91,
      americanOdds: -110,
      addedFrom: "Live Factor Adjuster",
      addedAt: new Date().toISOString(),
      sport: game.sport,
    };
    const added = addLeg(leg);
    if (added) toast({ title: "Added to Slip", description: `${team} live ML added from Factor Adjuster` });
  };

  return (
    <div className="border rounded-xl bg-card overflow-hidden" data-testid={`game-factor-card-${game.gameId}`}>
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
        onClick={() => setExpanded(v => !v)}
        data-testid={`toggle-factor-${game.gameId}`}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
            <span className="truncate max-w-[70px] sm:max-w-none">{game.awayTeam.split(" ").pop()}</span>
            <span className="text-muted-foreground font-bold shrink-0">{game.awayScore} – {game.homeScore}</span>
            <span className="truncate max-w-[70px] sm:max-w-none">{game.homeTeam.split(" ").pop()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{game.sport}</Badge>
            <Badge variant="outline" className="gap-1 bg-red-500/10 border-red-500/30 text-red-500 text-[10px] px-1.5 py-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>{game.period ? `Q${game.period}` : "LIVE"}{game.clock ? ` ${game.clock}` : ""}</span>
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${rec.bgColor} ${rec.color}`}>
            <RecIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{rec.label}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <div className="px-4 pb-1 -mt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground">{game.gameCompletionPct}% complete</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${completionColor} rounded-full transition-all duration-500`} style={{ width: `${completionWidth}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(game.timeRemainingPct * 100)}% left</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3">
          <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${rec.bgColor}`}>
            <RecIcon className={`w-4 h-4 shrink-0 mt-0.5 ${rec.color}`} />
            <div>
              <p className={`text-xs font-bold ${rec.color}`}>{rec.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{game.recommendationReason}</p>
              <p className="text-[10px] text-muted-foreground mt-1 opacity-70">Confidence: {game.confidence}%</p>
            </div>
          </div>

          {(game.spread || game.total) && (
            <div className="flex flex-wrap gap-2">
              {game.spread && <CoverStatusBadge spread={game.spread} />}
              {game.total && <TotalStatusBadge total={game.total} />}
            </div>
          )}

          {game.spread && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Spread Analysis</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{game.spread.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={game.spread.coverProbability} className="h-1.5 flex-1" />
                <span className="text-xs font-bold tabular-nums w-10 text-right">{game.spread.coverProbability}%</span>
              </div>
            </div>
          )}

          {game.total && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Pace Analysis</p>
              <p className="text-xs text-muted-foreground">{game.total.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Live Factor Readings
            </p>
            {game.factors.map(f => <FactorBar key={f.key} factor={f} />)}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={slipHasAwayML ? "secondary" : "outline"}
              className="flex-1 h-7 text-xs"
              onClick={() => addLiveTeam("away")}
              disabled={slipHasAwayML}
              data-testid={`button-live-bet-away-${game.gameId}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              {game.awayTeam.split(" ").pop()} ML
            </Button>
            <Button
              size="sm"
              variant={slipHasHomeML ? "secondary" : "outline"}
              className="flex-1 h-7 text-xs"
              onClick={() => addLiveTeam("home")}
              disabled={slipHasHomeML}
              data-testid={`button-live-bet-home-${game.gameId}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              {game.homeTeam.split(" ").pop()} ML
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveFactorAdjuster() {
  const { legs } = useParlaySlip();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data, isLoading, refetch } = useQuery<FactorAdjustmentsResponse>({
    queryKey: ["/api/live/factor-adjustments"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) setLastUpdate(new Date());
  }, [data]);

  const games = data?.adjustments || [];
  const holdCount = games.filter(g => g.recommendation === "hold").length;
  const actionCount = games.filter(g => g.recommendation === "cashout_now" || g.recommendation === "consider_hedge").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-blue-500" />
            Live Factor Adjuster
            <Badge variant="outline" className="gap-1 bg-red-500/10 border-red-500/30 text-red-500 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {actionCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                {actionCount} action needed
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => refetch()}
              data-testid="button-refresh-factors"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:inline" data-testid="text-factor-update-time">
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            All 6 factors recalibrate every 30 seconds using live scores. Cover probability uses game-time-adjusted standard deviation — the less time remaining, the more certain the outcome.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">No live games right now</p>
            <p className="text-xs mt-1">Factor Adjuster activates automatically when games tip off.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Covers NBA, NFL, NHL, NCAAB in real time
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle className="w-3 h-3" /> {holdCount} holding
              </span>
              {actionCount > 0 && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <AlertTriangle className="w-3 h-3" /> {actionCount} needs action
                </span>
              )}
              <span className="ml-auto">{games.length} live games</span>
            </div>

            <div className="space-y-3">
              {games.map(game => (
                <GameCard key={game.gameId} game={game} slipLegs={legs} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Bullish factor</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Bearish factor</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Neutral factor</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
