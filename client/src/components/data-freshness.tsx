import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface DataFreshnessProps {
  lastUpdated?: string | number | Date | null;
  source?: string;
  refreshInterval?: number;
  compact?: boolean;
  className?: string;
  onRefresh?: () => void;
}

function getTimeAgo(date: Date): { text: string; status: "fresh" | "stale" | "warning" } {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 0 || isNaN(seconds)) return { text: "just now", status: "fresh" };
  if (seconds < 60) return { text: `${seconds}s ago`, status: "fresh" };
  if (minutes < 5) return { text: `${minutes}m ago`, status: "fresh" };
  if (minutes < 15) return { text: `${minutes}m ago`, status: "warning" };
  if (minutes < 60) return { text: `${minutes}m ago`, status: "stale" };
  if (hours < 24) return { text: `${hours}h ago`, status: "stale" };
  return { text: `${Math.floor(hours / 24)}d ago`, status: "stale" };
}

const statusConfig = {
  fresh: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", label: "Live" },
  warning: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Recent" },
  stale: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "Stale" },
};

export function DataFreshness({ lastUpdated, source, refreshInterval, compact, className, onRefresh }: DataFreshnessProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), refreshInterval || 10000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (!lastUpdated) return null;

  const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
  if (isNaN(date.getTime())) return null;

  const { text, status } = getTimeAgo(date);
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 text-xs cursor-default ${config.bg} ${className || ""}`}>
            <StatusIcon className={`w-3 h-3 ${config.color}`} />
            {text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {source ? `${source} — ` : ""}Updated {date.toLocaleTimeString()}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className || ""}`}>
      <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
      <span>
        {source && <span className="font-medium">{source}</span>}
        {source && " · "}
        {text}
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface DataFreshnessBarProps {
  sources: { name: string; lastUpdated?: string | number | Date | null }[];
  className?: string;
}

export function DataFreshnessBar({ sources, className }: DataFreshnessBarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const validSources = sources.filter(s => s.lastUpdated);
  if (validSources.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className || ""}`}>
      {validSources.map((src) => {
        const date = src.lastUpdated instanceof Date ? src.lastUpdated : new Date(src.lastUpdated!);
        if (isNaN(date.getTime())) return null;
        const { text, status } = getTimeAgo(date);
        const config = statusConfig[status];
        const StatusIcon = config.icon;

        return (
          <Tooltip key={src.name}>
            <TooltipTrigger asChild>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs cursor-default ${config.bg}`}>
                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                <span className="font-medium">{src.name}</span>
                <span className="text-muted-foreground">{text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Last update: {date.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
