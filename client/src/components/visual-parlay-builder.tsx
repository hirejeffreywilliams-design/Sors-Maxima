import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  Plus,
  X,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  User,
  Clock,
  Trash2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Loader2,
  GripHorizontal,
  LayoutGrid,
  AlertTriangle,
  Lightbulb,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Percent,
  Eye,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  Info,
  MousePointerClick,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ParlayLeg, SportEvent, EvaluationResult, Sport, BettingEnvironment } from "@shared/schema";
import { decimalToAmerican, impliedProbability } from "@shared/schema";
import { ProbabilityResults } from "./probability-results";
import { CorrelationMatrix } from "./correlation-matrix";

const sportOptions: { id: Sport; name: string }[] = [
  { id: "NBA", name: "NBA" },
  { id: "NFL", name: "NFL" },
  { id: "MLB", name: "MLB" },
  { id: "NHL", name: "NHL" },
  { id: "NCAAF", name: "NCAAF" },
  { id: "NCAAB", name: "NCAAB" },
];

const marketIcons: Record<string, typeof TrendingUp> = {
  moneyline: TrendingUp,
  spread: Activity,
  total: Target,
  player_prop: User,
};

const marketLabels: Record<string, string> = {
  moneyline: "Moneyline",
  spread: "Spread",
  total: "Total",
  player_prop: "Player Prop",
};

interface DragData {
  eventId: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  decimalOdds: number;
  americanOdds: number;
  playerName?: string;
  playerId?: string;
  propCategory?: string;
  propLine?: number;
  evRating?: string;
  edge?: number;
  lineDirection?: string;
  lineMovement?: number;
  sharpAction?: boolean;
}

interface VisualParlayBuilderProps {
  onLegsChange?: (legs: ParlayLeg[]) => void;
  onStakeChange?: (stake: number) => void;
  onResultChange?: (result: EvaluationResult | null) => void;
  bankroll?: number;
  bettingEnv?: BettingEnvironment;
}

const defaultBettingEnv: BettingEnvironment = {
  maxStakePercent: 0.05,
  kellyMultiplier: 0.25,
  minEdgeRequired: 0.02,
  maxCorrelationAllowed: 0.8,
  includeJuiceAdjustment: true,
  juicePercent: 0.045,
  enableRiskWarnings: true,
  enableAutoAdjust: false,
  profileType: "balanced"
};

type TimeFilter = "all" | "2h" | "6h" | "today" | "tomorrow";
type EdgeFilter = "all" | "positive" | "strong";
type MarketFilter = "all" | "moneyline" | "spread" | "total" | "player_prop";

function getEvBadgeColor(rating: string | undefined): string {
  switch (rating) {
    case "strong": return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
    case "moderate": return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "weak": return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
    case "negative": return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function LineMovementArrow({ direction, movement }: { direction?: string; movement?: number }) {
  if (!direction || direction === "stable") {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  if (direction === "steam") {
    return (
      <div className="flex items-center gap-0.5">
        <ArrowUp className="w-3 h-3 text-green-500" />
        {movement !== undefined && (
          <span className="text-[10px] font-mono text-green-500">+{Math.abs(movement).toFixed(0)}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      <ArrowDown className="w-3 h-3 text-red-500" />
      {movement !== undefined && (
        <span className="text-[10px] font-mono text-red-500">{-Math.abs(movement).toFixed(0)}</span>
      )}
    </div>
  );
}

function DraggableOutcome({ data, isAdded, onAdd, showIndicators }: { data: DragData; isAdded: boolean; onAdd: (data: DragData) => void; showIndicators: boolean }) {
  const american = data.americanOdds;
  const americanDisplay = american > 0 ? `+${american}` : `${american}`;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable={!isAdded}
      onDragStart={handleDragStart}
      onClick={() => !isAdded && onAdd(data)}
      className={`flex items-center justify-between gap-1 p-2 rounded-md border transition-all ${
        isAdded
          ? "opacity-50 cursor-not-allowed border-dashed"
          : "cursor-grab active:cursor-grabbing hover-elevate border-border"
      }`}
      data-testid={`draggable-outcome-${data.team}-${data.market}`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">{data.outcome}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showIndicators && data.evRating && (
          <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${getEvBadgeColor(data.evRating)}`} data-testid={`ev-badge-${data.team}-${data.market}`}>
            {data.evRating === "strong" ? "+EV" : data.evRating === "moderate" ? "~EV" : data.evRating === "negative" ? "-EV" : ""}
          </span>
        )}
        {showIndicators && data.lineDirection && data.lineDirection !== "stable" && (
          <span data-testid={`line-movement-${data.team}-${data.market}`}>
            <LineMovementArrow direction={data.lineDirection} movement={data.lineMovement} />
          </span>
        )}
        {showIndicators && data.sharpAction && (
          <Eye className="w-3 h-3 text-amber-500" data-testid={`sharp-action-${data.team}-${data.market}`} />
        )}
        <span className="text-sm font-mono font-semibold">{americanDisplay}</span>
        {!isAdded && (
          <Plus className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function GameCard({ event, addedLegKeys, onAdd, showIndicators }: { event: SportEvent; addedLegKeys: Set<string>; onAdd: (data: DragData) => void; showIndicators: boolean }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["moneyline", "spread", "total"]));
  const [showAllProps, setShowAllProps] = useState(false);

  const startTime = new Date(event.startTime);
  const timeStr = startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday = new Date().toDateString() === startTime.toDateString();
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === startTime.toDateString();
  const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const injuryCount = (event.injuries || []).filter(i => i.status !== "healthy").length;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const propCount = event.playerProps?.length || 0;
  const visibleProps = showAllProps ? event.playerProps || [] : (event.playerProps || []).slice(0, 4);

  return (
    <Card className="overflow-visible" data-testid={`game-card-${event.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{event.awayTeam}</div>
            <div className="text-sm font-semibold truncate">@ {event.homeTeam}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeStr}
            </div>
            <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
            {injuryCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-500" data-testid={`injury-badge-${event.id}`}>
                {injuryCount} inj
              </Badge>
            )}
          </div>
        </div>

        {event.markets.map((market) => {
          const MarketIcon = marketIcons[market.type] || TrendingUp;
          const isExpanded = expandedSections.has(market.type);
          return (
            <div key={market.type} className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection(market.type)}
                className="flex items-center gap-1 w-full justify-start px-1"
                data-testid={`toggle-market-${event.id}-${market.type}`}
              >
                <MarketIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1 text-left">
                  {marketLabels[market.type] || market.type}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {market.outcomes.length}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1">
                  {market.outcomes.map((outcome, idx) => {
                    const key = `${event.id}-${market.type}-${outcome.name}`;
                    const dragData: DragData = {
                      eventId: event.id,
                      team: outcome.team || (idx === 0 ? event.awayTeam : event.homeTeam),
                      opponent: outcome.team === event.homeTeam ? event.awayTeam : event.homeTeam,
                      market: market.type,
                      outcome: outcome.name,
                      decimalOdds: outcome.decimalOdds,
                      americanOdds: outcome.americanOdds,
                      evRating: outcome.evAnalysis?.evRating,
                      edge: outcome.evAnalysis?.edge,
                      lineDirection: outcome.lineMovement?.direction,
                      lineMovement: outcome.lineMovement?.movement,
                      sharpAction: outcome.lineMovement?.sharpAction || outcome.bettingPercentages?.sharpSide,
                    };
                    return (
                      <DraggableOutcome
                        key={key}
                        data={dragData}
                        isAdded={addedLegKeys.has(key)}
                        onAdd={onAdd}
                        showIndicators={showIndicators}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {propCount > 0 && (
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection("player_props")}
              className="flex items-center gap-1 w-full justify-start px-1"
              data-testid={`toggle-props-${event.id}`}
            >
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1 text-left">
                Player Props
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {propCount}
              </Badge>
              {expandedSections.has("player_props") ? (
                <ChevronUp className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
            {expandedSections.has("player_props") && (
              <div className="space-y-1">
                {visibleProps.map((prop, idx) => {
                  const overKey = `${event.id}-prop-${prop.playerId}-over`;
                  const underKey = `${event.id}-prop-${prop.playerId}-under`;
                  return (
                    <div key={idx} className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {prop.playerName} - {prop.category} ({prop.line})
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <DraggableOutcome
                          data={{
                            eventId: event.id,
                            team: prop.playerName,
                            opponent: "",
                            market: "player_prop",
                            outcome: `${prop.playerName} Over ${prop.line} ${prop.category}`,
                            decimalOdds: prop.overOdds.decimalOdds,
                            americanOdds: prop.overOdds.americanOdds,
                            playerName: prop.playerName,
                            playerId: prop.playerId,
                            propCategory: prop.category,
                            propLine: prop.line,
                          }}
                          isAdded={addedLegKeys.has(overKey)}
                          onAdd={onAdd}
                          showIndicators={showIndicators}
                        />
                        <DraggableOutcome
                          data={{
                            eventId: event.id,
                            team: prop.playerName,
                            opponent: "",
                            market: "player_prop",
                            outcome: `${prop.playerName} Under ${prop.line} ${prop.category}`,
                            decimalOdds: prop.underOdds.decimalOdds,
                            americanOdds: prop.underOdds.americanOdds,
                            playerName: prop.playerName,
                            playerId: prop.playerId,
                            propCategory: prop.category,
                            propLine: prop.line,
                          }}
                          isAdded={addedLegKeys.has(underKey)}
                          onAdd={onAdd}
                          showIndicators={showIndicators}
                        />
                      </div>
                    </div>
                  );
                })}
                {propCount > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllProps(!showAllProps)}
                    className="w-full text-xs"
                    data-testid={`toggle-all-props-${event.id}`}
                  >
                    {showAllProps ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show All {propCount} Props
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DropZoneLegCard({ leg, index, onRemove, onReorder, sgpWarning }: {
  leg: ParlayLeg;
  index: number;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  sgpWarning?: boolean;
}) {
  const MarketIcon = marketIcons[leg.market] || TrendingUp;
  const american = decimalToAmerican(leg.decimalOdds);
  const americanDisplay = american > 0 ? `+${american}` : `${american}`;
  const implied = impliedProbability(leg.decimalOdds);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate cursor-grab active:cursor-grabbing group ${
        sgpWarning ? "border-amber-500/50" : ""
      }`}
      data-testid={`ticket-leg-${index}`}
    >
      <GripHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center justify-center w-6 h-6 rounded bg-muted flex-shrink-0">
        <span className="text-xs font-mono font-semibold text-muted-foreground">{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{leg.team}</span>
          {leg.opponent && (
            <span className="text-xs text-muted-foreground">vs {leg.opponent}</span>
          )}
          {sgpWarning && (
            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" data-testid={`sgp-warning-leg-${index}`} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs">
            <MarketIcon className="w-3 h-3 mr-1" />
            {leg.market.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">{leg.outcome}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-mono font-bold">{americanDisplay}</div>
        <div className="text-xs font-mono text-muted-foreground">{(implied * 100).toFixed(0)}%</div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(leg.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
        data-testid={`button-remove-ticket-leg-${index}`}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function SGPWarningBanner({ sgpGroups }: { sgpGroups: Map<string, ParlayLeg[]> }) {
  const multiLegGames = Array.from(sgpGroups.entries()).filter(([, legs]) => legs.length > 1);

  if (multiLegGames.length === 0) return null;

  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30" data-testid="sgp-warning-banner">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Same-Game Parlay Detected
        </p>
        {multiLegGames.map(([eventId, legs]) => (
          <p key={eventId} className="text-xs text-muted-foreground">
            {legs.length} legs from the same game ({legs[0].team} vs {legs[0].opponent || "opponent"}) - these outcomes are correlated and increase risk
          </p>
        ))}
      </div>
    </div>
  );
}

function SmartSuggestions({ events, currentLegs, onAdd, selectedSport }: {
  events: SportEvent[];
  currentLegs: ParlayLeg[];
  onAdd: (data: DragData) => void;
  selectedSport: Sport;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const suggestions = useMemo(() => {
    if (currentLegs.length === 0) return [];

    const usedEventIds = new Set(currentLegs.map(l => l.eventId).filter(Boolean));
    const usedTeams = new Set(currentLegs.map(l => l.team));

    const candidates: Array<DragData & { score: number; reason: string }> = [];

    for (const event of events) {
      for (const market of event.markets) {
        for (let idx = 0; idx < market.outcomes.length; idx++) {
          const outcome = market.outcomes[idx];
          const team = outcome.team || (idx === 0 ? event.awayTeam : event.homeTeam);

          if (usedTeams.has(team)) continue;

          const ev = outcome.evAnalysis;
          const lm = outcome.lineMovement;
          const bp = outcome.bettingPercentages;

          if (!ev || ev.evRating === "negative") continue;

          let score = 0;
          let reason = "";

          if (ev.evRating === "strong") { score += 30; reason = "Strong +EV edge"; }
          else if (ev.evRating === "moderate") { score += 15; reason = "Moderate edge detected"; }
          else { score += 5; reason = "Slight positive edge"; }

          if (lm?.sharpAction) { score += 20; reason = "Sharp money backing"; }
          if (lm?.direction === "steam") { score += 10; }
          if (bp?.sharpSide) { score += 15; reason = reason || "Sharp-side alignment"; }

          if (!usedEventIds.has(event.id)) { score += 10; }

          candidates.push({
            eventId: event.id,
            team,
            opponent: team === event.homeTeam ? event.awayTeam : event.homeTeam,
            market: market.type,
            outcome: outcome.name,
            decimalOdds: outcome.decimalOdds,
            americanOdds: outcome.americanOdds,
            evRating: ev.evRating,
            edge: ev.edge,
            lineDirection: lm?.direction,
            sharpAction: lm?.sharpAction || bp?.sharpSide,
            score,
            reason,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [events, currentLegs]);

  if (currentLegs.length === 0 || suggestions.length === 0) return null;

  return (
    <Card data-testid="smart-suggestions-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Smart Suggestions
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} data-testid="toggle-suggestions">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Complementary legs with positive edge</p>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {suggestions.map((s, i) => {
              const americanDisplay = s.americanOdds > 0 ? `+${s.americanOdds}` : `${s.americanOdds}`;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => onAdd(s)}
                  data-testid={`suggestion-${i}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{s.outcome}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[10px] px-1 py-0 rounded ${getEvBadgeColor(s.evRating)}`}>
                        {s.evRating === "strong" ? "+EV" : "~EV"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{s.reason}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.sharpAction && <Eye className="w-3 h-3 text-amber-500" />}
                    <span className="text-xs font-mono font-semibold">{americanDisplay}</span>
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function WhatIfCalculator({ legs, stake }: { legs: ParlayLeg[]; stake: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (legs.length < 3) return null;

  const fullOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
  const fullPayout = stake * fullOdds;

  const scenarios = legs.map((removedLeg, idx) => {
    const remainingOdds = legs
      .filter((_, i) => i !== idx)
      .reduce((acc, l) => acc * l.decimalOdds, 1);
    const remainingPayout = stake * remainingOdds;
    const lostPayout = fullPayout - remainingPayout;
    return {
      removedLeg,
      remainingOdds,
      remainingPayout,
      lostPayout,
      legIndex: idx,
    };
  });

  const worstCase = scenarios.reduce((worst, s) => s.lostPayout > worst.lostPayout ? s : worst, scenarios[0]);

  return (
    <Card data-testid="what-if-calculator">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-blue-500" />
            What-If Analysis
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} data-testid="toggle-whatif">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">See impact if one leg loses</p>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="p-2 rounded-md bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">Full Parlay Payout</div>
            <div className="text-lg font-mono font-bold text-green-500">${fullPayout.toFixed(2)}</div>
          </div>

          <div className="space-y-1.5">
            {scenarios.map((s, i) => {
              const isWorst = s === worstCase;
              return (
                <div key={i} className={`flex items-center justify-between gap-2 p-2 rounded-md border text-xs ${isWorst ? "border-red-500/30 bg-red-500/5" : ""}`} data-testid={`whatif-scenario-${i}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="font-medium truncate">
                        Leg {s.legIndex + 1}: {s.removedLeg.outcome}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-muted-foreground">Reduced to</div>
                      <div className="font-mono font-semibold">${s.remainingPayout.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">Lost</div>
                      <div className="font-mono font-semibold text-red-500">-${s.lostPayout.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 rounded-md border border-dashed text-xs text-center text-muted-foreground" data-testid="whatif-weakest-link">
            Weakest link: Leg {worstCase.legIndex + 1} - losing it costs ${worstCase.lostPayout.toFixed(2)} ({((worstCase.lostPayout / fullPayout) * 100).toFixed(0)}% of payout)
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function GameFilters({ timeFilter, setTimeFilter, edgeFilter, setEdgeFilter, marketFilter, setMarketFilter }: {
  timeFilter: TimeFilter;
  setTimeFilter: (f: TimeFilter) => void;
  edgeFilter: EdgeFilter;
  setEdgeFilter: (f: EdgeFilter) => void;
  marketFilter: MarketFilter;
  setMarketFilter: (f: MarketFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="game-filters">
      <div className="flex items-center gap-1">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Filters:</span>
      </div>
      <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <SelectTrigger className="w-[100px] text-xs" data-testid="filter-time">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Times</SelectItem>
          <SelectItem value="2h">Next 2h</SelectItem>
          <SelectItem value="6h">Next 6h</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="tomorrow">Tomorrow</SelectItem>
        </SelectContent>
      </Select>
      <Select value={edgeFilter} onValueChange={(v) => setEdgeFilter(v as EdgeFilter)}>
        <SelectTrigger className="w-[110px] text-xs" data-testid="filter-edge">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Edges</SelectItem>
          <SelectItem value="positive">+EV Only</SelectItem>
          <SelectItem value="strong">Strong +EV</SelectItem>
        </SelectContent>
      </Select>
      <Select value={marketFilter} onValueChange={(v) => setMarketFilter(v as MarketFilter)}>
        <SelectTrigger className="w-[110px] text-xs" data-testid="filter-market">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Markets</SelectItem>
          <SelectItem value="moneyline">Moneyline</SelectItem>
          <SelectItem value="spread">Spread</SelectItem>
          <SelectItem value="total">Total</SelectItem>
          <SelectItem value="player_prop">Props</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const TUTORIAL_STORAGE_KEY = "sors_visual_builder_tutorial_seen";

interface TutorialStep {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  iconColor: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Browse Available Games",
    description: "Games are loaded live from ESPN with real odds. Use sport tabs at the top to switch leagues. Each game card shows matchup, time, and betting markets.",
    icon: LayoutGrid,
    iconColor: "text-blue-500",
  },
  {
    title: "Add Bets to Your Ticket",
    description: "Click the + button on any outcome to add it to your ticket on the right. You can also drag and drop outcomes directly onto the ticket panel.",
    icon: MousePointerClick,
    iconColor: "text-green-500",
  },
  {
    title: "Understand Edge Badges",
    description: "+EV (green) means a positive expected value bet — the odds are in your favor. ~EV (blue) is roughly fair. -EV (red) means the house has a larger edge. Focus on +EV selections for long-term profitability.",
    icon: TrendingUp,
    iconColor: "text-green-500",
  },
  {
    title: "Watch Line Movement",
    description: "Green up arrows indicate \"steam moves\" — sudden sharp line movement suggesting professional action. Red down arrows show lines moving against you. These signals help you time your bets.",
    icon: ArrowUp,
    iconColor: "text-green-500",
  },
  {
    title: "Sharp Money Signals",
    description: "The eye icon marks outcomes backed by professional/sharp bettors. Sharp money often moves opposite to public betting and can indicate higher-quality selections.",
    icon: Eye,
    iconColor: "text-amber-500",
  },
  {
    title: "Same-Game Parlay Warnings",
    description: "When you add multiple legs from the same game, a yellow warning appears. These legs are correlated — if one loses, others in that game are more likely to lose too. Be aware of the increased risk.",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  {
    title: "Smart Suggestions & What-If",
    description: "After adding legs, Smart Suggestions recommends complementary picks with positive edge. The What-If calculator shows how much payout you'd lose if each individual leg fails, identifying the weakest link.",
    icon: Lightbulb,
    iconColor: "text-amber-500",
  },
  {
    title: "Filter & Analyze",
    description: "Use filters to narrow by time window, edge quality, or market type. Toggle signal indicators on/off. When you have 2+ legs, hit Analyze to run a full simulation of your parlay.",
    icon: Filter,
    iconColor: "text-blue-500",
  },
];

function OnboardingTutorial({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === tutorialSteps.length - 1;

  const handleComplete = () => {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "true"); } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="onboarding-overlay">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" />
              Visual Parlay Builder Guide
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleComplete} data-testid="button-close-tutorial">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-1 mt-2" data-testid="tutorial-progress">
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
                data-testid={`tutorial-step-indicator-${i}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <StepIcon className={`w-5 h-5 ${step.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  data-testid="button-tutorial-back"
                >
                  Back
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={handleComplete} data-testid="button-tutorial-done">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Got It
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} data-testid="button-tutorial-next">
                  Next
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LegendPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const legendItems = [
    { icon: <span className="px-1 py-0 rounded bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-medium">+EV</span>, label: "Positive expected value — bet has edge over the house" },
    { icon: <span className="px-1 py-0 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-medium">~EV</span>, label: "Approximately fair value — close to break-even" },
    { icon: <span className="px-1 py-0 rounded bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-medium">-EV</span>, label: "Negative expected value — house has the edge" },
    { icon: <ArrowUp className="w-3 h-3 text-green-500" />, label: "Steam move — line moving sharply in this direction" },
    { icon: <ArrowDown className="w-3 h-3 text-red-500" />, label: "Reverse line move — line moving against this pick" },
    { icon: <Eye className="w-3 h-3 text-amber-500" />, label: "Sharp money — backed by professional bettors" },
    { icon: <AlertTriangle className="w-3 h-3 text-amber-500" />, label: "Same-game parlay warning — correlated legs increase risk" },
    { icon: <Lightbulb className="w-3 h-3 text-amber-500" />, label: "Smart suggestion — AI-recommended complementary pick" },
    { icon: <Shield className="w-3 h-3 text-blue-500" />, label: "What-If analysis — shows payout impact if a leg loses" },
    { icon: <GripVertical className="w-3 h-3 text-muted-foreground" />, label: "Draggable — grab and drag to add to your ticket" },
    { icon: <Plus className="w-3 h-3 text-muted-foreground" />, label: "Click to add this selection to your ticket" },
  ];

  return (
    <Card data-testid="legend-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500" />
            Symbol Key
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-legend">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3" data-testid={`legend-item-${i}`}>
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Quick Tips</p>
          <p className="text-xs text-muted-foreground">Collapse market sections by clicking their headers to reduce clutter.</p>
          <p className="text-xs text-muted-foreground">Use filters at the top to find +EV opportunities quickly.</p>
          <p className="text-xs text-muted-foreground">Click "Show All Props" on a game card to see every player prop available.</p>
          <p className="text-xs text-muted-foreground">Add 2+ legs then hit Analyze for a full simulation.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function VisualParlayBuilder({ onLegsChange, onStakeChange, onResultChange, bankroll = 1000, bettingEnv = defaultBettingEnv }: VisualParlayBuilderProps) {
  const [selectedSport, setSelectedSport] = useState<Sport>("NBA");
  const [legs, setLegs] = useState<ParlayLeg[]>([]);
  const [stake, setStake] = useState(10);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");

  const { data: events = [], isLoading: eventsLoading } = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/odds?sport=${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch odds");
      return res.json();
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_STORAGE_KEY)) {
        setShowTutorial(true);
      }
    } catch {}
  }, []);

  useEffect(() => { onLegsChange?.(legs); }, [legs, onLegsChange]);
  useEffect(() => { onStakeChange?.(stake); }, [stake, onStakeChange]);
  useEffect(() => { onResultChange?.(result); }, [result, onResultChange]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (timeFilter !== "all") {
      const now = Date.now();
      filtered = filtered.filter(e => {
        const start = new Date(e.startTime).getTime();
        if (timeFilter === "2h") return start <= now + 2 * 3600000;
        if (timeFilter === "6h") return start <= now + 6 * 3600000;
        if (timeFilter === "today") return new Date(e.startTime).toDateString() === new Date().toDateString();
        if (timeFilter === "tomorrow") return new Date(e.startTime).toDateString() === new Date(now + 86400000).toDateString();
        return true;
      });
    }

    if (edgeFilter !== "all") {
      filtered = filtered.filter(e =>
        e.markets.some(m =>
          m.outcomes.some(o => {
            if (!o.evAnalysis) return false;
            if (edgeFilter === "positive") return o.evAnalysis.isPositiveEV;
            if (edgeFilter === "strong") return o.evAnalysis.evRating === "strong";
            return true;
          })
        )
      );
    }

    if (marketFilter !== "all") {
      filtered = filtered.map(e => ({
        ...e,
        markets: e.markets.filter(m => m.type === marketFilter),
      })).filter(e => e.markets.length > 0 || (marketFilter === "player_prop" && e.playerProps && e.playerProps.length > 0));
    }

    return filtered;
  }, [events, timeFilter, edgeFilter, marketFilter]);

  const addedLegKeys = new Set(
    legs.map((l) => {
      if (l.playerName) return `${l.eventId}-prop-${l.playerId}-${l.outcome?.includes("Over") ? "over" : "under"}`;
      return `${l.eventId}-${l.market}-${l.outcome}`;
    })
  );

  const sgpGroups = useMemo(() => {
    const groups = new Map<string, ParlayLeg[]>();
    for (const leg of legs) {
      if (!leg.eventId) continue;
      const existing = groups.get(leg.eventId) || [];
      existing.push(leg);
      groups.set(leg.eventId, existing);
    }
    return groups;
  }, [legs]);

  const hasSGP = useMemo(() => {
    return Array.from(sgpGroups.values()).some(group => group.length > 1);
  }, [sgpGroups]);

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/evaluate", { legs, stake, simulations: 20000 });
      return await response.json() as EvaluationResult;
    },
    onSuccess: (data) => setResult(data),
  });

  const addLegFromDragData = useCallback((data: DragData) => {
    const newLeg: ParlayLeg = {
      id: crypto.randomUUID(),
      eventId: data.eventId,
      team: data.team,
      opponent: data.opponent || undefined,
      market: data.market as any,
      outcome: data.outcome,
      decimalOdds: data.decimalOdds,
      americanOdds: data.americanOdds,
      playerName: data.playerName,
      playerId: data.playerId,
      propCategory: data.propCategory,
      propLine: data.propLine,
    };
    setLegs((prev) => [...prev, newLeg]);
    setResult(null);
  }, []);

  const handleDropOnZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const reorderIdx = e.dataTransfer.getData("text/plain");
    if (reorderIdx) return;

    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData("application/json"));
      addLegFromDragData(data);
    } catch {}
  }, [addLegFromDragData]);

  const handleDragOverZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeaveZone = useCallback((e: React.DragEvent) => {
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
    setResult(null);
  }, []);

  const reorderLegs = useCallback((fromIndex: number, toIndex: number) => {
    setLegs((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setLegs([]);
    setResult(null);
  }, []);

  const combinedDecimalOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
  const combinedAmerican = legs.length > 0 ? decimalToAmerican(combinedDecimalOdds) : 0;
  const combinedAmericanDisplay = combinedAmerican > 0 ? `+${combinedAmerican}` : `${combinedAmerican}`;
  const potentialPayout = stake * combinedDecimalOdds;

  const totalPositiveEVLegs = useMemo(() => {
    let count = 0;
    for (const event of events) {
      for (const market of event.markets) {
        for (const outcome of market.outcomes) {
          if (outcome.evAnalysis?.isPositiveEV) count++;
        }
      }
    }
    return count;
  }, [events]);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="w-4 h-4" />
                Available Games
                {totalPositiveEVLegs > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalPositiveEVLegs} +EV
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1 flex-wrap">
                {sportOptions.map((sport) => (
                  <Button
                    key={sport.id}
                    variant={selectedSport === sport.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSport(sport.id)}
                    data-testid={`button-sport-${sport.id}`}
                  >
                    {sport.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <GameFilters
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
                edgeFilter={edgeFilter}
                setEdgeFilter={setEdgeFilter}
                marketFilter={marketFilter}
                setMarketFilter={setMarketFilter}
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIndicators(!showIndicators)}
                  className="gap-1 text-xs"
                  data-testid="toggle-indicators"
                >
                  <BarChart3 className="w-3 h-3" />
                  {showIndicators ? "Hide" : "Show"} Signals
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLegend(!showLegend)}
                  className="gap-1 text-xs"
                  data-testid="toggle-legend"
                >
                  <Info className="w-3 h-3" />
                  Key
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial(true)}
                  className="gap-1 text-xs"
                  data-testid="button-open-tutorial"
                >
                  <HelpCircle className="w-3 h-3" />
                  Guide
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Drag outcomes to the ticket panel or click + to add
            </p>
            {showIndicators && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="px-1 py-0 rounded bg-green-500/15 text-green-600 dark:text-green-400">+EV</span> Strong Edge
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ArrowUp className="w-3 h-3 text-green-500" /> Steam Move
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Eye className="w-3 h-3 text-amber-500" /> Sharp Action
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {events.length > 0 ? "No games match your filters" : `No games available for ${selectedSport}`}
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-340px)] min-h-[400px] max-h-[900px] pr-2">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <GameCard
                      key={event.id}
                      event={event}
                      addedLegKeys={addedLegKeys}
                      onAdd={addLegFromDragData}
                      showIndicators={showIndicators}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <LegendPanel isOpen={showLegend} onClose={() => setShowLegend(false)} />
      </div>

      <div className="lg:col-span-5 space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4" />
                Your Ticket
                {legs.length > 0 && (
                  <Badge variant="secondary">{legs.length} leg{legs.length !== 1 ? "s" : ""}</Badge>
                )}
              </CardTitle>
              {legs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} data-testid="button-clear-ticket">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasSGP && <SGPWarningBanner sgpGroups={sgpGroups} />}

            <div
              ref={dropZoneRef}
              onDrop={handleDropOnZone}
              onDragOver={handleDragOverZone}
              onDragLeave={handleDragLeaveZone}
              className={`min-h-[200px] rounded-md border-2 border-dashed transition-colors p-3 ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : legs.length === 0
                  ? "border-muted-foreground/30"
                  : "border-transparent"
              } ${hasSGP ? "mt-3" : ""}`}
              data-testid="ticket-drop-zone"
            >
              {legs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[180px] text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {isDragOver ? "Drop here to add" : "Drag bets here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click + on any outcome
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {legs.map((leg, index) => {
                    const legEventId = leg.eventId || "";
                    const isSGP = sgpGroups.has(legEventId) && (sgpGroups.get(legEventId)?.length || 0) > 1;
                    return (
                      <DropZoneLegCard
                        key={leg.id}
                        leg={leg}
                        index={index}
                        onRemove={removeLeg}
                        onReorder={reorderLegs}
                        sgpWarning={isSGP}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {legs.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div>
                    <div className="text-xs text-muted-foreground">Combined Odds</div>
                    <div className="text-lg font-mono font-bold">{combinedAmericanDisplay}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Potential Payout</div>
                    <div className="text-lg font-mono font-bold text-green-500">
                      ${potentialPayout.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="visual-stake" className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Stake
                    </Label>
                    <Input
                      id="visual-stake"
                      type="number"
                      min={1}
                      value={stake}
                      onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                      data-testid="input-visual-stake"
                    />
                  </div>
                  <Button
                    onClick={() => legs.length >= 2 && evaluateMutation.mutate()}
                    disabled={legs.length < 2 || evaluateMutation.isPending}
                    data-testid="button-visual-evaluate"
                  >
                    {evaluateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4 mr-2" />
                    )}
                    Analyze
                  </Button>
                </div>

                {legs.length === 1 && (
                  <p className="text-xs text-muted-foreground">
                    Add at least 2 legs to analyze your parlay
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <SmartSuggestions
          events={events}
          currentLegs={legs}
          onAdd={addLegFromDragData}
          selectedSport={selectedSport}
        />

        <WhatIfCalculator legs={legs} stake={stake} />

        {result && (
          <ProbabilityResults
            result={result}
            stake={stake}
            isLoading={evaluateMutation.isPending}
            bankroll={bankroll}
            bettingEnv={bettingEnv}
          />
        )}

        {result && (
          <CorrelationMatrix
            matrix={result?.correlationMatrix}
            legCount={legs.length}
          />
        )}
      </div>

      {showTutorial && (
        <OnboardingTutorial onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
