import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, LayoutDashboard, Ticket, Brain, Lightbulb, BarChart3,
  Layers, Network, ShieldCheck, Activity, AlertTriangle, CheckCircle,
  Clock, Target, Cpu, ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    P0: "bg-red-500/10 text-red-500 border-red-500/20",
    P1: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    P2: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    P3: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    P4: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return <Badge variant="outline" className={map[priority] || ""} data-testid={`badge-priority-${priority}`}>{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    pending_review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    resolved: "bg-green-500/10 text-green-500 border-green-500/20",
    closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    escalated: "bg-red-500/10 text-red-500 border-red-500/20",
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    monitoring: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    degraded: "bg-red-500/10 text-red-500 border-red-500/20",
    retired: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    healthy: "bg-green-500/10 text-green-500 border-green-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    maintenance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    disabled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    compliant: "bg-green-500/10 text-green-500 border-green-500/20",
    non_compliant: "bg-red-500/10 text-red-500 border-red-500/20",
    review_needed: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    exempt: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    generated: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    sent: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    accepted: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    expired: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    auto_placed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    human_review: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  return <Badge variant="outline" className={map[status] || ""} data-testid={`badge-status-${status}`}>{status.replace(/_/g, " ")}</Badge>;
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score > 0.7 ? "bg-green-500/10 text-green-500 border-green-500/20" : score >= 0.5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20";
  return <Badge variant="outline" className={color} data-testid={`badge-confidence-${Math.round(score * 100)}`}>{(score * 100).toFixed(1)}%</Badge>;
}

function MetricCard({ label, value, icon: Icon, subtitle }: { label: string; value: string | number; icon?: any; subtitle?: string }) {
  return (
    <Card data-testid={`card-metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-4">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mb-1" />}
        <div className="text-2xl font-bold" data-testid={`value-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data: ticketMetrics, isLoading: tmLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/tickets/metrics"] });
  const { data: registryMetrics, isLoading: rmLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/features/metrics"] });

  if (tmLoading || rmLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading overview...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Ticket Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Tickets" value={ticketMetrics?.totalTickets ?? 0} icon={Ticket} />
          <MetricCard label="Open Tickets" value={ticketMetrics?.openTickets ?? 0} icon={AlertTriangle} />
          <MetricCard label="Resolved Tickets" value={ticketMetrics?.resolvedTickets ?? 0} icon={CheckCircle} />
          <MetricCard label="SLA Breach Rate" value={`${ticketMetrics?.slaBreachRate ?? 0}%`} icon={Clock} />
          <MetricCard label="Avg Resolution" value={`${ticketMetrics?.avgResolutionMinutes ?? 0}m`} icon={Target} />
          <MetricCard label="Avg Confidence" value={(ticketMetrics?.avgConfidenceScore ?? 0).toFixed(3)} icon={Brain} />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-3">Feature Registry Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <MetricCard label="Total Features" value={registryMetrics?.totalFeatures ?? 0} icon={Layers} />
          <MetricCard label="Healthy Features" value={registryMetrics?.healthyFeatures ?? 0} icon={CheckCircle} />
          <MetricCard label="Degraded Features" value={registryMetrics?.degradedFeatures ?? 0} icon={AlertTriangle} />
          <MetricCard label="Compliance Rate" value={`${registryMetrics?.complianceRate ?? 0}%`} icon={ShieldCheck} />
          <MetricCard label="Avg Uptime" value={`${registryMetrics?.avgUptime ?? 0}%`} icon={Activity} />
          <MetricCard label="Avg Error Rate" value={`${registryMetrics?.avgErrorRate ?? 0}%`} icon={AlertTriangle} />
          <MetricCard label="Constraint Violations" value={registryMetrics?.constraintViolations ?? 0} icon={ShieldCheck} />
        </div>
      </div>

      {ticketMetrics?.ticketsByPriority && (
        <>
          <Separator />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-tickets-by-priority">
              <CardHeader><CardTitle className="text-base">Tickets by Priority</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(ticketMetrics.ticketsByPriority as Record<string, number>).map(([p, count]) => (
                    <div key={p} className="flex items-center justify-between gap-3">
                      <PriorityBadge priority={p} />
                      <div className="flex-1"><Progress value={ticketMetrics.totalTickets > 0 ? (count / ticketMetrics.totalTickets) * 100 : 0} data-testid={`progress-priority-${p}`} /></div>
                      <span className="text-sm font-mono w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-tickets-by-type">
              <CardHeader><CardTitle className="text-base">Tickets by Type</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(ticketMetrics.ticketsByType as Record<string, number>).map(([t, count]) => (
                    <div key={t} className="flex items-center justify-between gap-3">
                      <span className="text-sm w-44 truncate">{t.replace(/_/g, " ")}</span>
                      <div className="flex-1"><Progress value={ticketMetrics.totalTickets > 0 ? (count / ticketMetrics.totalTickets) * 100 : 0} /></div>
                      <span className="text-sm font-mono w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function TicketsTab() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (priorityFilter !== "all") params.set("priority", priorityFilter);
  const qs = params.toString();

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orchestration/tickets", typeFilter, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orchestration/tickets${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/orchestration/tickets/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orchestration/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orchestration/tickets/metrics"] });
      toast({ title: "Ticket status updated" });
    },
    onError: () => toast({ title: "Failed to update ticket", variant: "destructive" }),
  });

  const ticketTypes = ["incident", "human_review", "business_rule_violation", "payment_issue", "fraud_alert", "kyc_issue", "system_alert", "confidence_ticket"];
  const ticketStatuses = ["open", "in_progress", "pending_review", "resolved", "closed", "escalated"];
  const priorities = ["P0", "P1", "P2", "P3", "P4"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter} data-testid="select-type-filter">
          <SelectTrigger className="w-48" data-testid="select-trigger-type"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-type-all">All Types</SelectItem>
            {ticketTypes.map(t => <SelectItem key={t} value={t} data-testid={`select-item-type-${t}`}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-trigger-status"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-status-all">All Statuses</SelectItem>
            {ticketStatuses.map(s => <SelectItem key={s} value={s} data-testid={`select-item-status-${s}`}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36" data-testid="select-trigger-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-priority-all">All</SelectItem>
            {priorities.map(p => <SelectItem key={p} value={p} data-testid={`select-item-priority-${p}`}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" data-testid="badge-ticket-count">{tickets.length} tickets</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading tickets...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t: any) => (
                <Fragment key={t.ticketId}>
                  <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === t.ticketId ? null : t.ticketId)} data-testid={`row-ticket-${t.ticketId}`}>
                    <TableCell className="font-mono text-xs">{t.ticketId.slice(0, 12)}...</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="max-w-64 truncate">{t.title}</TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-xs">{t.featureName}</TableCell>
                    <TableCell className="text-xs">{t.assignee || t.suggestedAssignee}</TableCell>
                    <TableCell className="text-xs">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" data-testid={`button-expand-${t.ticketId}`}>
                          {expandedId === t.ticketId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === t.ticketId && (
                    <TableRow key={`${t.ticketId}-details`}>
                      <TableCell colSpan={9}>
                        <div className="p-4 space-y-3 bg-muted/30 rounded-md">
                          <p className="text-sm">{t.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Update status:</span>
                            {ticketStatuses.filter(s => s !== t.status).map(s => (
                              <Button key={s} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: t.ticketId, status: s }); }} disabled={updateStatusMutation.isPending} data-testid={`button-status-${t.ticketId}-${s}`}>
                                {s.replace(/_/g, " ")}
                              </Button>
                            ))}
                          </div>
                          {t.comments?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-muted-foreground">Comments:</span>
                              {t.comments.map((c: any) => (
                                <div key={c.id} className="text-xs border rounded-md p-2">
                                  <span className="font-medium">{c.authorRole}</span> <span className="text-muted-foreground">{new Date(c.timestamp).toLocaleString()}</span>
                                  <p className="mt-1">{c.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap text-xs">
                            {t.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ConfidenceTicketsTab() {
  const { data: tickets = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/tickets/confidence"] });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading confidence tickets...</div>;

  return (
    <div className="space-y-4">
      <Badge variant="outline" data-testid="badge-confidence-count">{tickets.length} confidence tickets</Badge>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Selection</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Odds</TableHead>
              <TableHead>Win Prob</TableHead>
              <TableHead>EV</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Stake</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Auto-Send</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t: any) => {
              const confColor = t.confidenceScore > 0.7 ? "text-green-500" : t.confidenceScore >= 0.5 ? "text-yellow-500" : "text-red-500";
              return (
                <TableRow key={t.ticketId} data-testid={`row-confidence-${t.ticketId}`}>
                  <TableCell className="font-medium">{t.selection}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>{t.market?.sport}</div>
                      <div className="text-muted-foreground">{t.market?.match}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{t.oddsOffered?.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{(t.predictedWinProb * 100).toFixed(1)}%</TableCell>
                  <TableCell className="font-mono">{(t.expectedValue * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={t.confidenceScore * 100} className="w-16" data-testid={`progress-confidence-${t.ticketId}`} />
                      <span className={`text-xs font-mono ${confColor}`} data-testid={`value-confidence-${t.ticketId}`}>{(t.confidenceScore * 100).toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">${t.suggestedStake?.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.modelVersion}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={t.autoSendEligible ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"} data-testid={`badge-autosend-${t.ticketId}`}>
                      {t.autoSendEligible ? "Eligible" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={t.humanReviewRequired ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"} data-testid={`badge-review-${t.ticketId}`}>
                      {t.humanReviewRequired ? "Required" : "Auto"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecommendationsTab() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/recommendations/stats"] });
  const { data: recs = [], isLoading: recsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/recommendations"] });

  if (statsLoading) return <div className="text-center py-10 text-muted-foreground">Loading recommendations...</div>;

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Generated" value={stats.totalGenerated} icon={Lightbulb} />
          <MetricCard label="Overall Hit Rate" value={`${stats.overallHitRate}%`} icon={Target} />
          <MetricCard label="Overall ROI" value={`${stats.overallROI}%`} icon={BarChart3} />
          <MetricCard label="Avg Confidence" value={stats.avgConfidenceScore?.toFixed(3)} icon={Brain} />
          <MetricCard label="Avg Predicted EV" value={`${(stats.avgPredictedEV * 100).toFixed(2)}%`} icon={Activity} />
          <MetricCard label="In Human Review" value={stats.totalInHumanReview} icon={Eye} />
        </div>
      )}

      {stats?.sportBreakdown && (
        <Card data-testid="card-sport-breakdown">
          <CardHeader><CardTitle className="text-base">Sport Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sport</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Hit Rate</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.sportBreakdown as Record<string, any>).map(([sport, data]) => (
                  <TableRow key={sport} data-testid={`row-sport-${sport}`}>
                    <TableCell className="font-medium">{sport}</TableCell>
                    <TableCell>{data.count}</TableCell>
                    <TableCell>{data.hitRate}%</TableCell>
                    <TableCell className={data.roi >= 0 ? "text-green-500" : "text-red-500"}>{data.roi}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!recsLoading && (
        <Card data-testid="card-recommendations-list">
          <CardHeader><CardTitle className="text-base">Recent Recommendations ({recs.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Selection</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>EV</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recs.slice(0, 30).map((r: any) => (
                    <TableRow key={r.id} data-testid={`row-rec-${r.id}`}>
                      <TableCell className="font-medium">{r.selection}</TableCell>
                      <TableCell>{r.sport}</TableCell>
                      <TableCell className="text-xs max-w-40 truncate">{r.match}</TableCell>
                      <TableCell><ConfidenceBadge score={r.confidenceScore} /></TableCell>
                      <TableCell className="font-mono text-xs">{(r.expectedValue * 100).toFixed(2)}%</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell>
                        {r.outcome ? (
                          <Badge variant="outline" className={r.outcome === "won" ? "bg-green-500/10 text-green-500 border-green-500/20" : r.outcome === "lost" ? "bg-red-500/10 text-red-500 border-red-500/20" : ""} data-testid={`badge-outcome-${r.id}`}>
                            {r.outcome}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">pending</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModelPerformanceTab() {
  const { data: models = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/recommendations/models"] });
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading model performance...</div>;

  return (
    <div className="space-y-4">
      {models.map((m: any) => (
        <Card key={m.modelVersion} data-testid={`card-model-${m.modelVersion}`}>
          <CardHeader className="cursor-pointer" onClick={() => setExpandedModel(expandedModel === m.modelVersion ? null : m.modelVersion)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{m.modelVersion}</CardTitle>
                <Badge variant="outline" className="text-xs">{m.modelType}</Badge>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>Hit Rate: <strong>{m.hitRate}%</strong></span>
                <span>ROI: <strong className={m.realizedROI >= 0 ? "text-green-500" : "text-red-500"}>{m.realizedROI}%</strong></span>
                <span>Accuracy: <strong>{m.brierScore}</strong></span>
                <span>Drift: <strong>{m.calibrationDrift}</strong></span>
                <span className="text-muted-foreground">{m.totalPredictions.toLocaleString()} predictions</span>
                <Button size="icon" variant="ghost" data-testid={`button-expand-model-${m.modelVersion}`}>
                  {expandedModel === m.modelVersion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          {expandedModel === m.modelVersion && m.calibrationBins && (
            <CardContent>
              <h4 className="text-sm font-semibold mb-2">Calibration Bins</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bin Range</TableHead>
                    <TableHead>Predicted Avg</TableHead>
                    <TableHead>Actual Rate</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Deviation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.calibrationBins.map((bin: any, i: number) => (
                    <TableRow key={i} data-testid={`row-calibration-${m.modelVersion}-${i}`}>
                      <TableCell className="font-mono text-xs">{bin.binStart.toFixed(1)} - {bin.binEnd.toFixed(1)}</TableCell>
                      <TableCell className="font-mono text-xs">{bin.predictedAvg.toFixed(3)}</TableCell>
                      <TableCell className="font-mono text-xs">{bin.actualRate.toFixed(3)}</TableCell>
                      <TableCell>{bin.count}</TableCell>
                      <TableCell className={`font-mono text-xs ${bin.deviation > 0.05 ? "text-red-500" : "text-green-500"}`}>{bin.deviation.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>Last retrain: {new Date(m.lastRetrain).toLocaleDateString()}</span>
                <span>Last calibration check: {new Date(m.lastCalibrationCheck).toLocaleDateString()}</span>
                {m.experimentId && <Badge variant="outline" className="text-xs">{m.experimentId}</Badge>}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function FeatureRegistryTab() {
  const { data: features = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/features"] });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading features...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {features.map((f: any) => (
        <Card key={f.id} data-testid={`card-feature-${f.id}`}>
          <CardHeader className="cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base">{f.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">v{f.version}</Badge>
                  <span className="text-xs text-muted-foreground">{f.owner}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status} />
                <StatusBadge status={f.complianceStatus} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24">Health Score</span>
                <Progress value={f.healthScore} className="flex-1" data-testid={`progress-health-${f.id}`} />
                <span className="text-xs font-mono" data-testid={`value-health-${f.id}`}>{f.healthScore}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold" data-testid={`value-uptime-${f.id}`}>{f.uptime30d}%</div>
                  <div className="text-xs text-muted-foreground">Uptime 30d</div>
                </div>
                <div>
                  <div className="text-lg font-bold" data-testid={`value-errorrate-${f.id}`}>{f.errorRate}%</div>
                  <div className="text-xs text-muted-foreground">Error Rate</div>
                </div>
                <div>
                  <div className="text-lg font-bold" data-testid={`value-latency-${f.id}`}>{f.avgLatencyMs}ms</div>
                  <div className="text-xs text-muted-foreground">Avg Speed</div>
                </div>
              </div>

              {expandedId === f.id && (
                <div className="space-y-3 pt-3 border-t">
                  {f.businessRules?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Business Rules</h4>
                      {f.businessRules.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-xs py-1">
                          <Badge variant="outline" className={r.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}>{r.active ? "Active" : "Off"}</Badge>
                          <span>{r.rule}</span>
                          {r.threshold && <span className="text-muted-foreground">({r.threshold})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {f.safetyRules?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Safety Rules</h4>
                      {f.safetyRules.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-xs py-1">
                          <Badge variant="outline" className={r.compliant ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>{r.enforcement}</Badge>
                          <span>{r.rule}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {f.dependencies?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Dependencies</h4>
                      <div className="flex gap-1 flex-wrap">
                        {f.dependencies.map((d: string) => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  )}
                  {f.failureModes?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Failure Modes</h4>
                      {f.failureModes.map((fm: any, i: number) => (
                        <div key={i} className="text-xs py-1">
                          <span className="font-medium">{fm.mode}</span>
                          <span className="text-muted-foreground"> — Fallback: {fm.fallback}</span>
                          <span className="text-muted-foreground"> (tested {fm.lastTested})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)} data-testid={`button-expand-feature-${f.id}`}>
                {expandedId === f.id ? <><ChevronUp className="h-4 w-4 mr-1" /> Collapse</> : <><ChevronDown className="h-4 w-4 mr-1" /> Details</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CoordinationTab() {
  const { toast } = useToast();
  const { data: rules = [], isLoading: rulesLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/coordination-rules"] });
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orchestration/events", "20"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orchestration/events?limit=20", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: constraints = [], isLoading: constraintsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/orchestration/business-constraints"] });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/admin/orchestration/coordination-rules/${id}/toggle`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orchestration/coordination-rules"] });
      toast({ title: "Rule updated" });
    },
  });

  const toggleConstraintMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/admin/orchestration/business-constraints/${id}/toggle`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orchestration/business-constraints"] });
      toast({ title: "Constraint updated" });
    },
  });

  return (
    <div className="space-y-6">
      <Card data-testid="card-coordination-rules">
        <CardHeader><CardTitle className="text-base">Coordination Rules</CardTitle></CardHeader>
        <CardContent>
          {rulesLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Triggers</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id} data-testid={`row-rule-${r.id}`}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.priority}</Badge></TableCell>
                    <TableCell className="text-xs">{r.sourceFeatures?.join(", ")}</TableCell>
                    <TableCell className="text-xs">{r.targetFeatures?.join(", ")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.triggerCount}</TableCell>
                    <TableCell>
                      <Switch checked={r.enabled} onCheckedChange={(val) => toggleRuleMutation.mutate({ id: r.id, enabled: val })} disabled={toggleRuleMutation.isPending} data-testid={`switch-rule-${r.id}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-business-constraints">
        <CardHeader><CardTitle className="text-base">Business Constraints</CardTitle></CardHeader>
        <CardContent>
          {constraintsLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Enforcement</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constraints.map((c: any) => (
                  <TableRow key={c.id} data-testid={`row-constraint-${c.id}`}>
                    <TableCell>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.category}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.enforcement?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="font-mono text-xs" data-testid={`value-violations-${c.id}`}>{c.violationCount}</TableCell>
                    <TableCell>
                      <Switch checked={c.active} onCheckedChange={(val) => toggleConstraintMutation.mutate({ id: c.id, active: val })} disabled={toggleConstraintMutation.isPending} data-testid={`switch-constraint-${c.id}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-recent-events">
        <CardHeader><CardTitle className="text-base">Recent Events</CardTitle></CardHeader>
        <CardContent>
          {eventsLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : events.length === 0 ? <div className="text-muted-foreground text-sm">No recent events</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e: any) => (
                  <TableRow key={e.id} data-testid={`row-event-${e.id}`}>
                    <TableCell className="font-medium text-sm">{e.eventType}</TableCell>
                    <TableCell className="text-xs">{e.sourceFeature}</TableCell>
                    <TableCell className="text-xs">{e.targetFeature}</TableCell>
                    <TableCell><StatusBadge status={e.processingStatus} /></TableCell>
                    <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PoliciesTab() {
  const { data: autoSendPolicy, isLoading: aspLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/auto-send-policy"] });
  const { data: bankrollConfig, isLoading: bcLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/bankroll-config"] });
  const { data: slaMap, isLoading: slaLoading } = useQuery<any>({ queryKey: ["/api/admin/orchestration/tickets/sla-map"] });

  if (aspLoading || bcLoading || slaLoading) return <div className="text-center py-10 text-muted-foreground">Loading policies...</div>;

  return (
    <div className="space-y-6">
      {autoSendPolicy && (
        <Card data-testid="card-auto-send-policy">
          <CardHeader><CardTitle className="text-base">Auto-Send Policy</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Enabled</div>
                <Badge variant="outline" className={autoSendPolicy.enabled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"} data-testid="badge-autosend-enabled">
                  {autoSendPolicy.enabled ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Min Confidence</div>
                <div className="text-lg font-bold" data-testid="value-min-confidence">{autoSendPolicy.minConfidenceScore}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Min Win Prob</div>
                <div className="text-lg font-bold" data-testid="value-min-winprob">{autoSendPolicy.minPredictedWinProb}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Min Expected Value</div>
                <div className="text-lg font-bold" data-testid="value-min-ev">{autoSendPolicy.minExpectedValue}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Stake %</div>
                <div className="text-lg font-bold" data-testid="value-max-stake-pct">{autoSendPolicy.maxStakePercent}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Exposure/Market</div>
                <div className="text-lg font-bold" data-testid="value-max-exposure">${autoSendPolicy.maxExposurePerMarket}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Daily Auto-Sends</div>
                <div className="text-lg font-bold" data-testid="value-max-daily">{autoSendPolicy.maxDailyAutoSends}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Human Review Above</div>
                <div className="text-lg font-bold" data-testid="value-review-threshold">${autoSendPolicy.requireHumanReviewAboveStake}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cooldown</div>
                <div className="text-lg font-bold" data-testid="value-cooldown">{autoSendPolicy.cooldownMinutes}m</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Exclude Self-Excluded</div>
                <Badge variant="outline" className={autoSendPolicy.excludeSelfExcludedUsers ? "bg-green-500/10 text-green-500 border-green-500/20" : ""} data-testid="badge-exclude-selfexcluded">
                  {autoSendPolicy.excludeSelfExcludedUsers ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Exclude Restricted</div>
                <Badge variant="outline" className={autoSendPolicy.excludeRestrictedUsers ? "bg-green-500/10 text-green-500 border-green-500/20" : ""} data-testid="badge-exclude-restricted">
                  {autoSendPolicy.excludeRestrictedUsers ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">Last updated: {new Date(autoSendPolicy.lastUpdated).toLocaleString()}</div>
          </CardContent>
        </Card>
      )}

      {bankrollConfig && (
        <Card data-testid="card-bankroll-config">
          <CardHeader><CardTitle className="text-base">Bankroll Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Max % Per Bet</div>
                <div className="text-lg font-bold" data-testid="value-max-pct-bet">{bankrollConfig.maxPercentPerBet}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Exposure/Market</div>
                <div className="text-lg font-bold" data-testid="value-bankroll-exposure">${bankrollConfig.maxExposurePerMarket}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Daily Exposure</div>
                <div className="text-lg font-bold" data-testid="value-daily-exposure">${bankrollConfig.maxDailyExposure}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Max Concurrent Bets</div>
                <div className="text-lg font-bold" data-testid="value-max-concurrent">{bankrollConfig.maxConcurrentBets}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House Limit/User</div>
                <div className="text-lg font-bold" data-testid="value-house-limit-user">${bankrollConfig.houseLimitPerUser}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House Limit Total</div>
                <div className="text-lg font-bold" data-testid="value-house-limit-total">${bankrollConfig.houseLimitTotal?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cooldown After Loss</div>
                <div className="text-lg font-bold" data-testid="value-loss-cooldown">{bankrollConfig.cooldownMinutesAfterLoss}m</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">Last updated: {new Date(bankrollConfig.lastUpdated).toLocaleString()}</div>
          </CardContent>
        </Card>
      )}

      {slaMap && (
        <Card data-testid="card-sla-map">
          <CardHeader><CardTitle className="text-base">SLA Configuration</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target (minutes)</TableHead>
                  <TableHead>Escalation (minutes)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(slaMap as Record<string, any>).sort().map(([priority, sla]) => (
                  <TableRow key={priority} data-testid={`row-sla-${priority}`}>
                    <TableCell><PriorityBadge priority={priority} /></TableCell>
                    <TableCell className="font-mono" data-testid={`value-sla-target-${priority}`}>{sla.targetMinutes}</TableCell>
                    <TableCell className="font-mono" data-testid={`value-sla-escalate-${priority}`}>{sla.escalateAfterMinutes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminOrchestration() {
  useSEO({ title: "Orchestration", description: "Ticket management, feature registry, and recommendations" });
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="button-back-admin">
                <ArrowLeft className="h-4 w-4 mr-1" /> Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <Cpu className="h-5 w-5 text-primary" /> Orchestration Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Ticket management, feature registry, coordination & policies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap" data-testid="tabs-orchestration">
            <TabsTrigger value="overview" data-testid="tab-overview"><LayoutDashboard className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="tickets" data-testid="tab-tickets"><Ticket className="h-4 w-4 mr-1" /> Tickets</TabsTrigger>
            <TabsTrigger value="confidence" data-testid="tab-confidence"><Brain className="h-4 w-4 mr-1" /> Confidence</TabsTrigger>
            <TabsTrigger value="recommendations" data-testid="tab-recommendations"><Lightbulb className="h-4 w-4 mr-1" /> Recommendations</TabsTrigger>
            <TabsTrigger value="models" data-testid="tab-models"><BarChart3 className="h-4 w-4 mr-1" /> Model Performance</TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features"><Layers className="h-4 w-4 mr-1" /> Feature Registry</TabsTrigger>
            <TabsTrigger value="coordination" data-testid="tab-coordination"><Network className="h-4 w-4 mr-1" /> Coordination</TabsTrigger>
            <TabsTrigger value="policies" data-testid="tab-policies"><ShieldCheck className="h-4 w-4 mr-1" /> Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
          <TabsContent value="confidence"><ConfidenceTicketsTab /></TabsContent>
          <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>
          <TabsContent value="models"><ModelPerformanceTab /></TabsContent>
          <TabsContent value="features"><FeatureRegistryTab /></TabsContent>
          <TabsContent value="coordination"><CoordinationTab /></TabsContent>
          <TabsContent value="policies"><PoliciesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}