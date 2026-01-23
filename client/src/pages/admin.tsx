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
  XCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminDashboard() {
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
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'error': return <Badge variant="destructive">ERROR</Badge>;
      case 'warn': return <Badge className="bg-yellow-500 text-black">WARN</Badge>;
      case 'info': return <Badge variant="secondary">INFO</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 75) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500">Medium Risk</Badge>;
    if (score >= 25) return <Badge className="bg-yellow-500 text-black">Low Risk</Badge>;
    return <Badge variant="secondary">Safe</Badge>;
  };

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">User management, fraud prevention, and error logs</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              {users.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Banned</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Ban className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              {users.filter(u => u.isBanned).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">High Risk</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              {users.filter(u => u.riskScore >= 50).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Fraud Alerts</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              {fraudAlerts.length}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bug className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              {errorStats?.last24Hours || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full grid grid-cols-4 h-auto">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg"
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
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Free</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold">{subscriptionStats?.free || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pro</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-blue-500">{subscriptionStats?.pro || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Elite</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-purple-500">{subscriptionStats?.elite || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Whale</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-amber-500">{subscriptionStats?.whale || 0}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-500" />
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{user.username}</span>
                          <Badge 
                            variant={user.subscriptionTier === 'free' ? 'secondary' : 'default'}
                            className={
                              user.subscriptionTier === 'whale' ? 'bg-amber-500' :
                              user.subscriptionTier === 'elite' ? 'bg-purple-500' :
                              user.subscriptionTier === 'pro' ? 'bg-blue-500' : ''
                            }
                          >
                            {user.subscriptionTier.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {user.subscriptionTier === 'free' ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
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
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No fraud alerts detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fraudAlerts.map((alert, index) => (
                    <div 
                      key={index} 
                      className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 sm:p-4 border rounded-lg"
                    >
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)} shrink-0 self-start`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
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
                <div className="flex items-center gap-2">
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
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No errors logged{errorLevelFilter !== 'all' ? ` for level: ${errorLevelFilter}` : ''}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errorLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex flex-col gap-2 p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
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
      </Tabs>

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
              <Gift className="h-5 w-5 text-green-500" />
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
            <div className="p-3 rounded-lg bg-muted text-sm">
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
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              onClick={() => {
                if (selectedUser) {
                  grantAccessMutation.mutate({ username: selectedUser.username, tier: selectedTier });
                }
              }}
              disabled={grantAccessMutation.isPending}
              data-testid="button-confirm-grant"
            >
              {grantAccessMutation.isPending ? "Granting..." : `Grant ${selectedTier.toUpperCase()} Access`}
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
                    <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words">
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
