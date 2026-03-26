import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ThumbsUp, ThumbsDown, TrendingUp, AlertCircle, Info } from "lucide-react";

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

interface DerivedPick {
  id: string;
  game: string;
  pick: string;
  expertsFor: number;
  expertsAgainst: number;
  consensusPercent: number;
  impliedProb: number;
  grade: "A" | "B" | "C" | "D";
  sport: string;
  ev: number;
}

function deriveConsensus(games: MarketGame[], sport: string): DerivedPick[] {
  return games
    .filter(g => g.bookmakers.length > 0 && g.edgeAnalysis.valueSide !== "none")
    .map(game => {
      const valueSide = game.edgeAnalysis.valueSide || "home";
      const isHome = valueSide === "home";
      const teamName = isHome ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

      let pickLabel = `${teamName} ML`;
      if (game.consensus.spread !== undefined) {
        const spreadVal = isHome ? game.consensus.spread : -(game.consensus.spread);
        pickLabel = `${teamName} ${spreadVal > 0 ? "+" : ""}${spreadVal}`;
      }

      const totalBookmakers = game.bookmakers.length;
      let favoring = 0;
      for (const bk of game.bookmakers) {
        if (isHome) {
          if (bk.homeMoneyline !== undefined && bk.awayMoneyline !== undefined && bk.homeMoneyline < bk.awayMoneyline) favoring++;
          else if (bk.spread !== undefined && bk.spread < 0) favoring++;
        } else {
          if (bk.homeMoneyline !== undefined && bk.awayMoneyline !== undefined && bk.awayMoneyline < bk.homeMoneyline) favoring++;
          else if (bk.spread !== undefined && bk.spread > 0) favoring++;
        }
      }
      if (favoring === 0) favoring = Math.ceil(totalBookmakers * 0.6);

      const against = totalBookmakers - favoring;
      const consensusPct = totalBookmakers > 0 ? Math.round((favoring / totalBookmakers) * 100) : 50;
      const impliedProb = isHome
        ? (game.consensus.homeImpliedProb || 50)
        : (game.consensus.awayImpliedProb || 50);
      const ev = isHome ? game.edgeAnalysis.homeEV : game.edgeAnalysis.awayEV;

      let grade: "A" | "B" | "C" | "D" = "D";
      if (ev > 0.15 && consensusPct >= 75) grade = "A";
      else if (ev > 0.08 && consensusPct >= 60) grade = "B";
      else if (ev > 0 && consensusPct >= 50) grade = "C";

      return {
        id: game.id,
        game: game.shortName,
        pick: pickLabel,
        expertsFor: favoring,
        expertsAgainst: against,
        consensusPercent: consensusPct,
        impliedProb: Math.round(impliedProb * 10) / 10,
        grade,
        sport,
        ev,
      };
    })
    .sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3 };
      return gradeOrder[a.grade] - gradeOrder[b.grade] || b.ev - a.ev;
    });
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;

const getGradeColor = (grade: string) => {
  switch (grade) {
    case "A": return "bg-green-500 text-white";
    case "B": return "bg-chart-1 text-white";
    case "C": return "bg-yellow-500 text-black";
    case "D": return "bg-red-500 text-white";
    default: return "bg-muted";
  }
};

export function ConsensusPicks() {
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, isError, error } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${sport}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
  });

  const picks = data ? deriveConsensus(data.games, sport) : [];

  return (
    <Card data-testid="card-consensus-picks">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-chart-1" />
            Consensus Picks
          </CardTitle>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-28" data-testid="select-consensus-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" data-testid="loading-consensus">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm" data-testid="error-consensus">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load consensus data: {(error as Error)?.message || "Unknown error"}</span>
          </div>
        )}

        {!isLoading && !isError && picks.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm" data-testid="empty-consensus">
            <Info className="w-4 h-4 shrink-0" />
            <span>No consensus picks available for {sport} right now. Check back when games have odds data.</span>
          </div>
        )}

        {picks.map((pick) => (
          <div
            key={pick.id}
            className={`p-3 rounded-lg border ${
              pick.grade === "A"
                ? "bg-green-500/10 border-green-500/30"
                : pick.grade === "B"
                ? "bg-chart-1/10 border-chart-1/30"
                : "bg-muted/50 border-border"
            }`}
            data-testid={`pick-consensus-${pick.id}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                  <p className="font-medium text-sm" data-testid={`text-game-${pick.id}`}>{pick.game}</p>
                </div>
                <p className="text-sm font-bold mt-1" data-testid={`text-pick-${pick.id}`}>{pick.pick}</p>
              </div>
              <Badge className={`${getGradeColor(pick.grade)} text-sm font-bold`} data-testid={`badge-grade-${pick.id}`}>
                {pick.grade}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${pick.consensusPercent}%` }}
                />
              </div>
              <span className="text-sm font-bold" data-testid={`text-consensus-pct-${pick.id}`}>{pick.consensusPercent}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-green-500" />
                <span>{pick.expertsFor} for</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3 text-red-500" />
                <span>{pick.expertsAgainst} against</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-chart-1" />
                <span data-testid={`text-implied-prob-${pick.id}`}>{pick.impliedProb}% implied</span>
              </div>
            </div>
          </div>
        ))}

        {data && (
          <div className="pt-2 text-xs text-muted-foreground text-center" data-testid="text-consensus-source">
            {data.meta.dataSources.join(" + ")} | {data.meta.gamesWithOdds} games with odds from {data.meta.bookmakerCount} books
          </div>
        )}
      </CardContent>
    </Card>
  );
}