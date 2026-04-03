import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Percent, Calculator, CircleDot, AlertCircle, Database, User, TrendingUp } from "lucide-react";

interface PlayerPropArb {
  player: string;
  stat: string;
  sport: string;
  lineGap: number;
  edge: number;
}

interface AnalyticsDashboard {
  arbitrage?: {
    playerPropsArbitrage?: PlayerPropArb[];
  };
}

interface BookmakerOdds {
  book: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  total?: number;
}

interface BestLineEntry {
  odds: number;
  book: string;
  line?: number;
  total?: number;
}

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  venue?: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  bookmakers: BookmakerOdds[];
  bestLines: {
    bestHomeML?: BestLineEntry;
    bestAwayML?: BestLineEntry;
    bestSpreadHome?: BestLineEntry;
    bestSpreadAway?: BestLineEntry;
    bestOver?: BestLineEntry;
    bestUnder?: BestLineEntry;
  };
  edgeAnalysis: { homeEV: number; awayEV: number; hasArbitrage: boolean; arbProfit?: number; valueSide?: string };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface DerivedArb {
  id: string;
  event: string;
  bookA: string;
  bookAOdds: number;
  bookASide: string;
  bookB: string;
  bookBOdds: number;
  bookBSide: string;
  arbPct: number;
  bookmakerCount: number;
}

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

function deriveArbs(games: MarketGame[]): DerivedArb[] {
  const arbs: DerivedArb[] = [];

  for (const game of games) {
    if (game.edgeAnalysis.hasArbitrage && game.edgeAnalysis.arbProfit && game.bestLines.bestHomeML && game.bestLines.bestAwayML) {
      arbs.push({
        id: `${game.id}-ml`,
        event: game.shortName,
        bookA: game.bestLines.bestHomeML.book,
        bookAOdds: americanToDecimal(game.bestLines.bestHomeML.odds),
        bookASide: `${game.homeTeam.abbreviation} ML`,
        bookB: game.bestLines.bestAwayML.book,
        bookBOdds: americanToDecimal(game.bestLines.bestAwayML.odds),
        bookBSide: `${game.awayTeam.abbreviation} ML`,
        arbPct: game.edgeAnalysis.arbProfit,
        bookmakerCount: game.bookmakers.length,
      });
    }

    if (game.bookmakers.length >= 2) {
      let bestHomeML = -Infinity;
      let bestAwayML = -Infinity;
      let bestHomeBook = "";
      let bestAwayBook = "";
      for (const bk of game.bookmakers) {
        if (bk.homeMoneyline !== undefined && bk.homeMoneyline > bestHomeML) {
          bestHomeML = bk.homeMoneyline;
          bestHomeBook = bk.book;
        }
        if (bk.awayMoneyline !== undefined && bk.awayMoneyline > bestAwayML) {
          bestAwayML = bk.awayMoneyline;
          bestAwayBook = bk.book;
        }
      }
      if (bestHomeML > -Infinity && bestAwayML > -Infinity) {
        const homeDecimal = americanToDecimal(bestHomeML);
        const awayDecimal = americanToDecimal(bestAwayML);
        const totalImplied = 1 / homeDecimal + 1 / awayDecimal;
        if (totalImplied < 1 && !game.edgeAnalysis.hasArbitrage) {
          const profit = Math.round((1 / totalImplied - 1) * 10000) / 100;
          arbs.push({
            id: `${game.id}-ml-derived`,
            event: game.shortName,
            bookA: bestHomeBook,
            bookAOdds: homeDecimal,
            bookASide: `${game.homeTeam.abbreviation} ML`,
            bookB: bestAwayBook,
            bookBOdds: awayDecimal,
            bookBSide: `${game.awayTeam.abbreviation} ML`,
            arbPct: profit,
            bookmakerCount: game.bookmakers.length,
          });
        }
      }
    }
  }

  return arbs.sort((a, b) => b.arbPct - a.arbPct);
}

export function ArbitrageFinder() {
  const [sport, setSport] = useState("NBA");
  const [minProfit, setMinProfit] = useState("0");
  const [bankroll, setBankroll] = useState("1000");
  const [selectedArb, setSelectedArb] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const { data: analyticsDash } = useQuery<AnalyticsDashboard>({
    queryKey: ["/api/admin/analytics-agent/dashboard"],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const propArbs = analyticsDash?.arbitrage?.playerPropsArbitrage ?? [];

  const arbs = useMemo(() => {
    if (!data?.games) return [];
    return deriveArbs(data.games);
  }, [data]);

  const filtered = useMemo(() => {
    return arbs.filter((arb) => {
      if (arb.arbPct < parseFloat(minProfit)) return false;
      return true;
    });
  }, [arbs, minProfit]);

  function calcStakes(arb: DerivedArb) {
    const total = parseFloat(bankroll) || 0;
    const impliedA = 1 / arb.bookAOdds;
    const impliedB = 1 / arb.bookBOdds;
    const totalImplied = impliedA + impliedB;
    const stakeA = (total * impliedA) / totalImplied;
    const stakeB = (total * impliedB) / totalImplied;
    const profit = total * (arb.arbPct / 100);
    return { stakeA: stakeA.toFixed(2), stakeB: stakeB.toFixed(2), profit: profit.toFixed(2) };
  }

  return (
    <div className="space-y-4" data-testid="arbitrage-finder">
      <div className="flex items-center gap-2 flex-wrap">
        <Percent className="w-5 h-5 text-chart-1" />
        <span className="font-medium">Arbitrage Finder</span>
        {!isLoading && (
          <Badge variant="secondary" data-testid="badge-arb-count">{filtered.length} opportunities</Badge>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-36" data-testid="select-arb-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minProfit} onValueChange={setMinProfit}>
          <SelectTrigger className="w-40" data-testid="select-arb-min-profit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any Profit</SelectItem>
            <SelectItem value="1">1%+ Profit</SelectItem>
            <SelectItem value="2">2%+ Profit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Stake Calculator</CardTitle>
          </div>
          <CardDescription>Enter your bankroll to see optimal stake splits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Bankroll ($)</span>
            <Input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
              className="w-32"
              data-testid="input-bankroll"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
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
              <span className="text-sm">Failed to load arbitrage data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Percent className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-arbs">
              No arbitrage opportunities found for {sport}. Markets are efficiently priced right now.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {filtered.map((arb) => {
          const stakes = calcStakes(arb);
          const isSelected = selectedArb === arb.id;

          return (
            <Card key={arb.id} data-testid={`card-arb-${arb.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CircleDot className="w-4 h-4 text-green-500" />
                      <span className="font-semibold" data-testid={`text-event-${arb.id}`}>{arb.event}</span>
                      <Badge variant="outline" data-testid={`badge-sport-${arb.id}`}>{sport}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Moneyline - {arb.bookmakerCount} books compared</p>
                  </div>
                  <Badge
                    variant="default"
                    className="text-sm"
                    data-testid={`badge-profit-${arb.id}`}
                  >
                    +{arb.arbPct.toFixed(2)}% edge
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">{arb.bookA}</p>
                    <p className="font-medium text-sm">{arb.bookASide}</p>
                    <p className="text-sm font-bold" data-testid={`text-odds-a-${arb.id}`}>
                      {arb.bookAOdds.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">{arb.bookB}</p>
                    <p className="font-medium text-sm">{arb.bookBSide}</p>
                    <p className="text-sm font-bold" data-testid={`text-odds-b-${arb.id}`}>
                      {arb.bookBOdds.toFixed(2)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedArb(isSelected ? null : arb.id)}
                  data-testid={`button-calc-${arb.id}`}
                >
                  {isSelected ? "Hide Stakes" : "Show Optimal Stakes"}
                </Button>

                {isSelected && (
                  <div className="p-3 bg-muted/30 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stake on {arb.bookASide}</span>
                      <span className="font-bold" data-testid={`text-stake-a-${arb.id}`}>
                        ${stakes.stakeA}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stake on {arb.bookBSide}</span>
                      <span className="font-bold" data-testid={`text-stake-b-${arb.id}`}>
                        ${stakes.stakeB}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Estimated Profit (if executed)</span>
                      <span className="font-bold text-green-500" data-testid={`text-profit-${arb.id}`}>
                        ${stakes.profit}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data?.meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-data-source">
          <Database className="w-3 h-3" />
          <span>Data: {data.meta.dataSources.join(", ")} | {data.meta.gamesWithOdds} games with odds | Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}</span>
        </div>
      )}

      {/* Player Props Arbitrage Section */}
      {propArbs.length > 0 && (
        <div className="mt-6 space-y-3" data-testid="section-prop-arbs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-sm">Player Props Cross-Book Lines</span>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-prop-arb-count">{propArbs.length} signals</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {propArbs.map((pa, i) => (
              <Card key={i} data-testid={`card-prop-arb-${i}`} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{pa.stat}</p>
                      <p className="text-[10px] text-muted-foreground">{pa.sport} · Line gap: {pa.lineGap}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 text-green-500 border-green-500/30">
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                      {pa.edge > 0 ? "+" : ""}{pa.edge.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Player prop lines are derived from model edge analysis across multiple books.</p>
        </div>
      )}
    </div>
  );
}
