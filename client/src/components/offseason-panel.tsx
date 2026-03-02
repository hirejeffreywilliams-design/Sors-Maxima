import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Calendar, Newspaper, AlertCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamRecord {
  team: string;
  sport: string;
  wins: number;
  losses: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
}

export function OffseasonPanel() {
  const { data: picks, isLoading: isLoadingPicks } = useQuery<any[]>({
    queryKey: ["/api/intelligence/picks", { sport: "NFL" }],
  });

  const { data: teamTrends, isLoading: isLoadingTrends } = useQuery<Record<string, TeamRecord>>({
    queryKey: ["/api/platform-intelligence/team-trends", { sport: "NFL" }],
  });

  const futures = (picks || []).filter(p => 
    p.betType === "future" || 
    p.pick.toLowerCase().includes("super bowl") ||
    p.pick.toLowerCase().includes("champion")
  );

  const powerRankings = Object.values(teamTrends || {})
    .filter(t => t.sport === "NFL")
    .sort((a, b) => {
      const aWinPct = a.wins / Math.max(1, a.wins + a.losses);
      const bWinPct = b.wins / Math.max(1, b.wins + b.losses);
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      return (b.avgPointsFor - b.avgPointsAgainst) - (a.avgPointsFor - a.avgPointsAgainst);
    })
    .slice(0, 5);

  const storylines = [
    { title: "Draft Strategy", content: "Teams focusing on QB-rich draft class; top 3 picks expected to be signal-callers." },
    { title: "Cap Space Leaders", content: "Bears and Commanders lead the league in effective cap space heading into free agency." },
    { title: "QB Carousel", content: "Several veteran starters expected to be on the move via trade or release before March." },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 bg-primary/5 border border-primary/10 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">NFL Offseason Intelligence</h2>
            <p className="text-sm text-muted-foreground">Draft & Free Agency Analysis Active</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Offseason Mode
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Championship Futures */}
        <Card className="hover-elevate transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Championship Futures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPicks ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : futures.length > 0 ? (
              <div className="space-y-3">
                {futures.map((f, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30">
                    <span className="font-medium">{f.pick}</span>
                    <span className="font-mono text-primary">+{f.odds}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">Draft Season</p>
                <p className="text-xs text-muted-foreground">Picks resume April 2025</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Power Rankings */}
        <Card className="hover-elevate transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Power Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : powerRankings.length > 0 ? (
              <div className="space-y-2">
                {powerRankings.map((team, i) => (
                  <div key={team.team} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-medium">{team.team}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {team.wins}-{team.losses}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Search className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">Rankings Updating</p>
                <p className="text-xs text-muted-foreground">Based on post-Super Bowl data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Storylines */}
        <Card className="hover-elevate transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-500" />
              Key Storylines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {storylines.map((story, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary/70">{story.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{story.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
