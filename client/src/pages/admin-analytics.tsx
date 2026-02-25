import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  DollarSign,
  Users,
  Zap,
  Server,
  Database,
  Bell,
  BookOpen,
  Filter,
  RefreshCw,
  ChevronRight,
  Target,
  Cpu,
  HardDrive,
  Gauge,
  CreditCard,
  ShieldAlert,
  Bug,
  Timer,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return <Badge variant="outline" className={colors[severity] || ""}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: "bg-green-500/10 text-green-500 border-green-500/20",
    fail: "bg-red-500/10 text-red-500 border-red-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    met: "bg-green-500/10 text-green-500 border-green-500/20",
    at_risk: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    breached: "bg-red-500/10 text-red-500 border-red-500/20",
    active: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    firing: "bg-red-500/10 text-red-500 border-red-500/20",
    resolved: "bg-green-500/10 text-green-500 border-green-500/20",
    silenced: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return <Badge variant="outline" className={colors[status] || ""}>{status.replace("_", " ")}</Badge>;
}

export default function AdminAnalytics() {
  useSEO({ title: "Admin Analytics", description: "Platform-wide analytics and reporting dashboard" });
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/analytics/stats"] });
  const { data: overview, isLoading: overviewLoading } = useQuery<any>({ queryKey: ["/api/admin/analytics/overview"], enabled: activeTab === "overview" });
  const { data: funnel } = useQuery<any>({ queryKey: ["/api/admin/analytics/funnel"], enabled: activeTab === "funnel" });
  const { data: retention } = useQuery<any>({ queryKey: ["/api/admin/analytics/retention"], enabled: activeTab === "retention" });
  const { data: revenue } = useQuery<any>({ queryKey: ["/api/admin/analytics/revenue"], enabled: activeTab === "revenue" });
  const { data: errors } = useQuery<any>({ queryKey: ["/api/admin/analytics/errors"], enabled: activeTab === "errors" });
  const { data: payments } = useQuery<any>({ queryKey: ["/api/admin/analytics/payments"], enabled: activeTab === "payments" });
  const { data: health, refetch: refetchHealth } = useQuery<any>({ queryKey: ["/api/admin/analytics/health"], enabled: activeTab === "health", refetchInterval: activeTab === "health" ? 10000 : false });
  const { data: slos } = useQuery<any>({ queryKey: ["/api/admin/analytics/slos"], enabled: activeTab === "slos" });
  const { data: alerts } = useQuery<any>({ queryKey: ["/api/admin/analytics/alerts"], enabled: activeTab === "alerts" });
  const { data: dataQuality } = useQuery<any>({ queryKey: ["/api/admin/analytics/data-quality"], enabled: activeTab === "quality" });
  const { data: playbooks } = useQuery<any>({ queryKey: ["/api/admin/analytics/playbooks"], enabled: activeTab === "playbooks" });

  const toggleAlertMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/admin/analytics/alerts/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/alerts"] });
      toast({ title: "Alert rule updated" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="button-back-admin">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
                  <BarChart3 className="h-5 w-5 text-primary" /> Analytics Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">Product analytics, KPIs, health monitoring & incident management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="badge-slos-met">
                    <CheckCircle className="h-3 w-3 mr-1" /> {(stats as any).slosMet}/{(stats as any).slosTotal} SLOs Met
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20" data-testid="badge-alerts-active">
                    <Bell className="h-3 w-3 mr-1" /> {(stats as any).alertsActive} Active Alerts
                  </Badge>
                  {(stats as any).dataQualityFailing > 0 && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20" data-testid="badge-quality-failing">
                      <XCircle className="h-3 w-3 mr-1" /> {(stats as any).dataQualityFailing} Quality Fails
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="mb-6 flex-wrap" data-testid="tabs-analytics">
              <TabsTrigger value="overview" data-testid="tab-overview"><BarChart3 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
              <TabsTrigger value="funnel" data-testid="tab-funnel"><Filter className="h-4 w-4 mr-1" /> Funnel</TabsTrigger>
              <TabsTrigger value="retention" data-testid="tab-retention"><Users className="h-4 w-4 mr-1" /> Retention</TabsTrigger>
              <TabsTrigger value="revenue" data-testid="tab-revenue"><DollarSign className="h-4 w-4 mr-1" /> Revenue</TabsTrigger>
              <TabsTrigger value="health" data-testid="tab-health"><Activity className="h-4 w-4 mr-1" /> Health</TabsTrigger>
              <TabsTrigger value="errors" data-testid="tab-errors"><Bug className="h-4 w-4 mr-1" /> Errors</TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments"><CreditCard className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
              <TabsTrigger value="slos" data-testid="tab-slos"><Target className="h-4 w-4 mr-1" /> SLOs</TabsTrigger>
              <TabsTrigger value="alerts" data-testid="tab-alerts"><Bell className="h-4 w-4 mr-1" /> Alerts</TabsTrigger>
              <TabsTrigger value="quality" data-testid="tab-quality"><Shield className="h-4 w-4 mr-1" /> Data Quality</TabsTrigger>
              <TabsTrigger value="playbooks" data-testid="tab-playbooks"><BookOpen className="h-4 w-4 mr-1" /> Playbooks</TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            {overviewLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">Loading analytics...</div>
            ) : overview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {(overview as any).kpis?.slice(0, 15).map((kpi: any) => (
                    <Card key={kpi.id} data-testid={`card-kpi-${kpi.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.category}</span>
                          <TrendIcon trend={kpi.trend} />
                        </div>
                        <div className="text-2xl font-bold">
                          {kpi.unit === "$" ? `$${kpi.value.toLocaleString()}` : `${kpi.value.toLocaleString()}${kpi.unit === "%" ? "%" : kpi.unit === "ms" ? "ms" : ""}`}
                          {kpi.unit === "users" && <span className="text-sm font-normal text-muted-foreground ml-1">users</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">{kpi.name === "Latency" ? "Response Time" : kpi.name}</div>
                        <div className={`text-xs mt-1 ${kpi.changePercent > 0 ? (kpi.name.includes("Error") || kpi.name.includes("Churn") || kpi.name.includes("Latency") ? "text-red-500" : "text-green-500") : kpi.changePercent < 0 ? (kpi.name.includes("Error") || kpi.name.includes("Churn") || kpi.name.includes("Latency") ? "text-green-500" : "text-red-500") : "text-muted-foreground"}`}>
                          {kpi.changePercent > 0 ? "+" : ""}{kpi.changePercent}% vs prior period
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card data-testid="card-dau-trend">
                    <CardHeader>
                      <CardTitle className="text-base">DAU Trend (30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-40 flex items-end gap-1">
                        {(overview as any).timeSeries?.dau?.slice(-30).map((point: any, i: number) => {
                          const max = Math.max(...(overview as any).timeSeries.dau.map((p: any) => p.value));
                          const height = (point.value / max) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-primary/60 rounded-t hover:bg-primary transition-colors"
                                style={{ height: `${height}%` }}
                                title={`${point.timestamp}: ${Math.round(point.value).toLocaleString()}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>30 days ago</span>
                        <span>Today</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-revenue-trend">
                    <CardHeader>
                      <CardTitle className="text-base">Revenue Trend (30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-40 flex items-end gap-1">
                        {(overview as any).timeSeries?.revenue?.slice(-30).map((point: any, i: number) => {
                          const max = Math.max(...(overview as any).timeSeries.revenue.map((p: any) => p.value));
                          const height = (point.value / max) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-green-500/60 rounded-t hover:bg-green-500 transition-colors"
                                style={{ height: `${height}%` }}
                                title={`${point.timestamp}: $${Math.round(point.value).toLocaleString()}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>30 days ago</span>
                        <span>Today</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* FUNNEL TAB */}
          <TabsContent value="funnel">
            {funnel && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card data-testid="card-funnel-overall">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-primary">{(funnel as any).overallConversion}%</div>
                      <div className="text-sm text-muted-foreground">Overall Conversion</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-funnel-dropoff">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-red-500">{(funnel as any).biggestDropoff?.label}</div>
                      <div className="text-sm text-muted-foreground">Biggest Dropoff ({(funnel as any).biggestDropoff?.dropoff}%)</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-funnel-time">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold">{Math.round((funnel as any).avgTimeToConvert / 60)}m</div>
                      <div className="text-sm text-muted-foreground">Avg Time to Convert</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Acquisition Funnel</CardTitle>
                    <CardDescription>Install → Signup → First Ticket → Subscribe → Retain</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(funnel as any).funnel?.map((step: any, i: number) => {
                        const maxCount = (funnel as any).funnel[0].count;
                        return (
                          <div key={step.step} className="flex items-center gap-4" data-testid={`funnel-step-${step.step}`}>
                            <div className="w-40 text-sm font-medium truncate">{step.label}</div>
                            <div className="flex-1">
                              <div className="relative h-8 bg-muted rounded">
                                <div
                                  className="absolute inset-y-0 left-0 bg-primary/70 rounded transition-all"
                                  style={{ width: `${(step.count / maxCount) * 100}%` }}
                                />
                                <div className="absolute inset-0 flex items-center px-3 justify-between text-xs font-medium">
                                  <span>{step.count.toLocaleString()}</span>
                                  <span>{step.conversionRate}%</span>
                                </div>
                              </div>
                            </div>
                            {i > 0 && (
                              <div className="w-24 text-right text-xs text-red-400">
                                -{step.dropoff}% dropoff
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* RETENTION TAB */}
          <TabsContent value="retention">
            {retention && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card data-testid="card-retention-d1">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-500">{(retention as any).averageRetention?.day1}%</div>
                      <div className="text-sm text-muted-foreground">Avg Day 1 Retention</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-retention-d7">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-purple-500">{(retention as any).averageRetention?.day7}%</div>
                      <div className="text-sm text-muted-foreground">Avg Day 7 Retention</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-retention-d30">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-500">{(retention as any).averageRetention?.day30}%</div>
                      <div className="text-sm text-muted-foreground">Avg Day 30 Retention</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cohort Retention Heatmap</CardTitle>
                    <CardDescription>Weekly cohort retention percentages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cohort</TableHead>
                            <TableHead className="text-center">Size</TableHead>
                            <TableHead className="text-center">Day 1</TableHead>
                            <TableHead className="text-center">Day 3</TableHead>
                            <TableHead className="text-center">Day 7</TableHead>
                            <TableHead className="text-center">Day 14</TableHead>
                            <TableHead className="text-center">Day 30</TableHead>
                            <TableHead className="text-center">Day 60</TableHead>
                            <TableHead className="text-center">Day 90</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(retention as any).cohorts?.map((cohort: any) => (
                            <TableRow key={cohort.cohort} data-testid={`row-cohort-${cohort.cohort}`}>
                              <TableCell className="font-medium">{cohort.cohort}</TableCell>
                              <TableCell className="text-center">{cohort.cohortSize}</TableCell>
                              {["day1", "day3", "day7", "day14", "day30", "day60", "day90"].map(day => {
                                const val = cohort[day];
                                const bg = val === 0 ? "bg-muted" : val >= 40 ? "bg-green-500/30 text-green-200" : val >= 20 ? "bg-yellow-500/20 text-yellow-200" : val >= 10 ? "bg-orange-500/20 text-orange-200" : "bg-red-500/20 text-red-200";
                                return (
                                  <TableCell key={day} className={`text-center font-mono text-sm ${bg}`}>
                                    {val > 0 ? `${val}%` : "-"}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* REVENUE TAB */}
          <TabsContent value="revenue">
            {revenue && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Total Revenue", value: `$${((revenue as any).summary?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign },
                    { label: "Avg ARPU", value: `$${(revenue as any).summary?.avgARPU}`, icon: Users },
                    { label: "New MRR", value: `$${((revenue as any).summary?.totalNewMRR || 0).toLocaleString()}`, icon: TrendingUp },
                    { label: "Churned MRR", value: `$${((revenue as any).summary?.totalChurnedMRR || 0).toLocaleString()}`, icon: TrendingDown },
                    { label: "Net MRR Growth", value: `$${((revenue as any).summary?.netMRRGrowth || 0).toLocaleString()}`, icon: Zap },
                    { label: "Avg LTV", value: `$${(revenue as any).summary?.avgLTV}`, icon: Target },
                  ].map((m) => (
                    <Card key={m.label} data-testid={`card-revenue-${m.label.toLowerCase().replace(/\s/g, "-")}`}>
                      <CardContent className="p-4">
                        <m.icon className="h-4 w-4 text-muted-foreground mb-1" />
                        <div className="text-lg font-bold">{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Revenue (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 flex items-end gap-1">
                      {(revenue as any).metrics?.map((day: any, i: number) => {
                        const max = Math.max(...(revenue as any).metrics.map((d: any) => d.revenue));
                        const height = (day.revenue / max) * 100;
                        return (
                          <div key={i} className="flex-1">
                            <div
                              className="w-full bg-green-500/60 rounded-t hover:bg-green-500 transition-colors"
                              style={{ height: `${height}%` }}
                              title={`${day.date}: $${day.revenue.toLocaleString()}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* REAL-TIME HEALTH TAB */}
          <TabsContent value="health">
            {health && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Real-Time System Health</h2>
                  <Button variant="outline" size="sm" onClick={() => refetchHealth()} data-testid="button-refresh-health">
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Active Users", value: (health as any).activeUsers, icon: Users, color: "text-blue-500" },
                    { label: "Active Sessions", value: (health as any).activeSessions, icon: Activity, color: "text-green-500" },
                    { label: "Req/min", value: (health as any).requestsPerMinute, icon: Zap, color: "text-purple-500" },
                    { label: "Avg Response", value: `${(health as any).avgResponseTime}ms`, icon: Timer, color: "text-yellow-500" },
                    { label: "Error Rate", value: `${(health as any).errorRate}%`, icon: AlertTriangle, color: (health as any).errorRate > 1 ? "text-red-500" : "text-green-500" },
                    { label: "CPU Usage", value: `${(health as any).cpuUsage}%`, icon: Cpu, color: (health as any).cpuUsage > 80 ? "text-red-500" : "text-blue-500" },
                    { label: "Memory Usage", value: `${(health as any).memoryUsage}%`, icon: HardDrive, color: (health as any).memoryUsage > 80 ? "text-red-500" : "text-blue-500" },
                    { label: "Uptime", value: `${(health as any).uptime}%`, icon: Gauge, color: "text-green-500" },
                    { label: "DB Connections", value: (health as any).dbConnections, icon: Database, color: "text-indigo-500" },
                    { label: "Cache Hit Rate", value: `${(health as any).cacheHitRate}%`, icon: Server, color: "text-cyan-500" },
                    { label: "Queue Depth", value: (health as any).queueDepth, icon: Activity, color: (health as any).queueDepth > 10 ? "text-yellow-500" : "text-green-500" },
                    { label: "Last Deploy", value: new Date((health as any).lastDeployment).toLocaleDateString(), icon: Clock, color: "text-muted-foreground" },
                  ].map((m) => (
                    <Card key={m.label} data-testid={`card-health-${m.label.toLowerCase().replace(/\s/g, "-")}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <m.icon className={`h-4 w-4 ${m.color}`} />
                          <span className="text-xs text-muted-foreground">{m.label}</span>
                        </div>
                        <div className="text-2xl font-bold">{m.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ERRORS TAB */}
          <TabsContent value="errors">
            {errors && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card data-testid="card-total-errors">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-red-500">{(errors as any).summary?.totalErrors}</div>
                      <div className="text-sm text-muted-foreground">Total Errors</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-critical-errors">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{(errors as any).summary?.criticalErrors}</div>
                      <div className="text-sm text-muted-foreground">Critical</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-unresolved-errors">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-orange-500">{(errors as any).summary?.unresolvedErrors}</div>
                      <div className="text-sm text-muted-foreground">Unresolved</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-avg-error-rate">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold">{(errors as any).summary?.avgErrorRate}%</div>
                      <div className="text-sm text-muted-foreground">Avg Error Rate</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Error Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Users</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(errors as any).errors?.map((err: any) => (
                          <TableRow key={err.id} data-testid={`row-error-${err.id}`}>
                            <TableCell><SeverityBadge severity={err.severity} /></TableCell>
                            <TableCell className="font-medium">{err.errorType}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{err.message}</TableCell>
                            <TableCell className="text-right font-mono">{err.count}</TableCell>
                            <TableCell className="text-right">{err.affectedUsers}</TableCell>
                            <TableCell>
                              {err.resolved ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Open</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Endpoint Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead className="text-right">P50</TableHead>
                          <TableHead className="text-right">P95</TableHead>
                          <TableHead className="text-right">P99</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                          <TableHead className="text-right">Error Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(errors as any).performance?.map((perf: any) => (
                          <TableRow key={perf.endpoint} data-testid={`row-perf-${perf.endpoint}`}>
                            <TableCell className="font-mono text-sm">{perf.endpoint}</TableCell>
                            <TableCell className="text-right">{perf.p50}ms</TableCell>
                            <TableCell className={`text-right ${perf.p95 > 400 ? "text-yellow-500 font-medium" : ""}`}>{perf.p95}ms</TableCell>
                            <TableCell className={`text-right ${perf.p99 > 800 ? "text-red-500 font-medium" : ""}`}>{perf.p99}ms</TableCell>
                            <TableCell className="text-right">{perf.requestCount.toLocaleString()}</TableCell>
                            <TableCell className={`text-right ${perf.errorRate > 1 ? "text-red-500" : ""}`}>{perf.errorRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments">
            {payments && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Total Revenue", value: `$${((payments as any).summary?.totalRevenue || 0).toLocaleString()}` },
                    { label: "Transactions", value: (payments as any).summary?.totalTransactions?.toLocaleString() },
                    { label: "Success Rate", value: `${(payments as any).summary?.avgSuccessRate}%` },
                    { label: "Chargebacks", value: (payments as any).summary?.totalChargebacks },
                    { label: "Refunds", value: (payments as any).summary?.totalRefunds },
                    { label: "Refund Amount", value: `$${((payments as any).summary?.totalRefundAmount || 0).toLocaleString()}` },
                  ].map((m) => (
                    <Card key={m.label} data-testid={`card-payment-${m.label.toLowerCase().replace(/\s/g, "-")}`}>
                      <CardContent className="p-4">
                        <div className="text-lg font-bold">{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment Success Rate (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 flex items-end gap-1">
                      {(payments as any).metrics?.map((day: any, i: number) => {
                        const height = day.successRate;
                        const color = day.successRate >= 98 ? "bg-green-500/60" : day.successRate >= 95 ? "bg-yellow-500/60" : "bg-red-500/60";
                        return (
                          <div key={i} className="flex-1">
                            <div
                              className={`w-full ${color} rounded-t hover:opacity-80 transition-opacity`}
                              style={{ height: `${height}%` }}
                              title={`${day.date}: ${day.successRate}%`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* SLOs TAB */}
          <TabsContent value="slos">
            {slos && (
              <div className="space-y-4">
                {(slos as any[]).map((slo: any) => (
                  <Card key={slo.id} data-testid={`card-slo-${slo.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {slo.name}
                            <StatusBadge status={slo.status} />
                          </div>
                          <div className="text-sm text-muted-foreground">{slo.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{slo.current}{slo.metric.includes("percent") || slo.metric.includes("rate") || slo.metric.includes("conversion") ? "%" : slo.metric.includes("ms") ? "ms" : slo.metric.includes("sec") ? "s" : "%"}</div>
                          <div className="text-xs text-muted-foreground">Target: {slo.target}{slo.metric.includes("percent") || slo.metric.includes("rate") || slo.metric.includes("conversion") ? "%" : slo.metric.includes("ms") ? "ms" : slo.metric.includes("sec") ? "s" : "%"}</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Error Budget: {slo.window}</span>
                          <span>{Math.round((slo.budgetRemaining / slo.budget) * 100)}% remaining</span>
                        </div>
                        <Progress
                          value={Math.min((slo.budgetRemaining / slo.budget) * 100, 100)}
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts">
            {alerts && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alert Rules</CardTitle>
                    <CardDescription>Monitor critical metrics with configurable thresholds and escalation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Enabled</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Triggered</TableHead>
                          <TableHead>Escalation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(alerts as any[]).map((alert: any) => (
                          <TableRow key={alert.id} data-testid={`row-alert-${alert.id}`}>
                            <TableCell>
                              <Switch
                                checked={alert.enabled}
                                onCheckedChange={(checked) => toggleAlertMutation.mutate({ id: alert.id, enabled: checked })}
                                data-testid={`switch-alert-${alert.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{alert.name}</TableCell>
                            <TableCell className="text-sm font-mono">
                              {alert.metric} {alert.condition} {alert.threshold} ({alert.timeWindow})
                            </TableCell>
                            <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                            <TableCell><StatusBadge status={alert.status} /></TableCell>
                            <TableCell className="text-sm">
                              {alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleDateString() : "Never"}
                              {alert.triggerCount > 0 && <span className="text-muted-foreground ml-1">({alert.triggerCount}x)</span>}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate">{alert.escalation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* DATA QUALITY TAB */}
          <TabsContent value="quality">
            {dataQuality && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Card data-testid="card-quality-pass">
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-green-500">{(dataQuality as any[]).filter((d: any) => d.status === "pass").length}</div>
                      <div className="text-xs text-muted-foreground">Passing</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-quality-warning">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-yellow-500">{(dataQuality as any[]).filter((d: any) => d.status === "warning").length}</div>
                      <div className="text-xs text-muted-foreground">Warnings</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-quality-fail">
                    <CardContent className="p-4 text-center">
                      <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-red-500">{(dataQuality as any[]).filter((d: any) => d.status === "fail").length}</div>
                      <div className="text-xs text-muted-foreground">Failing</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Quality Checks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Check</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expected</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dataQuality as any[]).map((check: any) => (
                          <TableRow key={check.id} data-testid={`row-quality-${check.id}`}>
                            <TableCell><StatusBadge status={check.status} /></TableCell>
                            <TableCell className="font-medium">{check.name}</TableCell>
                            <TableCell><Badge variant="secondary">{check.type}</Badge></TableCell>
                            <TableCell className="font-mono text-sm">{check.expected}</TableCell>
                            <TableCell className="font-mono text-sm">{check.actual}</TableCell>
                            <TableCell><SeverityBadge severity={check.severity} /></TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{check.details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* INCIDENT PLAYBOOKS TAB */}
          <TabsContent value="playbooks">
            {playbooks && (
              <div className="space-y-4">
                {(playbooks as any[]).map((pb: any) => (
                  <Card key={pb.id} data-testid={`card-playbook-${pb.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {pb.title}
                            <SeverityBadge severity={pb.severity} />
                            <Badge variant="secondary">{pb.category}</Badge>
                          </CardTitle>
                          <CardDescription>{pb.description}</CardDescription>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Est. {pb.estimatedResolution}</div>
                          <div>Used {pb.useCount}x</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pb.steps.map((step: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                      {pb.lastUsed && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Last used: {new Date(pb.lastUsed).toLocaleString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
