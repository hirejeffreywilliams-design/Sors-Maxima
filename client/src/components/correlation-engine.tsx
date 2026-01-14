import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, TrendingUp, AlertTriangle, CheckCircle, Plus, Zap } from "lucide-react";

interface CorrelatedStack {
  id: string;
  name: string;
  sport: string;
  game: string;
  legs: { player: string; prop: string; line: number; recommendation: string }[];
  correlationScore: number;
  combinedEV: number;
  synergy: "strong" | "moderate" | "weak";
  reason: string;
  warnings: string[];
}

function getMockStacks(): CorrelatedStack[] {
  return [
    {
      id: "1",
      name: "Bills Passing Game Stack",
      sport: "NFL",
      game: "BUF vs MIA",
      legs: [
        { player: "Josh Allen", prop: "Passing Yards O285.5", line: 285.5, recommendation: "strong_over" },
        { player: "Stefon Diggs", prop: "Receiving Yards O78.5", line: 78.5, recommendation: "lean_over" },
        { player: "Dalton Kincaid", prop: "Receptions O4.5", line: 4.5, recommendation: "lean_over" },
      ],
      correlationScore: 0.82,
      combinedEV: 12.4,
      synergy: "strong",
      reason: "When Allen throws for 285+, Diggs averages 95 yards and Kincaid sees 6+ targets",
      warnings: [],
    },
    {
      id: "2",
      name: "Lakers High-Scoring Game",
      sport: "NBA",
      game: "LAL vs DEN",
      legs: [
        { player: "LeBron James", prop: "Points O26.5", line: 26.5, recommendation: "lean_over" },
        { player: "Anthony Davis", prop: "Rebounds O11.5", line: 11.5, recommendation: "lean_over" },
        { player: "Game Total", prop: "Over 228.5", line: 228.5, recommendation: "lean_over" },
      ],
      correlationScore: 0.71,
      combinedEV: 8.8,
      synergy: "strong",
      reason: "LeBron + AD scoring correlates with game pace. High totals benefit both players.",
      warnings: [],
    },
    {
      id: "3",
      name: "Ohtani + Dodgers Run Stack",
      sport: "MLB",
      game: "LAD vs SF",
      legs: [
        { player: "Shohei Ohtani", prop: "Total Bases O1.5", line: 1.5, recommendation: "lean_over" },
        { player: "Mookie Betts", prop: "Hits O1.5", line: 1.5, recommendation: "lean_over" },
        { player: "Dodgers", prop: "Team Total O4.5", line: 4.5, recommendation: "lean_over" },
      ],
      correlationScore: 0.65,
      combinedEV: 7.2,
      synergy: "moderate",
      reason: "Top of lineup production drives team totals. Ohtani-Betts back-to-back in order.",
      warnings: ["LHP on mound - monitor lineup"],
    },
    {
      id: "4",
      name: "McDavid Points Stack",
      sport: "NHL",
      game: "EDM vs CGY",
      legs: [
        { player: "Connor McDavid", prop: "Points O1.5", line: 1.5, recommendation: "lean_over" },
        { player: "Leon Draisaitl", prop: "Points O1.5", line: 1.5, recommendation: "lean_over" },
        { player: "Oilers", prop: "Goals O3.5", line: 3.5, recommendation: "lean_over" },
      ],
      correlationScore: 0.78,
      combinedEV: 9.5,
      synergy: "strong",
      reason: "McDavid + Draisaitl on same PP unit. They combine for 48% of team's goals.",
      warnings: [],
    },
    {
      id: "5",
      name: "NEGATIVE: Avoid This Stack",
      sport: "NFL",
      game: "KC vs LV",
      legs: [
        { player: "Patrick Mahomes", prop: "Passing TDs O2.5", line: 2.5, recommendation: "lean_over" },
        { player: "Isiah Pacheco", prop: "Rushing Yards O75.5", line: 75.5, recommendation: "lean_over" },
      ],
      correlationScore: -0.35,
      combinedEV: -2.1,
      synergy: "weak",
      reason: "NEGATIVE CORRELATION: When Mahomes throws 3+ TDs, game script reduces rushing attempts",
      warnings: ["Negatively correlated legs", "Reduces combined probability"],
    },
  ];
}

export function CorrelationEngine() {
  const [stacks] = useState<CorrelatedStack[]>(getMockStacks());
  const [sport, setSport] = useState("all");
  const [minCorrelation, setMinCorrelation] = useState("0.5");

  const filtered = stacks
    .filter(s => sport === "all" || s.sport === sport)
    .filter(s => s.correlationScore >= parseFloat(minCorrelation));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Correlation Engine 2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-correlation-sport">
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
          <Select value={minCorrelation} onValueChange={setMinCorrelation}>
            <SelectTrigger className="w-40" data-testid="select-min-correlation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Correlations</SelectItem>
              <SelectItem value="0.5">Strong Only (0.5+)</SelectItem>
              <SelectItem value="0.7">Very Strong (0.7+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map(stack => (
          <Card 
            key={stack.id} 
            className={`${
              stack.correlationScore < 0 
                ? "border-red-500/30 bg-red-500/5" 
                : stack.synergy === "strong" 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-border"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge>{stack.sport}</Badge>
                  <CardTitle className="text-base">{stack.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={stack.correlationScore >= 0.7 ? "default" : stack.correlationScore >= 0 ? "secondary" : "destructive"}
                  >
                    {stack.correlationScore.toFixed(2)} Correlation
                  </Badge>
                  <Badge 
                    className={`${
                      stack.combinedEV > 8 ? "bg-green-500" : 
                      stack.combinedEV > 0 ? "bg-green-400" : 
                      "bg-red-500"
                    } text-white`}
                  >
                    {stack.combinedEV > 0 ? "+" : ""}{stack.combinedEV.toFixed(1)}% EV
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{stack.game}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {stack.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{leg.player}</span>
                      <span className="text-muted-foreground">{leg.prop}</span>
                    </div>
                    <Badge variant="outline" className={
                      leg.recommendation.includes("over") ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
                    }>
                      {leg.recommendation.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-start gap-2">
                  {stack.correlationScore >= 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  )}
                  <p className="text-sm">{stack.reason}</p>
                </div>
              </div>

              {stack.warnings.length > 0 && (
                <div className="space-y-1">
                  {stack.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-yellow-500">
                      <AlertTriangle className="w-4 h-4" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" data-testid={`button-add-stack-${stack.id}`}>
                  <Zap className="w-4 h-4 mr-2" />
                  Add to Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
