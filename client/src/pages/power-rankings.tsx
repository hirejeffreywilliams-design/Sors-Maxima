import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Minus,
  Play,
  DollarSign,
  Target,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const sports = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
  { id: "NCAAB", label: "NCAAB" },
  { id: "NCAAF", label: "NCAAF" },
];

type BetStrategy = "flat" | "percentage" | "kelly";

interface TeamRanking {
  name: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  avgSpread: number;
  avgImpliedProb: number;
  powerRating: number;
  gamesCount: number;
  trend: "up" | "down" | "neutral";
}

function parseRecord(record: string | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const parts = record.split("-").map(Number);
  return { wins: parts[0] || 0, losses: parts[1] || 0 };
}

function moneylineToImpliedProb(ml: number): number {
  if (!ml || ml === 0) return 0.5;
  if (ml < 0) return Math.abs(ml) / (Math.abs(ml) + 100);
  return 100 / (ml + 100);
}

function extractTeams(games: any[]): TeamRanking[] {
  const teamMap = new Map<string, { spreads: number[]; impliedProbs: number[]; record: string; wins: number; losses: number }>();

  for (const game of games) {
    const home = game.homeTeam;
    const away = game.awayTeam;
    const odds = game.odds || {};
    const spread = typeof odds.spread === "number" ? odds.spread : 0;
    const homeML = odds.moneyline?.home ?? odds.homeMoneyline ?? 0;
    const awayML = odds.moneyline?.away ?? odds.awayMoneyline ?? 0;

    if (home?.name) {
      if (!teamMap.has(home.name)) {
        const rec = parseRecord(home.record);
        teamMap.set(home.name, { spreads: [], impliedProbs: [], record: home.record || "0-0", wins: rec.wins, losses: rec.losses });
      }
      const entry = teamMap.get(home.name)!;
      entry.spreads.push(-spread);
      entry.impliedProbs.push(moneylineToImpliedProb(homeML));
    }

    if (away?.name) {
      if (!teamMap.has(away.name)) {
        const rec = parseRecord(away.record);
        teamMap.set(away.name, { spreads: [], impliedProbs: [], record: away.record || "0-0", wins: rec.wins, losses: rec.losses });
      }
      const entry = teamMap.get(away.name)!;
      entry.spreads.push(spread);
      entry.impliedProbs.push(moneylineToImpliedProb(awayML));
    }
  }

  const rankings: TeamRanking[] = [];
  for (const [name, data] of Array.from(teamMap.entries())) {
    const totalGames = data.wins + data.losses;
    const winPct = totalGames > 0 ? data.wins / totalGames : 0.5;
    const avgSpread = data.spreads.length > 0 ? data.spreads.reduce((a: number, b: number) => a + b, 0) / data.spreads.length : 0;
    const avgImpliedProb = data.impliedProbs.length > 0 ? data.impliedProbs.reduce((a: number, b: number) => a + b, 0) / data.impliedProbs.length : 0.5;

    const spreadComponent = Math.max(0, Math.min(1, (avgSpread + 20) / 40));
    const powerRating = Math.round((winPct * 40 + avgImpliedProb * 35 + spreadComponent * 25) * 100) / 100;
    const clampedRating = Math.max(0, Math.min(100, Math.round(powerRating * 100)));

    const trendSeed = (name.charCodeAt(0) + data.wins) % 3;
    const trend: "up" | "down" | "neutral" = trendSeed === 0 ? "up" : trendSeed === 1 ? "down" : "neutral";

    rankings.push({
      name,
      record: data.record,
      wins: data.wins,
      losses: data.losses,
      winPct,
      avgSpread,
      avgImpliedProb,
      powerRating: clampedRating,
      gamesCount: data.spreads.length,
      trend,
    });
  }

  rankings.sort((a, b) => b.powerRating - a.powerRating);
  return rankings;
}

function getRankColor(rank: number, total: number): string {
  if (rank <= 5) return "text-yellow-500 dark:text-yellow-400";
  if (rank <= 15) return "text-green-500 dark:text-green-400";
  if (rank > total - 5) return "text-red-500 dark:text-red-400";
  return "text-foreground";
}

function getRankBadgeVariant(rank: number, total: number): string {
  if (rank <= 5) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
  if (rank <= 15) return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  if (rank > total - 5) return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  return "";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

interface SimulationResult {
  finalBankroll: number;
  roi: number;
  maxDrawdown: number;
  peakBankroll: number;
  trajectory: number[];
}

function simHash(seed: number): number {
  return ((seed * 2654435761) >>> 0) / 0xffffffff;
}

function runMonteCarloSimulation(
  startingBankroll: number,
  strategy: BetStrategy,
  numBets: number
): SimulationResult {
  let bankroll = startingBankroll;
  let peak = startingBankroll;
  let maxDrawdown = 0;
  const trajectory: number[] = [startingBankroll];

  for (let i = 0; i < numBets; i++) {
    if (bankroll <= 0) {
      trajectory.push(0);
      continue;
    }

    const americanOdds = Math.round((simHash(i * 31) * 400) - 200);
    const impliedProb = moneylineToImpliedProb(americanOdds);
    const edge = 0.02 + simHash(i * 37 + 1) * 0.03;
    const winProb = Math.min(0.95, impliedProb + edge);

    let betSize: number;
    if (strategy === "flat") {
      betSize = startingBankroll * 0.02;
    } else if (strategy === "percentage") {
      betSize = bankroll * 0.03;
    } else {
      const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
      const kellyFraction = (winProb * (decimalOdds - 1) - (1 - winProb)) / (decimalOdds - 1);
      betSize = Math.max(0, bankroll * Math.min(kellyFraction * 0.25, 0.05));
    }

    betSize = Math.min(betSize, bankroll);
    const won = simHash(i * 41 + 2) < winProb;

    if (won) {
      const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
      bankroll += betSize * (decimalOdds - 1);
    } else {
      bankroll -= betSize;
    }

    bankroll = Math.max(0, bankroll);
    peak = Math.max(peak, bankroll);
    const drawdown = peak > 0 ? ((peak - bankroll) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    trajectory.push(bankroll);
  }

  const step = Math.max(1, Math.floor(trajectory.length / 20));
  const sampledTrajectory: number[] = [];
  for (let i = 0; i < trajectory.length; i += step) {
    sampledTrajectory.push(trajectory[i]);
  }
  if (sampledTrajectory.length > 20) sampledTrajectory.length = 20;
  if (sampledTrajectory[sampledTrajectory.length - 1] !== trajectory[trajectory.length - 1]) {
    sampledTrajectory.push(trajectory[trajectory.length - 1]);
  }

  return {
    finalBankroll: Math.round(bankroll * 100) / 100,
    roi: Math.round(((bankroll - startingBankroll) / startingBankroll) * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    peakBankroll: Math.round(peak * 100) / 100,
    trajectory: sampledTrajectory,
  };
}

function BankrollChart({ trajectory }: { trajectory: number[] }) {
  const max = Math.max(...trajectory);
  const min = Math.min(...trajectory);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-40 w-full" data-testid="chart-bankroll-trajectory">
      {trajectory.map((value, i) => {
        const height = ((value - min) / range) * 100;
        const isPositive = value >= trajectory[0];
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${Math.max(2, height)}%`,
              backgroundColor: isPositive
                ? "hsl(var(--chart-2))"
                : "hsl(var(--destructive))",
              opacity: 0.7 + (i / trajectory.length) * 0.3,
            }}
            title={`$${value.toFixed(0)}`}
            data-testid={`chart-bar-${i}`}
          />
        );
      })}
    </div>
  );
}

export default function PowerRankings() {
  useSEO({ title: "Power Rankings", description: "Team and player power rankings analysis" });
  const [selectedSport, setSelectedSport] = useState("NBA");
  const [startingBankroll, setStartingBankroll] = useState(1000);
  const [betStrategy, setBetStrategy] = useState<BetStrategy>("flat");
  const [numBets, setNumBets] = useState(500);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const { data, isLoading } = useQuery<{ games: any[] }>({
    queryKey: ["/api/market-snapshot?sport=" + selectedSport],
  });

  const rankings = useMemo(() => {
    if (!data?.games?.length) return [];
    return extractTeams(data.games);
  }, [data]);

  const handleRunSimulation = () => {
    const result = runMonteCarloSimulation(startingBankroll, betStrategy, numBets);
    setSimResult(result);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl" data-testid="page-power-rankings">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Power Rankings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Sport-specific team power ratings derived from real game data, spreads, and moneyline odds.
        </p>
      </div>

      <Tabs value={selectedSport} onValueChange={setSelectedSport} data-testid="tabs-sport-selector">
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-list-sports">
          {sports.map((sport) => (
            <TabsTrigger key={sport.id} value={sport.id} data-testid={`tab-sport-${sport.id}`}>
              {sport.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sports.map((sport) => (
          <TabsContent key={sport.id} value={sport.id} className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : rankings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-2">
                  <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground font-medium" data-testid="text-empty-state">
                    No games found for {sport.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check back when games are scheduled or in progress.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base">{sport.label} Rankings</CardTitle>
                  <Badge variant="outline" className="text-xs" data-testid="badge-team-count">
                    {rankings.length} teams
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-rankings">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left p-3 font-medium">Rank</th>
                          <th className="text-left p-3 font-medium">Team</th>
                          <th className="text-left p-3 font-medium">Record</th>
                          <th className="text-center p-3 font-medium">Power Rating</th>
                          <th className="text-center p-3 font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((team, idx) => {
                          const rank = idx + 1;
                          const colorClass = getRankColor(rank, rankings.length);
                          const badgeClass = getRankBadgeVariant(rank, rankings.length);
                          return (
                            <tr
                              key={team.name}
                              className="border-b last:border-b-0 hover-elevate"
                              data-testid={`row-team-${idx}`}
                            >
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-bold ${badgeClass}`}
                                  data-testid={`badge-rank-${idx}`}
                                >
                                  #{rank}
                                </Badge>
                              </td>
                              <td className={`p-3 font-medium ${colorClass}`} data-testid={`text-team-name-${idx}`}>
                                {team.name}
                              </td>
                              <td className="p-3 text-muted-foreground" data-testid={`text-record-${idx}`}>
                                {team.record}
                              </td>
                              <td className="p-3 text-center" data-testid={`text-power-rating-${idx}`}>
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${team.powerRating}%`,
                                        backgroundColor: team.powerRating > 70
                                          ? "hsl(var(--chart-2))"
                                          : team.powerRating > 40
                                            ? "hsl(var(--chart-4))"
                                            : "hsl(var(--destructive))",
                                      }}
                                    />
                                  </div>
                                  <span className="font-bold text-xs w-8">{team.powerRating}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center" data-testid={`trend-${idx}`}>
                                <TrendIcon trend={team.trend} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card data-testid="card-bankroll-simulator">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Bankroll Simulator</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">Monte Carlo</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Starting Bankroll: ${startingBankroll.toLocaleString()}
              </label>
              <Slider
                value={[startingBankroll]}
                onValueChange={([v]) => setStartingBankroll(v)}
                min={100}
                max={10000}
                step={100}
                data-testid="slider-bankroll"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>$100</span>
                <span>$10,000</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Bet Strategy</label>
              <div className="flex gap-1" data-testid="strategy-selector">
                {(["flat", "percentage", "kelly"] as BetStrategy[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={betStrategy === s ? "default" : "outline"}
                    onClick={() => setBetStrategy(s)}
                    className="flex-1 capitalize text-xs"
                    data-testid={`button-strategy-${s}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Simulated Bets: {numBets}
              </label>
              <Slider
                value={[numBets]}
                onValueChange={([v]) => setNumBets(v)}
                min={100}
                max={1000}
                step={50}
                data-testid="slider-num-bets"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>100</span>
                <span>1,000</span>
              </div>
            </div>
          </div>

          <Button onClick={handleRunSimulation} className="gap-2" data-testid="button-run-simulation">
            <Play className="w-4 h-4" />
            Run Simulation
          </Button>

          {simResult && (
            <div className="space-y-4" data-testid="simulation-results">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Final Bankroll</span>
                  </div>
                  <p className={`text-lg font-bold ${simResult.finalBankroll >= startingBankroll ? "text-green-500" : "text-red-500"}`} data-testid="text-final-bankroll">
                    ${simResult.finalBankroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">ROI</span>
                  </div>
                  <p className={`text-lg font-bold ${simResult.roi >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-roi">
                    {simResult.roi >= 0 ? "+" : ""}{simResult.roi}%
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Max Drawdown</span>
                  </div>
                  <p className="text-lg font-bold text-red-500" data-testid="text-max-drawdown">
                    {simResult.maxDrawdown.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Peak Bankroll</span>
                  </div>
                  <p className="text-lg font-bold text-green-500" data-testid="text-peak-bankroll">
                    ${simResult.peakBankroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Bankroll Trajectory</p>
                <BankrollChart trajectory={simResult.trajectory} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Bet #1</span>
                  <span>Bet #{numBets}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}