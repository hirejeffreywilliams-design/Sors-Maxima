import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

export type ConfidenceTier = "LOCK" | "STRONG" | "LEAN" | "FADE";
export type BetAction = "BET" | "WATCH" | "PASS";

export interface AIPickBadgeData {
  tier: ConfidenceTier;
  edge: number;
  action: BetAction;
  reasoning: string;
}

const TIER_CONFIG: Record<ConfidenceTier, { label: string; className: string; icon: typeof TrendingUp }> = {
  LOCK: {
    label: "LOCK",
    className: "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400",
    icon: TrendingUp,
  },
  STRONG: {
    label: "STRONG",
    className: "bg-blue-500/15 border-blue-500/40 text-blue-500 dark:text-blue-400",
    icon: TrendingUp,
  },
  LEAN: {
    label: "LEAN",
    className: "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400",
    icon: Minus,
  },
  FADE: {
    label: "FADE",
    className: "bg-red-500/15 border-red-500/40 text-red-500 dark:text-red-400",
    icon: TrendingDown,
  },
};

const ACTION_CONFIG: Record<BetAction, { className: string }> = {
  BET: { className: "text-emerald-600 dark:text-emerald-400 font-bold" },
  WATCH: { className: "text-amber-600 dark:text-amber-400 font-bold" },
  PASS: { className: "text-muted-foreground font-medium" },
};

/**
 * Maps the engine's recommendation string (strong_bet / moderate_bet / lean_bet / avoid / fade)
 * to a ConfidenceTier. Thresholds match server/precomputedPredictionsEngine.ts exactly:
 *   LOCK    → confidence ≥ 75
 *   STRONG  → confidence ≥ 65
 *   LEAN    → confidence ≥ 55
 *   FADE    → below 55 or explicit fade
 */
function recommendationToTier(recommendation: string): ConfidenceTier {
  switch (recommendation) {
    case "strong_bet": return "LOCK";
    case "moderate_bet": return "STRONG";
    case "lean_bet": return "LEAN";
    case "fade": return "FADE";
    default: return "LEAN";
  }
}

function recommendationToAction(recommendation: string): BetAction {
  switch (recommendation) {
    case "strong_bet":
    case "moderate_bet": return "BET";
    case "lean_bet": return "WATCH";
    default: return "PASS";
  }
}

/**
 * Derives an AIPickBadgeData from either:
 *   (a) an engine recommendation string + edge%, when pick data is available, or
 *   (b) a raw confidence number + edge% using the same thresholds as the precomputed engine.
 *
 * Confidence thresholds match server/precomputedPredictionsEngine.ts:
 *   LOCK ≥ 75, STRONG ≥ 65, LEAN ≥ 55, FADE < 55
 *
 * @param confidence  Numeric confidence 0–100 from the engine (or derived from EV)
 * @param edge        Edge percentage (positive = value, negative = fade)
 * @param reasoning   Optional reasoning sentence from signalTranslationLayer
 * @param recommendation  Optional engine recommendation string (strong_bet, lean_bet, etc.)
 */
export function deriveAIBadge(
  confidence: number,
  edge: number,
  reasoning?: string,
  recommendation?: string
): AIPickBadgeData {
  let tier: ConfidenceTier;
  let action: BetAction;

  if (recommendation) {
    tier = recommendationToTier(recommendation);
    action = recommendationToAction(recommendation);
  } else {
    tier =
      confidence >= 75 ? "LOCK"
      : confidence >= 65 ? "STRONG"
      : confidence >= 55 ? "LEAN"
      : "FADE";
    action =
      confidence >= 65 && edge > 0 ? "BET"
      : confidence >= 55 ? "WATCH"
      : "PASS";
  }

  const absEdge = Math.abs(edge).toFixed(1);
  const defaultReasoning =
    tier === "LOCK"
      ? `High-confidence +${absEdge}% edge — 46-factor model strongly favors this side.`
      : tier === "STRONG"
      ? `Solid +${absEdge}% edge — multiple signals align across sharp money, model agreement, and matchup data.`
      : tier === "LEAN"
      ? `Slight lean with ${absEdge}% edge — worth watching but not a top play. Model signals are mixed.`
      : `Model flags this side as a fade — implied probability exceeds true probability by ${absEdge}%.`;

  return { tier, edge, action, reasoning: reasoning || defaultReasoning };
}

/**
 * Converts a raw EV fraction (e.g. 0.08 = 8%) to a confidence value in the engine's 0–100 scale.
 * Calibrated so: EV ≥ 0.25 → LOCK (≥75), EV ≥ 0.15 → STRONG (≥65), EV ≥ 0.05 → LEAN (≥55)
 */
export function evToConfidence(ev: number): number {
  return Math.min(95, Math.max(30, 52 + ev * 200));
}

interface AIPickBadgeProps {
  badge: AIPickBadgeData;
  compact?: boolean;
  testId?: string;
}

export function AIPickBadge({ badge, compact = false, testId }: AIPickBadgeProps) {
  const [open, setOpen] = useState(false);
  const tierCfg = TIER_CONFIG[badge.tier];
  const actionCfg = ACTION_CONFIG[badge.action];
  const TierIcon = tierCfg.icon;

  const edgeSign = badge.edge >= 0 ? "+" : "";
  const edgeStr = `${edgeSign}${badge.edge.toFixed(1)}%`;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold cursor-help select-none transition-all hover:opacity-90 ${tierCfg.className}`}
          onClick={() => setOpen(v => !v)}
          data-testid={testId || "ai-pick-badge"}
          aria-label={`AI: ${badge.tier} — ${badge.action} — Edge ${edgeStr}`}
        >
          <Brain className="w-2.5 h-2.5 shrink-0" />
          {!compact && <TierIcon className="w-2.5 h-2.5 shrink-0" />}
          <span>{badge.tier}</span>
          <span className="opacity-60">·</span>
          <span className={actionCfg.className}>{badge.action}</span>
          {!compact && (
            <>
              <span className="opacity-60">·</span>
              <span className="font-mono">{edgeStr}</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <Brain className="w-3 h-3" />
            AI Analysis — {badge.tier}
          </div>
          <p className="text-muted-foreground">{badge.reasoning}</p>
          <div className="flex items-center gap-2 text-[10px] pt-0.5 border-t border-border/50">
            <span>Edge: <span className={badge.edge > 0 ? "text-emerald-500" : "text-red-400"}>{edgeStr}</span></span>
            <span>·</span>
            <span className={actionCfg.className}>{badge.action}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
