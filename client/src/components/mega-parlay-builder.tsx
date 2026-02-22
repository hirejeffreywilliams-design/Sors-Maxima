import { useState, useMemo } from "react";
import { Trophy, Zap, Target, Calculator, TrendingUp, Layers, Star, Shield, DollarSign, Flame, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { 
  ParlayLeg, 
  LegSynergy, 
  RoundRobinOption, 
  JackpotScenario, 
  SmartRecommendation,
  EvaluationResult 
} from "@shared/schema";
import { 
  calculateJackpotScenarios, 
  calculateRoundRobinOptions, 
  calculateLegSynergies,
  generateSmartRecommendations 
} from "@shared/schema";

interface MegaParlayBuilderProps {
  legs: ParlayLeg[];
  stake: number;
  result: EvaluationResult | null;
  availableLegs?: ParlayLeg[];
  onAddLeg?: (leg: ParlayLeg) => void;
}

function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function getSynergyColor(type: LegSynergy["synergyType"]): string {
  switch (type) {
    case "strong_positive": return "text-emerald-500";
    case "positive": return "text-green-500";
    case "neutral": return "text-muted-foreground";
    case "negative": return "text-orange-500";
    case "strong_negative": return "text-red-500";
  }
}

function getSynergyBg(type: LegSynergy["synergyType"]): string {
  switch (type) {
    case "strong_positive": return "bg-emerald-500/10";
    case "positive": return "bg-green-500/10";
    case "neutral": return "bg-muted";
    case "negative": return "bg-orange-500/10";
    case "strong_negative": return "bg-red-500/10";
  }
}

export function MegaParlayBuilder({ legs, stake, result, availableLegs = [], onAddLeg }: MegaParlayBuilderProps) {
  const [activeTab, setActiveTab] = useState("jackpot");
  
  const combinedOdds = result?.combinedOdds || legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
  const winProbability = result?.winProbability || Math.pow(0.5, legs.length);
  const legProbabilities = result?.legProbabilities || legs.map(() => 0.5);
  
  const jackpotScenarios = useMemo(() => 
    calculateJackpotScenarios(combinedOdds, winProbability),
    [combinedOdds, winProbability]
  );
  
  const roundRobinOptions = useMemo(() => 
    calculateRoundRobinOptions(legs, stake, legProbabilities),
    [legs, stake, legProbabilities]
  );
  
  const legSynergies = useMemo(() => 
    calculateLegSynergies(legs, result?.correlationMatrix),
    [legs, result?.correlationMatrix]
  );
  
  const smartRecommendations = useMemo(() => 
    generateSmartRecommendations(legs, availableLegs, 5),
    [legs, availableLegs]
  );
  
  const progressiveBreakdown = useMemo(() => {
    const breakdown = [];
    let cumulativeOdds = 1;
    let cumulativeProbability = 1;
    
    for (let i = 0; i < legs.length; i++) {
      cumulativeOdds *= legs[i].decimalOdds;
      cumulativeProbability *= legProbabilities[i] || 0.5;
      
      breakdown.push({
        stage: i + 1,
        legsCompleted: i + 1,
        cumulativeOdds,
        cumulativeProbability,
        payoutAtStage: stake * cumulativeOdds,
      });
    }
    
    return breakdown;
  }, [legs, legProbabilities, stake]);
  
  const synergyScore = useMemo(() => {
    if (legSynergies.length === 0) return 50;
    const avgCorr = legSynergies.reduce((sum, s) => sum + s.correlation, 0) / legSynergies.length;
    return Math.round(50 + avgCorr * 50);
  }, [legSynergies]);
  
  const potentialPayout = stake * combinedOdds;
  const isMillionDollarPotential = potentialPayout >= 1000000 || combinedOdds >= 10000;

  if (legs.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Mega Parlay Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Add at least 2 legs to unlock mega parlay features
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Build parlays with up to 20+ legs for jackpot potential
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Mega Parlay Builder
            <Badge variant="outline" className="ml-2">
              {legs.length} Legs
            </Badge>
          </CardTitle>
          {isMillionDollarPotential && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
              <Flame className="w-3 h-3" />
              Million Dollar Potential
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-mono font-bold text-primary">
              {combinedOdds.toFixed(2)}x
            </div>
            <div className="text-xs text-muted-foreground">Combined Odds</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-mono font-bold text-emerald-500">
              {formatMoney(potentialPayout)}
            </div>
            <div className="text-xs text-muted-foreground">Potential Win</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-mono font-bold">
              {(winProbability * 100).toFixed(4)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Chance</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 h-auto">
              <TabsTrigger value="jackpot" className="text-xs py-2 gap-1 px-2 sm:px-3">
                <DollarSign className="w-3 h-3 shrink-0" />
                Jackpot
              </TabsTrigger>
              <TabsTrigger value="synergy" className="text-xs py-2 gap-1 px-2 sm:px-3">
                <Zap className="w-3 h-3 shrink-0" />
                Synergy
              </TabsTrigger>
              <TabsTrigger value="roundrobin" className="text-xs py-2 gap-1 px-2 sm:px-3">
                <Layers className="w-3 h-3 shrink-0" />
                Round Robin
              </TabsTrigger>
              <TabsTrigger value="progressive" className="text-xs py-2 gap-1 px-2 sm:px-3">
                <TrendingUp className="w-3 h-3 shrink-0" />
                Progressive
              </TabsTrigger>
              <TabsTrigger value="smart" className="text-xs py-2 gap-1 px-2 sm:px-3">
                <Sparkles className="w-3 h-3 shrink-0" />
                Smart Add
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="jackpot" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                <span className="font-medium">Jackpot Scenarios</span>
                <span className="text-xs text-muted-foreground">See potential payouts at different stakes</span>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {jackpotScenarios.map((scenario, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border ${
                        scenario.potentialPayout >= 1000000 
                          ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30" 
                          : "bg-muted/50"
                      }`}
                      data-testid={`jackpot-scenario-${scenario.stake}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-bold">${scenario.stake}</div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          <div className={`font-mono font-bold text-lg ${
                            scenario.potentialPayout >= 1000000 ? "text-amber-500" : "text-emerald-500"
                          }`}>
                            {formatMoney(scenario.potentialPayout)}
                          </div>
                        </div>
                        <Badge 
                          variant={scenario.riskLevel === "extreme" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {scenario.riskLevel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {scenario.millionDollarOdds}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="synergy" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Leg Synergies</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Synergy Score:</span>
                  <Badge variant={synergyScore >= 60 ? "default" : synergyScore >= 40 ? "secondary" : "destructive"}>
                    {synergyScore}/100
                  </Badge>
                </div>
              </div>
              
              {legSynergies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Analyze your parlay to see leg synergies</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {legSynergies.slice(0, 10).map((synergy, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg ${getSynergyBg(synergy.synergyType)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Leg {synergy.leg1Index + 1}
                            </Badge>
                            <span className="text-muted-foreground">+</span>
                            <Badge variant="outline" className="text-xs">
                              Leg {synergy.leg2Index + 1}
                            </Badge>
                          </div>
                          <span className={`font-mono font-bold ${getSynergyColor(synergy.synergyType)}`}>
                            {synergy.correlation > 0 ? "+" : ""}{(synergy.correlation * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{synergy.reasoning}</p>
                        {synergy.combinedBoost > 0 && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            +{(synergy.combinedBoost * 100).toFixed(1)}% EV Boost
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="roundrobin" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4" />
                <span className="font-medium">Round Robin Options</span>
                <span className="text-xs text-muted-foreground">Increase win chances with combinations</span>
              </div>
              
              {roundRobinOptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Add at least 3 legs for round robin options</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {roundRobinOptions.map((option, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{option.name}</span>
                          <Badge variant="outline">
                            {option.totalParlays} parlays
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Total Stake</div>
                            <div className="font-mono">${option.totalStake}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Max Payout</div>
                            <div className="font-mono text-emerald-500">{formatMoney(option.maxPayout)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Break Even</div>
                            <div className="font-mono">{option.breakEvenWins} wins</div>
                          </div>
                        </div>
                        <Progress 
                          value={option.winProbability * 100} 
                          className="h-1 mt-2" 
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {(option.winProbability * 100).toFixed(2)}% chance per parlay
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="progressive" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Progressive Breakdown</span>
                <span className="text-xs text-muted-foreground">Track payout at each stage</span>
              </div>
              
              <ScrollArea className="h-[280px]">
                <div className="space-y-1">
                  {progressiveBreakdown.map((stage, i) => {
                    const leg = legs[i];
                    return (
                      <div 
                        key={i} 
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                              {stage.stage}
                            </div>
                            <div className="text-sm truncate max-w-[120px]">
                              {leg.team} {leg.outcome}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-500">
                              {formatMoney(stage.payoutAtStage)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stage.cumulativeOdds.toFixed(2)}x odds
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress 
                            value={stage.cumulativeProbability * 100} 
                            className="h-1" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {(stage.cumulativeProbability * 100).toFixed(4)}% cumulative probability
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="smart" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">Smart Recommendations</span>
                <span className="text-xs text-muted-foreground">Data-driven leg suggestions</span>
              </div>
              
              {smartRecommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No additional recommendations available</p>
                  <p className="text-xs mt-1">Add more games to see suggestions</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {smartRecommendations.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className={`w-4 h-4 ${
                              rec.confidenceLevel === "high" ? "text-amber-500" :
                              rec.confidenceLevel === "medium" ? "text-blue-500" : "text-muted-foreground"
                            }`} />
                            <span className="font-medium text-sm">{rec.leg.team}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Score: {rec.score}
                            </Badge>
                            {onAddLeg && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onAddLeg(rec.leg)}
                                data-testid={`button-add-recommendation-${i}`}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {rec.leg.market} • {rec.leg.outcome} @ {rec.leg.decimalOdds.toFixed(2)}x
                        </div>
                        <p className="text-xs">{rec.reasoning}</p>
                        {rec.evBoost > 0 && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            +{(rec.evBoost * 100).toFixed(1)}% EV Boost
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
