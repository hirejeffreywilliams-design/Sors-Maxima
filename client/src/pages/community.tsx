import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/page-hero";
import { Trophy, Users, Share2, Bell, MessageCircle, Rss, Copy, Info } from "lucide-react";
import { BetSharing } from "@/components/social/bet-sharing";
import { Leaderboard } from "@/components/social/leaderboard";
import { FollowBettors } from "@/components/social/follow-bettors";
import { SmartAlerts } from "@/components/alerts/smart-alerts";
import { SocialFeed } from "@/components/social/social-feed";
import { CopyBetting } from "@/components/social/copy-betting";
import { Badge } from "@/components/ui/badge";
import { TipsterContent } from "@/components/community/tipster-content";
import { SharedTicketsContent } from "@/components/community/shared-tickets-content";
import { useSEO } from "@/hooks/use-seo";

export default function Community() {
  useSEO({ title: "Community", description: "Connect with fellow bettors and share insights" });
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageHero
          icon={<Users className="w-6 h-6" />}
          title="Community"
          badge="Connect"
          subtitle="Connect with bettors, follow tipsters, and share wins"
          variant="violet"
        />

        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-sm">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span className="text-muted-foreground">
            <span className="text-blue-400 font-medium">Early Access — </span>
            Community leaderboards and social feeds currently display sample activity while the member network grows. Your real pick performance is tracked on the{" "}
            <a href="/track-record" className="text-blue-400 hover:underline">Track Record</a> page.
          </span>
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="feed" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-feed">
              <Users className="w-4 h-4 shrink-0" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="tipster-groups" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-tipster-groups">
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Tipster</span> Groups
            </TabsTrigger>
            <TabsTrigger value="shared-tickets" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-shared-tickets">
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Shared</span> Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <Tabs defaultValue="leaderboard" className="space-y-4">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 sm:max-w-2xl">
                  <TabsTrigger value="leaderboard" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-leaderboard">
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Leaders</span>
                  </TabsTrigger>
                  <TabsTrigger value="follow" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-follow">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Follow</span>
                  </TabsTrigger>
                  <TabsTrigger value="share" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-share">
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Share</span>
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-alerts">
                    <Bell className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Alerts</span>
                  </TabsTrigger>
                  <TabsTrigger value="social-feed" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-social-feed">
                    <Rss className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Feed</span>
                  </TabsTrigger>
                  <TabsTrigger value="copy" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-copy">
                    <Copy className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Copy</span>
                  </TabsTrigger>
                </TabsList>
              </div>

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

              <TabsContent value="social-feed">
                <SocialFeed />
              </TabsContent>

              <TabsContent value="copy">
                <CopyBetting />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tipster-groups" className="space-y-6">
            <TipsterContent />
          </TabsContent>

          <TabsContent value="shared-tickets" className="space-y-6">
            <SharedTicketsContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
