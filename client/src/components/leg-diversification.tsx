import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, AlertTriangle, CheckCircle, TrendingUp, Shield, BarChart3 } from "lucide-react";

interface ParlayLeg {
  id: string;
  description: string;
  sport: string;
  team: string;
  betType: "spread" | "moneyline" | "total" | "prop";
  direction: "favorite" | "underdog" | "over" | "under";
}

interface DiversificationScore {
  overall: number;
  sportDiversity: number;
  betTypeDiversity: number;
  directionBalance: number;
  teamConcentration: number;
  warnings: string[];
  suggestions: string[];
}

function analyzeDiversification(legs: ParlayLeg[]): DiversificationScore {
  const sports = Array.from(new Set(legs.map(l => l.sport)));
  const betTypes = Array.from(new Set(legs.map(l => l.betType)));
  const teams = Array.from(new Set(legs.map(l => l.team)));
  
  const favorites = legs.filter(l => l.direction === "favorite" || l.direction === "over").length;
  const underdogs = legs.filter(l => l.direction === "underdog" || l.direction === "under").length;
  
  const sportDiversity = Math.min(100, (sports.length / Math.max(1, legs.length * 0.5)) * 100);
  const betTypeDiversity = Math.min(100, (betTypes.length / 4) * 100);
  const directionBalance = 100 - Math.abs(favorites - underdogs) / legs.length * 100;
  const teamConcentration = Math.min(100, (teams.length / legs.length) * 100);
  
  const overall = (sportDiversity * 0.3 + betTypeDiversity * 0.2 + directionBalance * 0.25 + teamConcentration * 0.25);
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (sports.length === 1 && legs.length > 2) {
    warnings.push(`All ${legs.length} legs are from ${sports[0]} - high correlation risk`);
    suggestions.push("Add legs from different sports to reduce correlation");
  }
  
  if (favorites > legs.length * 0.8) {
    warnings.push("80%+ legs are favorites/overs - consider more diversity");
    suggestions.push("Mix in some underdog picks for balance");
  }
  
  if (betTypes.length === 1 && legs.length > 2) {
    warnings.push(`All legs are ${betTypes[0]}s - limited bet type diversity`);
    suggestions.push("Consider mixing spreads, totals, and props");
  }
  
  if (teams.length < legs.length * 0.7) {
    warnings.push("Multiple legs from same teams - correlated outcomes");
  }
  
  if (overall > 75) {
    suggestions.push("Good diversification! Your parlay has balanced risk exposure");
  }
  
  return {
    overall,
    sportDiversity,
    betTypeDiversity,
    directionBalance,
    teamConcentration,
    warnings,
    suggestions,
  };
}

export function LegDiversification() {
  const [legs] = useState<ParlayLeg[]>([
    { id: "1", description: "Chiefs -3.5", sport: "NFL", team: "KC", betType: "spread", direction: "favorite" },
    { id: "2", description: "Bills ML", sport: "NFL", team: "BUF", betType: "moneyline", direction: "favorite" },
    { id: "3", description: "Cowboys/Eagles O48.5", sport: "NFL", team: "DAL", betType: "total", direction: "over" },
    { id: "4", description: "Mahomes O285.5 Pass", sport: "NFL", team: "KC", betType: "prop", direction: "over" },
    { id: "5", description: "Suns +3.5", sport: "NBA", team: "PHX", betType: "spread", direction: "underdog" },
  ]);

  const analysis = analyzeDiversification(legs);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-primary" />
        <span className="font-medium">Leg Diversification Analysis</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Parlay Legs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {legs.map(leg => (
              <div key={leg.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{leg.sport}</Badge>
                  <span className="text-sm">{leg.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">{leg.betType}</Badge>
                  <Badge 
                    className={`text-xs ${
                      leg.direction === "favorite" || leg.direction === "over" 
                        ? "bg-blue-500 text-white" 
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {leg.direction}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Diversification Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
                analysis.overall >= 75 ? "bg-green-500/20 text-green-500" :
                analysis.overall >= 50 ? "bg-yellow-500/20 text-yellow-500" :
                "bg-red-500/20 text-red-500"
              }`}>
                <span className="text-3xl font-bold">{Math.round(analysis.overall)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {analysis.overall >= 75 ? "Well Diversified" :
                 analysis.overall >= 50 ? "Moderate Risk" :
                 "High Concentration Risk"}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sport Diversity</span>
                  <span>{Math.round(analysis.sportDiversity)}%</span>
                </div>
                <Progress value={analysis.sportDiversity} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Bet Type Variety</span>
                  <span>{Math.round(analysis.betTypeDiversity)}%</span>
                </div>
                <Progress value={analysis.betTypeDiversity} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Direction Balance</span>
                  <span>{Math.round(analysis.directionBalance)}%</span>
                </div>
                <Progress value={analysis.directionBalance} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Team Spread</span>
                  <span>{Math.round(analysis.teamConcentration)}%</span>
                </div>
                <Progress value={analysis.teamConcentration} className="h-2" />
              </div>
            </div>

            {analysis.warnings.length > 0 && (
              <div className="space-y-2">
                {analysis.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg text-sm text-yellow-500">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                {analysis.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg text-sm text-blue-500">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
