import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Percent, Calculator, CircleDot, Clock, CircleOff } from "lucide-react";

type ArbStatus = "active" | "closing" | "expired";

interface ArbOpportunity {
  id: string;
  event: string;
  sport: string;
  market: string;
  bookA: string;
  bookAOdds: number;
  bookASide: string;
  bookB: string;
  bookBOdds: number;
  bookBSide: string;
  arbPct: number;
  status: ArbStatus;
}

const SAMPLE_ARBS: ArbOpportunity[] = [
  {
    id: "arb1",
    event: "Knicks vs Mavericks",
    sport: "NBA",
    market: "Moneyline",
    bookA: "DraftKings",
    bookAOdds: 2.45,
    bookASide: "Knicks ML",
    bookB: "FanDuel",
    bookBOdds: 1.72,
    bookBSide: "Mavericks ML",
    arbPct: 2.3,
    status: "active",
  },
  {
    id: "arb2",
    event: "Chiefs vs Bills",
    sport: "NFL",
    market: "Spread",
    bookA: "BetMGM",
    bookAOdds: 2.15,
    bookASide: "Chiefs +3.5",
    bookB: "Caesars",
    bookBOdds: 2.05,
    bookBSide: "Bills -3.5",
    arbPct: 1.8,
    status: "active",
  },
  {
    id: "arb3",
    event: "Dodgers vs Giants",
    sport: "MLB",
    market: "Moneyline",
    bookA: "FanDuel",
    bookAOdds: 2.60,
    bookASide: "Giants ML",
    bookB: "DraftKings",
    bookBOdds: 1.58,
    bookBSide: "Dodgers ML",
    arbPct: 1.5,
    status: "closing",
  },
  {
    id: "arb4",
    event: "Oilers vs Flames",
    sport: "NHL",
    market: "Total",
    bookA: "Caesars",
    bookAOdds: 2.10,
    bookASide: "Over 5.5",
    bookB: "BetMGM",
    bookBOdds: 2.00,
    bookBSide: "Under 5.5",
    arbPct: 2.6,
    status: "active",
  },
  {
    id: "arb5",
    event: "Bucks vs 76ers",
    sport: "NBA",
    market: "Moneyline",
    bookA: "DraftKings",
    bookAOdds: 1.90,
    bookASide: "Bucks ML",
    bookB: "FanDuel",
    bookBOdds: 2.25,
    bookBSide: "76ers ML",
    arbPct: 0.9,
    status: "expired",
  },
  {
    id: "arb6",
    event: "Cowboys vs Eagles",
    sport: "NFL",
    market: "Moneyline",
    bookA: "BetMGM",
    bookAOdds: 3.10,
    bookASide: "Cowboys ML",
    bookB: "Caesars",
    bookBOdds: 1.45,
    bookBSide: "Eagles ML",
    arbPct: 1.2,
    status: "closing",
  },
];

function getStatusIndicator(status: ArbStatus) {
  switch (status) {
    case "active":
      return { icon: CircleDot, color: "text-green-500", label: "Active" };
    case "closing":
      return { icon: Clock, color: "text-yellow-500", label: "Closing Soon" };
    case "expired":
      return { icon: CircleOff, color: "text-muted-foreground", label: "Expired" };
  }
}

export function ArbitrageFinder() {
  const [sportFilter, setSportFilter] = useState("all");
  const [minProfit, setMinProfit] = useState("0");
  const [bankroll, setBankroll] = useState("1000");
  const [selectedArb, setSelectedArb] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return SAMPLE_ARBS.filter((arb) => {
      if (sportFilter !== "all" && arb.sport !== sportFilter) return false;
      if (arb.arbPct < parseFloat(minProfit)) return false;
      return true;
    });
  }, [sportFilter, minProfit]);

  function calcStakes(arb: ArbOpportunity) {
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Percent className="w-5 h-5 text-chart-1" />
        <span className="font-medium">Arbitrage Finder</span>
        <Badge variant="secondary" data-testid="badge-arb-count">{filtered.length} opportunities</Badge>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-36" data-testid="select-arb-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
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

      <div className="grid gap-3">
        {filtered.map((arb) => {
          const status = getStatusIndicator(arb.status);
          const StatusIcon = status.icon;
          const stakes = calcStakes(arb);
          const isSelected = selectedArb === arb.id;

          return (
            <Card
              key={arb.id}
              className={arb.status === "expired" ? "opacity-60" : ""}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className="font-semibold">{arb.event}</span>
                      <Badge variant="outline" data-testid={`badge-sport-${arb.id}`}>{arb.sport}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{arb.market}</p>
                  </div>
                  <Badge
                    variant="default"
                    className="text-sm"
                    data-testid={`badge-profit-${arb.id}`}
                  >
                    +{arb.arbPct}% profit
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
                      <span className="text-muted-foreground">Guaranteed Profit</span>
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
    </div>
  );
}
