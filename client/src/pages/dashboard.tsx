import { useState, useCallback, useMemo } from "react";
import { ChevronDown, ChevronUp, Sparkles, Wrench, Flame, Settings, GripVertical, Target, Layers, ArrowUpDown, Shuffle, Loader2, Lock, Zap, BarChart3, Eye, DollarSign, Star, Shield, Link2, ArrowDown, Plus, Trash2, Calculator, AlertTriangle, BookOpen, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ParlayBuilder } from "@/components/parlay-builder";
import { ParlayGenerator } from "@/components/parlay-generator";
import { VisualParlayBuilder } from "@/components/visual-parlay-builder";
import { InsightsPanel } from "@/components/insights-panel";
import { BettingSettings, getDefaultBettingEnvironment } from "@/components/betting-settings";
import { TodaysBestBets } from "@/components/todays-best-bets";
import { DataFreshnessBar } from "@/components/data-freshness";
import { useSSEContext } from "@/context/sse-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import type { ParlayLeg, SportEvent, BankrollSettings, BettingEnvironment, EvaluationResult } from "@shared/schema";
import { useSEO } from "@/hooks/use-seo";

const _month = new Date().getMonth() + 1;
const ncaabLabel = (_month === 3 || _month === 4) ? "March Madness" : "College Hoops";

const SPORT_OPTIONS = [
  { value: "NBA",   label: "NBA" },
  { value: "NFL",   label: "NFL" },
  { value: "MLB",   label: "MLB" },
  { value: "NHL",   label: "NHL" },
  { value: "NCAAB", label: ncaabLabel },
  { value: "NCAAF", label: "NCAAF" },
];

const straightBetSportOptions = [
  { value: "all", label: "All Sports" },
  ...SPORT_OPTIONS,
];

const betTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Over/Under" },
];

const sgpSportOptions = [...SPORT_OPTIONS];

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function getTierStyle(tier: string) {
  switch (tier) {
    case "LOCK": return { bg: "bg-green-500", text: "text-white", border: "ring-2 ring-green-500/50" };
    case "STRONG": return { bg: "bg-blue-500", text: "text-white", border: "ring-2 ring-blue-500/30" };
    case "LEAN": return { bg: "bg-yellow-500", text: "text-white", border: "" };
    default: return { bg: "bg-gray-500", text: "text-white", border: "" };
  }
}

function getCorrelationBadge(correlation: string) {
  if (correlation === "high-positive") return { color: "bg-green-500 text-white", label: "High Correlation" };
  if (correlation === "moderate-positive") return { color: "bg-blue-500 text-white", label: "Moderate Correlation" };
  return { color: "bg-gray-500 text-white", label: "Low Correlation" };
}

function PickCard({ pick, rank }: { pick: any; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();
  const tierStyle = getTierStyle(pick.confidenceTier);

  const handleAddToSlip = () => {
    const slipLeg: ParlaySlipLeg = {
      id: `straight-${pick.id}`,
      team: pick.pick.includes("ML") ? pick.pick.replace(" ML", "") : pick.pick.split(" ")[0],
      opponent: "",
      market: pick.betType as any,
      outcome: pick.pick,
      decimalOdds: pick.odds > 0 ? (pick.odds / 100) + 1 : (100 / Math.abs(pick.odds)) + 1,
      americanOdds: pick.odds,
      addedFrom: "Straight Bets",
      addedAt: new Date().toISOString(),
      sport: pick.sport,
      confidence: pick.confidence,
      evPercent: pick.edge,
    };
    if (addLeg(slipLeg)) {
      toast({ title: "Added to Slip", description: `${pick.pick} added to your parlay slip` });
    }
  };

  return (
    <Card className={`overflow-hidden ${rank <= 3 ? tierStyle.border : ""}`} data-testid={`pick-card-${pick.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
              <Badge className={`${tierStyle.bg} ${tierStyle.text} text-xs font-semibold gap-1`} data-testid={`tier-badge-${pick.id}`}>
                {pick.confidenceTier === "LOCK" && <Lock className="w-3 h-3" />}
                {pick.confidenceTier === "STRONG" && <Zap className="w-3 h-3" />}
                {pick.confidenceTier}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">{pick.betType}</Badge>
              <Badge variant="secondary" className="text-xs">{pick.sport}</Badge>
            </div>
            <p className="font-semibold text-sm">{pick.pick}</p>
            <p className="text-xs text-muted-foreground">{pick.game}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatOdds(pick.odds)}</p>
            <p className="text-xs text-muted-foreground">Grade: {pick.fusionGrade}</p>
          </div>
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2 cursor-help">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-sm font-bold">{pick.confidence}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                How confident the 46-Factor Model is in this pick. Above 65% is considered strong; above 75% is exceptional.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2 cursor-help">
                  <p className="text-xs text-muted-foreground">Edge</p>
                  <p className={`text-sm font-bold ${pick.edge > 3 ? "text-green-500" : pick.edge > 0 ? "text-blue-500" : "text-red-500"}`}>{pick.edge}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Expected value edge over the sportsbook's line. Positive means this bet has long-term value. Above +3% is excellent.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2 cursor-help">
                  <p className="text-xs text-muted-foreground">True Prob</p>
                  <p className="text-sm font-bold">{pick.trueProbability}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                The model's estimated real probability of this outcome — after removing sportsbook vig from the implied odds.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2 cursor-help">
                  <p className="text-xs text-muted-foreground">Units</p>
                  <p className="text-sm font-bold">{pick.unitRecommendation}u</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Kelly Criterion-derived stake recommendation. 1u typically equals 1–2% of your bankroll. Higher units = higher edge.
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <Eye className="w-3 h-3" />
                  <span>Sharp: {pick.sharpMoney}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Percentage of sharp (professional) money wagered on this side. Above 60% signals professional consensus.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <BarChart3 className="w-3 h-3" />
                  <span>Models: {pick.modelAgreement}/5</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                How many of 5 independent prediction sub-models agree on this pick. 4/5 or 5/5 indicates strong multi-model consensus.
              </TooltipContent>
            </Tooltip>
            {pick.steamMove && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="text-xs cursor-help">Steam Move</Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  A rapid line movement across multiple sportsbooks simultaneously — signals coordinated sharp action.
                </TooltipContent>
              </Tooltip>
            )}
            {pick.reverseLineMove && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-amber-500 text-white text-xs cursor-help">RLM</Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Reverse Line Movement — the line moved opposite to public betting, indicating sharp money is on this side.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {expanded && (
          <div className="space-y-2 pt-2 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Projected Line:</span> <span className="font-medium">{pick.projectedLine}</span></div>
              <div><span className="text-muted-foreground">Fair Line:</span> <span className="font-medium">{pick.fairLine}</span></div>
              <div><span className="text-muted-foreground">Implied Prob:</span> <span className="font-medium">{pick.impliedProbability}%</span></div>
              <div><span className="text-muted-foreground">EV:</span> <span className="font-medium">{pick.expectedValue > 0 ? "+" : ""}{pick.expectedValue}</span></div>
            </div>
            {pick.factors && pick.factors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Key Factors</p>
                {pick.factors.slice(0, 3).map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${f.direction === "positive" ? "bg-green-500" : f.direction === "negative" ? "bg-red-500" : "bg-gray-400"}`} />
                    <span>{f.name}: {f.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs" data-testid={`expand-pick-${pick.id}`}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button size="sm" onClick={handleAddToSlip} disabled={isInSlip(`straight-${pick.id}`)} className="text-xs" data-testid={`add-pick-${pick.id}`}>
            <DollarSign className="w-3 h-3 mr-1" />
            {isInSlip(`straight-${pick.id}`) ? "In Slip" : "Add to Slip"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StraightBetsContent() {
  const [sport, setSport] = useState("all");
  const [betType, setBetType] = useState("all");
  const [minConfidence, setMinConfidence] = useState([0]);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/predictions/straight-bets", sport, betType, minConfidence[0]],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sport !== "all") params.set("sport", sport);
      if (betType !== "all") params.set("betType", betType);
      if (minConfidence[0] > 0) params.set("minConfidence", String(minConfidence[0]));
      const res = await fetch(`/api/predictions/straight-bets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 120000,
  });

  return (
    <div className="space-y-4" data-testid="straight-bets-content">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="filter-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {straightBetSportOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bet Type</Label>
              <Select value={betType} onValueChange={setBetType}>
                <SelectTrigger data-testid="filter-bettype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {betTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Confidence: {minConfidence[0]}%</Label>
              <Slider value={minConfidence} onValueChange={setMinConfidence} min={0} max={90} step={5} data-testid="filter-confidence" />
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{data.meta.totalPicks}</p><p className="text-xs text-muted-foreground">Total Picks</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-500">{data.meta.lockCount}</p><p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Locks</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-500">{data.meta.strongCount}</p><p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Strong</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{data.meta.averageEdge}%</p><p className="text-xs text-muted-foreground">Avg Edge</p></CardContent></Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Analyzing games...</span>
        </div>
      )}

      {error && (
        <Card><CardContent className="p-6 text-center text-destructive">Failed to load predictions. Please try again.</CardContent></Card>
      )}

      {data?.picks && (
        <div className="space-y-3">
          {data.picks.map((pick: any, idx: number) => (
            <PickCard key={pick.id} pick={pick} rank={idx + 1} />
          ))}
          {data.picks.length === 0 && (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No picks found matching your filters. Try adjusting sport or confidence level.</CardContent></Card>
          )}
        </div>
      )}

      {data?.disclaimer && <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>}
    </div>
  );
}

function SGPCard({ sgp }: { sgp: any }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();
  const corrBadge = getCorrelationBadge(sgp.correlation);

  const handleAddAllLegs = () => {
    let added = 0;
    sgp.legs.forEach((leg: any, i: number) => {
      const legId = `sgp-${sgp.id}-${i}`;
      if (!isInSlip(legId)) {
        const slipLeg: ParlaySlipLeg = {
          id: legId,
          team: leg.pick.split(" ")[0],
          opponent: "",
          market: leg.type as any,
          outcome: leg.pick,
          decimalOdds: leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1,
          americanOdds: leg.odds,
          addedFrom: "SGP Generator",
          addedAt: new Date().toISOString(),
          sport: sgp.sport,
        };
        if (addLeg(slipLeg)) added++;
      }
    });
    if (added > 0) {
      toast({ title: "Added to Slip", description: `${added} leg${added > 1 ? "s" : ""} added` });
    }
  };

  return (
    <Card className={`overflow-hidden ${sgp.confidence >= 70 ? "ring-2 ring-green-500/30" : ""}`} data-testid={`sgp-card-${sgp.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{sgp.sport}</Badge>
              <Badge className={`${corrBadge.color} text-xs`}>
                <Link2 className="w-3 h-3 mr-1" />
                {corrBadge.label}
              </Badge>
              <Badge variant="outline" className={`text-xs font-bold ${
                sgp.grade.startsWith("A") ? "border-green-500 text-green-500" :
                sgp.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                "border-yellow-500 text-yellow-500"
              }`}>{sgp.grade}</Badge>
            </div>
            <p className="font-semibold text-sm">{sgp.name}</p>
            <p className="text-xs text-muted-foreground">{sgp.game}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatOdds(sgp.combinedOdds)}</p>
            <p className="text-xs text-muted-foreground">{sgp.combinedDecimal}x</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-sm font-bold">{sgp.confidence}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">EV</p>
            <p className={`text-sm font-bold ${sgp.ev > 0 ? "text-green-500" : "text-red-500"}`}>{sgp.ev > 0 ? "+" : ""}{sgp.ev}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Legs</p>
            <p className="text-sm font-bold">{sgp.legs.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          {sgp.legs.map((leg: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  leg.type === "moneyline" ? "bg-blue-500" :
                  leg.type === "spread" ? "bg-green-500" :
                  leg.type === "total" ? "bg-purple-500" : "bg-orange-500"
                }`} />
                <span className="text-sm">{leg.pick}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{formatOdds(leg.odds)}</span>
            </div>
          ))}
        </div>

        {expanded && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">{sgp.rationale}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Home:</span> {sgp.homeTeam} ({sgp.homeRecord})</div>
              <div><span className="text-muted-foreground">Away:</span> {sgp.awayTeam} ({sgp.awayRecord})</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs" data-testid={`expand-sgp-${sgp.id}`}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button size="sm" onClick={handleAddAllLegs} className="text-xs" data-testid={`add-sgp-${sgp.id}`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Add All Legs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SGPContent() {
  const [sport, setSport] = useState("NBA");
  const [groupByGame, setGroupByGame] = useState(true);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/predictions/sgp", sport],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/sgp?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 120000,
  });

  const sgps = data?.sgps || [];
  const gameGroups = groupByGame
    ? sgps.reduce((acc: any, sgp: any) => {
        if (!acc[sgp.gameId]) acc[sgp.gameId] = { game: sgp.game, sgps: [] };
        acc[sgp.gameId].sgps.push(sgp);
        return acc;
      }, {})
    : null;

  return (
    <div className="space-y-4" data-testid="sgp-content">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="sgp-sport-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sgpSportOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant={groupByGame ? "default" : "outline"} size="sm" onClick={() => setGroupByGame(!groupByGame)} data-testid="toggle-group">
              {groupByGame ? "Grouped" : "Ranked"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data?.meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{data.meta.gamesAnalyzed}</p><p className="text-xs text-muted-foreground">Games Analyzed</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{data.meta.totalSGPs}</p><p className="text-xs text-muted-foreground">SGPs Generated</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-500">{sgps.filter((s: any) => s.confidence >= 65).length}</p><p className="text-xs text-muted-foreground">High Confidence</p></CardContent></Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Building same game parlays...</span>
        </div>
      )}

      {error && <Card><CardContent className="p-6 text-center text-destructive">Failed to load SGPs. Please try again.</CardContent></Card>}

      {groupByGame && gameGroups ? (
        <div className="space-y-6">
          {Object.entries(gameGroups).map(([gameId, group]: [string, any]) => (
            <div key={gameId} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{group.game}</h3>
                <Badge variant="secondary" className="text-xs">{group.sgps.length} SGPs</Badge>
              </div>
              <div className="space-y-3 pl-2 border-l-2 border-muted">
                {group.sgps.map((sgp: any) => (
                  <SGPCard key={sgp.id} sgp={sgp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sgps.map((sgp: any) => (
            <SGPCard key={sgp.id} sgp={sgp} />
          ))}
        </div>
      )}

      {sgps.length === 0 && !isLoading && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No upcoming games found for {sport}. Try a different sport.</CardContent></Card>
      )}

      {data?.disclaimer && <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>}
    </div>
  );
}

function TeaserCard({ teaser }: { teaser: any }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const handleAddAllLegs = () => {
    let added = 0;
    teaser.legs.forEach((leg: any, i: number) => {
      const legId = `teaser-${teaser.id}-${i}`;
      if (!isInSlip(legId)) {
        const odds = teaser.combinedOdds;
        const slipLeg: ParlaySlipLeg = {
          id: legId,
          team: leg.team || "Total",
          opponent: "",
          market: teaser.type as any,
          outcome: leg.pick,
          decimalOdds: odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1,
          americanOdds: odds,
          addedFrom: "Teaser Generator",
          addedAt: new Date().toISOString(),
          sport: teaser.sport,
        };
        if (addLeg(slipLeg)) added++;
      }
    });
    if (added > 0) {
      toast({ title: "Added", description: `${added} teaser leg${added > 1 ? "s" : ""} added to slip` });
    }
  };

  return (
    <Card className={`overflow-hidden ${teaser.winProbability >= 65 ? "ring-2 ring-green-500/30" : ""}`} data-testid={`teaser-card-${teaser.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">{teaser.type} Teaser</Badge>
              <Badge className="bg-primary text-primary-foreground text-xs">
                <ArrowDown className="w-3 h-3 mr-1" />
                {teaser.teaserPoints} pts
              </Badge>
              <Badge variant="outline" className={`text-xs font-bold ${
                teaser.grade.startsWith("A") ? "border-green-500 text-green-500" :
                teaser.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                "border-yellow-500 text-yellow-500"
              }`}>{teaser.grade}</Badge>
            </div>
            <p className="font-semibold text-sm">{teaser.legs.length}-Leg {teaser.type === "spread" ? "Spread" : "Total"} Teaser</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatOdds(teaser.combinedOdds)}</p>
            <p className="text-xs text-muted-foreground">Win: {teaser.winProbability}%</p>
          </div>
        </div>

        <div className="space-y-2">
          {teaser.legs.map((leg: any, i: number) => (
            <div key={i} className="bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{leg.pick}</span>
                <span className="text-xs text-muted-foreground">{leg.game}</span>
              </div>
              {teaser.type === "spread" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Original: {leg.originalSpread > 0 ? "+" : ""}{leg.originalSpread}</span>
                  <ArrowDown className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 font-medium">Teased: {leg.teasedSpread > 0 ? "+" : ""}{leg.teasedSpread}</span>
                </div>
              )}
              {teaser.type === "total" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Original: {leg.originalTotal}</span>
                  <ArrowDown className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 font-medium">Teased: {leg.teasedTotal}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {expanded && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">{teaser.rationale}</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs" data-testid={`expand-teaser-${teaser.id}`}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button size="sm" onClick={handleAddAllLegs} className="text-xs" data-testid={`add-teaser-${teaser.id}`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Add to Slip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeaserContent() {
  const [sport, setSport] = useState("NBA");
  const [legs, setLegs] = useState("2");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/predictions/teasers", sport, legs],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/teasers?sport=${sport}&legs=${legs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 120000,
  });

  const teasers = (data?.teasers || []).filter((t: any) =>
    typeFilter === "all" || t.type === typeFilter
  );

  return (
    <div className="space-y-4" data-testid="teaser-content">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="teaser-sport-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sgpSportOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Select value={legs} onValueChange={setLegs}>
                <SelectTrigger data-testid="teaser-legs-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Legs</SelectItem>
                  <SelectItem value="3">3 Legs</SelectItem>
                  <SelectItem value="4">4 Legs</SelectItem>
                  <SelectItem value="5">5 Legs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="teaser-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="spread">Spread Teasers</SelectItem>
                  <SelectItem value="total">Total Teasers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{data.meta.gamesAvailable}</p><p className="text-xs text-muted-foreground">Games Available</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{teasers.length}</p><p className="text-xs text-muted-foreground">Teasers Generated</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-500">{data.meta.teaserPointOptions?.join(" / ")}</p><p className="text-xs text-muted-foreground">Point Options</p></CardContent></Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Building teasers...</span>
        </div>
      )}

      {error && <Card><CardContent className="p-6 text-center text-destructive">Failed to generate teasers. Please try again.</CardContent></Card>}

      {teasers.length > 0 && (
        <div className="space-y-3">
          {teasers.map((teaser: any) => (
            <TeaserCard key={teaser.id} teaser={teaser} />
          ))}
        </div>
      )}

      {teasers.length === 0 && !isLoading && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Not enough games available for {legs}-leg teasers in {sport}. Try fewer legs or a different sport.</CardContent></Card>
      )}

      {data?.disclaimer && <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>}
    </div>
  );
}

interface RRPick {
  id: string;
  pick: string;
  odds: number;
  sport: string;
  game: string;
  confidence: number;
}

function RoundRobinContent() {
  const [picks, setPicks] = useState<RRPick[]>([]);
  const [parlaySize, setParlaySize] = useState("2");
  const [stake, setStake] = useState("10");
  const [newPick, setNewPick] = useState({ pick: "", odds: "-110", sport: "NBA", game: "", confidence: "55" });
  const [results, setResults] = useState<any>(null);
  const [showAllParlays, setShowAllParlays] = useState(false);
  const { toast } = useToast();

  const straightBets = useQuery<any>({
    queryKey: ["/api/predictions/straight-bets"],
    queryFn: async () => {
      const res = await fetch("/api/predictions/straight-bets");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predictions/round-robin", {
        picks: picks.map(p => ({ pick: p.pick, odds: p.odds, sport: p.sport, game: p.game, confidence: p.confidence })),
        parlaySize: parseInt(parlaySize),
        stake: parseFloat(stake),
      });
      return res.json();
    },
    onSuccess: (data) => setResults(data),
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to generate", variant: "destructive" }),
  });

  const addPick = () => {
    if (!newPick.pick.trim()) { toast({ title: "Enter a pick", variant: "destructive" }); return; }
    const pick: RRPick = {
      id: `pick-${Date.now()}`,
      pick: newPick.pick.trim(),
      odds: parseInt(newPick.odds) || -110,
      sport: newPick.sport,
      game: newPick.game.trim() || "TBD",
      confidence: parseInt(newPick.confidence) || 55,
    };
    setPicks(prev => [...prev, pick]);
    setNewPick({ pick: "", odds: "-110", sport: "NBA", game: "", confidence: "55" });
  };

  const addFromStraightBets = (p: any) => {
    if (picks.find(existing => existing.pick === p.pick)) return;
    setPicks(prev => [...prev, {
      id: `pick-${Date.now()}-${p.id}`,
      pick: p.pick, odds: p.odds, sport: p.sport, game: p.game, confidence: p.confidence,
    }]);
    toast({ title: "Added", description: `${p.pick} added to your picks` });
  };

  const removePick = (id: string) => setPicks(prev => prev.filter(p => p.id !== id));

  const displayedParlays = showAllParlays ? results?.parlays : results?.parlays?.slice(0, 10);

  return (
    <div className="space-y-4" data-testid="round-robin-content">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Pick
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pick</Label>
                  <Input placeholder="e.g., Lakers ML" value={newPick.pick} onChange={e => setNewPick(prev => ({ ...prev, pick: e.target.value }))} data-testid="input-pick" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Odds</Label>
                  <Input placeholder="-110" value={newPick.odds} onChange={e => setNewPick(prev => ({ ...prev, odds: e.target.value }))} data-testid="input-odds" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Game</Label>
                  <Input placeholder="e.g., LAL @ BOS" value={newPick.game} onChange={e => setNewPick(prev => ({ ...prev, game: e.target.value }))} data-testid="input-game" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Confidence %</Label>
                  <Input placeholder="55" value={newPick.confidence} onChange={e => setNewPick(prev => ({ ...prev, confidence: e.target.value }))} data-testid="input-confidence" />
                </div>
              </div>
              <Button size="sm" onClick={addPick} data-testid="btn-add-pick">
                <Plus className="w-4 h-4 mr-1" /> Add Pick
              </Button>
            </CardContent>
          </Card>

          {straightBets.data?.picks && straightBets.data.picks.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" /> Quick Add from Straight Bets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {straightBets.data.picks.slice(0, 12).map((p: any) => (
                    <Button key={p.id} variant="outline" size="sm" className="justify-start text-xs h-auto py-2" onClick={() => addFromStraightBets(p)} disabled={picks.some(existing => existing.pick === p.pick)} data-testid={`quick-add-${p.id}`}>
                      <div className="text-left">
                        <div className="font-medium">{p.pick}</div>
                        <div className="text-muted-foreground">{formatOdds(p.odds)} | {p.confidence}%</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {picks.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Your Picks ({picks.length})</h3>
                <div className="space-y-2">
                  {picks.map(pick => (
                    <div key={pick.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{pick.pick}</p>
                        <p className="text-xs text-muted-foreground">{pick.game} | {formatOdds(pick.odds)} | {pick.confidence}%</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removePick(pick.id)} data-testid={`remove-pick-${pick.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Parlay Size</Label>
                    <Select value={parlaySize} onValueChange={setParlaySize}>
                      <SelectTrigger data-testid="select-parlay-size"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.min(picks.length - 1, 5) }, (_, i) => i + 2).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}-Leg Parlays</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stake per Parlay ($)</Label>
                    <Input value={stake} onChange={e => setStake(e.target.value)} data-testid="input-stake" />
                  </div>
                </div>

                <Button onClick={() => generateMutation.mutate()} disabled={picks.length < 3 || generateMutation.isPending} className="w-full" data-testid="btn-generate-rr">
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Calculator className="w-4 h-4 mr-2" /> Generate Round Robin</>
                  )}
                </Button>
                {picks.length < 3 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Add at least 3 picks to generate
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {results?.summary && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Total Parlays</span><span className="font-bold">{results.summary.totalParlays}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Parlay Size</span><span className="font-bold">{results.summary.parlaySize}-leg</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Stake Each</span><span className="font-bold">${results.summary.stakePerParlay}</span></div>
                  <div className="flex justify-between gap-2 border-t pt-2"><span className="text-muted-foreground">Total Investment</span><span className="font-bold">${results.summary.totalInvestment}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Best Case</span><span className="font-bold text-green-500">${results.summary.bestCasePayout}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Worst Case</span><span className="font-bold text-red-500">${results.summary.worstCaseLoss}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Avg EV</span><span className={`font-bold ${results.summary.averageEV >= 0 ? "text-green-500" : "text-red-500"}`}>${results.summary.averageEV}</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {results?.parlays && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Parlays ({results.parlays.length})</h3>
              {displayedParlays?.map((parlay: any) => (
                <Card key={parlay.id} className={`${parlay.ev > 0 ? "ring-1 ring-green-500/30" : ""}`} data-testid={`rr-parlay-${parlay.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-xs font-bold ${
                        parlay.grade.startsWith("A") ? "border-green-500 text-green-500" :
                        parlay.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                        "border-yellow-500 text-yellow-500"
                      }`}>{parlay.grade}</Badge>
                      <span className="text-sm font-bold">{formatOdds(parlay.combinedOdds)}</span>
                    </div>
                    <div className="space-y-1">
                      {parlay.legs.map((leg: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">{leg.pick} ({formatOdds(leg.odds)})</p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">Win: {parlay.winProbability}%</span>
                      <span className="text-muted-foreground">Payout: ${parlay.potentialPayout}</span>
                      <span className={parlay.ev >= 0 ? "text-green-500" : "text-red-500"}>EV: ${parlay.ev}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.parlays.length > 10 && (
                <Button variant="outline" size="sm" onClick={() => setShowAllParlays(!showAllParlays)} className="w-full" data-testid="btn-show-all-parlays">
                  {showAllParlays ? "Show Less" : `Show All ${results.parlays.length} Parlays`}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {results?.disclaimer && <p className="text-xs text-muted-foreground text-center">{results.disclaimer}</p>}
    </div>
  );
}

function StartHereBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("startHereDismissed") === "true"; } catch { return false; }
  });

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("startHereDismissed", "true"); } catch {}
  };

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3" data-testid="banner-start-here">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <BookOpen className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">New here? Start with the Beginner's Path</p>
          <Badge variant="outline" className="text-[10px]">Recommended</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <span className="font-medium text-foreground">Beginner's Path</span> in the Help Center walks you through reading picks, understanding confidence scores, building your first parlay, and managing your bankroll — step by step.
        </p>
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <a href="/help">
            <Button size="sm" className="text-xs h-7 gap-1.5" data-testid="banner-start-here-cta">
              <BookOpen className="w-3 h-3" />
              Open Beginner's Path
            </Button>
          </a>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={dismiss} data-testid="banner-start-here-dismiss">
            Got it, thanks
          </Button>
        </div>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5" data-testid="banner-start-here-close">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Dashboard() {
  useSEO({ title: "Bet Builder", description: "Build, analyze, and optimize your bets — parlays, straight bets, SGPs, teasers, and round robins" });
  const sse = useSSEContext();
  const [activeTab, setActiveTab] = useState("generator");
  const [preloadedLegs, setPreloadedLegs] = useState<ParlayLeg[]>([]);
  const [selectedLegs, setSelectedLegs] = useState<ParlayLeg[]>([]);
  const [showBestBets, setShowBestBets] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [currentStake, setCurrentStake] = useState(10);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>({
    totalBankroll: 1000,
    sessionLimit: 100,
    dailyLimit: 200,
    maxExposurePerTeam: 50,
    maxExposurePerPlayer: 30,
    kellyMultiplier: 0.25,
  });
  const [bettingEnv, setBettingEnv] = useState<BettingEnvironment>(getDefaultBettingEnvironment());

  const { data: events = [] } = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", "NBA"],
  });

  const { data: freshnessData } = useQuery<{ sources: { name: string; lastUpdated: string }[] }>({
    queryKey: ["/api/data-freshness"],
    refetchInterval: 30000,
  });

  const handleLoadParlay = useCallback((legs: ParlayLeg[]) => {
    setPreloadedLegs(legs);
    setSelectedLegs(legs);
    setActiveTab("builder");
  }, []);

  const handleLegsChange = useCallback((legs: ParlayLeg[]) => {
    setSelectedLegs(legs);
  }, []);

  const handleStakeChange = useCallback((stake: number) => {
    setCurrentStake(stake);
  }, []);

  const handleResultChange = useCallback((result: EvaluationResult | null) => {
    setEvaluationResult(result);
  }, []);

  const handleAddLeg = useCallback((leg: ParlayLeg) => {
    setSelectedLegs(prev => [...prev, leg]);
  }, []);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-builder-title">
            Bet Builder
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Build parlays, straight bets, SGPs, teasers, and round robins
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-2xl mx-auto hidden sm:block">
            Use the Quick Picks tab to get AI-suggested legs, or switch to Parlay Builder to add legs manually. The Correlation Analyzer grades your ticket combination, estimates EV, and recommends a stake based on your bankroll settings. Use the Visual Builder tab for a drag-and-drop interface.
          </p>
          {freshnessData?.sources && (
            <div className="flex justify-center pt-1">
              <DataFreshnessBar sources={freshnessData.sources} />
            </div>
          )}
          <div className="flex items-center justify-center gap-2 pt-0.5" data-testid="sse-status-bar">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${sse.connected ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400" : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sse.connected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
              {sse.connected
                ? sse.lastUpdate
                  ? `Live · Updated ${new Date(sse.lastUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Live · Connected"
                : "Connecting..."}
            </span>
          </div>
        </header>

        <StartHereBanner />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-full h-auto p-1 gap-0.5">
              <TabsTrigger value="generator" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-generator">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Quick</span> Picks
              </TabsTrigger>
              <TabsTrigger value="visual" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-visual">
                <GripVertical className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Visual</span> Builder
              </TabsTrigger>
              <TabsTrigger value="builder" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-builder">
                <Wrench className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Manual</span> Entry
              </TabsTrigger>
              <TabsTrigger value="straight" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-straight">
                <Target className="w-4 h-4 shrink-0" />
                Straight
              </TabsTrigger>
              <TabsTrigger value="sgp" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-sgp">
                <Layers className="w-4 h-4 shrink-0" />
                SGP
              </TabsTrigger>
              <TabsTrigger value="teasers" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-teasers">
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                Teasers
              </TabsTrigger>
              <TabsTrigger value="roundrobin" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0" data-testid="tab-roundrobin">
                <Shuffle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Round</span> Robin
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="generator" className="space-y-4">
            <ParlayGenerator onLoadParlay={handleLoadParlay} onLegsChange={handleLegsChange} />
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <VisualParlayBuilder
              onLegsChange={handleLegsChange}
              onStakeChange={handleStakeChange}
              onResultChange={handleResultChange}
              bankroll={bankrollSettings.totalBankroll}
              bettingEnv={bettingEnv}
            />
          </TabsContent>

          <TabsContent value="builder" className="space-y-4">
            <ParlayBuilder 
              preloadedLegs={preloadedLegs} 
              onLegsLoaded={() => setPreloadedLegs([])} 
              onLegsChange={handleLegsChange}
              onStakeChange={handleStakeChange}
              onResultChange={handleResultChange}
              bankroll={bankrollSettings.totalBankroll}
              bettingEnv={bettingEnv}
            />
          </TabsContent>

          <TabsContent value="straight" className="space-y-4">
            <StraightBetsContent />
          </TabsContent>

          <TabsContent value="sgp" className="space-y-4">
            <SGPContent />
          </TabsContent>

          <TabsContent value="teasers" className="space-y-4">
            <TeaserContent />
          </TabsContent>

          <TabsContent value="roundrobin" className="space-y-4">
            <RoundRobinContent />
          </TabsContent>
        </Tabs>

        <Collapsible open={showBestBets} onOpenChange={setShowBestBets}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" data-testid="toggle-best-bets">
                <Flame className="w-4 h-4 text-orange-500" />
                Today's Hot Picks
                <Badge variant="secondary" className="text-xs">+EV</Badge>
                {showBestBets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <TodaysBestBets 
              events={events} 
              onAddLeg={(leg) => handleAddLeg({ ...leg, id: crypto.randomUUID() })} 
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" data-testid="toggle-advanced">
                <Settings className="w-4 h-4 text-blue-500" />
                Analysis & Settings
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <BettingSettings 
                settings={bettingEnv} 
                onSettingsChange={setBettingEnv} 
              />
              <InsightsPanel
                events={events}
                selectedLegs={selectedLegs}
                bankrollSettings={bankrollSettings}
                onBankrollChange={setBankrollSettings}
                totalSpent={totalSpent}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <footer className="pt-4 border-t text-center space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-disclaimer">
            For educational and analysis purposes only. This is not a sportsbook. Please gamble responsibly. Must be 21+ in most jurisdictions.
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-affiliate-disclosure">
            We may earn referral fees from partner sportsbooks. This does not affect our analysis.
            {" "}<a href="/legal" className="underline">Full disclosure</a>
            {" | "}<a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="underline">Problem Gambling Help: 1-800-522-4700</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
