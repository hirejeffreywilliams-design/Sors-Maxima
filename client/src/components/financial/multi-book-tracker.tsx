import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, DollarSign,
  Building2, ChevronRight, Atom, PieChart, AlertTriangle
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface Sportsbook {
  id: string;
  name: string;
  balance: number;
  deposited: number;
  withdrawn: number;
  profitLoss: number;
  pendingBets: number;
  lastActivity: Date;
  color: string;
}

const mockSportsbooks: Sportsbook[] = [
  { id: "1", name: "DraftKings", balance: 1250, deposited: 1000, withdrawn: 200, profitLoss: 450, pendingBets: 3, lastActivity: new Date(), color: "bg-green-500" },
  { id: "2", name: "FanDuel", balance: 850, deposited: 500, withdrawn: 0, profitLoss: 350, pendingBets: 1, lastActivity: new Date(Date.now() - 86400000), color: "bg-blue-500" },
  { id: "3", name: "BetMGM", balance: 320, deposited: 500, withdrawn: 100, profitLoss: -80, pendingBets: 0, lastActivity: new Date(Date.now() - 172800000), color: "bg-yellow-500" },
  { id: "4", name: "Caesars", balance: 180, deposited: 200, withdrawn: 0, profitLoss: -20, pendingBets: 2, lastActivity: new Date(Date.now() - 43200000), color: "bg-red-500" },
  { id: "5", name: "PointsBet", balance: 75, deposited: 100, withdrawn: 0, profitLoss: -25, pendingBets: 0, lastActivity: new Date(Date.now() - 604800000), color: "bg-purple-500" },
];

export function MultiBookTracker() {
  const [sportsbooks] = useState<Sportsbook[]>(mockSportsbooks);

  const totalBalance = sportsbooks.reduce((sum, sb) => sum + sb.balance, 0);
  const totalDeposited = sportsbooks.reduce((sum, sb) => sum + sb.deposited, 0);
  const totalWithdrawn = sportsbooks.reduce((sum, sb) => sum + sb.withdrawn, 0);
  const totalPL = sportsbooks.reduce((sum, sb) => sum + sb.profitLoss, 0);
  const totalPending = sportsbooks.reduce((sum, sb) => sum + sb.pendingBets, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Wallet className="w-5 h-5 text-green-500" />
            Multi-Book Tracker
            <QuantumBadge />
          </CardTitle>
          <Button variant="outline" size="sm" data-testid="button-add-sportsbook">
            <Plus className="w-4 h-4 mr-1" />
            Add Book
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-multibook">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">${totalBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lifetime P/L</p>
              <p className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-500" : "text-red-500"}`}>
                {totalPL >= 0 ? "+" : ""}${totalPL.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deposited</p>
              <p className="text-2xl font-bold text-blue-500">${totalDeposited.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Withdrawn</p>
              <p className="text-2xl font-bold text-purple-500">${totalWithdrawn.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">Balance Distribution</span>
            <Badge variant="outline">{totalPending} pending bets</Badge>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden">
            {sportsbooks.map((sb) => (
              <div
                key={sb.id}
                className={`${sb.color} transition-all`}
                style={{ width: `${(sb.balance / totalBalance) * 100}%` }}
                title={`${sb.name}: $${sb.balance}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {sportsbooks.map((sb) => (
              <div key={sb.id} className="flex items-center gap-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${sb.color}`} />
                <span>{sb.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {sportsbooks.map((sb) => (
            <div
              key={sb.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate"
            >
              <div className={`w-10 h-10 rounded-lg ${sb.color} flex items-center justify-center text-white font-bold`}>
                {sb.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sb.name}</span>
                  {sb.pendingBets > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {sb.pendingBets} pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Deposited: ${sb.deposited}</span>
                  {sb.withdrawn > 0 && <span>Withdrawn: ${sb.withdrawn}</span>}
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold">${sb.balance.toLocaleString()}</p>
                <p className={`text-xs flex items-center justify-end gap-1 ${sb.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {sb.profitLoss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {sb.profitLoss >= 0 ? "+" : ""}${sb.profitLoss}
                </p>
              </div>

              <Button size="icon" variant="ghost" data-testid={`button-view-${sb.id}`}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
