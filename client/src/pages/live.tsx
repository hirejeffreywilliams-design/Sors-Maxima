import { useEffect, useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Shield, Bot, LineChart, Users, Brain, DollarSign,
  Wifi, WifiOff, Sliders, Lock, Zap, TrendingUp, BarChart3,
} from "lucide-react";
import { LiveScoresFeed } from "@/components/live/live-scores-feed";
import { CashoutStrategiesEngine } from "@/components/live/cashout-strategies-engine";
import { MomentumTracker } from "@/components/live/momentum-tracker";
import { LiveHedgeCalculator } from "@/components/live/live-hedge-calculator";
import { BettingAssistant } from "@/components/ai/betting-assistant";
import { CLVTracker } from "@/components/analytics/clv-tracker";
import { PublicVsSharp } from "@/components/analytics/public-vs-sharp";
import { SchemeRecognition } from "@/components/scheme-recognition";
import { CashoutAdvisor } from "@/components/live/cashout-advisor";
import { LiveFactorAdjuster } from "@/components/live/live-factor-adjuster";
import { Badge } from "@/components/ui/badge";
import { Tabs as InnerTabs, TabsContent as InnerTabsContent, TabsList as InnerTabsList, TabsTrigger as InnerTabsTrigger } from "@/components/ui/tabs";
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

// ─── Live games horizontal scroll strip ───────────────────────────────────────

function LiveGamesStrip({ games }: { games: LiveGame[] }) {
  const live = games.filter(g => g.status === "live" || g.status === "halftime");
  if (live.length === 0) return null;
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
        {live.map(g => (
          <div
            key={g.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 border"
            style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.22)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">{g.sport}</span>
            <span className="text-[11px] font-bold text-white/85">
              {g.awayTeam.split(" ").pop()} <span className="tabular-nums">{g.awayScore}</span>
              <span className="text-white/30 mx-1.5">–</span>
              {g.homeTeam.split(" ").pop()} <span className="tabular-nums">{g.homeScore}</span>
            </span>
            {g.period && (
              <span className="text-[8px] text-white/35">
                {g.period}{g.clock ? ` ${g.clock}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Actions bar ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: "scores",    icon: Activity,    label: "Live Now",      color: "#ef4444", description: "Scores & alerts" },
  { id: "cashout",   icon: DollarSign,  label: "Cashout",       color: "#f97316", description: "Engineering + live advice" },
  { id: "hedge",     icon: Shield,      label: "Hedge",         color: "#34d399", description: "Real-time hedge sizing" },
  { id: "momentum",  icon: TrendingUp,  label: "Momentum",      color: "#a78bfa", description: "Live game momentum" },
  { id: "analytics", icon: BarChart3,   label: "Analytics",     color: "#60a5fa", description: "CLV, sharp, factors" },
  { id: "assistant", icon: Bot,         label: "Ask AI",        color: "#fbbf24", description: "Betting assistant" },
];

function QuickActions({
  activeTab,
  onSelect,
  isMax,
}: {
  activeTab: string;
  onSelect: (tab: string) => void;
  isMax: boolean;
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
        {QUICK_ACTIONS.map(action => {
          const isActive = activeTab === action.id;
          const needsMax = ["hedge", "momentum"].includes(action.id) && !isMax;
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onSelect(action.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 shrink-0 group"
              style={{
                background: isActive ? `${action.color}18` : "rgba(255,255,255,0.03)",
                borderColor: isActive ? `${action.color}40` : "rgba(255,255,255,0.07)",
                boxShadow: isActive ? `0 0 12px ${action.color}20` : "none",
              }}
              data-testid={`quickaction-${action.id}`}
            >
              <Icon
                className="w-3.5 h-3.5 shrink-0 transition-colors"
                style={{ color: isActive ? action.color : "rgba(255,255,255,0.35)" }}
              />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-black leading-none"
                    style={{ color: isActive ? action.color : "rgba(255,255,255,0.55)" }}
                  >
                    {action.label}
                  </span>
                  {needsMax && <Lock className="w-2.5 h-2.5 text-white/20" />}
                </div>
                <p className="text-[8px] text-white/25 mt-0.5 hidden sm:block">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Analytics multi-tab section ──────────────────────────────────────────────

function AnalyticsSection({ isMax }: { isMax: boolean }) {
  return (
    <InnerTabs defaultValue="clv" className="space-y-4">
      <InnerTabsList className="grid w-full grid-cols-4 max-w-lg">
        <InnerTabsTrigger value="clv" className="gap-1 text-[10px]" data-testid="inner-tab-clv">
          <LineChart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Line Value</span>
          <span className="sm:hidden">CLV</span>
        </InnerTabsTrigger>
        <InnerTabsTrigger value="sharp" className="gap-1 text-[10px]" data-testid="inner-tab-sharp">
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sharp</span>
          <span className="sm:hidden">Sharp</span>
        </InnerTabsTrigger>
        <InnerTabsTrigger value="factors" className="gap-1 text-[10px]" data-testid="inner-tab-factors">
          <Sliders className="w-3.5 h-3.5" />
          Factors
        </InnerTabsTrigger>
        <InnerTabsTrigger value="patterns" className="gap-1 text-[10px]" data-testid="inner-tab-patterns">
          <Brain className="w-3.5 h-3.5" />
          Patterns
        </InnerTabsTrigger>
      </InnerTabsList>

      <InnerTabsContent value="clv">
        {isMax
          ? <CLVTracker />
          : <TierGate required="whale" label="CLV Deep Analysis" description="Track closing line value on every pick you've placed — the only stat serious bettors use to validate long-term edge." />}
      </InnerTabsContent>
      <InnerTabsContent value="sharp">
        {isMax
          ? <PublicVsSharp />
          : <TierGate required="whale" label="Public vs. Sharp Money" description="Live public betting percentage vs. sharp money flow on every game. See where the informed money is going in real time." />}
      </InnerTabsContent>
      <InnerTabsContent value="factors">
        <LiveFactorAdjuster />
      </InnerTabsContent>
      <InnerTabsContent value="patterns">
        <SchemeRecognition mode="live" />
      </InnerTabsContent>
    </InnerTabs>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Live() {
  useSEO({ title: "Live Center", description: "Real-time live betting tools: scores, cashout engineering, hedge calculator, and AI advice" });
  const { canAccess } = useTier();
  const sse = useSSEContext();
  const [activeTab, setActiveTab] = useState("scores");

  const isMax = canAccess("whale");

  // Invalidate live data on SSE events
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

  const { data: momentumGames } = useQuery<LiveGame[]>({
    queryKey: ["/api/live/momentum"],
    refetchInterval: 30000,
  });

  const liveGamesForStrip = momentumGames?.filter(g => g.status === "live" || g.status === "halftime") ?? [];

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Hero */}
        <PageHero
          icon={<Activity className="w-6 h-6" />}
          title="Live Center"
          badge="LIVE"
          subtitle="Real-time scores, cashout engineering, hedge tools & AI analysis"
          description="Switch between six tabs: Live Scores (game updates), Cashout Advisor (when to exit an active bet), Hedge Calculator (lock in profit on parlays), Momentum Tracker (which team is surging), Analytics (sharp money signals and CLV), and AI Assistant (ask anything about your active bets). All data refreshes every 30 seconds automatically."
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

        {/* Live games horizontal strip — visible to all */}
        {liveGamesForStrip.length > 0 && (
          <LiveGamesStrip games={momentumGames ?? []} />
        )}

        {/* Quick Actions — jump to any section instantly */}
        <div className="space-y-1">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/20 px-0.5">Quick Access</p>
          <QuickActions activeTab={activeTab} onSelect={setActiveTab} isMax={isMax} />
        </div>

        {/* New alert pulse when SSE fires edge-alerts */}
        {sse.lastEvent?.type === "edge-alerts" && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl border animate-pulse"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}
            data-testid="sse-edge-alert-banner"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-black text-amber-300">New edge alert received — check Live Scores for details</span>
            <button
              className="ml-auto text-[9px] text-amber-400/60 hover:text-amber-400 transition-colors"
              onClick={() => setActiveTab("scores")}
            >
              View →
            </button>
          </div>
        )}

        {/* Main Tabs — 6 focused tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 sm:max-w-3xl">

              <TabsTrigger value="scores" className="gap-1.5 px-3 relative" data-testid="tab-scores">
                <Activity className="w-4 h-4 shrink-0 text-red-400" />
                <span className="hidden sm:inline text-[11px]">Live Scores</span>
                {(sse.lastEvent?.type === "live-scores" || sse.lastEvent?.type === "intelligence-update") && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </TabsTrigger>

              <TabsTrigger value="cashout" className="gap-1.5 px-3" data-testid="tab-cashout">
                <DollarSign className="w-4 h-4 shrink-0 text-orange-400" />
                <span className="hidden sm:inline text-[11px]">Cashout</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-40 hidden sm:block" />}
              </TabsTrigger>

              <TabsTrigger value="hedge" className="gap-1.5 px-3" data-testid="tab-hedge">
                <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="hidden sm:inline text-[11px]">Hedge</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-40 hidden sm:block" />}
              </TabsTrigger>

              <TabsTrigger value="momentum" className="gap-1.5 px-3" data-testid="tab-momentum">
                <TrendingUp className="w-4 h-4 shrink-0 text-violet-400" />
                <span className="hidden sm:inline text-[11px]">Momentum</span>
                {!isMax && <Lock className="w-3 h-3 shrink-0 opacity-40 hidden sm:block" />}
              </TabsTrigger>

              <TabsTrigger value="analytics" className="gap-1.5 px-3" data-testid="tab-analytics">
                <BarChart3 className="w-4 h-4 shrink-0 text-blue-400" />
                <span className="hidden sm:inline text-[11px]">Analytics</span>
              </TabsTrigger>

              <TabsTrigger value="assistant" className="gap-1.5 px-3" data-testid="tab-assistant">
                <Bot className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Ask AI</span>
              </TabsTrigger>

            </TabsList>
          </div>

          {/* Scores — live now + edge alerts, always visible */}
          <TabsContent value="scores" className="space-y-4">
            <LiveScoresFeed />
          </TabsContent>

          {/* Cashout — Engineering strategies + live game advice */}
          <TabsContent value="cashout" className="space-y-4">
            {isMax ? (
              <InnerTabs defaultValue="advice" className="space-y-4">
                <InnerTabsList className="grid w-full grid-cols-2 max-w-sm">
                  <InnerTabsTrigger value="advice" className="gap-1.5 text-[11px]" data-testid="inner-tab-advice">
                    <Activity className="w-3.5 h-3.5" />
                    Live Advice
                  </InnerTabsTrigger>
                  <InnerTabsTrigger value="strategies" className="gap-1.5 text-[11px]" data-testid="inner-tab-strategies">
                    <DollarSign className="w-3.5 h-3.5" />
                    Engineering
                  </InnerTabsTrigger>
                </InnerTabsList>
                <InnerTabsContent value="advice">
                  <CashoutAdvisor />
                </InnerTabsContent>
                <InnerTabsContent value="strategies">
                  <CashoutStrategiesEngine />
                </InnerTabsContent>
              </InnerTabs>
            ) : (
              <TierGate
                required="whale"
                label="Cashout Engineering™ + Live Advisor"
                description="Build tickets engineered to force profitable cashout windows — plus live cashout recommendations updated every 30 seconds via SSE."
              />
            )}
          </TabsContent>

          {/* Hedge Calculator */}
          <TabsContent value="hedge" className="space-y-4">
            {isMax
              ? <LiveHedgeCalculator />
              : <TierGate required="whale" label="Live Hedge Calculator" description="Real-time hedge sizing across your active parlay legs — maximize your position as games go live." />}
          </TabsContent>

          {/* Momentum Tracker */}
          <TabsContent value="momentum" className="space-y-4">
            {isMax
              ? <MomentumTracker />
              : <TierGate required="whale" label="Live Momentum Tracker" description="Real-time game momentum scoring with swing detection — know exactly when a line is about to move before it happens." />}
          </TabsContent>

          {/* Analytics — CLV, Sharp, Factors, Patterns */}
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsSection isMax={isMax} />
          </TabsContent>

          {/* AI Betting Assistant */}
          <TabsContent value="assistant" className="space-y-4">
            <BettingAssistant />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
