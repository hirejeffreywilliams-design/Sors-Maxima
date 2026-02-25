import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Database, TrendingUp, TrendingDown, Target, BarChart3,
  Activity, Zap, Users, ArrowLeft, Award, Flame, Shield,
  Calendar, RefreshCw, ChevronRight, Heart
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface TeamRecord {
  team: string;
  sport: string;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  lastResults: string[];
  avgPointsFor: number;
  avgPointsAgainst: number;
  totalGamesTracked: number;
  streakType: string;
  streakLength: number;
}

interface PlatformReport {
  stats: {
    totalGamesTracked: number;
    totalPredictionsMade: number;
    totalOddsSnapshots: number;
    totalUserBetsTracked: number;
    overallPredictionAccuracy: number;
    accuracyBySport: Record<string, { correct: number; total: number; accuracy: number }>;
    accuracyByMarket: Record<string, { correct: number; total: number; accuracy: number }>;
    bestPerformingSport: string;
    bestPerformingMarket: string;
    dataPointsIngested: number;
    engineStartedAt: string;
    lastAccumulationAt: string;
    accumulationCycles: number;
    daysOfData: number;
  };
  topTeams: TeamRecord[];
  predictionAccuracy: {
    overall: number;
    bySport: Record<string, { correct: number; total: number; accuracy: number }>;
    byMarket: Record<string, { correct: number; total: number; accuracy: number }>;
    recentTrend: { period: string; accuracy: number }[];
  };
  bookmakerRankings: { book: string; timesBestOdds: number; totalComparisons: number; bestOddsRate: number; bestForSports: string[] }[];
  highImpactInjuries: { sport: string; team: string; playerName: string; status: string; gamesWithout: number; teamWinsWithout: number; teamLossesWithout: number; impactScore: number }[];
  communityInsights: Record<string, { sport: string; totalPicks: number; winningPicks: number; winRate: number; mostPickedTeam: string; mostSuccessfulMarket: string; avgConfidence: number }>;
  dailySummaries: { date: string; gamesCompleted: number; predictionsCorrect: number; predictionsTotal: number; accuracy: number; topSport: string; dataPointsAdded: number }[];
  dataGrowth: { totalRecords: number; teamsCovered: number; sportsCovered: number };
}

export default function PlatformIntelligencePage() {
  useSEO({ title: "Platform Intelligence", description: "Self-growing data engine - team trends, prediction accuracy, market intelligence, and injury impact analysis" });
  const [, setLocation] = useLocation();
  const [sportFilter, setSportFilter] = useState<string>("all");

  const { data: report, isLoading } = useQuery<PlatformReport>({
    queryKey: ["/api/platform-intelligence"],
    refetchInterval: 60000,
  });

  const { data: engineStatus } = useQuery<any>({
    queryKey: ["/api/platform-intelligence/engine-status"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </ScrollArea>
    );
  }

  const stats = report?.stats;
  const sports = ["all", "NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

  const filteredTeams = sportFilter === "all"
    ? (report?.topTeams || []).slice(0, 20)
    : (report?.topTeams || []).filter(t => t.sport === sportFilter).slice(0, 20);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Intelligence</h1>
            </div>
            <p className="text-sm text-muted-foreground">Self-growing data engine that compounds knowledge from every game, prediction, and market movement</p>
          </div>
          <Badge variant="outline" className="gap-1" data-testid="badge-engine-status">
            <Activity className="w-3 h-3 text-green-500" />
            {engineStatus?.running ? "Engine Active" : "Initializing"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Database className="w-3 h-3" /> Total Data Points
              </div>
              <div className="text-2xl font-bold" data-testid="text-data-points">{(stats?.dataPointsIngested || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats?.daysOfData || 0} days of data</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BarChart3 className="w-3 h-3" /> Games Tracked
              </div>
              <div className="text-2xl font-bold" data-testid="text-games-tracked">{(stats?.totalGamesTracked || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{report?.dataGrowth?.teamsCovered || 0} teams across {report?.dataGrowth?.sportsCovered || 0} sports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="w-3 h-3" /> Prediction Accuracy
              </div>
              <div className="text-2xl font-bold text-green-500" data-testid="text-accuracy">{stats?.overallPredictionAccuracy || 0}%</div>
              <p className="text-xs text-muted-foreground">{stats?.totalPredictionsMade || 0} predictions tracked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Zap className="w-3 h-3" /> Accumulation Cycles
              </div>
              <div className="text-2xl font-bold" data-testid="text-cycles">{stats?.accumulationCycles || 0}</div>
              <p className="text-xs text-muted-foreground">Every 5 minutes</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="teams">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="teams" data-testid="tab-teams">
              <Flame className="w-3 h-3 mr-1" /> Team Trends
            </TabsTrigger>
            <TabsTrigger value="accuracy" data-testid="tab-accuracy">
              <Target className="w-3 h-3 mr-1" /> Prediction Accuracy
            </TabsTrigger>
            <TabsTrigger value="injuries" data-testid="tab-injuries">
              <Heart className="w-3 h-3 mr-1" /> Injury Impact
            </TabsTrigger>
            <TabsTrigger value="bookmakers" data-testid="tab-bookmakers">
              <Award className="w-3 h-3 mr-1" /> Bookmaker Rankings
            </TabsTrigger>
            <TabsTrigger value="community" data-testid="tab-community">
              <Users className="w-3 h-3 mr-1" /> Community Intel
            </TabsTrigger>
            <TabsTrigger value="growth" data-testid="tab-growth">
              <TrendingUp className="w-3 h-3 mr-1" /> Data Growth
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              {sports.map(s => (
                <Button key={s} size="sm" variant={sportFilter === s ? "default" : "outline"} onClick={() => setSportFilter(s)} data-testid={`button-sport-${s}`}>
                  {s === "all" ? "All Sports" : s}
                </Button>
              ))}
            </div>

            {filteredTeams.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Team trend data is being accumulated. Check back after games complete.</p>
                  <p className="text-xs mt-1">The engine records game outcomes every 5 minutes and builds trend profiles automatically.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Sport</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead>Win %</TableHead>
                        <TableHead>Home</TableHead>
                        <TableHead>Away</TableHead>
                        <TableHead>Streak</TableHead>
                        <TableHead>Avg PF</TableHead>
                        <TableHead>Last 5</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map((team, i) => {
                        const winPct = team.wins + team.losses > 0
                          ? Math.round((team.wins / (team.wins + team.losses)) * 1000) / 10
                          : 0;
                        return (
                          <TableRow key={`${team.sport}-${team.team}-${i}`}>
                            <TableCell className="font-medium">{team.team}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{team.sport}</Badge></TableCell>
                            <TableCell>{team.wins}-{team.losses}</TableCell>
                            <TableCell className={winPct >= 55 ? "text-green-500 font-bold" : winPct <= 40 ? "text-red-500" : ""}>
                              {winPct}%
                            </TableCell>
                            <TableCell className="text-xs">{team.homeWins}-{team.homeLosses}</TableCell>
                            <TableCell className="text-xs">{team.awayWins}-{team.awayLosses}</TableCell>
                            <TableCell>
                              {team.streakType !== "none" && (
                                <Badge variant={team.streakType === "W" ? "default" : "destructive"} className="text-xs">
                                  {team.streakType}{team.streakLength}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{team.avgPointsFor.toFixed(1)}</TableCell>
                            <TableCell>
                              <div className="flex gap-0.5">
                                {team.lastResults.slice(-5).map((r, j) => (
                                  <span key={j} className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${r === "W" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="accuracy" className="space-y-4 mt-4">
            {report?.predictionAccuracy ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {report.predictionAccuracy.recentTrend.map(trend => (
                    <Card key={trend.period}>
                      <CardContent className="p-4 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{trend.period}</div>
                        <div className={`text-2xl font-bold ${trend.accuracy >= 55 ? "text-green-500" : trend.accuracy >= 45 ? "text-yellow-500" : "text-red-500"}`}>
                          {trend.accuracy}%
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Accuracy by Sport</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(report.predictionAccuracy.bySport).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Data accumulating...</p>
                      ) : (
                        Object.entries(report.predictionAccuracy.bySport).map(([sport, acc]) => (
                          <div key={sport} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{sport}</span>
                              <span className="font-mono">{acc.accuracy}% ({acc.correct}/{acc.total})</span>
                            </div>
                            <Progress value={acc.accuracy} className="h-2" />
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Accuracy by Market</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(report.predictionAccuracy.byMarket).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Data accumulating...</p>
                      ) : (
                        Object.entries(report.predictionAccuracy.byMarket).map(([market, acc]) => (
                          <div key={market} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{market}</span>
                              <span className="font-mono">{acc.accuracy}% ({acc.correct}/{acc.total})</span>
                            </div>
                            <Progress value={acc.accuracy} className="h-2" />
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Prediction accuracy data is being accumulated as games complete and predictions settle.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="injuries" className="space-y-4 mt-4">
            {(report?.highImpactInjuries || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Injury impact data is being built. The engine correlates player injuries with team outcomes over time.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Sport</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Games Without</TableHead>
                        <TableHead>Team Record</TableHead>
                        <TableHead>Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report!.highImpactInjuries.map((inj, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{inj.playerName}</TableCell>
                          <TableCell>{inj.team}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{inj.sport}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={inj.status === "Out" ? "destructive" : "secondary"} className="text-xs">{inj.status}</Badge>
                          </TableCell>
                          <TableCell>{inj.gamesWithout}</TableCell>
                          <TableCell>{inj.teamWinsWithout}-{inj.teamLossesWithout}</TableCell>
                          <TableCell>
                            <Badge variant={inj.impactScore > 10 ? "destructive" : inj.impactScore < -5 ? "default" : "secondary"} className="text-xs">
                              {inj.impactScore > 0 ? `-${inj.impactScore}%` : `+${Math.abs(inj.impactScore)}%`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookmakers" className="space-y-4 mt-4">
            {(report?.bookmakerRankings || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Bookmaker comparison data is being accumulated from market snapshots.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report!.bookmakerRankings.map((book, i) => (
                  <Card key={book.book}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {i === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                          <span className="font-bold">{book.book}</span>
                        </div>
                        <Badge variant="outline">#{i + 1}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Best odds rate</span>
                          <span className="font-mono">{(book.bestOddsRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Times best odds</span>
                          <span className="font-mono">{book.timesBestOdds}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {book.bestForSports.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="community" className="space-y-4 mt-4">
            {Object.keys(report?.communityInsights || {}).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Community intelligence is aggregated from shared picks and tipster data.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(report!.communityInsights).map(insight => (
                  <Card key={insight.sport}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline">{insight.sport}</Badge>
                        Community Picks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total picks</span>
                        <span className="font-bold">{insight.totalPicks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Win rate</span>
                        <span className={`font-bold ${insight.winRate >= 55 ? "text-green-500" : "text-yellow-500"}`}>{insight.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Most picked team</span>
                        <span>{insight.mostPickedTeam}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best market</span>
                        <span className="capitalize">{insight.mostSuccessfulMarket}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg confidence</span>
                        <span>{insight.avgConfidence}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="growth" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Database className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{(report?.dataGrowth?.totalRecords || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total Records</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{report?.dataGrowth?.teamsCovered || 0}</div>
                  <p className="text-xs text-muted-foreground">Teams Covered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{report?.dataGrowth?.sportsCovered || 0}</div>
                  <p className="text-xs text-muted-foreground">Sports Covered</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Daily Accumulation Log</CardTitle>
                <CardDescription>Data points added per day</CardDescription>
              </CardHeader>
              <CardContent>
                {(report?.dailySummaries || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Daily summaries will appear as the engine runs its accumulation cycles.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Games</TableHead>
                        <TableHead>Predictions</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Data Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report!.dailySummaries.slice(0, 14).map(day => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell>{day.gamesCompleted}</TableCell>
                          <TableCell>{day.predictionsCorrect}/{day.predictionsTotal}</TableCell>
                          <TableCell className={day.accuracy >= 55 ? "text-green-500 font-bold" : ""}>{day.accuracy}%</TableCell>
                          <TableCell>{day.dataPointsAdded}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Engine Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Status</span>
                    <Badge variant={engineStatus?.running ? "default" : "secondary"}>{engineStatus?.running ? "Running" : "Stopped"}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Cycles Completed</span>
                    <span className="font-bold">{engineStatus?.cycles || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Last Cycle</span>
                    <span className="font-mono text-xs">{engineStatus?.lastCycle ? new Date(engineStatus.lastCycle).toLocaleTimeString() : "Pending"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Data File</span>
                    <span className="font-mono text-xs">{((engineStatus?.totalDataPoints || 0) / 1000).toFixed(1)}k points</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
