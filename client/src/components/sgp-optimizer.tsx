import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Layers, TrendingUp, Target, DollarSign, Sparkles, Plus, AlertTriangle, CheckCircle } from "lucide-react";

interface SGPLeg {
  player: string;
  prop: string;
  line: number;
  odds: number;
  hitRate: number;
  correlationImpact: number;
}

interface OptimizedSGP {
  id: string;
  game: string;
  sport: string;
  legs: SGPLeg[];
  combinedOdds: number;
  trueOdds: number;
  ev: number;
  winProbability: number;
  correlationBoost: number;
  grade: "A" | "B" | "C" | "D";
  payout10: number;
}

function getMockSGPs(): OptimizedSGP[] {
  return [
    {
      id: "1",
      game: "Bills vs Dolphins",
      sport: "NFL",
      legs: [
        { player: "Josh Allen", prop: "Passing Yards", line: 275.5, odds: -115, hitRate: 68, correlationImpact: 0 },
        { player: "Josh Allen", prop: "Passing TDs", line: 2.5, odds: +105, hitRate: 52, correlationImpact: 15 },
        { player: "Stefon Diggs", prop: "Receiving Yards", line: 72.5, odds: -110, hitRate: 62, correlationImpact: 18 },
        { player: "Dalton Kincaid", prop: "Receptions", line: 4.5, odds: -120, hitRate: 58, correlationImpact: 12 },
      ],
      combinedOdds: 850,
      trueOdds: 720,
      ev: 18.1,
      winProbability: 12.2,
      correlationBoost: 22,
      grade: "A",
      payout10: 95,
    },
    {
      id: "2",
      game: "Mavericks vs Bucks",
      sport: "NBA",
      legs: [
        { player: "Luka Doncic", prop: "Points", line: 25.5, odds: -110, hitRate: 72, correlationImpact: 0 },
        { player: "Luka Doncic", prop: "Assists", line: 7.5, odds: +100, hitRate: 55, correlationImpact: 8 },
        { player: "Giannis Antetokounmpo", prop: "Rebounds", line: 11.5, odds: -115, hitRate: 64, correlationImpact: 5 },
      ],
      combinedOdds: 420,
      trueOdds: 380,
      ev: 10.5,
      winProbability: 21.3,
      correlationBoost: 12,
      grade: "B",
      payout10: 52,
    },
    {
      id: "3",
      game: "Dodgers vs Giants",
      sport: "MLB",
      legs: [
        { player: "Shohei Ohtani", prop: "Total Bases", line: 1.5, odds: -125, hitRate: 58, correlationImpact: 0 },
        { player: "Mookie Betts", prop: "Hits", line: 1.5, odds: +105, hitRate: 52, correlationImpact: 10 },
        { player: "Dodgers", prop: "Run Line -1.5", line: -1.5, odds: +110, hitRate: 48, correlationImpact: 15 },
      ],
      combinedOdds: 520,
      trueOdds: 490,
      ev: 6.1,
      winProbability: 16.8,
      correlationBoost: 8,
      grade: "B",
      payout10: 62,
    },
    {
      id: "4",
      game: "Chiefs vs Raiders",
      sport: "NFL",
      legs: [
        { player: "Patrick Mahomes", prop: "Passing Yards", line: 285.5, odds: -110, hitRate: 65, correlationImpact: 0 },
        { player: "Travis Kelce", prop: "Receiving Yards", line: 58.5, odds: -115, hitRate: 60, correlationImpact: 20 },
        { player: "Isiah Pacheco", prop: "Rushing Yards", line: 55.5, odds: -110, hitRate: 55, correlationImpact: -12 },
      ],
      combinedOdds: 380,
      trueOdds: 410,
      ev: -7.3,
      winProbability: 19.5,
      correlationBoost: -8,
      grade: "D",
      payout10: 48,
    },
  ];
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A": return "bg-green-500 text-white";
    case "B": return "bg-green-400 text-white";
    case "C": return "bg-yellow-500 text-black";
    case "D": return "bg-red-500 text-white";
    default: return "bg-muted";
  }
}

export function SGPOptimizer() {
  const [sgps] = useState<OptimizedSGP[]>(getMockSGPs());
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? sgps : sgps.filter(s => s.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <span className="font-medium">Same Game Parlay Optimizer</span>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Optimized
          </Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-sgp-sport">
            <SelectValue />
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

      <div className="grid gap-4">
        {filtered.map(sgp => (
          <Card 
            key={sgp.id}
            className={`${sgp.ev > 10 ? "border-green-500/30 bg-green-500/5" : sgp.ev < 0 ? "border-red-500/30 bg-red-500/5" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge>{sgp.sport}</Badge>
                  <CardTitle className="text-base">{sgp.game}</CardTitle>
                  <Badge className={getGradeColor(sgp.grade)}>Grade: {sgp.grade}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    +{sgp.combinedOdds}
                  </Badge>
                  <Badge className={sgp.ev > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                    {sgp.ev > 0 ? "+" : ""}{sgp.ev.toFixed(1)}% EV
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Win Prob</p>
                  <p className="font-bold">{sgp.winProbability.toFixed(1)}%</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">True Odds</p>
                  <p className="font-bold">+{sgp.trueOdds}</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Corr. Boost</p>
                  <p className={`font-bold ${sgp.correlationBoost > 0 ? "text-green-500" : "text-red-500"}`}>
                    {sgp.correlationBoost > 0 ? "+" : ""}{sgp.correlationBoost}%
                  </p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">$10 Payout</p>
                  <p className="font-bold text-green-500">${sgp.payout10}</p>
                </div>
              </div>

              <div className="space-y-2">
                {sgp.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Plus className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{leg.player}</span>
                      <span className="text-muted-foreground">{leg.prop} O{leg.line}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{leg.hitRate}% hit</span>
                      {leg.correlationImpact !== 0 && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${leg.correlationImpact > 0 ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"}`}
                        >
                          {leg.correlationImpact > 0 ? "+" : ""}{leg.correlationImpact}% corr
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {sgp.correlationBoost < 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg text-sm text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  Negative correlation detected - legs work against each other
                </div>
              )}

              {sgp.ev > 10 && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg text-sm text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  High value SGP - correlation boost adds significant edge
                </div>
              )}

              <Button className="w-full" data-testid={`button-build-sgp-${sgp.id}`}>
                <Target className="w-4 h-4 mr-2" />
                Build This SGP
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
