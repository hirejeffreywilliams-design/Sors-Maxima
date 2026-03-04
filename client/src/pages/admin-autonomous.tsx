import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Cpu,
  TrendingUp,
} from "lucide-react";

interface AutoStatus {
  running: boolean;
  startedAt: string | null;
  overallStatus: "healthy" | "warning" | "critical";
  activeAlertCount: number;
  criticalCount: number;
  warningCount: number;
  totalQuickChecks: number;
  totalDeepChecks: number;
  lastQuickCheck: string | null;
  lastDeepCheck: string | null;
  nextQuickCheck: string | null;
  nextDeepCheck: string | null;
  lastQuickMetrics: {
    winRate: number | null;
    settledPicks: number;
    oddsApiRemaining: number | null;
    oddsApiStatus: string;
    guardianHealth: number;
    cacheHitRate: number;
    heapUsedMb: number;
    heapTotalMb: number;
    hubLastCycleMs: number | null;
    aiCircuitOpen: boolean;
  } | null;
  lastQuickStatus: string | null;
  latestSummary: string[];
  latestP1Tasks: Array<{
    title: string;
    description: string;
    priority: "P1" | "P2" | "P3";
    due_by: string;
    effort_hours: number;
  }>;
}

interface AutoAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  checkType: "quick" | "deep";
}

interface DeepReport {
  id: string;
  timestamp: string;
  durationMs: number;
  summary: string[];
  priority_tasks: Array<{
    title: string;
    description: string;
    priority: "P1" | "P2" | "P3";
    due_by: string;
    effort_hours: number;
  }>;
  risk_alerts: Array<{
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  ops_checklist: {
    today: string[];
    this_week: string[];
  };
  health_snapshot: any;
  error?: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "critical") return <Badge variant="destructive" className="text-xs">Critical</Badge>;
  if (status === "warning") return <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Warning</Badge>;
  if (status === "healthy") return <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">Healthy</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  return <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "P1") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">P1</Badge>;
  if (priority === "P2") return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500">P2</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">P3</Badge>;
}

function AlertCard({ alert, onResolve }: { alert: AutoAlert; onResolve: (id: string) => void }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        alert.severity === "critical"
          ? "border-red-500/30 bg-red-500/5"
          : alert.severity === "warning"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-blue-500/30 bg-blue-500/5"
      }`}
      data-testid={`alert-card-${alert.id}`}
    >
      <SeverityIcon severity={alert.severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{alert.title}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{alert.category.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.checkType} check</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(alert.timestamp)}</p>
      </div>
      {!alert.resolved && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-6 px-2 shrink-0"
          onClick={() => onResolve(alert.id)}
          data-testid={`button-resolve-${alert.id}`}
        >
          Resolve
        </Button>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: DeepReport }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-border/50" data-testid={`report-card-${report.id}`}>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">AI Analysis</CardTitle>
              {report.error && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
              <span className="text-xs text-muted-foreground">{timeAgo(report.timestamp)}</span>
              <span className="text-[10px] text-muted-foreground">({(report.durationMs / 1000).toFixed(1)}s)</span>
            </div>
            {report.summary[0] && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{report.summary[0]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {report.priority_tasks.filter(t => t.priority === "P1").length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {report.priority_tasks.filter(t => t.priority === "P1").length} P1
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {report.summary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
              <ul className="space-y-1">
                {report.summary.map((s, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.priority_tasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Priority Tasks</p>
              <div className="space-y-2">
                {report.priority_tasks.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                    <PriorityBadge priority={t.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Due: {t.due_by} · ~{t.effort_hours}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.risk_alerts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Alerts</p>
              <div className="space-y-1.5">
                {report.risk_alerts.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge
                      variant={r.severity === "critical" || r.severity === "high" ? "destructive" : "outline"}
                      className="text-[10px] px-1.5 py-0 capitalize shrink-0"
                    >
                      {r.severity}
                    </Badge>
                    <div>
                      <p className="text-xs font-medium">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(report.ops_checklist.today.length > 0 || report.ops_checklist.this_week.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.ops_checklist.today.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Today</p>
                  <ul className="space-y-1">
                    {report.ops_checklist.today.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.ops_checklist.this_week.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Week</p>
                  <ul className="space-y-1">
                    {report.ops_checklist.this_week.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminAutonomous() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<AutoStatus>({
    queryKey: ["/api/admin/autonomous/status"],
    refetchInterval: 30000,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<AutoAlert[]>({
    queryKey: ["/api/admin/autonomous/alerts"],
    refetchInterval: 30000,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<DeepReport[]>({
    queryKey: ["/api/admin/autonomous/reports"],
    refetchInterval: 60000,
  });

  const quickCheckMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/autonomous/trigger-check"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/alerts"] });
      toast({ title: "Quick check complete", description: "Status updated." });
    },
    onError: () => toast({ title: "Quick check failed", variant: "destructive" }),
  });

  const deepAnalysisMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/autonomous/trigger-deep"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/reports"] });
      toast({ title: "Deep analysis complete", description: "New AI report generated." });
    },
    onError: () => toast({ title: "Deep analysis failed", variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest("POST", `/api/admin/autonomous/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomous/status"] });
    },
    onError: () => toast({ title: "Failed to resolve alert", variant: "destructive" }),
  });

  const m = status?.lastQuickMetrics;
  const heapPercent = m ? Math.round((m.heapUsedMb / m.heapTotalMb) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold" data-testid="heading-autonomous">Autonomous Intelligence Monitor</h1>
              {status && <StatusBadge status={status.overallStatus} />}
              {status?.running && (
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              AI monitors everything every 30 min · deep analysis every 6 hours · auto-persists across restarts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickCheckMutation.mutate()}
              disabled={quickCheckMutation.isPending}
              data-testid="button-trigger-quick"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${quickCheckMutation.isPending ? "animate-spin" : ""}`} />
              Quick Check
            </Button>
            <Button
              size="sm"
              onClick={() => deepAnalysisMutation.mutate()}
              disabled={deepAnalysisMutation.isPending}
              data-testid="button-trigger-deep"
            >
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              {deepAnalysisMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
            </Button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3" data-testid="card-active-alerts">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-2xl font-bold">
              {statusLoading ? "—" : status?.activeAlertCount ?? 0}
            </p>
            {status && status.activeAlertCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {status.criticalCount} critical · {status.warningCount} warning
              </p>
            )}
          </Card>

          <Card className="p-3" data-testid="card-quick-checks">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Quick Checks</span>
            </div>
            <p className="text-2xl font-bold">{status?.totalQuickChecks ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last: {timeAgo(status?.lastQuickCheck || null)}
            </p>
          </Card>

          <Card className="p-3" data-testid="card-deep-checks">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Reports</span>
            </div>
            <p className="text-2xl font-bold">{status?.totalDeepChecks ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last: {timeAgo(status?.lastDeepCheck || null)}
            </p>
          </Card>

          <Card className="p-3" data-testid="card-next-checks">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Next Checks</span>
            </div>
            <p className="text-sm font-semibold">Quick in {timeUntil(status?.nextQuickCheck || null)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              AI in {timeUntil(status?.nextDeepCheck || null)}
            </p>
          </Card>
        </div>

        {/* Latest AI Summary */}
        {status?.latestSummary && status.latestSummary.length > 0 && (
          <Card className="border-primary/20 bg-primary/5" data-testid="card-latest-summary">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Latest AI Summary</CardTitle>
                <span className="text-xs text-muted-foreground">{timeAgo(status.lastDeepCheck)}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1.5">
                {status.latestSummary.map((item, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {status.latestP1Tasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-red-500 mb-2">P1 — Needs Attention</p>
                  <div className="space-y-2">
                    {status.latestP1Tasks.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live Metrics */}
        {m && (
          <Card data-testid="card-live-metrics">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Live Metrics Snapshot</CardTitle>
                <span className="text-xs text-muted-foreground">{timeAgo(status?.lastQuickCheck || null)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div data-testid="metric-win-rate">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className={`text-lg font-bold ${m.winRate === null ? "text-muted-foreground" : m.winRate >= 52.4 ? "text-emerald-500" : m.winRate >= 48 ? "text-amber-500" : "text-red-500"}`}>
                    {m.winRate !== null ? `${m.winRate}%` : "N/A"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.settledPicks} picks settled</p>
                </div>

                <div data-testid="metric-odds-api">
                  <p className="text-xs text-muted-foreground mb-1">Odds API Remaining</p>
                  <p className={`text-lg font-bold ${m.oddsApiRemaining === null ? "text-muted-foreground" : m.oddsApiRemaining > 50000 ? "text-emerald-500" : m.oddsApiRemaining > 10000 ? "text-amber-500" : "text-red-500"}`}>
                    {m.oddsApiRemaining !== null ? m.oddsApiRemaining.toLocaleString() : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">{m.oddsApiStatus}</p>
                </div>

                <div data-testid="metric-guardian-health">
                  <p className="text-xs text-muted-foreground mb-1">System Health</p>
                  <p className={`text-lg font-bold ${m.guardianHealth >= 80 ? "text-emerald-500" : m.guardianHealth >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {m.guardianHealth}/100
                  </p>
                  <Progress value={m.guardianHealth} className="h-1 mt-1.5" />
                </div>

                <div data-testid="metric-cache">
                  <p className="text-xs text-muted-foreground mb-1">Cache Hit Rate</p>
                  <p className="text-lg font-bold">{m.cacheHitRate}%</p>
                  <Progress value={m.cacheHitRate} className="h-1 mt-1.5" />
                </div>

                <div data-testid="metric-memory">
                  <p className="text-xs text-muted-foreground mb-1">Memory (Heap)</p>
                  <p className={`text-lg font-bold ${heapPercent > 90 ? "text-red-500" : heapPercent > 75 ? "text-amber-500" : "text-foreground"}`}>
                    {m.heapUsedMb}MB
                  </p>
                  <p className="text-[10px] text-muted-foreground">{heapPercent}% of {m.heapTotalMb}MB</p>
                </div>

                <div data-testid="metric-ai-circuit">
                  <p className="text-xs text-muted-foreground mb-1">AI Circuit Breaker</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {m.aiCircuitOpen
                      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    }
                    <p className="text-sm font-medium">{m.aiCircuitOpen ? "Open" : "Closed (OK)"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Alerts / Reports */}
        <Tabs defaultValue="alerts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              Active Alerts
              {status && status.activeAlertCount > 0 && (
                <Badge
                  className={`ml-2 text-[10px] ${status.criticalCount > 0 ? "bg-red-500" : "bg-amber-500"}`}
                >
                  {status.activeAlertCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              AI Reports
              {reports.length > 0 && (
                <Badge variant="outline" className="ml-2 text-[10px]">{reports.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-3 mt-4">
            {alertsLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading alerts...</div>
            )}
            {!alertsLoading && alerts.length === 0 && (
              <div className="text-center py-12" data-testid="empty-alerts">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground">No active alerts detected. Next check in {timeUntil(status?.nextQuickCheck || null)}.</p>
              </div>
            )}
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveMutation.mutate(id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="reports" className="space-y-3 mt-4">
            {reportsLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading reports...</div>
            )}
            {!reportsLoading && reports.length === 0 && (
              <div className="text-center py-12" data-testid="empty-reports">
                <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No AI reports yet</p>
                <p className="text-xs text-muted-foreground">
                  First report generates automatically 12 minutes after server start, then every 6 hours.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => deepAnalysisMutation.mutate()}
                  disabled={deepAnalysisMutation.isPending}
                  data-testid="button-generate-first-report"
                >
                  <Brain className="h-3.5 w-3.5 mr-1.5" />
                  {deepAnalysisMutation.isPending ? "Generating..." : "Generate Now"}
                </Button>
              </div>
            )}
            {reports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Engine Info */}
        <Card className="border-border/30 bg-muted/10" data-testid="card-engine-info">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Quick checks (every 30 min)</span> — zero-cost lightweight scans: win rate, API budget, memory, system health, hub freshness, AI circuit breaker.</p>
                <p><span className="font-medium text-foreground">Deep analysis (every 6 hours)</span> — GPT-4o-mini reads the full platform snapshot and generates prioritized tasks, risk alerts, and an ops checklist.</p>
                <p><span className="font-medium text-foreground">Auto-persist</span> — all alerts and reports survive server restarts. Alerts auto-resolve when the underlying condition clears.</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
