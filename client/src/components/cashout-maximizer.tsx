import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DollarSign, CheckCircle2, XCircle, AlertTriangle, Zap, Target, Shield, TrendingUp, Clock, RefreshCw } from "lucide-react";

interface CashoutFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  score: number;
  status: "good" | "warning" | "bad";
  recommendation?: string;
}

interface PlatformCashout {
  platform: string;
  probability: number;
  features: string[];
  limitations: string[];
  tips: string[];
}

interface LegSuggestion {
  current: string;
  suggested: string;
  reason: string;
  cashoutImpact: number;
}

interface CashoutAnalysis {
  overallScore: number;
  grade: string;
  factors: CashoutFactor[];
  platformScores: PlatformCashout[];
  suggestions: LegSuggestion[];
  optimalLegCount: { min: number; max: number };
  bestMarkets: string[];
  avoidMarkets: string[];
}

export function CashoutMaximizer() {
  const [analysis, setAnalysis] = useState<CashoutAnalysis | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [preferences, setPreferences] = useState({
    prioritizeLiquidity: true,
    focusMajorLeagues: true,
    avoidProps: false,
    limitLegs: true,
    maxLegs: 6
  });

  const mockLegs = [
    { id: 1, team: "Lakers", market: "Moneyline", odds: -150 },
    { id: 2, team: "Chiefs", market: "Spread -3.5", odds: -110 },
    { id: 3, team: "Celtics", market: "Total O 220.5", odds: -110 },
    { id: 4, team: "Warriors", market: "Moneyline", odds: +140 },
    { id: 5, team: "Eagles", market: "1H Spread", odds: -115 }
  ];

  const runAnalysis = () => {
    setIsOptimizing(true);
    
    setTimeout(() => {
      const mockAnalysis: CashoutAnalysis = {
        overallScore: 82,
        grade: "A-",
        factors: [
          {
            id: "1",
            name: "Market Liquidity",
            description: "Using high-volume markets that books actively manage",
            weight: 25,
            score: 92,
            status: "good",
            recommendation: "All legs use liquid markets"
          },
          {
            id: "2",
            name: "League Popularity",
            description: "Major leagues have better cashout availability",
            weight: 20,
            score: 88,
            status: "good",
            recommendation: "NBA and NFL are tier-1 leagues"
          },
          {
            id: "3",
            name: "Leg Count",
            description: "Optimal leg count for cashout eligibility",
            weight: 20,
            score: 78,
            status: "warning",
            recommendation: "Consider reducing to 4-5 legs for better cashout rates"
          },
          {
            id: "4",
            name: "Market Diversity",
            description: "Mix of market types improves cashout odds",
            weight: 15,
            score: 85,
            status: "good",
            recommendation: "Good mix of ML, spreads, and totals"
          },
          {
            id: "5",
            name: "Timing Alignment",
            description: "Games starting at similar times",
            weight: 10,
            score: 65,
            status: "warning",
            recommendation: "Stagger game times for extended cashout windows"
          },
          {
            id: "6",
            name: "Prop Exposure",
            description: "Player props can limit cashout availability",
            weight: 10,
            score: 95,
            status: "good",
            recommendation: "No player props - maximizes cashout eligibility"
          }
        ],
        platformScores: [
          {
            platform: "DraftKings",
            probability: 94,
            features: ["Live cashout", "Partial cashout", "Auto-cashout"],
            limitations: ["Some SGPs excluded"],
            tips: ["Enable auto-cashout alerts", "Cash out early for best value"]
          },
          {
            platform: "FanDuel",
            probability: 91,
            features: ["Cash out anytime", "Same game parlays eligible"],
            limitations: ["Max cashout limits apply"],
            tips: ["Check cashout value frequently during live games"]
          },
          {
            platform: "BetMGM",
            probability: 87,
            features: ["Edit my bet", "Partial cashout"],
            limitations: ["Some futures excluded", "Min cashout $1"],
            tips: ["Use Edit Bet to add legs without losing cashout"]
          },
          {
            platform: "Caesars",
            probability: 82,
            features: ["Full cashout", "Live betting compatible"],
            limitations: ["Limited on boosted odds"],
            tips: ["Avoid using promos if cashout is priority"]
          },
          {
            platform: "PointsBet",
            probability: 76,
            features: ["Standard cashout"],
            limitations: ["No partial cashout", "Some markets excluded"],
            tips: ["Stick to main markets for best cashout rates"]
          },
          {
            platform: "BetRivers",
            probability: 73,
            features: ["Cash out available"],
            limitations: ["Limited market coverage"],
            tips: ["Focus on spreads and moneylines"]
          }
        ],
        suggestions: [
          {
            current: "Eagles 1H Spread -3.5",
            suggested: "Eagles Full Game Spread -3.5",
            reason: "Full game lines have higher cashout availability",
            cashoutImpact: +12
          },
          {
            current: "5-leg parlay",
            suggested: "4-leg parlay",
            reason: "Removing weakest correlation leg improves cashout probability",
            cashoutImpact: +8
          }
        ],
        optimalLegCount: { min: 3, max: 5 },
        bestMarkets: [
          "Moneylines (NFL/NBA)",
          "Point Spreads",
          "Game Totals (O/U)",
          "1st Half Spreads",
          "Alt Spreads (within 3 pts)"
        ],
        avoidMarkets: [
          "Obscure player props",
          "Exotic parlays (round robins)",
          "College non-major sports",
          "Live betting alternates",
          "Boosted/promoted bets"
        ]
      };

      setAnalysis(mockAnalysis);
      setIsOptimizing(false);
    }, 1500);
  };

  useEffect(() => {
    runAnalysis();
  }, [preferences]);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500";
    if (grade.startsWith("B")) return "text-blue-500";
    if (grade.startsWith("C")) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "good") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 90) return "bg-green-500";
    if (prob >= 80) return "bg-blue-500";
    if (prob >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Cashout Maximizer</CardTitle>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                AI-Powered
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={runAnalysis}
              disabled={isOptimizing}
              data-testid="button-run-cashout-analysis"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Parlay
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.prioritizeLiquidity}
                onCheckedChange={(v) => setPreferences(p => ({ ...p, prioritizeLiquidity: v }))}
                data-testid="switch-liquidity"
              />
              <Label className="text-sm">High Liquidity</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.focusMajorLeagues}
                onCheckedChange={(v) => setPreferences(p => ({ ...p, focusMajorLeagues: v }))}
                data-testid="switch-major-leagues"
              />
              <Label className="text-sm">Major Leagues</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.avoidProps}
                onCheckedChange={(v) => setPreferences(p => ({ ...p, avoidProps: v }))}
                data-testid="switch-avoid-props"
              />
              <Label className="text-sm">Avoid Props</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.limitLegs}
                onCheckedChange={(v) => setPreferences(p => ({ ...p, limitLegs: v }))}
                data-testid="switch-limit-legs"
              />
              <Label className="text-sm">Limit Legs</Label>
            </div>
          </div>

          {preferences.limitLegs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Max Legs: {preferences.maxLegs}</Label>
              </div>
              <Slider
                value={[preferences.maxLegs]}
                onValueChange={(v) => setPreferences(p => ({ ...p, maxLegs: v[0] }))}
                min={2}
                max={10}
                step={1}
                data-testid="slider-max-legs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Cashout Eligibility Score</p>
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center">
                      <div className="text-center">
                        <p className={`text-4xl font-bold ${getGradeColor(analysis.grade)}`} data-testid="text-cashout-grade">
                          {analysis.grade}
                        </p>
                        <p className="text-2xl font-semibold" data-testid="text-cashout-score">{analysis.overallScore}%</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    High probability of cashout across major platforms
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Factor Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.factors.map((factor) => (
                  <div key={factor.id} className="space-y-1" data-testid={`factor-${factor.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(factor.status)}
                        <span className="text-sm font-medium">{factor.name}</span>
                        <Badge variant="outline" className="text-xs">{factor.weight}%</Badge>
                      </div>
                      <span className="text-sm font-mono">{factor.score}/100</span>
                    </div>
                    <Progress value={factor.score} className="h-2" />
                    {factor.recommendation && (
                      <p className="text-xs text-muted-foreground pl-6">{factor.recommendation}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Platform Cashout Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.platformScores.map((platform) => (
                  <div
                    key={platform.platform}
                    className="p-4 bg-muted/50 rounded-lg space-y-3"
                    data-testid={`platform-${platform.platform.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{platform.platform}</span>
                      <Badge className={getProbabilityColor(platform.probability)} data-testid={`text-probability-${platform.platform.toLowerCase()}`}>
                        {platform.probability}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {platform.features.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-green-500/10">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Limitations:</p>
                        <div className="flex flex-wrap gap-1">
                          {platform.limitations.map((l, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-yellow-500/10">
                              {l}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Tip: {platform.tips[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Optimization Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.suggestions.map((sug, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2" data-testid={`suggestion-${i}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">
                          <span className="text-muted-foreground line-through">{sug.current}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-green-500">{sug.suggested}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{sug.reason}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-500">
                        +{sug.cashoutImpact}%
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" data-testid={`button-apply-suggestion-${i}`}>
                      Apply Suggestion
                    </Button>
                  </div>
                ))}

                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-500">Optimal Configuration</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Legs: {analysis.optimalLegCount.min}-{analysis.optimalLegCount.max} | 
                    Focus on major league spreads & moneylines
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Market Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Best Markets for Cashout
                  </p>
                  <div className="space-y-1">
                    {analysis.bestMarkets.map((market, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" data-testid={`best-market-${i}`}>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {market}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Markets to Avoid
                  </p>
                  <div className="space-y-1">
                    {analysis.avoidMarkets.map((market, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`avoid-market-${i}`}>
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        {market}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-sm text-blue-500 font-medium mb-1">Pro Tip</p>
                  <p className="text-xs text-muted-foreground">
                    Place your parlay early and monitor during games. Cashout values peak when 
                    your legs are winning but still have risk remaining.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
