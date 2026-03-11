import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, Zap, Trophy, AlertTriangle, TrendingUp, Calendar, Radio, Star, ChevronDown } from "lucide-react";
import { useParlaySlip } from "@/hooks/use-parlay-slip";

interface TickerItem {
  id: string;
  type: "live" | "final" | "upcoming" | "pick" | "model" | "sharp" | "injury" | "my_pick" | "my_win" | "my_loss" | "my_parlay" | string;
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

interface MyPicksResponse {
  items: TickerItem[];
}

const BADGE_STYLES: Record<string, string> = {
  red:    "bg-red-600 text-white",
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
  { id: "f3", type: "pick",     badge: "PICK",     badgeColor: "green",  text: "Sors Maxima  |  Real-time picks, scores, and sharp money alerts", sport: "ALL", priority: 3 },
];

const ALL_SPORTS = ["NBA", "NHL", "NFL", "MLB", "NCAAB", "SOCCER", "MMA"];

const CONTENT_TYPES = [
  { id: "live",     label: "Live Games",    color: "text-red-400" },
  { id: "final",    label: "Final Scores",  color: "text-zinc-400" },
  { id: "upcoming", label: "Upcoming",      color: "text-blue-400" },
  { id: "pick",     label: "AI Picks",      color: "text-emerald-400" },
  { id: "sharp",    label: "Sharp Money",   color: "text-violet-400" },
  { id: "injury",   label: "Injuries",      color: "text-orange-400" },
  { id: "my_pick",  label: "My Picks",      color: "text-yellow-400" },
];

const CONTENT_TYPE_IDS = CONTENT_TYPES.map(t => t.id);

const SPORT_STORAGE_KEY   = "sors_ticker_sports";
const SPEED_STORAGE_KEY   = "sors_ticker_speed";
const TYPES_STORAGE_KEY   = "sors_ticker_types";

type TickerSpeed = "slow" | "normal" | "fast";
const SPEED_LABELS: Record<TickerSpeed, string>   = { slow: "1×", normal: "2×", fast: "4×" };
const SPEED_NEXT: Record<TickerSpeed, TickerSpeed> = { slow: "normal", normal: "fast", fast: "slow" };
const SPEED_DIVISORS: Record<TickerSpeed, number>  = { slow: 0.55, normal: 1, fast: 2.5 };

// ── Type icon + color ──────────────────────────────────────────────────────
function getTypeStyle(type: string): { dot: string; textClass: string } {
  switch (type) {
    case "live":
      return { dot: "bg-red-500 animate-pulse", textClass: "text-red-100" };
    case "final":
      return { dot: "bg-zinc-500", textClass: "text-zinc-300" };
    case "upcoming":
    case "today":
      return { dot: "bg-blue-500", textClass: "text-blue-100" };
    case "sharp":
      return { dot: "bg-violet-500", textClass: "text-violet-100" };
    case "injury":
      return { dot: "bg-orange-500", textClass: "text-orange-100" };
    case "pick":
    case "model":
      return { dot: "bg-emerald-500", textClass: "text-emerald-100" };
    case "my_pick":
    case "my_win":
    case "my_parlay":
      return { dot: "bg-yellow-400", textClass: "text-yellow-200" };
    case "my_loss":
      return { dot: "bg-red-400", textClass: "text-red-200" };
    default:
      return { dot: "bg-zinc-600", textClass: "text-zinc-200" };
  }
}

// Parse "live" text to extract and bold the score portion
function LiveScoreText({ text }: { text: string }) {
  // Format: "NBA  PHI 82  –  98 CLE  8:09 - 4th  ·  CLE +16"
  const parts = text.split("  –  ");
  if (parts.length !== 2) {
    return <span className="text-[11px] font-medium tracking-wide text-red-100">{text}</span>;
  }
  const leftParts = parts[0].split("  ");
  const tag = leftParts[0];
  const awayInfo = leftParts.slice(1).join(" "); // e.g. "PHI 82"
  const rightSplit = parts[1].split("  ");
  const homeScore = rightSplit[0]; // e.g. "98 CLE"
  const rest = rightSplit.slice(1).join("  "); // e.g. "8:09 - 4th  ·  CLE +16"
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] tracking-wide text-red-100">
      <span className="text-[9px] font-black text-red-400/80 tracking-widest">{tag}</span>
      <span className="font-black text-white">{awayInfo}</span>
      <span className="text-red-400/60">–</span>
      <span className="font-black text-white">{homeScore}</span>
      {rest && <span className="text-[10px] text-red-200/70 font-medium">{rest}</span>}
    </span>
  );
}

function TickerItemDisplay({ item }: { item: TickerItem }) {
  const { dot, textClass } = getTypeStyle(item.type);
  const isLive = item.type === "live";
  const isMyPick = item.type === "my_pick" || item.type === "my_win" || item.type === "my_parlay";
  const isSharp = item.type === "sharp";
  const isFinal = item.type === "final";

  return (
    <span className="inline-flex items-center gap-2 px-4">
      {/* Type dot indicator */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />

      {/* Badge */}
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest shrink-0 ${BADGE_STYLES[item.badgeColor] || "bg-zinc-700 text-white"}`}>
        {item.badge}
      </span>

      {/* Content — specialized rendering per type */}
      {isLive ? (
        <LiveScoreText text={item.text} />
      ) : isMyPick ? (
        <span className={`text-[11px] font-bold tracking-wide ${textClass}`}>
          <Star className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5 fill-yellow-400 text-yellow-400" />
          {item.text}
        </span>
      ) : isSharp ? (
        <span className={`text-[11px] font-semibold tracking-wide ${textClass}`}>
          <TrendingUp className="inline w-3 h-3 mr-0.5 -mt-0.5 text-violet-400" />
          {item.text}
        </span>
      ) : isFinal ? (
        <span className="text-[11px] font-medium tracking-wide text-zinc-400">
          {item.text}
        </span>
      ) : (
        <span className={`text-[11px] font-medium tracking-wide ${textClass}`}>
          {item.text}
        </span>
      )}

      {/* Separator */}
      <span className="text-zinc-700 text-[10px] select-none">◆</span>
    </span>
  );
}

function TickerContent({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div className="flex items-center gap-0 whitespace-nowrap">
      {doubled.map((item, i) => (
        <TickerItemDisplay key={`${item.id}-${i}`} item={item} />
      ))}
    </div>
  );
}

// ── Advanced Filter Panel ──────────────────────────────────────────────────
const PRESETS = [
  { id: "all",       label: "All",         sports: ALL_SPORTS, types: CONTENT_TYPE_IDS },
  { id: "live",      label: "Live Only",   sports: ALL_SPORTS, types: ["live"] },
  { id: "action",    label: "Action",      sports: ALL_SPORTS, types: ["live", "sharp", "pick"] },
  { id: "mypicks",   label: "My Picks",    sports: ALL_SPORTS, types: ["my_pick", "my_win", "my_parlay"] },
  { id: "scores",    label: "Scores",      sports: ALL_SPORTS, types: ["live", "final"] },
];

function AdvancedFilterPanel({
  selectedSports,
  selectedTypes,
  onSportsChange,
  onTypesChange,
  onClose,
}: {
  selectedSports: string[];
  selectedTypes: string[];
  onSportsChange: (s: string[]) => void;
  onTypesChange: (t: string[]) => void;
  onClose: () => void;
}) {
  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length === 1) return;
      onSportsChange(selectedSports.filter(s => s !== sport));
    } else {
      onSportsChange([...selectedSports, sport]);
    }
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) return;
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    onSportsChange(preset.sports);
    onTypesChange(preset.types);
  };

  const activePreset = PRESETS.find(p =>
    p.sports.length === selectedSports.length &&
    p.sports.every(s => selectedSports.includes(s)) &&
    p.types.length === selectedTypes.length &&
    p.types.every(t => selectedTypes.includes(t))
  );

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-3 w-[260px]"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Ticker Filters</span>
        <button
          onClick={onClose}
          className="text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors"
          data-testid="button-ticker-filter-close"
        >
          Done
        </button>
      </div>

      {/* Quick Presets */}
      <div className="mb-3">
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Quick Presets</div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                activePreset?.id === preset.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
              data-testid={`ticker-preset-${preset.id}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mb-3" />

      {/* Content Types */}
      <div className="mb-3">
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Content Types</div>
        <div className="space-y-0.5">
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => toggleType(ct.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                selectedTypes.includes(ct.id)
                  ? "bg-white/5 text-white font-bold"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
              data-testid={`ticker-type-${ct.id}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedTypes.includes(ct.id) ? ct.color.replace("text-", "bg-") : "bg-zinc-600"}`} />
              <span className={selectedTypes.includes(ct.id) ? ct.color : ""}>{ct.label}</span>
              {selectedTypes.includes(ct.id) && (
                <span className="ml-auto text-[8px] text-zinc-500">✓</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => onTypesChange([...CONTENT_TYPE_IDS])}
          className="mt-1 text-[8px] text-zinc-600 hover:text-zinc-400 px-2 py-0.5 transition-colors"
        >
          Select all types
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mb-3" />

      {/* Sports */}
      <div>
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Sports</div>
        <div className="grid grid-cols-4 gap-1">
          {ALL_SPORTS.map(sport => (
            <button
              key={sport}
              onClick={() => toggleSport(sport)}
              className={`py-1 rounded-lg text-[9px] font-bold transition-all text-center ${
                selectedSports.includes(sport)
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              }`}
              data-testid={`ticker-filter-${sport.toLowerCase()}`}
            >
              {sport}
            </button>
          ))}
        </div>
        <button
          onClick={() => onSportsChange([...ALL_SPORTS])}
          className="mt-1 text-[8px] text-zinc-600 hover:text-zinc-400 px-2 py-0.5 transition-colors"
          data-testid="ticker-filter-all"
        >
          All sports
        </button>
      </div>
    </div>
  );
}

// ── Convert slip legs → ticker items ────────────────────────────────────────
function slipLegToTickerItem(leg: { id: string; team: string; opponent?: string; market: string; outcome: string; americanOdds?: number; decimalOdds: number; playerName?: string; propLine?: number; propCategory?: string; sport?: string }): TickerItem {
  const oddsStr = leg.americanOdds != null
    ? (leg.americanOdds > 0 ? `+${leg.americanOdds}` : `${leg.americanOdds}`)
    : `${leg.decimalOdds.toFixed(2)}x`;

  let text: string;
  if (leg.playerName) {
    const dir = leg.outcome?.toLowerCase().includes("over") ? "Over" : leg.outcome?.toLowerCase().includes("under") ? "Under" : leg.outcome;
    const line = leg.propLine != null ? ` ${leg.propLine}` : "";
    const cat = leg.propCategory ? ` ${leg.propCategory.toUpperCase()}` : "";
    text = `${leg.playerName}  ·  ${dir}${line}${cat}  ·  ${oddsStr}`;
  } else {
    const vs = leg.opponent ? `  vs ${leg.opponent}` : "";
    text = `${leg.team}  ·  ${leg.market}${vs}  ·  ${oddsStr}`;
  }

  return {
    id: `slip_${leg.id}`,
    type: "my_pick",
    badge: "MY SLIP",
    badgeColor: "yellow",
    text,
    sport: leg.sport?.toUpperCase() ?? "ALL",
    priority: 10,
  };
}

// ── Main Ticker ────────────────────────────────────────────────────────────
export function SportsTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused]   = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [speed, setSpeed] = useState<TickerSpeed>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(SPEED_STORAGE_KEY) : null;
    return (saved as TickerSpeed) || "normal";
  });

  const [selectedSports, setSelectedSports] = useState<string[]>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(SPORT_STORAGE_KEY) : null;
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return [...ALL_SPORTS];
  });

  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(TYPES_STORAGE_KEY) : null;
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return [...CONTENT_TYPE_IDS];
  });

  const handleSportsChange = useCallback((sports: string[]) => {
    setSelectedSports(sports);
    localStorage.setItem(SPORT_STORAGE_KEY, JSON.stringify(sports));
  }, []);

  const handleTypesChange = useCallback((types: string[]) => {
    setSelectedTypes(types);
    localStorage.setItem(TYPES_STORAGE_KEY, JSON.stringify(types));
  }, []);

  useEffect(() => {
    if (!showFilter) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilter]);

  const { data: authData } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/check"],
    staleTime: 60000,
  });
  const isAuthenticated = authData?.authenticated ?? false;

  const { data, isLoading } = useQuery<TickerResponse>({
    queryKey: ["/api/ticker"],
    refetchInterval: 45000,
    staleTime: 30000,
    retry: 1,
  });

  const { data: myPicksData } = useQuery<MyPicksResponse>({
    queryKey: ["/api/ticker/my-picks"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 20000,
    retry: 1,
  });

  const { legs: slipLegs } = useParlaySlip();
  const slipTickerItems = useMemo<TickerItem[]>(
    () => slipLegs.map(slipLegToTickerItem),
    [slipLegs]
  );

  const cycleSpeed = () => {
    setSpeed(prev => {
      const next = SPEED_NEXT[prev];
      localStorage.setItem(SPEED_STORAGE_KEY, next);
      return next;
    });
  };

  const isAllSports  = selectedSports.length === ALL_SPORTS.length;
  const isAllTypes   = selectedTypes.length === CONTENT_TYPE_IDS.length;
  const isFiltered   = !isAllSports || !isAllTypes;

  const rawItems     = (!isLoading && data?.items?.length) ? data.items : FALLBACK_ITEMS;
  const myPickItems: TickerItem[] = myPicksData?.items || [];

  // Determine the effective type ids for matching (my_pick covers my_win/my_parlay/my_loss too)
  const typeMatches = (type: string): boolean => {
    if (selectedTypes.includes(type)) return true;
    if (selectedTypes.includes("my_pick") && (type === "my_win" || type === "my_loss" || type === "my_parlay")) return true;
    return false;
  };

  const filteredItems = rawItems.filter(item => {
    const sportOk = item.sport === "ALL" || isAllSports || selectedSports.includes(item.sport.toUpperCase());
    const typeOk  = typeMatches(item.type);
    return sportOk && typeOk;
  });

  const filteredMyPicks = myPickItems.filter(item => typeMatches(item.type));

  // Active slip legs → always shown first when my_pick type is enabled
  const filteredSlipItems = typeMatches("my_pick") ? slipTickerItems : [];

  const mergedItems = [
    ...filteredSlipItems,
    ...filteredMyPicks,
    ...filteredItems,
  ];

  const displayItems = mergedItems.length > 0 ? mergedItems : FALLBACK_ITEMS;

  const liveCount    = rawItems.filter(i => i.type === "live").length;
  const sharpCount   = rawItems.filter(i => i.type === "sharp").length;
  const myPickCount  = myPickItems.filter(i => i.type === "my_pick" || i.type === "my_parlay").length;
  const slipCount    = slipLegs.length;

  const baseDuration   = Math.min(160, Math.max(50, displayItems.length * 3));
  const scrollDuration = baseDuration / SPEED_DIVISORS[speed];

  if (!isVisible) return null;

  return (
    <div
      className="relative w-full bg-zinc-950/97 dark:bg-zinc-950 border-b border-white/5"
      style={{ height: "32px" }}
      data-testid="sports-ticker"
    >
      <div className="absolute inset-0 flex items-center overflow-hidden">

        {/* ── Left label + stats ──────────────────────────────────── */}
        <div className="shrink-0 flex items-center border-r border-white/5 bg-zinc-950 h-full z-10">
          {/* Brand */}
          <div className="flex items-center gap-1.5 px-3 h-full border-r border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-black tracking-[0.18em] text-zinc-200 uppercase hidden sm:block whitespace-nowrap">
              SORS INTEL
            </span>
          </div>

          {/* Live count */}
          {liveCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 h-full border-r border-white/5">
              <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />
              <span className="text-[8px] font-bold text-red-400">{liveCount} LIVE</span>
            </div>
          )}

          {/* Sharp count */}
          {sharpCount > 0 && (
            <div className="hidden md:flex items-center gap-1 px-2.5 h-full border-r border-white/5">
              <TrendingUp className="w-2.5 h-2.5 text-violet-400" />
              <span className="text-[8px] font-bold text-violet-400">{sharpCount} SHARP</span>
            </div>
          )}

          {/* Active slip count (always show when legs are in slip) */}
          {slipCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 h-full border-r border-white/5">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 animate-pulse" />
              <span className="text-[8px] font-bold text-yellow-400">{slipCount} SLIP</span>
            </div>
          )}

          {/* My picks count from saved history */}
          {myPickCount > 0 && slipCount === 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 h-full border-r border-white/5">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span className="text-[8px] font-bold text-yellow-400">{myPickCount} MINE</span>
            </div>
          )}
        </div>

        {/* ── Scrolling content ────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden h-full flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex items-center"
            style={{
              animation: isPaused ? "none" : `ticker-scroll ${scrollDuration}s linear infinite`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            <TickerContent items={displayItems} />
          </div>
        </div>

        {/* ── Right controls ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center border-l border-white/5 bg-zinc-950 h-full z-10">

          {/* Filter button */}
          <div ref={filterRef} className="relative h-full">
            <button
              onClick={() => setShowFilter(s => !s)}
              className={`flex items-center justify-center gap-1 px-2.5 h-full transition-colors border-r border-white/5 ${
                isFiltered ? "text-primary bg-primary/5" : "text-zinc-500 hover:text-zinc-200"
              }`}
              data-testid="button-ticker-filter"
              title="Filter ticker content"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {isFiltered && (
                <span className="text-[8px] font-black">
                  {selectedTypes.length < CONTENT_TYPE_IDS.length ? `${selectedTypes.length}T` : ""}
                  {!isAllSports ? ` ${selectedSports.length}S` : ""}
                </span>
              )}
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showFilter ? "rotate-180" : ""}`} />
            </button>

            {showFilter && (
              <AdvancedFilterPanel
                selectedSports={selectedSports}
                selectedTypes={selectedTypes}
                onSportsChange={handleSportsChange}
                onTypesChange={handleTypesChange}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>

          {/* Speed toggle */}
          <button
            onClick={cycleSpeed}
            className="flex items-center justify-center px-2 h-full text-zinc-500 hover:text-zinc-200 transition-colors border-r border-white/5"
            data-testid="button-ticker-speed"
            title={`Speed: ${speed}. Click to cycle.`}
          >
            <span className="text-[9px] font-black tracking-wide">{SPEED_LABELS[speed]}</span>
          </button>

          {/* Dismiss */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex items-center justify-center w-6 h-full text-zinc-600 hover:text-zinc-300 transition-colors"
            data-testid="button-close-ticker"
            title="Hide ticker"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
