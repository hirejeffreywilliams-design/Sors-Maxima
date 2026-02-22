import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, TrendingUp, TrendingDown, Target, Trophy,
  DollarSign, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface BetStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  winRate: number;
  bySport: { sport: string; bets: number; wins: number; profit: number; staked: number; roi: number; winRate: number }[];
  byMarket: { market: string; bets: number; wins: number; profit: number; staked: number; roi: number; winRate: number }[];
  byMonth: { period: string; roi: number; profit: number; bets: number }[];
}

export function ROIDashboard() {
  const { data: stats, isLoading } = useQuery<BetStats>({
    queryKey: ["/api/user/bet-stats"],
  });

  const [view, setView] = useState("sport");

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            ROI Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-60 w-full" /></CardContent>
      </Card>
    );
  }

  const s = stats || { totalBets: 0, wins: 0, losses: 0, totalStaked: 0, totalProfit: 0, roi: 0, winRate: 0, bySport: [], byMarket: [], byMonth: [] };

  const bestSport = s.bySport.length > 0 ? s.bySport.reduce((best, curr) => curr.roi > best.roi ? curr : best) : null;
  const worstSport = s.bySport.length > 0 ? s.bySport.reduce((worst, curr) => curr.roi < worst.roi ? curr : worst) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            ROI Dashboard
            <QuantumBadge />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            ROI is calculated from your tracked bets. Add more bets to see detailed breakdowns.
          </p>
        </div>

        {s.totalBets === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No bet data for ROI analysis</p>
            <p className="text-sm mt-1">Track bets in the Bet Tracker to see ROI breakdowns here</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Overall ROI</p>
                <p className={`text-xl font-bold ${s.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {s.roi >= 0 ? "+" : ""}{s.roi.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{s.winRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className={`text-xl font-bold ${s.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {s.totalProfit >= 0 ? "+" : ""}${s.totalProfit.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Total Bets</p>
                <p className="text-xl font-bold">{s.totalBets}</p>
              </div>
            </div>

            {bestSport && worstSport && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Best Performer</span>
                  </div>
                  <p className="text-lg font-bold">{bestSport.sport}</p>
                  <p className="text-sm text-green-500">+{bestSport.roi.toFixed(1)}% ROI</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Needs Work</span>
                  </div>
                  <p className="text-lg font-bold">{worstSport.sport}</p>
                  <p className="text-sm text-red-500">{worstSport.roi.toFixed(1)}% ROI</p>
                </div>
              </div>
            )}

            <Tabs value={view} onValueChange={setView}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sport">By Sport</TabsTrigger>
                <TabsTrigger value="market">By Market</TabsTrigger>
              </TabsList>

              <TabsContent value="sport" className="mt-4 space-y-3">
                {s.bySport.map((data) => (
                  <div key={data.sport} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Badge>{data.sport}</Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{data.bets} bets, {data.wins} wins</span>
                        <span className={`font-bold ${data.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={data.profit >= 0 ? "text-green-500" : "text-red-500"}>
                      {data.profit >= 0 ? "+" : ""}${data.profit.toFixed(0)}
                    </Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="market" className="mt-4 space-y-3">
                {s.byMarket.map((data) => (
                  <div key={data.market} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{data.market}</span>
                        <span className={`font-bold ${data.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{data.bets} bets</span>
                        <span>{data.wins} wins</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={data.profit >= 0 ? "text-green-500" : "text-red-500"}>
                      {data.profit >= 0 ? "+" : ""}${data.profit.toFixed(0)}
                    </Badge>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {s.byMonth.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-3">Monthly Performance</p>
                <div className="space-y-2">
                  {s.byMonth.map((m) => (
                    <div key={m.period} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">{m.period}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{m.bets} bets</span>
                        <span className={`font-bold text-sm ${m.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {m.roi >= 0 ? "+" : ""}{m.roi.toFixed(1)}%
                        </span>
                        <Badge variant="outline" className={`text-xs ${m.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {m.profit >= 0 ? "+" : ""}${m.profit.toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
