import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Users, TrendingUp, Eye, CheckCircle, XCircle, Search, Activity, Network, BarChart3, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface FraudSignal {
  type: string;
  description: string;
  weight: number;
  matched: boolean;
  details?: string;
}

interface FraudCase {
  caseId: string;
  userId: string;
  username: string;
  email: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  action: "allow" | "verify" | "block";
  status: "open" | "reviewed" | "cleared" | "blocked";
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FraudStats {
  totalCases: number;
  openCases: number;
  blockedCases: number;
  clearedCases: number;
  averageRiskScore: number;
  riskDistribution: Record<string, number>;
  topSignals: Array<{ signal: string; count: number }>;
  signupsLastHour: number;
  trialsGranted: number;
  fraudRate: number;
}

function getRiskColor(level: string): string {
  switch (level) {
    case "critical": return "text-red-500";
    case "high": return "text-orange-500";
    case "medium": return "text-yellow-500";
    default: return "text-green-500";
  }
}

function getRiskBadgeVariant(level: string): "destructive" | "secondary" | "outline" | "default" {
  switch (level) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

function StatsOverview() {
  const { data: stats, isLoading } = useQuery<FraudStats>({
    queryKey: ["/api/admin/fraud/stats"],
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading stats...</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-orange-500" />
          <div className="text-2xl font-bold" data-testid="text-total-cases">{stats.totalCases}</div>
          <div className="text-xs text-muted-foreground">Total Cases</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
          <div className="text-2xl font-bold" data-testid="text-open-cases">{stats.openCases}</div>
          <div className="text-xs text-muted-foreground">Open Cases</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
          <div className="text-2xl font-bold" data-testid="text-blocked-cases">{stats.blockedCases}</div>
          <div className="text-xs text-muted-foreground">Blocked</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <div className="text-2xl font-bold" data-testid="text-cleared-cases">{stats.clearedCases}</div>
          <div className="text-xs text-muted-foreground">Cleared</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <div className="text-2xl font-bold" data-testid="text-avg-risk">{stats.averageRiskScore}</div>
          <div className="text-xs text-muted-foreground">Avg Risk Score</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-purple-500" />
          <div className="text-2xl font-bold" data-testid="text-fraud-rate">{stats.fraudRate}%</div>
          <div className="text-xs text-muted-foreground">Fraud Rate</div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopSignals() {
  const { data: stats } = useQuery<FraudStats>({
    queryKey: ["/api/admin/fraud/stats"],
  });

  if (!stats?.topSignals?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No signal data available yet. Cases will appear as users register.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Top Fraud Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stats.topSignals.map((s) => (
            <div key={s.signal} className="flex items-center justify-between">
              <span className="text-sm font-mono">{s.signal}</span>
              <Badge variant="secondary">{s.count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskDistribution() {
  const { data: stats } = useQuery<FraudStats>({
    queryKey: ["/api/admin/fraud/stats"],
  });

  if (!stats) return null;

  const dist = stats.riskDistribution;
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> Risk Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(["critical", "high", "medium", "low"] as const).map((level) => {
            const count = dist[level] || 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={level} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={`capitalize font-medium ${getRiskColor(level)}`}>{level}</span>
                  <span className="text-muted-foreground">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${level === "critical" ? "bg-red-500" : level === "high" ? "bg-orange-500" : level === "medium" ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CaseList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (riskFilter !== "all") queryParams.set("riskLevel", riskFilter);

  const { data, isLoading } = useQuery<{ cases: FraudCase[]; total: number }>({
    queryKey: [`/api/admin/fraud/cases?${queryParams.toString()}`],
  });

  const { data: caseDetail } = useQuery<FraudCase & { identityGraph: any }>({
    queryKey: [`/api/admin/fraud/cases/${selectedCase}`],
    enabled: !!selectedCase,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ caseId, status }: { caseId: string; status: string }) => {
      return await apiRequest("POST", `/api/admin/fraud/cases/${caseId}/action`, { status, reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fraud/stats"] });
      setSelectedCase(null);
      setReviewNotes("");
      toast({ title: "Case Updated", description: "Fraud case has been updated." });
    },
  });

  const cases = data?.cases || [];
  const filtered = searchTerm
    ? cases.filter((c) => c.username.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()) || c.caseId.toLowerCase().includes(searchTerm.toLowerCase()))
    : cases;

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading cases...</div>;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by username, email, or case ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" data-testid="input-fraud-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-risk-filter">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No fraud cases found</p>
            <p className="text-sm mt-1">Cases will appear here as users register and the fraud engine detects suspicious activity.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.caseId} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedCase(c.caseId)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`font-mono text-sm ${getRiskColor(c.riskLevel)}`}>
                      {c.riskScore}
                    </div>
                    <div>
                      <div className="font-medium text-sm" data-testid={`text-case-username-${c.caseId}`}>{c.username}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskBadgeVariant(c.riskLevel)} className="text-xs">{c.riskLevel}</Badge>
                    <Badge variant={c.status === "blocked" ? "destructive" : c.status === "cleared" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">{c.caseId}</span>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {c.signals.slice(0, 4).map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{s.type}</Badge>
                  ))}
                  {c.signals.length > 4 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{c.signals.length - 4}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {caseDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Case {caseDetail.caseId}
                </DialogTitle>
                <DialogDescription>
                  Review fraud signals and take action on the suspicious activity detected for {caseDetail.username}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Username</div>
                    <div className="font-medium">{caseDetail.username}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{caseDetail.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Risk Score</div>
                    <div className={`font-bold text-lg ${getRiskColor(caseDetail.riskLevel)}`}>{caseDetail.riskScore}/100</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Action Taken</div>
                    <Badge variant={caseDetail.action === "block" ? "destructive" : caseDetail.action === "verify" ? "secondary" : "outline"}>{caseDetail.action}</Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Fraud Signals ({caseDetail.signals.length})</div>
                  <div className="space-y-1.5">
                    {caseDetail.signals.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                          <span>{s.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.details && <span className="text-xs text-muted-foreground">{s.details}</span>}
                          <Badge variant="outline" className="text-[10px]">+{s.weight}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {caseDetail.identityGraph && caseDetail.identityGraph.linkedSignals?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2"><Network className="h-4 w-4" /> Identity Graph</div>
                    <div className="p-3 rounded bg-muted/50 text-sm space-y-1">
                      <div>Cluster Size: <span className="font-medium">{caseDetail.identityGraph.clusterSize}</span></div>
                      <div>Connected Users: <span className="font-medium">{caseDetail.identityGraph.connectedUsers.length}</span></div>
                      {caseDetail.identityGraph.linkedSignals.map((ls: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="font-mono">{ls.type}</span>
                          <span className="text-muted-foreground">shared with {ls.sharedWith} user(s)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {caseDetail.reviewedBy && (
                  <div className="p-3 rounded bg-muted/50">
                    <div className="text-xs text-muted-foreground">Reviewed by {caseDetail.reviewedBy}</div>
                    {caseDetail.reviewNotes && <div className="text-sm mt-1">{caseDetail.reviewNotes}</div>}
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium mb-2">Review Notes</div>
                  <Textarea placeholder="Add review notes..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} data-testid="input-review-notes" />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => actionMutation.mutate({ caseId: caseDetail.caseId, status: "cleared" })} disabled={actionMutation.isPending} data-testid="button-clear-case">
                  <CheckCircle className="h-4 w-4 mr-1" /> Clear
                </Button>
                <Button variant="secondary" size="sm" onClick={() => actionMutation.mutate({ caseId: caseDetail.caseId, status: "reviewed" })} disabled={actionMutation.isPending} data-testid="button-review-case">
                  <Eye className="h-4 w-4 mr-1" /> Mark Reviewed
                </Button>
                <Button variant="destructive" size="sm" onClick={() => actionMutation.mutate({ caseId: caseDetail.caseId, status: "blocked" })} disabled={actionMutation.isPending} data-testid="button-block-case">
                  <XCircle className="h-4 w-4 mr-1" /> Block
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminFraudDashboard() {
  useSEO({ title: "Fraud Detection", description: "Monitor and investigate suspicious activity" });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-orange-500" />
          Trial Fraud Detection
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor and prevent trial abuse. Detect users attempting multiple free trials via different accounts.
        </p>
      </div>

      <StatsOverview />

      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases" data-testid="tab-fraud-cases">Cases</TabsTrigger>
          <TabsTrigger value="signals" data-testid="tab-fraud-signals">Signals & Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4">
          <CaseList />
        </TabsContent>

        <TabsContent value="signals" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TopSignals />
            <RiskDistribution />
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Detection Engine Configuration
              </CardTitle>
              <CardDescription>Signal weights and thresholds used by the fraud engine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { signal: "Duplicate Payment Token", weight: 40 },
                  { signal: "Duplicate Phone", weight: 25 },
                  { signal: "Prior Trial (Device)", weight: 35 },
                  { signal: "Rapid Signup", weight: 25 },
                  { signal: "Disposable Email", weight: 30 },
                  { signal: "Automation Detected", weight: 25 },
                  { signal: "Device Fingerprint Match", weight: 20 },
                  { signal: "Email Plus Alias", weight: 20 },
                  { signal: "Prior Trial (IP)", weight: 20 },
                  { signal: "Emulator Detected", weight: 20 },
                  { signal: "IP Velocity", weight: 15 },
                  { signal: "Email Dot Trick", weight: 15 },
                  { signal: "Name/Address Match", weight: 15 },
                  { signal: "Suspicious Pattern", weight: 15 },
                  { signal: "IP Subnet Match", weight: 10 },
                  { signal: "VPN/Proxy", weight: 10 },
                  { signal: "Behavior Signals", weight: 10 },
                  { signal: "User Agent Match", weight: 5 },
                ].map((item) => (
                  <div key={item.signal} className="p-2 rounded bg-muted/50 text-sm">
                    <div className="font-medium text-xs">{item.signal}</div>
                    <div className={`text-lg font-bold ${item.weight >= 30 ? "text-red-500" : item.weight >= 20 ? "text-orange-500" : item.weight >= 10 ? "text-yellow-500" : "text-green-500"}`}>+{item.weight}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="p-3 rounded bg-green-500/10 text-center">
                  <div className="text-xs text-muted-foreground">Allow</div>
                  <div className="font-bold text-green-500">&lt; 20</div>
                </div>
                <div className="p-3 rounded bg-yellow-500/10 text-center">
                  <div className="text-xs text-muted-foreground">Verify</div>
                  <div className="font-bold text-yellow-500">45-69</div>
                </div>
                <div className="p-3 rounded bg-orange-500/10 text-center">
                  <div className="text-xs text-muted-foreground">Block (High)</div>
                  <div className="font-bold text-orange-500">70-89</div>
                </div>
                <div className="p-3 rounded bg-red-500/10 text-center">
                  <div className="text-xs text-muted-foreground">Block (Critical)</div>
                  <div className="font-bold text-red-500">90+</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
