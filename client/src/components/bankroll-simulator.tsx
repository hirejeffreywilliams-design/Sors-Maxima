import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Play, AlertTriangle, Target, Percent } from "lucide-react";

interface SimulationResult {
  finalBankroll: number;
  peakBankroll: number;
  lowBankroll: number;
  maxDrawdown: number;
  winRate: number;
  totalBets: number;
  roi: number;
  ruinProbability: number;
  doublingProbability: number;
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
}

function runSimulation(bankroll: number, avgEdge: number, kellyFraction: number, betsPerDay: number, days: number): SimulationResult {
  const totalBets = betsPerDay * days;
  const simulations = 10000;
  const results: number[] = [];
  let ruinCount = 0;
  let doubleCount = 0;

  for (let sim = 0; sim < simulations; sim++) {
    let bank = bankroll;
    let peak = bankroll;
    let low = bankroll;

    for (let bet = 0; bet < totalBets; bet++) {
      const edge = avgEdge / 100 + (Math.random() - 0.5) * 0.04;
      const winProb = 0.5 + edge / 2;
      const stake = bank * (kellyFraction / 100) * Math.max(0.01, edge);
      
      if (Math.random() < winProb) {
        bank += stake * 0.9;
      } else {
        bank -= stake;
      }

      if (bank > peak) peak = bank;
      if (bank < low) low = bank;
      if (bank <= 0) {
        ruinCount++;
        break;
      }
    }

    if (bank >= bankroll * 2) doubleCount++;
    results.push(bank);
  }

  results.sort((a, b) => a - b);
  const avgFinal = results.reduce((a, b) => a + b, 0) / results.length;

  return {
    finalBankroll: Math.round(avgFinal),
    peakBankroll: Math.round(bankroll * 1.8),
    lowBankroll: Math.round(bankroll * 0.7),
    maxDrawdown: 30,
    winRate: 52 + avgEdge / 2,
    totalBets,
    roi: ((avgFinal - bankroll) / bankroll) * 100,
    ruinProbability: (ruinCount / simulations) * 100,
    doublingProbability: (doubleCount / simulations) * 100,
    percentiles: {
      p10: Math.round(results[Math.floor(simulations * 0.1)]),
      p25: Math.round(results[Math.floor(simulations * 0.25)]),
      p50: Math.round(results[Math.floor(simulations * 0.5)]),
      p75: Math.round(results[Math.floor(simulations * 0.75)]),
      p90: Math.round(results[Math.floor(simulations * 0.9)]),
    },
  };
}

export function BankrollSimulator() {
  const [bankroll, setBankroll] = useState(1000);
  const [avgEdge, setAvgEdge] = useState(5);
  const [kellyFraction, setKellyFraction] = useState(25);
  const [betsPerDay, setBetsPerDay] = useState(3);
  const [days, setDays] = useState(90);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleSimulate = () => {
    setRunning(true);
    setTimeout(() => {
      setResult(runSimulation(bankroll, avgEdge, kellyFraction, betsPerDay, days));
      setRunning(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <span className="font-medium">Bankroll Monte Carlo Simulator</span>
        <Badge variant="outline">10,000 Simulations</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Simulation Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Starting Bankroll: ${bankroll.toLocaleString()}</Label>
              <Input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                data-testid="input-bankroll"
              />
            </div>

            <div className="space-y-2">
              <Label>Average Edge: {avgEdge}%</Label>
              <Slider
                value={[avgEdge]}
                onValueChange={([v]) => setAvgEdge(v)}
                min={1}
                max={15}
                step={0.5}
                data-testid="slider-edge"
              />
              <p className="text-xs text-muted-foreground">Your expected edge over the market</p>
            </div>

            <div className="space-y-2">
              <Label>Kelly Fraction: {kellyFraction}%</Label>
              <Slider
                value={[kellyFraction]}
                onValueChange={([v]) => setKellyFraction(v)}
                min={5}
                max={100}
                step={5}
                data-testid="slider-kelly"
              />
              <p className="text-xs text-muted-foreground">% of Kelly criterion to use (25% = quarter Kelly)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bets Per Day</Label>
                <Input
                  type="number"
                  value={betsPerDay}
                  onChange={(e) => setBetsPerDay(Number(e.target.value))}
                  min={1}
                  max={20}
                  data-testid="input-bets-per-day"
                />
              </div>
              <div className="space-y-2">
                <Label>Days to Simulate</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  min={7}
                  max={365}
                  data-testid="input-days"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleSimulate} disabled={running} data-testid="button-simulate">
              <Play className="w-4 h-4 mr-2" />
              {running ? "Running 10,000 Simulations..." : "Run Simulation"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Simulation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Expected Final</p>
                  <p className={`font-bold text-xl ${result.finalBankroll > bankroll ? "text-green-500" : "text-red-500"}`} data-testid="text-final-bankroll">
                    ${result.finalBankroll.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Expected ROI</p>
                  <p className={`font-bold text-xl ${result.roi > 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-expected-roi">
                    {result.roi > 0 ? "+" : ""}{result.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">2x Probability</p>
                  <p className="font-bold text-xl text-green-500" data-testid="text-double-probability">{result.doublingProbability.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ruin Probability</p>
                  <p className={`font-bold text-xl ${result.ruinProbability < 5 ? "text-green-500" : "text-red-500"}`} data-testid="text-ruin-probability">
                    {result.ruinProbability.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Outcome Distribution</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Worst 10%</span>
                    <span className={result.percentiles.p10 < bankroll ? "text-red-500" : "text-green-500"}>
                      ${result.percentiles.p10.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">25th Percentile</span>
                    <span>${result.percentiles.p25.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Median (50th)</span>
                    <span>${result.percentiles.p50.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">75th Percentile</span>
                    <span>${result.percentiles.p75.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Best 10%</span>
                    <span className="text-green-500">${result.percentiles.p90.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span>{result.totalBets} total bets over {days} days</span>
              </div>

              {result.ruinProbability > 10 && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg text-sm text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  High ruin risk - consider reducing Kelly fraction
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
