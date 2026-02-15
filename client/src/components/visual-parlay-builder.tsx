import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GripVertical,
  Plus,
  X,
  Calculator,
  DollarSign,
  TrendingUp,
  Activity,
  Target,
  User,
  Clock,
  Trash2,
  ArrowRight,
  Zap,
  Loader2,
  GripHorizontal,
  LayoutGrid,
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

function DraggableOutcome({ data, isAdded, onAdd }: { data: DragData; isAdded: boolean; onAdd: (data: DragData) => void }) {
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
      className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-all ${
        isAdded
          ? "opacity-50 cursor-not-allowed border-dashed"
          : "cursor-grab active:cursor-grabbing hover-elevate border-border"
      }`}
      data-testid={`draggable-outcome-${data.team}-${data.market}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">{data.outcome}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-mono font-semibold">{americanDisplay}</span>
        {!isAdded && (
          <Plus className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function GameCard({ event, addedLegKeys, onAdd }: { event: SportEvent; addedLegKeys: Set<string>; onAdd: (data: DragData) => void }) {
  const startTime = new Date(event.startTime);
  const timeStr = startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <Card className="overflow-visible" data-testid={`game-card-${event.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{event.awayTeam}</div>
            <div className="text-sm font-semibold truncate">@ {event.homeTeam}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            {timeStr}
          </div>
        </div>

        {event.markets.map((market) => {
          const MarketIcon = marketIcons[market.type] || TrendingUp;
          return (
            <div key={market.type} className="space-y-1">
              <div className="flex items-center gap-1">
                <MarketIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {marketLabels[market.type] || market.type}
                </span>
              </div>
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
                  };
                  return (
                    <DraggableOutcome
                      key={key}
                      data={dragData}
                      isAdded={addedLegKeys.has(key)}
                      onAdd={onAdd}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {event.playerProps && event.playerProps.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Player Props
              </span>
            </div>
            <div className="space-y-1">
              {event.playerProps.slice(0, 4).map((prop, idx) => {
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
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DropZoneLegCard({ leg, index, onRemove, onReorder }: {
  leg: ParlayLeg;
  index: number;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
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
      className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate cursor-grab active:cursor-grabbing group"
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

export function VisualParlayBuilder({ onLegsChange, onStakeChange, onResultChange, bankroll = 1000, bettingEnv = defaultBettingEnv }: VisualParlayBuilderProps) {
  const [selectedSport, setSelectedSport] = useState<Sport>("NBA");
  const [legs, setLegs] = useState<ParlayLeg[]>([]);
  const [stake, setStake] = useState(10);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/odds?sport=${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch odds");
      return res.json();
    },
  });

  useEffect(() => { onLegsChange?.(legs); }, [legs, onLegsChange]);
  useEffect(() => { onStakeChange?.(stake); }, [stake, onStakeChange]);
  useEffect(() => { onResultChange?.(result); }, [result, onResultChange]);

  const addedLegKeys = new Set(
    legs.map((l) => {
      if (l.playerName) return `${l.eventId}-prop-${l.playerId}-${l.outcome?.includes("Over") ? "over" : "under"}`;
      return `${l.eventId}-${l.market}-${l.outcome}`;
    })
  );

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

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="w-4 h-4" />
                Available Games
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
            <p className="text-xs text-muted-foreground mt-1">
              Drag outcomes to the ticket panel or click the + button to add
            </p>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No games available for {selectedSport}
              </div>
            ) : (
              <ScrollArea className="max-h-[600px] pr-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.map((event) => (
                    <GameCard
                      key={event.id}
                      event={event}
                      addedLegKeys={addedLegKeys}
                      onAdd={addLegFromDragData}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-3">
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
              }`}
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
                  {legs.map((leg, index) => (
                    <DropZoneLegCard
                      key={leg.id}
                      leg={leg}
                      index={index}
                      onRemove={removeLeg}
                      onReorder={reorderLegs}
                    />
                  ))}
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
    </div>
  );
}
