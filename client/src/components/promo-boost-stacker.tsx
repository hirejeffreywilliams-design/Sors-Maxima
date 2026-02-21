import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Gift, Percent, DollarSign, Star, Clock, CheckCircle, TrendingUp, Sparkles, Plus, AlertTriangle } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface PromoBoost {
  id: string;
  sportsbook: string;
  name: string;
  type: "odds_boost" | "profit_boost" | "parlay_boost" | "insurance" | "free_bet";
  boostPercentage: number;
  maxStake: number;
  minLegs?: number;
  minOdds?: number;
  eligibleSports: string[];
  expiresAt: string;
  terms: string;
  matchingLegs: number;
  evBoost: number;
}

interface StackResult {
  promos: PromoBoost[];
  totalBoost: number;
  totalEvBoost: number;
  effectiveOdds: number;
  recommendation: string;
}

interface PromoBoostStackerProps {
  legs: ParlayLeg[];
  currentOdds: number;
}

function generateAvailablePromos(legs: ParlayLeg[]): PromoBoost[] {
  const sportsbooks = ["FanDuel", "DraftKings", "BetMGM", "Caesars", "PointsBet", "Fanatics"];
  const promos: PromoBoost[] = [];
  
  sportsbooks.forEach((book, idx) => {
    if (Math.random() > 0.3) {
      promos.push({
        id: `boost-${book}-1`,
        sportsbook: book,
        name: `${Math.floor(Math.random() * 30 + 20)}% Profit Boost`,
        type: "profit_boost",
        boostPercentage: Math.floor(Math.random() * 30 + 20),
        maxStake: 50 + Math.floor(Math.random() * 50),
        eligibleSports: ["NBA", "NFL", "MLB"],
        expiresAt: new Date(Date.now() + Math.random() * 86400000 * 3).toISOString(),
        terms: "Max $50 stake. Profit boost on winnings only.",
        matchingLegs: legs.filter(l => ["NBA", "NFL", "MLB"].includes(l.eventId?.substring(0, 3) || "NBA")).length,
        evBoost: 0.03 + Math.random() * 0.05,
      });
    }
    
    if (Math.random() > 0.5) {
      promos.push({
        id: `boost-${book}-2`,
        sportsbook: book,
        name: "Parlay Power Boost",
        type: "parlay_boost",
        boostPercentage: 10 + Math.floor(Math.random() * 15),
        maxStake: 25,
        minLegs: 3,
        minOdds: 4.0,
        eligibleSports: ["NBA", "NFL", "MLB", "NHL"],
        expiresAt: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString(),
        terms: `Minimum ${3} legs at +${Math.floor(300 + Math.random() * 200)} odds`,
        matchingLegs: legs.length >= 3 ? legs.length : 0,
        evBoost: 0.04 + Math.random() * 0.04,
      });
    }
    
    if (Math.random() > 0.6) {
      promos.push({
        id: `insurance-${book}`,
        sportsbook: book,
        name: "Parlay Insurance",
        type: "insurance",
        boostPercentage: 100,
        maxStake: 25,
        minLegs: 4,
        eligibleSports: ["NBA", "NFL"],
        expiresAt: new Date(Date.now() + Math.random() * 86400000 * 2).toISOString(),
        terms: "Get stake back as free bet if one leg loses (4+ leg parlay)",
        matchingLegs: legs.length >= 4 ? legs.length : 0,
        evBoost: 0.08 + Math.random() * 0.05,
      });
    }
  });
  
  return promos.sort((a, b) => b.evBoost - a.evBoost);
}

function calculateOptimalStack(promos: PromoBoost[], legs: ParlayLeg[], currentOdds: number): StackResult {
  const eligiblePromos = promos.filter(p => {
    if (p.minLegs && legs.length < p.minLegs) return false;
    if (p.minOdds && currentOdds < p.minOdds) return false;
    if (p.matchingLegs === 0) return false;
    return true;
  });
  
  const bestPromos = eligiblePromos.slice(0, 3);
  const totalBoost = bestPromos.reduce((sum, p) => sum + p.boostPercentage, 0);
  const totalEvBoost = bestPromos.reduce((sum, p) => sum + p.evBoost, 0);
  const effectiveOdds = currentOdds * (1 + totalBoost / 100);
  
  let recommendation = "No optimal promos available";
  if (bestPromos.length > 0) {
    if (totalEvBoost > 0.1) {
      recommendation = `Stack ${bestPromos.length} promos for +${(totalEvBoost * 100).toFixed(1)}% EV boost!`;
    } else if (totalEvBoost > 0.05) {
      recommendation = `Good promo opportunity: +${(totalEvBoost * 100).toFixed(1)}% EV`;
    } else {
      recommendation = `Minor boost available: +${(totalEvBoost * 100).toFixed(1)}% EV`;
    }
  }
  
  return {
    promos: bestPromos,
    totalBoost,
    totalEvBoost,
    effectiveOdds,
    recommendation,
  };
}

export function PromoBoostStacker({ legs, currentOdds }: PromoBoostStackerProps) {
  const [selectedPromos, setSelectedPromos] = useState<Set<string>>(new Set());

  const availablePromos = useMemo(() => 
    generateAvailablePromos(legs),
    [legs]
  );

  const optimalStack = useMemo(() => 
    calculateOptimalStack(availablePromos, legs, currentOdds),
    [availablePromos, legs, currentOdds]
  );

  const togglePromo = (promoId: string) => {
    setSelectedPromos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promoId)) {
        newSet.delete(promoId);
      } else {
        newSet.add(promoId);
      }
      return newSet;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "profit_boost": return "bg-green-500 text-white";
      case "parlay_boost": return "bg-purple-500 text-white";
      case "odds_boost": return "bg-blue-500 text-white";
      case "insurance": return "bg-amber-500 text-black";
      case "free_bet": return "bg-pink-500 text-white";
      default: return "bg-muted";
    }
  };

  const getBookColor = (book: string) => {
    const colors: Record<string, string> = {
      "FanDuel": "border-blue-500",
      "DraftKings": "border-green-500",
      "BetMGM": "border-amber-500",
      "Caesars": "border-red-500",
      "PointsBet": "border-purple-500",
      "Fanatics": "border-pink-500",
    };
    return colors[book] || "border-muted";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Promo & Boost Stacker
          </CardTitle>
          <Badge variant="outline" className="text-green-500">
            {availablePromos.length} promos available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-promo">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        {optimalStack.promos.length > 0 && (
          <div className="p-4 rounded-lg border bg-gradient-to-r from-green-500/10 to-purple-500/10">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-green-500">Optimal Stack Found!</p>
                <p className="text-sm text-muted-foreground">{optimalStack.recommendation}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2 rounded bg-card text-center">
                <Percent className="h-3 w-3 mx-auto mb-1 text-purple-500" />
                <p className="text-lg font-bold text-purple-500">+{optimalStack.totalBoost}%</p>
                <p className="text-xs text-muted-foreground">Total Boost</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <TrendingUp className="h-3 w-3 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold text-green-500">+{(optimalStack.totalEvBoost * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">EV Boost</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <DollarSign className="h-3 w-3 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{optimalStack.effectiveOdds.toFixed(2)}x</p>
                <p className="text-xs text-muted-foreground">Effective Odds</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <Star className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold">{optimalStack.promos.length}</p>
                <p className="text-xs text-muted-foreground">Promos Stacked</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {optimalStack.promos.map(promo => (
                <Badge key={promo.id} variant="outline" className={getBookColor(promo.sportsbook)}>
                  {promo.sportsbook}: {promo.name}
                </Badge>
              ))}
            </div>
            
            <Button className="w-full mt-3" data-testid="button-apply-optimal-stack">
              <Plus className="h-4 w-4 mr-2" />
              Apply Optimal Stack
            </Button>
          </div>
        )}

        <Tabs defaultValue="boosts">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="boosts">Profit Boosts</TabsTrigger>
            <TabsTrigger value="parlay">Parlay Promos</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>

          <TabsContent value="boosts" className="space-y-2">
            {availablePromos.filter(p => p.type === "profit_boost" || p.type === "odds_boost").map(promo => (
              <div 
                key={promo.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPromos.has(promo.id) ? "ring-2 ring-primary bg-primary/5" : "bg-card hover-elevate"
                } ${getBookColor(promo.sportsbook)}`}
                onClick={() => togglePromo(promo.id)}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(promo.type)}>
                      +{promo.boostPercentage}%
                    </Badge>
                    <span className="font-medium text-sm">{promo.sportsbook}</span>
                  </div>
                  {selectedPromos.has(promo.id) && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                
                <p className="text-sm font-medium mb-1">{promo.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{promo.terms}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expires {new Date(promo.expiresAt).toLocaleDateString()}
                  </div>
                  <span className="text-green-500 font-medium">
                    +{(promo.evBoost * 100).toFixed(1)}% EV
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="parlay" className="space-y-2">
            {availablePromos.filter(p => p.type === "parlay_boost").map(promo => (
              <div 
                key={promo.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPromos.has(promo.id) ? "ring-2 ring-primary bg-primary/5" : "bg-card hover-elevate"
                } ${getBookColor(promo.sportsbook)}`}
                onClick={() => togglePromo(promo.id)}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(promo.type)}>
                      +{promo.boostPercentage}%
                    </Badge>
                    <span className="font-medium text-sm">{promo.sportsbook}</span>
                  </div>
                  {promo.matchingLegs > 0 ? (
                    <Badge variant="outline" className="text-green-500">
                      Eligible
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Need {promo.minLegs}+ legs
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium mb-1">{promo.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{promo.terms}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Max stake: ${promo.maxStake}</span>
                  <span className="text-green-500 font-medium">
                    +{(promo.evBoost * 100).toFixed(1)}% EV
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="insurance" className="space-y-2">
            {availablePromos.filter(p => p.type === "insurance").map(promo => (
              <div 
                key={promo.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPromos.has(promo.id) ? "ring-2 ring-primary bg-primary/5" : "bg-card hover-elevate"
                } ${getBookColor(promo.sportsbook)}`}
                onClick={() => togglePromo(promo.id)}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(promo.type)}>
                      Insurance
                    </Badge>
                    <span className="font-medium text-sm">{promo.sportsbook}</span>
                  </div>
                  {promo.matchingLegs > 0 ? (
                    <Badge variant="outline" className="text-green-500">
                      Eligible
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Need {promo.minLegs}+ legs
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium mb-1">{promo.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{promo.terms}</p>
                
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Value Protection</span>
                    <span className="text-green-500">+{(promo.evBoost * 100).toFixed(1)}% EV</span>
                  </div>
                  <Progress value={promo.evBoost * 100 * 5} className="h-1.5" />
                </div>
              </div>
            ))}
            
            {availablePromos.filter(p => p.type === "insurance").length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No insurance promos currently available</p>
                <p className="text-xs">Check back later for new offers</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedPromos.size > 0 && (
          <div className="p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Promos ({selectedPromos.size})</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedPromos(new Set())}>
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedPromos).map(id => {
                const promo = availablePromos.find(p => p.id === id);
                return promo ? (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {promo.sportsbook}: +{promo.boostPercentage}%
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
