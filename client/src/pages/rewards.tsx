import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Flame, Gamepad2, Atom, Swords } from "lucide-react";
import { Achievements } from "@/components/gamification/achievements";
import { DailyChallenges } from "@/components/gamification/daily-challenges";
import { StreakTracker } from "@/components/gamification/streak-tracker";
import { PaperTrading } from "@/components/gamification/paper-trading";
import { PickCompetitions } from "@/components/gamification/pick-competitions";
import { Badge } from "@/components/ui/badge";

export default function Rewards() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-2 sm:px-0">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              Rewards & Practice
              <Badge variant="outline" className="gap-1 bg-yellow-500/10 border-yellow-500/30 text-yellow-500 h-5 text-[10px]">
                <Trophy className="w-2.5 h-2.5" />
                Rewards & Challenges
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Earn achievements and practice risk-free</p>
          </div>
        </header>

        <Tabs defaultValue="challenges" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 sm:max-w-2xl">
              <TabsTrigger value="challenges" className="gap-1 px-2 sm:px-3" data-testid="tab-challenges">
                <Target className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Challenges</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1 px-2 sm:px-3" data-testid="tab-achievements">
                <Trophy className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Achievements</span>
              </TabsTrigger>
              <TabsTrigger value="streaks" className="gap-1 px-2 sm:px-3" data-testid="tab-streaks">
                <Flame className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Streaks</span>
              </TabsTrigger>
              <TabsTrigger value="practice" className="gap-1 px-2 sm:px-3" data-testid="tab-practice">
                <Gamepad2 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Practice</span>
              </TabsTrigger>
              <TabsTrigger value="compete" className="gap-1 px-2 sm:px-3" data-testid="tab-compete">
                <Swords className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Compete</span>
              </TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="compete" className="space-y-6">
            <PickCompetitions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
