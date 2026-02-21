import { useState } from "react";
import { 
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target, 
  ArrowLeftRight, Clock, DollarSign, Activity, Flame,
  Users, BarChart3, Percent, ChevronRight, ChevronDown, Atom
} from "lucide-react";
import { QuantumAnalysisIndicator, QuantumBadge } from "./quantum-analysis-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { 
  ArbitrageOpportunity, MiddleOpportunity, KeyNumberAlert, 
  SGPCorrelation, FadePublicAlert, AlternateLine, StreakBreakerAlert,
  PropCorrelation, PaceProjection, FatigueModel, SportEvent
} from "@shared/schema";

interface EdgeFinderProps {
  events: SportEvent[];
  sport: string;
}

function generateArbitrageOpportunities(events: SportEvent[]): ArbitrageOpportunity[] {
  const arbs: ArbitrageOpportunity[] = [];
  const books = ["FanDuel", "DraftKings", "BetMGM", "Caesars", "PointsBet"];
  
  events.slice(0, 3).forEach((event, idx) => {
    if (Math.random() > 0.7) {
      const baseOdds = 2.0 + Math.random() * 0.5;
      const arbMargin = 0.01 + Math.random() * 0.02;
      arbs.push({
        id: `arb-${idx}`,
        gameId: event.id,
        game: `${event.awayTeam} @ ${event.homeTeam}`,
        market: "Moneyline",
        side1: {
          book: books[Math.floor(Math.random() * books.length)],
          outcome: event.homeTeam,
          odds: baseOdds,
          stake: 100 / baseOdds,
        },
        side2: {
          book: books[Math.floor(Math.random() * books.length)],
          outcome: event.awayTeam,
          odds: baseOdds + arbMargin * 10,
          stake: 100 / (baseOdds + arbMargin * 10),
        },
        totalStake: 100,
        guaranteedProfit: arbMargin * 100,
        profitPercent: arbMargin * 100,
        expiresAt: new Date(Date.now() + Math.random() * 3600000).toISOString(),
      });
    }
  });
  return arbs;
}

function generateMiddleOpportunities(events: SportEvent[]): MiddleOpportunity[] {
  const middles: MiddleOpportunity[] = [];
  const books = ["FanDuel", "DraftKings", "BetMGM"];
  
  events.slice(0, 4).forEach((event, idx) => {
    if (Math.random() > 0.6) {
      const baseLine = Math.floor(Math.random() * 10) + 3;
      middles.push({
        id: `mid-${idx}`,
        gameId: event.id,
        game: `${event.awayTeam} @ ${event.homeTeam}`,
        market: "Spread",
        lowSide: {
          book: books[0],
          line: -baseLine - 0.5,
          odds: -110,
          stake: 52.38,
        },
        highSide: {
          book: books[1],
          line: baseLine + 1.5,
          odds: -110,
          stake: 52.38,
        },
        middleRange: `${baseLine} to ${baseLine + 1}`,
        middleProbability: 0.08 + Math.random() * 0.12,
        expectedValue: 2 + Math.random() * 8,
        worstCase: -4.76,
        bestCase: 90.48,
      });
    }
  });
  return middles;
}

function generateKeyNumberAlerts(events: SportEvent[], sport: string): KeyNumberAlert[] {
  if (sport !== "NFL" && sport !== "NCAAF") return [];
  
  const keyNumbers = [3, 7, 10, 14, 17];
  const alerts: KeyNumberAlert[] = [];
  
  events.slice(0, 5).forEach((event, idx) => {
    const spread = Math.floor(Math.random() * 14) - 7;
    const keyNum = keyNumbers.find(k => Math.abs(spread) === k || Math.abs(spread - 0.5) === k);
    
    if (keyNum) {
      alerts.push({
        gameId: event.id,
        game: `${event.awayTeam} @ ${event.homeTeam}`,
        currentSpread: spread,
        keyNumber: keyNum,
        pushProbability: keyNum === 3 ? 0.095 : keyNum === 7 ? 0.065 : 0.04,
        recommendation: `Spread at key number ${keyNum}. Consider ${spread > 0 ? "buying" : "selling"} half point.`,
        buyPoints: {
          newSpread: spread > 0 ? spread + 0.5 : spread - 0.5,
          newOdds: -120,
          ev: 1.5 + Math.random() * 2,
        },
      });
    }
  });
  return alerts;
}

function generateSGPCorrelations(): SGPCorrelation[] {
  return [
    {
      leg1: { type: "Team Total", outcome: "Over" },
      leg2: { type: "QB Passing Yards", outcome: "Over" },
      correlation: 0.72,
      direction: "positive",
      recommendation: "Strong positive correlation - these typically hit together",
      evBoost: 8.5,
    },
    {
      leg1: { type: "Game Total", outcome: "Over" },
      leg2: { type: "1H Total", outcome: "Over" },
      correlation: 0.65,
      direction: "positive",
      recommendation: "Moderate positive - 1H pace often predicts game pace",
      evBoost: 5.2,
    },
    {
      leg1: { type: "Favorite ML", outcome: "Win" },
      leg2: { type: "Favorite -3.5", outcome: "Cover" },
      correlation: 0.85,
      direction: "positive",
      recommendation: "Very high correlation - consider alt spread instead",
      evBoost: -2.1,
    },
    {
      leg1: { type: "RB Rushing Yards", outcome: "Over" },
      leg2: { type: "Game Script", outcome: "Team Leading" },
      correlation: 0.58,
      direction: "positive",
      recommendation: "Winning teams run more - stack with favorite",
      evBoost: 6.8,
    },
  ];
}

function generateFadePublicAlerts(events: SportEvent[]): FadePublicAlert[] {
  const alerts: FadePublicAlert[] = [];
  
  events.forEach((event) => {
    event.markets.forEach((market) => {
      market.outcomes.forEach((outcome) => {
        if (outcome.bettingPercentages && 
            outcome.bettingPercentages.publicPercentage > 65 && 
            !outcome.bettingPercentages.sharpSide) {
          const otherOutcome = market.outcomes.find(o => o !== outcome);
          alerts.push({
            gameId: event.id,
            game: `${event.awayTeam} @ ${event.homeTeam}`,
            market: market.type,
            publicSide: outcome.name,
            publicPercent: outcome.bettingPercentages.publicPercentage,
            sharpSide: otherOutcome?.name || "Opposite",
            sharpPercent: 100 - outcome.bettingPercentages.publicPercentage,
            lineMovement: outcome.lineMovement?.direction || "stable",
            recommendation: `Public heavy on ${outcome.name} (${outcome.bettingPercentages.publicPercentage}%) but line moving opposite`,
            confidence: outcome.bettingPercentages.publicPercentage > 75 ? "high" : "medium",
          });
        }
      });
    });
  });
  return alerts.slice(0, 5);
}

function generateStreakBreakerAlerts(events: SportEvent[]): StreakBreakerAlert[] {
  const alerts: StreakBreakerAlert[] = [];
  
  events.forEach((event) => {
    event.historicalTrends?.forEach((trend) => {
      if (trend.streak >= 5) {
        alerts.push({
          type: "player",
          name: trend.playerId || "Unknown",
          team: event.homeTeam,
          category: trend.category,
          currentStreak: trend.streak,
          streakType: trend.streakType as "over" | "under",
          historicalAvgStreak: 3.2,
          regressionProbability: Math.min(0.85, 0.5 + trend.streak * 0.08),
          recommendation: `${trend.streak} game streak on ${trend.streakType}. Regression likely soon.`,
        });
      }
    });
  });
  return alerts.slice(0, 5);
}

function generatePropCorrelations(events: SportEvent[]): PropCorrelation[] {
  const correlations: PropCorrelation[] = [];
  
  events.slice(0, 2).forEach((event) => {
    if (event.playerProps && event.playerProps.length >= 2) {
      const props = event.playerProps;
      correlations.push({
        prop1: {
          player: props[0].playerName,
          category: props[0].category,
          line: props[0].line,
        },
        prop2: {
          player: props[1].playerName,
          category: props[1].category,
          line: props[1].line,
        },
        correlation: 0.55 + Math.random() * 0.3,
        relationship: "Teammate synergy - production often correlates",
        combinedEV: 3 + Math.random() * 7,
      });
    }
  });
  return correlations;
}

function generatePaceProjections(events: SportEvent[]): PaceProjection[] {
  return events.slice(0, 4).map((event) => {
    const homePace = 95 + Math.random() * 10;
    const awayPace = 95 + Math.random() * 10;
    const projectedPace = (homePace + awayPace) / 2;
    const leagueAvg = 100;
    const projectedTotal = 210 + (projectedPace - leagueAvg) * 2;
    const currentLine = 215 + Math.random() * 20;
    const edge = (projectedTotal - currentLine) / currentLine;
    
    return {
      gameId: event.id,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      homePace,
      awayPace,
      projectedPace,
      leagueAvgPace: leagueAvg,
      projectedTotal,
      currentLine,
      edge,
      recommendation: edge > 0.02 ? "over" : edge < -0.02 ? "under" : "pass",
    };
  });
}

function generateFatigueModels(events: SportEvent[]): FatigueModel[] {
  return events.slice(0, 4).flatMap((event) => {
    return [event.homeTeam, event.awayTeam].map((team) => {
      const restDays = Math.floor(Math.random() * 5);
      const travelMiles = team === event.homeTeam ? 0 : Math.floor(Math.random() * 2000);
      const timeZones = Math.floor(travelMiles / 800);
      const gamesIn7 = Math.floor(Math.random() * 4) + 1;
      const fatigueScore = (4 - restDays) * 15 + travelMiles / 100 + timeZones * 5 + gamesIn7 * 8;
      
      return {
        team,
        restDays,
        travelMiles,
        timeZonesCrossed: timeZones,
        gamesInLast7Days: gamesIn7,
        fatigueScore: Math.min(100, fatigueScore),
        performanceImpact: -fatigueScore / 200,
        recommendation: fatigueScore > 50 ? `Fade ${team} - high fatigue` : `${team} well-rested`,
      };
    });
  });
}

export function EdgeFinder({ events, sport }: EdgeFinderProps) {
  const [activeTab, setActiveTab] = useState("arbs");
  
  const arbitrages = generateArbitrageOpportunities(events);
  const middles = generateMiddleOpportunities(events);
  const keyNumbers = generateKeyNumberAlerts(events, sport);
  const sgpCorrelations = generateSGPCorrelations();
  const fadePublic = generateFadePublicAlerts(events);
  const streakBreakers = generateStreakBreakerAlerts(events);
  const propCorrelations = generatePropCorrelations(events);
  const paceProjections = generatePaceProjections(events);
  const fatigueModels = generateFatigueModels(events);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Zap className="w-5 h-5 text-yellow-500" />
          Edge Finder
          <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
            <Atom className="w-3 h-3" />
            Q-Analysis
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">Demo data shown for illustration. Connect live feeds for real-time results.</p>
        </div>
        <QuantumAnalysisIndicator compact />
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="arbs" className="text-xs">
              <DollarSign className="w-3 h-3 mr-1" />
              Arb/Mid
            </TabsTrigger>
            <TabsTrigger value="sharp" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Sharp
            </TabsTrigger>
            <TabsTrigger value="models" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Models
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            <TabsContent value="arbs" className="mt-0 space-y-4">
              {arbitrages.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Arbitrage Opportunities
                  </div>
                  {arbitrages.map((arb) => (
                    <Card key={arb.id} className="bg-green-500/10 border-green-500/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">{arb.game}</span>
                          <Badge className="bg-green-500 text-white">
                            +{arb.profitPercent.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground">{arb.side1.book}</div>
                            <div className="font-medium">{arb.side1.outcome}</div>
                            <div className="font-mono">{arb.side1.odds.toFixed(2)} / ${arb.side1.stake.toFixed(0)}</div>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground">{arb.side2.book}</div>
                            <div className="font-medium">{arb.side2.outcome}</div>
                            <div className="font-mono">{arb.side2.odds.toFixed(2)} / ${arb.side2.stake.toFixed(0)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-green-400">
                          Guaranteed: ${arb.guaranteedProfit.toFixed(2)} on $100
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {arbitrages.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No arbitrage opportunities found
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                  Middle Opportunities
                </div>
                {middles.map((mid) => (
                  <Card key={mid.id} className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{mid.game}</span>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                          {(mid.middleProbability * 100).toFixed(1)}% middle
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Middle range: {mid.middleRange} points
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-red-400">Worst</div>
                          <div className="font-mono">${mid.worstCase.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400">Expected</div>
                          <div className="font-mono">+${mid.expectedValue.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400">Best</div>
                          <div className="font-mono">+${mid.bestCase.toFixed(2)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {keyNumbers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Key Number Alerts
                  </div>
                  {keyNumbers.map((alert, idx) => (
                    <Card key={idx} className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="p-3">
                        <div className="text-sm font-medium mb-1">{alert.game}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Spread: {alert.currentSpread > 0 ? "+" : ""}{alert.currentSpread} (Key #{alert.keyNumber})
                        </div>
                        <div className="text-xs mb-2">
                          Push probability: {(alert.pushProbability * 100).toFixed(1)}%
                        </div>
                        {alert.buyPoints && (
                          <div className="text-xs text-amber-400">
                            Buy to {alert.buyPoints.newSpread > 0 ? "+" : ""}{alert.buyPoints.newSpread} @ {alert.buyPoints.newOdds} 
                            ({alert.buyPoints.ev > 0 ? "+" : ""}{alert.buyPoints.ev.toFixed(1)}% EV)
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="sharp" className="mt-0 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Fade the Public
                </div>
                {fadePublic.map((alert, idx) => (
                  <Card key={idx} className="bg-purple-500/10 border-purple-500/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{alert.game}</span>
                        <Badge className={alert.confidence === "high" ? "bg-purple-500" : "bg-purple-500/50"}>
                          {alert.confidence}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Public:</span>
                          <span className="text-red-400">{alert.publicSide} ({alert.publicPercent}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sharp:</span>
                          <span className="text-green-400">{alert.sharpSide} ({alert.sharpPercent}%)</span>
                        </div>
                        <div className="text-xs text-purple-400 mt-2">
                          {alert.recommendation}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Streak Breakers
                </div>
                {streakBreakers.map((alert, idx) => (
                  <Card key={idx} className="bg-orange-500/10 border-orange-500/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{alert.name}</span>
                        <Badge variant="outline" className="border-orange-500/50">
                          {alert.currentStreak} game streak
                        </Badge>
                      </div>
                      <div className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Regression probability:</span>
                          <span className="text-orange-400">{(alert.regressionProbability * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={alert.regressionProbability * 100} className="h-1 [&>div]:bg-orange-500" />
                        <div className="text-xs text-orange-400 mt-2">
                          {alert.recommendation}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  SGP Correlations
                </div>
                {sgpCorrelations.map((corr, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {corr.leg1.type} {corr.leg1.outcome}
                        </Badge>
                        <span className="text-muted-foreground">+</span>
                        <Badge variant="outline" className="text-xs">
                          {corr.leg2.type} {corr.leg2.outcome}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Correlation: {(corr.correlation * 100).toFixed(0)}%</span>
                        <span className={corr.evBoost > 0 ? "text-green-400" : "text-red-400"}>
                          {corr.evBoost > 0 ? "+" : ""}{corr.evBoost.toFixed(1)}% EV
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {corr.recommendation}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="models" className="mt-0 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Pace Projections
                </div>
                {paceProjections.map((proj, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="text-sm font-medium mb-2">
                        {proj.awayTeam} @ {proj.homeTeam}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">Proj Pace: </span>
                          <span className="font-mono">{proj.projectedPace.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">League Avg: </span>
                          <span className="font-mono">{proj.leagueAvgPace}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Proj Total: </span>
                          <span className="font-mono">{proj.projectedTotal.toFixed(1)}</span>
                          <span className="text-muted-foreground"> vs Line: </span>
                          <span className="font-mono">{proj.currentLine.toFixed(1)}</span>
                        </div>
                        <Badge className={
                          proj.recommendation === "over" ? "bg-green-500" :
                          proj.recommendation === "under" ? "bg-red-500" : "bg-muted"
                        }>
                          {proj.recommendation.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  Fatigue Model
                </div>
                {fatigueModels.slice(0, 4).map((model, idx) => (
                  <Card key={idx} className={`${model.fatigueScore > 50 ? "bg-rose-500/10 border-rose-500/30" : "bg-muted/30"}`}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{model.team}</span>
                        <Badge variant="outline" className={model.fatigueScore > 50 ? "border-rose-500/50 text-rose-400" : ""}>
                          Fatigue: {model.fatigueScore.toFixed(0)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs text-center mb-2">
                        <div>
                          <div className="text-muted-foreground">Rest</div>
                          <div className="font-mono">{model.restDays}d</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Travel</div>
                          <div className="font-mono">{model.travelMiles}mi</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">TZ</div>
                          <div className="font-mono">{model.timeZonesCrossed}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">7d</div>
                          <div className="font-mono">{model.gamesInLast7Days}g</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {model.recommendation}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Percent className="w-4 h-4 text-teal-500" />
                  Prop Correlations
                </div>
                {propCorrelations.map((corr, idx) => (
                  <Card key={idx} className="bg-teal-500/10 border-teal-500/30">
                    <CardContent className="p-3">
                      <div className="text-xs space-y-1 mb-2">
                        <div className="font-medium">{corr.prop1.player} {corr.prop1.category} O{corr.prop1.line}</div>
                        <div className="font-medium">{corr.prop2.player} {corr.prop2.category} O{corr.prop2.line}</div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Correlation: {(corr.correlation * 100).toFixed(0)}%</span>
                        <span className="text-green-400">+{corr.combinedEV.toFixed(1)}% EV</span>
                      </div>
                      <div className="text-xs text-teal-400 mt-1">
                        {corr.relationship}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}