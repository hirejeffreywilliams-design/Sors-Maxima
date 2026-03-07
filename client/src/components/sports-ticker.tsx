import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

interface TickerItem {
  id: string;
  type: "live" | "final" | "upcoming" | "pick" | "model" | "sharp" | string;
  badge: string;
  badgeColor: "red" | "gray" | "blue" | "green" | "purple" | "orange" | "yellow" | string;
  text: string;
  sport: string;
  priority: number;
}

interface TickerResponse {
  items: TickerItem[];
  generatedAt: string;
  gameCount: number;
}

const BADGE_STYLES: Record<string, string> = {
  red:    "bg-red-600 text-white animate-pulse",
  gray:   "bg-zinc-600 text-zinc-100",
  blue:   "bg-blue-600 text-white",
  green:  "bg-emerald-600 text-white",
  purple: "bg-violet-600 text-white",
  orange: "bg-orange-500 text-white",
  yellow: "bg-amber-500 text-black",
};

const FALLBACK_ITEMS: TickerItem[] = [
  { id: "f1", type: "model",    badge: "MODEL",    badgeColor: "purple", text: "46-Factor Intelligence Engine  |  Loading live sports data...", sport: "ALL", priority: 4 },
  { id: "f2", type: "upcoming", badge: "UPCOMING", badgeColor: "blue",   text: "NBA  •  NHL  •  NCAAB  •  NFL  •  MLB  —  Today's schedule loading...", sport: "ALL", priority: 2 },
  { id: "f3", type: "pick",     badge: "PICK",     badgeColor: "green", text: "Sors Maxima  |  Real-time picks, scores, and sharp money alerts", sport: "ALL", priority: 3 },
];

function TickerBadge({ badge, color }: { badge: string; color: string }) {
  const cls = BADGE_STYLES[color] || "bg-zinc-700 text-white";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest shrink-0 ${cls}`}>
      {badge}
    </span>
  );
}

function TickerContent({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-0 whitespace-nowrap">
      {doubled.map((item, i) => (
        <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 px-5">
          <TickerBadge badge={item.badge} color={item.badgeColor} />
          <span className="text-[11px] font-medium text-foreground/85 tracking-wide">
            {item.text}
          </span>
          <span className="text-border/60 text-[10px] px-1 select-none">◆</span>
        </span>
      ))}
    </div>
  );
}

export function SportsTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { data, isLoading } = useQuery<TickerResponse>({
    queryKey: ["/api/ticker"],
    refetchInterval: 45000,
    staleTime: 30000,
    retry: 1,
  });

  const items = (!isLoading && data?.items?.length) ? data.items : FALLBACK_ITEMS;
  const liveCount = items.filter(i => i.type === "live").length;

  if (!isVisible) return null;

  return (
    <div
      className="relative w-full bg-zinc-950/95 dark:bg-zinc-950 border-b border-border/30"
      style={{ height: "28px" }}
      data-testid="sports-ticker"
    >
      <div className="absolute inset-0 flex items-center overflow-hidden">

        {/* Left label */}
        <div className="shrink-0 flex items-center gap-2 px-3 border-r border-border/30 bg-zinc-950 h-full z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-black tracking-[0.15em] text-zinc-400 uppercase hidden sm:block">
              Live
            </span>
          </div>
          {liveCount > 0 && (
            <span className="text-[9px] font-bold text-red-500 hidden sm:block">
              {liveCount}
            </span>
          )}
        </div>

        {/* Scrolling content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden h-full flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex items-center"
            style={{
              animation: isPaused ? "none" : "ticker-scroll 60s linear infinite",
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            <TickerContent items={items} />
          </div>
        </div>

        {/* Right dismiss */}
        <button
          onClick={() => setIsVisible(false)}
          className="shrink-0 flex items-center justify-center w-7 h-full border-l border-border/30 text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-950 z-10"
          data-testid="button-close-ticker"
          title="Hide ticker"
        >
          <span className="text-[10px] font-bold">✕</span>
        </button>
      </div>
    </div>
  );
}
