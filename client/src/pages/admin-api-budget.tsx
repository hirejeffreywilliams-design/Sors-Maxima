import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Gauge, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  XCircle, Users, Calendar, Clock, Zap, RefreshCw, Settings,
  ChevronDown, ChevronRight, Info,
} from "lucide-react";

interface Optimization {
  service: string;
  status: "healthy" | "warning" | "critical" | "exhausted";
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
}

interface ServiceConfig {
  name: string;
  monthlyBudget: number;
  description: string;
  unit: string;
}

interface BudgetData {
  optimizations: Optimization[];
  configs: Record<string, ServiceConfig>;
  activeUsers: number;
  paidUsers: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  monthStart: string;
  lastSaved: string;
  keyStatus: Record<string, { totalKeys: number; activeKeys: number; keyStates: any[] }>;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  warning: { label: "Warning", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: AlertTriangle },
  exhausted: { label: "Exhausted", color: "text-red-600", bg: "bg-red-600/10 border-red-600/30", icon: XCircle },
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

function UsageBar({ used, budget, status }: { used: number; budget: number; status: Optimization["status"] }) {
  const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
  const color = status === "healthy" ? "bg-emerald-500" : status === "warning" ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ServiceCard({ opt, config, keyInfo, paidUsers, onUpdateBudget }: {
  opt: Optimization;
  config: ServiceConfig;
  keyInfo?: { totalKeys: number; activeKeys: number; keyStates: any[] };
  paidUsers: number;
  onUpdateBudget: (service: string, budget: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(opt.budget));
  const cfg = STATUS_CONFIG[opt.status];
  const Icon = cfg.icon;

  const usedPct = opt.budget > 0 ? Math.min(100, (opt.used / opt.budget) * 100) : 0;
  const expectedPct = opt.budget > 0 ? Math.min(100, (opt.expectedUsageByNow / opt.budget) * 100) : 0;

  const userLoad = paidUsers > 0
    ? `~${(opt.budget / Math.max(1, paidUsers)).toFixed(0)} ${config.unit}/user/mo`
    : "No paid users";

  return (
    <Card className={`border ${opt.status !== "healthy" ? cfg.bg.split(" ")[1] : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{config.name}</CardTitle>
              <StatusBadge status={opt.status} />
              {opt.shouldThrottle && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-500">THROTTLE</Badge>
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
      </CardHeader>
      <CardContent className="space-y-3">
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
            <span>Expected by now: {Math.round(opt.expectedUsageByNow).toLocaleString()} ({expectedPct.toFixed(1)}%)</span>
          </div>
          <div className="relative h-3 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${opt.status === "healthy" ? "bg-emerald-500" : opt.status === "warning" ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${usedPct}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/40"
              style={{ left: `${expectedPct}%` }}
              title="Expected usage pace"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {opt.budgetVariance > 0
              ? `▲ ${Math.round(opt.budgetVariance)} ${config.unit} ahead of pace`
              : `▼ ${Math.abs(Math.round(opt.budgetVariance))} ${config.unit} under pace`}
          </p>
        </div>

        <div className={`rounded-md p-2 text-[11px] ${cfg.bg}`}>
          <Icon className={`w-3 h-3 inline mr-1 ${cfg.color}`} />
          <span className={cfg.color}>{opt.recommendation}</span>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
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
                <p className="font-medium">{userLoad}</p>
              </div>
            </div>

            {keyInfo && keyInfo.totalKeys > 0 && (
              <div>
                <p className="text-[11px] font-medium mb-1">API Keys ({keyInfo.activeKeys}/{keyInfo.totalKeys} active)</p>
                <div className="space-y-1">
                  {keyInfo.keyStates.map((k, i) => (
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

  const updateBudgetMutation = useMutation({
    mutationFn: ({ service, budget }: { service: string; budget: number }) =>
      apiRequest("PATCH", `/api/admin/api-budget/${service}/budget`, { budget }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-budget"] });
      toast({ title: "Budget updated" });
    },
    onError: () => toast({ title: "Failed to update budget", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const criticalCount = data.optimizations.filter(o => o.status === "critical" || o.status === "exhausted").length;
  const warningCount = data.optimizations.filter(o => o.status === "warning").length;
  const throttleCount = data.optimizations.filter(o => o.shouldThrottle).length;

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
              Tracks monthly API quota usage and recommends optimal polling intervals to keep keys active all month.
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
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Month Progress</p>
            </div>
            <p className="text-lg font-bold font-mono">{Math.ceil(data.daysRemaining)}d left</p>
            <Progress value={(data.daysElapsed / data.daysInMonth) * 100} className="h-1 mt-1" />
          </div>

          <div className={`rounded-lg border p-3 ${throttleCount > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Throttle Active</p>
            </div>
            <p className={`text-lg font-bold ${throttleCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {throttleCount} / {data.optimizations.length}
            </p>
            <p className="text-[10px] text-muted-foreground">APIs over pace</p>
          </div>
        </div>

        {(criticalCount > 0 || warningCount > 0) && (
          <div className={`rounded-lg border p-3 flex items-start gap-2 ${criticalCount > 0 ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${criticalCount > 0 ? "text-red-500" : "text-amber-500"}`} />
            <div className="text-sm">
              <span className="font-medium">
                {criticalCount > 0 ? `${criticalCount} API${criticalCount > 1 ? "s are" : " is"} critically over budget` : `${warningCount} API${warningCount > 1 ? "s are" : " is"} approaching budget limit`}.
              </span>
              {" "}Reduce polling frequency or upgrade your API plan. Expand each card below to see exact recommendations.
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {data.optimizations.map(opt => (
            <ServiceCard
              key={opt.service}
              opt={opt}
              config={data.configs[opt.service] || { name: opt.service, monthlyBudget: opt.budget, description: "", unit: "requests" }}
              keyInfo={data.keyStatus?.[opt.service]}
              paidUsers={data.paidUsers}
              onUpdateBudget={(service, budget) => updateBudgetMutation.mutate({ service, budget })}
            />
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              How the Optimizer Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
              {[
                { title: "Monthly Budget", text: "Set the total number of API calls you're allowed per month for each service. Default values use conservative free-tier estimates." },
                { title: "Usage Tracking", text: "Every API call is logged. When providers return remaining-count headers (e.g. x-requests-remaining), those are used directly for accuracy." },
                { title: "Optimal Interval", text: "Divides remaining calls by remaining days to compute how often the app should poll. More days left = calls can be more frequent." },
                { title: "User Scaling", text: "With more paid members, the optimizer slightly increases the interval. More users = more concurrent sessions = higher background load." },
                { title: "Throttle Alert", text: "If usage is running 15% ahead of the expected pace, the optimizer flags that API and recommends slowing down polling immediately." },
                { title: "Projected End-of-Month", text: "Extrapolates current 24-hour burn rate to estimate total usage by month's end. Green = on track, red = projected to exceed budget." },
              ].map(({ title, text }) => (
                <div key={title}>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground mt-0.5">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md bg-muted/30 border p-3 text-[11px] text-muted-foreground">
              <Zap className="w-3 h-3 inline mr-1 text-primary" />
              <strong>Pro tip:</strong> If you add backup API keys (e.g. <code className="text-xs bg-muted px-1 rounded">THE_ODDS_API_KEY_2</code>, <code className="text-xs bg-muted px-1 rounded">THE_ODDS_API_KEY_3</code>),
              the system automatically rotates to the next key when one runs low. Set each key's budget above to reflect the combined limit.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
