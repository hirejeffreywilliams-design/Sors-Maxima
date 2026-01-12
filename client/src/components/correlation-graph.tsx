import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Share2, AlertTriangle, CheckCircle, Link, Unlink, Lightbulb, TrendingUp } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface CorrelationLink {
  leg1Id: string;
  leg2Id: string;
  correlation: number;
  type: "positive" | "negative" | "neutral";
  reason: string;
  risk: "high" | "medium" | "low";
}

interface DiversificationSuggestion {
  currentLegId: string;
  suggestedTeam: string;
  suggestedMarket: string;
  reason: string;
  impactScore: number;
}

interface CorrelationGraphProps {
  legs: ParlayLeg[];
}

function calculateCorrelations(legs: ParlayLeg[]): CorrelationLink[] {
  const links: CorrelationLink[] = [];
  
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const leg1 = legs[i];
      const leg2 = legs[j];
      
      let correlation = 0;
      let reason = "";
      
      if (leg1.team === leg2.team) {
        if (leg1.market === "moneyline" && leg2.market === "spread") {
          correlation = 0.85;
          reason = "Same team - ML and spread highly correlated";
        } else if (leg1.market === "moneyline" && leg2.market === "total") {
          correlation = 0.35;
          reason = "Same team - winning teams often cover totals";
        } else if (leg1.market === "player_prop" && leg2.market === "player_prop") {
          correlation = 0.45;
          reason = "Same team props - game script affects both";
        } else if (leg1.market === "player_prop") {
          correlation = 0.40;
          reason = "Player performance tied to team outcome";
        } else {
          correlation = 0.6;
          reason = "Same team - outcomes often linked";
        }
      }
      
      else if (leg1.eventId === leg2.eventId) {
        if ((leg1.market === "total" || leg2.market === "total")) {
          correlation = 0.25;
          reason = "Same game - totals affect scoring expectations";
        } else {
          correlation = -0.3;
          reason = "Same game opposite sides - negative correlation";
        }
      }
      
      else if (leg1.market === leg2.market) {
        correlation = 0.15;
        reason = "Same market type - minor systematic correlation";
      }
      
      else {
        correlation = 0.05 + Math.random() * 0.1;
        reason = "Independent events - low correlation";
      }
      
      correlation += (Math.random() - 0.5) * 0.1;
      correlation = Math.max(-1, Math.min(1, correlation));
      
      if (Math.abs(correlation) > 0.1) {
        links.push({
          leg1Id: leg1.id,
          leg2Id: leg2.id,
          correlation,
          type: correlation > 0.2 ? "positive" : correlation < -0.2 ? "negative" : "neutral",
          reason,
          risk: Math.abs(correlation) > 0.6 ? "high" : Math.abs(correlation) > 0.3 ? "medium" : "low",
        });
      }
    }
  }
  
  return links.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

function generateSuggestions(legs: ParlayLeg[], links: CorrelationLink[]): DiversificationSuggestion[] {
  const suggestions: DiversificationSuggestion[] = [];
  const highCorrelationLegs = new Set<string>();
  
  links.filter(l => l.risk === "high").forEach(link => {
    highCorrelationLegs.add(link.leg1Id);
    highCorrelationLegs.add(link.leg2Id);
  });
  
  const teams = ["76ers", "Nets", "Heat", "Mavericks", "Nuggets", "Suns"];
  const markets = ["moneyline", "spread", "total", "player_prop"];
  
  highCorrelationLegs.forEach(legId => {
    const leg = legs.find(l => l.id === legId);
    if (leg) {
      const otherTeam = teams.find(t => t !== leg.team) || teams[0];
      const otherMarket = markets.find(m => m !== leg.market) || markets[0];
      
      suggestions.push({
        currentLegId: legId,
        suggestedTeam: otherTeam,
        suggestedMarket: otherMarket,
        reason: `Replace with ${otherTeam} ${otherMarket} to reduce correlation`,
        impactScore: 0.6 + Math.random() * 0.3,
      });
    }
  });
  
  return suggestions.slice(0, 3);
}

export function CorrelationGraph({ legs }: CorrelationGraphProps) {
  const [showNegative, setShowNegative] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const correlationLinks = useMemo(() => calculateCorrelations(legs), [legs]);
  const suggestions = useMemo(() => generateSuggestions(legs, correlationLinks), [legs, correlationLinks]);

  const highRiskLinks = correlationLinks.filter(l => l.risk === "high");
  const mediumRiskLinks = correlationLinks.filter(l => l.risk === "medium");
  const positiveLinks = correlationLinks.filter(l => l.type === "positive");
  const negativeLinks = correlationLinks.filter(l => l.type === "negative");

  const overallRisk = highRiskLinks.length > 2 ? "high" : highRiskLinks.length > 0 ? "medium" : "low";
  const diversificationScore = Math.max(0, 100 - (highRiskLinks.length * 20 + mediumRiskLinks.length * 10));

  const getLegName = (legId: string) => {
    const leg = legs.find(l => l.id === legId);
    return leg ? `${leg.team} ${leg.market}` : legId;
  };

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.6) return "text-red-500";
    if (correlation > 0.3) return "text-orange-500";
    if (correlation > 0) return "text-yellow-500";
    if (correlation > -0.3) return "text-blue-300";
    return "text-blue-500";
  };

  if (legs.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Correlation Graph Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Add at least 2 legs to analyze correlations</p>
            <p className="text-sm">Correlation analysis helps identify hidden risks</p>
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
            <Share2 className="h-5 w-5 text-primary" />
            Correlation Graph Intelligence
          </CardTitle>
          <Badge 
            variant={overallRisk === "high" ? "destructive" : overallRisk === "medium" ? "default" : "secondary"}
          >
            {overallRisk === "high" ? (
              <><AlertTriangle className="h-3 w-3 mr-1" /> High Correlation Risk</>
            ) : overallRisk === "medium" ? (
              <>Medium Risk</>
            ) : (
              <><CheckCircle className="h-3 w-3 mr-1" /> Well Diversified</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-2xl font-bold">{diversificationScore}%</p>
            <p className="text-xs text-muted-foreground">Diversification Score</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-2xl font-bold text-red-500">{highRiskLinks.length}</p>
            <p className="text-xs text-muted-foreground">High Correlations</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-2xl font-bold text-green-500">{positiveLinks.length}</p>
            <p className="text-xs text-muted-foreground">Positive Links</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-2xl font-bold text-blue-500">{negativeLinks.length}</p>
            <p className="text-xs text-muted-foreground">Negative Links</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-negative"
              checked={showNegative}
              onCheckedChange={setShowNegative}
            />
            <Label htmlFor="show-negative" className="text-sm">Show negative correlations</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-suggestions"
              checked={showSuggestions}
              onCheckedChange={setShowSuggestions}
            />
            <Label htmlFor="show-suggestions" className="text-sm">Show suggestions</Label>
          </div>
        </div>

        {highRiskLinks.length > 0 && (
          <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Double-Dip Warning</p>
                <p className="text-sm text-muted-foreground">
                  {highRiskLinks.length} pair(s) of legs are highly correlated. If one loses, the other likely will too.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Link className="h-4 w-4" />
            Correlation Links ({correlationLinks.length})
          </h4>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {correlationLinks
              .filter(link => showNegative || link.type !== "negative")
              .map((link, idx) => (
                <div 
                  key={idx}
                  className={`p-2 rounded-lg border ${
                    link.risk === "high" ? "border-red-500/50 bg-red-500/5" :
                    link.risk === "medium" ? "border-yellow-500/50 bg-yellow-500/5" :
                    "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{getLegName(link.leg1Id)}</span>
                      {link.type === "positive" ? (
                        <Link className="h-3 w-3 text-green-500" />
                      ) : link.type === "negative" ? (
                        <Unlink className="h-3 w-3 text-blue-500" />
                      ) : (
                        <span className="text-muted-foreground">~</span>
                      )}
                      <span className="font-medium">{getLegName(link.leg2Id)}</span>
                    </div>
                    <Badge 
                      variant={link.risk === "high" ? "destructive" : link.risk === "medium" ? "default" : "outline"}
                      className="text-xs"
                    >
                      <span className={getCorrelationColor(link.correlation)}>
                        {link.correlation > 0 ? "+" : ""}{(link.correlation * 100).toFixed(0)}%
                      </span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{link.reason}</p>
                </div>
              ))}
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Diversification Suggestions
            </h4>
            
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{suggestion.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Impact Score: +{(suggestion.impactScore * 100).toFixed(0)}% diversification
                    </p>
                  </div>
                  <Button size="sm" variant="outline" data-testid="button-apply-suggestion">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
