import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Atom,
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Activity,
  BarChart3,
  Lightbulb,
  Link2,
  Gauge,
  Heart,
  Cpu,
  Cloud,
  DollarSign
} from "lucide-react";
import type { FusionAnalysis, TicketFusion, SynergyEffect, FusionSignal } from "@/lib/quantum-fusion-engine";
import { getEngineStats, getSignalsByCategory, FACTOR_CATEGORIES } from "@/lib/quantum-fusion-engine";

interface QuantumStateDisplayProps {
  quantumState: FusionAnalysis["quantumState"];
}

function QuantumStateDisplay({ quantumState }: QuantumStateDisplayProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="quantum-state-display">
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Atom className="w-3 h-3" />
          <span>Model Alignment</span>
        </div>
        <Progress value={quantumState.coherence} className="h-2" />
        <span className="text-xs font-medium">{quantumState.coherence}%</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="w-3 h-3" />
          <span>Leg Correlation</span>
        </div>
        <Progress value={quantumState.entanglement} className="h-2" />
        <span className="text-xs font-medium">{quantumState.entanglement}%</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span>Outcome Range</span>
        </div>
        <Progress value={quantumState.superposition} className="h-2" />
        <span className="text-xs font-medium">{quantumState.superposition}%</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingDown className="w-3 h-3" />
          <span>Uncertainty</span>
        </div>
        <Progress value={quantumState.decoherenceRate} className="h-2" />
        <span className="text-xs font-medium">{quantumState.decoherenceRate}%</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Target className="w-3 h-3" />
          <span>Final Prediction</span>
        </div>
        <Progress value={quantumState.observedCollapse} className="h-2" />
        <span className="text-xs font-medium">{quantumState.observedCollapse}%</span>
      </div>
    </div>
  );
}

interface SignalBarProps {
  source: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  confidence: number;
}

function SignalBar({ source, direction, strength, confidence }: SignalBarProps) {
  const directionColor = direction === "bullish" ? "text-green-500" : 
                         direction === "bearish" ? "text-red-500" : "text-muted-foreground";
  const directionIcon = direction === "bullish" ? <TrendingUp className="w-3 h-3" /> : 
                        direction === "bearish" ? <TrendingDown className="w-3 h-3" /> : 
                        <BarChart3 className="w-3 h-3" />;
  
  return (
    <div className="flex items-center gap-2 text-sm" data-testid={`signal-${source}`}>
      <div className={`flex items-center gap-1 ${directionColor}`}>
        {directionIcon}
      </div>
      <span className="flex-1 truncate capitalize">{source.replace(/_/g, " ")}</span>
      <div className="flex items-center gap-2">
        <Progress value={strength} className="w-16 h-1.5" />
        <span className="text-xs text-muted-foreground w-8">{strength}%</span>
        <Badge variant="outline" className="text-xs">{confidence}%</Badge>
      </div>
    </div>
  );
}

// Category icon mapping
function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "TrendingUp": return <TrendingUp className="w-4 h-4" />;
    case "BarChart3": return <BarChart3 className="w-4 h-4" />;
    case "Brain": return <Brain className="w-4 h-4" />;
    case "Heart": return <Heart className="w-4 h-4" />;
    case "Cpu": return <Cpu className="w-4 h-4" />;
    case "Cloud": return <Cloud className="w-4 h-4" />;
    case "DollarSign": return <DollarSign className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
}

interface CategorySignalsProps {
  signals: FusionSignal[];
}

function CategorySignals({ signals }: CategorySignalsProps) {
  const groupedSignals = getSignalsByCategory(signals);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  
  // Calculate category scores
  const categoryScores = Object.entries(groupedSignals).map(([catKey, catSignals]) => {
    const catInfo = FACTOR_CATEGORIES[catKey as keyof typeof FACTOR_CATEGORIES];
    const avgStrength = catSignals.length > 0 
      ? Math.round(catSignals.reduce((sum, s) => sum + s.strength, 0) / catSignals.length)
      : 0;
    const bullishCount = catSignals.filter(s => s.direction === "bullish").length;
    const bearishCount = catSignals.filter(s => s.direction === "bearish").length;
    const sentiment = bullishCount > bearishCount ? "bullish" : bearishCount > bullishCount ? "bearish" : "neutral";
    
    return {
      key: catKey,
      name: catInfo.name,
      icon: catInfo.icon,
      description: catInfo.description,
      signals: catSignals,
      avgStrength,
      sentiment,
      factorCount: catSignals.length
    };
  }).filter(cat => cat.signals.length > 0);
  
  return (
    <div className="space-y-2" data-testid="category-signals">
      {categoryScores.map(cat => (
        <Collapsible 
          key={cat.key} 
          open={expandedCat === cat.key}
          onOpenChange={(open) => setExpandedCat(open ? cat.key : null)}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded bg-card border hover-elevate cursor-pointer" data-testid={`category-${cat.key}`}>
              <div className={`${cat.sentiment === "bullish" ? "text-green-500" : cat.sentiment === "bearish" ? "text-red-500" : "text-muted-foreground"}`}>
                {getCategoryIcon(cat.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{cat.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{cat.factorCount} factors</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Progress value={cat.avgStrength} className="w-16 h-2" />
                <span className="text-sm font-medium w-10 text-right">{cat.avgStrength}%</span>
                {expandedCat === cat.key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 pt-2 space-y-1">
            {cat.signals.map((signal, i) => (
              <SignalBar 
                key={i}
                source={signal.source}
                direction={signal.direction}
                strength={signal.strength}
                confidence={signal.confidence}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

interface SynergyDisplayProps {
  synergies: SynergyEffect[];
}

function SynergyDisplay({ synergies }: SynergyDisplayProps) {
  if (synergies.length === 0) return null;
  
  return (
    <div className="space-y-2" data-testid="synergy-display">
      <div className="flex items-center gap-1 text-sm font-medium">
        <Zap className="w-4 h-4 text-yellow-500" />
        <span>Active Synergies</span>
      </div>
      <div className="space-y-1">
        {synergies.map((synergy, i) => (
          <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-card border">
            <Badge 
              className={`text-xs shrink-0 ${
                synergy.synergyType === "amplifying" ? "bg-green-500/10 text-green-500" :
                synergy.synergyType === "dampening" ? "bg-red-500/10 text-red-500" :
                "bg-blue-500/10 text-blue-500"
              }`}
            >
              {synergy.synergyType === "amplifying" ? `+${Math.round((synergy.effect - 1) * 100)}%` :
               synergy.synergyType === "dampening" ? `-${Math.round((1 - synergy.effect) * 100)}%` :
               "Transform"}
            </Badge>
            <span className="text-muted-foreground">{synergy.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FusionScoreCardProps {
  fusion: FusionAnalysis;
  showDetails?: boolean;
}

export function FusionScoreCard({ fusion, showDetails = true }: FusionScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500 border-green-500";
    if (grade.startsWith("B")) return "text-blue-500 border-blue-500";
    if (grade.startsWith("C")) return "text-yellow-500 border-yellow-500";
    return "text-red-500 border-red-500";
  };
  
  const getRecommendationBadge = (rec: FusionAnalysis["recommendation"]) => {
    switch (rec) {
      case "strong_bet": return <Badge className="bg-green-500 text-white">Strong Bet</Badge>;
      case "moderate_bet": return <Badge className="bg-blue-500 text-white">Moderate Bet</Badge>;
      case "lean_bet": return <Badge className="bg-yellow-500 text-black">Lean</Badge>;
      case "fade": return <Badge className="bg-red-500 text-white">Fade</Badge>;
      default: return <Badge variant="secondary">Avoid</Badge>;
    }
  };
  
  return (
    <div className="space-y-3" data-testid="fusion-score-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold border-2 rounded-lg px-3 py-1 ${getGradeColor(fusion.grade)}`}>
            {fusion.grade}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{fusion.overallScore}</span>
              <span className="text-sm text-muted-foreground">Power Score</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{fusion.confidence}% confidence</span>
              <span>•</span>
              <span>{fusion.winProbability}% win prob</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getRecommendationBadge(fusion.recommendation)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="p-2 rounded bg-card border">
          <div className="text-muted-foreground text-xs">Expected Value</div>
          <div className={`font-semibold ${fusion.expectedValue >= 0 ? "text-green-500" : "text-red-500"}`}>
            {fusion.expectedValue >= 0 ? "+" : ""}{fusion.expectedValue}%
          </div>
        </div>
        <div className="p-2 rounded bg-card border">
          <div className="text-muted-foreground text-xs">Suggested Stake %</div>
          <div className="font-semibold">{fusion.kellyCriterion}%</div>
        </div>
        <div className="p-2 rounded bg-card border">
          <div className="text-muted-foreground text-xs">Optimal Stake</div>
          <div className="font-semibold">{fusion.optimalStake}%</div>
        </div>
        <div className="p-2 rounded bg-card border">
          <div className="text-muted-foreground text-xs">Edge</div>
          <div className={`font-semibold ${fusion.edgePercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
            {fusion.edgePercentage >= 0 ? "+" : ""}{fusion.edgePercentage}%
          </div>
        </div>
      </div>
      
      {showDetails && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2" data-testid="button-expand-fusion">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Hide" : "Show"} Deep Analysis
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div>
              <div className="flex items-center gap-1 text-sm font-medium mb-2">
                <Atom className="w-4 h-4" />
                <span>Prediction Metrics</span>
              </div>
              <QuantumStateDisplay quantumState={fusion.quantumState} />
            </div>
            
            <div>
              <div className="flex items-center gap-1 text-sm font-medium mb-2">
                <BarChart3 className="w-4 h-4" />
                <span>Contributing Factors ({fusion.signals.length} total across 7 categories)</span>
              </div>
              <CategorySignals signals={fusion.signals} />
            </div>
            
            <SynergyDisplay synergies={fusion.synergies} />
            
            <div>
              <div className="flex items-center gap-1 text-sm font-medium mb-2">
                <Lightbulb className="w-4 h-4" />
                <span>AI Insights</span>
              </div>
              <div className="space-y-1">
                {fusion.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span className="text-muted-foreground">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

interface TicketFusionDisplayProps {
  ticketFusion: TicketFusion;
}

export function TicketFusionDisplay({ ticketFusion }: TicketFusionDisplayProps) {
  const [showLegs, setShowLegs] = useState(false);
  
  return (
    <Card className="overflow-hidden" data-testid="ticket-fusion-display">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg" data-testid="ticket-fusion-title">
            <Brain className="w-5 h-5" />
            Deep Prediction Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {ticketFusion.riskProfile} Risk
            </Badge>
            <Badge className="bg-green-500/10 text-green-500">
              +{ticketFusion.correlationBonus}% Correlation Bonus
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FusionScoreCard fusion={ticketFusion.combinedFusion} />
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded bg-card border">
            <Gauge className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Diversification</div>
            <div className="font-semibold">{ticketFusion.diversificationScore}%</div>
          </div>
          <div className="p-3 rounded bg-card border">
            <Target className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Legs Analyzed</div>
            <div className="font-semibold">{ticketFusion.legs.length}</div>
          </div>
          <div className="p-3 rounded bg-card border">
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Expected Payout</div>
            <div className="font-semibold">+{ticketFusion.expectedPayout}%</div>
          </div>
        </div>
        
        <Collapsible open={showLegs} onOpenChange={setShowLegs}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2" data-testid="button-show-legs">
              {showLegs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showLegs ? "Hide" : "View"} Individual Leg Analysis
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {ticketFusion.legs.map((leg, i) => (
              <div key={leg.legId} className="p-3 rounded border bg-card" data-testid={`leg-analysis-${i}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">{leg.description}</span>
                  <Badge className={`${
                    leg.fusion.grade.startsWith("A") ? "bg-green-500/10 text-green-500" :
                    leg.fusion.grade.startsWith("B") ? "bg-blue-500/10 text-blue-500" :
                    "bg-yellow-500/10 text-yellow-500"
                  }`}>
                    {leg.fusion.grade}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Score: </span>
                    <span className="font-medium">{leg.fusion.overallScore}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">EV: </span>
                    <span className={leg.fusion.expectedValue >= 0 ? "text-green-500" : "text-red-500"}>
                      {leg.fusion.expectedValue >= 0 ? "+" : ""}{leg.fusion.expectedValue}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win: </span>
                    <span className="font-medium">{leg.fusion.winProbability}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conf: </span>
                    <span className="font-medium">{leg.fusion.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function QuantumFusionEngineBanner() {
  const [expanded, setExpanded] = useState(false);
  const stats = getEngineStats();
  
  return (
    <Card className="bg-gradient-to-r from-violet-500/5 to-blue-500/5 border-violet-500/20" data-testid="fusion-engine-banner">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-violet-500/10">
              <Brain className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Sors Prediction Engine
                <Badge className="bg-violet-500/10 text-violet-500 text-xs">Active</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {stats.totalFactors} factors • {stats.synergyRules} synergy rules • {Math.round(stats.avgHistoricalAccuracy * 100)}% accuracy
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            data-testid="button-engine-details"
          >
            {expanded ? "Hide" : "View"} Engine Stats
          </Button>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-2 rounded bg-background/50 border">
                <div className="text-xs text-muted-foreground">Total Factors</div>
                <div className="font-semibold">{stats.totalFactors}</div>
              </div>
              <div className="p-2 rounded bg-background/50 border">
                <div className="text-xs text-muted-foreground">Avg Accuracy</div>
                <div className="font-semibold">{Math.round(stats.avgHistoricalAccuracy * 100)}%</div>
              </div>
              <div className="p-2 rounded bg-background/50 border">
                <div className="text-xs text-muted-foreground text-green-500">Improving</div>
                <div className="font-semibold">{stats.improvingFactors} factors</div>
              </div>
              <div className="p-2 rounded bg-background/50 border">
                <div className="text-xs text-muted-foreground text-red-500">Declining</div>
                <div className="font-semibold">{stats.decliningFactors} factors</div>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground mb-2">Factor Weights (Learning Over Time)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {stats.weights.map(w => (
                  <div key={w.factor} className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50 border">
                    <span className="capitalize truncate">{w.factor.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{w.weight}%</span>
                      {w.trend === "improving" && <TrendingUp className="w-3 h-3 text-green-500" />}
                      {w.trend === "declining" && <TrendingDown className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
