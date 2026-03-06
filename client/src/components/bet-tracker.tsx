import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSSEContext } from "@/context/sse-provider";
import { 
  TrendingUp, TrendingDown, DollarSign, Target, 
  Calendar, PieChart, BarChart3, Clock, CheckCircle2, 
  XCircle, Loader2, Plus, Trash2, Filter, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BetRecord {
  id: string;
  sport: string;
  date: string;
  sportsbook: string;
  stake: number;
  result: "won" | "lost" | "pending" | "push";
  payout: number;
  profit: number;
  legs: { team: string; opponent: string; market: string; selection: string; odds: number; result: string }[];
  tags?: string[];
  notes?: string;
}

interface BetStats {
  totalBets: number;
  resolvedBets: number;
  pendingBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  avgOdds: number;
  bySport: { sport: string; bets: number; wins: number; profit: number; staked: number; roi: number; winRate: number }[];
  byMarket: { market: string; bets: number; wins: number; profit: number; staked: number; roi: number; winRate: number }[];
  byMonth: { period: string; roi: number; profit: number; bets: number }[];
}

interface ClvSummary {
  totalPicks: number;
  settledPicks: number;
  wonPicks: number;
  winRate: number;
  picksWithClv: number;
  clvPlusRate: number;
  avgClv: number;
  streak: { type: string; count: number };
}

export function BetTracker() {
  const { data: bets = [], isLoading: betsLoading } = useQuery<BetRecord[]>({
    queryKey: ["/api/user/bets"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<BetStats>({
    queryKey: ["/api/user/bet-stats"],
  });

  const { data: clvData } = useQuery<ClvSummary>({
    queryKey: ["/api/user/picks/clv-summary"],
    staleTime: 1000 * 60 * 2,
  });

  const { toast } = useToast();

  const sse = useSSEContext();

  useEffect(() => {
    if (sse.lastEvent?.type === "picks-settled") {
      queryClient.invalidateQueries({ queryKey: ["/api/user/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bet-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/picks/clv-summary"] });
      const d = sse.lastEvent.data;
      if (d?.won !== null && d?.won !== undefined) {
        toast({
          title: d.won ? `✓ Pick Won — ${d.sport}` : `✗ Pick Lost — ${d.sport}`,
          description: `${d.pick} | ${d.game} (${d.score})`,
          variant: d.won ? "default" : "destructive",
        });
      }
    }
  }, [sse.lastEvent, toast]);

  const addBetMutation = useMutation({
    mutationFn: async (bet: Partial<BetRecord>) => {
      const res = await apiRequest("POST", "/api/user/bets", bet);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bet-stats"] });
      toast({ title: "Bet tracked", description: "Your bet has been recorded" });
    },
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [filterSport, setFilterSport] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBet, setNewBet] = useState({ sport: "NBA", team: "", opponent: "", market: "moneyline", stake: "", odds: "", sportsbook: "DraftKings" });

  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      if (filterSport !== "all" && bet.sport !== filterSport) return false;
      if (filterResult !== "all" && bet.result !== filterResult) return false;
      return true;
    });
  }, [bets, filterSport, filterResult]);

  const handleAddBet = () => {
    const stake = parseFloat(newBet.stake);
    const decimalOdds = parseFloat(newBet.odds);
    if (!newBet.team) return;
    if (!stake || stake <= 0) {
      toast({ title: "Invalid stake", description: "Stake must be a positive number.", variant: "destructive" });
      return;
    }
    if (!decimalOdds || decimalOdds < 1.01) {
      toast({ title: "Invalid odds", description: "Decimal odds must be 1.01 or higher (e.g. 1.91 for -110).", variant: "destructive" });
      return;
    }

    addBetMutation.mutate({
      sport: newBet.sport,
      date: new Date().toISOString(),
      sportsbook: newBet.sportsbook,
      stake,
      result: "pending",
      payout: 0,
      profit: 0,
      legs: [{
        team: newBet.team,
        opponent: newBet.opponent || "TBD",
        market: newBet.market,
        selection: `${newBet.team} ${newBet.market}`,
        odds: decimalOdds,
        result: "pending",
      }],
    });
    setShowAddForm(false);
    setNewBet({ sport: "NBA", team: "", opponent: "", market: "moneyline", stake: "", odds: "", sportsbook: "DraftKings" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { 
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const isLoading = betsLoading || statsLoading;
  const s = stats || { totalBets: 0, wins: 0, losses: 0, pushes: 0, pendingBets: 0, totalStaked: 0, totalProfit: 0, roi: 0, winRate: 0, avgOdds: 0, bySport: [], byMarket: [], byMonth: [], resolvedBets: 0 };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm" data-testid="banner-tracker-info">
        <Info className="w-4 h-4 shrink-0" />
        <span>Track your real bets here. Add bets manually to build your performance history.</span>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowAddForm(!showAddForm)} data-testid="button-add-bet">
          <Plus className="w-4 h-4 mr-1" />
          Track a Bet
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Select value={newBet.sport} onValueChange={(v) => setNewBet({...newBet, sport: v})}>
                <SelectTrigger data-testid="select-new-sport"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NBA">NBA</SelectItem>
                  <SelectItem value="NFL">NFL</SelectItem>
                  <SelectItem value="MLB">MLB</SelectItem>
                  <SelectItem value="NHL">NHL</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Team" value={newBet.team} onChange={e => setNewBet({...newBet, team: e.target.value})} data-testid="input-new-team" />
              <Input placeholder="Stake ($)" type="number" value={newBet.stake} onChange={e => setNewBet({...newBet, stake: e.target.value})} data-testid="input-new-stake" />
              <Input placeholder="Decimal Odds" type="number" step="0.01" value={newBet.odds} onChange={e => setNewBet({...newBet, odds: e.target.value})} data-testid="input-new-odds" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddBet} disabled={addBetMutation.isPending} data-testid="button-submit-bet">
                {addBetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Bet
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className={s.totalProfit >= 0 ? "border-green-500/30" : "border-red-500/30"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.totalProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                <DollarSign className={`w-5 h-5 ${s.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit/Loss</p>
                <p className={`text-2xl font-bold font-mono ${s.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {s.totalProfit >= 0 ? "+" : ""}${s.totalProfit.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">ROI: {s.roi >= 0 ? "+" : ""}{s.roi.toFixed(1)}%</p>
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
                <p className="text-2xl font-bold font-mono">{s.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{s.wins}W - {s.losses}L</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Staked</p>
                <p className="text-2xl font-bold font-mono">${s.totalStaked.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Avg odds: {s.avgOdds}</p>
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
                <p className="text-2xl font-bold font-mono">{s.pendingBets}</p>
                <p className="text-xs text-muted-foreground">{s.totalBets} total bets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2"><PieChart className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Calendar className="w-4 h-4" />History</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Select value={filterSport} onValueChange={setFilterSport}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Sport" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Result" /></SelectTrigger>
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
          {clvData && clvData.settledPicks > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Closing Line Value (CLV) Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className={`text-xl font-bold ${clvData.clvPlusRate >= 0.5 ? "text-green-500" : "text-red-500"}`}>
                      {Math.round(clvData.clvPlusRate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">CLV+ Rate</div>
                    <div className="text-xs text-muted-foreground">({clvData.picksWithClv} picks)</div>
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${clvData.avgClv >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {clvData.avgClv >= 0 ? "+" : ""}{clvData.avgClv.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg CLV (bps)</div>
                    <div className="text-xs text-muted-foreground">vs closing line</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {clvData.streak.count > 0 ? `${clvData.streak.count}` : "—"}
                      {clvData.streak.type === "clv+" ? <span className="text-xs text-green-500 ml-1">CLV+</span> : clvData.streak.type === "clv-" ? <span className="text-xs text-red-500 ml-1">CLV-</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Current Streak</div>
                    <div className="text-xs text-muted-foreground">closing line</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  CLV+ means you got better odds than the closing line — the true measure of long-term edge
                </p>
              </CardContent>
            </Card>
          )}
          {s.totalBets === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No bets tracked yet</p>
                <p className="text-sm mt-1">Click "Track a Bet" to start building your performance history</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">Performance by Sport</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {s.bySport.map((data) => (
                      <div key={data.sport} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{data.sport}</span>
                          <span className={data.roi >= 0 ? "text-green-500" : "text-red-500"}>
                            {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}% ROI
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{data.bets} bets</span>
                          <span>{data.wins}W</span>
                        </div>
                        <Progress value={data.winRate} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Performance by Market</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {s.byMarket.map((data) => (
                      <div key={data.market} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{data.market}</span>
                          <span className={data.roi >= 0 ? "text-green-500" : "text-red-500"}>
                            {data.roi >= 0 ? "+" : ""}{data.roi.toFixed(1)}% ROI
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{data.bets} bets</span>
                          <span>{data.wins}W</span>
                        </div>
                        <Progress value={data.winRate} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Bet History</CardTitle></CardHeader>
            <CardContent>
              {filteredBets.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No bets to display</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredBets.map((bet) => (
                      <div key={bet.id} className={`p-3 rounded-lg border ${
                        bet.result === "won" ? "bg-green-500/10 border-green-500/30" :
                        bet.result === "lost" ? "bg-red-500/10 border-red-500/30" :
                        bet.result === "push" ? "bg-amber-500/10 border-amber-500/30" :
                        "bg-muted/30 border-muted"
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {bet.result === "won" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {bet.result === "lost" && <XCircle className="w-4 h-4 text-red-500" />}
                            {bet.result === "pending" && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                            {bet.result === "push" && <Clock className="w-4 h-4 text-amber-500" />}
                            <span className="font-medium text-sm">
                              {bet.legs.map(l => l.selection || l.team).join(", ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{bet.sport}</Badge>
                            <Badge className={
                              bet.result === "won" ? "bg-green-500" :
                              bet.result === "lost" ? "bg-red-500" :
                              bet.result === "push" ? "bg-amber-500" : "bg-muted"
                            }>
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
                            <span className="font-mono ml-1">{bet.legs[0]?.odds?.toFixed(2) || "—"}x</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Profit:</span>
                            <span className={`font-mono ml-1 ${bet.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {bet.profit >= 0 ? "+" : ""}${bet.profit.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Book:</span>
                            <span className="ml-1">{bet.sportsbook}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{formatDate(bet.date)}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
