import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  backtestingEngine, 
  type PerformanceMetrics, 
  type ReportCard, 
  type BacktestResult 
} from "@/lib/backtesting-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Play, 
  RotateCcw, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  GraduationCap,
  BarChart3,
  Activity,
  Star,
  Lightbulb,
  Clock,
  Award,
  Sparkles,
  Radio,
  RefreshCw,
  Pause,
  CircleDot
} from "lucide-react";

interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "in_progress" | "final" | "postponed";
  startTime: string;
  period?: string;
  timeRemaining?: string;
  odds?: {
    homeMoneyline: number;
    awayMoneyline: number;
    spread: number;
    total: number;
  };
}

interface GameResult {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "tie";
  completedAt: string;
}

export default function TrainingCenter() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [eventCount, setEventCount] = useState(500);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [activeTab, setActiveTab] = useState("simulation");
  const queryClient = useQueryClient();

  const { data: liveGamesData, refetch: refetchLiveGames, isLoading: isLoadingGames } = useQuery<{
    games: LiveGame[];
    totalGames: number;
    inProgress: number;
    scheduled: number;
  }>({
    queryKey: ["/api/training/live-games"],
    refetchInterval: 10000,
  });

  const { data: gameResultsData, refetch: refetchResults, isLoading: isLoadingResults } = useQuery<{
    results: GameResult[];
    totalCompleted: number;
  }>({
    queryKey: ["/api/training/results"],
    refetchInterval: 15000,
  });

  const refreshGamesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/training/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/live-games"] });
    },
  });

  useEffect(() => {
    const unsubscribe = backtestingEngine.subscribe(() => {
      setProgress(backtestingEngine.getProgress());
      setIsTraining(backtestingEngine.isTraining());
      setResults(backtestingEngine.getResults());
      
      if (!backtestingEngine.isTraining() && backtestingEngine.getResults().length > 0) {
        setMetrics(backtestingEngine.getMetrics());
        setReportCard(backtestingEngine.generateReportCard());
      }
    });
    return () => { unsubscribe(); };
  }, []);

  const startTraining = async () => {
    backtestingEngine.initialize(eventCount);
    setMetrics(null);
    setReportCard(null);
    await backtestingEngine.runBacktest();
  };

  const resetTraining = () => {
    backtestingEngine.reset();
    setMetrics(null);
    setReportCard(null);
    setProgress(0);
    setResults([]);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500";
    if (grade.startsWith("B")) return "text-blue-500";
    if (grade.startsWith("C")) return "text-yellow-500";
    if (grade.startsWith("D")) return "text-orange-500";
    return "text-red-500";
  };

  const getGradeBg = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500/10 border-green-500/30";
    if (grade.startsWith("B")) return "bg-blue-500/10 border-blue-500/30";
    if (grade.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/30";
    if (grade.startsWith("D")) return "bg-orange-500/10 border-orange-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7" />
            Algorithm Training Center
          </h1>
          <p className="text-muted-foreground">
            Train and evaluate the prediction engine before official launch
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Beta Training Mode
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Simulation Training
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Live Games
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    Live Game Tracking
                  </CardTitle>
                  <CardDescription>
                    Watch real-time games and learn from actual outcomes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetchLiveGames()}
                    data-testid="button-refresh-live"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refreshGamesMutation.mutate()}
                    disabled={refreshGamesMutation.isPending}
                    data-testid="button-new-games"
                  >
                    <Sparkles className="w-4 h-4" />
                    New Games
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGames ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 text-center animate-pulse">
                        <div className="h-8 w-16 bg-muted rounded mx-auto mb-1" />
                        <div className="h-3 w-20 bg-muted rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="pt-4">
                          <div className="h-4 w-16 bg-muted rounded mb-3" />
                          <div className="space-y-2">
                            <div className="h-5 w-full bg-muted rounded" />
                            <div className="h-5 w-full bg-muted rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : !liveGamesData || liveGamesData.games.length === 0 ? (
                <div className="text-center py-8">
                  <Radio className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No live games available</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => refreshGamesMutation.mutate()}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Games
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{liveGamesData.totalGames}</p>
                      <p className="text-xs text-muted-foreground">Total Games</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 text-center">
                      <p className="text-2xl font-bold text-green-500">{liveGamesData.inProgress}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                      <p className="text-2xl font-bold text-blue-500">{liveGamesData.scheduled}</p>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {liveGamesData.games.map((game) => (
                      <Card key={game.id} className={game.status === "in_progress" ? "border-green-500/50" : ""}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">{game.sport}</Badge>
                            {game.status === "in_progress" ? (
                              <Badge className="bg-green-500 text-xs">
                                <CircleDot className="w-3 h-3 mr-1 animate-pulse" />
                                LIVE {game.period}
                              </Badge>
                            ) : game.status === "scheduled" ? (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Scheduled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Final</Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{game.homeTeam}</span>
                              <span className="text-lg font-bold">{game.homeScore}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{game.awayTeam}</span>
                              <span className="text-lg font-bold">{game.awayScore}</span>
                            </div>
                          </div>
                          {game.odds && (
                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>ML: {game.odds.homeMoneyline > 0 ? "+" : ""}{game.odds.homeMoneyline}</span>
                                <span>Spread: {game.odds.spread > 0 ? "+" : ""}{game.odds.spread}</span>
                                <span>O/U: {game.odds.total}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {gameResultsData && gameResultsData.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Completed Games ({gameResultsData.totalCompleted})
                </CardTitle>
                <CardDescription>
                  Games that have finished - used to train the algorithm
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameResultsData.results.slice().reverse().map((result) => (
                    <div key={result.gameId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{result.sport}</Badge>
                        <span className="text-sm">
                          {result.homeTeam} {result.homeScore} - {result.awayScore} {result.awayTeam}
                        </span>
                      </div>
                      <Badge className={result.winner === "home" ? "bg-green-500" : result.winner === "away" ? "bg-blue-500" : "bg-gray-500"}>
                        {result.winner === "home" ? result.homeTeam : result.winner === "away" ? result.awayTeam : "Tie"} Won
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Training Configuration
          </CardTitle>
          <CardDescription>
            Run the prediction engine against historical data to measure performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Training Events</span>
              <span className="text-sm text-muted-foreground">{eventCount} simulated games</span>
            </div>
            <Slider
              value={[eventCount]}
              onValueChange={(v) => setEventCount(v[0])}
              min={100}
              max={1000}
              step={100}
              disabled={isTraining}
              data-testid="slider-event-count"
            />
            <p className="text-xs text-muted-foreground">
              More events = more accurate training, but takes longer
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={startTraining} 
              disabled={isTraining}
              size="lg"
              data-testid="button-start-training"
            >
              {isTraining ? (
                <>
                  <Activity className="w-4 h-4 animate-pulse" />
                  Training in Progress...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Training Session
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetTraining}
              disabled={isTraining}
              data-testid="button-reset-training"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          {isTraining && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Training Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Processing {results.length} / {eventCount} events...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {reportCard && (
        <Card className={`border-2 ${getGradeBg(reportCard.overallGrade)}`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Algorithm Report Card
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className={`text-5xl font-bold ${getGradeColor(reportCard.overallGrade)}`}>
                  {reportCard.overallGrade}
                </div>
                {reportCard.readyForLaunch ? (
                  <Badge className="bg-green-500">
                    <Rocket className="w-3 h-3 mr-1" />
                    Ready for Launch
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Needs More Training
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>
              Launch Confidence: {reportCard.launchConfidence.toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(reportCard.gradeDetails).map(([key, detail]) => (
                <div key={key} className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{key}</span>
                    <span className={`text-xl font-bold ${getGradeColor(detail.grade)}`}>
                      {detail.grade}
                    </span>
                  </div>
                  <Progress value={detail.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{detail.description}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {reportCard.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                  Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {reportCard.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-blue-600">
                  <Lightbulb className="w-4 h-4" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {reportCard.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && metrics.totalPredictions > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Target className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="text-2xl font-bold">{metrics.accuracy.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Predictions</p>
                    <p className="text-2xl font-bold">{metrics.totalPredictions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${metrics.roi >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {metrics.roi >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className={`text-2xl font-bold ${metrics.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {metrics.roi >= 0 ? "+" : ""}{metrics.roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Zap className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Calibration</p>
                    <p className="text-2xl font-bold">{metrics.confidenceCalibration.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance by Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.bySport).map(([sport, data]) => (
                    <div key={sport} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{sport}</span>
                        <span className={data.accuracy >= 55 ? "text-green-500" : "text-muted-foreground"}>
                          {data.accuracy.toFixed(1)}% ({data.correct}/{data.predictions})
                        </span>
                      </div>
                      <Progress value={data.accuracy} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance by Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.byConfidenceLevel).map(([level, data]) => (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize flex items-center gap-2">
                          {level === "high" && <Trophy className="w-4 h-4 text-yellow-500" />}
                          {level === "medium" && <Target className="w-4 h-4 text-blue-500" />}
                          {level === "low" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                          {level} Confidence
                        </span>
                        <span className={data.accuracy >= 55 ? "text-green-500" : "text-muted-foreground"}>
                          {data.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={data.accuracy} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {data.predictions} picks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Learning Curve
              </CardTitle>
              <CardDescription>
                How the algorithm improved over the training period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end gap-1 h-32">
                  {metrics.learningCurve.map((week, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-gradient-to-t from-blue-500/80 to-blue-400/60 rounded-t transition-all"
                      style={{ height: `${week.accuracy}%` }}
                      title={`Week ${week.week + 1}: ${week.accuracy.toFixed(1)}% (${week.predictions} predictions)`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Week 1</span>
                  <span>Week {metrics.learningCurve.length}</span>
                </div>
                {metrics.learningCurve.length >= 2 && (
                  <p className="text-sm text-muted-foreground">
                    {metrics.learningCurve[metrics.learningCurve.length - 1].accuracy > 
                     metrics.learningCurve[0].accuracy ? (
                      <span className="text-green-500">
                        Improved {(metrics.learningCurve[metrics.learningCurve.length - 1].accuracy - 
                          metrics.learningCurve[0].accuracy).toFixed(1)}% over training period
                      </span>
                    ) : (
                      <span className="text-orange-500">
                        Performance needs optimization
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Factor Performance Analysis</CardTitle>
              <CardDescription>
                How each analysis factor contributed to predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(metrics.factorPerformance).map(([factor, data]) => (
                  <div key={factor} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {factor.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {data.accuracy}%
                      </Badge>
                    </div>
                    <Progress value={data.accuracy} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      Weight: {data.contribution}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isTraining && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-medium">No Training Data Yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a training session to evaluate the prediction algorithm
              </p>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
