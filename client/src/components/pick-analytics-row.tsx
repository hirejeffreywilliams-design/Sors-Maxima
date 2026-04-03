import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function getCalibrationTier(confidence: number, ev: number): { label: string; cls: string; tooltip: string } {
  if (confidence >= 78 && ev < 4) return { label: "Over-confident", cls: "border-amber-500/50 text-amber-400", tooltip: "High confidence relative to edge. Historically over-estimates win probability." };
  if (confidence >= 65 && ev >= 4) return { label: "Well-calibrated", cls: "border-emerald-500/50 text-emerald-400", tooltip: "Confidence aligns well with edge. Historically delivers close to predicted win rates." };
  if (confidence < 65 && ev >= 8) return { label: "Undervalued", cls: "border-sky-500/50 text-sky-400", tooltip: "Conservative model but sees strong edge. Often outperforms confidence rating." };
  if (ev < 0) return { label: "Risky", cls: "border-red-500/50 text-red-400", tooltip: "Negative expected value — market has priced this bet against a positive outcome." };
  return { label: "Developing", cls: "border-muted-foreground/30 text-muted-foreground", tooltip: "Insufficient signal history in this confidence bucket." };
}

export function computeKellyPct(ev: number, confidence: number): number {
  return Math.max(0, (ev / 100) * (confidence / 100) * 100);
}

interface PickAnalyticsRowProps {
  confidence: number;
  ev: number;
  pickId?: string | number;
  size?: "xs" | "sm";
}

export function PickAnalyticsRow({ confidence, ev, pickId, size = "sm" }: PickAnalyticsRowProps) {
  const calTier = getCalibrationTier(confidence, ev);
  const kellyPct = computeKellyPct(ev, confidence);
  const idStr = pickId != null ? String(pickId) : "";

  return (
    <div className="flex items-center justify-between gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${size === "xs" ? "text-[8px] h-3.5 px-1" : "text-[9px] h-4 px-1.5"} py-0 border font-medium cursor-help ${calTier.cls}`}
            data-testid={idStr ? `badge-cal-tier-${idStr}` : "badge-cal-tier"}
          >
            {calTier.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <p className="text-xs">{calTier.tooltip}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${size === "xs" ? "text-[8px]" : "text-[9px]"} font-mono text-sky-400 cursor-help`}
            data-testid={idStr ? `stat-kelly-pct-${idStr}` : "stat-kelly-pct"}
          >
            Kelly {kellyPct.toFixed(1)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="text-xs">Fractional Kelly stake — recommended % of bankroll based on edge and confidence.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
