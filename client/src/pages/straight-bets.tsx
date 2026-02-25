import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Target,
  TrendingUp,
  Zap,
  Loader2,
  Lock,
  ArrowUpDown,
  BarChart3,
  Eye,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Star,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

const sportOptions = [
  { value: "all", label: "All Sports" },
  { value: "NBA", label: "Basketball" },
  { value: "NFL", label: "Football" },
  { value: "MLB", label: "Baseball" },
  { value: "NHL", label: "Hockey" },
  { value: "NCAAB", label: "College Hoops" },
  { value: "NCAAF", label: "College Football" },
];

const betTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Over/Under" },
];

function getTierStyle(tier: string) {
  switch (tier) {
    case "LOCK": return { bg: "bg-green-500", text: "text-white", border: "ring-2 ring-green-500/50" };
    case "STRONG": return { bg: "bg-blue-500", text: "text-white", border: "ring-2 ring-blue-500/30" };
    case "LEAN": return { bg: "bg-yellow-500", text: "text-white", border: "" };
    default: return { bg: "bg-gray-500", text: "text-white", border: "" };
  }
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
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

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-sm font-bold">{pick.confidence}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Edge</p>
            <p className={`text-sm font-bold ${pick.edge > 3 ? "text-green-500" : pick.edge > 0 ? "text-blue-500" : "text-red-500"}`}>{pick.edge}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">True Prob</p>
            <p className="text-sm font-bold">{pick.trueProbability}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Units</p>
            <p className="text-sm font-bold">{pick.unitRecommendation}u</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span>Sharp: {pick.sharpMoney}%</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BarChart3 className="w-3 h-3" />
            <span>Models: {pick.modelAgreement}/5</span>
          </div>
          {pick.steamMove && <Badge variant="destructive" className="text-xs">Steam Move</Badge>}
          {pick.reverseLineMove && <Badge className="bg-amber-500 text-white text-xs">RLM</Badge>}
        </div>

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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
            data-testid={`expand-pick-${pick.id}`}
          >
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button
            size="sm"
            onClick={handleAddToSlip}
            disabled={isInSlip(`straight-${pick.id}`)}
            className="text-xs"
            data-testid={`add-pick-${pick.id}`}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            {isInSlip(`straight-${pick.id}`) ? "In Slip" : "Add to Slip"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StraightBets() {
  useSEO({ title: "Straight Bets", description: "Find and analyze straight bet opportunities" });
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
    <div className="space-y-6" data-testid="straight-bets-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Straight Bets</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Best individual picks ranked by edge and confidence. Moneyline, spread, and totals — no parlays needed.
        </p>
      </div>

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
                  {sportOptions.map(o => (
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
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.meta.totalPicks}</p>
              <p className="text-xs text-muted-foreground">Total Picks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{data.meta.lockCount}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Locks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{data.meta.strongCount}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Strong</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.meta.averageEdge}%</p>
              <p className="text-xs text-muted-foreground">Avg Edge</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Analyzing games...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            Failed to load predictions. Please try again.
          </CardContent>
        </Card>
      )}

      {data?.picks && (
        <div className="space-y-3">
          {data.picks.map((pick: any, idx: number) => (
            <PickCard key={pick.id} pick={pick} rank={idx + 1} />
          ))}
          {data.picks.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No picks found matching your filters. Try adjusting sport or confidence level.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {data?.disclaimer && (
        <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>
      )}
    </div>
  );
}