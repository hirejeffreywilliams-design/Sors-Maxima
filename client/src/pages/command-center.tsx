import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSSE } from "@/hooks/use-sse";
import { queryClient } from "@/lib/queryClient";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Brain, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Cloud, Flame, Heart, Radio, RefreshCw,
  Shield, Sparkles, Star, Target, TrendingUp, Zap, AlertCircle, Wifi, WifiOff,
  Trophy, DollarSign, Layers, Plus, Calendar, Info, Dice5, Shuffle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/use-seo";
import { PickDisclaimer } from "@/components/pick-disclaimer";
import { TierGate, useTier } from "@/components/tier-gate";
import { IntelligencePipeline } from "@/components/intelligence-pipeline";
import { OffseasonPanel } from "@/components/offseason-panel";

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

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Signal: {ticket.combinedConfidence}%</span>
          <span className="text-muted-foreground/30">|</span>
          <span className={ticket.combinedEV > 0 ? "text-green-500" : "text-red-500"}>EV: {ticket.combinedEV > 35 ? "35%+" : (ticket.combinedEV > 0 ? "+" : "") + ticket.combinedEV + "%"}</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Win Prob: {ticket.winProbability}%</span>
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

const displayEv = (ev: number) => ev > 35 ? "35%+" : `+${ev.toFixed(1)}%`;

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
              <span>Signal: {pick.confidence}%</span>
            )}
            <span className={pick.ev > 0 ? "text-green-500" : "text-red-500"}>
              EV: {displayEv(pick.ev)}
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
      </div>
    </div>
  );
}

function AlertCard({ alert, feed, legs, addLeg }: { alert: EdgeAlert; feed: IntelligenceFeed; legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const matchingPick = feed.topPicks.find(p => p.game.includes(alert.game) || alert.description.includes(p.pick));
  const isInSlip = matchingPick ? legs.some(l => l.id === `cmd-${matchingPick.id}`) : false;

  const handleQuickBet = () => {
    if (!matchingPick || isInSlip) return;
    const decimalOdds = matchingPick.odds < 0 ? 1 + (100 / Math.abs(matchingPick.odds)) : 1 + (matchingPick.odds / 100);
    addLeg({
      id: `cmd-${matchingPick.id}`,
      team: matchingPick.homeTeam,
      opponent: matchingPick.awayTeam,
      market: matchingPick.betType as any,
      outcome: matchingPick.pick,
      decimalOdds,
      americanOdds: matchingPick.odds,
      addedFrom: "Edge Alert",
      addedAt: new Date().toISOString(),
      sport: matchingPick.sport,
      confidence: matchingPick.confidence,
      evPercent: matchingPick.ev,
      gameTime: matchingPick.gameTime,
    });
  };

  return (
    <div
      className={`p-3 rounded-md border-l-4 ${
        alert.severity === "critical" ? "bg-red-500/5 border-l-red-500" :
        alert.severity === "warning" ? "bg-amber-500/5 border-l-amber-500" :
        "bg-blue-500/5 border-l-blue-500"
      }`}
      data-testid={`card-alert-${alert.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          {alert.severity === "critical" ? <Zap className="w-3.5 h-3.5 text-red-500" /> :
           alert.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> :
           <Info className="w-3.5 h-3.5 text-blue-500" />}
          <span className="text-xs font-bold uppercase tracking-tight">{alert.title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
      <p className="text-xs text-foreground/90 leading-snug" data-testid={`text-alert-desc-${alert.id}`}>{alert.description}</p>
      <div className="mt-2 space-y-2">
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
                {matchingPick.pick} · {matchingPick.confidence}% signal strength
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DataSourceBar({ sources }: { sources: DataSourceHealth[] }) {
  const allLive = sources.length > 0 && sources.every(s => s.status === "live");
  const anyDown = sources.some(s => s.status === "down");
  return (
    <div className="flex items-center gap-1.5" data-testid="bar-data-sources">
      <div className={`w-1.5 h-1.5 rounded-full ${anyDown ? "bg-red-500" : allLive ? "bg-green-500" : "bg-yellow-500"}`} />
      <span className="text-[10px] text-muted-foreground">
        {anyDown ? "Partial Data" : allLive ? "All Systems Live" : "Updating"}
      </span>
    </div>
  );
}

function gradeToScore(grade: string): number {
  const scores: Record<string, number> = {
    "A+": 10, "A": 9, "A-": 8, "B+": 7, "B": 6, "B-": 5, "C+": 4, "C": 3, "C-": 2
  };
  return scores[grade] || 2;
}

function getTopLegIds(legs: any[], count: number): string[] {
  return [...legs]
    .sort((a, b) => {
      const scoreA = (a.ev || 0) * gradeToScore(a.grade);
      const scoreB = (b.ev || 0) * gradeToScore(b.grade);
      return scoreB - scoreA;
    })
    .slice(0, count)
    .map(l => l.id);
}

function americanToDecimal(odds: number): number {
  return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
}

function decimalToAmerican(d: number): number {
  if (d <= 1) return -100;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}

function ModelHealthChip() {
  const { data, isLoading } = useQuery({ 
    queryKey: ["/api/model-health"], 
    queryFn: async () => {
      const res = await fetch("/api/model-health");
      if (!res.ok) throw new Error("Failed to fetch model health");
      return res.json();
    },
    refetchInterval: 300000 
  });

  if (isLoading || !data) return <Skeleton className="h-6 w-40 rounded-full" />;

  const isReady = data.status === "calibrated";

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 border border-muted-foreground/20"
      data-testid="chip-model-health"
    >
      <div className={`h-2 w-2 rounded-full ${isReady ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
      <span className="text-xs font-medium text-muted-foreground">
        46-Factor Model {isReady ? "Active" : "Warming Up"}
      </span>
    </div>
  );
}

function MatchupTicketCard({ ticket, legs, addLeg }: { ticket: MatchupTicket; legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedLegIds, setSelectedLegIds] = useState<Set<string>>(() => new Set(getTopLegIds(ticket.legs, 3)));

  const selectedLegs = ticket.legs.filter(l => selectedLegIds.has(l.id));
  const allInSlip = selectedLegs.length > 0 && selectedLegs.every(l => legs.some(sl => sl.id === `matchup-${l.pickId}`));
  const someInSlip = selectedLegs.some(l => legs.some(sl => sl.id === `matchup-${l.pickId}`));
  const inSlipCount = selectedLegs.filter(l => legs.some(sl => sl.id === `matchup-${l.pickId}`)).length;

  const combinedDecimal = selectedLegs.reduce((acc, l) => acc * americanToDecimal(l.americanOdds), 1);
  const combinedAmerican = decimalToAmerican(combinedDecimal);

  const hasCorrelatedLegs = selectedLegs.filter(l => l.outcome.toLowerCase().includes('over') || l.outcome.toLowerCase().includes('-')).length >= 2 && selectedLegs.length >= 2;

  const handleAddSelected = () => {
    for (const leg of selectedLegs) {
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

  const renderLegGroup = (title: string, groupLegs: any[]) => {
    if (groupLegs.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">{title}</h4>
        <div className="grid grid-cols-1 gap-1.5">
          {groupLegs.map(leg => {
            const isSelected = selectedLegIds.has(leg.id);
            const inSlip = legs.some(sl => sl.id === `matchup-${leg.pickId}`);
            return (
              <div 
                key={leg.id} 
                className={`flex items-center gap-2 p-1.5 rounded transition-colors group/row ${
                  isSelected ? "bg-primary/5 border border-primary/20 shadow-sm" : "bg-muted/30 border border-transparent hover:bg-muted/50"
                }`}
                onClick={() => {
                  const next = new Set(selectedLegIds);
                  if (isSelected) next.delete(leg.id);
                  else next.add(leg.id);
                  setSelectedLegIds(next);
                }}
              >
                <div 
                  className={`w-4 h-4 rounded border-2 shrink-0 transition-all flex items-center justify-center ${
                    isSelected ? "bg-primary border-primary" : "border-primary/40 group-hover/row:border-primary/60"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground stroke-[3px]" />}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{leg.outcome}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{formatOdds(leg.americanOdds)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${gradeBg(leg.grade)}`}>{leg.grade}</Badge>
                  {inSlip && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-muted/60" data-testid={`card-matchup-${ticket.id}`}>
      <CardContent className="p-0">
        <button 
          className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Badge className={sportColor(ticket.sport)}>{ticket.sport}</Badge>
                <span className="font-bold text-sm truncate">{ticket.matchupGame}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ticket.legCount} available legs · Win Prob: {ticket.winProbability}%</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className={`font-mono font-bold ${gradeBg(ticket.combinedGrade)}`}>
                {ticket.combinedGrade}
              </Badge>
              {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          {someInSlip && (
            <div className="mt-1.5">
              <Badge variant="secondary" className="text-[10px]">{inSlipCount}/{selectedLegs.length} in slip</Badge>
            </div>
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] px-2"
                  onClick={() => setSelectedLegIds(new Set(getTopLegIds(ticket.legs, 3)))}
                  data-testid="button-best-3"
                >
                  Best 3
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] px-2"
                  onClick={() => setSelectedLegIds(new Set(ticket.legs.map(l => l.id)))}
                  data-testid="button-all"
                >
                  All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] px-2"
                  onClick={() => setSelectedLegIds(new Set())}
                  data-testid="button-none"
                >
                  None
                </Button>
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {selectedLegIds.size} selected | Combined: {formatOdds(combinedAmerican)}
              </div>
            </div>

            {hasCorrelatedLegs && (
              <Badge variant="outline" className="w-full justify-center gap-1.5 py-1 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">
                <AlertTriangle className="w-3 h-3" />
                Correlated legs — sportsbooks may limit parlay
              </Badge>
            )}

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
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {ticket.reasoning}
                </p>
              </div>
            </div>

            <Button
              onClick={handleAddSelected}
              disabled={allInSlip || selectedLegIds.size === 0}
              className="w-full gap-2"
              size="sm"
              variant={allInSlip ? "secondary" : "default"}
              data-testid={`button-add-matchup-${ticket.id}`}
            >
              {allInSlip ? (
                <><Check className="w-3.5 h-3.5" /> Selected Legs in Slip</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Add {selectedLegIds.size} Selected Legs to Slip</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// === Life Changer Feature ===

interface LifeChangerLeg {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  americanOdds: number;
  decimalOdds: number;
  selectionReason: string;
  selectionCategory: "underdog" | "contrarian" | "alternative" | "sleeper";
  gameTime?: string;
  ev: number;
  confidence: number;
  grade: string;
  edge: number;
  isUnderdog: boolean;
  reasoning: string;
}

interface LifeChangerTicket {
  id: string;
  legs: LifeChangerLeg[];
  totalDecimalOdds: number;
  americanOdds: string;
  legCount: number;
  sports: string[];
  potentialPayouts: { stake: number; payout: number; formatted: string }[];
  selectionLogic: string;
  generatedAt: string;
  earliestGame?: string;
  disclaimer: string;
}

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NHL: "🏒", NCAAB: "🏀", NFL: "🏈", MLB: "⚾", NCAAF: "🏈",
  Soccer_EPL: "⚽", Soccer_LALIGA: "⚽", Soccer_BUNDESLIGA: "⚽",
  Soccer_SERIEA: "⚽", Soccer_LIGUE1: "⚽", Soccer_MLS: "⚽",
  Soccer_UCL: "⚽", Soccer_INTL: "⚽",
};

const CATEGORY_COLORS: Record<string, string> = {
  underdog: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  sleeper: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  contrarian: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  alternative: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
};

const CATEGORY_LABEL: Record<string, string> = {
  underdog: "Underdog",
  sleeper: "Sleeper",
  contrarian: "Contrarian",
  alternative: "Alt Market",
};

function formatOddsLC(american: number): string {
  return american > 0 ? `+${american.toLocaleString()}` : american.toLocaleString();
}

const LC_STAKE_PRESETS = [0.25, 1, 5, 10, 25, 50, 100];

function formatLCPayout(payout: number): string {
  if (payout >= 1_000_000) return `$${(payout / 1_000_000).toFixed(2)}M`;
  if (payout >= 1_000) return `$${(payout / 1_000).toFixed(1)}K`;
  return `$${payout.toFixed(2)}`;
}

function formatLCStake(v: number): string {
  return v < 1 ? `$${v.toFixed(2)}` : `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

function LifeChangerSection({ legs, addLeg }: { legs: { id: string }[]; addLeg: (leg: any) => boolean }) {
  const { data, isLoading, dataUpdatedAt } = useQuery<{ ticket: LifeChangerTicket | null; message?: string }>({
    queryKey: ["/api/life-changer-ticket"],
    refetchInterval: 300000,
    staleTime: 60000,
  });

  const ticket = data?.ticket ?? null;
  const [expanded, setExpanded] = useState(false);
  const [addedAll, setAddedAll] = useState(false);
  const [stake, setStake] = useState(10);

  // Reset addedAll when ticket refreshes
  useEffect(() => { setAddedAll(false); }, [dataUpdatedAt]);

  const payout = useMemo(() => ticket ? stake * ticket.totalDecimalOdds : 0, [stake, ticket]);
  const payoutFormatted = useMemo(() => formatLCPayout(payout), [payout]);

  // Stable leg ID based on sport + game name + bet type
  function legId(leg: LifeChangerLeg) {
    return `lc-${leg.sport}-${leg.game.replace(/\s/g, "_")}-${leg.betType}`;
  }

  function buildLcLeg(leg: LifeChangerLeg) {
    const parts = leg.game.split(" @ ");
    const awayTeam = parts[0]?.trim() ?? "";
    const homeTeam = parts[1]?.trim() ?? "";
    const pickedTeam = leg.pick.includes(homeTeam) ? homeTeam : awayTeam;
    const opponent = pickedTeam === homeTeam ? awayTeam : homeTeam;
    return {
      id: legId(leg),
      team: pickedTeam || leg.pick,
      opponent: opponent || undefined,
      game: leg.game,
      market: leg.betType as any,
      outcome: leg.pick,
      americanOdds: leg.americanOdds,
      decimalOdds: leg.decimalOdds,
      sport: leg.sport,
      confidence: leg.confidence,
      evPercent: leg.ev,
      grade: leg.grade,
      edge: leg.edge,
      reasoning: leg.reasoning || leg.selectionReason,
      addedFrom: "life_changer",
      addedAt: new Date().toISOString(),
    };
  }

  function handleAddAll() {
    if (!ticket) return;
    let added = 0;
    ticket.legs.forEach(leg => {
      const ok = addLeg(buildLcLeg(leg) as any);
      if (ok) added++;
    });
    if (added > 0) setAddedAll(true);
  }

  const allInSlip = ticket ? ticket.legs.every(l => legs.some(s => s.id === legId(l))) : false;

  return (
    <section data-testid="section-life-changer" className="relative">
      <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-background to-amber-900/10 overflow-hidden shadow-lg">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-amber-500/15 shrink-0">
              <Dice5 className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-amber-300 leading-tight">Daily Edge Parlay</h2>
                <Badge className="text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/40 border">Daily Parlay</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Cross-sport high-value parlay — unorthodox picks across multiple sports
              </p>
            </div>
          </div>
          {ticket && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-amber-300 leading-none tabular-nums" data-testid="text-life-changer-odds">
                {ticket.americanOdds}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.legCount} legs · {ticket.sports.join(", ")}</p>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="px-4 pb-4 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {!isLoading && !ticket && (
          <div className="px-4 pb-4">
            <div className="rounded-lg bg-muted/30 p-4 text-center">
              <Shuffle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{data?.message || "Generating today's ticket once picks load…"}</p>
            </div>
          </div>
        )}

        {ticket && (
          <>
            {/* Stake slider + payout display */}
            <div className="px-4 pb-4 space-y-3 border-t border-amber-500/20 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your stake</p>
                <p className="text-xs text-muted-foreground">Slide or tap a preset</p>
              </div>

              {/* Preset buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {LC_STAKE_PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setStake(p)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors border ${
                      stake === p
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                    }`}
                    data-testid={`button-lc-preset-${p}`}
                  >
                    {formatLCStake(p)}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <Slider
                  value={[stake]}
                  onValueChange={([v]) => setStake(v)}
                  min={0.25}
                  max={100}
                  step={0.25}
                  className="w-full [&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-500 [&_.bg-primary]:bg-amber-500"
                  data-testid="slider-lc-stake"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>$0.25</span>
                  <span className="font-semibold text-amber-300 text-sm tabular-nums">{formatLCStake(stake)}</span>
                  <span>$100</span>
                </div>
              </div>

              {/* Payout display */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-amber-300/70 uppercase tracking-wide">If all {ticket.legCount} legs hit</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatLCStake(stake)} × {ticket.totalDecimalOdds.toFixed(1)}x odds
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-amber-300 tabular-nums leading-none" data-testid="text-lc-payout-live">
                    {payoutFormatted}
                  </p>
                  <p className="text-[9px] text-amber-300/60 mt-0.5">potential win</p>
                </div>
              </div>
            </div>

            {/* Expand legs */}
            <div className="px-4 pb-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-amber-500/20"
                data-testid="button-lc-expand"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {expanded ? "Hide" : "View"} all {ticket.legCount} legs
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Leg list */}
            {expanded && (
              <div className="px-4 pb-3 space-y-2 border-t border-amber-500/10 pt-3">
                {ticket.legs.map((leg, i) => {
                  const legInSlip = legs.some(s => s.id === legId(leg));
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                      data-testid={`row-lc-leg-${i}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5 shrink-0">{SPORT_EMOJI[leg.sport] || "🎯"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold">{leg.pick}</span>
                            {leg.grade && (
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 border font-bold ${gradeColor(leg.grade)}`}>
                                {leg.grade}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${CATEGORY_COLORS[leg.selectionCategory]}`}>
                              {CATEGORY_LABEL[leg.selectionCategory]}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{leg.game}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {leg.gameTime && (
                              <span className="text-[10px] text-muted-foreground/60">{new Date(leg.gameTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            )}
                            {leg.ev > 0 && (
                              <span className="text-[10px] font-medium text-emerald-400">+{leg.ev.toFixed(1)}% EV</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">{leg.confidence}% signal</span>
                          </div>
                          <p className="text-[10px] text-amber-300/70 mt-0.5 line-clamp-2">{leg.selectionReason}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-sm font-bold text-amber-400 tabular-nums">{formatOddsLC(leg.americanOdds)}</p>
                          <p className="text-[9px] text-muted-foreground">{leg.betType.replace(/_/g, " ")}</p>
                          <button
                            onClick={() => { addLeg(buildLcLeg(leg) as any); }}
                            disabled={legInSlip}
                            data-testid={`button-lc-add-leg-${i}`}
                            className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              legInSlip
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                            }`}
                          >
                            {legInSlip ? "✓ Added" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer actions */}
            <div className="px-4 pb-4 pt-1 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAddAll}
                disabled={allInSlip}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                data-testid="button-lc-add-all"
              >
                {allInSlip ? (
                  <><Check className="w-3.5 h-3.5 mr-1" /> All Legs in Slip</>
                ) : (
                  <><Plus className="w-3.5 h-3.5 mr-1" /> Add All {ticket.legCount} Legs to Slip</>
                )}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground" data-testid="button-lc-info">
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">How it works</p>
                  <p>{ticket.selectionLogic}</p>
                  <p className="mt-1.5 text-muted-foreground italic">{ticket.disclaimer}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// === End Life Changer ===

export default function CommandCenter() {
  useSEO({ title: "Your Picks", description: "All engines converging to find your edge" });
  const [activeSportTab, setActiveSportTab] = useState("all");
  const [ticketDateFilter, setTicketDateFilter] = useState<"today" | "future" | "all">("all");
  const { legs, addLeg } = useParlaySlip();
  const { canAccess } = useTier();

  const handleSSEEvent = useCallback((event: { type: string }) => {
    if (event.type === "intelligence-update") {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/life-changer-ticket"] });
    }
    if (event.type === "picks-update" || event.type === "predictions-ready") {
      queryClient.invalidateQueries({ queryKey: ["/api/life-changer-ticket"] });
      queryClient.invalidateQueries({ queryKey: ["/api/optimal-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matchup-tickets"] });
    }
  }, []);

  const sse = useSSE({
    enabled: true,
    onEvent: handleSSEEvent,
  });

  const { data: authData } = useQuery<{ isAdmin?: boolean; authenticated?: boolean }>({
    queryKey: ["/api/auth/check"],
    staleTime: 60000,
  });

  const { data: advancedFlagData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check/advanced_command_center"],
    staleTime: 60000,
  });

  // Admin always sees advanced sections; flag unlocks them for all members
  const showAdvanced = authData?.isAdmin === true || advancedFlagData?.enabled === true;

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
              <div className="mt-2">
                <ModelHealthChip />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
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

        <PickDisclaimer variant="banner" />

        <IntelligencePipeline />

        {showAdvanced && <section data-testid="section-best-tickets">
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
        </section>}

        {showAdvanced && matchupData && matchupData.matchupTickets.length > 0 && (
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

        {showAdvanced && (canAccess("elite")
          ? <LifeChangerSection legs={legs} addLeg={addLeg} />
          : (
            <TierGate 
              required="elite" 
              label="Daily Edge Parlay" 
              description="A daily cross-sport high-value parlay built by the intelligence engine — real edge, premium picks. Edge tier and above."
            >
              <div />
            </TierGate>
          )
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
            {activeSportTab === "NFL" && filteredUpcoming.length === 0 ? (
              <div className="lg:col-span-3">
                <OffseasonPanel />
              </div>
            ) : (
              <>
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Top Edge Picks
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPicks.length > 0 ? (
                      filteredPicks.map(pick => (
                        <PickCard key={pick.id} pick={pick} legs={legs} addLeg={addLeg} />
                      ))
                    ) : (
                      <div className="col-span-full p-8 text-center border rounded-lg bg-muted/20">
                        <p className="text-sm text-muted-foreground">No picks available for {activeSportTab} right now.</p>
                      </div>
                    )}
                  </div>

                  {feed.liveGames.length > 0 && (activeSportTab === "all" || feed.liveGames.some(g => g.sport === activeSportTab)) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Radio className="w-4 h-4 text-red-500" />
                        Live Analysis
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {feed.liveGames
                          .filter(g => activeSportTab === "all" || g.sport === activeSportTab)
                          .map(game => (
                            <LiveGameCard key={game.id} game={game} />
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      Edge Alerts
                    </h3>
                    <div className="space-y-2.5">
                      {filteredAlerts.length > 0 ? (
                        filteredAlerts.map(alert => (
                          <AlertCard key={alert.id} alert={alert} feed={feed} legs={legs} addLeg={addLeg} />
                        ))
                      ) : (
                        <div className="p-6 text-center border rounded-lg bg-muted/20">
                          <p className="text-xs text-muted-foreground">No critical alerts for {activeSportTab}.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Upcoming Games
                    </h3>
                    <Card>
                      <CardContent className="p-3">
                        <div className="divide-y">
                          {filteredUpcoming.length > 0 ? (
                            filteredUpcoming.slice(0, 8).map(game => (
                              <UpcomingGameRow key={game.id} game={game} />
                            ))
                          ) : (
                            <p className="py-4 text-center text-xs text-muted-foreground">No upcoming games scheduled.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </Tabs>

        <div className="mt-8 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Picks are analytical recommendations only — not guaranteed outcomes. Must be 21+ and in a jurisdiction where sports betting is legal. Bet responsibly. View full disclaimer at <Link href="/legal" className="text-primary hover:underline">/legal</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
