import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { AIRecommendationPanel } from "@/components/ai/ai-recommendation-panel";
import { openSorsCompanionWithContext } from "@/components/ai/sors-companion";
import {
  DollarSign, Brain, Link2,
  BarChart3, Sparkles, Zap,
  FileOutput, UserCheck
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CorrelationEngine } from "@/components/correlation-engine";
import { SGPOptimizer } from "@/components/sgp-optimizer";
import { MLPropProjections } from "@/components/ml-prop-projections";
import { ConditionalEngine } from "@/components/conditional-engine";
import { LegDiversification } from "@/components/leg-diversification";
import { MatchupAnalyzer } from "@/components/matchup-analyzer";
import { PropComboBuilder } from "@/components/prop-combo-builder";
import { PlayerMatchupCenter } from "@/components/player-matchup-center";
import { VenuePerformance } from "@/components/venue-performance";
import { RefereeAnalysis } from "@/components/referee-analysis";
import { TravelRestAnalyzer } from "@/components/travel-rest-analyzer";
import { RealTimeOdds } from "@/components/real-time-odds";
import { SharpConsensus } from "@/components/sharp-consensus";
import { SharpMoneyTracker } from "@/components/sharp-money-tracker";
import { SteamMoveDetector } from "@/components/steam-move-detector";
import { SituationalSpots } from "@/components/situational-spots";
import { BankrollSimulator } from "@/components/bankroll-simulator";
import { CashoutMaximizer } from "@/components/cashout-maximizer";
import { CorrelationHedgeCalculator } from "@/components/correlation-hedge-calculator";
import { BookLimitOptimizer } from "@/components/book-limit-optimizer";
import { VarianceCalculator } from "@/components/variance-calculator";
import { WhatIfSimulator } from "@/components/what-if-simulator";
import { CLVPredictor } from "@/components/clv-predictor";
import { MarketTimingAlerts } from "@/components/market-timing-alerts";
import { AIPredictions } from "@/components/ai-predictions";
import { ConsensusPicks } from "@/components/consensus-picks";
import { KeyNumberAnalyzer } from "@/components/key-number-analyzer";
import { ParlayStrategyBuilder } from "@/components/parlay-strategy-builder";
import { CorrelationGraph } from "@/components/correlation-graph";
import { ScenarioStressLab } from "@/components/scenario-stress-lab";
import { ProgressiveHedgePlanner } from "@/components/progressive-hedge-planner";
import { PromoBoostStacker } from "@/components/promo-boost-stacker";
import { SyntheticInsuranceBuilder } from "@/components/synthetic-insurance-builder";
import { BookLimitPlanner } from "@/components/book-limit-planner";
import { PortfolioParlayOptimizer } from "@/components/portfolio-parlay-optimizer";
import { QuantumCoachingAnalysis } from "@/components/quantum-coaching-analysis";
import { QuantumPlayerPrediction } from "@/components/quantum-player-prediction";
import { QuantumTeamDynamics } from "@/components/quantum-team-dynamics";
import { PlayerPropLab } from "@/components/player-prop-lab";
import { ArbitrageFinder } from "@/components/arbitrage-finder";
import { BetGradingPostgame } from "@/components/bet-grading-postgame";
import { CustomModelBuilder } from "@/components/custom-model-builder";
import { ExportBetSlip } from "@/components/export-bet-slip";
import { ROIUpliftCalculator } from "@/components/roi-uplift-calculator";
import { Calculator } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { TierGate, useTier } from "@/components/tier-gate";

const TOOL_GROUPS = [
  {
    id: "analysis",
    name: "Analysis & Predictions",
    icon: Brain,
    subcategories: [
      { id: "predictions", name: "AI Predictions", requiredTier: "elite" as const },
      { id: "player-props", name: "Player Props", requiredTier: null },
      { id: "matchups", name: "Matchups", requiredTier: "elite" as const },
      { id: "projections", name: "Projections", requiredTier: null },
    ],
  },
  {
    id: "market",
    name: "Market & Odds",
    icon: DollarSign,
    subcategories: [
      { id: "odds", name: "Live Odds", requiredTier: null },
      { id: "sharp", name: "Sharp Action", requiredTier: "elite" as const },
      { id: "arb", name: "Line Shopping", requiredTier: "elite" as const },
    ],
  },
  {
    id: "correlations",
    name: "Correlations & Strategy",
    icon: Link2,
    subcategories: [
      { id: "correlation", name: "Correlations", requiredTier: null },
      { id: "strategies", name: "Strategies", requiredTier: null },
      { id: "situational", name: "Situational", requiredTier: null },
    ],
  },
  {
    id: "risk",
    name: "Bankroll & Risk",
    icon: BarChart3,
    subcategories: [
      { id: "bankroll", name: "Bankroll", requiredTier: null },
      { id: "simulators", name: "Simulators", requiredTier: null },
    ],
  },
  {
    id: "extras",
    name: "More Tools",
    icon: Zap,
    subcategories: [
      { id: "venue", name: "Game Context", requiredTier: null },
      { id: "grading", name: "Grading & Export", requiredTier: null },
      { id: "model", name: "Custom Model", requiredTier: "whale" as const },
    ],
  },
];

export default function Tools() {
  useSEO({ title: "Tools", description: "Betting calculators and analysis tools" });
  const [activeGroup, setActiveGroup] = useState("analysis");
  const [activeSub, setActiveSub] = useState("predictions");
  const { canAccess } = useTier();

  const currentGroup = TOOL_GROUPS.find(g => g.id === activeGroup) || TOOL_GROUPS[0];
  const ActiveIcon = currentGroup.icon;

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const group = TOOL_GROUPS.find(g => g.id === groupId);
    if (group && group.subcategories.length > 0) {
      setActiveSub(group.subcategories[0].id);
    }
  };

  const currentSub = currentGroup.subcategories.find(s => s.id === activeSub);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <PageHero
          icon={<BarChart3 className="w-6 h-6" />}
          title="Tools & Analytics"
          subtitle="Advanced betting analytics and research"
          description="Use the category dropdown to switch between tool groups: AI Predictions, Matchup Analyzer, Sharp Action Tracker, Arbitrage Scanner, Bankroll Advisor, and more. Each tool provides a different analytical angle on today's slate. Tools marked with a tier badge require an Edge or Max subscription to unlock."
          actions={
            <Select value={activeGroup} onValueChange={handleGroupChange}>
              <SelectTrigger className="w-full sm:w-56 h-9 sm:h-10" data-testid="select-category">
                <div className="flex items-center gap-2">
                  <ActiveIcon className="w-4 h-4 shrink-0" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {TOOL_GROUPS.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <group.icon className="w-4 h-4" />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <AIRecommendationPanel
          context={{ page: "tools" }}
          onOpenCompanion={openSorsCompanionWithContext}
          compact
        />

        {currentGroup.subcategories.length > 1 && (
          <Tabs value={activeSub} onValueChange={setActiveSub}>
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {currentGroup.subcategories.map((sub) => (
                <TabsTrigger key={sub.id} value={sub.id} className="text-xs sm:text-sm gap-1.5" data-testid={`tab-${sub.id}`}>
                  {sub.name}
                  {sub.requiredTier && !canAccess(sub.requiredTier) && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 opacity-60">
                      {sub.requiredTier === "elite" ? "Edge+" : "Max"}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className="space-y-6">
          {activeGroup === "analysis" && activeSub === "predictions" && (
            currentSub?.requiredTier && !canAccess(currentSub.requiredTier)
              ? <TierGate required="elite" label="AI Predictions Engine" description="Advanced coaching patterns, player outcome modeling, and team dynamics analysis powered by the 46-Factor Intelligence Engine." />
              : <div className="space-y-6">
                  <QuantumCoachingAnalysis />
                  <QuantumPlayerPrediction />
                  <QuantumTeamDynamics />
                </div>
          )}

          {activeGroup === "analysis" && activeSub === "player-props" && (
            <div className="space-y-6">
              <PlayerPropLab />
              <MLPropProjections />
            </div>
          )}

          {activeGroup === "analysis" && activeSub === "matchups" && (
            currentSub?.requiredTier && !canAccess(currentSub.requiredTier)
              ? <TierGate required="elite" label="Matchup Analyzer" description="Player matchup breakdowns, prop combination builder, and head-to-head analysis for every position and game context." />
              : <div className="space-y-6">
                  <PlayerMatchupCenter />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <PropComboBuilder />
                    <MatchupAnalyzer />
                  </div>
                </div>
          )}

          {activeGroup === "analysis" && activeSub === "projections" && (
            <div className="space-y-6">
              <AIPredictions />
              <ConsensusPicks />
            </div>
          )}

          {activeGroup === "market" && activeSub === "odds" && (
            <RealTimeOdds />
          )}

          {activeGroup === "market" && activeSub === "sharp" && (
            currentSub?.requiredTier && !canAccess(currentSub.requiredTier)
              ? <TierGate required="elite" label="Sharp Action Tracker" description="Sharp money flow indicators, public-vs-sharp splits, line steam detection, and CLV signals across all major sportsbooks." />
              : <div className="space-y-6">
                  <SharpConsensus />
                  <CLVPredictor />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <SharpMoneyTracker />
                    <SteamMoveDetector />
                  </div>
                </div>
          )}

          {activeGroup === "market" && activeSub === "arb" && (
            currentSub?.requiredTier && !canAccess(currentSub.requiredTier)
              ? <TierGate required="elite" label="Arbitrage & Line Shopping" description="Real-time arbitrage scanner, positive EV finder, and line shopping tools across 15+ sportsbooks." />
              : <ArbitrageFinder />
          )}

          {activeGroup === "correlations" && activeSub === "correlation" && (
            <div className="space-y-6">
              <CorrelationEngine />
              {canAccess("elite")
                ? <SGPOptimizer />
                : <TierGate required="elite" label="SGP Correlation Engine" description="Same-game parlay correlation analysis — find positive correlations, avoid leg conflicts, and optimize SGP structure." />
              }
              <ConditionalEngine />
              <LegDiversification />
            </div>
          )}

          {activeGroup === "correlations" && activeSub === "strategies" && (
            <div className="space-y-6">
              <ParlayStrategyBuilder />
              <KeyNumberAnalyzer />
            </div>
          )}

          {activeGroup === "correlations" && activeSub === "situational" && (
            <SituationalSpots />
          )}

          {activeGroup === "risk" && activeSub === "bankroll" && (
            <div className="space-y-6">
              {canAccess("whale")
                ? <CashoutMaximizer />
                : <TierGate required="whale" label="Cashout Maximizer" description="Real-time cashout value analysis with optimal exit timing recommendations and EV-adjusted cashout decisions." />
              }
              <BankrollSimulator />
              <div className="grid gap-6 lg:grid-cols-2">
                {canAccess("whale")
                  ? <CorrelationHedgeCalculator />
                  : <TierGate required="whale" label="Hedge Calculator" description="Multi-leg hedge optimizer — lock in profit or minimize loss across correlated bets and live markets." />
                }
                <BookLimitOptimizer />
              </div>
            </div>
          )}

          {activeGroup === "risk" && activeSub === "simulators" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <VarianceCalculator />
                <WhatIfSimulator />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ScenarioStressLab legs={[]} stake={25} winProbability={0.5} />
                <ROIUpliftCalculator />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {canAccess("elite")
                  ? <MarketTimingAlerts events={[]} />
                  : <TierGate required="elite" label="Market Timing Alerts" description="Bet-now vs. wait signals based on line movement patterns and sharp money timing." />
                }
                <PortfolioParlayOptimizer legs={[]} bankroll={1000} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {canAccess("whale")
                  ? <ProgressiveHedgePlanner legs={[]} stake={25} potentialPayout={250} />
                  : <TierGate required="whale" label="Progressive Hedge Planner" description="Build staged hedging plans across a live parlay — protect your returns by hedging as each leg cashes." />
                }
                {canAccess("elite")
                  ? <PromoBoostStacker legs={[]} currentOdds={2.5} />
                  : <TierGate required="elite" label="Promo Boost Stacker" description="Stack sportsbook promotions with your parlay legs to maximize expected value." />
                }
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {canAccess("whale")
                  ? <SyntheticInsuranceBuilder legs={[]} stake={25} potentialPayout={250} expectedValue={5} />
                  : <TierGate required="whale" label="Synthetic Insurance Builder" description="Create insurance positions using correlated bets to protect high-value parlays." />
                }
                {canAccess("elite")
                  ? <BookLimitPlanner desiredStake={100} />
                  : <TierGate required="elite" label="Book Limit Planner" description="Distribute stakes optimally across books to avoid limits while maximizing total action." />
                }
              </div>
              <CorrelationGraph legs={[]} />
            </div>
          )}

          {activeGroup === "extras" && activeSub === "venue" && (
            <div className="space-y-6">
              <VenuePerformance />
              <RefereeAnalysis />
              <TravelRestAnalyzer />
            </div>
          )}

          {activeGroup === "extras" && activeSub === "grading" && (
            <div className="space-y-6">
              <BetGradingPostgame />
              {canAccess("whale")
                ? <ExportBetSlip />
                : <TierGate required="whale" label="Bet Slip Export" description="Export formatted bet slips directly to DraftKings, FanDuel, BetMGM, and more — one-click placement." />
              }
            </div>
          )}

          {activeGroup === "extras" && activeSub === "model" && (
            currentSub?.requiredTier && !canAccess(currentSub.requiredTier)
              ? <TierGate required="whale" label="Custom 46-Factor Model Editor" description="Adjust the weight of every factor in the prediction engine. Build your own model with your own edge. Max tier only." />
              : <CustomModelBuilder />
          )}
        </div>
      </div>
    </div>
  );
}
