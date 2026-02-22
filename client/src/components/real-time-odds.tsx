import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingUp, TrendingDown, Zap, Clock, AlertTriangle } from "lucide-react";

const SPORTS = [
  { value: "NBA", label: "NBA" },
  { value: "NFL", label: "NFL" },
  { value: "MLB", label: "MLB" },
  { value: "NHL", label: "NHL" },
  { value: "NCAAF", label: "NCAAF" },
  { value: "NCAAB", label: "NCAAB" },
];

function formatOdds(value: number | undefined): string {
  if (value === undefined || value === null) return "-";
  return value > 0 ? `+${value}` : `${value}`;
}

function formatSpread(value: number | undefined): string {
  if (value === undefined || value === null) return "-";
  return value > 0 ? `+${value}` : `${value}`;
}

export function RealTimeOdds() {
  const [selectedSport, setSelectedSport] = useState("NBA");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<{
    games: Array<{
      id: string;
      shortName: string;
      date: string;
      homeTeam: { name: string; abbreviation: string; record: string };
      awayTeam: { name: string; abbreviation: string; record: string };
      status: { state: string; detail: string };
      consensus: {
        homeMoneyline?: number;
        awayMoneyline?: number;
        spread?: number;
        total?: number;
      };
      bookmakers: Array<{
        book: string;
        homeMoneyline?: number;
        awayMoneyline?: number;
        spread?: number;
        spreadHome?: number;
        spreadAway?: number;
        total?: number;
        overPrice?: number;
        underPrice?: number;
      }>;
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
        valueSide?: string;
      };
      dataSource: string;
    }>;
    meta: {
      sport: string;
      totalGames: number;
      gamesWithOdds: number;
      bookmakerCount: number;
      dataSources: string[];
      generatedAt: string;
    };
  }>({
    queryKey: ["/api/market-snapshot", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch odds");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const games = data?.games ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedSport} onValueChange={setSelectedSport} data-testid="select-sport">
            <SelectTrigger className="w-36" data-testid="select-sport-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value} data-testid={`select-sport-option-${s.value}`}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {meta && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {meta.gamesWithOdds}/{meta.totalGames} games with odds
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-odds"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {meta && meta.dataSources.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-data-sources">
          Data: {meta.dataSources.join(", ")}
          {meta.generatedAt && (
            <span>
              {" "}| Updated {new Date(meta.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4" data-testid="loading-skeleton">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground" data-testid="text-error">
              Failed to load odds: {(error as Error)?.message || "Unknown error"}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()} data-testid="button-retry">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && games.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center" data-testid="text-empty-state">
            <p className="text-muted-foreground">No upcoming games found for {selectedSport}.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {games.map((game) => {
          const bestHomeMLBook = game.bestLines.bestHomeML?.book;
          const bestAwayMLBook = game.bestLines.bestAwayML?.book;
          const bestSpreadBook = game.bestLines.bestSpreadHome?.book;
          const bestOverBook = game.bestLines.bestOver?.book;
          const bestUnderBook = game.bestLines.bestUnder?.book;

          return (
            <Card key={game.id} data-testid={`card-game-${game.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base" data-testid={`text-matchup-${game.id}`}>
                      {game.shortName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {game.homeTeam.record}
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <Badge variant="outline" className="text-xs">
                      {game.awayTeam.record}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {game.edgeAnalysis.valueSide && game.edgeAnalysis.valueSide !== "none" && (
                      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" variant="outline">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Value: {game.edgeAnalysis.valueSide === "home" ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}
                      </Badge>
                    )}
                    {game.edgeAnalysis.hasArbitrage && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" variant="outline">
                        <Zap className="w-3 h-3 mr-1" />
                        Arb {game.edgeAnalysis.arbProfit ? `+${game.edgeAnalysis.arbProfit}%` : ""}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{game.status.detail}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Consensus Spread</p>
                    <span className="font-bold text-lg">
                      {game.consensus.spread !== undefined ? formatSpread(game.consensus.spread) : "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Consensus Total</p>
                    <span className="font-bold text-lg">
                      {game.consensus.total !== undefined ? game.consensus.total : "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Moneyline</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{game.homeTeam.abbreviation}</span>
                      <span className="font-bold">{formatOdds(game.consensus.homeMoneyline)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-sm">{game.awayTeam.abbreviation}</span>
                      <span className="font-bold">{formatOdds(game.consensus.awayMoneyline)}</span>
                    </div>
                  </div>
                </div>

                {game.bestLines.bestHomeML && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {game.bestLines.bestHomeML && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        Best {game.homeTeam.abbreviation} ML: {formatOdds(game.bestLines.bestHomeML.odds)} @ {game.bestLines.bestHomeML.book}
                      </div>
                    )}
                    {game.bestLines.bestAwayML && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        Best {game.awayTeam.abbreviation} ML: {formatOdds(game.bestLines.bestAwayML.odds)} @ {game.bestLines.bestAwayML.book}
                      </div>
                    )}
                    {game.bestLines.bestOver && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        Best Over: {formatOdds(game.bestLines.bestOver.odds)} @ {game.bestLines.bestOver.book}
                      </div>
                    )}
                  </div>
                )}

                {game.bookmakers.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Book</TableHead>
                          <TableHead className="text-center">{game.homeTeam.abbreviation} ML</TableHead>
                          <TableHead className="text-center">{game.awayTeam.abbreviation} ML</TableHead>
                          <TableHead className="text-center">Spread</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Over</TableHead>
                          <TableHead className="text-center">Under</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {game.bookmakers.map((bk) => (
                          <TableRow key={bk.book} data-testid={`row-book-${game.id}-${bk.book}`}>
                            <TableCell className="font-medium text-sm">{bk.book}</TableCell>
                            <TableCell className={`text-center ${bk.book === bestHomeMLBook ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
                              {formatOdds(bk.homeMoneyline)}
                            </TableCell>
                            <TableCell className={`text-center ${bk.book === bestAwayMLBook ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
                              {formatOdds(bk.awayMoneyline)}
                            </TableCell>
                            <TableCell className={`text-center ${bk.book === bestSpreadBook ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
                              {bk.spread !== undefined ? formatSpread(bk.spread) : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {bk.total !== undefined ? bk.total : "-"}
                            </TableCell>
                            <TableCell className={`text-center ${bk.book === bestOverBook ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
                              {bk.overPrice !== undefined ? formatOdds(bk.overPrice) : "-"}
                            </TableCell>
                            <TableCell className={`text-center ${bk.book === bestUnderBook ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
                              {bk.underPrice !== undefined ? formatOdds(bk.underPrice) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {game.bookmakers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No bookmaker odds available for this game.
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                  <span data-testid={`text-source-${game.id}`}>Source: {game.dataSource}</span>
                  {(game.edgeAnalysis.homeEV !== 0 || game.edgeAnalysis.awayEV !== 0) && (
                    <div className="flex items-center gap-3">
                      <span className={game.edgeAnalysis.homeEV > 0 ? "text-green-600 dark:text-green-400" : ""}>
                        {game.homeTeam.abbreviation} EV: {game.edgeAnalysis.homeEV > 0 ? "+" : ""}{game.edgeAnalysis.homeEV}
                      </span>
                      <span className={game.edgeAnalysis.awayEV > 0 ? "text-green-600 dark:text-green-400" : ""}>
                        {game.awayTeam.abbreviation} EV: {game.edgeAnalysis.awayEV > 0 ? "+" : ""}{game.edgeAnalysis.awayEV}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
