import { useSSEContext } from "@/context/sse-provider";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Wifi, WifiOff, TrendingUp, AlertCircle, Zap, Clock, RefreshCw,
  X, MapPin, Tv2, Shield, Bot, Bookmark, ChevronRight, Users,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTier } from "@/components/tier-gate";
import { useToast } from "@/hooks/use-toast";
import { LiveGameCard as RichLiveGameCard, useLiveGameCards } from "./live-game-card";

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NFL: "🏈", NHL: "🏒", MLB: "⚾", soccer: "⚽", SOCCER: "⚽",
  MMA: "🥊", Tennis: "🎾", TENNIS: "🎾", NCAAB: "🏀", NCAAF: "🏈", MLS: "⚽",
};

function formatTimeSince(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 0 || diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function MomentumBar({ value, homeLabel, awayLabel }: { value?: number; homeLabel?: string; awayLabel?: string }) {
  if (value == null) return null;
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 70 ? "#22c55e" : clamped >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      {(awayLabel || homeLabel) && (
        <div className="flex justify-between text-[7px] text-white/30 font-bold uppercase tracking-wider">
          <span>{awayLabel ?? "Away"}</span>
          <span>{homeLabel ?? "Home"}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamped}%`, background: color }} />
        </div>
        <span className="text-[9px] font-bold tabular-nums" style={{ color }}>{clamped}</span>
      </div>
    </div>
  );
}

const LIVE_STATUS_TYPES = new Set([
  "STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_END_PERIOD",
  "in_progress", "live", "halftime",
]);

const LIVE_STATUS_KEYWORDS = [
  "in progress", "halftime", "1st quarter", "2nd quarter", "3rd quarter", "4th quarter",
  "overtime", "p1", "p2", "p3", "1st period", "2nd period", "3rd period", "bot", "top", "mid",
];

function detectIsLive(status: any): boolean {
  if (!status) return false;
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (LIVE_STATUS_TYPES.has(status) || LIVE_STATUS_TYPES.has(s)) return true;
    return LIVE_STATUS_KEYWORDS.some(k => s.includes(k));
  }
  if (status.state === "in") return true;
  if (LIVE_STATUS_TYPES.has(status.type)) return true;
  if (typeof status.detail === "string") {
    const d = status.detail.toLowerCase();
    return LIVE_STATUS_KEYWORDS.some(k => d.includes(k));
  }
  return false;
}

function safeStatusDetail(status: any): string {
  if (!status) return "—";
  if (typeof status === "string") {
    if (status === "in_progress") return "In Progress";
    if (status === "scheduled") return "Scheduled";
    if (status === "final") return "Final";
    return status.replace(/_/g, " ");
  }
  if (typeof status.detail === "string" && status.detail) return status.detail;
  if (typeof status.type === "string") return status.type.replace(/^STATUS_/, "").replace(/_/g, " ").toLowerCase();
  return "—";
}

function getGameTime(game: any): string {
  const rawDate = game.date || game.startTime || game.gameTime;
  if (!rawDate) return "";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function normalizeApiGame(g: any): any {
  const isLiveStr = g.status === "in_progress";
  return {
    id: g.id,
    sport: g.sport,
    shortName: g.shortName || `${g.awayTeam} @ ${g.homeTeam}`,
    date: g.startTime,
    homeTeam: {
      name: g.homeTeam,
      abbreviation: g.homeTeamAbbr || g.homeTeam,
      score: g.homeScore ?? 0,
    },
    awayTeam: {
      name: g.awayTeam,
      abbreviation: g.awayTeamAbbr || g.awayTeam,
      score: g.awayScore ?? 0,
    },
    status: {
      state: isLiveStr ? "in" : (g.status === "final" ? "post" : "pre"),
      detail: g.clock
        ? `${g.period ? `P${g.period} ` : ""}${g.clock}`
        : (g.status === "in_progress" ? "In Progress" : g.status === "final" ? "Final" : "Scheduled"),
      period: g.period ?? 0,
      clock: g.clock ?? "",
      completed: g.status === "final",
    },
    odds: g.spread || g.overUnder ? {
      spread: g.spread,
      overUnder: g.overUnder,
      moneylineHome: g.moneylineHome,
      moneylineAway: g.moneylineAway,
    } : undefined,
    venue: g.venue,
    broadcast: g.broadcast,
    momentum: undefined,
  };
}

// ─── Game Detail Panel ──────────────────────────────────────────────────────

function OddsValue({ label, value, prevValue }: { label: string; value: string | number | null; prevValue?: string | number | null }) {
  if (!value) return null;
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  const numPrev = prevValue != null ? (typeof prevValue === "number" ? prevValue : parseFloat(String(prevValue))) : null;
  const moved = numPrev != null && !isNaN(numVal) && !isNaN(numPrev) && numVal !== numPrev;
  const up = moved && numVal > numPrev!;
  return (
    <div className="text-center">
      <p className="text-[7px] text-white/25 font-bold uppercase mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        <p className="text-[13px] font-black text-white/75">{value}</p>
        {moved && (
          <span className={`text-[9px] font-black ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "↑" : "↓"}
          </span>
        )}
      </div>
    </div>
  );
}

function GameDetailPanel({
  gameId,
  onClose,
  onHedge,
  onAskAI,
}: {
  gameId: string;
  onClose: () => void;
  onHedge?: () => void;
  onAskAI?: () => void;
}) {
  const { canAccess } = useTier();
  const isWhale = canAccess("whale");
  const { toast } = useToast();

  const handleTrack = useCallback((gameName: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem("sors_tracked_games") || "[]");
      if (!stored.includes(gameId)) {
        stored.push(gameId);
        localStorage.setItem("sors_tracked_games", JSON.stringify(stored));
      }
    } catch { /* localStorage unavailable */ }
    toast({
      title: "Game Tracked",
      description: `${gameName} added to your tracker.`,
      duration: 3000,
    });
    onClose();
  }, [gameId, toast, onClose]);

  const { data: game, isLoading } = useQuery<any>({
    queryKey: ["/api/live-games", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/live-games/${gameId}`);
      if (!res.ok) throw new Error("Failed to fetch game");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Track previous odds for movement indicators
  const prevOddsRef = useRef<{ spread?: string; overUnder?: number | null; moneylineHome?: number | null; moneylineAway?: number | null } | null>(null);
  const [prevOdds, setPrevOdds] = useState<typeof prevOddsRef.current>(null);

  useEffect(() => {
    if (!game?.odds) return;
    if (prevOddsRef.current !== null) {
      const prev = prevOddsRef.current;
      const curr = game.odds;
      const changed = prev.spread !== curr.spread || prev.overUnder !== curr.overUnder
        || prev.moneylineHome !== curr.moneylineHome || prev.moneylineAway !== curr.moneylineAway;
      if (changed) setPrevOdds({ ...prev });
    }
    prevOddsRef.current = game.odds;
  }, [game?.odds?.spread, game?.odds?.overUnder, game?.odds?.moneylineHome, game?.odds?.moneylineAway]);

  const isLive = game ? (game.status === "in_progress") : false;

  const homeScore = game?.homeScore ?? 0;
  const awayScore = game?.awayScore ?? 0;
  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;

  // Compute a simple momentum value (0-100) from score spread for display
  const momentumVal = isLive && (homeScore + awayScore) > 0
    ? Math.round(50 + (homeScore - awayScore) / Math.max(homeScore + awayScore, 1) * 50)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="game-detail-panel"
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{
          background: "linear-gradient(160deg, rgba(10,10,18,0.99) 0%, rgba(14,14,24,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(167,139,250,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-[14px] leading-none">{SPORT_EMOJI[game?.sport ?? ""] ?? "🎯"}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{game?.sport ?? "—"}</span>
            {isLive && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
            data-testid="btn-close-game-detail"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/40 border-t-violet-500 animate-spin mx-auto mb-3" />
            <p className="text-[10px] text-white/30">Loading game details...</p>
          </div>
        ) : !game ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[10px] text-white/30">Game not found</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">

            {/* Scoreboard */}
            <div className="rounded-xl px-4 py-3 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              {isLive && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                    {game.period ? `Period ${game.period}` : "—"}
                  </span>
                  {game.clock && (
                    <span className="text-[10px] font-mono font-black text-violet-400">{game.clock}</span>
                  )}
                </div>
              )}
              {!isLive && game.startTime && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-white/25" />
                  <span className="text-[9px] text-white/35">
                    {new Date(game.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(game.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              )}

              {/* Teams */}
              {isLive ? (
                <div className="space-y-2">
                  {[
                    { label: "Away", teamName: game.awayTeam, abbr: game.awayTeamAbbr, score: awayScore, leading: awayLeading },
                    { label: "Home", teamName: game.homeTeam, abbr: game.homeTeamAbbr, score: homeScore, leading: homeLeading },
                  ].map(({ label, teamName, abbr, score, leading }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[7px] font-bold text-white/25 w-5 shrink-0">{label}</span>
                        <span className="text-[12px] font-black text-white/85 truncate">
                          {abbr || teamName}
                        </span>
                        {leading && <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </div>
                      <span
                        className="text-[24px] font-black tabular-nums leading-none font-mono shrink-0"
                        style={{ color: leading ? "#34d399" : "rgba(255,255,255,0.75)" }}
                      >
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Upcoming matchup — display teams side-by-side, no scores */
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex-1 text-center">
                    <p className="text-[13px] font-black text-white/85">
                      {game.awayTeamAbbr || game.awayTeam}
                    </p>
                    <p className="text-[8px] text-white/30 mt-0.5 truncate">{game.awayTeam}</p>
                    <p className="text-[7px] text-white/20 mt-0.5 uppercase font-bold">Away</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[10px] font-black text-white/20">vs</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[13px] font-black text-white/85">
                      {game.homeTeamAbbr || game.homeTeam}
                    </p>
                    <p className="text-[8px] text-white/30 mt-0.5 truncate">{game.homeTeam}</p>
                    <p className="text-[7px] text-white/20 mt-0.5 uppercase font-bold">Home</p>
                  </div>
                </div>
              )}

              {game.statusDetail && (
                <p className="text-[8px] text-white/25 mt-2 text-center">{game.statusDetail}</p>
              )}
            </div>

            {/* Odds with movement indicators */}
            {game.odds && (game.odds.spread || game.odds.overUnder || game.odds.moneylineHome || game.odds.moneylineAway) && (
              <div className="rounded-xl px-4 py-3 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Odds</p>
                  {prevOdds && <span className="text-[7px] text-emerald-400/60 font-bold">Line moved</span>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <OddsValue label="Spread" value={game.odds.spread} prevValue={prevOdds?.spread} />
                  <OddsValue label="O/U" value={game.odds.overUnder} prevValue={prevOdds?.overUnder} />
                  {(game.odds.moneylineHome || game.odds.moneylineAway) && (
                    <div className="text-center">
                      <p className="text-[7px] text-white/25 font-bold uppercase mb-1">Moneyline</p>
                      <div className="flex flex-col items-center gap-0.5">
                        {game.odds.moneylineAway != null && (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] font-bold text-white/55">A: {game.odds.moneylineAway > 0 ? "+" : ""}{game.odds.moneylineAway}</span>
                            {prevOdds?.moneylineAway != null && prevOdds.moneylineAway !== game.odds.moneylineAway && (
                              <span className={`text-[8px] font-black ${game.odds.moneylineAway > prevOdds.moneylineAway ? "text-emerald-400" : "text-red-400"}`}>
                                {game.odds.moneylineAway > prevOdds.moneylineAway ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        )}
                        {game.odds.moneylineHome != null && (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] font-bold text-white/55">H: {game.odds.moneylineHome > 0 ? "+" : ""}{game.odds.moneylineHome}</span>
                            {prevOdds?.moneylineHome != null && prevOdds.moneylineHome !== game.odds.moneylineHome && (
                              <span className={`text-[8px] font-black ${game.odds.moneylineHome > prevOdds.moneylineHome ? "text-emerald-400" : "text-red-400"}`}>
                                {game.odds.moneylineHome > prevOdds.moneylineHome ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Momentum bar — live games only */}
            {isLive && momentumVal != null && (
              <div className="rounded-xl px-4 py-3 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Momentum Edge</p>
                <MomentumBar
                  value={momentumVal}
                  awayLabel={game.awayTeamAbbr || game.awayTeam}
                  homeLabel={game.homeTeamAbbr || game.homeTeam}
                />
                <p className="text-[7px] text-white/20 mt-1 text-center">Based on live score differential</p>
              </div>
            )}

            {/* Venue & Broadcast */}
            {(game.venue || game.broadcast) && (
              <div className="flex gap-2 flex-wrap">
                {game.venue && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <MapPin className="w-2.5 h-2.5 text-white/25" />
                    <span className="text-[9px] text-white/45 font-medium">{game.venue}</span>
                  </div>
                )}
                {game.broadcast && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Tv2 className="w-2.5 h-2.5 text-white/25" />
                    <span className="text-[9px] text-white/45 font-medium">{game.broadcast}</span>
                  </div>
                )}
              </div>
            )}

            {/* Sharp / Public split — Whale only */}
            {isWhale && game.sharpPublicSplit && (
              <div className="rounded-xl px-4 py-3 border border-violet-500/20" style={{ background: "rgba(139,92,246,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Users className="w-3 h-3 text-violet-400" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-violet-400/70">Sharp vs. Public</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Public bets */}
                  <div>
                    <p className="text-[7px] text-white/25 font-bold uppercase mb-2">Public Bets</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/40 truncate max-w-[50px]">
                          {game.awayTeamAbbr || game.awayTeam}
                        </span>
                        <span className="text-[11px] font-black text-blue-400 tabular-nums">
                          {game.sharpPublicSplit.publicAwayPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/40 truncate max-w-[50px]">
                          {game.homeTeamAbbr || game.homeTeam}
                        </span>
                        <span className="text-[11px] font-black text-blue-400 tabular-nums">
                          {game.sharpPublicSplit.publicHomePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Sharp money */}
                  <div>
                    <p className="text-[7px] text-white/25 font-bold uppercase mb-2">Sharp Money</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/40 truncate max-w-[50px]">
                          {game.awayTeamAbbr || game.awayTeam}
                        </span>
                        <span className="text-[11px] font-black text-violet-400 tabular-nums">
                          {game.sharpPublicSplit.sharpAwayPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/40 truncate max-w-[50px]">
                          {game.homeTeamAbbr || game.homeTeam}
                        </span>
                        <span className="text-[11px] font-black text-violet-400 tabular-nums">
                          {game.sharpPublicSplit.sharpHomePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[6px] text-white/15 mt-2 text-center">Model estimates based on spread/matchup dynamics</p>
              </div>
            )}

            {/* Recent events/plays */}
            {game.recentPlays && game.recentPlays.length > 0 && (
              <div className="rounded-xl px-4 py-3 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Recent Plays</p>
                <div className="space-y-1.5">
                  {game.recentPlays.slice(0, 5).map((play: any, i: number) => (
                    <div key={i} className="text-[9px] text-white/50 flex gap-2">
                      {play.clock && <span className="text-white/25 shrink-0 font-mono">{play.clock}</span>}
                      <span>{play.description || play.text || String(play)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game leaders */}
            {game.leaders && game.leaders.length > 0 && (
              <div className="rounded-xl px-4 py-3 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Game Leaders</p>
                <div className="space-y-1.5">
                  {game.leaders
                    .filter((l: any) => l.category !== "Rating")
                    .slice(0, 6)
                    .map((leader: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[7px] font-bold text-white/25 uppercase w-10 shrink-0">{leader.category}</span>
                        <span className="text-[9px] font-bold text-white/70 truncate">{leader.playerName}</span>
                      </div>
                      <span className="text-[9px] font-black text-white/55 shrink-0">{leader.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => { onHedge?.(); onClose(); }}
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-emerald-500/25 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/8"
                style={{ background: "rgba(34,197,94,0.05)" }}
                data-testid="btn-hedge-this-game"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[8px] font-black text-emerald-400 text-center">Hedge This</span>
              </button>
              <button
                onClick={() => { onAskAI?.(); onClose(); }}
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-amber-500/25 transition-all hover:border-amber-500/50 hover:bg-amber-500/8"
                style={{ background: "rgba(251,191,36,0.05)" }}
                data-testid="btn-ask-ai-game"
              >
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-[8px] font-black text-amber-400 text-center">Ask AI</span>
              </button>
              <button
                onClick={() => handleTrack(`${game?.awayTeam ?? "Away"} @ ${game?.homeTeam ?? "Home"}`)}
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-blue-500/25 transition-all hover:border-blue-500/50 hover:bg-blue-500/8"
                style={{ background: "rgba(59,130,246,0.05)" }}
                data-testid="btn-track-game"
              >
                <Bookmark className="w-4 h-4 text-blue-400" />
                <span className="text-[8px] font-black text-blue-400 text-center">Track</span>
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legacy game-card adapter (used as fallback when new rich card lacks data) ─

function LegacyGameCard({
  game,
  onSelect,
}: {
  game: any;
  onSelect: (id: string) => void;
}) {
  const sportEmoji = SPORT_EMOJI[game.sport] ?? "🎯";
  const homeScore = game.homeTeam?.score ?? 0;
  const awayScore = game.awayTeam?.score ?? 0;
  const isLive = detectIsLive(game.status);
  const statusDetail = safeStatusDetail(game.status);
  const momentum = game.momentum;
  const gameTime = !isLive ? getGameTime(game) : null;
  const odds = game.odds;
  const venue = game.venue;
  const broadcast = game.broadcast;

  return (
    <button
      type="button"
      className="rounded-xl px-3 py-3 border transition-all duration-300 text-left w-full group cursor-pointer hover:scale-[1.01]"
      style={{
        background: isLive ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        borderColor: isLive ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.07)",
      }}
      data-testid={`game-card-${game.id}`}
      onClick={() => onSelect(String(game.id))}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] leading-none">{sportEmoji}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">{game.sport}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          ) : gameTime ? (
            <span className="flex items-center gap-1 text-[8px] text-white/35">
              <Clock className="w-2.5 h-2.5" />
              {gameTime}
            </span>
          ) : null}
          <span className="text-[8px] font-bold text-white/35 truncate max-w-[80px]">{statusDetail}</span>
          <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/35 transition-colors shrink-0" />
        </div>
      </div>

      {isLive && (
        <div className="space-y-1.5">
          {[
            { team: game.awayTeam, isHome: false },
            { team: game.homeTeam, isHome: true },
          ].map(({ team, isHome }) => {
            if (!team) return null;
            const score = team.score ?? 0;
            const otherScore = isHome ? awayScore : homeScore;
            const winning = score > otherScore;
            return (
              <div key={team.name ?? (isHome ? "home" : "away")} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[8px] font-bold text-white/30 w-3 shrink-0">{isHome ? "H" : "A"}</span>
                  <span className="text-[11px] font-bold text-white/85 truncate" title={team.name}>
                    {team.name ?? team.abbreviation ?? (isHome ? "Home" : "Away")}
                  </span>
                  {winning && <TrendingUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                </div>
                <span
                  className="text-[18px] font-black tabular-nums shrink-0 leading-none"
                  style={{ color: winning ? "#34d399" : "rgba(255,255,255,0.75)" }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isLive && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-white/70 truncate block" title={game.awayTeam?.name}>
                {game.awayTeam?.name ?? game.awayTeam?.abbreviation ?? "Away"}
              </span>
            </div>
            <span className="text-[9px] font-bold text-white/25">vs</span>
            <div className="flex-1 min-w-0 text-right">
              <span className="text-[10px] font-bold text-white/70 truncate block" title={game.homeTeam?.name}>
                {game.homeTeam?.name ?? game.homeTeam?.abbreviation ?? "Home"}
              </span>
            </div>
          </div>
          {odds && (odds.spread || odds.overUnder) && (
            <div className="flex gap-3">
              {odds.spread && <div><span className="text-[7px] text-white/25 font-bold uppercase">Spread</span><p className="text-[9px] font-bold text-white/55">{odds.spread}</p></div>}
              {odds.overUnder && <div><span className="text-[7px] text-white/25 font-bold uppercase">O/U</span><p className="text-[9px] font-bold text-white/55">{odds.overUnder}</p></div>}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {venue && <div className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-white/15" /><span className="text-[7px] text-white/25 truncate max-w-[70px]">{venue}</span></div>}
            {broadcast && <div className="flex items-center gap-1"><Tv2 className="w-2.5 h-2.5 text-white/15" /><span className="text-[7px] text-white/25 truncate max-w-[70px]">{broadcast}</span></div>}
          </div>
        </div>
      )}

      {isLive && odds && (odds.spread || odds.overUnder) && (
        <div className="mt-2 pt-2 border-t border-white/8 flex gap-3">
          {odds.spread && <div><span className="text-[7px] text-white/25 font-bold uppercase">Spread</span><p className="text-[9px] font-bold text-white/55">{odds.spread}</p></div>}
          {odds.overUnder && <div><span className="text-[7px] text-white/25 font-bold uppercase">O/U</span><p className="text-[9px] font-bold text-white/55">{odds.overUnder}</p></div>}
        </div>
      )}

      {momentum != null && (
        <div className="mt-2 pt-2 border-t border-white/8">
          <span className="text-[7px] font-bold uppercase tracking-widest text-white/25 mb-1 block">Momentum</span>
          <MomentumBar value={momentum} />
        </div>
      )}
    </button>
  );
}

// ─── Edge Alert Row ──────────────────────────────────────────────────────────

function EdgeAlertRow({
  alert,
  onViewGame,
}: {
  alert: any;
  onViewGame?: (id: string) => void;
}) {
  const severityColor = alert.severity === "high" ? "#ef4444" : alert.severity === "medium" ? "#f59e0b" : "#3b82f6";
  const typeIcon = alert.type === "steam" || alert.type === "sharp" ? <Zap className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />;
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2 rounded-lg border"
      style={{ background: `${severityColor}08`, borderColor: `${severityColor}20` }}
      data-testid={`edge-alert-${alert.id}`}
    >
      <div className="mt-0.5 shrink-0" style={{ color: severityColor }}>{typeIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-[10px] font-black text-white/85 leading-tight truncate">{alert.title}</p>
          {alert.sport && (
            <span className="text-[7px] font-bold uppercase tracking-wider shrink-0" style={{ color: `${severityColor}80` }}>
              {alert.sport}
            </span>
          )}
        </div>
        {alert.description && (
          <p className="text-[8px] text-white/40 mt-0.5 line-clamp-1">{alert.description}</p>
        )}
        {alert.gameId && onViewGame && (
          <button
            className="mt-1 flex items-center gap-0.5 text-[8px] font-bold transition-colors hover:opacity-80"
            style={{ color: severityColor }}
            onClick={() => onViewGame(alert.gameId)}
            data-testid={`btn-view-game-${alert.id}`}
          >
            View Game <ChevronRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Feed ──────────────────────────────────────────────────────────────

export function LiveScoresFeed({
  selectedSports,
  pendingGameOpen,
  onHedge,
  onAskAI,
}: {
  selectedSports?: Set<string>;
  pendingGameOpen?: { id: string; token: number } | null;
  onHedge?: () => void;
  onAskAI?: () => void;
}) {
  const sse = useSSEContext();
  const [updateFlash, setUpdateFlash] = useState(false);
  const [timeSince, setTimeSince] = useState("—");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Rich game cards from dedicated endpoint
  const { cards: richCards, isLoading: richLoading } = useLiveGameCards();

  // Open game when jumbotron fires (token changes force re-open even for same game)
  useEffect(() => {
    if (pendingGameOpen?.id) setSelectedGameId(pendingGameOpen.id);
  }, [pendingGameOpen?.id, pendingGameOpen?.token]);

  const { data: apiGames, isLoading: apiLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/live-games"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  useEffect(() => {
    if (sse.lastUpdate) {
      setUpdateFlash(true);
      const t = setTimeout(() => setUpdateFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [sse.lastUpdate]);

  useEffect(() => {
    const interval = setInterval(() => setTimeSince(formatTimeSince(sse.lastUpdate)), 5000);
    setTimeSince(formatTimeSince(sse.lastUpdate));
    return () => clearInterval(interval);
  }, [sse.lastUpdate]);

  // Refresh selected game detail on SSE live-scores or live_scores
  useEffect(() => {
    if (selectedGameId && (sse.lastEvent?.type === "live-scores" || sse.lastEvent?.type === "live_scores")) {
      queryClient.invalidateQueries({ queryKey: ["/api/live-games", selectedGameId] });
    }
  }, [sse.lastEvent, selectedGameId]);

  // Use rich cards if available, otherwise fall back to legacy SSE/API games
  const useRichCards = richCards.length > 0;

  const sseFired = sse.allGames.length > 0 || sse.liveGames.length > 0;
  let allGames: any[] = [];

  if (sseFired) {
    allGames = sse.allGames.length > 0 ? sse.allGames : [...sse.liveGames, ...sse.upcomingGames];
  } else if (apiGames && apiGames.length > 0) {
    allGames = apiGames.map(normalizeApiGame);
  }

  // Apply sport filter to rich cards
  const filteredRichCards = useRichCards
    ? (selectedSports && selectedSports.size > 0
      ? richCards.filter(c => selectedSports.has((c.sport || "").toUpperCase()))
      : richCards)
    : [];

  const richLiveCards = filteredRichCards.filter(c => c.status === "live" || c.status === "halftime");
  const richUpcomingCards = filteredRichCards.filter(c => c.status === "pre");

  // Apply sport filter (multi-select) to legacy games
  const filteredGames = selectedSports && selectedSports.size > 0
    ? allGames.filter((g: any) => selectedSports.has((g.sport || "").toUpperCase()))
    : allGames;

  const liveGames = filteredGames.filter((g: any) => detectIsLive(g.status));
  const upcomingGames = filteredGames.filter((g: any) => !detectIsLive(g.status) && g.status?.state !== "post" && g.status !== "final");
  const alerts = sse.edgeAlerts ?? [];

  const dataSource = useRichCards ? "ESPN Live" : sseFired ? "SSE Live" : apiGames ? "ESPN API" : null;

  const sportLabel = selectedSports && selectedSports.size > 0
    ? Array.from(selectedSports).join("/")
    : null;

  const activeLiveCount = useRichCards ? richLiveCards.length : liveGames.length;
  const activeUpcomingCount = useRichCards ? richUpcomingCards.length : upcomingGames.length;
  const totalTracked = useRichCards ? filteredRichCards.length : allGames.length;

  const liveSportLabel = sportLabel
    ? `${activeLiveCount} ${sportLabel} game${activeLiveCount !== 1 ? "s" : ""}`
    : `${activeLiveCount} in progress`;

  const upcomingSportLabel = sportLabel
    ? `${activeUpcomingCount} ${sportLabel} upcoming`
    : `${activeUpcomingCount} upcoming`;

  const isLoading = richLoading && apiLoading;

  return (
    <div className="space-y-5">

      {/* Game Detail Panel */}
      {selectedGameId && (
        <GameDetailPanel
          gameId={selectedGameId}
          onClose={() => setSelectedGameId(null)}
          onHedge={onHedge}
          onAskAI={onAskAI}
        />
      )}

      {/* Status Banner */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-300"
        style={{
          background: updateFlash ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
          borderColor: sse.connected ? "rgba(34,197,94,0.20)" : "rgba(251,191,36,0.20)",
          boxShadow: updateFlash ? "0 0 18px rgba(34,197,94,0.12)" : "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          {sse.connected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400" />
          )}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: sse.connected ? "#34d399" : "#fbbf24" }}>
              {sse.connected ? "Live Data Stream Active" : "Reconnecting..."}
            </p>
            <p className="text-[8px] text-white/30 mt-0.5">
              {dataSource ? `Via ${dataSource} · ` : ""}Broadcasting scores & odds every 30s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            title="Refresh scores"
            data-testid="btn-refresh-scores"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white/30" />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeSince}
            </p>
            <p className="text-[8px] text-white/25 mt-0.5">
              {totalTracked} games tracked
            </p>
          </div>
        </div>
      </div>

      {/* Opportunity Score */}
      {sse.opportunityScore > 0 && (
        <div
          className="rounded-xl px-4 py-3 border"
          style={{
            background: sse.opportunityScore >= 70 ? "rgba(34,197,94,0.08)" : sse.opportunityScore >= 40 ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
            borderColor: sse.opportunityScore >= 70 ? "rgba(34,197,94,0.22)" : sse.opportunityScore >= 40 ? "rgba(251,191,36,0.20)" : "rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/35 mb-1">Sors Opportunity Score™</p>
              <p className="text-[11px] text-white/50">
                {sse.opportunityScore >= 75 ? "🔥 Prime betting conditions right now" :
                  sse.opportunityScore >= 50 ? "⚡ Good opportunities available" :
                  sse.opportunityScore >= 25 ? "📊 Moderate market activity" :
                  "🔍 Scanning for value..."}
              </p>
            </div>
            <div className="text-right">
              <span
                className="text-[36px] font-black tabular-nums leading-none"
                style={{
                  color: sse.opportunityScore >= 70 ? "#34d399" : sse.opportunityScore >= 40 ? "#fbbf24" : "rgba(255,255,255,0.40)",
                  textShadow: sse.opportunityScore >= 70 ? "0 0 20px rgba(34,197,94,0.45)" : "none",
                  fontFamily: "Georgia, serif",
                }}
              >
                {sse.opportunityScore}
              </span>
              <p className="text-[8px] font-bold text-white/25 text-right">/100</p>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${sse.opportunityScore}%`,
                background: sse.opportunityScore >= 70 ? "linear-gradient(90deg,#10b981,#34d399)" :
                  sse.opportunityScore >= 40 ? "linear-gradient(90deg,#d97706,#fbbf24)" :
                  "rgba(255,255,255,0.25)",
              }}
            />
          </div>
        </div>
      )}

      {/* Live Games */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </h3>
          {activeLiveCount > 0 && (
            <Badge variant="outline" className="text-[8px] bg-red-500/10 border-red-500/25 text-red-400">
              {liveSportLabel}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/07 animate-pulse" style={{ background: "rgba(255,255,255,0.03)", height: 140 }} />
            ))}
          </div>
        ) : activeLiveCount === 0 ? (
          <div className="px-4 py-6 rounded-xl border border-white/06 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Activity className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-[10px] text-white/25 font-medium">No games in progress right now</p>
            <p className="text-[8px] text-white/15 mt-1">Scores stream live the moment games tip off · {activeUpcomingCount} games scheduled below</p>
          </div>
        ) : useRichCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {richLiveCards.map(card => (
              <RichLiveGameCard key={card.id} card={card} onSelect={setSelectedGameId} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {liveGames.map((game: any) => (
              <LegacyGameCard key={game.id} game={game} onSelect={setSelectedGameId} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming / Scheduled */}
      {activeUpcomingCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50">
              Scheduled Today
            </h3>
            <Badge variant="outline" className="text-[8px] bg-blue-500/10 border-blue-500/25 text-blue-400">
              {upcomingSportLabel}
            </Badge>
          </div>
          {useRichCards ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {richUpcomingCards.slice(0, 12).map(card => (
                  <RichLiveGameCard key={card.id} card={card} onSelect={setSelectedGameId} />
                ))}
              </div>
              {richUpcomingCards.length > 12 && (
                <p className="text-[8px] text-white/25 text-center">+{richUpcomingCards.length - 12} more games scheduled</p>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {upcomingGames.slice(0, 12).map((game: any) => (
                  <LegacyGameCard key={game.id} game={game} onSelect={setSelectedGameId} />
                ))}
              </div>
              {upcomingGames.length > 12 && (
                <p className="text-[8px] text-white/25 text-center">+{upcomingGames.length - 12} more games scheduled</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Edge Alerts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Edge Alerts
          </h3>
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-[8px] bg-amber-500/10 border-amber-500/25 text-amber-400">
              {alerts.length} active
            </Badge>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="px-4 py-4 rounded-xl border border-white/06 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[10px] text-white/25 font-medium">No active edge alerts</p>
            <p className="text-[8px] text-white/15 mt-1">Steam moves and sharp signals will appear here</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {alerts.slice(0, 8).map((alert: any) => (
              <EdgeAlertRow
                key={alert.id}
                alert={alert}
                onViewGame={alert.gameId ? setSelectedGameId : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Data Sources */}
      {sse.dataSourceHealth && sse.dataSourceHealth.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50">Data Sources</h3>
          <div className="flex flex-wrap gap-1.5">
            {sse.dataSourceHealth.map((source: any) => (
              <div
                key={source.source ?? source.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-bold"
                style={{
                  background: source.healthy || source.status === "healthy" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  borderColor: source.healthy || source.status === "healthy" ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)",
                  color: source.healthy || source.status === "healthy" ? "#34d399" : "#f87171",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                {source.source ?? source.name}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
