import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, Zap, ChevronRight, Lock, TrendingUp } from "lucide-react";

interface RecommendationContext {
  page: string;
  sport?: string;
  gameId?: string;
}

interface Recommendation {
  headline: string;
  confidence: number;
  tier: "LOCK" | "STRONG" | "LEAN" | "VALUE";
  action: string;
  deepLinkContext?: {
    page?: string;
    sport?: string;
    pick?: string;
    game?: string;
    context?: string;
  };
  fromCache?: boolean;
}

interface AIRecommendationPanelProps {
  context: RecommendationContext;
  onOpenCompanion?: (context: string) => void;
  compact?: boolean;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; icon: typeof Zap }> = {
  LOCK: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: Lock,
  },
  STRONG: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: Zap,
  },
  LEAN: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: TrendingUp,
  },
  VALUE: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    icon: Brain,
  },
};

function ConfidencePill({ tier, confidence }: { tier: string; confidence: number }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.VALUE;
  const TierIcon = style.icon;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold h-5 px-1.5 gap-0.5 ${style.bg} ${style.border} ${style.text}`}
      data-testid="ai-panel-tier-badge"
    >
      <TierIcon className="w-2.5 h-2.5" />
      {tier} · {confidence}%
    </Badge>
  );
}

export function AIRecommendationPanel({
  context,
  onOpenCompanion,
  compact = false,
}: AIRecommendationPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const params = new URLSearchParams({ page: context.page });
  if (context.sport) params.set("sport", context.sport);
  if (context.gameId) params.set("gameId", context.gameId);

  const { data, isLoading, isError } = useQuery<Recommendation>({
    queryKey: ["/api/ai/recommendation", context.page, context.sport, context.gameId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/ai/recommendation?${params}`);
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limited");
        throw new Error("Failed to fetch recommendation");
      }
      return res.json();
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleAskSors = useCallback(() => {
    if (onOpenCompanion && data) {
      const ctx = data.deepLinkContext;
      const message = ctx?.game
        ? `Tell me more about ${ctx.game} — the AI flagged: "${data.headline}". ${data.action}`
        : `${data.headline}. ${data.action}`;
      onOpenCompanion(message);
    }
  }, [onOpenCompanion, data]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-transparent p-3 space-y-2"
        data-testid="ai-panel-loading"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary/20 animate-pulse" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const tierStyle = TIER_STYLES[data.tier] || TIER_STYLES.VALUE;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${tierStyle.bg} ${tierStyle.border}`}
        data-testid="ai-panel-compact"
      >
        <Brain className={`w-4 h-4 shrink-0 ${tierStyle.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${tierStyle.text}`}>{data.headline}</p>
          <p className="text-[10px] text-muted-foreground truncate">{data.action}</p>
        </div>
        <ConfidencePill tier={data.tier} confidence={data.confidence} />
        {onOpenCompanion && (
          <button
            onClick={handleAskSors}
            className="shrink-0 text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            data-testid="ai-panel-ask-sors-compact"
          >
            Ask Sors <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-transparent p-4 space-y-3"
      data-testid="ai-panel-full"
      style={{ background: "linear-gradient(135deg, rgba(240,83,43,0.06) 0%, transparent 100%)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
          >
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
              AI Insight
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ConfidencePill tier={data.tier} confidence={data.confidence} />
          <button
            onClick={handleRefresh}
            className="p-1 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh insight"
            data-testid="ai-panel-refresh"
            aria-label="Refresh AI insight"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug" data-testid="ai-panel-headline">
          {data.headline}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="ai-panel-action">
          {data.action}
        </p>
      </div>

      {onOpenCompanion && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAskSors}
          className="h-7 text-[11px] gap-1.5 border-primary/25 hover:border-primary/50 hover:bg-primary/8"
          data-testid="ai-panel-ask-sors"
        >
          <Zap className="w-3 h-3 text-primary" />
          Ask Sors
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
