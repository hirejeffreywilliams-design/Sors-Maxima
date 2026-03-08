import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, DollarSign, ArrowLeftRight, AlertTriangle, Target,
  TrendingUp, BarChart3, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface EdgeFinderProps {
  sport?: string;
}

interface MarketGame {
  id: string;
  shortName: string;
  homeTeam: { name: string; abbreviation: string; record: string };
  awayTeam: { name: string; abbreviation: string; record: string };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  bookmakers: {
    book: string;
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    overPrice?: number;
    underPrice?: number;
  }[];
  lineMovement: {
    market: string;
    opening: number;
    current: number;
    movement: number;
    direction: "up" | "down" | "stable";
    velocity: "slow" | "moderate" | "fast" | "steam";
    sharpAction: boolean;
  }[];
  bestLines: {
    bestHomeML?: { odds: number; book: string };
    bestAwayML?: { odds: number; book: string };
    bestSpreadHome?: { line: number; odds: number; book: string };
    bestSpreadAway?: { line: number; odds: number; book: string };
    bestOver?: { total: number; odds: number; book: string };
    bestUnder?: { total: number; odds: number; book: string };
  };
  edgeAnalysis: {
    homeEV: number;
    awayEV: number;
    hasArbitrage: boolean;
    arbProfit?: number;
    middleOpportunity: boolean;
    middleRange?: string;
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
    bookmakerCount: number;
    dataSources: string[];
    generatedAt: string;
  };
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"] as const;

const KEY_NUMBERS: Record<string, number[]> = {
  NFL: [3, 7, 10, 14],
  NCAAF: [3, 7, 10, 14],
  NBA: [3, 5, 7],
  NCAAB: [3, 5, 7],
};

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-6 text-sm text-muted-foreground" data-testid="text-empty-state">
      {message}
    </div>
  );
}

export function EdgeFinder({ sport: sportProp }: EdgeFinderProps) {
  const [internalSport, setInternalSport] = useState("NBA");
  const selectedSport = sportProp || internalSport;

  const { data, isLoading, isError } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch market snapshot");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const [activeTab, setActiveTab] = useState("arbs");

  const games = data?.games || [];

  const arbitrages = useMemo(() =>
    games.filter(g => g.edgeAnalysis.hasArbitrage && g.edgeAnalysis.arbProfit),
    [games]
  );

  const middles = useMemo(() =>
    games.filter(g => g.edgeAnalysis.middleOpportunity && g.edgeAnalysis.middleRange),
    [games]
  );

  const keyNumbers = useMemo(() => {
    const nums = KEY_NUMBERS[selectedSport];
    if (!nums) return [];
    return games.filter(g => {
      if (g.consensus.spread === undefined) return false;
      const absSpread = Math.abs(g.consensus.spread);
      return nums.some(k => Math.abs(absSpread - k) <= 0.5);
    }).map(g => {
      const absSpread = Math.abs(g.consensus.spread!);
      const keyNum = KEY_NUMBERS[selectedSport]!.reduce((closest, k) =>
        Math.abs(absSpread - k) < Math.abs(absSpread - closest) ? k : closest
      );
      return { game: g, keyNumber: keyNum };
    });
  }, [games, selectedSport]);

  const valuePlays = useMemo(() =>
    games.filter(g =>
      g.edgeAnalysis.valueSide !== "none" &&
      g.edgeAnalysis.valueSide !== undefined &&
      (g.edgeAnalysis.homeEV > 0 || g.edgeAnalysis.awayEV > 0)
    ),
    [games]
  );

  const bestLineGames = useMemo(() =>
    games.filter(g =>
      g.bestLines.bestHomeML || g.bestLines.bestAwayML ||
      g.bestLines.bestSpreadHome || g.bestLines.bestOver
    ),
    [games]
  );

  const sharpMoney = useMemo(() =>
    games.filter(g =>
      g.lineMovement.some(lm => lm.sharpAction || lm.velocity === "steam" || lm.velocity === "fast")
    ),
    [games]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Zap className="w-5 h-5 text-yellow-500" />
            Intelligence Edge™ Finder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Zap className="w-5 h-5 text-yellow-500" />
            Intelligence Edge™ Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-destructive" data-testid="text-error">
            Failed to load market data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Zap className="w-5 h-5 text-yellow-500" />
          Intelligence Edge™ Finder
          {data?.meta && (
            <Badge variant="outline" className="text-xs font-normal">
              {data.meta.gamesWithOdds}/{data.meta.totalGames} games with odds
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sportProp && (
          <Select value={selectedSport} onValueChange={setInternalSport}>
            <SelectTrigger data-testid="select-sport">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map(s => (
                <SelectItem key={s} value={s} data-testid={`select-sport-${s}`}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="arbs" className="text-xs" data-testid="tab-arbs">
              <DollarSign className="w-3 h-3 mr-1" />
              Arb
            </TabsTrigger>
            <TabsTrigger value="middles" className="text-xs" data-testid="tab-middles">
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              Mid
            </TabsTrigger>
            <TabsTrigger value="keynums" className="text-xs" data-testid="tab-keynums">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Key#
            </TabsTrigger>
            <TabsTrigger value="value" className="text-xs" data-testid="tab-value">
              <Target className="w-3 h-3 mr-1" />
              Value
            </TabsTrigger>
            <TabsTrigger value="bestlines" className="text-xs" data-testid="tab-bestlines">
              <BarChart3 className="w-3 h-3 mr-1" />
              Best
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <TabsContent value="arbs" className="mt-0 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Arbitrage Opportunities
              </div>
              {arbitrages.length === 0 ? (
                <EmptyState message="No arbitrage opportunities found right now" />
              ) : (
                arbitrages.map(game => (
                  <Card key={game.id} className="bg-green-500/10 border-green-500/30" data-testid={`card-arb-${game.id}`}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                        <span className="text-sm font-medium">{game.shortName}</span>
                        <Badge className="bg-green-500 text-white">
                          +{game.edgeAnalysis.arbProfit?.toFixed(2)}%
                        </Badge>
                      </div>
                      {game.bestLines.bestHomeML && game.bestLines.bestAwayML && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground">{game.bestLines.bestHomeML.book}</div>
                            <div className="font-medium">{game.homeTeam.abbreviation}</div>
                            <div className="font-mono">{formatOdds(game.bestLines.bestHomeML.odds)}</div>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground">{game.bestLines.bestAwayML.book}</div>
                            <div className="font-medium">{game.awayTeam.abbreviation}</div>
                            <div className="font-mono">{formatOdds(game.bestLines.bestAwayML.odds)}</div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {game.dataSource}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="middles" className="mt-0 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                Middle Opportunities
              </div>
              {middles.length === 0 ? (
                <EmptyState message="No middle opportunities found right now" />
              ) : (
                middles.map(game => {
                  const spreadValues = game.bookmakers.map(b => b.spread).filter((v): v is number => v !== undefined);
                  const minSpread = spreadValues.length > 0 ? Math.min(...spreadValues) : null;
                  const maxSpread = spreadValues.length > 0 ? Math.max(...spreadValues) : null;
                  return (
                    <Card key={game.id} className="bg-blue-500/10 border-blue-500/30" data-testid={`card-middle-${game.id}`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                          <span className="text-sm font-medium">{game.shortName}</span>
                          <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                            Middle
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Range: {game.edgeAnalysis.middleRange}
                        </div>
                        {minSpread !== null && maxSpread !== null && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {game.bookmakers
                              .filter(b => b.spread === minSpread || b.spread === maxSpread)
                              .slice(0, 2)
                              .map((bk, i) => (
                                <div key={i} className="p-2 rounded bg-background/50">
                                  <div className="text-muted-foreground">{bk.book}</div>
                                  <div className="font-mono">Spread: {bk.spread}</div>
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {game.dataSource}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="keynums" className="mt-0 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Key Number Alerts
              </div>
              {keyNumbers.length === 0 ? (
                <EmptyState message={
                  KEY_NUMBERS[selectedSport]
                    ? "No games at key numbers right now"
                    : `Key number tracking not available for ${selectedSport}`
                } />
              ) : (
                keyNumbers.map(({ game, keyNumber }) => (
                  <Card key={game.id} className="bg-amber-500/10 border-amber-500/30" data-testid={`card-keynum-${game.id}`}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                        <span className="text-sm font-medium">{game.shortName}</span>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                          Key #{keyNumber}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Spread:</span>
                          <span className="font-mono">
                            {game.consensus.spread! > 0 ? "+" : ""}{game.consensus.spread}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Near Key Number:</span>
                          <span className="font-mono text-amber-400">{keyNumber}</span>
                        </div>
                        {game.consensus.total && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-mono">{game.consensus.total}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {game.dataSource}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="value" className="mt-0 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Value Plays
              </div>
              {valuePlays.length === 0 ? (
                <EmptyState message="No value plays identified right now" />
              ) : (
                valuePlays.map(game => {
                  const side = game.edgeAnalysis.valueSide;
                  const ev = side === "home" ? game.edgeAnalysis.homeEV : game.edgeAnalysis.awayEV;
                  const teamName = side === "home" ? game.homeTeam.name : game.awayTeam.name;
                  const teamAbbr = side === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;
                  return (
                    <Card key={game.id} className="bg-purple-500/10 border-purple-500/30" data-testid={`card-value-${game.id}`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                          <span className="text-sm font-medium">{game.shortName}</span>
                          <Badge className="bg-purple-500 text-white">
                            {ev > 0 ? "+" : ""}{ev.toFixed(2)} Intelligence Edge™
                          </Badge>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Value Side:</span>
                            <span className="font-medium">{teamAbbr} ({teamName})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Home EV:</span>
                            <span className={game.edgeAnalysis.homeEV > 0 ? "text-green-400" : "text-red-400"}>
                              {game.edgeAnalysis.homeEV > 0 ? "+" : ""}{game.edgeAnalysis.homeEV.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Away EV:</span>
                            <span className={game.edgeAnalysis.awayEV > 0 ? "text-green-400" : "text-red-400"}>
                              {game.edgeAnalysis.awayEV > 0 ? "+" : ""}{game.edgeAnalysis.awayEV.toFixed(2)}
                            </span>
                          </div>
                          {game.consensus.spread !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Spread:</span>
                              <span className="font-mono">{game.consensus.spread > 0 ? "+" : ""}{game.consensus.spread}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {game.dataSource}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {sharpMoney.length > 0 && (
                <>
                  <div className="text-sm font-medium flex items-center gap-2 mt-4">
                    <TrendingUp className="w-4 h-4 text-cyan-500" />
                    Sharp Money Signals
                  </div>
                  {sharpMoney.map(game => {
                    const sharpMovements = game.lineMovement.filter(
                      lm => lm.sharpAction || lm.velocity === "steam" || lm.velocity === "fast"
                    );
                    return (
                      <Card key={`sharp-${game.id}`} className="bg-cyan-500/10 border-cyan-500/30" data-testid={`card-sharp-${game.id}`}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                            <span className="text-sm font-medium">{game.shortName}</span>
                            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                              Sharp Action
                            </Badge>
                          </div>
                          {sharpMovements.map((lm, i) => (
                            <div key={i} className="text-xs space-y-1 mb-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground capitalize">{lm.market}:</span>
                                <span className="font-mono">{lm.opening} {lm.direction === "up" ? ">" : lm.direction === "down" ? "<" : "="} {lm.current}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Velocity:</span>
                                <Badge variant="outline" className={
                                  lm.velocity === "steam" ? "border-red-500/50 text-red-400" :
                                  lm.velocity === "fast" ? "border-amber-500/50 text-amber-400" :
                                  ""
                                }>
                                  {lm.velocity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {game.dataSource}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>

            <TabsContent value="bestlines" className="mt-0 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Best Lines by Game
              </div>
              {bestLineGames.length === 0 ? (
                <EmptyState message="No line comparisons available" />
              ) : (
                bestLineGames.map(game => (
                  <Card key={game.id} className="bg-muted/30" data-testid={`card-bestline-${game.id}`}>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium mb-2">{game.shortName}</div>
                      <div className="space-y-1.5 text-xs">
                        {game.bestLines.bestHomeML && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{game.homeTeam.abbreviation} ML:</span>
                            <span>
                              <span className="font-mono">{formatOdds(game.bestLines.bestHomeML.odds)}</span>
                              <span className="text-muted-foreground ml-1">({game.bestLines.bestHomeML.book})</span>
                            </span>
                          </div>
                        )}
                        {game.bestLines.bestAwayML && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{game.awayTeam.abbreviation} ML:</span>
                            <span>
                              <span className="font-mono">{formatOdds(game.bestLines.bestAwayML.odds)}</span>
                              <span className="text-muted-foreground ml-1">({game.bestLines.bestAwayML.book})</span>
                            </span>
                          </div>
                        )}
                        {game.bestLines.bestSpreadHome && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{game.homeTeam.abbreviation} Spread:</span>
                            <span>
                              <span className="font-mono">{game.bestLines.bestSpreadHome.line > 0 ? "+" : ""}{game.bestLines.bestSpreadHome.line} ({formatOdds(game.bestLines.bestSpreadHome.odds)})</span>
                              <span className="text-muted-foreground ml-1">({game.bestLines.bestSpreadHome.book})</span>
                            </span>
                          </div>
                        )}
                        {game.bestLines.bestOver && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Over:</span>
                            <span>
                              <span className="font-mono">{game.bestLines.bestOver.total} ({formatOdds(game.bestLines.bestOver.odds)})</span>
                              <span className="text-muted-foreground ml-1">({game.bestLines.bestOver.book})</span>
                            </span>
                          </div>
                        )}
                        {game.bestLines.bestUnder && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Under:</span>
                            <span>
                              <span className="font-mono">{game.bestLines.bestUnder.total} ({formatOdds(game.bestLines.bestUnder.odds)})</span>
                              <span className="text-muted-foreground ml-1">({game.bestLines.bestUnder.book})</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {game.bookmakers.length} books compared
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {data?.meta && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t gap-2 flex-wrap">
            <span data-testid="text-data-sources">
              Sources: {data.meta.dataSources.join(", ")}
            </span>
            <span data-testid="text-generated-at">
              {new Date(data.meta.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}