import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Flame, Gamepad2, Atom } from "lucide-react";
import { Achievements } from "@/components/gamification/achievements";
import { DailyChallenges } from "@/components/gamification/daily-challenges";
import { StreakTracker } from "@/components/gamification/streak-tracker";
import { PaperTrading } from "@/components/gamification/paper-trading";
import { Badge } from "@/components/ui/badge";

export default function Rewards() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              Rewards & Practice
              <Badge variant="outline" className="gap-1 bg-yellow-500/10 border-yellow-500/30 text-yellow-500">
                <Trophy className="w-3 h-3" />
                Gamification
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Earn achievements, complete challenges, and practice risk-free</p>
          </div>
        </header>

        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="challenges" className="gap-1">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="streaks" className="gap-1">
              <Flame className="w-4 h-4" />
              <span className="hidden sm:inline">Streaks</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="gap-1">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Practice</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-6">
            <DailyChallenges />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Achievements />
          </TabsContent>

          <TabsContent value="streaks" className="space-y-6">
            <StreakTracker />
          </TabsContent>

          <TabsContent value="practice" className="space-y-6">
            <PaperTrading />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
