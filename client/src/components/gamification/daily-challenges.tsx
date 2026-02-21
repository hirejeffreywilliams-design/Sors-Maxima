import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, Clock, Gift, Trophy, Zap, Star, 
  ChevronRight, RefreshCw, Flame, Atom, Check
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly";
  reward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  claimed: boolean;
  expiresAt: Date;
  difficulty: "easy" | "medium" | "hard";
}

const mockChallenges: Challenge[] = [
  { id: "1", title: "Parlay Perfect", description: "Win a 3-leg parlay", type: "daily", reward: 100, progress: 0, maxProgress: 1, completed: false, claimed: false, expiresAt: new Date(Date.now() + 43200000), difficulty: "medium" },
  { id: "2", title: "Sharp Eyes", description: "Track 3 sharp consensus picks", type: "daily", reward: 75, progress: 2, maxProgress: 3, completed: false, claimed: false, expiresAt: new Date(Date.now() + 43200000), difficulty: "easy" },
  { id: "3", title: "Risk Taker", description: "Track an underdog pick (+150 or better)", type: "daily", reward: 150, progress: 1, maxProgress: 1, completed: true, claimed: false, expiresAt: new Date(Date.now() + 43200000), difficulty: "hard" },
  { id: "4", title: "Diversify", description: "Track picks across 4 different sports", type: "daily", reward: 50, progress: 2, maxProgress: 4, completed: false, claimed: false, expiresAt: new Date(Date.now() + 43200000), difficulty: "easy" },
  { id: "5", title: "Week Warrior", description: "Track 10 picks this week", type: "weekly", reward: 500, progress: 6, maxProgress: 10, completed: false, claimed: false, expiresAt: new Date(Date.now() + 432000000), difficulty: "medium" },
  { id: "6", title: "Profit Month", description: "End the week with positive ROI", type: "weekly", reward: 750, progress: 1, maxProgress: 1, completed: true, claimed: true, expiresAt: new Date(Date.now() + 432000000), difficulty: "hard" },
];

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "easy": return "bg-green-500/10 text-green-500 border-green-500/30";
    case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "hard": return "bg-red-500/10 text-red-500 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatTimeRemaining(date: Date) {
  const diff = date.getTime() - Date.now();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function DailyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);

  const claimReward = (id: string) => {
    setChallenges(prev => prev.map(c => 
      c.id === id ? { ...c, claimed: true } : c
    ));
  };

  const dailyChallenges = challenges.filter(c => c.type === "daily");
  const weeklyChallenges = challenges.filter(c => c.type === "weekly");

  const totalDailyXP = dailyChallenges.reduce((sum, c) => sum + c.reward, 0);
  const earnedDailyXP = dailyChallenges.filter(c => c.completed).reduce((sum, c) => sum + c.reward, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Target className="w-5 h-5 text-orange-500" />
            Daily Challenges
            <QuantumBadge />
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            {earnedDailyXP}/{totalDailyXP} XP Today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Daily Challenges
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Resets in {formatTimeRemaining(dailyChallenges[0]?.expiresAt || new Date())}
            </span>
          </div>
          
          <div className="space-y-3">
            {dailyChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`p-4 rounded-lg border ${
                  challenge.completed && !challenge.claimed
                    ? "bg-green-500/5 border-green-500/30"
                    : challenge.claimed
                    ? "bg-muted/20 border-border opacity-60"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{challenge.title}</span>
                      <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                      {challenge.completed && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                    
                    {!challenge.completed && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{challenge.progress}/{challenge.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(challenge.progress / challenge.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      <Gift className="w-3 h-3" />
                      +{challenge.reward} XP
                    </Badge>
                    
                    {challenge.completed && !challenge.claimed && (
                      <Button 
                        size="sm" 
                        onClick={() => claimReward(challenge.id)}
                        className="bg-green-500 hover:bg-green-600"
                        data-testid={`button-claim-${challenge.id}`}
                      >
                        Claim
                      </Button>
                    )}
                    {challenge.claimed && (
                      <Badge variant="secondary">Claimed</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Weekly Challenges
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeRemaining(weeklyChallenges[0]?.expiresAt || new Date())} left
            </span>
          </div>
          
          <div className="space-y-3">
            {weeklyChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`p-4 rounded-lg border ${
                  challenge.completed && !challenge.claimed
                    ? "bg-green-500/5 border-green-500/30"
                    : challenge.claimed
                    ? "bg-muted/20 border-border opacity-60"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{challenge.title}</span>
                      <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                      {challenge.completed && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                    
                    {!challenge.completed && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{challenge.progress}/{challenge.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(challenge.progress / challenge.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/30">
                      <Trophy className="w-3 h-3" />
                      +{challenge.reward} XP
                    </Badge>
                    
                    {challenge.completed && !challenge.claimed && (
                      <Button 
                        size="sm" 
                        onClick={() => claimReward(challenge.id)}
                        className="bg-green-500 hover:bg-green-600"
                        data-testid={`button-claim-${challenge.id}`}
                      >
                        Claim
                      </Button>
                    )}
                    {challenge.claimed && (
                      <Badge variant="secondary">Claimed</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
