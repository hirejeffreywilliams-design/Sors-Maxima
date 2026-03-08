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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  CheckCircle, 
  Search,
  Activity,
  Bug,
  AlertCircle,
  Info,
  RefreshCw,
  Gift,
  XCircle,
  Brain,
  ChevronRight,
  ChevronDown,
  Target,
  Database,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
  TrendingUp,
  TrendingDown,
  Eye,
  Bot,
  Cpu,
  Play,
  X,
  Rocket,
  Sparkles,
  BookOpen,
  ListTodo,
  Gauge,
  Network,
  Megaphone,
  Lock,
  Flag,
  BarChart2,
  UserCheck,
  DollarSign,
  FlaskConical,
  GraduationCap,
  Mail,
  MessageSquare,
  AlertOctagon,
  Layers,
  Tag,
  Globe,
  PieChart,
  GitBranch,
  UserPlus,
  Trophy,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSEO } from "@/hooks/use-seo";
import { AdminAIResolve } from "@/components/admin-ai-resolve";

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

interface Application {
  id: number;
  userId: number | null;
  email: string;
  username: string;
  tier: string;
  experience: string;
  goals: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  useSEO({ title: "Admin Dashboard", description: "Platform administration and management hub" });
  const [searchTerm, setSearchTerm] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [grantAccessDialogOpen, setGrantAccessDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState<'pro' | 'elite' | 'whale'>('pro');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<Application | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
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

  const { data: errorLogs = [] } = useQuery<ErrorLog[]>({
    queryKey: ['/api/admin/error-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/error-logs', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch error logs');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: errorStats } = useQuery<ErrorStats>({
    queryKey: ['/api/admin/error-stats'],
    refetchInterval: 15000,
  });

  const { data: subscriptionStats } = useQuery<SubscriptionStats>({
    queryKey: ['/api/admin/subscription-stats'],
  });

  const { data: bdlStats, isLoading: bdlLoading } = useQuery<any>({
    queryKey: ['/api/admin/bdl-stats'],
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const { data: teamFormStatus, isLoading: teamFormLoading } = useQuery<any>({
    queryKey: ['/api/admin/team-form-status'],
    refetchInterval: 300_000,
    staleTime: 60_000,
  });

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ['/api/admin/applications'],
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/applications/${id}`, { status, adminNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/applications'] });
      toast({ title: "Application updated successfully" });
    },
  });

  const { data: settlementStatus } = useQuery<any>({
    queryKey: ['/api/admin/settlement/status'],
    refetchInterval: 30000,
  });

  const runSettlementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/settlement/run', {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settlement/status'] });
      toast({ title: `Settlement complete — ${data.settled ?? 0} picks settled` });
    },
    onError: () => toast({ title: "Settlement run failed", variant: "destructive" }),
  });

  const backfillSettlementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/settlement/backfill', { days: 14 });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settlement/status'] });
      toast({ title: `Backfill complete — ${data.settled ?? 0} historical picks settled` });
    },
    onError: () => toast({ title: "Backfill failed", variant: "destructive" }),
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

  const quickLinks = [
    { href: "/admin/monetization",       label: "Revenue Intelligence",   desc: "All revenue streams, affiliate programs & execution roadmap", icon: DollarSign },
    { href: "/admin/marketing",          label: "Marketing",              desc: "Promo ads, campaigns & AI ad gen",      icon: Megaphone },
    { href: "/admin/growth",             label: "Growth Analytics",       desc: "Revenue, LTV/CAC & acquisition",        icon: TrendingUp },
    { href: "/admin/pipeline",           label: "Intelligence Pipeline",  desc: "Live node map, AI diagnosis",           icon: Network },
    { href: "/admin/app-intelligence",   label: "App Intelligence",       desc: "Feature discovery · AI insights",       icon: Cpu },
    { href: "/admin/quality-watchdog",   label: "Quality Watchdog",       desc: "Pick accuracy, EV integrity",           icon: ShieldCheck },
    { href: "/admin/autonomous",         label: "Autonomous Monitor",     desc: "24/7 AI health watch",                  icon: Brain },
    { href: "/admin/assistant",          label: "AI Assistant",           desc: "Chat with admin AI assistant",          icon: Bot },
    { href: "/admin/security",           label: "Security Center",        desc: "Threats, IP blocks, sessions",          icon: Lock },
    { href: "/admin/model-integrity",    label: "Model Integrity",        desc: "ROI, Brier score, calibration",         icon: ShieldAlert },
    { href: "/admin/cards",              label: "Cards Vault",            desc: "All minted Intelligence Cards, rarity stats & seed tools", icon: Trophy },
    { href: "/admin/community-integrity", label: "Community Integrity",   desc: "Card fraud, Discord abuse, tier bypass",  icon: ShieldAlert },
    { href: "/admin/user-health",        label: "User Health",            desc: "Churn risk, engagement & LTV",          icon: Activity },
    { href: "/admin/api-budget",         label: "API Budget",             desc: "Quota usage & burn rate",               icon: Gauge },
    { href: "/admin/feature-flags",      label: "Feature Flags",          desc: "Toggle features per tier",              icon: Flag },
  ];

  const allToolSections = [
    {
      label: "Marketing & Growth",
      tools: [
        { href: "/admin/marketing",            label: "Marketing Command Center", icon: Megaphone },
        { href: "/admin/growth",               label: "Growth Analytics",         icon: TrendingUp },
        { href: "/admin/acquisition",          label: "Acquisition",              icon: UserPlus },
        { href: "/admin/promos",               label: "Promo Manager",            icon: Tag },
        { href: "/admin/ab-tests",             label: "A/B Tests",                icon: FlaskConical },
        { href: "/admin/lifecycle-campaigns",  label: "Lifecycle Campaigns",      icon: Mail },
        { href: "/admin/segmentation",         label: "Segmentation",             icon: Layers },
        { href: "/admin/analytics-dashboard",  label: "Analytics Dashboard",      icon: BarChart2 },
      ],
    },
    {
      label: "Members & Support",
      tools: [
        { href: "/admin/user-health",    label: "User Health",       icon: Activity },
        { href: "/admin/applications",   label: "Applications",      icon: UserCheck },
        { href: "/admin/support",        label: "Support Dashboard", icon: MessageSquare },
        { href: "/admin/fraud",          label: "Fraud Dashboard",   icon: AlertOctagon },
        { href: "/admin/assistant",      label: "AI Assistant",      icon: Bot },
      ],
    },
    {
      label: "Models & Intelligence",
      tools: [
        { href: "/admin/quality-watchdog",    label: "Quality Watchdog",     icon: ShieldCheck },
        { href: "/admin/model-integrity",     label: "Model Integrity",      icon: ShieldAlert },
        { href: "/admin/model-performance",   label: "Model Performance",    icon: BarChart2 },
        { href: "/admin/training",            label: "Training Center",      icon: GraduationCap },
        { href: "/admin/data-provenance",     label: "Data Provenance",      icon: Database },
        { href: "/admin/correlation-matrix",  label: "Correlation Matrix",   icon: Globe },
        { href: "/admin/sport-analysis",      label: "Sport Factor Analysis",icon: Target },
      ],
    },
    {
      label: "Platform & Finance",
      tools: [
        { href: "/admin/security",               label: "Security Center",        icon: Lock },
        { href: "/admin/community-integrity",    label: "Community Integrity",    icon: ShieldAlert },
        { href: "/admin/feature-flags",          label: "Feature Flags",          icon: Flag },
        { href: "/admin/api-budget",             label: "API Budget",             icon: Gauge },
        { href: "/admin/financial-projections",  label: "Financial Projections",  icon: DollarSign },
        { href: "/admin/pricing-intelligence",   label: "Pricing Intelligence",   icon: PieChart },
        { href: "/admin/risk-register",          label: "Risk Register",          icon: AlertCircle },
        { href: "/admin/orchestration",          label: "Orchestration",          icon: GitBranch },
        { href: "/admin/platform-intelligence",  label: "Platform Intelligence",  icon: Globe },
        { href: "/admin/diagnostics",            label: "Diagnostics",            icon: Activity },
        { href: "/admin/guardian",               label: "App Guardian",           icon: Eye },
      ],
    },
    {
      label: "Strategy & Business",
      tools: [
        { href: "/admin/monetization",     label: "Revenue Intelligence", icon: DollarSign },
        { href: "/admin/launch-control",   label: "Launch Control",  icon: Rocket },
        { href: "/admin/owner-playbook",   label: "Owner's Playbook",icon: BookOpen },
        { href: "/admin/update-planner",   label: "Update Planner",  icon: ListTodo },
        { href: "/admin/ip-registry",      label: "IP Registry",     icon: Shield },
        { href: "/admin/autonomous",       label: "Auto Monitor",    icon: Brain },
        { href: "/admin/app-intelligence", label: "App Intelligence",icon: Cpu },
        { href: "/admin/pipeline",         label: "Intel Pipeline",  icon: Network },
      ],
    },
  ];

  return (
    <div className="min-h-full" data-testid="admin-command-center" data-view="command">
      <div className="sticky top-14 z-30 bg-background border-b">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold whitespace-nowrap" data-testid="heading-admin">
                Admin
              </h1>
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
                      <div className="flex items-center gap-1 shrink-0">
                        <AdminAIResolve
                          category="System Alert"
                          issue={alert.message}
                          severity={alert.severity}
                          metrics={{ metric: alert.metric, value: alert.value, threshold: alert.threshold, remediation: alert.remediation }}
                          label="Resolve"
                          compact
                          variant="outline"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDismissedAlerts(prev => { const next = new Set(Array.from(prev)); next.add(alert.id); return next; })}
                          data-testid={`button-dismiss-alert-${alert.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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


          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full" data-testid={`card-quicklink-${link.label.replace(/\s+/g, '-').toLowerCase()}`}>
                  <CardContent className="p-3 flex flex-col gap-1">
                    <link.icon className="h-4 w-4 text-primary mb-1" />
                    <p className="text-xs font-semibold leading-tight">{link.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{link.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* All Admin Tools — organized by category */}
          <div className="space-y-4" data-testid="section-all-tools">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">All Admin Tools</p>
            {allToolSections.map((section) => (
              <div key={section.label}>
                <p className="text-[11px] font-medium text-muted-foreground mb-2 px-0.5">{section.label}</p>
                <div className="flex flex-wrap gap-2">
                  {section.tools.map((tool) => (
                    <Link key={tool.href} href={tool.href}>
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 bg-muted/30 hover:bg-muted hover:border-primary/40 transition-colors cursor-pointer"
                        data-testid={`chip-tool-${tool.label.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <tool.icon className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[11px] font-medium whitespace-nowrap">{tool.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Tabs defaultValue="overview" data-testid="ops-tabs">
            <TabsList data-testid="tabs-list">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Cpu className="h-3.5 w-3.5 mr-1" />Overview
              </TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">
                <Users className="h-3.5 w-3.5 mr-1" />Members
              </TabsTrigger>
              <TabsTrigger value="applications" data-testid="tab-applications">
                <UsersRound className="h-3.5 w-3.5 mr-1" />Applications
              </TabsTrigger>
              <TabsTrigger value="picks" data-testid="tab-picks">
                <Target className="h-3.5 w-3.5 mr-1" />Picks
              </TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-4">

              {/* Quick AI Health Check */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">Full platform status — use AI to diagnose any issue instantly</p>
                <AdminAIResolve
                  category="Platform Health"
                  issue="General platform health check — identify any issues, bottlenecks, or improvements needed"
                  metrics={{
                    systems: (snapshot as any)?.systems?.length,
                    healthySystems: (snapshot as any)?.systems?.filter((s: any) => s.status === 'running' || s.status === 'healthy').length,
                    openIncidents: (snapshot as any)?.executive?.openIncidents,
                    pipelineStatus: (snapshot as any)?.executive?.pipelineStatus,
                    errorsLast24h: errorStats?.last24Hours,
                    pendingSettlement: settlementStatus?.pendingCount,
                  }}
                  label="Run AI Health Check"
                  variant="default"
                />
              </div>

              {/* Systems status */}
              {!snapshotLoading && (snapshot as any)?.systems?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      System Health
                      <Badge className="ml-auto text-[10px]">
                        {(snapshot as any).systems.filter((s: any) => s.status === 'running' || s.status === 'healthy').length}/{(snapshot as any).systems.length} online
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(snapshot as any).systems.map((sys: any, i: number) => {
                        const isUp = sys.status === 'running' || sys.status === 'healthy';
                        const isDegraded = sys.status === 'degraded';
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 p-2 rounded border text-sm" data-testid={`card-system-${i}`}>
                            <span className="truncate text-xs">{sys.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge
                                variant={isUp ? 'default' : isDegraded ? 'secondary' : 'destructive'}
                                className={`text-[10px] ${isUp ? 'bg-green-600 text-white' : ''}`}
                                data-testid={`badge-system-status-${i}`}
                              >
                                {sys.status}
                              </Badge>
                              {!isUp && (
                                <AdminAIResolve
                                  category="System Health"
                                  issue={`${sys.name} is ${sys.status}`}
                                  severity={isDegraded ? "medium" : "high"}
                                  metrics={{ system: sys.name, status: sys.status, details: sys.details }}
                                  label="Fix"
                                  compact
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Settlement */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Auto-Settlement
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Last run: {settlementStatus?.lastRun ? new Date(settlementStatus.lastRun).toLocaleString() : 'Never'} · {settlementStatus?.pendingCount ?? 0} picks pending
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => runSettlementMutation.mutate()}
                    disabled={runSettlementMutation.isPending}
                    data-testid="button-run-settlement"
                  >
                    {runSettlementMutation.isPending ? "Running..." : "Run Settlement"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => backfillSettlementMutation.mutate()}
                    disabled={backfillSettlementMutation.isPending}
                    data-testid="button-backfill-settlement"
                  >
                    {backfillSettlementMutation.isPending ? "Backfilling..." : "Backfill 14 Days"}
                  </Button>
                  {(settlementStatus?.pendingCount ?? 0) > 0 && (
                    <AdminAIResolve
                      category="Settlement"
                      issue={`${settlementStatus?.pendingCount} picks are pending settlement`}
                      severity={(settlementStatus?.pendingCount ?? 0) > 20 ? "high" : "medium"}
                      metrics={{ pendingCount: settlementStatus?.pendingCount, lastRun: settlementStatus?.lastRun }}
                      label="AI Diagnose"
                      compact
                    />
                  )}
                </CardContent>
              </Card>

              {/* Data integrations */}
              <Card data-testid="card-bdl-ai-stats">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    Data Integration Status
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {bdlStats?.counts?.nba || 0} NBA · {bdlStats?.counts?.nfl || 0} NFL · {bdlStats?.counts?.mlb || 0} MLB
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">{bdlStats.aiInsightsCached || 0}</span> AI edge insights cached
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Stats not available — check API key configuration</p>
                  )}
                </CardContent>
              </Card>

              {/* Historical form engine */}
              <Card data-testid="card-team-form-engine">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Historical Form Engine
                    <Badge
                      variant={teamFormStatus?.loaded ? "default" : "secondary"}
                      className={teamFormStatus?.loaded ? "bg-emerald-600 text-white ml-auto text-[10px]" : "ml-auto text-[10px]"}
                      data-testid="badge-form-engine-status"
                    >
                      {teamFormStatus?.loaded ? "Active" : "Loading"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Real 60-day ESPN history powering home/road splits, last-10 form, and streak data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamFormLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : teamFormStatus?.loaded ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {["NBA","NHL","MLB","NCAAB"].map(sport => (
                          <div key={sport} className="rounded-lg p-2 border bg-emerald-500/10 border-emerald-500/20" data-testid={`form-sport-${sport}`}>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">{sport}</p>
                            <p className="text-sm font-semibold text-emerald-400 mt-0.5">{teamFormStatus.teamCounts?.[sport] || 0}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Cache age: {teamFormStatus.ageMins ?? "?"} min · refreshes every 22h</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading — check back after server startup completes</p>
                  )}
                </CardContent>
              </Card>

              {/* Error log summary */}
              {(errorStats?.last24Hours || 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-500" />
                      Recent Errors
                      <Badge variant="destructive" className="ml-auto text-[10px]">{errorStats?.last24Hours} in 24h</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {errorLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-2 p-2 rounded border text-xs cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedError(log)}
                          data-testid={`error-row-${log.id}`}
                        >
                          {getLogLevelIcon(log.level)}
                          <span className="flex-1 truncate">{log.message}</span>
                          <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <AdminAIResolve
                        category="Error Logs"
                        issue={`${errorStats?.last24Hours} errors in the last 24 hours`}
                        severity={errorStats?.errors > 5 ? "high" : "medium"}
                        metrics={{
                          total: errorStats?.total,
                          errors: errorStats?.errors,
                          warnings: errorStats?.warnings,
                          last24h: errorStats?.last24Hours,
                          topError: errorLogs[0]?.message,
                        }}
                        label="AI Diagnose"
                        variant="outline"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => clearErrorsMutation.mutate()}
                        disabled={clearErrorsMutation.isPending}
                        data-testid="button-clear-errors"
                      >
                        Clear All Errors
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

            </TabsContent>

            {/* ── Members ── */}
            <TabsContent value="members" className="space-y-4">

              {subscriptionStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="stat-total-users">{subscriptionStats.totalUsers}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary" data-testid="stat-paid-users">{subscriptionStats.paidUsers}</p>
                      <p className="text-xs text-muted-foreground">Paid Members</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-500" data-testid="stat-banned-count">{bannedCount}</p>
                      <p className="text-xs text-muted-foreground">Banned</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-orange-500" data-testid="stat-high-risk">{highRiskCount}</p>
                      <p className="text-xs text-muted-foreground">High Risk</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-user-search"
                />
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {searchTerm ? "No users match your search" : "No users found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const tierLabel = user.tier === 'pro' ? 'Sharp' : user.tier === 'elite' ? 'Edge' : user.tier === 'whale' ? 'Max' : 'Free';
                        const hasTier = user.tier && user.tier !== 'free';
                        return (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-sm">{user.username}</p>
                                  {user.isAdmin && <Badge variant="outline" className="text-[10px] px-1">Admin</Badge>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={hasTier ? 'default' : 'secondary'} className="text-xs">
                                {tierLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.isBanned ? (
                                <Badge variant="destructive" className="text-xs">Banned</Badge>
                              ) : getRiskBadge(user.riskScore ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {!user.isBanned ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                                    onClick={() => { setSelectedUser(user); setBanDialogOpen(true); }}
                                    data-testid={`button-ban-${user.id}`}
                                  >
                                    Ban
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => unbanMutation.mutate(user.id)}
                                    disabled={unbanMutation.isPending}
                                    data-testid={`button-unban-${user.id}`}
                                  >
                                    Unban
                                  </Button>
                                )}
                                {!hasTier ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:hover:bg-green-950"
                                    onClick={() => { setSelectedUser(user); setGrantAccessDialogOpen(true); }}
                                    data-testid={`button-grant-${user.id}`}
                                  >
                                    <Gift className="h-3 w-3 mr-1" />Grant
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950"
                                    onClick={() => revokeAccessMutation.mutate(user.username)}
                                    disabled={revokeAccessMutation.isPending}
                                    data-testid={`button-revoke-${user.id}`}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>

            </TabsContent>

            {/* ── Applications ── */}
            <TabsContent value="applications" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Member Applications</h2>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/applications'] })} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${applicationsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                        </TableRow>
                      ))
                    ) : applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No applications found</TableCell>
                      </TableRow>
                    ) : (
                      applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{app.username}</TableCell>
                          <TableCell className="text-muted-foreground">{app.email}</TableCell>
                          <TableCell><Badge variant="outline" className="uppercase">{app.tier}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {app.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="default" className="h-8" onClick={() => updateApplicationMutation.mutate({ id: app.id, status: 'approved' })}>
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  data-testid={`button-reject-${app.id}`}
                                  onClick={() => { setRejectingApp(app); setRejectNotes(""); setRejectDialogOpen(true); }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* ── Picks ── */}
            <TabsContent value="picks" className="space-y-4">
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {rejectingApp?.username}&apos;s application for {rejectingApp?.tier} membership. They will receive an email with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection reason (optional)</label>
              <Textarea
                placeholder="Enter the reason for rejection — this will be included in the email sent to the applicant..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="mt-2"
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectingApp) {
                  updateApplicationMutation.mutate({ id: rejectingApp.id, status: 'rejected', adminNotes: rejectNotes || undefined });
                  setRejectDialogOpen(false);
                  setRejectingApp(null);
                  setRejectNotes("");
                }
              }}
              disabled={updateApplicationMutation.isPending}
              data-testid="button-confirm-reject"
              className="w-full sm:w-auto"
            >
              {updateApplicationMutation.isPending ? "Rejecting..." : "Reject Application"}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-tracker"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Pick Tracker</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {overall?.total || 0} settled picks and reset the win rate to zero. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-reset"
                  >
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
