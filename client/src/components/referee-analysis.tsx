import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, TrendingUp, TrendingDown, Target, MapPin, AlertCircle, Database, Minus } from "lucide-react";

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
  name: string;
  venue?: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: { homeMoneyline?: number; awayMoneyline?: number; spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  lineMovement: LineMovementData[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: string };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface GameContext {
  id: string;
  game: MarketGame;
  factors: { factor: string; impact: "positive" | "negative" | "neutral"; description: string }[];
  impactLevel: "high" | "medium" | "low";
}

function deriveGameContexts(games: MarketGame[]): GameContext[] {
  return games
    .filter(g => g.consensus.total !== undefined || g.consensus.spread !== undefined)
    .map(game => {
      const factors: GameContext["factors"] = [];
      let impactScore = 0;

      if (game.homeTeam.winPct >= 65) {
        factors.push({ factor: "Strong Home Team", impact: "positive", description: `${game.homeTeam.name} (${game.homeTeam.record}) - ${game.homeTeam.winPct}% win rate` });
        impactScore += 2;
      } else if (game.homeTeam.winPct <= 35) {
        factors.push({ factor: "Weak Home Team", impact: "negative", description: `${game.homeTeam.name} (${game.homeTeam.record}) - ${game.homeTeam.winPct}% win rate` });
        impactScore += 1;
      }

      if (game.venue) {
        factors.push({ factor: "Venue", impact: "neutral", description: game.venue });
      }

      const spreadMovement = game.lineMovement.find(lm => lm.market === "spread");
      if (spreadMovement) {
        const dir = spreadMovement.direction === "up" ? "positive" : spreadMovement.direction === "down" ? "negative" : "neutral";
        factors.push({
          factor: "Spread Movement",
          impact: dir,
          description: `${spreadMovement.opening} -> ${spreadMovement.current} (${spreadMovement.velocity}${spreadMovement.sharpAction ? ", sharp action" : ""})`,
        });
        if (spreadMovement.sharpAction) impactScore += 2;
        if (spreadMovement.velocity === "steam" || spreadMovement.velocity === "fast") impactScore += 1;
      }

      const totalMovement = game.lineMovement.find(lm => lm.market === "total");
      if (totalMovement) {
        const dir = totalMovement.direction === "up" ? "positive" : totalMovement.direction === "down" ? "negative" : "neutral";
        factors.push({
          factor: "Total Movement",
          impact: dir,
          description: `${totalMovement.opening} -> ${totalMovement.current} (${totalMovement.velocity}${totalMovement.sharpAction ? ", sharp action" : ""})`,
        });
        if (totalMovement.sharpAction) impactScore += 2;
      }

      if (game.edgeAnalysis.valueSide && game.edgeAnalysis.valueSide !== "none") {
        factors.push({
          factor: "Value Edge",
          impact: "positive",
          description: `${game.edgeAnalysis.valueSide === "home" ? game.homeTeam.name : game.awayTeam.name} shows positive expected value`,
        });
        impactScore += 1;
      }

      const impactLevel: GameContext["impactLevel"] = impactScore >= 4 ? "high" : impactScore >= 2 ? "medium" : "low";

      return { id: game.id, game, factors, impactLevel };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.impactLevel] - order[b.impactLevel];
    });
}

export function RefereeAnalysis() {
  const [sport, setSport] = useState("NBA");

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const contexts = useMemo(() => {
    if (!data?.games) return [];
    return deriveGameContexts(data.games);
  }, [data]);

  return (
    <div className="space-y-4" data-testid="game-context-analysis">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Scale className="w-5 h-5 text-primary" />
          <span className="font-medium">Game Context Analysis</span>
          <Badge variant="outline">Situational Factors</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-referee-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
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
              <span className="text-sm">Failed to load game context data. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && contexts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Scale className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-contexts">
              No upcoming games with context data available for {sport}.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {contexts.map(ctx => (
          <Card
            key={ctx.id}
            className={ctx.impactLevel === "high" ? "border-primary/30 bg-primary/5" : ""}
            data-testid={`card-context-${ctx.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge>{sport}</Badge>
                    <span className="font-semibold text-lg" data-testid={`text-game-${ctx.id}`}>{ctx.game.shortName}</span>
                    <Badge
                      variant={ctx.impactLevel === "high" ? "default" : ctx.impactLevel === "medium" ? "secondary" : "outline"}
                    >
                      {ctx.impactLevel.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  {ctx.game.venue && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{ctx.game.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Spread</p>
                  <p className="font-bold" data-testid={`text-spread-${ctx.id}`}>
                    {ctx.game.consensus.spread !== undefined ? ctx.game.consensus.spread : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold" data-testid={`text-total-${ctx.id}`}>
                    {ctx.game.consensus.total !== undefined ? ctx.game.consensus.total : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Home Record</p>
                  <p className="font-bold text-green-500">{ctx.game.homeTeam.record}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Away Record</p>
                  <p className="font-bold">{ctx.game.awayTeam.record}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {ctx.factors.map((factor, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg flex items-center justify-between gap-2 ${
                      factor.impact === "positive" ? "bg-green-500/10" :
                      factor.impact === "negative" ? "bg-red-500/10" :
                      "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {factor.impact === "positive" ? (
                        <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                      ) : factor.impact === "negative" ? (
                        <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium text-sm">{factor.factor}</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-right">{factor.description}</span>
                  </div>
                ))}
              </div>

              {ctx.game.edgeAnalysis.valueSide && ctx.game.edgeAnalysis.valueSide !== "none" && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <p className="text-sm">
                      Value detected on {ctx.game.edgeAnalysis.valueSide === "home" ? ctx.game.homeTeam.name : ctx.game.awayTeam.name} (EV: {ctx.game.edgeAnalysis.valueSide === "home" ? ctx.game.edgeAnalysis.homeEV.toFixed(2) : ctx.game.edgeAnalysis.awayEV.toFixed(2)})
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="text-data-source">
          <Database className="w-3 h-3" />
          <span>Data: {data.meta.dataSources.join(", ")} | {data.meta.totalGames} games | Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
