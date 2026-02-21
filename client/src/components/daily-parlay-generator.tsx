import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Zap, TrendingUp, Clock, Star, Flame, Target, 
  DollarSign, BarChart3, Shield, RefreshCw, ChevronRight,
  Sparkles, Crown, Timer, Atom, Brain, Check
} from "lucide-react";
import { QuantumAnalysisIndicator, QuantumBadge } from "./quantum-analysis-badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import type { Sport, GeneratedParlay, SportEvent } from "@shared/schema";
import { sports, getGameTimeBucket, formatGameTime, getTimeUrgencyScore } from "@shared/schema";

interface DailyParlayGeneratorProps {
  bankroll: number;
}

interface SportParlays {
  sport: Sport;
  parlays: GeneratedParlay[];
  gamesCount: number;
  bestParlay: GeneratedParlay | null;
  loading: boolean;
  error: string | null;
}

function calculateParlayScore(parlay: GeneratedParlay): number {
  const evWeight = 0.35;
  const probWeight = 0.25;
  const oddsWeight = 0.25;
  const riskWeight = 0.15;
  
  const evScore = Math.min(100, Math.max(0, (parlay.expectedValue + 0.5) * 100));
  const probScore = parlay.winProbability * 100;
  const oddsScore = Math.min(100, (parlay.combinedOdds / 100) * 10);
  const riskScore = parlay.riskRating === "low" ? 80 : parlay.riskRating === "medium" ? 50 : 30;
  
  return evScore * evWeight + probScore * probWeight + oddsScore * oddsWeight + riskScore * riskWeight;
}

function formatOdds(decimal: number): string {
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimal - 1))}`;
}

export function DailyParlayGenerator({ bankroll }: DailyParlayGeneratorProps) {
  const [generatingAll, setGeneratingAll] = useState(false);
  const [sportParlays, setSportParlays] = useState<Map<Sport, SportParlays>>(new Map());
  const [selectedSport, setSelectedSport] = useState<Sport>("NBA");
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const handleAddLegToSlip = (leg: any, sport: Sport) => {
    const slipLeg: ParlaySlipLeg = {
      id: leg.id,
      team: leg.team || "",
      opponent: leg.opponent || "",
      market: leg.market || "moneyline",
      outcome: leg.outcome || leg.description || "",
      decimalOdds: leg.decimalOdds || 1.5,
      americanOdds: leg.americanOdds,
      playerName: leg.playerName,
      propCategory: leg.propCategory,
      addedFrom: "Daily Parlays",
      addedAt: new Date().toISOString(),
      sport,
    };
    const added = addLeg(slipLeg);
    if (added) {
      toast({ title: "Added to Slip", description: `${slipLeg.outcome} added to your parlay slip` });
    }
  };

  const handleAddParlayToSlip = (parlay: GeneratedParlay, sport: Sport) => {
    let addedCount = 0;
    parlay.legs.forEach(leg => {
      if (!isInSlip(leg.id)) {
        const slipLeg: ParlaySlipLeg = {
          id: leg.id,
          team: leg.team || "",
          opponent: leg.opponent || "",
          market: leg.market || "moneyline",
          outcome: leg.outcome || "",
          decimalOdds: leg.decimalOdds || 1.5,
          americanOdds: leg.americanOdds,
          addedFrom: "Daily Parlays",
          addedAt: new Date().toISOString(),
          sport,
        };
        if (addLeg(slipLeg)) addedCount++;
      }
    });
    if (addedCount > 0) {
      toast({ title: "Added to Slip", description: `${addedCount} leg${addedCount > 1 ? "s" : ""} added to your parlay slip` });
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (sport: Sport) => {
      const response = await apiRequest("POST", "/api/generate-parlays", {
        sport,
        stake: Math.round(bankroll * 0.02),
        minLegs: 10,
        maxLegs: 12,
        bankroll,
        riskLevel: "moderate",
        topN: 5,
      });
      return { sport, data: await response.json() };
    },
  });

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const newParlays = new Map<Sport, SportParlays>();
    
    for (const sport of sports) {
      newParlays.set(sport, {
        sport,
        parlays: [],
        gamesCount: 0,
        bestParlay: null,
        loading: true,
        error: null,
      });
    }
    setSportParlays(new Map(newParlays));

    for (const sport of sports) {
      try {
        const response = await apiRequest("POST", "/api/generate-parlays", {
          sport,
          stake: Math.round(bankroll * 0.02),
          minLegs: 8,
          maxLegs: 12,
          bankroll,
          riskLevel: "moderate",
          topN: 5,
        });
        const data = await response.json();
        
        const parlays = data.parlays || [];
        const bestParlay = parlays.length > 0 
          ? parlays.reduce((best: GeneratedParlay, p: GeneratedParlay) => 
              calculateParlayScore(p) > calculateParlayScore(best) ? p : best
            )
          : null;

        newParlays.set(sport, {
          sport,
          parlays,
          gamesCount: data.meta?.eventsAnalyzed || 0,
          bestParlay,
          loading: false,
          error: null,
        });
        setSportParlays(new Map(newParlays));
      } catch (error) {
        newParlays.set(sport, {
          sport,
          parlays: [],
          gamesCount: 0,
          bestParlay: null,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to generate",
        });
        setSportParlays(new Map(newParlays));
      }
    }
    
    setGeneratingAll(false);
  };

  const allBestParlays = useMemo(() => {
    const best: { sport: Sport; parlay: GeneratedParlay; score: number }[] = [];
    
    sportParlays.forEach((data, sport) => {
      if (data.bestParlay) {
        best.push({
          sport,
          parlay: data.bestParlay,
          score: calculateParlayScore(data.bestParlay),
        });
      }
    });
    
    return best.sort((a, b) => b.score - a.score);
  }, [sportParlays]);

  const totalGamesAnalyzed = Array.from(sportParlays.values()).reduce((sum, s) => sum + s.gamesCount, 0);
  const totalParlaysGenerated = Array.from(sportParlays.values()).reduce((sum, s) => sum + s.parlays.length, 0);

  const [strategy, setStrategy] = useState<any>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  const handleGenerateStrategy = async () => {
    setIsGeneratingStrategy(true);
    try {
      const response = await apiRequest("POST", "/api/daily-strategy", {
        sport: selectedSport,
        date: new Date().toISOString().split('T')[0],
        games: getLegsForStrategy(),
        bankroll,
        riskLevel: "moderate",
        maxLegs: 4,
        preferredBetTypes: ["moneyline", "spread", "total"],
        maxTickets: 3,
        diversify: true
      });
      const data = await response.json();
      setStrategy(data);
    } catch (error) {
      console.error("Strategy generation failed", error);
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const getLegsForStrategy = () => {
    const parlays = sportParlays.get(selectedSport)?.parlays || [];
    return parlays.flatMap(p => p.legs);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  AI Daily Parlays
                  <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
                    <Atom className="w-3 h-3" />
                    Q-Engine
                  </Badge>
                </CardTitle>
                <CardDescription>
                  AI-optimized strategies for maximum winning potential
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleGenerateStrategy}
                disabled={isGeneratingStrategy || !sportParlays.get(selectedSport)?.parlays.length}
                className="gap-2"
              >
                <Brain className="h-4 w-4" />
                AI Strategy
              </Button>
              <Button 
                size="lg"
                onClick={handleGenerateAll}
                disabled={generatingAll}
                className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                data-testid="button-generate-all-parlays"
              >
                {generatingAll ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Analyzing All Sports...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Today's Best Parlays
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {strategy && (
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Brain className="w-5 h-5" />
                AI Daily Game Plan
              </div>
              <p className="text-sm leading-relaxed">{strategy.summary || strategy.overall_strategy_summary}</p>
              
              {strategy.recommended_parlays && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {strategy.recommended_parlays.map((p: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-border space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">Parlay {String.fromCharCode(65 + i)}</span>
                        <Badge variant="secondary">{p.combined_odds}</Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        {p.legs?.map((leg: any, j: number) => (
                          <div key={j} className="flex items-start gap-1">
                            <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                            <span>{leg.description || leg}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 flex justify-between items-center border-t">
                        <span className="text-[10px] text-muted-foreground">Confidence: {p.confidence_score}/5</span>
                        <span className="text-xs font-bold text-primary">Stake: {p.suggested_stake}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <QuantumAnalysisIndicator />
          
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-yellow-500">{sports.length}</p>
              <p className="text-sm text-muted-foreground">Sports Analyzed</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-green-500">{totalGamesAnalyzed}</p>
              <p className="text-sm text-muted-foreground">Games Today</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-blue-500">{totalParlaysGenerated}</p>
              <p className="text-sm text-muted-foreground">Parlays Generated</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {allBestParlays.length > 0 && (
        <Card className="border-2 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Today's Top Parlays Across All Sports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allBestParlays.slice(0, 3).map((item, index) => (
                <div 
                  key={`${item.sport}-${index}`}
                  className={`p-4 rounded-lg border ${
                    index === 0 ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30" :
                    index === 1 ? "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30" :
                    "bg-gradient-to-r from-orange-700/10 to-orange-800/10 border-orange-700/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0 ? "bg-yellow-500 text-white" :
                        index === 1 ? "bg-gray-400 text-white" :
                        "bg-orange-700 text-white"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.sport}</Badge>
                          <span className="font-semibold">{item.parlay.legs.length} Legs</span>
                          <Badge className={
                            item.parlay.riskRating === "low" ? "bg-green-500" :
                            item.parlay.riskRating === "medium" ? "bg-yellow-500" :
                            "bg-red-500"
                          }>
                            {item.parlay.riskRating} risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.parlay.legs.slice(0, 3).map(l => l.outcome).join(" • ")}
                          {item.parlay.legs.length > 3 && ` +${item.parlay.legs.length - 3} more`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-green-500">
                        {formatOdds(item.parlay.combinedOdds)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Win ${item.parlay.potentialReturn.toFixed(0)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">
                          {(item.parlay.expectedValue * 100).toFixed(1)}% EV
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedSport} onValueChange={(v) => setSelectedSport(v as Sport)}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6">
            {sports.map(sport => {
              const data = sportParlays.get(sport);
              return (
                <TabsTrigger key={sport} value={sport} className="gap-1 px-2 sm:px-3">
                  {sport}
                  {data?.bestParlay && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {data.parlays.length}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {sports.map(sport => {
          const data = sportParlays.get(sport);
          
          return (
            <TabsContent key={sport} value={sport} className="space-y-4">
              {data?.loading && (
                <Card>
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-muted-foreground">Analyzing {sport} games and generating optimal parlays...</p>
                      <Progress value={33} className="w-64" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {data?.error && (
                <Card className="border-red-500/30">
                  <CardContent className="py-6">
                    <p className="text-red-500 text-center">{data.error}</p>
                    <p className="text-muted-foreground text-center text-sm mt-2">
                      Not enough games available for 12-leg parlays. Try again later.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!data?.loading && !data?.error && data?.parlays && data.parlays.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {data.gamesCount} games • Generated {data.parlays.length} optimal parlays
                    </p>
                  </div>

                  {data.parlays.map((parlay, index) => (
                    <Card key={parlay.id} className={index === 0 ? "border-2 border-yellow-500/30" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Star className="h-5 w-5 text-yellow-500" />}
                            <CardTitle className="text-lg">
                              {index === 0 ? "Best Parlay" : `Parlay #${index + 1}`}
                            </CardTitle>
                            <Badge variant="outline">{parlay.legs.length} legs</Badge>
                            <Badge className={
                              parlay.riskRating === "low" ? "bg-green-500" :
                              parlay.riskRating === "medium" ? "bg-yellow-500" :
                              "bg-red-500"
                            }>
                              {parlay.riskRating}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs shrink-0"
                              onClick={() => handleAddParlayToSlip(parlay, sport)}
                              data-testid={`button-add-parlay-slip-${index}`}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Add to Slip
                            </Button>
                            <div className="text-right">
                              <p className="text-2xl font-bold font-mono">
                                {formatOdds(parlay.combinedOdds)}
                              </p>
                              <p className="text-xs text-muted-foreground">combined odds</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {parlay.legs.map((leg, legIndex) => (
                            <div 
                              key={leg.id} 
                              className="p-2 rounded-md bg-muted/50 text-sm flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{leg.outcome}</p>
                                <p className="text-xs text-muted-foreground truncate">{leg.team}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="outline">
                                  {formatOdds(leg.decimalOdds)}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant={isInSlip(leg.id) ? "secondary" : "ghost"}
                                  className="h-6 w-6"
                                  onClick={() => handleAddLegToSlip(leg, sport)}
                                  disabled={isInSlip(leg.id)}
                                  data-testid={`button-add-daily-leg-${leg.id}`}
                                >
                                  {isInSlip(leg.id) ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-500">
                              {(parlay.winProbability * 100).toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Win Prob</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">
                              {(parlay.expectedValue * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Expected Value</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">${parlay.kellyStake.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Kelly Stake</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-500">
                              ${parlay.potentialReturn.toFixed(0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Potential Win</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!data && !generatingAll && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center space-y-4">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Click "Generate Today's Best Parlays" to analyze all {sport} games
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
