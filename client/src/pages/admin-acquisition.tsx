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
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  ArrowUpRight,
  Calendar,
  Layers,
  Minus,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/use-seo";

interface AcquisitionSummary {
  totalSpend: number;
  totalRevenue: number;
  totalSignups: number;
  totalDeposits: number;
  blendedCac: number;
  blendedRoas: number;
  overallConversionRate: number;
  avgLtv: number;
  ltvCacRatio: number;
  paybackPeriodDays: number;
}

interface ChannelMetrics {
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  signups: number;
  deposits: number;
  firstBets: number;
  revenue: number;
  cac: number;
  ltv: number;
  roas: number;
  conversionRate: number;
  ctr: number;
  trend: "up" | "down" | "stable";
}

interface KPIForecast {
  period: string;
  installs: number;
  signups: number;
  depositRate: number;
  firstWeekRetention: number;
  cac: number;
  ltv: number;
  revenue: number;
  netRevenue: number;
}

interface CohortLTV {
  cohort: string;
  day0: number;
  day7: number;
  day14: number;
  day30: number;
  day60: number;
  day90: number;
  projected365: number;
  userCount: number;
}

interface AttributionData {
  source: string;
  medium: string;
  campaign: string;
  signups: number;
  deposits: number;
  revenue: number;
  conversionRate: number;
}

interface AcquisitionDashboard {
  summary: AcquisitionSummary;
  channels: ChannelMetrics[];
  forecasts: KPIForecast[];
  cohortLtv: CohortLTV[];
  attribution: AttributionData[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function getLtvColor(value: number | null): string {
  if (value === null || value === undefined) return "";
  if (value >= 100) return "bg-green-500/30 text-green-700 dark:text-green-300";
  if (value >= 50) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (value >= 25) return "bg-green-500/10 text-green-800 dark:text-green-400";
  if (value > 0) return "bg-green-500/5 text-green-900 dark:text-green-500";
  return "";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function AdminAcquisition() {
  useSEO({ title: "Acquisition Analytics", description: "Track user acquisition channels and performance" });
  const [activeTab, setActiveTab] = useState("channels");

  const { data, isLoading } = useQuery<AcquisitionDashboard>({
    queryKey: ["/api/admin/acquisition"],
  });

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">No acquisition data available.</p>
      </div>
    );
  }

  const { summary, channels, forecasts, cohortLtv, attribution } = data;

  const sortedChannels = [...channels].sort((a, b) => b.spend - a.spend);
  const sortedAttribution = [...attribution].sort((a, b) => b.revenue - a.revenue);

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
            <Target className="h-6 w-6 text-blue-500" />
            Acquisition & CAC Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Channel performance, forecasts, cohort LTV, and attribution
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="channels" data-testid="tab-channels">
            <BarChart3 className="w-4 h-4 mr-1" /> Channel Performance
          </TabsTrigger>
          <TabsTrigger value="forecasts" data-testid="tab-forecasts">
            <Calendar className="w-4 h-4 mr-1" /> KPI Forecasts
          </TabsTrigger>
          <TabsTrigger value="cohort" data-testid="tab-cohort">
            <Layers className="w-4 h-4 mr-1" /> Cohort LTV
          </TabsTrigger>
          <TabsTrigger value="attribution" data-testid="tab-attribution">
            <ArrowUpRight className="w-4 h-4 mr-1" /> Attribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" /> Total Spend
                </div>
                <div className="text-xl font-bold" data-testid="text-total-spend">
                  {formatCurrency(summary.totalSpend)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" /> Total Revenue
                </div>
                <div className="text-xl font-bold" data-testid="text-total-revenue">
                  {formatCurrency(summary.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Users className="w-3 h-3" /> Blended CAC
                </div>
                <div className="text-xl font-bold" data-testid="text-blended-cac">
                  ${summary.blendedCac.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" /> Blended ROAS
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-blended-roas">
                  {summary.blendedRoas.toFixed(2)}x
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <ArrowUpRight className="w-3 h-3" /> LTV:CAC
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-ltv-cac-ratio">
                  {summary.ltvCacRatio}x
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" /> Payback Period
                </div>
                <div className="text-xl font-bold" data-testid="text-payback-period">
                  {summary.paybackPeriodDays}d
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Channel Performance</CardTitle>
              <CardDescription>All acquisition channels sorted by spend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Channel</TableHead>
                      <TableHead className="text-right min-w-[80px]">Spend</TableHead>
                      <TableHead className="text-right min-w-[90px]">Impressions</TableHead>
                      <TableHead className="text-right min-w-[70px]">Clicks</TableHead>
                      <TableHead className="text-right min-w-[60px]">CTR</TableHead>
                      <TableHead className="text-right min-w-[70px]">Signups</TableHead>
                      <TableHead className="text-right min-w-[70px]">Deposits</TableHead>
                      <TableHead className="text-right min-w-[70px]">Conv %</TableHead>
                      <TableHead className="text-right min-w-[70px]">CAC</TableHead>
                      <TableHead className="text-right min-w-[60px]">LTV</TableHead>
                      <TableHead className="text-right min-w-[60px]">ROAS</TableHead>
                      <TableHead className="text-right min-w-[80px]">Revenue</TableHead>
                      <TableHead className="text-center min-w-[60px]">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChannels.map((ch, i) => (
                      <TableRow key={ch.channel} data-testid={`channel-row-${i}`}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                          {ch.channel}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(ch.spend)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(ch.impressions)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(ch.clicks)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{ch.ctr.toFixed(1)}%</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(ch.signups)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(ch.deposits)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{ch.conversionRate}%</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">${ch.cac.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">${ch.ltv}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{ch.roas.toFixed(2)}x</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(ch.revenue)}</TableCell>
                        <TableCell className="text-center">
                          <TrendIcon trend={ch.trend} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecasts.map((forecast, i) => (
              <Card key={forecast.period} data-testid={`forecast-card-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    {forecast.period}
                  </CardTitle>
                  <CardDescription>Projected KPIs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Installs</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-installs-${i}`}>
                        {formatNumber(forecast.installs)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Signups</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-signups-${i}`}>
                        {formatNumber(forecast.signups)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deposit Rate</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-deposit-rate-${i}`}>
                        {forecast.depositRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">1st Week Retention</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-retention-${i}`}>
                        {forecast.firstWeekRetention}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CAC</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-cac-${i}`}>
                        ${forecast.cac.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">LTV</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-ltv-${i}`}>
                        ${forecast.ltv}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-lg font-bold tabular-nums" data-testid={`forecast-revenue-${i}`}>
                        {formatCurrency(forecast.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Revenue</p>
                      <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400" data-testid={`forecast-net-revenue-${i}`}>
                        {formatCurrency(forecast.netRevenue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cohort" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Cohort LTV Heatmap</CardTitle>
              <CardDescription>Lifetime value progression by cohort (higher = greener)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[90px]">Cohort</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Users</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 0</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 7</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 14</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 30</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 60</TableHead>
                      <TableHead className="text-center min-w-[64px] text-xs">Day 90</TableHead>
                      <TableHead className="text-center min-w-[80px] text-xs">Proj 365</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortLtv.map((row, ri) => {
                      const days: (keyof CohortLTV)[] = ["day0", "day7", "day14", "day30", "day60", "day90", "projected365"];
                      return (
                        <TableRow key={row.cohort} data-testid={`cohort-row-${ri}`}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                            {row.cohort}
                          </TableCell>
                          <TableCell className="text-center text-sm tabular-nums text-muted-foreground" data-testid={`cohort-users-${ri}`}>
                            {formatNumber(row.userCount)}
                          </TableCell>
                          {days.map((day) => {
                            const val = row[day] as number | null;
                            const isNull = val === null || val === undefined || (typeof val === 'number' && isNaN(val));
                            return (
                              <TableCell
                                key={day}
                                className={`text-center text-sm font-medium tabular-nums ${!isNull ? getLtvColor(val) : ""}`}
                                data-testid={`cohort-${ri}-${day}`}
                              >
                                {isNull ? "-" : `$${(val as number).toFixed(1)}`}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Attribution Breakdown</CardTitle>
              <CardDescription>Campaign-level attribution sorted by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Source</TableHead>
                      <TableHead className="min-w-[80px]">Medium</TableHead>
                      <TableHead className="min-w-[160px]">Campaign</TableHead>
                      <TableHead className="text-right min-w-[70px]">Signups</TableHead>
                      <TableHead className="text-right min-w-[70px]">Deposits</TableHead>
                      <TableHead className="text-right min-w-[80px]">Revenue</TableHead>
                      <TableHead className="text-right min-w-[70px]">Conv %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAttribution.map((attr, i) => (
                      <TableRow key={`${attr.source}-${attr.campaign}`} data-testid={`attribution-row-${i}`}>
                        <TableCell className="text-sm font-medium">{attr.source}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{attr.medium}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{attr.campaign}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(attr.signups)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatNumber(attr.deposits)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-medium">{formatCurrency(attr.revenue)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{attr.conversionRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
