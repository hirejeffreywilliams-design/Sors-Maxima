import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Brain, Zap, Sparkles, Users, BarChart3, DollarSign, MapPin, Scale, Link2 } from "lucide-react";

import { SharpMoneyTracker } from "@/components/sharp-money-tracker";
import { SteamMoveDetector } from "@/components/steam-move-detector";
import { KeyNumberAnalyzer } from "@/components/key-number-analyzer";
import { PropComboBuilder } from "@/components/prop-combo-builder";
import { MatchupAnalyzer } from "@/components/matchup-analyzer";
import { PlayerMatchupCenter } from "@/components/player-matchup-center";
import { VarianceCalculator } from "@/components/variance-calculator";
import { AIPredictions } from "@/components/ai-predictions";
import { ConsensusPicks } from "@/components/consensus-picks";
import { WhatIfSimulator } from "@/components/what-if-simulator";
import { TravelRestAnalyzer } from "@/components/travel-rest-analyzer";
import { MarketTimingAlerts } from "@/components/market-timing-alerts";
import { PortfolioParlayOptimizer } from "@/components/portfolio-parlay-optimizer";
import { CorrelationGraph } from "@/components/correlation-graph";
import { ScenarioStressLab } from "@/components/scenario-stress-lab";
import { ProgressiveHedgePlanner } from "@/components/progressive-hedge-planner";
import { PromoBoostStacker } from "@/components/promo-boost-stacker";
import { SyntheticInsuranceBuilder } from "@/components/synthetic-insurance-builder";
import { BookLimitPlanner } from "@/components/book-limit-planner";
import { ParlayStrategyBuilder } from "@/components/parlay-strategy-builder";
import { RealTimeOdds } from "@/components/real-time-odds";
import { MLPropProjections } from "@/components/ml-prop-projections";
import { CorrelationEngine } from "@/components/correlation-engine";
import { SGPOptimizer } from "@/components/sgp-optimizer";
import { BankrollSimulator } from "@/components/bankroll-simulator";
import { CorrelationHedgeCalculator } from "@/components/correlation-hedge-calculator";
import { BookLimitOptimizer } from "@/components/book-limit-optimizer";
import { LegDiversification } from "@/components/leg-diversification";
import { ConditionalEngine } from "@/components/conditional-engine";
import { CLVPredictor } from "@/components/clv-predictor";
import { SharpConsensus } from "@/components/sharp-consensus";
import { SituationalSpots } from "@/components/situational-spots";
import { RefereeAnalysis } from "@/components/referee-analysis";
import { VenuePerformance } from "@/components/venue-performance";

const TOOL_CATEGORIES = [
  { id: "odds", name: "Live Odds", icon: DollarSign },
  { id: "ml", name: "ML Projections", icon: Brain },
  { id: "correlation", name: "Correlation Tools", icon: Link2 },
  { id: "matchups", name: "Player Matchups", icon: Users },
  { id: "sharp", name: "Sharp Intel", icon: Eye },
  { id: "situational", name: "Situational Spots", icon: MapPin },
  { id: "bankroll", name: "Bankroll & Risk", icon: BarChart3 },
  { id: "venue", name: "Venue & Officials", icon: Scale },
  { id: "strategies", name: "Strategies", icon: Sparkles },
  { id: "pro", name: "Pro Tools", icon: Zap },
];

export default function Tools() {
  const [activeCategory, setActiveCategory] = useState("odds");
  const ActiveIcon = TOOL_CATEGORIES.find(c => c.id === activeCategory)?.icon || Users;

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pro Tools</h1>
            <p className="text-sm text-muted-foreground">Advanced betting analytics</p>
          </div>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="w-full sm:w-56" data-testid="select-category">
              <div className="flex items-center gap-2">
                <ActiveIcon className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {TOOL_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <cat.icon className="w-4 h-4" />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        <div className="space-y-6">
          {activeCategory === "odds" && (
            <RealTimeOdds />
          )}

          {activeCategory === "ml" && (
            <MLPropProjections />
          )}

          {activeCategory === "correlation" && (
            <div className="space-y-6">
              <CorrelationEngine />
              <SGPOptimizer />
              <ConditionalEngine />
              <LegDiversification />
            </div>
          )}

          {activeCategory === "matchups" && (
            <div className="space-y-6">
              <PlayerMatchupCenter />
              <div className="grid gap-6 lg:grid-cols-2">
                <PropComboBuilder />
                <MatchupAnalyzer />
              </div>
            </div>
          )}

          {activeCategory === "sharp" && (
            <div className="space-y-6">
              <SharpConsensus />
              <CLVPredictor />
              <div className="grid gap-6 lg:grid-cols-2">
                <SharpMoneyTracker />
                <SteamMoveDetector />
              </div>
            </div>
          )}

          {activeCategory === "situational" && (
            <SituationalSpots />
          )}

          {activeCategory === "bankroll" && (
            <div className="space-y-6">
              <BankrollSimulator />
              <div className="grid gap-6 lg:grid-cols-2">
                <CorrelationHedgeCalculator />
                <BookLimitOptimizer />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <VarianceCalculator />
                <WhatIfSimulator />
              </div>
            </div>
          )}

          {activeCategory === "venue" && (
            <div className="space-y-6">
              <VenuePerformance />
              <RefereeAnalysis />
              <TravelRestAnalyzer />
            </div>
          )}

          {activeCategory === "strategies" && (
            <div className="space-y-6">
              <ParlayStrategyBuilder />
              <AIPredictions />
              <ConsensusPicks />
              <KeyNumberAnalyzer />
            </div>
          )}

          {activeCategory === "pro" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <MarketTimingAlerts events={[]} />
                <PortfolioParlayOptimizer legs={[]} bankroll={1000} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <CorrelationGraph legs={[]} />
                <ScenarioStressLab legs={[]} stake={25} winProbability={0.5} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ProgressiveHedgePlanner legs={[]} stake={25} potentialPayout={250} />
                <PromoBoostStacker legs={[]} currentOdds={2.5} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <SyntheticInsuranceBuilder legs={[]} stake={25} potentialPayout={250} expectedValue={5} />
                <BookLimitPlanner desiredStake={100} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
