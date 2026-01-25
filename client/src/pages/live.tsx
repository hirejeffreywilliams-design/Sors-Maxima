import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Shield, Bot, LineChart, Users, Brain } from "lucide-react";
import { MomentumTracker } from "@/components/live/momentum-tracker";
import { LiveHedgeCalculator } from "@/components/live/live-hedge-calculator";
import { BettingAssistant } from "@/components/ai/betting-assistant";
import { CLVTracker } from "@/components/analytics/clv-tracker";
import { PublicVsSharp } from "@/components/analytics/public-vs-sharp";
import { SchemeRecognition } from "@/components/scheme-recognition";
import { Badge } from "@/components/ui/badge";

export default function Live() {
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
            <p className="text-sm text-muted-foreground">Real-time momentum tracking, hedging, and AI assistance</p>
          </div>
        </header>

        <Tabs defaultValue="momentum" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="momentum" className="gap-1" data-testid="tab-momentum">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Momentum</span>
            </TabsTrigger>
            <TabsTrigger value="schemes" className="gap-1" data-testid="tab-schemes">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Schemes</span>
            </TabsTrigger>
            <TabsTrigger value="hedge" className="gap-1" data-testid="tab-hedge">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Hedge</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1" data-testid="tab-assistant">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="clv" className="gap-1" data-testid="tab-clv">
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">CLV</span>
            </TabsTrigger>
            <TabsTrigger value="sharp" className="gap-1" data-testid="tab-sharp">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Sharp</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="momentum" className="space-y-6">
            <MomentumTracker />
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
        </Tabs>
      </div>
    </div>
  );
}
