import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, TrendingDown, Target, Sparkles, BarChart3, Zap, Atom } from "lucide-react";
import { QuantumAnalysisIndicator, QuantumBadge } from "./quantum-analysis-badge";

interface Projection {
  id: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  projection: number;
  modelConfidence: number;
  edge: number;
  recommendation: "strong_over" | "lean_over" | "neutral" | "lean_under" | "strong_under";
  features: { name: string; impact: number; description: string }[];
  historicalAccuracy: number;
  sport: string;
}

function getMockProjections(): Projection[] {
  return [
    {
      id: "1",
      player: "Josh Allen",
      team: "BUF",
      opponent: "MIA",
      prop: "Passing Yards",
      line: 275.5,
      projection: 298.2,
      modelConfidence: 84,
      edge: 8.2,
      recommendation: "strong_over",
      features: [
        { name: "Opponent Pass Defense", impact: 22, description: "MIA allows 268 YPG (25th)" },
        { name: "Recent Form", impact: 18, description: "Averaging 312 YPG last 3 games" },
        { name: "Weather", impact: 12, description: "Indoor venue, optimal conditions" },
        { name: "Weapons Health", impact: 15, description: "Diggs + Davis both active" },
        { name: "Game Script", impact: 8, description: "Slight favorite, balanced approach" },
      ],
      historicalAccuracy: 72,
      sport: "NFL",
    },
    {
      id: "2",
      player: "Jayson Tatum",
      team: "BOS",
      opponent: "PHI",
      prop: "Points",
      line: 27.5,
      projection: 31.4,
      modelConfidence: 78,
      edge: 6.8,
      recommendation: "lean_over",
      features: [
        { name: "Matchup", impact: 20, description: "PHI ranks 22nd in perimeter D" },
        { name: "Usage Rate", impact: 18, description: "32% usage (top 5 in NBA)" },
        { name: "Rest Days", impact: 10, description: "2 days rest, fresh legs" },
        { name: "Home Court", impact: 8, description: "+3.2 PPG at home this season" },
        { name: "Rivalry Factor", impact: 12, description: "Historically scores 29+ vs PHI" },
      ],
      historicalAccuracy: 68,
      sport: "NBA",
    },
    {
      id: "3",
      player: "Connor McDavid",
      team: "EDM",
      opponent: "CGY",
      prop: "Points",
      line: 1.5,
      projection: 2.1,
      modelConfidence: 71,
      edge: 5.4,
      recommendation: "lean_over",
      features: [
        { name: "Battle of Alberta", impact: 25, description: "Averages 2.4 pts vs CGY career" },
        { name: "Power Play", impact: 18, description: "CGY 28th in PK%" },
        { name: "Ice Time", impact: 15, description: "Averaging 23:45 TOI" },
        { name: "Line Chemistry", impact: 12, description: "Draisaitl linemate producing" },
      ],
      historicalAccuracy: 65,
      sport: "NHL",
    },
    {
      id: "4",
      player: "Shohei Ohtani",
      team: "LAD",
      opponent: "SF",
      prop: "Total Bases",
      line: 1.5,
      projection: 2.2,
      modelConfidence: 75,
      edge: 7.1,
      recommendation: "lean_over",
      features: [
        { name: "Pitcher Matchup", impact: 22, description: "LHP, Ohtani hits .342 vs lefties" },
        { name: "Park Factor", impact: 15, description: "Oracle Park neutral for RHB" },
        { name: "Hot Streak", impact: 20, description: "8-for-20 last 5 games" },
        { name: "Career vs Giants", impact: 12, description: ".315 AVG, .952 OPS" },
      ],
      historicalAccuracy: 70,
      sport: "MLB",
    },
    {
      id: "5",
      player: "Tyreek Hill",
      team: "MIA",
      opponent: "BUF",
      prop: "Receiving Yards",
      line: 82.5,
      projection: 71.2,
      modelConfidence: 76,
      edge: -5.8,
      recommendation: "lean_under",
      features: [
        { name: "Coverage", impact: -20, description: "BUF CB1 allows only 48 YPG" },
        { name: "Weather", impact: -15, description: "Cold conditions slow routes" },
        { name: "Game Script", impact: -8, description: "BUF favored, less passing" },
        { name: "Target Share", impact: 10, description: "28% target share" },
      ],
      historicalAccuracy: 69,
      sport: "NFL",
    },
  ];
}

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case "strong_over": return { bg: "bg-green-500/10", text: "text-green-500", label: "STRONG OVER" };
    case "lean_over": return { bg: "bg-green-500/5", text: "text-green-400", label: "LEAN OVER" };
    case "neutral": return { bg: "bg-muted/50", text: "text-muted-foreground", label: "NEUTRAL" };
    case "lean_under": return { bg: "bg-red-500/5", text: "text-red-400", label: "LEAN UNDER" };
    case "strong_under": return { bg: "bg-red-500/10", text: "text-red-500", label: "STRONG UNDER" };
    default: return { bg: "bg-muted/50", text: "text-muted-foreground", label: "NEUTRAL" };
  }
}

export function MLPropProjections() {
  const [sport, setSport] = useState("all");
  const [projections] = useState<Projection[]>(getMockProjections());
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = sport === "all" ? projections : projections.filter(p => p.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-medium">Player Projections</span>
          <Badge variant="outline" className="gap-1">
            <Atom className="w-3 h-3" />
            AI Enhanced
          </Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-ml-sport">
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

      <QuantumAnalysisIndicator compact />

      <div className="grid gap-4">
        {filtered.map(proj => {
          const style = getRecommendationStyle(proj.recommendation);
          const isExpanded = expanded === proj.id;

          return (
            <Card key={proj.id} className={`${style.bg} border-border/50`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{proj.player}</span>
                      <Badge variant="outline">{proj.team}</Badge>
                      <span className="text-sm text-muted-foreground">vs {proj.opponent}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{proj.prop}</p>
                  </div>
                  <Badge className={`${style.text} border ${style.bg} bg-transparent`}>
                    {style.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Line</p>
                    <p className="font-bold text-lg" data-testid={`text-line-${proj.id}`}>{proj.line}</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">ML Projection</p>
                    <p className={`font-bold text-lg ${proj.projection > proj.line ? "text-green-500" : "text-red-500"}`} data-testid={`text-projection-${proj.id}`}>
                      {proj.projection.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Edge</p>
                    <p className={`font-bold text-lg ${proj.edge > 0 ? "text-green-500" : "text-red-500"}`} data-testid={`text-edge-${proj.id}`}>
                      {proj.edge > 0 ? "+" : ""}{proj.edge.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-bold text-lg" data-testid={`text-confidence-${proj.id}`}>{proj.modelConfidence}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BarChart3 className="w-3 h-3" />
                    <span>Model Accuracy: {proj.historicalAccuracy}%</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpanded(isExpanded ? null : proj.id)}
                    data-testid={`button-expand-${proj.id}`}
                  >
                    {isExpanded ? "Hide Details" : "Show Features"}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-sm font-medium mb-2">Key Model Features</p>
                    {proj.features.map((feature, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {feature.impact > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{feature.name}</p>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                        <Badge variant={feature.impact > 0 ? "default" : "secondary"}>
                          {feature.impact > 0 ? "+" : ""}{feature.impact}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
