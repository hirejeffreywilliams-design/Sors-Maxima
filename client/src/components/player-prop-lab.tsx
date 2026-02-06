import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, TrendingDown, User, ArrowUp, ArrowDown } from "lucide-react";

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

const SAMPLE_PLAYERS: PlayerData[] = [
  {
    id: "p1",
    name: "LeBron James",
    team: "LAL",
    position: "SF",
    sport: "NBA",
    last5: [28, 32, 24, 30, 27],
    seasonAvg: 27.4,
    vsOpponent: [31, 29, 34, 26],
    projections: [28.5, 29.0, 27.8, 30.2],
    props: [
      { type: "Points", line: 26.5, overPct: 68, underPct: 32, recommendation: "over", trend: "up" },
      { type: "Rebounds", line: 7.5, overPct: 55, underPct: 45, recommendation: "over", trend: "flat" },
      { type: "Assists", line: 7.5, overPct: 52, underPct: 48, recommendation: "neutral", trend: "down" },
    ],
  },
  {
    id: "p2",
    name: "Jayson Tatum",
    team: "BOS",
    position: "SF",
    sport: "NBA",
    last5: [30, 26, 33, 28, 31],
    seasonAvg: 28.9,
    vsOpponent: [35, 27, 30, 32],
    projections: [29.5, 30.1, 28.8, 31.0],
    props: [
      { type: "Points", line: 28.5, overPct: 62, underPct: 38, recommendation: "over", trend: "up" },
      { type: "Rebounds", line: 8.5, overPct: 48, underPct: 52, recommendation: "under", trend: "down" },
      { type: "Assists", line: 4.5, overPct: 58, underPct: 42, recommendation: "over", trend: "up" },
    ],
  },
  {
    id: "p3",
    name: "Josh Allen",
    team: "BUF",
    position: "QB",
    sport: "NFL",
    last5: [285, 312, 268, 340, 295],
    seasonAvg: 298.2,
    vsOpponent: [310, 278, 325],
    projections: [295.0, 305.5, 290.0, 310.0],
    props: [
      { type: "Pass Yards", line: 275.5, overPct: 72, underPct: 28, recommendation: "over", trend: "up" },
      { type: "Pass TDs", line: 2.5, overPct: 55, underPct: 45, recommendation: "over", trend: "flat" },
      { type: "Rush Yards", line: 35.5, overPct: 60, underPct: 40, recommendation: "over", trend: "up" },
    ],
  },
  {
    id: "p4",
    name: "Tyreek Hill",
    team: "MIA",
    position: "WR",
    sport: "NFL",
    last5: [95, 142, 78, 110, 88],
    seasonAvg: 98.5,
    vsOpponent: [156, 134, 137],
    projections: [100.0, 105.5, 95.0, 112.0],
    props: [
      { type: "Rec Yards", line: 82.5, overPct: 65, underPct: 35, recommendation: "over", trend: "up" },
      { type: "Receptions", line: 5.5, overPct: 58, underPct: 42, recommendation: "over", trend: "flat" },
      { type: "Anytime TD", line: 0.5, overPct: 45, underPct: 55, recommendation: "under", trend: "down" },
    ],
  },
  {
    id: "p5",
    name: "Nikola Jokic",
    team: "DEN",
    position: "C",
    sport: "NBA",
    last5: [25, 31, 22, 28, 35],
    seasonAvg: 26.8,
    vsOpponent: [30, 28, 33],
    projections: [27.5, 28.0, 26.5, 29.0],
    props: [
      { type: "Points", line: 25.5, overPct: 64, underPct: 36, recommendation: "over", trend: "up" },
      { type: "Rebounds", line: 12.5, overPct: 58, underPct: 42, recommendation: "over", trend: "up" },
      { type: "Assists", line: 9.5, overPct: 55, underPct: 45, recommendation: "over", trend: "flat" },
    ],
  },
];

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

export function PlayerPropLab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_PLAYERS;
    return SAMPLE_PLAYERS.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-chart-1" />
        <span className="font-medium">Player Prop Lab</span>
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
