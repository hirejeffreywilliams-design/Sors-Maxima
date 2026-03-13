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
  Zap,
  Send,
  UserCog,
  Radio,
  Bell,
  Calendar,
  Clock,
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
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "pro" | "elite" | "whale">("all");
  const [broadcastSeverity, setBroadcastSeverity] = useState<"info" | "warning" | "urgent">("info");
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [changeTierDialogOpen, setChangeTierDialogOpen] = useState(false);
  const [changeTierUser, setChangeTierUser] = useState<User | null>(null);
  const [newTierValue, setNewTierValue] = useState<'free' | 'pro' | 'elite' | 'whale'>('free');
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

  const broadcastMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; target: string; severity: string }) => {
      const response = await apiRequest('POST', '/api/admin/broadcast', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Broadcast sent — notification pushed to all connected users" });
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastTarget("all");
      setBroadcastSeverity("info");
    },
    onError: () => toast({ title: "Broadcast failed", variant: "destructive" }),
  });

  const changeTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/change-tier`, { tier });
      return response.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-stats'] });
      toast({ title: `Tier changed to ${vars.tier.toUpperCase()} successfully` });
      setChangeTierDialogOpen(false);
      setChangeTierUser(null);
    },
    onError: () => toast({ title: "Tier change failed", variant: "destructive" }),
  });

  const emergencyRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/emergency/force-refresh-picks', {});
      return response.json();
    },
    onSuccess: (data) => toast({ title: data.message || "Picks cache cleared — fresh generation started" }),
    onError: () => toast({ title: "Force refresh failed", variant: "destructive" }),
  });

  const emergencyForceSseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/emergency/force-sse-push', { eventType: "intelligence-update", payload: { forced: true } });
      return response.json();
    },
    onSuccess: () => toast({ title: "SSE event pushed to all connected clients" }),
    onError: () => toast({ title: "SSE push failed", variant: "destructive" }),
  });

  const emergencyClearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/emergency/clear-intelligence-cache', {});
      return response.json();
    },
    onSuccess: () => toast({ title: "Intelligence cache cleared and refresh triggered" }),
    onError: () => toast({ title: "Cache clear failed", variant: "destructive" }),
  });

  const { data: userProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/admin/users', detailUserId, 'profile'],
    queryFn: async () => {
      if (!detailUserId) return null;
      const res = await fetch(`/api/admin/users/${detailUserId}/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!detailUserId && userDetailOpen,
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
    { href: "/admin/system-health",      label: "System Health",          desc: "Memory, engine cycles & cache status",  icon: Activity },
    { href: "/admin/feature-flags",      label: "Feature Flags",          desc: "Toggle features per tier",              icon: Flag },
    { href: "/admin/policy-standards",   label: "Policy & Standards",     desc: "Company policies, procedures, grade standards & AI compliance", icon: ShieldCheck },
    { href: "/admin/feedback",           label: "Member Feedback",         desc: "All user submissions, ratings & NPS scores", icon: MessageSquare },
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
        { href: "/admin/feedback",       label: "Member Feedback",   icon: MessageSquare },
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
        { href: "/admin/policy-standards",       label: "Policy & Standards",     icon: ShieldCheck },
        { href: "/admin/community-integrity",    label: "Community Integrity",    icon: ShieldAlert },
        { href: "/admin/feature-flags",          label: "Feature Flags",          icon: Flag },
        { href: "/admin/api-budget",             label: "API Budget",             icon: Gauge },
        { href: "/admin/system-health",          label: "System Health",          icon: Activity },
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
              <TabsTrigger value="broadcast" data-testid="tab-broadcast">
                <Bell className="h-3.5 w-3.5 mr-1" />Broadcast
              </TabsTrigger>
              <TabsTrigger value="nervous-system" data-testid="tab-nervous-system">
                <Network className="h-3.5 w-3.5 mr-1" />Nervous System
              </TabsTrigger>
              <TabsTrigger value="control-room" data-testid="tab-control-room">
                <Gauge className="h-3.5 w-3.5 mr-1" />Control Room
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

              {/* Emergency Controls */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Emergency Controls
                    <Badge variant="outline" className="ml-auto text-[10px] border-orange-500/40 text-orange-400">One-Click Actions</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">Immediate platform interventions — use when standard tools are too slow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-orange-500/30 text-orange-400 justify-start"
                      onClick={() => emergencyRefreshMutation.mutate()}
                      disabled={emergencyRefreshMutation.isPending}
                      data-testid="button-emergency-refresh-picks"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${emergencyRefreshMutation.isPending ? 'animate-spin' : ''}`} />
                      {emergencyRefreshMutation.isPending ? "Refreshing…" : "Force Refresh Picks"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-blue-500/30 text-blue-400 justify-start"
                      onClick={() => emergencyForceSseMutation.mutate()}
                      disabled={emergencyForceSseMutation.isPending}
                      data-testid="button-emergency-sse"
                    >
                      <Radio className={`h-3.5 w-3.5 ${emergencyForceSseMutation.isPending ? 'animate-pulse' : ''}`} />
                      {emergencyForceSseMutation.isPending ? "Pushing…" : "Push SSE to All Clients"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-purple-500/30 text-purple-400 justify-start"
                      onClick={() => emergencyClearCacheMutation.mutate()}
                      disabled={emergencyClearCacheMutation.isPending}
                      data-testid="button-emergency-clear-cache"
                    >
                      <Database className={`h-3.5 w-3.5 ${emergencyClearCacheMutation.isPending ? 'animate-spin' : ''}`} />
                      {emergencyClearCacheMutation.isPending ? "Clearing…" : "Clear Intelligence Cache"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                          <div key={sport} className={`rounded-lg p-2 border ${bdlStats.availability?.[sport] ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/8 border-red-500/30"}`} data-testid={`bdl-status-${sport}`}>
                            <p className="text-xs font-bold uppercase text-muted-foreground">{sport}</p>
                            <p className={`text-sm font-semibold mt-0.5 ${bdlStats.availability?.[sport] ? "text-emerald-400" : "text-red-400"}`}>
                              {bdlStats.availability?.[sport] ? `${bdlStats.counts?.[sport]} teams` : "Offline"}
                            </p>
                            {!bdlStats.availability?.[sport] && (
                              <div className="mt-1.5">
                                <AdminAIResolve
                                  category="Data Integration"
                                  issue={`${sport.toUpperCase()} data integration is offline — team data unavailable`}
                                  severity="high"
                                  metrics={{ sport, availability: false, apiKey: "BALLDONTLIE_API_KEY" }}
                                  label="Fix"
                                  compact
                                />
                              </div>
                            )}
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
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Form data not yet loaded — engine may be starting up</p>
                      <AdminAIResolve
                        category="Historical Form Engine"
                        issue="Historical Form Engine has not loaded team data yet — home/road splits and streak data unavailable"
                        severity="medium"
                        metrics={{ loaded: false, ageMins: teamFormStatus?.ageMins }}
                        label="Diagnose Engine"
                        compact
                      />
                    </div>
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
                          className="flex items-center gap-2 p-2 rounded border text-xs"
                          data-testid={`error-row-${log.id}`}
                        >
                          <span className="cursor-pointer flex items-center gap-2 flex-1 min-w-0" onClick={() => setSelectedError(log)}>
                            {getLogLevelIcon(log.level)}
                            <span className="flex-1 truncate">{log.message}</span>
                            <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </span>
                          {(log.level === "error" || log.level === "critical") && (
                            <AdminAIResolve
                              category="Error Log"
                              issue={log.message}
                              severity={log.level === "critical" ? "critical" : "high"}
                              metrics={{ level: log.level, service: log.service, timestamp: log.timestamp, stack: log.stack }}
                              label="Fix"
                              compact
                            />
                          )}
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => { setDetailUserId(String(user.id)); setUserDetailOpen(true); }}
                                  data-testid={`button-view-${user.id}`}
                                >
                                  <Eye className="h-3 w-3 mr-1" />View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-blue-600 border-blue-200"
                                  onClick={() => { setChangeTierUser(user); setNewTierValue((user as any).subscriptionTier || 'free'); setChangeTierDialogOpen(true); }}
                                  data-testid={`button-change-tier-${user.id}`}
                                >
                                  <UserCog className="h-3 w-3 mr-1" />Tier
                                </Button>
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

            {/* ── Broadcast ── */}
            <TabsContent value="broadcast" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Platform Broadcast</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Push an announcement to users — appears immediately in their notification panel</p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Compose Announcement
                  </CardTitle>
                  <CardDescription className="text-xs">Message appears in the notification feed for all targeted users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Title <span className="text-muted-foreground font-normal">(max 120 chars)</span></label>
                    <Input
                      placeholder="e.g. Scheduled Maintenance Tonight at 11 PM"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value.slice(0, 120))}
                      data-testid="input-broadcast-title"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">{broadcastTitle.length}/120</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Message <span className="text-muted-foreground font-normal">(max 500 chars)</span></label>
                    <Textarea
                      placeholder="Describe what users need to know. Be clear and specific."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value.slice(0, 500))}
                      rows={3}
                      data-testid="input-broadcast-message"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">{broadcastMessage.length}/500</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Target Audience</label>
                      <Select value={broadcastTarget} onValueChange={(v: any) => setBroadcastTarget(v)}>
                        <SelectTrigger data-testid="select-broadcast-target">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="pro">Sharp members only</SelectItem>
                          <SelectItem value="elite">Edge members only</SelectItem>
                          <SelectItem value="whale">Max members only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Severity</label>
                      <Select value={broadcastSeverity} onValueChange={(v: any) => setBroadcastSeverity(v)}>
                        <SelectTrigger data-testid="select-broadcast-severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info — blue badge</SelectItem>
                          <SelectItem value="warning">Warning — orange badge</SelectItem>
                          <SelectItem value="urgent">Urgent — red badge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {broadcastTitle && broadcastMessage && (
                    <div className={`rounded-md border p-3 space-y-1 text-sm ${broadcastSeverity === 'urgent' ? 'border-red-500/30 bg-red-500/5' : broadcastSeverity === 'warning' ? 'border-orange-500/30 bg-orange-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Preview</p>
                      <div className="flex items-start gap-2">
                        <Badge className={`text-[10px] shrink-0 ${broadcastSeverity === 'urgent' ? 'bg-red-600' : broadcastSeverity === 'warning' ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>ADMIN</Badge>
                        <div>
                          <p className="font-medium text-sm">{broadcastTitle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{broadcastMessage}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">→ {broadcastTarget === 'all' ? 'All users' : broadcastTarget === 'pro' ? 'Sharp members' : broadcastTarget === 'elite' ? 'Edge members' : 'Max members'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => broadcastMutation.mutate({ title: broadcastTitle, message: broadcastMessage, target: broadcastTarget, severity: broadcastSeverity })}
                    disabled={!broadcastTitle || !broadcastMessage || broadcastMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-send-broadcast"
                  >
                    <Send className="h-4 w-4" />
                    {broadcastMutation.isPending ? "Sending…" : "Send Broadcast"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Broadcast Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Use <strong className="text-foreground">Info</strong> for updates, new features, pick availability.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />Use <strong className="text-foreground">Warning</strong> for data delays, API degradation, known issues.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />Use <strong className="text-foreground">Urgent</strong> for outages, security alerts, or immediate action needed.</li>
                    <li className="flex items-start gap-2"><Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />Broadcasts appear in real-time to all users currently logged in.</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nervous-system" className="space-y-4">
              <NervousSystemTab />
            </TabsContent>

            <TabsContent value="control-room" className="space-y-4">
              <ControlRoomTab />
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

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={(open) => { setUserDetailOpen(open); if (!open) setDetailUserId(null); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Member Profile
            </DialogTitle>
            <DialogDescription>Full account and activity details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {profileLoading ? (
              <div className="space-y-3 p-1">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : userProfile ? (
              <div className="space-y-4 p-1">
                {/* Identity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Username</p>
                    <p className="font-semibold">{userProfile.user.username}</p>
                    {userProfile.user.isAdmin && <Badge variant="outline" className="text-[10px] mt-1">Admin</Badge>}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Email</p>
                    <p className="text-sm break-all">{userProfile.user.email || "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Subscription Tier</p>
                    <Badge className="capitalize">{userProfile.user.subscriptionTier || "free"}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">Status: {userProfile.user.subscriptionStatus || "none"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Account Status</p>
                    {userProfile.user.isBanned
                      ? <Badge variant="destructive">Banned</Badge>
                      : <Badge className="bg-emerald-600 text-white">Active</Badge>
                    }
                    <p className="text-[10px] text-muted-foreground mt-1">Risk score: {userProfile.user.riskScore ?? 0}/100</p>
                  </div>
                </div>

                {/* Onboarding */}
                {userProfile.onboarding && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Onboarding</p>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-1.5">
                      <div><span className="text-muted-foreground">Experience:</span> <span className="capitalize">{userProfile.onboarding.experience || "—"}</span></div>
                      <div><span className="text-muted-foreground">Bankroll:</span> {userProfile.onboarding.bankroll_size || "—"}</div>
                      <div><span className="text-muted-foreground">Completed:</span> {userProfile.onboarding.onboarding_completed ? "Yes" : "No"}</div>
                    </div>
                    {Array.isArray(userProfile.onboarding.sports) && userProfile.onboarding.sports.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userProfile.onboarding.sports.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Picks */}
                {userProfile.recentPicks?.length > 0 ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3 w-3" />Recent Picks ({userProfile.recentPicks.length})</p>
                    <div className="space-y-1.5">
                      {userProfile.recentPicks.slice(0, 8).map((pick: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs border-b border-border/40 pb-1.5 last:border-0">
                          <Badge variant="outline" className="text-[9px] shrink-0">{pick.sport}</Badge>
                          <span className="flex-1 truncate">{pick.pick}</span>
                          <span className="text-muted-foreground shrink-0">{pick.odds_at_pick > 0 ? '+' : ''}{pick.odds_at_pick}</span>
                          <Badge variant={pick.status === 'won' ? 'default' : pick.status === 'lost' ? 'destructive' : 'secondary'} className="text-[9px] shrink-0 capitalize">{pick.status || 'pending'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">No picks tracked yet</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Failed to load profile</p>
            )}
          </ScrollArea>
          <DialogFooter className="gap-2">
            {userProfile && (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200"
                onClick={() => {
                  const u = users.find(u => String(u.id) === detailUserId);
                  if (u) { setChangeTierUser(u); setNewTierValue((u as any).subscriptionTier || 'free'); setChangeTierDialogOpen(true); setUserDetailOpen(false); }
                }}
              >
                <UserCog className="h-3.5 w-3.5 mr-1.5" />Change Tier
              </Button>
            )}
            <Button variant="outline" onClick={() => { setUserDetailOpen(false); setDetailUserId(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={changeTierDialogOpen} onOpenChange={setChangeTierDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Change Tier — {changeTierUser?.username}
            </DialogTitle>
            <DialogDescription>
              Override the subscription tier for this user. This bypasses Stripe and takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Tier</label>
              <Select value={newTierValue} onValueChange={(v: any) => setNewTierValue(v)}>
                <SelectTrigger className="mt-2" data-testid="select-new-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (no access)</SelectItem>
                  <SelectItem value="pro">Sharp — $49/mo</SelectItem>
                  <SelectItem value="elite">Edge — $99/mo</SelectItem>
                  <SelectItem value="whale">Max — $249/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Admin Override</p>
              <p>This writes directly to the database and bypasses Stripe subscription logic. Use for comp upgrades, support resolutions, or testing only.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setChangeTierDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button
              onClick={() => { if (changeTierUser) changeTierMutation.mutate({ userId: String(changeTierUser.id), tier: newTierValue }); }}
              disabled={changeTierMutation.isPending}
              data-testid="button-confirm-change-tier"
              className="w-full sm:w-auto"
            >
              {changeTierMutation.isPending ? "Changing…" : `Set to ${newTierValue.toUpperCase()}`}
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

function NervousSystemTab() {
  const { data: health, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 10000,
  });

  if (isLoading || !health) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const memStatus = health.memory?.status || "unknown";
  const memColor = memStatus === "critical" ? "text-red-500" : memStatus === "warning" ? "text-yellow-500" : "text-emerald-500";
  const uptimeHours = Math.floor((health.uptime || 0) / 3600);
  const uptimeMin = Math.floor(((health.uptime || 0) % 3600) / 60);

  const engines = health.engines?.engines || [];
  const engineSummary = health.engines?.summary || {};
  const pipeline = health.pipeline || {};
  const quality = health.quality;

  const statusIcon = (status: string) => {
    if (status === "running" || status === "live") return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "failed" || status === "offline") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    if (status === "pending" || status === "cached") return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    if (status === "degraded") return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4" data-testid="nervous-system">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Heap Usage</p>
            <p className={`text-xl font-bold ${memColor}`} data-testid="text-heap-pct">{health.memory?.heapUsedPct ?? 0}%</p>
            <p className="text-[10px] text-muted-foreground">{health.memory?.heapUsedMb ?? 0}/{health.memory?.heapLimitMb ?? 0} MB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
            <p className="text-xl font-bold text-foreground" data-testid="text-uptime">{uptimeHours}h {uptimeMin}m</p>
            <p className="text-[10px] text-muted-foreground">{health.nodeVersion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Engines</p>
            <p className="text-xl font-bold text-emerald-500" data-testid="text-engines-running">{engineSummary.running ?? 0}/{engineSummary.total ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{engineSummary.failed > 0 ? `${engineSummary.failed} failed` : "all healthy"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SSE Clients</p>
            <p className="text-xl font-bold text-foreground" data-testid="text-sse-clients">{health.sse?.activeClients ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{(health.sse?.totalEventsSent ?? 0).toLocaleString()} events sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quality</p>
            <p className={`text-xl font-bold ${quality?.status === "healthy" ? "text-emerald-500" : quality?.status === "fair" ? "text-yellow-500" : quality?.status === "degraded" ? "text-orange-500" : quality?.status === "critical" ? "text-red-500" : "text-muted-foreground"}`} data-testid="text-quality-grade">
              {quality ? `${quality.grade} (${quality.score})` : "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">{quality?.issueCount ?? 0} issues</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Engine Manifest ({engineSummary.total ?? 0} engines)
          </CardTitle>
          <CardDescription className="text-xs">Boot sequence status — auto-refreshes every 10s</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {engines.map((eng: any) => (
              <div key={eng.name} className={`flex items-center gap-2 p-2 rounded-md border ${eng.status === "failed" ? "border-red-500/30 bg-red-500/5" : eng.status === "pending" ? "border-yellow-500/20 bg-yellow-500/5" : "border-border/50"}`} data-testid={`engine-${eng.name.toLowerCase().replace(/\s+/g, "-")}`}>
                {statusIcon(eng.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{eng.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {eng.status === "running" ? `Started ${eng.startedAt ? new Date(eng.startedAt).toLocaleTimeString() : ""}` : eng.status === "failed" ? eng.error?.substring(0, 50) : `Starts in ${(eng.delayMs / 1000).toFixed(0)}s`}
                  </p>
                </div>
                <Badge variant={eng.status === "running" ? "default" : eng.status === "failed" ? "destructive" : "secondary"} className="text-[9px] shrink-0">
                  {eng.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Data Pipeline Sources ({pipeline.summary?.total ?? 0})
          </CardTitle>
          <CardDescription className="text-xs">Live status of all external data feeds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(pipeline.sources || []).map((src: any) => (
              <div key={src.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0" data-testid={`pipeline-${src.id}`}>
                <div className="flex items-center gap-2">
                  {statusIcon(src.status)}
                  <span className="text-xs font-medium">{src.name}</span>
                  {src.sports && src.sports.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">({src.sports.join(", ")})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={src.status === "live" ? "default" : src.status === "cached" ? "secondary" : src.status === "degraded" ? "outline" : "destructive"} className="text-[9px]">
                    {src.status}
                  </Badge>
                  {src.lastSuccess && <span className="text-[10px] text-muted-foreground">{src.lastSuccess}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 pt-2 border-t border-border/30">
            <span className="text-[10px] text-emerald-500">{pipeline.summary?.live ?? 0} live</span>
            <span className="text-[10px] text-yellow-500">{pipeline.summary?.cached ?? 0} cached</span>
            <span className="text-[10px] text-orange-500">{pipeline.summary?.degraded ?? 0} degraded</span>
            <span className="text-[10px] text-red-500">{pipeline.summary?.offline ?? 0} offline</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health.apiKeys && Object.entries(health.apiKeys as Record<string, any>).map(([service, status]: [string, any]) => (
                <div key={service} className="flex items-center justify-between py-1" data-testid={`apikey-${service}`}>
                  <Badge variant="outline" className="text-[10px] uppercase">{service}</Badge>
                  <Badge variant={status.activeKeys === status.totalKeys ? "default" : "destructive"} className="text-[9px]">
                    {status.activeKeys}/{status.totalKeys} active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground" data-testid="text-flags-enabled">{health.featureFlags?.enabled ?? 0}</p>
                <p className="text-[10px] text-emerald-500">Enabled</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground" data-testid="text-flags-disabled">{health.featureFlags?.disabled ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Disabled</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{health.featureFlags?.total ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{health.featureFlags?.partialRollout ?? 0}</p>
                <p className="text-[10px] text-yellow-500">Partial Rollout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Prediction Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className={`text-lg font-bold ${health.predictionEngine?.running ? "text-emerald-500" : "text-red-500"}`} data-testid="text-pred-status">
                {health.predictionEngine?.running ? "Running" : "Stopped"}
              </p>
              <p className="text-[10px] text-muted-foreground">Status</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{health.predictionEngine?.totalRuns ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Total Runs</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${(health.predictionEngine?.failedRuns || 0) > 0 ? "text-red-500" : "text-foreground"}`}>{health.predictionEngine?.failedRuns ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Failed Runs</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{health.predictionEngine?.intervalLabel || "N/A"}</p>
              <p className="text-[10px] text-muted-foreground">Refresh Interval</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ControlRoomTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: controlRoom, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/control-room"],
    refetchInterval: 10000,
  });

  const actionMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const response = apiRequest("POST", endpoint, {});
      return (await response).json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-room"] });
      toast({ title: data.message || "Action completed" });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const actions = [
    { label: "Clear All Caches", endpoint: "/api/admin/control-room/clear-all-caches", icon: <Database className="h-4 w-4" />, desc: "Flush response cache + disk files + predictions", color: "text-red-500" },
    { label: "Clear Response Cache", endpoint: "/api/admin/control-room/clear-response-cache", icon: <Database className="h-4 w-4" />, desc: "Flush in-memory HTTP response cache only", color: "text-blue-500" },
    { label: "Flush Disk Cache", endpoint: "/api/admin/control-room/flush-disk-cache", icon: <XCircle className="h-4 w-4" />, desc: "Delete market-snapshot & odds-api disk files", color: "text-orange-500" },
    { label: "Flush Props Cache", endpoint: "/api/admin/control-room/flush-props-cache", icon: <Target className="h-4 w-4" />, desc: "Flush all player props response caches", color: "text-pink-500" },
    { label: "Refresh Odds", endpoint: "/api/admin/control-room/refresh-odds", icon: <RefreshCw className="h-4 w-4" />, desc: "Force refresh odds for all 4 major sports", color: "text-emerald-500" },
    { label: "Refresh Props", endpoint: "/api/admin/control-room/refresh-props", icon: <Target className="h-4 w-4" />, desc: "Flush + refresh player props for all sports", color: "text-violet-500" },
    { label: "Refresh Scores", endpoint: "/api/admin/control-room/refresh-scores", icon: <Activity className="h-4 w-4" />, desc: "Force refresh scoreboards for all sports", color: "text-teal-500" },
    { label: "Force Prefetch All", endpoint: "/api/admin/control-room/force-prefetch", icon: <Zap className="h-4 w-4" />, desc: "Warm all odds + scoreboard caches now", color: "text-amber-500" },
    { label: "Rotate API Key", endpoint: "/api/admin/control-room/rotate-api-key", icon: <Lock className="h-4 w-4" />, desc: "Check and rotate odds API key", color: "text-purple-500" },
    { label: "Reset Budget Counters", endpoint: "/api/admin/control-room/reset-budget-optimizer", icon: <DollarSign className="h-4 w-4" />, desc: "Zero usage counters & resume service", color: "text-yellow-500" },
    { label: "Force Refresh Picks", endpoint: "/api/admin/emergency/force-refresh-picks", icon: <Rocket className="h-4 w-4" />, desc: "Clear prediction cache, trigger fresh generation", color: "text-red-500" },
    { label: "Restart Autonomous Monitor", endpoint: "/api/admin/control-room/restart-autonomous-monitor", icon: <Bot className="h-4 w-4" />, desc: "Stop and restart the autonomous admin agent", color: "text-cyan-500" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const apiKeys = controlRoom?.apiKeys;
  const cacheStats = controlRoom?.cacheStats;
  const prefetch = controlRoom?.prefetch;
  const budget = controlRoom?.budget;
  const recentLog = controlRoom?.recentLog || [];

  return (
    <div className="space-y-4" data-testid="control-room">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cache Entries</p>
            <p className="text-xl font-bold text-foreground" data-testid="text-cache-size">{cacheStats?.size ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Hit rate: {cacheStats?.hitRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Odds API Remaining</p>
            <p className={`text-xl font-bold ${(budget?.odds?.remaining ?? 0) < 10000 ? "text-red-500" : (budget?.odds?.remaining ?? 0) < 50000 ? "text-yellow-500" : "text-emerald-500"}`} data-testid="text-odds-remaining">
              {budget?.odds?.remaining != null ? budget.odds.remaining.toLocaleString() : "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">{budget?.odds?.status || "unknown"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">API Keys</p>
            <p className="text-xl font-bold text-foreground" data-testid="text-api-keys">
              {apiKeys?.odds?.activeKeys ?? 0}/{apiKeys?.odds?.totalKeys ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground">active / total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prefetch</p>
            <p className={`text-xl font-bold ${prefetch?.running ? "text-emerald-500" : "text-red-500"}`} data-testid="text-prefetch-status">
              {prefetch?.running ? "Active" : "Stopped"}
            </p>
            <p className="text-[10px] text-muted-foreground">{prefetch?.tasks?.length ?? 0} tasks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-xs">Execute system operations — effects are immediate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actions.map((action) => (
              <Button
                key={action.endpoint}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2.5 px-3 text-left"
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate(action.endpoint)}
                data-testid={`button-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`${action.color} mr-2 shrink-0`}>{action.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{action.desc}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {apiKeys && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              API Key Quota Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(apiKeys as Record<string, any>).map(([service, status]: [string, any]) => (
                <div key={service} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{service}</Badge>
                    <span className="text-xs text-muted-foreground">{status.totalKeys} key(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.activeKeys === status.totalKeys ? "default" : "destructive"} className="text-[10px]" data-testid={`badge-key-status-${service}`}>
                      {status.activeKeys}/{status.totalKeys} active
                    </Badge>
                    {status.activeKeyIndex && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Active: #{status.activeKeyIndex}
                      </Badge>
                    )}
                    {status.keyStates?.map((ks: any) => (
                      <span key={ks.index} className={`text-[10px] ${ks.isActive ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                        #{ks.index}: {ks.remaining != null ? `${ks.remaining.toLocaleString()} left` : "N/A"}
                        {ks.isActive && <span className="ml-0.5">(active)</span>}
                        {ks.coolingDown && <span className="text-red-500 ml-1">(cooldown)</span>}
                        {ks.errorCount > 0 && <span className="text-yellow-500 ml-1">({ks.errorCount} errs)</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {prefetch?.tasks && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Prefetch Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prefetch.tasks.map((task: any) => (
                <div key={task.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${task.enabled ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-xs font-medium">{task.name}</span>
                    <span className="text-[10px] text-muted-foreground">every {Math.round(task.intervalMs / 60000)}m</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{task.runCount} runs</span>
                    {task.lastRun && <span>{new Date(task.lastRun).toLocaleTimeString()}</span>}
                    {task.lastError && <Badge variant="destructive" className="text-[9px]">err</Badge>}
                    {task.lastDurationMs > 0 && <span>{task.lastDurationMs}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Action Log
          </CardTitle>
          <CardDescription className="text-xs">Last 10 control room actions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLog.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No actions recorded yet</p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {recentLog.map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-border/20 last:border-0" data-testid={`log-entry-${i}`}>
                    <span className="text-[10px] text-muted-foreground shrink-0 w-16 font-mono">
                      {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{entry.action}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{entry.detail}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
