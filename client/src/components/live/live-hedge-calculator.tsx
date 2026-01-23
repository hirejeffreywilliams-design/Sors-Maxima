import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Shield, Calculator, DollarSign, TrendingUp, Zap,
  AlertTriangle, CheckCircle, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface ActiveBet {
  id: string;
  description: string;
  originalStake: number;
  potentialPayout: number;
  currentLiveOdds: number;
  hedgeOdds: number;
  status: "winning" | "losing" | "push";
}

const mockActiveBets: ActiveBet[] = [
  { id: "1", description: "Chiefs ML (Original: -150)", originalStake: 150, potentialPayout: 250, currentLiveOdds: -280, hedgeOdds: +240, status: "winning" },
  { id: "2", description: "Lakers -5.5 (Original: -110)", originalStake: 110, potentialPayout: 210, currentLiveOdds: +120, hedgeOdds: -130, status: "losing" },
];

export function LiveHedgeCalculator() {
  const [activeBets] = useState<ActiveBet[]>(mockActiveBets);
  const [selectedBet, setSelectedBet] = useState<ActiveBet | null>(null);
  const [hedgeAmount, setHedgeAmount] = useState("");

  const calculateHedge = (bet: ActiveBet, amount: number) => {
    if (!amount || amount <= 0) return null;
    
    const hedgeDecimalOdds = bet.hedgeOdds > 0 
      ? (bet.hedgeOdds / 100) + 1 
      : (100 / Math.abs(bet.hedgeOdds)) + 1;
    
    const hedgePayout = amount * hedgeDecimalOdds;
    const originalWinScenario = bet.potentialPayout - amount;
    const hedgeWinScenario = hedgePayout - bet.originalStake;
    const guaranteedProfit = Math.min(originalWinScenario, hedgeWinScenario);
    
    return {
      hedgePayout,
      originalWinScenario,
      hedgeWinScenario,
      guaranteedProfit,
      optimalHedge: Math.round(bet.potentialPayout / hedgeDecimalOdds),
    };
  };

  const hedgeCalc = selectedBet && hedgeAmount 
    ? calculateHedge(selectedBet, parseFloat(hedgeAmount))
    : null;

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

        <div className="space-y-3">
          <p className="font-medium text-sm">Active Bets</p>
          {activeBets.map((bet) => (
            <div
              key={bet.id}
              onClick={() => setSelectedBet(bet)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedBet?.id === bet.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover-elevate"
              } ${
                bet.status === "winning" ? "bg-green-500/5" : bet.status === "losing" ? "bg-red-500/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{bet.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Stake: ${bet.originalStake}</span>
                    <span>•</span>
                    <span>To Win: ${bet.potentialPayout}</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={bet.status === "winning" ? "bg-green-500" : bet.status === "losing" ? "bg-red-500" : "bg-yellow-500"}>
                    {bet.status.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hedge: {bet.hedgeOdds > 0 ? "+" : ""}{bet.hedgeOdds}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedBet && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Hedge Amount</span>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={hedgeAmount}
                  onChange={(e) => setHedgeAmount(e.target.value)}
                  className="w-32"
                  data-testid="input-hedge-amount"
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
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs text-muted-foreground">If Original Wins</p>
                    <p className="text-lg font-bold text-green-500">
                      +${hedgeCalc.originalWinScenario.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground">If Hedge Wins</p>
                    <p className="text-lg font-bold text-blue-500">
                      +${hedgeCalc.hedgeWinScenario.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${hedgeCalc.guaranteedProfit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  <div className="flex items-center gap-2">
                    {hedgeCalc.guaranteedProfit >= 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {hedgeCalc.guaranteedProfit >= 0 ? "Guaranteed Profit" : "Potential Loss"}
                      </p>
                      <p className={`text-2xl font-bold ${hedgeCalc.guaranteedProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
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
