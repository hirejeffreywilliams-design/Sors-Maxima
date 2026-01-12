import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Calculator } from "lucide-react";

interface VarianceResult {
  expectedProfit: number;
  standardDeviation: number;
  worstCase: number;
  bestCase: number;
  ruinProbability: number;
  breakEvenBets: number;
}

export function VarianceCalculator() {
  const [bankroll, setBankroll] = useState(1000);
  const [avgOdds, setAvgOdds] = useState(2.0);
  const [winRate, setWinRate] = useState(52);
  const [avgStake, setAvgStake] = useState(25);
  const [numBets, setNumBets] = useState(100);
  const [result, setResult] = useState<VarianceResult | null>(null);

  const calculate = () => {
    const p = winRate / 100;
    const q = 1 - p;
    const ev = (p * avgOdds) - 1;
    const variance = (avgOdds - 1) ** 2 * p * q;
    const stdDev = Math.sqrt(variance * numBets) * avgStake;
    
    const expectedProfit = ev * avgStake * numBets;
    const worstCase = expectedProfit - 2 * stdDev;
    const bestCase = expectedProfit + 2 * stdDev;
    
    const edge = ev * 100;
    const ruinProb = edge <= 0 ? 100 : Math.max(0, Math.min(100, (1 - edge / 10) * 100 * (avgStake / bankroll)));
    const breakEven = Math.ceil(Math.abs(worstCase) / (ev * avgStake));

    setResult({
      expectedProfit: Math.round(expectedProfit),
      standardDeviation: Math.round(stdDev),
      worstCase: Math.round(worstCase),
      bestCase: Math.round(bestCase),
      ruinProbability: Math.round(ruinProb * 10) / 10,
      breakEvenBets: breakEven,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-chart-2" />
          Variance Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="var-bankroll" className="text-xs">Bankroll ($)</Label>
            <Input
              id="var-bankroll"
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              data-testid="input-var-bankroll"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="var-stake" className="text-xs">Avg Stake ($)</Label>
            <Input
              id="var-stake"
              type="number"
              value={avgStake}
              onChange={(e) => setAvgStake(Number(e.target.value))}
              data-testid="input-var-stake"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="var-odds" className="text-xs">Avg Decimal Odds</Label>
            <Input
              id="var-odds"
              type="number"
              step="0.1"
              value={avgOdds}
              onChange={(e) => setAvgOdds(Number(e.target.value))}
              data-testid="input-var-odds"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="var-winrate" className="text-xs">Win Rate (%)</Label>
            <Input
              id="var-winrate"
              type="number"
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
              data-testid="input-var-winrate"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="var-bets" className="text-xs">Number of Bets</Label>
            <Input
              id="var-bets"
              type="number"
              value={numBets}
              onChange={(e) => setNumBets(Number(e.target.value))}
              data-testid="input-var-bets"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full gap-2" data-testid="button-calculate-variance">
          <Calculator className="w-4 h-4" />
          Calculate Variance
        </Button>

        {result && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Expected Profit</p>
                <p className={`text-xl font-bold ${result.expectedProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.expectedProfit >= 0 ? "+" : ""}${result.expectedProfit}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Std Deviation</p>
                <p className="text-xl font-bold">${result.standardDeviation}</p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 text-center">95% Confidence Range</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-red-500">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-mono font-bold">${result.worstCase}</span>
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-mono font-bold">+${result.bestCase}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-lg text-center ${
                result.ruinProbability > 20 ? "bg-red-500/10 border border-red-500/30" : "bg-muted/50"
              }`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  <p className="text-xs text-muted-foreground">Ruin Risk</p>
                </div>
                <p className={`text-lg font-bold ${result.ruinProbability > 20 ? "text-red-500" : ""}`}>
                  {result.ruinProbability}%
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Break Even</p>
                <p className="text-lg font-bold">{result.breakEvenBets} bets</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
