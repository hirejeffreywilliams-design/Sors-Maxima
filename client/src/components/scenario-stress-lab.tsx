import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, CloudRain, UserX, TrendingDown, Shield, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface ScenarioResult {
  id: string;
  name: string;
  type: "injury" | "weather" | "market" | "lineup";
  affectedLegs: string[];
  probabilityImpact: number;
  evImpact: number;
  newWinProbability: number;
  severity: "minor" | "moderate" | "severe" | "catastrophic";
  hedgeSuggestion?: {
    action: string;
    stake: number;
    expectedSavings: number;
  };
}

interface StressTestSummary {
  worstCaseDrawdown: number;
  averageImpact: number;
  vulnerableLegs: number;
  recommendedHedge: number;
}

interface ScenarioStressLabProps {
  legs: ParlayLeg[];
  stake: number;
  winProbability: number;
}

function runScenarioAnalysis(legs: ParlayLeg[], baseProbability: number): ScenarioResult[] {
  const scenarios: ScenarioResult[] = [];
  
  legs.forEach((leg, idx) => {
    const injuryImpact = 0.3 + Math.random() * 0.4;
    scenarios.push({
      id: `injury-${idx}`,
      name: `Star Player Injury: ${leg.team}`,
      type: "injury",
      affectedLegs: [leg.id],
      probabilityImpact: -injuryImpact,
      evImpact: -injuryImpact * 1.2,
      newWinProbability: Math.max(0.01, baseProbability * (1 - injuryImpact)),
      severity: injuryImpact > 0.5 ? "severe" : injuryImpact > 0.35 ? "moderate" : "minor",
      hedgeSuggestion: {
        action: `Bet opposite ${leg.team} spread`,
        stake: 50 + Math.floor(Math.random() * 100),
        expectedSavings: injuryImpact * 100,
      },
    });
  });
  
  const outdoorLegs = legs.filter(l => 
    l.market === "total" || l.outcome?.toLowerCase().includes("over")
  );
  if (outdoorLegs.length > 0) {
    scenarios.push({
      id: "weather-rain",
      name: "Heavy Rain/Snow Conditions",
      type: "weather",
      affectedLegs: outdoorLegs.map(l => l.id),
      probabilityImpact: -0.25,
      evImpact: -0.3,
      newWinProbability: Math.max(0.01, baseProbability * 0.75),
      severity: outdoorLegs.length > 2 ? "severe" : "moderate",
      hedgeSuggestion: {
        action: "Hedge totals with under bets",
        stake: 75,
        expectedSavings: 35,
      },
    });
    
    scenarios.push({
      id: "weather-wind",
      name: "High Wind Advisory (20+ mph)",
      type: "weather",
      affectedLegs: outdoorLegs.map(l => l.id),
      probabilityImpact: -0.15,
      evImpact: -0.2,
      newWinProbability: Math.max(0.01, baseProbability * 0.85),
      severity: "minor",
    });
  }
  
  scenarios.push({
    id: "market-sharp",
    name: "Sharp Money Moves Against You",
    type: "market",
    affectedLegs: legs.slice(0, Math.ceil(legs.length / 2)).map(l => l.id),
    probabilityImpact: -0.2,
    evImpact: -0.35,
    newWinProbability: Math.max(0.01, baseProbability * 0.8),
    severity: "moderate",
    hedgeSuggestion: {
      action: "Take current cashout if available",
      stake: 0,
      expectedSavings: 20,
    },
  });
  
  scenarios.push({
    id: "market-steam",
    name: "Steam Move on Key Leg",
    type: "market",
    affectedLegs: [legs[0]?.id].filter(Boolean),
    probabilityImpact: -0.15,
    evImpact: -0.25,
    newWinProbability: Math.max(0.01, baseProbability * 0.85),
    severity: "minor",
  });
  
  if (legs.length >= 3) {
    scenarios.push({
      id: "lineup-scratch",
      name: "Late Lineup Changes (Multiple Teams)",
      type: "lineup",
      affectedLegs: legs.slice(0, 3).map(l => l.id),
      probabilityImpact: -0.35,
      evImpact: -0.4,
      newWinProbability: Math.max(0.01, baseProbability * 0.65),
      severity: "severe",
      hedgeSuggestion: {
        action: "Wait for lineups before placing",
        stake: 0,
        expectedSavings: 40,
      },
    });
  }
  
  return scenarios.sort((a, b) => b.probabilityImpact - a.probabilityImpact);
}

function calculateStressSummary(scenarios: ScenarioResult[], stake: number): StressTestSummary {
  const worstScenario = scenarios.reduce((worst, s) => 
    s.probabilityImpact < worst.probabilityImpact ? s : worst
  , scenarios[0]);
  
  const avgImpact = scenarios.reduce((sum, s) => sum + s.probabilityImpact, 0) / scenarios.length;
  const vulnerableLegs = new Set(scenarios.flatMap(s => s.affectedLegs)).size;
  const recommendedHedge = stake * Math.abs(worstScenario?.probabilityImpact || 0) * 0.5;
  
  return {
    worstCaseDrawdown: stake * Math.abs(worstScenario?.probabilityImpact || 0),
    averageImpact: avgImpact,
    vulnerableLegs,
    recommendedHedge,
  };
}

export function ScenarioStressLab({ legs, stake, winProbability }: ScenarioStressLabProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [scenarioFilter, setScenarioFilter] = useState<string>("all");

  const scenarios = useMemo(() => 
    runScenarioAnalysis(legs, winProbability),
    [legs, winProbability]
  );

  const summary = useMemo(() => 
    calculateStressSummary(scenarios, stake),
    [scenarios, stake]
  );

  const filteredScenarios = scenarios.filter(s => 
    scenarioFilter === "all" || s.type === scenarioFilter
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "catastrophic": return "bg-red-600 text-white";
      case "severe": return "bg-red-500 text-white";
      case "moderate": return "bg-orange-500 text-white";
      default: return "bg-yellow-500 text-black";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "injury": return <UserX className="h-4 w-4" />;
      case "weather": return <CloudRain className="h-4 w-4" />;
      case "market": return <TrendingDown className="h-4 w-4" />;
      case "lineup": return <RefreshCw className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (legs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Scenario Stress Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Add legs to run stress tests</p>
            <p className="text-sm">Simulate injuries, weather, and market shocks</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Scenario Stress Lab
          </CardTitle>
          <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="injury">Injuries</SelectItem>
              <SelectItem value="weather">Weather</SelectItem>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="lineup">Lineup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-stress">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-lg font-bold text-red-500">${summary.worstCaseDrawdown.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Worst Case Loss</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{(Math.abs(summary.averageImpact) * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg Impact</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{summary.vulnerableLegs}</p>
            <p className="text-xs text-muted-foreground">Vulnerable Legs</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-blue-500">${summary.recommendedHedge.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Suggested Hedge</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-500">Stress Test Summary</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your parlay has {scenarios.filter(s => s.severity === "severe" || s.severity === "catastrophic").length} severe
            risk scenarios. Consider hedging ${summary.recommendedHedge.toFixed(0)} to protect against worst-case outcomes.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Scenario Analysis ({filteredScenarios.length})</h4>
          
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredScenarios.map((scenario) => (
              <div 
                key={scenario.id}
                className={`p-3 rounded-lg border bg-card cursor-pointer transition-all ${
                  selectedScenario === scenario.id ? "ring-2 ring-primary" : "hover-elevate"
                }`}
                onClick={() => setSelectedScenario(
                  selectedScenario === scenario.id ? null : scenario.id
                )}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(scenario.type)}
                    <span className="font-medium text-sm">{scenario.name}</span>
                  </div>
                  <Badge className={getSeverityColor(scenario.severity)}>
                    {scenario.severity}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Win% Impact:</span>
                    <span className="ml-1 text-red-500 font-medium">
                      {(scenario.probabilityImpact * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New Win%:</span>
                    <span className="ml-1 font-medium">
                      {(scenario.newWinProbability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Legs Hit:</span>
                    <span className="ml-1 font-medium">{scenario.affectedLegs.length}</span>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Impact Severity</span>
                    <span>{(Math.abs(scenario.probabilityImpact) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={Math.abs(scenario.probabilityImpact) * 100} 
                    className="h-1.5"
                  />
                </div>

                {selectedScenario === scenario.id && scenario.hedgeSuggestion && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/30">
                      <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-500">Hedge Recommendation</p>
                        <p className="text-xs text-muted-foreground">{scenario.hedgeSuggestion.action}</p>
                        {scenario.hedgeSuggestion.stake > 0 && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Stake:</span>{" "}
                            <span className="font-medium">${scenario.hedgeSuggestion.stake}</span>
                            <span className="text-muted-foreground"> | Expected Savings:</span>{" "}
                            <span className="font-medium text-green-500">${scenario.hedgeSuggestion.expectedSavings.toFixed(0)}</span>
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" data-testid="button-apply-hedge">Apply</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
