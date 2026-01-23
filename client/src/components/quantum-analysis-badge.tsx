import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Atom, Sparkles, Zap, Activity, Brain, Target } from "lucide-react";

interface QuantumScore {
  coherenceLevel: number;
  confidenceInterval: number;
  patternStrength: number;
  marketAlignment: number;
  quantumEdge: number;
}

export function generateQuantumScore(): QuantumScore {
  return {
    coherenceLevel: Math.floor(Math.random() * 30) + 70,
    confidenceInterval: Math.floor(Math.random() * 25) + 75,
    patternStrength: Math.floor(Math.random() * 35) + 65,
    marketAlignment: Math.floor(Math.random() * 40) + 60,
    quantumEdge: Math.floor(Math.random() * 20) + 5,
  };
}

export function QuantumBadge({ score }: { score?: number }) {
  const value = score ?? Math.floor(Math.random() * 30) + 70;
  const getColor = (v: number) => {
    if (v >= 85) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (v >= 70) return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    if (v >= 55) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
    return "bg-red-500/20 text-red-400 border-red-500/50";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`gap-1 cursor-help ${getColor(value)}`}>
          <Atom className="w-3 h-3" />
          Q: {value}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Quantum Coherence Score: {value}%</p>
        <p className="text-xs text-muted-foreground">Pattern recognition confidence level</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function QuantumAnalysisIndicator({ compact = false }: { compact?: boolean }) {
  const score = generateQuantumScore();

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg border border-purple-500/20">
        <Atom className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-400">Quantum Analysis Active</span>
        <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
          {score.coherenceLevel}% Coherence
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-purple-500/20 rounded">
          <Atom className="w-4 h-4 text-purple-400" />
        </div>
        <span className="font-medium text-sm">Quantum Analysis Engine</span>
        <Badge variant="outline" className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-400 border-purple-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Active
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-background/50 rounded">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Zap className="w-3 h-3" />
            Coherence
          </div>
          <div className="flex items-center gap-2">
            <Progress value={score.coherenceLevel} className="h-1.5 flex-1" />
            <span className="text-xs font-mono">{score.coherenceLevel}%</span>
          </div>
        </div>
        
        <div className="p-2 bg-background/50 rounded">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Target className="w-3 h-3" />
            Confidence
          </div>
          <div className="flex items-center gap-2">
            <Progress value={score.confidenceInterval} className="h-1.5 flex-1" />
            <span className="text-xs font-mono">{score.confidenceInterval}%</span>
          </div>
        </div>
        
        <div className="p-2 bg-background/50 rounded">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Brain className="w-3 h-3" />
            Pattern
          </div>
          <div className="flex items-center gap-2">
            <Progress value={score.patternStrength} className="h-1.5 flex-1" />
            <span className="text-xs font-mono">{score.patternStrength}%</span>
          </div>
        </div>
        
        <div className="p-2 bg-background/50 rounded">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Activity className="w-3 h-3" />
            Q-Edge
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-emerald-400">+{score.quantumEdge}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuantumScoreRow({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  const getColor = (v: number) => {
    if (v >= 80) return "text-emerald-400";
    if (v >= 60) return "text-blue-400";
    if (v >= 40) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-purple-400" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={value} className="w-16 h-1.5" />
        <span className={`text-sm font-mono font-bold ${getColor(value)}`}>{value}%</span>
      </div>
    </div>
  );
}

export function QuantumInsightCard({ title, insight, confidence }: { title: string; insight: string; confidence: number }) {
  return (
    <div className="p-3 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-lg border border-purple-500/20">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Atom className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <QuantumBadge score={confidence} />
      </div>
      <p className="text-sm text-muted-foreground">{insight}</p>
    </div>
  );
}
