import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown, User, ArrowUp, ArrowDown, Info, Radar, Swords, Users, Flame, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── PIE Breakdown Panel ───────────────────────────────────────────────────────

interface PIEData {
  compositeGrade: string; compositeScore: number; finalRecommendation: string;
  defenderMatchup: { grade: string; summary: string; defenderRank: number | null; statAllowed: number | null; statAllowedLabel: string };
  gameScriptImpact: { dominantScript: string; propImpact: number; impactSummary: string; closeGameProb: number; blowoutHomeProb: number; blowoutAwayProb: number; overtimeProb: number };
  usageContext: { isOpportunityPlay: boolean; usageBumpPct: number; injuredTeammate: string | null; reasoning: string };
  propSharpSignal: { detected: boolean; type: string; direction: string | null; summary: string; bookCount: number };
  liveRating: { isLive: boolean; liveProbability: number | null };
}

function pieGradeBg(grade: string): string {
  if (grade === "A") return "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
  if (grade === "B") return "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400";
  if (grade === "C") return "bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
  if (grade === "D") return "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400";
  return "bg-red-500/15 border-red-500/30 text-red-500";
}

function PIEBreakdown({ playerName, sport, market }: { playerName: string; sport: string; market: string }) {
  const { data, isLoading } = useQuery<PIEData>({
    queryKey: ["/api/prop-intelligence", sport, "lab", playerName, market],
    queryFn: async () => {
      const params = new URLSearchParams({ side: "over", line: "20", homeTeam: "home", awayTeam: "away", playerTeam: "home", confidence: "60" });
      const res = await fetch(`/api/prop-intelligence/${sport}/lab-${playerName}/${encodeURIComponent(playerName)}/${market}?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("PIE unavailable");
      return res.json();
    },
    staleTime: 90000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Activity className="w-4 h-4 animate-pulse text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Running prop intelligence analysis...</span>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-4">Select a prop below to see full intelligence breakdown.</p>;
  }

  return (
    <div className="space-y-3" data-testid="pie-breakdown">
      {/* Composite Grade */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Composite Score</span>
        <span className={`text-sm font-bold px-2 py-0.5 rounded border ${pieGradeBg(data.compositeGrade)}`}
          data-testid="text-pie-composite-grade">
          Grade {data.compositeGrade} — {data.compositeScore}/100
        </span>
      </div>

      {/* Defender Matchup */}
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Defender Matchup</span>
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ml-auto ${pieGradeBg(data.defenderMatchup.grade)}`}
            data-testid="text-pie-defender-grade">
            {data.defenderMatchup.grade}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{data.defenderMatchup.summary}</p>
        {data.defenderMatchup.statAllowed != null && (
          <p className="text-[10px] text-muted-foreground">Avg {data.defenderMatchup.statAllowedLabel}: <span className="font-mono font-semibold text-foreground">{data.defenderMatchup.statAllowed}</span></p>
        )}
      </div>

      {/* Game Script */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Radar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Game Script Projection</span>
          <span className={`text-[9px] font-semibold ml-auto ${data.gameScriptImpact.propImpact > 0 ? "text-emerald-500" : data.gameScriptImpact.propImpact < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {data.gameScriptImpact.propImpact > 0 ? "+" : ""}{data.gameScriptImpact.propImpact}% impact
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{data.gameScriptImpact.impactSummary}</p>
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: "Close", pct: data.gameScriptImpact.closeGameProb },
            { label: "Home BW", pct: data.gameScriptImpact.blowoutHomeProb },
            { label: "Away BW", pct: data.gameScriptImpact.blowoutAwayProb },
            { label: "OT", pct: data.gameScriptImpact.overtimeProb },
          ].map(s => (
            <div key={s.label} className="rounded bg-muted/30 px-1 py-1">
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
              <p className="text-[10px] font-bold">{s.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Context */}
      {data.usageContext.isOpportunityPlay && (
        <div className="rounded-lg border bg-violet-500/5 border-violet-500/25 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Opportunity Play</span>
            <Badge className="text-[8px] px-1 py-0 bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 ml-auto">
              +{data.usageContext.usageBumpPct}% usage
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{data.usageContext.reasoning}</p>
        </div>
      )}

      {/* Sharp Signal */}
      {data.propSharpSignal.detected && (
        <div className="rounded-lg border bg-yellow-500/5 border-yellow-500/25 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
              {data.propSharpSignal.type === "steam" ? "Steam Move" : "Reverse Line Movement"}
            </span>
            {data.propSharpSignal.direction && (
              <Badge className="text-[8px] px-1 py-0 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 ml-auto uppercase">
                {data.propSharpSignal.direction}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{data.propSharpSignal.summary}</p>
        </div>
      )}

      {/* Final Recommendation */}
      <p className="text-xs font-medium text-muted-foreground border-t pt-2">{data.finalRecommendation}</p>
    </div>
  );
}

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

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

function StatBars({ values, label }: { values: number[] | null | undefined; label: string }) {
  if (!values || values.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center justify-center h-20 rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }
  const max = Math.max(...values, 0);
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
                <TabsTrigger value="intelligence" data-testid="tab-intelligence">
                  <Radar className="w-3 h-3 mr-1" />
                  PIE
                </TabsTrigger>
              </TabsList>
              <TabsContent value="last5">
                <StatBars values={selectedPlayer.last5} label="Last 5 Games" />
              </TabsContent>
              <TabsContent value="intelligence">
                <PIEBreakdown
                  playerName={selectedPlayer.name}
                  sport={selectedPlayer.sport}
                  market={selectedPlayer.props[0]?.type === "Points" ? "player_points" : selectedPlayer.props[0]?.type === "Rebounds" ? "player_rebounds" : "player_assists"}
                />
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
