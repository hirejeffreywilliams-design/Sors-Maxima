import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Layers, Brain, Shield, Zap, Sparkles } from "lucide-react";

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

import { Users } from "lucide-react";

const TOOL_CATEGORIES = [
  { id: "matchups", name: "Player Matchups", icon: Users },
  { id: "strategies", name: "Parlay Strategies", icon: Sparkles },
  { id: "sharp", name: "Sharp Money", icon: Eye },
  { id: "props", name: "Player Props", icon: Layers },
  { id: "analysis", name: "Analysis", icon: Brain },
  { id: "risk", name: "Risk Management", icon: Shield },
  { id: "pro", name: "Pro Tools", icon: Zap },
];

export default function Tools() {
  const [activeCategory, setActiveCategory] = useState("matchups");
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
          {activeCategory === "matchups" && (
            <PlayerMatchupCenter />
          )}

          {activeCategory === "strategies" && (
            <div className="space-y-6">
              <ParlayStrategyBuilder />
              <AIPredictions />
            </div>
          )}

          {activeCategory === "sharp" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SharpMoneyTracker />
              <SteamMoveDetector />
            </div>
          )}

          {activeCategory === "props" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <PropComboBuilder />
              <MatchupAnalyzer />
            </div>
          )}

          {activeCategory === "analysis" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <AIPredictions />
              <ConsensusPicks />
              <KeyNumberAnalyzer />
            </div>
          )}

          {activeCategory === "risk" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <VarianceCalculator />
              <WhatIfSimulator />
              <TravelRestAnalyzer />
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
