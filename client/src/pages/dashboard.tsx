import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Sparkles, Wrench, Flame, Settings, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ParlayBuilder } from "@/components/parlay-builder";
import { ParlayGenerator } from "@/components/parlay-generator";
import { VisualParlayBuilder } from "@/components/visual-parlay-builder";
import { InsightsPanel } from "@/components/insights-panel";
import { BettingSettings, getDefaultBettingEnvironment } from "@/components/betting-settings";
import { TodaysBestBets } from "@/components/todays-best-bets";
import { DataFreshnessBar } from "@/components/data-freshness";
import { useQuery } from "@tanstack/react-query";
import type { ParlayLeg, SportEvent, BankrollSettings, BettingEnvironment, EvaluationResult } from "@shared/schema";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("generator");
  const [preloadedLegs, setPreloadedLegs] = useState<ParlayLeg[]>([]);
  const [selectedLegs, setSelectedLegs] = useState<ParlayLeg[]>([]);
  const [showBestBets, setShowBestBets] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [currentStake, setCurrentStake] = useState(10);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>({
    totalBankroll: 1000,
    sessionLimit: 100,
    dailyLimit: 200,
    maxExposurePerTeam: 50,
    maxExposurePerPlayer: 30,
    kellyMultiplier: 0.25,
  });
  const [bettingEnv, setBettingEnv] = useState<BettingEnvironment>(getDefaultBettingEnvironment());

  const { data: events = [] } = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", "NBA"],
  });

  const { data: freshnessData } = useQuery<{ sources: { name: string; lastUpdated: string }[] }>({
    queryKey: ["/api/data-freshness"],
    refetchInterval: 30000,
  });

  const handleLoadParlay = useCallback((legs: ParlayLeg[]) => {
    setPreloadedLegs(legs);
    setSelectedLegs(legs);
    setActiveTab("builder");
  }, []);

  const handleLegsChange = useCallback((legs: ParlayLeg[]) => {
    setSelectedLegs(legs);
  }, []);

  const handleStakeChange = useCallback((stake: number) => {
    setCurrentStake(stake);
  }, []);

  const handleResultChange = useCallback((result: EvaluationResult | null) => {
    setEvaluationResult(result);
  }, []);

  const handleAddLeg = useCallback((leg: ParlayLeg) => {
    setSelectedLegs(prev => [...prev, leg]);
  }, []);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Build Your Parlay
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose games, analyze odds, and optimize your bets
          </p>
          {freshnessData?.sources && (
            <div className="flex justify-center pt-1">
              <DataFreshnessBar sources={freshnessData.sources} />
            </div>
          )}
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="generator" className="gap-2" data-testid="tab-generator">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Quick</span> Picks
              </TabsTrigger>
              <TabsTrigger value="visual" className="gap-2" data-testid="tab-visual">
                <GripVertical className="w-4 h-4" />
                <span className="hidden sm:inline">Visual</span> Builder
              </TabsTrigger>
              <TabsTrigger value="builder" className="gap-2" data-testid="tab-builder">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Manual</span> Entry
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="generator" className="space-y-4">
            <ParlayGenerator onLoadParlay={handleLoadParlay} onLegsChange={handleLegsChange} />
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <VisualParlayBuilder
              onLegsChange={handleLegsChange}
              onStakeChange={handleStakeChange}
              onResultChange={handleResultChange}
              bankroll={bankrollSettings.totalBankroll}
              bettingEnv={bettingEnv}
            />
          </TabsContent>

          <TabsContent value="builder" className="space-y-4">
            <ParlayBuilder 
              preloadedLegs={preloadedLegs} 
              onLegsLoaded={() => setPreloadedLegs([])} 
              onLegsChange={handleLegsChange}
              onStakeChange={handleStakeChange}
              onResultChange={handleResultChange}
              bankroll={bankrollSettings.totalBankroll}
              bettingEnv={bettingEnv}
            />
          </TabsContent>
        </Tabs>

        <Collapsible open={showBestBets} onOpenChange={setShowBestBets}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" data-testid="toggle-best-bets">
                <Flame className="w-4 h-4 text-orange-500" />
                Today's Hot Picks
                <Badge variant="secondary" className="text-xs">+EV</Badge>
                {showBestBets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <TodaysBestBets 
              events={events} 
              onAddLeg={(leg) => handleAddLeg({ ...leg, id: crypto.randomUUID() })} 
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" data-testid="toggle-advanced">
                <Settings className="w-4 h-4 text-blue-500" />
                Analysis & Settings
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <BettingSettings 
                settings={bettingEnv} 
                onSettingsChange={setBettingEnv} 
              />
              <InsightsPanel
                events={events}
                selectedLegs={selectedLegs}
                bankrollSettings={bankrollSettings}
                onBankrollChange={setBankrollSettings}
                totalSpent={totalSpent}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <footer className="pt-4 border-t text-center space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-disclaimer">
            For educational and analysis purposes only. This is not a sportsbook. Please gamble responsibly. Must be 21+ in most jurisdictions.
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-affiliate-disclosure">
            We may earn referral fees from partner sportsbooks. This does not affect our analysis.
            {" "}<a href="/legal" className="underline">Full disclosure</a>
            {" | "}<a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="underline">Problem Gambling Help: 1-800-522-4700</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
