import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FlaskConical, TrendingUp, TrendingDown, RefreshCw, Zap } from "lucide-react";

interface SimulationLeg {
  id: string;
  name: string;
  odds: number;
  probability: number;
  enabled: boolean;
}

interface SimulationResult {
  originalEV: number;
  modifiedEV: number;
  evChange: number;
  originalWinProb: number;
  modifiedWinProb: number;
  probChange: number;
  recommendation: string;
}

export function WhatIfSimulator() {
  const [legs, setLegs] = useState<SimulationLeg[]>([
    { id: "1", name: "Knicks ML", odds: 1.85, probability: 54, enabled: true },
    { id: "2", name: "Chiefs -3.5", odds: 1.91, probability: 52, enabled: true },
    { id: "3", name: "Over 228.5", odds: 1.87, probability: 53, enabled: true },
    { id: "4", name: "Eagles -4", odds: 1.95, probability: 51, enabled: true },
  ]);
  const [stake, setStake] = useState(25);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const toggleLeg = (id: string) => {
    setLegs(prev => prev.map(leg => 
      leg.id === id ? { ...leg, enabled: !leg.enabled } : leg
    ));
  };

  const adjustProbability = (id: string, newProb: number) => {
    setLegs(prev => prev.map(leg => 
      leg.id === id ? { ...leg, probability: newProb } : leg
    ));
  };

  const simulate = () => {
    const enabledLegs = legs.filter(l => l.enabled);
    const allLegs = legs;
    
    const originalCombinedOdds = allLegs.reduce((acc, l) => acc * l.odds, 1);
    const modifiedCombinedOdds = enabledLegs.reduce((acc, l) => acc * l.odds, 1);
    
    const originalWinProb = allLegs.reduce((acc, l) => acc * (l.probability / 100), 1) * 100;
    const modifiedWinProb = enabledLegs.reduce((acc, l) => acc * (l.probability / 100), 1) * 100;
    
    const originalEV = (originalWinProb / 100 * originalCombinedOdds - 1) * 100;
    const modifiedEV = (modifiedWinProb / 100 * modifiedCombinedOdds - 1) * 100;
    
    let recommendation = "";
    if (modifiedEV > originalEV + 5) {
      recommendation = "Strong improvement - consider this modification";
    } else if (modifiedEV > originalEV) {
      recommendation = "Slight improvement in EV";
    } else if (modifiedEV < originalEV - 5) {
      recommendation = "Significant EV reduction - not recommended";
    } else {
      recommendation = "Minimal impact on expected value";
    }

    setResult({
      originalEV: Math.round(originalEV * 10) / 10,
      modifiedEV: Math.round(modifiedEV * 10) / 10,
      evChange: Math.round((modifiedEV - originalEV) * 10) / 10,
      originalWinProb: Math.round(originalWinProb * 10) / 10,
      modifiedWinProb: Math.round(modifiedWinProb * 10) / 10,
      probChange: Math.round((modifiedWinProb - originalWinProb) * 10) / 10,
      recommendation,
    });
  };

  const reset = () => {
    setLegs(prev => prev.map(l => ({ ...l, enabled: true, probability: 52 })));
    setResult(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-chart-4" />
            What-If Simulator
          </CardTitle>
          <Button variant="outline" size="sm" onClick={reset} data-testid="button-reset-sim">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {legs.map((leg) => (
            <div
              key={leg.id}
              className={`p-3 rounded-lg border transition-opacity ${
                leg.enabled 
                  ? "bg-muted/50 border-border" 
                  : "bg-muted/20 border-border/50 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={leg.enabled}
                    onChange={() => toggleLeg(leg.id)}
                    className="rounded"
                    data-testid={`checkbox-leg-${leg.id}`}
                  />
                  <span className="font-medium text-sm">{leg.name}</span>
                </div>
                <Badge variant="outline">{leg.odds.toFixed(2)}x</Badge>
              </div>
              
              {leg.enabled && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Win Probability</span>
                    <span className="font-mono">{leg.probability}%</span>
                  </div>
                  <Slider
                    value={[leg.probability]}
                    onValueChange={([val]) => adjustProbability(leg.id, val)}
                    min={30}
                    max={80}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="sim-stake" className="text-xs">Stake ($)</Label>
          <Input
            id="sim-stake"
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            data-testid="input-sim-stake"
          />
        </div>

        <Button onClick={simulate} className="w-full gap-2" data-testid="button-run-sim">
          <Zap className="w-4 h-4" />
          Run Simulation
        </Button>

        {result && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Original EV</p>
                <p className={`text-lg font-bold ${result.originalEV >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.originalEV >= 0 ? "+" : ""}{result.originalEV}%
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Modified EV</p>
                <p className={`text-lg font-bold ${result.modifiedEV >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.modifiedEV >= 0 ? "+" : ""}{result.modifiedEV}%
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">EV Change</span>
                <div className={`flex items-center gap-1 ${result.evChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.evChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-bold">{result.evChange >= 0 ? "+" : ""}{result.evChange}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Win Prob Change</span>
                <div className={`flex items-center gap-1 ${result.probChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.probChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-bold">{result.probChange >= 0 ? "+" : ""}{result.probChange}%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-chart-4/10 border border-chart-4/30 rounded-lg text-sm">
              {result.recommendation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
