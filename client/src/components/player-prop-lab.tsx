import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown, User, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PlayerProp {
  type: string;
  line: number;
  overPct: number;
  underPct: number;
  recommendation: "over" | "under" | "neutral";
  trend: "up" | "down" | "flat";
}

interface PlayerData {
  id: string;
  name: string;
  team: string;
  position: string;
  sport: string;
  last5: number[];
  seasonAvg: number;
  vsOpponent: number[];
  projections: number[];
  props: PlayerProp[];
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

function StatBars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {values.map((v, i) => {
          const pct = max > 0 ? (v / max) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{v}</span>
              <div
                className="w-full bg-chart-1 rounded-md"
                style={{ height: `${pct}%`, minHeight: 4 }}
                data-testid={`bar-${label.toLowerCase().replace(/\s/g, "-")}-${i}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerPropLab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedSport, setSelectedSport] = useState("NBA");

  const { data: players = [], isLoading } = useQuery<PlayerData[]>({
    queryKey: ["/api/tools/player-props", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/tools/player-props/${selectedSport}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player props");
      return res.json();
    },
  });

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    return players.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, players]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-chart-1" />
          <span className="font-medium">Player Prop Lab</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">Data source: live game data, 46-Factor projected analysis</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v); setSelectedPlayer(null); }}>
          <SelectTrigger className="w-28" data-testid="select-prop-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search players by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-player-search"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
          {searchQuery ? "No players match your search" : "No player data available for this sport. Data may still be loading."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Card
              key={player.id}
              className={`cursor-pointer transition-colors ${
                selectedPlayer?.id === player.id ? "border-chart-1" : ""
              }`}
            >
              <CardContent className="p-4">
                <button
                  className="w-full text-left"
                  onClick={() => setSelectedPlayer(player)}
                  data-testid={`button-select-player-${player.id}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.team} - {player.position}
                      </p>
                    </div>
                    <Badge variant="outline" data-testid={`badge-sport-${player.id}`}>{player.sport}</Badge>
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPlayer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>{selectedPlayer.name}</CardTitle>
                <CardDescription>
                  {selectedPlayer.team} - {selectedPlayer.position} - {selectedPlayer.sport}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlayer(null)}
                data-testid="button-close-player-detail"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="last5" data-testid="tabs-player-stats">
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="last5" data-testid="tab-last5">
                  Last 5 Games
                </TabsTrigger>
                <TabsTrigger value="season" data-testid="tab-season">
                  Season Avg
                </TabsTrigger>
                <TabsTrigger value="opponent" data-testid="tab-opponent">
                  vs Opponent
                </TabsTrigger>
                <TabsTrigger value="projections" data-testid="tab-projections">
                  Projections
                </TabsTrigger>
              </TabsList>
              <TabsContent value="last5">
                <StatBars values={selectedPlayer.last5} label="Last 5 Games" />
              </TabsContent>
              <TabsContent value="season">
                <div className="p-4 bg-muted/30 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Season Average</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-season-avg">
                    {selectedPlayer.seasonAvg}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="opponent">
                <StatBars values={selectedPlayer.vsOpponent} label="vs Opponent" />
              </TabsContent>
              <TabsContent value="projections">
                <StatBars values={selectedPlayer.projections} label="Model Projections" />
              </TabsContent>
            </Tabs>

            <div>
              <p className="text-sm font-medium mb-2">Prop Lines</p>
              <div className="space-y-2">
                {selectedPlayer.props.map((prop, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-md flex-wrap"
                    data-testid={`row-prop-${selectedPlayer.id}-${i}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{prop.type}</span>
                      <Badge variant="outline" data-testid={`badge-line-${selectedPlayer.id}-${i}`}>{prop.line}</Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        O {prop.overPct}% / U {prop.underPct}%
                      </span>
                      <Badge
                        variant={
                          prop.recommendation === "over"
                            ? "default"
                            : prop.recommendation === "under"
                            ? "destructive"
                            : "secondary"
                        }
                        data-testid={`badge-recommendation-${selectedPlayer.id}-${i}`}
                      >
                        {prop.recommendation.toUpperCase()}
                      </Badge>
                      {prop.trend === "up" && (
                        <ArrowUp className="w-4 h-4 text-green-500" data-testid={`icon-trend-up-${i}`} />
                      )}
                      {prop.trend === "down" && (
                        <ArrowDown className="w-4 h-4 text-red-500" data-testid={`icon-trend-down-${i}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
