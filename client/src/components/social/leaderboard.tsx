import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Trophy, Medal, TrendingUp, Users, Crown, Star, 
  ChevronRight, Flame, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface LeaderboardUser {
  id: string;
  username: string;
  avatar?: string;
  rank: number;
  roi: number;
  winRate: number;
  totalBets: number;
  streak: number;
  tier: "diamond" | "platinum" | "gold" | "silver" | "bronze";
  change: number;
}

const mockLeaderboard: LeaderboardUser[] = [
  { id: "1", username: "SharpShooter99", rank: 1, roi: 34.5, winRate: 62, totalBets: 245, streak: 8, tier: "diamond", change: 0 },
  { id: "2", username: "ParlayKing", rank: 2, roi: 28.2, winRate: 58, totalBets: 312, streak: 5, tier: "diamond", change: 1 },
  { id: "3", username: "EdgeMaster", rank: 3, roi: 25.8, winRate: 56, totalBets: 189, streak: 3, tier: "platinum", change: -1 },
  { id: "4", username: "BetWizard", rank: 4, roi: 22.1, winRate: 55, totalBets: 156, streak: 2, tier: "platinum", change: 2 },
  { id: "5", username: "MoneyMoves", rank: 5, roi: 19.4, winRate: 54, totalBets: 423, streak: 4, tier: "gold", change: -1 },
  { id: "6", username: "PropHunter", rank: 6, roi: 17.8, winRate: 53, totalBets: 287, streak: 0, tier: "gold", change: 3 },
  { id: "7", username: "ValueSeeker", rank: 7, roi: 15.2, winRate: 52, totalBets: 198, streak: 1, tier: "gold", change: -2 },
  { id: "8", username: "QuantumBetter", rank: 8, roi: 13.6, winRate: 51, totalBets: 167, streak: 2, tier: "silver", change: 0 },
];

function getTierColor(tier: string) {
  switch (tier) {
    case "diamond": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    case "platinum": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "gold": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "silver": return "bg-gray-400/10 text-gray-400 border-gray-400/30";
    default: return "bg-amber-700/10 text-amber-600 border-amber-700/30";
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
  const [users] = useState<LeaderboardUser[]>(mockLeaderboard);

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
            {users.map((user) => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover-elevate ${
                  user.rank <= 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : "bg-muted/30"
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(user.rank)}
                </div>

                <Avatar className="h-10 w-10">
                  <AvatarFallback className={getTierColor(user.tier)}>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{user.username}</span>
                    <Badge variant="outline" className={`text-xs ${getTierColor(user.tier)}`}>
                      {user.tier}
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

                <div className="text-right">
                  <p className={`font-bold ${user.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {user.roi >= 0 ? "+" : ""}{user.roi}% ROI
                  </p>
                  <div className="flex items-center justify-end gap-1 text-xs">
                    {user.change > 0 && <TrendingUp className="w-3 h-3 text-green-500" />}
                    {user.change < 0 && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                    <span className={user.change > 0 ? "text-green-500" : user.change < 0 ? "text-red-500" : "text-muted-foreground"}>
                      {user.change > 0 ? `+${user.change}` : user.change === 0 ? "-" : user.change}
                    </span>
                  </div>
                </div>

                <Button size="icon" variant="ghost" data-testid={`button-view-user-${user.id}`}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <span className="text-sm font-bold text-primary">#42</span>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary">YOU</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium">Your Ranking</span>
                <p className="text-xs text-muted-foreground">Keep betting to climb!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-500">+12.4% ROI</p>
              <p className="text-xs text-muted-foreground">54% win rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
