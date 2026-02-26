import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  FlaskConical,
  BarChart3,
  ArrowRight,
  Globe,
  MousePointer,
  Share2,
  MessageSquare,
  Megaphone,
  CheckCircle,
  Clock,
  FileEdit,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Activity } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const funnelStages = [
  { label: "Visitors", value: 15420, color: "bg-blue-500" },
  { label: "Registrations", value: 2150, color: "bg-indigo-500" },
  { label: "Activated", value: 1280, color: "bg-violet-500" },
  { label: "Paid Subscribers", value: 340, color: "bg-purple-500" },
  { label: "Retained", value: 285, color: "bg-fuchsia-500" },
];

const channels = [
  { name: "Organic", percent: 45, icon: Globe },
  { name: "Direct", percent: 25, icon: MousePointer },
  { name: "Referral", percent: 15, icon: Share2 },
  { name: "Social", percent: 10, icon: MessageSquare },
  { name: "Paid", percent: 5, icon: Megaphone },
];

const cohortWeeks = ["Week 0", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];
const cohortData = [
  { cohort: "Jan 6", values: [100, 68, 55, 48, 42, 38, 35, 32, 30] },
  { cohort: "Jan 13", values: [100, 65, 52, 45, 39, 36, 33, 30, 28] },
  { cohort: "Jan 20", values: [100, 63, 50, 44, 38, 35, 32, 29, null] },
  { cohort: "Jan 27", values: [100, 66, 54, 46, 40, 37, 34, null, null] },
  { cohort: "Feb 3", values: [100, 64, 51, 44, 38, 35, null, null, null] },
  { cohort: "Feb 10", values: [100, 67, 53, 46, 39, null, null, null, null] },
  { cohort: "Feb 17", values: [100, 62, 49, 43, null, null, null, null, null] },
  { cohort: "Feb 24", values: [100, 65, 52, null, null, null, null, null, null] },
];

const avgRetention = [100, 65, 52, 45, 39, 36, 34, 30, 29];

const mrrHistory = [
  { month: "Jul", value: 28400 },
  { month: "Aug", value: 31200 },
  { month: "Sep", value: 34100 },
  { month: "Oct", value: 37800 },
  { month: "Nov", value: 41500 },
  { month: "Dec", value: 44200 },
  { month: "Jan", value: 47350 },
];

const revenueTiers = [
  { name: "Free", percent: 0, color: "bg-gray-400" },
  { name: "Sharp ($49)", percent: 42, color: "bg-blue-500" },
  { name: "Edge ($99)", percent: 38, color: "bg-purple-500" },
  { name: "Max ($249)", percent: 20, color: "bg-amber-500" },
];

const utmSources = [
  { source: "google", medium: "cpc", campaign: "sports-betting-q1", users: 3240, conversions: 186, revenue: 8920, rate: 5.7 },
  { source: "twitter", medium: "social", campaign: "launch-promo", users: 1580, conversions: 94, revenue: 4510, rate: 5.9 },
  { source: "podcast", medium: "sponsor", campaign: "sharp-picks-pod", users: 890, conversions: 72, revenue: 5640, rate: 8.1 },
  { source: "newsletter", medium: "email", campaign: "weekly-digest", users: 2100, conversions: 168, revenue: 7320, rate: 8.0 },
  { source: "reddit", medium: "organic", campaign: "r-sportsbetting", users: 1420, conversions: 62, revenue: 2480, rate: 4.4 },
];

const experiments = [
  {
    name: "Pricing Page CTA Color",
    status: "Completed" as const,
    variantA: "Blue CTA Button",
    variantB: "Green CTA Button",
    sampleSize: 4200,
    confidence: 96.2,
    winner: "B",
    lift: "+12.4%",
  },
  {
    name: "Onboarding Flow Length",
    status: "Running" as const,
    variantA: "5-Step Onboarding",
    variantB: "3-Step Onboarding",
    sampleSize: 1850,
    confidence: 78.5,
    winner: null,
    lift: "+5.1%",
  },
  {
    name: "Founding Member Discount",
    status: "Running" as const,
    variantA: "25% Off First 3 Months",
    variantB: "20% Off First Month",
    sampleSize: 2640,
    confidence: 88.3,
    winner: null,
    lift: "+8.7%",
  },
  {
    name: "Hero Section Copy",
    status: "Draft" as const,
    variantA: "Data-Driven Picks",
    variantB: "AI-Powered Insights",
    sampleSize: 0,
    confidence: 0,
    winner: null,
    lift: null,
  },
  {
    name: "Referral Reward Amount",
    status: "Completed" as const,
    variantA: "$10 Credit",
    variantB: "$25 Credit",
    sampleSize: 3100,
    confidence: 94.8,
    winner: "B",
    lift: "+22.1%",
  },
];

function getRetentionColor(value: number | null): string {
  if (value === null) return "";
  if (value >= 60) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (value >= 40) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  if (value >= 25) return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
  return "bg-red-500/20 text-red-700 dark:text-red-400";
}

function getExperimentStatusIcon(status: string) {
  switch (status) {
    case "Running": return <Clock className="w-3.5 h-3.5" />;
    case "Completed": return <CheckCircle className="w-3.5 h-3.5" />;
    case "Draft": return <FileEdit className="w-3.5 h-3.5" />;
    default: return null;
  }
}

function getExperimentStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "Running": return "default";
    case "Completed": return "secondary";
    case "Draft": return "outline";
    default: return "outline";
  }
}

interface LiveKPIs {
  totalEvents: number;
  uniqueUsers: number;
  ticketsGenerated: number;
  parlaysSimulated: number;
  ticketsSaved: number;
  ticketsShared: number;
  trialStarts: number;
  subscriptionStarts: number;
  affiliateClicks: number;
  trialToPayConversion: number;
  avgEventsPerUser: number;
}

interface LiveFunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

interface LiveExperiment {
  experimentId: string;
  variants: Array<{ variant: string; impressions: number; conversions: number; conversionRate: number }>;
}

export default function AdminGrowth() {
  useSEO({ title: "Growth Dashboard", description: "Growth metrics, cohort analysis, and retention tracking" });
  const [activeTab, setActiveTab] = useState("funnel");
  const maxMrr = Math.max(...mrrHistory.map((m) => m.value));

  const { data: liveKPIs, isLoading: kpisLoading } = useQuery<LiveKPIs>({
    queryKey: ["/api/admin/analytics/kpis"],
    refetchInterval: 15000,
  });

  const { data: liveFunnel } = useQuery<LiveFunnelStep[]>({
    queryKey: ["/api/admin/analytics/funnel"],
    refetchInterval: 15000,
  });

  const { data: liveExperiments } = useQuery<LiveExperiment[]>({
    queryKey: ["/api/admin/analytics/experiments"],
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <TrendingUp className="h-6 w-6 text-green-500" />
            Growth Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Marketing funnel, retention, revenue metrics, and experiments
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            Live Analytics KPIs
          </CardTitle>
          <CardDescription>Real-time event tracking and conversion metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {kpisLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : liveKPIs ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Tickets Generated</p>
                <p className="text-lg font-bold" data-testid="kpi-tickets-generated">{liveKPIs.ticketsGenerated}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Parlays Simulated</p>
                <p className="text-lg font-bold" data-testid="kpi-parlays-simulated">{liveKPIs.parlaysSimulated}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Tickets Saved</p>
                <p className="text-lg font-bold" data-testid="kpi-tickets-saved">{liveKPIs.ticketsSaved}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Visitor-to-Paid</p>
                <p className="text-lg font-bold" data-testid="kpi-trial-conversion">{liveKPIs.trialToPayConversion}%</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Affiliate Clicks</p>
                <p className="text-lg font-bold" data-testid="kpi-affiliate-clicks">{liveKPIs.affiliateClicks}</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Avg Events/User</p>
                <p className="text-lg font-bold" data-testid="kpi-avg-events">{liveKPIs.avgEventsPerUser}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No analytics data available yet. Events will appear as users interact with the app.</p>
          )}
          {liveFunnel && liveFunnel.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Live Event Funnel</p>
              <div className="space-y-1">
                {liveFunnel.filter(s => s.count > 0).map((step) => (
                  <div key={step.step} className="flex items-center gap-2">
                    <span className="text-xs w-32 truncate">{step.step}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(step.conversionRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">{step.count} ({step.conversionRate}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {liveExperiments && liveExperiments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Active A/B Experiments</p>
              {liveExperiments.map((exp) => (
                <div key={exp.experimentId} className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">{exp.experimentId}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {exp.variants.map((v) => (
                      <div key={v.variant} className="text-xs space-y-0.5">
                        <span className="font-medium">{v.variant}</span>
                        <span className="text-muted-foreground"> - {v.impressions} imp, {v.conversions} conv ({v.conversionRate}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="funnel" data-testid="tab-funnel">
            <Users className="w-4 h-4 mr-1" /> Funnel
          </TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">
            <BarChart3 className="w-4 h-4 mr-1" /> Retention
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="w-4 h-4 mr-1" /> Revenue
          </TabsTrigger>
          <TabsTrigger value="utm" data-testid="tab-utm">
            <Target className="w-4 h-4 mr-1" /> UTM
          </TabsTrigger>
          <TabsTrigger value="experiments" data-testid="tab-experiments">
            <FlaskConical className="w-4 h-4 mr-1" /> Experiments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Acquisition Funnel
                {liveFunnel && liveFunnel.length > 0 ? (
                  <Badge variant="default" className="text-xs" data-testid="badge-funnel-live">Live</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" data-testid="badge-funnel-sample">Sample Data</Badge>
                )}
              </CardTitle>
              <CardDescription>Visitor to retained subscriber conversion pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const funnelColors = ["bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500"];
                const activeFunnel = liveFunnel && liveFunnel.length > 0
                  ? liveFunnel.map((step, i) => ({
                      label: step.step,
                      value: step.count,
                      color: funnelColors[i % funnelColors.length],
                    }))
                  : funnelStages;
                const maxValue = activeFunnel.length > 0 ? activeFunnel[0].value : 1;

                return (
                  <>
                    {activeFunnel.map((stage, i) => {
                      const widthPercent = (stage.value / maxValue) * 100;
                      const prevStage = i > 0 ? activeFunnel[i - 1] : null;
                      const conversionRate = prevStage && prevStage.value > 0
                        ? ((stage.value / prevStage.value) * 100).toFixed(1)
                        : null;

                      return (
                        <div key={stage.label} data-testid={`funnel-stage-${i}`}>
                          {conversionRate && (
                            <div className="flex items-center gap-2 mb-1 ml-2">
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground" data-testid={`funnel-conversion-${i}`}>
                                {conversionRate}% conversion
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="w-32 sm:w-40 text-sm font-medium truncate">{stage.label}</div>
                            <div className="flex-1 h-8 rounded-md bg-muted relative">
                              <div
                                className={`h-full rounded-md ${stage.color} transition-all duration-500`}
                                style={{ width: `${widthPercent}%` }}
                              />
                            </div>
                            <div className="w-16 text-right text-sm font-semibold tabular-nums" data-testid={`funnel-value-${i}`}>
                              {stage.value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {activeFunnel.length > 0 && activeFunnel[0].value > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground" data-testid="text-overall-conversion">
                          Overall conversion: {((activeFunnel[activeFunnel.length - 1].value / activeFunnel[0].value) * 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Channel Breakdown</CardTitle>
              <CardDescription>Traffic acquisition by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-3" data-testid={`channel-${ch.name.toLowerCase()}`}>
                    <div className="flex items-center gap-2 w-24 sm:w-32">
                      <ch.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium">{ch.name}</span>
                    </div>
                    <div className="flex-1 h-6 rounded-md bg-muted relative">
                      <div
                        className="h-full rounded-md bg-blue-500 transition-all duration-500"
                        style={{ width: `${ch.percent}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold tabular-nums">
                      {ch.percent}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Cohort Retention</CardTitle>
              <CardDescription>Weekly cohort retention rates (% of users returning)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[80px]">Cohort</TableHead>
                      {cohortWeeks.map((w) => (
                        <TableHead key={w} className="text-center min-w-[64px] text-xs">{w}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortData.map((row, ri) => (
                      <TableRow key={row.cohort} data-testid={`cohort-row-${ri}`}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                          {row.cohort}
                        </TableCell>
                        {row.values.map((val, ci) => (
                          <TableCell
                            key={ci}
                            className={`text-center text-sm font-medium ${val !== null ? getRetentionColor(val) : ""}`}
                            data-testid={`retention-cell-${ri}-${ci}`}
                          >
                            {val !== null ? `${val}%` : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="sticky left-0 bg-background z-10 font-bold text-sm">
                        Average
                      </TableCell>
                      {avgRetention.map((val, ci) => (
                        <TableCell
                          key={ci}
                          className="text-center text-sm font-bold"
                          data-testid={`retention-avg-${ci}`}
                        >
                          {val}%
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4 mt-4">
          {(() => {
            const hasLiveRevenue = liveKPIs && liveKPIs.subscriptionStarts > 0;
            const mrr = hasLiveRevenue ? liveKPIs!.subscriptionStarts * 19.40 : 47350;
            const arr = mrr * 12;
            const arpu = hasLiveRevenue && liveKPIs!.uniqueUsers > 0 ? (mrr / liveKPIs!.uniqueUsers) : 19.40;
            const ltv = arpu * 12;
            const cac = hasLiveRevenue && liveKPIs!.subscriptionStarts > 0 && liveKPIs!.affiliateClicks > 0
              ? Math.round((liveKPIs!.affiliateClicks * 0.5) / liveKPIs!.subscriptionStarts)
              : 42;
            const ltvCac = cac > 0 ? (ltv / cac).toFixed(1) : "5.5";
            const payback = arpu > 0 ? (cac / arpu).toFixed(1) : "2.2";
            const nrr = hasLiveRevenue ? Math.round(100 + liveKPIs!.trialToPayConversion) : 118;

            return (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Revenue Metrics</span>
                  {hasLiveRevenue ? (
                    <Badge variant="default" className="text-xs" data-testid="badge-revenue-live">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs" data-testid="badge-revenue-sample">Sample Data</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">MRR</div>
                      <div className="text-xl font-bold" data-testid="text-mrr">${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">ARR</div>
                      <div className="text-xl font-bold" data-testid="text-arr">${arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">ARPU</div>
                      <div className="text-xl font-bold" data-testid="text-arpu">${arpu.toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">LTV</div>
                      <div className="text-xl font-bold" data-testid="text-ltv">${Math.round(ltv).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">CAC</div>
                      <div className="text-xl font-bold" data-testid="text-cac">${cac}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">LTV:CAC</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-ltv-cac">{ltvCac}x</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Payback</div>
                      <div className="text-xl font-bold" data-testid="text-payback">{payback}<span className="text-xs text-muted-foreground font-normal"> mo</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">NRR</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-nrr">{nrr}%</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Monthly MRR Growth</CardTitle>
              <CardDescription>Churn rate: 4.2% monthly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48" data-testid="chart-mrr-growth">
                {mrrHistory.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ${(m.value / 1000).toFixed(1)}k
                    </span>
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-12 bg-blue-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${(m.value / maxMrr) * 160}px` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{m.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Revenue by Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueTiers.map((tier) => (
                  <div key={tier.name} className="flex items-center gap-3" data-testid={`tier-${tier.name.toLowerCase()}`}>
                    <div className="w-20 text-sm font-medium">{tier.name}</div>
                    <div className="flex-1 h-6 rounded-md bg-muted relative">
                      <div
                        className={`h-full rounded-md ${tier.color} transition-all duration-500`}
                        style={{ width: `${tier.percent}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold tabular-nums">
                      {tier.percent}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utm" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">UTM Attribution</CardTitle>
              <CardDescription>Traffic sources and conversion performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="text-right">Conv. Rate</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utmSources.map((row, i) => (
                      <TableRow key={row.source} data-testid={`utm-row-${i}`}>
                        <TableCell className="font-medium">{row.source}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.medium}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.campaign}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.users.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.conversions}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.rate}%</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">${row.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4 mt-4">
          {liveExperiments && liveExperiments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  Live A/B Experiments
                  <Badge variant="default" className="text-xs" data-testid="badge-experiments-live">Live</Badge>
                </CardTitle>
                <CardDescription>Real-time experiment data from event tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveExperiments.map((exp, i) => {
                  const totalImpressions = exp.variants.reduce((sum, v) => sum + v.impressions, 0);
                  const bestVariant = exp.variants.reduce((best, v) => v.conversionRate > best.conversionRate ? v : best, exp.variants[0]);

                  return (
                    <div
                      key={exp.experimentId}
                      className="p-4 border rounded-md space-y-3"
                      data-testid={`live-experiment-${i}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{exp.experimentId}</h3>
                        <Badge variant="default" className="gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Running
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {exp.variants.map((v) => (
                          <div key={v.variant} className={`p-3 rounded-md border ${v.variant === bestVariant.variant && totalImpressions > 100 ? "border-green-500 bg-green-500/10" : ""}`}>
                            <div className="text-xs text-muted-foreground mb-1">{v.variant}</div>
                            <div className="text-sm font-medium">{v.impressions.toLocaleString()} impressions</div>
                            <div className="text-sm">{v.conversions} conversions ({v.conversionRate}%)</div>
                            {v.variant === bestVariant.variant && totalImpressions > 100 && (
                              <Badge variant="secondary" className="mt-1 text-xs">Leading</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                A/B Test Experiments
                <Badge variant="outline" className="text-xs" data-testid="badge-experiments-sample">Sample Data</Badge>
              </CardTitle>
              <CardDescription>Active and completed experiments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {experiments.map((exp, i) => (
                <div
                  key={exp.name}
                  className="p-4 border rounded-md space-y-3"
                  data-testid={`experiment-${i}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{exp.name}</h3>
                    <Badge variant={getExperimentStatusVariant(exp.status)} className="gap-1">
                      {getExperimentStatusIcon(exp.status)}
                      {exp.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-md border ${exp.winner === "A" ? "border-green-500 bg-green-500/10" : ""}`}>
                      <div className="text-xs text-muted-foreground mb-1">Variant A</div>
                      <div className="text-sm font-medium">{exp.variantA}</div>
                      {exp.winner === "A" && (
                        <Badge variant="secondary" className="mt-1 text-xs">Winner</Badge>
                      )}
                    </div>
                    <div className={`p-3 rounded-md border ${exp.winner === "B" ? "border-green-500 bg-green-500/10" : ""}`}>
                      <div className="text-xs text-muted-foreground mb-1">Variant B</div>
                      <div className="text-sm font-medium">{exp.variantB}</div>
                      {exp.winner === "B" && (
                        <Badge variant="secondary" className="mt-1 text-xs">Winner</Badge>
                      )}
                    </div>
                  </div>

                  {exp.status !== "Draft" && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span data-testid={`experiment-sample-${i}`}>
                        Sample: <span className="font-medium text-foreground">{exp.sampleSize.toLocaleString()}</span>
                      </span>
                      <span data-testid={`experiment-confidence-${i}`}>
                        Confidence: <span className="font-medium text-foreground">{exp.confidence}%</span>
                      </span>
                      {exp.lift && (
                        <span data-testid={`experiment-lift-${i}`}>
                          Lift: <span className="font-medium text-green-600 dark:text-green-400">{exp.lift}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
