import { useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Shield, Bot, LineChart, Users, Brain, DollarSign, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { MomentumTracker } from "@/components/live/momentum-tracker";
import { LiveHedgeCalculator } from "@/components/live/live-hedge-calculator";
import { BettingAssistant } from "@/components/ai/betting-assistant";
import { CLVTracker } from "@/components/analytics/clv-tracker";
import { PublicVsSharp } from "@/components/analytics/public-vs-sharp";
import { SchemeRecognition } from "@/components/scheme-recognition";
import { CashoutAdvisor } from "@/components/live/cashout-advisor";
import { LiveChat } from "@/components/live/live-chat";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/use-seo";
import { useSSE, type SSEEvent } from "@/hooks/use-sse";
import { queryClient } from "@/lib/queryClient";

export default function Live() {
  useSEO({ title: "Live Betting", description: "Real-time live betting tools and analysis" });

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    if (event.type === "live-scores" || event.type === "intelligence-update") {
      queryClient.invalidateQueries({ queryKey: ["/api/live/momentum"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market-snapshot"] });
    }
    if (event.type === "edge-alerts") {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
    }
  }, []);

  const sse = useSSE({ enabled: true, onEvent: handleSSEEvent });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              Live Center
              <Badge variant="outline" className="gap-1 bg-red-500/10 border-red-500/30 text-red-500">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Real-time game tracking, hedging tools, and AI assistance</p>
          </div>
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
        </header>

        <Tabs defaultValue="momentum" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-8 sm:max-w-3xl">
              <TabsTrigger value="momentum" className="gap-1 px-2 sm:px-3" data-testid="tab-momentum">
                <Activity className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Momentum</span>
              </TabsTrigger>
              <TabsTrigger value="cashout" className="gap-1 px-2 sm:px-3" data-testid="tab-cashout">
                <DollarSign className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Cashout</span>
              </TabsTrigger>
              <TabsTrigger value="schemes" className="gap-1 px-2 sm:px-3" data-testid="tab-schemes">
                <Brain className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="hedge" className="gap-1 px-2 sm:px-3" data-testid="tab-hedge">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Hedge</span>
              </TabsTrigger>
              <TabsTrigger value="assistant" className="gap-1 px-2 sm:px-3" data-testid="tab-assistant">
                <Bot className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="clv" className="gap-1 px-2 sm:px-3" data-testid="tab-clv">
                <LineChart className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Line Value</span>
              </TabsTrigger>
              <TabsTrigger value="sharp" className="gap-1 px-2 sm:px-3" data-testid="tab-sharp">
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Sharp</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1 px-2 sm:px-3" data-testid="tab-chat">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="momentum" className="space-y-6">
            <MomentumTracker />
          </TabsContent>

          <TabsContent value="cashout" className="space-y-6">
            <CashoutAdvisor />
          </TabsContent>

          <TabsContent value="schemes" className="space-y-6">
            <SchemeRecognition mode="live" />
          </TabsContent>

          <TabsContent value="hedge" className="space-y-6">
            <LiveHedgeCalculator />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <BettingAssistant />
          </TabsContent>

          <TabsContent value="clv" className="space-y-6">
            <CLVTracker />
          </TabsContent>

          <TabsContent value="sharp" className="space-y-6">
            <PublicVsSharp />
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <LiveChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
