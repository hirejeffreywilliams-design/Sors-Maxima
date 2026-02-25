import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  HeartPulse,
  AlertTriangle,
  Shield,
  Search,
  Users,
  Activity,
  Clock,
  ChevronLeft,
  Send,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";

interface UserHealth {
  userId: string;
  username: string;
  riskScore: number;
  riskLevel: "healthy" | "at_risk" | "critical";
  factors: string[];
  eventCount: number;
  lastEvent: string;
  interventionCount: number;
  pendingInterventions: number;
}

interface HealthSummary {
  totalTracked: number;
  critical: number;
  atRisk: number;
  healthy: number;
  totalEvents: number;
  totalInterventions: number;
}

interface HealthEvent {
  id: string;
  type: string;
  severity: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface InterventionRecord {
  id: string;
  type: string;
  description: string;
  outcome?: string;
  outcomeNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface UserDetail {
  userId: string;
  username: string;
  risk: { score: number; level: string; factors: string[] };
  events: HealthEvent[];
  interventions: InterventionRecord[];
  suggestedActions: string[];
}

function getRiskColor(level: string) {
  if (level === "critical") return "text-red-500";
  if (level === "at_risk") return "text-amber-500";
  return "text-emerald-500";
}

function getRiskBadgeVariant(level: string): "destructive" | "secondary" | "outline" {
  if (level === "critical") return "destructive";
  if (level === "at_risk") return "secondary";
  return "outline";
}

function getSeverityColor(severity: string) {
  if (severity === "critical") return "text-red-500";
  if (severity === "high") return "text-orange-500";
  if (severity === "medium") return "text-amber-500";
  return "text-muted-foreground";
}

export default function AdminUserHealth() {
  useSEO({ title: "User Health", description: "Monitor user engagement and health scores" });
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: healthData, isLoading } = useQuery<{ users: UserHealth[]; summary: HealthSummary }>({
    queryKey: ["/api/admin/user-health"],
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ["/api/admin/user-health", selectedUserId],
    enabled: !!selectedUserId,
  });

  const createIntervention = useMutation({
    mutationFn: (data: { userId: string; username: string; type: string; description: string }) =>
      apiRequest("POST", "/api/admin/interventions", data),
    onSuccess: () => {
      toast({ title: "Intervention logged", description: "Action has been recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-health"] });
      if (selectedUserId) queryClient.invalidateQueries({ queryKey: ["/api/admin/user-health", selectedUserId] });
    },
  });

  const resolveIntervention = useMutation({
    mutationFn: ({ id, outcome, note }: { id: string; outcome: string; note: string }) =>
      apiRequest("POST", `/api/admin/interventions/${id}/outcome`, { outcome, note }),
    onSuccess: () => {
      toast({ title: "Outcome recorded" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-health"] });
      if (selectedUserId) queryClient.invalidateQueries({ queryKey: ["/api/admin/user-health", selectedUserId] });
    },
  });

  const summary = healthData?.summary;
  const users = (healthData?.users || [])
    .filter(u => filterLevel === "all" || u.riskLevel === filterLevel)
    .filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.userId.includes(search));

  if (selectedUserId && userDetail) {
    return (
      <UserDetailView
        detail={userDetail}
        isLoading={detailLoading}
        onBack={() => setSelectedUserId(null)}
        onIntervene={(type, desc) => createIntervention.mutate({ userId: userDetail.userId, username: userDetail.username, type, description: desc })}
        onResolve={(id, outcome, note) => resolveIntervention.mutate({ id, outcome, note })}
      />
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
                <HeartPulse className="w-6 h-6" />
                User Experience Health
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Monitor user satisfaction and intervene proactively</p>
            </div>
          </div>
        </header>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold" data-testid="text-total-tracked">{summary.totalTracked}</div>
                <div className="text-xs text-muted-foreground">Tracked Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <div className="text-2xl font-bold text-red-500" data-testid="text-critical-count">{summary.critical}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <TrendingDown className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold text-amber-500" data-testid="text-atrisk-count">{summary.atRisk}</div>
                <div className="text-xs text-muted-foreground">At Risk</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <div className="text-2xl font-bold text-emerald-500" data-testid="text-healthy-count">{summary.healthy}</div>
                <div className="text-xs text-muted-foreground">Healthy</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <Activity className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold" data-testid="text-total-events">{summary.totalEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <Shield className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold" data-testid="text-total-interventions">{summary.totalInterventions}</div>
                <div className="text-xs text-muted-foreground">Interventions</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-risk-filter">
              <SelectValue placeholder="Filter by risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading user health data...
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <HeartPulse className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No health events tracked yet.</p>
              <p className="text-xs mt-1">Events are logged automatically as users interact with the app.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <Card
                key={user.userId}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedUserId(user.userId)}
                data-testid={`card-user-health-${user.userId}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${user.riskLevel === "critical" ? "bg-red-500" : user.riskLevel === "at_risk" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div>
                        <div className="font-medium" data-testid={`text-username-${user.userId}`}>{user.username}</div>
                        <div className="text-xs text-muted-foreground">{user.eventCount} events</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getRiskColor(user.riskLevel)}`}>{user.riskScore}</div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                      </div>
                      <Badge variant={getRiskBadgeVariant(user.riskLevel)}>
                        {user.riskLevel === "at_risk" ? "At Risk" : user.riskLevel.charAt(0).toUpperCase() + user.riskLevel.slice(1)}
                      </Badge>
                      {user.pendingInterventions > 0 && (
                        <Badge variant="secondary">{user.pendingInterventions} pending</Badge>
                      )}
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  {user.factors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {user.factors.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserDetailView({
  detail,
  isLoading,
  onBack,
  onIntervene,
  onResolve,
}: {
  detail: UserDetail;
  isLoading: boolean;
  onBack: () => void;
  onIntervene: (type: string, description: string) => void;
  onResolve: (id: string, outcome: string, note: string) => void;
}) {
  const [interventionType, setInterventionType] = useState("support_prompt");
  const [interventionDesc, setInterventionDesc] = useState("");
  const [resolveNote, setResolveNote] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-list">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-detail-username">
              {detail.username}
              <Badge variant={getRiskBadgeVariant(detail.risk.level)}>
                Score: {detail.risk.score}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">User ID: {detail.userId}</p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-3xl font-bold ${getRiskColor(detail.risk.level)}`}>{detail.risk.score}</span>
                  <Badge variant={getRiskBadgeVariant(detail.risk.level)}>
                    {detail.risk.level === "at_risk" ? "At Risk" : detail.risk.level.charAt(0).toUpperCase() + detail.risk.level.slice(1)}
                  </Badge>
                </div>
                <Progress value={detail.risk.score} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.risk.factors.length > 0 ? (
                <div className="space-y-1">
                  {detail.risk.factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No risk factors detected</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Suggested Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {detail.suggestedActions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-3 h-3 text-primary shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events" data-testid="tab-events">Events ({detail.events.length})</TabsTrigger>
            <TabsTrigger value="interventions" data-testid="tab-interventions">Interventions ({detail.interventions.length})</TabsTrigger>
            <TabsTrigger value="new-action" data-testid="tab-new-action">New Action</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-2 mt-4">
            {detail.events.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">No events recorded</CardContent>
              </Card>
            ) : (
              detail.events.slice(0, 50).map((event) => (
                <Card key={event.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <span className="font-medium text-sm">{event.type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {Object.entries(event.metadata).map(([k, v]) => (
                          <span key={k} className="mr-3">{k}: {String(v)}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="interventions" className="space-y-2 mt-4">
            {detail.interventions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">No interventions yet</CardContent>
              </Card>
            ) : (
              detail.interventions.map((intv) => (
                <Card key={intv.id}>
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{intv.type.replace(/_/g, " ")}</Badge>
                        {intv.outcome === "resolved" && <Badge variant="outline" className="text-emerald-500">Resolved</Badge>}
                        {intv.outcome === "escalated" && <Badge variant="destructive">Escalated</Badge>}
                        {intv.outcome === "no_response" && <Badge variant="secondary">No Response</Badge>}
                        {(!intv.outcome || intv.outcome === "pending") && <Badge variant="secondary">Pending</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(intv.createdAt).toLocaleString()}</span>
                    </div>
                    {intv.description && <p className="text-sm text-muted-foreground">{intv.description}</p>}
                    {intv.outcomeNote && <p className="text-xs text-muted-foreground">Note: {intv.outcomeNote}</p>}

                    {(!intv.outcome || intv.outcome === "pending") && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Input
                          placeholder="Resolution note..."
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          className="flex-1 min-w-[200px]"
                          data-testid={`input-resolve-${intv.id}`}
                        />
                        <Button size="sm" onClick={() => { onResolve(intv.id, "resolved", resolveNote); setResolveNote(""); }} className="gap-1" data-testid={`button-resolve-${intv.id}`}>
                          <CheckCircle className="w-3 h-3" /> Resolved
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { onResolve(intv.id, "escalated", resolveNote); setResolveNote(""); }} className="gap-1" data-testid={`button-escalate-${intv.id}`}>
                          <ArrowUpRight className="w-3 h-3" /> Escalate
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { onResolve(intv.id, "no_response", resolveNote); setResolveNote(""); }} className="gap-1" data-testid={`button-noresponse-${intv.id}`}>
                          <XCircle className="w-3 h-3" /> No Response
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="new-action" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Create Intervention</CardTitle>
                <CardDescription>Log an action taken to help this user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={interventionType} onValueChange={setInterventionType}>
                  <SelectTrigger data-testid="select-intervention-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recovery_modal">Recovery Modal Shown</SelectItem>
                    <SelectItem value="support_prompt">Support Prompt Sent</SelectItem>
                    <SelectItem value="credit_offer">Credit/Bonus Offered</SelectItem>
                    <SelectItem value="callback_scheduled">Callback Scheduled</SelectItem>
                    <SelectItem value="follow_up">Follow-up Outreach</SelectItem>
                    <SelectItem value="trial_extension">Trial Extension</SelectItem>
                    <SelectItem value="onboarding_reset">Onboarding Reset</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={interventionDesc}
                  onChange={(e) => setInterventionDesc(e.target.value)}
                  placeholder="Describe the action taken..."
                  data-testid="textarea-intervention-desc"
                />
                <Button
                  onClick={() => {
                    onIntervene(interventionType, interventionDesc);
                    setInterventionDesc("");
                  }}
                  disabled={!interventionDesc.trim()}
                  className="gap-2"
                  data-testid="button-create-intervention"
                >
                  <Send className="w-4 h-4" />
                  Log Intervention
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
