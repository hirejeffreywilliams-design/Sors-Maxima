import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  ShieldCheck, Zap, TrendingUp, Database, Brain, Clock,
  BarChart2, AlertCircle, Info, Loader2,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface QualityIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  detail: string;
  affectedCount?: number;
  recommendation: string;
}

interface QualityPassedCheck {
  id: string;
  category: string;
  title: string;
  detail: string;
}

interface QualityReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: "healthy" | "fair" | "degraded" | "critical";
  issues: QualityIssue[];
  passed: QualityPassedCheck[];
  stats: {
    totalPicks: number;
    sportsAnalyzed: string[];
    avgEV: number;
    avgConfidence: number;
    gradeDistribution: Record<string, number>;
    evSaturationPct: number;
    avgWinProbDrift: number;
    cacheAgeBySport: Record<string, string>;
  };
  generatedAt: string;
  nextCheckAt: string;
}

function timeAgo(ts: string): string {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", badge: "bg-red-500/10 text-red-500 border-red-500/20" },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  medium: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  info: { icon: Info, color: "text-gray-500", bg: "bg-gray-500/10 border-gray-500/20", badge: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  pick_accuracy: TrendingUp,
  ev_integrity: BarChart2,
  reasoning: Brain,
  data_freshness: Database,
  system: Zap,
  distribution: BarChart2,
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "text-green-500" : score >= 75 ? "text-yellow-500" : score >= 60 ? "text-orange-500" : "text-red-500";
  const bg = score >= 90 ? "bg-green-500" : score >= 75 ? "bg-yellow-500" : score >= 60 ? "bg-orange-500" : "bg-red-500";
  const label = score >= 90 ? "Healthy" : score >= 75 ? "Fair" : score >= 60 ? "Degraded" : "Critical";
  return (
    <div className="flex flex-col items-center gap-2" data-testid="quality-score-display">
      <div className={`text-7xl font-bold tabular-nums ${color}`} data-testid="quality-score">{score}</div>
      <Badge variant="outline" className={`${bg}/10 border-current ${color} text-sm px-3 py-1`} data-testid="quality-label">{label}</Badge>
      <Progress value={score} className="h-3 w-52 mt-1" data-testid="quality-progress" />
    </div>
  );
}

export default function AdminQualityWatchdog() {
  useSEO({ title: "Quality Watchdog — Admin" });
  const { toast } = useToast();
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const { data: report, isLoading } = useQuery<QualityReport>({
    queryKey: ["/api/admin/quality-report"],
    refetchInterval: 60_000,
  });

  const refresh = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/quality-report/refresh"),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.setQueryData(["/api/admin/quality-report"], data);
      toast({ title: "Quality check complete", description: `Score: ${data.score}/100 — ${data.issues.length} issue(s) found` });
    },
    onError: () => toast({ title: "Check failed", variant: "destructive" }),
  });

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Running quality analysis…</p>
        </div>
      </div>
    );
  }

  const criticalCount = report?.issues.filter(i => i.severity === "critical").length ?? 0;
  const highCount = report?.issues.filter(i => i.severity === "high").length ?? 0;
  const mediumCount = report?.issues.filter(i => i.severity === "medium").length ?? 0;
  const lowCount = report?.issues.filter(i => i.severity === "low").length ?? 0;

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
              Quality Watchdog
            </h1>
            <p className="text-sm text-muted-foreground">
              Continuous monitoring of pick accuracy, EV integrity, and data freshness
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            data-testid="button-run-quality-check"
            className="gap-1.5 shrink-0"
          >
            {refresh.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Check
          </Button>
        </div>

        {report && (
          <>
            {/* Score + Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="sm:col-span-1 flex items-center justify-center py-6">
                <ScoreBadge score={report.score} />
              </Card>

              <Card className="sm:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Summary</CardTitle>
                  <CardDescription>Last checked {timeAgo(report.generatedAt)} · next check {timeAgo(report.nextCheckAt)} from now</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-2xl font-bold text-red-500" data-testid="count-critical">{criticalCount}</p>
                      <p className="text-[10px] text-muted-foreground">Critical</p>
                    </div>
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-2xl font-bold text-orange-500" data-testid="count-high">{highCount}</p>
                      <p className="text-[10px] text-muted-foreground">High</p>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-2xl font-bold text-yellow-500" data-testid="count-medium">{mediumCount}</p>
                      <p className="text-[10px] text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-2xl font-bold text-green-500" data-testid="count-passed">{report.passed.length}</p>
                      <p className="text-[10px] text-muted-foreground">Passed</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total Picks</p>
                      <p className="font-semibold" data-testid="stat-total-picks">{report.stats.totalPicks}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg EV</p>
                      <p className="font-semibold text-emerald-500" data-testid="stat-avg-ev">{report.stats.avgEV > 35 ? "35%+" : `+${report.stats.avgEV}%`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">EV Saturation</p>
                      <p className={`font-semibold ${report.stats.evSaturationPct > 50 ? "text-orange-500" : "text-foreground"}`} data-testid="stat-ev-saturation">{report.stats.evSaturationPct}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ML Win Drift</p>
                      <p className={`font-semibold ${report.stats.avgWinProbDrift > 15 ? "text-orange-500" : "text-foreground"}`} data-testid="stat-win-drift">{report.stats.avgWinProbDrift}pp</p>
                    </div>
                  </div>

                  {report.stats.sportsAnalyzed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {report.stats.sportsAnalyzed.map(sport => (
                        <Badge key={sport} variant="outline" className="text-[10px]" data-testid={`badge-sport-${sport}`}>
                          {sport} {report.stats.cacheAgeBySport?.[sport] ? `· ${report.stats.cacheAgeBySport[sport]}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Issues */}
            {report.issues.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Issues Detected
                    <Badge variant="outline" className="ml-auto text-[10px]">{report.issues.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.issues.map(issue => {
                    const cfg = SEVERITY_CONFIG[issue.severity];
                    const IssueIcon = cfg.icon;
                    const CatIcon = CATEGORY_ICON[issue.category] || AlertCircle;
                    const expanded = expandedIssues.has(issue.id);
                    return (
                      <button
                        key={issue.id}
                        className={`w-full text-left p-3 rounded-lg border ${cfg.bg} transition-all`}
                        onClick={() => toggleIssue(issue.id)}
                        data-testid={`issue-card-${issue.id}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <IssueIcon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" data-testid={`text-issue-title-${issue.id}`}>{issue.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${cfg.badge}`}>{issue.severity}</Badge>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CatIcon className="w-2.5 h-2.5" />
                                {issue.category.replace("_", " ")}
                              </div>
                              {issue.affectedCount !== undefined && (
                                <span className="text-[10px] text-muted-foreground ml-auto">{issue.affectedCount} affected</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{issue.detail}</p>
                            {expanded && (
                              <div className="mt-2 pt-2 border-t border-current/10">
                                <p className="text-xs font-medium text-foreground">Recommendation</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{issue.recommendation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Passed Checks */}
            {report.passed.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Passed Checks
                    <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/10 text-green-600 border-green-500/20">{report.passed.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {report.passed.map(check => {
                    const CatIcon = CATEGORY_ICON[check.category] || CheckCircle;
                    return (
                      <div key={check.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-green-500/5 border border-green-500/15" data-testid={`passed-check-${check.id}`}>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{check.title}</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CatIcon className="w-2.5 h-2.5" />
                              {check.category.replace("_", " ")}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{check.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Grade Distribution */}
            {Object.keys(report.stats.gradeDistribution).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Grade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {["A+", "A", "B+", "B", "B-", "C+", "C"].map(grade => {
                      const count = report.stats.gradeDistribution[grade] || 0;
                      const pct = report.stats.totalPicks > 0 ? Math.round((count / report.stats.totalPicks) * 100) : 0;
                      const isTop = grade === "A+" || grade === "A";
                      return (
                        <div key={grade} className="text-center p-2 rounded-lg bg-muted/40" data-testid={`grade-stat-${grade}`}>
                          <p className={`text-lg font-bold ${isTop ? "text-emerald-500" : "text-foreground"}`}>{count}</p>
                          <p className="text-[10px] font-medium">{grade}</p>
                          <p className="text-[10px] text-muted-foreground">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Last check: {timeAgo(report.generatedAt)}</span>
              <span className="mx-1">·</span>
              <span>Runs automatically every 30 minutes</span>
              <span className="mx-1">·</span>
              <span>Next: ~{timeAgo(report.nextCheckAt)} from now</span>
            </div>
          </>
        )}

        {!report && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No report yet</p>
                <p className="text-sm text-muted-foreground mt-1">The watchdog runs 15 seconds after startup. Click Run Check to trigger one now.</p>
              </div>
              <Button onClick={() => refresh.mutate()} disabled={refresh.isPending} data-testid="button-trigger-first-check">
                {refresh.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Run First Check
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
