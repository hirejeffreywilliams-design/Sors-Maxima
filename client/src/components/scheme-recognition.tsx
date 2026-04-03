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
  Info,
  CheckCircle2,
  Radio,
  BookOpen,
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
    vsSpreadEstimated?: boolean;
    overUnderTrend: "over" | "under" | "balanced";
    rivalryBoost: number;
    restAdvantage: number;
  };
  recentForm: {
    lastFive: string;
    coverRate: number;
    coverRateEstimated?: boolean;
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

interface LinkedPick {
  grade: string;
  confidence: number;
  pick: string;
  betType: string;
  recommendation: string;
  winProbability: number;
  timing: string;
}

interface MatchupSchemeAnalysis {
  matchup: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  gameTime: string;
  gameState?: "pre" | "in" | "post";
  venue?: string;
  broadcast?: string;
  schemeAdvantage: "home" | "away" | "even";
  keyFactors: string[];
  schemeClash?: string;
  predictionImpact: number;
  alerts: SchemeAlert[];
  odds?: {
    spread?: string;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  };
  linkedPicks?: LinkedPick[];
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
    oddsFromCache?: boolean;
    picksLinked?: number;
    transparencyNote?: string;
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
    case "hot": return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20"><Flame className="w-3 h-3 mr-1" />Hot</Badge>;
    case "cold": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><CloudRain className="w-3 h-3 mr-1" />Cold</Badge>;
    default: return <Badge variant="secondary">Neutral</Badge>;
  }
};

const getAlertBadge = (type: "advantage" | "warning" | "neutral") => {
  switch (type) {
    case "advantage": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Zap className="w-3 h-3 mr-1" />Edge</Badge>;
    case "warning": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>;
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

const getGradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "bg-green-500/10 text-green-500 border-green-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  return "bg-muted text-muted-foreground";
};

function formatGameTime(dateStr: string, state?: "pre" | "in" | "post"): string {
  try {
    const d = new Date(dateStr);
    if (state === "in") return "LIVE";
    if (state === "post") {
      return "Final — " + d.toLocaleString("en-US", { month: "short", day: "numeric" });
    }
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return "Today " + d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  const liveMatchups = matchupAnalysis.filter(m => m.gameState === "in");
  const upcomingMatchups = matchupAnalysis.filter(m => m.gameState === "pre");
  const recentMatchups = matchupAnalysis.filter(m => m.gameState === "post");

  const availableSports = selectedSports.length > 0
    ? selectedSports
    : ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

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
              {mode === "live" ? "Live" : "Pre-Game"}
            </Badge>
          </div>
        </div>

        {meta && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-1">
            <span>{meta.gamesAnalyzed} games</span>
            <span>{meta.teamsAnalyzed} teams</span>
            {liveMatchups.length > 0 && <Badge className="text-[10px] py-0 bg-red-500/10 text-red-500 border-red-500/20"><Radio className="w-2.5 h-2.5 mr-1" />{liveMatchups.length} live</Badge>}
            {meta.picksLinked !== undefined && meta.picksLinked > 0 && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{meta.picksLinked} picks linked</span>}
            {meta.oddsFromCache && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Odds cached</span>}
            <span>Sources: {meta.dataSources.join(", ")}</span>
          </div>
        )}

        {/* Transparency banner */}
        <div className="flex items-start gap-2 mt-2 p-2.5 rounded-md bg-muted/50 border text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Scheme classifications are derived from live game records and advanced team stats.
            Coach ATS stats are <strong>intelligence-projected</strong> from win% and recent form — not verified ATS records.
          </span>
        </div>
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
            <p className="text-sm">No {activeSport} games found in the next 7 days.</p>
            <p className="text-xs mt-1">Try a different sport — data updates every 60 seconds.</p>
          </div>
        ) : (
          <Tabs defaultValue="matchups" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 mb-4">
                <TabsTrigger value="matchups" className="px-2 sm:px-3" data-testid="tab-matchup-analysis">
                  <Eye className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                  Matchups
                  <span className="ml-1 text-xs text-muted-foreground">({matchupAnalysis.length})</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="px-2 sm:px-3" data-testid="tab-scheme-alerts">
                  <AlertTriangle className="w-4 h-4 mr-1 shrink-0 hidden sm:inline" />
                  Alerts
                  {highImpactAlerts.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                      {highImpactAlerts.length}
                    </span>
                  )}
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

            {/* MATCHUPS TAB */}
            <TabsContent value="matchups" className="space-y-3">
              {matchupAnalysis.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No {activeSport} matchups found in the analysis window.
                </div>
              ) : (
                <>
                  {liveMatchups.length > 0 && (
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-red-500" /> Live Now
                    </div>
                  )}
                  {upcomingMatchups.length > 0 && liveMatchups.length > 0 && (
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Upcoming</div>
                  )}
                  {matchupAnalysis.map((analysis, i) => (
                    <MatchupCard key={analysis.gameId || i} analysis={analysis} index={i} />
                  ))}
                  {recentMatchups.length > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Includes {recentMatchups.length} recently completed game{recentMatchups.length !== 1 ? "s" : ""} (last 24h)
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            {/* ALERTS TAB */}
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
                          {alert.impact.toUpperCase()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {alert.confidence}% signal
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

            {/* TEAMS TAB */}
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
                      <span className="text-[10px] text-muted-foreground">{team.dataSource}</span>
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
                        <span className="text-sm">{team.offensiveScheme.name}</span>
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
                        <span className="text-sm">{team.defensiveScheme.name}</span>
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
                        <h4 className="text-xs text-muted-foreground mb-2">Defensive Formation</h4>
                        <Badge variant="outline" className="text-xs">{team.defensiveScheme.formation}</Badge>
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
                            <span>Away: {team.situationalPatterns.awayPerformance}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>Fav: {team.situationalPatterns.favorite}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* COACHES TAB */}
            <TabsContent value="coaches" className="space-y-3">
              {coachProfiles.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No coach data available. Roster data loads in the background on startup.
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
                          <span className="text-xs text-muted-foreground ml-1">· {coach.experience} yrs exp</span>
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
                              <span className="text-xs">4th Down Agr.</span>
                              <div className="flex items-center gap-1">
                                <Progress value={coach.tendencies.fourthDownAggression} className="w-16 h-1.5" />
                                <span className="text-xs">{coach.tendencies.fourthDownAggression}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs text-muted-foreground mb-2">
                          Betting Patterns
                          <span className="ml-1 text-[10px] text-yellow-500/80">(estimated)</span>
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs">ATS Rate</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-medium ${coach.historicalPatterns.vsSpread > 52 ? 'text-green-500' : coach.historicalPatterns.vsSpread < 48 ? 'text-red-500' : ''}`}>
                                {coach.historicalPatterns.vsSpread}%
                              </span>
                              {coach.historicalPatterns.vsSpreadEstimated && (
                                <span className="text-[9px] text-muted-foreground">est.</span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">O/U Trend</span>
                            <Badge variant="secondary" className="text-xs capitalize">{coach.historicalPatterns.overUnderTrend}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs">Cover Rate</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-medium ${coach.recentForm.coverRate > 55 ? 'text-green-500' : coach.recentForm.coverRate < 45 ? 'text-red-500' : ''}`}>
                                {coach.recentForm.coverRate}%
                              </span>
                              {coach.recentForm.coverRateEstimated && (
                                <span className="text-[9px] text-muted-foreground">est.</span>
                              )}
                            </div>
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

function MatchupCard({ analysis, index }: { analysis: MatchupSchemeAnalysis; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLive = analysis.gameState === "in";
  const isCompleted = analysis.gameState === "post";
  const hasLinkedPicks = analysis.linkedPicks && analysis.linkedPicks.length > 0;

  return (
    <div
      className="p-3 rounded-lg border bg-card"
      data-testid={`matchup-analysis-${index}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          {isLive && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] px-1.5 py-0"><Radio className="w-2.5 h-2.5 mr-1 animate-pulse" />LIVE</Badge>}
          {isCompleted && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Final</Badge>}
          <Eye className="w-4 h-4" />
          <span className="font-medium">{analysis.matchup}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={
            analysis.schemeAdvantage === "home"
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : analysis.schemeAdvantage === "away"
              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
              : "bg-muted text-muted-foreground"
          }>
            {analysis.schemeAdvantage === "home"
              ? `${analysis.homeTeam} Edge`
              : analysis.schemeAdvantage === "away"
              ? `${analysis.awayTeam} Edge`
              : "Even"}
          </Badge>
          <Badge variant="outline" className="text-xs">+{analysis.predictionImpact}%</Badge>
        </div>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
        <span>
          {analysis.homeTeam} ({analysis.homeRecord}) vs {analysis.awayTeam} ({analysis.awayRecord})
        </span>
        <span className={isLive ? "text-red-500 font-medium" : ""}>
          {formatGameTime(analysis.gameTime, analysis.gameState)}
        </span>
        {analysis.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />{analysis.venue}
          </span>
        )}
      </div>

      {/* Odds */}
      {analysis.odds && (
        <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
          {analysis.odds.spread && <Badge variant="outline">Spread: {analysis.odds.spread}</Badge>}
          {analysis.odds.overUnder && <Badge variant="outline">O/U: {analysis.odds.overUnder}</Badge>}
          {analysis.odds.homeMoneyline && (
            <Badge variant="outline">
              {analysis.homeTeam} ML: {analysis.odds.homeMoneyline > 0 ? "+" : ""}{analysis.odds.homeMoneyline}
            </Badge>
          )}
          {analysis.odds.awayMoneyline && (
            <Badge variant="outline">
              {analysis.awayTeam} ML: {analysis.odds.awayMoneyline > 0 ? "+" : ""}{analysis.odds.awayMoneyline}
            </Badge>
          )}
        </div>
      )}

      {/* Scheme Clash Alert */}
      {analysis.schemeClash && (
        <div className="flex items-start gap-2 mb-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400">
          <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{analysis.schemeClash}</span>
        </div>
      )}

      {/* Linked picks from precomputed engine */}
      {hasLinkedPicks && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">46-Factor Model Picks</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {analysis.linkedPicks!.map((pick, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 p-1.5 rounded border bg-background text-xs"
                data-testid={`linked-pick-${index}-${i}`}
              >
                <Badge className={`text-[10px] px-1.5 py-0 ${getGradeColor(pick.grade)}`}>{pick.grade}</Badge>
                <span className="text-muted-foreground">{pick.betType}:</span>
                <span className="font-medium truncate max-w-[140px]">{pick.pick}</span>
                <span className="text-muted-foreground">{pick.winProbability}% win prob</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand button */}
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        onClick={() => setExpanded(e => !e)}
        data-testid={`expand-matchup-${index}`}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        {expanded ? "Hide" : "Show"} key factors
        {analysis.alerts.length > 0 && (
          <Badge variant="outline" className="ml-1 text-[10px] py-0">{analysis.alerts.length} alert{analysis.alerts.length !== 1 ? "s" : ""}</Badge>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2">
          <div>
            <h4 className="text-xs text-muted-foreground mb-1.5">Scheme Factors</h4>
            <ul className="space-y-1">
              {analysis.keyFactors.map((factor, j) => (
                <li key={j} className="flex items-start gap-2 text-sm">
                  <Target className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {analysis.alerts.length > 0 && (
            <div>
              <h4 className="text-xs text-muted-foreground mb-1.5">Matchup Alerts</h4>
              <div className="space-y-1">
                {analysis.alerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 text-xs">
                    {getAlertBadge(alert.type)}
                    <span>{alert.title}</span>
                    <span className={`ml-auto font-medium ${getImpactColor(alert.impact)}`}>{alert.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t">
        {analysis.broadcast && <span className="text-[10px] text-muted-foreground">{analysis.broadcast}</span>}
        <span className="text-[10px] text-muted-foreground ml-auto">{analysis.dataSource}</span>
      </div>
    </div>
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
        {data?.meta && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Live from {data.meta.dataSources.join(", ")}
          </span>
        )}
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
