import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, TrendingUp, TrendingDown, Target, Trophy,
  DollarSign, Percent, Calendar, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface ROIData {
  category: string;
  bets: number;
  wins: number;
  profit: number;
  roi: number;
  avgOdds: number;
}

const mockROIByBetType: ROIData[] = [
  { category: "Moneyline", bets: 145, wins: 82, profit: 520, roi: 18.5, avgOdds: -125 },
  { category: "Spread", bets: 234, wins: 125, profit: 380, roi: 12.2, avgOdds: -108 },
  { category: "Totals", bets: 189, wins: 98, profit: 210, roi: 8.4, avgOdds: -110 },
  { category: "Player Props", bets: 312, wins: 168, profit: 890, roi: 24.1, avgOdds: -115 },
  { category: "Parlays", bets: 87, wins: 24, profit: 650, roi: 35.2, avgOdds: +450 },
  { category: "Same Game Parlay", bets: 56, wins: 12, profit: -120, roi: -8.5, avgOdds: +380 },
  { category: "Live Bets", bets: 78, wins: 42, profit: 180, roi: 11.2, avgOdds: -105 },
];

const mockROIBySport: ROIData[] = [
  { category: "NFL", bets: 245, wins: 138, profit: 720, roi: 22.4, avgOdds: -112 },
  { category: "NBA", bets: 312, wins: 165, profit: 540, roi: 14.8, avgOdds: -108 },
  { category: "MLB", bets: 189, wins: 95, profit: 280, roi: 9.2, avgOdds: -120 },
  { category: "NHL", bets: 134, wins: 72, profit: 190, roi: 10.5, avgOdds: -115 },
  { category: "NCAAB", bets: 156, wins: 78, profit: -80, roi: -3.2, avgOdds: -110 },
  { category: "NCAAF", bets: 89, wins: 48, profit: 150, roi: 12.1, avgOdds: -108 },
];

const mockROIByTimeframe: { period: string; roi: number; profit: number }[] = [
  { period: "Today", roi: 15.2, profit: 45 },
  { period: "This Week", roi: 8.5, profit: 210 },
  { period: "This Month", roi: 12.3, profit: 680 },
  { period: "Last 3 Months", roi: 14.8, profit: 1850 },
  { period: "YTD", roi: 16.2, profit: 2340 },
  { period: "All Time", roi: 18.5, profit: 4520 },
];

export function ROIDashboard() {
  const [timeframe, setTimeframe] = useState("all");
  const [view, setView] = useState("betType");

  const dataByBetType = mockROIByBetType;
  const dataBySport = mockROIBySport;
  const timeframeData = mockROIByTimeframe;

  const bestPerformer = view === "betType" 
    ? dataByBetType.reduce((best, curr) => curr.roi > best.roi ? curr : best)
    : dataBySport.reduce((best, curr) => curr.roi > best.roi ? curr : best);

  const worstPerformer = view === "betType"
    ? dataByBetType.reduce((worst, curr) => curr.roi < worst.roi ? curr : worst)
    : dataBySport.reduce((worst, curr) => curr.roi < worst.roi ? curr : worst);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            ROI Dashboard
            <QuantumBadge />
          </CardTitle>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36" data-testid="select-timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeframeData.slice(0, 4).map((tf) => (
            <div key={tf.period} className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">{tf.period}</p>
              <p className={`text-xl font-bold ${tf.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {tf.roi >= 0 ? "+" : ""}{tf.roi}%
              </p>
              <p className="text-xs text-muted-foreground">
                {tf.profit >= 0 ? "+" : ""}${tf.profit}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Best Performer</span>
            </div>
            <p className="text-lg font-bold">{bestPerformer.category}</p>
            <p className="text-sm text-green-500">+{bestPerformer.roi}% ROI</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Needs Work</span>
            </div>
            <p className="text-lg font-bold">{worstPerformer.category}</p>
            <p className="text-sm text-red-500">{worstPerformer.roi}% ROI</p>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="betType">By Bet Type</TabsTrigger>
            <TabsTrigger value="sport">By Sport</TabsTrigger>
          </TabsList>

          <TabsContent value="betType" className="mt-4 space-y-3">
            {dataByBetType.map((data) => (
              <div key={data.category} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{data.category}</span>
                    <span className={`font-bold ${data.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {data.roi >= 0 ? "+" : ""}{data.roi}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{data.bets} bets</span>
                    <span>{data.wins} wins</span>
                    <span>Avg: {data.avgOdds > 0 ? "+" : ""}{data.avgOdds}</span>
                  </div>
                </div>
                <Badge variant="outline" className={data.profit >= 0 ? "text-green-500" : "text-red-500"}>
                  {data.profit >= 0 ? "+" : ""}${data.profit}
                </Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sport" className="mt-4 space-y-3">
            {dataBySport.map((data) => (
              <div key={data.category} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Badge>{data.category}</Badge>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{data.bets} bets, {data.wins} wins</span>
                    <span className={`font-bold ${data.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {data.roi >= 0 ? "+" : ""}{data.roi}%
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className={data.profit >= 0 ? "text-green-500" : "text-red-500"}>
                  {data.profit >= 0 ? "+" : ""}${data.profit}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
