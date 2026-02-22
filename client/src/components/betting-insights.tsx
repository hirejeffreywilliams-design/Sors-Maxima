import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Lightbulb,
  History,
  Star,
  Clock,
  ChevronRight,
  Target,
  Flame,
  AlertCircle,
  Info
} from "lucide-react";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: "strategy" | "timing" | "bankroll" | "analysis";
}

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  date: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  bookmakers: { book: string; homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number }[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: "home" | "away" | "none"; hasArbitrage: boolean };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface DerivedHighGradedBet {
  id: string;
  matchup: string;
  pick: string;
  odds: number;
  grade: string;
  ev: number;
  sport: string;
  gameTime: string;
  homeRecord: string;
  awayRecord: string;
  dataSource: string;
}

const dailyTips: Tip[] = [
  {
    id: "1",
    title: "Fade the Public",
    content: "When more than 75% of bets are on one side, consider taking the other side. Sharp bettors often go against public consensus.",
    category: "strategy"
  },
  {
    id: "2",
    title: "Best Betting Windows",
    content: "Look for value early in the week for NFL games to get the best lines. Wait until closer to game time for injury news on NBA games.",
    category: "timing"
  },
  {
    id: "3",
    title: "Unit Sizing",
    content: "Never bet more than 1-3% of your bankroll on a single bet. Even A-graded picks should be limited to 3 units max.",
    category: "bankroll"
  },
  {
    id: "4",
    title: "Track Closing Line Value",
    content: "If your bets consistently beat the closing line, you're making +EV decisions even if short-term results vary.",
    category: "analysis"
  },
  {
    id: "5",
    title: "Correlation Matters",
    content: "In same-game parlays, look for positively correlated legs. A team that's winning is more likely to cover AND hit the over.",
    category: "strategy"
  },
  {
    id: "6",
    title: "Line Shopping Saves Money",
    content: "Having accounts at multiple sportsbooks lets you find the best odds. Even half a point can make a big difference long-term.",
    category: "bankroll"
  }
];

function deriveHighGradedBets(games: MarketGame[], sport: string): DerivedHighGradedBet[] {
  return games
    .filter(g => g.bookmakers.length > 0 && (g.edgeAnalysis.homeEV > 0 || g.edgeAnalysis.awayEV > 0))
    .map(game => {
      const bestEV = Math.max(game.edgeAnalysis.homeEV, game.edgeAnalysis.awayEV);
      const isHome = game.edgeAnalysis.homeEV >= game.edgeAnalysis.awayEV;
      const team = isHome ? game.homeTeam : game.awayTeam;
      const ml = isHome ? game.consensus.homeMoneyline : game.consensus.awayMoneyline;

      let pickLabel = `${team.abbreviation} ML`;
      if (game.consensus.spread !== undefined) {
        const spreadVal = isHome ? game.consensus.spread : -(game.consensus.spread);
        pickLabel = `${team.abbreviation} ${spreadVal > 0 ? "+" : ""}${spreadVal}`;
      }

      let grade = "D";
      if (bestEV > 0.2) grade = "A";
      else if (bestEV > 0.12) grade = "A-";
      else if (bestEV > 0.08) grade = "B+";
      else if (bestEV > 0.04) grade = "B";
      else if (bestEV > 0) grade = "C";

      const gameDate = new Date(game.date);
      const now = new Date();
      const diffMs = gameDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      let gameTime = gameDate.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
      if (diffHours < 24 && diffHours > 0) gameTime = `Today ${gameDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
      else if (diffHours < 48 && diffHours >= 24) gameTime = `Tomorrow ${gameDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

      return {
        id: game.id,
        matchup: game.shortName,
        pick: pickLabel,
        odds: ml || 0,
        grade,
        ev: bestEV,
        sport,
        gameTime,
        homeRecord: game.homeTeam.record,
        awayRecord: game.awayTeam.record,
        dataSource: game.dataSource,
      };
    })
    .sort((a, b) => b.ev - a.ev);
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"] as const;

const getCategoryColor = (category: string) => {
  switch (category) {
    case "strategy": return "bg-blue-500/10 text-blue-500";
    case "timing": return "bg-purple-500/10 text-purple-500";
    case "bankroll": return "bg-green-500/10 text-green-500";
    case "analysis": return "bg-orange-500/10 text-orange-500";
    default: return "bg-muted";
  }
};

const getGradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
};

const formatOdds = (odds: number) => {
  if (odds === 0) return "N/A";
  return odds > 0 ? `+${odds}` : `${odds}`;
};

export function BettingInsights() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, isError, error } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${sport}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
  });

  const highGradedBets = data ? deriveHighGradedBets(data.games, sport) : [];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % dailyTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = dailyTips[currentTipIndex];

  return (
    <div className="space-y-4" data-testid="section-betting-insights">
      <Card className="overflow-visible" data-testid="card-daily-tip">
        <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Pro Tip of the Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{currentTip.title}</h3>
                  <Badge variant="secondary" className={getCategoryColor(currentTip.category)}>
                    {currentTip.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentTip.content}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                {dailyTips.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTipIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentTipIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    data-testid={`button-tip-dot-${i}`}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentTipIndex((currentTipIndex + 1) % dailyTips.length)}
                data-testid="button-next-tip"
              >
                Next Tip
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming-bets">
            <Star className="w-4 h-4" />
            High-Graded Picks
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-bet-history">
            <History className="w-4 h-4" />
            Recent History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          <div className="flex items-center justify-end">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-28" data-testid="select-insights-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="space-y-3" data-testid="loading-insights">
              {[1, 2, 3].map(i => (
                <Card key={i} className="overflow-visible">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm" data-testid="error-insights">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load picks: {(error as Error)?.message || "Unknown error"}</span>
            </div>
          )}

          {!isLoading && !isError && highGradedBets.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm" data-testid="empty-insights">
              <Info className="w-4 h-4 shrink-0" />
              <span>No positive EV picks found for {sport} right now. Check back when more odds data is available.</span>
            </div>
          )}

          {highGradedBets.slice(0, 6).map((bet) => (
            <Card key={bet.id} className="overflow-visible hover-elevate" data-testid={`card-high-graded-${bet.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{bet.sport}</Badge>
                      <span className={`text-xl font-bold ${getGradeColor(bet.grade)}`} data-testid={`text-grade-${bet.id}`}>
                        {bet.grade}
                      </span>
                      <span className="text-sm text-muted-foreground" data-testid={`text-ev-${bet.id}`}>EV: {bet.ev > 0 ? "+" : ""}{(bet.ev * 100).toFixed(1)}%</span>
                    </div>
                    <h4 className="font-medium" data-testid={`text-matchup-${bet.id}`}>{bet.matchup}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-3 h-3 text-primary" />
                      <span className="font-semibold" data-testid={`text-pick-${bet.id}`}>{bet.pick}</span>
                      <span className="text-muted-foreground">({formatOdds(bet.odds)})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{bet.gameTime}</span>
                      </div>
                      <span>{bet.homeRecord} vs {bet.awayRecord}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {bet.grade === "A" && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Flame className="w-4 h-4" />
                        <span className="text-xs font-medium">Top Pick</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {data && (
            <div className="text-center pt-2 text-xs text-muted-foreground" data-testid="text-insights-source">
              {data.meta.dataSources.join(" + ")} | Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="empty-bet-history">
            <History className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No bet history yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              Your tracked bets will appear here once you start placing and recording wagers.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}