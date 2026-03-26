import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, Star, Users, User, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MarketTeam {
  name: string;
  abbreviation: string;
  record: string;
  winPct: number;
}

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  homeTeam: MarketTeam;
  awayTeam: MarketTeam;
  leaders?: { team: string; category: string; playerName: string; value: string }[];
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; dataSources: string[]; generatedAt: string };
}

interface DerivedStreak {
  type: "player" | "team";
  name: string;
  team?: string;
  sport: string;
  streakLength: number;
  streakType: string;
  hitRate: number;
  recommendation: string;
  confidence: "low" | "medium" | "high";
}

function deriveStreaks(games: MarketGame[], sport: string): DerivedStreak[] {
  const streaks: DerivedStreak[] = [];

  for (const game of games) {
    const teams = [game.homeTeam, game.awayTeam];
    for (const team of teams) {
      if (team.winPct > 60) {
        const streakLength = Math.round(team.winPct / 10);
        const confidence: DerivedStreak["confidence"] =
          team.winPct > 75 ? "high" : team.winPct > 65 ? "medium" : "low";
        const hitRate = team.winPct / 100;

        streaks.push({
          type: "team",
          name: team.name,
          sport,
          streakLength,
          streakType: `Winning Streak (${team.record})`,
          hitRate,
          recommendation:
            confidence === "high"
              ? "Dominant record - strong trending performance"
              : "Above average record - worth monitoring",
          confidence,
        });
      }
    }

    if (game.leaders) {
      for (const leader of game.leaders) {
        const matchTeam = [game.homeTeam, game.awayTeam].find(
          (t) => t.abbreviation === leader.team || t.name.includes(leader.team)
        );
        const teamWinPct = matchTeam?.winPct ?? 50;
        const confidence: DerivedStreak["confidence"] =
          teamWinPct > 65 ? "high" : teamWinPct > 50 ? "medium" : "low";

        streaks.push({
          type: "player",
          name: leader.playerName,
          team: matchTeam?.name ?? leader.team,
          sport,
          streakLength: Math.max(3, Math.round(teamWinPct / 12)),
          streakType: `${leader.category}: ${leader.value}`,
          hitRate: Math.min(0.95, teamWinPct / 100 + 0.1),
          recommendation: `Leading ${leader.category.toLowerCase()} performer on ${matchTeam?.name ?? leader.team}`,
          confidence,
        });
      }
    }
  }

  streaks.sort((a, b) => b.hitRate - a.hitRate);
  return streaks;
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

interface HotStreakDetectorProps {
  sport?: string;
}

export function HotStreakDetector({ sport: propSport }: HotStreakDetectorProps) {
  const [selectedSport, setSelectedSport] = useState(propSport || "NBA");
  const activeSport = propSport || selectedSport;

  const { data, isLoading, isError } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", activeSport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${activeSport}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
  });

  const hotStreaks = data ? deriveStreaks(data.games, activeSport) : [];

  return (
    <Card data-testid="hot-streak-detector">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Flame className="w-5 h-5 text-orange-500" />
          Hot Streak Detector
          {!propSport && (
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-28 ml-auto" data-testid="select-streak-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge variant="outline" className={propSport ? "ml-auto" : ""}>
            {isLoading ? "..." : `${hotStreaks.length} Active`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid="streak-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="streak-error">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load streak data for {activeSport}</p>
          </div>
        ) : hotStreaks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="streak-empty">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hot streaks detected for {activeSport}</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {hotStreaks.map((streak, i) => (
                <div
                  key={`${streak.name}-${i}`}
                  className={`p-3 rounded-lg border ${
                    streak.confidence === "high"
                      ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30"
                      : "bg-muted/50"
                  }`}
                  data-testid={`hot-streak-${i}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {streak.type === "player" ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="font-medium" data-testid={`streak-name-${i}`}>{streak.name}</span>
                      {streak.team && (
                        <span className="text-xs text-muted-foreground">({streak.team})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-mono font-bold text-orange-500">
                        {streak.streakLength}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {streak.sport}
                    </Badge>
                    <span className="text-sm" data-testid={`streak-type-${i}`}>{streak.streakType}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span>{(streak.hitRate * 100).toFixed(0)}% hit rate</span>
                    </div>
                    <Badge
                      variant={streak.confidence === "high" ? "default" : "outline"}
                      className={`gap-1 ${streak.confidence === "high" ? "bg-emerald-500" : ""}`}
                    >
                      <Star className="w-3 h-3" />
                      {streak.confidence}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {streak.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {data?.meta && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground" data-testid="streak-attribution">
            <Database className="w-3 h-3" />
            <span>Source: {data.meta.dataSources.join(", ")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
