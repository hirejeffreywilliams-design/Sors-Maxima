import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database, Brain, Zap, Target, ChevronDown, ChevronUp,
  Activity, TrendingUp, BarChart3, Users, Clock, CheckCircle2,
  ArrowRight, Layers, Sparkles, Shield, DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PipelineLayerProps {
  step: number;
  icon: React.ReactNode;
  label: string;
  color: string;
  borderColor: string;
  nodes: { name: string; detail: string; icon: React.ReactNode }[];
  outputLabel: string;
}

function PipelineLayer({ step, icon, label, color, borderColor, nodes, outputLabel }: PipelineLayerProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderColor} ${color} text-xs font-semibold`}>
        {icon}
        <span>Step {step}: {label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
        {nodes.map((node, i) => (
          <div
            key={i}
            className={`rounded-lg border ${borderColor} bg-card/60 px-2.5 py-2 flex items-start gap-2`}
          >
            <div className={`mt-0.5 shrink-0 ${color}`}>{node.icon}</div>
            <div>
              <p className="text-[11px] font-semibold leading-tight">{node.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{node.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={`text-[10px] font-medium px-2 py-0.5 rounded ${color} opacity-80`}>
        → {outputLabel}
      </div>
    </div>
  );
}

export function IntelligencePipeline() {
  const [expanded, setExpanded] = useState(false);

  const { data: engineStatus } = useQuery<{ lastRunAt?: string; picksGenerated?: number; gamesAnalyzed?: number }>({
    queryKey: ["/api/precomputed-engine/status"],
    refetchInterval: 60000,
  });

  const lastRun = engineStatus?.lastRunAt
    ? new Date(engineStatus.lastRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20" data-testid="card-intelligence-pipeline">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm">Intelligence Pipeline</h3>
                <Badge variant="outline" className="gap-1 text-[10px] bg-green-500/10 border-green-500/30 text-green-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                How 6 data sources, 46 factors, and 4 engines combine into every pick you see
                {lastRun && <> · Last cycle <span className="text-foreground font-medium">{lastRun}</span></>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {engineStatus && (
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-base font-bold tabular-nums">{engineStatus.gamesAnalyzed || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Games</p>
                </div>
                <div>
                  <p className="text-base font-bold tabular-nums text-primary">{engineStatus.picksGenerated || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Picks</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setExpanded(!expanded)}
              data-testid="button-toggle-pipeline"
            >
              {expanded ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Hide</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> See how it works</>
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 items-center text-center text-[10px] text-muted-foreground font-medium">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                </div>
                DATA INGESTION
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 rotate-90 sm:rotate-0" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                </div>
                FACTOR ANALYSIS
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-green-400" />
                </div>
                PICK OUTPUT
              </div>
            </div>

            <div className="space-y-4">
              <PipelineLayer
                step={1}
                icon={<Database className="w-3 h-3" />}
                label="Data Ingestion (Every 60 Seconds)"
                color="text-blue-400"
                borderColor="border-blue-500/25"
                outputLabel="Raw game, odds, and player data staged for analysis"
                nodes={[
                  { name: "Live Odds", detail: "15+ books, every market, every second", icon: <DollarSign className="w-3 h-3" /> },
                  { name: "Game Scores", detail: "Real-time scores, period, clock, status", icon: <Activity className="w-3 h-3" /> },
                  { name: "Team Stats", detail: "Season stats, rolling form, injuries", icon: <BarChart3 className="w-3 h-3" /> },
                  { name: "Player Data", detail: "Rosters, props, performance trends", icon: <Users className="w-3 h-3" /> },
                  { name: "Sharp Money", detail: "Professional betting flow vs. public", icon: <TrendingUp className="w-3 h-3" /> },
                  { name: "Situational", detail: "Rest days, travel, weather, schedule", icon: <Clock className="w-3 h-3" /> },
                ]}
              />

              <PipelineLayer
                step={2}
                icon={<Brain className="w-3 h-3" />}
                label="46-Factor Analysis (Every 5 Minutes)"
                color="text-purple-400"
                borderColor="border-purple-500/25"
                outputLabel="Confidence score, grade (A–F), and expected value per pick"
                nodes={[
                  { name: "Prediction Engine", detail: "46 weighted factors → win probability", icon: <Brain className="w-3 h-3" /> },
                  { name: "Scheme Recognition", detail: "Offensive/defensive tendencies vs. matchup", icon: <Layers className="w-3 h-3" /> },
                  { name: "Monte Carlo Sims", detail: "10,000–100K simulations per matchup", icon: <Sparkles className="w-3 h-3" /> },
                  { name: "Kelly Criterion", detail: "Optimal stake sizing per pick", icon: <Shield className="w-3 h-3" /> },
                  { name: "CLV Analysis", detail: "Closing line value vs. current number", icon: <TrendingUp className="w-3 h-3" /> },
                  { name: "Ensemble Blend", detail: "6 expert models weighted by sport", icon: <Zap className="w-3 h-3" /> },
                ]}
              />

              <PipelineLayer
                step={3}
                icon={<Target className="w-3 h-3" />}
                label="Pick Output (Continuously Updated)"
                color="text-green-400"
                borderColor="border-green-500/25"
                outputLabel="Grade A–F picks released to your tier, auto-built into tickets"
                nodes={[
                  { name: "Ranked Picks", detail: "Confidence-sorted, grade-labeled", icon: <Target className="w-3 h-3" /> },
                  { name: "Smart Tickets", detail: "Auto-assembled daily parlays", icon: <CheckCircle2 className="w-3 h-3" /> },
                  { name: "Daily Edge Parlay", detail: "High-value combo picks (Edge+)", icon: <Sparkles className="w-3 h-3" /> },
                  { name: "Matchup Tickets", detail: "Game-specific correlated leg bundles", icon: <Layers className="w-3 h-3" /> },
                  { name: "Tier Release", detail: "Max → Edge → Sharp, staggered timing", icon: <Clock className="w-3 h-3" /> },
                  { name: "Your Slip", detail: "One click to add any pick or ticket", icon: <CheckCircle2 className="w-3 h-3" /> },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { label: "Tools & Analytics", desc: "Dig deeper into any factor", color: "text-blue-400", href: "/tools" },
                { label: "Live Center", desc: "Track picks as games play out", color: "text-red-400", href: "/live" },
                { label: "Odds Center", desc: "Compare lines across all books", color: "text-amber-400", href: "/odds-center" },
                { label: "Track Record", desc: "Validate the model's edge", color: "text-green-400", href: "/track-record" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg border border-border/50 bg-card/40 p-2.5 hover:bg-card/80 transition-colors"
                >
                  <p className={`text-[11px] font-semibold ${item.color}`}>{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
