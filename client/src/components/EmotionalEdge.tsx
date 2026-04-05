import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Activity,
  AlertTriangle,
  Shield,
  TrendingUp,
  Timer,
  Sparkles,
  Heart,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type EmotionalState =
  | "euphoria" | "anxiety" | "confidence" | "frustration" | "calm"
  | "excitement" | "fear" | "hope" | "anger" | "relief"
  | "desperation" | "boredom" | "greed" | "regret" | "focus"
  | "impulsiveness" | "resignation" | "vindictiveness" | "gratitude" | "apathy";

interface EmotionBias {
  emotion: EmotionalState;
  bias: string;
  riskAdjustment: number;
  clarityPenalty: number;
  recommendation: string;
}

interface DecisionClarityScore {
  score: number;
  predictionConfidence: number;
  emotionalStability: number;
  adjustedConfidence: number;
  warnings: string[];
  recommendation: "proceed" | "caution" | "wait";
}

interface EmotionalAssessment {
  currentEmotion: EmotionalState;
  intensity: number;
  bias: EmotionBias;
  clarityScore: DecisionClarityScore;
  coolDownActive: boolean;
  coolDownExpiresAt: string | null;
}

interface CorrelationEntry {
  emotion: EmotionalState;
  totalPredictions: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMOTION_LABELS: Record<EmotionalState, string> = {
  euphoria: "Euphoria", anxiety: "Anxiety", confidence: "Confidence",
  frustration: "Frustration", calm: "Calm", excitement: "Excitement",
  fear: "Fear", hope: "Hope", anger: "Anger", relief: "Relief",
  desperation: "Desperation", boredom: "Boredom", greed: "Greed",
  regret: "Regret", focus: "Focus", impulsiveness: "Impulsiveness",
  resignation: "Resignation", vindictiveness: "Vindictiveness",
  gratitude: "Gratitude", apathy: "Apathy",
};

function getClarityColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 45) return "text-yellow-400";
  return "text-red-400";
}

function getRecommendationBadge(rec: "proceed" | "caution" | "wait") {
  switch (rec) {
    case "proceed":
      return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Proceed</Badge>;
    case "caution":
      return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Caution</Badge>;
    case "wait":
      return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Wait</Badge>;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ClarityScoreDisplay({ clarity }: { clarity: DecisionClarityScore }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Decision Clarity</span>
        <span className={`text-2xl font-bold ${getClarityColor(clarity.score)}`}>
          {clarity.score}
        </span>
      </div>
      <Progress value={clarity.score} className="h-3" />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-muted-foreground">Confidence</div>
          <div className="font-semibold">{clarity.predictionConfidence}%</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Stability</div>
          <div className="font-semibold">{clarity.emotionalStability}%</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Adjusted</div>
          <div className="font-semibold">{clarity.adjustedConfidence}%</div>
        </div>
      </div>
      <div className="flex justify-center">{getRecommendationBadge(clarity.recommendation)}</div>
    </div>
  );
}

function WarningBanners({ warnings, coolDownActive, coolDownExpiresAt }: {
  warnings: string[];
  coolDownActive: boolean;
  coolDownExpiresAt: string | null;
}) {
  if (warnings.length === 0 && !coolDownActive) return null;

  return (
    <div className="space-y-2">
      {coolDownActive && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-600/10 border border-red-600/20">
          <Timer className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-400">
            Cool-down active{coolDownExpiresAt
              ? ` — expires ${new Date(coolDownExpiresAt).toLocaleTimeString()}`
              : ""}
          </span>
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-yellow-600/10 border border-yellow-600/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-sm text-yellow-400">{w}</span>
        </div>
      ))}
    </div>
  );
}

function EmotionSelector({ onSelect }: { onSelect: (e: EmotionalState, i: number) => void }) {
  const [selected, setSelected] = useState<EmotionalState | null>(null);
  const [intensity, setIntensity] = useState(0.5);
  const emotions = Object.keys(EMOTION_LABELS) as EmotionalState[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {emotions.map((emotion) => (
          <button
            key={emotion}
            onClick={() => setSelected(emotion)}
            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
              selected === emotion
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/50 text-muted-foreground"
            }`}
          >
            {EMOTION_LABELS[emotion]}
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Intensity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs font-mono w-8">{Math.round(intensity * 100)}%</span>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => onSelect(selected, intensity)}
          >
            <Heart className="w-3 h-3 mr-1" /> Record {EMOTION_LABELS[selected]}
          </Button>
        </div>
      )}
    </div>
  );
}

function CorrelationTable({ data }: { data: CorrelationEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No correlation data yet. Keep making predictions!</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left text-muted-foreground">Emotion</th>
            <th className="py-2 text-right text-muted-foreground">Bets</th>
            <th className="py-2 text-right text-muted-foreground">Win %</th>
            <th className="py-2 text-right text-muted-foreground">Avg Conf</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.emotion} className="border-b border-border/50">
              <td className="py-1.5 capitalize">{row.emotion}</td>
              <td className="py-1.5 text-right">{row.totalPredictions}</td>
              <td className="py-1.5 text-right">
                <span className={row.winRate >= 0.5 ? "text-green-400" : "text-red-400"}>
                  {Math.round(row.winRate * 100)}%
                </span>
              </td>
              <td className="py-1.5 text-right">{row.avgConfidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EmotionalEdge() {
  const queryClient = useQueryClient();

  const { data: assessment, isLoading } = useQuery<EmotionalAssessment>({
    queryKey: ["/api/emotional-edge/status"],
    refetchInterval: 60_000,
  });

  const { data: correlationData } = useQuery<{ correlations: CorrelationEntry[] }>({
    queryKey: ["/api/emotional-edge/correlation"],
  });

  const snapshotMutation = useMutation({
    mutationFn: async ({ emotion, intensity }: { emotion: EmotionalState; intensity: number }) => {
      const res = await apiRequest("POST", "/api/emotional-edge/snapshot", { emotion, intensity, source: "manual" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emotional-edge/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emotional-edge/correlation"] });
    },
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Activity className="w-5 h-5 animate-pulse text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clarity Score + Current State */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-4 h-4 text-purple-400" />
            Emotional Edge
            {assessment && (
              <Badge variant="outline" className="ml-auto capitalize">
                {assessment.currentEmotion}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment && (
            <>
              <ClarityScoreDisplay clarity={assessment.clarityScore} />
              <WarningBanners
                warnings={assessment.clarityScore.warnings}
                coolDownActive={assessment.coolDownActive}
                coolDownExpiresAt={assessment.coolDownExpiresAt}
              />
              {assessment.bias && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{assessment.bias.recommendation}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Emotion */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-amber-400" />
            How are you feeling?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmotionSelector
            onSelect={(emotion, intensity) => snapshotMutation.mutate({ emotion, intensity })}
          />
          {snapshotMutation.isError && (
            <p className="text-xs text-red-400 mt-2">Failed to record. Please try again.</p>
          )}
        </CardContent>
      </Card>

      {/* Correlation History */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Emotion vs. Outcome History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CorrelationTable data={correlationData?.correlations ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
