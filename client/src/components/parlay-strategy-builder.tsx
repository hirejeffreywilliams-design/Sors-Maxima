import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Target, Zap, Shield, TrendingUp, Layers, DollarSign, 
  RefreshCw, Star, AlertTriangle, CheckCircle, Sparkles,
  Trophy, Flame, BarChart3, Puzzle, Atom
} from "lucide-react";
import { QuantumBadge } from "./quantum-analysis-badge";

interface StrategyLeg {
  sport: string;
  game: string;
  pick: string;
  odds: number;
  confidence: number;
  correlation: string;
  reasoning: string;
}

interface ParlayStrategy {
  id: string;
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "extreme";
  expectedROI: number;
  winProbability: number;
  legs: StrategyLeg[];
  totalOdds: number;
  potentialPayout: number;
  keyInsight: string;
  bestFor: string[];
}

const SPORTS_OPTIONS = [
  { value: "all", label: "All Sports" },
  { value: "nfl", label: "NFL" },
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
  { value: "nhl", label: "NHL" },
  { value: "ncaab", label: "NCAAB" },
  { value: "ncaaf", label: "NCAAF" },
  { value: "soccer_epl", label: "Premier League" },
  { value: "soccer_laliga", label: "La Liga" },
  { value: "soccer_bundesliga", label: "Bundesliga" },
  { value: "soccer_seriea", label: "Serie A" },
  { value: "soccer_ligue1", label: "Ligue 1" },
  { value: "soccer_mls", label: "MLS" },
  { value: "soccer_ucl", label: "Champions League" },
  { value: "soccer_intl", label: "International" },
];

const STRATEGY_TYPES = [
  { value: "balanced", label: "Balanced Growth", icon: BarChart3 },
  { value: "correlated", label: "Correlated Stacks", icon: Layers },
  { value: "contrarian", label: "Contrarian Fades", icon: Zap },
  { value: "chalk", label: "Chalk Parlay", icon: Shield },
  { value: "longshot", label: "Longshot Jackpot", icon: Trophy },
  { value: "crosssport", label: "Cross-Sport Diversified", icon: Puzzle },
];

function generateStrategyLegs(strategy: string, legCount: number, sports: string): StrategyLeg[] {
  const allLegs: StrategyLeg[] = [
    { sport: "NFL", game: "Chiefs @ Bills", pick: "Chiefs +3", odds: -110, confidence: 72, correlation: "neutral", reasoning: "KC 6-2 ATS as underdog, Bills overvalued at home" },
    { sport: "NFL", game: "Eagles @ 49ers", pick: "Under 47.5", odds: -105, confidence: 68, correlation: "weather", reasoning: "Both defenses top-5, wind advisory in SF" },
    { sport: "NFL", game: "Lions @ Cowboys", pick: "Lions ML", odds: +145, confidence: 58, correlation: "neutral", reasoning: "Lions dominating road games, Cowboys injury concerns" },
    { sport: "NFL", game: "Broncos @ Raiders", pick: "Broncos -2.5", odds: -110, confidence: 64, correlation: "division", reasoning: "Denver 5-1 ATS in division games this season" },
    { sport: "NBA", game: "Mavericks @ 76ers", pick: "76ers -4.5", odds: -110, confidence: 75, correlation: "home", reasoning: "76ers 12-2 at home, Mavericks on B2B" },
    { sport: "NBA", game: "Kings @ Bucks", pick: "Over 228.5", odds: -108, confidence: 70, correlation: "pace", reasoning: "Both teams top-10 pace, expect shootout" },
    { sport: "NBA", game: "Nuggets @ Suns", pick: "Nuggets -2", odds: -110, confidence: 65, correlation: "neutral", reasoning: "Jokic dominates PHX, Nuggets 8-2 L10" },
    { sport: "NBA", game: "Heat @ 76ers", pick: "Heat ML", odds: +135, confidence: 56, correlation: "rivalry", reasoning: "Heat 7-2 SU in playoff matchups, Butler dominates" },
    { sport: "MLB", game: "Yankees @ Dodgers", pick: "Under 8.5", odds: -115, confidence: 67, correlation: "pitching", reasoning: "Ace pitching matchup, both bullpens rested" },
    { sport: "MLB", game: "Braves @ Mets", pick: "Braves ML", odds: +120, confidence: 60, correlation: "neutral", reasoning: "Braves 7-3 H2H, Mets struggling vs RHP" },
    { sport: "MLB", game: "Astros @ Rangers", pick: "Astros -1.5", odds: +130, confidence: 58, correlation: "rivalry", reasoning: "Houston run line value, Rangers bullpen struggling" },
    { sport: "NHL", game: "Bruins @ Panthers", pick: "Panthers ML", odds: -135, confidence: 72, correlation: "home", reasoning: "Panthers unbeaten at home in playoffs" },
    { sport: "NHL", game: "Oilers @ Avalanche", pick: "Over 6.5", odds: +105, confidence: 64, correlation: "pace", reasoning: "Two highest-scoring teams, both goalies struggling" },
    { sport: "NHL", game: "Hurricanes @ Rangers", pick: "Hurricanes ML", odds: +115, confidence: 55, correlation: "value", reasoning: "Carolina undervalued, strong road record" },
    { sport: "NCAAB", game: "Duke @ UNC", pick: "Duke +2.5", odds: -110, confidence: 62, correlation: "rivalry", reasoning: "Duke covers 60% in rivalry games as dog" },
    { sport: "NCAAB", game: "Kansas @ Kentucky", pick: "Over 145.5", odds: -108, confidence: 65, correlation: "pace", reasoning: "Both teams push tempo, combined avg 155 PPG" },
    { sport: "NCAAB", game: "Gonzaga @ UCLA", pick: "Gonzaga -3", odds: -110, confidence: 68, correlation: "neutral", reasoning: "Zags dominate neutral court matchups" },
    { sport: "NCAAF", game: "Alabama @ Georgia", pick: "Under 52.5", odds: -110, confidence: 66, correlation: "defense", reasoning: "Both defenses elite, expect low-scoring battle" },
    { sport: "NCAAF", game: "Ohio State @ Michigan", pick: "Michigan ML", odds: -140, confidence: 70, correlation: "home", reasoning: "Michigan 8-1 at home vs ranked opponents" },
    { sport: "NCAAF", game: "Texas @ Oklahoma", pick: "Texas -3", odds: -105, confidence: 63, correlation: "rivalry", reasoning: "Texas trending up, Oklahoma in transition" },
  ];

  let filtered = sports === "all" ? [...allLegs] : allLegs.filter(l => l.sport.toLowerCase() === sports);
  
  if (strategy === "correlated") {
    const sportGroups: Record<string, StrategyLeg[]> = {};
    filtered.forEach(leg => {
      if (!sportGroups[leg.sport]) sportGroups[leg.sport] = [];
      sportGroups[leg.sport].push(leg);
    });
    const mainSport = Object.keys(sportGroups).sort((a, b) => sportGroups[b].length - sportGroups[a].length)[0];
    if (mainSport && sportGroups[mainSport]) {
      filtered = sportGroups[mainSport];
    }
  }
  
  if (strategy === "crosssport") {
    if (sports === "all") {
      const used = new Set<string>();
      const crossSportLegs: StrategyLeg[] = [];
      
      for (const leg of allLegs) {
        if (!used.has(leg.sport) && crossSportLegs.length < legCount) {
          used.add(leg.sport);
          crossSportLegs.push(leg);
        }
      }
      
      if (crossSportLegs.length < legCount) {
        for (const leg of allLegs) {
          if (!crossSportLegs.includes(leg) && crossSportLegs.length < legCount) {
            crossSportLegs.push(leg);
          }
        }
      }
      
      filtered = crossSportLegs;
    } else {
      filtered = filtered.slice(0, legCount);
    }
  }
  
  if (strategy === "chalk") {
    const highConfidence = filtered.filter(l => l.confidence >= 62).sort((a, b) => b.confidence - a.confidence);
    filtered = highConfidence.length >= 2 ? highConfidence : filtered.sort((a, b) => b.confidence - a.confidence);
  }
  
  if (strategy === "longshot") {
    const longshotLegs = filtered.filter(l => l.odds > 100 || l.confidence < 62);
    const modifiedLegs = filtered.map(l => ({
      ...l,
      odds: l.odds < 0 ? Math.round(Math.abs(l.odds) * 0.8 + 100) : l.odds + 50,
      confidence: Math.max(45, l.confidence - 12),
      reasoning: `Longshot value: ${l.reasoning}`,
    }));
    filtered = longshotLegs.length >= 2 ? longshotLegs : modifiedLegs;
  }
  
  if (strategy === "contrarian") {
    filtered = filtered.map(l => ({
      ...l,
      reasoning: `Fading public: ${l.reasoning}`,
      confidence: Math.max(50, l.confidence - 8),
      odds: l.odds < 0 ? l.odds + 15 : l.odds + 20,
    }));
  }
  
  return filtered.slice(0, Math.min(legCount, filtered.length));
}

function calculateParlayOdds(legs: StrategyLeg[]): number {
  let multiplier = 1;
  for (const leg of legs) {
    const decimal = leg.odds < 0 
      ? 1 + (100 / Math.abs(leg.odds))
      : 1 + (leg.odds / 100);
    multiplier *= decimal;
  }
  return multiplier;
}

function generateStrategies(strategyType: string, legCount: number, stake: number, sports: string): ParlayStrategy[] {
  const legs = generateStrategyLegs(strategyType, legCount, sports);
  
  if (legs.length === 0) {
    return [];
  }
  
  const totalOdds = calculateParlayOdds(legs);
  const potentialPayout = stake * totalOdds;
  
  const avgConfidence = legs.reduce((sum, l) => sum + l.confidence, 0) / legs.length;
  const winProb = legs.length > 0 
    ? legs.reduce((prob, l) => prob * (l.confidence / 100), 1) * 100 
    : 0;
  
  const strategies: ParlayStrategy[] = [];
  
  const strategyConfigs: Record<string, { name: string; description: string; riskLevel: "low" | "medium" | "high" | "extreme"; keyInsight: string; bestFor: string[] }> = {
    balanced: {
      name: "Balanced Growth Strategy",
      description: "Mix of favorites and slight underdogs across multiple games to balance risk and reward",
      riskLevel: "medium",
      keyInsight: "Diversification reduces variance while maintaining +EV edge",
      bestFor: ["Daily bettors", "Bankroll builders", "Consistent returns"],
    },
    correlated: {
      name: "Correlated Stack Strategy",
      description: "Legs that move together - if one hits, others likely follow. Weather, pace, and game flow correlations.",
      riskLevel: "medium",
      keyInsight: "Correlated legs boost true win probability above naive multiplication",
      bestFor: ["Same-game parlays", "Weather-dependent games", "High-scoring matchups"],
    },
    contrarian: {
      name: "Fade the Public Strategy",
      description: "Betting against heavy public action. When 70%+ of bets are on one side, fade them.",
      riskLevel: "high",
      keyInsight: "Sharp money often opposes public sentiment - follow the smart money",
      bestFor: ["Prime time games", "Overhyped favorites", "Line value hunters"],
    },
    chalk: {
      name: "Chalk Parlay Strategy",
      description: "Stack multiple heavy favorites for lower odds but higher probability of cashing",
      riskLevel: "low",
      keyInsight: "5-6 leg chalk parlays can return 3-4x with 15-25% hit rate",
      bestFor: ["Risk-averse bettors", "Steady grinders", "High-confidence plays"],
    },
    longshot: {
      name: "Longshot Jackpot Strategy",
      description: "High-risk, high-reward parlays targeting 10x+ returns with underdog picks",
      riskLevel: "extreme",
      keyInsight: "Small stakes, massive upside - only risk what you can lose",
      bestFor: ["Entertainment value", "Moon shots", "Tournament pools"],
    },
    crosssport: {
      name: "Cross-Sport Diversified Strategy",
      description: "Spread risk across NFL, NBA, MLB, NHL for uncorrelated outcomes and reduced variance",
      riskLevel: "medium",
      keyInsight: "Different sports = different variables = true diversification",
      bestFor: ["Multi-sport bettors", "Weekend warriors", "Max coverage plays"],
    },
  };
  
  const config = strategyConfigs[strategyType] || strategyConfigs.balanced;
  
  strategies.push({
    id: `strategy-${strategyType}-1`,
    ...config,
    expectedROI: strategyType === "longshot" ? 180 : strategyType === "chalk" ? 25 : 45,
    winProbability: Math.round(winProb * 10) / 10,
    legs,
    totalOdds: Math.round(totalOdds * 100) / 100,
    potentialPayout: Math.round(potentialPayout * 100) / 100,
  });
  
  return strategies;
}

function getRiskColor(risk: string) {
  switch (risk) {
    case "low": return "text-green-400 bg-green-500/10 border-green-500/30";
    case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "high": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    case "extreme": return "text-red-400 bg-red-500/10 border-red-500/30";
    default: return "text-muted-foreground bg-muted/50";
  }
}

export function ParlayStrategyBuilder() {
  const [strategyType, setStrategyType] = useState("balanced");
  const [legCount, setLegCount] = useState([4]);
  const [stake, setStake] = useState([25]);
  const [sports, setSports] = useState("all");
  const [strategies, setStrategies] = useState<ParlayStrategy[]>([]);
  const [loading, setLoading] = useState(false);

  const generateNewStrategies = () => {
    setLoading(true);
    setTimeout(() => {
      const newStrategies = generateStrategies(strategyType, legCount[0], stake[0], sports);
      setStrategies(newStrategies);
      setLoading(false);
    }, 800);
  };

  const selectedStrategy = STRATEGY_TYPES.find(s => s.value === strategyType);
  const StrategyIcon = selectedStrategy?.icon || BarChart3;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Strategy Builder
              <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
                <Atom className="w-3 h-3" />
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Build data-driven parlays with proven strategies</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Strategy Type</label>
            <Select value={strategyType} onValueChange={setStrategyType}>
              <SelectTrigger data-testid="select-strategy-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <s.icon className="w-3 h-3" />
                      <span>{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Sports Filter</label>
            <Select value={sports} onValueChange={setSports}>
              <SelectTrigger data-testid="select-strategy-sports">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Parlay Legs</label>
              <span className="text-sm font-bold">{legCount[0]}</span>
            </div>
            <Slider
              value={legCount}
              onValueChange={setLegCount}
              min={2}
              max={10}
              step={1}
              data-testid="slider-leg-count"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Stake ($)</label>
              <span className="text-sm font-bold">${stake[0]}</span>
            </div>
            <Slider
              value={stake}
              onValueChange={setStake}
              min={5}
              max={500}
              step={5}
              data-testid="slider-stake"
            />
          </div>
        </div>

        <Button 
          onClick={generateNewStrategies}
          className="w-full gap-2"
          disabled={loading}
          data-testid="button-generate-strategy"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <StrategyIcon className="w-4 h-4" />
          )}
          Generate {selectedStrategy?.label} Parlay
        </Button>

        {strategies.map((strategy) => (
          <div 
            key={strategy.id}
            className="p-4 rounded-lg border bg-gradient-to-br from-background to-muted/30"
            data-testid={`strategy-card-${strategy.id}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold">{strategy.name}</h3>
                  <Badge className={`text-xs ${getRiskColor(strategy.riskLevel)}`}>
                    {strategy.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-background/60 rounded-lg">
                <p className="text-xs text-muted-foreground">Legs</p>
                <p className="text-lg font-bold">{strategy.legs.length}</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Odds</p>
                <p className="text-lg font-bold text-blue-400">+{Math.round((strategy.totalOdds - 1) * 100)}</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded-lg">
                <p className="text-xs text-muted-foreground">Win Prob</p>
                <p className="text-lg font-bold text-yellow-400">{strategy.winProbability}%</p>
              </div>
              <div className="text-center p-2 bg-background/60 rounded-lg">
                <p className="text-xs text-muted-foreground">Payout</p>
                <p className="text-lg font-bold text-green-400">${strategy.potentialPayout.toFixed(0)}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-400">Key Insight</p>
                  <p className="text-xs text-muted-foreground">{strategy.keyInsight}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recommended Legs:</p>
              {strategy.legs.map((leg, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">{leg.sport}</Badge>
                    <div>
                      <p className="text-sm font-medium">{leg.pick}</p>
                      <p className="text-xs text-muted-foreground">{leg.game}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{leg.odds > 0 ? `+${leg.odds}` : leg.odds}</p>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{leg.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Best For:</p>
              <div className="flex flex-wrap gap-1.5">
                {strategy.bestFor.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}

        {strategies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Puzzle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select your preferences and generate a strategy</p>
            <p className="text-xs mt-1">Mix sports for diversification or focus on one for correlation</p>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/30 rounded">
              <Shield className="w-4 h-4 mx-auto mb-1 text-green-400" />
              <p className="text-xs text-muted-foreground">Chalk</p>
              <p className="text-xs font-medium">Safest</p>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <Puzzle className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <p className="text-xs text-muted-foreground">Cross-Sport</p>
              <p className="text-xs font-medium">Diversified</p>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-xs text-muted-foreground">Longshot</p>
              <p className="text-xs font-medium">Max Payout</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
