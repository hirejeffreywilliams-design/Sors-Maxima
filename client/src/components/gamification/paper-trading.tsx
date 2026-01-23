import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gamepad2, DollarSign, TrendingUp, TrendingDown, RefreshCw,
  Trophy, Target, History, Zap, Atom, Play
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface PaperBet {
  id: string;
  pick: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: "pending" | "won" | "lost";
  placedAt: Date;
  settledAt?: Date;
}

interface PaperAccount {
  balance: number;
  initialBalance: number;
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  profitLoss: number;
  roi: number;
}

const mockAccount: PaperAccount = {
  balance: 1250,
  initialBalance: 1000,
  totalBets: 45,
  wins: 26,
  losses: 17,
  pending: 2,
  profitLoss: 250,
  roi: 25,
};

const mockBets: PaperBet[] = [
  { id: "1", pick: "Chiefs -3.5", odds: -110, stake: 50, potentialPayout: 95.45, status: "pending", placedAt: new Date() },
  { id: "2", pick: "Lakers ML", odds: -150, stake: 75, potentialPayout: 125, status: "pending", placedAt: new Date(Date.now() - 3600000) },
  { id: "3", pick: "Over 48.5 (Bills/Dolphins)", odds: -105, stake: 50, potentialPayout: 97.62, status: "won", placedAt: new Date(Date.now() - 86400000), settledAt: new Date(Date.now() - 43200000) },
  { id: "4", pick: "Celtics -5.5", odds: -110, stake: 100, potentialPayout: 190.91, status: "won", placedAt: new Date(Date.now() - 172800000), settledAt: new Date(Date.now() - 129600000) },
  { id: "5", pick: "Warriors +3", odds: +110, stake: 50, potentialPayout: 105, status: "lost", placedAt: new Date(Date.now() - 259200000), settledAt: new Date(Date.now() - 216000000) },
];

export function PaperTrading() {
  const [account, setAccount] = useState<PaperAccount>(mockAccount);
  const [bets, setBets] = useState<PaperBet[]>(mockBets);
  const [newStake, setNewStake] = useState("25");
  const [view, setView] = useState("dashboard");

  const resetAccount = () => {
    setAccount({
      ...account,
      balance: 1000,
      totalBets: 0,
      wins: 0,
      losses: 0,
      pending: 0,
      profitLoss: 0,
      roi: 0,
    });
    setBets([]);
  };

  const pendingBets = bets.filter(b => b.status === "pending");
  const settledBets = bets.filter(b => b.status !== "pending");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Gamepad2 className="w-5 h-5 text-purple-500" />
            Paper Trading
            <QuantumBadge />
          </CardTitle>
          <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/30">
            <Play className="w-3 h-3" />
            Practice Mode
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Virtual Balance</p>
              <p className="text-3xl font-bold">${account.balance.toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetAccount} data-testid="button-reset-account">
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className={`text-lg font-bold ${account.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                {account.profitLoss >= 0 ? "+" : ""}${account.profitLoss}
              </p>
              <p className="text-xs text-muted-foreground">P/L</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${account.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {account.roi >= 0 ? "+" : ""}{account.roi}%
              </p>
              <p className="text-xs text-muted-foreground">ROI</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{account.wins}-{account.losses}</p>
              <p className="text-xs text-muted-foreground">Record</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{account.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingBets.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium mb-3">Quick Bet</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="number"
                  placeholder="Stake"
                  value={newStake}
                  onChange={(e) => setNewStake(e.target.value)}
                  className="w-24"
                  data-testid="input-paper-stake"
                />
                <div className="flex gap-1 flex-wrap flex-1">
                  {[25, 50, 100, 250].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewStake(amount.toString())}
                      data-testid={`button-stake-${amount}`}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Add picks from any page to place paper bets
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Win Rate</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {account.totalBets > 0 
                    ? Math.round((account.wins / (account.wins + account.losses)) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Bets</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">{account.totalBets}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingBets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending bets
              </div>
            ) : (
              pendingBets.map((bet) => (
                <div key={bet.id} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bet.pick}</p>
                      <p className="text-sm text-muted-foreground">
                        ${bet.stake} to win ${bet.potentialPayout.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline">{bet.odds > 0 ? "+" : ""}{bet.odds}</Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {settledBets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bet history yet
              </div>
            ) : (
              settledBets.map((bet) => (
                <div 
                  key={bet.id} 
                  className={`p-3 rounded-lg ${
                    bet.status === "won" 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{bet.pick}</p>
                        <Badge className={bet.status === "won" ? "bg-green-500" : "bg-red-500"}>
                          {bet.status === "won" ? "WON" : "LOST"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${bet.stake} {bet.status === "won" ? `→ +$${bet.potentialPayout.toFixed(2)}` : "→ -$" + bet.stake}
                      </p>
                    </div>
                    <Badge variant="outline">{bet.odds > 0 ? "+" : ""}{bet.odds}</Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
