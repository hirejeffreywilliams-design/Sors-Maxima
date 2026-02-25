import { useState } from "react";
import {
  DollarSign, Brain, Link2, Users, Eye,
  MapPin, BarChart3, Sparkles, Zap, Scale,
  Percent, SlidersHorizontal, ClipboardCheck,
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

const TOOL_GROUPS = [
  {
    id: "analysis",
    name: "Analysis & Predictions",
    icon: Brain,
    subcategories: [
      { id: "predictions", name: "AI Predictions" },
      { id: "player-props", name: "Player Props" },
      { id: "matchups", name: "Matchups" },
      { id: "projections", name: "Projections" },
    ],
  },
  {
    id: "market",
    name: "Market & Odds",
    icon: DollarSign,
    subcategories: [
      { id: "odds", name: "Live Odds" },
      { id: "sharp", name: "Sharp Action" },
      { id: "arb", name: "Line Shopping" },
    ],
  },
  {
    id: "correlations",
    name: "Correlations & Strategy",
    icon: Link2,
    subcategories: [
      { id: "correlation", name: "Correlations" },
      { id: "strategies", name: "Strategies" },
      { id: "situational", name: "Situational" },
    ],
  },
  {
    id: "risk",
    name: "Bankroll & Risk",
    icon: BarChart3,
    subcategories: [
      { id: "bankroll", name: "Bankroll" },
      { id: "simulators", name: "Simulators" },
    ],
  },
  {
    id: "extras",
    name: "More Tools",
    icon: Zap,
    subcategories: [
      { id: "venue", name: "Game Context" },
      { id: "grading", name: "Grading & Export" },
      { id: "model", name: "Custom Model" },
    ],
  },
];

export default function Tools() {
  useSEO({ title: "Tools", description: "Betting calculators and analysis tools" });
  const [activeGroup, setActiveGroup] = useState("analysis");
  const [activeSub, setActiveSub] = useState("predictions");

  const currentGroup = TOOL_GROUPS.find(g => g.id === activeGroup) || TOOL_GROUPS[0];
  const ActiveIcon = currentGroup.icon;

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const group = TOOL_GROUPS.find(g => g.id === groupId);
    if (group && group.subcategories.length > 0) {
      setActiveSub(group.subcategories[0].id);
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Tools & Analytics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Advanced betting analytics and research</p>
          </div>
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
        </header>

        {currentGroup.subcategories.length > 1 && (
          <Tabs value={activeSub} onValueChange={setActiveSub}>
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {currentGroup.subcategories.map((sub) => (
                <TabsTrigger key={sub.id} value={sub.id} className="text-xs sm:text-sm" data-testid={`tab-${sub.id}`}>
                  {sub.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className="space-y-6">
          {activeGroup === "analysis" && activeSub === "predictions" && (
            <div className="space-y-6">
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
            <div className="space-y-6">
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
            <div className="space-y-6">
              <SharpConsensus />
              <CLVPredictor />
              <div className="grid gap-6 lg:grid-cols-2">
                <SharpMoneyTracker />
                <SteamMoveDetector />
              </div>
            </div>
          )}
          {activeGroup === "market" && activeSub === "arb" && (
            <ArbitrageFinder />
          )}

          {activeGroup === "correlations" && activeSub === "correlation" && (
            <div className="space-y-6">
              <CorrelationEngine />
              <SGPOptimizer />
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
              <CashoutMaximizer />
              <BankrollSimulator />
              <div className="grid gap-6 lg:grid-cols-2">
                <CorrelationHedgeCalculator />
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
                <MarketTimingAlerts events={[]} />
                <PortfolioParlayOptimizer legs={[]} bankroll={1000} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ProgressiveHedgePlanner legs={[]} stake={25} potentialPayout={250} />
                <PromoBoostStacker legs={[]} currentOdds={2.5} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <SyntheticInsuranceBuilder legs={[]} stake={25} potentialPayout={250} expectedValue={5} />
                <BookLimitPlanner desiredStake={100} />
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
              <ExportBetSlip />
            </div>
          )}
          {activeGroup === "extras" && activeSub === "model" && (
            <CustomModelBuilder />
          )}
        </div>
      </div>
    </div>
  );
}
