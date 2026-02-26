import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Loader2,
  Trophy,
  Crosshair,
  Layers,
  Star,
  Rocket,
  Gauge,
  ThumbsUp,
  Info,
  Plus,
  ArrowUpRight,
  ArrowLeftRight,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "extreme";
  expectedLegs: number[];
  targetOdds: string;
  winRate: string;
  idealBetTypes: string[];
  approach: string[];
  example: string;
  bestFor: string;
  avoid: string;
}

interface ImprovementOption {
  description: string;
  newOdds?: number;
  newConfidence?: number;
  reasoning: string;
  source: string;
}

interface LegAnalysis {
  legId: string;
  outcome: string;
  team: string;
  market: string;
  grade: string;
  confidence: number;
  ev: number;
  issues: string[];
  strengths: string[];
  suggestion: string;
  shouldKeep: boolean;
  improvementOptions: ImprovementOption[];
}

interface ReplacementPick {
  pickId: string;
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  ev: number;
  reasoning: string;
  replaces?: string;
  whyBetter: string;
}

interface TicketAnalysis {
  overallGrade: string;
  overallScore: number;
  verdict: string;
  verdictType: "excellent" | "good" | "decent" | "weak" | "poor";
  strategyDetected: string;
  strategyMatch: number;
  riskLevel: string;
  combinedOdds: number;
  estimatedWinProb: number;
  expectedValue: number;
  legAnalyses: LegAnalysis[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  maxTips: string[];
  correlationWarnings: string[];
  diversificationScore: number;
  bestReplacementPicks: ReplacementPick[];
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  extreme: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const RISK_ICONS: Record<string, typeof Shield> = {
  low: Shield,
  medium: Gauge,
  high: Zap,
  extreme: Rocket,
};

const STRATEGY_ICONS: Record<string, typeof Shield> = {
  chalk_grinder: Shield,
  value_hunter: Target,
  correlated_parlay: Layers,
  prop_specialist: Star,
  longshot_sniper: Crosshair,
  hedge_master: Compass,
};

const VERDICT_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  excellent: { color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: Trophy },
  good: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: ThumbsUp },
  decent: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: Info },
  weak: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: AlertTriangle },
  poor: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
};

function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500 text-white";
  if (grade === "B+" || grade === "B") return "bg-blue-500 text-white";
  if (grade.startsWith("B")) return "bg-blue-400 text-white";
  if (grade.startsWith("C")) return "bg-yellow-500 text-white";
  if (grade.startsWith("D")) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

function StrategyCard({ template, isSelected, onSelect }: { template: StrategyTemplate; isSelected: boolean; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const RiskIcon = RISK_ICONS[template.riskLevel] ?? Shield;
  const StratIcon = STRATEGY_ICONS[template.id] ?? Target;

  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
      data-testid={`strategy-card-${template.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <StratIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${RISK_COLORS[template.riskLevel]}`}>
                  <RiskIcon className="w-3 h-3 mr-0.5" />
                  {template.riskLevel}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{template.expectedLegs[0]}-{template.expectedLegs[template.expectedLegs.length - 1]} legs</span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="shrink-0 text-xs h-7 px-2.5"
            onClick={(e) => { e.stopPropagation(); onSelect(template.id); }}
            data-testid={`btn-select-strategy-${template.id}`}
          >
            {isSelected ? "Selected" : "Use"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{template.description}</p>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground">Odds: <span className="font-medium text-foreground">{template.targetOdds}</span></span>
          <span className="text-muted-foreground">Win: <span className="font-medium text-foreground">{template.winRate}</span></span>
        </div>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1" data-testid={`btn-expand-strategy-${template.id}`}>
              {expanded ? "Hide Details" : "View Approach"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <div>
              <h4 className="text-xs font-semibold mb-1.5">How to Build</h4>
              <ul className="space-y-1">
                {template.approach.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Example</h4>
              <p className="text-xs">{template.example}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                <h4 className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-0.5">Best For</h4>
                <p className="text-muted-foreground text-[11px]">{template.bestFor}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                <h4 className="text-[10px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Avoid</h4>
                <p className="text-muted-foreground text-[11px]">{template.avoid}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function LegAnalysisCard({ leg }: { leg: LegAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-3 rounded-lg border ${leg.shouldKeep ? "border-border" : "border-orange-500/40 bg-orange-500/5"}`}
      data-testid={`leg-analysis-${leg.legId}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] ${gradeColor(leg.grade)}`}>{leg.grade}</Badge>
            <span className="text-sm font-medium truncate">{leg.outcome}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>{leg.market}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{leg.confidence}% conf</span>
            <span className="text-muted-foreground/40">|</span>
            <span className={leg.ev >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {leg.ev >= 0 ? "+" : ""}{leg.ev.toFixed(1)}% EV
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {leg.shouldKeep ? (
            <Badge variant="outline" className="text-[10px] text-green-700 dark:text-green-400 border-green-500/40 gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Keep
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-orange-700 dark:text-orange-400 border-orange-500/40 gap-0.5">
              <AlertTriangle className="w-3 h-3" /> Swap
            </Badge>
          )}
        </div>
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full h-6 text-[11px] mt-1.5 gap-1 text-muted-foreground" data-testid={`btn-expand-leg-${leg.legId}`}>
            {expanded ? "Less" : "Details"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {leg.strengths.length > 0 && (
            <div className="space-y-1">
              {leg.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
          {leg.issues.length > 0 && (
            <div className="space-y-1">
              {leg.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
          <div className="p-2 rounded bg-muted/50 text-xs flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <span>{leg.suggestion}</span>
          </div>
          {leg.improvementOptions.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alternatives</h5>
              {leg.improvementOptions.map((opt, i) => (
                <div key={i} className="p-2 rounded border border-dashed text-[11px] space-y-0.5">
                  <div className="font-medium">{opt.description}</div>
                  <div className="text-muted-foreground">{opt.reasoning.slice(0, 100)}...</div>
                  {opt.newConfidence && <span className="text-green-600 dark:text-green-400">{opt.newConfidence}% confidence</span>}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ReplacementPickCard({ pick, onAdd }: { pick: ReplacementPick; onAdd: (pick: ReplacementPick) => void }) {
  return (
    <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5" data-testid={`replacement-pick-${pick.pickId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${gradeColor(pick.grade)}`}>{pick.grade}</Badge>
            <Badge variant="outline" className="text-[10px]">{pick.sport}</Badge>
            <Badge variant="outline" className="text-[10px]">{pick.betType}</Badge>
          </div>
          <p className="text-sm font-medium mt-1">{pick.pick}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{pick.game}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span>{pick.confidence}% conf</span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-green-600 dark:text-green-400">+{pick.ev.toFixed(1)}% EV</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{formatOdds(pick.odds)}</span>
          </div>
          {pick.replaces && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-600 dark:text-orange-400">
              <ArrowLeftRight className="w-3 h-3" /> Replaces: {pick.replaces}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs gap-1"
          onClick={() => onAdd(pick)}
          data-testid={`btn-add-replacement-${pick.pickId}`}
        >
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function StrategyAdvisorPage() {
  useSEO("Strategy Advisor - Sors Maxima", "Get expert betting strategy guidance and real-time ticket analysis");
  const { legs, addLeg, removeLeg } = useParlaySlip();
  const { toast } = useToast();
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<TicketAnalysis | null>(null);

  const templatesQuery = useQuery<{ templates: StrategyTemplate[]; count: number }>({
    queryKey: ["/api/strategy/templates"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (slipLegs: ParlaySlipLeg[]) => {
      const mapped = slipLegs.map(l => ({
        id: l.id,
        team: l.team,
        opponent: l.opponent,
        market: l.market,
        outcome: l.outcome,
        americanOdds: l.americanOdds,
        decimalOdds: l.decimalOdds,
        sport: l.sport,
        confidence: l.confidence,
        evPercent: l.evPercent,
        grade: l.grade,
        reasoning: l.reasoning,
        playerName: l.playerName,
        propLine: l.propLine,
      }));
      const res = await apiRequest("POST", "/api/strategy/analyze", { legs: mapped });
      return res.json() as Promise<TicketAnalysis>;
    },
    onSuccess: (data) => setAnalysisResult(data),
  });

  const suggestionsQuery = useQuery<{ suggestions: ReplacementPick[]; count: number }>({
    queryKey: ["/api/strategy/suggestions", selectedStrategy],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/strategy/suggestions", {
        currentLegs: legs.map(l => ({
          id: l.id,
          team: l.team,
          opponent: l.opponent,
          market: l.market,
          outcome: l.outcome,
          americanOdds: l.americanOdds,
          decimalOdds: l.decimalOdds,
          sport: l.sport,
          confidence: l.confidence,
          evPercent: l.evPercent,
          grade: l.grade,
        })),
        strategy: selectedStrategy || undefined,
      });
      return res.json();
    },
    enabled: false,
  });

  const runAnalysis = useCallback(() => {
    analyzeMutation.mutate(legs);
  }, [legs]);

  useEffect(() => {
    if (legs.length > 0) {
      const timer = setTimeout(() => runAnalysis(), 500);
      return () => clearTimeout(timer);
    } else {
      setAnalysisResult(null);
    }
  }, [legs.length]);

  const handleAddReplacement = (pick: ReplacementPick) => {
    const newLeg: ParlaySlipLeg = {
      id: pick.pickId,
      team: pick.game.split(" at ")[1] || pick.game.split(" vs ")[0] || pick.game,
      opponent: pick.game.split(" at ")[0] || pick.game.split(" vs ")[1] || "",
      market: pick.betType as any,
      outcome: pick.pick,
      decimalOdds: pick.odds > 0 ? 1 + pick.odds / 100 : 1 + 100 / Math.abs(pick.odds),
      americanOdds: pick.odds,
      addedFrom: "Strategy Advisor",
      addedAt: new Date().toISOString(),
      sport: pick.sport,
      confidence: pick.confidence,
      evPercent: pick.ev,
      grade: pick.grade,
      reasoning: pick.reasoning,
    };
    const added = addLeg(newLeg);
    if (added) {
      toast({ title: "Pick Added", description: `${pick.pick} added to your slip` });
      if (pick.replaces) {
        const replaceLeg = legs.find(l => l.outcome === pick.replaces);
        if (replaceLeg) removeLeg(replaceLeg.id);
      }
      setTimeout(() => runAnalysis(), 300);
    }
  };

  const verdictCfg = analysisResult ? VERDICT_CONFIG[analysisResult.verdictType] ?? VERDICT_CONFIG.decent : null;

  return (
    <div className="space-y-6 pb-24" data-testid="strategy-advisor-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Strategy Advisor</h1>
            <p className="text-sm text-muted-foreground">Choose a strategy, build your ticket, and we'll tell you exactly how good it is</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Betting Strategies
          </h2>
          <span className="text-[11px] text-muted-foreground">Pick one to guide your ticket building</span>
        </div>

        {templatesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(templatesQuery.data?.templates ?? []).map((t) => (
              <StrategyCard
                key={t.id}
                template={t}
                isSelected={selectedStrategy === t.id}
                onSelect={(id) => setSelectedStrategy(selectedStrategy === id ? "" : id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Ticket Analysis
            {legs.length > 0 && <Badge variant="secondary" className="text-[10px]">{legs.length} leg{legs.length !== 1 ? "s" : ""}</Badge>}
          </h2>
          {legs.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={runAnalysis}
              disabled={analyzeMutation.isPending}
              data-testid="btn-reanalyze"
            >
              {analyzeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Re-analyze
            </Button>
          )}
        </div>

        {legs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Your bet slip is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add picks from Daily Picks, Generate, Props, or the Command Center. Then come back here and we'll analyze your selections and help you build a winning ticket.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs h-7" asChild data-testid="btn-go-daily">
                  <a href="/daily">Daily Picks</a>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" asChild data-testid="btn-go-generate">
                  <a href="/generate">Smart Generator</a>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" asChild data-testid="btn-go-props">
                  <a href="/player-props">Player Props</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : analyzeMutation.isPending && !analysisResult ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your ticket across all engines...</p>
            </CardContent>
          </Card>
        ) : analysisResult ? (
          <div className="space-y-3">
            <Card className={`border ${verdictCfg?.bg ?? ""}`} data-testid="analysis-verdict-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${gradeColor(analysisResult.overallGrade)}`}>
                      {analysisResult.overallGrade}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {verdictCfg && (() => { const VIcon = verdictCfg.icon; return <VIcon className={`w-4 h-4 ${verdictCfg.color}`} />; })()}
                        <span className={`font-semibold text-sm ${verdictCfg?.color ?? ""}`}>
                          {analysisResult.verdictType === "excellent" ? "Excellent Ticket" :
                           analysisResult.verdictType === "good" ? "Good Ticket" :
                           analysisResult.verdictType === "decent" ? "Decent Ticket" :
                           analysisResult.verdictType === "weak" ? "Weak Ticket" : "Poor Ticket"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{analysisResult.verdict}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-background border text-center">
                    <div className="text-[10px] text-muted-foreground">Strategy</div>
                    <div className="text-xs font-semibold mt-0.5">{analysisResult.strategyDetected}</div>
                    <div className="text-[10px] text-muted-foreground">{analysisResult.strategyMatch}% match</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border text-center">
                    <div className="text-[10px] text-muted-foreground">Combined Odds</div>
                    <div className="text-xs font-semibold mt-0.5">{formatOdds(analysisResult.combinedOdds)}</div>
                    <div className="text-[10px] text-muted-foreground">{analysisResult.riskLevel} risk</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border text-center">
                    <div className="text-[10px] text-muted-foreground">Win Probability</div>
                    <div className="text-xs font-semibold mt-0.5">{(analysisResult.estimatedWinProb * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">{legs.length} legs</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border text-center">
                    <div className="text-[10px] text-muted-foreground">Expected Value</div>
                    <div className={`text-xs font-semibold mt-0.5 ${analysisResult.expectedValue >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {analysisResult.expectedValue >= 0 ? "+" : ""}{analysisResult.expectedValue.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Div: {analysisResult.diversificationScore}/100</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(analysisResult.strengths.length > 0 || analysisResult.weaknesses.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisResult.strengths.length > 0 && (
                  <Card>
                    <CardContent className="p-3 space-y-1.5">
                      <h3 className="text-xs font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                      </h3>
                      {analysisResult.strengths.map((s, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">+</span> {s}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {analysisResult.weaknesses.length > 0 && (
                  <Card>
                    <CardContent className="p-3 space-y-1.5">
                      <h3 className="text-xs font-semibold flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Weaknesses
                      </h3>
                      {analysisResult.weaknesses.map((w, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-orange-500 mt-0.5 shrink-0">-</span> {w}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {analysisResult.correlationWarnings.length > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Correlation Warnings
                  </h3>
                  {analysisResult.correlationWarnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">{w}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysisResult.maxTips.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                    <Lightbulb className="w-3.5 h-3.5" /> How to Maximize This Ticket
                  </h3>
                  {analysisResult.maxTips.map((tip, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" /> {tip}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysisResult.suggestions.length > 0 && (
              <Card>
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Improvement Suggestions
                  </h3>
                  {analysisResult.suggestions.map((s, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <ArrowUpRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" /> {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold">Leg-by-Leg Breakdown</h3>
              {analysisResult.legAnalyses.map((la) => (
                <LegAnalysisCard key={la.legId} leg={la} />
              ))}
            </div>

            {analysisResult.bestReplacementPicks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Suggested Upgrades
                </h3>
                <p className="text-[11px] text-muted-foreground">High-graded picks from our engines that could strengthen your ticket</p>
                {analysisResult.bestReplacementPicks.map((pick) => (
                  <ReplacementPickCard key={pick.pickId} pick={pick} onAdd={handleAddReplacement} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {selectedStrategy && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Picks for {templatesQuery.data?.templates.find(t => t.id === selectedStrategy)?.name ?? "Your Strategy"}
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => suggestionsQuery.refetch()}
              disabled={suggestionsQuery.isFetching}
              data-testid="btn-load-suggestions"
            >
              {suggestionsQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {suggestionsQuery.data ? "Refresh" : "Load Picks"}
            </Button>
          </div>

          {suggestionsQuery.isFetching && !suggestionsQuery.data ? (
            <Card>
              <CardContent className="p-6 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Finding picks that match your strategy...</p>
              </CardContent>
            </Card>
          ) : suggestionsQuery.data && suggestionsQuery.data.suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestionsQuery.data.suggestions.map((pick) => (
                <ReplacementPickCard key={pick.pickId} pick={pick} onAdd={handleAddReplacement} />
              ))}
            </div>
          ) : suggestionsQuery.data ? (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">No matching picks available right now. Try a different strategy or check back when more games are scheduled.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
