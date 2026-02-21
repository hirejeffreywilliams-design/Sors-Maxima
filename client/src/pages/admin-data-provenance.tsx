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
  ArrowLeft, Database, Activity, GitBranch, FileCheck, Clock,
  RefreshCw, CheckCircle, AlertTriangle, Server, Layers, Zap
} from "lucide-react";

export default function AdminDataProvenance() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/data-provenance"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-data-provenance">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sources = data?.sources || [];
  const pipelines = data?.pipelines || [];
  const contracts = data?.dataContracts || [];
  const health = data?.overallHealth;

  function timeSince(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Data Provenance & Lineage</h1>
            <p className="text-sm text-muted-foreground">Data sources, pipeline health, quality monitoring & contracts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Database className="w-3 h-3" /> Active Sources
              </div>
              <div className="text-2xl font-bold" data-testid="text-active-sources">{health?.activeSources}/{health?.totalSources}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CheckCircle className="w-3 h-3" /> Avg Quality
              </div>
              <div className="text-2xl font-bold" data-testid="text-avg-quality">{health?.avgQuality}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Layers className="w-3 h-3" /> Data Points
              </div>
              <div className="text-2xl font-bold" data-testid="text-data-points">{(health?.totalDataPoints / 1000).toFixed(0)}K</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Zap className="w-3 h-3" /> Pipeline Success
              </div>
              <div className="text-2xl font-bold" data-testid="text-pipeline-success">{health?.pipelineSuccessRate}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sources">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="sources" data-testid="tab-sources">
              <Database className="w-3 h-3 mr-1" /> Data Sources
            </TabsTrigger>
            <TabsTrigger value="pipelines" data-testid="tab-pipelines">
              <GitBranch className="w-3 h-3 mr-1" /> Pipelines
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <FileCheck className="w-3 h-3 mr-1" /> Data Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-3 mt-4">
            {sources.map((src: any) => (
              <Card key={src.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{src.name}</span>
                        <Badge variant={src.status === "active" ? "default" : "destructive"}>
                          {src.status}
                        </Badge>
                        <Badge variant="secondary">{src.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeSince(src.lastRefresh)}</span>
                        <span>Interval: {src.refreshInterval}</span>
                        <span>Speed: {src.latency}ms</span>
                        <span>{src.dataPoints.toLocaleString()} records</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">{src.quality}%</div>
                      <Progress value={src.quality} className="w-20 h-1.5" />
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {src.coverage.map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="pipelines" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipelines.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.source}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "running" ? "default" : "secondary"}>
                            {p.status === "running" ? <Activity className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{timeSince(p.lastRun)}</TableCell>
                        <TableCell className="font-mono">{p.avgDuration}</TableCell>
                        <TableCell>
                          <span className={p.successRate >= 99 ? "text-green-500" : p.successRate >= 95 ? "text-yellow-500" : "text-red-500"}>
                            {p.successRate}%
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{p.recordsProcessed.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-3 mt-4">
            {contracts.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary">v{c.version}</Badge>
                    </div>
                    <Badge variant={c.status === "compliant" ? "default" : "destructive"}>
                      {c.status === "compliant" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium">Owner:</span> {c.owner}</p>
                    <p><span className="font-medium">SLA:</span> {c.sla}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium">Consumers:</span>
                      {c.consumers.map((con: string) => (
                        <Badge key={con} variant="secondary" className="text-xs">{con}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
