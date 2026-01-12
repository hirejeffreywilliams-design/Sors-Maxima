import { useState, useCallback } from "react";
import { Target, TrendingUp, Zap, Info, Sparkles, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParlayBuilder } from "@/components/parlay-builder";
import { ParlayGenerator } from "@/components/parlay-generator";
import type { ParlayLeg } from "@shared/schema";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("generator");
  const [preloadedLegs, setPreloadedLegs] = useState<ParlayLeg[]>([]);

  const handleLoadParlay = useCallback((legs: ParlayLeg[]) => {
    setPreloadedLegs(legs);
    setActiveTab("builder");
  }, []);

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generator" className="gap-2" data-testid="tab-generator">
              <Sparkles className="w-4 h-4" />
              Auto Generator
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2" data-testid="tab-builder">
              <Wrench className="w-4 h-4" />
              Manual Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong className="text-foreground">Auto Generator:</strong>{" "}
                      Select a sport and let the optimizer find the best parlays automatically.
                      The algorithm analyzes all available games and runs Monte Carlo simulations
                      to find the highest expected value combinations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ParlayGenerator onLoadParlay={handleLoadParlay} />
          </TabsContent>

          <TabsContent value="builder" className="space-y-6">
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong className="text-foreground">Manual Builder:</strong>{" "}
                      Add your own betting legs manually, then click "Analyze" to run a 
                      Monte Carlo simulation that accounts for correlations between outcomes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ParlayBuilder preloadedLegs={preloadedLegs} onLegsLoaded={() => setPreloadedLegs([])} />
          </TabsContent>
        </Tabs>

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
