import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, CheckCircle, AlertTriangle, Plus, Zap, AlertCircle } from "lucide-react";

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: { spread?: number; total?: number; homeImpliedProb?: number; awayImpliedProb?: number };
  leaders?: { team: string; category: string; playerName: string; value: string }[];
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; bookmakerCount: number; dataSources: string[]; generatedAt: string };
}

interface StackLeg {
  player: string;
  prop: string;
  line: number;
  recommendation: string;
}

interface DerivedStack {
  id: string;
  name: string;
  game: string;
  legs: StackLeg[];
  correlationScore: number;
  combinedEV: number;
  synergy: "strong" | "moderate" | "weak";
  reason: string;
  warnings: string[];
  gameId: string;
}

function deriveStacks(games: MarketGame[]): DerivedStack[] {
  const stacks: DerivedStack[] = [];

  for (const game of games) {
    if (!game.leaders || game.leaders.length < 2) continue;

    const homeLeaders = game.leaders.filter(l =>
      l.team === game.homeTeam.abbreviation || l.team === game.homeTeam.name
    );
    const awayLeaders = game.leaders.filter(l =>
      l.team === game.awayTeam.abbreviation || l.team === game.awayTeam.name
    );

    const buildTeamStack = (leaders: typeof game.leaders, teamAbbr: string, teamName: string, teamWinPct: number) => {
      if (leaders.length < 2) return;

      const legs: StackLeg[] = leaders.map(leader => {
        const rawVal = parseFloat(leader.value) || 0;
        const line = Math.round(rawVal * 0.95 * 2) / 2;
        return {
          player: leader.playerName,
          prop: `${leader.category} O${line}`,
          line,
          recommendation: teamWinPct > 55 ? "lean_over" : "neutral",
        };
      });

      if (game.consensus.total) {
        legs.push({
          player: "Game Total",
          prop: `Over ${game.consensus.total}`,
          line: game.consensus.total,
          recommendation: "lean_over",
        });
      }

      const avgWinPct = teamWinPct / 100;
      const correlationScore = Math.round((0.5 + avgWinPct * 0.35 + (leaders.length > 2 ? 0.1 : 0)) * 100) / 100;
      const clampedCorr = Math.min(0.95, Math.max(0.3, correlationScore));

      const combinedEV = Math.round((clampedCorr * 10 + (teamWinPct - 50) * 0.3) * 10) / 10;

      const synergy: DerivedStack["synergy"] =
        clampedCorr >= 0.75 ? "strong" : clampedCorr >= 0.55 ? "moderate" : "weak";

      const warnings: string[] = [];
      if (teamWinPct < 45) warnings.push("Below .500 team - higher variance");
      if (leaders.length < 2) warnings.push("Limited player data available");

      stacks.push({
        id: `${game.id}-${teamAbbr}-stack`,
        name: `${teamName} Game Stack`,
        game: game.shortName,
        legs,
        correlationScore: clampedCorr,
        combinedEV,
        synergy,
        reason: `${teamName} leaders (${leaders.map(l => l.playerName).join(", ")}) production correlates in ${game.shortName}.`,
        warnings,
        gameId: game.id,
      });
    };

    if (homeLeaders.length >= 2) {
      buildTeamStack(homeLeaders, game.homeTeam.abbreviation, game.homeTeam.abbreviation, game.homeTeam.winPct);
    }
    if (awayLeaders.length >= 2) {
      buildTeamStack(awayLeaders, game.awayTeam.abbreviation, game.awayTeam.abbreviation, game.awayTeam.winPct);
    }
  }

  return stacks.sort((a, b) => b.correlationScore - a.correlationScore);
}

export function CorrelationEngine() {
  const [sport, setSport] = useState("NFL");
  const [minCorrelation, setMinCorrelation] = useState("0.5");

  const { data, isLoading, error } = useQuery<MarketSnapshot>({
    queryKey: [`/api/market-snapshot?sport=${sport}`],
  });

  const allStacks = data ? deriveStacks(data.games) : [];
  const filtered = allStacks.filter(s => s.correlationScore >= parseFloat(minCorrelation));

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="correlation-engine-loading">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Correlation Engine</span>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(j => <Skeleton key={j} className="h-10" />)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" data-testid="correlation-engine-error">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <span className="font-medium">Correlation Engine</span>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load correlation data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="correlation-engine-container">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-base">Parlay Correlation Engine</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maps how individual legs relate to each other — flags negative correlations before you lock in, surfaces positive ones to stack with confidence.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-correlation-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={minCorrelation} onValueChange={setMinCorrelation}>
            <SelectTrigger className="w-40" data-testid="select-min-correlation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Correlations</SelectItem>
              <SelectItem value="0.5">Strong Only (0.5+)</SelectItem>
              <SelectItem value="0.7">Very Strong (0.7+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {data?.meta?.dataSources && (
        <p className="text-xs text-muted-foreground" data-testid="text-correlation-data-source">
          Data: {data.meta.dataSources.join(", ")}
        </p>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center" data-testid="correlation-engine-empty">
            <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No correlation stacks found for {sport} with minimum correlation {minCorrelation}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(stack => (
            <Card
              key={stack.id}
              className={`${
                stack.synergy === "strong"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border"
              }`}
              data-testid={`card-stack-${stack.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{sport}</Badge>
                    <CardTitle className="text-base" data-testid={`text-stack-name-${stack.id}`}>{stack.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={stack.correlationScore >= 0.7 ? "default" : "secondary"}
                    >
                      {stack.correlationScore.toFixed(2)} Correlation
                    </Badge>
                    <Badge
                      className={`${
                        stack.combinedEV > 8 ? "bg-green-500" :
                        stack.combinedEV > 0 ? "bg-green-400" :
                        "bg-red-500"
                      } text-white`}
                    >
                      {stack.combinedEV > 0 ? "+" : ""}{stack.combinedEV.toFixed(1)}% EV
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{stack.game}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {stack.legs.map((leg, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{leg.player}</span>
                        <span className="text-muted-foreground">{leg.prop}</span>
                      </div>
                      <Badge variant="outline" className={
                        leg.recommendation.includes("over") ? "text-green-500 border-green-500/30" : "text-muted-foreground"
                      }>
                        {leg.recommendation.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <p className="text-sm">{stack.reason}</p>
                  </div>
                </div>

                {stack.warnings.length > 0 && (
                  <div className="space-y-1">
                    {stack.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-yellow-500">
                        <AlertTriangle className="w-4 h-4" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" data-testid={`button-add-stack-${stack.id}`}>
                    <Zap className="w-4 h-4 mr-2" />
                    Add to Builder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
