import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Shield, Umbrella, DollarSign, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Target, Zap } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface InsuranceLeg {
  id: string;
  originalLegId: string;
  originalLeg: string;
  insuranceType: "opposite_spread" | "alt_line" | "player_under" | "opposite_ml" | "total_hedge";
  description: string;
  odds: number;
  correlation: number;
  suggestedStake: number;
  protection: number;
  cost: number;
}

interface InsurancePackage {
  legs: InsuranceLeg[];
  totalCost: number;
  totalProtection: number;
  varianceReduction: number;
  evLoss: number;
  netEvAfterInsurance: number;
  recommendation: "strongly_recommended" | "recommended" | "optional" | "not_needed";
}

interface SyntheticInsuranceBuilderProps {
  legs: ParlayLeg[];
  stake: number;
  potentialPayout: number;
  expectedValue: number;
}

function generateInsuranceOptions(legs: ParlayLeg[], stake: number, payout: number): InsuranceLeg[] {
  const insuranceLegs: InsuranceLeg[] = [];
  
  legs.forEach((leg, idx) => {
    if (leg.market === "spread") {
      insuranceLegs.push({
        id: `ins-spread-${idx}`,
        originalLegId: leg.id,
        originalLeg: `${leg.team} ${leg.outcome}`,
        insuranceType: "alt_line",
        description: `${leg.team} +${Math.abs(parseFloat(leg.outcome?.split(" ")[0] || "0") || 3) + 3}`,
        odds: 1.55,
        correlation: -0.65,
        suggestedStake: stake * 0.15,
        protection: 0.25,
        cost: stake * 0.15 * 0.1,
      });
    }
    
    if (leg.market === "moneyline") {
      insuranceLegs.push({
        id: `ins-ml-${idx}`,
        originalLegId: leg.id,
        originalLeg: `${leg.team} ML`,
        insuranceType: "opposite_spread",
        description: `${leg.team} opponent +6.5`,
        odds: 2.0,
        correlation: -0.45,
        suggestedStake: stake * 0.1,
        protection: 0.20,
        cost: stake * 0.1 * 0.05,
      });
    }
    
    if (leg.market === "player_prop") {
      insuranceLegs.push({
        id: `ins-prop-${idx}`,
        originalLegId: leg.id,
        originalLeg: `${leg.playerName} ${leg.propCategory} ${leg.outcome}`,
        insuranceType: "player_under",
        description: `${leg.playerName} ${leg.propCategory} opposite`,
        odds: 1.95,
        correlation: -0.80,
        suggestedStake: stake * 0.08,
        protection: 0.15,
        cost: stake * 0.08 * 0.08,
      });
    }
    
    if (leg.market === "total") {
      insuranceLegs.push({
        id: `ins-total-${idx}`,
        originalLegId: leg.id,
        originalLeg: `${leg.outcome}`,
        insuranceType: "total_hedge",
        description: leg.outcome?.includes("Over") 
          ? `Under ${parseFloat(leg.outcome?.split(" ")[1] || "210") - 3}`
          : `Over ${parseFloat(leg.outcome?.split(" ")[1] || "210") + 3}`,
        odds: 1.88,
        correlation: -0.55,
        suggestedStake: stake * 0.12,
        protection: 0.18,
        cost: stake * 0.12 * 0.06,
      });
    }
  });
  
  return insuranceLegs.sort((a, b) => b.protection - a.protection);
}

function buildInsurancePackage(
  insuranceLegs: InsuranceLeg[], 
  protectionLevel: number,
  stake: number,
  ev: number
): InsurancePackage {
  const selectedLegs = insuranceLegs.slice(0, Math.ceil(insuranceLegs.length * protectionLevel));
  
  const totalCost = selectedLegs.reduce((sum, l) => sum + l.suggestedStake, 0);
  const totalProtection = selectedLegs.reduce((sum, l) => sum + l.protection, 0);
  const avgCorrelation = selectedLegs.length > 0 
    ? selectedLegs.reduce((sum, l) => sum + Math.abs(l.correlation), 0) / selectedLegs.length
    : 0;
  
  const varianceReduction = Math.min(0.5, totalProtection * avgCorrelation);
  const evLoss = totalCost / stake * 0.05;
  const netEvAfterInsurance = ev - evLoss;
  
  let recommendation: InsurancePackage["recommendation"] = "optional";
  if (stake > 100 && varianceReduction > 0.25) {
    recommendation = "strongly_recommended";
  } else if (varianceReduction > 0.15) {
    recommendation = "recommended";
  } else if (varianceReduction < 0.1) {
    recommendation = "not_needed";
  }
  
  return {
    legs: selectedLegs,
    totalCost,
    totalProtection: Math.min(0.9, totalProtection),
    varianceReduction,
    evLoss,
    netEvAfterInsurance,
    recommendation,
  };
}

export function SyntheticInsuranceBuilder({ 
  legs, 
  stake, 
  potentialPayout,
  expectedValue 
}: SyntheticInsuranceBuilderProps) {
  const [protectionLevel, setProtectionLevel] = useState(0.5);
  const [selectedInsurance, setSelectedInsurance] = useState<Set<string>>(new Set());

  const insuranceOptions = useMemo(() => 
    generateInsuranceOptions(legs, stake, potentialPayout),
    [legs, stake, potentialPayout]
  );

  const insurancePackage = useMemo(() => 
    buildInsurancePackage(insuranceOptions, protectionLevel, stake, expectedValue),
    [insuranceOptions, protectionLevel, stake, expectedValue]
  );

  const toggleInsurance = (id: string) => {
    setSelectedInsurance(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "strongly_recommended": return "bg-green-500 text-white";
      case "recommended": return "bg-blue-500 text-white";
      case "optional": return "bg-yellow-500 text-black";
      default: return "bg-muted";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "opposite_spread": return <Shield className="h-4 w-4" />;
      case "alt_line": return <Target className="h-4 w-4" />;
      case "player_under": return <TrendingDown className="h-4 w-4" />;
      case "opposite_ml": return <Zap className="h-4 w-4" />;
      case "total_hedge": return <Umbrella className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (legs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5 text-primary" />
            Synthetic Insurance Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Umbrella className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Add legs to build insurance package</p>
            <p className="text-sm">Protect your downside while keeping upside</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5 text-primary" />
            Synthetic Insurance Builder
          </CardTitle>
          <Badge className={getRecommendationColor(insurancePackage.recommendation)}>
            {insurancePackage.recommendation.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-insurance">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        <div className="p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Protection Level</span>
            <Badge variant="outline">
              {(protectionLevel * 100).toFixed(0)}% Coverage
            </Badge>
          </div>
          <Slider
            value={[protectionLevel]}
            onValueChange={([v]) => setProtectionLevel(v)}
            min={0}
            max={1}
            step={0.1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>No protection (max upside)</span>
            <span>Full protection (min risk)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-lg font-bold">${insurancePackage.totalCost.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Insurance Cost</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-blue-500">
              {(insurancePackage.totalProtection * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Protection</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-500">
              -{(insurancePackage.varianceReduction * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Risk Reduction</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">
              {(insurancePackage.netEvAfterInsurance * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Net EV</p>
          </div>
        </div>

        {insurancePackage.varianceReduction > 0.2 && (
          <div className="p-3 rounded-lg border border-green-500/50 bg-green-500/10">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-500">Strong Protection Package</p>
                <p className="text-sm text-muted-foreground">
                  This insurance reduces your variance by {(insurancePackage.varianceReduction * 100).toFixed(0)}% 
                  while only costing {(insurancePackage.evLoss * 100).toFixed(1)}% EV.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Insurance Options ({insuranceOptions.length})</h4>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {insuranceOptions.map((ins) => (
              <div 
                key={ins.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedInsurance.has(ins.id) 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : insurancePackage.legs.some(l => l.id === ins.id)
                      ? "bg-blue-500/5 border-blue-500/30"
                      : "bg-card hover-elevate"
                }`}
                onClick={() => toggleInsurance(ins.id)}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(ins.insuranceType)}
                    <div>
                      <p className="text-sm font-medium">{ins.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Protects: {ins.originalLeg}
                      </p>
                    </div>
                  </div>
                  {selectedInsurance.has(ins.id) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : insurancePackage.legs.some(l => l.id === ins.id) ? (
                    <Badge variant="outline" className="text-blue-500 text-xs">Suggested</Badge>
                  ) : null}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Odds:</span>{" "}
                    <span className="font-medium">{ins.odds.toFixed(2)}x</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stake:</span>{" "}
                    <span className="font-medium">${ins.suggestedStake.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Protect:</span>{" "}
                    <span className="font-medium text-blue-500">{(ins.protection * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Corr:</span>{" "}
                    <span className="font-medium text-red-500">{(ins.correlation * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedInsurance.size > 0 && (
          <div className="p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Custom Package ({selectedInsurance.size} legs)
              </span>
              <Button size="sm" variant="outline" onClick={() => setSelectedInsurance(new Set())}>
                Clear
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Cost:</span>
              <span className="font-medium">
                ${insuranceOptions
                  .filter(o => selectedInsurance.has(o.id))
                  .reduce((sum, o) => sum + o.suggestedStake, 0)
                  .toFixed(0)}
              </span>
            </div>
            <Button className="w-full mt-2">
              <Shield className="h-4 w-4 mr-2" />
              Apply Custom Insurance
            </Button>
          </div>
        )}

        <Button className="w-full" variant="default" data-testid="button-apply-insurance">
          <Umbrella className="h-4 w-4 mr-2" />
          Apply Suggested Package (${insurancePackage.totalCost.toFixed(0)})
        </Button>
      </CardContent>
    </Card>
  );
}
