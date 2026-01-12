import { useState, useMemo } from "react";
import { Shield, Calculator, DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ParlayLeg, ParlayInsurance } from "@shared/schema";

interface ParlayInsuranceFinderProps {
  legs: ParlayLeg[];
  stake: number;
  currentOdds: number;
  legsRemaining?: number;
}

function calculateHedge(
  originalStake: number,
  originalOdds: number,
  hedgeOdds: number,
  legsRemaining: number
): ParlayInsurance {
  const potentialWin = originalStake * originalOdds;
  
  const hedgeStake = potentialWin / hedgeOdds;
  const hedgePayout = hedgeStake * hedgeOdds;
  
  const profitIfOriginalWins = potentialWin - originalStake - hedgeStake;
  const profitIfHedgeWins = hedgePayout - hedgeStake - originalStake;
  
  const guaranteedProfit = Math.min(profitIfOriginalWins, profitIfHedgeWins);
  
  const breakEvenOdds = (originalStake + hedgeStake) / hedgeStake;
  
  const recommendedHedge = guaranteedProfit > 0 && legsRemaining <= 2;

  return {
    hedgeBet: {
      team: "Opposite Side",
      market: "moneyline",
      odds: hedgeOdds,
      stake: Math.round(hedgeStake * 100) / 100,
    },
    guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
    breakEvenOdds: Math.round(breakEvenOdds * 100) / 100,
    recommendedHedge,
    legsRemaining,
  };
}

export function ParlayInsuranceFinder({ 
  legs, 
  stake, 
  currentOdds, 
  legsRemaining = 1 
}: ParlayInsuranceFinderProps) {
  const [hedgeOdds, setHedgeOdds] = useState(2.0);
  const [customHedgeStake, setCustomHedgeStake] = useState<number | null>(null);

  const insurance = useMemo(() => 
    calculateHedge(stake, currentOdds, hedgeOdds, legsRemaining),
    [stake, currentOdds, hedgeOdds, legsRemaining]
  );

  const potentialWin = stake * currentOdds;
  const hedgeStakeUsed = customHedgeStake || insurance.hedgeBet.stake;
  
  const scenarios = useMemo(() => {
    const hedgePayout = hedgeStakeUsed * hedgeOdds;
    return {
      originalWins: {
        payout: potentialWin,
        profit: potentialWin - stake - hedgeStakeUsed,
      },
      hedgeWins: {
        payout: hedgePayout,
        profit: hedgePayout - stake - hedgeStakeUsed,
      },
      noHedge: {
        ifWin: potentialWin - stake,
        ifLose: -stake,
      },
    };
  }, [potentialWin, stake, hedgeStakeUsed, hedgeOdds]);

  const guaranteedWithCustom = Math.min(
    scenarios.originalWins.profit,
    scenarios.hedgeWins.profit
  );

  if (legs.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Parlay Insurance Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Add legs to your parlay to see hedge options</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Parlay Insurance Finder
          {insurance.recommendedHedge && (
            <Badge className="ml-auto bg-emerald-500">
              Hedge Recommended
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Original Stake</div>
            <div className="text-xl font-mono font-bold">${stake}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Potential Win</div>
            <div className="text-xl font-mono font-bold text-emerald-500">
              ${potentialWin.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="font-medium">Hedge Calculator</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hedgeOdds">Hedge Odds (decimal)</Label>
              <Input
                id="hedgeOdds"
                type="number"
                step="0.1"
                min="1.1"
                value={hedgeOdds}
                onChange={(e) => setHedgeOdds(parseFloat(e.target.value) || 2.0)}
                className="font-mono"
                data-testid="input-hedge-odds"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hedgeStake">Hedge Stake ($)</Label>
              <Input
                id="hedgeStake"
                type="number"
                step="1"
                min="0"
                value={customHedgeStake || insurance.hedgeBet.stake}
                onChange={(e) => setCustomHedgeStake(parseFloat(e.target.value) || null)}
                className="font-mono"
                data-testid="input-hedge-stake"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Outcome Scenarios</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Original Parlay Wins</span>
              </div>
              <span className={`font-mono font-bold ${
                scenarios.originalWins.profit >= 0 ? "text-emerald-500" : "text-red-500"
              }`}>
                {scenarios.originalWins.profit >= 0 ? "+" : ""}
                ${scenarios.originalWins.profit.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Hedge Bet Wins</span>
              </div>
              <span className={`font-mono font-bold ${
                scenarios.hedgeWins.profit >= 0 ? "text-emerald-500" : "text-red-500"
              }`}>
                {scenarios.hedgeWins.profit >= 0 ? "+" : ""}
                ${scenarios.hedgeWins.profit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          guaranteedWithCustom > 0 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {guaranteedWithCustom > 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-medium">
                {guaranteedWithCustom > 0 ? "Guaranteed Profit" : "Not Profitable"}
              </span>
            </div>
            <span className={`text-xl font-mono font-bold ${
              guaranteedWithCustom > 0 ? "text-emerald-500" : "text-amber-500"
            }`}>
              {guaranteedWithCustom > 0 ? "+" : ""}${guaranteedWithCustom.toFixed(2)}
            </span>
          </div>
          
          {guaranteedWithCustom <= 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Adjust hedge odds or stake to lock in profit
            </p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Comparison: No Hedge</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">If Win</div>
              <div className="font-mono text-emerald-500">
                +${scenarios.noHedge.ifWin.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">If Lose</div>
              <div className="font-mono text-red-500">
                ${scenarios.noHedge.ifLose.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
