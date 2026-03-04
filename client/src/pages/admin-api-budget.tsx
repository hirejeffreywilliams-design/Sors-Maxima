import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Gauge, AlertTriangle, CheckCircle2, XCircle, Users, Calendar,
  Clock, Zap, RefreshCw, Settings, ChevronDown, ChevronRight,
  Info, PauseCircle, PlayCircle, Bell, BellOff, Leaf, Snowflake,
} from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Optimization {
  service: string;
  status: "healthy" | "warning" | "critical" | "exhausted" | "suspended";
  budget: number;
  used: number;
  remaining: number;
  remainingPercent: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  expectedUsageByNow: number;
  budgetVariance: number;
  projectedMonthEnd: number;
  optimalCallsPerDay: number;
  optimalIntervalMinutes: number;
  currentBurnPerDay: number;
  userScaledInterval: number;
  shouldThrottle: boolean;
  recommendation: string;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string;
  autoSuspend: boolean;
  inSeason: boolean;
  seasonLabel: string;
  currentMonth: number;
}

interface ServiceConfig {
  name: string;
  monthlyBudget: number;
  description: string;
  unit: string;
  seasonMonths: number[];
  seasonLabel: string;
}

interface SeasonAlert {
  id: string;
  service: string;
  type: "restart_needed" | "auto_suspended" | "season_ending_soon";
  message: string;
  createdAt: string;
  dismissed: boolean;
}

interface BudgetData {
  optimizations: Optimization[];
  configs: Record<string, ServiceConfig>;
  alerts: SeasonAlert[];
  activeUsers: number;
  paidUsers: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  monthStart: string;
  lastSaved: string;
  currentMonth: number;
  keyStatus?: Record<string, { totalKeys: number; activeKeys: number; keyStates: any[] }>;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  warning: { label: "Warning", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: AlertTriangle },
  exhausted: { label: "Exhausted", color: "text-red-600", bg: "bg-red-600/10 border-red-600/30", icon: XCircle },
  suspended: { label: "Suspended", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30", icon: PauseCircle },
};

const ALERT_CONFIG = {
  restart_needed: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: PlayCircle, label: "Restart Needed" },
  auto_suspended: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: PauseCircle, label: "Auto-Suspended" },
  season_ending_soon: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: Snowflake, label: "Season Ending" },
};

function StatusBadge({ status }: { status: Optimization["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function SeasonCalendar({ months, currentMonth }: { months: number[]; currentMonth: number }) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {MONTH_NAMES.map((name, i) => {
        const month = i + 1;
        const active = months.includes(month);
        const isCurrent = month === currentMonth;
        return (
          <div
            key={month}
            className={`text-[9px] font-medium px-1 py-0.5 rounded transition-all ${
              isCurrent
                ? active
                  ? "bg-emerald-500 text-white ring-1 ring-emerald-300"
                  : "bg-red-500/20 text-red-400 ring-1 ring-red-400"
                : active
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-muted/40 text-muted-foreground/50"
            }`}
            title={active ? `${name}: Active` : `${name}: Off-season`}
          >
            {name}
          </div>
        );
      })}
    </div>
  );
}

function AlertPanel({ alerts, onDismiss }: {
  alerts: SeasonAlert[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-500" />
        Season Alerts
        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-500 border-amber-500/30">
          {alerts.length}
        </Badge>
      </h2>
      {alerts.map(alert => {
        const cfg = ALERT_CONFIG[alert.type];
        const Icon = cfg.icon;
        const timeAgo = getTimeAgo(alert.createdAt);
        return (
          <div key={alert.id} className={`rounded-lg border p-3 flex items-start gap-3 ${cfg.bg}`}>
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
              </div>
              <p className="text-xs">{alert.message}</p>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              data-testid={`button-dismiss-alert-${alert.id}`}
              title="Dismiss"
            >
              <BellOff className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ServiceCard({ opt, config, keyInfo, paidUsers, onUpdateBudget, onSuspend, onResume, onAutoSuspend }: {
  opt: Optimization;
  config: ServiceConfig;
  keyInfo?: { totalKeys: number; activeKeys: number; keyStates: any[] };
  paidUsers: number;
  onUpdateBudget: (service: string, budget: number) => void;
  onSuspend: (service: string) => void;
  onResume: (service: string) => void;
  onAutoSuspend: (service: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(opt.budget));
  const cfg = STATUS_CONFIG[opt.status];
  const Icon = cfg.icon;

  const usedPct = opt.budget > 0 ? Math.min(100, (opt.used / opt.budget) * 100) : 0;
  const expectedPct = opt.budget > 0 ? Math.min(100, (opt.expectedUsageByNow / opt.budget) * 100) : 0;

  const hasOffSeason = config.seasonMonths && config.seasonMonths.length < 12;

  return (
    <Card className={`border transition-all ${opt.suspended ? "opacity-70 border-slate-500/30 bg-muted/10" : opt.status !== "healthy" ? STATUS_CONFIG[opt.status].bg.split(" ")[1] : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{config.name}</CardTitle>
              <StatusBadge status={opt.status} />
              {opt.shouldThrottle && !opt.suspended && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-500">THROTTLE</Badge>
              )}
              {!opt.inSeason && !opt.suspended && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/30 text-blue-400">
                  <Snowflake className="w-2.5 h-2.5 mr-0.5" />OFF-SEASON
                </Badge>
              )}
              {opt.inSeason && !opt.suspended && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-500">
                  <Leaf className="w-2.5 h-2.5 mr-0.5" />IN-SEASON
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{config.description}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            data-testid={`button-expand-${opt.service}`}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {config.seasonMonths && (
          <div className="mt-2">
            <SeasonCalendar months={config.seasonMonths} currentMonth={opt.currentMonth} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {opt.suspended ? (
          <div className="rounded-lg border bg-slate-500/10 border-slate-500/20 p-3 text-center">
            <PauseCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">API Calls Suspended</p>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{opt.suspendedReason}</p>
            {opt.suspendedAt && (
              <p className="text-[10px] text-muted-foreground mt-1">Since {getTimeAgo(opt.suspendedAt)}</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/30 p-2">
                <p className={`text-lg font-bold font-mono ${cfg.color}`}>
                  {opt.remaining.toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground">Remaining</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-lg font-bold font-mono text-foreground">
                  {opt.budget.toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground">Monthly Budget</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className={`text-lg font-bold font-mono ${opt.projectedMonthEnd > opt.budget ? "text-red-500" : "text-emerald-500"}`}>
                  {Math.round(opt.projectedMonthEnd).toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground">Projected EOM</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Used: {opt.used.toLocaleString()} ({usedPct.toFixed(1)}%)</span>
                <span>Expected: {Math.round(opt.expectedUsageByNow).toLocaleString()} ({expectedPct.toFixed(1)}%)</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${opt.status === "healthy" ? "bg-emerald-500" : opt.status === "warning" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${usedPct}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/40"
                  style={{ left: `${Math.min(100, expectedPct)}%` }}
                  title="Expected pace"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {opt.budgetVariance > 0
                  ? `▲ ${Math.round(opt.budgetVariance)} ${config.unit} ahead of pace`
                  : `▼ ${Math.abs(Math.round(opt.budgetVariance))} ${config.unit} under pace`}
              </p>
            </div>
          </>
        )}

        <div className={`rounded-md p-2 text-[11px] ${cfg.bg}`}>
          <Icon className={`w-3 h-3 inline mr-1 ${cfg.color}`} />
          <span className={cfg.color}>{opt.recommendation}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {opt.suspended ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => onResume(opt.service)}
              data-testid={`button-resume-${opt.service}`}
            >
              <PlayCircle className="w-3 h-3 mr-1" />
              Resume API Calls
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  data-testid={`button-suspend-${opt.service}`}
                >
                  <PauseCircle className="w-3 h-3 mr-1" />
                  Suspend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend {config.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop all API calls to {config.name} immediately. No data will be fetched until you manually resume. You will receive an alert to restart when needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => onSuspend(opt.service)}
                  >
                    Yes, Suspend Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {hasOffSeason && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Switch
                id={`auto-suspend-${opt.service}`}
                checked={opt.autoSuspend}
                onCheckedChange={v => onAutoSuspend(opt.service, v)}
                data-testid={`switch-auto-suspend-${opt.service}`}
              />
              <Label htmlFor={`auto-suspend-${opt.service}`} className="text-[11px] text-muted-foreground cursor-pointer">
                Auto-suspend in off-season
              </Label>
            </div>
          )}
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {!opt.suspended && (
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Optimal interval</p>
                  <p className="font-medium">{Math.round(opt.optimalIntervalMinutes)}min between calls</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User-adjusted interval</p>
                  <p className="font-medium">{Math.round(opt.userScaledInterval)}min ({paidUsers} users)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Optimal calls/day</p>
                  <p className="font-medium">{Math.round(opt.optimalCallsPerDay)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">24hr burn rate</p>
                  <p className="font-medium">{opt.currentBurnPerDay} {config.unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days remaining</p>
                  <p className="font-medium">{Math.ceil(opt.daysRemaining)} of {opt.daysInMonth}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Per-user budget</p>
                  <p className="font-medium">
                    {paidUsers > 0
                      ? `~${(opt.budget / Math.max(1, paidUsers)).toFixed(0)} ${config.unit}/user/mo`
                      : "No paid users"}
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Season Definition
              </p>
              <p className="text-[11px] text-muted-foreground">{config.seasonLabel}</p>
            </div>

            {keyInfo && keyInfo.totalKeys > 0 && (
              <div>
                <p className="text-[11px] font-medium mb-1">API Keys ({keyInfo.activeKeys}/{keyInfo.totalKeys} active)</p>
                <div className="space-y-1">
                  {keyInfo.keyStates.map((k: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${k.coolingDown ? "bg-red-500" : "bg-emerald-500"}`} />
                      <span className="text-muted-foreground">Key #{k.index}</span>
                      <span>{k.remaining !== null ? `${k.remaining.toLocaleString()} remaining` : "Unknown"}</span>
                      {k.coolingDown && <Badge variant="outline" className="text-[9px] px-1 py-0 text-red-500">429 cooldown</Badge>}
                      {k.errorCount > 0 && <span className="text-red-400">{k.errorCount} errors</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {editBudget ? (
                <>
                  <Input
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    className="h-7 w-32 text-xs"
                    type="number"
                    min={1}
                    data-testid={`input-budget-${opt.service}`}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const b = parseInt(budgetInput);
                      if (!isNaN(b) && b > 0) {
                        onUpdateBudget(opt.service, b);
                        setEditBudget(false);
                      }
                    }}
                    data-testid={`button-save-budget-${opt.service}`}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setEditBudget(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { setBudgetInput(String(opt.budget)); setEditBudget(true); }}
                  data-testid={`button-edit-budget-${opt.service}`}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Set Monthly Budget
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminApiBudget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<BudgetData>({
    queryKey: ["/api/admin/api-budget"],
    refetchInterval: 30000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/api-budget"] });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ service, budget }: { service: string; budget: number }) =>
      apiRequest("PATCH", `/api/admin/api-budget/${service}/budget`, { budget }),
    onSuccess: () => { invalidate(); toast({ title: "Budget updated" }); },
    onError: () => toast({ title: "Failed to update budget", variant: "destructive" }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ service, reason }: { service: string; reason?: string }) =>
      apiRequest("POST", `/api/admin/api-budget/${service}/suspend`, { reason: reason || "Manually suspended by admin" }),
    onSuccess: (_, { service }) => { invalidate(); toast({ title: `${service} suspended`, description: "API calls are paused. You'll get an alert when it's time to restart." }); },
    onError: () => toast({ title: "Failed to suspend service", variant: "destructive" }),
  });

  const resumeMutation = useMutation({
    mutationFn: (service: string) =>
      apiRequest("POST", `/api/admin/api-budget/${service}/resume`, {}),
    onSuccess: (_, service) => { invalidate(); toast({ title: `${service} resumed`, description: "API calls are now active again." }); },
    onError: () => toast({ title: "Failed to resume service", variant: "destructive" }),
  });

  const autoSuspendMutation = useMutation({
    mutationFn: ({ service, enabled }: { service: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/admin/api-budget/${service}/auto-suspend`, { enabled }),
    onSuccess: (_, { service, enabled }) => {
      invalidate();
      toast({ title: `Auto-suspend ${enabled ? "enabled" : "disabled"} for ${service}` });
    },
    onError: () => toast({ title: "Failed to update auto-suspend", variant: "destructive" }),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/api-budget/alerts/${id}/dismiss`, {}),
    onSuccess: () => invalidate(),
    onError: () => toast({ title: "Failed to dismiss alert", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const criticalCount = data.optimizations.filter(o => o.status === "critical" || o.status === "exhausted").length;
  const warningCount = data.optimizations.filter(o => o.status === "warning").length;
  const suspendedCount = data.optimizations.filter(o => o.suspended).length;
  const throttleCount = data.optimizations.filter(o => o.shouldThrottle).length;
  const offSeasonCount = data.optimizations.filter(o => !o.inSeason && !o.suspended).length;
  const alerts = data.alerts || [];
  const restartAlerts = alerts.filter(a => a.type === "restart_needed");

  const overallStatus = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "healthy";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge className="w-6 h-6 text-primary" />
              API Budget Optimizer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly quota tracking, burn rate monitoring, and season-aware auto-suspension to preserve API keys during off-season.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            data-testid="button-refresh-budget"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        {restartAlerts.length > 0 && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
            <PlayCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                {restartAlerts.length} API service{restartAlerts.length > 1 ? "s" : ""} need{restartAlerts.length === 1 ? "s" : ""} to be restarted
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A sport season has started. Click <strong>Resume API Calls</strong> on the relevant service cards below, or scroll down to the Alerts section to review.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-lg border p-3 ${overallStatus === "critical" ? "bg-red-500/10 border-red-500/30" : overallStatus === "warning" ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {overallStatus === "healthy" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              <p className="text-xs font-medium">Overall</p>
            </div>
            <p className={`text-lg font-bold ${overallStatus === "critical" ? "text-red-500" : overallStatus === "warning" ? "text-amber-500" : "text-emerald-500"}`}>
              {overallStatus === "healthy" ? "On Track" : overallStatus === "warning" ? "Monitor" : "Action Needed"}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Paid Members</p>
            </div>
            <p className="text-lg font-bold font-mono">{data.paidUsers}</p>
            <p className="text-[10px] text-muted-foreground">active subscribers</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <PauseCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Suspended</p>
            </div>
            <p className={`text-lg font-bold font-mono ${suspendedCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
              {suspendedCount} / {data.optimizations.length}
            </p>
            <p className="text-[10px] text-muted-foreground">APIs paused</p>
          </div>

          <div className={`rounded-lg border p-3 ${offSeasonCount > 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-muted/30"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Snowflake className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Off-Season</p>
            </div>
            <p className={`text-lg font-bold font-mono ${offSeasonCount > 0 ? "text-blue-400" : "text-muted-foreground"}`}>
              {offSeasonCount} / {data.optimizations.length}
            </p>
            <p className="text-[10px] text-muted-foreground">APIs active but idle</p>
          </div>
        </div>

        {(criticalCount > 0 || throttleCount > 0) && (
          <div className={`rounded-lg border p-3 flex items-start gap-2 ${criticalCount > 0 ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${criticalCount > 0 ? "text-red-500" : "text-amber-500"}`} />
            <div className="text-sm">
              {criticalCount > 0 && (
                <span className="font-medium">{criticalCount} API{criticalCount > 1 ? "s are" : " is"} critically over budget. </span>
              )}
              {throttleCount > 0 && (
                <span>{throttleCount} API{throttleCount > 1 ? "s are" : " is"} running ahead of pace and should be throttled. </span>
              )}
              Expand each card below for exact recommendations, or consider enabling auto-suspend for off-season APIs.
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {data.optimizations.map(opt => (
            <ServiceCard
              key={opt.service}
              opt={opt}
              config={data.configs[opt.service] || { name: opt.service, monthlyBudget: opt.budget, description: "", unit: "requests", seasonMonths: [1,2,3,4,5,6,7,8,9,10,11,12], seasonLabel: "Year-round" }}
              keyInfo={data.keyStatus?.[opt.service]}
              paidUsers={data.paidUsers}
              onUpdateBudget={(s, b) => updateBudgetMutation.mutate({ service: s, budget: b })}
              onSuspend={s => suspendMutation.mutate({ service: s })}
              onResume={s => resumeMutation.mutate(s)}
              onAutoSuspend={(s, v) => autoSuspendMutation.mutate({ service: s, enabled: v })}
            />
          ))}
        </div>

        {alerts.length > 0 && (
          <AlertPanel
            alerts={alerts}
            onDismiss={id => dismissAlertMutation.mutate(id)}
          />
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              How Season-Aware Suspension Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
              {[
                { title: "Season Calendar", text: "Each API has an active season window shown as colored month pills. Green = active, grey = off-season. The current month is highlighted with a ring." },
                { title: "Auto-Suspend Toggle", text: "Enable 'Auto-suspend in off-season' on any card. When the off-season arrives, API calls stop automatically and you get an alert. When the season resumes, you get a restart alert." },
                { title: "Manual Suspend/Resume", text: "You can pause any service manually at any time — for example, if a sport has no meaningful action mid-season (like MLB All-Star break). A confirmation dialog prevents accidental clicks." },
                { title: "Restart Alerts", text: "When an auto-suspended service's season starts again, a green 'Restart Needed' alert appears at the top of this page and in the Alerts section. Dismiss it after you've resumed the service." },
                { title: "Season-Ending Warning", text: "7 days before a service's season ends, you'll receive a blue 'Season Ending' alert recommending you enable auto-suspend to save quota during the off-season." },
                { title: "Quota Preserved", text: "Suspended services stop burning monthly quota. BallDontLie (NBA-only), for example, saves ~100% of its July–September budget for the regular season." },
              ].map(({ title, text }) => (
                <div key={title}>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground mt-0.5">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <Leaf className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                <p className="font-medium text-emerald-400">IN-SEASON</p>
                <p className="text-muted-foreground">Active month, calls running</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <Snowflake className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                <p className="font-medium text-blue-400">OFF-SEASON</p>
                <p className="text-muted-foreground">Calls active but sport is idle</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2 text-center">
                <PauseCircle className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
                <p className="font-medium text-slate-400">SUSPENDED</p>
                <p className="text-muted-foreground">Calls paused, quota preserved</p>
              </div>
            </div>

            <div className="mt-3 rounded-md bg-muted/30 border p-3 text-[11px] text-muted-foreground">
              <Zap className="w-3 h-3 inline mr-1 text-primary" />
              <strong>Pro tip:</strong> Enable auto-suspend for BallDontLie (Jul–Sep NBA offseason) and API-Football (Jun–Jul summer break) to automatically preserve quota. The system will alert you when those seasons restart and it's time to resume calls.
            </div>
          </CardContent>
        </Card>

        <div className="text-[10px] text-muted-foreground text-center">
          {data.lastSaved && `Last saved ${getTimeAgo(data.lastSaved)}`}
          {data.currentMonth && ` · Current month: ${MONTH_NAMES[data.currentMonth - 1]}`}
        </div>
      </div>
    </div>
  );
}
