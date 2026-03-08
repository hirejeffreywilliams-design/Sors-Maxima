import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Brain, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Database, Eye, Filter, FlaskConical, Gauge, GitBranch, Layers, LineChart,
  Lock, Network, Play, RefreshCw, Search, Shield, Sparkles, Target, TrendingUp, XCircle, Zap,
  Cpu, Globe, Wifi, WifiOff, Bot, Workflow, Stethoscope, CircleDot
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface PipelineStage {
  name: string;
  module: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  startTime: string | null;
  endTime: string | null;
  durationMs: number | null;
  inputCount: number;
  outputCount: number;
  checksRun: number;
  checksPassed: number;
  errors: string[];
  metadata: Record<string, any>;
}

interface PipelineRun {
  runId: string;
  traceId: string;
  status: "running" | "completed" | "failed" | "partial";
  stages: PipelineStage[];
  startTime: string;
  endTime: string | null;
  inputSummary: { sport: string; records: number; riskLevel: string };
  outputSummary: { candidatesGenerated: number; candidatesSelected: number; rejected: number; reviewRequired: number } | null;
  metrics: Record<string, any>;
  alerts: any[];
}

interface PipelineHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  totalRuns: number;
  successRate: number;
  avgLatencyMs: number;
  activeAlerts: number;
  metrics: Record<string, any>;
  moduleHealth: { module: string; status: string; lastRunMs: number }[];
}

const STAGE_ICONS: Record<string, any> = {
  "Data Ingestor": Database,
  "Feature Engineer": FlaskConical,
  "Predictor": Brain,
  "Diversity Module": GitBranch,
  "Optimizer": Target,
  "Risk Guard": Shield,
  "Verifier": CheckCircle2,
  "Delivery": Zap,
  "Feedback Collector": BarChart3,
  "Evaluator": LineChart,
  "Monitor": Gauge,
  "Why This Pick": Eye,
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  running: "text-blue-500",
  pending: "text-muted-foreground",
  skipped: "text-yellow-500",
};

const STATUS_BG: Record<string, string> = {
  success: "bg-emerald-500/10 border-emerald-500/20",
  failed: "bg-red-500/10 border-red-500/20",
  running: "bg-blue-500/10 border-blue-500/20",
  pending: "bg-muted/50 border-border",
  skipped: "bg-yellow-500/10 border-yellow-500/20",
};

// ─── Pipeline Connection Map ───────────────────────────────────────────────────

interface VisualNode {
  x: number; y: number; w: number; h: number; row: number;
  label: string; sublabel: string; layer: string;
}

interface DataQualityAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  node: string;
  label: string;
  issue: string;
  impact: string;
  resolution: string;
  status: "open" | "resolved";
}

interface VisualStatus {
  nodes: Record<string, { status: string; label: string; detail: string; metrics?: { a: string; b: string; c?: string } }>;
  summary: { totalNodes: number; liveNodes: number; degradedNodes: number; offlineNodes: number; unknownNodes: number };
  dataQualityAlerts?: DataQualityAlert[];
  lastUpdated: string;
}

interface DiagnosisResult {
  status: string;
  priority: string;
  headline: string;
  analysis: string;
  recommendations: string[];
}

// Node height 96px — enough for 3 sub-compartment rows + title
const NODE_H = 96;
const ROW_Y = [28, 256, 484, 712];

const MAP_NODES: Record<string, VisualNode> = {
  "espn":           { x: 20,   y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "ESPN Live",           sublabel: "Scores · Rosters",    layer: "Data Sources" },
  "odds-api":       { x: 190,  y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "The Odds API",         sublabel: "Multi-book Odds",     layer: "Data Sources" },
  "bdl":            { x: 360,  y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "BallDontLie",          sublabel: "NBA/NFL/MLB Stats",   layer: "Data Sources" },
  "nhl-stats":      { x: 530,  y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "NHL Stats API",        sublabel: "Team & Player Data",  layer: "Data Sources" },
  "mlb-stats":      { x: 700,  y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "MLB Stats API",        sublabel: "Team & Player Data",  layer: "Data Sources" },
  "api-football":   { x: 872,  y: ROW_Y[0], w: 148, h: NODE_H, row: 0, label: "API-Football",         sublabel: "16 Soccer Leagues",   layer: "Data Sources" },
  "openai":         { x: 1072, y: ROW_Y[0], w: 128, h: NODE_H, row: 0, label: "OpenAI GPT-4o",        sublabel: "AI Insights",         layer: "Data Sources" },

  "precomputed":    { x: 20,   y: ROW_Y[1], w: 155, h: NODE_H, row: 1, label: "Predictions Engine",   sublabel: "46-Factor Model",     layer: "Core Engines" },
  "intel-hub":      { x: 222,  y: ROW_Y[1], w: 148, h: NODE_H, row: 1, label: "Intelligence Hub",     sublabel: "60-sec Cycle",        layer: "Core Engines" },
  "team-form":      { x: 418,  y: ROW_Y[1], w: 148, h: NODE_H, row: 1, label: "Team Form Engine",     sublabel: "60d Historical",      layer: "Core Engines" },
  "situational":    { x: 614,  y: ROW_Y[1], w: 160, h: NODE_H, row: 1, label: "Situational Analysis", sublabel: "Rest · B2B · Travel", layer: "Core Engines" },
  "two-way":        { x: 822,  y: ROW_Y[1], w: 172, h: NODE_H, row: 1, label: "Two-Way Intelligence", sublabel: "Roster Stability",    layer: "Core Engines" },
  "vegas-engine":   { x: 1042, y: ROW_Y[1], w: 158, h: NODE_H, row: 1, label: "Vegas Engine",         sublabel: "Power Ratings",       layer: "Core Engines" },

  "mma-engine":     { x: 20,   y: ROW_Y[2], w: 132, h: NODE_H, row: 2, label: "MMA/UFC Engine",       sublabel: "UFC/MMA Odds & EV",   layer: "Specialized" },
  "intl-sports":    { x: 200,  y: ROW_Y[2], w: 152, h: NODE_H, row: 2, label: "Intl Sports Engine",   sublabel: "Soccer Fixtures",     layer: "Specialized" },
  "pick-insight":   { x: 402,  y: ROW_Y[2], w: 160, h: NODE_H, row: 2, label: "Pick Insight Engine",  sublabel: "AI Sharp Insights",   layer: "Specialized" },
  "correlation":    { x: 614,  y: ROW_Y[2], w: 162, h: NODE_H, row: 2, label: "Correlation Engine",   sublabel: "Slip Analysis 0–100", layer: "Specialized" },
  "usml":           { x: 828,  y: ROW_Y[2], w: 128, h: NODE_H, row: 2, label: "USML Meta-Learner",    sublabel: "6-Source Ensemble",   layer: "Specialized" },
  "life-changer":   { x: 1008, y: ROW_Y[2], w: 192, h: NODE_H, row: 2, label: "Daily Edge Parlay",    sublabel: "5-Sport Pool",        layer: "Specialized" },

  "command-center": { x: 20,   y: ROW_Y[3], w: 168, h: NODE_H, row: 3, label: "Command Center",       sublabel: "Today's Picks",       layer: "User Features" },
  "bet-slip":       { x: 238,  y: ROW_Y[3], w: 128, h: NODE_H, row: 3, label: "Bet Slip",             sublabel: "Multi-Slip · Parlay", layer: "User Features" },
  "ticket-vars":    { x: 420,  y: ROW_Y[3], w: 160, h: NODE_H, row: 3, label: "Ticket Variations",    sublabel: "5 Strategy Blueprints",layer: "User Features" },
  "daily-picks":    { x: 634,  y: ROW_Y[3], w: 142, h: NODE_H, row: 3, label: "Daily Picks",          sublabel: "All Sports Feed",     layer: "User Features" },
  "odds-center":    { x: 834,  y: ROW_Y[3], w: 152, h: NODE_H, row: 3, label: "Odds Center",          sublabel: "EV · Lines · Comparison",layer:"User Features"},
  "player-props":   { x: 1042, y: ROW_Y[3], w: 158, h: NODE_H, row: 3, label: "Player Props",         sublabel: "Over/Under Lines",    layer: "User Features" },
};

const MAP_CONNECTIONS: [string, string][] = [
  ["espn",         "precomputed"],
  ["espn",         "intel-hub"],
  ["espn",         "team-form"],
  ["espn",         "situational"],
  ["odds-api",     "intel-hub"],
  ["odds-api",     "mma-engine"],
  ["bdl",          "precomputed"],
  ["bdl",          "two-way"],
  ["bdl",          "vegas-engine"],
  ["nhl-stats",    "precomputed"],
  ["mlb-stats",    "precomputed"],
  ["api-football", "intl-sports"],
  ["openai",       "pick-insight"],
  ["precomputed",  "pick-insight"],
  ["precomputed",  "usml"],
  ["precomputed",  "life-changer"],
  ["intel-hub",    "correlation"],
  ["intel-hub",    "daily-picks"],
  ["team-form",    "pick-insight"],
  ["situational",  "pick-insight"],
  ["two-way",      "pick-insight"],
  ["vegas-engine", "pick-insight"],
  ["mma-engine",   "life-changer"],
  ["intl-sports",  "life-changer"],
  ["pick-insight", "command-center"],
  ["pick-insight", "daily-picks"],
  ["pick-insight", "ticket-vars"],
  ["correlation",  "bet-slip"],
  ["usml",         "daily-picks"],
  ["life-changer", "command-center"],
  ["odds-api",     "odds-center"],
  ["odds-api",     "player-props"],
];

function getConnectionPath(fromId: string, toId: string): string {
  const from = MAP_NODES[fromId];
  const to = MAP_NODES[toId];
  if (!from || !to) return "";
  const fx = from.x + from.w / 2;
  const fy = from.y + from.h;
  const tx = to.x + to.w / 2;
  const ty = to.y;
  const rowDiff = Math.abs(to.row - from.row);
  const cp = Math.max(55, rowDiff * 55);
  if (to.row <= from.row) {
    const midY = (from.y + to.y + to.h) / 2;
    return `M ${fx} ${fy} Q ${fx + 80} ${midY} ${tx} ${ty}`;
  }
  return `M ${fx} ${fy} C ${fx} ${fy + cp} ${tx} ${ty - cp} ${tx} ${ty}`;
}

const STATUS_NODE_STYLES: Record<string, { ring: string; dot: string; bg: string; text: string }> = {
  live:     { ring: "border-emerald-500/60", dot: "bg-emerald-500", bg: "bg-emerald-500/8",  text: "text-emerald-400" },
  cached:   { ring: "border-yellow-500/50",  dot: "bg-yellow-500",  bg: "bg-yellow-500/8",   text: "text-yellow-400" },
  degraded: { ring: "border-orange-500/50",  dot: "bg-orange-500",  bg: "bg-orange-500/8",   text: "text-orange-400" },
  offline:  { ring: "border-red-500/60",     dot: "bg-red-500",     bg: "bg-red-500/8",      text: "text-red-400" },
  unknown:  { ring: "border-border",         dot: "bg-muted-foreground", bg: "",              text: "text-muted-foreground" },
};

const STATUS_EDGE_COLOR: Record<string, string> = {
  live: "#10b981",
  cached: "#eab308",
  degraded: "#f97316",
  offline: "#ef4444",
  unknown: "#6b7280",
};

const LAYER_COLORS: Record<string, string> = {
  "Data Sources": "text-blue-400",
  "Core Engines": "text-violet-400",
  "Specialized":  "text-amber-400",
  "User Features": "text-emerald-400",
};

function PipelineConnectionMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);

  const { data: visualData, isLoading, dataUpdatedAt } = useQuery<VisualStatus>({
    queryKey: ["/api/admin/pipeline/visual-status"],
    refetchInterval: 6000,
  });

  const diagnose = useMutation({
    mutationFn: async () => {
      setDiagnosisLoading(true);
      try {
        const res = await apiRequest("POST", "/api/admin/pipeline/diagnose", {
          nodes: visualData?.nodes ?? {},
          summary: visualData?.summary ?? {},
        });
        return res.json();
      } finally {
        setDiagnosisLoading(false);
      }
    },
    onSuccess: (data) => setDiagnosis(data),
  });

  const nodes = visualData?.nodes ?? {};
  const summary = visualData?.summary;

  const getNodeStatus = (id: string): string => nodes[id]?.status ?? "unknown";
  const getNodeStyle = (id: string) => STATUS_NODE_STYLES[getNodeStatus(id)] ?? STATUS_NODE_STYLES.unknown;

  const CANVAS_W = 1220;
  const CANVAS_H = ROW_Y[3] + NODE_H + 50; // dynamic based on node positions

  const priorityColors: Record<string, string> = {
    none: "emerald", low: "blue", medium: "yellow", high: "orange", critical: "red",
  };
  const pc = priorityColors[diagnosis?.priority ?? "none"] ?? "blue";

  // Offline / degraded connections highlighted in hover panel
  const disconnectedEdges = MAP_CONNECTIONS.filter(([from]) => {
    const s = getNodeStatus(from);
    return s === "offline" || s === "degraded";
  });

  return (
    <div className="space-y-4" data-testid="pipeline-connection-map">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Live Intelligence Pipeline Map</h2>
            {summary && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                {summary.liveNodes}/{summary.totalNodes} live
              </Badge>
            )}
            {summary && summary.offlineNodes > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-500/40 text-red-400">
                {summary.offlineNodes} offline
              </Badge>
            )}
            {summary && summary.degradedNodes > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-500/40 text-yellow-400">
                {summary.degradedNodes} degraded
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            28 nodes with live sub-compartment metrics — data sources, engines, user features. Updates every 6 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => diagnose.mutate()}
            disabled={diagnosisLoading || !visualData}
            data-testid="button-ai-diagnose"
          >
            {diagnosisLoading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
              : <><Stethoscope className="h-3.5 w-3.5" /> AI Diagnose</>}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        {(["live","cached","degraded","offline","unknown"] as const).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_NODE_STYLES[s].dot}`} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
        <span className="ml-auto text-[10px] hidden sm:flex items-center gap-3">
          {Object.entries(LAYER_COLORS).map(([layer, cls]) => (
            <span key={layer} className={`font-semibold ${cls}`}>{layer}</span>
          ))}
        </span>
      </div>

      {/* Disconnect alert banner */}
      {disconnectedEdges.length > 0 && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/25 bg-red-500/5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">
            {disconnectedEdges.length} pipeline connection{disconnectedEdges.length > 1 ? "s" : ""} degraded or offline.{" "}
            <span className="text-muted-foreground font-normal">
              Affected: {[...new Set(disconnectedEdges.map(([f]) => MAP_NODES[f]?.label ?? f))].join(", ")}
            </span>
          </span>
        </div>
      )}

      {/* SVG Diagram */}
      <div className="relative border rounded-xl bg-card/30 overflow-x-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading pipeline data…
            </div>
          </div>
        )}
        <div style={{ minWidth: CANVAS_W + 40 }}>
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block"
            style={{ maxWidth: "100%" }}
          >
            {/* Layer band backgrounds */}
            {[
              { y: ROW_Y[0] - 20, h: NODE_H + 36, color: "#60a5fa", label: "EXTERNAL DATA SOURCES" },
              { y: ROW_Y[1] - 20, h: NODE_H + 36, color: "#a78bfa", label: "CORE PROCESSING ENGINES" },
              { y: ROW_Y[2] - 20, h: NODE_H + 36, color: "#fbbf24", label: "SPECIALIZED INTELLIGENCE ENGINES" },
              { y: ROW_Y[3] - 20, h: NODE_H + 36, color: "#34d399", label: "USER-FACING FEATURES" },
            ].map(({ y, h, color, label }) => (
              <g key={label}>
                <rect x={0} y={y} width={CANVAS_W} height={h} fill={color} fillOpacity={0.025} rx={0} />
                <text x={CANVAS_W / 2} y={y + 13} textAnchor="middle" fill={color}
                  fontSize="8.5" fontWeight="700" letterSpacing="2" opacity={0.6}
                  style={{ userSelect: "none" }}>
                  {label}
                </text>
              </g>
            ))}

            {/* Connection edges */}
            {MAP_CONNECTIONS.map(([from, to]) => {
              const d = getConnectionPath(from, to);
              const status = getNodeStatus(from);
              const color = STATUS_EDGE_COLOR[status] ?? STATUS_EDGE_COLOR.unknown;
              const isHoveredSource = hoveredNode === from || hoveredNode === to;
              const isOffline = status === "offline";
              const isDegraded = status === "degraded";
              return (
                <path
                  key={`${from}-${to}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHoveredSource ? 2.5 : isOffline ? 1 : 1.2}
                  strokeOpacity={isHoveredSource ? 1 : isOffline ? 0.5 : 0.28}
                  strokeDasharray={isOffline ? "5 4" : isDegraded ? "3 3" : "none"}
                  style={{ transition: "stroke-opacity 0.2s, stroke-width 0.2s" }}
                />
              );
            })}

            {/* Flow particles on live connections */}
            {MAP_CONNECTIONS.filter(([from]) => getNodeStatus(from) === "live").map(([from, to], i) => {
              const d = getConnectionPath(from, to);
              if (!d) return null;
              return (
                <circle key={`particle-${from}-${to}`} r="2.5" fill={STATUS_EDGE_COLOR["live"]} opacity={0.8}>
                  <animateMotion
                    dur={`${2.2 + (i % 5) * 0.4}s`}
                    begin={`${(i % 8) * 0.35}s`}
                    repeatCount="indefinite"
                    path={d}
                  />
                </circle>
              );
            })}

            {/* Nodes with sub-compartments */}
            {Object.entries(MAP_NODES).map(([id, node]) => {
              const status = getNodeStatus(id);
              const nodeData = nodes[id];
              const isHovered = hoveredNode === id;
              const isConnected = hoveredNode
                ? MAP_CONNECTIONS.some(([f, t]) => (f === hoveredNode && t === id) || (t === hoveredNode && f === id))
                : false;
              const dimmed = hoveredNode && !isHovered && !isConnected;
              const edgeColor = STATUS_EDGE_COLOR[status] ?? "#6b7280";
              const metrics = nodeData?.metrics;

              return (
                <g
                  key={id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1, transition: "opacity 0.15s" }}
                  onMouseEnter={() => setHoveredNode(id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  data-testid={`node-${id}`}
                >
                  {/* Shadow on hover */}
                  {isHovered && (
                    <rect x={-2} y={-2} width={node.w + 4} height={node.h + 4} rx={8}
                      fill={edgeColor} fillOpacity={0.08} />
                  )}

                  {/* Main card */}
                  <rect
                    x={0} y={0} width={node.w} height={node.h} rx={6}
                    fill="hsl(var(--card))"
                    fillOpacity={isHovered ? 1 : 0.9}
                    stroke={edgeColor}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                    strokeOpacity={isHovered ? 0.8 : (status === "live" ? 0.35 : status === "offline" ? 0.5 : 0.2)}
                  />

                  {/* Top status stripe */}
                  <rect x={0} y={0} width={node.w} height={3} rx={3}
                    fill={edgeColor} opacity={status === "live" ? 0.7 : status === "offline" ? 0.9 : 0.5} />

                  {/* Pulsing status dot */}
                  <circle cx={node.w - 9} cy={13} r={4} fill={edgeColor} opacity={0.9}>
                    {status === "live" && (
                      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.5s" repeatCount="indefinite" />
                    )}
                    {status === "offline" && (
                      <animate attributeName="r" values="4;3;4" dur="1.5s" repeatCount="indefinite" />
                    )}
                  </circle>

                  {/* Title */}
                  <text x={7} y={17} fill="hsl(var(--foreground))" fontSize="9.5" fontWeight="700"
                    style={{ userSelect: "none" }}>
                    {node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label}
                  </text>

                  {/* Divider after title */}
                  <line x1={7} y1={22} x2={node.w - 7} y2={22} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />

                  {/* Sub-compartment A — primary metric */}
                  <text x={7} y={33} fill={edgeColor} fontSize="8" fontWeight="600"
                    style={{ userSelect: "none" }}>
                    {(metrics?.a ?? node.sublabel).slice(0, Math.floor(node.w / 5.5))}
                  </text>

                  {/* Sub-compartment B — secondary metric */}
                  <text x={7} y={46} fill="hsl(var(--muted-foreground))" fontSize="7.5"
                    style={{ userSelect: "none" }}>
                    {(metrics?.b ?? "").slice(0, Math.floor(node.w / 5))}
                  </text>

                  {/* Divider before status */}
                  <line x1={7} y1={54} x2={node.w - 7} y2={54} stroke="hsl(var(--border))" strokeWidth={0.4} opacity={0.35} />

                  {/* Sub-compartment C — tertiary metric */}
                  <text x={7} y={65} fill="hsl(var(--muted-foreground))" fontSize="7"
                    style={{ userSelect: "none" }} opacity={0.75}>
                    {(metrics?.c ?? "").slice(0, Math.floor(node.w / 4.8))}
                  </text>

                  {/* Status badge */}
                  <rect x={7} y={73} width={40} height={13} rx={3}
                    fill={edgeColor} fillOpacity={0.15} />
                  <text x={11} y={83} fill={edgeColor} fontSize="7" fontWeight="700"
                    style={{ userSelect: "none" }}>
                    {status.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hovered node detail panel */}
      {hoveredNode && nodes[hoveredNode] && (
        <div className="rounded-xl border bg-card/90 px-4 py-3 space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_NODE_STYLES[nodes[hoveredNode].status]?.dot ?? "bg-muted-foreground"}`} />
                <span className="font-bold text-sm">{nodes[hoveredNode].label}</span>
                <Badge variant="outline" className="text-[10px] h-5 px-2 capitalize">
                  {nodes[hoveredNode].status}
                </Badge>
                <span className="text-[10px] text-muted-foreground/60">{MAP_NODES[hoveredNode]?.layer}</span>
              </div>
              <p className="text-xs text-muted-foreground">{nodes[hoveredNode].detail}</p>
            </div>
            <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-0.5 shrink-0">
              <div>
                <span className="font-semibold text-muted-foreground/50 uppercase tracking-wide block">Inputs from</span>
                {MAP_CONNECTIONS.filter(([, t]) => t === hoveredNode).map(([f]) => MAP_NODES[f]?.label ?? f).join(", ") || "—"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground/50 uppercase tracking-wide block">Feeds into</span>
                {MAP_CONNECTIONS.filter(([f]) => f === hoveredNode).map(([, t]) => MAP_NODES[t]?.label ?? t).join(", ") || "—"}
              </div>
            </div>
          </div>
          {nodes[hoveredNode].metrics && (
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
              {[nodes[hoveredNode].metrics!.a, nodes[hoveredNode].metrics!.b, nodes[hoveredNode].metrics!.c].filter(Boolean).map((m, i) => (
                <div key={i} className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-bold">
                    {i === 0 ? "Data Coverage" : i === 1 ? "Performance" : "Features"}
                  </p>
                  <p className="text-[11px] text-foreground/80 font-medium mt-0.5">{m}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Diagnosis Result */}
      {diagnosis && (
        <Card className={`border-${pc}-500/30 bg-${pc}-500/5 animate-in fade-in slide-in-from-bottom-2 duration-200`}
          data-testid="diagnosis-result">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className={`h-4 w-4 text-${pc}-400`} />
                <CardTitle className="text-sm">AI Pipeline Diagnosis</CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-4 px-1.5 border-${pc}-500/40 text-${pc}-400`}
                >
                  {(diagnosis.priority ?? "none").toUpperCase()}
                </Badge>
              </div>
              <button
                onClick={() => setDiagnosis(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <CardDescription className="text-xs font-medium text-foreground/80 mt-1">
              {diagnosis.headline}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{diagnosis.analysis}</p>
            {diagnosis.recommendations?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide">Recommendations</p>
                <ol className="space-y-1">
                  {diagnosis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 w-4 h-4 rounded-full bg-${pc}-500/20 text-${pc}-400 flex items-center justify-center text-[9px] font-bold mt-px`}>
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Node status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summary && [
          { label: "Live",     val: summary.liveNodes,     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Cached",   val: summary.degradedNodes, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
          { label: "Offline",  val: summary.offlineNodes,  color: "text-red-400 bg-red-500/10 border-red-500/20" },
          { label: "Unknown",  val: summary.unknownNodes,  color: "text-muted-foreground bg-muted/30 border-border" },
        ].map(({ label, val, color }) => (
          <div key={label} className={`rounded-lg border px-3 py-2 text-center ${color}`}>
            <div className="text-lg font-bold">{val}</div>
            <div className="text-[10px] uppercase tracking-wide font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Data Quality & Broken Endpoint Alerts ─────────────────────── */}
      {visualData?.dataQualityAlerts && visualData.dataQualityAlerts.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <CardTitle className="text-sm font-semibold">Data Quality & Broken Endpoint Alerts</CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-orange-500/40 text-orange-400">
                  {visualData.dataQualityAlerts.length} issue{visualData.dataQualityAlerts.length !== 1 ? "s" : ""} detected
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">Fix these before launch</span>
            </div>
            <CardDescription className="text-xs">
              Proactive scan of all pipeline endpoints, API keys, data flows, and null field detection. Address all critical issues before going live.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {visualData.dataQualityAlerts.map((alert) => {
              const severityConfig = {
                critical: { bg: "bg-red-500/8 border-red-500/25",    badge: "border-red-500/40 text-red-400 bg-red-500/10",    icon: "text-red-400",    dot: "bg-red-500" },
                warning:  { bg: "bg-yellow-500/8 border-yellow-500/25", badge: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10", icon: "text-yellow-400", dot: "bg-yellow-500" },
                info:     { bg: "bg-blue-500/8 border-blue-500/25",   badge: "border-blue-500/40 text-blue-400 bg-blue-500/10",   icon: "text-blue-400",   dot: "bg-blue-500/70" },
              }[alert.severity];

              return (
                <div key={alert.id} className={`rounded-lg border p-3 space-y-2 ${severityConfig.bg}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${severityConfig.dot}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{alert.label}</span>
                          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${severityConfig.badge}`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">→ node:{alert.node}</span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5 leading-snug">{alert.issue}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pl-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">User Impact</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{alert.impact}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-wide">Resolution</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{alert.resolution}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All clear */}
      {visualData?.dataQualityAlerts && visualData.dataQualityAlerts.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">All data quality checks passed — no broken endpoints detected</span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function PipelineIntelligence() {
  useSEO({ title: "Pipeline Intelligence", description: "Data pipeline monitoring and intelligence" });
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState("NBA");
  const [riskLevel, setRiskLevel] = useState("moderate");
  const [bankroll, setBankroll] = useState("1000");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const { data: health, isLoading: healthLoading } = useQuery<PipelineHealth>({
    queryKey: ["/api/pipeline/health"],
    refetchInterval: 10000,
  });

  const { data: runs, isLoading: runsLoading } = useQuery<PipelineRun[]>({
    queryKey: ["/api/pipeline/runs"],
    refetchInterval: 5000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<any[]>({
    queryKey: ["/api/pipeline/alerts"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/pipeline/config"],
  });

  const { data: dataStoreStats, isLoading: dataStoreLoading } = useQuery<any>({
    queryKey: ["/api/pipeline/data-store/stats"],
  });

  const runMutation = useMutation({
    mutationFn: async (params: { sport: string; riskLevel: string; bankroll: number }) => {
      const res = await apiRequest("POST", "/api/pipeline/run", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/data-store/stats"] });
    },
  });

  const handleRunPipeline = () => {
    runMutation.mutate({
      sport: selectedSport,
      riskLevel,
      bankroll: parseFloat(bankroll) || 1000,
    });
  };

  const latestRun = runs?.[0];
  const activeAlerts = alerts?.filter((a: any) => !a.acknowledged) || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "connection-map", label: "Connection Map", icon: Network },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, count: activeAlerts.length },
    { id: "runs", label: "History", icon: Clock },
  ];

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6" data-testid="pipeline-intelligence-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/launch-control">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors" data-testid="link-back-to-admin">
              <ArrowLeft className="w-3 h-3" />
              Launch Control
            </button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-pipeline">
            Intelligence Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Advanced 12-module prediction engine with continuous learning
          </p>
        </div>

        <div className="flex items-center gap-2">
          {health && (
            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-1 ${
                health.status === "healthy" ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" :
                health.status === "degraded" ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" :
                "border-red-500/30 text-red-500 bg-red-500/5"
              }`}
              data-testid="pipeline-health-badge"
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                health.status === "healthy" ? "bg-emerald-500" :
                health.status === "degraded" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              {health.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0 border-b -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "connection-map" && (
        <PipelineConnectionMap />
      )}

      {activeTab === "overview" && healthLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border bg-card animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 w-16 bg-muted rounded mb-2" />
                  <div className="h-7 w-12 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "overview" && !healthLoading && (
        <div className="space-y-6">
          <Card className="border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Run Pipeline
              </CardTitle>
              <CardDescription className="text-xs">
                Execute the full 12-stage prediction pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-sport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 sm:max-w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(e.target.value)}
                    className="pl-7"
                    placeholder="Bankroll"
                    data-testid="input-bankroll"
                  />
                </div>

                <Button
                  onClick={handleRunPipeline}
                  disabled={runMutation.isPending}
                  className="gap-2"
                  data-testid="button-run-pipeline"
                >
                  {runMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {runMutation.isPending ? "Running..." : "Execute Pipeline"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-runs">{health?.totalRuns || 0}</p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-success-rate">
                  {health ? `${(health.successRate * 100).toFixed(1)}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-avg-latency">
                  {health ? `${health.avgLatencyMs}ms` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className={`text-2xl font-bold mt-1 ${activeAlerts.length > 0 ? "text-red-500" : ""}`} data-testid="stat-active-alerts">
                  {activeAlerts.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {latestRun && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Latest Pipeline Run
                  </CardTitle>
                  <Badge variant="outline" className={`text-xs ${
                    latestRun.status === "completed" ? "border-emerald-500/30 text-emerald-500" :
                    latestRun.status === "failed" ? "border-red-500/30 text-red-500" :
                    latestRun.status === "partial" ? "border-yellow-500/30 text-yellow-500" :
                    "border-blue-500/30 text-blue-500"
                  }`}>
                    {latestRun.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {latestRun.inputSummary.sport} &middot; {latestRun.inputSummary.riskLevel} &middot; Run ID: {latestRun.traceId.slice(0, 12)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {latestRun.stages.map((stage, idx) => {
                    const Icon = STAGE_ICONS[stage.name] || Activity;
                    return (
                      <div
                        key={stage.name}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${STATUS_BG[stage.status]}`}
                        data-testid={`stage-${stage.module}`}
                      >
                        <Icon className={`h-4 w-4 ${STATUS_COLORS[stage.status]}`} />
                        <span className="text-[10px] font-medium leading-tight">{stage.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {stage.durationMs !== null ? `${stage.durationMs}ms` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {latestRun.outputSummary && (
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <span>Generated: <strong className="text-foreground">{latestRun.outputSummary.candidatesGenerated}</strong></span>
                    <ArrowRight className="h-3 w-3" />
                    <span>Selected: <strong className="text-emerald-500">{latestRun.outputSummary.candidatesSelected}</strong></span>
                    <span>Rejected: <strong className="text-red-500">{latestRun.outputSummary.rejected}</strong></span>
                    {latestRun.outputSummary.reviewRequired > 0 && (
                      <span>Review: <strong className="text-yellow-500">{latestRun.outputSummary.reviewRequired}</strong></span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {health && health.moduleHealth && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  Module Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {health.moduleHealth.map((mod) => {
                    const Icon = STAGE_ICONS[mod.module] || Activity;
                    const statusColor = STATUS_COLORS[mod.status] || "text-muted-foreground";
                    return (
                      <div key={mod.module} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${statusColor}`} />
                          <span className="text-sm">{mod.module}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{mod.lastRunMs}ms</span>
                          <Badge variant="outline" className={`text-[10px] py-0 ${
                            mod.status === "success" ? "border-emerald-500/30 text-emerald-500" :
                            mod.status === "failed" ? "border-red-500/30 text-red-500" :
                            "border-muted"
                          }`}>
                            {mod.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "pipeline" && latestRun && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Pipeline flow for run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{latestRun.runId}</code></span>
          </div>

          {latestRun.stages.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.name] || Activity;
            const isExpanded = expandedStage === stage.name;
            return (
              <div key={stage.name}>
                <Card
                  className={`border cursor-pointer transition-colors ${STATUS_BG[stage.status]} hover:bg-accent/5`}
                  onClick={() => setExpandedStage(isExpanded ? null : stage.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          stage.status === "success" ? "bg-emerald-500/15" :
                          stage.status === "failed" ? "bg-red-500/15" :
                          stage.status === "running" ? "bg-blue-500/15" : "bg-muted"
                        }`}>
                          <Icon className={`h-4 w-4 ${STATUS_COLORS[stage.status]}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{stage.name}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{stage.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>In: {stage.inputCount}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>Out: {stage.outputCount}</span>
                            <span>&middot; Checks: {stage.checksPassed}/{stage.checksRun}</span>
                            {stage.durationMs !== null && <span>&middot; {stage.durationMs}ms</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.checksRun > 0 && (
                          <div className="w-16">
                            <Progress
                              value={stage.checksRun > 0 ? (stage.checksPassed / stage.checksRun) * 100 : 0}
                              className="h-1.5"
                            />
                          </div>
                        )}
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t space-y-2">
                        {stage.errors.length > 0 && (
                          <div className="space-y-1">
                            {stage.errors.map((err, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-red-500">
                                <XCircle className="h-3 w-3 shrink-0" />
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                        {Object.keys(stage.metadata).length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Details</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(stage.metadata).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}: </span>
                                  <span className="font-medium">
                                    {typeof value === "object" ? JSON.stringify(value).slice(0, 50) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {idx < latestRun.stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-4 ${stage.status === "success" ? "bg-emerald-500/30" : "bg-border"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "pipeline" && !latestRun && (
        <Card className="border bg-card">
          <CardContent className="p-8 text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No pipeline runs yet. Execute a run to see the flow.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "metrics" && (
        <div className="space-y-4">
          {health?.metrics && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Win Rate", value: health.metrics.winRate, format: "pct", good: (v: number) => v > 0.48 },
                  { label: "ROI", value: health.metrics.roi, format: "pct", good: (v: number) => v > 0 },
                  { label: "Calibration", value: health.metrics.calibration, format: "pct", good: (v: number) => v > 0.9 },
                  { label: "Precision", value: health.metrics.precision, format: "pct", good: (v: number) => v > 0.5 },
                  { label: "Prediction Accuracy", value: health.metrics.brierScore, format: "dec", good: (v: number) => v < 0.25 },
                  { label: "Error Rate", value: health.metrics.logLoss, format: "dec", good: (v: number) => v < 0.69 },
                  { label: "Market Shift", value: health.metrics.conceptDrift, format: "pct", good: (v: number) => v < 0.15 },
                  { label: "Model Speed", value: health.metrics.modelLatency, format: "ms", good: (v: number) => v < 500 },
                ].map((metric) => (
                  <Card key={metric.label} className="border bg-card">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className={`text-xl font-bold mt-1 ${
                        metric.value !== undefined && metric.good(metric.value) ? "text-emerald-500" : "text-foreground"
                      }`}>
                        {metric.value !== undefined ? (
                          metric.format === "pct" ? `${(metric.value * 100).toFixed(1)}%` :
                          metric.format === "ms" ? `${Math.round(metric.value)}ms` :
                          metric.value.toFixed(4)
                        ) : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {health.metrics.retrainingTriggered && (
                <Card className="border border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Retraining Triggered</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {health.metrics.retrainingReason || "Performance degradation detected. Model retraining recommended."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {dataStoreStats && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Canonical Data Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <p className="text-lg font-bold">{dataStoreStats.totalRecords}</p>
                    <p className="text-[10px] text-muted-foreground">Total Records</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/5">
                    <p className="text-lg font-bold text-emerald-500">{dataStoreStats.accepted}</p>
                    <p className="text-[10px] text-muted-foreground">Accepted</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-500/5">
                    <p className="text-lg font-bold text-red-500">{dataStoreStats.rejected}</p>
                    <p className="text-[10px] text-muted-foreground">Rejected</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-yellow-500/5">
                    <p className="text-lg font-bold text-yellow-500">{dataStoreStats.quarantined}</p>
                    <p className="text-[10px] text-muted-foreground">Quarantined</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/5">
                    <p className="text-lg font-bold text-blue-500">{(dataStoreStats.avgQuality * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {config && (
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Pipeline Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {Object.entries(config).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="font-medium text-xs">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-3">
          {activeAlerts.length === 0 && (
            <Card className="border bg-card">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500/50 mb-3" />
                <p className="text-sm text-muted-foreground">No active alerts. All systems operating normally.</p>
              </CardContent>
            </Card>
          )}

          {(alerts || []).map((alert: any) => (
            <Card
              key={alert.alertId}
              className={`border ${
                alert.acknowledged ? "opacity-60" : ""
              } ${
                alert.severity === "critical" ? "border-red-500/30 bg-red-500/5" :
                alert.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-blue-500/30 bg-blue-500/5"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.remediation}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(alert.timestamp).toLocaleString()} &middot; Rule: {alert.ruleId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] py-0 ${
                      alert.severity === "critical" ? "border-red-500/30 text-red-500" :
                      alert.severity === "warning" ? "border-yellow-500/30 text-yellow-500" :
                      "border-blue-500/30 text-blue-500"
                    }`}>
                      {alert.severity}
                    </Badge>
                    {alert.acknowledged && (
                      <Badge variant="outline" className="text-[10px] py-0">ACK</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "runs" && (
        <div className="space-y-3">
          {(!runs || runs.length === 0) && (
            <Card className="border bg-card">
              <CardContent className="p-8 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No pipeline runs yet.</p>
              </CardContent>
            </Card>
          )}

          {(runs || []).map((run: PipelineRun) => {
            const isExpanded = expandedRun === run.runId;
            const successStages = run.stages.filter(s => s.status === "success").length;
            const totalStages = run.stages.length;
            const duration = run.endTime
              ? new Date(run.endTime).getTime() - new Date(run.startTime).getTime()
              : null;

            return (
              <Card
                key={run.runId}
                className="border bg-card cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setExpandedRun(isExpanded ? null : run.runId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === "completed" ? "bg-emerald-500" :
                        run.status === "failed" ? "bg-red-500" :
                        run.status === "partial" ? "bg-yellow-500" : "bg-blue-500"
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{run.inputSummary.sport}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{run.inputSummary.riskLevel}</Badge>
                          <Badge variant="outline" className={`text-[10px] py-0 ${
                            run.status === "completed" ? "border-emerald-500/30 text-emerald-500" :
                            run.status === "failed" ? "border-red-500/30 text-red-500" :
                            "border-yellow-500/30 text-yellow-500"
                          }`}>
                            {run.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(run.startTime).toLocaleString()} &middot; {successStages}/{totalStages} stages &middot;
                          {duration !== null ? ` ${duration}ms` : " running..."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {run.outputSummary && (
                        <span className="text-xs text-muted-foreground">
                          {run.outputSummary.candidatesSelected} selected
                        </span>
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="grid grid-cols-6 gap-1.5">
                        {run.stages.map((stage) => {
                          const Icon = STAGE_ICONS[stage.name] || Activity;
                          return (
                            <div
                              key={stage.name}
                              className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-center ${STATUS_BG[stage.status]}`}
                            >
                              <Icon className={`h-3 w-3 ${STATUS_COLORS[stage.status]}`} />
                              <span className="text-[8px] leading-tight">{stage.name.split(" ")[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span>Run ID: <code className="bg-muted px-1 rounded">{run.traceId.slice(0, 16)}</code></span>
                        {run.alerts.length > 0 && (
                          <span className="text-yellow-500">{run.alerts.length} alert(s)</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
