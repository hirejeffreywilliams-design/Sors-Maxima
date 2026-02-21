import { Flame, TrendingUp, Star, Users, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HotStreak } from "@shared/schema";

interface HotStreakDetectorProps {
  sport?: string;
}

function generateMockHotStreaks(sport: string): HotStreak[] {
  const playerStreaks: HotStreak[] = [
    {
      type: "player",
      name: "Star Player A",
      team: "Knicks",
      sport: "NBA",
      streakLength: 8,
      streakType: "Over on Points (25.5)",
      hitRate: 0.85,
      recommendation: "Strong pattern - consider adding to parlay",
      confidence: "high",
    },
    {
      type: "player",
      name: "Star Player B",
      team: "Chiefs",
      sport: "NFL",
      streakLength: 5,
      streakType: "Over on Passing Yards (275.5)",
      hitRate: 0.78,
      recommendation: "Consistent performer in recent games",
      confidence: "high",
    },
    {
      type: "player",
      name: "Star Player C",
      team: "Yankees",
      sport: "MLB",
      streakLength: 6,
      streakType: "Over on Hits (1.5)",
      hitRate: 0.72,
      recommendation: "Hot bat - good value on hit props",
      confidence: "medium",
    },
    {
      type: "team",
      name: "Mavericks",
      sport: "NBA",
      streakLength: 7,
      streakType: "ATS Cover Streak",
      hitRate: 0.82,
      recommendation: "Sharp money backing this team",
      confidence: "high",
    },
    {
      type: "team",
      name: "49ers",
      sport: "NFL",
      streakLength: 4,
      streakType: "Over on Team Total",
      hitRate: 0.68,
      recommendation: "Offensive production trending up",
      confidence: "medium",
    },
    {
      type: "player",
      name: "Star Player D",
      team: "Nuggets",
      sport: "NBA",
      streakLength: 10,
      streakType: "Over on Assists (8.5)",
      hitRate: 0.91,
      recommendation: "Elite playmaker on historic streak",
      confidence: "high",
    },
  ];

  if (sport && sport !== "all") {
    return playerStreaks.filter(s => s.sport === sport);
  }
  return playerStreaks;
}

export function HotStreakDetector({ sport = "all" }: HotStreakDetectorProps) {
  const hotStreaks = generateMockHotStreaks(sport);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Hot Streak Detector
          <Badge variant="outline" className="ml-auto">
            {hotStreaks.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm mb-3" data-testid="banner-demo-streaks">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        {hotStreaks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hot streaks detected for {sport}</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {hotStreaks.map((streak, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border ${
                    streak.confidence === "high" 
                      ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30"
                      : "bg-muted/50"
                  }`}
                  data-testid={`hot-streak-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {streak.type === "player" ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Users className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="font-medium">{streak.name}</span>
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
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {streak.sport}
                    </Badge>
                    <span className="text-sm">{streak.streakType}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
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
      </CardContent>
    </Card>
  );
}
