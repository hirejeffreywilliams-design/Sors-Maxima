import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import {
  ShieldAlert, ShieldCheck, Shield, AlertTriangle, Eye, CheckCircle, XCircle,
  Activity, BarChart3, Globe, Users, CreditCard, RefreshCw, Ban, Clock,
  TrendingUp, Hash, Wifi, Server, Lock
} from "lucide-react";

type AlertSeverity = "low" | "medium" | "high" | "critical";
type FraudAlertType =
  | "card_velocity_abuse"
  | "fake_card_circulation"
  | "credential_sharing"
  | "tier_bypass_attempt"
  | "webhook_abuse"
  | "ip_anomaly"
  | "mass_verification_attempt";

interface IntegrityAlert {
  id: number;
  alertType: FraudAlertType;
  severity: AlertSeverity;
  userId: number | null;
  username: string | null;
  collectionId: number | null;
  details: Record<string, any>;
  ipAddress: string | null;
  autoActioned: boolean;
  actionTaken: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VerificationStats {
  totalVerifications: number;
  last24h: number;
  failureRate: number;
  topVerifiedCards: Array<{ collectionId: number; count: number; uniqueIps: number }>;
  topAbusiveIps: Array<{ ip: string; failureCount: number }>;
}

interface DiscordBinding {
  id: number;
  userId: number;
  discordUserId: string | null;
  discordUsername: string | null;
  discordServerId: string | null;
  discordServerName: string | null;
  discordMemberCount: number | null;
  webhookUrl: string | null;
  verified: boolean;
  status: string;
  suspensionReason: string | null;
  postsSent: number;
  lastPostAt: string | null;
  createdAt: string;
}

interface TierBypassStats {
  total24h: number;
  byUser: Array<{ userId: number; username: string; count: number; latestRoute: string }>;
  byRoute: Array<{ route: string; count: number }>;
}

function severityColor(s: AlertSeverity) {
  if (s === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (s === "high") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (s === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-blue-500/20 text-blue-400 border-blue-500/30";
}

function severityIcon(s: AlertSeverity) {
  if (s === "critical") return <ShieldAlert className="h-4 w-4 text-red-400" />;
  if (s === "high") return <AlertTriangle className="h-4 w-4 text-orange-400" />;
  if (s === "medium") return <Shield className="h-4 w-4 text-yellow-400" />;
  return <ShieldCheck className="h-4 w-4 text-blue-400" />;
}

function alertTypeLabel(t: FraudAlertType) {
  const labels: Record<FraudAlertType, string> = {
    card_velocity_abuse: "Card Velocity Abuse",
    fake_card_circulation: "Fake Card Circulating",
    credential_sharing: "Credential Sharing",
    tier_bypass_attempt: "Tier Bypass Attempt",
    webhook_abuse: "Webhook Abuse",
    ip_anomaly: "IP Anomaly",
    mass_verification_attempt: "Mass Verification (Bot)",
  };
  return labels[t] || t;
}

function alertTypeIcon(t: FraudAlertType) {
  switch (t) {
    case "card_velocity_abuse": return <TrendingUp className="h-4 w-4" />;
    case "fake_card_circulation": return <CreditCard className="h-4 w-4" />;
    case "credential_sharing": return <Users className="h-4 w-4" />;
    case "tier_bypass_attempt": return <Lock className="h-4 w-4" />;
    case "webhook_abuse": return <Wifi className="h-4 w-4" />;
    case "ip_anomaly": return <Globe className="h-4 w-4" />;
    case "mass_verification_attempt": return <Server className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
}

export default function AdminCommunityIntegrity() {
  useSEO({ title: "Community Integrity — Sors Admin" });
  const { toast } = useToast();
  const [selectedAlert, setSelectedAlert] = useState<IntegrityAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveAction, setResolveAction] = useState("");
  const [suspendUserId, setSuspendUserId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showReviewed, setShowReviewed] = useState(false);

  const alertsQuery = useQuery<IntegrityAlert[]>({
    queryKey: ["/api/admin/integrity/alerts"],
    refetchInterval: 30000,
  });

  const verifyStatsQuery = useQuery<VerificationStats>({
    queryKey: ["/api/admin/integrity/verification-stats"],
    refetchInterval: 60000,
  });

  const discordQuery = useQuery<DiscordBinding[]>({
    queryKey: ["/api/admin/integrity/discord-bindings"],
    refetchInterval: 60000,
  });

  const bypassQuery = useQuery<TierBypassStats>({
    queryKey: ["/api/admin/integrity/tier-bypass-stats"],
    refetchInterval: 60000,
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { alertId: number; notes: string; actionTaken: string }) =>
      apiRequest("/api/admin/integrity/resolve-alert", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrity/alerts"] });
      setSelectedAlert(null);
      setResolveNotes("");
      setResolveAction("");
      toast({ title: "Alert resolved", description: "The alert has been marked as reviewed." });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (data: { userId: number; reason: string }) =>
      apiRequest("/api/admin/integrity/suspend-discord", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrity/discord-bindings"] });
      setSuspendUserId(null);
      setSuspendReason("");
      toast({ title: "Discord binding suspended", description: "The operator's Discord webhook has been suspended." });
    },
  });

  const alerts = alertsQuery.data || [];
  const verifyStats = verifyStatsQuery.data;
  const discordBindings = discordQuery.data || [];
  const bypassStats = bypassQuery.data;

  const filteredAlerts = alerts.filter(a => {
    if (!showReviewed && a.reviewed) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterType !== "all" && a.alertType !== filterType) return false;
    return true;
  });

  const openAlerts = alerts.filter(a => !a.reviewed);
  const criticalAlerts = openAlerts.filter(a => a.severity === "critical" || a.severity === "high");

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Community Integrity Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time fraud detection for Discord operator abuse, card theft, tier bypassing, and credential sharing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            alertsQuery.refetch();
            verifyStatsQuery.refetch();
            discordQuery.refetch();
            bypassQuery.refetch();
          }}
          data-testid="button-refresh-integrity"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Open Alerts</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-open-alerts">{openAlerts.length}</div>
            {criticalAlerts.length > 0 && (
              <div className="text-xs text-red-400 mt-1">{criticalAlerts.length} critical/high</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Verifications (24h)</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-verifications">{verifyStats?.last24h ?? "—"}</div>
            {verifyStats && (
              <div className="text-xs text-muted-foreground mt-1">{verifyStats.failureRate}% failure rate</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Discord Operators</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-discord-operators">{discordBindings.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {discordBindings.filter(b => b.status === "active").length} active
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Bypass Attempts (24h)</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-bypass-attempts">{bypassStats?.total24h ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {bypassStats?.byUser.length ?? 0} distinct accounts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList className="bg-card/60 border border-border/50">
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts
            {openAlerts.length > 0 && (
              <Badge className="ml-2 h-4 text-[10px] px-1 bg-red-500/80">{openAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cards" data-testid="tab-cards">Card Verification</TabsTrigger>
          <TabsTrigger value="discord" data-testid="tab-discord">Discord Operators</TabsTrigger>
          <TabsTrigger value="bypass" data-testid="tab-bypass">Tier Bypass Log</TabsTrigger>
          <TabsTrigger value="guide" data-testid="tab-guide">Fraud Guide</TabsTrigger>
        </TabsList>

        {/* ── Alerts Tab ── */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 flex-wrap">
              {["all", "critical", "high", "medium", "low"].map(s => (
                <Button
                  key={s}
                  variant={filterSeverity === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSeverity(s)}
                  data-testid={`filter-severity-${s}`}
                  className="h-7 text-xs capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "card_velocity_abuse", "fake_card_circulation", "credential_sharing", "tier_bypass_attempt", "mass_verification_attempt"].map(t => (
                <Button
                  key={t}
                  variant={filterType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(t)}
                  data-testid={`filter-type-${t}`}
                  className="h-7 text-xs"
                >
                  {t === "all" ? "All Types" : alertTypeLabel(t as FraudAlertType)}
                </Button>
              ))}
            </div>
            <Button
              variant={showReviewed ? "default" : "outline"}
              size="sm"
              onClick={() => setShowReviewed(!showReviewed)}
              data-testid="toggle-show-reviewed"
              className="h-7 text-xs"
            >
              {showReviewed ? "Hide Reviewed" : "Show Reviewed"}
            </Button>
          </div>

          {alertsQuery.isLoading && (
            <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
          )}

          {!alertsQuery.isLoading && filteredAlerts.length === 0 && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-8 text-center">
                <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-green-400">No open alerts</p>
                <p className="text-xs text-muted-foreground mt-1">All systems operating normally. Alerts will appear here automatically when fraud patterns are detected.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <Card
                key={alert.id}
                className={`border bg-card/60 transition-all ${alert.reviewed ? "opacity-60" : ""} ${
                  alert.severity === "critical" ? "border-red-500/40" :
                  alert.severity === "high" ? "border-orange-500/30" : "border-border/50"
                }`}
                data-testid={`alert-card-${alert.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${severityColor(alert.severity)}`}>
                        {alertTypeIcon(alert.alertType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{alertTypeLabel(alert.alertType)}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border ${severityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.reviewed && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-green-400 border-green-500/30 bg-green-500/10">
                              REVIEWED
                            </Badge>
                          )}
                          {alert.autoActioned && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-400 border-blue-500/30 bg-blue-500/10">
                              AUTO-ACTIONED
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alert.username && <span className="font-mono text-foreground/70 mr-2">@{alert.username}</span>}
                          {alert.ipAddress && <span className="font-mono mr-2 text-orange-400/70">{alert.ipAddress}</span>}
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                        {alert.details?.note && (
                          <p className="text-xs text-muted-foreground mt-1.5 bg-muted/30 rounded p-2 border border-border/30">
                            {alert.details.note}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {Object.entries(alert.details).filter(([k]) => k !== "note").map(([k, v]) => (
                            <span key={k} className="text-[10px] text-muted-foreground">
                              <span className="text-foreground/50">{k.replace(/_/g, " ")}: </span>
                              <span className="font-mono text-foreground/80">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                        {alert.reviewed && alert.reviewNotes && (
                          <div className="mt-2 text-xs text-green-400/80 bg-green-500/5 rounded p-2 border border-green-500/20">
                            <span className="font-medium">Resolution: </span>{alert.reviewNotes}
                            {alert.actionTaken && <span className="ml-2 text-blue-400">• Action: {alert.actionTaken}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {!alert.reviewed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedAlert(alert); setResolveNotes(""); setResolveAction(""); }}
                        data-testid={`button-resolve-${alert.id}`}
                        className="shrink-0 gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Card Verification Tab ── */}
        <TabsContent value="cards" className="space-y-4">
          {verifyStatsQuery.isLoading && <div className="text-center py-8 text-muted-foreground">Loading verification data...</div>}
          {verifyStats && (
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Card className="border-border/50 bg-card/60">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Verifications</div>
                  <div className="text-2xl font-bold">{verifyStats.totalVerifications.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/60">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Last 24 Hours</div>
                  <div className="text-2xl font-bold">{verifyStats.last24h.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className={`border-border/50 bg-card/60 ${verifyStats.failureRate > 10 ? "border-red-500/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Failure Rate</div>
                  <div className={`text-2xl font-bold ${verifyStats.failureRate > 10 ? "text-red-400" : verifyStats.failureRate > 5 ? "text-yellow-400" : "text-green-400"}`}>
                    {verifyStats.failureRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">not_found + tampered</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Most Verified Cards (24h)
                </CardTitle>
                <CardDescription className="text-xs">High counts may indicate viral sharing or abuse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {verifyStats?.topVerifiedCards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                )}
                {verifyStats?.topVerifiedCards.map((c, i) => (
                  <div key={c.collectionId} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30" data-testid={`card-hot-${i}`}>
                    <div>
                      <span className="text-xs font-mono text-foreground/70">Collection #{c.collectionId}</span>
                      <div className="text-[10px] text-muted-foreground">{c.uniqueIps} unique IPs</div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${c.count >= 20 ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                      {c.count} checks
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-red-400" />
                  Suspicious IPs (24h)
                </CardTitle>
                <CardDescription className="text-xs">IPs with multiple failed verifications — possible fake card spread</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {verifyStats?.topAbusiveIps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No suspicious IPs detected</p>
                )}
                {verifyStats?.topAbusiveIps.map((ip, i) => (
                  <div key={ip.ip} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30" data-testid={`ip-suspicious-${i}`}>
                    <span className="text-xs font-mono text-orange-400/80">{ip.ip}</span>
                    <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-500/10">
                      {ip.failureCount} failures
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Discord Operators Tab ── */}
        <TabsContent value="discord" className="space-y-4">
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wifi className="h-4 w-4 text-purple-400" />
                Registered Discord Operators
              </CardTitle>
              <CardDescription className="text-xs">
                Community Operator plan subscribers with registered Discord servers. Each account is bound to exactly one server.
                Operators sharing webhooks or running multiple servers on a single plan will be flagged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {discordQuery.isLoading && <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>}
              {!discordQuery.isLoading && discordBindings.length === 0 && (
                <div className="text-center py-8">
                  <Wifi className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No Discord operators registered yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Operators will appear here once they set up their webhook</p>
                </div>
              )}
              <div className="space-y-3">
                {discordBindings.map(b => (
                  <div key={b.id} className={`p-4 rounded-lg border ${b.status === "suspended" ? "border-red-500/30 bg-red-500/5" : b.status === "active" ? "border-green-500/20 bg-green-500/5" : "border-border/40 bg-muted/20"}`} data-testid={`discord-binding-${b.userId}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">@{(b as any).username || `User #${b.userId}`}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${
                            b.status === "active" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                            b.status === "suspended" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                            "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                          }`}>
                            {b.status.toUpperCase()}
                          </Badge>
                          {b.verified && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-400 border-blue-500/30 bg-blue-500/10">
                              DISCORD VERIFIED
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {b.discordServerName && <div>Server: <span className="text-foreground/70 font-medium">{b.discordServerName}</span>{b.discordMemberCount ? ` (${b.discordMemberCount.toLocaleString()} members)` : ""}</div>}
                          {b.discordServerId && <div className="font-mono text-[10px] text-foreground/40">Server ID: {b.discordServerId}</div>}
                          <div>Posts sent: <span className="font-medium text-foreground/70">{b.postsSent}</span>{b.lastPostAt ? ` • Last post: ${new Date(b.lastPostAt).toLocaleDateString()}` : ""}</div>
                          <div>Registered: {new Date(b.createdAt).toLocaleDateString()}</div>
                        </div>
                        {b.suspensionReason && (
                          <div className="text-xs text-red-400 mt-1.5 bg-red-500/10 rounded p-1.5 border border-red-500/20">
                            Suspension reason: {b.suspensionReason}
                          </div>
                        )}
                      </div>
                      {b.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs border-red-500/30 text-red-400"
                          onClick={() => setSuspendUserId(b.userId)}
                          data-testid={`button-suspend-${b.userId}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tier Bypass Tab ── */}
        <TabsContent value="bypass" className="space-y-4">
          {bypassQuery.isLoading && <div className="text-center py-8 text-muted-foreground">Loading...</div>}

          {bypassStats && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/50 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-yellow-400" />
                    Top Accounts Attempting Bypass (24h)
                  </CardTitle>
                  <CardDescription className="text-xs">Users repeatedly hitting gated routes — may indicate probing or intent to exploit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bypassStats.byUser.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No bypass attempts in last 24 hours</p>
                  )}
                  {bypassStats.byUser.map((u, i) => (
                    <div key={u.userId} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30" data-testid={`bypass-user-${i}`}>
                      <div>
                        <span className="text-xs font-medium">@{u.username}</span>
                        <div className="text-[10px] text-muted-foreground font-mono">{u.latestRoute}</div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${u.count >= 5 ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                        {u.count}x
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Most Targeted Routes (24h)
                  </CardTitle>
                  <CardDescription className="text-xs">Community/gated routes with most unauthorized access attempts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bypassStats.byRoute.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                  )}
                  {bypassStats.byRoute.map((r, i) => (
                    <div key={r.route} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30" data-testid={`bypass-route-${i}`}>
                      <span className="text-xs font-mono text-foreground/70">{r.route}</span>
                      <Badge variant="outline" className="text-xs border-border/50">{r.count}x</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Fraud Guide Tab ── */}
        <TabsContent value="guide" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: <CreditCard className="h-5 w-5 text-red-400" />,
                title: "Card Image Theft",
                color: "border-red-500/20",
                what: "Someone screenshots a Sors Intelligence Card and shares it in a Discord server claiming it's their own pick, or tries to pass it off as free content.",
                how: "Every card has a cryptographic SHA-256 signature tied to the issuing account and instance number. Anyone can verify a card at /c/:id — if the card is fake or stolen, the verification fails and shows 'NOT SORS CERTIFIED'.",
                action: "Card velocity alerts will fire if a card is checked from 20+ IPs in 24h. Review those alerts and compare them to which user owns that card collection.",
              },
              {
                icon: <Users className="h-5 w-5 text-orange-400" />,
                title: "Credential Sharing",
                color: "border-orange-500/20",
                what: "A group of people shares one Sharp ($49) account to all receive picks without each paying.",
                how: "The system tracks distinct IP addresses accessing the same account. 5+ distinct IPs within 24 hours triggers a 'credential_sharing' alert.",
                action: "Suspend the account pending identity verification. Require them to re-subscribe individually or upgrade to a Community Operator plan.",
              },
              {
                icon: <Lock className="h-5 w-5 text-yellow-400" />,
                title: "Tier Bypass Attempts",
                color: "border-yellow-500/20",
                what: "A Sharp or Edge subscriber repeatedly tries to access Max-gated routes (Life Changer Ticket, Discord Proof links, Card Verification tools).",
                how: "Every unauthorized access attempt is logged in the tier_bypass_log table with the user ID, route, and timestamp. 5+ attempts from the same account within 24h raises an alert.",
                action: "Review the bypass log, contact the user, and upsell them to the correct tier. Persistent probing should result in account suspension.",
              },
              {
                icon: <Server className="h-5 w-5 text-blue-400" />,
                title: "Bot / Mass Verification Scraping",
                color: "border-blue-500/20",
                what: "An automated script hits the card verification endpoint hundreds of times per hour — either a competitor scraping data or someone trying to reverse-engineer cards.",
                how: "50+ verification requests from a single IP in one hour triggers a 'mass_verification_attempt' alert. This is also logged in the Suspicious IPs section.",
                action: "Block the IP at the server level. If it's a competitor, document and consider legal action.",
              },
              {
                icon: <Wifi className="h-5 w-5 text-purple-400" />,
                title: "Discord Webhook Abuse",
                color: "border-purple-500/20",
                what: "A Community Operator ($499/mo) registers one server but shares their webhook URL with 10 other Discord servers to get community features for free.",
                how: "Each operator is bound to exactly one Discord server ID. Any webhook post will carry the registered server ID. If posts appear from unregistered servers, the system flags it.",
                action: "Suspend the Discord binding immediately. Require the operator to register each server as a separate Community Operator plan ($499/mo each).",
              },
              {
                icon: <Globe className="h-5 w-5 text-green-400" />,
                title: "Discord Partnership (Future)",
                color: "border-green-500/20",
                what: "Your plan to partner with Discord for signed account agreements — ensuring operators are verified Discord server owners before activating Community features.",
                how: "The database already has the discord_operator_bindings table ready. When you establish the Discord partnership, implement OAuth2 flow: operator clicks 'Connect Discord', Discord confirms they own the server, we store discord_user_id and discord_server_id as verified=true.",
                action: "Until Discord OAuth is live: manually verify operators by checking Discord server ownership before activating their binding. Use the Discord Operators tab to track status.",
              },
            ].map((item, i) => (
              <Card key={i} className={`border bg-card/60 ${item.color}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {item.icon}
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">What it is</div>
                    <p className="text-xs text-foreground/80">{item.what}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">How we detect it</div>
                    <p className="text-xs text-foreground/80">{item.how}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Action to take</div>
                    <p className="text-xs text-primary/90">{item.action}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Resolve Alert Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent data-testid="dialog-resolve-alert">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && severityIcon(selectedAlert.severity)}
              Resolve Alert: {selectedAlert && alertTypeLabel(selectedAlert.alertType)}
            </DialogTitle>
            <DialogDescription>
              Document your review and any action taken. This creates a permanent audit trail.
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-1.5">
                {selectedAlert.username && <div className="text-xs"><span className="text-muted-foreground">Account: </span><span className="font-mono">@{selectedAlert.username}</span></div>}
                {selectedAlert.ipAddress && <div className="text-xs"><span className="text-muted-foreground">IP: </span><span className="font-mono text-orange-400/80">{selectedAlert.ipAddress}</span></div>}
                <div className="text-xs"><span className="text-muted-foreground">Raised: </span>{new Date(selectedAlert.createdAt).toLocaleString()}</div>
                {Object.entries(selectedAlert.details).map(([k, v]) => (
                  <div key={k} className="text-xs"><span className="text-muted-foreground">{k.replace(/_/g, " ")}: </span><span className="font-mono">{String(v)}</span></div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Action Taken</label>
                <Input
                  placeholder="e.g. Account warned, Suspended, Escalated..."
                  value={resolveAction}
                  onChange={e => setResolveAction(e.target.value)}
                  data-testid="input-resolve-action"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Review Notes</label>
                <Textarea
                  placeholder="Document your findings and reasoning..."
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  rows={3}
                  data-testid="input-resolve-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)} data-testid="button-cancel-resolve">Cancel</Button>
            <Button
              onClick={() => selectedAlert && resolveMutation.mutate({ alertId: selectedAlert.id, notes: resolveNotes, actionTaken: resolveAction })}
              disabled={resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              {resolveMutation.isPending ? "Saving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Discord Dialog */}
      <Dialog open={suspendUserId !== null} onOpenChange={() => setSuspendUserId(null)}>
        <DialogContent data-testid="dialog-suspend-discord">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Suspend Discord Binding
            </DialogTitle>
            <DialogDescription>
              This immediately disables the operator's webhook and stops all Discord posts from their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Suspension Reason</label>
            <Textarea
              placeholder="e.g. Webhook shared across multiple unauthorized servers..."
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              rows={3}
              data-testid="input-suspend-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendUserId(null)} data-testid="button-cancel-suspend">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => suspendUserId && suspendMutation.mutate({ userId: suspendUserId, reason: suspendReason })}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              <Ban className="h-4 w-4 mr-1.5" />
              {suspendMutation.isPending ? "Suspending..." : "Suspend Binding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
