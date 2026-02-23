import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Home, Plane, AlertCircle, Database, TrendingUp, TrendingDown } from "lucide-react";

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  venue?: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  lineMovement: { market: string; opening: number; current: number; movement: number; direction: string; velocity: string; sharpAction: boolean }[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: string; hasArbitrage: boolean };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface VenueData {
  venue: string;
  games: MarketGame[];
  avgWinPct: number;
}

function groupByVenue(games: MarketGame[]): VenueData[] {
  const venueMap = new Map<string, MarketGame[]>();

  for (const game of games) {
    const venue = game.venue || "Unknown Venue";
    if (!venueMap.has(venue)) venueMap.set(venue, []);
    venueMap.get(venue)!.push(game);
  }

  return Array.from(venueMap.entries())
    .map(([venue, games]) => {
      const avgWinPct = games.reduce((sum, g) => sum + g.homeTeam.winPct, 0) / games.length;
      return { venue, games, avgWinPct };
    })
    .sort((a, b) => b.avgWinPct - a.avgWinPct);
}

export function VenuePerformance() {
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const venueData = useMemo(() => {
    if (!data?.games) return [];
    return groupByVenue(data.games);
  }, [data]);

  return (
    <div className="space-y-4" data-testid="venue-performance">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">Venue Performance Data</span>
          <Badge variant="outline">Location Analysis</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-venue-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Failed to load venue data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && venueData.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-venues">
              No venue data available for {sport} games.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {venueData.map(vd => (
          <Card key={vd.venue} data-testid={`card-venue-${vd.venue.replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              {vd.games.map(game => (
                <div key={game.id} className="mb-4 last:mb-0">
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge>{sport}</Badge>
                        <span className="font-semibold" data-testid={`text-venue-name-${game.id}`}>{vd.venue}</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-matchup-${game.id}`}>{game.shortName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="p-3 bg-background/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Home Win %</p>
                      <p className={`font-bold text-lg ${game.homeTeam.winPct >= 60 ? "text-green-500" : game.homeTeam.winPct <= 40 ? "text-red-500" : ""}`} data-testid={`text-home-winpct-${game.id}`}>
                        {game.homeTeam.winPct}%
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Spread</p>
                      <p className="font-bold text-lg" data-testid={`text-spread-${game.id}`}>
                        {game.consensus.spread !== undefined ? game.consensus.spread : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-lg" data-testid={`text-total-${game.id}`}>
                        {game.consensus.total !== undefined ? game.consensus.total : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Home className="w-3 h-3" /> Record
                      </p>
                      <p className="font-bold text-lg text-green-500" data-testid={`text-home-record-${game.id}`}>{game.homeTeam.record}</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Plane className="w-3 h-3" /> Record
                      </p>
                      <p className="font-bold text-lg" data-testid={`text-away-record-${game.id}`}>{game.awayTeam.record}</p>
                    </div>
                  </div>

                  {game.lineMovement.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {game.lineMovement.map((lm, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-lg flex items-center justify-between gap-2 ${
                            lm.direction === "up" ? "bg-green-500/10" :
                            lm.direction === "down" ? "bg-red-500/10" :
                            "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {lm.direction === "up" ? (
                              <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                            ) : lm.direction === "down" ? (
                              <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
                            )}
                            <span className="font-medium text-sm capitalize">{lm.market}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {lm.opening} to {lm.current} ({lm.velocity}{lm.sharpAction ? " - sharp" : ""})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {game.edgeAnalysis.valueSide && game.edgeAnalysis.valueSide !== "none" && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm">
                        Value edge: {game.edgeAnalysis.valueSide === "home" ? game.homeTeam.name : game.awayTeam.name} (EV: {game.edgeAnalysis.valueSide === "home" ? game.edgeAnalysis.homeEV.toFixed(2) : game.edgeAnalysis.awayEV.toFixed(2)})
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-data-source">
          <Database className="w-3 h-3" />
          <span>Data: {data.meta.dataSources.join(", ")} | {data.meta.totalGames} games | Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
