import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Activity, Cpu, Clock, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Database, Zap, Timer, BarChart3,
  Server, Globe, TrendingUp,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { apiRequest } from "@/lib/queryClient";

interface CacheEntry {
  hasPicks: boolean;
  pickCount: number;
  dataSource: string;
  age: string;
  generatedAt: string;
}

interface EngineStatus {
  running: boolean;
  lastRunTime: string | null;
  lastCycleDurationMs: number | null;
  totalRuns: number;
  failedRuns: number;
  currentIntervalMs: number;
  nextRunTime: string | null;
  nextRunInMs: number | null;
  cacheStatus: Record<string, CacheEntry>;
  intervalLabel: string;
}

interface MemoryStatus {
  heapUsedMb: number;
  heapTotalMb: number;
  heapLimitMb: number;
  heapUsedPct: number;
  rssMb: number;
  externalMb: number;
  status: "healthy" | "warning" | "critical";
}

interface SystemHealth {
  timestamp: string;
  uptime: number;
  memory: MemoryStatus;
  engine: EngineStatus;
  oddsApiRemaining: number | null;
  nodeVersion: string;
  platform: string;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function timeUntil(ms: number | null): string {
  if (ms === null) return "Unknown";
  const s = Math.floor(ms / 1000);
  if (s <= 0) return "Now";
  if (s < 60) return `in ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `in ${m}m ${s % 60}s`;
  return `in ${Math.floor(m / 60)}h ${m % 60}m`;
}

function MemoryBar({ pct, status }: { pct: number; status: string }) {
  const color = status === "critical"
    ? "bg-red-500"
    : status === "warning"
    ? "bg-yellow-500"
    : "bg-emerald-500";
  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden" data-testid="bar-memory">
      <div
        className={`h-3 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function StatusIcon({ status }: { status: "healthy" | "warning" | "critical" | string }) {
  if (status === "healthy")  return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "warning")  return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    healthy:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning:  "bg-yellow-500/10  text-yellow-400  border-yellow-500/20",
    critical: "bg-red-500/10     text-red-400     border-red-500/20",
    running:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    stopped:  "bg-red-500/10     text-red-400     border-red-500/20",
  };
  return (
    <Badge variant="outline" className={map[status] || "bg-muted text-muted-foreground"} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

export default function AdminSystemHealth() {
  useSEO({ title: "System Health — Admin | Sors Maxima", description: "Live memory, engine, and cache health dashboard" });

  const [secondsLeft, setSecondsLeft] = useState(30);

  const { data: health, isLoading, refetch, dataUpdatedAt } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/system-health"],
    queryFn: () => apiRequest("GET", "/api/admin/system-health").then(r => r.json()),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  // Countdown timer
  useEffect(() => {
    setSecondsLeft(30);
    const t = setInterval(() => setSecondsLeft(n => (n <= 1 ? 30 : n - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  const sports = health ? Object.entries(health.engine.cacheStatus) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-system-health">
                <Activity className="w-6 h-6 text-primary" />
                System Health
              </h1>
              <p className="text-sm text-muted-foreground">
                Live memory, engine cycle, and cache status — refreshes every 30s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground" data-testid="text-refresh-countdown">
              Next refresh in {secondsLeft}s
            </span>
            <Button variant="outline" size="sm" onClick={() => { refetch(); setSecondsLeft(30); }} data-testid="button-refresh-health">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        {/* Uptime & Node row */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card data-testid="card-uptime">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Timer className="w-3 h-3" />Uptime</div>
                <div className="text-2xl font-bold" data-testid="value-uptime">{formatUptime(health.uptime)}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-node-version">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Server className="w-3 h-3" />Node</div>
                <div className="text-2xl font-bold" data-testid="value-node-version">{health.nodeVersion}</div>
                <div className="text-xs text-muted-foreground">{health.platform}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-runs">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="w-3 h-3" />Engine Cycles</div>
                <div className="text-2xl font-bold" data-testid="value-total-runs">{health.engine.totalRuns}</div>
                <div className="text-xs text-muted-foreground">{health.engine.failedRuns} failed</div>
              </CardContent>
            </Card>
            <Card data-testid="card-odds-quota">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Globe className="w-3 h-3" />Odds API Quota</div>
                <div className="text-2xl font-bold" data-testid="value-odds-remaining">
                  {health.oddsApiRemaining !== null ? health.oddsApiRemaining.toLocaleString() : "—"}
                </div>
                <div className="text-xs text-muted-foreground">requests remaining</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Memory */}
        <Card data-testid="card-memory">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Memory Usage
              {health && <StatusBadge status={health.memory.status} />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <Skeleton className="h-12 w-full" /> : health && (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Heap Used</span>
                    <span className="font-mono font-bold" data-testid="value-heap-used">
                      {health.memory.heapUsedMb} MB / {health.memory.heapLimitMb} MB
                      <span className="ml-2 text-muted-foreground">({health.memory.heapUsedPct}%)</span>
                    </span>
                  </div>
                  <MemoryBar pct={health.memory.heapUsedPct} status={health.memory.status} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0 MB</span>
                    <span className={health.memory.heapUsedPct >= 85 ? "text-red-400" : health.memory.heapUsedPct >= 70 ? "text-yellow-400" : "text-emerald-400"}>
                      {health.memory.heapUsedPct >= 85 ? "Critical — restart may help" : health.memory.heapUsedPct >= 70 ? "Elevated — watch closely" : "Healthy"}
                    </span>
                    <span>{health.memory.heapLimitMb} MB limit</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
                  {[
                    { label: "Heap Allocated", value: `${health.memory.heapTotalMb} MB`, testId: "value-heap-total" },
                    { label: "RSS (Process)", value: `${health.memory.rssMb} MB`, testId: "value-rss" },
                    { label: "External C++", value: `${health.memory.externalMb} MB`, testId: "value-external" },
                    { label: "Heap Limit", value: `${health.memory.heapLimitMb} MB`, testId: "value-heap-limit" },
                  ].map(item => (
                    <div key={item.label} className="text-center p-2 rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                      <div className="font-mono text-sm font-semibold" data-testid={item.testId}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Engine Status */}
        <Card data-testid="card-engine">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Prediction Engine
              {health && (
                <Badge
                  variant="outline"
                  className={health.engine.running ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}
                  data-testid="badge-engine-status"
                >
                  {health.engine.running ? "Running" : "Stopped"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-24 w-full" /> : health && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/40" data-testid="card-last-run">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Last Cycle</div>
                  <div className="font-semibold" data-testid="value-last-run">{timeAgo(health.engine.lastRunTime)}</div>
                  {health.engine.lastCycleDurationMs && (
                    <div className="text-xs text-muted-foreground mt-0.5">took {formatDuration(health.engine.lastCycleDurationMs)}</div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/40" data-testid="card-next-run">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Next Cycle</div>
                  <div className="font-semibold" data-testid="value-next-run">{timeUntil(health.engine.nextRunInMs)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{health.engine.intervalLabel}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40" data-testid="card-run-stats">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" />Success Rate</div>
                  <div className="font-semibold" data-testid="value-success-rate">
                    {health.engine.totalRuns > 0
                      ? `${Math.round(((health.engine.totalRuns - health.engine.failedRuns) / health.engine.totalRuns) * 100)}%`
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {health.engine.totalRuns - health.engine.failedRuns} / {health.engine.totalRuns} cycles
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-Sport Cache Status */}
        <Card data-testid="card-cache-status">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Cache Status by Sport
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : sports.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No cached data yet — engine starting up</p>
            ) : (
              <div className="space-y-2">
                {sports.map(([sport, entry]) => (
                  <div
                    key={sport}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                    data-testid={`row-cache-${sport}`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={entry.hasPicks ? "healthy" : "warning"} />
                      <div>
                        <div className="font-semibold text-sm" data-testid={`text-sport-${sport}`}>{sport}</div>
                        <div className="text-xs text-muted-foreground">{entry.dataSource}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-sm font-bold" data-testid={`value-picks-${sport}`}>{entry.pickCount}</div>
                        <div className="text-xs text-muted-foreground">picks</div>
                      </div>
                      <div>
                        <div className="text-sm font-mono" data-testid={`value-age-${sport}`}>{entry.age} old</div>
                        <div className="text-xs text-muted-foreground">cache age</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={entry.hasPicks ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}
                        data-testid={`badge-cache-${sport}`}
                      >
                        {entry.hasPicks ? "OK" : "Empty"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pb-4" data-testid="text-last-fetched">
          Last fetched: {health ? new Date(health.timestamp).toLocaleTimeString() : "—"}
          &nbsp;·&nbsp;Adaptive scheduling: off-peak (1–7am) = 30m, game window = 2–5m
        </p>
      </div>
    </div>
  );
}
