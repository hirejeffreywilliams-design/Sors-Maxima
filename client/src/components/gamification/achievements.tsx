import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Star, Flame, Target, Zap, Crown, Medal, 
  TrendingUp, Calendar, Gift, Lock, Check, Atom, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: "trophy" | "star" | "flame" | "target" | "zap" | "crown" | "medal" | "trending";
  category: "wins" | "streaks" | "special" | "milestones";
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

function getIcon(iconName: string) {
  const icons: Record<string, React.ReactNode> = {
    trophy: <Trophy className="w-6 h-6" />,
    star: <Star className="w-6 h-6" />,
    flame: <Flame className="w-6 h-6" />,
    target: <Target className="w-6 h-6" />,
    zap: <Zap className="w-6 h-6" />,
    crown: <Crown className="w-6 h-6" />,
    medal: <Medal className="w-6 h-6" />,
    trending: <TrendingUp className="w-6 h-6" />,
  };
  return icons[iconName] || <Trophy className="w-6 h-6" />;
}

function getTierColor(tier: string) {
  switch (tier) {
    case "bronze": return "from-amber-700 to-amber-900";
    case "silver": return "from-gray-400 to-gray-600";
    case "gold": return "from-yellow-500 to-amber-600";
    case "platinum": return "from-purple-400 to-purple-600";
    case "diamond": return "from-cyan-400 to-blue-500";
    default: return "from-gray-500 to-gray-700";
  }
}

function getTierBorderColor(tier: string) {
  switch (tier) {
    case "bronze": return "border-amber-700/30";
    case "silver": return "border-gray-400/30";
    case "gold": return "border-yellow-500/30";
    case "platinum": return "border-purple-400/30";
    case "diamond": return "border-cyan-400/30";
    default: return "border-border";
  }
}

export function Achievements() {
  const { data: achievements = [], isLoading } = useQuery<Achievement[]>({ queryKey: ["/api/user/achievements"] });
  const [category, setCategory] = useState("all");

  const filtered = category === "all" 
    ? achievements 
    : achievements.filter(a => a.category === category);

  const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievements
            <QuantumBadge />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              {totalXP.toLocaleString()} XP
            </Badge>
            <Badge variant="outline">
              {unlockedCount}/{achievements.length} Unlocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0" />
          <span>Data source: Live API</span>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5">
              <TabsTrigger value="all" className="px-2 sm:px-3">All</TabsTrigger>
              <TabsTrigger value="wins" className="px-2 sm:px-3">Wins</TabsTrigger>
              <TabsTrigger value="streaks" className="px-2 sm:px-3">Streaks</TabsTrigger>
              <TabsTrigger value="special" className="px-2 sm:px-3">Special</TabsTrigger>
              <TabsTrigger value="milestones" className="px-2 sm:px-3">Milestones</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={category} className="mt-4">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No achievements found</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`relative p-4 rounded-lg border ${getTierBorderColor(achievement.tier)} ${
                      achievement.unlocked 
                        ? "bg-gradient-to-br from-muted/50 to-muted/20" 
                        : "bg-muted/10 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${getTierColor(achievement.tier)} text-white`}>
                        {achievement.unlocked ? getIcon(achievement.icon) : <Lock className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">{achievement.name}</span>
                          {achievement.unlocked && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                        
                        {!achievement.unlocked && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.maxProgress) * 100} 
                              className="h-1.5"
                            />
                          </div>
                        )}
                        
                        {achievement.unlocked && achievement.unlockedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <Badge variant="outline" className="gap-1">
                          <Gift className="w-3 h-3" />
                          {achievement.xpReward} XP
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
