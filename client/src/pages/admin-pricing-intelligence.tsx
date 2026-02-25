import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, DollarSign, TrendingUp, Crown, Target, Zap, BarChart3,
  Users, Gem, Shield, ArrowUpRight, CheckCircle, AlertTriangle
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

function formatCurrency(val: number | undefined | null): string {
  if (val == null) return "$0";
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatNum(val: number | undefined | null): string {
  if (val == null) return "0";
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return <Badge variant="outline" className={styles[priority] || ""}>{priority}</Badge>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="loading-skeleton">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
    </div>
  );
}

export default function AdminPricingIntelligence() {
  useSEO({ title: "Pricing & Wealth", description: "Revenue optimization & owner wealth projections" });
  const [, setLocation] = useLocation();

  const { data: pricingData, isLoading: pricingLoading } = useQuery<any>({ queryKey: ["/api/admin/pricing-intelligence"] });
  const { data: wealthData, isLoading: wealthLoading } = useQuery<any>({ queryKey: ["/api/admin/owner-wealth"] });
  const { data: competitorData, isLoading: competitorLoading } = useQuery<any>({ queryKey: ["/api/admin/competitor-benchmark"] });
  const { data: recsData, isLoading: recsLoading } = useQuery<any>({ queryKey: ["/api/admin/pricing-recommendations"] });
  const { data: growthData, isLoading: growthLoading } = useQuery<any>({ queryKey: ["/api/admin/growth-strategy"] });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Crown className="w-6 h-6 text-amber-500" /> Pricing & Wealth Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Revenue optimization, owner projections & market intelligence</p>
          </div>
        </div>

        <Tabs defaultValue="wealth" data-testid="tabs-pricing-intelligence">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="wealth" data-testid="tab-wealth">
              <DollarSign className="w-3 h-3 mr-1" /> Wealth Dashboard
            </TabsTrigger>
            <TabsTrigger value="optimizer" data-testid="tab-optimizer">
              <Target className="w-3 h-3 mr-1" /> Pricing Optimizer
            </TabsTrigger>
            <TabsTrigger value="playbook" data-testid="tab-playbook">
              <Zap className="w-3 h-3 mr-1" /> Growth Playbook
            </TabsTrigger>
            <TabsTrigger value="market" data-testid="tab-market">
              <BarChart3 className="w-3 h-3 mr-1" /> Market Position
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wealth" className="space-y-6 mt-4">
            {wealthLoading ? <LoadingSkeleton /> : wealthData ? (
              <>
                <Card className="border-amber-500/30" data-testid="card-take-home">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Monthly Take-Home (After Costs + Tax)</p>
                    <div className="text-5xl font-extrabold text-green-500" data-testid="text-take-home">
                      {formatCurrency(wealthData.monthlyBreakdown?.takeHome)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      from {formatCurrency(wealthData.currentMRR)} MRR across {wealthData.totalSubscribers} subscribers
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-revenue-waterfall">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Revenue Waterfall
                    </CardTitle>
                    <CardDescription>From gross revenue to take-home</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "Gross Revenue", value: wealthData.monthlyBreakdown?.grossRevenue, pct: null, color: "text-foreground" },
                        { label: "Infrastructure (-15%)", value: -wealthData.monthlyBreakdown?.infrastructure, pct: 15, color: "text-red-400" },
                        { label: "Data / APIs (-5%)", value: -wealthData.monthlyBreakdown?.dataApis, pct: 5, color: "text-red-400" },
                        { label: "Stripe Fees (-3%)", value: -wealthData.monthlyBreakdown?.stripeFees, pct: 3, color: "text-red-400" },
                        { label: "Marketing (-20%)", value: -wealthData.monthlyBreakdown?.marketing, pct: 20, color: "text-red-400" },
                        { label: "Legal (-5%)", value: -wealthData.monthlyBreakdown?.legal, pct: 5, color: "text-red-400" },
                        { label: "Pre-Tax Profit", value: wealthData.monthlyBreakdown?.preTaxProfit, pct: null, color: "text-blue-400" },
                        { label: "Taxes (-35%)", value: -wealthData.monthlyBreakdown?.taxes, pct: 35, color: "text-red-400" },
                        { label: "Take-Home", value: wealthData.monthlyBreakdown?.takeHome, pct: null, color: "text-green-500 font-bold" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm" data-testid={`waterfall-${i}`}>
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={item.color}>
                            {item.value != null && item.value < 0 ? "-" : ""}
                            ${Math.abs(item.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit Margin</span>
                      <span className="font-bold" data-testid="text-profit-margin">{wealthData.monthlyBreakdown?.profitMargin}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-valuation">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gem className="w-4 h-4 text-purple-500" /> Company Valuation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">ARR</p>
                        <p className="text-2xl font-bold" data-testid="text-arr">{formatCurrency(wealthData.valuation?.arr)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue Multiple</p>
                        <p className="text-2xl font-bold" data-testid="text-multiple">{wealthData.valuation?.revenueMultiple}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Valuation</p>
                        <p className="text-2xl font-bold text-purple-500" data-testid="text-valuation">{wealthData.valuation?.valuationFormatted}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">{wealthData.valuation?.multipleReason}</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-milestones">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" /> Milestone Tracker
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wealthData.milestones?.map((m: any, i: number) => (
                      <div key={i} className="space-y-1" data-testid={`milestone-${i}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {m.reached ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Target className="w-4 h-4 text-muted-foreground" />}
                            {m.label}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {m.reached ? "Reached" : m.monthsAway === Infinity ? "N/A" : `~${m.monthsAway} months away`}
                          </span>
                        </div>
                        <Progress value={m.progress} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card data-testid="card-wealth-projection">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" /> Personal Wealth Projection
                    </CardTitle>
                    <CardDescription>At current {wealthData.assumptions?.monthlyGrowthRate}/mo growth rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timeline</TableHead>
                          <TableHead>Projected MRR</TableHead>
                          <TableHead>Monthly Take-Home</TableHead>
                          <TableHead>Cumulative Wealth</TableHead>
                          <TableHead>Valuation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wealthData.wealthProjection?.map((w: any) => (
                          <TableRow key={w.months} data-testid={`projection-row-${w.months}`}>
                            <TableCell className="font-medium">{w.label}</TableCell>
                            <TableCell>{formatCurrency(w.projectedMRR)}</TableCell>
                            <TableCell className="text-green-500">{formatCurrency(w.monthlyTakeHome)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(w.cumulativeWealth)}</TableCell>
                            <TableCell>{formatCurrency(w.projectedValuation)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card data-testid="card-subscriber-milestones">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" /> Subscriber Milestone Projections
                    </CardTitle>
                    <CardDescription>Revenue at various subscriber counts ({wealthData.assumptions?.tierMixAssumption})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subscribers</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>MRR</TableHead>
                          <TableHead>Monthly Costs</TableHead>
                          <TableHead>Monthly Profit</TableHead>
                          <TableHead>Take-Home</TableHead>
                          <TableHead>Annual Take-Home</TableHead>
                          <TableHead>Valuation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wealthData.subscriberMilestones?.map((s: any) => (
                          <TableRow key={s.subscribers} data-testid={`sub-milestone-${s.subscribers}`}>
                            <TableCell className="font-medium">{formatNum(s.subscribers)}</TableCell>
                            <TableCell>{formatNum(s.paidSubscribers)}</TableCell>
                            <TableCell>{formatCurrency(s.mrr)}</TableCell>
                            <TableCell className="text-red-400">{formatCurrency(s.monthlyCosts)}</TableCell>
                            <TableCell>{formatCurrency(s.monthlyProfit)}</TableCell>
                            <TableCell className="text-green-500">{formatCurrency(s.monthlyTakeHome)}</TableCell>
                            <TableCell className="font-bold text-green-500">{formatCurrency(s.annualTakeHome)}</TableCell>
                            <TableCell>{formatCurrency(s.valuation)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-6 mt-4">
            {pricingLoading ? <LoadingSkeleton /> : pricingData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="tier-cards">
                  {pricingData.tierRevenue && Object.entries(pricingData.tierRevenue)
                    .filter(([tier]) => tier !== "free")
                    .map(([tier, info]: [string, any]) => (
                      <Card key={tier} data-testid={`card-tier-${tier}`}>
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{info.displayName}</p>
                          <p className="text-3xl font-bold">${info.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Subscribers</p>
                              <p className="font-bold" data-testid={`text-tier-count-${tier}`}>{info.count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Revenue</p>
                              <p className="font-bold" data-testid={`text-tier-revenue-${tier}`}>{formatCurrency(info.revenue)}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline">{info.percentage}% of MRR</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Current MRR</p>
                      <p className="text-2xl font-bold" data-testid="text-current-mrr">{formatCurrency(pricingData.currentMRR)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Current ARR</p>
                      <p className="text-2xl font-bold" data-testid="text-current-arr">{formatCurrency(pricingData.currentARR)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">ARPU (All)</p>
                      <p className="text-2xl font-bold" data-testid="text-arpu">${pricingData.arpu?.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Paid ARPU</p>
                      <p className="text-2xl font-bold" data-testid="text-paid-arpu">${pricingData.paidArpu?.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="card-price-sensitivity">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" /> Price Sensitivity Analysis
                    </CardTitle>
                    <CardDescription>Projected MRR at different price points per tier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pricingData.priceSensitivity && Object.entries(pricingData.priceSensitivity).map(([tier, data]: [string, any]) => (
                      <div key={tier} className="mb-6 last:mb-0">
                        <p className="font-medium text-sm mb-2 capitalize">{tier === "pro" ? "Sharp" : tier === "elite" ? "Edge" : "Max"} Tier</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Change</TableHead>
                              <TableHead>New Price</TableHead>
                              <TableHead>Projected MRR</TableHead>
                              <TableHead>MRR Delta</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.adjustments?.map((adj: any, i: number) => (
                              <TableRow key={i} className={adj.change === "Current" ? "bg-muted/30" : ""}>
                                <TableCell className="font-medium">{adj.change}</TableCell>
                                <TableCell>${adj.newPrice}</TableCell>
                                <TableCell>{formatCurrency(adj.projectedMRR)}</TableCell>
                                <TableCell className={adj.mrrDelta > 0 ? "text-green-500" : adj.mrrDelta < 0 ? "text-red-400" : ""}>
                                  {adj.mrrDelta > 0 ? "+" : ""}{formatCurrency(adj.mrrDelta)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {recsLoading ? <Skeleton className="h-40 w-full" /> : recsData?.recommendations?.length > 0 && (
                  <Card data-testid="card-pricing-recommendations">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Pricing Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recsData.recommendations.map((rec: any) => (
                        <div key={rec.id} className="border rounded-md p-4 space-y-2" data-testid={`rec-${rec.id}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <PriorityBadge priority={rec.priority} />
                            <Badge variant="secondary">{rec.category}</Badge>
                            <span className="font-medium text-sm">{rec.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div><span className="font-medium text-foreground">Impact:</span> {rec.expectedImpact}</div>
                            <div><span className="font-medium text-foreground">Implementation:</span> {rec.implementation}</div>
                            <div><span className="font-medium text-foreground">Timeframe:</span> {rec.timeframe}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card data-testid="card-annual-upsell">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-green-500" /> Annual Upsell Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Subscribers</p>
                        <p className="text-2xl font-bold">{pricingData.annualUpsellOpportunity?.monthlySubscribers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">If 25% Convert to Annual</p>
                        <p className="text-2xl font-bold text-green-500">+{formatCurrency(pricingData.annualUpsellOpportunity?.ifConverted25Pct)}/yr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">If 50% Convert to Annual</p>
                        <p className="text-2xl font-bold text-green-500">+{formatCurrency(pricingData.annualUpsellOpportunity?.ifConverted50Pct)}/yr</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{pricingData.annualUpsellOpportunity?.recommendation}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="playbook" className="space-y-6 mt-4">
            {growthLoading ? <LoadingSkeleton /> : growthData ? (
              <>
                <Card className="border-primary/30" data-testid="card-current-stage">
                  <CardContent className="p-6 text-center">
                    <Badge className="text-lg px-4 py-1 mb-3" data-testid="badge-growth-stage">
                      {growthData.currentStage?.name || "Unknown"}
                    </Badge>
                    <p className="text-sm text-muted-foreground mb-1">{growthData.currentStage?.range}</p>
                    <p className="text-sm max-w-2xl mx-auto">{growthData.currentStage?.description}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {growthData.currentStage?.keyMetrics?.map((metric: string, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                          <span data-testid={`metric-${i}`}>{metric}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card data-testid="card-pricing-actions">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Pricing Actions for Current Stage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {growthData.currentStage?.pricingActions?.map((action: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm" data-testid={`action-${i}`}>
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-product-focus">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Product Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {growthData.currentStage?.productFocus?.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm" data-testid={`product-focus-${i}`}>
                          <Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {growthData.currentStage?.marketingBudget && (
                  <Card data-testid="card-marketing-budget">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Marketing Budget Allocation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(growthData.currentStage.marketingBudget).map(([key, pct]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className="font-mono text-muted-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {growthData.pricingExperiments?.length > 0 && (
                  <Card data-testid="card-experiments">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" /> Pricing Experiments to Run
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {growthData.pricingExperiments.map((exp: any, i: number) => (
                        <div key={i} className="border rounded-md p-3 space-y-1" data-testid={`experiment-${i}`}>
                          <p className="font-medium text-sm">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">{exp.description}</p>
                          <p className="text-xs"><span className="font-medium">Expected Impact:</span> {exp.expectedImpact}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {growthData.currentStage?.monthsToNext != null && growthData.currentStage.monthsToNext > 0 && (
                  <Card data-testid="card-next-stage">
                    <CardContent className="p-4 flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Time to Next Stage</p>
                        <p className="text-sm text-muted-foreground">
                          Approximately <strong>{growthData.currentStage.monthsToNext} months</strong> at current growth rate
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card data-testid="card-all-stages">
                  <CardHeader>
                    <CardTitle className="text-base">All Growth Stages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {growthData.stages?.map((stage: any) => (
                        <div
                          key={stage.id}
                          className={`border rounded-md p-3 space-y-2 ${stage.id === growthData.currentStage?.id ? "border-primary bg-primary/5" : ""}`}
                          data-testid={`stage-${stage.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={stage.id === growthData.currentStage?.id ? "default" : "outline"} className="text-xs">
                              {stage.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{stage.range}</p>
                          <p className="text-xs line-clamp-3">{stage.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="market" className="space-y-6 mt-4">
            {competitorLoading ? <LoadingSkeleton /> : competitorData ? (
              <>
                <Card data-testid="card-competitor-table">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Competitor Pricing Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competitor</TableHead>
                          <TableHead>Monthly Price</TableHead>
                          <TableHead>Key Features</TableHead>
                          <TableHead>Your Advantage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitorData.competitors?.map((comp: any, i: number) => (
                          <TableRow key={i} data-testid={`competitor-row-${i}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{comp.name}</p>
                                <Badge variant="outline" className="text-xs mt-1">{comp.tier}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{comp.monthlyPrice}</TableCell>
                            <TableCell>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {comp.features?.slice(0, 3).map((f: string, j: number) => (
                                  <li key={j}>{f}</li>
                                ))}
                              </ul>
                            </TableCell>
                            <TableCell className="text-sm text-green-500">{comp.yourAdvantage}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card data-testid="card-positioning">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" /> Your Positioning
                    </CardTitle>
                    <CardDescription>{competitorData.positioning?.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{competitorData.positioning?.pricePosition}</p>

                    <div>
                      <p className="font-medium text-sm mb-2">Key Differentiators</p>
                      <div className="space-y-1">
                        {competitorData.positioning?.keyDifferentiators?.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm" data-testid={`differentiator-${i}`}>
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card data-testid="card-market-gaps">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-green-500" /> Market Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {competitorData.positioning?.marketGaps?.map((gap: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm" data-testid={`gap-${i}`}>
                          <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>{gap}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card data-testid="card-risks">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" /> Risks to Monitor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {competitorData.positioning?.risks?.map((risk: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm" data-testid={`risk-${i}`}>
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          <span>{risk}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
