import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Target, Award, Eye, Zap, CheckCircle, Atom } from "lucide-react";
import { QuantumAnalysisIndicator, QuantumBadge } from "./quantum-analysis-badge";

interface SharpPick {
  id: string;
  game: string;
  sport: string;
  pick: string;
  odds: number;
  sharpConsensus: number;
  publicConsensus: number;
  sharpSources: { name: string; pick: string; confidence: number }[];
  roi7Day: number;
  roi30Day: number;
  grade: "A" | "B" | "C" | "D";
  reasoning: string;
}

function getMockSharpPicks(): SharpPick[] {
  return [
    {
      id: "1",
      game: "Chiefs vs Raiders",
      sport: "NFL",
      pick: "Chiefs -6.5",
      odds: -110,
      sharpConsensus: 82,
      publicConsensus: 68,
      sharpSources: [
        { name: "Vegas Insider Pro", pick: "Chiefs -6.5", confidence: 88 },
        { name: "Sharp Action Report", pick: "Chiefs -6.5", confidence: 85 },
        { name: "Steam Moves", pick: "Chiefs -7", confidence: 78 },
        { name: "RAS Analytics", pick: "Chiefs -6.5", confidence: 82 },
      ],
      roi7Day: 8.2,
      roi30Day: 12.5,
      grade: "A",
      reasoning: "Strong RLM on Chiefs. Line moved from -5.5 to -7 despite 68% public on Chiefs. Sharp money loading.",
    },
    {
      id: "2",
      game: "Bills vs Dolphins",
      sport: "NFL",
      pick: "Under 49.5",
      odds: -108,
      sharpConsensus: 75,
      publicConsensus: 35,
      sharpSources: [
        { name: "Contrarian Report", pick: "Under 49.5", confidence: 82 },
        { name: "Weather Model", pick: "Under 50", confidence: 78 },
        { name: "Sharp Action Report", pick: "Under 49.5", confidence: 71 },
      ],
      roi7Day: 5.8,
      roi30Day: 9.2,
      grade: "B",
      reasoning: "Classic fade spot. 65% of public on Over but line moving down. Wind expected 15+ mph.",
    },
    {
      id: "3",
      game: "Suns vs Nuggets",
      sport: "NBA",
      pick: "Nuggets -5",
      odds: -105,
      sharpConsensus: 71,
      publicConsensus: 52,
      sharpSources: [
        { name: "NBA Analytics Pro", pick: "Nuggets -5", confidence: 75 },
        { name: "Sharp Action Report", pick: "Nuggets -4.5", confidence: 68 },
        { name: "Situational Model", pick: "Nuggets -5", confidence: 72 },
      ],
      roi7Day: 4.2,
      roi30Day: 7.8,
      grade: "B",
      reasoning: "Jokic dominance vs AD. Nuggets 18-3 at home this season. Rest advantage.",
    },
    {
      id: "4",
      game: "Cowboys vs Eagles",
      sport: "NFL",
      pick: "Eagles +1.5",
      odds: -110,
      sharpConsensus: 68,
      publicConsensus: 42,
      sharpSources: [
        { name: "Divisional Expert", pick: "Eagles +1.5", confidence: 72 },
        { name: "Sharp Action Report", pick: "Eagles PK", confidence: 65 },
      ],
      roi7Day: 3.5,
      roi30Day: 6.1,
      grade: "C",
      reasoning: "Divisional dog spot. Eagles 8-2 ATS as road underdog. Cowboys overvalued at home.",
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

export function SharpConsensus() {
  const [picks] = useState<SharpPick[]>(getMockSharpPicks());
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? picks : picks.filter(p => p.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">Sharp Analysis</span>
          <Badge variant="outline" className="gap-1">
            <Atom className="w-3 h-3" />
            Pro Intel
          </Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-sharp-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <QuantumAnalysisIndicator compact />

      <div className="grid gap-4">
        {filtered.map(pick => (
          <Card 
            key={pick.id}
            className={`${pick.sharpConsensus >= 75 ? "border-green-500/30 bg-green-500/5" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{pick.sport}</Badge>
                    <span className="font-medium">{pick.game}</span>
                    <Badge className={getGradeColor(pick.grade)}>Grade: {pick.grade}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{pick.pick}</span>
                    <Badge variant="outline">{pick.odds > 0 ? "+" : ""}{pick.odds}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Sharp Consensus</p>
                  <p className={`text-2xl font-bold ${pick.sharpConsensus >= 75 ? "text-green-500" : ""}`}>
                    {pick.sharpConsensus}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sharp Money</span>
                    <span className={pick.sharpConsensus >= 70 ? "text-green-500 font-medium" : ""}>
                      {pick.sharpConsensus}%
                    </span>
                  </div>
                  <Progress value={pick.sharpConsensus} className="h-2" />
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Public Money</span>
                    <span>{pick.publicConsensus}%</span>
                  </div>
                  <Progress value={pick.publicConsensus} className="h-2" />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Sharp Sources ({pick.sharpSources.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {pick.sharpSources.map((source, i) => (
                    <div key={i} className="p-2 bg-muted/30 rounded-lg flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="truncate">{source.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{source.confidence}%</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">7-Day ROI</p>
                  <p className={`font-bold ${pick.roi7Day > 0 ? "text-green-500" : "text-red-500"}`}>
                    {pick.roi7Day > 0 ? "+" : ""}{pick.roi7Day}%
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">30-Day ROI</p>
                  <p className={`font-bold ${pick.roi30Day > 0 ? "text-green-500" : "text-red-500"}`}>
                    {pick.roi30Day > 0 ? "+" : ""}{pick.roi30Day}%
                  </p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg mb-3">
                <p className="text-xs text-muted-foreground mb-1">Analysis</p>
                <p className="text-sm">{pick.reasoning}</p>
              </div>

              <Button className="w-full" data-testid={`button-add-sharp-${pick.id}`}>
                <Zap className="w-4 h-4 mr-2" />
                Add to Parlay
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
