import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  ChevronRight,
  Shield,
  Zap,
  Flame,
  Calendar,
  Users,
  Check,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { Sport, GeneratedParlay, ParlayLeg, SportEvent } from "@shared/schema";
import { sports } from "@shared/schema";

interface ParlayGeneratorProps {
  onLoadParlay: (legs: ParlayLeg[]) => void;
}

const riskColors = {
  low: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatGameTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ParlayGenerator({ onLoadParlay }: ParlayGeneratorProps) {
  const [sport, setSport] = useState<Sport>("NBA");
  const [stake, setStake] = useState(10);
  const [minLegs, setMinLegs] = useState(2);
  const [maxLegs, setMaxLegs] = useState(4);
  const [bankroll, setBankroll] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [results, setResults] = useState<GeneratedParlay[] | null>(null);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());

  const gamesQuery = useQuery<SportEvent[]>({
    queryKey: ["/api/odds", sport],
    queryFn: async () => {
      const res = await fetch(`/api/odds?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  useEffect(() => {
    if (gamesQuery.data) {
      setSelectedGames(new Set(gamesQuery.data.map(g => g.id)));
    }
  }, [gamesQuery.data]);

  useEffect(() => {
    setResults(null);
    setSelectedGames(new Set());
  }, [sport]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-parlays", {
        sport,
        stake,
        minLegs,
        maxLegs,
        bankroll,
        riskLevel,
        topN: 5,
        selectedEventIds: Array.from(selectedGames),
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setResults(data.parlays);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const selectAllGames = () => {
    if (gamesQuery.data) {
      setSelectedGames(new Set(gamesQuery.data.map(g => g.id)));
    }
  };

  const deselectAllGames = () => {
    setSelectedGames(new Set());
  };

  const games = gamesQuery.data || [];
  const allSelected = games.length > 0 && selectedGames.size === games.length;
  const noneSelected = selectedGames.size === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-chart-4" />
            Advanced Parlay Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
                <SelectTrigger data-testid="select-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={riskLevel}
                onValueChange={(v) => setRiskLevel(v as typeof riskLevel)}
              >
                <SelectTrigger data-testid="select-risk-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Conservative
                    </div>
                  </SelectItem>
                  <SelectItem value="moderate">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Moderate
                    </div>
                  </SelectItem>
                  <SelectItem value="aggressive">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Aggressive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stake Amount</Label>
              <Input
                type="number"
                min={1}
                value={stake}
                onChange={(e) => setStake(parseFloat(e.target.value) || 10)}
                className="font-mono"
                data-testid="input-generator-stake"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <Label>Parlay Size: {minLegs} - {maxLegs} legs</Label>
            </div>
            <div className="px-2">
              <Slider
                value={[minLegs, maxLegs]}
                onValueChange={([min, max]) => {
                  setMinLegs(min);
                  setMaxLegs(max);
                }}
                min={2}
                max={6}
                step={1}
                data-testid="slider-leg-count"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 legs (safer)</span>
              <span>6 legs (higher payout)</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bankroll</Label>
              <Input
                type="number"
                min={1}
                value={bankroll}
                onChange={(e) => setBankroll(parseFloat(e.target.value) || 1000)}
                className="font-mono"
                data-testid="input-bankroll"
              />
              <p className="text-xs text-muted-foreground">
                Used for Kelly criterion stake sizing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Games
              <Badge variant="secondary" className="ml-2">
                {selectedGames.size} / {games.length} selected
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllGames}
                disabled={allSelected || gamesQuery.isLoading}
                data-testid="button-select-all"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAllGames}
                disabled={noneSelected || gamesQuery.isLoading}
                data-testid="button-deselect-all"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => gamesQuery.refetch()}
                disabled={gamesQuery.isLoading}
                data-testid="button-refresh-games"
              >
                <RefreshCw className={`w-4 h-4 ${gamesQuery.isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gamesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading {sport} games...</span>
            </div>
          ) : gamesQuery.error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load games. Please try again.
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No games available for {sport}
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <div className="grid gap-3 md:grid-cols-2">
                {games.map((game) => {
                  const isSelected = selectedGames.has(game.id);
                  return (
                    <div
                      key={game.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 border-transparent hover:bg-muted/50"
                      }`}
                      onClick={() => toggleGame(game.id)}
                      data-testid={`game-card-${game.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleGame(game.id)}
                            className="mt-1"
                            data-testid={`checkbox-game-${game.id}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold truncate">
                              {game.awayTeam}
                            </div>
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              @
                            </Badge>
                          </div>
                          <div className="font-semibold truncate mt-1">
                            {game.homeTeam}
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatGameTime(game.startTime)}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {game.markets.map((market) => (
                              <Badge
                                key={market.type}
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {market.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending || selectedGames.size === 0}
        className="w-full"
        size="lg"
        data-testid="button-generate-parlays"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing {selectedGames.size} {sport} Games...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Optimal Parlays ({selectedGames.size} games)
          </>
        )}
      </Button>

      {generateMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold">Running Monte Carlo Simulations</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing correlations and finding optimal combinations...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && !generateMutation.isPending && (
        <Card data-testid="card-generated-results">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-chart-4" />
                Top {results.length} Recommended Parlays
              </CardTitle>
              <Badge variant="outline" className="font-mono">
                {sport}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                {results.map((parlay, index) => (
                  <Card
                    key={parlay.id}
                    className="hover-elevate overflow-visible"
                    data-testid={`card-generated-parlay-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {parlay.legs.length}-Leg Parlay
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={riskColors[parlay.riskRating]}
                              >
                                {parlay.riskRating} risk
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onLoadParlay(parlay.legs)}
                          data-testid={`button-load-parlay-${index}`}
                        >
                          Load
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Target className="w-3 h-3" />
                            Win Prob
                          </div>
                          <p className="text-lg font-mono font-bold">
                            {(parlay.winProbability * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="w-3 h-3" />
                            Expected Value
                          </div>
                          <p
                            className={`text-lg font-mono font-bold ${
                              parlay.expectedValue > 0
                                ? "text-chart-1"
                                : "text-destructive"
                            }`}
                          >
                            {parlay.expectedValue > 0 ? "+" : ""}
                            {(parlay.expectedValue * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Combined Odds
                          </div>
                          <p className="text-lg font-mono font-bold">
                            {parlay.combinedOdds.toFixed(2)}x
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Potential Return
                          </div>
                          <p className="text-lg font-mono font-bold text-chart-1">
                            ${parlay.potentialReturn.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Picks:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {parlay.legs.map((leg) => (
                            <Badge
                              key={leg.id}
                              variant="secondary"
                              className="font-normal"
                            >
                              {leg.team} - {leg.outcome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && !generateMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold">No optimal parlays found</p>
              <p className="text-sm text-muted-foreground">
                Try selecting more games or adjusting your settings
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
