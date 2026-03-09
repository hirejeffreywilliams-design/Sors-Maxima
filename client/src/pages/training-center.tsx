import { useState, useEffect } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  backtestingEngine, 
  type PerformanceMetrics, 
  type ReportCard, 
  type BacktestResult,
  type LaunchReadiness,
  type FactorAnalysis,
  type StressTestResult,
  LAUNCH_CRITERIA
} from "@/lib/backtesting-engine";
import { getFactorCategories } from "@/lib/quantum-fusion-engine";
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
  CircleDot,
  Calendar,
  Shield,
  FlaskConical,
  Sliders,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Timer,
  Flame,
  Gauge
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

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
  useSEO({ title: "Model Lab — Engine Analytics | Sors Maxima", description: "Backtesting, factor analysis, stress testing, and prediction engine performance analytics." });
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [eventCount, setEventCount] = useState(500);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [activeTab, setActiveTab] = useState("readiness");
  const [launchReadiness, setLaunchReadiness] = useState<LaunchReadiness | null>(null);
  const [factorAnalysis, setFactorAnalysis] = useState<FactorAnalysis[]>([]);
  const [stressResults, setStressResults] = useState<StressTestResult[]>([]);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<{ before: any[]; after: any[]; improvement: number } | null>(null);
  const [optimizationApplied, setOptimizationApplied] = useState(false);
  const queryClient = useQueryClient();

  const launchDate = new Date("2026-02-08");
  const daysToLaunch = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

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
        setLaunchReadiness(backtestingEngine.getLaunchReadiness(launchDate));
        setFactorAnalysis(backtestingEngine.getFactorAnalysis());
      }
    });
    return () => { unsubscribe(); };
  }, []);

  const startTraining = async () => {
    backtestingEngine.initialize(eventCount);
    setMetrics(null);
    setReportCard(null);
    setLaunchReadiness(null);
    setFactorAnalysis([]);
    await backtestingEngine.runBacktest();
  };

  const resetTraining = () => {
    backtestingEngine.reset();
    setMetrics(null);
    setReportCard(null);
    setLaunchReadiness(null);
    setFactorAnalysis([]);
    setStressResults([]);
    setOptimizationResult(null);
    setProgress(0);
    setResults([]);
  };

  const runStressTest = async (scenario: "extreme_odds" | "high_volume" | "volatile_market" | "underdog_heavy") => {
    setIsStressTesting(true);
    const result = await backtestingEngine.runStressTest(scenario);
    setStressResults(prev => [...prev.filter(r => r.scenario !== result.scenario), result]);
    setIsStressTesting(false);
  };

  const runAllStressTests = async () => {
    setIsStressTesting(true);
    setStressResults([]);
    const scenarios = ["extreme_odds", "high_volume", "volatile_market", "underdog_heavy"] as const;
    for (const scenario of scenarios) {
      const result = await backtestingEngine.runStressTest(scenario);
      setStressResults(prev => [...prev, result]);
    }
    setIsStressTesting(false);
  };

  const runOptimization = () => {
    const result = backtestingEngine.optimizeWeights();
    setOptimizationResult(result);
    setOptimizationApplied(false);
  };

  const applyOptimization = () => {
    if (optimizationResult) {
      backtestingEngine.applyOptimization(optimizationResult.after);
      setOptimizationApplied(true);
      // Refresh factor analysis to show updated weights
      setFactorAnalysis(backtestingEngine.getFactorAnalysis());
    }
  };

  const exportReport = (format: "json" | "csv") => {
    const content = format === "json" 
      ? backtestingEngine.exportReportJSON() 
      : backtestingEngine.exportReportCSV();
    
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sors-training-report-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <ArrowUpRight className="w-3 h-3 text-green-500" />;
    if (trend === "declining") return <ArrowDownRight className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const categories = getFactorCategories();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHero
        icon={<GraduationCap className="w-6 h-6" />}
        title="Model Lab"
        subtitle="Backtesting, factor analysis, stress testing, and prediction engine performance analytics"
        actions={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Launch Countdown</p>
              <p className="text-2xl font-bold">{daysToLaunch} days</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="readiness" className="flex items-center gap-1 text-xs sm:text-sm">
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Readiness</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-1 text-xs sm:text-sm">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Training</span>
          </TabsTrigger>
          <TabsTrigger value="factors" className="flex items-center gap-1 text-xs sm:text-sm">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Factors</span>
          </TabsTrigger>
          <TabsTrigger value="stress" className="flex items-center gap-1 text-xs sm:text-sm">
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Stress Lab</span>
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-1 text-xs sm:text-sm">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-1 text-xs sm:text-sm">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Live</span>
          </TabsTrigger>
        </TabsList>

        {/* LAUNCH READINESS TAB */}
        <TabsContent value="readiness" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Launch Readiness Checklist
                </CardTitle>
                <CardDescription>
                  All criteria must be met before February 8, 2026 launch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!launchReadiness ? (
                  <div className="text-center py-8 space-y-4">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground">Run a training session to generate launch readiness data</p>
                    <Button onClick={() => setActiveTab("training")} data-testid="button-go-to-training">
                      <Play className="w-4 h-4" />
                      Start Training
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Overall Readiness Score</p>
                        <p className="text-sm text-muted-foreground">
                          {launchReadiness.criteria.filter(c => c.passed).length} of {launchReadiness.criteria.length} criteria met
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={launchReadiness.readinessScore} className="w-32 h-3" />
                        <span className="text-2xl font-bold">{launchReadiness.readinessScore.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {launchReadiness.criteria.map((criterion, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border ${criterion.passed ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {criterion.passed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">{criterion.name}</p>
                                <p className="text-xs text-muted-foreground">{criterion.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={criterion.priority === "critical" ? "destructive" : criterion.priority === "important" ? "default" : "secondary"}>
                                {criterion.priority}
                              </Badge>
                              <p className="text-sm mt-1">
                                <span className={criterion.passed ? "text-green-500" : "text-red-500"}>
                                  {criterion.current.toFixed(1)}
                                </span>
                                <span className="text-muted-foreground"> / {criterion.threshold}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Launch Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <p className="text-4xl font-bold text-primary">{daysToLaunch}</p>
                      <p className="text-sm text-muted-foreground">Days Until Launch</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Launch Date</span>
                        <span className="font-medium">Feb 8, 2026</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Today</span>
                        <span className="font-medium">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => exportReport("json")}
                    disabled={!metrics}
                    data-testid="button-export-json"
                  >
                    <FileText className="w-4 h-4" />
                    Download JSON Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => exportReport("csv")}
                    disabled={!metrics}
                    data-testid="button-export-csv"
                  >
                    <FileText className="w-4 h-4" />
                    Download CSV Report
                  </Button>
                </CardContent>
              </Card>

              {reportCard && (
                <Card className={`border-2 ${getGradeBg(reportCard.overallGrade)}`}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Current Grade</p>
                    <p className={`text-5xl font-bold ${getGradeColor(reportCard.overallGrade)}`}>
                      {reportCard.overallGrade}
                    </p>
                    <p className="text-sm mt-2">
                      {reportCard.readyForLaunch ? (
                        <Badge className="bg-green-500">Ready for Launch</Badge>
                      ) : (
                        <Badge variant="secondary">Needs More Training</Badge>
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TRAINING TAB */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Training Configuration
              </CardTitle>
              <CardDescription>
                Run the prediction engine against simulated historical data
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
                  More events = more accurate training. Recommended: 500+ for launch readiness.
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Learning Curve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-end gap-1 h-32">
                        {metrics.learningCurve.map((week, i) => (
                          <div 
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-500/80 to-blue-400/60 rounded-t transition-all"
                            style={{ height: `${week.accuracy}%` }}
                            title={`Week ${week.week + 1}: ${week.accuracy.toFixed(1)}%`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Week 1</span>
                        <span>Week {metrics.learningCurve.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* FACTORS TAB */}
        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Statistical Performance Analysis
              </CardTitle>
              <CardDescription>
                Detailed breakdown of all contributing factors by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {factorAnalysis.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">Run a training session to analyze factor performance</p>
                  <Button onClick={() => setActiveTab("training")} data-testid="button-go-to-training-factors">
                    <Play className="w-4 h-4" />
                    Start Training
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categories).map(([catKey, catData]) => {
                    const catFactors = factorAnalysis.filter(f => f.category === catKey);
                    const avgAccuracy = catFactors.reduce((sum, f) => sum + f.accuracy, 0) / Math.max(1, catFactors.length);
                    const isExpanded = expandedCategory === catKey;

                    return (
                      <div key={catKey} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                          className="w-full p-4 flex items-center justify-between hover-elevate"
                          data-testid={`button-expand-${catKey}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{catData.icon}</span>
                            <div className="text-left">
                              <p className="font-medium">{catData.name}</p>
                              <p className="text-xs text-muted-foreground">{catFactors.length} factors</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">{avgAccuracy.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">avg accuracy</p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t p-4 bg-muted/30">
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {catFactors.sort((a, b) => a.rank - b.rank).map((factor) => (
                                <div key={factor.factor} className="p-3 rounded-lg bg-background border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium capitalize">
                                      {factor.factor.replace(/_/g, " ")}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {getTrendIcon(factor.trend)}
                                      <Badge variant="outline" className="text-xs">
                                        #{factor.rank}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Progress value={factor.accuracy} className="h-1.5 mb-2" />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{factor.accuracy.toFixed(1)}% accuracy</span>
                                    <span>{(factor.weight * 100).toFixed(1)}% weight</span>
                                  </div>
                                  {factor.recommendation && (
                                    <p className="text-xs text-orange-500 mt-2 flex items-start gap-1">
                                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                      {factor.recommendation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {factorAnalysis.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top 10 Performing Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factorAnalysis.slice(0, 10).map((factor) => (
                      <div key={factor.factor} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">#{factor.rank}</span>
                          <span className="text-sm capitalize">{factor.factor.replace(/_/g, " ")}</span>
                        </div>
                        <Badge className="bg-green-500">{factor.accuracy.toFixed(1)}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Factors Needing Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factorAnalysis.filter(f => f.recommendation).slice(0, 10).map((factor) => (
                      <div key={factor.factor} className="p-2 rounded bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm capitalize">{factor.factor.replace(/_/g, " ")}</span>
                          <Badge variant="outline">{factor.accuracy.toFixed(1)}%</Badge>
                        </div>
                        <p className="text-xs text-orange-500 mt-1">{factor.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* STRESS LAB TAB */}
        <TabsContent value="stress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Stress Testing Laboratory
              </CardTitle>
              <CardDescription>
                Test the algorithm under extreme conditions and edge cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => runStressTest("extreme_odds")}
                  disabled={isStressTesting}
                  data-testid="button-stress-extreme"
                >
                  <Flame className="w-6 h-6 text-orange-500" />
                  <span className="text-sm">Extreme Odds</span>
                  <span className="text-xs text-muted-foreground">-400 to +600</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => runStressTest("high_volume")}
                  disabled={isStressTesting}
                  data-testid="button-stress-volume"
                >
                  <Gauge className="w-6 h-6 text-blue-500" />
                  <span className="text-sm">High Volume</span>
                  <span className="text-xs text-muted-foreground">200 rapid picks</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => runStressTest("volatile_market")}
                  disabled={isStressTesting}
                  data-testid="button-stress-volatile"
                >
                  <Activity className="w-6 h-6 text-purple-500" />
                  <span className="text-sm">Volatile Market</span>
                  <span className="text-xs text-muted-foreground">Line movements</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={() => runStressTest("underdog_heavy")}
                  disabled={isStressTesting}
                  data-testid="button-stress-underdog"
                >
                  <Target className="w-6 h-6 text-green-500" />
                  <span className="text-sm">Underdog Heavy</span>
                  <span className="text-xs text-muted-foreground">+150 to +400</span>
                </Button>
              </div>

              <Button 
                onClick={runAllStressTests} 
                disabled={isStressTesting}
                className="w-full"
                data-testid="button-run-all-stress"
              >
                {isStressTesting ? (
                  <>
                    <Activity className="w-4 h-4 animate-pulse" />
                    Running Stress Tests...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run All Stress Tests
                  </>
                )}
              </Button>

              {stressResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Stress Test Results</h3>
                  {stressResults.map((result, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg border ${result.passed ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium">{result.scenario}</span>
                        </div>
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Predictions</p>
                          <p className="font-medium">{result.predictions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Accuracy</p>
                          <p className={`font-medium ${result.accuracy >= 50 ? "text-green-500" : "text-red-500"}`}>
                            {result.accuracy.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROI</p>
                          <p className={`font-medium ${result.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      {result.issues.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-red-500">Issues: {result.issues.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPTIMIZE TAB */}
        <TabsContent value="optimize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Weight Optimization
              </CardTitle>
              <CardDescription>
                Auto-tune the 46 factor weights based on historical performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-4">
                  The optimizer adjusts factor weights based on their historical accuracy and recent trends. 
                  Factors with higher accuracy and improving trends receive increased weights.
                </p>
                <Button 
                  onClick={runOptimization} 
                  disabled={factorAnalysis.length === 0}
                  data-testid="button-run-optimization"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Weight Optimization
                </Button>
              </div>

              {optimizationResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${optimizationApplied ? "bg-green-500/20 border-green-500/40" : "bg-green-500/10 border-green-500/20"}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <span className="font-medium">
                          {optimizationApplied ? "Optimization Applied!" : "Optimization Ready"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500">
                          +{optimizationResult.improvement.toFixed(2)}% Improvement
                        </Badge>
                        {!optimizationApplied && (
                          <Button 
                            size="sm" 
                            onClick={applyOptimization}
                            data-testid="button-apply-optimization"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Apply Changes
                          </Button>
                        )}
                        {optimizationApplied && (
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Applied
                          </Badge>
                        )}
                      </div>
                    </div>
                    {optimizationApplied && (
                      <p className="text-sm text-green-600 mt-2">
                        Weights have been updated. Run another training session to see the improved results.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Top Weight Increases</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {optimizationResult.after
                            .map((after, i) => ({
                              factor: after.factor,
                              before: optimizationResult.before[i].weight,
                              after: after.weight,
                              change: after.weight - optimizationResult.before[i].weight,
                            }))
                            .sort((a, b) => b.change - a.change)
                            .slice(0, 5)
                            .map((item) => (
                              <div key={item.factor} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{item.factor.replace(/_/g, " ")}</span>
                                <span className="text-green-500">
                                  +{(item.change * 100).toFixed(2)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Top Weight Decreases</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {optimizationResult.after
                            .map((after, i) => ({
                              factor: after.factor,
                              before: optimizationResult.before[i].weight,
                              after: after.weight,
                              change: after.weight - optimizationResult.before[i].weight,
                            }))
                            .sort((a, b) => a.change - b.change)
                            .slice(0, 5)
                            .map((item) => (
                              <div key={item.factor} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{item.factor.replace(/_/g, " ")}</span>
                                <span className="text-red-500">
                                  {(item.change * 100).toFixed(2)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIVE GAMES TAB */}
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
      </Tabs>
    </div>
  );
}
