import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, TrendingUp, TrendingDown, Shield, Target, Flame, 
  AlertTriangle, ChevronDown, ChevronUp, Zap, Activity,
  ArrowRight, Star, Clock
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
  sport: "NFL" | "NBA" | "MLB" | "NHL";
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

function generateComprehensiveMatchups(): MatchupAnalysis[] {
  return [
    {
      id: "nfl-1",
      player: { id: "p1", name: "Tyreek Hill", team: "MIA", position: "WR", number: 10 },
      defender: { name: "J.C. Jackson", team: "NE", position: "CB", rankVsPosition: 28, yardsAllowed: 892, receptionRateAllowed: 68, tdAllowed: 7 },
      opponent: "Patriots",
      gameTime: "Today 1:00 PM",
      sport: "NFL",
      propType: "Receiving Yards",
      line: 82.5,
      overOdds: -115,
      underOdds: -105,
      stats: { seasonAvg: 98.5, last5Avg: 112.4, last10Avg: 104.2, high: 181, low: 42, gamesPlayed: 14, consistency: 72 },
      vsOpponentHistory: { games: 6, avg: 142.3, overHitRate: 83, recentResults: [156, 134, 137, 148, 112] },
      factors: [
        { type: "Defense", impact: "positive", description: "NE ranks 28th vs WR - allows 185 YPG", weight: 25 },
        { type: "Target Share", impact: "positive", description: "32% target share (1st on team)", weight: 20 },
        { type: "CB Matchup", impact: "positive", description: "J.C. Jackson allowing 68% catch rate", weight: 18 },
        { type: "Weather", impact: "neutral", description: "Dome - ideal conditions", weight: 5 },
        { type: "Historical", impact: "positive", description: "5-1 over this line vs NE", weight: 15 },
      ],
      projection: 118.5,
      confidence: 82,
      edge: 14.2,
      recommendation: "strong_over",
      hotStreak: true,
      coldStreak: false,
      injuryStatus: "healthy",
    },
    {
      id: "nfl-2",
      player: { id: "p2", name: "Derrick Henry", team: "TEN", position: "RB", number: 22 },
      defender: null,
      opponent: "Jaguars",
      gameTime: "Today 4:25 PM",
      sport: "NFL",
      propType: "Rushing Yards",
      line: 89.5,
      overOdds: -110,
      underOdds: -110,
      stats: { seasonAvg: 105.2, last5Avg: 118.6, last10Avg: 108.4, high: 219, low: 38, gamesPlayed: 14, consistency: 68 },
      vsOpponentHistory: { games: 8, avg: 128.7, overHitRate: 75, recentResults: [142, 118, 126, 134, 98] },
      factors: [
        { type: "Defense", impact: "positive", description: "JAX ranks 24th vs RB - allows 128 YPG", weight: 22 },
        { type: "Workload", impact: "positive", description: "24.2 carries/game (2nd in NFL)", weight: 20 },
        { type: "Gamescript", impact: "positive", description: "TEN favored by 3 - run-heavy script likely", weight: 15 },
        { type: "Rest", impact: "positive", description: "10 days rest since last game", weight: 8 },
        { type: "Historical", impact: "positive", description: "6-2 over this line vs JAX career", weight: 15 },
      ],
      projection: 112.3,
      confidence: 78,
      edge: 10.8,
      recommendation: "strong_over",
      hotStreak: true,
      coldStreak: false,
      injuryStatus: "healthy",
    },
    {
      id: "nfl-3",
      player: { id: "p3", name: "Patrick Mahomes", team: "KC", position: "QB", number: 15 },
      defender: null,
      opponent: "Raiders",
      gameTime: "Tonight 8:20 PM",
      sport: "NFL",
      propType: "Passing Yards",
      line: 285.5,
      overOdds: -108,
      underOdds: -112,
      stats: { seasonAvg: 298.4, last5Avg: 312.8, last10Avg: 302.1, high: 424, low: 214, gamesPlayed: 15, consistency: 74 },
      vsOpponentHistory: { games: 10, avg: 308.2, overHitRate: 70, recentResults: [322, 289, 342, 278, 315] },
      factors: [
        { type: "Defense", impact: "positive", description: "LV ranks 22nd vs QB - allows 248 YPG", weight: 18 },
        { type: "Weapons", impact: "positive", description: "Kelce + Worthy both healthy", weight: 15 },
        { type: "Primetime", impact: "positive", description: "Mahomes 45-8 in primetime games", weight: 12 },
        { type: "Division", impact: "neutral", description: "Divisional game - typically closer", weight: -5 },
        { type: "Weather", impact: "positive", description: "Indoor at Allegiant Stadium", weight: 5 },
      ],
      projection: 302.4,
      confidence: 71,
      edge: 5.9,
      recommendation: "lean_over",
      hotStreak: false,
      coldStreak: false,
      injuryStatus: "healthy",
    },
    {
      id: "nba-1",
      player: { id: "p4", name: "Luka Doncic", team: "DAL", position: "PG", number: 77 },
      defender: { name: "Mikal Bridges", team: "BKN", position: "SF", rankVsPosition: 8, yardsAllowed: 0, receptionRateAllowed: 0, tdAllowed: 0 },
      opponent: "Nets",
      gameTime: "Tonight 7:30 PM",
      sport: "NBA",
      propType: "Points",
      line: 32.5,
      overOdds: -115,
      underOdds: -105,
      stats: { seasonAvg: 33.8, last5Avg: 36.2, last10Avg: 34.5, high: 51, low: 22, gamesPlayed: 42, consistency: 78 },
      vsOpponentHistory: { games: 6, avg: 38.2, overHitRate: 83, recentResults: [42, 35, 38, 44, 32] },
      factors: [
        { type: "Defense", impact: "positive", description: "BKN ranks 26th in Def RTG", weight: 20 },
        { type: "Pace", impact: "positive", description: "BKN plays at 6th fastest pace", weight: 15 },
        { type: "Usage", impact: "positive", description: "38% usage rate (2nd in NBA)", weight: 18 },
        { type: "Rest", impact: "positive", description: "2 days rest, not B2B", weight: 8 },
        { type: "Defender", impact: "neutral", description: "Bridges is solid but undersized", weight: -3 },
      ],
      projection: 36.8,
      confidence: 76,
      edge: 8.4,
      recommendation: "lean_over",
      hotStreak: true,
      coldStreak: false,
      injuryStatus: "questionable",
    },
    {
      id: "nba-2",
      player: { id: "p5", name: "Nikola Jokic", team: "DEN", position: "C", number: 15 },
      defender: null,
      opponent: "Bucks",
      gameTime: "Tonight 10:00 PM",
      sport: "NBA",
      propType: "Rebounds",
      line: 12.5,
      overOdds: -120,
      underOdds: +100,
      stats: { seasonAvg: 13.2, last5Avg: 14.6, last10Avg: 13.8, high: 22, low: 8, gamesPlayed: 44, consistency: 82 },
      vsOpponentHistory: { games: 8, avg: 14.8, overHitRate: 88, recentResults: [16, 14, 15, 18, 12] },
      factors: [
        { type: "Matchup", impact: "positive", description: "Lopez questionable - backup C struggles", weight: 22 },
        { type: "Pace", impact: "neutral", description: "MIL plays at average pace", weight: 0 },
        { type: "Minutes", impact: "positive", description: "Averages 35.2 MPG (top 10)", weight: 12 },
        { type: "Historical", impact: "positive", description: "7-1 over this line vs MIL", weight: 18 },
        { type: "Motivation", impact: "positive", description: "National TV game", weight: 8 },
      ],
      projection: 14.2,
      confidence: 81,
      edge: 9.6,
      recommendation: "strong_over",
      hotStreak: false,
      coldStreak: false,
      injuryStatus: "healthy",
    },
    {
      id: "nba-3",
      player: { id: "p6", name: "Luka Doncic", team: "DAL", position: "PG", number: 77 },
      defender: null,
      opponent: "Suns",
      gameTime: "Tonight 10:00 PM",
      sport: "NBA",
      propType: "3-Pointers Made",
      line: 4.5,
      overOdds: -105,
      underOdds: -115,
      stats: { seasonAvg: 4.8, last5Avg: 3.8, last10Avg: 4.2, high: 9, low: 1, gamesPlayed: 40, consistency: 65 },
      vsOpponentHistory: { games: 6, avg: 5.2, overHitRate: 67, recentResults: [6, 4, 7, 3, 5] },
      factors: [
        { type: "Defense", impact: "positive", description: "PHX allows 4th most 3PM", weight: 18 },
        { type: "Volume", impact: "neutral", description: "10.2 3PA/game this season", weight: 5 },
        { type: "Recent Form", impact: "negative", description: "3.8 avg last 5 - slight slump", weight: -12 },
        { type: "Shooting Luck", impact: "positive", description: "Due for correction to average", weight: 8 },
        { type: "Home", impact: "positive", description: "5.1 3PM avg at Chase Center", weight: 10 },
      ],
      projection: 4.9,
      confidence: 62,
      edge: 3.2,
      recommendation: "lean_over",
      hotStreak: false,
      coldStreak: true,
      injuryStatus: "healthy",
    },
    {
      id: "mlb-1",
      player: { id: "p7", name: "Shohei Ohtani", team: "LAD", position: "DH", number: 17 },
      defender: null,
      opponent: "Giants",
      gameTime: "Today 4:10 PM",
      sport: "MLB",
      propType: "Total Bases",
      line: 1.5,
      overOdds: -130,
      underOdds: +110,
      stats: { seasonAvg: 2.4, last5Avg: 2.8, last10Avg: 2.5, high: 8, low: 0, gamesPlayed: 82, consistency: 58 },
      vsOpponentHistory: { games: 12, avg: 2.1, overHitRate: 67, recentResults: [3, 1, 4, 2, 0] },
      factors: [
        { type: "Pitcher", impact: "positive", description: "Logan Webb allows .285 BAA vs LHH", weight: 20 },
        { type: "Park", impact: "positive", description: "Oracle Park slightly favors power LHH", weight: 8 },
        { type: "Recent Form", impact: "positive", description: "8 XBH in last 10 games", weight: 15 },
        { type: "Day Game", impact: "neutral", description: "Splits even day/night", weight: 0 },
      ],
      projection: 2.2,
      confidence: 68,
      edge: 6.5,
      recommendation: "lean_over",
      hotStreak: true,
      coldStreak: false,
      injuryStatus: "healthy",
    },
  ];
}

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
                    {matchup.sport === "NFL" && <p className="text-xs text-muted-foreground">{matchup.defender.receptionRateAllowed}% catch rate allowed</p>}
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
  const [sport, setSport] = useState<string>("all");
  const [propType, setPropType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("edge");
  const matchups = useMemo(() => generateComprehensiveMatchups(), []);

  const filtered = useMemo(() => {
    let result = [...matchups];
    if (sport !== "all") result = result.filter(m => m.sport === sport);
    if (propType !== "all") result = result.filter(m => m.propType.toLowerCase().includes(propType.toLowerCase()));
    
    switch (sortBy) {
      case "edge": result.sort((a, b) => b.edge - a.edge); break;
      case "confidence": result.sort((a, b) => b.confidence - a.confidence); break;
      case "time": break;
    }
    return result;
  }, [matchups, sport, propType, sortBy]);

  const topPicks = filtered.filter(m => m.recommendation.includes("strong"));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Player Matchup Center
            <Badge variant="secondary" className="text-xs">{filtered.length} Matchups</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-sport">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
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
              <div className="text-center py-8 text-muted-foreground">
                No matchups found for current filters
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
      </CardContent>
    </Card>
  );
}
