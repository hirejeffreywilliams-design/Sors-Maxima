import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Star, Flame, Target, Zap, Crown, Medal, 
  TrendingUp, Calendar, Gift, Lock, Check, Atom
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
  unlockedAt?: Date;
  xpReward: number;
}

const mockAchievements: Achievement[] = [
  { id: "1", name: "First Blood", description: "Win your first bet", icon: "trophy", category: "wins", tier: "bronze", progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date("2024-01-15"), xpReward: 50 },
  { id: "2", name: "Parlay King", description: "Win a 5-leg parlay", icon: "crown", category: "wins", tier: "gold", progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date("2024-02-20"), xpReward: 500 },
  { id: "3", name: "Hot Streak", description: "Win 5 bets in a row", icon: "flame", category: "streaks", tier: "silver", progress: 5, maxProgress: 5, unlocked: true, unlockedAt: new Date("2024-03-01"), xpReward: 200 },
  { id: "4", name: "Sharp Shooter", description: "Hit 10 +EV bets", icon: "target", category: "special", tier: "gold", progress: 8, maxProgress: 10, unlocked: false, xpReward: 300 },
  { id: "5", name: "Century Club", description: "Place 100 bets", icon: "medal", category: "milestones", tier: "silver", progress: 67, maxProgress: 100, unlocked: false, xpReward: 250 },
  { id: "6", name: "Underdog Hero", description: "Win 5 underdog bets (+200 or better)", icon: "star", category: "special", tier: "gold", progress: 3, maxProgress: 5, unlocked: false, xpReward: 400 },
  { id: "7", name: "Inferno", description: "Win 10 bets in a row", icon: "flame", category: "streaks", tier: "platinum", progress: 5, maxProgress: 10, unlocked: false, xpReward: 1000 },
  { id: "8", name: "Grand Slam", description: "Win a 10-leg parlay", icon: "crown", category: "wins", tier: "diamond", progress: 0, maxProgress: 1, unlocked: false, xpReward: 2500 },
  { id: "9", name: "Profit Master", description: "Reach +$1000 lifetime profit", icon: "trending", category: "milestones", tier: "platinum", progress: 650, maxProgress: 1000, unlocked: false, xpReward: 1500 },
  { id: "10", name: "Daily Grinder", description: "Bet 30 days in a row", icon: "zap", category: "streaks", tier: "gold", progress: 12, maxProgress: 30, unlocked: false, xpReward: 600 },
];

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
  const [achievements] = useState<Achievement[]>(mockAchievements);
  const [category, setCategory] = useState("all");

  const filtered = category === "all" 
    ? achievements 
    : achievements.filter(a => a.category === category);

  const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

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
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="wins">Wins</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="special">Special</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value={category} className="mt-4">
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
                          Unlocked {achievement.unlockedAt.toLocaleDateString()}
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
