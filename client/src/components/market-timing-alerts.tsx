import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Zap, Target, Activity } from "lucide-react";

interface OddsEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  markets: any[];
}

interface MarketTimingAlertsProps {
  events?: OddsEvent[];
}

interface LineMovementData {
  market: string;
  opening: number;
  current: number;
  movement: number;
  direction: "up" | "down" | "stable";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
}

interface MarketGame {
  id: string;
  shortName: string;
  date: string;
  homeTeam: { name: string; abbreviation: string; record: string };
  awayTeam: { name: string; abbreviation: string; record: string };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
  };
  lineMovement: LineMovementData[];
  edgeAnalysis: {
    homeEV: number;
    awayEV: number;
    valueSide?: "home" | "away" | "none";
  };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    dataSources: string[];
    generatedAt: string;
  };
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as const;

function getVelocityColor(velocity: string) {
  switch (velocity) {
    case "steam": return "bg-red-500 text-white";
    case "fast": return "bg-orange-500 text-white";
    case "moderate": return "bg-yellow-500 text-black";
    default: return "bg-muted";
  }
}

function getWindowUrgency(gameDate: string): { minutes: number; urgency: "low" | "medium" | "high" | "critical" } {
  const diff = Math.max(0, Math.round((new Date(gameDate).getTime() - Date.now()) / 60000));
  const urgency = diff < 30 ? "critical" : diff < 60 ? "high" : diff < 120 ? "medium" : "low" as const;
  return { minutes: diff, urgency };
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case "critical": return "bg-red-500 text-white animate-pulse";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    default: return "bg-muted";
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" data-testid="skeleton-loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-3 rounded-lg border">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketTimingAlerts({ events }: MarketTimingAlertsProps = {}) {
  const [selectedSport, setSelectedSport] = useState<string>("NBA");

  const { data, isLoading, isError, error } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", `?sport=${selectedSport}`],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const games = data?.games ?? [];

  const lineMovements = games.flatMap((game) =>
    game.lineMovement.map((lm, idx) => ({
      ...lm,
      gameId: game.id,
      gameName: game.shortName,
      gameIdx: idx,
    }))
  );

  const valueWindows = games
    .filter(
      (game) =>
        game.edgeAnalysis.valueSide !== "none" &&
        (game.edgeAnalysis.homeEV > 0 || game.edgeAnalysis.awayEV > 0)
    )
    .map((game) => {
      const { minutes, urgency } = getWindowUrgency(game.date);
      const side = game.edgeAnalysis.valueSide === "home" ? game.homeTeam : game.awayTeam;
      const ev = game.edgeAnalysis.valueSide === "home" ? game.edgeAnalysis.homeEV : game.edgeAnalysis.awayEV;
      const odds = game.edgeAnalysis.valueSide === "home" ? game.consensus.homeMoneyline : game.consensus.awayMoneyline;
      return {
        gameId: game.id,
        gameName: game.shortName,
        side: side.abbreviation,
        sideName: side.name,
        ev,
        odds,
        spread: game.consensus.spread,
        minutes,
        urgency,
      };
    })
    .sort((a, b) => a.minutes - b.minutes);

  const sharpAlerts = games.flatMap((game) =>
    game.lineMovement
      .filter((lm) => lm.sharpAction)
      .map((lm, idx) => ({
        ...lm,
        gameId: game.id,
        gameName: game.shortName,
        gameIdx: idx,
      }))
  );

  return (
    <Card data-testid="card-market-timing-alerts">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Sors Drift Alert™ System
          </CardTitle>
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[120px]" data-testid="select-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((sport) => (
                <SelectItem key={sport} value={sport} data-testid={`select-sport-${sport}`}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {data?.meta?.dataSources && data.meta.dataSources.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3" data-testid="text-data-sources">
            <span>Sources:</span>
            {data.meta.dataSources.map((src) => (
              <Badge key={src} variant="outline" className="text-xs">
                {src}
              </Badge>
            ))}
            {data.meta.generatedAt && (
              <span className="ml-auto">
                Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4" data-testid="banner-error">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Failed to load market data: {(error as Error)?.message ?? "Unknown error"}</span>
          </div>
        )}

        <Tabs defaultValue="movements">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="movements" className="flex items-center gap-1" data-testid="tab-movements">
              <Activity className="h-3 w-3" />
              Market Drift™
            </TabsTrigger>
            <TabsTrigger value="windows" className="flex items-center gap-1" data-testid="tab-windows">
              <Target className="h-3 w-3" />
              Value Windows
            </TabsTrigger>
            <TabsTrigger value="sharp" className="flex items-center gap-1" data-testid="tab-sharp">
              <Zap className="h-3 w-3" />
              Sors Signal™
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : lineMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-movements">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No Market Drift™ detected</p>
                <p className="text-xs">Check back closer to game time</p>
              </div>
            ) : (
              lineMovements.map((lm) => (
                <div key={`${lm.gameId}-${lm.market}-${lm.gameIdx}`} className="p-3 rounded-lg border bg-card" data-testid={`card-movement-${lm.gameId}-${lm.market}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-game-${lm.gameId}`}>{lm.gameName}</p>
                      <p className="text-xs text-muted-foreground">{lm.market}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getVelocityColor(lm.velocity)} data-testid={`badge-velocity-${lm.velocity}`}>
                        {lm.velocity === "steam" && <Zap className="h-3 w-3 mr-1" />}
                        {lm.velocity.toUpperCase()}
                      </Badge>
                      {lm.sharpAction && (
                        <Badge variant="destructive" data-testid="badge-sharp">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sharp
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Open:</span>{" "}
                      <span className="font-medium" data-testid="text-opening">{lm.opening > 0 ? "+" : ""}{lm.opening}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current:</span>{" "}
                      <span className="font-medium" data-testid="text-current">{lm.current > 0 ? "+" : ""}{lm.current}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {lm.direction === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : lm.direction === "down" ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : null}
                      <span className={lm.direction === "up" ? "text-green-500" : lm.direction === "down" ? "text-red-500" : "text-muted-foreground"} data-testid="text-movement">
                        {lm.movement > 0 ? "+" : ""}{lm.movement} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="windows" className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : valueWindows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-windows">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No value windows detected</p>
                <p className="text-xs">Markets are efficiently priced right now</p>
              </div>
            ) : (
              valueWindows.map((vw) => (
                <div key={vw.gameId} className="p-3 rounded-lg border bg-card" data-testid={`card-value-${vw.gameId}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-value-game-${vw.gameId}`}>{vw.gameName}</p>
                      <p className="text-xs text-muted-foreground">Value on: {vw.sideName} ({vw.side})</p>
                    </div>
                    <Badge className={getUrgencyColor(vw.urgency)} data-testid={`badge-urgency-${vw.urgency}`}>
                      {vw.minutes < 1440 ? `${vw.minutes}m to tip` : `${Math.round(vw.minutes / 60)}h to tip`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Odds:</span>{" "}
                      <span className="font-medium" data-testid="text-odds">
                        {vw.odds !== undefined ? (vw.odds > 0 ? `+${vw.odds}` : vw.odds) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spread:</span>{" "}
                      <span className="font-medium" data-testid="text-spread">
                        {vw.spread !== undefined ? (vw.spread > 0 ? `+${vw.spread}` : vw.spread) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EV:</span>{" "}
                      <span className={`font-medium ${vw.ev > 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-ev">
                        {vw.ev > 0 ? "+" : ""}{(vw.ev * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="sharp" className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : sharpAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-sharp">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sharp action detected currently</p>
                <p className="text-xs">Monitoring for coordinated sharp moves...</p>
              </div>
            ) : (
              sharpAlerts.map((sa) => (
                <div key={`${sa.gameId}-${sa.market}-${sa.gameIdx}`} className="p-3 rounded-lg border bg-card" data-testid={`card-sharp-${sa.gameId}-${sa.market}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-sharp-game-${sa.gameId}`}>{sa.gameName}</p>
                      <p className="text-xs text-muted-foreground">{sa.market}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getVelocityColor(sa.velocity)} data-testid={`badge-velocity-${sa.velocity}`}>
                        {sa.velocity === "steam" && <Zap className="h-3 w-3 mr-1" />}
                        {sa.velocity.toUpperCase()}
                      </Badge>
                      <Badge variant="destructive" data-testid="badge-sharp-alert">
                        <Zap className="h-3 w-3 mr-1" />
                        Sors Signal™
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Open:</span>{" "}
                      <span className="font-medium">{sa.opening > 0 ? "+" : ""}{sa.opening}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current:</span>{" "}
                      <span className="font-medium">{sa.current > 0 ? "+" : ""}{sa.current}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {sa.direction === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : sa.direction === "down" ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : null}
                      <span className={sa.direction === "up" ? "text-green-500" : sa.direction === "down" ? "text-red-500" : "text-muted-foreground"}>
                        {sa.velocity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
