import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ThumbsUp, ThumbsDown, TrendingUp, Star, AlertTriangle } from "lucide-react";

interface ConsensusPick {
  id: string;
  game: string;
  pick: string;
  expertsFor: number;
  expertsAgainst: number;
  consensusPercent: number;
  historicalAccuracy: number;
  grade: "A" | "B" | "C" | "D";
  sport: string;
}

function generateMockConsensus(): ConsensusPick[] {
  return [
    {
      id: "cons-1",
      game: "Packers @ Bears",
      pick: "Packers -4.5",
      expertsFor: 14,
      expertsAgainst: 4,
      consensusPercent: 78,
      historicalAccuracy: 62,
      grade: "A",
      sport: "NFL",
    },
    {
      id: "cons-2",
      game: "Chiefs @ Bills",
      pick: "Chiefs +2.5",
      expertsFor: 11,
      expertsAgainst: 7,
      consensusPercent: 61,
      historicalAccuracy: 58,
      grade: "B",
      sport: "NFL",
    },
    {
      id: "cons-3",
      game: "Warriors @ Bucks",
      pick: "Under 228.5",
      expertsFor: 12,
      expertsAgainst: 6,
      consensusPercent: 67,
      historicalAccuracy: 55,
      grade: "B",
      sport: "NBA",
    },
    {
      id: "cons-4",
      game: "Cowboys @ Eagles",
      pick: "Eagles -6",
      expertsFor: 15,
      expertsAgainst: 3,
      consensusPercent: 83,
      historicalAccuracy: 64,
      grade: "A",
      sport: "NFL",
    },
    {
      id: "cons-5",
      game: "Yankees @ Dodgers",
      pick: "Yankees ML",
      expertsFor: 8,
      expertsAgainst: 10,
      consensusPercent: 44,
      historicalAccuracy: 48,
      grade: "D",
      sport: "MLB",
    },
  ];
}

export function ConsensusPicks() {
  const [sport, setSport] = useState("all");
  const [picks] = useState<ConsensusPick[]>(generateMockConsensus());

  const filteredPicks = sport === "all" 
    ? picks 
    : picks.filter(p => p.sport.toLowerCase() === sport);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500 text-white";
      case "B": return "bg-chart-1 text-white";
      case "C": return "bg-yellow-500 text-black";
      case "D": return "bg-red-500 text-white";
      default: return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-chart-1" />
            Consensus Picks
          </CardTitle>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-24" data-testid="select-consensus-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="nba">NBA</SelectItem>
              <SelectItem value="nfl">NFL</SelectItem>
              <SelectItem value="mlb">MLB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-consensus">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        {filteredPicks.map((pick) => (
          <div
            key={pick.id}
            className={`p-3 rounded-lg border ${
              pick.grade === "A"
                ? "bg-green-500/10 border-green-500/30"
                : pick.grade === "B"
                ? "bg-chart-1/10 border-chart-1/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                  <p className="font-medium text-sm">{pick.game}</p>
                </div>
                <p className="text-sm font-bold mt-1">{pick.pick}</p>
              </div>
              <Badge className={`${getGradeColor(pick.grade)} text-sm font-bold`}>
                {pick.grade}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${pick.consensusPercent}%` }}
                />
              </div>
              <span className="text-sm font-bold">{pick.consensusPercent}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-green-500" />
                <span>{pick.expertsFor} for</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3 text-red-500" />
                <span>{pick.expertsAgainst} against</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <span>{pick.historicalAccuracy}% accuracy</span>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Aggregated from 18 expert sources
        </div>
      </CardContent>
    </Card>
  );
}
