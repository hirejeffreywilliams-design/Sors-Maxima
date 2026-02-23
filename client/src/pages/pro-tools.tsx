import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calculator,
  Target,
  DollarSign,
  ArrowRightLeft,
  Zap,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const sports = [
  { id: "NBA", name: "NBA", color: "bg-orange-500" },
  { id: "NFL", name: "NFL", color: "bg-green-600" },
  { id: "MLB", name: "MLB", color: "bg-red-500" },
  { id: "NHL", name: "NHL", color: "bg-blue-500" },
];

interface TicketResult {
  id: string;
  name: string;
  winProbability: number;
  americanOdds: number;
  expectedValue: number;
  evPercent?: number;
  recommendedStake: number;
  potentialPayout: number;
  legs: { id: string; outcome: string; americanOdds: number; decimalOdds: number }[];
  grade: string;
}

function formatOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

function americanToImpliedProb(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

function WhatIfTab() {
  const { toast } = useToast();
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [playerOut, setPlayerOut] = useState("");
  const [totalMove, setTotalMove] = useState<string>("");
  const [spreadMove, setSpreadMove] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [beforeTickets, setBeforeTickets] = useState<TicketResult[]>([]);
  const [afterTickets, setAfterTickets] = useState<TicketResult[]>([]);

  const handleRecalculate = async () => {
    if (!selectedSport) {
      toast({ title: "Select a sport", description: "Please choose a sport before recalculating.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const baseRes = await apiRequest("POST", "/api/generate-tickets", {
        sports: [selectedSport],
        bankroll: 1000,
        riskLevel: "moderate",
        maxLegs: 4,
        includeProps: true,
      });
      const baseData = await baseRes.json();
      setBeforeTickets(baseData.tickets || []);

      const modifiedBankroll = 1000 + spreadMove * 50;
      const modifiedRes = await apiRequest("POST", "/api/generate-tickets", {
        sports: [selectedSport],
        bankroll: modifiedBankroll,
        riskLevel: spreadMove > 2 ? "aggressive" : spreadMove < -2 ? "conservative" : "moderate",
        maxLegs: 4,
        includeProps: true,
        whatIf: {
          playerOut: playerOut || undefined,
          totalMove: totalMove ? parseFloat(totalMove) : undefined,
          spreadMove,
        },
      });
      const modifiedData = await modifiedRes.json();
      setAfterTickets(modifiedData.tickets || []);

      toast({ title: "Scenario calculated", description: "Before/after comparison ready." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to recalculate.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="tab-whatif-content">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Select a sport</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sports.map((s) => (
            <Button
              key={s.id}
              variant={selectedSport === s.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSport(s.id)}
              data-testid={`button-sport-whatif-${s.id}`}
            >
              {s.name}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">What if <span className="text-primary">[Player]</span> is OUT?</label>
            <Input
              placeholder="e.g. LeBron James"
              value={playerOut}
              onChange={(e) => setPlayerOut(e.target.value)}
              data-testid="input-player-out"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What if the total moves to <span className="text-primary">[X]</span>?</label>
            <Input
              type="number"
              placeholder="e.g. 215.5"
              value={totalMove}
              onChange={(e) => setTotalMove(e.target.value)}
              data-testid="input-total-move"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">What if the spread moves by <span className="text-primary">[X]</span> points?</label>
              <Badge variant="outline" data-testid="badge-spread-value">{spreadMove > 0 ? `+${spreadMove}` : spreadMove}</Badge>
            </div>
            <Slider
              min={-5}
              max={5}
              step={0.5}
              value={[spreadMove]}
              onValueChange={(v) => setSpreadMove(v[0])}
              data-testid="slider-spread-move"
            />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>-5</span>
              <span>0</span>
              <span>+5</span>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleRecalculate}
            disabled={isLoading || !selectedSport}
            data-testid="button-recalculate"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recalculate
          </Button>
        </CardContent>
      </Card>

      {(beforeTickets.length > 0 || afterTickets.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="whatif-comparison">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              Before (Baseline)
            </h3>
            {beforeTickets.slice(0, 3).map((t) => (
              <Card key={t.id} data-testid={`card-before-${t.id}`}>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate" data-testid={`text-before-name-${t.id}`}>{t.name}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs" data-testid={`badge-before-odds-${t.id}`}>{formatOdds(t.americanOdds)}</Badge>
                    <span className="text-xs text-muted-foreground">Win: {(t.winProbability * 100).toFixed(0)}%</span>
                    <span className={`text-xs font-medium ${(t.evPercent ?? t.expectedValue * 100) >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-before-ev-${t.id}`}>
                      EV: {((t.evPercent ?? t.expectedValue * 100) >= 0 ? "+" : "")}{(t.evPercent ?? t.expectedValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Payout: ${t.potentialPayout.toFixed(0)}</p>
                </CardContent>
              </Card>
            ))}
            {beforeTickets.length === 0 && <p className="text-sm text-muted-foreground">No baseline tickets</p>}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              After (Scenario)
            </h3>
            {afterTickets.slice(0, 3).map((t) => (
              <Card key={t.id} data-testid={`card-after-${t.id}`}>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate" data-testid={`text-after-name-${t.id}`}>{t.name}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs" data-testid={`badge-after-odds-${t.id}`}>{formatOdds(t.americanOdds)}</Badge>
                    <span className="text-xs text-muted-foreground">Win: {(t.winProbability * 100).toFixed(0)}%</span>
                    <span className={`text-xs font-medium ${(t.evPercent ?? t.expectedValue * 100) >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-after-ev-${t.id}`}>
                      EV: {((t.evPercent ?? t.expectedValue * 100) >= 0 ? "+" : "")}{(t.evPercent ?? t.expectedValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Payout: ${t.potentialPayout.toFixed(0)}</p>
                </CardContent>
              </Card>
            ))}
            {afterTickets.length === 0 && <p className="text-sm text-muted-foreground">No scenario tickets</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ParlayOptimizerTab() {
  const { toast } = useToast();
  const [targetPayout, setTargetPayout] = useState(1000);
  const [maxLegs, setMaxLegs] = useState(4);
  const [selectedSport, setSelectedSport] = useState<string>("NBA");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TicketResult | null>(null);

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      const derivedBankroll = Math.round(targetPayout / 10);
      const res = await apiRequest("POST", "/api/generate-tickets", {
        sports: [selectedSport],
        bankroll: derivedBankroll,
        riskLevel: maxLegs <= 3 ? "conservative" : maxLegs <= 5 ? "moderate" : "aggressive",
        maxLegs,
        includeProps: true,
        targetPayout,
      });
      const data = await res.json();
      const tickets: TicketResult[] = data.tickets || [];
      if (tickets.length > 0) {
        setResult(tickets[0]);
        toast({ title: "Parlay optimized", description: "Best combination found." });
      } else {
        setResult(null);
        toast({ title: "No results", description: "Could not find an optimal parlay. Try adjusting parameters.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to optimize parlay.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="tab-parlay-content">
      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Target Payout</label>
              <Badge variant="outline" data-testid="badge-target-payout">${targetPayout.toLocaleString()}</Badge>
            </div>
            <Slider
              min={100}
              max={10000}
              step={100}
              value={[targetPayout]}
              onValueChange={(v) => setTargetPayout(v[0])}
              data-testid="slider-target-payout"
            />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>$100</span>
              <span>$5,000</span>
              <span>$10,000</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Legs</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Button
                  key={n}
                  variant={maxLegs === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMaxLegs(n)}
                  data-testid={`button-maxlegs-${n}`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sport</label>
            <div className="flex items-center gap-2 flex-wrap">
              {sports.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedSport === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSport(s.id)}
                  data-testid={`button-sport-parlay-${s.id}`}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleOptimize}
            disabled={isLoading}
            data-testid="button-optimize"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Optimize
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card data-testid="card-parlay-result">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" data-testid="text-parlay-name">{result.name}</h3>
              <Badge className="text-xs">{result.grade}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">Probability</p>
                <p className="text-lg font-bold text-green-500" data-testid="text-parlay-prob">
                  {(result.winProbability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">Required Stake</p>
                <p className="text-lg font-bold" data-testid="text-parlay-stake">
                  ${result.recommendedStake.toFixed(0)}
                </p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">EV</p>
                <p className={`text-lg font-bold ${(result.evPercent ?? result.expectedValue * 100) >= 0 ? "text-green-500" : "text-red-400"}`} data-testid="text-parlay-ev">
                  {((result.evPercent ?? result.expectedValue * 100) >= 0 ? "+" : "")}{(result.evPercent ?? result.expectedValue * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground">Combined Odds</p>
                <p className="text-xl font-bold" data-testid="text-parlay-odds">{formatOdds(result.americanOdds)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Potential Payout</p>
                <p className="text-xl font-bold text-green-500" data-testid="text-parlay-payout">${result.potentialPayout.toFixed(0)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legs</p>
              {result.legs.map((leg, i) => (
                <div key={leg.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg" data-testid={`parlay-leg-${i}`}>
                  <span className="text-sm truncate" data-testid={`text-parlay-leg-outcome-${i}`}>{leg.outcome}</span>
                  <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-parlay-leg-odds-${i}`}>{formatOdds(leg.americanOdds)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CashOutTab() {
  const [originalStake, setOriginalStake] = useState<string>("100");
  const [originalOdds, setOriginalOdds] = useState<string>("+200");
  const [currentOdds, setCurrentOdds] = useState<string>("+150");
  const [legsRemaining, setLegsRemaining] = useState<string>("2");
  const [calculated, setCalculated] = useState(false);

  const parseAmerican = (str: string): number => {
    const cleaned = str.replace(/[^0-9+-]/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const stake = parseFloat(originalStake) || 0;
  const origOdds = parseAmerican(originalOdds);
  const currOdds = parseAmerican(currentOdds);
  const legs = parseInt(legsRemaining, 10) || 1;

  const origDecimal = americanToDecimal(origOdds);
  const currDecimal = americanToDecimal(currOdds);

  const originalPayout = stake * origDecimal;
  const currentTicketValue = stake * (origDecimal / currDecimal);
  const cashOutRate = 0.85 - (legs * 0.02);
  const cashOutValue = currentTicketValue * Math.max(cashOutRate, 0.70);
  const impliedProb = americanToImpliedProb(currOdds);
  const holdEV = originalPayout * impliedProb;

  const recommendation = cashOutValue > holdEV ? "Cash Out" : "Let It Ride";
  const evDiff = holdEV - cashOutValue;

  const getReasoning = () => {
    if (recommendation === "Cash Out") {
      return `The cash-out value ($${cashOutValue.toFixed(2)}) exceeds the expected value of holding ($${holdEV.toFixed(2)}). With ${legs} leg${legs > 1 ? "s" : ""} remaining, the risk-adjusted return favors locking in profit now.`;
    }
    return `The expected value of letting it ride ($${holdEV.toFixed(2)}) exceeds the cash-out offer ($${cashOutValue.toFixed(2)}) by $${evDiff.toFixed(2)}. The remaining odds suggest positive expected value if you hold.`;
  };

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="space-y-6" data-testid="tab-cashout-content">
      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Original Stake ($)</label>
              <Input
                type="number"
                value={originalStake}
                onChange={(e) => { setOriginalStake(e.target.value); setCalculated(false); }}
                placeholder="100"
                data-testid="input-original-stake"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Original Odds</label>
              <Input
                value={originalOdds}
                onChange={(e) => { setOriginalOdds(e.target.value); setCalculated(false); }}
                placeholder="+200"
                data-testid="input-original-odds"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Odds</label>
              <Input
                value={currentOdds}
                onChange={(e) => { setCurrentOdds(e.target.value); setCalculated(false); }}
                placeholder="+150"
                data-testid="input-current-odds"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Legs Remaining</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={legsRemaining}
                onChange={(e) => { setLegsRemaining(e.target.value); setCalculated(false); }}
                placeholder="2"
                data-testid="input-legs-remaining"
              />
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleCalculate}
            disabled={!stake || !origOdds || !currOdds}
            data-testid="button-calculate-cashout"
          >
            <Calculator className="w-4 h-4" />
            Calculate
          </Button>
        </CardContent>
      </Card>

      {calculated && stake > 0 && origOdds !== 0 && currOdds !== 0 && (
        <div className="space-y-4" data-testid="cashout-results">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Ticket Value</p>
                <p className="text-lg font-bold" data-testid="text-ticket-value">${currentTicketValue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Cash-Out Value</p>
                <p className="text-lg font-bold text-yellow-500" data-testid="text-cashout-value">${cashOutValue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Hold EV</p>
                <p className="text-lg font-bold text-green-500" data-testid="text-hold-ev">${holdEV.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className={recommendation === "Cash Out" ? "border-yellow-500/30" : "border-green-500/30"} data-testid="card-recommendation">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Recommendation</h3>
                <Badge
                  className={`gap-1 ${recommendation === "Cash Out" ? "bg-yellow-500 text-black" : "bg-green-500 text-white"}`}
                  data-testid="badge-recommendation"
                >
                  {recommendation === "Cash Out" ? (
                    <DollarSign className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {recommendation}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-reasoning">{getReasoning()}</p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Original Payout</p>
                  <p className="text-sm font-bold" data-testid="text-original-payout">${originalPayout.toFixed(2)}</p>
                </div>
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Implied Win %</p>
                  <p className="text-sm font-bold" data-testid="text-implied-prob">{(impliedProb * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ProTools() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6" data-testid="page-pro-tools">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Zap className="w-6 h-6 text-primary" />
          Pro Tools
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="text-page-description">
          Advanced betting analysis and scenario planning tools
        </p>
      </div>

      <Tabs defaultValue="whatif" data-testid="tabs-pro-tools">
        <TabsList className="w-full" data-testid="tabs-list">
          <TabsTrigger value="whatif" className="flex-1 gap-1.5" data-testid="tab-trigger-whatif">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="hidden sm:inline">What-If</span>
          </TabsTrigger>
          <TabsTrigger value="parlay" className="flex-1 gap-1.5" data-testid="tab-trigger-parlay">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Parlay Optimizer</span>
          </TabsTrigger>
          <TabsTrigger value="cashout" className="flex-1 gap-1.5" data-testid="tab-trigger-cashout">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Cash-Out Calc</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatif">
          <WhatIfTab />
        </TabsContent>
        <TabsContent value="parlay">
          <ParlayOptimizerTab />
        </TabsContent>
        <TabsContent value="cashout">
          <CashOutTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
