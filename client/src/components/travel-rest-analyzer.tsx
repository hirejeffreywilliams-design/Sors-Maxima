import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Moon, Clock, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface TravelRestData {
  id: string;
  team: string;
  opponent: string;
  restDays: number;
  opponentRestDays: number;
  travelMiles: number;
  timeZoneChange: number;
  backToBack: boolean;
  advantageScore: number;
  recommendation: string;
  sport: string;
}

function generateMockTravelData(): TravelRestData[] {
  return [
    {
      id: "tr-1",
      team: "Lakers",
      opponent: "Celtics",
      restDays: 1,
      opponentRestDays: 3,
      travelMiles: 2500,
      timeZoneChange: 3,
      backToBack: true,
      advantageScore: -12,
      recommendation: "Fade Lakers - significant rest and travel disadvantage",
      sport: "NBA",
    },
    {
      id: "tr-2",
      team: "Chiefs",
      opponent: "Raiders",
      restDays: 7,
      opponentRestDays: 7,
      travelMiles: 600,
      timeZoneChange: 1,
      backToBack: false,
      advantageScore: 2,
      recommendation: "Slight advantage to Chiefs (short travel)",
      sport: "NFL",
    },
    {
      id: "tr-3",
      team: "Warriors",
      opponent: "Nuggets",
      restDays: 2,
      opponentRestDays: 1,
      travelMiles: 950,
      timeZoneChange: 1,
      backToBack: false,
      advantageScore: 5,
      recommendation: "Warriors have rest edge - lean their way",
      sport: "NBA",
    },
    {
      id: "tr-4",
      team: "Bucks",
      opponent: "Heat",
      restDays: 0,
      opponentRestDays: 2,
      travelMiles: 1200,
      timeZoneChange: 0,
      backToBack: true,
      advantageScore: -8,
      recommendation: "Bucks on B2B with travel - fade or avoid",
      sport: "NBA",
    },
  ];
}

export function TravelRestAnalyzer() {
  const [sport, setSport] = useState("all");
  const [data] = useState<TravelRestData[]>(generateMockTravelData());

  const filteredData = sport === "all" 
    ? data 
    : data.filter(d => d.sport.toLowerCase() === sport);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-chart-3" />
            Travel & Rest Analyzer
          </CardTitle>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-24" data-testid="select-travel-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="nba">NBA</SelectItem>
              <SelectItem value="nfl">NFL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredData.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg border ${
              item.advantageScore > 5
                ? "bg-green-500/10 border-green-500/30"
                : item.advantageScore < -5
                ? "bg-red-500/10 border-red-500/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{item.sport}</Badge>
                  <p className="font-medium text-sm">{item.team} @ {item.opponent}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {item.advantageScore > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`font-bold ${item.advantageScore > 0 ? "text-green-500" : "text-red-500"}`}>
                  {item.advantageScore > 0 ? "+" : ""}{item.advantageScore}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs mb-3">
              <div className="text-center p-2 bg-background/50 rounded">
                <Moon className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-muted-foreground">Rest</p>
                <p className="font-bold">{item.restDays}d vs {item.opponentRestDays}d</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <Plane className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-muted-foreground">Travel</p>
                <p className="font-bold">{item.travelMiles} mi</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <Clock className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-muted-foreground">TZ Change</p>
                <p className="font-bold">{item.timeZoneChange}h</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <AlertTriangle className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-muted-foreground">B2B</p>
                <p className={`font-bold ${item.backToBack ? "text-red-500" : "text-green-500"}`}>
                  {item.backToBack ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{item.recommendation}</p>
          </div>
        ))}

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Historical data shows rest advantages worth 2-3 points in NBA
        </div>
      </CardContent>
    </Card>
  );
}
