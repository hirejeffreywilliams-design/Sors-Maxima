import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, ArrowRight, TrendingUp, Zap, Plus, AlertTriangle } from "lucide-react";

interface ConditionalLeg {
  condition: string;
  conditionOdds: number;
  consequence: string;
  consequenceOdds: number;
  probability: number;
  combinedEV: number;
  gameScript: string;
}

function getMockConditionals(): ConditionalLeg[] {
  return [
    {
      condition: "Chiefs lead by 10+ at half",
      conditionOdds: 180,
      consequence: "Isiah Pacheco O75.5 Rush Yds",
      consequenceOdds: -110,
      probability: 68,
      combinedEV: 12.5,
      gameScript: "When KC leads big, they run 65% of 2H plays. Pacheco averages 52 2H yards in these scenarios.",
    },
    {
      condition: "Bills/Dolphins O28.5 1H",
      conditionOdds: -105,
      consequence: "Game Total O52.5",
      consequenceOdds: -115,
      probability: 78,
      combinedEV: 8.2,
      gameScript: "High-scoring first halves correlate with 82% over rate on game totals in divisional games.",
    },
    {
      condition: "LeBron scores 10+ in Q1",
      conditionOdds: -120,
      consequence: "LeBron O26.5 Points",
      consequenceOdds: -110,
      probability: 84,
      combinedEV: 6.8,
      gameScript: "When LeBron is aggressive early (10+ Q1), he averages 31.2 PPG vs 24.8 otherwise.",
    },
    {
      condition: "Ohtani gets a hit in 1st AB",
      conditionOdds: 105,
      consequence: "Ohtani O1.5 Total Bases",
      consequenceOdds: -125,
      probability: 72,
      combinedEV: 9.4,
      gameScript: "Ohtani multi-hit games: 68% start with 1st AB hit. Momentum carries.",
    },
    {
      condition: "McDavid gets an assist in P1",
      conditionOdds: 140,
      consequence: "Oilers O3.5 Goals",
      consequenceOdds: -105,
      probability: 65,
      combinedEV: 11.2,
      gameScript: "When McDavid assists early, Oilers score 4.2 goals avg vs 2.8 otherwise.",
    },
    {
      condition: "Eagles score first",
      conditionOdds: -105,
      consequence: "Eagles ML",
      consequenceOdds: 110,
      probability: 71,
      combinedEV: 7.8,
      gameScript: "Teams scoring first win 67% in NFL. Eagles are 12-2 when leading first.",
    },
  ];
}

export function ConditionalEngine() {
  const [conditionals] = useState<ConditionalLeg[]>(getMockConditionals());
  const [sport, setSport] = useState("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <span className="font-medium">If-This-Then-That Conditionals</span>
          <Badge variant="outline">Game Script Analysis</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-conditional-sport">
            <SelectValue placeholder="All Sports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg text-sm">
        <p className="text-muted-foreground">
          These conditionals identify high-value secondary bets that become profitable 
          when a primary condition is met. Based on historical game script analysis.
        </p>
      </div>

      <div className="grid gap-4">
        {conditionals.map((cond, i) => (
          <Card 
            key={i}
            className={`${cond.combinedEV > 10 ? "border-green-500/30 bg-green-500/5" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1 p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">IF THIS HAPPENS</p>
                  <p className="font-medium">{cond.condition}</p>
                  <Badge variant="outline" className="mt-2">
                    {cond.conditionOdds > 0 ? "+" : ""}{cond.conditionOdds}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1 p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">THEN BET THIS</p>
                  <p className="font-medium">{cond.consequence}</p>
                  <Badge variant="outline" className="mt-2">
                    {cond.consequenceOdds > 0 ? "+" : ""}{cond.consequenceOdds}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Conditional Prob</p>
                  <p className="font-bold text-lg">{cond.probability}%</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Combined EV</p>
                  <p className="font-bold text-lg text-green-500">+{cond.combinedEV.toFixed(1)}%</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Edge</p>
                  <p className="font-bold text-lg text-green-500">
                    +{(cond.combinedEV * 0.8).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg mb-3">
                <p className="text-xs text-muted-foreground mb-1">Game Script Analysis</p>
                <p className="text-sm">{cond.gameScript}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" data-testid={`button-add-condition-${i}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Condition
                </Button>
                <Button size="sm" className="flex-1" data-testid={`button-add-both-${i}`}>
                  <Zap className="w-4 h-4 mr-2" />
                  Add Both Legs
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
