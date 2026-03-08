import { useSSEContext } from "@/context/sse-provider";
import { Badge } from "@/components/ui/badge";
import { Activity, Wifi, WifiOff, TrendingUp, AlertCircle, Zap, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NFL: "🏈", NHL: "🏒", MLB: "⚾", soccer: "⚽", SOCCER: "⚽",
  MMA: "🥊", Tennis: "🎾", TENNIS: "🎾", NCAAB: "🏀", NCAAF: "🏈",
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

function MomentumBar({ value }: { value?: number }) {
  if (value == null) return null;
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 70 ? "#22c55e" : clamped >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamped}%`, background: color }} />
      </div>
      <span className="text-[9px] font-bold tabular-nums" style={{ color }}>{clamped}</span>
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
      abbreviation: (g.homeTeam || "").split(" ").pop() || g.homeTeam,
      score: g.homeScore ?? 0,
    },
    awayTeam: {
      name: g.awayTeam,
      abbreviation: (g.awayTeam || "").split(" ").pop() || g.awayTeam,
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
    odds: g.spread || g.overUnder ? { spread: g.spread, overUnder: g.overUnder } : undefined,
    momentum: undefined,
  };
}

function LiveGameCard({ game }: { game: any }) {
  const sportEmoji = SPORT_EMOJI[game.sport] ?? "🎯";
  const homeScore = game.homeTeam?.score ?? 0;
  const awayScore = game.awayTeam?.score ?? 0;
  const isLive = detectIsLive(game.status);
  const statusDetail = safeStatusDetail(game.status);
  const momentum = game.momentum;
  const gameTime = !isLive ? getGameTime(game) : null;
  const odds = game.odds;

  return (
    <div
      className="rounded-xl px-3 py-3 border transition-all duration-300"
      style={{
        background: isLive ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        borderColor: isLive ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.07)",
      }}
      data-testid={`game-card-${game.id}`}
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
        </div>
      </div>

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
            <div key={team.abbreviation ?? (isHome ? "home" : "away")} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[8px] font-bold text-white/30 w-3 shrink-0">{isHome ? "H" : "A"}</span>
                <span className="text-[11px] font-bold text-white/85 truncate">
                  {team.abbreviation ?? team.name ?? (isHome ? "Home" : "Away")}
                </span>
                {winning && isLive && <TrendingUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
              </div>
              <span
                className="text-[18px] font-black tabular-nums shrink-0 leading-none"
                style={{ color: winning && isLive ? "#34d399" : "rgba(255,255,255,0.75)" }}
              >
                {isLive ? score : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {odds && (odds.spread || odds.overUnder) && (
        <div className="mt-2 pt-2 border-t border-white/8 flex gap-3">
          {odds.spread && (
            <div>
              <span className="text-[7px] text-white/25 font-bold uppercase">Spread</span>
              <p className="text-[9px] font-bold text-white/55">{odds.spread}</p>
            </div>
          )}
          {odds.overUnder && (
            <div>
              <span className="text-[7px] text-white/25 font-bold uppercase">O/U</span>
              <p className="text-[9px] font-bold text-white/55">{odds.overUnder}</p>
            </div>
          )}
        </div>
      )}

      {momentum != null && (
        <div className="mt-2 pt-2 border-t border-white/8">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-bold uppercase tracking-widest text-white/25">Momentum</span>
          </div>
          <MomentumBar value={momentum} />
        </div>
      )}
    </div>
  );
}

function EdgeAlertRow({ alert }: { alert: any }) {
  const severityColor = alert.severity === "high" ? "#ef4444" : alert.severity === "medium" ? "#f59e0b" : "#3b82f6";
  const typeIcon = alert.type === "steam" || alert.type === "sharp" ? <Zap className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />;
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2 rounded-lg border"
      style={{ background: `${severityColor}08`, borderColor: `${severityColor}20` }}
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
      </div>
    </div>
  );
}

export function LiveScoresFeed() {
  const sse = useSSEContext();
  const [updateFlash, setUpdateFlash] = useState(false);
  const [timeSince, setTimeSince] = useState("—");

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

  const sseFired = sse.allGames.length > 0 || sse.liveGames.length > 0;
  let allGames: any[] = [];

  if (sseFired) {
    allGames = sse.allGames.length > 0 ? sse.allGames : [...sse.liveGames, ...sse.upcomingGames];
  } else if (apiGames && apiGames.length > 0) {
    allGames = apiGames.map(normalizeApiGame);
  }

  const liveGames = allGames.filter((g: any) => detectIsLive(g.status));
  const upcomingGames = allGames.filter((g: any) => !detectIsLive(g.status) && g.status?.state !== "post" && g.status !== "final");
  const alerts = sse.edgeAlerts ?? [];

  const dataSource = sseFired ? "SSE Live" : apiGames ? "ESPN API" : null;

  return (
    <div className="space-y-5">

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
              {allGames.length} games tracked
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
          {liveGames.length > 0 && (
            <Badge variant="outline" className="text-[8px] bg-red-500/10 border-red-500/25 text-red-400">
              {liveGames.length} in progress
            </Badge>
          )}
        </div>

        {apiLoading && allGames.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl px-3 py-3 border border-white/07 animate-pulse" style={{ background: "rgba(255,255,255,0.03)", height: 110 }} />
            ))}
          </div>
        ) : liveGames.length === 0 ? (
          <div className="px-4 py-6 rounded-xl border border-white/06 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Activity className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-[10px] text-white/25 font-medium">No games in progress right now</p>
            <p className="text-[8px] text-white/15 mt-1">SSE will push scores the moment games go live · {upcomingGames.length} games scheduled below</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {liveGames.map((game: any) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming / Scheduled */}
      {upcomingGames.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-white/50">
              Scheduled Today
            </h3>
            <Badge variant="outline" className="text-[8px] bg-blue-500/10 border-blue-500/25 text-blue-400">
              {upcomingGames.length} upcoming
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {upcomingGames.slice(0, 12).map((game: any) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </div>
          {upcomingGames.length > 12 && (
            <p className="text-[8px] text-white/25 text-center">+{upcomingGames.length - 12} more games scheduled</p>
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
              <EdgeAlertRow key={alert.id} alert={alert} />
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
