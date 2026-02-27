import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, ExternalLink, CheckCircle } from "lucide-react";
import { Link } from "wouter";

interface TrackRecord {
  settledPicks: number;
  wonPicks: number;
  lostPicks: number;
  overallWinRate: number | null;
  hasMinimumData: boolean;
  minimumPicksRequired: number;
  picksUntilValidated: number;
  calibrationScore: number | null;
}

interface PickDisclaimerProps {
  variant?: "banner" | "inline" | "compact";
}

export function PickDisclaimer({ variant = "inline" }: PickDisclaimerProps) {
  const { data } = useQuery<TrackRecord>({
    queryKey: ["/api/track-record"],
    staleTime: 5 * 60 * 1000,
  });

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
        <span>Model estimates only. </span>
        <Link href="/track-record" className="text-primary hover:underline flex items-center gap-0.5">
          See real accuracy <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-yellow-400">For Entertainment & Analysis Only</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Picks are AI model estimates, not guarantees. Never bet more than you can afford to lose.{" "}
            <Link href="/track-record" className="text-primary hover:underline">
              View real track record →
            </Link>
          </p>
          {data && (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.hasMinimumData && data.overallWinRate !== null ? (
                <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                  <CheckCircle className="inline h-2.5 w-2.5 mr-1" />
                  Verified {data.overallWinRate.toFixed(1)}% win rate ({data.wonPicks}W-{data.lostPicks}L)
                </span>
              ) : (
                <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
                  <Info className="inline h-2.5 w-2.5 mr-1" />
                  Track record: {data.settledPicks}/{data.minimumPicksRequired} picks settled
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md p-2.5">
      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span>
          AI model estimates — not financial advice. Never risk money you cannot afford to lose.
        </span>{" "}
        {data && !data.hasMinimumData ? (
          <span className="text-blue-400">
            Track record building: {data.settledPicks}/{data.minimumPicksRequired} picks verified.{" "}
          </span>
        ) : data?.overallWinRate !== null && data?.hasMinimumData ? (
          <span className="text-green-400">
            Verified win rate: {data?.overallWinRate?.toFixed(1)}% ({data?.wonPicks}W–{data?.lostPicks}L).{" "}
          </span>
        ) : null}
        <Link href="/track-record" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Full transparency report <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

export function CalibrationBadge({ confidence }: { confidence: number }) {
  const { data } = useQuery<TrackRecord>({
    queryKey: ["/api/track-record"],
    staleTime: 5 * 60 * 1000,
  });

  if (!data || !data.hasMinimumData) {
    return (
      <span className="text-xs text-muted-foreground" title="Model estimate — not yet verified by real outcomes">
        ~{confidence}% <span className="text-yellow-500 text-[10px]">(est.)</span>
      </span>
    );
  }

  return (
    <span className="text-xs" title={`Verified: ${data.overallWinRate?.toFixed(1)}% actual win rate`}>
      {confidence}% <span className="text-green-500 text-[10px]">(✓)</span>
    </span>
  );
}
