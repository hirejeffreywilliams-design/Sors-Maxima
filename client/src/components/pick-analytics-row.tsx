import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

export function getCalibrationTier(confidence: number, ev: number): { label: string; cls: string; tooltip: string } {
  if (confidence >= 78 && ev < 4) return { label: "Over-confident", cls: "border-amber-500/50 text-amber-400", tooltip: "High confidence relative to edge. Historically over-estimates win probability." };
  if (confidence >= 65 && ev >= 4) return { label: "Well-calibrated", cls: "border-emerald-500/50 text-emerald-400", tooltip: "Confidence aligns well with edge. Historically delivers close to predicted win rates." };
  if (confidence < 65 && ev >= 8) return { label: "Undervalued", cls: "border-sky-500/50 text-sky-400", tooltip: "Conservative model but sees strong edge. Often outperforms confidence rating." };
  if (ev < 0) return { label: "Risky", cls: "border-red-500/50 text-red-400", tooltip: "Negative expected value — market has priced this bet against a positive outcome." };
  return { label: "Developing", cls: "border-muted-foreground/30 text-muted-foreground", tooltip: "Insufficient signal history in this confidence bucket." };
}

export function computeKellyPct(ev: number, confidence: number, userKellyFraction = 0.25): number {
  return Math.max(0, (ev / 100) * (confidence / 100) * 100 * userKellyFraction * 4);
}

interface BettingProfile { kellyFraction: number; }

interface PickAnalyticsRowProps {
  confidence: number;
  ev: number;
  pickId?: string | number;
  modelAgreement?: number;
  size?: "xs" | "sm";
}

export function PickAnalyticsRow({ confidence, ev, pickId, modelAgreement, size = "sm" }: PickAnalyticsRowProps) {
  const { data: profile } = useQuery<BettingProfile>({ queryKey: ["/api/settings/bankroll"], staleTime: 5 * 60_000 });
  const userKellyFraction = profile?.kellyFraction ?? 0.25;
  const calTier = getCalibrationTier(confidence, ev);
  const kellyPct = computeKellyPct(ev, confidence, userKellyFraction);
  const idStr = pickId != null ? String(pickId) : "";

  return (
    <div className="space-y-1">
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
          <TooltipContent side="top" className="max-w-[220px] text-center">
            <p className="text-xs">Fractional Kelly stake ({Math.round(userKellyFraction * 100)}% Kelly) — recommended % of bankroll based on your risk profile, EV, and model confidence.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {modelAgreement != null && (
        <div className="flex items-center gap-1" data-testid={idStr ? `stat-model-agreement-${idStr}` : "stat-model-agreement"}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= modelAgreement ? "bg-primary" : "bg-muted"}`} />
          ))}
          <span className={`${size === "xs" ? "text-[8px]" : "text-[9px]"} text-muted-foreground ml-0.5`}>{modelAgreement}/5 models</span>
        </div>
      )}
    </div>
  );
}
