import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, BarChart3,
  PieChart, RefreshCw, ArrowUpRight, ArrowDownRight, Target
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

export default function AdminFinancialProjections() {
  useSEO({ title: "Financial Projections", description: "Revenue forecasting, unit economics, and capital allocation" });
  const [, setLocation] = useLocation();
  const [activeScenario, setActiveScenario] = useState<"bull" | "baseline" | "bear">("baseline");
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/financial-projections"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-financial">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scenarios = data?.scenarios;
  const unitEcon = data?.unitEconomics;
  const capAlloc = data?.capitalAllocation;
  const currentData = scenarios?.[activeScenario] || [];

  const scenarioColors = { bull: "text-green-500", baseline: "text-blue-500", bear: "text-red-500" };
  const scenarioLabels = { bull: "Bull Case", baseline: "Baseline", bear: "Bear Case" };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Financial Projections</h1>
            <p className="text-sm text-muted-foreground">Scenario planning, unit economics & capital allocation</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="w-3 h-3" /> Current MRR
              </div>
              <div className="text-2xl font-bold" data-testid="text-mrr">${unitEcon?.currentMRR?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="w-3 h-3" /> ARPU
              </div>
              <div className="text-2xl font-bold" data-testid="text-arpu">${unitEcon?.currentARPU}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3 h-3" /> LTV/CAC
              </div>
              <div className="text-2xl font-bold text-green-500" data-testid="text-ltv-cac">{unitEcon?.ltvCacRatio}x</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BarChart3 className="w-3 h-3" /> Gross Margin
              </div>
              <div className="text-2xl font-bold" data-testid="text-margin">{unitEcon?.grossMargin}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit Economics Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><span className="text-muted-foreground block text-xs">CAC</span><span className="font-bold">${unitEcon?.currentCAC}</span></div>
              <div><span className="text-muted-foreground block text-xs">LTV</span><span className="font-bold">${unitEcon?.currentLTV}</span></div>
              <div><span className="text-muted-foreground block text-xs">Payback</span><span className="font-bold">{unitEcon?.paybackMonths} months</span></div>
              <div><span className="text-muted-foreground block text-xs">Revenue/Ticket</span><span className="font-bold">${unitEcon?.revenuePerTicket}</span></div>
              <div><span className="text-muted-foreground block text-xs">Margin/Ticket</span><span className="font-bold text-green-500">${unitEcon?.marginPerTicket}</span></div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="projections">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="projections" data-testid="tab-projections">
              <TrendingUp className="w-3 h-3 mr-1" /> Scenario Projections
            </TabsTrigger>
            <TabsTrigger value="allocation" data-testid="tab-allocation">
              <PieChart className="w-3 h-3 mr-1" /> Capital Allocation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projections" className="space-y-4 mt-4">
            <div className="flex gap-2">
              {(["bull", "baseline", "bear"] as const).map(s => (
                <Button
                  key={s}
                  variant={activeScenario === s ? "default" : "outline"}
                  onClick={() => setActiveScenario(s)}
                  data-testid={`button-scenario-${s}`}
                >
                  {s === "bull" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : s === "bear" ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <BarChart3 className="w-3 h-3 mr-1" />}
                  {scenarioLabels[s]}
                </Button>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>ARPU</TableHead>
                      <TableHead>CAC</TableHead>
                      <TableHead>LTV</TableHead>
                      <TableHead>Churn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((row: any) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className={scenarioColors[activeScenario]}>${row.mrr.toLocaleString()}</TableCell>
                        <TableCell>{row.subscribers}</TableCell>
                        <TableCell>${row.arpu.toFixed(2)}</TableCell>
                        <TableCell>${row.cac.toFixed(2)}</TableCell>
                        <TableCell>${row.ltv.toFixed(0)}</TableCell>
                        <TableCell>{row.churn.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-1">
              <p className="text-sm font-medium">MRR Growth Trend</p>
              <div className="flex items-end gap-1 h-24">
                {currentData.map((row: any, i: number) => {
                  const maxMRR = Math.max(...currentData.map((r: any) => r.mrr));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm ${activeScenario === "bull" ? "bg-green-500/70" : activeScenario === "bear" ? "bg-red-500/70" : "bg-blue-500/70"}`}
                        style={{ height: `${(row.mrr / maxMRR) * 100}%` }}
                        title={`${row.month}: $${row.mrr.toLocaleString()}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentData[0]?.month}</span>
                <span>{currentData[currentData.length - 1]?.month}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capital Allocation Strategy</CardTitle>
                <CardDescription>Recommended budget distribution across functions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {capAlloc && Object.entries(capAlloc).map(([key, val]: [string, any]) => {
                  const labels: Record<string, string> = {
                    rd: "R&D / Engineering",
                    dataAcquisition: "Data Acquisition",
                    infrastructure: "Infrastructure",
                    legalCompliance: "Legal & Compliance",
                    growth: "Growth & Marketing",
                    reserves: "Capital Reserves",
                  };
                  const colors: Record<string, string> = {
                    rd: "bg-blue-500",
                    dataAcquisition: "bg-purple-500",
                    infrastructure: "bg-green-500",
                    legalCompliance: "bg-orange-500",
                    growth: "bg-pink-500",
                    reserves: "bg-gray-500",
                  };
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{labels[key] || key}</span>
                        <span className="font-mono">{val.percent}% (${val.amount.toLocaleString()})</span>
                      </div>
                      <div className="h-3 bg-muted rounded-md overflow-hidden">
                        <div className={`h-full ${colors[key] || "bg-primary"} rounded-md`} style={{ width: `${val.percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
