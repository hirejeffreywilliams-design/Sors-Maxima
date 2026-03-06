import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { TierGate } from "@/components/tier-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  TrendingUp,
  Target,
  Globe,
  Plus,
  CheckCircle,
  RotateCcw,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VariationLeg {
  id: string;
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
  reasoning: string;
  team: string;
  opponent: string;
  outcome: string;
  market: string;
  addedFrom: string;
  addedAt: string;
  monteCarloData?: ParlaySlipLeg["monteCarloData"];
  factors?: ParlaySlipLeg["factors"];
  gameTime?: string;
  insights?: string[];
  winProbability?: number;
  timing?: "bet_now" | "wait" | "line_locked";
  timingAdvice?: string;
}

interface Variation {
  id: string;
  name: string;
  description: string;
  strategy: "safe" | "balanced" | "high_ev" | "sharp" | "multi_sport";
  legs: VariationLeg[];
  totalDecimalOdds: number;
  americanOdds: string;
  legCount: number;
  sports: string[];
  averageEV: number;
  averageConfidence: number;
}

const STRATEGY_ICONS: Record<string, typeof Shield> = {
  safe: Shield,
  balanced: Target,
  high_ev: TrendingUp,
  sharp: Zap,
  multi_sport: Globe,
};

const STRATEGY_COLORS: Record<string, string> = {
  safe: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
  balanced: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  high_ev: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  sharp: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  multi_sport: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
}

function SportTag({ sport }: { sport: string }) {
  return <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{sport}</span>;
}

function VariationCard({ variation, index }: { variation: Variation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { clearSlip, addLeg, setMobileOpen } = useParlaySlip();
  const { toast } = useToast();
  const Icon = STRATEGY_ICONS[variation.strategy] ?? Target;
  const colorClass = STRATEGY_COLORS[variation.strategy] ?? "";

  const handleLoad = () => {
    clearSlip();
    let added = 0;
    for (const leg of variation.legs) {
      const parlayLeg: ParlaySlipLeg = {
        id: leg.id,
        team: leg.team || leg.game.split(" vs ")[0] || "Team",
        opponent: leg.opponent || leg.game.split(" vs ")[1] || "",
        outcome: leg.outcome || leg.pick,
        game: leg.game,
        market: leg.market || leg.betType,
        type: leg.betType,
        odds: leg.americanOdds,
        decimalOdds: leg.decimalOdds,
        americanOdds: leg.americanOdds,
        sport: leg.sport,
        confidence: leg.confidence,
        evPercent: leg.ev,
        grade: leg.grade,
        edge: leg.edge,
        reasoning: leg.reasoning,
        addedFrom: "variation-engine",
        addedAt: new Date().toISOString(),
        monteCarloData: leg.monteCarloData,
        factors: leg.factors,
        gameTime: leg.gameTime,
        insights: leg.insights,
        winProbability: leg.winProbability,
        timing: leg.timing,
        timingAdvice: leg.timingAdvice,
      };
      if (addLeg(parlayLeg)) added++;
    }
    setLoaded(true);
    setMobileOpen(true);
    toast({
      title: `${variation.name} loaded`,
      description: `${added} legs added to your slip. Combined odds: ${variation.americanOdds}`,
    });
  };

  return (
    <Card className={`border transition-all hover:shadow-md ${loaded ? "ring-2 ring-primary ring-offset-2" : ""}`} data-testid={`variation-card-${variation.strategy}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md border ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">{variation.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{variation.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs font-bold">{variation.americanOdds}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {variation.sports.map(sport => (
            <span key={sport} className="inline-flex items-center gap-1 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full">
              <SportTag sport={sport} />
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground">
            {variation.legCount} legs · Avg EV: {variation.averageEV > 0 ? "+" : ""}{variation.averageEV}% · {variation.averageConfidence}% conf
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <button
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
          onClick={() => setExpanded(e => !e)}
          data-testid={`expand-variation-${variation.strategy}`}
        >
          <span>{expanded ? "Hide legs" : `View ${variation.legCount} legs`}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="space-y-1.5">
            {variation.legs.map((leg, i) => (
              <div key={leg.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/40 border" data-testid={`variation-leg-${index}-${i}`}>
                <div className="text-[11px] shrink-0 w-4 text-muted-foreground">{i + 1}.</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium truncate">{leg.pick}</span>
                    <Badge variant="outline" className={`text-[9px] h-4 px-1 ${gradeColor(leg.grade)}`}>{leg.grade}</Badge>
                    <span className="text-[10px] text-muted-foreground">{leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{leg.game}</div>
                  <div className="flex gap-2 mt-0.5 text-[9px] text-muted-foreground">
                    <span className="text-green-600 dark:text-green-400">+{leg.ev.toFixed(1)}% EV</span>
                    <span>{leg.confidence}% conf</span>
                    <span><SportTag sport={leg.sport} /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full h-8 text-xs gap-1.5"
          variant={loaded ? "outline" : "default"}
          onClick={handleLoad}
          data-testid={`load-variation-${variation.strategy}`}
        >
          {loaded ? (
            <><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Loaded into Slip</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Load this Slip</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SourceTicketPanel({ legs }: { legs: ParlaySlipLeg[] }) {
  if (legs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center space-y-2" data-testid="source-ticket-empty">
        <Info className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">No source ticket loaded</p>
        <p className="text-xs text-muted-foreground">
          Add picks to your bet slip first, then generate variations based on your current picks.
          Or just generate from scratch — the engine will use the strongest available picks.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid="source-ticket-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Current Slip ({legs.length} legs)</span>
        <Badge variant="outline" className="text-[10px]">Source</Badge>
      </div>
      <div className="space-y-1">
        {legs.map((leg, i) => (
          <div key={leg.id} className="flex items-center gap-2 text-xs" data-testid={`source-leg-${i}`}>
            <span className="text-muted-foreground w-4">{i + 1}.</span>
            <span className="font-medium flex-1 truncate">{leg.outcome || leg.game}</span>
            {leg.grade && <Badge variant="outline" className={`text-[9px] h-4 px-1 ${gradeColor(leg.grade)}`}>{leg.grade}</Badge>}
            {leg.sport && <span className="text-muted-foreground"><SportTag sport={leg.sport} /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VariationsContent() {
  const { legs } = useParlaySlip();
  const [variations, setVariations] = useState<Variation[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/tickets/variations", { seedLegs: legs });
      return resp.json();
    },
    onSuccess: (data) => {
      setVariations(data.variations || []);
      setHasGenerated(true);
      if (!data.variations?.length) {
        toast({ title: "No picks available", description: "Check back when more games have been analyzed.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate variations. Try again in a moment.", variant: "destructive" });
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Ticket Variation Engine</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Generates 5 strategically distinct ticket blueprints using the same 46-Factor Model data — each optimized for a different risk/reward profile.
          The engine avoids repeating correlated legs so every variation explores a genuinely different edge.
        </p>
      </div>

      <Separator />

      <SourceTicketPanel legs={legs} />

      <div className="flex items-center gap-3">
        <Button
          className="gap-2 font-bold"
          size="lg"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-variations"
        >
          {generateMutation.isPending ? (
            <><Shuffle className="h-4 w-4 animate-spin" /> Generating...</>
          ) : hasGenerated ? (
            <><RotateCcw className="h-4 w-4" /> Regenerate</>
          ) : (
            <><Shuffle className="h-4 w-4" /> Generate Variations</>
          )}
        </Button>
        {hasGenerated && (
          <p className="text-xs text-muted-foreground">
            {variations.length} strategies generated. Click "Load this Slip" on any card to use it.
          </p>
        )}
      </div>

      {hasGenerated && variations.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="variations-grid">
            {variations.map((variation, i) => (
              <VariationCard key={variation.id} variation={variation} index={i} />
            ))}
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 text-center space-y-1" data-testid="learning-note">
            <p className="text-xs font-medium">Improving With Every Ticket</p>
            <p className="text-xs text-muted-foreground">
              Every variation you choose teaches the model which strategies resonate with your style.
              Over time, the engine weights its recommendations toward the patterns that match how you win.
            </p>
          </div>
        </>
      )}

      {!hasGenerated && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Safe Locks", icon: Shield, color: STRATEGY_COLORS.safe, desc: "A-grade picks, tight odds, high hit rate" },
            { name: "Balanced Value", icon: Target, color: STRATEGY_COLORS.balanced, desc: "Optimal blend of grade quality and EV" },
            { name: "EV Hunter", icon: TrendingUp, color: STRATEGY_COLORS.high_ev, desc: "Pure mathematical edge maximization" },
            { name: "Sharp Money", icon: Zap, color: STRATEGY_COLORS.sharp, desc: "Fades public money, tracks line movement" },
            { name: "Multi-Sport Flex", icon: Globe, color: STRATEGY_COLORS.multi_sport, desc: "One strong pick from each sport, max diversification" },
          ].map(({ name, icon: Icon, color, desc }) => (
            <Card key={name} className="opacity-50 border-dashed" data-testid={`placeholder-${name}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md border ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">{name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-16 rounded-md bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">
                  Click Generate Variations above
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketVariations() {
  return (
    <TierGate
      required="elite"
      label="Ticket Variation Engine"
      description="Generate 5 strategic ticket alternatives with correlation analysis. Available for Edge and Max members."
    >
      <VariationsContent />
    </TierGate>
  );
}
