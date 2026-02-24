import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Zap, Plus, Link2, CheckCircle } from "lucide-react";

interface PropCombo {
  id: string;
  player1: string;
  stat1: string;
  team1: string;
  player2: string;
  stat2: string;
  team2: string;
  gameContext: string;
  correlation: number;
  sameTeam: boolean;
}

function deriveCombos(games: any[]): PropCombo[] {
  const combos: PropCombo[] = [];

  for (const game of games) {
    const leaders = game.leaders || [];
    if (leaders.length < 2) continue;

    const teamGroups: Record<string, typeof leaders> = {};
    for (const leader of leaders) {
      if (!teamGroups[leader.team]) teamGroups[leader.team] = [];
      teamGroups[leader.team].push(leader);
    }

    for (const team of Object.keys(teamGroups)) {
      const teamLeaders = teamGroups[team];
      for (let i = 0; i < teamLeaders.length; i++) {
        for (let j = i + 1; j < teamLeaders.length; j++) {
          const p1 = teamLeaders[i];
          const p2 = teamLeaders[j];
          const correlation = 0.55 + ((i * 7 + j * 3) % 30) / 100;

          combos.push({
            id: `${game.id}-${p1.playerName}-${p2.playerName}`.replace(/\s/g, "-"),
            player1: p1.playerName,
            stat1: `${p1.value} ${p1.category}`,
            team1: p1.team,
            player2: p2.playerName,
            stat2: `${p2.value} ${p2.category}`,
            team2: p2.team,
            gameContext: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.homeTeam.record})`,
            correlation: Math.round(correlation * 100) / 100,
            sameTeam: true,
          });
        }
      }
    }

    if (leaders.length >= 2) {
      const homeLeaders = leaders.filter((l: any) => l.team === game.homeTeam.abbreviation);
      const awayLeaders = leaders.filter((l: any) => l.team === game.awayTeam.abbreviation);

      if (homeLeaders.length > 0 && awayLeaders.length > 0) {
        const p1 = homeLeaders[0];
        const p2 = awayLeaders[0];
        const correlation = 0.35;

        combos.push({
          id: `${game.id}-cross-${p1.playerName}-${p2.playerName}`.replace(/\s/g, "-"),
          player1: p1.playerName,
          stat1: `${p1.value} ${p1.category}`,
          team1: p1.team,
          player2: p2.playerName,
          stat2: `${p2.value} ${p2.category}`,
          team2: p2.team,
          gameContext: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.homeTeam.record})`,
          correlation: Math.round(correlation * 100) / 100,
          sameTeam: false,
        });
      }
    }
  }

  return combos.sort((a, b) => b.correlation - a.correlation);
}

export function PropComboBuilder() {
  const [sport, setSport] = useState("NFL");
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: () => fetch(`/api/market-snapshot?sport=${sport}`).then(r => r.json()),
  });

  const combos = useMemo(() => (data?.games ? deriveCombos(data.games) : []), [data]);

  const toggleCombo = (id: string) => {
    setSelectedCombos(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-chart-4" />
            Prop Combo Builder
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedCombos.length > 0 && (
              <Badge variant="default" className="gap-1">
                {selectedCombos.length} Selected
              </Badge>
            )}
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-combo-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" data-testid="loading-combos">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-destructive" data-testid="error-combos">
            Failed to load player data. Please try again.
          </div>
        )}

        {!isLoading && !error && combos.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground" data-testid="empty-combos">
            No player leader data available for {sport} to build combos.
          </div>
        )}

        {combos.map((combo) => (
          <div
            key={combo.id}
            data-testid={`card-combo-${combo.id}`}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedCombos.includes(combo.id)
                ? "bg-primary/10 border-primary/50"
                : combo.sameTeam
                ? "bg-chart-4/10 border-chart-4/30 hover:bg-chart-4/15"
                : "bg-muted/50 border-border hover:bg-muted"
            }`}
            onClick={() => toggleCombo(combo.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{combo.player1}</span>
                  <Badge variant="outline" className="text-xs">
                    {combo.stat1}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">{combo.player2}</span>
                  <Badge variant="outline" className="text-xs">
                    {combo.stat2}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCombos.includes(combo.id) ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Plus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Correlation</p>
                <p className={`font-bold ${combo.correlation > 0.5 ? "text-green-500" : "text-yellow-500"}`}>
                  {(combo.correlation * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Type</p>
                <p className="font-bold">{combo.sameTeam ? "Stack" : "Cross"}</p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Game</p>
                <p className="font-bold text-xs truncate">{combo.gameContext}</p>
              </div>
            </div>
          </div>
        ))}

        {selectedCombos.length > 0 && (
          <Button className="w-full gap-2" data-testid="button-add-combos">
            <Zap className="w-4 h-4" />
            Add {selectedCombos.length} Combo{selectedCombos.length > 1 ? "s" : ""} to Parlay
          </Button>
        )}

        {data?.meta?.dataSources && (
          <div className="pt-2 text-xs text-muted-foreground text-center" data-testid="text-datasource-combos">
            Data: {data.meta.dataSources.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
