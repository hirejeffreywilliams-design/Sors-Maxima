import { useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Target, 
  Calendar, PieChart, BarChart3, Clock, CheckCircle2, 
  XCircle, Loader2, Plus, Trash2, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BetRecord, BetTrackingStats, Sport, ParlayLeg } from "@shared/schema";

function generateMockBetHistory(): BetRecord[] {
  const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL"];
  const results: ("won" | "lost" | "pending" | "push")[] = ["won", "lost", "pending", "push"];
  const bets: BetRecord[] = [];
  
  for (let i = 0; i < 25; i++) {
    const result = results[Math.floor(Math.random() * results.length)];
    const odds = 1.5 + Math.random() * 3;
    const stake = Math.floor(Math.random() * 50 + 10);
    const closingOdds = odds * (0.95 + Math.random() * 0.1);
    const clv = ((odds - closingOdds) / closingOdds) * 100;
    
    bets.push({
      id: `bet-${i}`,
      legs: [
        {
          id: `leg-${i}-1`,
          team: ["Lakers", "Celtics", "Warriors", "Heat", "Bucks"][Math.floor(Math.random() * 5)],
          market: ["moneyline", "spread", "total"][Math.floor(Math.random() * 3)] as any,
          outcome: "Win",
          decimalOdds: 1.5 + Math.random(),
        },
      ],
      stake,
      odds,
      potentialWin: stake * odds,
      result,
      actualReturn: result === "won" ? stake * odds : result === "push" ? stake : 0,
      placedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      settledAt: result !== "pending" ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      closingOdds,
      clvPercent: clv,
      sport: sports[Math.floor(Math.random() * sports.length)],
    });
  }
  
  return bets.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

function calculateStats(bets: BetRecord[]): BetTrackingStats {
  const settledBets = bets.filter(b => b.result !== "pending");
  const wonBets = bets.filter(b => b.result === "won");
  const lostBets = bets.filter(b => b.result === "lost");
  const pendingBets = bets.filter(b => b.result === "pending");
  
  const totalStaked = settledBets.reduce((sum, b) => sum + b.stake, 0);
  const totalReturns = settledBets.reduce((sum, b) => sum + (b.actualReturn || 0), 0);
  const profitLoss = totalReturns - totalStaked;
  const roi = totalStaked > 0 ? (profitLoss / totalStaked) * 100 : 0;
  const avgOdds = settledBets.length > 0 ? settledBets.reduce((sum, b) => sum + b.odds, 0) / settledBets.length : 0;
  const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
  
  const clvPositive = settledBets.filter(b => b.clvPercent && b.clvPercent > 0).length;
  const avgCLV = settledBets.length > 0 ? settledBets.reduce((sum, b) => sum + (b.clvPercent || 0), 0) / settledBets.length : 0;
  
  const statsBySport: Record<string, { bets: number; won: number; lost: number; roi: number }> = {};
  const statsByMarket: Record<string, { bets: number; won: number; lost: number; roi: number }> = {};
  
  bets.forEach(bet => {
    if (!statsBySport[bet.sport]) {
      statsBySport[bet.sport] = { bets: 0, won: 0, lost: 0, roi: 0 };
    }
    statsBySport[bet.sport].bets++;
    if (bet.result === "won") statsBySport[bet.sport].won++;
    if (bet.result === "lost") statsBySport[bet.sport].lost++;
    
    const market = bet.legs[0]?.market || "other";
    if (!statsByMarket[market]) {
      statsByMarket[market] = { bets: 0, won: 0, lost: 0, roi: 0 };
    }
    statsByMarket[market].bets++;
    if (bet.result === "won") statsByMarket[market].won++;
    if (bet.result === "lost") statsByMarket[market].lost++;
  });
  
  Object.keys(statsBySport).forEach(sport => {
    const s = statsBySport[sport];
    s.roi = s.bets > 0 ? ((s.won - s.lost) / s.bets) * 100 : 0;
  });
  
  Object.keys(statsByMarket).forEach(market => {
    const m = statsByMarket[market];
    m.roi = m.bets > 0 ? ((m.won - m.lost) / m.bets) * 100 : 0;
  });
  
  return {
    totalBets: bets.length,
    wonBets: wonBets.length,
    lostBets: lostBets.length,
    pendingBets: pendingBets.length,
    totalStaked,
    totalReturns,
    profitLoss,
    roi,
    avgOdds,
    winRate,
    clvPositive,
    avgCLV,
    statsBySport,
    statsByMarket,
  };
}

export function BetTracker() {
  const [bets, setBets] = useState<BetRecord[]>(generateMockBetHistory);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterSport, setFilterSport] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      if (filterSport !== "all" && bet.sport !== filterSport) return false;
      if (filterResult !== "all" && bet.result !== filterResult) return false;
      return true;
    });
  }, [bets, filterSport, filterResult]);
  
  const stats = useMemo(() => calculateStats(filteredBets), [filteredBets]);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={stats.profitLoss >= 0 ? "border-green-500/30" : "border-red-500/30"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                stats.profitLoss >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                <DollarSign className={`w-5 h-5 ${stats.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit/Loss</p>
                <p className={`text-2xl font-bold font-mono ${stats.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {stats.profitLoss >= 0 ? "+" : ""}{stats.profitLoss.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ROI: {stats.roi >= 0 ? "+" : ""}{stats.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold font-mono">{stats.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.wonBets}W - {stats.lostBets}L
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg CLV</p>
                <p className={`text-2xl font-bold font-mono ${stats.avgCLV >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {stats.avgCLV >= 0 ? "+" : ""}{stats.avgCLV.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.clvPositive} positive CLV bets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold font-mono">{stats.pendingBets}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalBets} total bets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <PieChart className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Calendar className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="clv" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              CLV Analysis
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Select value={filterSport} onValueChange={setFilterSport}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance by Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.statsBySport).map(([sport, data]) => (
                    <div key={sport} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{sport}</span>
                        <span className={data.roi >= 0 ? "text-green-500" : "text-red-500"}>
                          {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}% ROI
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{data.bets} bets</span>
                        <span>{data.won}W - {data.lost}L</span>
                      </div>
                      <Progress 
                        value={data.bets > 0 ? (data.won / data.bets) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance by Market</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.statsByMarket).map(([market, data]) => (
                    <div key={market} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{market}</span>
                        <span className={data.roi >= 0 ? "text-green-500" : "text-red-500"}>
                          {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}% ROI
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{data.bets} bets</span>
                        <span>{data.won}W - {data.lost}L</span>
                      </div>
                      <Progress 
                        value={data.bets > 0 ? (data.won / data.bets) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">${stats.totalStaked.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">Total Staked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">${stats.totalReturns.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">Total Returns</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.avgOdds.toFixed(2)}x</div>
                  <div className="text-xs text-muted-foreground">Avg Odds</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.totalBets}</div>
                  <div className="text-xs text-muted-foreground">Total Bets</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bet History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredBets.map((bet) => (
                    <div 
                      key={bet.id} 
                      className={`p-3 rounded-lg border ${
                        bet.result === "won" ? "bg-green-500/10 border-green-500/30" :
                        bet.result === "lost" ? "bg-red-500/10 border-red-500/30" :
                        bet.result === "push" ? "bg-amber-500/10 border-amber-500/30" :
                        "bg-muted/30 border-muted"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {bet.result === "won" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {bet.result === "lost" && <XCircle className="w-4 h-4 text-red-500" />}
                          {bet.result === "pending" && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                          {bet.result === "push" && <Clock className="w-4 h-4 text-amber-500" />}
                          <span className="font-medium text-sm">
                            {bet.legs.map(l => l.team).join(", ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{bet.sport}</Badge>
                          <Badge 
                            className={
                              bet.result === "won" ? "bg-green-500" :
                              bet.result === "lost" ? "bg-red-500" :
                              bet.result === "push" ? "bg-amber-500" :
                              "bg-muted"
                            }
                          >
                            {bet.result.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Stake:</span>
                          <span className="font-mono ml-1">${bet.stake.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Odds:</span>
                          <span className="font-mono ml-1">{bet.odds.toFixed(2)}x</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Return:</span>
                          <span className={`font-mono ml-1 ${
                            (bet.actualReturn || 0) > bet.stake ? "text-green-500" : 
                            (bet.actualReturn || 0) < bet.stake ? "text-red-500" : ""
                          }`}>
                            ${(bet.actualReturn || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CLV:</span>
                          <span className={`font-mono ml-1 ${
                            (bet.clvPercent || 0) > 0 ? "text-green-500" : "text-red-500"
                          }`}>
                            {(bet.clvPercent || 0) > 0 ? "+" : ""}{(bet.clvPercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {formatDate(bet.placedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clv" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CLV Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-mono ${stats.avgCLV >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {stats.avgCLV >= 0 ? "+" : ""}{stats.avgCLV.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Average CLV</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Positive CLV Bets</span>
                      <span className="text-green-500">{stats.clvPositive}</span>
                    </div>
                    <Progress 
                      value={(stats.clvPositive / Math.max(stats.totalBets - stats.pendingBets, 1)) * 100} 
                      className="h-3 [&>div]:bg-green-500"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      {((stats.clvPositive / Math.max(stats.totalBets - stats.pendingBets, 1)) * 100).toFixed(1)}% of settled bets
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Closing Line Value (CLV) measures if you beat the closing line.</p>
                    <p>Consistently positive CLV indicates sharp betting.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CLV by Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.statsBySport).map(([sport, data]) => {
                    const sportBets = filteredBets.filter(b => b.sport === sport && b.result !== "pending");
                    const avgCLV = sportBets.length > 0 
                      ? sportBets.reduce((sum, b) => sum + (b.clvPercent || 0), 0) / sportBets.length 
                      : 0;
                    
                    return (
                      <div key={sport} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{sport}</Badge>
                          <span className="text-sm">{data.bets} bets</span>
                        </div>
                        <span className={`font-mono ${avgCLV >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {avgCLV >= 0 ? "+" : ""}{avgCLV.toFixed(2)}% CLV
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}