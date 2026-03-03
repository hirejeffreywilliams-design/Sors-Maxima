import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Target, Flame, Lock } from "lucide-react";
import { Link } from "wouter";

const DISMISS_KEY = "pick_track_nudge_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

export function PickTrackNudge() {
  const [visible, setVisible] = useState(false);

  const { data: auth } = useQuery<{ authenticated: boolean; tier?: string }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: picksData } = useQuery<{ pending: any[]; settled: any[] }>({
    queryKey: ["/api/user/picks"],
    enabled: auth?.authenticated === true,
  });

  useEffect(() => {
    if (!auth?.authenticated) return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    const total = (picksData?.pending?.length ?? 0) + (picksData?.settled?.length ?? 0);
    if (total >= 10) return;

    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [auth, picksData]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setVisible(false);
  };

  if (!visible) return null;

  const total = (picksData?.pending?.length ?? 0) + (picksData?.settled?.length ?? 0);
  const remaining = Math.max(0, 10 - total);

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-300"
      data-testid="pick-track-nudge"
    >
      <div className="rounded-xl border border-primary/30 bg-background/95 backdrop-blur-sm shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">
              {total === 0
                ? "Start tracking picks to build your edge"
                : `${remaining} more pick${remaining !== 1 ? "s" : ""} to unlock Betting DNA`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Add picks to your slip and we'll automatically settle them when games end.{" "}
              {total < 10 && (
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <Lock className="w-3 h-3" />
                  Track {remaining} more to unlock your Betting DNA report
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (total / 10) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{total}/10</span>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <Link
                href="/"
                className="text-xs font-medium text-primary hover:underline"
                onClick={dismiss}
                data-testid="link-nudge-go-pick"
              >
                View today's picks →
              </Link>
              {total >= 1 && (
                <Link
                  href="/personalized-insights"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={dismiss}
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
    </div>
  );
}
