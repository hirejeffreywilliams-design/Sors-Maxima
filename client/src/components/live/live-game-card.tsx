import { useEffect, useRef, useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useSSEContext } from "@/context/sse-provider";

// ─── Types (mirroring server/liveGameCardsService.ts) ─────────────────────────

export interface LiveGameCardPayload {
  id: string;
  sport: string;
  accentColor: string;

  homeTeam: {
    id: string;
    name: string;
    abbr: string;
    logo: string | null;
    teamColor: string | null;
    score: number;
    record?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    abbr: string;
    logo: string | null;
    teamColor: string | null;
    score: number;
    record?: string;
  };

  status: "pre" | "live" | "halftime" | "final";
  period: number;
  periodLabel: string;
  clock: string;
  statusDetail: string;
  gameDate: string;

  momentum: {
    bar: number;
    homeMomentum: number;
    awayMomentum: number;
  };

  oddsHistory: { timestamp: number; spread: number | null; total: number | null }[];
  currentOdds: {
    spread: string | null;
    spreadLine: number | null;
    total: number | null;
  };

  venue?: string;
  broadcast?: string;
}

// ─── Sport accent colors ───────────────────────────────────────────────────────

export const SPORT_ACCENT: Record<string, string> = {
  NBA: "#F0532B",
  NFL: "#22c55e",
  NHL: "#63b3ed",
  MLB: "#ef4444",
  NCAAB: "#F97316",
  NCAAF: "#22c55e",
  MLS: "#34d399",
  default: "#a78bfa",
};

export function sportAccentColor(sport: string): string {
  return SPORT_ACCENT[(sport || "").toUpperCase()] ?? SPORT_ACCENT.default;
}

// ─── Countdown timer for pre-game cards ───────────────────────────────────────

function useCountdown(targetIso: string): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function compute() {
      const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
      if (diff === 0) return setLabel("Starting soon");
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (h > 0) return setLabel(`${h}h ${m}m`);
      if (m > 0) return setLabel(`${m}m`);
      const s = Math.floor((diff % 60_000) / 1_000);
      return setLabel(`${s}s`);
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

// ─── Team logo with fallback text ─────────────────────────────────────────────

function TeamLogo({ logo, abbr, size = 28 }: { logo: string | null; abbr: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!logo || err) {
    return (
      <div
        className="rounded-full flex items-center justify-center bg-white/10 text-white/60 font-black shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {abbr.slice(0, 3)}
      </div>
    );
  }
  return (
    <img
      src={logo}
      alt={abbr}
      width={size}
      height={size}
      className="rounded-full object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

// ─── Animated score — flashes when value changes ──────────────────────────────

function AnimatedScore({
  score,
  leading,
  color,
}: {
  score: number;
  leading: boolean;
  color: string;
}) {
  const prevRef = useRef(score);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== score) {
      prevRef.current = score;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <span
      className="text-[22px] font-black tabular-nums leading-none font-mono transition-all duration-300"
      style={{
        color: leading ? "#ffffff" : "rgba(255,255,255,0.30)",
        textShadow: flash ? `0 0 18px ${color}, 0 0 36px ${color}88` : "none",
        transform: flash ? "scale(1.12)" : "scale(1)",
        display: "inline-block",
      }}
    >
      {score}
    </span>
  );
}

// ─── Momentum bar ─────────────────────────────────────────────────────────────

function MomentumBar({
  bar,
  awayAbbr,
  homeAbbr,
  color,
}: {
  bar: number;
  awayAbbr: string;
  homeAbbr: string;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, bar));
  const homeAdvantage = clamped >= 50;
  const intensity = Math.abs(clamped - 50) / 50;
  const barColor = intensity > 0.4 ? (homeAdvantage ? color : "#ef4444") : "#f59e0b";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{awayAbbr}</span>
        <span className="text-[7px] font-black uppercase tracking-widest text-white/20">Momentum</span>
        <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{homeAbbr}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 rounded-full transition-all duration-700"
          style={{
            left: homeAdvantage ? "50%" : `${clamped}%`,
            right: homeAdvantage ? `${100 - clamped}%` : "50%",
            background: barColor,
            boxShadow: `0 0 6px ${barColor}80`,
          }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
      </div>
    </div>
  );
}

// ─── Odds sparkline ──────────────────────────────────────────────────────────

function OddsSparkline({
  history,
  field,
  color,
}: {
  history: { timestamp: number; spread: number | null; total: number | null }[];
  field: "spread" | "total";
  color: string;
}) {
  const points = history
    .map((p, i) => ({ x: i, v: p[field] ?? null }))
    .filter((p): p is { x: number; v: number } => p.v !== null);

  if (points.length < 2) return null;

  const first = points[0].v;
  const last = points[points.length - 1].v;
  const moved = Math.abs(last - first) > 0.1;
  const up = last > first;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[6px] font-bold uppercase text-white/20 tracking-wider">
        {field === "spread" ? "Spread" : "O/U"}
      </span>
      <div style={{ width: 44, height: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points.map(p => ({ x: p.x, v: p.v }))}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={moved ? (up ? "#34d399" : "#f87171") : color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span
        className="text-[8px] font-black tabular-nums"
        style={{ color: moved ? (up ? "#34d399" : "#f87171") : "rgba(255,255,255,0.40)" }}
      >
        {field === "spread"
          ? (last > 0 ? "+" : "") + last.toFixed(1)
          : last.toFixed(1)}
        {moved && (
          <span className="ml-0.5">{up ? "↑" : "↓"}</span>
        )}
      </span>
    </div>
  );
}

// ─── Main LiveGameCard component ──────────────────────────────────────────────

export function LiveGameCard({
  card,
  onSelect,
}: {
  card: LiveGameCardPayload;
  onSelect: (id: string) => void;
}) {
  const { homeTeam, awayTeam } = card;
  const color = card.accentColor;
  const homeLeading = homeTeam.score > awayTeam.score;
  const awayLeading = awayTeam.score > homeTeam.score;
  const isLive = card.status === "live";
  const isHalftime = card.status === "halftime";
  const isUpcoming = card.status === "pre";
  const isFinal = card.status === "final";
  const countdown = useCountdown(card.gameDate);

  const hasSparkline = card.oddsHistory.length >= 2 &&
    (card.oddsHistory.some(p => p.spread !== null) || card.oddsHistory.some(p => p.total !== null));

  return (
    <button
      type="button"
      data-testid={`live-game-card-${card.id}`}
      className="relative rounded-2xl overflow-hidden text-left group transition-transform hover:scale-[1.015] cursor-pointer w-full"
      style={{
        background: "linear-gradient(160deg, rgba(8,8,14,0.98) 0%, rgba(14,14,22,0.99) 100%)",
        border: `1px solid ${color}22`,
        boxShadow: isLive ? `0 0 20px ${color}14, 0 4px 16px rgba(0,0,0,0.5)` : "0 2px 12px rgba(0,0,0,0.4)",
      }}
      onClick={() => onSelect(card.id)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{
          background: isLive
            ? `linear-gradient(180deg, ${color} 0%, ${color}44 100%)`
            : `${color}40`,
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between pl-4 pr-3 pt-2 pb-1.5"
        style={{ borderBottom: `1px solid ${color}14` }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-black tracking-widest uppercase"
            style={{ color }}
          >
            {card.sport}
          </span>
          {card.periodLabel && (
            <span className="text-[8px] text-white/30 font-bold">{card.periodLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLive && (
            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              LIVE
            </span>
          )}
          {isHalftime && (
            <span className="text-[8px] font-black tracking-widest text-yellow-400 uppercase animate-pulse">
              HALF
            </span>
          )}
          {isUpcoming && countdown && (
            <span className="flex items-center gap-1 text-[8px] text-white/35">
              <Clock className="w-2.5 h-2.5" />
              {countdown}
            </span>
          )}
          {isFinal && (
            <span className="text-[8px] font-black text-white/30 uppercase">Final</span>
          )}
          {card.clock && isLive && (
            <span
              className="text-[9px] font-mono font-black tabular-nums"
              style={{ color: `${color}cc` }}
            >
              {card.clock}
            </span>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="pl-4 pr-3 pt-2.5 pb-2 space-y-1.5">
        {/* Away team */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamLogo logo={awayTeam.logo} abbr={awayTeam.abbr} size={22} />
            <div className="min-w-0">
              <span
                className="text-[10px] font-black font-mono tracking-wider truncate block"
                style={{ color: awayLeading ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)" }}
                title={awayTeam.name}
              >
                {awayTeam.name || awayTeam.abbr}
              </span>
              {awayTeam.record && (
                <span className="text-[6px] text-white/20 font-medium">{awayTeam.abbr} · {awayTeam.record}</span>
              )}
            </div>
            <span className="text-[6px] text-white/18 uppercase font-bold shrink-0">Away</span>
          </div>
          {(isLive || isHalftime || isFinal) ? (
            <AnimatedScore score={awayTeam.score} leading={awayLeading} color={color} />
          ) : (
            <span className="text-[10px] text-white/25 font-bold">—</span>
          )}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2 pl-7">
          <div className="flex-1 h-px" style={{ background: `${color}14` }} />
          <span className="text-[6px] text-white/12 font-mono">vs</span>
          <div className="flex-1 h-px" style={{ background: `${color}14` }} />
        </div>

        {/* Home team */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamLogo logo={homeTeam.logo} abbr={homeTeam.abbr} size={22} />
            <div className="min-w-0">
              <span
                className="text-[10px] font-black font-mono tracking-wider truncate block"
                style={{ color: homeLeading ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)" }}
                title={homeTeam.name}
              >
                {homeTeam.name || homeTeam.abbr}
              </span>
              {homeTeam.record && (
                <span className="text-[6px] text-white/20 font-medium">{homeTeam.abbr} · {homeTeam.record}</span>
              )}
            </div>
            <span className="text-[6px] text-white/18 uppercase font-bold shrink-0">Home</span>
          </div>
          {(isLive || isHalftime || isFinal) ? (
            <AnimatedScore score={homeTeam.score} leading={homeLeading} color={color} />
          ) : (
            <span className="text-[10px] text-white/25 font-bold">—</span>
          )}
        </div>
      </div>

      {/* Momentum bar (live/halftime only) */}
      {(isLive || isHalftime) && card.momentum && (
        <div className="px-4 pb-2">
          <MomentumBar
            bar={card.momentum.bar}
            awayAbbr={awayTeam.abbr}
            homeAbbr={homeTeam.abbr}
            color={color}
          />
        </div>
      )}

      {/* Footer: odds sparklines + current odds */}
      {(card.currentOdds.spread || card.currentOdds.total != null) && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: `1px solid ${color}10`, background: `${color}06` }}
        >
          {/* Current odds */}
          <div className="flex gap-3">
            {card.currentOdds.spread && (
              <div>
                <span className="text-[6px] font-bold uppercase text-white/20">Spread</span>
                <p className="text-[8px] font-bold text-white/45">{card.currentOdds.spread}</p>
              </div>
            )}
            {card.currentOdds.total != null && (
              <div>
                <span className="text-[6px] font-bold uppercase text-white/20">O/U</span>
                <p className="text-[8px] font-bold text-white/45">{card.currentOdds.total}</p>
              </div>
            )}
          </div>

          {/* Sparklines */}
          {hasSparkline && (
            <div className="flex gap-3">
              <OddsSparkline history={card.oddsHistory} field="spread" color={color} />
              <OddsSparkline history={card.oddsHistory} field="total" color={color} />
            </div>
          )}
        </div>
      )}

      {/* Tap indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-3 h-3 text-white/20" />
      </div>
    </button>
  );
}

// ─── Hook: fetch game cards ───────────────────────────────────────────────────

export function useLiveGameCards() {
  const sse = useSSEContext();

  const { data: cards, isLoading } = useQuery<LiveGameCardPayload[]>({
    queryKey: ["/api/live/game-cards"],
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // When SSE fires live_scores event with cards payload, prefer that
  const sseCards: LiveGameCardPayload[] | null =
    sse.lastEvent?.type === "live_scores" && Array.isArray(sse.lastEvent.data?.cards)
      ? sse.lastEvent.data.cards
      : null;

  return {
    cards: sseCards ?? cards ?? [],
    isLoading,
  };
}
