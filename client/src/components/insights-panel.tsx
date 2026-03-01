import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap, 
  Target, 
  Shield, 
  Flame,
  Snowflake,
  Cloud,
  Sun,
  Droplets,
  Wind,
  Users,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronUp,
  Calculator,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  X,
  AlertCircle,
  Star,
  Clock
} from "lucide-react";
import type { 
  SportEvent, 
  ParlayLeg, 
  EVAnalysis, 
  LineMovement, 
  BettingPercentages,
  InjuryStatus,
  WeatherData,
  SituationalFactor,
  HistoricalTrend,
  BankrollSettings
} from "@shared/schema";

interface InsightsPanelProps {
  events: SportEvent[];
  selectedLegs: ParlayLeg[];
  bankrollSettings: BankrollSettings;
  onBankrollChange: (settings: BankrollSettings) => void;
  totalSpent: number;
}

function EVBadge({ analysis }: { analysis: EVAnalysis }) {
  const colorMap = {
    strong: "bg-green-500/20 text-green-400 border-green-500/30",
    moderate: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    weak: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    negative: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <Badge className={`${colorMap[analysis.evRating]} text-xs`}>
      {analysis.isPositiveEV ? (
        <TrendingUp className="w-3 h-3 mr-1" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-1" />
      )}
      {analysis.evRating === "strong" ? "+EV Strong" :
       analysis.evRating === "moderate" ? "+EV Moderate" :
       analysis.evRating === "weak" ? "+EV Weak" : "-EV"}
      <span className="ml-1">({(analysis.edge * 100).toFixed(1)}%)</span>
    </Badge>
  );
}

function LineMovementIndicator({ movement }: { movement: LineMovement }) {
  const Icon = movement.direction === "steam" ? ArrowUpRight : 
               movement.direction === "reverse" ? ArrowDownRight : Minus;
  const color = movement.direction === "steam" ? "text-green-400" : 
                movement.direction === "reverse" ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1 text-xs">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={color}>
        {movement.direction === "steam" ? "Steam Move" : 
         movement.direction === "reverse" ? "Reverse Line" : "Stable"}
      </span>
      {movement.sharpAction && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-400">
          <Zap className="w-2 h-2 mr-0.5" /> Sharp
        </Badge>
      )}
    </div>
  );
}

function BettingPercentageBar({ percentages }: { percentages: BettingPercentages }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Public: {percentages.publicPercentage}%</span>
        <span className="text-muted-foreground">Money: {percentages.moneyPercentage}%</span>
      </div>
      <div className="flex gap-1 h-1.5">
        <div 
          className="bg-blue-500/50 rounded-l"
          style={{ width: `${percentages.publicPercentage}%` }}
        />
        <div 
          className="bg-amber-500/50 rounded-r"
          style={{ width: `${percentages.moneyPercentage}%` }}
        />
      </div>
      {percentages.sharpSide && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Target className="w-3 h-3" />
          Sharp money side
        </div>
      )}
    </div>
  );
}

function InjuryAlert({ injuries }: { injuries: InjuryStatus[] }) {
  if (injuries.length === 0) return null;
  
  const statusColors = {
    out: "text-red-400 bg-red-500/20",
    doubtful: "text-orange-400 bg-orange-500/20",
    questionable: "text-yellow-400 bg-yellow-500/20",
    probable: "text-green-400 bg-green-500/20",
    healthy: "text-green-400 bg-green-500/20",
  };

  return (
    <div className="space-y-2">
      {injuries.map((injury, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${injury.status === "out" ? "text-red-400" : "text-yellow-400"}`} />
            <div>
              <div className="text-sm font-medium">{injury.playerName}</div>
              <div className="text-xs text-muted-foreground">{injury.team}</div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={statusColors[injury.status]}>
              {injury.status.toUpperCase()}
            </Badge>
            {injury.injury && (
              <div className="text-xs text-muted-foreground mt-0.5">{injury.injury}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeatherCard({ weather }: { weather: WeatherData }) {
  const WeatherIcon = weather.conditions === "clear" ? Sun :
                      weather.conditions === "cloudy" ? Cloud :
                      weather.conditions === "rain" ? Droplets :
                      weather.conditions === "snow" ? Snowflake : Shield;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <WeatherIcon className="w-8 h-8 text-muted-foreground" />
        <div>
          <div className="font-medium capitalize">{weather.conditions}</div>
          <div className="text-xs text-muted-foreground">
            {weather.temperature}°F | Wind: {weather.windSpeed} mph
          </div>
        </div>
      </div>
      {weather.impactOnTotal !== 0 && (
        <Badge variant={weather.impactOnTotal < 0 ? "destructive" : "default"}>
          {weather.impactOnTotal > 0 ? "+" : ""}{weather.impactOnTotal} pts
        </Badge>
      )}
    </div>
  );
}

function SituationalFactorsList({ factors }: { factors: SituationalFactor[] }) {
  const typeIcons = {
    back_to_back: Clock,
    rest_advantage: Star,
    revenge_game: Flame,
    divisional: Users,
    primetime: Zap,
    travel: Wind,
  };

  return (
    <div className="space-y-2">
      {factors.map((factor, idx) => (
        <div key={idx} className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{factor.team}</div>
          {factor.factors.map((f, fidx) => {
            const Icon = typeIcons[f.type];
            return (
              <div key={fidx} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                <Icon className={`w-4 h-4 ${f.impactRating > 0 ? "text-green-400" : "text-red-400"}`} />
                <span className="text-sm flex-1">{f.description}</span>
                <Badge variant="outline" className={f.impactRating > 0 ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                  {f.impactRating > 0 ? "+" : ""}{(f.impactRating * 100).toFixed(0)}%
                </Badge>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HistoricalTrendCard({ trend }: { trend: HistoricalTrend }) {
  const streakColor = trend.streakType === "over" ? "text-green-400" : 
                      trend.streakType === "under" ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="p-2 rounded bg-muted/20">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">{trend.category}</div>
        <Badge variant="outline" className={trend.hitRate > 0.6 ? "border-green-500/50 text-green-400" : "border-muted"}>
          {(trend.hitRate * 100).toFixed(0)}% hit rate
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Last 10: {trend.last10}/10 over</span>
        {trend.streak > 0 && (
          <span className={streakColor}>
            <Flame className="w-3 h-3 inline mr-1" />
            {trend.streak} game {trend.streakType} streak
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceScore({ winProbability, ev }: { winProbability: number; ev: number }) {
  let level: "high" | "medium" | "low";
  let color: string;
  let Icon: typeof Check;
  
  if (winProbability > 0.12 && ev > 0) {
    level = "high";
    color = "text-green-400 bg-green-500/20 border-green-500/30";
    Icon = Check;
  } else if (winProbability > 0.06 || ev > -0.1) {
    level = "medium";
    color = "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    Icon = AlertCircle;
  } else {
    level = "low";
    color = "text-red-400 bg-red-500/20 border-red-500/30";
    Icon = X;
  }

  return (
    <Badge className={`${color} px-3 py-1`}>
      <Icon className="w-4 h-4 mr-1" />
      {level.toUpperCase()} Confidence
    </Badge>
  );
}

function DiversificationAlert({ legs }: { legs: ParlayLeg[] }) {
  const teamCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();
  
  legs.forEach(leg => {
    if (leg.team) {
      teamCounts.set(leg.team, (teamCounts.get(leg.team) || 0) + 1);
    }
    if (leg.playerName) {
      playerCounts.set(leg.playerName, (playerCounts.get(leg.playerName) || 0) + 1);
    }
  });
  
  const overexposedTeams = Array.from(teamCounts.entries()).filter(([_, count]) => count > 2);
  const overexposedPlayers = Array.from(playerCounts.entries()).filter(([_, count]) => count > 1);
  
  if (overexposedTeams.length === 0 && overexposedPlayers.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <Shield className="w-5 h-5 text-green-400" />
        <span className="text-sm text-green-400">Good diversification - no concentrated exposure</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {overexposedTeams.map(([team, count]) => (
        <div key={team} className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-amber-400">
            High exposure to {team} ({count} legs)
          </span>
        </div>
      ))}
      {overexposedPlayers.map(([player, count]) => (
        <div key={player} className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-amber-400">
            Multiple bets on {player} ({count} props)
          </span>
        </div>
      ))}
    </div>
  );
}

function HedgeCalculator({ potentialWin, remainingLegs, stake }: { potentialWin: number; remainingLegs: number; stake: number }) {
  const [hedgeOdds, setHedgeOdds] = useState(-110);
  
  const hedgeDecimal = hedgeOdds > 0 ? 1 + hedgeOdds / 100 : 1 + 100 / Math.abs(hedgeOdds);
  const hedgeStake = (potentialWin - stake) / hedgeDecimal;
  const guaranteedProfit = potentialWin - hedgeStake - stake;
  const maxProfit = potentialWin - stake;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Potential Win</Label>
          <div className="text-lg font-mono font-bold text-green-400">${potentialWin.toFixed(2)}</div>
        </div>
        <div>
          <Label className="text-xs">Remaining Legs</Label>
          <div className="text-lg font-mono font-bold">{remainingLegs}</div>
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Hedge Bet Odds (American)</Label>
        <Input 
          type="number"
          value={hedgeOdds}
          onChange={(e) => setHedgeOdds(Number(e.target.value))}
          className="font-mono"
        />
      </div>
      
      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Hedge Stake:</span>
          <span className="font-mono font-bold">${hedgeStake.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Locked-In Profit:</span>
          <span className="font-mono font-bold text-green-400">${Math.max(0, guaranteedProfit).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Max Profit (if parlay hits):</span>
          <span className="font-mono font-bold text-emerald-400">${maxProfit.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function WhatIfScenario({ legs }: { legs: ParlayLeg[] }) {
  if (legs.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Select some bets to analyze what-if scenarios
      </div>
    );
  }
  
  const currentOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
  const currentPayout = 10 * currentOdds;
  
  const scenarios = [
    { name: "Remove highest odds leg", multiplier: 0.7 },
    { name: "Add one more leg", multiplier: 1.4 },
    { name: "Switch to opposite sides", multiplier: 1.05 },
  ];

  return (
    <div className="space-y-2">
      <div className="p-2 rounded bg-muted/30">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Current Parlay</span>
          <span className="font-mono">{legs.length} legs @ {currentOdds.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-muted-foreground">Potential Payout</span>
          <span className="font-mono text-green-400">${currentPayout.toFixed(2)}</span>
        </div>
      </div>
      
      {scenarios.map((scenario, idx) => {
        const newOdds = currentOdds * scenario.multiplier;
        const newPayout = 10 * newOdds;
        const diff = newPayout - currentPayout;
        return (
          <div key={idx} className="p-2 rounded bg-muted/20 border border-dashed border-muted">
            <div className="text-xs font-medium">{scenario.name}</div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">New odds: {newOdds.toFixed(2)}x</span>
              <span className={diff > 0 ? "text-green-400" : "text-red-400"}>
                {diff > 0 ? "+" : ""}{diff.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BankrollManagement({ settings, onChange, totalSpent }: { 
  settings: BankrollSettings; 
  onChange: (settings: BankrollSettings) => void;
  totalSpent: number;
}) {
  const sessionUsage = (totalSpent / settings.sessionLimit) * 100;
  const dailyUsage = (totalSpent / settings.dailyLimit) * 100;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Total Bankroll</Label>
          <Input 
            type="number"
            value={settings.totalBankroll}
            onChange={(e) => onChange({ ...settings, totalBankroll: Number(e.target.value) })}
            className="font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Session Limit</Label>
          <Input 
            type="number"
            value={settings.sessionLimit}
            onChange={(e) => onChange({ ...settings, sessionLimit: Number(e.target.value) })}
            className="font-mono"
          />
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Daily Loss Limit</Label>
        <Input 
          type="number"
          value={settings.dailyLimit}
          onChange={(e) => onChange({ ...settings, dailyLimit: Number(e.target.value) })}
          className="font-mono"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Session Usage</span>
          <span className={sessionUsage > 80 ? "text-red-400" : "text-muted-foreground"}>
            ${totalSpent.toFixed(2)} / ${settings.sessionLimit}
          </span>
        </div>
        <Progress value={Math.min(sessionUsage, 100)} className={sessionUsage > 80 ? "[&>div]:bg-red-500" : ""} />
        
        {sessionUsage > 80 && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            Approaching session limit
          </div>
        )}
      </div>
      
      <div>
        <Label className="text-xs">Bet Size Factor: {settings.kellyMultiplier}x</Label>
        <Slider
          value={[settings.kellyMultiplier]}
          min={0.1}
          max={1}
          step={0.05}
          onValueChange={([value]) => onChange({ ...settings, kellyMultiplier: value })}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Conservative</span>
          <span>Full Size</span>
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel({ 
  events, 
  selectedLegs, 
  bankrollSettings, 
  onBankrollChange,
  totalSpent 
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState("ev");
  
  const allInjuries = events.flatMap(e => e.injuries || []);
  const allSituationalFactors = events.flatMap(e => e.situationalFactors || []);
  const positiveEVOutcomes = events.flatMap(e => 
    e.markets.flatMap(m => 
      m.outcomes.filter(o => o.evAnalysis?.isPositiveEV)
    )
  );
  const sharpMoves = events.flatMap(e =>
    e.markets.flatMap(m =>
      m.outcomes.filter(o => o.lineMovement?.sharpAction)
    )
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          Betting Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 p-1">
              <TabsTrigger value="ev" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-ev">
                <TrendingUp className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">+EV</span>
                <span className="sm:hidden">EV</span>
              </TabsTrigger>
              <TabsTrigger value="lines" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-lines">
                <Activity className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Lines</span>
                <span className="sm:hidden">Line</span>
              </TabsTrigger>
              <TabsTrigger value="context" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-context">
                <AlertTriangle className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Context</span>
                <span className="sm:hidden">Ctx</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-trends">
                <Flame className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Trends</span>
                <span className="sm:hidden">Trnd</span>
              </TabsTrigger>
              <TabsTrigger value="risk" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-risk">
                <Shield className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Risk</span>
                <span className="sm:hidden">Risk</span>
              </TabsTrigger>
              <TabsTrigger value="hedge" className="text-[10px] sm:text-xs px-1 sm:px-3" data-testid="tab-hedge">
                <Calculator className="w-3 h-3 sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Hedge</span>
                <span className="sm:hidden">Hdg</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              <TabsContent value="ev" className="mt-0 space-y-3">
                <div className="text-sm font-medium mb-2">
                  {positiveEVOutcomes.length} Positive EV Opportunities Found
                </div>
                {positiveEVOutcomes.slice(0, 10).map((outcome, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{outcome.name}</span>
                      {outcome.evAnalysis && <EVBadge analysis={outcome.evAnalysis} />}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Odds: {outcome.americanOdds > 0 ? "+" : ""}{outcome.americanOdds}</span>
                      <span>Model: {((outcome.evAnalysis?.modelProbability || 0) * 100).toFixed(1)}%</span>
                      <span>Implied: {((outcome.evAnalysis?.impliedProbability || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
                {positiveEVOutcomes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No positive EV opportunities currently detected
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="lines" className="mt-0 space-y-3">
                <div className="text-sm font-medium mb-2">
                  {sharpMoves.length} Sharp Line Movements Detected
                </div>
                {sharpMoves.map((outcome, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="font-medium text-sm">{outcome.name}</div>
                    {outcome.lineMovement && <LineMovementIndicator movement={outcome.lineMovement} />}
                    {outcome.bettingPercentages && <BettingPercentageBar percentages={outcome.bettingPercentages} />}
                  </div>
                ))}
                {sharpMoves.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No significant line movements detected
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="context" className="mt-0 space-y-4">
                {allInjuries.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Injury Alerts ({allInjuries.length})
                    </div>
                    <InjuryAlert injuries={allInjuries} />
                  </div>
                )}
                
                {events.some(e => e.weather && e.weather.conditions !== "dome") && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      Weather Impact
                    </div>
                    {events.filter(e => e.weather && e.weather.conditions !== "dome").map((event, idx) => (
                      <div key={idx} className="mb-2">
                        <div className="text-xs text-muted-foreground mb-1">{event.awayTeam} @ {event.homeTeam}</div>
                        {event.weather && <WeatherCard weather={event.weather} />}
                      </div>
                    ))}
                  </div>
                )}
                
                {allSituationalFactors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Situational Factors
                    </div>
                    <SituationalFactorsList factors={allSituationalFactors} />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="trends" className="mt-0 space-y-3">
                <div className="text-sm font-medium mb-2">Historical Player Trends</div>
                {events.flatMap(e => e.historicalTrends || []).slice(0, 8).map((trend, idx) => (
                  <HistoricalTrendCard key={idx} trend={trend} />
                ))}
              </TabsContent>
              
              <TabsContent value="risk" className="mt-0 space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Diversification Check
                  </div>
                  <DiversificationAlert legs={selectedLegs} />
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Bankroll Management
                  </div>
                  <BankrollManagement 
                    settings={bankrollSettings} 
                    onChange={onBankrollChange}
                    totalSpent={totalSpent}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="hedge" className="mt-0 space-y-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Hedge Calculator
                </div>
                {selectedLegs.length > 0 ? (
                  <HedgeCalculator 
                    potentialWin={selectedLegs.reduce((acc, leg) => acc * leg.decimalOdds, 10)}
                    remainingLegs={selectedLegs.length}
                    stake={10}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Add legs to your parlay to see hedge recommendations
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    What-If Scenario
                  </div>
                  <WhatIfScenario legs={selectedLegs} />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { EVBadge, ConfidenceScore, LineMovementIndicator, BettingPercentageBar };