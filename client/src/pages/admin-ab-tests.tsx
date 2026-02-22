import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  FlaskConical,
  Play,
  Pause,
  Search,
  TrendingUp,
  Activity,
  CheckCircle,
  BarChart3,
  Target,
  Calendar,
} from "lucide-react";

interface ABVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficPercent: number;
  impressions: number;
  conversions: number;
  revenue: number;
}

interface ABTestResults {
  winner: string | null;
  confidence: number;
  uplift: number;
  sampleSize: number;
  significanceReached: boolean;
  calculatedAt: string;
}

interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  status: "draft" | "running" | "paused" | "completed";
  category: "acquisition" | "onboarding" | "activation" | "retention" | "monetization" | "referral";
  variants: ABVariant[];
  targetAudience: string;
  successMetric: string;
  secondaryMetrics: string[];
  trafficSplit: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  results: ABTestResults | null;
  notes: string;
}

interface ABTestStats {
  total: number;
  running: number;
  completed: number;
  draft: number;
  paused: number;
  avgConfidence: number;
  totalImpressions: number;
  significantResults: number;
  avgUplift: number;
  byCategory: Record<string, number>;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "running": return "default";
    case "completed": return "secondary";
    case "paused": return "outline";
    default: return "outline";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "running": return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
    case "completed": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "paused": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    default: return "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30";
  }
}

export default function AdminABTests() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);

  const { data: tests, isLoading } = useQuery<ABTest[]>({
    queryKey: ["/api/admin/ab-tests", statusFilter, categoryFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ab-tests?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tests");
      return res.json();
    },
  });

  const { data: stats } = useQuery<ABTestStats>({
    queryKey: ["/api/admin/ab-tests/stats"],
  });

  const { data: selectedTest } = useQuery<ABTest>({
    queryKey: ["/api/admin/ab-tests", selectedTestId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ab-tests/${selectedTestId}`);
      if (!res.ok) throw new Error("Failed to fetch test");
      return res.json();
    },
    enabled: !!selectedTestId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ABTest> }) => {
      return await apiRequest("PATCH", `/api/admin/ab-tests/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ab-tests/stats"] });
      toast({ title: "Test Updated", description: "A/B test has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update the test.", variant: "destructive" });
    },
  });

  const filtered = (tests || []).filter((t) =>
    searchTerm === "" ||
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.hypothesis.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <FlaskConical className="h-6 w-6 text-purple-500" />
            A/B Test Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, monitor, and analyze experiments across acquisition, onboarding, and growth
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-running-tests">{stats.running}</div>
              <div className="text-xs text-muted-foreground">Running Tests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold" data-testid="text-avg-confidence">{stats.avgConfidence.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold" data-testid="text-avg-uplift">{stats.avgUplift.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Avg Uplift</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-bold" data-testid="text-significant-results">{stats.significantResults}</div>
              <div className="text-xs text-muted-foreground">Significant Results</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests by name or hypothesis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-tests"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="acquisition">Acquisition</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="activation">Activation</SelectItem>
            <SelectItem value="retention">Retention</SelectItem>
            <SelectItem value="monetization">Monetization</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="running" data-testid="tab-running">
            <Activity className="w-3.5 h-3.5 mr-1" /> Running
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completed
          </TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="paused" data-testid="tab-paused">
            <Pause className="w-3.5 h-3.5 mr-1" /> Paused
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading tests...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No A/B tests found</p>
                <p className="text-sm mt-1">Tests will appear here as they are created.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((test) => (
                <Card
                  key={test.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedTestId(test.id)}
                  data-testid={`card-test-${test.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`text-test-name-${test.id}`}>
                            {test.name}
                          </span>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(test.status)}`} data-testid={`badge-status-${test.id}`}>
                            {test.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {test.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {test.hypothesis}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {test.createdAt}
                        </div>
                        {test.results && (
                          <Badge variant={test.results.significanceReached ? "default" : "outline"} className="text-xs">
                            {test.results.confidence.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTestId} onOpenChange={(open) => !open && setSelectedTestId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedTest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  {selectedTest.name}
                  <Badge variant="outline" className={`text-xs ${getStatusColor(selectedTest.status)}`}>
                    {selectedTest.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Analyze test results and variant performance to determine statistical significance.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Hypothesis</div>
                    <div className="text-sm mt-0.5" data-testid="text-hypothesis">{selectedTest.hypothesis}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Target Audience</div>
                    <div className="text-sm mt-0.5" data-testid="text-target-audience">{selectedTest.targetAudience}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Success Metric</div>
                    <div className="text-sm font-medium mt-0.5" data-testid="text-success-metric">{selectedTest.successMetric}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Category</div>
                    <Badge variant="secondary" className="text-xs capitalize mt-0.5">{selectedTest.category}</Badge>
                  </div>
                </div>

                {selectedTest.secondaryMetrics.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Secondary Metrics</div>
                    <div className="flex gap-1 flex-wrap">
                      {selectedTest.secondaryMetrics.map((m, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Variant Comparison
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Impressions</TableHead>
                          <TableHead className="text-right">Conversions</TableHead>
                          <TableHead className="text-right">Conv. Rate</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTest.variants.map((v) => {
                          const convRate = v.impressions > 0 ? ((v.conversions / v.impressions) * 100).toFixed(2) : "0.00";
                          return (
                            <TableRow key={v.id} data-testid={`row-variant-${v.id}`}>
                              <TableCell className="font-medium text-sm">
                                {v.name}
                                {v.isControl && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">Control</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{v.description}</TableCell>
                              <TableCell className="text-right tabular-nums">{v.impressions.toLocaleString()}</TableCell>
                              <TableCell className="text-right tabular-nums">{v.conversions.toLocaleString()}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{convRate}%</TableCell>
                              <TableCell className="text-right tabular-nums">${v.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {selectedTest.results && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Winner</div>
                          <div className="font-medium text-sm" data-testid="text-winner">
                            {selectedTest.results.winner
                              ? selectedTest.variants.find((v) => v.id === selectedTest.results!.winner)?.name || selectedTest.results.winner
                              : "No winner yet"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Confidence</div>
                          <div className={`font-bold text-lg ${selectedTest.results.confidence >= 95 ? "text-green-600 dark:text-green-400" : selectedTest.results.confidence >= 90 ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`} data-testid="text-confidence">
                            {selectedTest.results.confidence.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Uplift</div>
                          <div className="font-bold text-lg text-purple-600 dark:text-purple-400" data-testid="text-uplift">
                            +{selectedTest.results.uplift.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Sample Size</div>
                          <div className="font-medium text-sm" data-testid="text-sample-size">
                            {selectedTest.results.sampleSize.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {selectedTest.results.significanceReached ? (
                          <Badge variant="default" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" data-testid="badge-significance">
                            <CheckCircle className="h-3 w-3 mr-1" /> Statistical Significance Reached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 dark:text-yellow-400" data-testid="badge-significance">
                            Significance Not Yet Reached
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Calculated: {selectedTest.results.calculatedAt}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedTest.notes && (
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm" data-testid="text-notes">{selectedTest.notes}</div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedTest.status === "running" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedTest.id, updates: { status: "paused" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-pause-test"
                  >
                    <Pause className="h-4 w-4 mr-1" /> Pause Test
                  </Button>
                )}
                {selectedTest.status === "paused" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedTest.id, updates: { status: "running" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-resume-test"
                  >
                    <Play className="h-4 w-4 mr-1" /> Resume Test
                  </Button>
                )}
                {selectedTest.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedTest.id, updates: { status: "running", startDate: new Date().toISOString().split("T")[0] } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-start-test"
                  >
                    <Play className="h-4 w-4 mr-1" /> Start Test
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
