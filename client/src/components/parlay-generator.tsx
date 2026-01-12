import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
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
  ChevronDown,
  User,
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
import type { Sport, GeneratedParlay, ParlayLeg, SportEvent, PlayerProp } from "@shared/schema";
import { sports, propCategoryLabels } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [marketFilter, setMarketFilter] = useState<"all" | "game" | "props">("all");
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
  const [selectedTotals, setSelectedTotals] = useState<Map<string, "over" | "under">>(new Map());

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
    setSelectedTotals(new Map());
    setSelectedProps(new Set());
  }, [sport]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const totalsArray = Array.from(selectedTotals.entries()).map(([gameId, selection]) => ({
        gameId,
        selection,
      }));
      const response = await apiRequest("POST", "/api/generate-parlays", {
        sport,
        stake,
        minLegs,
        maxLegs,
        bankroll,
        riskLevel,
        topN: 5,
        selectedEventIds: Array.from(selectedGames),
        selectedTotals: totalsArray,
        selectedProps: Array.from(selectedProps),
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
        setSelectedTotals(totals => {
          const nextTotals = new Map(totals);
          nextTotals.delete(gameId);
          return nextTotals;
        });
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
    setSelectedTotals(new Map());
    setSelectedProps(new Set());
  };

  const toggleGameExpanded = (gameId: string) => {
    setExpandedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const groupPropsByCategory = (props: PlayerProp[]): Record<string, PlayerProp[]> => {
    const grouped: Record<string, PlayerProp[]> = {};
    for (const prop of props) {
      if (!grouped[prop.category]) {
        grouped[prop.category] = [];
      }
      grouped[prop.category].push(prop);
    }
    return grouped;
  };

  const getTotalPropsCount = (games: SportEvent[]): number => {
    return games.reduce((sum, g) => sum + (g.playerProps?.length || 0), 0);
  };

  const toggleProp = (propKey: string) => {
    setSelectedProps(prev => {
      const next = new Set(prev);
      if (next.has(propKey)) {
        next.delete(propKey);
      } else {
        next.add(propKey);
      }
      return next;
    });
  };

  const selectAllPropsForGame = (game: SportEvent) => {
    if (!game.playerProps) return;
    setSelectedProps(prev => {
      const next = new Set(prev);
      for (const prop of game.playerProps!) {
        next.add(`${game.id}-${prop.playerId}-${prop.category}`);
      }
      return next;
    });
  };

  const clearPropsForGame = (game: SportEvent) => {
    if (!game.playerProps) return;
    setSelectedProps(prev => {
      const next = new Set(prev);
      for (const prop of game.playerProps!) {
        next.delete(`${game.id}-${prop.playerId}-${prop.category}`);
      }
      return next;
    });
  };

  const getSelectedPropsForGame = (game: SportEvent): number => {
    if (!game.playerProps) return 0;
    return game.playerProps.filter(p => 
      selectedProps.has(`${game.id}-${p.playerId}-${p.category}`)
    ).length;
  };

  const toggleTotal = (gameId: string, selection: "over" | "under") => {
    setSelectedTotals(prev => {
      const next = new Map(prev);
      if (next.get(gameId) === selection) {
        next.delete(gameId);
      } else {
        next.set(gameId, selection);
      }
      return next;
    });
  };

  const getGameTotal = (game: SportEvent) => {
    const totalMarket = game.markets.find(m => m.type === "total");
    if (!totalMarket) return null;
    const overOutcome = totalMarket.outcomes.find(o => o.name.includes("Over"));
    const underOutcome = totalMarket.outcomes.find(o => o.name.includes("Under"));
    return { 
      line: overOutcome?.line || 0, 
      overOdds: overOutcome?.americanOdds || 0,
      underOdds: underOutcome?.americanOdds || 0 
    };
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
            Parlay Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
            <SelectTrigger data-testid="select-sport" className="w-full">
              <SelectValue placeholder="Select Sport" />
            </SelectTrigger>
            <SelectContent>
              {sports.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">
                Select Games & Totals
              </CardTitle>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {selectedGames.size > 0 && (
                  <span>{selectedGames.size} games</span>
                )}
                {selectedTotals.size > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {selectedTotals.size} O/U
                  </span>
                )}
                {selectedProps.size > 0 && (
                  <span>{selectedProps.size} props</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllGames}
                disabled={allSelected || gamesQuery.isLoading}
                data-testid="button-select-all"
              >
                All
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
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {games.map((game) => {
                  const isSelected = selectedGames.has(game.id);
                  const isExpanded = expandedGames.has(game.id);
                  const groupedProps = game.playerProps ? groupPropsByCategory(game.playerProps) : {};
                  const propCategories = Object.keys(groupedProps);
                  const gameTotal = getGameTotal(game);
                  const selectedTotal = selectedTotals.get(game.id);
                  
                  return (
                    <Collapsible 
                      key={game.id} 
                      open={isExpanded} 
                      onOpenChange={() => toggleGameExpanded(game.id)}
                    >
                      <div
                        className={`rounded-lg border transition-colors ${
                          isSelected || selectedTotal
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-transparent"
                        }`}
                        data-testid={`game-card-${game.id}`}
                      >
                        <div className="p-3">
                          <div className="flex items-center gap-3">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleGame(game.id)}
                                data-testid={`checkbox-game-${game.id}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {game.awayTeam} @ {game.homeTeam}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatGameTime(game.startTime)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {game.playerProps && game.playerProps.length > 0 && (
                                <CollapsibleTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-muted-foreground"
                                    data-testid={`button-expand-props-${game.id}`}
                                  >
                                    Props
                                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </div>
                          </div>
                          
                          {gameTotal && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground font-medium">
                                  Game Total: {gameTotal.line}
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant={selectedTotal === "over" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleTotal(game.id, "over")}
                                    className={`text-xs ${selectedTotal === "over" ? "bg-chart-1 hover:bg-chart-1/90" : ""}`}
                                    data-testid={`button-over-${game.id}`}
                                  >
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Over {gameTotal.overOdds > 0 ? `+${gameTotal.overOdds}` : gameTotal.overOdds}
                                  </Button>
                                  <Button
                                    variant={selectedTotal === "under" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleTotal(game.id, "under")}
                                    className={`text-xs ${selectedTotal === "under" ? "bg-chart-2 hover:bg-chart-2/90" : ""}`}
                                    data-testid={`button-under-${game.id}`}
                                  >
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                    Under {gameTotal.underOdds > 0 ? `+${gameTotal.underOdds}` : gameTotal.underOdds}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {game.playerProps && game.playerProps.length > 0 && (
                          <CollapsibleContent>
                            <div className="px-4 pb-4 border-t border-border/50">
                              <div className="pt-3">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-sm font-medium">
                                    Player Props
                                    {getSelectedPropsForGame(game) > 0 && (
                                      <Badge variant="default" className="ml-2">
                                        {getSelectedPropsForGame(game)} selected
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); selectAllPropsForGame(game); }}
                                      data-testid={`button-select-all-props-${game.id}`}
                                    >
                                      Select All
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); clearPropsForGame(game); }}
                                      data-testid={`button-clear-props-${game.id}`}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>
                                <Tabs defaultValue={propCategories[0] || "all"} className="w-full">
                                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                                    {propCategories.map((category) => (
                                      <TabsTrigger 
                                        key={category} 
                                        value={category}
                                        className="text-xs px-2 py-1"
                                        data-testid={`tab-prop-category-${category}`}
                                      >
                                        {propCategoryLabels[category] || category}
                                        <Badge variant="secondary" className="ml-1 text-xs px-1">
                                          {groupedProps[category].length}
                                        </Badge>
                                      </TabsTrigger>
                                    ))}
                                  </TabsList>
                                  
                                  {propCategories.map((category) => (
                                    <TabsContent key={category} value={category} className="mt-3">
                                      <div className="grid gap-2 md:grid-cols-2">
                                        {groupedProps[category].map((prop) => {
                                          const propKey = `${game.id}-${prop.playerId}-${prop.category}`;
                                          const isPropSelected = selectedProps.has(propKey);
                                          return (
                                            <div 
                                              key={propKey}
                                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isPropSelected 
                                                  ? "bg-primary/10 border-primary/40" 
                                                  : "bg-background hover:bg-muted/30"
                                              }`}
                                              onClick={() => toggleProp(propKey)}
                                              data-testid={`prop-card-${prop.playerId}-${prop.category}`}
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <Checkbox
                                                    checked={isPropSelected}
                                                    onCheckedChange={() => toggleProp(propKey)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    data-testid={`checkbox-prop-${prop.playerId}-${prop.category}`}
                                                  />
                                                  <User className="w-4 h-4 text-muted-foreground" />
                                                  <span className="font-medium text-sm">{prop.playerName}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                  {prop.position}
                                                </Badge>
                                              </div>
                                              <div className="text-xs text-muted-foreground mb-2">
                                                {propCategoryLabels[prop.category] || prop.category}: {prop.line}
                                              </div>
                                              <div className="flex gap-2">
                                                <div className="flex-1 p-2 rounded bg-muted/50 text-center">
                                                  <div className="text-xs text-muted-foreground">Over</div>
                                                  <div className="font-mono text-sm font-medium">
                                                    {prop.overOdds.americanOdds > 0 ? "+" : ""}{prop.overOdds.americanOdds}
                                                  </div>
                                                </div>
                                                <div className="flex-1 p-2 rounded bg-muted/50 text-center">
                                                  <div className="text-xs text-muted-foreground">Under</div>
                                                  <div className="font-mono text-sm font-medium">
                                                    {prop.underOdds.americanOdds > 0 ? "+" : ""}{prop.underOdds.americanOdds}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              </div>
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending || (selectedGames.size === 0 && selectedTotals.size === 0)}
        className="w-full"
        size="lg"
        data-testid="button-generate-parlays"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing selections...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Optimal Parlays
            {(selectedGames.size > 0 || selectedTotals.size > 0 || selectedProps.size > 0) && (
              <span className="ml-1 text-xs opacity-80">
                ({[
                  selectedGames.size > 0 && `${selectedGames.size} games`,
                  selectedTotals.size > 0 && `${selectedTotals.size} O/U`,
                  selectedProps.size > 0 && `${selectedProps.size} props`,
                ].filter(Boolean).join(", ")})
              </span>
            )}
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
