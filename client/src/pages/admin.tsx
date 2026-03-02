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
  Rocket,
  Sparkles,
  BookOpen,
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
import { useSEO } from "@/hooks/use-seo";

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
      { href: "/admin/owner-playbook", label: "Owner's Playbook", description: "Launch plan, daily ops, growth & legal guide", icon: BookOpen, testId: "link-admin-owner-playbook" },
      { href: "/admin/launch-control", label: "Launch Control", description: "Pre-launch checklist & maintenance mode", icon: Rocket, testId: "link-admin-launch-control" },
      { href: "/admin/assistant", label: "AI Assistant", description: "AI-powered ops briefings & tasks", icon: Bot, testId: "link-admin-assistant" },
      { href: "/admin/guardian", label: "App Guardian", description: "Health monitoring, auto-heal & alerts", icon: Shield, testId: "link-admin-guardian" },
      { href: "/admin/applications", label: "Applications", description: "Review and approve member applications", icon: UsersRound, testId: "link-admin-applications" },
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
      { href: "/admin/pricing-intelligence", label: "Pricing & Wealth", description: "Revenue optimization & owner projections", icon: DollarSign, testId: "link-admin-pricing-intelligence" },
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
  useSEO({ title: "Admin Dashboard", description: "Platform administration and management hub" });
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
    refetchInterval: 15000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000,
  });

  const { data: fraudAlerts = [], isLoading: alertsLoading } = useQuery<FraudAlert[]>({
    queryKey: ['/api/admin/fraud-alerts'],
    refetchInterval: 20000,
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
    },
    refetchInterval: 15000,
  });

  const { data: errorStats } = useQuery<ErrorStats>({
    queryKey: ['/api/admin/error-stats'],
    refetchInterval: 15000,
  });

  const { data: subscriptionStats } = useQuery<SubscriptionStats>({
    queryKey: ['/api/admin/subscription-stats'],
  });

  const { data: intelHealth, isLoading: intelLoading } = useQuery<any>({
    queryKey: ['/api/admin/intelligence-health'],
    refetchInterval: 15000,
  });

  const { data: bdlStats, isLoading: bdlLoading } = useQuery<any>({
    queryKey: ['/api/admin/bdl-stats'],
    refetchInterval: 120_000,
    staleTime: 60_000,
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
              <Card data-testid="card-revenue">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold mt-1" data-testid="stat-revenue">
                    ${snapshot.executive.monthlyRevenue?.toLocaleString() ?? 0}
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
              <Card data-testid="card-systems">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Systems</p>
                  <div className="mt-2">
                    <Badge
                      variant={
                        (snapshot as any).systems?.filter((s: any) => s.status === 'running' || s.status === 'healthy').length === (snapshot as any).systems?.length ? 'default' :
                        'secondary'
                      }
                      data-testid="stat-systems"
                    >
                      {(snapshot as any).systems?.filter((s: any) => s.status === 'running' || s.status === 'healthy').length || 0}/{(snapshot as any).systems?.length || 0} up
                    </Badge>
                  </div>
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
                  <Brain className="h-3.5 w-3.5 mr-1" />Intelligence
                </TabsTrigger>
                <TabsTrigger value="compliance" data-testid="tab-compliance">
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />Compliance
                </TabsTrigger>
                <TabsTrigger value="systems" data-testid="tab-systems">
                  <Cpu className="h-3.5 w-3.5 mr-1" />Systems
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
                <TabsTrigger value="pick-accuracy" data-testid="tab-pick-accuracy">
                  <Target className="h-3.5 w-3.5 mr-1" />Pick Accuracy
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
                    <Card data-testid="card-monthly-revenue">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-monthly-revenue">
                          ${snapshot.financials.monthlyRevenue?.toLocaleString() ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-paid-users">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Paid Subscribers</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-paid-users">
                          {snapshot.financials.paidUsers ?? 0}
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
                          {snapshot.financials.reserveRatio}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-runway-detail">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Runway</p>
                        <p className="text-xl font-bold mt-1" data-testid="stat-fin-runway">
                          {snapshot.financials.runwayMonths}<span className="text-sm font-normal text-muted-foreground ml-1">mo</span>
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  {snapshot.financials.revenueBreakdown && (
                    <Card data-testid="card-revenue-breakdown">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Revenue by Tier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 border rounded-md" data-testid="rev-pro">
                            <p className="text-xs text-muted-foreground">Pro ($49/mo)</p>
                            <p className="text-lg font-bold">${snapshot.financials.revenueBreakdown.pro?.toLocaleString() ?? 0}</p>
                          </div>
                          <div className="p-3 border rounded-md" data-testid="rev-elite">
                            <p className="text-xs text-muted-foreground">Elite ($99/mo)</p>
                            <p className="text-lg font-bold">${snapshot.financials.revenueBreakdown.elite?.toLocaleString() ?? 0}</p>
                          </div>
                          <div className="p-3 border rounded-md" data-testid="rev-whale">
                            <p className="text-xs text-muted-foreground">Whale ($249/mo)</p>
                            <p className="text-lg font-bold">${snapshot.financials.revenueBreakdown.whale?.toLocaleString() ?? 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
                    <CardTitle className="text-base">Sport Coverage</CardTitle>
                    <CardDescription>Live data coverage across sports from Intelligence Hub</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sport</TableHead>
                            <TableHead className="text-right">Picks</TableHead>
                            <TableHead className="text-right">Hub Games</TableHead>
                            <TableHead>Market Data</TableHead>
                            <TableHead>Data Age</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.exposure.map((row: any, i: number) => (
                            <TableRow key={i} data-testid={`row-exposure-${i}`}>
                              <TableCell className="font-medium">{row.market}</TableCell>
                              <TableCell className="text-right font-mono">{row.pickCount}</TableCell>
                              <TableCell className="text-right font-mono">{row.hubGames}</TableCell>
                              <TableCell>
                                <Badge variant={row.hasMarketData ? 'default' : 'secondary'}>
                                  {row.hasMarketData ? 'Live' : 'No Data'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">{row.dataAge}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No sport coverage data available</div>
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
              {intelLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
              ) : intelHealth ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="intel-summary-row">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <Cpu className="w-3 h-3" /> Engines
                        </div>
                        <div className="text-2xl font-bold" data-testid="stat-engines-running">
                          {intelHealth.summary.enginesRunning}/{intelHealth.summary.enginesTotal}
                        </div>
                        <Badge
                          variant={intelHealth.summary.allHealthy ? "default" : "destructive"}
                          className={intelHealth.summary.allHealthy ? "bg-green-600 text-white mt-1" : "mt-1"}
                          data-testid="badge-engine-health"
                        >
                          {intelHealth.summary.allHealthy ? "All Healthy" : "Needs Attention"}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <Target className="w-3 h-3" /> Hit Rate
                        </div>
                        <div className="text-2xl font-bold" data-testid="stat-intel-hit-rate">
                          {(intelHealth.summary?.totalPredictions || 0) > 0 ? `${((intelHealth.summary?.hitRate ?? 0) * 100).toFixed(1)}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">{intelHealth.summary.totalPredictions} predictions, {intelHealth.summary.totalWins} wins</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <Zap className="w-3 h-3" /> Picks Cached
                        </div>
                        <div className="text-2xl font-bold" data-testid="stat-picks-cached">{intelHealth.summary.totalPicks}</div>
                        <p className="text-xs text-muted-foreground">{intelHealth.summary.totalGames} games tracked</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <Activity className="w-3 h-3" /> Drift
                        </div>
                        <div className="text-2xl font-bold" data-testid="stat-drift-status">
                          {(intelHealth.summary.calibrationDrift ?? 0).toFixed(3)}
                        </div>
                        <Badge
                          variant={intelHealth.summary.driftStatus === "stable" ? "default" : "destructive"}
                          className={intelHealth.summary.driftStatus === "stable" ? "bg-green-600 text-white mt-1" : "mt-1"}
                          data-testid="badge-drift-status"
                        >
                          {intelHealth.summary.driftStatus === "stable" ? "Stable" : "Drifting"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Card data-testid="card-engine-status">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Server className="h-4 w-4" /> Engine Status
                      </CardTitle>
                      <CardDescription>Real-time status of all intelligence and learning engines</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {intelHealth.engines.map((eng: any, i: number) => {
                          const isUp = eng.status === "running" || eng.status === "healthy";
                          return (
                            <div key={i} className="border rounded-lg p-3 space-y-1" data-testid={`engine-card-${i}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate">{eng.name}</span>
                                <span className={`w-2 h-2 rounded-full ${isUp ? "bg-green-500" : "bg-red-500"}`} />
                              </div>
                              <p className="text-xs text-muted-foreground">{eng.detail}</p>
                              {eng.lastActivity && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  Last: {new Date(eng.lastActivity).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card data-testid="card-orchestrator-detail">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" /> Learning Orchestrator
                        </CardTitle>
                        <CardDescription>Settlement, retraining, weight sync cycles</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={intelHealth.orchestrator.isRunning ? "default" : "destructive"} className={intelHealth.orchestrator.isRunning ? "bg-green-600 text-white" : ""} data-testid="badge-orch-status">
                              {intelHealth.orchestrator.isRunning ? "Running" : "Stopped"}
                            </Badge>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Cycles</span>
                            <span className="font-mono" data-testid="value-orch-cycles">{intelHealth.orchestrator.totalCycles}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Settled</span>
                            <span className="font-mono" data-testid="value-orch-settled">{intelHealth.orchestrator.totalSettled}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Retrained</span>
                            <span className="font-mono" data-testid="value-orch-retrained">{intelHealth.orchestrator.totalRetrained}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Weight Syncs</span>
                            <span className="font-mono" data-testid="value-orch-syncs">{intelHealth.orchestrator.totalWeightSyncs}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Last Settlement</span>
                            <span className="font-mono text-xs" data-testid="value-orch-last-settle">
                              {intelHealth.orchestrator.lastSettlementRun ? new Date(intelHealth.orchestrator.lastSettlementRun).toLocaleTimeString() : "Never"}
                            </span>
                          </div>
                        </div>
                        {Object.keys(intelHealth.orchestrator.accuracyBySport).length > 0 && (
                          <div className="space-y-1 pt-2">
                            <p className="text-xs font-medium text-muted-foreground">Accuracy by Sport</p>
                            {Object.entries(intelHealth.orchestrator.accuracyBySport).map(([sport, data]: [string, any]) => (
                              <div key={sport} className="flex items-center justify-between text-xs">
                                <span className="uppercase font-medium">{sport}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={data.accuracy * 100} className="w-20 h-1.5" />
                                  <span className="font-mono w-12 text-right">{(data.accuracy * 100).toFixed(1)}%</span>
                                  <span className="text-muted-foreground">({data.correct}/{data.total})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {intelHealth.orchestrator.errors.length > 0 && (
                          <div className="pt-2 space-y-1">
                            <p className="text-xs font-medium text-red-500">Recent Errors</p>
                            {intelHealth.orchestrator.errors.map((err: any, i: number) => (
                              <div key={i} className="text-[10px] text-red-400 font-mono truncate" data-testid={`orch-error-${i}`}>
                                [{err.module}] {err.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="card-learning-detail">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4" /> Learning Engine
                        </CardTitle>
                        <CardDescription>Factor weights and recent training activity</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={intelHealth.learning.isRunning ? "default" : "secondary"} className={intelHealth.learning.isRunning ? "bg-green-600 text-white" : ""} data-testid="badge-learning-status">
                              {intelHealth.learning.isRunning ? "Running" : "Idle"}
                            </Badge>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Cycles</span>
                            <span className="font-mono" data-testid="value-learning-cycles">{intelHealth.learning.cyclesCompleted}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Weights</span>
                            <span className="font-mono" data-testid="value-learning-weights">{intelHealth.learning.weightsCount}</span>
                          </div>
                        </div>
                        {intelHealth.learning.topWeights.length > 0 && (
                          <div className="space-y-1 pt-2">
                            <p className="text-xs font-medium text-muted-foreground">Top Factor Weights</p>
                            {intelHealth.learning.topWeights.map((w: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="truncate max-w-[140px]">{w.factor.replace(/_/g, " ")}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={Math.min(w.weight * 50, 100)} className="w-16 h-1.5" />
                                  <span className="font-mono w-10 text-right">{w.weight.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {intelHealth.learning.recentLogs.length > 0 && (
                          <div className="space-y-1 pt-2">
                            <p className="text-xs font-medium text-muted-foreground">Recent Training Logs</p>
                            {intelHealth.learning.recentLogs.map((log: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground font-mono" data-testid={`learning-log-${i}`}>
                                <span>{log.sport}</span>
                                <Badge variant={log.outcome === "win" ? "default" : "destructive"} className={`text-[9px] px-1.5 ${log.outcome === "win" ? "bg-green-600 text-white" : ""}`}>
                                  {log.outcome}
                                </Badge>
                                <span>{(log.confidence * 100).toFixed(0)}%</span>
                                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card data-testid="card-data-pipeline">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Database className="h-4 w-4" /> Data Pipeline
                        </CardTitle>
                        <CardDescription>Games tracked and picks generated by sport</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground border-b pb-1">
                            <span>Hub Cycles: <span className="font-mono font-medium text-foreground">{intelHealth.dataPipeline.hubCycles}</span></span>
                            <span>Engine Runs: <span className="font-mono font-medium text-foreground">{intelHealth.dataPipeline.precomputedRuns}</span></span>
                            {intelHealth.dataPipeline.failedRuns > 0 && (
                              <span className="text-red-500">Failed: {intelHealth.dataPipeline.failedRuns}</span>
                            )}
                          </div>
                          {Object.keys(intelHealth.dataPipeline.sportGames).length > 0 ? (
                            <div className="space-y-1">
                              {Object.keys(intelHealth.dataPipeline.sportGames).map((sport) => (
                                <div key={sport} className="flex items-center justify-between text-xs" data-testid={`pipeline-sport-${sport}`}>
                                  <span className="font-medium uppercase">{sport}</span>
                                  <div className="flex gap-4">
                                    <span className="text-muted-foreground">{intelHealth.dataPipeline.sportGames[sport]} games</span>
                                    <span className="font-mono">{intelHealth.dataPipeline.sportPicks[sport] || 0} picks</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No games currently tracked</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-prop-movements">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Prop Line Movements
                        </CardTitle>
                        <CardDescription>Sharp money detection and line movement tracking</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground border-b pb-1">
                            <span>Tracked: <span className="font-mono font-medium text-foreground">{intelHealth.propMovements.totalTracked}</span></span>
                            <span className="text-amber-500 font-medium">Sharp Alerts: {intelHealth.propMovements.sharpAlerts}</span>
                          </div>
                          {intelHealth.propMovements.recentMovements.length > 0 ? (
                            <div className="space-y-1">
                              {intelHealth.propMovements.recentMovements.map((m: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-[10px] font-mono" data-testid={`prop-movement-${i}`}>
                                  <span className="truncate max-w-[100px]">{m.player}</span>
                                  <span className="text-muted-foreground">{m.market}</span>
                                  <span className={m.velocity === "steam" || m.velocity === "fast" ? "text-red-500 font-bold" : ""}>
                                    {m.velocity}
                                  </span>
                                  <span>{m.lineShift > 0 ? "+" : ""}{m.lineShift.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No recent prop movements</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card data-testid="card-intel-quick-links">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Deep Dive</CardTitle>
                      <CardDescription>Detailed intelligence sub-dashboards</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Link href="/admin/model-performance">
                          <Button variant="outline" className="w-full justify-start gap-2" data-testid="link-deep-model-perf">
                            <Target className="h-4 w-4" /> Model Performance
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </Button>
                        </Link>
                        <Link href="/admin/orchestration">
                          <Button variant="outline" className="w-full justify-start gap-2" data-testid="link-deep-orchestration">
                            <Zap className="h-4 w-4" /> Orchestration Console
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </Button>
                        </Link>
                        <Link href="/admin/training">
                          <Button variant="outline" className="w-full justify-start gap-2" data-testid="link-deep-training">
                            <FlaskConical className="h-4 w-4" /> Training Center
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No intelligence data available</div>
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

            <TabsContent value="systems" className="space-y-4">
              {snapshotLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
              ) : (snapshot as any)?.systems?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(snapshot as any).systems.map((sys: any, i: number) => {
                    const isUp = sys.status === 'running' || sys.status === 'healthy';
                    const isDegraded = sys.status === 'degraded';
                    return (
                      <Card key={i} data-testid={`card-system-${i}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{sys.name}</p>
                            <Badge
                              variant={isUp ? 'default' : isDegraded ? 'secondary' : 'destructive'}
                              className={isUp ? 'bg-green-600 text-white' : ''}
                              data-testid={`badge-system-status-${i}`}
                            >
                              {sys.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Uptime</span>
                              <span className="font-mono">{sys.uptime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Cycle</span>
                              <span className="font-mono">{sys.lastCycle}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{sys.details}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No systems data available</div>
              )}

              {/* BDL & AI Insight Stats Panel */}
              <Card data-testid="card-bdl-ai-stats">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    BallDontLie Stats Integration
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {bdlStats?.counts?.nba || 0} NBA · {bdlStats?.counts?.nfl || 0} NFL · {bdlStats?.counts?.mlb || 0} MLB
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bdlLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  ) : bdlStats ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {["nba", "nfl", "mlb"].map(sport => (
                          <div key={sport} className={`rounded-lg p-2 border ${bdlStats.availability?.[sport] ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/30 border-border/40"}`} data-testid={`bdl-status-${sport}`}>
                            <p className="text-xs font-bold uppercase text-muted-foreground">{sport}</p>
                            <p className={`text-sm font-semibold mt-0.5 ${bdlStats.availability?.[sport] ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {bdlStats.availability?.[sport] ? `${bdlStats.counts?.[sport]} teams` : "Offline"}
                            </p>
                          </div>
                        ))}
                      </div>

                      {bdlStats.topNFLTeams?.length > 0 && (
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-2 font-medium">Top NFL Teams (by PPG)</p>
                          <div className="space-y-1">
                            {bdlStats.topNFLTeams.slice(0, 5).map((t: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono text-muted-foreground w-8">{t.abbreviation}</span>
                                <span className="flex-1 truncate">{t.name}</span>
                                <span className="text-emerald-400 font-mono">{t.ppg?.toFixed(1)} PPG</span>
                                <span className="text-red-400 font-mono">{t.papg?.toFixed(1)} PAPG</span>
                                <span className={`font-mono ${t.turnoverDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{t.turnoverDiff >= 0 ? "+" : ""}{t.turnoverDiff} TO</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {bdlStats.topMLBTeams?.length > 0 && (
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-2 font-medium">Top MLB Teams (by ERA)</p>
                          <div className="space-y-1">
                            {bdlStats.topMLBTeams.slice(0, 5).map((t: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono text-muted-foreground w-8">{t.abbreviation}</span>
                                <span className="flex-1 truncate">{t.name}</span>
                                <span className="text-blue-400 font-mono">{t.battingAvg?.toFixed(3)} AVG</span>
                                <span className="text-amber-400 font-mono">{t.era?.toFixed(2)} ERA</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">{bdlStats.aiInsightsCached || 0}</span> AI edge insights cached
                          {bdlStats.aiInsightsCached > 0 ? " — generating for top picks" : " — insights generated after next prediction cycle"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">BDL stats not available — check API key configuration</p>
                  )}
                </CardContent>
              </Card>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card data-testid="card-total-users">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Total Users</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-total-users-count">
                            {snapshot.users.totalUsers?.toLocaleString() ?? 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="card-paid-users-tab">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-paid-users-count">
                            {snapshot.users.paidUsers?.toLocaleString() ?? 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="card-free-users">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Free</p>
                          <p className="text-xl font-bold mt-1" data-testid="stat-free-users-count">
                            {snapshot.users.freeUsers?.toLocaleString() ?? 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="card-tier-breakdown">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Tier Split</p>
                          <p className="text-xs font-mono mt-1" data-testid="stat-tier-breakdown">
                            P:{snapshot.users.tierBreakdown?.pro ?? 0} E:{snapshot.users.tierBreakdown?.elite ?? 0} W:{snapshot.users.tierBreakdown?.whale ?? 0}
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

            <TabsContent value="pick-accuracy" className="space-y-4">
              <PickAccuracyPanel />
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
                  <SelectItem value="pro">Sharp ($49/mo value)</SelectItem>
                  <SelectItem value="elite">Edge ($99/mo value)</SelectItem>
                  <SelectItem value="whale">Max ($249/mo value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-md bg-muted text-sm">
              <p className="font-medium mb-1">Tier Benefits:</p>
              {selectedTier === 'pro' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Sharp tier ($49/mo)</li>
                  <li>Unlimited tickets</li>
                  <li>All 46 analysis factors</li>
                  <li>14 sports coverage</li>
                  <li>Basic alerts</li>
                </ul>
              )}
              {selectedTier === 'elite' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Edge tier ($99/mo)</li>
                  <li>Everything in Sharp</li>
                  <li>Real-time alerts</li>
                  <li>AI betting assistant</li>
                  <li>CLV tracking</li>
                  <li>ML projections</li>
                </ul>
              )}
              {selectedTier === 'whale' && (
                <ul className="text-muted-foreground space-y-1">
                  <li>Max tier ($249/mo)</li>
                  <li>Everything in Edge</li>
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

function PickAccuracyPanel() {
  const [sport, setSport] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/pick-accuracy"],
    refetchInterval: 30000,
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery<any>({
    queryKey: ["/api/admin/pick-records", sport, statusFilter, gradeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", status: statusFilter });
      if (sport !== "all") params.set("sport", sport);
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      const res = await fetch(`/api/admin/pick-records?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/pick-tracker/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pick-accuracy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pick-records"] });
    },
  });

  const overall = statsData?.stats?.overall;
  const bySport = statsData?.stats?.bySport;
  const byGrade = statsData?.stats?.byGrade;
  const status = statsData?.status;
  const picks = recordsData?.picks || [];

  const gradeColor = (g: string) => {
    if (!g) return "";
    if (g.startsWith("A")) return "text-green-600 dark:text-green-400";
    if (g.startsWith("B")) return "text-blue-600 dark:text-blue-400";
    if (g.startsWith("C")) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const resultBadge = (r: string) => {
    if (r === "won") return <Badge className="bg-green-500/20 text-green-400 text-xs">Won</Badge>;
    if (r === "lost") return <Badge className="bg-red-500/20 text-red-400 text-xs">Lost</Badge>;
    if (r === "push") return <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Push</Badge>;
    return <Badge variant="outline" className="text-xs">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pick Accuracy Tracker
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              data-testid="button-reset-tracker"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
          <CardDescription>
            Tracks precomputed engine picks and settles them against real game outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : overall ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold" data-testid="stat-total-picks">{overall.total}</p>
                    <p className="text-xs text-muted-foreground">Total Settled</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500" data-testid="stat-pending-picks">{overall.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-500" data-testid="stat-won-picks">{overall.won}</p>
                    <p className="text-xs text-muted-foreground">Won</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-red-500" data-testid="stat-lost-picks">{overall.lost}</p>
                    <p className="text-xs text-muted-foreground">Lost</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-500" data-testid="stat-push-picks">{overall.push}</p>
                    <p className="text-xs text-muted-foreground">Push</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold" data-testid="stat-win-rate">{overall.rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </CardContent>
                </Card>
              </div>

              {bySport && Object.keys(bySport).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">By Sport</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(bySport).map(([sp, s]: [string, any]) => (
                      <div key={sp} className="border rounded-md p-2 text-sm" data-testid={`sport-stats-${sp}`}>
                        <p className="font-semibold">{sp}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.won}W / {s.total - s.won}L — {s.rate.toFixed(1)}% win
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {byGrade && Object.keys(byGrade).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">By Grade</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(byGrade).sort(([a], [b]) => b.localeCompare(a)).map(([grade, g]: [string, any]) => (
                      <div key={grade} className="border rounded-md px-2 py-1 text-xs" data-testid={`grade-stats-${grade}`}>
                        <span className={`font-bold ${gradeColor(grade)}`}>{grade}</span>
                        <span className="text-muted-foreground ml-1">{g.won}/{g.total} ({g.rate.toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status && (
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Pending: {status.pendingCount}</span>
                  <span>Settled: {status.settledCount}</span>
                  <span>Updated: {status.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString() : "Never"}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No accuracy data yet. Picks are saved every 5 minutes during prediction cycles.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Picks</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-sport-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
                <SelectItem value="NCAAB">NCAAB</SelectItem>
                <SelectItem value="NCAAF">NCAAF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-grade-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C+">C+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : picks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No picks found. Waiting for next prediction cycle...</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium pb-1 border-b">
                <span className="col-span-1">Grade</span>
                <span className="col-span-2">Sport</span>
                <span className="col-span-3">Game</span>
                <span className="col-span-3">Pick</span>
                <span className="col-span-1">Odds</span>
                <span className="col-span-1">Conf</span>
                <span className="col-span-1">Result</span>
              </div>
              {picks.map((p: any) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-1 text-xs py-1.5 border-b border-border/30 hover:bg-muted/30"
                  data-testid={`pick-row-${p.id}`}
                >
                  <span className={`col-span-1 font-bold ${gradeColor(p.grade)}`}>{p.grade}</span>
                  <span className="col-span-2 text-muted-foreground">{p.sport}</span>
                  <span className="col-span-3 truncate">{p.game}</span>
                  <span className="col-span-3 truncate">{p.pick}</span>
                  <span className="col-span-1">{p.odds > 0 ? `+${p.odds}` : p.odds}</span>
                  <span className="col-span-1">{p.confidence}%</span>
                  <span className="col-span-1">{resultBadge(p.result)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
