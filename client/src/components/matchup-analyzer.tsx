import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, TrendingUp, TrendingDown, Shield, Target, AlertTriangle } from "lucide-react";

interface MatchupData {
  id: string;
  player: string;
  team: string;
  opponent: string;
  category: string;
  seasonAvg: number;
  vsOpponentAvg: number;
  last3VsOpponent: number[];
  defenseRank: number;
  edge: number;
  recommendation: "smash" | "lean" | "fade" | "avoid";
}

function generateMockMatchups(): MatchupData[] {
  return [
    {
      id: "matchup-1",
      player: "Tyreek Hill",
      team: "Dolphins",
      opponent: "Patriots",
      category: "Receiving Yards",
      seasonAvg: 98.5,
      vsOpponentAvg: 142.3,
      last3VsOpponent: [156, 134, 137],
      defenseRank: 28,
      edge: 18.5,
      recommendation: "smash",
    },
    {
      id: "matchup-2",
      player: "Derrick Henry",
      team: "Titans",
      opponent: "Jaguars",
      category: "Rushing Yards",
      seasonAvg: 105.2,
      vsOpponentAvg: 128.7,
      last3VsOpponent: [142, 118, 126],
      defenseRank: 24,
      edge: 12.3,
      recommendation: "smash",
    },
    {
      id: "matchup-3",
      player: "Justin Jefferson",
      team: "Vikings",
      opponent: "Bears",
      category: "Receptions",
      seasonAvg: 7.2,
      vsOpponentAvg: 8.5,
      last3VsOpponent: [9, 8, 9],
      defenseRank: 22,
      edge: 8.1,
      recommendation: "lean",
    },
    {
      id: "matchup-4",
      player: "Ja'Marr Chase",
      team: "Bengals",
      opponent: "Ravens",
      category: "Receiving Yards",
      seasonAvg: 92.1,
      vsOpponentAvg: 68.4,
      last3VsOpponent: [54, 72, 79],
      defenseRank: 4,
      edge: -15.2,
      recommendation: "fade",
    },
  ];
}

export function MatchupAnalyzer() {
  const [category, setCategory] = useState("all");
  const [matchups] = useState<MatchupData[]>(generateMockMatchups());

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "smash": return "text-green-500 bg-green-500/10 border-green-500/30";
      case "lean": return "text-chart-1 bg-chart-1/10 border-chart-1/30";
      case "fade": return "text-red-500 bg-red-500/10 border-red-500/30";
      default: return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-chart-3" />
            Matchup Analyzer
          </CardTitle>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-32" data-testid="select-matchup-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Props</SelectItem>
              <SelectItem value="rushing">Rushing</SelectItem>
              <SelectItem value="receiving">Receiving</SelectItem>
              <SelectItem value="passing">Passing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-matchup">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        {matchups.map((matchup) => (
          <div
            key={matchup.id}
            className={`p-3 rounded-lg border ${getRecommendationColor(matchup.recommendation)}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-medium">{matchup.player}</p>
                <p className="text-xs text-muted-foreground">
                  {matchup.team} vs {matchup.opponent} • {matchup.category}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`capitalize ${
                  matchup.recommendation === "smash" ? "border-green-500 text-green-500" :
                  matchup.recommendation === "lean" ? "border-chart-1 text-chart-1" :
                  matchup.recommendation === "fade" ? "border-red-500 text-red-500" :
                  ""
                }`}
              >
                {matchup.recommendation}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground mb-1">Season Avg</p>
                <p className="font-bold">{matchup.seasonAvg}</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground mb-1">vs {matchup.opponent}</p>
                <p className={`font-bold ${matchup.vsOpponentAvg > matchup.seasonAvg ? "text-green-500" : "text-red-500"}`}>
                  {matchup.vsOpponentAvg}
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Def Rank</p>
                </div>
                <p className={`font-bold ${matchup.defenseRank > 20 ? "text-green-500" : matchup.defenseRank < 10 ? "text-red-500" : ""}`}>
                  #{matchup.defenseRank}
                </p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Edge</p>
                </div>
                <p className={`font-bold ${matchup.edge > 0 ? "text-green-500" : "text-red-500"}`}>
                  {matchup.edge > 0 ? "+" : ""}{matchup.edge}%
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>Last 3 vs opponent:</span>
              {matchup.last3VsOpponent.map((val, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {val}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
