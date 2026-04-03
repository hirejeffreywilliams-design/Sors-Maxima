import { useEffect, useState, useCallback } from "react";
import { PageHero } from "@/components/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Shield, Bot, LineChart, Users, Brain, DollarSign,
  Wifi, WifiOff, Sliders, Lock, Zap, TrendingUp, BarChart3,
  ChevronRight,
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
import { useLiveGameCards, LiveGameCard as RichLiveGameCard } from "@/components/live/live-game-card";

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

// ─── Sport accent colors ───────────────────────────────────────────────────────

const SPORT_ACCENT: Record<string, string> = {
  NBA: "#F0532B",
  NFL: "#4a8fd4",
  NHL: "#63b3ed",
  MLB: "#38bdf8",
  NCAAB: "#F97316",
  NCAAF: "#22c55e",
  MLS: "#34d399",
  UFC: "#f43f5e",
  PGA: "#a3e635",
  WNBA: "#f59e0b",
  default: "#a78bfa",
};

function sportAccent(sport: string): string {
  return SPORT_ACCENT[(sport || "").toUpperCase()] ?? SPORT_ACCENT.default;
}

// ─── Sport Filter Chips (multi-select) ────────────────────────────────────────

const SPORT_CHIPS = ["All", "NBA", "NFL", "NHL", "MLB", "NCAAB", "NCAAF", "MLS", "Soccer", "UFC"];

function SportFilterBar({
  selected,
  onToggle,
  availableSports,
}: {
  selected: Set<string>;
  onToggle: (sport: string) => void;
  availableSports?: string[];
}) {
  const chips = availableSports && availableSports.length > 0
    ? ["All", ...Array.from(new Set(availableSports.map(s => s.toUpperCase())))]
    : SPORT_CHIPS;

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1.5 pb-1" style={{ minWidth: "max-content" }}>
        {chips.map((sport) => {
          const isActive = sport === "All" ? selected.size === 0 : selected.has(sport.toUpperCase());
          const color = sport === "All" ? "#a78bfa" : sportAccent(sport);
          return (
            <button
              key={sport}
              onClick={() => onToggle(sport)}
              className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all duration-200 border"
              style={{
                background: isActive ? `${color}18` : "rgba(255,255,255,0.04)",
                borderColor: isActive ? `${color}40` : "rgba(255,255,255,0.08)",
                color: isActive ? color : "rgba(255,255,255,0.35)",
                boxShadow: isActive ? `0 0 10px ${color}20` : "none",
              }}
              data-testid={`sport-chip-${sport.toLowerCase()}`}
            >
              {sport}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live Jumbotron ────────────────────────────────────────────────────────────

function LiveJumbotron({
  games,
  onSelectGame,
}: {
  games: LiveGame[];
  onSelectGame?: (id: string) => void;
}) {
  const live = games.filter(g => g.status === "live" || g.status === "halftime");
  if (live.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-black tracking-widest uppercase text-red-400">Live Now</span>
        </div>
        <span className="text-[10px] text-white/30">{live.length} game{live.length !== 1 ? "s" : ""} in progress</span>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
          {live.map(g => {
            const color = sportAccent(g.sport);
            const awayAbbr = (g.awayTeam.split(" ").pop() ?? g.awayTeam).toUpperCase().slice(0, 4);
            const homeAbbr = (g.homeTeam.split(" ").pop() ?? g.homeTeam).toUpperCase().slice(0, 4);
            const awayLeading = g.awayScore > g.homeScore;
            const homeLeading = g.homeScore > g.awayScore;
            const isHalftime = g.status === "halftime";

            return (
              <button
                key={g.id}
                type="button"
                data-testid={`jumbotron-game-${g.id}`}
                className="relative shrink-0 rounded-2xl overflow-hidden text-left group transition-transform hover:scale-[1.02] cursor-pointer"
                style={{
                  width: 196,
                  background: "linear-gradient(160deg, rgba(8,8,14,0.97) 0%, rgba(14,14,22,0.99) 100%)",
                  border: `1px solid ${color}28`,
                  boxShadow: `0 0 24px ${color}12, 0 4px 16px rgba(0,0,0,0.5)`,
                }}
                onClick={() => onSelectGame?.(String(g.id))}
              >
                {/* Accent bar left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                  style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}55 100%)` }}
                />

                {/* Header strip */}
                <div
                  className="flex items-center justify-between px-3 pt-2 pb-1.5 pl-4"
                  style={{ borderBottom: `1px solid ${color}16` }}
                >
                  <span
                    className="text-[9px] font-black tracking-widest uppercase"
                    style={{ color }}
                  >
                    {g.sport}
                  </span>
                  {isHalftime ? (
                    <span className="text-[8px] font-black tracking-widest text-yellow-400 uppercase animate-pulse">
                      HALF
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                      </span>
                      <span className="text-[8px] font-black tracking-widest text-red-400">LIVE</span>
                    </div>
                  )}
                </div>

                {/* Scoreboard rows */}
                <div className="pl-4 pr-3 py-2.5 space-y-1.5">
                  {/* Away */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {awayLeading && (
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      )}
                      {!awayLeading && <div className="w-1.5 h-1.5 shrink-0" />}
                      <span
                        className="text-[10px] font-black font-mono tracking-wider truncate"
                        style={{ color: awayLeading ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)" }}
                      >
                        {awayAbbr}
                      </span>
                      <span className="text-[7px] font-medium text-white/20 uppercase tracking-wide shrink-0">Away</span>
                    </div>
                    <span
                      className="text-[26px] font-black tabular-nums leading-none font-mono"
                      style={{ color: awayLeading ? "#ffffff" : "rgba(255,255,255,0.28)" }}
                    >
                      {g.awayScore}
                    </span>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center gap-2 pl-3">
                    <div className="flex-1 h-px" style={{ background: `${color}18` }} />
                    <span className="text-[7px] text-white/15 font-mono">vs</span>
                    <div className="flex-1 h-px" style={{ background: `${color}18` }} />
                  </div>

                  {/* Home */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {homeLeading && (
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      )}
                      {!homeLeading && <div className="w-1.5 h-1.5 shrink-0" />}
                      <span
                        className="text-[10px] font-black font-mono tracking-wider truncate"
                        style={{ color: homeLeading ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)" }}
                      >
                        {homeAbbr}
                      </span>
                      <span className="text-[7px] font-medium text-white/20 uppercase tracking-wide shrink-0">Home</span>
                    </div>
                    <span
                      className="text-[26px] font-black tabular-nums leading-none font-mono"
                      style={{ color: homeLeading ? "#ffffff" : "rgba(255,255,255,0.28)" }}
                    >
                      {g.homeScore}
                    </span>
                  </div>
                </div>

                {/* Footer: period + clock */}
                {(g.period || g.clock) && (
                  <div
                    className="flex items-center justify-between px-4 py-1.5"
                    style={{
                      borderTop: `1px solid ${color}16`,
                      background: `${color}0a`,
                    }}
                  >
                    <span className="text-[8px] font-bold tracking-widest uppercase text-white/35">
                      {g.period}
                    </span>
                    {g.clock && (
                      <span
                        className="text-[9px] font-mono font-black tabular-nums"
                        style={{ color: `${color}bb` }}
                      >
                        {g.clock}
                      </span>
                    )}
                  </div>
                )}

                {/* Tap indicator */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-3 h-3 text-white/25" />
                </div>
              </button>
            );
          })}
        </div>
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
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set());
  const [pendingGameOpen, setPendingGameOpen] = useState<{ id: string; token: number } | null>(null);

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

  // Rich game cards for jumbotron (no tier gating — all users see live scores)
  const { cards: richCards } = useLiveGameCards();

  // Derive available sports from rich cards first, fall back to momentum games
  const availableSports = richCards.length > 0
    ? Array.from(new Set(richCards.map(c => (c.sport || "").toUpperCase()).filter(Boolean)))
    : momentumGames
      ? Array.from(new Set(momentumGames.map(g => (g.sport || "").toUpperCase()).filter(Boolean)))
      : [];

  // Toggle sport in the multi-select filter
  const handleSportToggle = useCallback((sport: string) => {
    if (sport === "All") {
      setSelectedSports(new Set());
      return;
    }
    const upper = sport.toUpperCase();
    setSelectedSports(prev => {
      const next = new Set(prev);
      if (next.has(upper)) {
        next.delete(upper);
      } else {
        next.add(upper);
      }
      return next;
    });
  }, []);

  // Filter jumbotron games by selected sports — prefer rich cards (with logos)
  const jumbotronSource = richCards.length > 0 ? richCards : (momentumGames ?? []);
  const filteredJumbotronGames = selectedSports.size === 0
    ? jumbotronSource
    : jumbotronSource.filter((g: any) => selectedSports.has((g.sport || "").toUpperCase()));

  // Determine if we're using rich cards or legacy games for jumbotron
  const jumbotronIsRich = richCards.length > 0;

  // When a jumbotron card is clicked — switch to scores tab and open detail
  // Use a token counter so clicking same game twice still reopens the panel
  const handleJumbotronSelect = useCallback((id: string) => {
    setActiveTab("scores");
    setPendingGameOpen(prev => ({ id, token: (prev?.token ?? 0) + 1 }));
  }, []);

  const handleHedge = useCallback(() => setActiveTab("hedge"), []);
  const handleAskAI = useCallback(() => setActiveTab("assistant"), []);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Hero — concise subtitle only, verbose description removed */}
        <PageHero
          icon={<Activity className="w-6 h-6" />}
          title="Live Center"
          badge="LIVE"
          subtitle="Real-time scores, cashout engineering, hedge tools & AI analysis"
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

        {/* Sport filter bar (multi-select) */}
        <SportFilterBar
          selected={selectedSports}
          onToggle={handleSportToggle}
          availableSports={availableSports}
        />

        {/* Live games horizontal strip — filtered & clickable */}
        {filteredJumbotronGames.some((g: any) => g.status === "live" || g.status === "halftime") && (
          jumbotronIsRich ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[10px] font-black tracking-widest uppercase text-red-400">Live Now</span>
                </div>
                <span className="text-[10px] text-white/30">
                  {filteredJumbotronGames.filter((g: any) => g.status === "live" || g.status === "halftime").length} game{filteredJumbotronGames.filter((g: any) => g.status === "live" || g.status === "halftime").length !== 1 ? "s" : ""} in progress
                </span>
              </div>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
                  {(filteredJumbotronGames as any[])
                    .filter(g => g.status === "live" || g.status === "halftime")
                    .map(card => (
                      <div key={card.id} style={{ width: 196, flexShrink: 0 }}>
                        <RichLiveGameCard card={card} onSelect={handleJumbotronSelect} />
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            <LiveJumbotron
              games={filteredJumbotronGames as LiveGame[]}
              onSelectGame={handleJumbotronSelect}
            />
          )
        )}

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
            <LiveScoresFeed
              selectedSports={selectedSports}
              pendingGameOpen={pendingGameOpen}
              onHedge={handleHedge}
              onAskAI={handleAskAI}
            />
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
