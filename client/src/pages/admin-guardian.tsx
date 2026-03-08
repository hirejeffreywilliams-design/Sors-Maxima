import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSSEContext } from "@/context/sse-provider";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Shield, Activity, AlertTriangle, CheckCircle, XCircle,
  Server, Database, Cpu, MemoryStick, Clock, RefreshCw, Play, Square,
  Loader2, Heart, Zap, Eye, Brain, Wrench, Bell, TrendingUp,
  CircleDot, Wifi, WifiOff, ArrowUpRight, Wand2, Sparkles, Bot,
  ChevronDown, ChevronUp, Globe, Network, CheckCircle2, FlaskConical,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface PipelineService {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  detail: string;
  quota?: number;
}

interface QuickSolutionResult {
  healthScore: number;
  summary: string;
  issues: Array<{
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    service: string;
    title: string;
    detail: string;
    autoFixable: boolean;
    fixAction: string | null;
    recommendation: string;
  }>;
  appliedFixes: string[];
  fixErrors: string[];
  nextActions: string[];
  pipelineStatus: string;
  systemSnapshot: {
    hubRunning: boolean;
    oddsRemaining: number;
    heapPct: number;
    criticalErrors: number;
    totalPicksCached: number;
  };
  ranAt: string;
}

const SERVICE_ICONS: Record<string, any> = {
  database: Database,
  espn: Globe,
  balldontlie: Network,
  "odds-api": TrendingUp,
  openai: Bot,
  precomputed: FlaskConical,
  "api-football": Globe,
  stripe: Shield,
};

function PipelineServiceCard({ svc }: { svc: PipelineService }) {
  const Icon = SERVICE_ICONS[svc.id] || Server;
  const borderColor = svc.status === "healthy" ? "border-green-500/30" : svc.status === "degraded" ? "border-yellow-500/40" : "border-red-500/50";
  const statusColor = svc.status === "healthy" ? "text-green-500" : svc.status === "degraded" ? "text-yellow-500" : "text-red-500";
  const bg = svc.status === "healthy" ? "" : svc.status === "degraded" ? "bg-yellow-500/3" : "bg-red-500/5";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${borderColor} ${bg}`} data-testid={`pipeline-service-${svc.id}`}>
      <div className={`p-1.5 rounded-md ${svc.status === "healthy" ? "bg-green-500/10" : svc.status === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"}`}>
        <Icon className={`h-4 w-4 ${statusColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{svc.name}</span>
          <StatusDot status={svc.status} />
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{svc.detail}</p>
      </div>
      {svc.latencyMs > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{svc.latencyMs}ms</span>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    info: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return <Badge variant="outline" className={map[severity] || ""} data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
    unknown: "bg-gray-400",
  };
  return (
    <span className="relative flex h-3 w-3" data-testid={`dot-status-${status}`}>
      {status !== "healthy" && status !== "unknown" && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status] || colors.unknown}`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status] || colors.unknown}`} />
    </span>
  );
}

function HealthGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 90 ? "text-green-500" : score >= 70 ? "text-yellow-500" : score >= 50 ? "text-orange-500" : "text-red-500";
  const bgColor = score >= 90 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : score >= 50 ? "bg-orange-500" : "bg-red-500";
  const label = score >= 90 ? "Healthy" : score >= 70 ? "Fair" : score >= 50 ? "Degraded" : "Critical";

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <Progress value={score} className="h-2 w-20" />
        <span className={`text-sm font-medium ${color}`}>{score}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2" data-testid="health-gauge">
      <div className={`text-6xl font-bold ${color}`} data-testid="health-score">{score}</div>
      <Badge variant="outline" className={`${bgColor}/10 ${color} border-current`} data-testid="health-label">{label}</Badge>
      <Progress value={score} className="h-3 w-48 mt-2" />
    </div>
  );
}

function timeAgo(ts: string): string {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AdminGuardian() {
  useSEO({ title: "App Guardian", description: "Continuous monitoring, auto-healing, and AI diagnostics" });
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [qsResult, setQsResult] = useState<QuickSolutionResult | null>(null);
  const [qsExpanded, setQsExpanded] = useState(true);

  const sse = useSSEContext();

  useEffect(() => {
    if (sse.lastEvent?.type === "guardian-alert") {
      const a = sse.lastEvent.data;
      const severityColor = a.severity === "critical" ? "destructive" : "default";
      toast({
        title: `Guardian Alert: ${a.title}`,
        description: a.message,
        variant: severityColor as any,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
    }
  }, [sse.lastEvent, toast]);

  const { data: status, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/guardian/status"],
    refetchInterval: 15000,
  });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guardian/scan"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "Full scan complete" });
    },
  });

  const diagnoseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guardian/diagnose"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "AI diagnostics complete" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/guardian/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guardian/start"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "Guardian started" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guardian/stop"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "Guardian stopped" });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guardian/restart"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian/status"] });
      toast({ title: "Guardian restarted" });
    },
  });

  const { data: pipelineData, isLoading: pipelineLoading, refetch: refetchPipeline } = useQuery<{
    services: PipelineService[];
    overallStatus: string;
    healthy: number;
    total: number;
    checkedAt: string;
  }>({
    queryKey: ["/api/admin/pipeline-services"],
    refetchInterval: 30000,
  });

  const quickSolutionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/quick-solution").then(r => r.json()),
    onSuccess: (data: QuickSolutionResult) => {
      setQsResult(data);
      setQsExpanded(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline-services"] });
      const fixCount = data.appliedFixes?.length || 0;
      toast({
        title: fixCount > 0 ? `Quick Solution: ${fixCount} fix${fixCount > 1 ? "es" : ""} applied` : "Quick Solution complete",
        description: data.summary,
      });
    },
    onError: () => toast({ title: "Quick Solution failed", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = status || {};
  const vitals = s.vitals || {};
  const services = s.services || [];
  const alerts = s.activeAlerts || [];
  const incidents = s.recentIncidents || [];
  const diagnostics = s.aiDiagnostics || [];

  const criticalCount = alerts.filter((a: any) => a.severity === "critical").length;
  const highCount = alerts.filter((a: any) => a.severity === "high").length;
  const healthyCount = services.filter((sv: any) => sv.status === "healthy").length;
  const downCount = services.filter((sv: any) => sv.status === "down").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Shield className="h-5 w-5 text-emerald-500" />
            <div>
              <h1 className="text-lg font-bold" data-testid="title-guardian">App Guardian</h1>
              <p className="text-xs text-muted-foreground">Continuous monitoring, auto-healing & AI diagnostics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={s.isRunning ? "default" : "destructive"} data-testid="badge-running">
              {s.isRunning ? "Active" : "Stopped"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending} data-testid="button-scan">
              {scanMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Scan</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => diagnoseMutation.mutate()}
              disabled={diagnoseMutation.isPending} data-testid="button-diagnose">
              {diagnoseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
              <span className="ml-1">AI Diagnose</span>
            </Button>
            {s.isRunning ? (
              <Button size="sm" variant="destructive" onClick={() => stopMutation.mutate()} data-testid="button-stop">
                <Square className="h-3 w-3 mr-1" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => startMutation.mutate()} data-testid="button-start">
                <Play className="h-3 w-3 mr-1" /> Start
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1" data-testid="card-health-score">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <HealthGauge score={s.healthScore || 0} />
            </CardContent>
          </Card>

          <Card data-testid="card-vitals-memory">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MemoryStick className="h-4 w-4 text-blue-500" /> Memory
              </div>
              <div className="text-2xl font-bold">{vitals.memoryUsage?.percent || 0}%</div>
              <div className="text-xs text-muted-foreground">
                {vitals.memoryUsage?.used || 0}MB / {vitals.memoryUsage?.total || 0}MB
              </div>
              <Progress value={vitals.memoryUsage?.percent || 0} className="h-2" />
            </CardContent>
          </Card>

          <Card data-testid="card-vitals-uptime">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-green-500" /> Uptime
              </div>
              <div className="text-2xl font-bold">{vitals.uptimeFormatted || "0h 0m"}</div>
              <div className="text-xs text-muted-foreground">
                Node {vitals.nodeVersion || "N/A"}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Activity className="h-3 w-3" />
                <span>{s.checksPerformed || 0} checks performed</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-vitals-errors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Error Rate
              </div>
              <div className="text-2xl font-bold">{vitals.errorRate || 0} <span className="text-sm font-normal text-muted-foreground">/ 5 min</span></div>
              <div className="text-xs text-muted-foreground">
                Avg response: {vitals.avgResponseTime || 0}ms
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Wrench className="h-3 w-3" />
                <span>{s.autoHealActions || 0} auto-heal actions</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Solution Panel */}
        <Card className="border-violet-500/30 bg-violet-500/5" data-testid="card-quick-solution">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                  <Wand2 className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Quick Solution</h3>
                    <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">AI-Powered</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deep-scans all pipeline services, diagnoses issues, and applies available auto-fixes in one click
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {qsResult && (
                  <Button size="sm" variant="ghost" onClick={() => setQsExpanded(v => !v)} data-testid="button-qs-toggle">
                    {qsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => quickSolutionMutation.mutate()}
                  disabled={quickSolutionMutation.isPending}
                  data-testid="button-quick-solution"
                >
                  {quickSolutionMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Run Quick Solution
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Loading state */}
            {quickSolutionMutation.isPending && (
              <div className="mt-4 space-y-2" data-testid="qs-scanning">
                {["Connecting to all pipeline services...", "Analyzing error patterns...", "Running AI diagnosis...", "Evaluating auto-fix options..."].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-violet-400 shrink-0" />
                    {step}
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {qsResult && qsExpanded && !quickSolutionMutation.isPending && (
              <div className="mt-4 space-y-4" data-testid="qs-results">
                <Separator className="opacity-30" />
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <HealthGauge score={qsResult.healthScore} size="sm" />
                    <span className="text-xs text-muted-foreground">Pipeline Health</span>
                  </div>
                  <Badge variant="outline" className={
                    qsResult.pipelineStatus === "healthy" ? "border-green-500/30 text-green-500" :
                    qsResult.pipelineStatus === "degraded" ? "border-yellow-500/30 text-yellow-500" :
                    "border-red-500/30 text-red-500"
                  } data-testid="qs-pipeline-status">
                    {qsResult.pipelineStatus}
                  </Badge>
                  <p className="text-sm text-muted-foreground flex-1">{qsResult.summary}</p>
                </div>

                {/* Applied fixes */}
                {qsResult.appliedFixes?.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/8 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-semibold text-green-400">{qsResult.appliedFixes.length} Auto-Fix{qsResult.appliedFixes.length > 1 ? "es" : ""} Applied</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {qsResult.appliedFixes.map((fix, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-green-500/30 text-green-400 font-mono" data-testid={`qs-fix-${i}`}>
                          {fix.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {qsResult.issues?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detected Issues</h4>
                    {qsResult.issues.map((issue) => (
                      <div key={issue.id}
                        className={`p-3 rounded-lg border text-sm ${
                          issue.severity === "critical" ? "border-red-500/40 bg-red-500/5" :
                          issue.severity === "high" ? "border-orange-500/40 bg-orange-500/5" :
                          issue.severity === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                          "border-border"
                        }`}
                        data-testid={`qs-issue-${issue.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <SeverityBadge severity={issue.severity} />
                              <Badge variant="outline" className="text-[10px]">{issue.service}</Badge>
                              <span className="font-medium text-sm">{issue.title}</span>
                              {issue.autoFixable && (
                                <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">
                                  <Wand2 className="h-2 w-2 mr-1" /> Auto-fixed
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{issue.detail}</p>
                            <p className="text-xs text-foreground/70 mt-0.5 italic">{issue.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Next Actions */}
                {qsResult.nextActions?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended Next Steps</h4>
                    {qsResult.nextActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground" data-testid={`qs-action-${i}`}>
                        <ArrowUpRight className="h-3 w-3 mt-0.5 text-violet-400 shrink-0" />
                        {action}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground text-right">
                  Ran {timeAgo(qsResult.ranAt)} · hub:{qsResult.systemSnapshot?.hubRunning ? "running" : "stopped"} · {qsResult.systemSnapshot?.totalPicksCached} picks cached · heap:{qsResult.systemSnapshot?.heapPct}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="tabs-guardian">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Server className="h-3 w-3 mr-1" /> Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline">
              <Network className="h-3 w-3 mr-1" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              <Bell className="h-3 w-3 mr-1" /> Alerts ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="incidents" data-testid="tab-incidents">
              <Zap className="h-3 w-3 mr-1" /> Incidents ({incidents.length})
            </TabsTrigger>
            <TabsTrigger value="diagnostics" data-testid="tab-diagnostics">
              <Brain className="h-3 w-3 mr-1" /> AI Diagnostics ({diagnostics.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4" /> Service Health Grid
                </CardTitle>
                <CardDescription>
                  {healthyCount}/{services.length} services healthy
                  {downCount > 0 && <span className="text-red-500 ml-2">{downCount} down</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No service checks yet. Run a scan to populate.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.map((svc: any, i: number) => (
                      <Card key={i} className={`border ${svc.status === "down" ? "border-red-500/50" : svc.status === "degraded" ? "border-yellow-500/50" : "border-green-500/20"}`}
                        data-testid={`card-service-${svc.name?.toLowerCase().replace(/\s/g, "-")}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StatusDot status={svc.status} />
                              <span className="font-medium text-sm">{svc.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{svc.status}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide">Response</span>
                              <span className="font-mono">{svc.responseTime || 0}ms</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide">Success</span>
                              <span className="font-mono">{svc.successRate || 0}%</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide">Errors</span>
                              <span className="font-mono">{svc.errorCount || 0}</span>
                            </div>
                          </div>
                          {svc.details && (
                            <p className="text-xs text-red-400 mt-2 truncate">{svc.details}</p>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Checked: {timeAgo(svc.lastCheck)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-violet-400" /> Intelligence Pipeline Services
                    </CardTitle>
                    <CardDescription>
                      {pipelineData ? (
                        <>
                          {pipelineData.healthy}/{pipelineData.total} services healthy
                          {" · "}
                          <span className={
                            pipelineData.overallStatus === "healthy" ? "text-green-500" :
                            pipelineData.overallStatus === "degraded" ? "text-yellow-500" : "text-red-500"
                          }>
                            {pipelineData.overallStatus}
                          </span>
                          {pipelineData.checkedAt && <span className="text-muted-foreground ml-1">· checked {timeAgo(pipelineData.checkedAt)}</span>}
                        </>
                      ) : "Live status of all external data integrations and internal engines"}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => refetchPipeline()} data-testid="button-refresh-pipeline">
                    {pipelineLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pipelineLoading && !pipelineData ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Checking all services...</span>
                  </div>
                ) : pipelineData?.services?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="pipeline-services-grid">
                    {pipelineData.services.map((svc) => (
                      <PipelineServiceCard key={svc.id} svc={svc} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click refresh to check pipeline services</p>
                  </div>
                )}

                {/* System snapshot from last Quick Solution */}
                {qsResult?.systemSnapshot && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Last Quick Solution Snapshot</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Hub", value: qsResult.systemSnapshot.hubRunning ? "Running" : "Stopped", ok: qsResult.systemSnapshot.hubRunning },
                        { label: "Odds Quota", value: qsResult.systemSnapshot.oddsRemaining >= 0 ? `${qsResult.systemSnapshot.oddsRemaining} left` : "unknown", ok: qsResult.systemSnapshot.oddsRemaining > 100 },
                        { label: "Heap", value: `${qsResult.systemSnapshot.heapPct}%`, ok: qsResult.systemSnapshot.heapPct < 80 },
                        { label: "Critical Errors", value: String(qsResult.systemSnapshot.criticalErrors), ok: qsResult.systemSnapshot.criticalErrors === 0 },
                        { label: "Picks Cached", value: String(qsResult.systemSnapshot.totalPicksCached), ok: qsResult.systemSnapshot.totalPicksCached > 0 },
                      ].map((metric) => (
                        <div key={metric.label} className={`p-2 rounded-lg border text-center ${metric.ok ? "border-green-500/20 bg-green-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                          <div className={`text-sm font-bold ${metric.ok ? "text-green-400" : "text-yellow-400"}`}>{metric.value}</div>
                          <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">Snapshot from {timeAgo(qsResult.ranAt)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Active Alerts
                </CardTitle>
                <CardDescription>
                  {criticalCount > 0 && <span className="text-red-500 mr-2">{criticalCount} critical</span>}
                  {highCount > 0 && <span className="text-orange-500 mr-2">{highCount} high</span>}
                  {alerts.length === 0 && "All clear — no active alerts"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No active alerts. System is operating normally.</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {alerts.map((alert: any) => (
                        <div key={alert.id}
                          className={`p-3 rounded-lg border ${alert.severity === "critical" ? "border-red-500/40 bg-red-500/5" : alert.severity === "high" ? "border-orange-500/40 bg-orange-500/5" : "border-border"}`}
                          data-testid={`alert-${alert.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              {alert.severity === "critical" ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> :
                                alert.severity === "high" ? <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" /> :
                                  <CircleDot className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                              <div>
                                <div className="font-medium text-sm">{alert.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <SeverityBadge severity={alert.severity} />
                                  <Badge variant="outline" className="text-[10px]">{alert.category}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{timeAgo(alert.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs shrink-0"
                              onClick={() => acknowledgeMutation.mutate(alert.id)}
                              data-testid={`button-ack-${alert.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Ack
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Incident History
                </CardTitle>
                <CardDescription>
                  {incidents.filter((i: any) => !i.resolvedAt).length} active,{" "}
                  {incidents.filter((i: any) => i.autoHealed).length} auto-healed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No incidents recorded. Your app is running smoothly.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Incident</TableHead>
                        <TableHead>Affected</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((inc: any) => (
                        <TableRow key={inc.id} data-testid={`row-incident-${inc.id}`}>
                          <TableCell><SeverityBadge severity={inc.severity} /></TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{inc.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{inc.description}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(inc.affectedServices || []).map((svc: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px]">{svc}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {inc.resolvedAt ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                {inc.autoHealed ? "Auto-healed" : "Resolved"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {inc.duration ? `${Math.round(inc.duration / 1000)}s` : "ongoing"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(inc.startedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4" /> AI Diagnostics
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of system health and recommended actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No diagnostics yet. Click "AI Diagnose" to run analysis.</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {diagnostics.map((diag: any) => (
                        <div key={diag.id} className="p-3 rounded-lg border" data-testid={`diag-${diag.id}`}>
                          <div className="flex items-start gap-2">
                            {diag.fixApplied ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            ) : diag.autoFixable ? (
                              <Wrench className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            ) : (
                              <Eye className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <SeverityBadge severity={diag.severity} />
                                <Badge variant="outline" className="text-[10px]">{diag.category}</Badge>
                                {diag.fixApplied && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">Fix Applied</Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(diag.timestamp)}</span>
                              </div>
                              <div className="text-sm font-medium">{diag.finding}</div>
                              <div className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">
                                <span className="font-medium">Recommendation:</span> {diag.recommendation}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card data-testid="card-guardian-summary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Last full scan: {s.lastFullScan ? timeAgo(s.lastFullScan) : "never"}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Checks: {s.checksPerformed || 0}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Auto-heals: {s.autoHealActions || 0}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => restartMutation.mutate()}
                disabled={restartMutation.isPending} data-testid="button-restart-guardian">
                <RefreshCw className="h-3 w-3 mr-1" /> Restart Guardian
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
