import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Share2, Bell, MessageCircle, Rss, Copy } from "lucide-react";
import { BetSharing } from "@/components/social/bet-sharing";
import { Leaderboard } from "@/components/social/leaderboard";
import { FollowBettors } from "@/components/social/follow-bettors";
import { SmartAlerts } from "@/components/alerts/smart-alerts";
import { SocialFeed } from "@/components/social/social-feed";
import { CopyBetting } from "@/components/social/copy-betting";
import { Badge } from "@/components/ui/badge";
import { TipsterContent } from "@/components/community/tipster-content";

export default function Community() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            Community
            <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
              <Users className="w-3 h-3" />
              Connect
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Connect with bettors, follow tipsters, and share wins</p>
        </header>

        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="social" className="gap-1" data-testid="tab-social">
              <Users className="w-4 h-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="tipsters" className="gap-1" data-testid="tab-tipsters">
              <MessageCircle className="w-4 h-4" />
              Tipsters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="space-y-6">
            <Tabs defaultValue="leaderboard" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6 max-w-2xl">
                <TabsTrigger value="leaderboard" className="gap-1 text-xs sm:text-sm" data-testid="tab-leaderboard">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Leaders</span>
                </TabsTrigger>
                <TabsTrigger value="follow" className="gap-1 text-xs sm:text-sm" data-testid="tab-follow">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Follow</span>
                </TabsTrigger>
                <TabsTrigger value="share" className="gap-1 text-xs sm:text-sm" data-testid="tab-share">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-1 text-xs sm:text-sm" data-testid="tab-alerts">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Alerts</span>
                </TabsTrigger>
                <TabsTrigger value="feed" className="gap-1 text-xs sm:text-sm" data-testid="tab-feed">
                  <Rss className="w-4 h-4" />
                  <span className="hidden sm:inline">Feed</span>
                </TabsTrigger>
                <TabsTrigger value="copy" className="gap-1 text-xs sm:text-sm" data-testid="tab-copy">
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard">
                <Leaderboard />
              </TabsContent>

              <TabsContent value="follow">
                <FollowBettors />
              </TabsContent>

              <TabsContent value="share">
                <BetSharing />
              </TabsContent>

              <TabsContent value="alerts">
                <SmartAlerts />
              </TabsContent>

              <TabsContent value="feed">
                <SocialFeed />
              </TabsContent>

              <TabsContent value="copy">
                <CopyBetting />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tipsters" className="space-y-6">
            <TipsterContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
