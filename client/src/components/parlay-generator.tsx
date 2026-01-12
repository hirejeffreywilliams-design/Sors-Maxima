import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  ChevronRight,
  Shield,
  Zap,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { Sport, GeneratedParlay, ParlayLeg } from "@shared/schema";
import { sports } from "@shared/schema";

interface ParlayGeneratorProps {
  onLoadParlay: (legs: ParlayLeg[]) => void;
}

const riskIcons = {
  conservative: Shield,
  moderate: Target,
  aggressive: Flame,
};

const riskColors = {
  low: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

export function ParlayGenerator({ onLoadParlay }: ParlayGeneratorProps) {
  const [sport, setSport] = useState<Sport>("NBA");
  const [stake, setStake] = useState(10);
  const [minLegs, setMinLegs] = useState(2);
  const [maxLegs, setMaxLegs] = useState(4);
  const [bankroll, setBankroll] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [results, setResults] = useState<GeneratedParlay[] | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-parlays", {
        sport,
        stake,
        minLegs,
        maxLegs,
        bankroll,
        riskLevel,
        topN: 5,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setResults(data.parlays);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const RiskIcon = riskIcons[riskLevel];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-chart-4" />
            Advanced Parlay Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
                <SelectTrigger data-testid="select-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={riskLevel}
                onValueChange={(v) => setRiskLevel(v as typeof riskLevel)}
              >
                <SelectTrigger data-testid="select-risk-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Conservative
                    </div>
                  </SelectItem>
                  <SelectItem value="moderate">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Moderate
                    </div>
                  </SelectItem>
                  <SelectItem value="aggressive">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Aggressive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stake Amount</Label>
              <Input
                type="number"
                min={1}
                value={stake}
                onChange={(e) => setStake(parseFloat(e.target.value) || 10)}
                className="font-mono"
                data-testid="input-generator-stake"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <Label>Parlay Size: {minLegs} - {maxLegs} legs</Label>
            </div>
            <div className="px-2">
              <Slider
                value={[minLegs, maxLegs]}
                onValueChange={([min, max]) => {
                  setMinLegs(min);
                  setMaxLegs(max);
                }}
                min={2}
                max={6}
                step={1}
                data-testid="slider-leg-count"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 legs (safer)</span>
              <span>6 legs (higher payout)</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bankroll</Label>
              <Input
                type="number"
                min={1}
                value={bankroll}
                onChange={(e) => setBankroll(parseFloat(e.target.value) || 1000)}
                className="font-mono"
                data-testid="input-bankroll"
              />
              <p className="text-xs text-muted-foreground">
                Used for Kelly criterion stake sizing
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-generate-parlays"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing {sport} Games...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Optimal Parlays
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generateMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold">Running Monte Carlo Simulations</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing correlations and finding optimal combinations...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && !generateMutation.isPending && (
        <Card data-testid="card-generated-results">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-chart-4" />
                Top {results.length} Recommended Parlays
              </CardTitle>
              <Badge variant="outline" className="font-mono">
                {sport}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                {results.map((parlay, index) => (
                  <Card
                    key={parlay.id}
                    className="hover-elevate overflow-hidden"
                    data-testid={`card-generated-parlay-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {parlay.legs.length}-Leg Parlay
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={riskColors[parlay.riskRating]}
                              >
                                {parlay.riskRating} risk
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onLoadParlay(parlay.legs)}
                          data-testid={`button-load-parlay-${index}`}
                        >
                          Load
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Target className="w-3 h-3" />
                            Win Prob
                          </div>
                          <p className="text-lg font-mono font-bold">
                            {(parlay.winProbability * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="w-3 h-3" />
                            Expected Value
                          </div>
                          <p
                            className={`text-lg font-mono font-bold ${
                              parlay.expectedValue > 0
                                ? "text-chart-1"
                                : "text-destructive"
                            }`}
                          >
                            {parlay.expectedValue > 0 ? "+" : ""}
                            {(parlay.expectedValue * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Combined Odds
                          </div>
                          <p className="text-lg font-mono font-bold">
                            {parlay.combinedOdds.toFixed(2)}x
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Potential Return
                          </div>
                          <p className="text-lg font-mono font-bold text-chart-1">
                            ${parlay.potentialReturn.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Picks:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {parlay.legs.map((leg, legIndex) => (
                            <Badge
                              key={leg.id}
                              variant="secondary"
                              className="font-normal"
                            >
                              {leg.team} - {leg.outcome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && !generateMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold">No optimal parlays found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your settings or selecting a different sport
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
