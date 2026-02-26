import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, DollarSign, Target, ArrowUpRight, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ROIResult {
  currentHitRate: number;
  improvedHitRate: number;
  edgeUplift: number;
  currentMonthlyPL: number;
  improvedMonthlyPL: number;
  monthlyUplift: number;
  annualUplift: number;
  subscriptionCost: number;
  netROI: number;
  roiMultiple: number;
  breakEvenBets: number;
  recommendation: string;
}

export function ROIUpliftCalculator() {
  const [monthlyBets, setMonthlyBets] = useState(50);
  const [avgStake, setAvgStake] = useState(25);
  const [currentHitRate, setCurrentHitRate] = useState(45);
  const [tier, setTier] = useState("pro");
  const [result, setResult] = useState<ROIResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/roi-calculator", {
        monthlyBets, avgStake, currentHitRate: currentHitRate / 100, subscriptionTier: tier,
      });
      setResult(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" /> ROI Uplift Calculator
        </CardTitle>
        <CardDescription>See how much value your subscription delivers based on your betting activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monthly Bets</Label>
            <div className="flex items-center gap-2">
              <Slider value={[monthlyBets]} onValueChange={([v]) => setMonthlyBets(v)} min={10} max={200} step={5} className="flex-1" />
              <span className="text-sm font-mono w-10 text-right">{monthlyBets}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Avg Stake ($)</Label>
            <Input type="number" value={avgStake} onChange={e => setAvgStake(Number(e.target.value))} min={5} max={500} data-testid="input-avg-stake" />
          </div>
          <div className="space-y-2">
            <Label>Current Hit Rate (%)</Label>
            <div className="flex items-center gap-2">
              <Slider value={[currentHitRate]} onValueChange={([v]) => setCurrentHitRate(v)} min={30} max={60} step={1} className="flex-1" />
              <span className="text-sm font-mono w-10 text-right">{currentHitRate}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subscription Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger data-testid="select-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pro">Sharp ($49/mo)</SelectItem>
                <SelectItem value="elite">Edge ($99/mo)</SelectItem>
                <SelectItem value="whale">Max ($249/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={calculate} disabled={loading} className="w-full" data-testid="button-calculate-roi">
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
          Calculate ROI
        </Button>

        {result && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Hit Rate Boost</div>
                <div className="text-lg font-bold text-green-500">+{(result.edgeUplift * 100).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">{(result.currentHitRate * 100).toFixed(0)}% → {(result.improvedHitRate * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Monthly Uplift</div>
                <div className={`text-lg font-bold ${result.monthlyUplift >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${result.monthlyUplift.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Annual Uplift</div>
                <div className={`text-lg font-bold ${result.annualUplift >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${result.annualUplift.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">ROI Multiple</div>
                <div className="text-lg font-bold">{result.roiMultiple.toFixed(1)}x</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
              <Badge variant={result.netROI > 0 ? "default" : "destructive"}>
                {result.netROI > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <Target className="w-3 h-3 mr-1" />}
                Net ROI: ${result.netROI.toFixed(2)}/mo
              </Badge>
              <span className="text-xs text-muted-foreground flex-1">{result.recommendation}</span>
              <span className="text-xs text-muted-foreground">Break-even: {result.breakEvenBets} bets</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
