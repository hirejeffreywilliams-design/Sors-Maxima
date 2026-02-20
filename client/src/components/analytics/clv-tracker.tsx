import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, TrendingUp, TrendingDown, Target, Trophy,
  Clock, Zap, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface CLVData {
  id: string;
  bet: string;
  placedOdds: number;
  closingOdds: number;
  clv: number;
  result: "win" | "loss" | "pending";
  sport: string;
  date: Date;
}

const mockCLVData: CLVData[] = [
  { id: "1", bet: "Chiefs -3.5", placedOdds: -105, closingOdds: -120, clv: 2.8, result: "win", sport: "NFL", date: new Date() },
  { id: "2", bet: "Lakers ML", placedOdds: -140, closingOdds: -160, clv: 3.2, result: "win", sport: "NBA", date: new Date(Date.now() - 86400000) },
  { id: "3", bet: "Over 48.5 (Bills)", placedOdds: -110, closingOdds: -105, clv: -0.8, result: "loss", sport: "NFL", date: new Date(Date.now() - 172800000) },
  { id: "4", bet: "Celtics -5.5", placedOdds: -108, closingOdds: -125, clv: 3.5, result: "win", sport: "NBA", date: new Date(Date.now() - 259200000) },
  { id: "5", bet: "Rangers ML", placedOdds: +120, closingOdds: +105, clv: 2.4, result: "pending", sport: "NHL", date: new Date() },
  { id: "6", bet: "Warriors +3", placedOdds: -110, closingOdds: -115, clv: 0.9, result: "loss", sport: "NBA", date: new Date(Date.now() - 345600000) },
];

export function CLVTracker() {
  const [data] = useState<CLVData[]>(mockCLVData);
  const [timeframe, setTimeframe] = useState("all");

  const avgCLV = data.reduce((sum, d) => sum + d.clv, 0) / data.length;
  const positiveCLV = data.filter(d => d.clv > 0).length;
  const beatingClosing = (positiveCLV / data.length) * 100;

  const clvByResult = {
    wins: data.filter(d => d.result === "win"),
    losses: data.filter(d => d.result === "loss"),
  };

  const avgCLVWins = clvByResult.wins.length > 0 
    ? clvByResult.wins.reduce((sum, d) => sum + d.clv, 0) / clvByResult.wins.length 
    : 0;
  const avgCLVLosses = clvByResult.losses.length > 0 
    ? clvByResult.losses.reduce((sum, d) => sum + d.clv, 0) / clvByResult.losses.length 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <LineChart className="w-5 h-5 text-blue-500" />
            Closing Line Value (CLV) Tracker
            <QuantumBadge />
          </CardTitle>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32" data-testid="select-clv-timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <p className="text-sm text-muted-foreground mb-2">What is CLV?</p>
          <p className="text-xs text-muted-foreground">
            CLV measures whether you're getting better odds than the market closing line. 
            Consistently positive CLV indicates sharp betting and long-term profitability.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
            <p className={`text-lg sm:text-2xl font-bold ${avgCLV >= 0 ? "text-green-500" : "text-red-500"}`}>
              {avgCLV >= 0 ? "+" : ""}{avgCLV.toFixed(1)}%
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Avg CLV</p>
          </div>
          <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-lg sm:text-2xl font-bold text-blue-500">{beatingClosing.toFixed(0)}%</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Beat Close</p>
          </div>
          <div className="p-2 sm:p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-lg sm:text-2xl font-bold">{data.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Tracked</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
              <span className="text-xs sm:text-sm font-medium">Wins</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-green-500">+{avgCLVWins.toFixed(1)}%</p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              <span className="text-xs sm:text-sm font-medium">Losses</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-red-500">{avgCLVLosses.toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <p className="font-medium text-sm mb-3">Recent Bets</p>
          <div className="space-y-2">
            {data.slice(0, 5).map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge>{bet.sport}</Badge>
                  <div>
                    <p className="font-medium text-sm">{bet.bet}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Placed: {bet.placedOdds > 0 ? "+" : ""}{bet.placedOdds}</span>
                      <span>→</span>
                      <span>Closed: {bet.closingOdds > 0 ? "+" : ""}{bet.closingOdds}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${bet.clv >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {bet.clv >= 0 ? "+" : ""}{bet.clv}% CLV
                  </p>
                  <Badge variant="outline" className={
                    bet.result === "win" ? "text-green-500" : 
                    bet.result === "loss" ? "text-red-500" : "text-yellow-500"
                  }>
                    {bet.result.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {avgCLV > 2 && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-500">You're Beating the Market!</p>
                <p className="text-sm text-muted-foreground">
                  Your average +{avgCLV.toFixed(1)}% CLV indicates sharp betting. Keep it up!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
