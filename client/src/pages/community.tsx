import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Share2, Bell, Atom } from "lucide-react";
import { BetSharing } from "@/components/social/bet-sharing";
import { Leaderboard } from "@/components/social/leaderboard";
import { FollowBettors } from "@/components/social/follow-bettors";
import { SmartAlerts } from "@/components/alerts/smart-alerts";
import { Badge } from "@/components/ui/badge";

export default function Community() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              Community
              <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
                <Atom className="w-3 h-3" />
                Quantum Network
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Connect with sharp bettors, share wins, and track alerts</p>
          </div>
        </header>

        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="leaderboard" className="gap-1" data-testid="tab-leaderboard">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="follow" className="gap-1" data-testid="tab-follow">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Follow</span>
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-1" data-testid="tab-share">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1" data-testid="tab-alerts">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="follow" className="space-y-6">
            <FollowBettors />
          </TabsContent>

          <TabsContent value="share" className="space-y-6">
            <BetSharing />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <SmartAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
