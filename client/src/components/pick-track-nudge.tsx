import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Target, Flame, Lock } from "lucide-react";
import { Link } from "wouter";

const DISMISS_KEY = "pick_track_nudge_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

interface PickTrackNudgeProps {
  variant?: "inline";
}

export function PickTrackNudge({ variant }: PickTrackNudgeProps = {}) {
  const [dismissed, setDismissed] = useState(false);

  const { data: auth } = useQuery<{ authenticated: boolean; tier?: string }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: picksData } = useQuery<{ pending: any[]; settled: any[] }>({
    queryKey: ["/api/user/picks"],
    enabled: auth?.authenticated === true,
  });

  useEffect(() => {
    if (variant === "inline") return;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setDismissed(true);
    }
  }, [variant]);

  if (!auth?.authenticated) return null;

  const total = (picksData?.pending?.length ?? 0) + (picksData?.settled?.length ?? 0);
  const remaining = Math.max(0, 10 - total);

  if (total >= 10) return null;
  if (dismissed) return null;

  const dismiss = () => {
    if (variant === "inline") {
      setDismissed(true);
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
      setDismissed(true);
    }
  };

  if (variant === "inline") {
    return (
      <div
        className="rounded-xl border border-primary/20 bg-primary/5 p-4"
        data-testid="pick-track-nudge-inline"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">
              {total === 0
                ? "Start tracking picks to build your Betting DNA"
                : `${remaining} more pick${remaining !== 1 ? "s" : ""} to unlock your full Betting DNA report`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Add picks to your slip and we'll automatically settle them when games end. Track{" "}
              <span className="text-primary font-medium">{remaining} more</span> to unlock personalized analytics.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (total / 10) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums font-medium">{total}/10</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Link
                href="/"
                className="text-xs font-medium text-primary hover:underline"
                data-testid="link-nudge-go-pick"
              >
                View today's picks →
              </Link>
              {total >= 1 && (
                <Link
                  href="/personalized-insights"
                  className="text-xs text-muted-foreground hover:underline"
                  data-testid="link-nudge-insights"
                >
                  <Flame className="w-3 h-3 inline mr-0.5 text-orange-400" />
                  My insights
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-nudge-dismiss"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
