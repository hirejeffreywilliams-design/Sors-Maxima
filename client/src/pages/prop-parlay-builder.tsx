import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Zap, Target, TrendingUp, TrendingDown, Shield, AlertTriangle,
  DollarSign, ChevronDown, ChevronUp, Loader2, RefreshCw,
  BarChart3, Users, Activity, Star, Flame, ArrowRight, Info,
  CheckCircle2, XCircle, Minus, Brain,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

const SPORTS = [
  { id: "NBA", name: "NBA", color: "bg-orange-500" },
  { id: "NFL", name: "NFL", color: "bg-green-600" },
  { id: "MLB", name: "MLB", color: "bg-red-500" },
  { id: "NHL", name: "NHL", color: "bg-blue-500" },
  { id: "NCAAB", name: "NCAAB", color: "bg-purple-500" },
  { id: "NCAAF", name: "NCAAF", color: "bg-amber-600" },
];

const RISK_LEVELS = [
  { id: "conservative", name: "Conservative", icon: Shield, color: "text-green-500", desc: "High-probability legs, lower payouts" },
  { id: "moderate", name: "Moderate", icon: Target, color: "text-yellow-500", desc: "Balanced risk and reward" },
  { id: "aggressive", name: "Aggressive", icon: Flame, color: "text-red-500", desc: "Higher payouts, more risk" },
];

interface ParlayLeg {
  id: string;
  type: string;
  sport: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  description: string;
  selection: string;
  line?: number;
  americanOdds: number;
  decimalOdds: number;
  impliedProbability: number;
  modelProbability: number;
  edge: number;
  evRating: string;
  confidenceScore: number;
  confidenceGrade: string;
  factors: { name: string; impact: number; detail: string }[];
  playerName?: string;
  market?: string;
  marketLabel?: string;
  bookmaker?: string;
  bestOdds?: { bookmaker: string; odds: number };
  injuryImpact?: string;
  weatherImpact?: string;
  dataSource: string;
}

interface Correlation {
  leg1Index: number;
  leg2Index: number;
  correlation: number;
  type: string;
  explanation: string;
}

interface ParlayRecommendation {
  id: string;
  name: string;
  legs: ParlayLeg[];
  totalOdds: number;
  totalAmericanOdds: number;
  impliedProbability: number;
  modelProbability: number;
  expectedValue: number;
  confidenceScore: number;
  confidenceGrade: string;
  potentialPayout: number;
  correlations: Correlation[];
  riskLevel: string;
  strategy: string;
}

function formatOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "text-green-400";
    case "B": return "text-blue-400";
    case "C": return "text-yellow-400";
    case "D": return "text-orange-400";
    case "F": return "text-red-400";
    default: return "text-gray-400";
  }
}

function gradeBg(grade: string) {
  switch (grade) {
    case "A": return "bg-green-500/20 border-green-500/30";
    case "B": return "bg-blue-500/20 border-blue-500/30";
    case "C": return "bg-yellow-500/20 border-yellow-500/30";
    case "D": return "bg-orange-500/20 border-orange-500/30";
    case "F": return "bg-red-500/20 border-red-500/30";
    default: return "bg-gray-500/20 border-gray-500/30";
  }
}

function evColor(rating: string) {
  switch (rating) {
    case "strong": return "text-green-400";
    case "moderate": return "text-blue-400";
    case "weak": return "text-yellow-400";
    default: return "text-red-400";
  }
}

function LegCard({ leg, index }: { leg: ParlayLeg; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid={`leg-card-${index}`}
      className="border border-border/50 rounded-lg p-3 bg-card/50 hover:bg-card/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs shrink-0">
              {leg.type === "player_prop" ? "PROP" : leg.type.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {leg.homeTeam} vs {leg.awayTeam}
            </span>
          </div>
          <p className="font-semibold text-sm" data-testid={`leg-description-${index}`}>
            {leg.description}
          </p>
          <p className="text-sm font-medium text-foreground" data-testid={`leg-selection-${index}`}>
            {leg.selection}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-lg" data-testid={`leg-odds-${index}`}>
            {formatOdds(leg.americanOdds)}
          </p>
          <div className={`text-xs font-semibold ${gradeColor(leg.confidenceGrade)}`}>
            Grade {leg.confidenceGrade} ({leg.confidenceScore})
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className={`font-medium ${evColor(leg.evRating)} flex items-center gap-1`}>
          {leg.evRating === "strong" ? <Flame className="w-3 h-3" /> : leg.evRating === "moderate" ? <CheckCircle2 className="w-3 h-3" /> : leg.evRating === "weak" ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {leg.evRating.toUpperCase()} EV ({leg.edge > 0 ? "+" : ""}{(leg.edge * 100).toFixed(1)}%)
        </span>
        <span>Win: {(leg.modelProbability * 100).toFixed(0)}%</span>
        {leg.bookmaker && <span>via {leg.bookmaker}</span>}
      </div>

      {(leg.injuryImpact || leg.weatherImpact) && (
        <div className="flex gap-2 mt-2">
          {leg.injuryImpact && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> {leg.injuryImpact}
            </Badge>
          )}
          {leg.weatherImpact && leg.weatherImpact !== "none" && (
            <Badge variant="secondary" className="text-xs">
              Weather: {leg.weatherImpact}
            </Badge>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 h-6 text-xs"
        onClick={() => setExpanded(!expanded)}
        data-testid={`leg-expand-${index}`}
      >
        {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
        {expanded ? "Hide Analysis" : "Show Analysis"}
      </Button>

      {expanded && (
        <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
          {leg.factors.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{f.name}</span>
              <span className={f.impact > 0 ? "text-green-400" : f.impact < 0 ? "text-red-400" : "text-muted-foreground"}>
                {f.impact > 0 ? "+" : ""}{f.impact.toFixed(1)}% — {f.detail}
              </span>
            </div>
          ))}
          {leg.bestOdds && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Best Line</span>
              <span className="text-foreground font-medium">{leg.bestOdds.bookmaker}: {formatOdds(leg.bestOdds.odds)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Data Source</span>
            <span className="text-foreground font-medium">{leg.dataSource}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ParlayCard({ parlay, stake }: { parlay: ParlayRecommendation; stake: number }) {
  const [expanded, setExpanded] = useState(true);
  const payout = (stake * parlay.totalOdds).toFixed(2);
  const profit = (stake * parlay.totalOdds - stake).toFixed(2);

  const strategyIcon = {
    "Prop Hunter": <Target className="w-5 h-5" />,
    "Balanced Attack": <BarChart3 className="w-5 h-5" />,
    "Game Master": <Brain className="w-5 h-5" />,
    "Value Play": <TrendingUp className="w-5 h-5" />,
    "Longshot Special": <Flame className="w-5 h-5" />,
  }[parlay.name] || <Zap className="w-5 h-5" />;

  return (
    <Card className={`border ${gradeBg(parlay.confidenceGrade)} overflow-hidden`} data-testid={`parlay-card-${parlay.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${gradeBg(parlay.confidenceGrade)}`}>
              {strategyIcon}
            </div>
            <div>
              <CardTitle className="text-lg" data-testid={`parlay-name-${parlay.id}`}>{parlay.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{parlay.legs.length} Legs</Badge>
                <Badge variant="outline" className="text-xs capitalize">{parlay.riskLevel}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${gradeColor(parlay.confidenceGrade)}`} data-testid={`parlay-grade-${parlay.id}`}>
              {parlay.confidenceGrade}
            </div>
            <div className="text-xs text-muted-foreground">Score: {parlay.confidenceScore}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Odds</p>
            <p className="text-lg font-bold" data-testid={`parlay-odds-${parlay.id}`}>
              {formatOdds(parlay.totalAmericanOdds)}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Payout (${stake})</p>
            <p className="text-lg font-bold text-green-400" data-testid={`parlay-payout-${parlay.id}`}>
              ${payout}
            </p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Win Probability</p>
            <p className="text-lg font-bold">{(parlay.modelProbability * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Expected Value</p>
            <p className={`text-lg font-bold ${parlay.expectedValue > 0 ? "text-green-400" : "text-red-400"}`}>
              {parlay.expectedValue > 0 ? "+" : ""}${parlay.expectedValue.toFixed(2)}
            </p>
          </div>
        </div>

        {parlay.correlations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" /> Correlation Analysis
            </p>
            {parlay.correlations.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${
                c.type === "positive" ? "bg-green-500/10 text-green-400" :
                c.type === "negative" ? "bg-red-500/10 text-red-400" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                {c.type === "positive" ? <CheckCircle2 className="w-3 h-3 shrink-0" /> :
                 c.type === "negative" ? <XCircle className="w-3 h-3 shrink-0" /> :
                 <Minus className="w-3 h-3 shrink-0" />}
                <span>{c.explanation}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
          data-testid={`parlay-toggle-legs-${parlay.id}`}
        >
          {expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          {expanded ? "Hide Legs" : `Show ${parlay.legs.length} Legs`}
        </Button>

        {expanded && (
          <div className="space-y-2">
            {parlay.legs.map((leg, i) => (
              <LegCard key={leg.id} leg={leg} index={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PropParlayBuilder() {
  useSEO({ title: "Prop Parlay Builder", description: "Build player prop parlays with AI analysis" });
  const { toast } = useToast();
  const [selectedSports, setSelectedSports] = useState<string[]>(["NBA"]);
  const [legCount, setLegCount] = useState(3);
  const [riskLevel, setRiskLevel] = useState("moderate");
  const [stake, setStake] = useState(10);
  const [includeProps, setIncludeProps] = useState(true);
  const [includeMoneylines, setIncludeMoneylines] = useState(true);
  const [includeSpreads, setIncludeSpreads] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [loading, setLoading] = useState(false);
  const [parlays, setParlays] = useState<ParlayRecommendation[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev =>
      prev.includes(sportId)
        ? prev.filter(s => s !== sportId)
        : [...prev, sportId]
    );
  };

  const generateParlays = async () => {
    if (selectedSports.length === 0) {
      toast({ title: "Select at least one sport", variant: "destructive" });
      return;
    }
    if (!includeProps && !includeMoneylines && !includeSpreads && !includeTotals) {
      toast({ title: "Select at least one bet type", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/prop-parlays", {
        sports: selectedSports,
        legCount,
        riskLevel,
        includeProps,
        includeMoneylines,
        includeSpreads,
        includeTotals,
        stake,
      });
      const data = await response.json();
      setParlays(data.parlays || []);
      setMeta(data.meta);
      if (data.parlays?.length === 0) {
        toast({ title: "No parlays found", description: "Try adjusting your filters or adding more sports." });
      }
    } catch (e: any) {
      toast({ title: "Error generating parlays", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <PageHero
        icon={<Brain className="w-6 h-6" />}
        title="Prop Parlay Builder"
        subtitle="Advanced multi-leg parlay analysis combining player props, moneylines, spreads, and totals"
        data-testid="page-title"
      />

      <Card data-testid="builder-config">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Configure Your Parlay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Sports</Label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(sport => (
                <Button
                  key={sport.id}
                  variant={selectedSports.includes(sport.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSport(sport.id)}
                  data-testid={`sport-toggle-${sport.id}`}
                >
                  {sport.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Bet Types</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={includeProps} onCheckedChange={setIncludeProps} id="props" data-testid="toggle-props" />
                <Label htmlFor="props" className="text-sm cursor-pointer">Player Props</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeMoneylines} onCheckedChange={setIncludeMoneylines} id="ml" data-testid="toggle-moneylines" />
                <Label htmlFor="ml" className="text-sm cursor-pointer">Moneylines</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeSpreads} onCheckedChange={setIncludeSpreads} id="spreads" data-testid="toggle-spreads" />
                <Label htmlFor="spreads" className="text-sm cursor-pointer">Spreads</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeTotals} onCheckedChange={setIncludeTotals} id="totals" data-testid="toggle-totals" />
                <Label htmlFor="totals" className="text-sm cursor-pointer">Totals</Label>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Risk Level</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RISK_LEVELS.map(level => {
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    onClick={() => setRiskLevel(level.id)}
                    data-testid={`risk-${level.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      riskLevel === level.id
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-card/50 hover:bg-card/80"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${level.color}`} />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{level.name}</p>
                      <p className="text-xs text-muted-foreground">{level.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Number of Legs: {legCount}</Label>
              <Slider
                value={[legCount]}
                onValueChange={([v]) => setLegCount(v)}
                min={2}
                max={8}
                step={1}
                data-testid="slider-legs"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>2</span>
                <span>8</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Stake ($)</Label>
              <Input
                type="number"
                value={stake}
                onChange={e => setStake(Number(e.target.value) || 10)}
                min={1}
                max={10000}
                data-testid="input-stake"
              />
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-bold"
            onClick={generateParlays}
            disabled={loading}
            data-testid="btn-generate"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Real-Time Data...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Generate Smart Parlays
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          Generated at {new Date(meta.generatedAt).toLocaleTimeString()} using {meta.sportsQueried?.join(", ")} data
        </div>
      )}

      {parlays.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Recommended Parlays ({parlays.length})
            </h2>
            <Button variant="outline" size="sm" onClick={generateParlays} disabled={loading} data-testid="btn-refresh">
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {parlays.map(parlay => (
            <ParlayCard key={parlay.id} parlay={parlay} stake={stake} />
          ))}
        </div>
      )}

      {!loading && parlays.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Build Your Parlay</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select your sports, bet types, and risk level above, then hit Generate.
              The engine will analyze real-time odds, injuries, weather, and market data to find the best combinations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
