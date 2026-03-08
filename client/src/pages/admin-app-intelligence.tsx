import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain, Cpu, FileCode2, Globe, Layers, RefreshCw, Search, Sparkles,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Activity, Zap,
  Database, BookOpen, Target, ArrowUpRight, Lightbulb, Shield,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

// ── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredFeature {
  id: string;
  name: string;
  type: "page" | "engine" | "route-group";
  path: string;
  firstSeen: string;
  lastSeen: string;
  isNew: boolean;
}

interface AIInsight {
  id: string;
  timestamp: string;
  category: "discovery" | "health" | "growth" | "recommendation" | "performance";
  title: string;
  summary: string;
  priority: "low" | "medium" | "high" | "critical";
  actionItems: string[];
}

interface IntelligenceStatus {
  running: boolean;
  cycleCount: number;
  lastCycle: string;
  nextCycleMs: number;
  bootstrapped: boolean;
  featuresTracked: number;
  featuresByType: { pages: number; engines: number; routeGroups: number };
  newSinceLastCycle: number;
  recentInsights: AIInsight[];
  allInsights: AIInsight[];
  features: DiscoveredFeature[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  page:         { icon: <Globe className="h-3.5 w-3.5" />,    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   label: "Page" },
  engine:       { icon: <Cpu className="h-3.5 w-3.5" />,     color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", label: "Engine" },
  "route-group":{ icon: <Database className="h-3.5 w-3.5" />, color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20",label: "API" },
};

const PRIORITY_CONFIG: Record<string, { color: string; dot: string }> = {
  critical: { color: "text-red-400 border-red-500/30 bg-red-500/8",    dot: "bg-red-400" },
  high:     { color: "text-orange-400 border-orange-500/30 bg-orange-500/8", dot: "bg-orange-400" },
  medium:   { color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/8", dot: "bg-yellow-400" },
  low:      { color: "text-blue-400 border-blue-500/30 bg-blue-500/8",   dot: "bg-blue-400" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  discovery:      <Sparkles className="h-3.5 w-3.5" />,
  health:         <Shield className="h-3.5 w-3.5" />,
  growth:         <TrendingUp className="h-3.5 w-3.5" />,
  recommendation: <Lightbulb className="h-3.5 w-3.5" />,
  performance:    <Activity className="h-3.5 w-3.5" />,
};

function timeAgo(iso: string): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(ms: number): string {
  if (!ms) return "—";
  const diff = ms - Date.now();
  if (diff <= 0) return "soon";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <Card className="bg-card/60">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`mt-0.5 p-2 rounded-lg ${accent ?? "bg-primary/10"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);
  const p = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
  return (
    <div
      className={`rounded-xl border px-4 py-3 space-y-2 cursor-pointer transition-colors hover:bg-card/80 ${p.color}`}
      onClick={() => setExpanded((v) => !v)}
      data-testid={`insight-${insight.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
          {CATEGORY_ICONS[insight.category]}
          <span className="font-semibold text-sm truncate">{insight.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 capitalize border ${p.color}`}>
            {insight.priority}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{timeAgo(insight.timestamp)}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-7">{insight.summary}</p>
      {expanded && insight.actionItems.length > 0 && (
        <ul className="pl-7 space-y-1">
          {insight.actionItems.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-400" />
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeatureRow({ feature }: { feature: DiscoveredFeature }) {
  const t = TYPE_CONFIG[feature.type] ?? TYPE_CONFIG.page;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
      data-testid={`feature-${feature.id}`}
    >
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium shrink-0 ${t.bg} ${t.color}`}>
        {t.icon}
        <span>{t.label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{feature.name}</span>
          {feature.isNew && (
            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border">NEW</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-mono truncate">{feature.path}</p>
      </div>
      <div className="text-[11px] text-muted-foreground shrink-0 text-right hidden sm:block">
        <div>First: {new Date(feature.firstSeen).toLocaleDateString()}</div>
        <div>Seen: {timeAgo(feature.lastSeen)}</div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAppIntelligencePage() {
  useSEO({ title: "App Intelligence Engine — Admin | Sors Maxima" });

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tab, setTab] = useState("overview");

  const { data: status, isLoading } = useQuery<IntelligenceStatus>({
    queryKey: ["/api/admin/app-intelligence/status"],
    refetchInterval: 15_000,
  });

  const runCycle = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/app-intelligence/run-cycle").then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/app-intelligence/status"] });
    },
  });

  const features = status?.features ?? [];
  const insights = status?.allInsights ?? [];

  const filteredFeatures = features.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || f.type === typeFilter;
    return matchSearch && matchType;
  });

  const newFeatures = features.filter((f) => f.isNew);
  const criticalInsights = insights.filter((i) => i.priority === "critical" || i.priority === "high");

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">App Intelligence Engine</h1>
            {status?.running ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border text-[10px] h-5 px-2 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground">
                STARTING…
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Autonomous discovery + AI-driven insights · Hourly learning cycles · Self-monitoring
          </p>
        </div>
        <Button
          onClick={() => runCycle.mutate()}
          disabled={runCycle.isPending}
          className="gap-2"
          data-testid="button-run-cycle"
        >
          {runCycle.isPending ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Running…</>
          ) : (
            <><Zap className="h-4 w-4" /> Run Cycle Now</>
          )}
        </Button>
      </div>

      {/* Alert: new features detected */}
      {newFeatures.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-sm">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-400">{newFeatures.length} new feature{newFeatures.length > 1 ? "s" : ""} auto-detected since last cycle: </span>
            <span className="text-muted-foreground">{newFeatures.map((f) => f.name).join(", ")}</span>
          </div>
        </div>
      )}

      {/* Alert: high priority insights */}
      {criticalInsights.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-orange-500/25 bg-orange-500/5 text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold text-orange-400">{criticalInsights.length} high-priority insight{criticalInsights.length > 1 ? "s" : ""} require attention</span>
            {criticalInsights.slice(0, 2).map((i) => (
              <p key={i.id} className="text-xs text-muted-foreground">• {i.title}</p>
            ))}
          </div>
        </div>
      )}

      {/* Run cycle result */}
      {runCycle.isSuccess && runCycle.data && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Cycle complete — {runCycle.data.newFeatures} new features, {runCycle.data.insightsGenerated} insights generated
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5" data-testid="tab-overview">
            <Activity className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs gap-1.5" data-testid="tab-features">
            <Layers className="h-3.5 w-3.5" /> Feature Registry
            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">
              {status?.featuresTracked ?? "—"}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs gap-1.5" data-testid="tab-insights">
            <Lightbulb className="h-3.5 w-3.5" /> AI Insights
            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">
              {insights.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs gap-1.5" data-testid="tab-coverage">
            <Target className="h-3.5 w-3.5" /> Coverage
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Layers className="h-4 w-4 text-primary" />}
              label="Features Tracked"
              value={status?.featuresTracked ?? "—"}
              sub={`${status?.featuresByType?.pages ?? 0} pages · ${status?.featuresByType?.engines ?? 0} engines`}
              accent="bg-primary/10"
            />
            <StatCard
              icon={<RefreshCw className="h-4 w-4 text-blue-400" />}
              label="Learning Cycles"
              value={status?.cycleCount ?? "—"}
              sub={status?.lastCycle ? `Last: ${timeAgo(status.lastCycle)}` : "Not yet run"}
              accent="bg-blue-500/10"
            />
            <StatCard
              icon={<Lightbulb className="h-4 w-4 text-yellow-400" />}
              label="AI Insights"
              value={insights.length}
              sub={`${criticalInsights.length} high priority`}
              accent="bg-yellow-500/10"
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-emerald-400" />}
              label="Next Cycle"
              value={status?.nextCycleMs ? timeUntil(status.nextCycleMs) : "—"}
              sub="Runs every hour"
              accent="bg-emerald-500/10"
            />
          </div>

          {/* Engine status breakdown */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" /> Discovery Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {[
                { label: "Frontend Pages", count: status?.featuresByType?.pages ?? 0, icon: <Globe className="h-4 w-4 text-blue-400" />, color: "bg-blue-500" },
                { label: "Backend Engines", count: status?.featuresByType?.engines ?? 0, icon: <Cpu className="h-4 w-4 text-purple-400" />, color: "bg-purple-500" },
                { label: "API Route Groups", count: status?.featuresByType?.routeGroups ?? 0, icon: <Database className="h-4 w-4 text-emerald-400" />, color: "bg-emerald-500" },
              ].map(({ label, count, icon, color }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                  <Progress
                    value={status?.featuresTracked ? (count / status.featuresTracked) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent insights */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-400" />
              Recent AI Insights
            </h3>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
            ) : status?.recentInsights?.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed">
                No insights yet — run a cycle to generate AI analysis
              </div>
            ) : (
              <div className="space-y-2">
                {(status?.recentInsights ?? []).map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Feature Registry ── */}
        <TabsContent value="features" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search features or paths…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-feature-search"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "page", "engine", "route-group"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={typeFilter === t ? "default" : "outline"}
                  className="h-9 text-xs capitalize"
                  onClick={() => setTypeFilter(t)}
                  data-testid={`filter-${t}`}
                >
                  {t === "route-group" ? "API" : t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                  {t !== "all" && (
                    <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">
                      {t === "page" ? (status?.featuresByType?.pages ?? 0) :
                       t === "engine" ? (status?.featuresByType?.engines ?? 0) :
                       (status?.featuresByType?.routeGroups ?? 0)}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">{filteredFeatures.length} features</div>

          <Card className="bg-card/50">
            <CardContent className="p-2 divide-y divide-border/30">
              {filteredFeatures.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading feature registry…" : "No features match your filter"}
                </div>
              ) : (
                filteredFeatures
                  .sort((a, b) => (a.isNew === b.isNew ? a.name.localeCompare(b.name) : a.isNew ? -1 : 1))
                  .map((f) => <FeatureRow key={f.id} feature={f} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Insights ── */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "discovery", "health", "growth", "recommendation", "performance"] as const).map((cat) => {
              const count = cat === "all" ? insights.length : insights.filter((i) => i.category === cat).length;
              return (
                <Badge
                  key={cat}
                  variant="outline"
                  className="capitalize cursor-pointer text-xs px-2.5 py-1 h-auto"
                  data-testid={`category-${cat}`}
                >
                  {cat === "all" ? "All" : cat} ({count})
                </Badge>
              );
            })}
          </div>

          {insights.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground rounded-xl border border-dashed">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No insights yet. Click "Run Cycle Now" to generate AI analysis.
            </div>
          ) : (
            <div className="space-y-2">
              {insights.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Coverage ── */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pipeline Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Features actively monitored in the Intelligence Pipeline Map at <code className="text-[10px] bg-muted px-1 rounded">/admin/pipeline</code>.
                </p>
                {[
                  { label: "Data Sources", covered: 7, total: 7 },
                  { label: "Core Engines", covered: 6, total: 6 },
                  { label: "Specialized Engines", covered: 6, total: status?.featuresByType?.engines ?? 6 },
                  { label: "User Features", covered: 6, total: status?.featuresByType?.pages ?? 50 },
                ].map(({ label, covered, total }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{covered}/{Math.max(covered, total)}</span>
                    </div>
                    <Progress value={(covered / Math.max(covered, total)) * 100} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" /> Learning Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Systems that the Autonomous Learning Engine and App Intelligence Engine actively monitor.
                </p>
                {[
                  { label: "Pick Outcome Learning", status: "active", detail: "Feeds MC Engine + USML from every settled pick" },
                  { label: "Feature Discovery", status: "active", detail: "Hourly scan of pages, engines, route groups" },
                  { label: "AI Health Analysis", status: "active", detail: "GPT-4o-mini insight generation every cycle" },
                  { label: "Pipeline Health", status: "active", detail: "Live node monitoring via visual-status endpoint" },
                  { label: "Model Accuracy", status: "active", detail: "Sport-level win-rate calibration via MC Stacked Learner" },
                ].map(({ label, status: s, detail }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium">{label}</div>
                      <div className="text-[11px] text-muted-foreground">{detail}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" /> How the System Learns
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
              {[
                {
                  step: "1", icon: <Search className="h-4 w-4" />, title: "Discovery Scan",
                  desc: "Every hour, the engine scans client/src/pages/, server/*.ts, and server/routes/ to detect any new files added by developers. New features are auto-registered in the monitoring registry.",
                },
                {
                  step: "2", icon: <Brain className="h-4 w-4" />, title: "AI Analysis",
                  desc: "GPT-4o-mini receives a snapshot of the current platform state — feature counts, pipeline health, pick metrics — and generates 2-3 actionable insights for health, growth, and performance.",
                },
                {
                  step: "3", icon: <ArrowUpRight className="h-4 w-4" />, title: "Registry Update",
                  desc: "New features are timestamped and marked as 'NEW' so admins can review them. The pipeline coverage map and admin connection map can be updated to include newly discovered engine nodes.",
                },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">{icon} {title}</div>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
