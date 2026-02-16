import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Bug,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Database,
  Cpu,
  Lock,
  Unlock,
  Ban,
  Eye,
  BookOpen,
  Wrench,
  ArrowLeft,
  Heart,
  Zap,
  FileWarning,
  Info,
  ChevronRight,
  Copy,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  ip: string;
  userId?: string;
  details: string;
  resolved: boolean;
}

interface SecurityStats {
  total: number;
  last24Hours: number;
  lastHour: number;
  unresolved: number;
  bySeverity: { critical: number; high: number; medium: number; low: number };
  byType: Record<string, number>;
  blockedIPs: number;
  recentTrend: { hour: number; day: number };
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
}

interface ErrorCodeDef {
  code: string;
  category: string;
  title: string;
  description: string;
  suggestedFix: string;
  severity: string;
}

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  lastChecked: string;
  details?: string;
  errorCode?: string;
}

interface HealthResponse {
  overall: "healthy" | "degraded" | "down";
  checks: HealthCheck[];
  timestamp: string;
}

interface SystemInfo {
  uptime: number;
  uptimeFormatted: string;
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number };
  nodeVersion: string;
  platform: string;
  pid: number;
  env: string;
}

interface BlockedIP {
  ip: string;
  until: string;
  reason: string;
}

const severityColors: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

const severityVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminSecurityPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorLevelFilter, setErrorLevelFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [selectedCode, setSelectedCode] = useState<ErrorCodeDef | null>(null);
  const [blockIpDialog, setBlockIpDialog] = useState(false);
  const [blockIpValue, setBlockIpValue] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState("60");

  const { data: healthData, isLoading: healthLoading } = useQuery<HealthResponse>({
    queryKey: ["/api/admin/health"],
    refetchInterval: 30000,
  });

  const { data: systemInfo } = useQuery<SystemInfo>({
    queryKey: ["/api/admin/system-info"],
    refetchInterval: 30000,
  });

  const { data: securityStats } = useQuery<SecurityStats>({
    queryKey: ["/api/admin/security/stats"],
    refetchInterval: 15000,
  });

  const { data: securityEvents } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/admin/security/events"],
    refetchInterval: 15000,
  });

  const { data: errorLogs } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/error-logs"],
    refetchInterval: 15000,
  });

  const { data: errorCodes } = useQuery<ErrorCodeDef[]>({
    queryKey: ["/api/admin/error-codes"],
  });

  const { data: blockedIPs } = useQuery<BlockedIP[]>({
    queryKey: ["/api/admin/security/blocked-ips"],
    refetchInterval: 30000,
  });

  const { data: errorStats } = useQuery<{
    total: number; errors: number; warnings: number; info: number; last24Hours: number;
  }>({
    queryKey: ["/api/admin/error-stats"],
    refetchInterval: 15000,
  });

  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("POST", `/api/admin/security/events/${eventId}/resolve`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/security/events"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/security/stats"] });
      toast({ title: "Event resolved" });
    },
  });

  const blockIpMutation = useMutation({
    mutationFn: async (data: { ip: string; durationMinutes: number; reason: string }) => {
      await apiRequest("POST", "/api/admin/security/block-ip", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/security/blocked-ips"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/security/stats"] });
      toast({ title: "IP blocked" });
      setBlockIpDialog(false);
      setBlockIpValue("");
      setBlockReason("");
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: async (ip: string) => {
      await apiRequest("POST", "/api/admin/security/unblock-ip", { ip });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/security/blocked-ips"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/security/stats"] });
      toast({ title: "IP unblocked" });
    },
  });

  const testErrorMutation = useMutation({
    mutationFn: async (data: { message: string; level: string }) => {
      await apiRequest("POST", "/api/admin/test-error", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/error-logs"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/error-stats"] });
      toast({ title: "Test error logged" });
    },
  });

  const filteredErrors = (errorLogs || []).filter((log) => {
    if (errorLevelFilter !== "all" && log.level !== errorLevelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        (log.path && log.path.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredSecurityEvents = (securityEvents || []).filter((ev) => {
    if (severityFilter !== "all" && ev.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ev.details.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        ev.ip.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredErrorCodes = (errorCodes || []).filter((code) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      code.code.toLowerCase().includes(q) ||
      code.title.toLowerCase().includes(q) ||
      code.category.toLowerCase().includes(q) ||
      code.description.toLowerCase().includes(q)
    );
  });

  const healthStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "degraded": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "down": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Error & Security Center
          </h1>
          <p className="text-sm text-muted-foreground">
            System health, error tracking, security monitoring, and debugging tools
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-refresh-all"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["/api/admin/health"] });
            qc.invalidateQueries({ queryKey: ["/api/admin/security/stats"] });
            qc.invalidateQueries({ queryKey: ["/api/admin/error-logs"] });
            qc.invalidateQueries({ queryKey: ["/api/admin/security/events"] });
            qc.invalidateQueries({ queryKey: ["/api/admin/error-stats"] });
            toast({ title: "Refreshing all data..." });
          }}
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">System Health</span>
            </div>
            <div className="flex items-center gap-2" data-testid="status-system-health">
              {healthStatusIcon(healthData?.overall || "healthy")}
              <span className="text-lg font-semibold capitalize">{healthData?.overall || "Loading..."}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Errors (24h)</span>
            </div>
            <span className="text-lg font-semibold" data-testid="text-errors-24h">{errorStats?.last24Hours || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Security Events</span>
            </div>
            <span className="text-lg font-semibold" data-testid="text-security-events">{securityStats?.unresolved || 0} unresolved</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Blocked IPs</span>
            </div>
            <span className="text-lg font-semibold" data-testid="text-blocked-ips">{securityStats?.blockedIPs || 0}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Activity className="w-4 h-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <Bug className="w-4 h-4 mr-1" /> Errors
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-1" /> Security
          </TabsTrigger>
          <TabsTrigger value="codes" data-testid="tab-codes">
            <BookOpen className="w-4 h-4 mr-1" /> Error Codes
          </TabsTrigger>
          <TabsTrigger value="tools" data-testid="tab-tools">
            <Wrench className="w-4 h-4 mr-1" /> Debug
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthLoading ? (
                  <p className="text-sm text-muted-foreground">Running health checks...</p>
                ) : (
                  (healthData?.checks || []).map((check) => (
                    <div key={check.name} className="flex items-center justify-between gap-2" data-testid={`health-check-${check.name.toLowerCase()}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {healthStatusIcon(check.status)}
                        <span className="text-sm font-medium">{check.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {check.latencyMs !== undefined && (
                          <span className="text-xs text-muted-foreground">{check.latencyMs}ms</span>
                        )}
                        <Badge variant={check.status === "healthy" ? "secondary" : check.status === "degraded" ? "default" : "destructive"} className="text-xs">
                          {check.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> System Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {systemInfo ? (
                  <>
                    <div className="flex justify-between" data-testid="text-uptime">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{systemInfo.uptimeFormatted}</span>
                    </div>
                    <div className="flex justify-between" data-testid="text-memory">
                      <span className="text-muted-foreground">Memory (Heap)</span>
                      <span className="font-medium">{systemInfo.memory.heapUsed}/{systemInfo.memory.heapTotal} MB</span>
                    </div>
                    <div className="flex justify-between" data-testid="text-rss">
                      <span className="text-muted-foreground">RSS</span>
                      <span className="font-medium">{systemInfo.memory.rss} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node.js</span>
                      <span className="font-medium">{systemInfo.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <Badge variant="outline">{systemInfo.env}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PID</span>
                      <span className="font-mono text-xs">{systemInfo.pid}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bug className="w-4 h-4" /> Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {(errorLogs || []).slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                        onClick={() => { setSelectedError(log); }}
                        data-testid={`error-row-${log.id}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {log.level === "error" ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                           log.level === "warn" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> :
                           <Info className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{log.message}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{timeAgo(log.timestamp)}</span>
                            {log.path && <span className="text-xs text-muted-foreground font-mono">{log.path}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!errorLogs || errorLogs.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-6">No errors recorded</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {(securityEvents || []).slice(0, 8).map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2 p-2 rounded-md" data-testid={`security-row-${ev.id}`}>
                        <div className="flex-shrink-0 mt-0.5">
                          <ShieldAlert className={`w-3.5 h-3.5 ${severityColors[ev.severity]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={severityVariant[ev.severity]} className="text-xs">{ev.severity}</Badge>
                            <span className="text-xs font-mono text-muted-foreground">{ev.type}</span>
                          </div>
                          <p className="text-sm mt-0.5 truncate">{ev.details}</p>
                          <span className="text-xs text-muted-foreground">{timeAgo(ev.timestamp)}</span>
                        </div>
                        {!ev.resolved && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => resolveEventMutation.mutate(ev.id)}
                            data-testid={`button-resolve-${ev.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {(!securityEvents || securityEvents.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-6">No security events</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ERRORS TAB */}
        <TabsContent value="errors" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search errors by message, ID, or path..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-errors"
              />
            </div>
            <Select value={errorLevelFilter} onValueChange={setErrorLevelFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-error-level">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warn">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <div className="text-lg font-bold" data-testid="text-error-count">{errorStats?.errors || 0}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <div className="text-lg font-bold" data-testid="text-warn-count">{errorStats?.warnings || 0}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Info className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold" data-testid="text-info-count">{errorStats?.info || 0}</div>
                <div className="text-xs text-muted-foreground">Info</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredErrors.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 hover-elevate cursor-pointer"
                      onClick={() => setSelectedError(log)}
                      data-testid={`error-item-${log.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {log.level === "error" ? <XCircle className="w-4 h-4 text-red-500" /> :
                         log.level === "warn" ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                         <Info className="w-4 h-4 text-blue-500" />}
                        <Badge variant={log.level === "error" ? "destructive" : log.level === "warn" ? "default" : "secondary"} className="text-xs">
                          {log.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{log.id}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {log.path && <span className="font-mono">{log.method} {log.path}</span>}
                        {log.ip && <span>IP: {log.ip}</span>}
                        {log.userId && <span>User: {log.userId}</span>}
                      </div>
                    </div>
                  ))}
                  {filteredErrors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">No matching errors found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search security events..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-security"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-severity">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setBlockIpDialog(true)} data-testid="button-block-ip">
              <Ban className="w-4 h-4 mr-1" /> Block IP
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Threat Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {securityStats?.bySeverity && Object.entries(securityStats.bySeverity).map(([sev, count]) => (
                  <div key={sev} className="flex items-center justify-between" data-testid={`threat-${sev}`}>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={`w-4 h-4 ${severityColors[sev]}`} />
                      <span className="text-sm capitalize">{sev}</span>
                    </div>
                    <Badge variant={severityVariant[sev]}>{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Blocked IPs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {(blockedIPs || []).map((entry) => (
                      <div key={entry.ip} className="flex items-center justify-between gap-2" data-testid={`blocked-ip-${entry.ip}`}>
                        <div className="min-w-0">
                          <span className="text-sm font-mono">{entry.ip}</span>
                          <p className="text-xs text-muted-foreground truncate">{entry.reason}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => unblockIpMutation.mutate(entry.ip)}
                          data-testid={`button-unblock-${entry.ip}`}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    {(!blockedIPs || blockedIPs.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No blocked IPs</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Security Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {filteredSecurityEvents.map((ev) => (
                    <div key={ev.id} className="p-3" data-testid={`security-event-${ev.id}`}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={severityVariant[ev.severity]} className="text-xs">{ev.severity}</Badge>
                        <span className="text-xs font-mono">{ev.type.replace(/_/g, " ")}</span>
                        {ev.resolved && (
                          <Badge variant="outline" className="text-xs">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Resolved
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{formatTimestamp(ev.timestamp)}</span>
                      </div>
                      <p className="text-sm">{ev.details}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>IP: {ev.ip}</span>
                        <span>Source: {ev.source}</span>
                        {ev.userId && <span>User: {ev.userId}</span>}
                      </div>
                      {!ev.resolved && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveEventMutation.mutate(ev.id)}
                            data-testid={`button-resolve-event-${ev.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredSecurityEvents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">No security events found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ERROR CODES REFERENCE TAB */}
        <TabsContent value="codes" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search error codes by name, code, or category..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-codes"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {filteredErrorCodes.map((code) => (
                    <div
                      key={code.code}
                      className="p-3 hover-elevate cursor-pointer"
                      onClick={() => setSelectedCode(code)}
                      data-testid={`code-item-${code.code}`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{code.code}</Badge>
                        <Badge variant="secondary" className="text-xs">{code.category}</Badge>
                        {code.severity === "critical" && <Badge variant="destructive" className="text-xs">Critical</Badge>}
                        {code.severity === "error" && <Badge variant="destructive" className="text-xs">Error</Badge>}
                        {code.severity === "warning" && <Badge className="text-xs">Warning</Badge>}
                        <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">{code.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{code.description}</p>
                    </div>
                  ))}
                  {filteredErrorCodes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">No error codes match your search</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEBUG TOOLS TAB */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bug className="w-4 h-4" /> Generate Test Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create a test error to verify the error tracking pipeline is working correctly.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => testErrorMutation.mutate({ message: "Test error: System check", level: "error" })}
                    disabled={testErrorMutation.isPending}
                    data-testid="button-test-error"
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Test Error
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testErrorMutation.mutate({ message: "Test warning: Performance check", level: "warn" })}
                    disabled={testErrorMutation.isPending}
                    data-testid="button-test-warning"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" /> Test Warning
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testErrorMutation.mutate({ message: "Test info: System ping", level: "info" })}
                    disabled={testErrorMutation.isPending}
                    data-testid="button-test-info"
                  >
                    <Info className="w-4 h-4 mr-1" /> Test Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Health Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Run all system health checks immediately.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    qc.invalidateQueries({ queryKey: ["/api/admin/health"] });
                    toast({ title: "Health checks running..." });
                  }}
                  data-testid="button-run-health"
                >
                  <Heart className="w-4 h-4 mr-1" /> Run Health Checks
                </Button>

                {healthData?.checks && (
                  <div className="space-y-1 mt-2">
                    {healthData.checks.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-sm">
                        {healthStatusIcon(c.status)}
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{c.details}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Active Security Layers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: "Security Headers", desc: "X-Frame, CSP, HSTS, XSS Protection", active: true },
                    { name: "IP Blocking", desc: "Automatic & manual IP blocking", active: true },
                    { name: "Input Sanitization", desc: "XSS & SQL injection detection", active: true },
                    { name: "API Rate Limiting", desc: "100 req/min per IP", active: true },
                    { name: "Session Fingerprinting", desc: "Browser fingerprint validation", active: true },
                    { name: "Sensitive Route Protection", desc: "10 req/min on auth/payment", active: true },
                    { name: "Password Hashing", desc: "scrypt with random salt", active: true },
                    { name: "Account Lockout", desc: "5 attempts, 30min lockout", active: true },
                    { name: "Fraud Detection", desc: "Multi-account & IP tracking", active: true },
                    { name: "PII Minimization", desc: "Data masking & redaction", active: true },
                    { name: "Idempotency Guard", desc: "Duplicate request prevention", active: true },
                    { name: "Audit Trail", desc: "All actions logged", active: true },
                  ].map((layer) => (
                    <div key={layer.name} className="flex items-start gap-2 p-2 rounded-md" data-testid={`security-layer-${layer.name.toLowerCase().replace(/\s/g, "-")}`}>
                      <ShieldCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{layer.name}</p>
                        <p className="text-xs text-muted-foreground">{layer.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError?.level === "error" ? <XCircle className="w-5 h-5 text-red-500" /> :
               selectedError?.level === "warn" ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
               <Info className="w-5 h-5 text-blue-500" />}
              Error Details
            </DialogTitle>
            <DialogDescription>
              {selectedError?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Level:</span>
                  <Badge variant={selectedError.level === "error" ? "destructive" : selectedError.level === "warn" ? "default" : "secondary"} className="ml-2 text-xs">
                    {selectedError.level}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <span className="ml-2">{formatTimestamp(selectedError.timestamp)}</span>
                </div>
                {selectedError.path && (
                  <div>
                    <span className="text-muted-foreground">Path:</span>
                    <span className="ml-2 font-mono text-xs">{selectedError.method} {selectedError.path}</span>
                  </div>
                )}
                {selectedError.ip && (
                  <div>
                    <span className="text-muted-foreground">IP:</span>
                    <span className="ml-2 font-mono text-xs">{selectedError.ip}</span>
                  </div>
                )}
                {selectedError.userId && (
                  <div>
                    <span className="text-muted-foreground">User:</span>
                    <span className="ml-2">{selectedError.userId}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Message:</span>
                <p className="text-sm font-medium mt-1">{selectedError.message}</p>
              </div>

              {selectedError.stack && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stack Trace:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedError.stack || "");
                        toast({ title: "Stack trace copied" });
                      }}
                      data-testid="button-copy-stack"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="mt-1 p-3 rounded-md bg-muted text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {selectedError.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Code Detail Dialog */}
      <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selectedCode?.code}
            </DialogTitle>
            <DialogDescription>{selectedCode?.title}</DialogDescription>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selectedCode.category}</Badge>
                <Badge
                  variant={selectedCode.severity === "critical" ? "destructive" : selectedCode.severity === "error" ? "destructive" : "default"}
                  className="text-xs"
                >
                  {selectedCode.severity}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedCode.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" /> Suggested Fix
                </h4>
                <p className="text-sm p-3 rounded-md bg-muted">{selectedCode.suggestedFix}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block IP Dialog */}
      <Dialog open={blockIpDialog} onOpenChange={setBlockIpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block IP Address</DialogTitle>
            <DialogDescription>
              Block an IP from accessing the application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="IP address (e.g., 192.168.1.1)"
              value={blockIpValue}
              onChange={(e) => setBlockIpValue(e.target.value)}
              data-testid="input-block-ip"
            />
            <Textarea
              placeholder="Reason for blocking..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              data-testid="input-block-reason"
            />
            <Select value={blockDuration} onValueChange={setBlockDuration}>
              <SelectTrigger data-testid="select-block-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="360">6 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
                <SelectItem value="10080">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockIpDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (blockIpValue && blockReason) {
                  blockIpMutation.mutate({
                    ip: blockIpValue,
                    durationMinutes: parseInt(blockDuration),
                    reason: blockReason,
                  });
                }
              }}
              disabled={!blockIpValue || !blockReason}
              data-testid="button-confirm-block"
            >
              <Ban className="w-4 h-4 mr-1" /> Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
