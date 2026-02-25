import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Brain, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Database, Eye, Filter, FlaskConical, Gauge, GitBranch, Layers, LineChart,
  Lock, Play, RefreshCw, Search, Shield, Sparkles, Target, TrendingUp, XCircle, Zap
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface PipelineStage {
  name: string;
  module: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  startTime: string | null;
  endTime: string | null;
  durationMs: number | null;
  inputCount: number;
  outputCount: number;
  checksRun: number;
  checksPassed: number;
  errors: string[];
  metadata: Record<string, any>;
}

interface PipelineRun {
  runId: string;
  traceId: string;
  status: "running" | "completed" | "failed" | "partial";
  stages: PipelineStage[];
  startTime: string;
  endTime: string | null;
  inputSummary: { sport: string; records: number; riskLevel: string };
  outputSummary: { candidatesGenerated: number; candidatesSelected: number; rejected: number; reviewRequired: number } | null;
  metrics: Record<string, any>;
  alerts: any[];
}

interface PipelineHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  totalRuns: number;
  successRate: number;
  avgLatencyMs: number;
  activeAlerts: number;
  metrics: Record<string, any>;
  moduleHealth: { module: string; status: string; lastRunMs: number }[];
}

const STAGE_ICONS: Record<string, any> = {
  "Data Ingestor": Database,
  "Feature Engineer": FlaskConical,
  "Predictor": Brain,
  "Diversity Module": GitBranch,
  "Optimizer": Target,
  "Risk Guard": Shield,
  "Verifier": CheckCircle2,
  "Delivery": Zap,
  "Feedback Collector": BarChart3,
  "Evaluator": LineChart,
  "Monitor": Gauge,
  "Why This Pick": Eye,
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  running: "text-blue-500",
  pending: "text-muted-foreground",
  skipped: "text-yellow-500",
};

const STATUS_BG: Record<string, string> = {
  success: "bg-emerald-500/10 border-emerald-500/20",
  failed: "bg-red-500/10 border-red-500/20",
  running: "bg-blue-500/10 border-blue-500/20",
  pending: "bg-muted/50 border-border",
  skipped: "bg-yellow-500/10 border-yellow-500/20",
};

export default function PipelineIntelligence() {
  useSEO({ title: "Pipeline Intelligence", description: "Data pipeline monitoring and intelligence" });
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState("NBA");
  const [riskLevel, setRiskLevel] = useState("moderate");
  const [bankroll, setBankroll] = useState("1000");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const { data: health, isLoading: healthLoading } = useQuery<PipelineHealth>({
    queryKey: ["/api/pipeline/health"],
    refetchInterval: 10000,
  });

  const { data: runs, isLoading: runsLoading } = useQuery<PipelineRun[]>({
    queryKey: ["/api/pipeline/runs"],
    refetchInterval: 5000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<any[]>({
    queryKey: ["/api/pipeline/alerts"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/pipeline/config"],
  });

  const { data: dataStoreStats, isLoading: dataStoreLoading } = useQuery<any>({
    queryKey: ["/api/pipeline/data-store/stats"],
  });

  const runMutation = useMutation({
    mutationFn: async (params: { sport: string; riskLevel: string; bankroll: number }) => {
      const res = await apiRequest("POST", "/api/pipeline/run", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/data-store/stats"] });
    },
  });

  const handleRunPipeline = () => {
    runMutation.mutate({
      sport: selectedSport,
      riskLevel,
      bankroll: parseFloat(bankroll) || 1000,
    });
  };

  const latestRun = runs?.[0];
  const activeAlerts = alerts?.filter((a: any) => !a.acknowledged) || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, count: activeAlerts.length },
    { id: "runs", label: "History", icon: Clock },
  ];

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6" data-testid="pipeline-intelligence-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-pipeline">
            Prediction Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Advanced 12-module prediction engine with continuous learning
          </p>
        </div>

        <div className="flex items-center gap-2">
          {health && (
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-1 ${
                health.status === "healthy" ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" :
                health.status === "degraded" ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" :
                "border-red-500/30 text-red-500 bg-red-500/5"
              }`}
              data-testid="pipeline-health-badge"
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                health.status === "healthy" ? "bg-emerald-500" :
                health.status === "degraded" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              {health.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0 border-b -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && healthLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border bg-card animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 w-16 bg-muted rounded mb-2" />
                  <div className="h-7 w-12 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "overview" && !healthLoading && (
        <div className="space-y-6">
          <Card className="border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Run Pipeline
              </CardTitle>
              <CardDescription className="text-xs">
                Execute the full 12-stage prediction pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-sport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 sm:max-w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(e.target.value)}
                    className="pl-7"
                    placeholder="Bankroll"
                    data-testid="input-bankroll"
                  />
                </div>

                <Button
                  onClick={handleRunPipeline}
                  disabled={runMutation.isPending}
                  className="gap-2"
                  data-testid="button-run-pipeline"
                >
                  {runMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {runMutation.isPending ? "Running..." : "Execute Pipeline"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-runs">{health?.totalRuns || 0}</p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-success-rate">
                  {health ? `${(health.successRate * 100).toFixed(1)}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-avg-latency">
                  {health ? `${health.avgLatencyMs}ms` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className={`text-2xl font-bold mt-1 ${activeAlerts.length > 0 ? "text-red-500" : ""}`} data-testid="stat-active-alerts">
                  {activeAlerts.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {latestRun && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Latest Pipeline Run
                  </CardTitle>
                  <Badge variant="outline" className={`text-xs ${
                    latestRun.status === "completed" ? "border-emerald-500/30 text-emerald-500" :
                    latestRun.status === "failed" ? "border-red-500/30 text-red-500" :
                    latestRun.status === "partial" ? "border-yellow-500/30 text-yellow-500" :
                    "border-blue-500/30 text-blue-500"
                  }`}>
                    {latestRun.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {latestRun.inputSummary.sport} &middot; {latestRun.inputSummary.riskLevel} &middot; Run ID: {latestRun.traceId.slice(0, 12)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {latestRun.stages.map((stage, idx) => {
                    const Icon = STAGE_ICONS[stage.name] || Activity;
                    return (
                      <div
                        key={stage.name}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${STATUS_BG[stage.status]}`}
                        data-testid={`stage-${stage.module}`}
                      >
                        <Icon className={`h-4 w-4 ${STATUS_COLORS[stage.status]}`} />
                        <span className="text-[10px] font-medium leading-tight">{stage.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {stage.durationMs !== null ? `${stage.durationMs}ms` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {latestRun.outputSummary && (
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <span>Generated: <strong className="text-foreground">{latestRun.outputSummary.candidatesGenerated}</strong></span>
                    <ArrowRight className="h-3 w-3" />
                    <span>Selected: <strong className="text-emerald-500">{latestRun.outputSummary.candidatesSelected}</strong></span>
                    <span>Rejected: <strong className="text-red-500">{latestRun.outputSummary.rejected}</strong></span>
                    {latestRun.outputSummary.reviewRequired > 0 && (
                      <span>Review: <strong className="text-yellow-500">{latestRun.outputSummary.reviewRequired}</strong></span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {health && health.moduleHealth && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  Module Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {health.moduleHealth.map((mod) => {
                    const Icon = STAGE_ICONS[mod.module] || Activity;
                    const statusColor = STATUS_COLORS[mod.status] || "text-muted-foreground";
                    return (
                      <div key={mod.module} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${statusColor}`} />
                          <span className="text-sm">{mod.module}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{mod.lastRunMs}ms</span>
                          <Badge variant="outline" className={`text-[10px] py-0 ${
                            mod.status === "success" ? "border-emerald-500/30 text-emerald-500" :
                            mod.status === "failed" ? "border-red-500/30 text-red-500" :
                            "border-muted"
                          }`}>
                            {mod.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "pipeline" && latestRun && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Pipeline flow for run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{latestRun.runId}</code></span>
          </div>

          {latestRun.stages.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.name] || Activity;
            const isExpanded = expandedStage === stage.name;
            return (
              <div key={stage.name}>
                <Card
                  className={`border cursor-pointer transition-colors ${STATUS_BG[stage.status]} hover:bg-accent/5`}
                  onClick={() => setExpandedStage(isExpanded ? null : stage.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          stage.status === "success" ? "bg-emerald-500/15" :
                          stage.status === "failed" ? "bg-red-500/15" :
                          stage.status === "running" ? "bg-blue-500/15" : "bg-muted"
                        }`}>
                          <Icon className={`h-4 w-4 ${STATUS_COLORS[stage.status]}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{stage.name}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{stage.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>In: {stage.inputCount}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>Out: {stage.outputCount}</span>
                            <span>&middot; Checks: {stage.checksPassed}/{stage.checksRun}</span>
                            {stage.durationMs !== null && <span>&middot; {stage.durationMs}ms</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.checksRun > 0 && (
                          <div className="w-16">
                            <Progress
                              value={stage.checksRun > 0 ? (stage.checksPassed / stage.checksRun) * 100 : 0}
                              className="h-1.5"
                            />
                          </div>
                        )}
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t space-y-2">
                        {stage.errors.length > 0 && (
                          <div className="space-y-1">
                            {stage.errors.map((err, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-red-500">
                                <XCircle className="h-3 w-3 shrink-0" />
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                        {Object.keys(stage.metadata).length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Details</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(stage.metadata).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}: </span>
                                  <span className="font-medium">
                                    {typeof value === "object" ? JSON.stringify(value).slice(0, 50) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {idx < latestRun.stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-4 ${stage.status === "success" ? "bg-emerald-500/30" : "bg-border"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "pipeline" && !latestRun && (
        <Card className="border bg-card">
          <CardContent className="p-8 text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No pipeline runs yet. Execute a run to see the flow.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "metrics" && (
        <div className="space-y-4">
          {health?.metrics && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Win Rate", value: health.metrics.winRate, format: "pct", good: (v: number) => v > 0.48 },
                  { label: "ROI", value: health.metrics.roi, format: "pct", good: (v: number) => v > 0 },
                  { label: "Calibration", value: health.metrics.calibration, format: "pct", good: (v: number) => v > 0.9 },
                  { label: "Precision", value: health.metrics.precision, format: "pct", good: (v: number) => v > 0.5 },
                  { label: "Prediction Accuracy", value: health.metrics.brierScore, format: "dec", good: (v: number) => v < 0.25 },
                  { label: "Error Rate", value: health.metrics.logLoss, format: "dec", good: (v: number) => v < 0.69 },
                  { label: "Market Shift", value: health.metrics.conceptDrift, format: "pct", good: (v: number) => v < 0.15 },
                  { label: "Model Speed", value: health.metrics.modelLatency, format: "ms", good: (v: number) => v < 500 },
                ].map((metric) => (
                  <Card key={metric.label} className="border bg-card">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className={`text-xl font-bold mt-1 ${
                        metric.value !== undefined && metric.good(metric.value) ? "text-emerald-500" : "text-foreground"
                      }`}>
                        {metric.value !== undefined ? (
                          metric.format === "pct" ? `${(metric.value * 100).toFixed(1)}%` :
                          metric.format === "ms" ? `${Math.round(metric.value)}ms` :
                          metric.value.toFixed(4)
                        ) : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {health.metrics.retrainingTriggered && (
                <Card className="border border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Retraining Triggered</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {health.metrics.retrainingReason || "Performance degradation detected. Model retraining recommended."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {dataStoreStats && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Canonical Data Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <p className="text-lg font-bold">{dataStoreStats.totalRecords}</p>
                    <p className="text-[10px] text-muted-foreground">Total Records</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/5">
                    <p className="text-lg font-bold text-emerald-500">{dataStoreStats.accepted}</p>
                    <p className="text-[10px] text-muted-foreground">Accepted</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-500/5">
                    <p className="text-lg font-bold text-red-500">{dataStoreStats.rejected}</p>
                    <p className="text-[10px] text-muted-foreground">Rejected</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-yellow-500/5">
                    <p className="text-lg font-bold text-yellow-500">{dataStoreStats.quarantined}</p>
                    <p className="text-[10px] text-muted-foreground">Quarantined</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/5">
                    <p className="text-lg font-bold text-blue-500">{(dataStoreStats.avgQuality * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {config && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Pipeline Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {Object.entries(config).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="font-medium text-xs">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-3">
          {activeAlerts.length === 0 && (
            <Card className="border bg-card">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500/50 mb-3" />
                <p className="text-sm text-muted-foreground">No active alerts. All systems operating normally.</p>
              </CardContent>
            </Card>
          )}

          {(alerts || []).map((alert: any) => (
            <Card
              key={alert.alertId}
              className={`border ${
                alert.acknowledged ? "opacity-60" : ""
              } ${
                alert.severity === "critical" ? "border-red-500/30 bg-red-500/5" :
                alert.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-blue-500/30 bg-blue-500/5"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.remediation}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(alert.timestamp).toLocaleString()} &middot; Rule: {alert.ruleId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] py-0 ${
                      alert.severity === "critical" ? "border-red-500/30 text-red-500" :
                      alert.severity === "warning" ? "border-yellow-500/30 text-yellow-500" :
                      "border-blue-500/30 text-blue-500"
                    }`}>
                      {alert.severity}
                    </Badge>
                    {alert.acknowledged && (
                      <Badge variant="outline" className="text-[10px] py-0">ACK</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "runs" && (
        <div className="space-y-3">
          {(!runs || runs.length === 0) && (
            <Card className="border bg-card">
              <CardContent className="p-8 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No pipeline runs yet.</p>
              </CardContent>
            </Card>
          )}

          {(runs || []).map((run: PipelineRun) => {
            const isExpanded = expandedRun === run.runId;
            const successStages = run.stages.filter(s => s.status === "success").length;
            const totalStages = run.stages.length;
            const duration = run.endTime
              ? new Date(run.endTime).getTime() - new Date(run.startTime).getTime()
              : null;

            return (
              <Card
                key={run.runId}
                className="border bg-card cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setExpandedRun(isExpanded ? null : run.runId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === "completed" ? "bg-emerald-500" :
                        run.status === "failed" ? "bg-red-500" :
                        run.status === "partial" ? "bg-yellow-500" : "bg-blue-500"
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{run.inputSummary.sport}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{run.inputSummary.riskLevel}</Badge>
                          <Badge variant="outline" className={`text-[10px] py-0 ${
                            run.status === "completed" ? "border-emerald-500/30 text-emerald-500" :
                            run.status === "failed" ? "border-red-500/30 text-red-500" :
                            "border-yellow-500/30 text-yellow-500"
                          }`}>
                            {run.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(run.startTime).toLocaleString()} &middot; {successStages}/{totalStages} stages &middot;
                          {duration !== null ? ` ${duration}ms` : " running..."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {run.outputSummary && (
                        <span className="text-xs text-muted-foreground">
                          {run.outputSummary.candidatesSelected} selected
                        </span>
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="grid grid-cols-6 gap-1.5">
                        {run.stages.map((stage) => {
                          const Icon = STAGE_ICONS[stage.name] || Activity;
                          return (
                            <div
                              key={stage.name}
                              className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-center ${STATUS_BG[stage.status]}`}
                            >
                              <Icon className={`h-3 w-3 ${STATUS_COLORS[stage.status]}`} />
                              <span className="text-[8px] leading-tight">{stage.name.split(" ")[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span>Run ID: <code className="bg-muted px-1 rounded">{run.traceId.slice(0, 16)}</code></span>
                        {run.alerts.length > 0 && (
                          <span className="text-yellow-500">{run.alerts.length} alert(s)</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
