import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, TrendingUp, TrendingDown, Target } from "lucide-react";

interface MatchupData {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeWinPct: number;
  awayWinPct: number;
  strengthDiff: number;
  leaders: { team: string; category: string; playerName: string; value: string }[];
  recommendation: "smash" | "lean" | "fade" | "avoid";
  edge: number;
}

function deriveMatchups(games: any[]): MatchupData[] {
  return games.map((g: any) => {
    const homeWinPct = g.homeTeam.winPct || 50;
    const awayWinPct = g.awayTeam.winPct || 50;
    const diff = homeWinPct - awayWinPct;
    const absDiff = Math.abs(diff);

    let recommendation: MatchupData["recommendation"] = "avoid";
    if (absDiff > 15) recommendation = "smash";
    else if (absDiff > 8) recommendation = "lean";
    else if (absDiff > 3) recommendation = "fade";

    return {
      id: g.id,
      gameId: g.id,
      homeTeam: g.homeTeam.name,
      awayTeam: g.awayTeam.name,
      homeRecord: g.homeTeam.record,
      awayRecord: g.awayTeam.record,
      homeWinPct,
      awayWinPct,
      strengthDiff: Math.round(diff * 10) / 10,
      leaders: g.leaders || [],
      recommendation,
      edge: Math.round(absDiff * 10) / 10,
    };
  }).sort((a: MatchupData, b: MatchupData) => b.edge - a.edge);
}

function getRecommendationColor(rec: string) {
  switch (rec) {
    case "smash": return "text-green-500 bg-green-500/10 border-green-500/30";
    case "lean": return "text-chart-1 bg-chart-1/10 border-chart-1/30";
    case "fade": return "text-red-500 bg-red-500/10 border-red-500/30";
    default: return "text-muted-foreground bg-muted/50 border-border";
  }
}

export function MatchupAnalyzer() {
  const [sport, setSport] = useState("NFL");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
  });

  const matchups = data?.games ? deriveMatchups(data.games) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-chart-3" />
            Matchup Analyzer
          </CardTitle>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-24" data-testid="select-matchup-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" data-testid="loading-matchups">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-destructive" data-testid="error-matchups">
            Failed to load matchup data. Please try again.
          </div>
        )}

        {!isLoading && !error && matchups.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground" data-testid="empty-matchups">
            No matchup data available for {sport}.
          </div>
        )}

        {matchups.map((matchup) => (
          <div
            key={matchup.id}
            data-testid={`card-matchup-${matchup.id}`}
            className={`p-3 rounded-lg border ${getRecommendationColor(matchup.recommendation)}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-medium" data-testid={`text-matchup-teams-${matchup.id}`}>
                  {matchup.awayTeam} @ {matchup.homeTeam}
                </p>
                <p className="text-xs text-muted-foreground">
                  {matchup.awayRecord} vs {matchup.homeRecord}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`capitalize ${
                  matchup.recommendation === "smash" ? "border-green-500 text-green-500" :
                  matchup.recommendation === "lean" ? "border-chart-1 text-chart-1" :
                  matchup.recommendation === "fade" ? "border-red-500 text-red-500" :
                  ""
                }`}
              >
                {matchup.recommendation}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground mb-1">Home Win%</p>
                <p className="font-bold">{matchup.homeWinPct}%</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground mb-1">Away Win%</p>
                <p className="font-bold">{matchup.awayWinPct}%</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Edge</p>
                </div>
                <p className={`font-bold ${matchup.strengthDiff > 0 ? "text-green-500" : matchup.strengthDiff < 0 ? "text-red-500" : ""}`}>
                  {matchup.strengthDiff > 0 ? "+" : ""}{matchup.strengthDiff}%
                </p>
              </div>
            </div>

            {matchup.leaders.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Key Players</p>
                <div className="flex flex-wrap gap-1">
                  {matchup.leaders.slice(0, 4).map((leader, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {leader.playerName} ({leader.value} {leader.category})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {matchup.strengthDiff > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span>
                {matchup.strengthDiff > 0
                  ? `Home team favored by win% differential of ${matchup.edge}%`
                  : `Away team favored by win% differential of ${matchup.edge}%`}
              </span>
            </div>
          </div>
        ))}

        {data?.meta?.dataSources && (
          <div className="pt-2 text-xs text-muted-foreground text-center" data-testid="text-datasource-matchups">
            Data: {data.meta.dataSources.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
