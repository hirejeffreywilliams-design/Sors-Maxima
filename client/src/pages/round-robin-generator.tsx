import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shuffle,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Calculator,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Pick {
  id: string;
  pick: string;
  odds: number;
  sport: string;
  game: string;
  confidence: number;
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export default function RoundRobinGenerator() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [parlaySize, setParlaySize] = useState("2");
  const [stake, setStake] = useState("10");
  const [newPick, setNewPick] = useState({ pick: "", odds: "-110", sport: "NBA", game: "", confidence: "55" });
  const [results, setResults] = useState<any>(null);
  const [showAllParlays, setShowAllParlays] = useState(false);
  const { toast } = useToast();

  const straightBets = useQuery<any>({
    queryKey: ["/api/predictions/straight-bets"],
    queryFn: async () => {
      const res = await fetch("/api/predictions/straight-bets");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predictions/round-robin", {
        picks: picks.map(p => ({
          pick: p.pick,
          odds: p.odds,
          sport: p.sport,
          game: p.game,
          confidence: p.confidence,
        })),
        parlaySize: parseInt(parlaySize),
        stake: parseFloat(stake),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to generate", variant: "destructive" });
    },
  });

  const addPick = () => {
    if (!newPick.pick.trim()) {
      toast({ title: "Enter a pick", variant: "destructive" });
      return;
    }
    const pick: Pick = {
      id: `pick-${Date.now()}`,
      pick: newPick.pick.trim(),
      odds: parseInt(newPick.odds) || -110,
      sport: newPick.sport,
      game: newPick.game.trim() || "TBD",
      confidence: parseInt(newPick.confidence) || 55,
    };
    setPicks(prev => [...prev, pick]);
    setNewPick({ pick: "", odds: "-110", sport: "NBA", game: "", confidence: "55" });
  };

  const addFromStraightBets = (p: any) => {
    const exists = picks.find(existing => existing.pick === p.pick);
    if (exists) return;
    setPicks(prev => [...prev, {
      id: `pick-${Date.now()}-${p.id}`,
      pick: p.pick,
      odds: p.odds,
      sport: p.sport,
      game: p.game,
      confidence: p.confidence,
    }]);
    toast({ title: "Added", description: `${p.pick} added to your picks` });
  };

  const removePick = (id: string) => {
    setPicks(prev => prev.filter(p => p.id !== id));
  };

  const displayedParlays = showAllParlays ? results?.parlays : results?.parlays?.slice(0, 10);

  return (
    <div className="space-y-6" data-testid="round-robin-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Round Robin Generator</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Create multiple smaller parlays from your picks. Spread your risk — you don't need every pick to hit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Pick
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pick</Label>
                  <Input
                    placeholder="e.g., Lakers ML"
                    value={newPick.pick}
                    onChange={e => setNewPick(prev => ({ ...prev, pick: e.target.value }))}
                    data-testid="input-pick"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Odds</Label>
                  <Input
                    placeholder="-110"
                    value={newPick.odds}
                    onChange={e => setNewPick(prev => ({ ...prev, odds: e.target.value }))}
                    data-testid="input-odds"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Game</Label>
                  <Input
                    placeholder="e.g., LAL @ BOS"
                    value={newPick.game}
                    onChange={e => setNewPick(prev => ({ ...prev, game: e.target.value }))}
                    data-testid="input-game"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Confidence %</Label>
                  <Input
                    placeholder="55"
                    value={newPick.confidence}
                    onChange={e => setNewPick(prev => ({ ...prev, confidence: e.target.value }))}
                    data-testid="input-confidence"
                  />
                </div>
              </div>
              <Button size="sm" onClick={addPick} data-testid="btn-add-pick">
                <Plus className="w-4 h-4 mr-1" /> Add Pick
              </Button>
            </CardContent>
          </Card>

          {straightBets.data?.picks && straightBets.data.picks.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" /> Quick Add from Straight Bets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {straightBets.data.picks.slice(0, 12).map((p: any) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-auto py-2"
                      onClick={() => addFromStraightBets(p)}
                      disabled={picks.some(existing => existing.pick === p.pick)}
                      data-testid={`quick-add-${p.id}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{p.pick}</div>
                        <div className="text-muted-foreground">{formatOdds(p.odds)} | {p.confidence}%</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {picks.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Your Picks ({picks.length})</h3>
                <div className="space-y-2">
                  {picks.map(pick => (
                    <div key={pick.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{pick.pick}</p>
                        <p className="text-xs text-muted-foreground">{pick.game} | {formatOdds(pick.odds)} | {pick.confidence}%</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removePick(pick.id)} data-testid={`remove-pick-${pick.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Parlay Size</Label>
                    <Select value={parlaySize} onValueChange={setParlaySize}>
                      <SelectTrigger data-testid="select-parlay-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.min(picks.length - 1, 5) }, (_, i) => i + 2).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}-Leg Parlays</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stake per Parlay ($)</Label>
                    <Input value={stake} onChange={e => setStake(e.target.value)} data-testid="input-stake" />
                  </div>
                </div>

                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={picks.length < 3 || generateMutation.isPending}
                  className="w-full"
                  data-testid="btn-generate-rr"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Calculator className="w-4 h-4 mr-2" /> Generate Round Robin</>
                  )}
                </Button>
                {picks.length < 3 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Add at least 3 picks to generate
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {results?.summary && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Parlays</span>
                    <span className="font-bold">{results.summary.totalParlays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parlay Size</span>
                    <span className="font-bold">{results.summary.parlaySize}-leg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stake Each</span>
                    <span className="font-bold">${results.summary.stakePerParlay}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Total Investment</span>
                    <span className="font-bold">${results.summary.totalInvestment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Best Case</span>
                    <span className="font-bold text-green-500">${results.summary.bestCasePayout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Worst Case</span>
                    <span className="font-bold text-red-500">${results.summary.worstCaseLoss}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg EV</span>
                    <span className={`font-bold ${results.summary.averageEV >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ${results.summary.averageEV}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {results?.parlays && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Parlays ({results.parlays.length})</h3>
              {displayedParlays?.map((parlay: any) => (
                <Card key={parlay.id} className={`${parlay.ev > 0 ? "ring-1 ring-green-500/30" : ""}`} data-testid={`rr-parlay-${parlay.id}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs font-bold ${
                        parlay.grade.startsWith("A") ? "border-green-500 text-green-500" :
                        parlay.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                        "border-yellow-500 text-yellow-500"
                      }`}>{parlay.grade}</Badge>
                      <span className="text-sm font-bold">{formatOdds(parlay.combinedOdds)}</span>
                    </div>
                    <div className="space-y-1">
                      {parlay.legs.map((leg: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">{leg.pick} ({formatOdds(leg.odds)})</p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Win: {parlay.winProbability}%</span>
                      <span className="text-muted-foreground">Payout: ${parlay.potentialPayout}</span>
                      <span className={parlay.ev >= 0 ? "text-green-500" : "text-red-500"}>
                        EV: ${parlay.ev}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.parlays.length > 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllParlays(!showAllParlays)}
                  className="w-full"
                  data-testid="btn-show-all-parlays"
                >
                  {showAllParlays ? "Show Less" : `Show All ${results.parlays.length} Parlays`}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {results?.disclaimer && (
        <p className="text-xs text-muted-foreground text-center">{results.disclaimer}</p>
      )}
    </div>
  );
}