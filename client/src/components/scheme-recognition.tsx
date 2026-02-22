import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Zap,
  Target,
  Users,
  Clock,
  MapPin,
  Flame,
  ChevronRight,
  Eye,
  BarChart3,
  CloudRain,
  Loader2,
  RefreshCw
} from "lucide-react";

interface TeamScheme {
  teamName: string;
  teamId: string;
  sport: string;
  record: string;
  offensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    keyPlays: string[];
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  defensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    formation: string;
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  situationalPatterns: {
    homeAdvantage: number;
    awayPerformance: number;
    primetime: number;
    underdog: number;
    favorite: number;
  };
  dataSource: string;
}

interface CoachProfile {
  name: string;
  team: string;
  teamId: string;
  sport: string;
  experience: number;
  tendencies: {
    riskTolerance: "high" | "medium" | "low";
    fourthDownAggression?: number;
    tempoPreference: "fast" | "moderate" | "slow";
    adjustmentRating: number;
    clutchDecisions: number;
  };
  historicalPatterns: {
    vsSpread: number;
    overUnderTrend: "over" | "under" | "balanced";
    rivalryBoost: number;
    restAdvantage: number;
  };
  recentForm: {
    lastFive: string;
    coverRate: number;
    trend: "hot" | "cold" | "neutral";
  };
  dataSource: string;
}

interface SchemeAlert {
  id: string;
  type: "advantage" | "warning" | "neutral";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  affectedLegs: string[];
  confidence: number;
  dataSource: string;
}

interface MatchupSchemeAnalysis {
  matchup: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  gameTime: string;
  venue?: string;
  broadcast?: string;
  schemeAdvantage: "home" | "away" | "even";
  keyFactors: string[];
  predictionImpact: number;
  alerts: SchemeAlert[];
  odds?: {
    spread?: string;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  };
  dataSource: string;
}

interface SchemeAnalysisResponse {
  teamSchemes: TeamScheme[];
  coachProfiles: CoachProfile[];
  alerts: SchemeAlert[];
  matchupAnalysis: MatchupSchemeAnalysis[];
  meta: {
    sport: string;
    gamesAnalyzed: number;
    teamsAnalyzed: number;
    generatedAt: string;
    dataSources: string[];
  };
}

const getTrendIcon = (trend: "up" | "down" | "stable") => {
  switch (trend) {
    case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
  }
};

const getFormBadge = (trend: "hot" | "cold" | "neutral") => {
  switch (trend) {
    case "hot": return <Badge className="bg-orange-500/10 text-orange-500"><Flame className="w-3 h-3 mr-1" />Hot</Badge>;
    case "cold": return <Badge className="bg-blue-500/10 text-blue-500"><CloudRain className="w-3 h-3 mr-1" />Cold</Badge>;
    default: return <Badge variant="secondary">Neutral</Badge>;
  }
};

const getAlertBadge = (type: "advantage" | "warning" | "neutral") => {
  switch (type) {
    case "advantage": return <Badge className="bg-green-500/10 text-green-500"><Zap className="w-3 h-3 mr-1" />Edge</Badge>;
    case "warning": return <Badge className="bg-yellow-500/10 text-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>;
    default: return <Badge variant="secondary">Info</Badge>;
  }
};

const getImpactColor = (impact: "high" | "medium" | "low") => {
  switch (impact) {
    case "high": return "text-green-500";
    case "medium": return "text-yellow-500";
    default: return "text-muted-foreground";
  }
};

function formatGameTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

interface SchemeRecognitionProps {
  mode?: "live" | "pre-game";
  selectedSports?: string[];
}

export function SchemeRecognition({ mode = "pre-game", selectedSports = [] }: SchemeRecognitionProps) {
  const defaultSport = selectedSports.length > 0 ? selectedSports[0] : "NBA";
  const [activeSport, setActiveSport] = useState(defaultSport);
  const [selectedTeam, setSelectedTeam] = useState<TeamScheme | null>(null);

  const { data, isLoading, error, isFetching } = useQuery<SchemeAnalysisResponse>({
    queryKey: ["/api/scheme-analysis", activeSport],
    queryFn: async () => {
      const res = await fetch(`/api/scheme-analysis?sport=${activeSport}`);
      if (!res.ok) throw new Error("Failed to fetch scheme analysis");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: mode === "live" ? 60 * 1000 : undefined,
  });

  const teamSchemes = data?.teamSchemes || [];
  const coachProfiles = data?.coachProfiles || [];
  const schemeAlerts = data?.alerts || [];
  const matchupAnalysis = data?.matchupAnalysis || [];
  const meta = data?.meta;

  const highImpactAlerts = schemeAlerts.filter(a => a.impact === "high");

  const availableSports = selectedSports.length > 0
    ? selectedSports
    : ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

  return (
    <Card className="w-full" data-testid="scheme-recognition-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg" data-testid="scheme-recognition-title">
            <Brain className="w-5 h-5" />
            Scheme Recognition Engine
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={activeSport} onValueChange={setActiveSport}>
              <SelectTrigger className="w-[120px] h-8" data-testid="scheme-sport-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSports.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant={mode === "live" ? "default" : "secondary"}>
              {mode === "live" ? "Live Analysis" : "Pre-Game"}
            </Badge>
          </div>
        </div>
        {meta && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-1">
            <span>{meta.gamesAnalyzed} games analyzed</span>
            <span>{meta.teamsAnalyzed} teams</span>
            <span>Sources: {meta.dataSources.join(", ")}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm">Failed to load scheme analysis. Try again later.</p>
          </div>
        ) : teamSchemes.length === 0 && matchupAnalysis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No upcoming {activeSport} games found for scheme analysis.</p>
            <p className="text-xs mt-1">Try a different sport or check back closer to game time.</p>
          </div>
        ) : (
        <Tabs defaultValue="alerts" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 mb-4">
              <TabsTrigger value="alerts" className="px-2 sm:px-3" data-testid="tab-scheme-alerts">
                <AlertTriangle className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                Alerts
                {highImpactAlerts.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                    {highImpactAlerts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="matchups" className="px-2 sm:px-3" data-testid="tab-matchup-analysis">
                <Target className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                Matchups
                <span className="ml-1 text-xs text-muted-foreground">({matchupAnalysis.length})</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="px-2 sm:px-3" data-testid="tab-team-schemes">
                <Shield className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="coaches" className="px-2 sm:px-3" data-testid="tab-coach-profiles">
                <Users className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                Coaches
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="alerts" className="space-y-3">
            {schemeAlerts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No scheme alerts for current {activeSport} games.
              </div>
            ) : (
              schemeAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className="p-3 rounded-lg border bg-card hover-elevate"
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      {getAlertBadge(alert.type)}
                      <span className="font-medium text-sm">{alert.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${getImpactColor(alert.impact)}`}>
                        {alert.impact.toUpperCase()} IMPACT
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {alert.confidence}% conf
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Affects:</span>
                      {alert.affectedLegs.map((leg, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{leg}</Badge>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{alert.dataSource}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="matchups" className="space-y-3">
            {matchupAnalysis.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No upcoming {activeSport} matchups found.
              </div>
            ) : (
              matchupAnalysis.map((analysis, i) => (
                <div 
                  key={analysis.gameId || i}
                  className="p-3 rounded-lg border bg-card"
                  data-testid={`matchup-analysis-${i}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">{analysis.matchup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={analysis.schemeAdvantage === "home" ? "bg-green-500/10 text-green-500" : analysis.schemeAdvantage === "away" ? "bg-blue-500/10 text-blue-500" : ""}>
                        {analysis.schemeAdvantage === "home" ? analysis.homeTeam.split(" ").pop() : analysis.schemeAdvantage === "away" ? analysis.awayTeam.split(" ").pop() : "Even"} Advantage
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        +{analysis.predictionImpact}% impact
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                    <span>{analysis.homeTeam} ({analysis.homeRecord}) vs {analysis.awayTeam} ({analysis.awayRecord})</span>
                    <span>{formatGameTime(analysis.gameTime)}</span>
                    {analysis.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{analysis.venue}</span>}
                  </div>

                  {analysis.odds && (
                    <div className="flex items-center gap-3 text-xs mb-2 flex-wrap">
                      {analysis.odds.spread && <Badge variant="outline">Spread: {analysis.odds.spread}</Badge>}
                      {analysis.odds.overUnder && <Badge variant="outline">O/U: {analysis.odds.overUnder}</Badge>}
                      {analysis.odds.homeMoneyline && <Badge variant="outline">{analysis.homeTeam.split(" ").pop()} ML: {analysis.odds.homeMoneyline > 0 ? "+" : ""}{analysis.odds.homeMoneyline}</Badge>}
                      {analysis.odds.awayMoneyline && <Badge variant="outline">{analysis.awayTeam.split(" ").pop()} ML: {analysis.odds.awayMoneyline > 0 ? "+" : ""}{analysis.odds.awayMoneyline}</Badge>}
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-2">Key Scheme Factors</h4>
                    <ul className="space-y-1">
                      {analysis.keyFactors.map((factor, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Target className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    {analysis.broadcast && <span className="text-[10px] text-muted-foreground">{analysis.broadcast}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{analysis.dataSource}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="teams" className="space-y-3">
            {teamSchemes.map(team => (
              <div 
                key={team.teamId}
                className="p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                onClick={() => setSelectedTeam(selectedTeam?.teamId === team.teamId ? null : team)}
                data-testid={`team-scheme-${team.teamName.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{team.teamName}</span>
                    <Badge variant="outline" className="text-xs">{team.record}</Badge>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedTeam?.teamId === team.teamId ? 'rotate-90' : ''}`} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs">Offense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{team.offensiveScheme.name}</span>
                      {getTrendIcon(team.offensiveScheme.trendDirection)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={team.offensiveScheme.successRate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{team.offensiveScheme.successRate}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Shield className="w-3 h-3" />
                      <span className="text-xs">Defense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{team.defensiveScheme.name}</span>
                      {getTrendIcon(team.defensiveScheme.trendDirection)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={team.defensiveScheme.successRate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{team.defensiveScheme.successRate}%</span>
                    </div>
                  </div>
                </div>
                
                {selectedTeam?.teamId === team.teamId && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Key Offensive Plays</h4>
                      <div className="flex gap-1 flex-wrap">
                        {team.offensiveScheme.keyPlays.map((play, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{play}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Situational Performance</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>Home: {team.situationalPatterns.homeAdvantage}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Prime: {team.situationalPatterns.primetime}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>Fav: {team.situationalPatterns.favorite}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Source: {team.dataSource}</div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="coaches" className="space-y-3">
            {coachProfiles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No coach data available for current {activeSport} games.
              </div>
            ) : (
              coachProfiles.map(coach => (
                <div 
                  key={`${coach.teamId}-${coach.name}`}
                  className="p-3 rounded-lg border bg-card"
                  data-testid={`coach-profile-${coach.name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <span className="font-medium">{coach.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({coach.team})</span>
                      {coach.experience > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">- {coach.experience} yrs exp</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getFormBadge(coach.recentForm.trend)}
                      <Badge variant="outline" className="text-xs">{coach.recentForm.lastFive}</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Coaching Tendencies</h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-xs">Risk Tolerance</span>
                          <Badge variant="secondary" className="text-xs capitalize">{coach.tendencies.riskTolerance}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs">Tempo</span>
                          <Badge variant="secondary" className="text-xs capitalize">{coach.tendencies.tempoPreference}</Badge>
                        </div>
                        {coach.tendencies.fourthDownAggression !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs">4th Down Aggression</span>
                            <div className="flex items-center gap-1">
                              <Progress value={coach.tendencies.fourthDownAggression} className="w-16 h-1.5" />
                              <span className="text-xs">{coach.tendencies.fourthDownAggression}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Betting Patterns</h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-xs">ATS Record</span>
                          <span className={`text-xs font-medium ${coach.historicalPatterns.vsSpread > 52 ? 'text-green-500' : coach.historicalPatterns.vsSpread < 48 ? 'text-red-500' : ''}`}>
                            {coach.historicalPatterns.vsSpread}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs">O/U Trend</span>
                          <Badge variant="secondary" className="text-xs capitalize">{coach.historicalPatterns.overUnderTrend}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs">Cover Rate (L5)</span>
                          <span className={`text-xs font-medium ${coach.recentForm.coverRate > 55 ? 'text-green-500' : coach.recentForm.coverRate < 45 ? 'text-red-500' : ''}`}>
                            {coach.recentForm.coverRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2">{coach.dataSource}</div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export function SchemeAlertBanner({ sport = "NBA" }: { sport?: string }) {
  const { data } = useQuery<SchemeAnalysisResponse>({
    queryKey: ["/api/scheme-analysis", sport],
    queryFn: async () => {
      const res = await fetch(`/api/scheme-analysis?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch scheme analysis");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const highImpactAlerts = (data?.alerts || []).filter(a => a.impact === "high");

  if (highImpactAlerts.length === 0) return null;
  
  return (
    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-4" data-testid="scheme-alert-banner">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-green-500" />
        <span className="font-medium text-sm">Scheme Intelligence Detected</span>
        <Badge className="text-xs">{highImpactAlerts.length} high-impact</Badge>
        {data?.meta && <span className="text-[10px] text-muted-foreground ml-auto">Live from {data.meta.dataSources.join(", ")}</span>}
      </div>
      <div className="space-y-1">
        {highImpactAlerts.slice(0, 2).map(alert => (
          <div key={alert.id} className="flex items-center gap-2 text-sm">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground">{alert.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
