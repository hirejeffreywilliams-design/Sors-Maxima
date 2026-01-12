import { Target, TrendingUp, Zap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParlayBuilder } from "@/components/parlay-builder";

export default function Dashboard() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Parlay Optimizer
          </h1>
          <p className="text-muted-foreground">
            Build smarter parlays with advanced probability analysis and correlation modeling
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Monte Carlo Simulation
                  </p>
                  <p className="text-2xl font-bold font-mono">20,000</p>
                  <p className="text-xs text-muted-foreground">
                    simulations per analysis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Correlation Modeling
                  </p>
                  <p className="text-2xl font-bold font-mono">Gaussian</p>
                  <p className="text-xs text-muted-foreground">
                    copula-based simulation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Kelly Criterion
                  </p>
                  <p className="text-2xl font-bold font-mono">Optimal</p>
                  <p className="text-xs text-muted-foreground">
                    stake sizing strategy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">How it works:</strong>{" "}
                  Add your betting legs below, then click "Analyze" to run a Monte Carlo 
                  simulation that accounts for correlations between outcomes.
                </p>
                <p>
                  The optimizer calculates true win probability, expected value, and 
                  recommends optimal stake sizing using the Kelly Criterion.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ParlayBuilder />

        <footer className="pt-6 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Parlay Optimizer v1.0</span>
              <Badge variant="outline" className="text-xs">
                Beta
              </Badge>
            </div>
            <p>
              For educational purposes only. Please gamble responsibly.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
