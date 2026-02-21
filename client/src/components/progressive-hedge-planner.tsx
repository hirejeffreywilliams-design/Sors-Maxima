import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { LineChart, Shield, DollarSign, TrendingUp, Lock, Target, ChevronRight, Calculator, AlertTriangle } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface HedgeStep {
  legIndex: number;
  legName: string;
  cumulativeOdds: number;
  currentValue: number;
  hedgeAmount: number;
  guaranteedProfit: number;
  maxProfit: number;
  hedgeOdds: number;
  recommendation: "wait" | "hedge_small" | "hedge_medium" | "hedge_large" | "full_hedge";
  timing: string;
}

interface CashoutScenario {
  legsCompleted: number;
  totalLegs: number;
  estimatedCashout: number;
  fairValue: number;
  vig: number;
  recommendation: "take" | "hold" | "partial";
}

interface ProgressiveHedgePlannerProps {
  legs: ParlayLeg[];
  stake: number;
  potentialPayout: number;
}

function calculateHedgeSteps(legs: ParlayLeg[], stake: number, payout: number): HedgeStep[] {
  const steps: HedgeStep[] = [];
  let cumulativeOdds = 1;
  
  legs.forEach((leg, idx) => {
    cumulativeOdds *= leg.decimalOdds || 1.9;
    const currentValue = stake * cumulativeOdds;
    const remainingLegs = legs.length - idx - 1;
    const remainingOdds = legs.slice(idx + 1).reduce((acc, l) => acc * (l.decimalOdds || 1.9), 1);
    
    const hedgeOdds = 1.9 + Math.random() * 0.5;
    const optimalHedge = (currentValue - stake * 1.1) / (hedgeOdds + 1);
    const hedgeAmount = Math.max(0, optimalHedge);
    
    const guaranteedProfit = hedgeAmount > 0 
      ? currentValue - hedgeAmount - stake 
      : 0;
    const maxProfit = payout - stake - hedgeAmount;
    
    let recommendation: HedgeStep["recommendation"] = "wait";
    if (remainingLegs === 0) {
      recommendation = "full_hedge";
    } else if (currentValue > stake * 5) {
      recommendation = "hedge_large";
    } else if (currentValue > stake * 3) {
      recommendation = "hedge_medium";
    } else if (currentValue > stake * 2) {
      recommendation = "hedge_small";
    }
    
    steps.push({
      legIndex: idx,
      legName: `${leg.team} ${leg.market}`,
      cumulativeOdds,
      currentValue,
      hedgeAmount,
      guaranteedProfit,
      maxProfit,
      hedgeOdds,
      recommendation,
      timing: remainingLegs === 1 ? "Final leg - hedge now" : 
              remainingLegs === 0 ? "Parlay complete!" :
              `After leg ${idx + 1} of ${legs.length}`,
    });
  });
  
  return steps;
}

function calculateCashoutScenarios(legs: ParlayLeg[], stake: number, payout: number): CashoutScenario[] {
  const scenarios: CashoutScenario[] = [];
  
  for (let completed = 1; completed <= legs.length; completed++) {
    const completedLegs = legs.slice(0, completed);
    const completedOdds = completedLegs.reduce((acc, l) => acc * (l.decimalOdds || 1.9), 1);
    const fairValue = stake * completedOdds;
    const vig = 0.08 + Math.random() * 0.07;
    const estimatedCashout = fairValue * (1 - vig);
    
    let recommendation: CashoutScenario["recommendation"] = "hold";
    if (vig < 0.1 && completed >= legs.length - 1) {
      recommendation = "take";
    } else if (vig < 0.12) {
      recommendation = "partial";
    }
    
    scenarios.push({
      legsCompleted: completed,
      totalLegs: legs.length,
      estimatedCashout,
      fairValue,
      vig,
      recommendation,
    });
  }
  
  return scenarios;
}

export function ProgressiveHedgePlanner({ legs, stake, potentialPayout }: ProgressiveHedgePlannerProps) {
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [hedgePercentage, setHedgePercentage] = useState(50);

  const hedgeSteps = useMemo(() => 
    calculateHedgeSteps(legs, stake, potentialPayout),
    [legs, stake, potentialPayout]
  );

  const cashoutScenarios = useMemo(() => 
    calculateCashoutScenarios(legs, stake, potentialPayout),
    [legs, stake, potentialPayout]
  );

  const currentStep = hedgeSteps[currentLegIndex] || hedgeSteps[0];
  const adjustedHedge = currentStep ? currentStep.hedgeAmount * (hedgePercentage / 100) : 0;

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "full_hedge": return "bg-red-500 text-white";
      case "hedge_large": return "bg-orange-500 text-white";
      case "hedge_medium": return "bg-yellow-500 text-black";
      case "hedge_small": return "bg-blue-500 text-white";
      default: return "bg-muted";
    }
  };

  const getCashoutColor = (rec: string) => {
    switch (rec) {
      case "take": return "text-green-500";
      case "partial": return "text-yellow-500";
      default: return "text-muted-foreground";
    }
  };

  if (legs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Progressive Hedge Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LineChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Add legs to plan your hedging strategy</p>
            <p className="text-sm">Lock in profits as your parlay progresses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          Progressive Hedge Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-hedge">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        <div className="p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Simulate Progress</span>
            <Badge variant="outline">
              Leg {currentLegIndex + 1} of {legs.length}
            </Badge>
          </div>
          <Slider
            value={[currentLegIndex]}
            onValueChange={([v]) => setCurrentLegIndex(v)}
            min={0}
            max={legs.length - 1}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Start</span>
            <span>All legs hit</span>
          </div>
        </div>

        {currentStep && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
              <div>
                <p className="font-medium">{currentStep.legName}</p>
                <p className="text-sm text-muted-foreground">{currentStep.timing}</p>
              </div>
              <Badge className={getRecommendationColor(currentStep.recommendation)}>
                {currentStep.recommendation.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-2 rounded bg-card text-center">
                <TrendingUp className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-bold">{currentStep.cumulativeOdds.toFixed(2)}x</p>
                <p className="text-xs text-muted-foreground">Current Odds</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <DollarSign className="h-3 w-3 mx-auto mb-1 text-green-500" />
                <p className="text-sm font-bold text-green-500">${currentStep.currentValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Current Value</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <Shield className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                <p className="text-sm font-bold text-blue-500">${currentStep.hedgeAmount.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Optimal Hedge</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <Lock className="h-3 w-3 mx-auto mb-1 text-amber-500" />
                <p className="text-sm font-bold text-amber-500">${currentStep.guaranteedProfit.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Locked Profit</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Hedge Amount: {hedgePercentage}%</span>
                <span className="font-medium">${adjustedHedge.toFixed(2)}</span>
              </div>
              <Slider
                value={[hedgePercentage]}
                onValueChange={([v]) => setHedgePercentage(v)}
                min={0}
                max={100}
                step={10}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>No hedge (max risk)</span>
                <span>Full hedge (lock profit)</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">If you hedge: </span>
                <span className="text-green-500 font-medium">
                  ${(currentStep.guaranteedProfit * (hedgePercentage / 100)).toFixed(0)} guaranteed
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="font-medium">
                  ${(currentStep.maxProfit - adjustedHedge).toFixed(0)} max
                </span>
              </div>
              <Button size="sm" data-testid="button-place-hedge">
                <Calculator className="h-3 w-3 mr-1" />
                Place Hedge
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Cashout Roadmap
          </h4>
          
          <div className="space-y-2">
            {cashoutScenarios.map((scenario, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {scenario.legsCompleted}/{scenario.totalLegs}
                  </Badge>
                  <span className="text-muted-foreground">legs hit</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">${scenario.estimatedCashout.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">
                      {(scenario.vig * 100).toFixed(1)}% vig
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${getCashoutColor(scenario.recommendation)}`}>
                    {scenario.recommendation.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Hedge Timeline</h4>
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
            {hedgeSteps.map((step, idx) => (
              <div 
                key={idx}
                className={`relative pl-6 pb-3 ${idx === currentLegIndex ? "opacity-100" : "opacity-60"}`}
              >
                <div className={`absolute left-0 w-4 h-4 rounded-full border-2 ${
                  idx < currentLegIndex ? "bg-green-500 border-green-500" :
                  idx === currentLegIndex ? "bg-primary border-primary" :
                  "bg-background border-muted-foreground"
                }`} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{step.legName}</p>
                    <p className="text-xs text-muted-foreground">
                      Value: ${step.currentValue.toFixed(0)} | Hedge: ${step.hedgeAmount.toFixed(0)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
