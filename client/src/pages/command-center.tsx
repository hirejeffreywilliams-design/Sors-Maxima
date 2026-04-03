import { useState, useEffect, useMemo, useRef } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUserStrategy } from "@/hooks/use-user-strategy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { useSSEContext } from "@/context/sse-provider";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Brain, Check, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Clock, Cloud, Flame, Heart, Radio, RefreshCw,
  Shield, Sparkles, Star, Target, TrendingUp, TrendingDown, Zap, AlertCircle, Wifi, WifiOff,
  Trophy, DollarSign, Layers, Plus, Calendar, Info, Dice5, Shuffle, Smartphone,
  Loader2, ArrowUpDown, SlidersHorizontal, BarChart2, Percent
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/use-seo";
import { PickDisclaimer } from "@/components/pick-disclaimer";
import { TierGate, useTier } from "@/components/tier-gate";
import { OffseasonPanel } from "@/components/offseason-panel";
import { SwipePickCards } from "@/components/swipe-pick-cards";
import { TicketShowcase } from "@/components/ticket-showcase";
import { MobileTicketDeck } from "@/components/mobile-ticket-deck";
import { gradeAmbientGlow, getGradeShimmerClass } from "@/lib/grade-utils";
import { OddsAttribution } from "@/components/ui/odds-attribution";
import { PickAnalyticsRow } from "@/components/pick-analytics-row";

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
  monte_carlo: "Sors Simulation", player_efficiency: "Player Performance",
  injury_adjustment: "Injury Impact", weather_impact: "Weather Factor",
  home_field: "Home Court/Field", rest_advantage: "Rest Advantage",
  pace_tempo: "Pace & Tempo", clutch_index: "Clutch Factor",
  point_differential: "Point Differential", strength_schedule: "Schedule Strength",
  historical_h2h: "Head-to-Head", predictive_model: "Sors Intelligence",
};

function humanFactor(name: string): string {
  return FACTOR_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function CompactPickCard({ pick, legs, addLeg, isFounder }: { pick: TopPick; legs: { id: string }[]; addLeg: (leg: any) => boolean; isFounder?: boolean }) {
  const legId = `cmd-strat-${pick.id}`;
  const inSlip = legs.some(l => l.id === legId);

  const handleAdd = () => {
    if (inSlip) return;
    const decimalOdds = pick.odds < 0
      ? 1 + (100 / Math.abs(pick.odds))
      : 1 + (pick.odds / 100);

    addLeg({
      id: legId,
      team: pick.homeTeam,
      opponent: pick.awayTeam,
      market: (pick.betType || "moneyline") as any,
      outcome: pick.pick,
      decimalOdds,
      americanOdds: pick.odds,
      addedFrom: "Strategy Mode",
      addedAt: new Date().toISOString(),
      sport: pick.sport,
      confidence: pick.confidence,
      evPercent: pick.ev,
      grade: pick.grade,
      gameTime: pick.gameTime,
    });
  };

  return (
    <Card className="min-w-[200px] w-[200px] shrink-0 border-primary/20 bg-card/50 hover:border-primary/40 transition-colors" data-testid={`card-strategy-pick-${pick.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="outline" className={`text-[9px] px-1 h-3.5 ${sportColor(pick.sport)}`}>{pick.sport}</Badge>
          <div className="flex items-center gap-1">
            {isFounder && (
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-amber-500/20 border border-amber-500/40 text-[8px] font-bold text-amber-400" title="Founder Early Access" data-testid="badge-founder-early">F</span>
            )}
            <Badge variant="outline" className={`text-[9px] font-bold h-3.5 px-1 ${gradeBg(pick.grade)}`}>{pick.grade}</Badge>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold truncate leading-tight">{pick.pick}</p>
          <p className="text-[9px] text-muted-foreground truncate">{pick.game}</p>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono font-bold text-foreground">{formatOdds(pick.odds)}</span>
          <span className={pick.ev > 0 ? "text-green-500 font-medium" : "text-red-500"}>EV: {displayEv(pick.ev)}</span>
        </div>
        <PickAnalyticsRow confidence={pick.confidence} ev={pick.ev} pickId={pick.id} size="xs" />
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Sors Conviction Score™</span>
            <span>{pick.confidence}%</span>
          </div>
          <Progress value={pick.confidence} className="h-1" />
        </div>
        <Button 
          variant={inSlip ? "secondary" : "default"} 
          size="sm" 
          className="w-full h-7 text-[10px]" 
          onClick={handleAdd}
          disabled={inSlip}
          data-testid={`button-add-strategy-pick-${pick.id}`}
        >
          {inSlip ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
          {inSlip ? "Added" : "Add to Slip"}
        </Button>
      </CardContent>
    </Card>
  );
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
  oddsSourceBook?: string;
  oddsBookCount?: number;
  oddsApiSource?: string;
  allBookOdds?: { book: string; odds: number }[];
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
    <Card
      className={`group border hover:border-primary/40 transition-all duration-200 overflow-hidden ${getGradeShimmerClass(ticket.combinedGrade)}`}
      style={gradeAmbientGlow(ticket.combinedGrade)}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <div className={`h-1 w-full ${
        ticket.combinedGrade === "A+" ? "bg-amber-400" :
        ticket.combinedGrade.startsWith("A") ? "bg-emerald-500" :
        ticket.combinedGrade === "B+" ? "bg-teal-500" :
        ticket.combinedGrade.startsWith("B") ? "bg-indigo-500" :
        ticket.combinedGrade.startsWith("C") ? "bg-yellow-500" :
        "bg-red-500"
      }`} />
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
              <div key={leg.id} className={`text-xs p-1.5 rounded ${inSlip ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`} data-testid={`row-leg-${leg.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4 shrink-0">L{i + 1}</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${sportColor(leg.sport)}`}>{leg.sport}</Badge>
                  <span className="font-medium truncate flex-1">{leg.outcome}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{formatOdds(leg.americanOdds)}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 bg-muted/50 text-muted-foreground border-muted">{leg.grade}</Badge>
                  {inSlip && <Check className="w-3 h-3 text-primary shrink-0" />}
                </div>
                <div className="pl-6">
                  <OddsAttribution
                    oddsSourceBook={leg.oddsSourceBook}
                    oddsBookCount={leg.oddsBookCount}
                    oddsApiSource={leg.oddsApiSource}
                    allBookOdds={leg.allBookOdds}
                    compact
                  />
                </div>
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
          <span>Sors Conviction Score™: {ticket.combinedConfidence}%</span>
          <span className="text-muted-foreground/30">|</span>
          <span className={ticket.combinedEV > 0 ? "text-green-500" : "text-red-500"}>Intelligence Edge™: {ticket.combinedEV > 35 ? "35%+" : (ticket.combinedEV > 0 ? "+" : "") + ticket.combinedEV + "%"}</span>
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
  const g = grade.toUpperCase();
  if (g === "A+") return "text-amber-400";
  if (g.startsWith("A")) return "text-emerald-500";
  if (g === "B+") return "text-teal-500";
  if (g.startsWith("B")) return "text-indigo-400";
  if (g.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
}

function gradeBg(grade: string): string {
  const g = grade.toUpperCase();
  if (g === "A+") return "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400";
  if (g.startsWith("A")) return "bg-emerald-500/12 border-emerald-500/35 text-emerald-600 dark:text-emerald-400";
  if (g === "B+") return "bg-teal-500/12 border-teal-500/35 text-teal-600 dark:text-teal-400";
  if (g.startsWith("B")) return "bg-indigo-500/12 border-indigo-500/35 text-indigo-600 dark:text-indigo-400";
  if (g.startsWith("C")) return "bg-yellow-500/12 border-yellow-500/35 text-yellow-600 dark:text-yellow-400";
  return "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
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

function getCalibrationTier(confidence: number, ev: number): { label: string; cls: string; tooltip: string } {
  if (confidence >= 78 && ev < 4) return { label: "Over-confident", cls: "border-amber-500/50 text-amber-400", tooltip: "High confidence relative to edge. Historically over-estimates win probability." };
  if (confidence >= 65 && ev >= 4) return { label: "Well-calibrated", cls: "border-emerald-500/50 text-emerald-400", tooltip: "Confidence aligns well with edge. Historically delivers close to predicted win rates." };
  if (confidence < 65 && ev >= 8) return { label: "Undervalued", cls: "border-sky-500/50 text-sky-400", tooltip: "Conservative model but sees strong edge. Often outperforms confidence rating." };
  if (ev < 0) return { label: "Risky", cls: "border-red-500/50 text-red-400", tooltip: "Negative expected value — market has priced this bet against a positive outcome." };
  return { label: "Developing", cls: "border-border/40 text-muted-foreground", tooltip: "Insufficient signal history in this confidence bucket." };
}

function PickCard({ pick, legs, addLeg, isFounder }: { pick: TopPick; legs: { id: string }[]; addLeg: (leg: any) => boolean; isFounder?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const legId = `cmd-${pick.id}`;
  const inSlip = legs.some(l => l.id === legId);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inSlip) return;
    const decimalOdds = pick.odds < 0
      ? 1 + (100 / Math.abs(pick.odds))
      : 1 + (pick.odds / 100);
    const validMarket = ["moneyline","spread","total","player_prop"].includes(pick.betType) ? pick.betType : "moneyline";
    addLeg({
      id: legId, team: pick.homeTeam, opponent: pick.awayTeam,
      market: validMarket as any, outcome: pick.pick, decimalOdds,
      americanOdds: pick.odds, addedFrom: "Command Center",
      addedAt: new Date().toISOString(), sport: pick.sport,
      confidence: pick.confidence, evPercent: pick.ev, gameTime: pick.gameTime,
    });
  };

  const topFactors = (pick.factors || []).filter(f => f.direction === "bullish").slice(0, 3);
  const rec = pick.recommendation ? REC_STYLES[pick.recommendation] : null;

  const gradeBarColor = (g: string) => {
    if (g === "A+") return "bg-amber-400";
    if (g.startsWith("A")) return "bg-emerald-500";
    if (g === "B+") return "bg-teal-500";
    if (g.startsWith("B")) return "bg-blue-500";
    if (g.startsWith("C")) return "bg-yellow-500";
    return "bg-red-500";
  };

  const gradeTextColor = (g: string) => {
    if (g === "A+") return "text-amber-400";
    if (g.startsWith("A")) return "text-emerald-400";
    if (g === "B+") return "text-teal-400";
    if (g.startsWith("B")) return "text-blue-400";
    if (g.startsWith("C")) return "text-yellow-400";
    return "text-red-400";
  };

  const gameTimeStr = pick.gameTime
    ? new Date(pick.gameTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-card border transition-all duration-200 cursor-pointer ${inSlip ? "border-primary/50 bg-primary/5" : "border-border/60 hover:border-primary/30"} ${getGradeShimmerClass(pick.grade)}`}
      style={gradeAmbientGlow(pick.grade)}
      onClick={() => setExpanded(v => !v)}
      data-testid={`card-pick-${pick.id}`}
    >
      <div className={`h-0.5 w-full ${gradeBarColor(pick.grade)}`} />
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${sportColor(pick.sport)}`}>
              {pick.sport}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize bg-muted/50 border-border/40">
              {pick.betType.replace(/_/g, " ")}
            </Badge>
            {rec && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${rec.color}`}>{rec.label}</Badge>
            )}
            {(pick as any).wasUpgraded && (
              <Badge className="text-[10px] px-1.5 py-0 bg-green-500 text-white gap-0.5 shrink-0" title={(pick as any).upgradeReason || "Upgraded today"}>
                <TrendingUp className="w-2.5 h-2.5" />Upgraded
              </Badge>
            )}
            {(pick as any).wasDowngraded && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500 gap-0.5 shrink-0" title={(pick as any).downgradeReason || "Revised today"}>
                ↓ Revised
              </Badge>
            )}
            {!(pick as any).wasUpgraded && !(pick as any).wasDowngraded && (pick as any).signalStrengthened && (
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 text-white gap-0.5 shrink-0" title={(pick as any).upgradeReason || "Signal strengthened"}>
                Signal ↑
              </Badge>
            )}
            {(pick as any).signalLabel && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${
                (pick as any).signalStrength === "elite" ? "border-purple-500 text-purple-400" :
                (pick as any).signalStrength === "strong" ? "border-emerald-500 text-emerald-400" :
                (pick as any).signalStrength === "moderate" ? "border-blue-400 text-blue-400" :
                "border-muted text-muted-foreground"
              }`} data-testid={`signal-badge-${pick.id}`}>
                {(pick as any).signalLabel}
              </Badge>
            )}
            {isFounder && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-400 shrink-0" title="Founder Early Access" data-testid={`badge-founder-early-${pick.id}`}>F</span>
            )}
            {(() => {
              const cal = getCalibrationTier(pick.confidence, pick.ev);
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 cursor-help shrink-0 ${cal.cls}`} data-testid={`calibration-tier-${pick.id}`}>
                      {cal.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">{cal.tooltip}</TooltipContent>
                </Tooltip>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-base font-black font-mono tabular-nums ${gradeTextColor(pick.grade)}`}>
              {pick.grade}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-foreground">
              {formatOdds(pick.odds)}
            </span>
          </div>
        </div>

        <p className="font-semibold text-sm leading-tight mb-0.5" data-testid={`text-pick-${pick.id}`}>{pick.pick}</p>
        <p className="text-xs text-muted-foreground mb-3 truncate">
          {pick.game}{gameTimeStr ? ` · ${gameTimeStr}` : ""}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center bg-muted/40 rounded-lg p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Confidence</p>
            <div className="flex items-center justify-center gap-0.5">
              <p className="text-xs font-bold">{pick.confidence}%</p>
              {(pick as any).confidenceDelta !== null && (pick as any).confidenceDelta !== 0 && (
                <span className={`text-[9px] font-semibold ${(pick as any).confidenceDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                  {(pick as any).confidenceDelta > 0 ? "↑" : "↓"}{Math.abs((pick as any).confidenceDelta)}
                </span>
              )}
            </div>
          </div>
          <div className="text-center bg-muted/40 rounded-lg p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Edge</p>
            <div className="flex items-center justify-center gap-0.5">
              <p className={`text-xs font-bold ${pick.edge > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {pick.edge > 0 ? "+" : ""}{pick.edge.toFixed(1)}%
              </p>
              {(pick as any).edgeDelta !== null && (pick as any).edgeDelta !== 0 && (
                <span className={`text-[9px] font-semibold ${(pick as any).edgeDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                  {(pick as any).edgeDelta > 0 ? "↑" : "↓"}{Math.abs((pick as any).edgeDelta)}
                </span>
              )}
            </div>
          </div>
          <div className="text-center bg-muted/40 rounded-lg p-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">EV</p>
            <p className={`text-xs font-bold ${pick.ev > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {displayEv(pick.ev)}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
            <span>Sors Conviction Score™</span>
            <span className="font-semibold">{pick.confidence}%</span>
          </div>
          <Progress value={pick.confidence} className="h-1.5" />
        </div>

        {topFactors.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {topFactors.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-2.5 h-2.5" />
                {humanFactor(f.name)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={inSlip ? "secondary" : "default"}
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={handleAdd}
            disabled={inSlip}
            data-testid={`button-add-pick-${pick.id}`}
          >
            {inSlip ? <><Check className="w-3.5 h-3.5" /> In Slip</> : <><Plus className="w-3.5 h-3.5" /> Add to Slip</>}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            data-testid={`button-expand-pick-${pick.id}`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && pick.reasoning && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <div className="px-2.5 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-1.5">
                <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-foreground/80 leading-relaxed" data-testid={`text-reasoning-${pick.id}`}>
                  {pick.reasoning}
                </p>
              </div>
            </div>
          </div>
        )}
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
                {matchingPick.pick} · {matchingPick.confidence}% confidence
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

function ModelHealthDashboardCard() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    status: string;
    settledCount: number;
    winRate: number;
    recentTrend: number;
    lastUpdated: string;
    backtestCount: number;
    liveCount: number;
    factorCount: number;
  }>({
    queryKey: ["/api/model-health"],
    queryFn: async () => {
      const res = await fetch("/api/model-health");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 300_000,
  });

  const { data: trackData } = useQuery<{
    calibrationScore: number | null;
    overallWinRate: number | null;
    calibrationTiers: { label: string; settled: number; modelAvgConfidence: number; actualWinRate: number | null; calibrationGap: number | null }[];
  }>({
    queryKey: ["/api/track-record"],
    staleTime: 5 * 60_000,
  });

  const isCalibrated = data?.status === "calibrated";
  const winRate = data?.winRate ?? trackData?.overallWinRate ?? null;
  const calScore = trackData?.calibrationScore ?? null;
  const wellCalibrated = trackData?.calibrationTiers?.filter(t => t.settled >= 10 && t.calibrationGap !== null && Math.abs(t.calibrationGap) <= 5).length ?? 0;
  const totalTiers = trackData?.calibrationTiers?.filter(t => t.settled >= 10).length ?? 0;
  const brierEquivalent = calScore !== null ? (calScore / 100 * 0.4 + (winRate !== null ? winRate / 100 * 0.6 : 0)) : null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 p-3 space-y-2 animate-pulse">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden" data-testid="section-model-health">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
        data-testid="button-toggle-model-health"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isCalibrated ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-sm font-semibold">Model Health</span>
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 border ${isCalibrated ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
            {isCalibrated ? "Calibrated" : "Warming"}
          </Badge>
          <span className="text-[10px] text-muted-foreground hidden sm:block">{data?.factorCount ?? 46}-factor model · {data?.settledCount ?? 0} picks settled</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {winRate !== null && (
            <span className={`text-sm font-bold tabular-nums ${winRate >= 55 ? "text-emerald-400" : winRate >= 52.4 ? "text-amber-400" : "text-red-400"}`}>
              {winRate.toFixed(1)}% win
            </span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/40 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-muted/40">
              <p className={`text-lg font-black tabular-nums ${winRate !== null && winRate >= 55 ? "text-emerald-400" : winRate !== null && winRate >= 52.4 ? "text-amber-400" : "text-red-400"}`} data-testid="mh-win-rate">
                {winRate !== null ? `${winRate.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Strike Rate</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40">
              <p className={`text-lg font-black tabular-nums ${calScore !== null && calScore >= 80 ? "text-emerald-400" : calScore !== null && calScore >= 65 ? "text-sky-400" : calScore !== null && calScore >= 50 ? "text-amber-400" : "text-muted-foreground"}`} data-testid="mh-cal-score">
                {calScore !== null ? calScore : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Cal. Score</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40">
              <p className="text-lg font-black tabular-nums text-sky-400" data-testid="mh-brier">
                {brierEquivalent !== null ? `${(brierEquivalent * 100).toFixed(0)}%` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Accuracy Index</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40">
              <p className={`text-lg font-black tabular-nums ${totalTiers > 0 && wellCalibrated / totalTiers >= 0.6 ? "text-emerald-400" : "text-amber-400"}`} data-testid="mh-tier-agreement">
                {totalTiers > 0 ? `${wellCalibrated}/${totalTiers}` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Tiers Aligned</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{data?.liveCount ?? 0} live tracked · {data?.backtestCount ?? 0} backtested</span>
            <Link href="/track-record" className="text-primary hover:underline flex items-center gap-0.5">
              Full report <BarChart2 className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
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
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted/50 text-muted-foreground border-muted">{leg.grade}</Badge>
                  {inSlip && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
                <div className="col-span-full pl-6">
                  <OddsAttribution
                    oddsSourceBook={leg.oddsSourceBook}
                    oddsBookCount={leg.oddsBookCount}
                    oddsApiSource={leg.oddsApiSource}
                    allBookOdds={leg.allBookOdds}
                    compact
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const GRADE_ACCENT: Record<string, string> = {
    "A+": "#fbbf24", "A": "#34d399", "A-": "#34d399",
    "B+": "#2dd4bf", "B": "#60a5fa", "B-": "#60a5fa",
    "C+": "#facc15", "C": "#94a3b8",
  };
  const accent = GRADE_ACCENT[ticket.combinedGrade] || "#94a3b8";
  const sportEmoji = SPORT_EMOJI[ticket.sport] || "🎯";
  const topLegs = ticket.legs.slice(0, 9);
  const hiddenLegCount = Math.max(0, ticket.legs.length - 9);

  return (
    <Card className={`overflow-hidden border transition-shadow ${gradeBg(ticket.combinedGrade).includes("amber") ? "border-amber-500/30 shadow-[0_0_18px_rgba(251,191,36,0.12)]" : gradeBg(ticket.combinedGrade).includes("emerald") ? "border-emerald-500/25 shadow-[0_0_14px_rgba(52,211,153,0.10)]" : "border-muted/50"}`} data-testid={`card-matchup-${ticket.id}`}>

      {/* Grade accent bar */}
      <div className="h-[3px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${accent}60, ${accent}, ${accent}60)` }} />

      <CardContent className="p-0">

        {/* ── Header: sport + grade + leg count ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{sportEmoji}</span>
            <Badge className={`text-[10px] font-black uppercase ${sportColor(ticket.sport)}`}>{ticket.sport}</Badge>
            <span className="text-[10px] text-muted-foreground">{ticket.legCount} legs available</span>
            {someInSlip && (
              <Badge variant="secondary" className="text-[9px]">{inSlipCount} in slip</Badge>
            )}
          </div>
          <Badge variant="outline" className={`font-black text-sm px-2.5 ${gradeBg(ticket.combinedGrade)}`}>
            {ticket.combinedGrade}
          </Badge>
        </div>

        {/* ── Teams VS Matchup ── */}
        <div className="relative px-4 py-4 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.04] text-[80px]"
            aria-hidden="true"
          >{sportEmoji}</div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Home</p>
              <p className="font-black text-sm leading-snug truncate">{ticket.homeTeam}</p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-0.5 px-1">
              <span className="text-[11px] font-black tracking-widest text-muted-foreground/50">VS</span>
              <div className="w-6 h-px" style={{ background: `${accent}50` }} />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Away</p>
              <p className="font-black text-sm leading-snug truncate">{ticket.awayTeam}</p>
            </div>
          </div>
        </div>

        {/* ── Win Probability Bar ── */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Win Probability</span>
            <span className="text-sm font-black" style={{ color: accent }}>{ticket.winProbability}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${ticket.winProbability}%`,
                background: `linear-gradient(90deg, ${accent}70, ${accent})`,
                boxShadow: `0 0 8px ${accent}50`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* ── Top Leg Chips ── */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Picks</span>
            <div className="flex items-center gap-1">
              <button
                className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded bg-muted/40 hover:bg-muted/60"
                onClick={() => setSelectedLegIds(new Set(getTopLegIds(ticket.legs, 3)))}
              >Best 3</button>
              <button
                className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded bg-muted/40 hover:bg-muted/60"
                onClick={() => setSelectedLegIds(new Set(ticket.legs.map(l => l.id)))}
              >All</button>
              <button
                className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded bg-muted/40 hover:bg-muted/60"
                onClick={() => setSelectedLegIds(new Set())}
              >None</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topLegs.map(leg => {
              const isSelected = selectedLegIds.has(leg.id);
              const inSlip = legs.some(sl => sl.id === `matchup-${leg.pickId}`);
              return (
                <button
                  key={leg.id}
                  onClick={() => {
                    const next = new Set(selectedLegIds);
                    if (isSelected) next.delete(leg.id);
                    else next.add(leg.id);
                    setSelectedLegIds(next);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${
                    inSlip
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : isSelected
                      ? "border-primary/40 text-primary-foreground"
                      : "bg-muted/40 border-muted/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  style={isSelected && !inSlip ? { background: `${accent}18`, borderColor: `${accent}50`, color: accent } : {}}
                  data-testid={`leg-chip-${leg.id}`}
                >
                  {isSelected && !inSlip && <Check className="w-2.5 h-2.5 stroke-[3px] shrink-0" />}
                  {inSlip && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                  <span className="truncate max-w-[110px]">{leg.outcome}</span>
                  <span className="font-mono opacity-60 shrink-0 ml-0.5">{formatOdds(leg.americanOdds)}</span>
                </button>
              );
            })}
            {hiddenLegCount > 0 && (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-muted/30 border border-muted/50 text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                +{hiddenLegCount} more
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-b border-muted/25">
          {[
            { label: "Odds", value: formatOdds(combinedAmerican) },
            { label: "Stake", value: `$${ticket.recommendedStake}` },
            { label: "Payout", value: `$${(ticket.potentialPayout ?? 0).toLocaleString()}`, green: true },
            { label: "Win %", value: `${ticket.winProbability}%` },
          ].map(({ label, value, green }) => (
            <div key={label} className="text-center py-2.5 px-1 border-r last:border-r-0 border-muted/25">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
              <p className={`text-xs font-black mt-0.5 ${green ? "text-emerald-400" : ""}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Correlation Warning ── */}
        {hasCorrelatedLegs && (
          <div className="mx-4 mt-3 px-2.5 py-1.5 rounded-md bg-amber-500/8 border border-amber-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Correlated legs — sportsbooks may limit parlay</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="p-4 flex items-center gap-2">
          <Button
            onClick={handleAddSelected}
            disabled={allInSlip || selectedLegIds.size === 0}
            className="flex-1 gap-1.5 font-black text-xs h-9"
            size="sm"
            variant={allInSlip ? "secondary" : "default"}
            data-testid={`button-add-matchup-${ticket.id}`}
          >
            {allInSlip
              ? <><Check className="w-3.5 h-3.5" /> All in Slip</>
              : <><Plus className="w-3.5 h-3.5" /> Add {selectedLegIds.size || ""} to Slip</>
            }
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 gap-1 text-[11px] font-bold"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-matchup-${ticket.id}`}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Less" : "Full Breakdown"}
          </Button>
        </div>

        {/* ── Expanded full leg list ── */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-muted/25">
            {ticket.reasoning && (
              <div className="mt-3 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-1.5">
                  <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{ticket.reasoning}</p>
                </div>
              </div>
            )}
            <div className="space-y-3 mt-2">
              {renderLegGroup("Spreads", ticket.marketBreakdown?.spreads || [])}
              {renderLegGroup("Totals", ticket.marketBreakdown?.totals || [])}
              {renderLegGroup("Moneylines", ticket.marketBreakdown?.moneylines || [])}
              {renderLegGroup("Player Props", ticket.marketBreakdown?.playerProps || [])}
              {renderLegGroup("Other Markets", ticket.marketBreakdown?.other || [])}
            </div>
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
  selectionCategory: "underdog" | "contrarian" | "alternative" | "sleeper" | "steam_move" | "trap_game";
  gameTime?: string;
  ev: number;
  confidence: number;
  grade: string;
  edge: number;
  isUnderdog: boolean;
  reasoning: string;
  oddsSourceBook?: string;
  oddsBookCount?: number;
  oddsApiSource?: string;
  allBookOdds?: { book: string; odds: number }[];
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
  MMA: "🥊", UFC: "🥊",
  Soccer_EPL: "⚽", Soccer_LALIGA: "⚽", Soccer_BUNDESLIGA: "⚽",
  Soccer_SERIEA: "⚽", Soccer_LIGUE1: "⚽", Soccer_MLS: "⚽",
  Soccer_UCL: "⚽", Soccer_INTL: "⚽", Soccer_CHAMPIONSHIP: "⚽",
  Soccer_LIGAMX: "⚽", Soccer_EREDIVISIE: "⚽", Soccer_PORTUGAL: "⚽",
  Soccer_TURKEY: "⚽", Soccer_BRASIL: "⚽", Soccer_EUROPA: "⚽",
};

interface AlternativePick {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  americanOdds: number;
  decimalOdds: number;
  ev: number;
  confidence: number;
  grade: string;
  edge: number;
  gameTime?: string;
  reasoning: string;
  isUnderdog: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  underdog:   "text-amber-500 bg-amber-500/10 border-amber-500/30",
  sleeper:    "text-purple-500 bg-purple-500/10 border-purple-500/30",
  contrarian: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  alternative:"text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  steam_move: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  trap_game:  "text-rose-400 bg-rose-400/10 border-rose-400/30",
};

const CATEGORY_LABEL: Record<string, string> = {
  underdog:   "Underdog",
  sleeper:    "Sleeper",
  contrarian: "Contrarian",
  alternative:"Alt Market",
  steam_move: "Steam Move",
  trap_game:  "Trap Game",
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

// ─── Featured Cards Banner ────────────────────────────────────────────────────
const SPORT_ICONS: Record<string, string> = { NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾", NCAAB: "🏀", MMA: "🥊", SOCCER: "⚽" };
const PREVIEW_CARDS = [
  { sport: "NBA", grade: "A+", pick: "LeBron James Over 28.5 Pts" },
  { sport: "NHL", grade: "A",  pick: "Golden Knights -1.5" },
  { sport: "NFL", grade: "A+", pick: "Mahomes Over 285.5 Yds" },
];

function FeaturedCardsBanner() {
  return (
    <Link href="/cards">
      <div
        className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-950/40 via-yellow-900/20 to-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer group transition-all hover:border-amber-400/50 hover:bg-amber-950/50"
        data-testid="banner-sors-cards"
      >
        {/* Left: icon + text */}
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/25 shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-300">Sors Intelligence Cards™</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">NEW</span>
            </div>
            <p className="text-xs text-amber-200/70 max-w-md">
              Collectible cards issued for every top pick — limited copies, grade-matched rarity, holographic finishes. Win big and the card becomes a trophy.
            </p>
          </div>
        </div>

        {/* Middle: preview cards */}
        <div className="flex gap-2 shrink-0">
          {PREVIEW_CARDS.map((c, i) => (
            <div
              key={i}
              className="relative rounded-lg border border-amber-400/30 bg-gradient-to-b from-amber-900/40 to-black/60 px-2.5 py-2 text-center w-[90px] shadow-md"
              style={{ transform: `rotate(${(i - 1) * 3}deg)` }}
            >
              <div className="text-lg mb-0.5">{SPORT_ICONS[c.sport] || "🏅"}</div>
              <div className={`text-[11px] font-black ${c.grade === "A+" ? "text-amber-400" : "text-emerald-400"}`}>{c.grade}</div>
              <div className="text-[9px] text-amber-200/60 leading-tight mt-0.5 line-clamp-2">{c.pick}</div>
            </div>
          ))}
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:gap-2.5 transition-all shrink-0">
          View Collection
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
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
  const [swapOverrides, setSwapOverrides] = useState<Map<number, LifeChangerLeg>>(new Map());
  const [swapOpenIdx, setSwapOpenIdx] = useState<number | null>(null);

  // Reset state when ticket refreshes
  useEffect(() => {
    setAddedAll(false);
    setSwapOverrides(new Map());
    setSwapOpenIdx(null);
  }, [dataUpdatedAt]);

  // Effective legs = ticket legs with any user-applied swaps overlaid
  const effectiveLegs = useMemo<LifeChangerLeg[]>(() => {
    if (!ticket) return [];
    return ticket.legs.map((leg, i) => swapOverrides.get(i) ?? leg);
  }, [ticket, swapOverrides]);

  // Recompute parlay odds when swaps change
  const effectiveDecimalOdds = useMemo(
    () => effectiveLegs.reduce((acc, l) => acc * l.decimalOdds, 1),
    [effectiveLegs]
  );

  const payout = useMemo(() => effectiveDecimalOdds > 0 ? stake * effectiveDecimalOdds : 0, [stake, effectiveDecimalOdds]);
  const payoutFormatted = useMemo(() => formatLCPayout(payout), [payout]);

  // Alternatives query — only runs when a swap popover is open
  const activeLeg = swapOpenIdx !== null ? effectiveLegs[swapOpenIdx] : null;
  const altQueryKey = activeLeg
    ? `/api/picks/alternatives?sport=${encodeURIComponent(activeLeg.sport)}&excludeGame=${encodeURIComponent(activeLeg.game)}`
    : null;
  const { data: altsData, isLoading: altsLoading } = useQuery<{ alternatives: AlternativePick[] }>({
    queryKey: [altQueryKey],
    enabled: !!altQueryKey,
    staleTime: 60000,
  });

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

  function handleSwapUse(idx: number, alt: AlternativePick) {
    const asLeg: LifeChangerLeg = {
      sport: alt.sport,
      game: alt.game,
      pick: alt.pick,
      betType: alt.betType,
      americanOdds: alt.americanOdds,
      decimalOdds: alt.decimalOdds,
      selectionReason: alt.reasoning || "Alternative selected by model",
      selectionCategory: alt.isUnderdog ? "underdog" : "alternative",
      gameTime: alt.gameTime,
      ev: alt.ev,
      confidence: alt.confidence,
      grade: alt.grade,
      edge: alt.edge,
      isUnderdog: alt.isUnderdog,
      reasoning: alt.reasoning,
    };
    setSwapOverrides(prev => {
      const next = new Map(prev);
      next.set(idx, asLeg);
      return next;
    });
    setSwapOpenIdx(null);
  }

  function handleAddAll() {
    if (!effectiveLegs.length) return;
    let added = 0;
    effectiveLegs.forEach(leg => {
      const ok = addLeg(buildLcLeg(leg) as any);
      if (ok) added++;
    });
    if (added > 0) setAddedAll(true);
  }

  const allInSlip = effectiveLegs.length > 0 && effectiveLegs.every(l => legs.some(s => s.id === legId(l)));

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
                <h2 className="text-base font-bold text-amber-300 leading-tight">Life Changer™ Ticket</h2>
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
                {effectiveDecimalOdds > 1
                  ? (effectiveDecimalOdds >= 2
                    ? `+${Math.round((effectiveDecimalOdds - 1) * 100)}`
                    : `-${Math.round(100 / (effectiveDecimalOdds - 1))}`)
                  : ticket.americanOdds}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {effectiveLegs.length} legs · {[...new Set(effectiveLegs.map(l => l.sport))].join(", ")}
              </p>
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

              {/* Live payout display for selected stake */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-amber-300/70 uppercase tracking-wide">If all {effectiveLegs.length} legs hit</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatLCStake(stake)} × {effectiveDecimalOdds.toFixed(1)}x odds
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-amber-300 tabular-nums leading-none" data-testid="text-lc-payout-live">
                    {payoutFormatted}
                  </p>
                  <p className="text-[9px] text-amber-300/60 mt-0.5">potential win</p>
                </div>
              </div>

              {/* Win Scenarios — always-visible $10 / $50 / $100 grid */}
              <div className="rounded-lg border border-amber-500/20 overflow-hidden">
                <div className="px-3 py-1.5 bg-amber-500/8 border-b border-amber-500/15 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide">Win Scenarios — If Every Leg Hits</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-amber-500/15">
                  {[10, 50, 100].map(s => {
                    const p = s * effectiveDecimalOdds;
                    const fmt = p >= 1_000_000 ? `$${(p / 1_000_000).toFixed(2)}M` : p >= 1_000 ? `$${(p / 1_000).toFixed(1)}K` : `$${p.toFixed(2)}`;
                    return (
                      <div key={s} className="py-2.5 px-2 text-center" data-testid={`lc-scenario-${s}`}>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">${s} bet</p>
                        <p className="text-base font-black text-amber-300 tabular-nums leading-tight mt-0.5">{fmt}</p>
                      </div>
                    );
                  })}
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
                  {expanded ? "Hide" : "View"} all {effectiveLegs.length} legs
                  {swapOverrides.size > 0 && (
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 rounded px-1">
                      {swapOverrides.size} swapped
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Leg list */}
            {expanded && (
              <div className="px-4 pb-3 space-y-2 border-t border-amber-500/10 pt-3 max-h-[420px] overflow-y-auto">
                {effectiveLegs.map((leg, i) => {
                  const legInSlip = legs.some(s => s.id === legId(leg));
                  const isSwapped = swapOverrides.has(i);
                  const isSwapOpen = swapOpenIdx === i;
                  const alternatives = altsData?.alternatives ?? [];
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border bg-background/50 px-3 py-2.5 overflow-hidden transition-colors ${isSwapped ? "border-cyan-400/40 bg-cyan-950/20" : "border-border/60"}`}
                      data-testid={`row-lc-leg-${i}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5 shrink-0">{SPORT_EMOJI[leg.sport] || "🎯"}</span>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-semibold leading-tight">{leg.pick}</span>
                            {isSwapped && (
                              <span className="text-[9px] text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 rounded px-1">swapped</span>
                            )}
                            {leg.grade && (
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 border font-bold shrink-0 ${gradeColor(leg.grade)}`}>
                                {leg.grade}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 border shrink-0 ${CATEGORY_COLORS[leg.selectionCategory] ?? ""}`}>
                              {CATEGORY_LABEL[leg.selectionCategory] ?? leg.selectionCategory}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{leg.game}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {leg.gameTime && (
                              <span className="text-[10px] text-muted-foreground/60">{new Date(leg.gameTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            )}
                            {leg.ev > 0 && (
                              <span className="text-[10px] font-medium text-emerald-400">{leg.ev > 35 ? "35%+" : `+${leg.ev.toFixed(1)}%`} EV</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">{leg.confidence}% confidence</span>
                          </div>
                          <p className="text-[10px] text-amber-300/70 mt-0.5 line-clamp-2">{leg.selectionReason}</p>
                          <OddsAttribution
                            oddsSourceBook={leg.oddsSourceBook}
                            oddsBookCount={leg.oddsBookCount}
                            oddsApiSource={leg.oddsApiSource}
                            allBookOdds={leg.allBookOdds}
                            compact
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 w-[80px]">
                          <p className="text-lg font-black text-amber-300 tabular-nums leading-none" data-testid={`lc-leg-odds-${i}`}>{formatOddsLC(leg.americanOdds)}</p>
                          <p className="text-[9px] text-muted-foreground text-right leading-tight">{leg.betType.replace(/_/g, " ")}</p>
                          <button
                            onClick={() => { addLeg(buildLcLeg(leg) as any); }}
                            disabled={legInSlip}
                            data-testid={`button-lc-add-leg-${i}`}
                            className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap ${
                              legInSlip
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                            }`}
                          >
                            {legInSlip ? "✓" : "+ Add"}
                          </button>
                          {/* Swap trigger */}
                          <Popover open={isSwapOpen} onOpenChange={open => setSwapOpenIdx(open ? i : null)}>
                            <PopoverTrigger asChild>
                              <button
                                data-testid={`button-lc-swap-${i}`}
                                className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70 flex items-center gap-0.5"
                              >
                                <RefreshCw className="w-2.5 h-2.5" /> Swap
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              side="left"
                              align="start"
                              className="w-72 p-0 shadow-xl border-border/60"
                            >
                              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                                <p className="text-xs font-semibold">Swap Leg {i + 1}</p>
                                <p className="text-[10px] text-muted-foreground">{leg.sport} alternatives</p>
                              </div>
                              {altsLoading && swapOpenIdx === i && (
                                <div className="px-3 py-4 space-y-2">
                                  <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
                                  <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
                                  <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
                                </div>
                              )}
                              {!altsLoading && alternatives.length === 0 && swapOpenIdx === i && (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                  No alternatives available right now.<br />Check back once more games are loaded.
                                </div>
                              )}
                              {!altsLoading && alternatives.length > 0 && swapOpenIdx === i && (
                                <div className="divide-y divide-border/30 max-h-[280px] overflow-y-auto">
                                  {alternatives.map((alt, ai) => (
                                    <div key={ai} className="px-3 py-2 hover:bg-muted/30 transition-colors flex items-start gap-2">
                                      <span className="text-sm shrink-0 mt-0.5">{SPORT_EMOJI[alt.sport] || "🎯"}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="text-[11px] font-semibold leading-tight truncate">{alt.pick}</span>
                                          <Badge variant="outline" className={`text-[9px] px-1 py-0 border font-bold shrink-0 ${gradeColor(alt.grade)}`}>
                                            {alt.grade}
                                          </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">{alt.game}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] font-bold text-amber-400">{formatOddsLC(alt.americanOdds)}</span>
                                          {alt.ev > 0 && <span className="text-[10px] text-emerald-400">{alt.ev > 35 ? "35%+" : `+${alt.ev.toFixed(1)}%`} EV</span>}
                                          <span className="text-[10px] text-muted-foreground/60">{alt.confidence}%</span>
                                        </div>
                                      </div>
                                      <button
                                        data-testid={`button-lc-swap-use-${i}-${ai}`}
                                        onClick={() => handleSwapUse(i, alt)}
                                        className="shrink-0 mt-0.5 px-2 py-1 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 transition-colors whitespace-nowrap"
                                      >
                                        Use
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {isSwapped && (
                                <div className="px-3 py-1.5 border-t border-border/30">
                                  <button
                                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => {
                                      setSwapOverrides(prev => { const next = new Map(prev); next.delete(i); return next; });
                                      setSwapOpenIdx(null);
                                    }}
                                  >
                                    ↩ Restore original leg
                                  </button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
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
  const [swipeMode, setSwipeMode] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [sortBy, setSortBy] = useState<"grade" | "ev" | "confidence" | "odds">("grade");
  const [tierFilter, setTierFilter] = useState<"all" | "LOCK" | "STRONG" | "LEAN">("all");
  const { legs, addLeg } = useParlaySlip();
  const { canAccess } = useTier();
  const { activeStrategy, isActiveMode } = useUserStrategy();
  const activeMode = isActiveMode();
  const { toast } = useToast();
  const [parlayModalOpen, setParlayModalOpen] = useState(false);
  const [sseEverConnected, setSseEverConnected] = useState(false);

  const { data: stratPicks, isLoading: isStratLoading } = useQuery<{ picks: TopPick[] }>({
    queryKey: ["/api/strategy/auto-picks", activeStrategy?.id],
    enabled: !!activeStrategy && activeMode,
    refetchInterval: 60000,
  });

  const { data: autoParlayPicks, isLoading: isLoadingAutoParlay } = useQuery<{ picks: TopPick[] }>({
    queryKey: ["/api/strategy/auto-picks", activeStrategy?.id, 4],
    enabled: !!activeStrategy && activeMode && parlayModalOpen,
  });

  const handleBuildParlay = () => {
    setParlayModalOpen(true);
  };

  const handleAddAllToSlip = () => {
    if (!autoParlayPicks?.picks) return;
    
    let addedCount = 0;
    autoParlayPicks.picks.forEach(pick => {
      const legId = `cmd-strat-${pick.id}`;
      if (!legs.some(l => l.id === legId)) {
        const decimalOdds = pick.odds < 0
          ? 1 + (100 / Math.abs(pick.odds))
          : 1 + (pick.odds / 100);

        addLeg({
          id: legId,
          team: pick.homeTeam,
          opponent: pick.awayTeam,
          market: (pick.betType || "moneyline") as any,
          outcome: pick.pick,
          decimalOdds,
          americanOdds: pick.odds,
          addedFrom: "Strategy Mode",
          addedAt: new Date().toISOString(),
          sport: pick.sport,
          confidence: pick.confidence,
          evPercent: pick.ev,
          grade: pick.grade,
          gameTime: pick.gameTime,
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({
        title: `${addedCount}-leg ${activeStrategy?.name} parlay added!`,
        description: "Review your legs in the parlay slip.",
      });
    }
    setParlayModalOpen(false);
  };

  const parlayOdds = useMemo(() => {
    if (!autoParlayPicks?.picks) return 1;
    return autoParlayPicks.picks.reduce((acc, pick) => {
      const decimal = pick.odds < 0
        ? 1 + (100 / Math.abs(pick.odds))
        : 1 + (pick.odds / 100);
      return acc * decimal;
    }, 1);
  }, [autoParlayPicks]);

  const americanParlayOdds = useMemo(() => {
    if (parlayOdds >= 2.0) {
      return Math.round((parlayOdds - 1) * 100);
    } else {
      return Math.round(-100 / (parlayOdds - 1));
    }
  }, [parlayOdds]);

  const sse = useSSEContext();

  useEffect(() => {
    if (!sse.lastEvent) return;
    if (sse.lastEvent.type === "intelligence-update") {
      queryClient.invalidateQueries({ queryKey: ["/api/life-changer-ticket"] });
    }
    if (sse.lastEvent.type === "picks-update" || sse.lastEvent.type === "predictions-ready") {
      queryClient.invalidateQueries({ queryKey: ["/api/life-changer-ticket"] });
      queryClient.invalidateQueries({ queryKey: ["/api/optimal-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matchup-tickets"] });
    }
  }, [sse.lastEvent]);

  useEffect(() => {
    if (sse.connected && !sseEverConnected) {
      setSseEverConnected(true);
    }
  }, [sse.connected, sseEverConnected]);

  const { data: authData } = useQuery<{ isAdmin?: boolean; authenticated?: boolean; isFounder?: boolean }>({
    queryKey: ["/api/auth/check"],
    staleTime: 60000,
  });

  const { data: streakData } = useQuery<{ currentStreak: number; streakType: string; longestWin: number }>({
    queryKey: ["/api/user/streak"],
    staleTime: 120000,
    enabled: authData?.authenticated === true,
  });

  const { data: advancedFlagData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/feature-flags/check/advanced_command_center"],
    staleTime: 60000,
  });

  // All paying subscribers see advanced sections; admin flag provides early access during rollout
  const showAdvanced = authData?.isAdmin === true || advancedFlagData?.enabled === true || canAccess("pro");

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

  const gradeOrder = (g: string) => {
    const order: Record<string, number> = { "A+": 0, "A": 1, "B+": 2, "B": 3, "C+": 4, "C": 5, "D": 6, "F": 7 };
    return order[g.toUpperCase()] ?? 8;
  };

  const sortedTickets = useMemo(() => {
    if (!ticketsData?.tickets) return [];
    return [...ticketsData.tickets].sort((a, b) => gradeOrder(a.combinedGrade) - gradeOrder(b.combinedGrade));
  }, [ticketsData?.tickets]);

  const sortedMatchupTickets = useMemo(() => {
    if (!matchupData?.matchupTickets) return [];
    return [...matchupData.matchupTickets].sort((a, b) => gradeOrder(a.combinedGrade) - gradeOrder(b.combinedGrade));
  }, [matchupData?.matchupTickets]);

  const filteredPicks = useMemo(() => {
    let picks = activeSportTab === "all" ? (feed?.topPicks ?? []) : (feed?.topPicks ?? []).filter(p => p.sport === activeSportTab);
    if (tierFilter !== "all") {
      picks = picks.filter(p => {
        const g = p.grade?.toUpperCase() ?? "";
        if (tierFilter === "LOCK") return g === "A+" || g === "A";
        if (tierFilter === "STRONG") return g === "B+" || g === "B";
        if (tierFilter === "LEAN") return g === "C+" || g === "C";
        return true;
      });
    }
    return picks;
  }, [feed?.topPicks, activeSportTab, tierFilter]);

  const sortedTopPicks = useMemo(() => {
    const picks = [...filteredPicks];
    switch (sortBy) {
      case "ev": return picks.sort((a, b) => (b.ev || 0) - (a.ev || 0));
      case "confidence": return picks.sort((a, b) => b.confidence - a.confidence);
      case "odds": return picks.sort((a, b) => Math.abs(b.odds) - Math.abs(a.odds));
      default: return picks.sort((a, b) => gradeOrder(a.grade) - gradeOrder(b.grade));
    }
  }, [filteredPicks, sortBy]);

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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* ─── COMPACT HEADER ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3 flex-wrap" data-testid="heading-command-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0" style={{ boxShadow: "0 0 14px rgba(99,102,241,0.3)" }}>
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">Intelligence Hub</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">46-Factor Model Analysis™</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-md hidden sm:block">Your daily picks dashboard — browse AI-ranked picks, monitor live scores, check sharp money alerts, and build your parlay slip. All data updates automatically every 30 seconds.</p>
              </div>
            </div>
            <ModelHealthChip />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <DataSourceBar sources={feed.dataSourceHealth} />
            {sse.connected ? (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-500" data-testid="badge-sse-live">
                <Wifi className="w-2.5 h-2.5" /> Live
              </Badge>
            ) : sseEverConnected ? (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-amber-500/10 border-amber-500/30 text-amber-500">
                <WifiOff className="w-2.5 h-2.5" /> Reconnecting
              </Badge>
            ) : null}
            {lastUpdate && (
              <div className="hidden sm:flex text-[10px] text-muted-foreground items-center gap-1">
                <RefreshCw className="w-3 h-3" />{lastUpdate}
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:hidden" onClick={() => setSwipeMode(true)} data-testid="button-swipe-mode">
              <Smartphone className="w-3.5 h-3.5" /> Swipe
            </Button>
          </div>
        </header>

        {/* ─── HERO STATS ROW ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3" data-testid="section-hero-stats">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/60">Today</span>
            </div>
            <p className="text-2xl font-black tabular-nums" data-testid="text-total-picks">{totalPicks}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Intelligence Picks™</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/60">Best</span>
            </div>
            <p className={`text-2xl font-black tabular-nums ${gradeColor(ticketsData?.tickets[0]?.combinedGrade || feed.topPicks[0]?.grade || "C")}`} data-testid="text-best-grade">
              {ticketsData?.tickets[0]?.combinedGrade || feed.topPicks[0]?.grade || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Top Grade Today</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-500/60">Edge</span>
            </div>
            <p className="text-2xl font-black tabular-nums text-emerald-400" data-testid="text-top-ev">
              {ticketsData?.tickets[0]?.combinedEV
                ? (ticketsData.tickets[0].combinedEV > 35 ? "35%+" : `+${ticketsData.tickets[0].combinedEV}%`)
                : feed.topPicks[0]?.ev
                  ? (feed.topPicks[0].ev > 35 ? "35%+" : `+${feed.topPicks[0].ev.toFixed(1)}%`)
                  : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Highest EV Pick</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-red-500/25 bg-gradient-to-br from-red-500/10 to-red-500/5 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-red-400" />
              {totalLive > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] text-red-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              )}
            </div>
            <p className="text-2xl font-black tabular-nums" data-testid="text-live-count">{totalLive}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{totalLive > 0 ? "In Progress" : "Live Games"}</p>
          </div>
          <div
            className={`relative overflow-hidden rounded-xl border p-3.5 cursor-pointer col-span-2 sm:col-span-4 xl:col-span-1 ${streakData?.streakType === "win" && (streakData?.currentStreak ?? 0) > 0 ? "border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5" : "border-border/40 bg-muted/20"}`}
            onClick={() => window.location.href = "/personalized-insights"}
            data-testid="card-stat-streak"
          >
            <div className="flex items-center justify-between mb-2">
              <Flame className={`w-4 h-4 ${streakData?.streakType === "win" && (streakData?.currentStreak ?? 0) > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Streak</span>
            </div>
            {streakData && streakData.currentStreak > 0 ? (
              <>
                <p className={`text-2xl font-black tabular-nums ${streakData.streakType === "win" ? "text-orange-400" : "text-blue-400"}`} data-testid="text-pick-streak">
                  {streakData.streakType === "win" ? "+" : ""}{streakData.currentStreak}W
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Best: {streakData.longestWin}W</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black tabular-nums text-muted-foreground" data-testid="text-pick-streak">—</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Track picks to start</p>
              </>
            )}
          </div>
        </div>

        {/* ─── MODEL HEALTH CARD ──────────────────────────────────────── */}
        <ModelHealthDashboardCard />

        {/* ─── STRATEGY MODE BANNER ───────────────────────────────────── */}
        {activeStrategy && activeMode && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3" data-testid="banner-strategy-mode">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                  {activeStrategy.icon}
                </div>
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    Your {activeStrategy.name} Picks Today
                    <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground animate-pulse">Strategy Mode</Badge>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Filtered for your active {activeStrategy.name} rules</p>
                </div>
              </div>
              <Button size="sm" className="gap-2 h-8 text-xs" onClick={handleBuildParlay} data-testid="button-build-strategy-parlay">
                <Dice5 className="w-3.5 h-3.5" /> Build My Parlay
              </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-3">
                {isStratLoading
                  ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[140px] w-[200px] rounded-lg shrink-0" />)
                  : stratPicks?.picks?.length
                  ? stratPicks.picks.slice(0, 6).map(pick => <CompactPickCard key={pick.id} pick={pick} legs={legs} addLeg={addLeg} isFounder={authData?.isFounder} />)
                  : (
                    <div className="w-full flex items-center justify-center p-8 bg-muted/20 rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground">No picks found for your strategy right now — check back soon</p>
                    </div>
                  )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* ─── AUTO PARLAY DIALOG ─────────────────────────────────────── */}
        <Dialog open={parlayModalOpen} onOpenChange={setParlayModalOpen}>
          <DialogContent className="max-w-md" data-testid="modal-auto-parlay">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Sors built a parlay for you
              </DialogTitle>
              <DialogDescription>
                Based on your active <strong>{activeStrategy?.name}</strong> strategy.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isLoadingAutoParlay ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing elite edges...</p>
                </div>
              ) : autoParlayPicks?.picks && autoParlayPicks.picks.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {autoParlayPicks.picks.map((pick, i) => (
                      <div key={pick.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <span className="text-xs font-bold text-muted-foreground w-4">L{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{pick.pick}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{pick.game}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold">{formatOdds(pick.odds)}</p>
                          <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${gradeBg(pick.grade)}`}>{pick.grade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Combined Odds</p>
                      <p className="text-2xl font-mono font-black text-primary">{americanParlayOdds > 0 ? "+" : ""}{americanParlayOdds}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Potential Payout</p>
                      <p className="text-sm font-medium">{parlayOdds.toFixed(2)}x Return</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <p className="text-sm font-medium">No suitable legs found right now.</p>
                  <p className="text-xs text-muted-foreground">Try again in a few minutes or adjust your strategy.</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setParlayModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!autoParlayPicks?.picks?.length} onClick={handleAddAllToSlip} data-testid="button-add-auto-parlay">
                Add All to Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── LIFE CHANGER TICKET™ ───────────────────────────────────── */}
        {showAdvanced && (
          <section data-testid="section-life-changer">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0" style={{ boxShadow: "0 0 14px rgba(245,158,11,0.3)" }}>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight leading-none">Life Changer Ticket™</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Daily high-upside parlay · Max tier exclusive</p>
              </div>
              <Badge className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 shrink-0">MAX TIER</Badge>
            </div>
            {canAccess("whale") ? (
              <LifeChangerSection legs={legs} addLeg={addLeg} />
            ) : (
              <TierGate
                required="whale"
                label="Life Changer™ Ticket"
                description="Our highest-upside daily parlay — cross-sport, unorthodox picks, monster payouts. The ticket our Max members wait for every morning."
              >
                <div />
              </TierGate>
            )}
          </section>
        )}

        {/* ─── INTELLIGENCE TICKETS™ ──────────────────────────────────── */}
        {showAdvanced && (
          <section data-testid="section-best-tickets">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0" style={{ boxShadow: "0 0 10px rgba(99,102,241,0.25)" }}>
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight leading-none">
                    {ticketDateFilter === "today" ? "Today's" : ticketDateFilter === "future" ? "Upcoming" : "All"} Intelligence Tickets™
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">AI-assembled multi-leg parlays</p>
                </div>
                {ticketsData && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">{ticketsData.tickets.length} ready</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-muted rounded-lg p-0.5" data-testid="filter-ticket-date">
                  {([{ value: "today" as const, label: "Today" }, { value: "future" as const, label: "Upcoming" }, { value: "all" as const, label: "All" }]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTicketDateFilter(value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${ticketDateFilter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid={`button-date-${value}`}
                    >{label}</button>
                  ))}
                </div>
                <Link href="/generate">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" data-testid="link-generate-more">
                    Custom <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
            {ticketsData && ticketsData.tickets.length > 0 ? (
              <>
                <MobileTicketDeck
                  items={sortedTickets}
                  renderCard={(ticket) => <TicketCard ticket={ticket} legs={legs} addLeg={addLeg} />}
                  getGrade={(t) => t.combinedGrade}
                  label="Intelligence Tickets™"
                />
                <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sortedTickets.slice(0, 6).map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} legs={legs} addLeg={addLeg} />
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {ticketDateFilter === "today" ? "No same-day games with strong enough picks. Try \"Upcoming\" or \"All\"." : ticketDateFilter === "future" ? "No upcoming games with strong picks yet." : "No tickets available right now. Picks are generated every 5 minutes."}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* ─── MATCHUP INTELLIGENCE TICKETS™ ─────────────────────────── */}
        {showAdvanced && matchupData && matchupData.matchupTickets.length > 0 && (
          <section data-testid="section-matchup-tickets">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold">Matchup Intelligence Tickets™</h2>
                <Badge variant="secondary" className="text-[10px]">{matchupData.matchupTickets.length} matchups</Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Full game breakdowns · 10–20 leg parlays</p>
            </div>
            <MobileTicketDeck
              items={sortedMatchupTickets}
              renderCard={(ticket) => <MatchupTicketCard ticket={ticket} legs={legs} addLeg={addLeg} />}
              getGrade={(t) => t.combinedGrade}
              label="Matchup Intelligence Tickets™"
            />
            <div className="hidden md:grid md:grid-cols-2 gap-3">
              {sortedMatchupTickets.map(ticket => (
                <MatchupTicketCard key={ticket.id} ticket={ticket} legs={legs} addLeg={addLeg} />
              ))}
            </div>
          </section>
        )}

        {/* ─── INTELLIGENCE CARDS FEATURE BANNER ─────────────────────── */}
        <FeaturedCardsBanner />

        {/* ─── PICKS BROWSER ──────────────────────────────────────────── */}
        <section data-testid="section-picks-browser">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Intelligence Picks™</span>
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sortedTopPicks.length} of {totalPicks} picks · {activeSports.length} sports</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 hidden sm:flex" onClick={() => setSwipeMode(true)} data-testid="button-swipe-mode-picks">
              <Smartphone className="w-3.5 h-3.5" /> Swipe Mode
            </Button>
          </div>

          {/* Sport filter tabs */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-3">
            <div className="inline-flex w-auto min-w-max h-9 bg-muted/60 p-1 gap-0.5 rounded-lg">
              <button
                onClick={() => setActiveSportTab("all")}
                className={`px-3 h-7 rounded-md text-xs font-medium transition-all shrink-0 ${activeSportTab === "all" ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                style={activeSportTab === "all" ? { boxShadow: "0 0 10px rgba(99,102,241,0.35)" } : {}}
                data-testid="tab-sport-all"
              >
                All Sports
              </button>
              {activeSports.map(s => {
                const sportGlow: Record<string, string> = {
                  NBA: "rgba(249,115,22,0.4)", NFL: "rgba(34,197,94,0.4)", MLB: "rgba(59,130,246,0.4)",
                  NHL: "rgba(6,182,212,0.4)", NCAAB: "rgba(168,85,247,0.4)", NCAAF: "rgba(244,63,94,0.4)", MMA: "rgba(239,68,68,0.4)",
                };
                const sportActiveClass: Record<string, string> = {
                  NBA: "bg-orange-500/15 text-orange-400", NFL: "bg-green-500/15 text-green-400",
                  MLB: "bg-blue-500/15 text-blue-400", NHL: "bg-cyan-500/15 text-cyan-400",
                  NCAAB: "bg-purple-500/15 text-purple-400", NCAAF: "bg-rose-500/15 text-rose-400", MMA: "bg-red-500/15 text-red-400",
                };
                const isActive = activeSportTab === s.sport;
                return (
                  <button
                    key={s.sport}
                    onClick={() => setActiveSportTab(s.sport)}
                    className={`px-3 h-7 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${isActive ? (sportActiveClass[s.sport] || "bg-muted text-foreground") + " shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    style={isActive ? { boxShadow: `0 0 12px ${sportGlow[s.sport] || "rgba(99,102,241,0.3)"}` } : {}}
                    data-testid={`tab-sport-${s.sport}`}
                  >
                    {s.sport}
                    {s.liveCount > 0 && <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort + tier filter bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="bar-sort-filter">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <div className="flex items-center px-1.5">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              </div>
              {([{ value: "grade" as const, label: "Grade" }, { value: "ev" as const, label: "EV" }, { value: "confidence" as const, label: "Conviction" }, { value: "odds" as const, label: "Odds" }]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${sortBy === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid={`button-sort-${value}`}
                >{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <div className="flex items-center px-1.5">
                <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
              </div>
              {([{ value: "all" as const, label: "All" }, { value: "LOCK" as const, label: "A-Grade" }, { value: "STRONG" as const, label: "B-Grade" }, { value: "LEAN" as const, label: "C-Grade" }]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTierFilter(value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${tierFilter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid={`button-tier-${value}`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Picks grid */}
          {activeSportTab === "NFL" && filteredUpcoming.length === 0 ? (
            <OffseasonPanel />
          ) : sortedTopPicks.length > 0 ? (
            <>
              <MobileTicketDeck
                items={sortedTopPicks}
                renderCard={(pick) => <PickCard pick={pick} legs={legs} addLeg={addLeg} isFounder={authData?.isFounder} />}
                getGrade={(p) => p.grade}
                label="Intelligence Picks™"
              />
              <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedTopPicks.map(pick => (
                  <PickCard key={pick.id} pick={pick} legs={legs} addLeg={addLeg} isFounder={authData?.isFounder} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center border rounded-xl bg-muted/20">
              <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">No picks match your filter</p>
              <p className="text-xs text-muted-foreground">
                {tierFilter !== "all" ? "Try clearing the grade filter above." : activeSportTab !== "all" ? `No ${activeSportTab} picks available right now.` : "Picks are generated every 5 minutes as games load."}
              </p>
              {tierFilter !== "all" && (
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setTierFilter("all")}>Clear Filter</Button>
              )}
            </div>
          )}

          {/* Live games in-section */}
          {feed.liveGames.length > 0 && (activeSportTab === "all" || feed.liveGames.some(g => g.sport === activeSportTab)) && (
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/15">
                  <Radio className="w-3.5 h-3.5 text-red-500" />
                </span>
                Live Analysis
                <span className="inline-flex items-center gap-1 text-[9px] font-normal text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {feed.liveGames
                  .filter(g => activeSportTab === "all" || g.sport === activeSportTab)
                  .map(game => <LiveGameCard key={game.id} game={game} />)}
              </div>
            </div>
          )}
        </section>

        {/* ─── EDGE ALERTS + UPCOMING GAMES ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Collapsible defaultOpen={false} data-testid="collapsible-edge-alerts">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                  <span className="text-sm font-bold">Edge Alerts</span>
                  {filteredAlerts.length > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30 border font-bold">
                      {filteredAlerts.length}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2.5">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map(alert => <AlertCard key={alert.id} alert={alert} feed={feed} legs={legs} addLeg={addLeg} />)
                ) : (
                  <div className="p-6 text-center border rounded-lg bg-muted/20">
                    <p className="text-xs text-muted-foreground">No critical alerts right now.</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 px-1">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/15">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </span>
              Upcoming Games
            </h3>
            <Card>
              <CardContent className="p-3">
                <div className="divide-y">
                  {filteredUpcoming.length > 0 ? (
                    filteredUpcoming.slice(0, 8).map(game => <UpcomingGameRow key={game.id} game={game} />)
                  ) : (
                    <p className="py-4 text-center text-xs text-muted-foreground">No upcoming games scheduled.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── TICKET SHOWCASE ENTRY ──────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/60 via-background to-red-950/40 cursor-pointer group"
          onClick={() => setShowShowcase(true)}
          data-testid="section-ticket-showcase-entry"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-l-2xl" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 to-red-700 rounded-r-2xl" />
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center" style={{ boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}>
                <Trophy className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center" style={{ boxShadow: "0 0 10px rgba(239,68,68,0.3)" }}>
                <TrendingDown className="w-2.5 h-2.5 text-red-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold">Ticket Showcase</p>
                <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1.5">REAL RESULTS</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Swipe through actual winning & losing tickets. See what the Sors engine called — and what it paid.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-border/20 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground/50">Statistical analysis only · 21+ · Bet responsibly</p>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <Link href="/legal" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">Legal</Link>
        </div>

      </div>

      {/* ─── SWIPE MODE OVERLAY ─────────────────────────────────────── */}
      {swipeMode && feed.topPicks.length > 0 && (
        <SwipePickCards
          picks={feed.topPicks}
          onAdd={(pick) => {
            const legId = `swipe-${pick.id}`;
            const decOdds = pick.odds < 0 ? 1 + (100 / Math.abs(pick.odds)) : 1 + (pick.odds / 100);
            const validMarket = ["moneyline","spread","total","player_prop"].includes(pick.betType) ? pick.betType : "moneyline";
            addLeg({
              id: legId, team: pick.homeTeam, opponent: pick.awayTeam,
              market: validMarket as any, outcome: pick.pick, decimalOdds: decOdds,
              americanOdds: pick.odds, addedFrom: "Swipe Mode",
              addedAt: new Date().toISOString(), sport: pick.sport,
              confidence: pick.confidence, grade: pick.grade, edge: pick.edge, ev: pick.ev,
            });
          }}
          onClose={() => setSwipeMode(false)}
        />
      )}

      {/* ─── TICKET SHOWCASE OVERLAY ────────────────────────────────── */}
      {showShowcase && (
        <TicketShowcase onClose={() => setShowShowcase(false)} />
      )}

    </div>
  );
}
