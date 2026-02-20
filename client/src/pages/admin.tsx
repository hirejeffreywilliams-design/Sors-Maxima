import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Zap,
  Eye,
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
  title: string;
  description: string;
  icon: LucideIcon;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    title: "Operations",
    description: "System health, monitoring & orchestration",
    icon: Settings,
    items: [
      { href: "/admin/orchestration", label: "Orchestration", description: "Ticketing, confidence & feature governance", icon: Zap, testId: "link-admin-orchestration" },
      { href: "/admin/analytics-dashboard", label: "Analytics", description: "KPIs, SLOs, health & incident playbooks", icon: Activity, testId: "link-admin-analytics-dashboard" },
      { href: "/admin/diagnostics", label: "Diagnostics", description: "AI-powered quantum system diagnostics", icon: Brain, testId: "link-admin-diagnostics" },
      { href: "/admin/security", label: "Error & Security", description: "Error codes, security headers & IP blocking", icon: Shield, testId: "link-admin-security" },
      { href: "/admin/feature-flags", label: "Feature Flags", description: "Control feature rollouts & kill switches", icon: CheckCircle, testId: "link-admin-feature-flags" },
    ],
  },
  {
    title: "Intelligence",
    description: "Models, data & risk management",
    icon: Target,
    items: [
      { href: "/admin/model-performance", label: "Model Performance", description: "Prediction accuracy & calibration curves", icon: Target, testId: "link-admin-model-performance" },
      { href: "/admin/data-provenance", label: "Data Lineage", description: "Data sources, pipeline health & contracts", icon: Database, testId: "link-admin-data-provenance" },
      { href: "/admin/risk-register", label: "Risk & SOPs", description: "Operational risks & standard procedures", icon: ShieldAlert, testId: "link-admin-risk-register" },
      { href: "/admin/financial-projections", label: "Financial Projections", description: "Revenue forecasts & unit economics", icon: DollarSign, testId: "link-admin-financial-projections" },
    ],
  },
  {
    title: "Growth & Marketing",
    description: "Campaigns, segments & acquisition",
    icon: TrendingUp,
    items: [
      { href: "/admin/acquisition", label: "Acquisition", description: "Channel performance, CAC & LTV tracking", icon: BarChart3, testId: "link-admin-acquisition" },
      { href: "/admin/marketing", label: "Marketing Tools", description: "AI-powered marketing campaigns", icon: Megaphone, testId: "link-admin-marketing" },
      { href: "/admin/ab-tests", label: "A/B Tests", description: "Growth experiments & variant analysis", icon: FlaskConical, testId: "link-admin-ab-tests" },
      { href: "/admin/lifecycle-campaigns", label: "Lifecycle Campaigns", description: "Automated user journey campaigns", icon: Mail, testId: "link-admin-lifecycle-campaigns" },
      { href: "/admin/segmentation", label: "Segmentation", description: "User segments & personalization rules", icon: UsersRound, testId: "link-admin-segmentation" },
      { href: "/admin/promos", label: "Promotions", description: "Offers, bonuses & rewards management", icon: Percent, testId: "link-admin-promos" },
    ],
  },
  {
    title: "User Safety",
    description: "Health monitoring, support & fraud prevention",
    icon: HeartPulse,
    items: [
      { href: "/admin/user-health", label: "User Health", description: "At-risk users, scores & interventions", icon: HeartPulse, testId: "link-admin-user-health" },
      { href: "/admin/support", label: "Support Center", description: "Ticket queue, AI chat & escalations", icon: MessageCircle, testId: "link-admin-support" },
      { href: "/admin/fraud", label: "Fraud Detection", description: "Trial abuse, device fingerprinting & risk", icon: ShieldAlert, testId: "link-admin-fraud" },
      { href: "/admin/growth", label: "Growth Analytics", description: "User growth trends & engagement", icon: Activity, testId: "link-admin-growth" },
    ],
  },
];

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<"command" | "manage">("command");
  const [searchTerm, setSearchTerm] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [grantAccessDialogOpen, setGrantAccessDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState<'pro' | 'elite' | 'whale'>('pro');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [errorLevelFilter, setErrorLevelFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-admin">
              <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
              Admin Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Platform management, analytics & governance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === "command" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("command")}
              data-testid="button-view-command"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Overview
            </Button>
            <Button
              variant={activeView === "manage" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("manage")}
              data-testid="button-view-manage"
            >
              <Users className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Users</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-total-users">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Banned</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-banned">{bannedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">High Risk</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-high-risk">{highRiskCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Fraud Alerts</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-fraud-alerts">{fraudAlerts.length}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Errors (24h)</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="stat-errors-24h">{errorStats?.last24Hours || 0}</p>
            </CardContent>
          </Card>
        </div>
      </header>

      {activeView === "command" ? (
        <div className="space-y-6">
          {navCategories.map((category) => (
            <section key={category.title} data-testid={`section-${category.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-2 mb-3">
                <category.icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category.title}</h2>
                <span className="text-xs text-muted-foreground">- {category.description}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Card className="cursor-pointer transition-colors border-border/60 hover-elevate h-full" data-testid={item.testId}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="p-2 rounded-md bg-muted shrink-0">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.label}</p>
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs defaultValue="users">
            <TabsList className="w-full grid grid-cols-6 h-auto">
              <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm py-2">
                <Users className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="text-xs sm:text-sm py-2">
                <Crown className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Subs</span>
              </TabsTrigger>
              <TabsTrigger value="fraud" data-testid="tab-fraud" className="text-xs sm:text-sm py-2">
                <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Fraud</span>
              </TabsTrigger>
              <TabsTrigger value="errors" data-testid="tab-errors" className="text-xs sm:text-sm py-2">
                <Bug className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Errors</span>
              </TabsTrigger>
              <TabsTrigger value="flags" data-testid="tab-flags" className="text-xs sm:text-sm py-2">
                <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Flags</span>
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit" className="text-xs sm:text-sm py-2">
                <Shield className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Audit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">User Management</CardTitle>
                  <CardDescription className="text-sm">View and manage all registered users</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
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
                    <div className="space-y-3">
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
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4 mt-4">
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
                    Give users free premium access without payment ({subscriptionStats?.grantedFree || 0} currently granted)
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
                    <div className="space-y-3">
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
            </TabsContent>

            <TabsContent value="fraud" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">Fraud Alerts</CardTitle>
                  <CardDescription className="text-sm">Suspicious activity detected by the system</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {alertsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
                  ) : fraudAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No fraud alerts detected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fraudAlerts.map((alert, index) => (
                        <div 
                          key={index} 
                          className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 sm:p-4 border rounded-md"
                          data-testid={`row-fraud-alert-${index}`}
                        >
                          <div className={`p-2 rounded-md ${getSeverityColor(alert.severity)} shrink-0 self-start`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                              <span className="font-medium text-sm">{alert.type.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-muted-foreground break-words">{alert.details}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Error Logs</CardTitle>
                      <CardDescription className="text-sm">
                        Backend errors and warnings ({errorStats?.total || 0} total)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => refetchErrors()}
                        data-testid="button-refresh-errors"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testErrorMutation.mutate()}
                        disabled={testErrorMutation.isPending}
                        data-testid="button-test-error"
                      >
                        <Bug className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => clearErrorsMutation.mutate()}
                        disabled={clearErrorsMutation.isPending || errorLogs.length === 0}
                        data-testid="button-clear-errors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Filter:</span>
                    {[
                      { value: 'all', label: 'All', count: errorStats?.total },
                      { value: 'error', label: 'Errors', count: errorStats?.errors },
                      { value: 'warn', label: 'Warnings', count: errorStats?.warnings },
                      { value: 'info', label: 'Info', count: errorStats?.info }
                    ].map(filter => (
                      <Button
                        key={filter.value}
                        size="sm"
                        variant={errorLevelFilter === filter.value ? "default" : "outline"}
                        onClick={() => setErrorLevelFilter(filter.value)}
                        data-testid={`button-filter-${filter.value}`}
                      >
                        {filter.label} ({filter.count || 0})
                      </Button>
                    ))}
                  </div>
                  
                  {errorsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading error logs...</div>
                  ) : errorLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No errors logged{errorLevelFilter !== 'all' ? ` for level: ${errorLevelFilter}` : ''}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {errorLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex flex-col gap-2 p-3 sm:p-4 border rounded-md cursor-pointer transition-colors hover-elevate"
                          onClick={() => setSelectedError(log)}
                          data-testid={`error-log-${log.id}`}
                        >
                          <div className="flex items-start gap-3">
                            {getLogLevelIcon(log.level)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {getLogLevelBadge(log.level)}
                                <code className="text-xs text-muted-foreground">{log.id}</code>
                              </div>
                              <p className="text-sm font-medium break-words">{log.message}</p>
                              {log.path && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {log.method} {log.path}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-7">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flags" className="space-y-4 mt-4">
              <FeatureFlagsPanel />
            </TabsContent>

            <TabsContent value="audit" className="space-y-4 mt-4">
              <AuditTrailPanel />
            </TabsContent>
          </Tabs>
        </div>
      )}

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
                  <li>All 40+ analysis factors</li>
                  <li>6 sports coverage</li>
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
          <div className="space-y-3">
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
