import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Users, TrendingUp, TrendingDown, Shield, Target, Flame, 
  AlertTriangle, ChevronDown, ChevronUp, Zap, Activity,
  ArrowRight, Star, Clock, Info
} from "lucide-react";

interface PlayerProfile {
  id: string;
  name: string;
  team: string;
  position: string;
  number: number;
  imageUrl?: string;
}

interface PlayerStats {
  seasonAvg: number;
  last5Avg: number;
  last10Avg: number;
  high: number;
  low: number;
  gamesPlayed: number;
  consistency: number;
}

interface DefenderProfile {
  name: string;
  team: string;
  position: string;
  rankVsPosition: number;
  yardsAllowed: number;
  receptionRateAllowed: number;
  tdAllowed: number;
}

interface MatchupAnalysis {
  id: string;
  player: PlayerProfile;
  defender: DefenderProfile | null;
  opponent: string;
  gameTime: string;
  sport: "NFL" | "NBA" | "MLB" | "NHL" | "NCAAF" | "NCAAB";
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  stats: PlayerStats;
  vsOpponentHistory: {
    games: number;
    avg: number;
    overHitRate: number;
    recentResults: number[];
  };
  factors: {
    type: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
    weight: number;
  }[];
  projection: number;
  confidence: number;
  edge: number;
  recommendation: "strong_over" | "lean_over" | "neutral" | "lean_under" | "strong_under";
  hotStreak: boolean;
  coldStreak: boolean;
  injuryStatus: "healthy" | "questionable" | "probable" | "doubtful" | "out";
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case "strong_over": return { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-500", label: "STRONG OVER" };
    case "lean_over": return { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-400", label: "LEAN OVER" };
    case "neutral": return { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground", label: "NEUTRAL" };
    case "lean_under": return { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", label: "LEAN UNDER" };
    case "strong_under": return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", label: "STRONG UNDER" };
    default: return { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground", label: "NEUTRAL" };
  }
}

function MatchupSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}

function PlayerMatchupCard({ matchup, onAdd }: { matchup: MatchupAnalysis; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const style = getRecommendationStyle(matchup.recommendation);

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
              {matchup.player.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{matchup.player.name}</span>
                {matchup.injuryStatus !== "healthy" && (
                  <Badge 
                    className={`text-xs gap-1 ${
                      matchup.injuryStatus === "out" ? "bg-red-500 text-white" :
                      matchup.injuryStatus === "doubtful" ? "bg-red-400 text-white" :
                      matchup.injuryStatus === "questionable" ? "bg-yellow-500 text-black" :
                      "bg-green-500 text-white"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {matchup.injuryStatus.toUpperCase()}
                  </Badge>
                )}
                {matchup.hotStreak && <Badge className="bg-orange-500 text-white text-xs gap-1"><Flame className="w-3 h-3" />HOT</Badge>}
                {matchup.coldStreak && <Badge variant="secondary" className="text-xs gap-1"><TrendingDown className="w-3 h-3" />COLD</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {matchup.player.team} {matchup.player.position} #{matchup.player.number} • vs {matchup.opponent} • {matchup.stats.gamesPlayed} GP
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${style.text} border ${style.border} bg-transparent text-xs`}>
              {style.label}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">{matchup.gameTime}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{matchup.propType}</p>
            <p className="font-bold text-lg">{matchup.line}</p>
            <p className="text-xs text-muted-foreground">Line</p>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Projection</p>
            <p className={`font-bold text-lg ${matchup.projection > matchup.line ? "text-green-500" : "text-red-500"}`}>
              {matchup.projection.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {matchup.projection > matchup.line ? "+" : ""}{(matchup.projection - matchup.line).toFixed(1)}
            </p>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="font-bold text-lg">{matchup.confidence}%</p>
            <Progress value={matchup.confidence} className="h-1 mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span>Season: {matchup.stats.seasonAvg}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>L5: {matchup.stats.last5Avg}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>L10: {matchup.stats.last10Avg}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span>Edge: <span className={matchup.edge > 0 ? "text-green-500" : "text-red-500"}>+{matchup.edge.toFixed(1)}%</span></span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1">
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="space-y-4 pt-3 border-t">
            {matchup.defender && (
              <div className="p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Primary Defender
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{matchup.defender.name}</p>
                    <p className="text-xs text-muted-foreground">{matchup.defender.team} {matchup.defender.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Rank vs {matchup.player.position}: <span className={matchup.defender.rankVsPosition > 20 ? "text-green-500" : matchup.defender.rankVsPosition < 10 ? "text-red-500" : ""}><strong>#{matchup.defender.rankVsPosition}</strong></span></p>
                    {(matchup.sport === "NFL" || matchup.sport === "NCAAF") && <p className="text-xs text-muted-foreground">{matchup.defender.receptionRateAllowed}% catch rate allowed</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">vs {matchup.opponent} History</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold">{matchup.vsOpponentHistory.games}</p>
                  <p className="text-muted-foreground">Games</p>
                </div>
                <div>
                  <p className="font-bold">{matchup.vsOpponentHistory.avg}</p>
                  <p className="text-muted-foreground">Avg</p>
                </div>
                <div>
                  <p className="font-bold text-green-500">{matchup.vsOpponentHistory.overHitRate}%</p>
                  <p className="text-muted-foreground">Over Rate</p>
                </div>
                <div>
                  <div className="flex gap-1 justify-center">
                    {matchup.vsOpponentHistory.recentResults.slice(0, 3).map((r, i) => (
                      <Badge key={i} variant="secondary" className={`text-xs ${r > matchup.line ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-1">Recent</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Key Factors</p>
              {matchup.factors.map((factor, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 bg-background/30 rounded">
                  <div className="flex items-center gap-2">
                    {factor.impact === "positive" ? <TrendingUp className="w-3 h-3 text-green-500" /> :
                     factor.impact === "negative" ? <TrendingDown className="w-3 h-3 text-red-500" /> :
                     <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                    <span className="font-medium">{factor.type}</span>
                  </div>
                  <span className="text-muted-foreground">{factor.description}</span>
                  <Badge variant="outline" className={`text-xs ${factor.impact === "positive" ? "text-green-500" : factor.impact === "negative" ? "text-red-500" : ""}`}>
                    {factor.weight > 0 ? "+" : ""}{factor.weight}%
                  </Badge>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Season Range</p>
                <p className="font-mono text-sm">{matchup.stats.low} - {matchup.stats.high}</p>
              </div>
              <div className="p-3 bg-background/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-bold">{matchup.stats.consistency}%</p>
                  <Progress value={matchup.stats.consistency} className="h-1.5 w-16" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" onClick={onAdd} className="flex-1 gap-1" data-testid={`button-add-${matchup.id}`}>
            <Zap className="w-4 h-4" />
            Add to Parlay
          </Button>
          <div className="flex gap-2 text-xs">
            <span className="text-green-500">O {matchup.overOdds > 0 ? "+" : ""}{matchup.overOdds}</span>
            <span className="text-red-500">U {matchup.underOdds > 0 ? "+" : ""}{matchup.underOdds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerMatchupCenter() {
  const [selectedSport, setSelectedSport] = useState<string>("NBA");
  const [propType, setPropType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("edge");

  const { data: matchups = [], isLoading } = useQuery<MatchupAnalysis[]>({
    queryKey: ["/api/tools/matchups", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/tools/matchups/${selectedSport}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matchups");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    let result = [...matchups];
    if (propType !== "all") result = result.filter(m => m.propType.toLowerCase().includes(propType.toLowerCase()));
    
    switch (sortBy) {
      case "edge": result.sort((a, b) => b.edge - a.edge); break;
      case "confidence": result.sort((a, b) => b.confidence - a.confidence); break;
      case "time": break;
    }
    return result;
  }, [matchups, propType, sortBy]);

  const topPicks = filtered.filter(m => m.recommendation.includes("strong"));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Player Matchup Center
            <Badge variant="secondary" className="text-xs">{filtered.length} Matchups</Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">Data source: live game data, 46-Factor projected analysis</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-28" data-testid="select-sport">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edge">Top Edge</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="time">Game Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <MatchupSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Matchups</TabsTrigger>
              <TabsTrigger value="top" className="gap-1">
                <Star className="w-3 h-3" />
                Top Picks ({topPicks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-matchup-empty">
                  No matchups available for {selectedSport}. Games may not be scheduled today.
                </div>
              ) : (
                filtered.map((matchup) => (
                  <PlayerMatchupCard
                    key={matchup.id}
                    matchup={matchup}
                    onAdd={() => console.log("Add", matchup.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="top" className="space-y-4">
              {topPicks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No strong recommendations at this time
                </div>
              ) : (
                topPicks.map((matchup) => (
                  <PlayerMatchupCard
                    key={matchup.id}
                    matchup={matchup}
                    onAdd={() => console.log("Add", matchup.id)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
