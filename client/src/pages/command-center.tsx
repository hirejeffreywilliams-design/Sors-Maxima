import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSSE } from "@/hooks/use-sse";
import { queryClient } from "@/lib/queryClient";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Brain, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Cloud, Flame, Heart, Radio, RefreshCw,
  Shield, Sparkles, Star, Target, TrendingUp, Zap, AlertCircle, Wifi, WifiOff,
  Trophy, DollarSign, Layers, Plus, Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/use-seo";

interface TopPick {
  id: string;
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  factors: { name: string; impact: number; direction: string }[];
  gameTime?: string;
  homeTeam: string;
  awayTeam: string;
  reasoning: string;
  recommendation?: string;
  winProbability?: number;
  insights?: string[];
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
};

function humanFactor(name: string): string {
  return FACTOR_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const REC_STYLES: Record<string, { label: string; color: string }> = {
  strong_bet: { label: "Strong Bet", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  moderate_bet: { label: "Good Bet", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  lean_bet: { label: "Lean", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  avoid: { label: "Risky", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  fade: { label: "Fade", color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

interface UnifiedGame {
  id: string;
  sport: string;
  name: string;
  shortName: string;
  date: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    record: string;
    score: number;
    logo?: string;
    color?: string;
    winPct: number;
  };
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    period: number;
    clock: string;
    completed: boolean;
  };
  odds?: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
  };
  bookmakerCount: number;
  injuries: {
    home: { total: number; starters: number; keyPlayers: string[] };
    away: { total: number; starters: number; keyPlayers: string[] };
  };
  weather?: {
    temperature: number;
    windSpeed: number;
    precipitation: number;
    impactLevel: string;
    factors: string[];
  };
  momentum?: {
    direction: "home" | "away" | "neutral";
    score: number;
  };
}

interface EdgeAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  sport: string;
  game: string;
  title: string;
  description: string;
  reason: string;
  timing: "early_value" | "settled" | "steam" | "unknown";
  timestamp: string;
  actionable: boolean;
}

interface DataSourceHealth {
  name: string;
  status: "live" | "stale" | "down";
  lastUpdated: string;
  latencyMs: number;
  recordCount: number;
}

interface SportSummary {
  sport: string;
  gamesCount: number;
  liveCount: number;
  upcomingCount: number;
  picksAvailable: number;
  topEdge: number;
  hasWeatherAlerts: boolean;
  hasInjuryAlerts: boolean;
}

interface IntelligenceFeed {
  topPicks: TopPick[];
  liveGames: UnifiedGame[];
  upcomingGames: UnifiedGame[];
  edgeAlerts: EdgeAlert[];
  dataSourceHealth: DataSourceHealth[];
  sportSummaries: SportSummary[];
  opportunityScore: number;
  generatedAt: string;
  nextRefresh: string;
}

interface OptimalTicketLeg {
  id: string;
  pickId: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  americanOdds: number;
  decimalOdds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  reasoning: string;
  winProbability: number;
  factors: { name: string; impact: number; direction: string }[];
  timing: string;
  timingAdvice: string;
  sport: string;
  gameTime?: string;
}

interface OptimalTicket {
  id: string;
  name: string;
  legs: OptimalTicketLeg[];
  totalOdds: number;
  americanOdds: number;
  combinedGrade: string;
  combinedConfidence: number;
  combinedEV: number;
  winProbability: number;
  recommendedStake: number;
  potentialPayout: number;
  riskRating: "low" | "medium" | "high";
  reasoning: string;
  sports: string[];
  engineConvergence: {
    quantumFusion: boolean;
    monteCarlo: boolean;
    situational: boolean;
    injury: boolean;
    vegas: boolean;
    market: boolean;
  };
  generatedAt: string;
}

interface OptimalTicketsResponse {
  tickets: OptimalTicket[];
  ticketCount: number;
  sports: string[];
  riskLevel: string;
  generatedAt: string;
  engineSources: string[];
}

interface MatchupTicket {
  id: string;
  matchupGame: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  legs: OptimalTicketLeg[];
  legCount: number;
  totalOdds: number;
  americanOdds: number;
  combinedGrade: string;
  combinedConfidence: number;
  combinedEV: number;
  winProbability: number;
  recommendedStake: number;
  potentialPayout: number;
  reasoning: string;
  marketBreakdown: {
    spreads: OptimalTicketLeg[];
    totals: OptimalTicketLeg[];
    moneylines: OptimalTicketLeg[];
    playerProps: OptimalTicketLeg[];
    other: OptimalTicketLeg[];
  };
  engineConvergence: {
    quantumFusion: boolean;
    monteCarlo: boolean;
    situational: boolean;
    injury: boolean;
    vegas: boolean;
    market: boolean;
  };
  generatedAt: string;
}

interface MatchupTicketsResponse {
  matchupTickets: MatchupTicket[];
  ticketCount: number;
  sports: string[];
  generatedAt: string;
  engineSources: string[];
}

const ENGINE_LABELS: Record<string, { label: string; icon: typeof Brain }> = {
  quantumFusion: { label: "Quantum Fusion", icon: Brain },
  monteCarlo: { label: "Monte Carlo", icon: Target },
  situational: { label: "Situational", icon: Clock },
  injury: { label: "Injury", icon: Heart },
  vegas: { label: "Vegas", icon: DollarSign },
  market: { label: "Market", icon: TrendingUp },
};

function TicketCard({ ticket, legs, addLeg }: { ticket: OptimalTicket; legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const allInSlip = ticket.legs.every(l => legs.some(sl => sl.id === `ticket-${l.pickId}`));
  const someInSlip = ticket.legs.some(l => legs.some(sl => sl.id === `ticket-${l.pickId}`));

  const handleAddAll = () => {
    for (const leg of ticket.legs) {
      const legId = `ticket-${leg.pickId}`;
      if (legs.some(sl => sl.id === legId)) continue;
      addLeg({
        id: legId,
        team: leg.team,
        opponent: leg.opponent,
        market: leg.market as any,
        outcome: leg.outcome,
        decimalOdds: leg.decimalOdds,
        americanOdds: leg.americanOdds,
        addedFrom: `Ticket: ${ticket.name}`,
        addedAt: new Date().toISOString(),
        sport: leg.sport,
        confidence: leg.confidence,
        evPercent: leg.ev,
        grade: leg.grade,
        edge: leg.edge,
        reasoning: leg.reasoning,
        gameTime: leg.gameTime,
      });
    }
  };

  const riskStyles: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    high: "bg-red-500/10 text-red-500 border-red-500/30",
  };

  return (
    <Card className="group border hover:border-primary/40 transition-all duration-200 overflow-hidden" data-testid={`card-ticket-${ticket.id}`}>
      <div className={`h-1 w-full ${ticket.combinedGrade.startsWith("A") ? "bg-green-500" : ticket.combinedGrade.startsWith("B") ? "bg-blue-500" : "bg-yellow-500"}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm" data-testid={`text-ticket-name-${ticket.id}`}>{ticket.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ticket.sports.map(s => (
                <Badge key={s} variant="outline" className={`text-[10px] px-1.5 py-0 ${sportColor(s)}`}>{s}</Badge>
              ))}
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${riskStyles[ticket.riskRating]}`}>
                {ticket.riskRating === "low" ? "Conservative" : ticket.riskRating === "medium" ? "Moderate" : "Aggressive"}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className={`font-mono font-bold text-base px-2.5 py-1 ${gradeBg(ticket.combinedGrade)}`} data-testid={`badge-grade-${ticket.id}`}>
            {ticket.combinedGrade}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase">Odds</p>
            <p className="font-mono font-bold text-sm" data-testid={`text-odds-${ticket.id}`}>{formatOdds(ticket.americanOdds)}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase">Stake</p>
            <p className="font-mono font-bold text-sm" data-testid={`text-stake-${ticket.id}`}>${ticket.recommendedStake}</p>
          </div>
          <div className="p-2 rounded-md bg-emerald-500/10">
            <p className="text-[10px] text-muted-foreground uppercase">Payout</p>
            <p className="font-mono font-bold text-sm text-emerald-500" data-testid={`text-payout-${ticket.id}`}>${ticket.potentialPayout.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {ticket.legs.map((leg, i) => {
            const inSlip = legs.some(sl => sl.id === `ticket-${leg.pickId}`);
            return (
              <div key={leg.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${inSlip ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`} data-testid={`row-leg-${leg.id}`}>
                <span className="text-muted-foreground w-4 shrink-0">L{i + 1}</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${sportColor(leg.sport)}`}>{leg.sport}</Badge>
                <span className="font-medium truncate flex-1">{leg.outcome}</span>
                <span className="font-mono text-muted-foreground shrink-0">{formatOdds(leg.americanOdds)}</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${gradeBg(leg.grade)}`}>{leg.grade}</Badge>
                {inSlip && <Check className="w-3 h-3 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className="px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-1.5">
            <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-foreground/80 leading-relaxed" data-testid={`text-ticket-reasoning-${ticket.id}`}>
              {ticket.reasoning}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(ticket.engineConvergence).map(([key, active]) => {
            const eng = ENGINE_LABELS[key];
            if (!eng) return null;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border ${
                  active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-muted/50 border-muted text-muted-foreground/40"
                }`}
              >
                {active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />}
                {eng.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Conf: {ticket.combinedConfidence}%</span>
          <span className="text-muted-foreground/30">|</span>
          <span className={ticket.combinedEV > 0 ? "text-green-500" : "text-red-500"}>EV: {ticket.combinedEV > 0 ? "+" : ""}{ticket.combinedEV}%</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Win: {ticket.winProbability}%</span>
        </div>

        <Button
          onClick={handleAddAll}
          disabled={allInSlip}
          className="w-full gap-2"
          size="sm"
          variant={allInSlip ? "secondary" : "default"}
          data-testid={`button-add-ticket-${ticket.id}`}
        >
          {allInSlip ? (
            <><Check className="w-3.5 h-3.5" /> All Legs in Slip</>
          ) : someInSlip ? (
            <><Plus className="w-3.5 h-3.5" /> Add Remaining Legs</>
          ) : (
            <><Layers className="w-3.5 h-3.5" /> Add All {ticket.legs.length} Legs to Slip</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

function gradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500/10 border-green-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/10 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function sportColor(sport: string): string {
  const colors: Record<string, string> = {
    NBA: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    NFL: "bg-green-500/15 text-green-600 dark:text-green-400",
    MLB: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    NHL: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    NCAAB: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    NCAAF: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  };
  return colors[sport] || "bg-muted text-muted-foreground";
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function PickCard({ pick, legs, addLeg }: { pick: TopPick; legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const legId = `cmd-${pick.id}`;
  const inSlip = legs.some(l => l.id === legId);

  const handleAdd = () => {
    if (inSlip) return;
    const decimalOdds = pick.odds < 0
      ? 1 + (100 / Math.abs(pick.odds))
      : 1 + (pick.odds / 100);

    const validMarket = ["moneyline", "spread", "total", "player_prop"].includes(pick.betType)
      ? pick.betType
      : "moneyline";

    addLeg({
      id: legId,
      team: pick.homeTeam,
      opponent: pick.awayTeam,
      market: validMarket as any,
      outcome: pick.pick,
      decimalOdds,
      americanOdds: pick.odds,
      addedFrom: "Command Center",
      addedAt: new Date().toISOString(),
      sport: pick.sport,
      confidence: pick.confidence,
      evPercent: pick.ev,
      gameTime: pick.gameTime,
    });
  };

  const rec = pick.recommendation ? REC_STYLES[pick.recommendation] : null;
  const topFactors = (pick.factors || []).filter(f => f.direction === "bullish").slice(0, 3);

  return (
    <div
      className="group relative p-3 sm:p-4 rounded-lg bg-card border hover:border-primary/30 transition-all duration-200"
      data-testid={`card-pick-${pick.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sportColor(pick.sport)}`}>
              {pick.sport}
            </Badge>
            {rec && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rec.color}`}>
                {rec.label}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground truncate">{pick.game}</span>
          </div>
          <p className="font-semibold text-sm" data-testid={`text-pick-${pick.id}`}>{pick.pick}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{formatOdds(pick.odds)}</span>
            {pick.winProbability ? (
              <span className="text-primary font-medium">Win: {pick.winProbability}%</span>
            ) : (
              <span>Conf: {pick.confidence}%</span>
            )}
            <span className={pick.ev > 0 ? "text-green-500" : "text-red-500"}>
              EV: {pick.ev > 0 ? "+" : ""}{pick.ev.toFixed(1)}%
            </span>
          </div>
          {pick.reasoning && (
            <div className="mt-1 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-1.5">
                <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-foreground/80 leading-relaxed" data-testid={`text-reasoning-${pick.id}`}>
                  {pick.reasoning}
                </p>
              </div>
            </div>
          )}
          {topFactors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {topFactors.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                  {humanFactor(f.name)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`font-mono font-bold text-sm ${gradeBg(pick.grade)}`}>
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
    </div>
  );
}

function LiveGameCard({ game }: { game: UnifiedGame }) {
  return (
    <div className="p-3 rounded-md bg-card border" data-testid={`card-live-${game.id}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant="outline" className={sportColor(game.sport)}>{game.sport}</Badge>
        <div className="flex items-center gap-1.5 text-xs">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-red-500 font-medium">{game.status.detail}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium truncate">{game.awayTeam.abbreviation}</span>
          <span className="font-bold tabular-nums">{game.awayTeam.score}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium truncate">{game.homeTeam.abbreviation}</span>
          <span className="font-bold tabular-nums">{game.homeTeam.score}</span>
        </div>
      </div>
      {game.momentum && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          Momentum: <span className="font-medium text-foreground">
            {game.momentum.direction === "home" ? game.homeTeam.abbreviation : game.momentum.direction === "away" ? game.awayTeam.abbreviation : "Even"}
          </span>
        </div>
      )}
    </div>
  );
}

function UpcomingGameRow({ game }: { game: UnifiedGame }) {
  const gameTime = new Date(game.date);
  const timeStr = gameTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const hasInjuries = game.injuries.home.starters > 0 || game.injuries.away.starters > 0;
  const hasWeather = game.weather && game.weather.impactLevel !== "none" && game.weather.impactLevel !== "low";

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" data-testid={`row-upcoming-${game.id}`}>
      <Badge variant="outline" className={`text-[10px] shrink-0 ${sportColor(game.sport)}`}>{game.sport}</Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{game.shortName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeStr}</span>
          {game.odds?.spread !== undefined && (
            <span className="font-mono">Sprd: {game.odds.spread > 0 ? "+" : ""}{game.odds.spread}</span>
          )}
          {game.odds?.total !== undefined && (
            <span className="font-mono">O/U: {game.odds.total}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasInjuries && (
          <Heart className="w-3.5 h-3.5 text-red-400" />
        )}
        {hasWeather && (
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
        )}
        {game.bookmakerCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">{game.bookmakerCount} books</Badge>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, picks, legs, addLeg }: { alert: EdgeAlert; picks?: TopPick[]; legs?: { id: string }[]; addLeg?: (leg: any) => boolean }) {
  const iconMap: Record<string, typeof AlertTriangle> = {
    arbitrage: Target,
    high_ev: TrendingUp,
    sharp_action: Flame,
    weather_impact: Cloud,
    injury_update: Heart,
    line_movement: BarChart3,
  };
  const Icon = iconMap[alert.type] || AlertCircle;

  const severityStyle: Record<string, string> = {
    critical: "border-red-500/30 bg-red-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };
  const severityIcon: Record<string, string> = {
    critical: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  const timingLabel: Record<string, string> = {
    early_value: "Early Value",
    settled: "Line Settled",
    steam: "Steam Move",
    unknown: "",
  };
  const timingStyle: Record<string, string> = {
    early_value: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    settled: "bg-muted text-muted-foreground",
    steam: "bg-red-500/10 text-red-600 dark:text-red-400",
    unknown: "bg-muted text-muted-foreground",
  };

  const matchingPick = picks?.find(p => {
    if (p.sport.toLowerCase() !== alert.sport.toLowerCase()) return false;
    if (p.game === alert.game) return true;
    const alertTeams = alert.game.split(" @ ").map(t => t.trim().toLowerCase());
    const pickTeams = p.game.split(" @ ").map(t => t.trim().toLowerCase());
    if (alertTeams.length === 2 && pickTeams.length === 2) {
      return (alertTeams[0] === pickTeams[0] && alertTeams[1] === pickTeams[1]) ||
             (alertTeams[0] === pickTeams[1] && alertTeams[1] === pickTeams[0]);
    }
    const alertLower = alert.game.toLowerCase();
    return p.homeTeam.toLowerCase().includes(alertLower.split(" @ ")[0]) ||
           p.awayTeam.toLowerCase().includes(alertLower.split(" @ ")[0]);
  });

  const handleQuickBet = () => {
    if (!matchingPick || !addLeg) return;
    const legId = `alert-${alert.id}-${matchingPick.id}`;
    if (legs?.some(l => l.id === legId)) return;
    const decimalOdds = matchingPick.odds < 0
      ? 1 + (100 / Math.abs(matchingPick.odds))
      : 1 + (matchingPick.odds / 100);
    const validMarket = ["moneyline", "spread", "total", "player_prop"].includes(matchingPick.betType)
      ? matchingPick.betType
      : "moneyline";
    addLeg({
      id: legId,
      team: matchingPick.homeTeam,
      opponent: matchingPick.awayTeam,
      market: validMarket as any,
      outcome: matchingPick.pick,
      decimalOdds,
      americanOdds: matchingPick.odds,
      addedFrom: "Alert Quick Bet",
      addedAt: new Date().toISOString(),
      sport: matchingPick.sport,
      confidence: matchingPick.confidence,
      evPercent: matchingPick.ev,
      gameTime: matchingPick.gameTime,
    });
  };

  const isInSlip = matchingPick && legs?.some(l => l.id === `alert-${alert.id}-${matchingPick.id}`);

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-md border ${severityStyle[alert.severity]} ${alert.actionable ? "cursor-pointer hover:bg-accent/30 transition-colors" : ""}`} data-testid={`alert-${alert.id}`} onClick={alert.actionable && matchingPick ? handleQuickBet : undefined}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${severityIcon[alert.severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold">{alert.title}</p>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${sportColor(alert.sport)}`}>{alert.sport}</Badge>
          {alert.timing && alert.timing !== "unknown" && (
            <Badge variant="secondary" className={`text-[9px] px-1 py-0 no-default-hover-elevate no-default-active-elevate ${timingStyle[alert.timing]}`} data-testid={`badge-timing-${alert.id}`}>
              {timingLabel[alert.timing]}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
        {alert.reason && (
          <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed" data-testid={`text-reason-${alert.id}`}>{alert.reason}</p>
        )}
        {alert.actionable && (
          <div className="flex items-center gap-2 mt-1.5">
            {matchingPick ? (
              <Button
                size="sm"
                variant={isInSlip ? "secondary" : "default"}
                className="h-6 text-[10px] px-2 gap-1"
                onClick={(e) => { e.stopPropagation(); handleQuickBet(); }}
                disabled={!!isInSlip}
                data-testid={`button-quick-bet-${alert.id}`}
              >
                {isInSlip ? (
                  <><Check className="w-3 h-3" /> In Slip</>
                ) : (
                  <><Plus className="w-3 h-3" /> Quick Bet {matchingPick.odds > 0 ? `+${matchingPick.odds}` : matchingPick.odds}</>
                )}
              </Button>
            ) : (
              <Link href={`/daily`}>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" data-testid={`button-view-picks-${alert.id}`}>
                  <ArrowRight className="w-3 h-3" /> View Picks
                </Button>
              </Link>
            )}
            {matchingPick && (
              <span className="text-[9px] text-muted-foreground">
                {matchingPick.pick} · {matchingPick.confidence}% conf
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DataSourceBar({ sources }: { sources: DataSourceHealth[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap" data-testid="bar-data-sources">
      {sources.map(src => (
        <div key={src.name} className="flex items-center gap-1.5 text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${
            src.status === "live" ? "bg-green-500" : src.status === "stale" ? "bg-yellow-500" : "bg-red-500"
          }`} />
          <span className="text-muted-foreground">{src.name}</span>
          {src.recordCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60">({src.recordCount})</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchupTicketCard({ ticket, legs, addLeg }: { ticket: MatchupTicket; legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const [expanded, setExpanded] = useState(false);
  const allInSlip = ticket.legs.every(l => legs.some(sl => sl.id === `matchup-${l.pickId}`));
  const someInSlip = ticket.legs.some(l => legs.some(sl => sl.id === `matchup-${l.pickId}`));
  const inSlipCount = ticket.legs.filter(l => legs.some(sl => sl.id === `matchup-${l.pickId}`)).length;

  const handleAddAll = () => {
    for (const leg of ticket.legs) {
      const legId = `matchup-${leg.pickId}`;
      if (legs.some(sl => sl.id === legId)) continue;
      addLeg({
        id: legId,
        team: leg.team,
        opponent: leg.opponent,
        market: leg.market as any,
        outcome: leg.outcome,
        decimalOdds: leg.decimalOdds,
        americanOdds: leg.americanOdds,
        addedFrom: `Matchup: ${ticket.matchupGame}`,
        addedAt: new Date().toISOString(),
        sport: leg.sport,
        confidence: leg.confidence,
        evPercent: leg.ev,
        grade: leg.grade,
        edge: leg.edge,
        reasoning: leg.reasoning,
        gameTime: leg.gameTime,
      });
    }
  };

  const renderLegGroup = (title: string, groupLegs: OptimalTicketLeg[]) => {
    if (groupLegs.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{title} ({groupLegs.length})</p>
        {groupLegs.map((leg) => {
          const inSlip = legs.some(sl => sl.id === `matchup-${leg.pickId}`);
          return (
            <div key={leg.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${inSlip ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`} data-testid={`row-matchup-leg-${leg.id}`}>
              <span className="font-medium truncate flex-1">{leg.outcome}</span>
              <span className="font-mono text-muted-foreground shrink-0">{formatOdds(leg.americanOdds)}</span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${gradeBg(leg.grade)}`}>{leg.grade}</Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">{leg.confidence}%</span>
              {inSlip && <Check className="w-3 h-3 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border hover:border-primary/30 transition-all duration-200 overflow-hidden" data-testid={`card-matchup-${ticket.id}`}>
      <div className={`h-1 w-full ${ticket.combinedGrade.startsWith("A") ? "bg-green-500" : ticket.combinedGrade.startsWith("B") ? "bg-blue-500" : "bg-yellow-500"}`} />
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left"
          aria-expanded={expanded}
          data-testid={`button-expand-matchup-${ticket.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sportColor(ticket.sport)}`}>{ticket.sport}</Badge>
                <span className="font-semibold text-sm truncate" data-testid={`text-matchup-game-${ticket.id}`}>{ticket.matchupGame}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-mono font-medium text-foreground">{formatOdds(ticket.americanOdds)}</span>
                <span>{ticket.legCount} legs</span>
                <span className="text-emerald-500 font-medium">${ticket.potentialPayout.toLocaleString()} payout</span>
                {ticket.combinedEV > 0 && (
                  <span className="text-green-500">EV: +{ticket.combinedEV}%</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`font-mono font-bold text-sm px-2 py-0.5 ${gradeBg(ticket.combinedGrade)}`}>
                {ticket.combinedGrade}
              </Badge>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
          {someInSlip && (
            <div className="mt-1.5">
              <Badge variant="secondary" className="text-[10px]">{inSlipCount}/{ticket.legCount} in slip</Badge>
            </div>
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-1.5 rounded-md bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Odds</p>
                <p className="font-mono font-bold text-xs">{formatOdds(ticket.americanOdds)}</p>
              </div>
              <div className="p-1.5 rounded-md bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Stake</p>
                <p className="font-mono font-bold text-xs">${ticket.recommendedStake}</p>
              </div>
              <div className="p-1.5 rounded-md bg-emerald-500/10">
                <p className="text-[9px] text-muted-foreground uppercase">Payout</p>
                <p className="font-mono font-bold text-xs text-emerald-500">${ticket.potentialPayout.toLocaleString()}</p>
              </div>
              <div className="p-1.5 rounded-md bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Win %</p>
                <p className="font-mono font-bold text-xs">{ticket.winProbability}%</p>
              </div>
            </div>

            <div className="space-y-3">
              {renderLegGroup("Spreads", ticket.marketBreakdown?.spreads || [])}
              {renderLegGroup("Totals", ticket.marketBreakdown?.totals || [])}
              {renderLegGroup("Moneylines", ticket.marketBreakdown?.moneylines || [])}
              {renderLegGroup("Player Props", ticket.marketBreakdown?.playerProps || [])}
              {renderLegGroup("Other Markets", ticket.marketBreakdown?.other || [])}
            </div>

            <div className="px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-1.5">
                <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-foreground/80 leading-relaxed">{ticket.reasoning}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(ticket.engineConvergence).map(([key, active]) => {
                const eng = ENGINE_LABELS[key];
                if (!eng) return null;
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border ${
                      active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-muted/50 border-muted text-muted-foreground/40"
                    }`}
                  >
                    {active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />}
                    {eng.label}
                  </span>
                );
              })}
            </div>

            <Button
              onClick={handleAddAll}
              disabled={allInSlip}
              className="w-full gap-2"
              size="sm"
              variant={allInSlip ? "secondary" : "default"}
              data-testid={`button-add-matchup-${ticket.id}`}
            >
              {allInSlip ? (
                <><Check className="w-3.5 h-3.5" /> All {ticket.legCount} Legs in Slip</>
              ) : someInSlip ? (
                <><Plus className="w-3.5 h-3.5" /> Add Remaining {ticket.legCount - inSlipCount} Legs</>
              ) : (
                <><Layers className="w-3.5 h-3.5" /> Add All {ticket.legCount} Legs to Slip</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  useSEO({ title: "Your Picks", description: "All engines converging to find your edge" });
  const [activeSportTab, setActiveSportTab] = useState("all");
  const [ticketDateFilter, setTicketDateFilter] = useState<"today" | "future" | "all">("all");
  const { legs, addLeg } = useParlaySlip();

  const handleSSEEvent = useCallback((event: { type: string }) => {
    if (event.type === "intelligence-update") {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
    }
  }, []);

  const sse = useSSE({
    enabled: true,
    onEvent: handleSSEEvent,
  });

  const { data: feed, isLoading, dataUpdatedAt } = useQuery<IntelligenceFeed>({
    queryKey: ["/api/intelligence/feed"],
    refetchInterval: 30000,
  });

  const { data: ticketsData } = useQuery<OptimalTicketsResponse>({
    queryKey: ["/api/optimal-tickets", ticketDateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/optimal-tickets?date=${ticketDateFilter}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: matchupData } = useQuery<MatchupTicketsResponse>({
    queryKey: ["/api/matchup-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/matchup-tickets?maxLegs=20");
      if (!res.ok) throw new Error("Failed to fetch matchup tickets");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading || !feed) {
    return (
      <div className="min-h-full" data-testid="loading-skeleton-command-center">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary animate-pulse" />
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2.5">
                    <Skeleton className="w-4 h-4 rounded-full shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredPicks = activeSportTab === "all"
    ? feed.topPicks
    : feed.topPicks.filter(p => p.sport === activeSportTab);

  const filteredUpcoming = activeSportTab === "all"
    ? feed.upcomingGames
    : feed.upcomingGames.filter(g => g.sport === activeSportTab);

  const filteredAlerts = activeSportTab === "all"
    ? feed.edgeAlerts
    : feed.edgeAlerts.filter(a => a.sport === activeSportTab);

  const activeSports = feed.sportSummaries.filter(s => s.gamesCount > 0 || s.picksAvailable > 0);
  const totalGames = feed.sportSummaries.reduce((s, a) => s + a.gamesCount, 0);
  const totalPicks = feed.topPicks.length;
  const totalLive = feed.liveGames.length;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-command-center">
                <Brain className="w-6 h-6 text-primary" />
                Your Picks
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                All engines converging to find your edge
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-default" data-testid="indicator-sse-status">
                    {sse.connected ? (
                      <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                        <Wifi className="w-2.5 h-2.5" />
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-red-500/10 border-red-500/30 text-red-500">
                        <WifiOff className="w-2.5 h-2.5" />
                        Offline
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sse.connected ? "Real-time updates active via SSE" : "Reconnecting... Polling every 30s as fallback"}</p>
                  {sse.lastUpdate && <p className="text-[10px] text-muted-foreground">Last update: {new Date(sse.lastUpdate).toLocaleTimeString()}</p>}
                </TooltipContent>
              </Tooltip>
              <DataSourceBar sources={feed.dataSourceHealth} />
              {(() => {
                const oddsApi = feed.dataSourceHealth.find(s => s.name.toLowerCase().includes("odds api") || s.name.toLowerCase().includes("odds-api") || s.name.toLowerCase().includes("the odds"));
                const isMultiBook = oddsApi && oddsApi.status === "live";
                return (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${isMultiBook ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-orange-500/10 border-orange-500/30 text-orange-500"}`}
                    data-testid="indicator-odds-source"
                  >
                    {isMultiBook ? "Multi-Book" : "ESPN Only"}
                  </Badge>
                );
              })()}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {lastUpdate}
              </div>
            </div>
          </div>
        </header>

        <section data-testid="section-best-tickets">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">
                {ticketDateFilter === "today" ? "Today's" : ticketDateFilter === "future" ? "Upcoming" : "Best"} Tickets
              </h2>
              {ticketsData && (
                <Badge variant="secondary" className="text-[10px]">{ticketsData.tickets.length} ready</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-0.5" data-testid="filter-ticket-date">
                {([
                  { value: "today" as const, label: "Today", icon: Clock },
                  { value: "future" as const, label: "Upcoming", icon: Calendar },
                  { value: "all" as const, label: "All Games", icon: Layers },
                ]).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTicketDateFilter(value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      ticketDateFilter === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`button-date-${value}`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
              <Link href="/generate">
                <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-generate-more">
                  Generate Custom <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
          {ticketsData && ticketsData.tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ticketsData.tickets.slice(0, 6).map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} legs={legs} addLeg={addLeg} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {ticketDateFilter === "today"
                    ? "No same-day games with strong enough picks right now. Try \"Upcoming\" or \"All Games\"."
                    : ticketDateFilter === "future"
                    ? "No upcoming games with strong picks yet. Try \"Today\" or \"All Games\"."
                    : "No tickets available right now. Picks are generated every 5 minutes as games load."}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {matchupData && matchupData.matchupTickets.length > 0 && (
          <section data-testid="section-matchup-tickets">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Game Matchup Parlays</h2>
                <Badge variant="secondary" className="text-[10px]">{matchupData.matchupTickets.length} matchups</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Full game breakdowns with 10-20 leg parlays</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchupData.matchupTickets.map(ticket => (
                <MatchupTicketCard key={ticket.id} ticket={ticket} legs={legs} addLeg={addLeg} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card data-testid="card-stat-best-grade">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Best Grade Today</p>
                  <p className={`text-2xl font-bold tabular-nums ${gradeColor(ticketsData?.tickets[0]?.combinedGrade || feed.topPicks[0]?.grade || "–")}`} data-testid="text-best-grade">
                    {ticketsData?.tickets[0]?.combinedGrade || feed.topPicks[0]?.grade || "–"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{totalPicks} picks across {activeSports.length} sports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-highest-ev">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-emerald-500/10">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Highest EV Ticket</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-500" data-testid="text-highest-ev">
                    {ticketsData?.tickets[0]?.combinedEV ? `+${ticketsData.tickets[0].combinedEV}%` : feed.topPicks[0]?.ev ? `+${feed.topPicks[0].ev.toFixed(1)}%` : "–"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {ticketsData?.tickets[0]?.name || "analyzing markets"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-live">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-red-500/10">
                  <Activity className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Live Games</p>
                  <p className="text-2xl font-bold tabular-nums" data-testid="text-live-count">{totalLive}</p>
                  <p className="text-[10px] text-muted-foreground">{totalLive > 0 ? "tracking now" : "none in progress"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeSportTab} onValueChange={setActiveSportTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-max h-8">
              <TabsTrigger value="all" className="text-xs px-2.5 sm:px-3 h-7 shrink-0" data-testid="tab-sport-all">All</TabsTrigger>
              {activeSports.map(s => (
                <TabsTrigger key={s.sport} value={s.sport} className="text-xs px-2.5 sm:px-3 h-7 shrink-0" data-testid={`tab-sport-${s.sport}`}>
                  {s.sport}
                  {s.liveCount > 0 && <Radio className="w-2.5 h-2.5 ml-1 text-red-500" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="lg:col-span-2 space-y-4">
              <Card data-testid="card-top-picks">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Top Picks
                  </CardTitle>
                  <Link href="/daily">
                    <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-view-all-picks">
                      View All <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredPicks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No picks available for this sport right now</p>
                  ) : (
                    filteredPicks.slice(0, 8).map(pick => (
                      <PickCard key={pick.id} pick={pick} legs={legs} addLeg={addLeg} />
                    ))
                  )}
                </CardContent>
              </Card>

              {feed.liveGames.length > 0 && (
                <Card data-testid="card-live-games">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                      Live Games
                    </CardTitle>
                    <Link href="/live">
                      <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-live-center">
                        Live Center <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {feed.liveGames.slice(0, 6).map(game => (
                        <LiveGameCard key={game.id} game={game} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-upcoming-games">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Upcoming Games
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredUpcoming.length} games</Badge>
                </CardHeader>
                <CardContent>
                  {filteredUpcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No upcoming games for this sport</p>
                  ) : (
                    filteredUpcoming.slice(0, 10).map(game => (
                      <UpcomingGameRow key={game.id} game={game} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card data-testid="card-edge-alerts">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Edge Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No alerts right now</p>
                  ) : (
                    filteredAlerts.slice(0, 10).map(alert => (
                      <AlertCard key={alert.id} alert={alert} picks={feed?.topPicks} legs={legs} addLeg={addLeg} />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-engine-status">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Engine Convergence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ticketsData?.tickets[0] ? (
                    Object.entries(ticketsData.tickets[0].engineConvergence).map(([key, active]) => {
                      const eng = ENGINE_LABELS[key];
                      if (!eng) return null;
                      const Icon = eng.icon;
                      return (
                        <div key={key} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-engine-${key}`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${active ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                            <span className="text-xs">{eng.label}</span>
                          </div>
                          {active ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/40">Inactive</Badge>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    activeSports.map(s => (
                      <div key={s.sport} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-sport-${s.sport}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${sportColor(s.sport)}`}>{s.sport}</Badge>
                          <span className="text-xs text-muted-foreground">{s.gamesCount} games</span>
                        </div>
                        <span className="text-xs font-medium">{s.picksAvailable} picks</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-quick-actions">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/daily">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" data-testid="action-daily-picks">
                      <Sparkles className="w-3.5 h-3.5" />
                      Browse All Daily Picks
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                  <Link href="/builder">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" data-testid="action-build-parlay">
                      <Target className="w-3.5 h-3.5" />
                      Build Custom Parlay
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                  <Link href="/odds-center">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" data-testid="action-odds-center">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Odds & Line Movement
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                  <Link href="/live">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" data-testid="action-live-center">
                      <Activity className="w-3.5 h-3.5" />
                      Live Game Tracker
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                  <Link href="/pro-tools">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" data-testid="action-pro-tools">
                      <Shield className="w-3.5 h-3.5" />
                      Pro Analysis Tools
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
