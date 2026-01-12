import { TrendingUp, Percent, DollarSign, BarChart3, Cpu, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EvaluationResult } from "@shared/schema";

interface ProbabilityResultsProps {
  result: EvaluationResult | null;
  stake: number;
  isLoading?: boolean;
}

export function ProbabilityResults({ result, stake, isLoading }: ProbabilityResultsProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Running Monte Carlo Simulation</p>
              <p className="text-sm text-muted-foreground">Calculating win probability...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Add legs to your parlay to see analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const winPercent = result.winProbability * 100;
  const evPercent = result.expectedValue * 100;
  const isPositiveEV = result.expectedValue > 0;

  return (
    <Card className="overflow-hidden" data-testid="card-probability-results">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            <Cpu className="w-3 h-3 mr-1" />
            {result.method === "montecarlo" 
              ? `${(result.simulations || 0).toLocaleString()} sims` 
              : "Analytic"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div className="text-center py-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Win Probability
          </p>
          <div className="text-5xl font-mono font-bold mb-3" data-testid="text-win-probability">
            {winPercent.toFixed(2)}%
          </div>
          <Progress value={winPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="w-4 h-4" />
              Expected Value
            </div>
            <div 
              className={`text-2xl font-mono font-bold ${isPositiveEV ? "text-chart-1" : "text-destructive"}`}
              data-testid="text-expected-value"
            >
              {isPositiveEV ? "+" : ""}{evPercent.toFixed(1)}%
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              Combined Odds
            </div>
            <div className="text-2xl font-mono font-bold" data-testid="text-combined-odds">
              {result.combinedOdds.toFixed(2)}x
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Kelly Stake
            </div>
            <div className="text-2xl font-mono font-bold" data-testid="text-kelly-stake">
              ${result.kellyStake.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optimal bet size
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Potential Return
            </div>
            <div className="text-2xl font-mono font-bold text-chart-1" data-testid="text-potential-return">
              ${result.potentialReturn.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              On ${stake} stake
            </p>
          </div>
        </div>

        {result.legProbabilities.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Individual Leg Probabilities</p>
            <div className="space-y-2">
              {result.legProbabilities.map((prob, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-mono w-8">
                    #{i + 1}
                  </span>
                  <Progress value={prob * 100} className="h-2 flex-1" />
                  <span className="text-sm font-mono w-16 text-right">
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
