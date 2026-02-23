import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Ban, 
  CheckCircle, 
  Search,
  Activity,
  Clock,
  Bug,
  AlertCircle,
  Info,
  Trash2,
  RefreshCw,
  Crown,
  Gift,
  XCircle,
  Brain,
  Megaphone,
  ChevronRight,
  ChevronDown,
  Target,
  Database,
  ShieldAlert,
  DollarSign,
  HeartPulse,
  MessageCircle,
  FlaskConical,
  Mail,
  UsersRound,
  Percent,
  BarChart3,
  LayoutDashboard,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  Bot,
  Server,
  Cpu,
  Play,
  X,
  type LucideIcon
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubscriptionStats {
  total: number;
  free: number;
  pro: number;
  elite: number;
  whale: number;
  grantedFree: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt: string | null;
  isBanned: boolean;
  banReason: string | null;
  riskScore: number;
  subscriptionTier: string;
  ipAddresses: string[];
}

interface FraudAlert {
  userId: string;
  type: string;
  details: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

interface ErrorStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  last24Hours: number;
}

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  testId: string;
}

interface NavCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    id: "ops",
    title: "Operations",
    icon: Settings,
    items: [
      { href: "/admin/assistant", label: "AI Assistant", description: "AI-powered ops briefings & tasks", icon: Bot, testId: "link-admin-assistant" },
      { href: "/admin/guardian", label: "App Guardian", description: "Health monitoring, auto-heal & alerts", icon: Shield, testId: "link-admin-guardian" },
      { href: "/admin/orchestration", label: "Orchestration", description: "Ticketing, confidence & governance", icon: Zap, testId: "link-admin-orchestration" },
      { href: "/admin/analytics-dashboard", label: "Analytics", description: "KPIs, SLOs & incident playbooks", icon: Activity, testId: "link-admin-analytics-dashboard" },
      { href: "/admin/diagnostics", label: "Diagnostics", description: "AI system diagnostics", icon: Brain, testId: "link-admin-diagnostics" },
      { href: "/admin/security", label: "Error & Security", description: "Security headers & IP blocking", icon: Shield, testId: "link-admin-security" },
      { href: "/admin/feature-flags", label: "Feature Flags", description: "Rollouts & kill switches", icon: CheckCircle, testId: "link-admin-feature-flags" },
    ],
  },
  {
    id: "intel",
    title: "Intelligence",
    icon: Target,
    items: [
      { href: "/admin/model-performance", label: "Model Performance", description: "Accuracy & calibration curves", icon: Target, testId: "link-admin-model-performance" },
      { href: "/admin/training", label: "Training Center", description: "Backtesting, stress tests & model tuning", icon: FlaskConical, testId: "link-admin-training" },
      { href: "/admin/data-provenance", label: "Data Lineage", description: "Sources, pipelines & contracts", icon: Database, testId: "link-admin-data-provenance" },
      { href: "/admin/risk-register", label: "Risk & SOPs", description: "Risks & standard procedures", icon: ShieldAlert, testId: "link-admin-risk-register" },
      { href: "/admin/financial-projections", label: "Financials", description: "Revenue forecasts & economics", icon: DollarSign, testId: "link-admin-financial-projections" },
    ],
  },
  {
    id: "growth",
    title: "Growth",
    icon: TrendingUp,
    items: [
      { href: "/admin/acquisition", label: "Acquisition", description: "Channel performance & CAC", icon: BarChart3, testId: "link-admin-acquisition" },
      { href: "/admin/marketing", label: "Marketing", description: "AI marketing campaigns", icon: Megaphone, testId: "link-admin-marketing" },
      { href: "/admin/ab-tests", label: "A/B Tests", description: "Experiments & variants", icon: FlaskConical, testId: "link-admin-ab-tests" },
      { href: "/admin/lifecycle-campaigns", label: "Lifecycle", description: "Journey campaigns", icon: Mail, testId: "link-admin-lifecycle-campaigns" },
      { href: "/admin/segmentation", label: "Segments", description: "Users & personalization", icon: UsersRound, testId: "link-admin-segmentation" },
      { href: "/admin/promos", label: "Promotions", description: "Offers & rewards", icon: Percent, testId: "link-admin-promos" },
    ],
  },
  {
    id: "safety",
    title: "User Safety",
    icon: HeartPulse,
    items: [
      { href: "/admin/user-health", label: "User Health", description: "At-risk users & interventions", icon: HeartPulse, testId: "link-admin-user-health" },
      { href: "/admin/support", label: "Support", description: "Tickets, AI chat & escalations", icon: MessageCircle, testId: "link-admin-support" },
      { href: "/admin/fraud", label: "Fraud Detection", description: "Trial abuse & fingerprinting", icon: ShieldAlert, testId: "link-admin-fraud" },
      { href: "/admin/growth", label: "Growth Trends", description: "User growth & engagement", icon: Activity, testId: "link-admin-growth" },
    ],
  },
];

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [grantAccessDialogOpen, setGrantAccessDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState<'pro' | 'elite' | 'whale'>('pro');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [errorLevelFilter, setErrorLevelFilter] = useState<string>("all");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: snapshot, isLoading: snapshotLoading } = useQuery<any>({
    queryKey: ["/api/admin/console-snapshot"],
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: fraudAlerts = [], isLoading: alertsLoading } = useQuery<FraudAlert[]>({
    queryKey: ['/api/admin/fraud-alerts'],
  });

  const errorQueryUrl = errorLevelFilter === "all" 
    ? '/api/admin/error-logs' 
    : `/api/admin/error-logs?level=${errorLevelFilter}`;

  const { data: errorLogs = [], isLoading: errorsLoading, refetch: refetchErrors } = useQuery<ErrorLog[]>({
    queryKey: ['/api/admin/error-logs', errorLevelFilter],
    queryFn: async () => {
      const res = await fetch(errorQueryUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch error logs');
      return res.json();
    }
  });

  const { data: errorStats } = useQuery<ErrorStats>({
    queryKey: ['/api/admin/error-stats'],
  });

  const { data: subscriptionStats } = useQuery<SubscriptionStats>({
    queryKey: ['/api/admin/subscription-stats'],
  });


  const visibleAlerts = useMemo(() => {
    if (!snapshot?.alerts) return [];
    const severityOrder: Record<string, number> = { critical: 0, high: 0, warning: 1, medium: 1, info: 2, low: 3 };
    return snapshot.alerts
      .filter((a: any) => !dismissedAlerts.has(a.id))
      .sort((a: any, b: any) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }, [snapshot?.alerts, dismissedAlerts]);

  const grantAccessMutation = useMutation({
    mutationFn: async ({ username, tier }: { username: string; tier: 'pro' | 'elite' | 'whale' }) => {
      const response = await apiRequest('POST', '/api/admin/grant-access', { username, tier });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-stats'] });
      toast({ title: `Granted ${variables.tier.toUpperCase()} access to ${variables.username}` });
      setGrantAccessDialogOpen(false);
      setSelectedUser(null);
      setSelectedTier('pro');
    },
    onError: () => {
      toast({ title: "Failed to grant access", variant: "destructive" });
    }
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest('POST', '/api/admin/revoke-access', { username });
      return response.json();
    },
    onSuccess: (_, username) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-stats'] });
      toast({ title: `Revoked premium access from ${username}` });
    },
    onError: () => {
      toast({ title: "Failed to revoke access", variant: "destructive" });
    }
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest('POST', '/api/admin/ban-user', { userId, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User banned successfully" });
      setBanDialogOpen(false);
      setBanReason("");
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    }
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', '/api/admin/unban-user', { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User unbanned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
    }
  });

  const clearErrorsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/admin/error-logs', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-stats'] });
      toast({ title: "Error logs cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear logs", variant: "destructive" });
    }
  });

  const testErrorMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/test-error', { 
        message: "Test error from admin dashboard",
        level: "error"
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-stats'] });
      toast({ title: `Test error created: ${data.errorId}` });
    }
  });

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 dark:bg-red-600 text-white';
      case 'high': return 'bg-orange-500 dark:bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white';
      case 'low': return 'bg-blue-500 dark:bg-blue-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'error': return <Badge variant="destructive">ERROR</Badge>;
      case 'warn': return <Badge variant="secondary">WARN</Badge>;
      case 'info': return <Badge variant="secondary">INFO</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 75) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 50) return <Badge variant="secondary">Medium Risk</Badge>;
    if (score >= 25) return <Badge variant="outline">Low Risk</Badge>;
    return <Badge variant="outline">Safe</Badge>;
  };

  const bannedCount = users.filter(u => u.isBanned).length;
  const highRiskCount = users.filter(u => u.riskScore >= 50).length;


  const getAlertBorderColor = (severity: string) => {
    switch (severity) {
      case 'critical': case 'high': return 'border-l-red-500';
      case 'warning': case 'medium': return 'border-l-orange-500';
      case 'info': case 'low': return 'border-l-blue-500';
      default: return 'border-l-muted-foreground';
    }
  };

  const getFeatureStatusBadge = (status: string) => {
    switch (status) {
      case 'OK': return <Badge variant="default" className="bg-green-600 text-white no-default-hover-elevate no-default-active-elevate">OK</Badge>;
      case 'DEGRADED': return <Badge variant="default" className="bg-yellow-500 text-black no-default-hover-elevate no-default-active-elevate">DEGRADED</Badge>;
      case 'DOWN': return <Badge variant="destructive">DOWN</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-full" data-testid="admin-command-center" data-view="command">
      <div className="sticky top-14 z-30 bg-background border-b">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold whitespace-nowrap" data-testid="heading-admin">
                Command Center
              </h1>
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
                {navCategories.map((category) => (
                  <DropdownMenu key={category.id}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5 shrink-0" data-testid={`dropdown-${category.id}`}>
                        <category.icon className="h-3.5 w-3.5" />
                        {category.title}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">{category.title}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {category.items.map((item) => (
                        <DropdownMenuItem key={item.href} asChild className="gap-2 cursor-pointer" data-testid={item.testId}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {snapshot?.executive?.criticalAlerts > 0 && (
                <Badge variant="destructive" className="text-xs" data-testid="badge-critical-alerts">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {snapshot.executive.criticalAlerts} Critical
                </Badge>
              )}
              {(errorStats?.last24Hours || 0) > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-error-count">
                  <Bug className="h-3 w-3 mr-1" />
                  {errorStats?.last24Hours} Errors
                </Badge>
              )}
              <Badge variant="outline" className="text-xs hidden md:flex" data-testid="stat-users-count">
                <Users className="h-3 w-3 mr-1" />
                {users.length} Users
              </Badge>
            </div>
          </div>
        </div>
        <div className="sm:hidden px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {navCategories.map((category) => (
              <DropdownMenu key={category.id}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 shrink-0" data-testid={`mobile-dropdown-${category.id}`}>
                    <category.icon className="h-3 w-3" />
                    {category.title}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {category.items.map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="gap-2 cursor-pointer" data-testid={`mobile-${item.testId}`}>
                      <Link href={item.href}>
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
          {snapshotLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-7 w-12" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : snapshot?.executive && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="executive-snapshot-row">
              <Card data-testid="card-runway">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Runway</p>
                  <p className="text-2xl font-bold mt-1" data-testid="stat-runway">
                    {snapshot.executive.runwayMonths?.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">mo</span>
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-margin">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-2xl font-bold mt-1" data-testid="stat-margin">
                    {snapshot.executive.marginTrend?.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-reserve">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Reserve Ratio</p>
                  <p className="text-2xl font-bold mt-1" data-testid="stat-reserve">
                    {snapshot.executive.reserveRatio?.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-critical-alerts">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Critical Alerts</p>
                  <p className={`text-2xl font-bold mt-1 ${snapshot.executive.criticalAlerts > 0 ? 'text-red-500' : ''}`} data-testid="stat-critical-alerts">
                    {snapshot.executive.criticalAlerts}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-incidents">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Open Incidents</p>
                  <p className={`text-2xl font-bold mt-1 ${snapshot.executive.openIncidents > 0 ? 'text-orange-500' : ''}`} data-testid="stat-incidents">
                    {snapshot.executive.openIncidents}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-pipeline">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pipeline</p>
                  <div className="mt-2">
                    <Badge
                      variant={
                        snapshot.executive.pipelineStatus === 'healthy' ? 'default' :
                        snapshot.executive.pipelineStatus === 'degraded' ? 'secondary' : 'destructive'
                      }
                      data-testid="stat-pipeline"
                    >
                      {snapshot.executive.pipelineStatus || 'unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {visibleAlerts.length > 0 && (
            <div data-testid="alerts-section">
              <button
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                data-testid="button-toggle-alerts"
              >
                {alertsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Active Alerts ({visibleAlerts.length})
              </button>
              {alertsExpanded && (
                <div className="space-y-2">
                  {visibleAlerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`border-l-4 ${getAlertBorderColor(alert.severity)} pl-3 py-3 flex items-start justify-between gap-3`}
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant={['critical','high'].includes(alert.severity) ? 'destructive' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.metric}: {alert.value} (threshold: {alert.threshold})
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Remediation: {alert.remediation}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDismissedAlerts(prev => { const next = new Set(Array.from(prev)); next.add(alert.id); return next; })}
                        data-testid={`button-dismiss-alert-${alert.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!snapshotLoading && snapshot && (
            snapshot.latestAiReport ? (
              <Card data-testid="card-ai-report">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">AI Operations Report</p>
                        <ul className="mt-1 space-y-1">
                          {snapshot.latestAiReport.summary.slice(0, 3).map((s: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-1">
                          {snapshot.latestAiReport.taskCount} tasks &middot; {new Date(snapshot.latestAiReport.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Link href="/admin/assistant">
                      <Button size="sm" variant="outline" data-testid="button-view-report">
                        View Full Report
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed" data-testid="card-ai-no-report">
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No AI analysis available. Run the assistant for operational insights.</p>
                  </div>
                  <Link href="/admin/assistant">
                    <Button size="sm" data-testid="button-run-ai">
                      <Play className="h-4 w-4 mr-1" />Run AI Analysis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          )}

          <Tabs defaultValue="financials" data-testid="ops-tabs">
            <ScrollArea className="w-full">
              <TabsList className="flex-wrap" data-testid="tabs-list">
                <TabsTrigger value="financials" data-testid="tab-financials">
                  <DollarSign className="h-3.5 w-3.5 mr-1" />Financials
                </TabsTrigger>
                <TabsTrigger value="risk" data-testid="tab-risk">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />Risk
                </TabsTrigger>
                <TabsTrigger value="features" data-testid="tab-features">
                  <Activity className="h-3.5 w-3.5 mr-1" />Features
                </TabsTrigger>
                <TabsTrigger value="models" data-testid="tab-models">
                  <Brain className="h-3.5 w-3.5 mr-1" />Models
                </TabsTrigger>
                <TabsTrigger value="compliance" data-testid="tab-compliance">
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />Compliance
                </TabsTrigger>
                <TabsTrigger value="ops" data-testid="tab-ops">
                  <Server className="h-3.5 w-3.5 mr-1" />Ops
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users">
                  <Users className="h-3.5 w-3.5 mr-1" />Users
                </TabsTrigger>
                <TabsTrigger value="manage" data-testid="tab-manage">
                  <Settings className="h-3.5 w-3.5 mr-1" />Manage
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="financials" className="space-y-4">
              {snapshotLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : snapshot?.financials ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <Card data-testid="card-handle-24h">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Handle (24h)</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-handle-24h">
                          ${snapshot.financials.handle24h?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-handle-7d">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Handle (7d)</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-handle-7d">
                          ${snapshot.financials.handle7d?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-handle-30d">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Handle (30d)</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-handle-30d">
                          ${snapshot.financials.handle30d?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-gross-win">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Gross Win</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-gross-win">
                          ${snapshot.financials.grossWin?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-margin">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-fin-margin">
                          {snapshot.financials.margin?.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-payout-rate">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Payout Rate</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-payout-rate">
                          {snapshot.financials.payoutRate?.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-cash">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Cash on Hand</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-cash">
                          ${snapshot.financials.cashOnHand?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-fin-reserve">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Reserve Ratio</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-fin-reserve">
                          {snapshot.financials.reserveRatio}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card data-testid="card-runway-detail">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-medium">Runway</p>
                          <p className="text-xs text-muted-foreground">Current cash position vs monthly burn</p>
                        </div>
                        <p className="text-2xl font-bold" data-testid="stat-fin-runway">
                          {snapshot.financials.runwayMonths}<span className="text-sm font-normal text-muted-foreground ml-1">months</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No financial data available</div>
              )}
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              {snapshotLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : snapshot?.exposure?.length > 0 ? (
                <Card data-testid="card-exposure-table">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Market Exposure</CardTitle>
                    <CardDescription>Current liability across markets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Market</TableHead>
                            <TableHead className="text-right">Liability</TableHead>
                            <TableHead className="text-right">Limit %</TableHead>
                            <TableHead className="text-right">Threshold %</TableHead>
                            <TableHead>Proximity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.exposure.map((row: any, i: number) => {
                            const proximity = row.threshold > 0 ? (row.limitPct / row.threshold) * 100 : 0;
                            const isNearThreshold = proximity >= 80;
                            return (
                              <TableRow
                                key={i}
                                className={isNearThreshold ? 'bg-red-500/5' : ''}
                                data-testid={`row-exposure-${i}`}
                              >
                                <TableCell className="font-medium">{row.market}</TableCell>
                                <TableCell className="text-right font-mono">${row.liability?.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono">{row.limitPct?.toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-mono">{row.threshold?.toFixed(1)}%</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={Math.min(proximity, 100)}
                                      className={`h-2 w-24 ${isNearThreshold ? '[&>div]:bg-red-500' : ''}`}
                                      data-testid={`progress-exposure-${i}`}
                                    />
                                    <span className={`text-xs font-mono ${isNearThreshold ? 'text-red-500' : 'text-muted-foreground'}`}>
                                      {proximity.toFixed(0)}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No exposure data available</div>
              )}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              {snapshotLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : snapshot?.featureHealth?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {snapshot.featureHealth.map((feature: any, i: number) => (
                    <Card key={i} data-testid={`card-feature-${i}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{feature.name}</p>
                          {getFeatureStatusBadge(feature.status)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Health</span>
                            <span className="font-mono">{feature.healthScore}%</span>
                          </div>
                          <Progress value={feature.healthScore} className="h-1.5" data-testid={`progress-health-${i}`} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
                          <span>Owner: {feature.owner}</span>
                          <Badge variant="outline" className="text-[10px]">{feature.complianceStatus}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Checked: {new Date(feature.lastChecked).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No feature health data available</div>
              )}
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              {snapshotLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : snapshot?.modelHealth?.length > 0 ? (
                <Card data-testid="card-models-table">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Model Performance</CardTitle>
                    <CardDescription>Accuracy, calibration, and retrain status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model ID</TableHead>
                            <TableHead className="text-right">Accuracy</TableHead>
                            <TableHead className="text-right">Precision</TableHead>
                            <TableHead className="text-right">Recall</TableHead>
                            <TableHead className="text-right">F1</TableHead>
                            <TableHead className="text-right">Calibration</TableHead>
                            <TableHead className="text-right">Predictions</TableHead>
                            <TableHead>Last Retrain</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.modelHealth.map((model: any, i: number) => (
                            <TableRow key={i} data-testid={`row-model-${i}`}>
                              <TableCell className="font-medium font-mono text-xs">{model.modelId}</TableCell>
                              <TableCell className="text-right font-mono">{(model.accuracy * 100).toFixed(1)}%</TableCell>
                              <TableCell className="text-right font-mono">{(model.precision * 100).toFixed(1)}%</TableCell>
                              <TableCell className="text-right font-mono">{(model.recall * 100).toFixed(1)}%</TableCell>
                              <TableCell className="text-right font-mono">{(model.f1Score * 100).toFixed(1)}%</TableCell>
                              <TableCell className="text-right font-mono">{model.calibration?.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-mono">{model.totalPredictions?.toLocaleString()}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(model.lastRetrain).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No model health data available</div>
              )}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              {snapshotLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : snapshot?.compliance ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Card data-testid="card-open-flags">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Open Flags</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-open-flags">
                          {snapshot.compliance.openFlags}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-blocked">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Blocked Accounts</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-blocked">
                          {snapshot.compliance.blockedAccounts}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-cleared">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Cleared Cases</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-cleared">
                          {snapshot.compliance.clearedCases}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-avg-risk">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Avg Risk Score</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-avg-risk">
                          {snapshot.compliance.avgRiskScore?.toFixed(1)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-fraud-rate">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Fraud Rate</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-fraud-rate">
                          {snapshot.compliance.fraudRate?.toFixed(2)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-signups">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Signups/Hour</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-signups">
                          {snapshot.compliance.signupsLastHour}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Link href="/admin/fraud">
                    <Button variant="outline" size="sm" data-testid="button-full-fraud">
                      <ShieldAlert className="h-4 w-4 mr-1" />View Full Fraud Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No compliance data available</div>
              )}
            </TabsContent>

            <TabsContent value="ops" className="space-y-4">
              {snapshotLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {snapshot?.infrastructure?.health && (
                    <Card data-testid="card-infra-health">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Cpu className="h-4 w-4" />Infrastructure Health
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {Object.entries(snapshot.infrastructure.health).map(([key, val]: [string, any]) => (
                            <div key={key} data-testid={`stat-infra-${key}`}>
                              <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                              <p className="text-lg font-bold mt-1">
                                {typeof val === 'number' ? (val > 1 ? val.toFixed(0) : `${(val * 100).toFixed(1)}%`) : String(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {snapshot?.infrastructure?.slos?.length > 0 && (
                    <Card data-testid="card-slos">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />SLO Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {snapshot.infrastructure.slos.map((slo: any, i: number) => (
                            <div key={i} className="p-3 border rounded-md" data-testid={`slo-${i}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                <p className="text-sm font-medium truncate">{slo.name || slo.metric || `SLO ${i + 1}`}</p>
                                <Badge variant={slo.status === 'met' || slo.status === 'pass' ? 'default' : 'destructive'}>
                                  {slo.status}
                                </Badge>
                              </div>
                              {slo.current !== undefined && (
                                <div className="space-y-1">
                                  <Progress value={Math.min(slo.current, 100)} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground">
                                    Current: {slo.current}% / Target: {slo.target}%
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {snapshot?.infrastructure?.recentErrors?.length > 0 && (
                    <Card data-testid="card-recent-errors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bug className="h-4 w-4" />Recent Errors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {snapshot.infrastructure.recentErrors.slice(0, 10).map((err: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-2 border rounded-md" data-testid={`error-item-${i}`}>
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm truncate">{err.message || err.error || String(err)}</p>
                                {err.timestamp && (
                                  <p className="text-xs text-muted-foreground">{new Date(err.timestamp).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {snapshot?.infrastructure?.endpointPerf?.length > 0 && (
                    <Card data-testid="card-endpoint-perf">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Endpoint Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Endpoint</TableHead>
                                <TableHead className="text-right">Avg Speed</TableHead>
                                <TableHead className="text-right">P95</TableHead>
                                <TableHead className="text-right">Requests</TableHead>
                                <TableHead className="text-right">Error Rate</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {snapshot.infrastructure.endpointPerf.map((ep: any, i: number) => (
                                <TableRow key={i} data-testid={`row-endpoint-${i}`}>
                                  <TableCell className="font-mono text-xs">{ep.endpoint || ep.path}</TableCell>
                                  <TableCell className="text-right font-mono">{ep.avgLatency || ep.avg}ms</TableCell>
                                  <TableCell className="text-right font-mono">{ep.p95 || ep.p95Latency}ms</TableCell>
                                  <TableCell className="text-right font-mono">{ep.requests?.toLocaleString() || ep.count}</TableCell>
                                  <TableCell className="text-right font-mono">{ep.errorRate?.toFixed(2) || 0}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!snapshot?.infrastructure && (
                    <div className="text-center py-12 text-muted-foreground">No infrastructure data available</div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {snapshotLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {snapshot?.users && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Card data-testid="card-active-users">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Active Users</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-active-users">
                            {snapshot.users.activeUsers?.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="card-new-users">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">New Users</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-new-users">
                            {snapshot.users.newUsers?.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="card-churn">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Churn Rate</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-churn">
                            {snapshot.users.churnRate?.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <Card data-testid="card-user-mgmt">
                    <CardHeader className="px-4 sm:px-6 pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <CardTitle className="text-base">User Management</CardTitle>
                          <CardDescription className="text-sm">{users.length} registered users</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs" data-testid="stat-total-users">
                          {users.length} total
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            data-testid="input-search-users"
                          />
                        </div>
                      </div>

                      {usersLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No users found</div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <div 
                              key={user.id} 
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-md"
                              data-testid={`row-user-${user.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{user.username}</span>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                    {user.role}
                                  </Badge>
                                  {user.isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {getRiskBadge(user.riskScore)}
                                  <Badge variant="outline" className="text-xs">{user.subscriptionTier}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {user.role !== 'admin' && (
                                  user.isBanned ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => unbanMutation.mutate(user.id)}
                                      disabled={unbanMutation.isPending}
                                      data-testid={`button-unban-${user.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Unban
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setBanDialogOpen(true);
                                      }}
                                      data-testid={`button-ban-${user.id}`}
                                    >
                                      <Ban className="h-4 w-4 mr-1" />
                                      Ban
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">Free</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-free-users">{subscriptionStats?.free || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">Pro</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-pro-users">{subscriptionStats?.pro || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">Elite</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-elite-users">{subscriptionStats?.elite || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">Whale</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-whale-users">{subscriptionStats?.whale || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Grant Free Access
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Give users free premium access ({subscriptionStats?.grantedFree || 0} currently granted)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users to grant access..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-grant-access"
                      />
                    </div>
                  </div>

                  {usersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No users found</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.filter(u => u.role !== 'admin').map((user) => (
                        <div 
                          key={user.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-md"
                          data-testid={`row-grant-${user.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{user.username}</span>
                              <Badge variant={user.subscriptionTier === 'free' ? 'secondary' : 'default'}>
                                {user.subscriptionTier?.toUpperCase() || 'FREE'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {user.subscriptionTier === 'free' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setGrantAccessDialogOpen(true);
                                }}
                                data-testid={`button-grant-${user.id}`}
                              >
                                <Gift className="h-4 w-4 mr-1" />
                                Grant Access
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeAccessMutation.mutate(user.username)}
                                disabled={revokeAccessMutation.isPending}
                                data-testid={`button-revoke-${user.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <FeatureFlagsPanel />
              <AuditTrailPanel />
            </TabsContent>
          </Tabs>
        </div>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedUser?.username}? They will no longer be able to access their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for ban</label>
              <Textarea
                placeholder="Enter the reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-2"
                data-testid="input-ban-reason"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBanDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedUser && banReason) {
                  banMutation.mutate({ userId: selectedUser.id, reason: banReason });
                }
              }}
              disabled={!banReason || banMutation.isPending}
              data-testid="button-confirm-ban"
              className="w-full sm:w-auto"
            >
              {banMutation.isPending ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={grantAccessDialogOpen} onOpenChange={setGrantAccessDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Grant Free Access
            </DialogTitle>
            <DialogDescription>
              Grant premium access to {selectedUser?.username} without payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Tier</label>
              <Select 
                value={selectedTier} 
                onValueChange={(value: 'pro' | 'elite' | 'whale') => setSelectedTier(value)}
              >
                <SelectTrigger className="mt-2" data-testid="select-tier">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro ($29/mo value)</SelectItem>
                  <SelectItem value="elite">Elite ($99/mo value)</SelectItem>
                  <SelectItem value="whale">Whale ($499/mo value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-md bg-muted text-sm">
              <p className="font-medium mb-1">Tier Benefits:</p>
              {selectedTier === 'pro' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Unlimited tickets</li>
                  <li>All 46 analysis factors</li>
                  <li>14 sports coverage</li>
                  <li>Basic alerts</li>
                </ul>
              )}
              {selectedTier === 'elite' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Everything in Pro</li>
                  <li>Real-time alerts</li>
                  <li>AI betting assistant</li>
                  <li>CLV tracking</li>
                  <li>ML projections</li>
                </ul>
              )}
              {selectedTier === 'whale' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Everything in Elite</li>
                  <li>VIP picks</li>
                  <li>1-on-1 coaching</li>
                  <li>Priority support</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setGrantAccessDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedUser) {
                  grantAccessMutation.mutate({ username: selectedUser.username, tier: selectedTier });
                }
              }}
              disabled={grantAccessMutation.isPending}
              data-testid="button-confirm-grant"
              className="w-full sm:w-auto"
            >
              {grantAccessMutation.isPending ? "Granting..." : `Grant ${selectedTier?.toUpperCase() || 'ACCESS'} Access`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && getLogLevelIcon(selectedError.level)}
              Error Details
            </DialogTitle>
            <DialogDescription>
              {selectedError?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <p className="font-medium break-words">{selectedError.message}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Level</label>
                    <div>{getLogLevelBadge(selectedError.level)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="text-sm">{new Date(selectedError.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {(selectedError.path || selectedError.method) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Request</label>
                    <p className="text-sm font-mono">{selectedError.method} {selectedError.path}</p>
                  </div>
                )}

                {selectedError.ip && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <p className="text-sm font-mono">{selectedError.ip}</p>
                  </div>
                )}

                {selectedError.userId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-sm font-mono">{selectedError.userId}</p>
                  </div>
                )}

                {selectedError.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <p className="text-sm text-muted-foreground break-words">{selectedError.userAgent}</p>
                  </div>
                )}

                {selectedError.stack && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedError(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureFlagsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flagsData, isLoading } = useQuery<{ flags: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
  }> }>({
    queryKey: ['/api/feature-flags'],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      await apiRequest("PUT", `/api/admin/feature-flags/${flagId}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-flags'] });
      toast({ title: "Feature flag updated" });
    },
    onError: () => {
      toast({ title: "Failed to update flag", variant: "destructive" });
    },
  });

  const killMutation = useMutation({
    mutationFn: async (flagId: string) => {
      await apiRequest("POST", `/api/admin/feature-flags/${flagId}/kill`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-flags'] });
      toast({ title: "Kill switch activated", variant: "destructive" });
    },
  });

  const flags = flagsData?.flags || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>Control feature rollouts and emergency kill switches</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading flags...</p>
        ) : (
          <div className="space-y-2">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-4 p-3 rounded-md border flex-wrap"
                data-testid={`flag-${flag.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{flag.name}</p>
                  <p className="text-xs text-muted-foreground">{flag.description}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {flag.rolloutPercentage}% rollout
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ flagId: flag.id, enabled: checked })
                    }
                    data-testid={`switch-flag-${flag.id}`}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => killMutation.mutate(flag.id)}
                    disabled={!flag.enabled}
                    data-testid={`button-kill-${flag.id}`}
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTrailPanel() {
  const { data: auditData, isLoading } = useQuery<{
    entries: Array<{
      id: string;
      timestamp: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    }>;
    total: number;
  }>({
    queryKey: ['/api/audit/entries'],
  });

  const { data: auditStats } = useQuery<{
    total: number;
    actionCounts: Record<string, number>;
    uniqueUsers: number;
  }>({
    queryKey: ['/api/audit/stats'],
  });

  const entries = auditData?.entries || [];

  const getActionBadge = (action: string) => {
    const safetyActions = ["ticket_rejected", "bet_cancelled", "account_deletion", "session_revoked"];
    const successActions = ["ticket_accepted", "ticket_generated", "bet_placed", "login"];
    if (safetyActions.includes(action)) return "destructive" as const;
    if (successActions.includes(action)) return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-4">
      {auditStats && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold" data-testid="stat-audit-total">{auditStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold" data-testid="stat-audit-users">{auditStats.uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold" data-testid="stat-audit-types">{Object.keys(auditStats.actionCounts).length}</p>
              <p className="text-xs text-muted-foreground">Action Types</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Trail
          </CardTitle>
          <CardDescription>Complete log of user decisions and system actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit trail...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No audit entries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 50).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 border rounded-md text-sm"
                  data-testid={`audit-entry-${entry.id}`}
                >
                  <Badge variant={getActionBadge(entry.action)} className="text-xs shrink-0">
                    {entry.action.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-muted-foreground shrink-0">{entry.entityType}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{entry.entityId}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
