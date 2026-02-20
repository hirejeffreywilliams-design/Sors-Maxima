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
  { name: "Starter", percent: 0, color: "bg-gray-400" },
  { name: "Sharp", percent: 42, color: "bg-blue-500" },
  { name: "Elite", percent: 38, color: "bg-purple-500" },
  { name: "Whale", percent: 20, color: "bg-amber-500" },
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
    name: "Free Trial Duration",
    status: "Running" as const,
    variantA: "7-Day Trial",
    variantB: "14-Day Trial",
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

export default function AdminGrowth() {
  const [activeTab, setActiveTab] = useState("funnel");
  const maxMrr = Math.max(...mrrHistory.map((m) => m.value));

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
              <CardTitle className="text-base sm:text-lg">Acquisition Funnel</CardTitle>
              <CardDescription>Visitor to retained subscriber conversion pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnelStages.map((stage, i) => {
                const widthPercent = (stage.value / funnelStages[0].value) * 100;
                const prevStage = i > 0 ? funnelStages[i - 1] : null;
                const conversionRate = prevStage
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
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground" data-testid="text-overall-conversion">
                  Overall conversion: {((funnelStages[funnelStages.length - 1].value / funnelStages[0].value) * 100).toFixed(2)}%
                </p>
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">MRR</div>
                <div className="text-xl font-bold" data-testid="text-mrr">$47,350</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">ARR</div>
                <div className="text-xl font-bold" data-testid="text-arr">$568,200</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">ARPU</div>
                <div className="text-xl font-bold" data-testid="text-arpu">$19.40<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">LTV</div>
                <div className="text-xl font-bold" data-testid="text-ltv">$233</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">CAC</div>
                <div className="text-xl font-bold" data-testid="text-cac">$42</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">LTV:CAC</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-ltv-cac">5.5x</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Payback</div>
                <div className="text-xl font-bold" data-testid="text-payback">2.2<span className="text-xs text-muted-foreground font-normal"> mo</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">NRR</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-nrr">118%</div>
              </CardContent>
            </Card>
          </div>

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">A/B Test Experiments</CardTitle>
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
