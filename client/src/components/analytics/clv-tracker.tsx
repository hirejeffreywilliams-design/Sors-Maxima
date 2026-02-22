import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, TrendingUp, TrendingDown, Target, Trophy,
  Clock, Zap, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface CLVEntry {
  id: string;
  game: string;
  market: string;
  selection: string;
  openingOdds: number;
  currentOdds: number;
  clvPercent: number;
  direction: "positive" | "negative" | "neutral";
  sport: string;
  timestamp: string;
}

export function CLVTracker() {
  const { data: clvData, isLoading } = useQuery<CLVEntry[]>({
    queryKey: ["/api/live/clv"],
    refetchInterval: 60000,
  });

  const [timeframe, setTimeframe] = useState("all");
  const data = clvData || [];

  const avgCLV = data.length > 0 ? data.reduce((sum, d) => sum + d.clvPercent, 0) / data.length : 0;
  const positiveCLV = data.filter(d => d.clvPercent > 0).length;
  const beatingClosing = data.length > 0 ? (positiveCLV / data.length) * 100 : 0;

  const positiveEntries = data.filter(d => d.direction === "positive");
  const negativeEntries = data.filter(d => d.direction === "negative");

  const avgPositive = positiveEntries.length > 0 
    ? positiveEntries.reduce((sum, d) => sum + d.clvPercent, 0) / positiveEntries.length 
    : 0;
  const avgNegative = negativeEntries.length > 0 
    ? negativeEntries.reduce((sum, d) => sum + d.clvPercent, 0) / negativeEntries.length 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="w-5 h-5 text-blue-500" />
            Closing Line Value (CLV) Tracker
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
          <Info className="w-4 h-4 shrink-0" />
          <span>CLV is tracked from odds movements. Place bets and track odds to populate this view.</span>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <p className="text-sm text-muted-foreground mb-2">What is CLV?</p>
          <p className="text-xs text-muted-foreground">
            CLV measures whether you're getting better odds than the market closing line. 
            Consistently positive CLV indicates sharp betting and long-term profitability.
          </p>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LineChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No CLV data tracked yet</p>
            <p className="text-sm mt-1">As you place bets and odds move, CLV will be tracked automatically</p>
          </div>
        ) : (
          <>
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
                  <span className="text-xs sm:text-sm font-medium">Positive CLV</span>
                </div>
                <p className="text-base sm:text-xl font-bold text-green-500">+{avgPositive.toFixed(1)}%</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  <span className="text-xs sm:text-sm font-medium">Negative CLV</span>
                </div>
                <p className="text-base sm:text-xl font-bold text-red-500">{avgNegative.toFixed(1)}%</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-sm mb-3">Recent Entries</p>
              <div className="space-y-2">
                {data.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {entry.sport && <Badge>{entry.sport}</Badge>}
                      <div>
                        <p className="font-medium text-sm">{entry.market || entry.selection}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Open: {entry.openingOdds > 0 ? "+" : ""}{entry.openingOdds}</span>
                          <span>→</span>
                          <span>Current: {entry.currentOdds > 0 ? "+" : ""}{entry.currentOdds}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${entry.clvPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {entry.clvPercent >= 0 ? "+" : ""}{entry.clvPercent}% CLV
                      </p>
                      <Badge variant="outline" className={
                        entry.direction === "positive" ? "text-green-500" : 
                        entry.direction === "negative" ? "text-red-500" : "text-yellow-500"
                      }>
                        {entry.direction.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
