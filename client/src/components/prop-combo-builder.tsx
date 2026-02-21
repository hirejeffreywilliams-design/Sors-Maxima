import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, TrendingUp, Zap, Plus, Link2, CheckCircle } from "lucide-react";

interface PropCombo {
  id: string;
  player1: string;
  prop1: string;
  player2: string;
  prop2: string;
  correlation: number;
  combinedEV: number;
  hitRate: number;
  recommendation: string;
}

function generateMockCombos(): PropCombo[] {
  return [
    {
      id: "combo-1",
      player1: "Patrick Mahomes",
      prop1: "Over 285.5 Pass Yards",
      player2: "Travis Kelce",
      prop2: "Over 75.5 Rec Yards",
      correlation: 0.72,
      combinedEV: 8.5,
      hitRate: 62,
      recommendation: "Strong stack - Kelce targets increase with Mahomes volume",
    },
    {
      id: "combo-2",
      player1: "Jayson Tatum",
      prop1: "Over 27.5 Points",
      player2: "Anthony Davis",
      prop2: "Over 11.5 Rebounds",
      correlation: 0.45,
      combinedEV: 5.2,
      hitRate: 58,
      recommendation: "Moderate correlation - both benefit from pace",
    },
    {
      id: "combo-3",
      player1: "Josh Allen",
      prop1: "Over 2.5 Pass TDs",
      player2: "Stefon Diggs",
      prop2: "Anytime TD",
      correlation: 0.65,
      combinedEV: 12.3,
      hitRate: 48,
      recommendation: "TD correlation strong - Diggs is red zone target",
    },
    {
      id: "combo-4",
      player1: "Jayson Tatum",
      prop1: "Over 8.5 Assists",
      player2: "Jaylen Brown",
      prop2: "Over 24.5 Points",
      correlation: 0.38,
      combinedEV: 3.8,
      hitRate: 55,
      recommendation: "Tatum assists often go to Brown",
    },
  ];
}

export function PropComboBuilder() {
  const [sport, setSport] = useState("all");
  const [combos] = useState<PropCombo[]>(generateMockCombos());
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);

  const toggleCombo = (id: string) => {
    setSelectedCombos(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-chart-4" />
            Prop Combo Builder
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedCombos.length > 0 && (
              <Badge variant="default" className="gap-1">
                {selectedCombos.length} Selected
              </Badge>
            )}
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-combo-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="nba">NBA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedCombos.includes(combo.id)
                ? "bg-primary/10 border-primary/50"
                : combo.correlation > 0.6
                ? "bg-chart-4/10 border-chart-4/30 hover:bg-chart-4/15"
                : "bg-muted/50 border-border hover:bg-muted"
            }`}
            onClick={() => toggleCombo(combo.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{combo.player1}</span>
                  <Badge variant="outline" className="text-xs">
                    {combo.prop1}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">{combo.player2}</span>
                  <Badge variant="outline" className="text-xs">
                    {combo.prop2}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCombos.includes(combo.id) ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Plus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Correlation</p>
                <p className={`font-bold ${combo.correlation > 0.5 ? "text-green-500" : "text-yellow-500"}`}>
                  {(combo.correlation * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Combined EV</p>
                <p className="font-bold text-chart-1">+{combo.combinedEV}%</p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Hit Rate</p>
                <p className="font-bold">{combo.hitRate}%</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{combo.recommendation}</p>
          </div>
        ))}

        {selectedCombos.length > 0 && (
          <Button className="w-full gap-2" data-testid="button-add-combos">
            <Zap className="w-4 h-4" />
            Add {selectedCombos.length} Combo{selectedCombos.length > 1 ? "s" : ""} to Parlay
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
