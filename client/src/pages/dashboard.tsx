import { useState, useCallback } from "react";
import { Target, TrendingUp, Zap, Info, Sparkles, Wrench, BarChart3, ChevronRight, Flame, Shield, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParlayBuilder } from "@/components/parlay-builder";
import { ParlayGenerator } from "@/components/parlay-generator";
import { InsightsPanel } from "@/components/insights-panel";
import { EdgeFinder } from "@/components/edge-finder";
import { useQuery } from "@tanstack/react-query";
import type { ParlayLeg, SportEvent, BankrollSettings } from "@shared/schema";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("generator");
  const [preloadedLegs, setPreloadedLegs] = useState<ParlayLeg[]>([]);
  const [selectedLegs, setSelectedLegs] = useState<ParlayLeg[]>([]);
  const [showInsights, setShowInsights] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>({
    totalBankroll: 1000,
    sessionLimit: 100,
    dailyLimit: 200,
    maxExposurePerTeam: 50,
    maxExposurePerPlayer: 30,
    kellyMultiplier: 0.25,
  });

  const { data: events = [] } = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", "NBA"],
  });

  const handleLoadParlay = useCallback((legs: ParlayLeg[]) => {
    setPreloadedLegs(legs);
    setSelectedLegs(legs);
    setActiveTab("builder");
  }, []);

  const handleLegsChange = useCallback((legs: ParlayLeg[]) => {
    setSelectedLegs(legs);
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate bg-gradient-to-br from-chart-1/5 to-transparent border-chart-1/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-1/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Monte Carlo
                  </p>
                  <p className="text-2xl font-bold font-mono">100K</p>
                  <p className="text-xs text-muted-foreground">
                    simulations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate bg-gradient-to-br from-chart-2/5 to-transparent border-chart-2/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    AI Models
                  </p>
                  <p className="text-2xl font-bold font-mono">14+</p>
                  <p className="text-xs text-muted-foreground">
                    edge finders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate bg-gradient-to-br from-chart-4/5 to-transparent border-chart-4/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Kelly Criterion
                  </p>
                  <p className="text-2xl font-bold font-mono">Optimal</p>
                  <p className="text-xs text-muted-foreground">
                    stake sizing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    +EV Finder
                  </p>
                  <p className="text-2xl font-bold font-mono text-green-500">Live</p>
                  <p className="text-xs text-muted-foreground">
                    scanning markets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInsights(!showInsights)}
                  className="gap-2"
                  data-testid="button-toggle-insights"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showInsights ? "Hide" : "Show"} Insights
                </Button>
              </div>

              <TabsContent value="generator" className="space-y-6">
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground space-y-1">
                        <span>
                          <strong className="text-foreground">Auto Generator:</strong>{" "}
                          Select a sport and let the optimizer find the best parlays automatically.
                          Look for <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mx-1 text-xs no-default-hover-elevate no-default-active-elevate">+EV</Badge> badges 
                          to find value opportunities.
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ParlayGenerator onLoadParlay={handleLoadParlay} onLegsChange={handleLegsChange} />
              </TabsContent>

              <TabsContent value="builder" className="space-y-6">
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground space-y-1">
                        <span>
                          <strong className="text-foreground">Manual Builder:</strong>{" "}
                          Add your own betting legs manually, then click "Analyze" to run a 
                          Monte Carlo simulation that accounts for correlations between outcomes.
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ParlayBuilder 
                  preloadedLegs={preloadedLegs} 
                  onLegsLoaded={() => setPreloadedLegs([])} 
                  onLegsChange={handleLegsChange}
                />
              </TabsContent>
            </Tabs>
            
            <div className="mt-6">
              <EdgeFinder events={events} sport="NBA" />
            </div>
          </div>
          
          {showInsights && (
            <div className="w-96 flex-shrink-0 hidden xl:block">
              <div className="sticky top-6">
                <InsightsPanel
                  events={events}
                  selectedLegs={selectedLegs}
                  bankrollSettings={bankrollSettings}
                  onBankrollChange={setBankrollSettings}
                  totalSpent={totalSpent}
                />
              </div>
            </div>
          )}
        </div>

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
