import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, Calculator, DollarSign, TrendingUp, Zap,
  AlertTriangle, CheckCircle, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface PendingBet {
  id: string;
  sport: string;
  sportsbook: string;
  stake: number;
  payout: number;
  legs: { team: string; opponent: string; market: string; selection: string; odds: number; result: string }[];
  result: string;
}

export function LiveHedgeCalculator() {
  const { data: pendingBets, isLoading } = useQuery<PendingBet[]>({
    queryKey: ["/api/live/hedge-bets"],
    refetchInterval: 30000,
  });

  const [selectedBet, setSelectedBet] = useState<PendingBet | null>(null);
  const [hedgeAmount, setHedgeAmount] = useState("");
  const [hedgeOdds, setHedgeOdds] = useState("-110");

  const calculateHedge = (bet: PendingBet, amount: number, odds: number) => {
    if (!amount || amount <= 0) return null;
    
    const hedgeDecimalOdds = odds > 0 
      ? (odds / 100) + 1 
      : (100 / Math.abs(odds)) + 1;
    
    const hedgePayout = amount * hedgeDecimalOdds;
    const originalWinScenario = bet.payout - amount;
    const hedgeWinScenario = hedgePayout - bet.stake;
    const guaranteedProfit = Math.min(originalWinScenario, hedgeWinScenario);
    const optimalHedge = Math.round(bet.payout / hedgeDecimalOdds);
    
    return {
      hedgePayout,
      originalWinScenario,
      hedgeWinScenario,
      guaranteedProfit,
      optimalHedge,
    };
  };

  const parsedOdds = parseInt(hedgeOdds) || -110;
  const hedgeCalc = selectedBet && hedgeAmount 
    ? calculateHedge(selectedBet, parseFloat(hedgeAmount), parsedOdds)
    : null;

  const activeBets = (pendingBets || []).filter(b => b.result === "pending");

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-blue-500" />
            Live Hedge Calculator
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Shield className="w-5 h-5 text-blue-500" />
          Live Hedge Calculator
          <QuantumBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Calculate optimal hedge bets for your active wagers in real-time
        </p>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Uses your tracked pending bets. Add bets via the Bet Tracker to see them here.
          </p>
        </div>

        {activeBets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending bets to hedge</p>
            <p className="text-sm mt-1">Track active bets in the Bet Tracker to use the hedge calculator</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-medium text-sm">Pending Bets ({activeBets.length})</p>
            {activeBets.map((bet) => (
              <div
                key={bet.id}
                onClick={() => setSelectedBet(bet)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedBet?.id === bet.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{bet.legs.map(l => l.selection).join(" / ")}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Stake: ${bet.stake}</span>
                      <span>•</span>
                      <span>To Win: ${bet.payout}</span>
                    </div>
                  </div>
                  <Badge variant="outline">{bet.sport}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedBet && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Hedge Amount</span>
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={hedgeAmount}
                  onChange={(e) => setHedgeAmount(e.target.value)}
                  className="w-24 sm:w-32 h-8 sm:h-9 text-sm"
                  data-testid="input-hedge-amount"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Odds</span>
                <Input
                  type="number"
                  value={hedgeOdds}
                  onChange={(e) => setHedgeOdds(e.target.value)}
                  className="w-20 h-8 sm:h-9 text-sm"
                  data-testid="input-hedge-odds"
                />
              </div>
            </div>

            {hedgeCalc && (
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setHedgeAmount(hedgeCalc.optimalHedge.toString())}
                  data-testid="button-optimal-hedge"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Use Optimal: ${hedgeCalc.optimalHedge}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">If Original Wins</p>
                    <p className="text-base sm:text-lg font-bold text-green-500">
                      +${hedgeCalc.originalWinScenario.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">If Hedge Wins</p>
                    <p className="text-base sm:text-lg font-bold text-blue-500">
                      +${hedgeCalc.hedgeWinScenario.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className={`p-2 sm:p-3 rounded-lg ${hedgeCalc.guaranteedProfit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  <div className="flex items-center gap-2">
                    {hedgeCalc.guaranteedProfit >= 0 ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-xs sm:text-base">
                        {hedgeCalc.guaranteedProfit >= 0 ? "Guaranteed Profit" : "Potential Loss"}
                      </p>
                      <p className={`text-xl sm:text-2xl font-bold ${hedgeCalc.guaranteedProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {hedgeCalc.guaranteedProfit >= 0 ? "+" : ""}${hedgeCalc.guaranteedProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
