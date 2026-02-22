import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Medal, TrendingUp, Users, Crown, Star, 
  ChevronRight, Flame, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface LeaderboardUser {
  id: string;
  username: string;
  rank: number;
  roi: number;
  winRate: number;
  totalBets: number;
  streak: number;
  profit: number;
  badge: "elite" | "pro" | "starter";
  joinedAt: string;
}

function getBadgeColor(badge: string) {
  switch (badge) {
    case "elite": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    case "pro": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  }
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
}

export function Leaderboard() {
  const [timeframe, setTimeframe] = useState("weekly");

  const { data: users = [], isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/social/leaderboard", timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/social/leaderboard?timeframe=${timeframe}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
            <QuantumBadge />
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {users.length.toLocaleString()} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Today</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value={timeframe} className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leaderboard data available yet.</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`rounded-lg transition-colors hover-elevate ${
                    user.rank <= 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : "bg-muted/30"
                  }`}
                >
                  <div className="hidden sm:flex items-center gap-3 p-3">
                    <div className="w-8 flex justify-center shrink-0">
                      {getRankIcon(user.rank)}
                    </div>

                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={getBadgeColor(user.badge)}>
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{user.username}</span>
                        <Badge variant="outline" className={`text-xs ${getBadgeColor(user.badge)}`}>
                          {user.badge}
                        </Badge>
                        {user.streak >= 5 && (
                          <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-500 border-orange-500/30">
                            <Flame className="w-3 h-3" />
                            {user.streak}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{user.totalBets} bets</span>
                        <span>{user.winRate}% win rate</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-bold ${user.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {user.roi >= 0 ? "+" : ""}{user.roi}% ROI
                      </p>
                      <p className={`text-xs ${user.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {user.profit >= 0 ? "+" : ""}${user.profit}
                      </p>
                    </div>

                    <Button size="icon" variant="ghost" data-testid={`button-view-user-${user.id}`}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="sm:hidden p-3 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 flex justify-center shrink-0">
                        {getRankIcon(user.rank)}
                      </div>
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={getBadgeColor(user.badge)}>
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm truncate">{user.username}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBadgeColor(user.badge)}`}>
                            {user.badge}
                          </Badge>
                          {user.streak >= 5 && (
                            <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-orange-500/30">
                              <Flame className="w-2.5 h-2.5" />
                              {user.streak}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pl-[4.25rem]">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{user.totalBets} bets</span>
                        <span>{user.winRate}% win</span>
                      </div>
                      <p className={`text-sm font-bold ${user.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {user.roi >= 0 ? "+" : ""}{user.roi}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-7 sm:w-8 flex justify-center shrink-0">
                <span className="text-sm font-bold text-primary">#—</span>
              </div>
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary">YOU</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm sm:text-base">Your Ranking</span>
                <p className="text-xs text-muted-foreground">Track your bets to get ranked!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">Data source: Community leaderboard rankings</p>
        </div>
      </CardContent>
    </Card>
  );
}
