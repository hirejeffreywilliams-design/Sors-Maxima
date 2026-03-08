import { useEffect } from "react";
import { PageHero } from "@/components/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Shield, Bot, LineChart, Users, Brain, DollarSign, MessageSquare, Wifi, WifiOff, Sliders, Lock } from "lucide-react";
import { LiveScoresFeed } from "@/components/live/live-scores-feed";
import { CashoutStrategiesEngine } from "@/components/live/cashout-strategies-engine";
import { MomentumTracker } from "@/components/live/momentum-tracker";
import { LiveHedgeCalculator } from "@/components/live/live-hedge-calculator";
import { BettingAssistant } from "@/components/ai/betting-assistant";
import { CLVTracker } from "@/components/analytics/clv-tracker";
import { PublicVsSharp } from "@/components/analytics/public-vs-sharp";
import { SchemeRecognition } from "@/components/scheme-recognition";
import { CashoutAdvisor } from "@/components/live/cashout-advisor";
import { LiveChat } from "@/components/live/live-chat";
import { LiveFactorAdjuster } from "@/components/live/live-factor-adjuster";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/use-seo";
import { useSSEContext } from "@/context/sse-provider";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TierGate, useTier } from "@/components/tier-gate";

interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "halftime" | "final" | "pre";
  period: string;
  clock: string;
  gameDate?: string;
}

function LiveGamesStrip({ games }: { games: LiveGame[] }) {
  const live = games.filter(g => g.status === "live" || g.status === "halftime");
  if (live.length === 0) return null;
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
        {live.map(g => (
          <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{g.sport}</span>
            <span className="text-xs">
              {g.awayTeam.split(" ").pop()} <span className="font-bold">{g.awayScore}</span>
              <span className="text-muted-foreground mx-1">@</span>
              {g.homeTeam.split(" ").pop()} <span className="font-bold">{g.homeScore}</span>
            </span>
            {g.period && <span className="text-xs text-muted-foreground">Q{g.period}{g.clock ? ` ${g.clock}` : ""}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Live() {
  useSEO({ title: "Live Betting", description: "Real-time live betting tools and analysis" });
  const { canAccess } = useTier();

  const sse = useSSEContext();

  useEffect(() => {
    if (!sse.lastEvent) return;
    if (sse.lastEvent.type === "live-scores" || sse.lastEvent.type === "intelligence-update") {
      queryClient.invalidateQueries({ queryKey: ["/api/live/momentum"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live/factor-adjustments"] });
    }
    if (sse.lastEvent.type === "edge-alerts") {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
    }
  }, [sse.lastEvent]);

  const isMax = canAccess("whale");

  const { data: momentumGames } = useQuery<LiveGame[]>({
    queryKey: ["/api/live/momentum"],
    refetchInterval: 30000,
    enabled: isMax,
  });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageHero
          icon={<Activity className="w-6 h-6" />}
          title="Live Center"
          badge="LIVE"
          subtitle="Real-time game tracking, live factors, cashout analysis & intelligence"
          actions={
            <div className="flex items-center gap-2" data-testid="sse-live-status">
              {sse.connected ? (
                <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
                  <Wifi className="w-3 h-3" />
                  SSE Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                  <WifiOff className="w-3 h-3" />
                  Reconnecting...
                </Badge>
              )}
              {sse.lastUpdate && (
                <span className="text-xs text-muted-foreground" data-testid="text-live-last-update">
                  Updated {new Date(sse.lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          }
        />

        {isMax && momentumGames && momentumGames.some(g => g.status === "live" || g.status === "halftime") && (
          <LiveGamesStrip games={momentumGames} />
        )}

        <Tabs defaultValue="scores" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-10 sm:max-w-5xl">
              <TabsTrigger value="scores" className="gap-1 px-2 sm:px-3 relative" data-testid="tab-scores">
                <Activity className="w-4 h-4 shrink-0 text-red-400" />
                <span className="hidden sm:inline">Scores</span>
                {sse.lastEvent?.type === "live-scores" || sse.lastEvent?.type === "intelligence-update" ? (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="factors" className="gap-1 px-2 sm:px-3 relative" data-testid="tab-factors">
                <Sliders className="w-4 h-4 shrink-0 text-blue-500" />
                <span className="hidden sm:inline">Factors</span>
              </TabsTrigger>
              <TabsTrigger value="momentum" className="gap-1 px-2 sm:px-3" data-testid="tab-momentum">
                <Activity className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Momentum</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-50 hidden sm:block" />}
              </TabsTrigger>
              <TabsTrigger value="cashout" className="gap-1 px-2 sm:px-3" data-testid="tab-cashout">
                <DollarSign className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Cashout</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-50 hidden sm:block" />}
              </TabsTrigger>
              <TabsTrigger value="schemes" className="gap-1 px-2 sm:px-3" data-testid="tab-schemes">
                <Brain className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="hedge" className="gap-1 px-2 sm:px-3" data-testid="tab-hedge">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Hedge</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-50 hidden sm:block" />}
              </TabsTrigger>
              <TabsTrigger value="assistant" className="gap-1 px-2 sm:px-3" data-testid="tab-assistant">
                <Bot className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Assistant</span>
              </TabsTrigger>
              <TabsTrigger value="clv" className="gap-1 px-2 sm:px-3" data-testid="tab-clv">
                <LineChart className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Line Value</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-50 hidden sm:block" />}
              </TabsTrigger>
              <TabsTrigger value="sharp" className="gap-1 px-2 sm:px-3" data-testid="tab-sharp">
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Sharp</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-50 hidden sm:block" />}
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1 px-2 sm:px-3" data-testid="tab-chat">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scores" className="space-y-6">
            <LiveScoresFeed />
          </TabsContent>

          <TabsContent value="factors" className="space-y-6">
            <LiveFactorAdjuster />
          </TabsContent>

          <TabsContent value="momentum" className="space-y-6">
            {isMax
              ? <MomentumTracker />
              : <TierGate required="whale" label="Live Momentum Tracker" description="Real-time game momentum scoring with swing detection — know exactly when a line is about to move before it happens." />
            }
          </TabsContent>

          <TabsContent value="cashout" className="space-y-6">
            {isMax ? (
              <Tabs defaultValue="strategies" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="strategies" className="gap-1.5 text-[11px]">
                    <DollarSign className="w-3.5 h-3.5" />
                    Cashout Engineering
                  </TabsTrigger>
                  <TabsTrigger value="live" className="gap-1.5 text-[11px]">
                    <Activity className="w-3.5 h-3.5" />
                    Live Advice
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="strategies">
                  <CashoutStrategiesEngine />
                </TabsContent>
                <TabsContent value="live">
                  <CashoutAdvisor />
                </TabsContent>
              </Tabs>
            ) : (
              <TierGate required="whale" label="Cashout Engineering™ + Live Advisor" description="Build tickets engineered to force profitable cashout windows — plus EV-adjusted live cashout recommendations updated every 30 seconds." />
            )}
          </TabsContent>

          <TabsContent value="schemes" className="space-y-6">
            <SchemeRecognition mode="live" />
          </TabsContent>

          <TabsContent value="hedge" className="space-y-6">
            {isMax
              ? <LiveHedgeCalculator />
              : <TierGate required="whale" label="Live Hedge Calculator" description="Real-time hedge sizing across your active parlay legs — lock in guaranteed profit as games go live." />
            }
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <BettingAssistant />
          </TabsContent>

          <TabsContent value="clv" className="space-y-6">
            {isMax
              ? <CLVTracker />
              : <TierGate required="whale" label="CLV Deep Analysis" description="Track closing line value on every pick you've placed. The only stat serious bettors use to validate long-term edge." />
            }
          </TabsContent>

          <TabsContent value="sharp" className="space-y-6">
            {isMax
              ? <PublicVsSharp />
              : <TierGate required="whale" label="Public vs. Sharp Money" description="Live public betting percentage vs. sharp money flow on every game. See where the informed money is going in real time." />
            }
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <LiveChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
