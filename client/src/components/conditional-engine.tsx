import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, ArrowRight, Plus, Trash2, AlertTriangle } from "lucide-react";

interface GameData {
  id: string;
  shortName: string;
  name: string;
  homeTeam: { name: string; abbreviation: string; record: string };
  awayTeam: { name: string; abbreviation: string; record: string };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
  };
  dataSource: string;
}

interface MarketSnapshotResponse {
  games: GameData[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    dataSources: string[];
    generatedAt: string;
  };
}

type BetType = "spread" | "moneyline" | "total";

interface ConditionalLeg {
  id: string;
  gameId: string;
  gameName: string;
  betType: BetType;
  side: string;
  odds: number;
}

interface ConditionalPair {
  id: string;
  condition: ConditionalLeg;
  consequence: ConditionalLeg;
}

function getOddsForSelection(game: GameData, betType: BetType, side: string): number {
  if (betType === "moneyline") {
    if (side === "home") return game.consensus.homeMoneyline ?? -110;
    return game.consensus.awayMoneyline ?? -110;
  }
  if (betType === "spread") {
    return -110;
  }
  if (betType === "total") {
    return -110;
  }
  return -110;
}

function getSelectionLabel(game: GameData, betType: BetType, side: string): string {
  if (betType === "moneyline") {
    if (side === "home") return `${game.homeTeam.abbreviation} ML`;
    return `${game.awayTeam.abbreviation} ML`;
  }
  if (betType === "spread") {
    if (side === "home") return `${game.homeTeam.abbreviation} ${game.consensus.spread != null ? (game.consensus.spread > 0 ? "+" : "") + game.consensus.spread : "spread"}`;
    return `${game.awayTeam.abbreviation} ${game.consensus.spread != null ? (game.consensus.spread > 0 ? "-" : "+") + Math.abs(game.consensus.spread) : "spread"}`;
  }
  if (betType === "total") {
    if (side === "over") return `Over ${game.consensus.total ?? "N/A"}`;
    return `Under ${game.consensus.total ?? "N/A"}`;
  }
  return "";
}

function calculateCombinedOdds(odds1: number, odds2: number): number {
  const dec1 = odds1 > 0 ? (odds1 / 100) + 1 : (100 / Math.abs(odds1)) + 1;
  const dec2 = odds2 > 0 ? (odds2 / 100) + 1 : (100 / Math.abs(odds2)) + 1;
  const combined = dec1 * dec2;
  if (combined >= 2) return Math.round((combined - 1) * 100);
  return Math.round(-100 / (combined - 1));
}

function impliedProbability(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export function ConditionalEngine() {
  const [sport, setSport] = useState("NBA");
  const [pairs, setPairs] = useState<ConditionalPair[]>([]);
  const [conditionGameId, setConditionGameId] = useState("");
  const [conditionBetType, setConditionBetType] = useState<BetType>("spread");
  const [conditionSide, setConditionSide] = useState("");
  const [consequenceGameId, setConsequenceGameId] = useState("");
  const [consequenceBetType, setConsequenceBetType] = useState<BetType>("moneyline");
  const [consequenceSide, setConsequenceSide] = useState("");

  const { data, isLoading, isError } = useQuery<MarketSnapshotResponse>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  const games = data?.games ?? [];
  const conditionGame = games.find((g) => g.id === conditionGameId);
  const consequenceGame = games.find((g) => g.id === consequenceGameId);

  function getSideOptions(betType: BetType, game: GameData | undefined) {
    if (!game) return [];
    if (betType === "moneyline" || betType === "spread") {
      return [
        { value: "home", label: game.homeTeam.abbreviation },
        { value: "away", label: game.awayTeam.abbreviation },
      ];
    }
    return [
      { value: "over", label: "Over" },
      { value: "under", label: "Under" },
    ];
  }

  function handleAddPair() {
    if (!conditionGame || !consequenceGame || !conditionSide || !consequenceSide) return;

    const condOdds = getOddsForSelection(conditionGame, conditionBetType, conditionSide);
    const consOdds = getOddsForSelection(consequenceGame, consequenceBetType, consequenceSide);

    const newPair: ConditionalPair = {
      id: Date.now().toString(),
      condition: {
        id: `cond-${Date.now()}`,
        gameId: conditionGameId,
        gameName: conditionGame.shortName,
        betType: conditionBetType,
        side: getSelectionLabel(conditionGame, conditionBetType, conditionSide),
        odds: condOdds,
      },
      consequence: {
        id: `cons-${Date.now()}`,
        gameId: consequenceGameId,
        gameName: consequenceGame.shortName,
        betType: consequenceBetType,
        side: getSelectionLabel(consequenceGame, consequenceBetType, consequenceSide),
        odds: consOdds,
      },
    };

    setPairs((prev) => [...prev, newPair]);
    setConditionGameId("");
    setConditionSide("");
    setConsequenceGameId("");
    setConsequenceSide("");
  }

  function handleRemovePair(id: string) {
    setPairs((prev) => prev.filter((p) => p.id !== id));
  }

  const canAdd = conditionGameId && conditionSide && consequenceGameId && consequenceSide;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <GitBranch className="w-5 h-5 text-primary" />
          <span className="font-medium">If-This-Then-That Conditionals</span>
          <Badge variant="outline">Build Your Logic</Badge>
        </div>
        <Select value={sport} onValueChange={(val) => { setSport(val); setConditionGameId(""); setConsequenceGameId(""); setConditionSide(""); setConsequenceSide(""); }} data-testid="select-conditional-sport-wrapper">
          <SelectTrigger className="w-32" data-testid="select-conditional-sport">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {isLoading && (
            <div className="space-y-3" data-testid="loading-games">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 p-4 text-sm text-destructive" data-testid="error-games">
              <AlertTriangle className="w-4 h-4" />
              <span>Failed to load games. Please try again.</span>
            </div>
          )}

          {!isLoading && !isError && games.length === 0 && (
            <div className="p-6 text-center text-muted-foreground" data-testid="empty-games">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming games found for {sport}.</p>
              <p className="text-xs mt-1">Try selecting a different sport.</p>
            </div>
          )}

          {!isLoading && !isError && games.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                  <Label className="text-xs font-semibold uppercase tracking-wide">IF This Happens</Label>
                  <Select value={conditionGameId} onValueChange={(val) => { setConditionGameId(val); setConditionSide(""); }}>
                    <SelectTrigger data-testid="select-condition-game">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.shortName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={conditionBetType} onValueChange={(val) => { setConditionBetType(val as BetType); setConditionSide(""); }}>
                    <SelectTrigger data-testid="select-condition-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spread">Spread</SelectItem>
                      <SelectItem value="moneyline">Moneyline</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                  {conditionGame && (
                    <Select value={conditionSide} onValueChange={setConditionSide}>
                      <SelectTrigger data-testid="select-condition-side">
                        <SelectValue placeholder="Pick side" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSideOptions(conditionBetType, conditionGame).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {conditionGame && conditionSide && (
                    <div className="text-sm">
                      <Badge variant="outline" data-testid="badge-condition-odds">
                        {(() => { const o = getOddsForSelection(conditionGame, conditionBetType, conditionSide); return (o > 0 ? "+" : "") + o; })()}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                  <Label className="text-xs font-semibold uppercase tracking-wide">THEN Bet This</Label>
                  <Select value={consequenceGameId} onValueChange={(val) => { setConsequenceGameId(val); setConsequenceSide(""); }}>
                    <SelectTrigger data-testid="select-consequence-game">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.shortName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={consequenceBetType} onValueChange={(val) => { setConsequenceBetType(val as BetType); setConsequenceSide(""); }}>
                    <SelectTrigger data-testid="select-consequence-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spread">Spread</SelectItem>
                      <SelectItem value="moneyline">Moneyline</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                  {consequenceGame && (
                    <Select value={consequenceSide} onValueChange={setConsequenceSide}>
                      <SelectTrigger data-testid="select-consequence-side">
                        <SelectValue placeholder="Pick side" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSideOptions(consequenceBetType, consequenceGame).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {consequenceGame && consequenceSide && (
                    <div className="text-sm">
                      <Badge variant="outline" data-testid="badge-consequence-odds">
                        {(() => { const o = getOddsForSelection(consequenceGame, consequenceBetType, consequenceSide); return (o > 0 ? "+" : "") + o; })()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleAddPair} disabled={!canAdd} className="w-full" data-testid="button-add-conditional">
                <Plus className="w-4 h-4 mr-2" />
                Add Conditional Pair
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {pairs.length === 0 && !isLoading && (
        <div className="p-6 text-center text-muted-foreground border rounded-md border-dashed" data-testid="empty-conditionals">
          <p className="text-sm">No conditional pairs built yet.</p>
          <p className="text-xs mt-1">Select games above to create "If X, then Y" conditional bets.</p>
        </div>
      )}

      <div className="grid gap-4" data-testid="conditional-pairs-list">
        {pairs.map((pair) => {
          const combined = calculateCombinedOdds(pair.condition.odds, pair.consequence.odds);
          const condProb = impliedProbability(pair.condition.odds);
          const consProb = impliedProbability(pair.consequence.odds);
          const combinedProb = Math.round(condProb * consProb * 100);

          return (
            <Card key={pair.id} data-testid={`card-conditional-${pair.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1 p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">IF THIS HAPPENS</p>
                    <p className="font-medium text-sm" data-testid={`text-condition-${pair.id}`}>{pair.condition.gameName}</p>
                    <p className="text-sm">{pair.condition.side}</p>
                    <Badge variant="outline" className="mt-2" data-testid={`badge-cond-odds-${pair.id}`}>
                      {pair.condition.odds > 0 ? "+" : ""}{pair.condition.odds}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-center pt-6">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 p-3 bg-background/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">THEN BET THIS</p>
                    <p className="font-medium text-sm" data-testid={`text-consequence-${pair.id}`}>{pair.consequence.gameName}</p>
                    <p className="text-sm">{pair.consequence.side}</p>
                    <Badge variant="outline" className="mt-2" data-testid={`badge-cons-odds-${pair.id}`}>
                      {pair.consequence.odds > 0 ? "+" : ""}{pair.consequence.odds}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground">Combined Prob</p>
                    <p className="font-bold text-lg" data-testid={`text-prob-${pair.id}`}>{combinedProb}%</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground">Combined Odds</p>
                    <p className="font-bold text-lg" data-testid={`text-combined-odds-${pair.id}`}>
                      {combined > 0 ? "+" : ""}{combined}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground">Payout ($100)</p>
                    <p className="font-bold text-lg text-green-500" data-testid={`text-payout-${pair.id}`}>
                      ${combined > 0 ? combined + 100 : Math.round(10000 / Math.abs(combined)) + 100}
                    </p>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleRemovePair(pair.id)} data-testid={`button-remove-${pair.id}`}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
