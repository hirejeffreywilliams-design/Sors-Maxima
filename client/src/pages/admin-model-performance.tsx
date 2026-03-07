import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Target, TrendingUp, Activity, BarChart3, Shield,
  CheckCircle, AlertTriangle, XCircle, Cpu, GitBranch, Eye,
  Crosshair, DollarSign, Layers, RefreshCw, Sparkles, FlaskConical,
  BookOpen, Zap, Database
} from "lucide-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";

export default function AdminModelPerformance() {
  useSEO({ title: "Model Performance", description: "ML model accuracy, calibration, and drift monitoring" });
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/model-performance"] });
  const { data: mcStats } = useQuery<any>({ queryKey: ["/api/admin/mc-learning/stats"], refetchInterval: 60000 });
  const { data: usmlStats, refetch: refetchUSML } = useQuery<any>({ queryKey: ["/api/admin/usml/stats"], refetchInterval: 30000 });
  const { data: autoLearnData, refetch: refetchAutoLearn, isLoading: autoLearnLoading } = useQuery<any>({
    queryKey: ["/api/admin/autonomous-learning"],
    refetchInterval: 60000,
  });
  const usmlCycleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/usml/cycle"),
    onSuccess: () => { setTimeout(() => refetchUSML(), 1000); },
  });
  const triggerLearnMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/actions/run-autonomous-learning").then(r => r.json()),
    onSuccess: () => { setTimeout(() => refetchAutoLearn(), 3000); },
  });

  const [aiAnalysis, setAiAnalysis] = useState<{ analysis: string; generatedAt: string } | null>(null);
  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/track-record/ai-analysis").then(r => r.json()),
    onSuccess: (result: any) => setAiAnalysis(result),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-model-performance">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overview = data?.overview;
  const calibration = data?.calibration || [];
  const drift = data?.drift;
  const versions = data?.versions || [];
  const evRealized = data?.evRealized;
  const adversarial = data?.adversarial;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Model Performance</h1>
            <p className="text-sm text-muted-foreground">Prediction accuracy, calibration, drift monitoring & adversarial detection</p>
          </div>
          <Badge variant={overview?.hitRate > 0.55 ? "default" : "destructive"} data-testid="badge-overall-status">
            {overview?.hitRate > 0.55 ? "Healthy" : "Needs Attention"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="w-3 h-3" /> Hit Rate
              </div>
              <div className="text-2xl font-bold" data-testid="text-hit-rate">{(overview?.hitRate * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{overview?.totalPredictions} predictions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3 h-3" /> Sharpe Ratio
              </div>
              <div className="text-2xl font-bold" data-testid="text-sharpe">{overview?.sharpeRatio}</div>
              <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Crosshair className="w-3 h-3" /> Avg Confidence
              </div>
              <div className="text-2xl font-bold" data-testid="text-confidence">{(overview?.avgConfidence * 100).toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Model certainty</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Activity className="w-3 h-3" /> Max Drawdown
              </div>
              <div className="text-2xl font-bold text-red-500" data-testid="text-drawdown">{overview?.maxDrawdown}%</div>
              <p className="text-xs text-muted-foreground">Worst decline</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-green-500" data-testid="text-wins">{overview?.wins}</div>
              <p className="text-xs text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-red-500" data-testid="text-losses">{overview?.losses}</div>
              <p className="text-xs text-muted-foreground">Losses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-muted-foreground" data-testid="text-pushes">{overview?.pushes}</div>
              <p className="text-xs text-muted-foreground">Pushes</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calibration">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="calibration" data-testid="tab-calibration">
              <BarChart3 className="w-3 h-3 mr-1" /> Calibration
            </TabsTrigger>
            <TabsTrigger value="drift" data-testid="tab-drift">
              <Activity className="w-3 h-3 mr-1" /> Concept Drift
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid="tab-versions">
              <GitBranch className="w-3 h-3 mr-1" /> Model Versions
            </TabsTrigger>
            <TabsTrigger value="ev" data-testid="tab-ev">
              <DollarSign className="w-3 h-3 mr-1" /> EV Realized
            </TabsTrigger>
            <TabsTrigger value="adversarial" data-testid="tab-adversarial">
              <Shield className="w-3 h-3 mr-1" /> Adversarial
            </TabsTrigger>
            <TabsTrigger value="mc-learning" data-testid="tab-mc-learning">
              <Layers className="w-3 h-3 mr-1" /> MC Learning
            </TabsTrigger>
            <TabsTrigger value="ensemble" data-testid="tab-ensemble">
              <Cpu className="w-3 h-3 mr-1" /> Ensemble
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis">
              <Sparkles className="w-3 h-3 mr-1" /> AI Analysis
            </TabsTrigger>
            <TabsTrigger value="auto-learning" data-testid="tab-auto-learning">
              <BookOpen className="w-3 h-3 mr-1" /> Auto-Learn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calibration" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calibration Curve</CardTitle>
                <CardDescription>Predicted vs actual probability by bucket</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calibration.map((bucket: any) => {
                    const gap = Math.abs(bucket.predicted - bucket.actual);
                    const isCalibrated = gap < 0.05;
                    return (
                      <div key={bucket.predicted} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono w-16">{(bucket.predicted * 100).toFixed(0)}%</span>
                          <div className="flex-1">
                            <div className="relative h-6 bg-muted rounded-md overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/30 rounded-md"
                                style={{ width: `${bucket.predicted * 100}%` }}
                              />
                              <div
                                className="absolute inset-y-0 left-0 bg-primary rounded-md"
                                style={{ width: `${bucket.actual * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-mono w-16 text-right">{(bucket.actual * 100).toFixed(0)}%</span>
                          <Badge variant={isCalibrated ? "secondary" : "destructive"} className="text-xs w-16 justify-center">
                            {gap < 0.01 ? "Perfect" : isCalibrated ? "Good" : "Off"}
                          </Badge>
                          <span className="text-xs text-muted-foreground w-12 text-right">n={bucket.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary/30 rounded" /> Predicted
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary rounded" /> Actual
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drift" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Concept Drift Monitoring</CardTitle>
                <CardDescription>Tracking model stability over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Feature Drift</span>
                      <span className="font-mono">{drift?.featureDrift}</span>
                    </div>
                    <Progress value={(drift?.featureDrift / drift?.driftThreshold) * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Prediction Drift</span>
                      <span className="font-mono">{drift?.predictionDrift}</span>
                    </div>
                    <Progress value={(drift?.predictionDrift / drift?.driftThreshold) * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Data Drift</span>
                      <span className="font-mono">{drift?.dataDrift}</span>
                    </div>
                    <Progress value={(drift?.dataDrift / drift?.driftThreshold) * 100} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center gap-2">
                  <Badge variant={drift?.status === "stable" ? "secondary" : "destructive"}>
                    {drift?.status === "stable" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                    {drift?.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Threshold: {drift?.driftThreshold}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">30-Day Trend</p>
                  <div className="flex items-end gap-px h-20">
                    {drift?.trendHistory?.map((d: any, i: number) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/60 rounded-t-sm transition-all"
                        style={{ height: `${(d.featureDrift / drift.driftThreshold) * 100}%` }}
                        title={`${d.date}: ${d.featureDrift.toFixed(3)}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>30d ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Version History</CardTitle>
                <CardDescription>Performance comparison across deployments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Deployed</TableHead>
                      <TableHead>Hit Rate</TableHead>
                      <TableHead>EV Realized</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v: any) => (
                      <TableRow key={v.version}>
                        <TableCell className="font-mono font-medium">{v.version}</TableCell>
                        <TableCell className="text-muted-foreground">{v.deployedAt}</TableCell>
                        <TableCell>
                          <span className={v.hitRate > 0.55 ? "text-green-500" : "text-muted-foreground"}>
                            {(v.hitRate * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={v.evRealized > 0 ? "text-green-500" : "text-red-500"}>
                            +{v.evRealized}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.status === "active" ? "default" : "secondary"}>
                            {v.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ev" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expected Value Realized</CardTitle>
                <CardDescription>Actual economic edge delivered to users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">${evRealized?.totalEVGenerated?.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total EV Generated</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">+{evRealized?.avgEVPerTicket}%</div>
                    <p className="text-xs text-muted-foreground">Avg EV/Ticket</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{evRealized?.bestPerformingSport}</div>
                    <p className="text-xs text-muted-foreground">Best Sport</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{evRealized?.bestPerformingMarket}</div>
                    <p className="text-xs text-muted-foreground">Best Market</p>
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Weekly EV Trend</p>
                <div className="space-y-2">
                  {evRealized?.weeklyEV?.map((w: any) => (
                    <div key={w.week} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-8">{w.week}</span>
                      <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full bg-green-500/70 rounded-md"
                          style={{ width: `${(w.evRealized / 200) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-20 text-right">
                        ${w.evRealized.toFixed(0)} ({w.ticketCount}t)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adversarial" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adversarial Defense</CardTitle>
                <CardDescription>Model theft prevention & data integrity monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="w-3 h-3" /> Suspicious Queries
                    </div>
                    <div className="text-xl font-bold">{adversarial?.suspiciousQueries}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-3 h-3" /> Rate Limit Hits
                    </div>
                    <div className="text-xl font-bold">{adversarial?.rateLimitHits}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Cpu className="w-3 h-3" /> Probing Attempts
                    </div>
                    <div className="text-xl font-bold">{adversarial?.modelProbingAttempts}</div>
                  </div>
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Data Integrity Score</p>
                    <p className="text-xs text-muted-foreground">Cross-source verification score</p>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{adversarial?.dataIntegrityScore}%</div>
                </div>
                <Progress value={adversarial?.dataIntegrityScore} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mc-learning" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MC Stacked Learning Engine</CardTitle>
                <CardDescription>Variance-adjusted Sors Simulation trust weight, sport calibration, and prediction learning loop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={mcStats?.status === "balanced" ? "default" : mcStats?.status === "mc_dominant" ? "default" : "secondary"} data-testid="badge-mc-status">
                      {mcStats?.statusLabel ?? "—"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Trust Weight</div>
                    <div className="text-xl font-bold" data-testid="text-mc-weight">{mcStats?.mcStackedWeight ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">range 0.7–1.3</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Total Predictions</div>
                    <div className="text-xl font-bold" data-testid="text-mc-total-preds">{mcStats?.totalPredictions ?? 0}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Win Rate (settled)</div>
                    <div className="text-xl font-bold" data-testid="text-mc-win-rate">
                      {mcStats?.overallWinRate != null ? `${mcStats.overallWinRate}%` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{mcStats?.totalSettled ?? 0} settled</div>
                  </div>
                </div>

                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Variance Accuracy</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Low Variance</span>
                        <span data-testid="text-mc-lv-wr">{mcStats?.varianceAccuracy?.lowVariance?.winRate != null ? `${mcStats.varianceAccuracy.lowVariance.winRate}% (${mcStats.varianceAccuracy.lowVariance.total})` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">High Variance</span>
                        <span data-testid="text-mc-hv-wr">{mcStats?.varianceAccuracy?.highVariance?.winRate != null ? `${mcStats.varianceAccuracy.highVariance.winRate}% (${mcStats.varianceAccuracy.highVariance.total})` : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Convergence Accuracy</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">High Convergence</span>
                        <span>{mcStats?.convergenceAccuracy?.highConvergence?.winRate != null ? `${mcStats.convergenceAccuracy.highConvergence.winRate}% (${mcStats.convergenceAccuracy.highConvergence.total})` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Low Convergence</span>
                        <span>{mcStats?.convergenceAccuracy?.lowConvergence?.winRate != null ? `${mcStats.convergenceAccuracy.lowConvergence.winRate}% (${mcStats.convergenceAccuracy.lowConvergence.total})` : "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {mcStats?.sportBreakdown?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Sport Calibration</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sport</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Win Rate</TableHead>
                            <TableHead className="text-right">Bias Corr</TableHead>
                            <TableHead className="text-right">Avg Variance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mcStats.sportBreakdown.map((s: any) => (
                            <TableRow key={s.sport}>
                              <TableCell className="font-medium">{s.sport}</TableCell>
                              <TableCell className="text-right">{s.count}</TableCell>
                              <TableCell className="text-right">{s.winRate ? `${s.winRate}%` : "—"}</TableCell>
                              <TableCell className="text-right font-mono">{s.biasCorrection > 0 ? `+${s.biasCorrection}` : s.biasCorrection}</TableCell>
                              <TableCell className="text-right">{s.avgVariance}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {mcStats?.betTypeBreakdown?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Bet Type Breakdown</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {mcStats.betTypeBreakdown.map((b: any) => (
                          <div key={b.betType} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="font-medium capitalize">{b.betType}</div>
                            <div className="text-muted-foreground text-xs">{b.count} picks • {b.winRate ? `${b.winRate}% WR` : "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Learning Cycles Run: <span className="text-foreground font-medium">{mcStats?.learningCycles ?? 0}</span></span>
                  <span>Last Cycle: <span className="text-foreground font-medium font-mono">{mcStats?.lastCycleAt ? new Date(mcStats.lastCycleAt).toLocaleTimeString() : "—"}</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ensemble" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Unified Stacking Meta-Learner (USML)</CardTitle>
                    <CardDescription>
                      Ensemble engine that dynamically reweights Sors Core, Simulation, Vegas, Situational, Market, and Learning signals
                      based on historical accuracy. Weights self-adjust after every settled outcome.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => usmlCycleMutation.mutate()}
                    disabled={usmlCycleMutation.isPending}
                    data-testid="button-usml-cycle"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${usmlCycleMutation.isPending ? "animate-spin" : ""}`} />
                    Run Cycle
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Ensemble Win Rate</div>
                    <div className="text-2xl font-bold" data-testid="text-usml-winrate">
                      {usmlStats?.ensembleWinRate != null ? `${usmlStats.ensembleWinRate}%` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{usmlStats?.totalSettled ?? 0} settled</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">EMA Accuracy</div>
                    <div className="text-2xl font-bold" data-testid="text-usml-ema">
                      {usmlStats?.ensembleEMA != null ? `${usmlStats.ensembleEMA}%` : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Momentum</div>
                    <div className="text-xl font-bold" data-testid="text-usml-momentum">
                      {usmlStats?.ensembleMomentum != null
                        ? <span className={usmlStats.ensembleMomentum > 0.02 ? "text-green-500" : usmlStats.ensembleMomentum < -0.02 ? "text-red-500" : ""}>
                            {usmlStats.ensembleMomentum > 0 ? "+" : ""}{usmlStats.ensembleMomentum}
                          </span>
                        : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Total Predictions</div>
                    <div className="text-2xl font-bold" data-testid="text-usml-preds">{usmlStats?.totalPredictions ?? 0}</div>
                    <div className="text-xs text-muted-foreground">{usmlStats?.pendingCount ?? 0} pending</div>
                  </div>
                </div>

                <Separator />
                <div>
                  <p className="text-sm font-medium mb-3">Source Weight Rankings</p>
                  <div className="space-y-3">
                    {(usmlStats?.sources ?? [])
                      .sort((a: any, b: any) => b.currentWeight - a.currentWeight)
                      .map((src: any) => {
                        const pct = Math.round(((src.currentWeight - 0.4) / (2.0 - 0.4)) * 100);
                        const isBase = Math.abs(src.currentWeight - src.baseWeight) < 0.01;
                        return (
                          <div key={src.id} className="space-y-1" data-testid={`row-usml-${src.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium truncate">{src.displayName}</span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {src.momentumLabel}
                                </Badge>
                                {isBase && <span className="text-xs text-muted-foreground shrink-0">baseline</span>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold font-mono">{src.currentWeight}×</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {src.accuracy != null ? `${src.accuracy}% acc` : "learning"}
                                  {" "}(n={src.totalOutcomes})
                                </span>
                              </div>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })}
                  </div>
                </div>

                {usmlStats?.sources?.some((s: any) => s.sportBreakdown?.length > 0) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Sport-Specific Calibration (top source)</p>
                      {usmlStats.sources
                        .filter((s: any) => s.sportBreakdown?.length > 0)
                        .slice(0, 1)
                        .map((src: any) => (
                          <div key={src.id}>
                            <p className="text-xs text-muted-foreground mb-2">{src.displayName}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {src.sportBreakdown.map((sb: any) => (
                                <div key={sb.sport} className="p-2 bg-muted/30 rounded text-sm">
                                  <div className="font-medium">{sb.sport}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {sb.ema}% EMA • {sb.weight}× wt • n={sb.total}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Learning Cycles: <span className="text-foreground font-medium">{usmlStats?.learningCycles ?? 0}</span></span>
                  <span>Last Cycle: <span className="text-foreground font-medium font-mono">{usmlStats?.lastCycleAt ? new Date(usmlStats.lastCycleAt).toLocaleTimeString() : "—"}</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Analysis Tab ──────────────────────────────────────────── */}
          <TabsContent value="ai-analysis" className="space-y-4 mt-4">
            <Card className="border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      Model Performance AI Analysis
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      AI-powered breakdown of calibration gaps, grade distribution, and pick selection patterns
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => aiMutation.mutate()}
                    disabled={aiMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 shrink-0"
                    data-testid="button-generate-ai-analysis"
                  >
                    {aiMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        {aiAnalysis ? "Refresh Analysis" : "Generate Analysis"}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Analysis failed — try again in a moment.
                  </div>
                )}
                {!aiAnalysis && !aiMutation.isPending && !aiMutation.isError && (
                  <div className="flex flex-col items-center py-8 text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <FlaskConical className="h-7 w-7 text-violet-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Admin-only performance analysis</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Generates a detailed plain-English breakdown of model calibration, grade-tier accuracy,
                        over/underconfidence patterns, and actionable improvement signals.
                      </p>
                    </div>
                  </div>
                )}
                {aiMutation.isPending && (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                )}
                {aiAnalysis && !aiMutation.isPending && (
                  <div className="space-y-3">
                    <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line" data-testid="text-ai-analysis">
                      {aiAnalysis.analysis}
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                      Generated {new Date(aiAnalysis.generatedAt).toLocaleString()} · Admin view only
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="auto-learning" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Autonomous Learning Engine</CardTitle>
                    <CardDescription>
                      Bootstraps the Sors Simulation Engine and Stacking Meta-Learner from historical pick outcomes.
                      Every settled pick automatically feeds real-time Bayesian updates and sport calibration.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerLearnMutation.mutate({ action: "run_autonomous_learning" } as any)}
                    disabled={triggerLearnMutation.isPending}
                    data-testid="button-trigger-learning"
                  >
                    <Zap className={`w-3 h-3 mr-1 ${triggerLearnMutation.isPending ? "animate-pulse" : ""}`} />
                    Trigger Cycle
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {autoLearnLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Database className="w-3 h-3" /> Bootstrap Status
                        </div>
                        <div className="flex items-center gap-1">
                          {autoLearnData?.bootstrap?.complete
                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                            : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          <span className="text-sm font-medium" data-testid="text-bootstrap-status">
                            {autoLearnData?.bootstrap?.complete ? "Complete" : "Pending"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid="text-bootstrap-count">
                          {autoLearnData?.bootstrap?.picksProcessed ?? 0} picks fed
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Total Cycles</div>
                        <div className="text-2xl font-bold" data-testid="text-total-cycles">
                          {autoLearnData?.cycles?.total ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          MC: {autoLearnData?.cycles?.mcStackedCycles ?? 0} / USML: {autoLearnData?.cycles?.usmlCycles ?? 0}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">MC Engine Records</div>
                        <div className="text-2xl font-bold" data-testid="text-mc-records">
                          {autoLearnData?.mcEngine?.records ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">predictions logged</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">User Feedback</div>
                        <div className="text-2xl font-bold" data-testid="text-user-feedback">
                          {autoLearnData?.userFeedbackProcessed ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">ticket outcomes</div>
                      </div>
                    </div>

                    {autoLearnData?.bootstrap?.ranAt && (
                      <p className="text-xs text-muted-foreground">
                        Last bootstrap: {new Date(autoLearnData.bootstrap.ranAt).toLocaleString()}
                        {autoLearnData?.cycles?.lastRanAt && ` · Last cycle: ${new Date(autoLearnData.cycles.lastRanAt).toLocaleString()}`}
                      </p>
                    )}

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Sport Calibration (from {autoLearnData?.bootstrap?.picksProcessed ?? 0} historical picks)</p>
                      {Object.keys(autoLearnData?.sportAccuracy ?? {}).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sport data yet — trigger a learning cycle to bootstrap.</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(autoLearnData?.sportAccuracy ?? {})
                            .sort(([, a]: any, [, b]: any) => b.total - a.total)
                            .map(([sport, d]: [string, any]) => {
                              const winRate = d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0;
                              const color = winRate >= 55 ? "text-green-500" : winRate >= 50 ? "text-yellow-500" : "text-red-500";
                              return (
                                <div key={sport} className="flex items-center gap-3" data-testid={`row-sport-${sport}`}>
                                  <span className="text-sm font-medium w-16 shrink-0">{sport}</span>
                                  <div className="flex-1">
                                    <Progress value={winRate} className="h-2" />
                                  </div>
                                  <span className={`text-sm font-bold tabular-nums w-14 text-right ${color}`}>
                                    {winRate}%
                                  </span>
                                  <span className="text-xs text-muted-foreground w-20 text-right">
                                    {d.wins}W / {d.total}T
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {autoLearnData?.mcStacked && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Stacked Weight</div>
                            <div className="text-2xl font-bold font-mono" data-testid="text-stacked-weight">
                              {autoLearnData.mcStacked.mcStackedWeight?.toFixed(3) ?? "—"}×
                            </div>
                            <div className="text-xs text-muted-foreground">target = 1.0 baseline</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Stacked Cycles</div>
                            <div className="text-2xl font-bold" data-testid="text-stacked-cycles">
                              {autoLearnData.mcStacked.learningCycles ?? 0}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Total Settled</div>
                            <div className="text-2xl font-bold">{autoLearnData.mcStacked.totalSettled ?? 0}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {(autoLearnData?.recentErrors ?? []).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-red-500 mb-2">Recent Errors</p>
                          {autoLearnData.recentErrors.map((err: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground font-mono">{err}</p>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </ScrollArea>
  );
}
