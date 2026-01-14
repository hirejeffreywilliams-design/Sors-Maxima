import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Scale, TrendingUp, TrendingDown, AlertTriangle, Target, Users } from "lucide-react";

interface RefereeProfile {
  id: string;
  name: string;
  sport: string;
  game: string;
  gamesOfficiated: number;
  overUnderRecord: { over: number; under: number };
  avgTotal: number;
  leagueAvgTotal: number;
  foulRate: number;
  leagueFoulRate: number;
  homeTeamCoverRate: number;
  tendencies: string[];
  impact: "high" | "medium" | "low";
  recommendation: string;
}

function getMockReferees(): RefereeProfile[] {
  return [
    {
      id: "1",
      name: "Scott Foster",
      sport: "NBA",
      game: "Lakers vs Nuggets",
      gamesOfficiated: 1842,
      overUnderRecord: { over: 48, under: 52 },
      avgTotal: 218.4,
      leagueAvgTotal: 225.2,
      foulRate: 42.8,
      leagueFoulRate: 40.2,
      homeTeamCoverRate: 54,
      tendencies: ["High foul calls", "Under-leaning games", "Tight whistles late in games"],
      impact: "high",
      recommendation: "Consider Under - Foster games average 6.8 fewer points than league avg",
    },
    {
      id: "2",
      name: "Tony Brothers",
      sport: "NBA",
      game: "Celtics vs 76ers",
      gamesOfficiated: 1654,
      overUnderRecord: { over: 55, under: 45 },
      avgTotal: 228.6,
      leagueAvgTotal: 225.2,
      foulRate: 38.5,
      leagueFoulRate: 40.2,
      homeTeamCoverRate: 51,
      tendencies: ["Lets teams play", "Higher scoring games", "Quick technicals"],
      impact: "medium",
      recommendation: "Slight lean Over - Brothers games run 3.4 points above average",
    },
    {
      id: "3",
      name: "Brad Allen",
      sport: "NFL",
      game: "Chiefs vs Raiders",
      gamesOfficiated: 142,
      overUnderRecord: { over: 52, under: 48 },
      avgTotal: 46.2,
      leagueAvgTotal: 44.8,
      foulRate: 12.4,
      leagueFoulRate: 11.8,
      homeTeamCoverRate: 56,
      tendencies: ["Flag-happy crew", "Pass interference calls up", "Favors home team slightly"],
      impact: "medium",
      recommendation: "Monitor penalty trends - more flags = more stoppages = higher totals",
    },
    {
      id: "4",
      name: "Wes McCauley",
      sport: "NHL",
      game: "Oilers vs Flames",
      gamesOfficiated: 1124,
      overUnderRecord: { over: 47, under: 53 },
      avgTotal: 5.8,
      leagueAvgTotal: 6.2,
      foulRate: 7.2,
      leagueFoulRate: 6.8,
      homeTeamCoverRate: 52,
      tendencies: ["Penalty-heavy", "Calls tight games", "Consistent standard"],
      impact: "medium",
      recommendation: "Slight Under lean - more penalties = more special teams = lower scoring",
    },
    {
      id: "5",
      name: "Angel Hernandez",
      sport: "MLB",
      game: "Dodgers vs Giants",
      gamesOfficiated: 2456,
      overUnderRecord: { over: 51, under: 49 },
      avgTotal: 8.4,
      leagueAvgTotal: 8.6,
      foulRate: 0,
      leagueFoulRate: 0,
      homeTeamCoverRate: 49,
      tendencies: ["Inconsistent strike zone", "More walks issued", "Controversial calls"],
      impact: "low",
      recommendation: "Minimal impact on totals - focus on other factors",
    },
  ];
}

export function RefereeAnalysis() {
  const [referees] = useState<RefereeProfile[]>(getMockReferees());
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? referees : referees.filter(r => r.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <span className="font-medium">Referee/Umpire Tendency Analysis</span>
          <Badge variant="outline">Official Impact</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-referee-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map(ref => (
          <Card 
            key={ref.id}
            className={`${ref.impact === "high" ? "border-primary/30 bg-primary/5" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{ref.sport}</Badge>
                    <span className="font-semibold text-lg">{ref.name}</span>
                    <Badge 
                      variant={ref.impact === "high" ? "default" : ref.impact === "medium" ? "secondary" : "outline"}
                    >
                      {ref.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ref.game}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Games Officiated</p>
                  <p className="font-bold">{ref.gamesOfficiated.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">O/U Record</p>
                  <p className="font-bold">
                    <span className={ref.overUnderRecord.over > 52 ? "text-green-500" : ""}>
                      {ref.overUnderRecord.over}%
                    </span>
                    {" / "}
                    <span className={ref.overUnderRecord.under > 52 ? "text-red-500" : ""}>
                      {ref.overUnderRecord.under}%
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Avg Total</p>
                  <p className={`font-bold ${
                    ref.avgTotal > ref.leagueAvgTotal ? "text-green-500" : 
                    ref.avgTotal < ref.leagueAvgTotal ? "text-red-500" : ""
                  }`}>
                    {ref.avgTotal} 
                    <span className="text-xs text-muted-foreground ml-1">
                      ({ref.avgTotal > ref.leagueAvgTotal ? "+" : ""}{(ref.avgTotal - ref.leagueAvgTotal).toFixed(1)})
                    </span>
                  </p>
                </div>
                {ref.foulRate > 0 && (
                  <div className="p-3 bg-background/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Foul Rate</p>
                    <p className={`font-bold ${
                      ref.foulRate > ref.leagueFoulRate ? "text-yellow-500" : "text-green-500"
                    }`}>
                      {ref.foulRate}
                      <span className="text-xs text-muted-foreground ml-1">
                        (avg {ref.leagueFoulRate})
                      </span>
                    </p>
                  </div>
                )}
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Home Cover %</p>
                  <p className={`font-bold ${ref.homeTeamCoverRate > 52 ? "text-green-500" : ""}`}>
                    {ref.homeTeamCoverRate}%
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {ref.tendencies.map((tendency, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tendency}
                  </Badge>
                ))}
              </div>

              <div className={`p-3 rounded-lg ${
                ref.recommendation.includes("Under") || ref.recommendation.includes("lower")
                  ? "bg-red-500/10 border border-red-500/30"
                  : ref.recommendation.includes("Over") || ref.recommendation.includes("higher")
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-muted/50"
              }`}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-sm">{ref.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
