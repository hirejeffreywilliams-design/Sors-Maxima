import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Scan, 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Send,
  Cpu,
  MemoryStick,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Sparkles
} from "lucide-react";

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    learningEngine: { status: string; factorsActive: number };
    errorLogging: { status: string; recentErrors: number };
    subscriptions: { status: string; activeCount: number };
    quantumAnalysis: { status: string; coherenceLevel: number };
    predictionEngine: { status: string; accuracy: number };
  };
  lastCheck: string;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface DiagnosticResult {
  analysis: string;
  quantumMetrics: {
    coherenceScore: number;
    patternConfidence: number;
    resolutionProbability: number;
    impactedFactors: number;
    analysisTimestamp: string;
  };
  systemContext: {
    errorCount: number;
    factorsTracked: number;
    category: string;
  };
}

interface ScanResult {
  scanResults: string;
  scanTimestamp: string;
  dataAnalyzed: {
    errorLogs: number;
    predictionFactors: number;
  };
  quantumMetrics: {
    scanDepth: string;
    patternMatches: number;
    anomaliesDetected: number;
  };
}

const issueCategories = [
  { value: "prediction", label: "Prediction Accuracy" },
  { value: "performance", label: "System Performance" },
  { value: "data", label: "Data Quality" },
  { value: "integration", label: "API/Integration" },
  { value: "user", label: "User Experience" },
  { value: "billing", label: "Billing/Subscription" },
  { value: "general", label: "General Issue" },
];

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'healthy' || status === 'operational') {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  }
  return <XCircle className="w-4 h-4 text-red-500" />;
}

export default function AdminDiagnostics() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [issueDescription, setIssueDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const { data: healthStatus, isLoading: healthLoading, refetch: refetchHealth, error: healthError } = useQuery<HealthStatus>({
    queryKey: ["/api/admin/diagnostics/health"],
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (healthError && (healthError as any)?.status === 403) {
      setAccessDenied(true);
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access diagnostics",
        variant: "destructive",
      });
    }
  }, [healthError, toast]);

  if (accessDenied) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4 lg:p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              You need administrator privileges to access the diagnostic tools.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-return-home">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/diagnostics/analyze", {
        issueDescription,
        category,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setDiagnosticResult(data);
      toast({
        title: "Analysis Complete",
        description: "Diagnostic analysis has been generated",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.status === 403 
        ? "Admin privileges required" 
        : "Could not complete the diagnostic analysis";
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/diagnostics/auto-scan", {});
      return response.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      toast({
        title: "Scan Complete",
        description: "Automated diagnostic scan finished",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.status === 403 
        ? "Admin privileges required" 
        : "Could not complete the automated scan";
      toast({
        title: "Scan Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <Brain className="w-6 h-6 text-white" />
            </div>
            System Diagnostics
          </h1>
          <p className="text-muted-foreground mt-1">
            System analysis with pattern recognition
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="w-3 h-3" />
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="health" className="gap-2" data-testid="tab-health">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">System Health</span>
            <span className="sm:hidden">Health</span>
          </TabsTrigger>
          <TabsTrigger value="analyze" className="gap-2" data-testid="tab-analyze">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">AI Analysis</span>
            <span className="sm:hidden">Analyze</span>
          </TabsTrigger>
          <TabsTrigger value="scan" className="gap-2" data-testid="tab-scan">
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">Auto Scan</span>
            <span className="sm:hidden">Scan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">System Health Monitor</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchHealth()}
              disabled={healthLoading}
              data-testid="button-refresh-health"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {healthLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : healthStatus ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className={`border-l-4 ${
                healthStatus.overall === 'healthy' ? 'border-l-green-500' :
                healthStatus.overall === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Overall Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={healthStatus.overall} />
                    <span className="text-2xl font-bold capitalize">{healthStatus.overall}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Uptime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold">{formatUptime(healthStatus.uptime)}</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MemoryStick className="w-4 h-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Heap Used</span>
                      <span>{formatBytes(healthStatus.memoryUsage.heapUsed)}</span>
                    </div>
                    <Progress 
                      value={(healthStatus.memoryUsage.heapUsed / healthStatus.memoryUsage.heapTotal) * 100} 
                    />
                  </div>
                </CardContent>
              </Card>

              {Object.entries(healthStatus.components).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIndicator status={value.status} />
                        <span className="text-sm capitalize">{value.status}</span>
                      </div>
                      {'factorsActive' in value && (
                        <Badge variant="secondary">{value.factorsActive} factors</Badge>
                      )}
                      {'recentErrors' in value && (
                        <Badge variant={value.recentErrors > 10 ? "destructive" : "secondary"}>
                          {value.recentErrors} errors
                        </Badge>
                      )}
                      {'activeCount' in value && (
                        <Badge variant="secondary">{value.activeCount} active</Badge>
                      )}
                      {'coherenceLevel' in value && (
                        <Badge variant="secondary">{value.coherenceLevel}%</Badge>
                      )}
                      {'accuracy' in value && (
                        <Badge variant="secondary">{value.accuracy}%</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Unable to load health status
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI Issue Analysis
              </CardTitle>
              <CardDescription>
                Describe an issue and let our Sors AI analyze it with pattern recognition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {issueCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm font-medium mb-2 block">Issue Description</label>
                  <Textarea
                    placeholder="Describe the issue in detail. Include any error messages, steps to reproduce, or observed behavior..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="input-issue-description"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => analyzeMutation.mutate()}
                  disabled={!issueDescription.trim() || analyzeMutation.isPending}
                  className="gap-2"
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Analyze with Sors AI
                </Button>
              </div>
            </CardContent>
          </Card>

          {diagnosticResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Analysis Results
                </CardTitle>
                <CardDescription>
                  Generated at {new Date(diagnosticResult.quantumMetrics.analysisTimestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-purple-500">
                      {diagnosticResult.quantumMetrics.coherenceScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">Consistency Score</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-blue-500">
                      {diagnosticResult.quantumMetrics.patternConfidence}%
                    </div>
                    <div className="text-sm text-muted-foreground">Pattern Confidence</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-green-500">
                      {diagnosticResult.quantumMetrics.resolutionProbability}%
                    </div>
                    <div className="text-sm text-muted-foreground">Resolution Probability</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-orange-500">
                      {diagnosticResult.quantumMetrics.impactedFactors}
                    </div>
                    <div className="text-sm text-muted-foreground">Impacted Factors</div>
                  </div>
                </div>

                <Separator />

                <ScrollArea className="h-[400px] rounded-lg border p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {diagnosticResult.analysis}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>System Context: {diagnosticResult.systemContext.errorCount} errors analyzed</span>
                  <span>{diagnosticResult.systemContext.factorsTracked} factors tracked</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-500" />
                Automated System Scan
              </CardTitle>
              <CardDescription>
                Run a comprehensive scan of all system components using AI pattern analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                className="gap-2"
                data-testid="button-run-scan"
              >
                {scanMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    Run Full Diagnostic Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {scanResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Scan Results
                </CardTitle>
                <CardDescription>
                  Completed at {new Date(scanResult.scanTimestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{scanResult.dataAnalyzed.errorLogs}</div>
                    <div className="text-sm text-muted-foreground">Error Logs Analyzed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{scanResult.dataAnalyzed.predictionFactors}</div>
                    <div className="text-sm text-muted-foreground">Prediction Factors</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-500">{scanResult.quantumMetrics.patternMatches}</div>
                    <div className="text-sm text-muted-foreground">Pattern Matches</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-yellow-500">{scanResult.quantumMetrics.anomaliesDetected}</div>
                    <div className="text-sm text-muted-foreground">Anomalies Detected</div>
                  </div>
                </div>

                <Separator />

                <ScrollArea className="h-[400px] rounded-lg border p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {scanResult.scanResults}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Scan Depth: {scanResult.quantumMetrics.scanDepth}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
