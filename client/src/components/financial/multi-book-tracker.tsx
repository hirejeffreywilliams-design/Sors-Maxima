import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, DollarSign,
  Building2, ChevronRight, PieChart, Info, Edit2, Check
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Sportsbook {
  id: string;
  name: string;
  balance: number;
  pendingBets: number;
  bonus: number;
  lastUpdated: string;
}

const bookColors: Record<string, string> = {
  DraftKings: "bg-green-500",
  FanDuel: "bg-blue-500",
  BetMGM: "bg-yellow-500",
  Caesars: "bg-red-500",
  PointsBet: "bg-purple-500",
  BetRivers: "bg-cyan-500",
};

export function MultiBookTracker() {
  const { data: sportsbooks = [], isLoading } = useQuery<Sportsbook[]>({
    queryKey: ["/api/user/sportsbooks"],
  });

  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const res = await apiRequest("PATCH", `/api/user/sportsbooks/${id}`, { balance });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/sportsbooks"] });
      setEditingId(null);
      toast({ title: "Balance updated" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/user/sportsbooks", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/sportsbooks"] });
      toast({ title: "Sportsbook added" });
    },
  });

  const totalBalance = sportsbooks.reduce((sum, sb) => sum + sb.balance, 0);
  const totalPending = sportsbooks.reduce((sum, sb) => sum + sb.pendingBets, 0);
  const totalBonus = sportsbooks.reduce((sum, sb) => sum + sb.bonus, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-green-500" />
            Multi-Book Tracker
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-60 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Wallet className="w-5 h-5 text-green-500" />
            Multi-Book Tracker
            <QuantumBadge />
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => addMutation.mutate("New Book")} data-testid="button-add-sportsbook">
            <Plus className="w-4 h-4 mr-1" />
            Add Book
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Click the edit icon to update your sportsbook balances. Your data is stored server-side.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">${totalBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Bets</p>
              <p className="text-2xl font-bold text-amber-500">{totalPending}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bonus Funds</p>
              <p className="text-2xl font-bold text-purple-500">${totalBonus}</p>
            </div>
          </div>
        </div>

        {totalBalance > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Balance Distribution</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              {sportsbooks.filter(sb => sb.balance > 0).map((sb) => (
                <div
                  key={sb.id}
                  className={`${bookColors[sb.name] || "bg-gray-500"} transition-all`}
                  style={{ width: `${(sb.balance / totalBalance) * 100}%` }}
                  title={`${sb.name}: $${sb.balance}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {sportsbooks.map((sb) => (
                <div key={sb.id} className="flex items-center gap-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${bookColors[sb.name] || "bg-gray-500"}`} />
                  <span>{sb.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {sportsbooks.map((sb) => (
            <div key={sb.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className={`w-10 h-10 rounded-lg ${bookColors[sb.name] || "bg-gray-500"} flex items-center justify-center text-white font-bold`}>
                {sb.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sb.name}</span>
                  {sb.pendingBets > 0 && (
                    <Badge variant="outline" className="text-xs">{sb.pendingBets} pending</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(sb.lastUpdated).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                {editingId === sb.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={editBalance}
                      onChange={e => setEditBalance(e.target.value)}
                      className="w-24 h-8 text-sm"
                      data-testid={`input-balance-${sb.id}`}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateMutation.mutate({ id: sb.id, balance: parseFloat(editBalance) || 0 })}>
                      <Check className="w-4 h-4 text-green-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-bold">${sb.balance.toLocaleString()}</p>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(sb.id); setEditBalance(sb.balance.toString()); }} data-testid={`button-edit-${sb.id}`}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
