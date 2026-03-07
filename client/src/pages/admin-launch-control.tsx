import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Rocket,
  ToggleLeft, ToggleRight, Zap, Trash2, Play, Shield,
  Database, Clock, TrendingUp, Activity, AlertCircle, ChevronRight,
  Wifi, WifiOff, Radio, Key, KeyRound, Layers, Settings2, Network,
} from "lucide-react";
import { Link } from "wouter";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  action?: string;
}

interface ApiUsage {
  available: boolean;
  remaining: number | null;
  burnRatePerHour: number | null;
  daysRemaining: number | null;
  historyPoints: number;
  lastCall?: string | null;
}

interface LaunchReport {
  checks: CheckResult[];
  summary: { pass: number; warn: number; fail: number; ready: boolean };
  usage: ApiUsage;
  timestamp: string;
}

type PipelineStatus = "live" | "cached" | "degraded" | "offline" | "unknown";

interface PipelineSource {
  id: string;
  name: string;
  status: PipelineStatus;
  lastSuccess: string | null;
  detail: string;
  callsTracked: number;
  dataPoints?: number;
  sports?: string[];
  keyRequired: boolean;
  keySet: boolean;
}

interface PipelineHealth {
  sources: PipelineSource[];
  summary: { live: number; cached: number; degraded: number; offline: number; unknown: number; total: number };
  allHealthy: boolean;
  anyCriticalOffline: boolean;
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusIcon(status: CheckResult["status"]) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

function statusBadge(status: CheckResult["status"]) {
  if (status === "pass") return <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/15 border-emerald-500/30 text-emerald-400">Pass</Badge>;
  if (status === "warn") return <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/15 border-amber-500/30 text-amber-400">Warn</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5 bg-red-500/15 border-red-500/30 text-red-400">Fail</Badge>;
}

function budgetColor(remaining: number | null): string {
  if (remaining === null) return "text-muted-foreground";
  if (remaining < 5_000)  return "text-red-400";
  if (remaining < 20_000) return "text-amber-400";
  return "text-emerald-400";
}

// ── Action Button ──────────────────────────────────────────────────────────────
function ActionButton({
  label, description, icon: Icon, variant = "outline", onClick, loading, confirmText,
}: {
  label: string; description: string; icon: React.ComponentType<{className?: string}>;
  variant?: "outline" | "destructive" | "default"; onClick: () => void; loading?: boolean; confirmText?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirmText && !confirming) { setConfirming(true); return; }
    setConfirming(false);
    onClick();
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${variant === "destructive" ? "bg-red-500/15" : "bg-primary/10"}`}>
        <Icon className={`w-4 h-4 ${variant === "destructive" ? "text-red-400" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        size="sm"
        variant={variant === "destructive" ? "destructive" : "outline"}
        className="h-7 text-xs shrink-0 gap-1"
        onClick={handleClick}
        disabled={loading}
        data-testid={`button-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
        {confirming ? (
          <span className="text-red-400">{confirmText}</span>
        ) : (
          <>{!loading && <ChevronRight className="w-3 h-3" />} {label.split(" ")[0]}</>
        )}
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminLaunchControl() {
  useSEO({ title: "Launch Control — Admin", description: "Pre-launch checklist and system health" });
  const { toast } = useToast();
  const [maintenanceMsg, setMaintenanceMsg] = useState("");

  const { data: report, isLoading, refetch, isFetching } = useQuery<LaunchReport>({
    queryKey: ["/api/admin/launch-check"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: maintenanceStatus } = useQuery<{ active: boolean; message: string }>({
    queryKey: ["/api/admin/maintenance/status"],
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: pipelineHealth, isLoading: pipelineLoading, refetch: refetchPipeline, isFetching: pipelineFetching } =
    useQuery<PipelineHealth>({
      queryKey: ["/api/admin/data-pipeline-health"],
      staleTime: 20_000,
      refetchInterval: 30_000,
    });

  const { data: featureFlagsList } = useQuery<Array<{ id: string; name: string; enabled: boolean; description: string }>>({
    queryKey: ["/api/admin/feature-flags"],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const advancedCCFlag = featureFlagsList?.find(f => f.id === "advanced_command_center");

  const toggleAdvancedCC = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("PUT", "/api/admin/feature-flags/advanced_command_center", { enabled, rolloutPercentage: enabled ? 100 : 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags/check/advanced_command_center"] });
      toast({ title: advancedCCFlag?.enabled ? "Advanced sections hidden from members" : "Advanced sections unlocked for all members" });
    },
    onError: () => toast({ title: "Toggle failed", variant: "destructive" }),
  });

  const toggleMaintenance = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/maintenance/toggle", { message: maintenanceMsg || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch-check"] });
      toast({ title: maintenanceStatus?.active ? "Maintenance mode disabled" : "Maintenance mode enabled" });
    },
  });

  const clearCache = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/actions/clear-prediction-cache"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch-check"] });
      toast({ title: "Cache cleared", description: data?.message });
    },
    onError: () => toast({ title: "Clear failed", variant: "destructive" }),
  });

  const forceEngine = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/actions/force-engine-run"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch-check"] });
      toast({ title: "Engine triggered", description: data?.message });
    },
    onError: () => toast({ title: "Engine trigger failed", variant: "destructive" }),
  });

  const flushPicks = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/actions/flush-stale-picks"),
    onSuccess: (data: any) => toast({ title: "Stale picks flushed", description: data?.message }),
    onError: () => toast({ title: "Flush failed", variant: "destructive" }),
  });

  const { checks = [], summary, usage } = report ?? {};

  const fails = checks.filter(c => c.status === "fail");
  const warns = checks.filter(c => c.status === "warn");
  const passes = checks.filter(c => c.status === "pass");

  const isReady = summary?.ready ?? false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" data-testid="page-launch-control">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Launch Control</h1>
            <p className="text-xs text-muted-foreground">
              Pre-launch checklist, health monitoring, and quick-fix actions
              {report?.timestamp && ` · Checked ${new Date(report.timestamp).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-checks"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Checks
        </Button>
      </div>

      {/* Summary Banner */}
      {!isLoading && summary && (
        <div className={`p-4 rounded-xl border flex items-center gap-4 flex-wrap ${
          isReady ? "bg-emerald-500/8 border-emerald-500/25" : "bg-red-500/8 border-red-500/25"
        }`} data-testid="section-launch-summary">
          <div className="flex items-center gap-2">
            {isReady
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <XCircle className="w-5 h-5 text-red-400" />
            }
            <span className={`font-semibold ${isReady ? "text-emerald-400" : "text-red-400"}`}>
              {isReady ? "App is launch-ready" : `${fails.length} critical issue${fails.length !== 1 ? "s" : ""} must be fixed before launching`}
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-emerald-400 font-medium">{summary.pass} Pass</span>
            {summary.warn > 0 && <span className="text-xs text-amber-400 font-medium">{summary.warn} Warn</span>}
            {summary.fail > 0 && <span className="text-xs text-red-400 font-medium">{summary.fail} Fail</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Pre-Launch Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading && [1,2,3,4,5,6].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}

              {/* Fail items first */}
              {fails.map(check => (
                <div key={check.id} className="p-3 rounded-xl border border-red-500/25 bg-red-500/5 space-y-1" data-testid={`check-${check.id}`}>
                  <div className="flex items-center gap-2">
                    {statusIcon(check.status)}
                    <span className="text-sm font-medium">{check.label}</span>
                    <div className="ml-auto">{statusBadge(check.status)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{check.detail}</p>
                  {check.action && (
                    <p className="text-xs text-red-400/80 pl-6 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {check.action}
                    </p>
                  )}
                </div>
              ))}

              {/* Warn items */}
              {warns.map(check => (
                <div key={check.id} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1" data-testid={`check-${check.id}`}>
                  <div className="flex items-center gap-2">
                    {statusIcon(check.status)}
                    <span className="text-sm font-medium">{check.label}</span>
                    <div className="ml-auto">{statusBadge(check.status)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{check.detail}</p>
                  {check.action && (
                    <p className="text-xs text-amber-400/80 pl-6">{check.action}</p>
                  )}
                </div>
              ))}

              {/* Pass items — collapsed by default */}
              {passes.map(check => (
                <div key={check.id} className="p-3 rounded-xl border border-border/30 bg-muted/10 flex items-center gap-2" data-testid={`check-${check.id}`}>
                  {statusIcon(check.status)}
                  <span className="text-sm text-muted-foreground flex-1">{check.label}</span>
                  <p className="text-xs text-muted-foreground/60 hidden sm:block max-w-xs truncate">{check.detail}</p>
                  <div className="ml-2">{statusBadge(check.status)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API Budget */}
          {usage && (
            <Card data-testid="section-api-budget">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Odds API Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className={`text-xl font-bold ${budgetColor(usage.remaining)}`}>
                      {usage.remaining !== null ? usage.remaining.toLocaleString() : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Requests Left</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xl font-bold text-foreground">
                      {usage.burnRatePerHour !== null ? `${usage.burnRatePerHour}/hr` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Burn Rate</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className={`text-xl font-bold ${usage.daysRemaining !== null && usage.daysRemaining < 3 ? "text-red-400" : usage.daysRemaining !== null && usage.daysRemaining < 7 ? "text-amber-400" : "text-emerald-400"}`}>
                      {usage.daysRemaining !== null ? `${usage.daysRemaining}d` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Days Remaining</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  Budget resets monthly. Each intelligence cycle uses ~9 requests across 3 active sports.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions + Maintenance */}
        <div className="space-y-4">

          {/* Maintenance Mode */}
          <Card className={maintenanceStatus?.active ? "border-amber-500/40 bg-amber-500/5" : ""} data-testid="section-maintenance">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {maintenanceStatus?.active
                  ? <ToggleRight className="w-4 h-4 text-amber-400" />
                  : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                }
                Maintenance Mode
                {maintenanceStatus?.active && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/15 border-amber-500/30 text-amber-400 ml-auto">ACTIVE</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {maintenanceStatus?.active
                  ? "Users receive a maintenance message. Admin access and login still work."
                  : "When enabled, all non-admin API calls return 503. Users see an error. Login still works so you can re-enter to fix issues."
                }
              </p>
              {!maintenanceStatus?.active && (
                <input
                  type="text"
                  placeholder="Optional: Custom message for users..."
                  value={maintenanceMsg}
                  onChange={e => setMaintenanceMsg(e.target.value)}
                  className="w-full text-xs bg-muted/30 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-maintenance-message"
                />
              )}
              <Button
                size="sm"
                variant={maintenanceStatus?.active ? "outline" : "destructive"}
                className={`w-full gap-1.5 text-xs h-8 ${!maintenanceStatus?.active ? "border-amber-500/50 text-amber-400 hover:bg-amber-500/10" : ""}`}
                onClick={() => toggleMaintenance.mutate()}
                disabled={toggleMaintenance.isPending}
                data-testid="button-toggle-maintenance"
              >
                {toggleMaintenance.isPending && <RefreshCw className="w-3 h-3 animate-spin" />}
                {maintenanceStatus?.active ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
              </Button>
            </CardContent>
          </Card>

          {/* Feature Controls — Command Center Visibility */}
          <Card data-testid="section-feature-controls">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Platform Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Advanced Command Center</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Best Tickets, Matchup Parlays, and Daily Edge Parlay. Off = simplified member view. Admin always sees everything.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 ${advancedCCFlag?.enabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      {advancedCCFlag?.enabled ? "ON for all members" : "OFF — simplified view"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 text-xs gap-1.5 shrink-0 ${advancedCCFlag?.enabled ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}
                  onClick={() => toggleAdvancedCC.mutate(!advancedCCFlag?.enabled)}
                  disabled={toggleAdvancedCC.isPending || advancedCCFlag === undefined}
                  data-testid="button-toggle-advanced-cc"
                >
                  {toggleAdvancedCC.isPending
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : advancedCCFlag?.enabled
                      ? <ToggleRight className="w-3.5 h-3.5" />
                      : <ToggleLeft className="w-3.5 h-3.5" />
                  }
                  {advancedCCFlag?.enabled ? "Turn Off" : "Turn On"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card data-testid="section-quick-actions">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ActionButton
                label="Force Engine Run"
                description="Immediately regenerate all picks"
                icon={Play}
                onClick={() => forceEngine.mutate()}
                loading={forceEngine.isPending}
              />
              <ActionButton
                label="Clear Cache"
                description="Wipe all cached predictions"
                icon={Trash2}
                variant="destructive"
                confirmText="Confirm"
                onClick={() => clearCache.mutate()}
                loading={clearCache.isPending}
              />
              <ActionButton
                label="Flush Stale Picks"
                description="Remove unsettleable picks"
                icon={Activity}
                onClick={() => flushPicks.mutate()}
                loading={flushPicks.isPending}
              />
            </CardContent>
          </Card>

          {/* Key Risks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Publishing Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Shield, text: "Change admin password before going live" },
                { icon: TrendingUp, text: "Odds API budget — monitor burn rate daily" },
                { icon: Database, text: "Sessions reset on server restart (MemoryStore)" },
                { icon: Clock, text: "Frontend changes need 'vite build' to deploy" },
                { icon: Activity, text: "Stripe webhook must point to production URL" },
                { icon: AlertCircle, text: "Session fingerprint may flag CDN users — monitor" },
              ].map((risk, i) => (
                <div key={i} className="flex items-start gap-2">
                  <risk.icon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{risk.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Data Pipeline Health */}
      <Card data-testid="section-pipeline-health">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              Live Data Pipeline
              {pipelineHealth && (
                <span className={`text-xs font-normal ml-1 ${pipelineHealth.allHealthy ? "text-emerald-400" : pipelineHealth.anyCriticalOffline ? "text-red-400" : "text-amber-400"}`}>
                  {pipelineHealth.allHealthy ? "— All systems operational" : pipelineHealth.anyCriticalOffline ? "— Critical source offline" : "— Degraded"}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {pipelineHealth && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {pipelineHealth.summary.live > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{pipelineHealth.summary.live} live</span>}
                  {pipelineHealth.summary.cached > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{pipelineHealth.summary.cached} cached</span>}
                  {pipelineHealth.summary.degraded > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{pipelineHealth.summary.degraded} degraded</span>}
                  {pipelineHealth.summary.offline > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{pipelineHealth.summary.offline} offline</span>}
                </div>
              )}
              <Link href="/admin/pipeline">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  data-testid="button-open-pipeline-map"
                >
                  <Network className="w-3.5 h-3.5" />
                  Connection Map
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => refetchPipeline()}
                disabled={pipelineFetching}
                data-testid="button-refresh-pipeline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pipelineFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pipelineLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : pipelineHealth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pipelineHealth.sources.map(source => (
                <PipelineSourceCard key={source.id} source={source} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Pipeline health data unavailable</p>
          )}
          {pipelineHealth?.timestamp && (
            <p className="text-[10px] text-muted-foreground text-right mt-3">
              Updated {new Date(pipelineHealth.timestamp).toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

// ── Pipeline Source Card ───────────────────────────────────────────────────────
function PipelineSourceCard({ source }: { source: PipelineSource }) {
  const statusConfig: Record<PipelineStatus, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
    live: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", label: "Live", icon: <Wifi className="w-3 h-3" /> },
    cached: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", label: "Cached", icon: <Clock className="w-3 h-3" /> },
    degraded: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", label: "Degraded", icon: <AlertTriangle className="w-3 h-3" /> },
    offline: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", label: "Offline", icon: <WifiOff className="w-3 h-3" /> },
    unknown: { color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border/50", label: "Unknown", icon: <AlertCircle className="w-3 h-3" /> },
  };

  const cfg = statusConfig[source.status];

  return (
    <div
      className={`rounded-xl border p-3.5 space-y-2 ${cfg.bg} ${cfg.border}`}
      data-testid={`pipeline-source-${source.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold truncate">{source.name}</p>
        <div className={`flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{source.detail}</p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {source.keyRequired && (
            <span className={`flex items-center gap-0.5 text-[10px] ${source.keySet ? "text-emerald-400" : "text-red-400"}`}>
              {source.keySet ? <Key className="w-2.5 h-2.5" /> : <KeyRound className="w-2.5 h-2.5" />}
              {source.keySet ? "Key set" : "No key"}
            </span>
          )}
          {!source.keyRequired && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              Free API
            </span>
          )}
          {source.sports && source.sports.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{source.sports.slice(0, 3).join(", ")}</span>
          )}
        </div>
        {source.lastSuccess && (
          <span className="text-[10px] text-muted-foreground">{source.lastSuccess}</span>
        )}
      </div>
    </div>
  );
}
