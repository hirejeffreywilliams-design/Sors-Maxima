import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Layers, Brain, Shield, Zap } from "lucide-react";

import { SharpMoneyTracker } from "@/components/sharp-money-tracker";
import { SteamMoveDetector } from "@/components/steam-move-detector";
import { KeyNumberAnalyzer } from "@/components/key-number-analyzer";
import { PropComboBuilder } from "@/components/prop-combo-builder";
import { MatchupAnalyzer } from "@/components/matchup-analyzer";
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
import { Sparkles } from "lucide-react";

const TOOL_CATEGORIES = [
  {
    id: "strategies",
    name: "Parlay Strategies",
    icon: Sparkles,
    description: "Profit-maximizing parlay building strategies",
    tools: ["strategy-builder"],
  },
  {
    id: "sharp",
    name: "Sharp Money",
    icon: Eye,
    description: "Track where the smart money is going",
    tools: ["sharp-tracker", "steam-moves", "reverse-line"],
  },
  {
    id: "props",
    name: "Player Props",
    icon: Layers,
    description: "Find correlated props and matchup edges",
    tools: ["prop-combos", "matchup-analyzer"],
  },
  {
    id: "analysis",
    name: "Analysis",
    icon: Brain,
    description: "AI predictions and expert consensus",
    tools: ["ai-predictions", "consensus", "key-numbers"],
  },
  {
    id: "risk",
    name: "Risk Management",
    icon: Shield,
    description: "Variance, hedging, and bankroll tools",
    tools: ["variance-calc", "what-if", "travel-rest"],
  },
  {
    id: "pro",
    name: "Pro Tools",
    icon: Zap,
    description: "Advanced features for serious bettors",
    tools: ["market-timing", "portfolio", "correlation", "stress-lab", "hedge-planner", "promo-stacker", "insurance", "book-limits"],
  },
];

export default function Tools() {
  const [activeCategory, setActiveCategory] = useState("strategies");

  return (
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Pro Tools
            </h1>
            <Badge variant="default" className="gap-1">
              <Zap className="w-3 h-3" />
              20+ Tools
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Advanced betting tools for finding edges and managing risk
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-6">
          {TOOL_CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              className={`cursor-pointer transition-all hover-elevate ${
                activeCategory === cat.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          {activeCategory === "strategies" && (
            <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
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
