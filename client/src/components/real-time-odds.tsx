import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Zap, Clock, DollarSign, ArrowRight } from "lucide-react";

interface BookOdds {
  book: string;
  spread: number;
  spreadOdds: number;
  total: number;
  totalOdds: number;
  moneyline: number;
  lastUpdate: string;
}

interface GameOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  books: BookOdds[];
  bestSpread: { book: string; value: number; odds: number };
  bestTotal: { book: string; value: number; odds: number; side: string };
  bestMoneyline: { book: string; value: number };
  arbitrage?: { exists: boolean; profit: number; legs: string[] };
}

function generateMockOdds(): GameOdds[] {
  const books = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "BetRivers"];
  
  return [
    {
      id: "nfl-1",
      sport: "NFL",
      homeTeam: "Chiefs",
      awayTeam: "Bills",
      gameTime: "Sunday 6:30 PM",
      books: books.map((book, i) => ({
        book,
        spread: -3.5 + (i % 3 === 0 ? 0.5 : 0),
        spreadOdds: -110 + (i * 2 - 5),
        total: 48.5 + (i % 2 === 0 ? 0.5 : 0),
        totalOdds: -110 + (i % 3 - 1) * 5,
        moneyline: -165 + (i * 8),
        lastUpdate: `${2 + i}m ago`,
      })),
      bestSpread: { book: "DraftKings", value: -3, odds: -108 },
      bestTotal: { book: "FanDuel", value: 49, odds: -105, side: "Over" },
      bestMoneyline: { book: "PointsBet", value: -145 },
      arbitrage: { exists: false, profit: 0, legs: [] },
    },
    {
      id: "nba-1",
      sport: "NBA",
      homeTeam: "Lakers",
      awayTeam: "Celtics",
      gameTime: "Tonight 10:00 PM",
      books: books.map((book, i) => ({
        book,
        spread: 2.5 + (i % 2 === 0 ? 0.5 : 0),
        spreadOdds: -110 + (i * 3 - 7),
        total: 225.5 + (i % 3),
        totalOdds: -108 + (i % 4 - 2) * 3,
        moneyline: 115 + (i * 5 - 12),
        lastUpdate: `${1 + i}m ago`,
      })),
      bestSpread: { book: "Caesars", value: 3, odds: -105 },
      bestTotal: { book: "BetMGM", value: 226.5, odds: -102, side: "Under" },
      bestMoneyline: { book: "FanDuel", value: 125 },
    },
    {
      id: "nfl-2",
      sport: "NFL",
      homeTeam: "Cowboys",
      awayTeam: "Eagles",
      gameTime: "Sunday 4:25 PM",
      books: books.map((book, i) => ({
        book,
        spread: 1.5 - (i % 2),
        spreadOdds: -110 + (i * 2 - 4),
        total: 45.5 + (i % 3 === 0 ? 0.5 : 0),
        totalOdds: -110 + (i % 2) * 5,
        moneyline: 105 + (i * 6 - 15),
        lastUpdate: `${3 + i}m ago`,
      })),
      bestSpread: { book: "BetRivers", value: 2.5, odds: -108 },
      bestTotal: { book: "DraftKings", value: 46, odds: -105, side: "Over" },
      bestMoneyline: { book: "Caesars", value: 118 },
      arbitrage: { exists: true, profit: 1.2, legs: ["Eagles ML @ FanDuel +125", "Cowboys ML @ BetMGM -118"] },
    },
  ];
}

export function RealTimeOdds() {
  const [odds, setOdds] = useState<GameOdds[]>([]);
  const [sport, setSport] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    setOdds(generateMockOdds());
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setOdds(generateMockOdds());
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 1000);
  };

  const filteredOdds = sport === "all" ? odds : odds.filter(g => g.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-sport-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Updated {lastRefresh.toLocaleTimeString()}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} data-testid="button-refresh-odds">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Odds
        </Button>
      </div>

      <div className="space-y-4">
        {filteredOdds.map(game => (
          <Card key={game.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge>{game.sport}</Badge>
                  <CardTitle className="text-base">{game.awayTeam} @ {game.homeTeam}</CardTitle>
                </div>
                <span className="text-sm text-muted-foreground">{game.gameTime}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {game.arbitrage?.exists && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-500 font-medium mb-1">
                    <Zap className="w-4 h-4" />
                    Arbitrage Opportunity: +{game.arbitrage.profit}% Guaranteed Profit
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {game.arbitrage.legs.join(" + ")}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Best Spread ({game.homeTeam})</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{game.bestSpread.value > 0 ? "+" : ""}{game.bestSpread.value}</span>
                      <span className="text-sm text-muted-foreground ml-1">({game.bestSpread.odds})</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      {game.bestSpread.book}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Best Total ({game.bestTotal.side})</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{game.bestTotal.value}</span>
                      <span className="text-sm text-muted-foreground ml-1">({game.bestTotal.odds})</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      {game.bestTotal.book}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Best Moneyline ({game.homeTeam})</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{game.bestMoneyline.value > 0 ? "+" : ""}{game.bestMoneyline.value}</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      {game.bestMoneyline.book}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-2">Sportsbook</th>
                      <th className="text-center p-2">Spread</th>
                      <th className="text-center p-2">Total</th>
                      <th className="text-center p-2">Moneyline</th>
                      <th className="text-right p-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.books.map(book => (
                      <tr key={book.book} className="border-b border-border/50">
                        <td className="p-2 font-medium">{book.book}</td>
                        <td className="text-center p-2">
                          <span className={book.spread === game.bestSpread.value ? "text-green-500 font-medium" : ""}>
                            {book.spread > 0 ? "+" : ""}{book.spread} ({book.spreadOdds})
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={book.total === game.bestTotal.value ? "text-green-500 font-medium" : ""}>
                            {book.total} ({book.totalOdds})
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={book.moneyline === game.bestMoneyline.value ? "text-green-500 font-medium" : ""}>
                            {book.moneyline > 0 ? "+" : ""}{book.moneyline}
                          </span>
                        </td>
                        <td className="text-right p-2 text-muted-foreground">{book.lastUpdate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
