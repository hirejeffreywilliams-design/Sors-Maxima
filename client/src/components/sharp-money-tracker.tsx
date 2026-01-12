import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Eye, Zap } from "lucide-react";

interface SharpAction {
  id: string;
  game: string;
  market: string;
  side: string;
  publicPercent: number;
  moneyPercent: number;
  lineOpen: number;
  lineCurrent: number;
  sharpIndicator: "strong" | "moderate" | "weak";
  reverseMove: boolean;
  timestamp: string;
}

function generateMockSharpActions(): SharpAction[] {
  const games = [
    { home: "Lakers", away: "Celtics" },
    { home: "Chiefs", away: "Bills" },
    { home: "Yankees", away: "Dodgers" },
    { home: "Warriors", away: "Bucks" },
    { home: "Cowboys", away: "Eagles" },
  ];
  
  return games.map((game, i) => {
    const publicPercent = Math.floor(Math.random() * 40) + 50;
    const moneyPercent = Math.floor(Math.random() * 30) + 20;
    const reverseMove = publicPercent > 60 && moneyPercent < 40;
    
    return {
      id: `sharp-${i}`,
      game: `${game.away} @ ${game.home}`,
      market: ["spread", "moneyline", "total"][Math.floor(Math.random() * 3)],
      side: Math.random() > 0.5 ? game.home : game.away,
      publicPercent,
      moneyPercent,
      lineOpen: -110 + Math.floor(Math.random() * 20) - 10,
      lineCurrent: -110 + Math.floor(Math.random() * 30) - 15,
      sharpIndicator: reverseMove ? "strong" : moneyPercent < 35 ? "moderate" : "weak",
      reverseMove,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
    };
  });
}

export function SharpMoneyTracker() {
  const [sport, setSport] = useState("all");
  const [actions] = useState<SharpAction[]>(generateMockSharpActions());

  const sharpActions = actions.filter(a => 
    sport === "all" || a.game.toLowerCase().includes(sport.toLowerCase())
  );

  const strongSignals = sharpActions.filter(a => a.sharpIndicator === "strong").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-chart-1" />
            Sharp Money Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              {strongSignals} Strong Signals
            </Badge>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-28" data-testid="select-sharp-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sharpActions.map((action) => (
          <div
            key={action.id}
            className={`p-3 rounded-lg border ${
              action.sharpIndicator === "strong" 
                ? "bg-chart-1/10 border-chart-1/30" 
                : action.sharpIndicator === "moderate"
                ? "bg-chart-3/10 border-chart-3/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-sm">{action.game}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {action.market} • {action.side}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {action.reverseMove && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Reverse
                  </Badge>
                )}
                <Badge 
                  variant={action.sharpIndicator === "strong" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {action.sharpIndicator}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span>Public: {action.publicPercent}%</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span>Money: {action.moneyPercent}%</span>
              </div>
              <div className="flex items-center gap-1">
                {action.lineCurrent < action.lineOpen ? (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                )}
                <span>{action.lineOpen} → {action.lineCurrent}</span>
              </div>
            </div>
          </div>
        ))}
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          Sharp action detected when money% diverges from public%
        </p>
      </CardContent>
    </Card>
  );
}
