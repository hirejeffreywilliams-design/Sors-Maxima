import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, TrendingUp, Calculator, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";

interface ParlayLeg {
  id: string;
  description: string;
  odds: number;
  status: "pending" | "won" | "lost";
  correlation: number;
}

interface HedgeScenario {
  hedgeAmount: number;
  hedgeOdds: number;
  guaranteedProfit: number;
  maxProfit: number;
  breakEven: boolean;
  correlationAdjustment: number;
}

function calculateHedge(
  originalStake: number,
  currentOdds: number,
  hedgeOdds: number,
  correlationFactor: number
): HedgeScenario {
  const potentialPayout = originalStake * (currentOdds / 100 + 1);
  const adjustedHedgeOdds = hedgeOdds * (1 - correlationFactor * 0.1);
  const hedgeAmount = potentialPayout / (adjustedHedgeOdds / 100 + 1);
  const guaranteedProfit = potentialPayout - hedgeAmount - originalStake;
  const maxProfit = potentialPayout - originalStake;

  return {
    hedgeAmount: Math.round(hedgeAmount * 100) / 100,
    hedgeOdds: Math.round(adjustedHedgeOdds),
    guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
    maxProfit: Math.round(maxProfit * 100) / 100,
    breakEven: guaranteedProfit > 0,
    correlationAdjustment: Math.round(correlationFactor * 10),
  };
}

export function CorrelationHedgeCalculator() {
  const [originalStake, setOriginalStake] = useState(100);
  const [legs, setLegs] = useState<ParlayLeg[]>([
    { id: "1", description: "Chiefs -3.5", odds: -110, status: "won", correlation: 0 },
    { id: "2", description: "Bills ML", odds: -145, status: "won", correlation: 0.15 },
    { id: "3", description: "Over 48.5 (KC/LV)", odds: -110, status: "pending", correlation: 0.25 },
    { id: "4", description: "Mahomes O285.5 Pass Yds", odds: -115, status: "pending", correlation: 0.35 },
  ]);
  const [hedgeOdds, setHedgeOdds] = useState(-110);

  const wonLegs = legs.filter(l => l.status === "won");
  const pendingLegs = legs.filter(l => l.status === "pending");
  
  const currentOdds = legs.reduce((acc, leg) => {
    if (leg.status !== "lost") {
      const decimal = leg.odds > 0 ? leg.odds / 100 + 1 : 100 / Math.abs(leg.odds) + 1;
      return acc * decimal;
    }
    return acc;
  }, 1);
  
  const currentOddsAmerican = Math.round((currentOdds - 1) * 100);
  const avgCorrelation = pendingLegs.reduce((acc, leg) => acc + leg.correlation, 0) / Math.max(1, pendingLegs.length);
  
  const hedge = calculateHedge(originalStake, currentOddsAmerican, hedgeOdds, avgCorrelation);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <span className="font-medium">Correlation-Aware Hedge Calculator</span>
        <Badge variant="outline">Smart Hedging</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Parlay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Original Stake</Label>
              <Input
                type="number"
                value={originalStake}
                onChange={(e) => setOriginalStake(Number(e.target.value))}
                data-testid="input-original-stake"
              />
            </div>

            <div className="space-y-2">
              {legs.map((leg, i) => (
                <div 
                  key={leg.id} 
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    leg.status === "won" ? "bg-green-500/10 border border-green-500/30" :
                    leg.status === "lost" ? "bg-red-500/10 border border-red-500/30" :
                    "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {leg.status === "won" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {leg.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />}
                    <span className="text-sm">{leg.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {leg.odds > 0 ? "+" : ""}{leg.odds}
                    </Badge>
                    {leg.correlation > 0 && (
                      <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">
                        {(leg.correlation * 100).toFixed(0)}% corr
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Current Odds</p>
                <p className="font-bold text-lg">+{currentOddsAmerican}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Potential Payout</p>
                <p className="font-bold text-lg text-green-500">
                  ${Math.round(originalStake * currentOdds)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hedge Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hedge Odds (Opposite Bet)</Label>
              <Input
                type="number"
                value={hedgeOdds}
                onChange={(e) => setHedgeOdds(Number(e.target.value))}
                data-testid="input-hedge-odds"
              />
              <p className="text-xs text-muted-foreground">Enter the odds for the opposing bet</p>
            </div>

            {avgCorrelation > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Correlation Detected</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your pending legs have {(avgCorrelation * 100).toFixed(0)}% avg correlation. 
                  Hedge amounts adjusted to account for correlated outcomes.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Optimal Hedge</p>
                <p className="font-bold text-xl">${hedge.hedgeAmount}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Adjusted Odds</p>
                <p className="font-bold text-xl">{hedge.hedgeOdds}</p>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Locked-In Profit</span>
                <span className={`font-bold text-lg ${hedge.guaranteedProfit > 0 ? "text-green-500" : "text-red-500"}`}>
                  ${hedge.guaranteedProfit > 0 ? "+" : ""}{hedge.guaranteedProfit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">If Parlay Wins</span>
                <span className="font-bold text-green-500">${hedge.maxProfit}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Correlation Adjustment</span>
                <span>{hedge.correlationAdjustment}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Legs</span>
                <span>{pendingLegs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Won Legs</span>
                <span className="text-green-500">{wonLegs.length}</span>
              </div>
            </div>

            <Button className="w-full" data-testid="button-place-hedge">
              <DollarSign className="w-4 h-4 mr-2" />
              Lock In ${hedge.guaranteedProfit > 0 ? hedge.guaranteedProfit : 0} Profit
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
