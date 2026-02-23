import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, MapPin, TrendingUp, TrendingDown, Info } from "lucide-react";

interface TravelRestData {
  id: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeWinPct: number;
  awayWinPct: number;
  venue: string;
  homeAdvantage: boolean;
  advantageScore: number;
}

function deriveTravelData(games: any[]): TravelRestData[] {
  return games.map((g: any) => {
    const homeWinPct = g.homeTeam.winPct || 50;
    const awayWinPct = g.awayTeam.winPct || 50;
    const winPctDiff = homeWinPct - awayWinPct;
    const homeCourtBonus = 3;
    const advantageScore = Math.round((winPctDiff + homeCourtBonus) * 10) / 10;

    return {
      id: g.id,
      game: g.shortName,
      homeTeam: g.homeTeam.name,
      awayTeam: g.awayTeam.name,
      homeRecord: g.homeTeam.record,
      awayRecord: g.awayTeam.record,
      homeWinPct,
      awayWinPct,
      venue: g.venue || "TBD",
      homeAdvantage: advantageScore > 0,
      advantageScore,
    };
  }).sort((a: TravelRestData, b: TravelRestData) => Math.abs(b.advantageScore) - Math.abs(a.advantageScore));
}

export function TravelRestAnalyzer() {
  const [sport, setSport] = useState("NFL");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
  });

  const items = data?.games ? deriveTravelData(data.games) : [];

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
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Home/away advantage estimated from team records and home-court factor. Detailed travel and rest data not available from current data sources.</span>
        </div>

        {isLoading && (
          <div className="space-y-3" data-testid="loading-travel">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-destructive" data-testid="error-travel">
            Failed to load game data. Please try again.
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground" data-testid="empty-travel">
            No games available for {sport}.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`card-travel-${item.id}`}
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
                  <Badge variant="outline" className="text-xs">{sport}</Badge>
                  <p className="font-medium text-sm" data-testid={`text-travel-game-${item.id}`}>{item.game}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{item.venue}</span>
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

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">Home</p>
                <p className="font-bold">{item.homeRecord}</p>
                <p className="text-muted-foreground">{item.homeWinPct}%</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">Away</p>
                <p className="font-bold">{item.awayRecord}</p>
                <p className="text-muted-foreground">{item.awayWinPct}%</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">H/A Edge</p>
                <p className={`font-bold ${item.homeAdvantage ? "text-green-500" : "text-red-500"}`}>
                  {item.homeAdvantage ? "Home" : "Away"}
                </p>
              </div>
            </div>
          </div>
        ))}

        {data?.meta?.dataSources && (
          <div className="pt-2 text-xs text-muted-foreground text-center" data-testid="text-datasource-travel">
            Data: {data.meta.dataSources.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
