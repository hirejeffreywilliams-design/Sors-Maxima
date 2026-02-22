import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Gamepad2, DollarSign, TrendingUp, TrendingDown, RefreshCw,
  Trophy, Target, History, Zap, Atom, Play, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PaperBet {
  id: string;
  pick: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: "pending" | "won" | "lost";
  placedAt: string;
  settledAt?: string;
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

export function PaperTrading() {
  const { data: account, isLoading: accountLoading } = useQuery<PaperAccount>({ queryKey: ["/api/user/paper-account"] });
  const { data: bets = [], isLoading: betsLoading } = useQuery<PaperBet[]>({ queryKey: ["/api/user/paper-bets"] });
  const [newStake, setNewStake] = useState("25");
  const [view, setView] = useState("dashboard");

  const placeBetMutation = useMutation({
    mutationFn: async (betData: { pick: string; odds: number; stake: number }) => {
      await apiRequest("POST", "/api/user/paper-bets", betData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/paper-bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/paper-account"] });
    },
  });

  const resolveBetMutation = useMutation({
    mutationFn: async ({ id, result }: { id: string; result: string }) => {
      await apiRequest("PATCH", `/api/user/paper-bets/${id}/resolve`, { result });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/paper-bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/paper-account"] });
    },
  });

  const isLoading = accountLoading || betsLoading;

  const pendingBets = bets.filter(b => b.status === "pending");
  const settledBets = bets.filter(b => b.status !== "pending");

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Gamepad2 className="w-5 h-5 text-purple-500" />
            Paper Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const safeAccount: PaperAccount = account || {
    balance: 0,
    initialBalance: 1000,
    totalBets: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    profitLoss: 0,
    roi: 0,
  };

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
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0" />
          <span>Data source: Live API</span>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Virtual Balance</p>
              <p className="text-3xl font-bold">${safeAccount.balance.toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {}} data-testid="button-reset-account">
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className={`text-lg font-bold ${safeAccount.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                {safeAccount.profitLoss >= 0 ? "+" : ""}${safeAccount.profitLoss}
              </p>
              <p className="text-xs text-muted-foreground">P/L</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${safeAccount.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {safeAccount.roi >= 0 ? "+" : ""}{safeAccount.roi}%
              </p>
              <p className="text-xs text-muted-foreground">ROI</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{safeAccount.wins}-{safeAccount.losses}</p>
              <p className="text-xs text-muted-foreground">Record</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{safeAccount.pending}</p>
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
                  {safeAccount.totalBets > 0 
                    ? Math.round((safeAccount.wins / (safeAccount.wins + safeAccount.losses)) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Bets</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">{safeAccount.totalBets}</p>
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
