import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Calculator, DollarSign, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LegCard } from "./leg-card";
import { AddLegForm } from "./add-leg-form";
import { ProbabilityResults } from "./probability-results";
import { CorrelationMatrix } from "./correlation-matrix";
import { apiRequest } from "@/lib/queryClient";
import type { ParlayLeg, EvaluationResult, InsertParlayLeg, BettingEnvironment } from "@shared/schema";

interface ParlayBuilderProps {
  preloadedLegs?: ParlayLeg[];
  onLegsLoaded?: () => void;
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

export function ParlayBuilder({ preloadedLegs, onLegsLoaded, onLegsChange, onStakeChange, onResultChange, bankroll = 1000, bettingEnv = defaultBettingEnv }: ParlayBuilderProps) {
  const [legs, setLegs] = useState<ParlayLeg[]>([]);
  
  useEffect(() => {
    onLegsChange?.(legs);
  }, [legs, onLegsChange]);
  
  const [stake, setStake] = useState(10);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  
  useEffect(() => {
    onStakeChange?.(stake);
  }, [stake, onStakeChange]);
  
  useEffect(() => {
    onResultChange?.(result);
  }, [result, onResultChange]);

  useEffect(() => {
    if (preloadedLegs && preloadedLegs.length > 0) {
      setLegs(preloadedLegs);
      setResult(null);
      onLegsLoaded?.();
    }
  }, [preloadedLegs, onLegsLoaded]);

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/evaluate", {
        legs,
        stake,
        simulations: 20000,
      });
      const data = await response.json();
      return data as EvaluationResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleAddLeg = useCallback((legData: InsertParlayLeg) => {
    const newLeg: ParlayLeg = {
      ...legData,
      id: crypto.randomUUID(),
    };
    setLegs((prev) => [...prev, newLeg]);
    setResult(null);
  }, []);

  const handleRemoveLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((leg) => leg.id !== id));
    setResult(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setLegs([]);
    setResult(null);
  }, []);

  const handleEvaluate = useCallback(() => {
    if (legs.length >= 2) {
      evaluateMutation.mutate();
    }
  }, [legs.length, evaluateMutation]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Parlay Builder
              </CardTitle>
              {legs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-destructive"
                  data-testid="button-clear-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {legs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ListChecks className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No legs added yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your parlay by adding betting legs
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-3">
                  {legs.map((leg, index) => (
                    <LegCard
                      key={leg.id}
                      leg={leg}
                      onRemove={handleRemoveLeg}
                      index={index}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            <AddLegForm onAdd={handleAddLeg} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="stake" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Stake Amount
                </Label>
                <Input
                  id="stake"
                  type="number"
                  min={1}
                  value={stake}
                  onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                  data-testid="input-stake"
                />
              </div>
              <Button
                size="lg"
                onClick={handleEvaluate}
                disabled={legs.length < 2 || evaluateMutation.isPending}
                className="min-w-[140px]"
                data-testid="button-evaluate"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {evaluateMutation.isPending ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
            {legs.length < 2 && legs.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Add at least 2 legs to analyze your parlay
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <ProbabilityResults
          result={result}
          stake={stake}
          isLoading={evaluateMutation.isPending}
          bankroll={bankroll}
          bettingEnv={bettingEnv}
        />
        
        <CorrelationMatrix
          matrix={result?.correlationMatrix}
          legCount={legs.length}
        />
      </div>
    </div>
  );
}
