import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Bot, Play, Loader2, Clock, DollarSign, Shield, AlertTriangle,
  CheckCircle, Target, TrendingUp, FileText, FlaskConical, ListTodo,
  Calendar, ChevronDown, ChevronUp, BarChart3, Briefcase, Scale,
  RefreshCw, History, Eye, Lightbulb,
} from "lucide-react";

interface PriorityTask {
  task_id: string;
  title: string;
  description: string;
  owner: string;
  priority: "P1" | "P2" | "P3";
  due_by: string;
  effort_hours: number;
}

interface FinancialAction {
  action_id: string;
  description: string;
  expected_impact: string;
  confidence: number;
  scenarios: { worst_case: string; expected: string; best_case: string };
}

interface RiskAction {
  action_id: string;
  description: string;
  severity: string;
  expected_impact: string;
  confidence: number;
}

interface ComplianceAction {
  action_id: string;
  description: string;
  urgency: string;
  owner: string;
  requires_legal: boolean;
}

interface ExperimentSuggestion {
  id: string;
  hypothesis: string;
  metric: string;
  sample_size: number;
  rollout_plan: string;
}

interface AssistantOutput {
  tracing_id: string;
  timestamp: string;
  period: string;
  summary: string[];
  priority_tasks: PriorityTask[];
  financial_actions: FinancialAction[];
  risk_actions: RiskAction[];
  compliance_actions: ComplianceAction[];
  metrics: { kpis: Record<string, any>; alerts: string[] };
  budget_plan: { runway_months: number; allocations: Record<string, number>; recommendations: string[] };
  experiments: ExperimentSuggestion[];
  checklists: { daily: string[]; weekly: string[]; monthly: string[] };
  notes: { assumptions: string[]; data_sources: string[]; required_approvals: string[] };
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    P1: "bg-red-500/10 text-red-500 border-red-500/20",
    P2: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    P3: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return <Badge variant="outline" className={map[priority] || ""} data-testid={`badge-priority-${priority}`}>{priority}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return <Badge variant="outline" className={map[severity] || ""} data-testid={`badge-severity-${severity}`}>{severity}</Badge>;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    immediate: "bg-red-500/10 text-red-500 border-red-500/20",
    within_24h: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    within_week: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return <Badge variant="outline" className={map[urgency] || ""} data-testid={`badge-urgency-${urgency}`}>{urgency.replace(/_/g, " ")}</Badge>;
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 80 ? "text-green-500" : value >= 60 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex items-center gap-2" data-testid="confidence-meter">
      <Progress value={value} className="h-2 flex-1" />
      <span className={`text-xs font-mono font-semibold ${color}`}>{value}%</span>
    </div>
  );
}

export default function AdminAssistant() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [expandedFinancial, setExpandedFinancial] = useState<string | null>(null);

  const { data: latest, isLoading: latestLoading } = useQuery<AssistantOutput | { empty: boolean; message: string }>({
    queryKey: ["/api/admin/assistant/latest"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<AssistantOutput[]>({
    queryKey: ["/api/admin/assistant/history"],
  });

  const { data: context } = useQuery<any>({
    queryKey: ["/api/admin/assistant/context", period],
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/assistant/run", { period });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assistant/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assistant/history"] });
      toast({ title: "Report Generated", description: `${period} admin report is ready.` });
    },
    onError: (err: any) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const report = latest && !("empty" in latest) ? latest as AssistantOutput : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold" data-testid="text-page-title">Admin Assistant</h1>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">AI-Powered</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-32" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              data-testid="button-run-assistant"
            >
              {runMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Run Analysis</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {latestLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 w-48 bg-muted rounded mb-3" />
                  <div className="h-3 w-full bg-muted rounded mb-2" />
                  <div className="h-3 w-3/4 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!latestLoading && !report && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-state">No Reports Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Run the AI Admin Assistant to generate your first operational report with prioritized tasks, financial analysis, risk actions, and compliance checks.
              </p>
              <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} data-testid="button-run-first">
                {runMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Generate First Report
              </Button>
            </CardContent>
          </Card>
        )}

        {report && (
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid grid-cols-7 w-full" data-testid="tabs-assistant">
              <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks {report.priority_tasks.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{report.priority_tasks.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
              <TabsTrigger value="risk" data-testid="tab-risk">Risk</TabsTrigger>
              <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
              <TabsTrigger value="checklists" data-testid="tab-checklists">Checklists</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card data-testid="card-executive-summary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Executive Summary
                  </CardTitle>
                  <CardDescription>
                    {report.period} report &middot; {new Date(report.timestamp).toLocaleString()} &middot; Trace: {report.tracing_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.summary.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30" data-testid={`text-summary-${i}`}>
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(report.metrics.kpis).slice(0, 8).map(([key, value]) => (
                  <Card key={key} data-testid={`card-kpi-${key}`}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-lg font-bold mt-1">{typeof value === "number" ? value.toLocaleString() : String(value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {report.metrics.alerts.length > 0 && (
                <Card className="border-red-500/20" data-testid="card-metric-alerts">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      Active Alerts ({report.metrics.alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {report.metrics.alerts.map((alert, i) => (
                        <div key={i} className="text-sm p-2 rounded bg-red-500/5 text-red-600 dark:text-red-400" data-testid={`text-alert-${i}`}>
                          {alert}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card data-testid="card-budget-overview">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Budget Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Runway</span>
                      <span className="font-semibold">{report.budget_plan.runway_months.toFixed(1)} months</span>
                    </div>
                    {Object.entries(report.budget_plan.allocations).map(([cat, pct]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{cat.replace(/_/g, " ")}</span>
                          <span>{typeof pct === "number" ? `${pct}%` : pct}</span>
                        </div>
                        <Progress value={typeof pct === "number" ? pct : 0} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card data-testid="card-experiments">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-purple-500" />
                      Experiment Suggestions ({report.experiments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {report.experiments.map((exp, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1" data-testid={`card-experiment-${i}`}>
                            <p className="text-sm font-medium">{exp.hypothesis}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>Metric: {exp.metric}</span>
                              <span>&middot;</span>
                              <span>N={exp.sample_size?.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{exp.rollout_plan}</p>
                          </div>
                        ))}
                        {report.experiments.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No experiments suggested</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {report.notes.assumptions.length > 0 && (
                <Card data-testid="card-notes">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Notes & Assumptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Assumptions</p>
                        <ul className="space-y-1 list-disc pl-4">
                          {report.notes.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Data Sources</p>
                        <ul className="space-y-1 list-disc pl-4">
                          {report.notes.data_sources.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Required Approvals</p>
                        <ul className="space-y-1 list-disc pl-4">
                          {report.notes.required_approvals.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3">
              <Card data-testid="card-priority-tasks">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-primary" />
                    Priority Tasks ({report.priority_tasks.length})
                  </CardTitle>
                  <CardDescription>Ranked by impact, urgency, and ease of execution</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.priority_tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No priority tasks generated</p>
                  ) : (
                    <div className="space-y-2">
                      {report.priority_tasks.map((task) => (
                        <div
                          key={task.task_id}
                          className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)}
                          data-testid={`card-task-${task.task_id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PriorityBadge priority={task.priority} />
                              <span className="text-sm font-medium">{task.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{task.effort_hours}h
                              </span>
                              <span>{task.owner}</span>
                              {expandedTask === task.task_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                          {expandedTask === task.task_id && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {new Date(task.due_by).toLocaleDateString()}</span>
                                <span>Owner: {task.owner}</span>
                                <span>Effort: {task.effort_hours} hours</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card data-testid="card-runway">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Runway</p>
                    <p className="text-2xl font-bold">{report.budget_plan.runway_months.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">months</span></p>
                  </CardContent>
                </Card>
                <Card data-testid="card-actions-count">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Financial Actions</p>
                    <p className="text-2xl font-bold">{report.financial_actions.length}</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-avg-confidence">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Avg Confidence</p>
                    <p className="text-2xl font-bold">
                      {report.financial_actions.length > 0
                        ? Math.round(report.financial_actions.reduce((s, a) => s + a.confidence, 0) / report.financial_actions.length)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-financial-actions">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Financial Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.financial_actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No financial actions recommended</p>
                  ) : (
                    <div className="space-y-3">
                      {report.financial_actions.map((action) => (
                        <div
                          key={action.action_id}
                          className="border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedFinancial(expandedFinancial === action.action_id ? null : action.action_id)}
                          data-testid={`card-financial-${action.action_id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{action.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">Impact: {action.expected_impact}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <ConfidenceMeter value={action.confidence} />
                              {expandedFinancial === action.action_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                          {expandedFinancial === action.action_id && action.scenarios && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Scenario Analysis</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="p-2 rounded bg-red-500/5 border border-red-500/10">
                                  <p className="text-[10px] text-red-500 font-medium">Worst Case</p>
                                  <p className="text-xs mt-1">{action.scenarios.worst_case}</p>
                                </div>
                                <div className="p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                                  <p className="text-[10px] text-yellow-500 font-medium">Expected</p>
                                  <p className="text-xs mt-1">{action.scenarios.expected}</p>
                                </div>
                                <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                                  <p className="text-[10px] text-green-500 font-medium">Best Case</p>
                                  <p className="text-xs mt-1">{action.scenarios.best_case}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-budget-allocations">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Budget Allocations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(report.budget_plan.allocations).map(([cat, pct]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                          <span className="font-medium">{typeof pct === "number" ? `${pct}%` : pct}</span>
                        </div>
                        <Progress value={typeof pct === "number" ? pct : 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                  {report.budget_plan.recommendations.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Budget Recommendations</p>
                        <ul className="space-y-1 text-sm">
                          {report.budget_plan.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <TrendingUp className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <Card data-testid="card-risk-actions">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Risk Actions ({report.risk_actions.length})
                  </CardTitle>
                  <CardDescription>Limits, auto-layoff suggestions, user blocks, or investigative steps</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.risk_actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No risk actions identified</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Expected Impact</TableHead>
                          <TableHead>Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.risk_actions.map((action) => (
                          <TableRow key={action.action_id} data-testid={`row-risk-${action.action_id}`}>
                            <TableCell><SeverityBadge severity={action.severity} /></TableCell>
                            <TableCell className="text-sm">{action.description}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{action.expected_impact}</TableCell>
                            <TableCell><ConfidenceMeter value={action.confidence} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card data-testid="card-compliance-actions">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-500" />
                    Compliance Actions ({report.compliance_actions.length})
                  </CardTitle>
                  <CardDescription>Items requiring legal/KYC review, with urgency classification</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.compliance_actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No compliance actions required</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Legal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.compliance_actions.map((action) => (
                          <TableRow key={action.action_id} data-testid={`row-compliance-${action.action_id}`}>
                            <TableCell><UrgencyBadge urgency={action.urgency} /></TableCell>
                            <TableCell className="text-sm">{action.description}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{action.owner}</TableCell>
                            <TableCell>
                              {action.requires_legal ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Required</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">No</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checklists" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["daily", "weekly", "monthly"] as const).map((freq) => (
                  <Card key={freq} data-testid={`card-checklist-${freq}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 capitalize">
                        <Calendar className="h-4 w-4 text-primary" />
                        {freq} Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {(report.checklists[freq] || []).map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted/30" data-testid={`checklist-${freq}-${i}`}>
                              <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                          {(!report.checklists[freq] || report.checklists[freq].length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-4">No items</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card data-testid="card-report-history">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Report History ({history?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : !history || history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No report history</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Tasks</TableHead>
                          <TableHead>Financial</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Compliance</TableHead>
                          <TableHead>Trace ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((entry, i) => (
                          <TableRow key={i} data-testid={`row-history-${i}`}>
                            <TableCell className="text-sm">{new Date(entry.timestamp).toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline">{entry.period}</Badge></TableCell>
                            <TableCell className="text-sm font-medium">{entry.priority_tasks.length}</TableCell>
                            <TableCell className="text-sm font-medium">{entry.financial_actions.length}</TableCell>
                            <TableCell className="text-sm font-medium">{entry.risk_actions.length}</TableCell>
                            <TableCell className="text-sm font-medium">{entry.compliance_actions.length}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{entry.tracing_id.slice(0, 20)}...</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
