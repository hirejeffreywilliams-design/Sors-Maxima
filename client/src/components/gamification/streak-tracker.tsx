import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, Snowflake, TrendingUp, TrendingDown, Calendar,
  Trophy, Target, Zap, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface StreakData {
  currentStreak: number;
  streakType: "hot" | "cold" | "neutral";
  longestStreak: number;
  lastTenResults: ("W" | "L")[];
  momentum: number;
  dailyStreak: number;
  weeklyStreak: number;
}

const mockStreakData: StreakData = {
  currentStreak: 5,
  streakType: "hot",
  longestStreak: 12,
  lastTenResults: ["W", "W", "W", "W", "W", "L", "W", "W", "L", "W"],
  momentum: 78,
  dailyStreak: 8,
  weeklyStreak: 3,
};

export function StreakTracker() {
  const [data] = useState<StreakData>(mockStreakData);

  const getStreakIcon = () => {
    if (data.streakType === "hot") return <Flame className="w-8 h-8 text-orange-500" />;
    if (data.streakType === "cold") return <Snowflake className="w-8 h-8 text-blue-500" />;
    return <TrendingUp className="w-8 h-8 text-muted-foreground" />;
  };

  const getStreakColor = () => {
    if (data.streakType === "hot") return "from-orange-500 to-red-500";
    if (data.streakType === "cold") return "from-blue-500 to-cyan-500";
    return "from-gray-500 to-gray-600";
  };

  const getMomentumColor = (momentum: number) => {
    if (momentum >= 70) return "text-green-500";
    if (momentum >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Flame className="w-5 h-5 text-orange-500" />
          Streak Tracker
          <QuantumBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center">
          <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getStreakColor()} p-1`}>
            <div className="w-full h-full rounded-full bg-background flex flex-col items-center justify-center">
              {getStreakIcon()}
              <span className="text-3xl font-bold mt-1">{data.currentStreak}</span>
              <span className="text-xs text-muted-foreground">
                {data.streakType === "hot" ? "Win Streak" : data.streakType === "cold" ? "Loss Streak" : "Neutral"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-xl font-bold">{data.longestStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{data.dailyStreak}</p>
            <p className="text-xs text-muted-foreground">Days Active</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Zap className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className={`text-xl font-bold ${getMomentumColor(data.momentum)}`}>{data.momentum}%</p>
            <p className="text-xs text-muted-foreground">Momentum</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Last 10 Results</p>
          <div className="flex gap-1.5 justify-center">
            {data.lastTenResults.map((result, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  result === "W" 
                    ? "bg-green-500/20 text-green-500 border border-green-500/30" 
                    : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}
              >
                {result}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {data.lastTenResults.filter(r => r === "W").length}/10 Wins ({Math.round(data.lastTenResults.filter(r => r === "W").length * 10)}%)
          </p>
        </div>

        {data.currentStreak >= 5 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-orange-500">You're on fire!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.currentStreak} wins in a row. Only {data.longestStreak - data.currentStreak} more to beat your record!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
