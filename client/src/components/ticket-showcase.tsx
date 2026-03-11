import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, Trophy, TrendingDown, CheckCircle2, XCircle, Copy, CheckCheck,
  Share2, ChevronLeft, Star, Flame, Zap, TrendingUp, RefreshCw,
  Clock, Shield, Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShowcaseLeg {
  sport: string; game: string; pick: string; betType: string;
  odds: number; grade: string; confidence: number; result: "won" | "lost";
}
interface ShowcaseTicket {
  id: string; date: string; result: "won" | "lost";
  legs: ShowcaseLeg[]; combinedOdds: number; stake: number;
  payout: number; profit: number;
  combinedGrade?: string; sports?: string[]; primarySport?: string;
  seasonLabel?: string; isHighValue?: boolean; isFeatured?: boolean;
  significanceScore?: number; tags?: string[];
}
interface ShowcaseStats {
  winning: number; losing: number; winRate: number; totalROI: number;
  bestOdds: number; bestProfit: number; currentStreak: number;
  streakType: "win" | "loss" | "none";
}
interface ShowcaseData { tickets: ShowcaseTicket[]; stats: ShowcaseStats; generatedAt?: string; }
interface TicketShowcaseProps { onClose: () => void; }

const SPORT_COLORS: Record<string, { accent: string; bg: string; text: string; bar: string }> = {
  NBA:   { accent: "#f97316", bg: "rgba(249,115,22,0.07)", text: "text-orange-400", bar: "bg-orange-500" },
  NHL:   { accent: "#60a5fa", bg: "rgba(96,165,250,0.07)", text: "text-blue-400",   bar: "bg-blue-500" },
  NCAAB: { accent: "#f43f5e", bg: "rgba(244,63,94,0.07)",  text: "text-rose-400",   bar: "bg-rose-500" },
  MLB:   { accent: "#22c55e", bg: "rgba(34,197,94,0.07)",  text: "text-emerald-400",bar: "bg-emerald-500" },
  NFL:   { accent: "#facc15", bg: "rgba(250,204,21,0.07)", text: "text-yellow-400", bar: "bg-yellow-500" },
  MMA:   { accent: "#a78bfa", bg: "rgba(167,139,250,0.07)",text: "text-violet-400", bar: "bg-violet-500" },
  SOCCER:{ accent: "#34d399", bg: "rgba(52,211,153,0.07)", text: "text-teal-400",   bar: "bg-teal-500" },
};
const DEFAULT_COLOR = { accent: "#94a3b8", bg: "rgba(148,163,184,0.05)", text: "text-slate-400", bar: "bg-slate-500" };

const SPORT_EMOJI: Record<string, string> = {
  NBA:"🏀",NHL:"🏒",NFL:"🏈",MLB:"⚾",NCAAB:"🏀",NCAAF:"🏈",MMA:"🥊",SOCCER:"⚽",UFC:"🥊",
};

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-amber-400", "A": "text-emerald-400", "A-": "text-emerald-400",
  "B+": "text-teal-400", "B": "text-blue-400", "B-": "text-blue-400",
  "C+": "text-yellow-400", "C": "text-slate-400", "C-": "text-slate-400",
  "D": "text-red-400", "F": "text-red-500",
};

function fmtOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }
function fmtDate(d: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === today) return "Today";
  if (d === yesterday) return "Yesterday";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtFull(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function groupByTimeline(tickets: ShowcaseTicket[]) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const groups: { label: string; tickets: ShowcaseTicket[] }[] = [];
  const todayT = tickets.filter(t => t.date === today);
  const yestT  = tickets.filter(t => t.date === yesterday);
  const weekT  = tickets.filter(t => t.date > weekAgo && t.date < yesterday);
  const oldT   = tickets.filter(t => t.date <= weekAgo);
  if (todayT.length) groups.push({ label: "Today", tickets: todayT });
  if (yestT.length)  groups.push({ label: "Yesterday", tickets: yestT });
  if (weekT.length)  groups.push({ label: "This Week", tickets: weekT });
  if (oldT.length)   groups.push({ label: "Earlier", tickets: oldT });
  return groups;
}

function StatCounter({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="text-center min-w-[72px]">
      <div className={cn("text-xl font-black leading-none", color ?? "text-foreground")}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    "ELITE GRADE": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "A GRADE": "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
    "SHARP PLAY": "bg-teal-500/12 text-teal-400 border-teal-500/25",
    "SWEEP": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "LONG SHOT": "bg-red-500/12 text-red-400 border-red-500/25",
    "HIGH ODDS": "bg-orange-500/12 text-orange-400 border-orange-500/25",
    "SOLID VALUE": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "MULTI-SPORT": "bg-violet-500/12 text-violet-400 border-violet-500/25",
    "CROSS-SPORT": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "MARCH MADNESS": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };
  const style = styles[tag] ?? "bg-muted/50 text-muted-foreground border-muted";
  return (
    <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border", style)}>
      {tag}
    </span>
  );
}

function FeaturedBanner({ ticket, onShare }: { ticket: ShowcaseTicket; onShare: () => void }) {
  const sc = SPORT_COLORS[ticket.primarySport ?? ticket.legs[0]?.sport] ?? DEFAULT_COLOR;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50"
      style={{
        background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(0,0,0,0) 50%, rgba(251,191,36,0.05) 100%)",
        boxShadow: "0 0 40px rgba(251,191,36,0.15), 0 0 80px rgba(251,191,36,0.06)",
      }}
      data-testid="featured-ticket"
    >
      {/* Animated shimmer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: "absolute", width: "80px", height: "200%", top: "-50%",
          background: "linear-gradient(90deg,transparent,rgba(251,191,36,0.10) 50%,transparent)",
          animation: "holo-sweep 8s ease-in-out infinite",
        }} />
      </div>

      {/* Top bar */}
      <div style={{ height: "3px", background: "linear-gradient(90deg,#fbbf24,#f59e0b,#fcd34d,#fbbf24)", backgroundSize: "200% 100%", animation: "holo-rainbow-bar 3s linear infinite" }} />

      <div className="relative p-4 space-y-3">
        {/* Featured label */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Best Result</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/12 border border-emerald-500/25">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-black uppercase text-emerald-400">Won</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticket.tags?.map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
        </div>

        {/* Header stats */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{ticket.seasonLabel}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground">{fmtFull(ticket.date)}</span>
            </div>
            <div className="text-xs text-muted-foreground/50">{ticket.legs.length} legs · {ticket.sports?.join(", ")}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black font-mono text-amber-400">{fmtOdds(ticket.combinedOdds)}</div>
            <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Parlay Odds</div>
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-1.5">
          {ticket.legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/6 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-sm shrink-0">{SPORT_EMOJI[leg.sport] ?? "🎯"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-foreground/90">{leg.pick}</p>
                <p className="text-[10px] text-muted-foreground truncate">{leg.game}</p>
              </div>
              <span className="font-mono text-muted-foreground shrink-0">{fmtOdds(leg.odds)}</span>
              <span className={cn("font-black text-[10px] shrink-0", GRADE_COLOR[leg.grade] ?? "text-slate-400")}>{leg.grade}</span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between pt-1 border-t border-white/6">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Payout</span>
              <span className="font-black text-emerald-400">${ticket.payout}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Profit</span>
              <span className="font-black text-emerald-400">+${ticket.profit}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-[10px] font-black border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={onShare}
            data-testid="button-share-featured"
          >
            <Share2 className="w-3 h-3" /> Share
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onShare, index }: {
  ticket: ShowcaseTicket; onShare: (t: ShowcaseTicket) => void; index: number;
}) {
  const isWin = ticket.result === "won";
  const sc = SPORT_COLORS[ticket.primarySport ?? ticket.legs[0]?.sport] ?? DEFAULT_COLOR;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg",
        isWin
          ? ticket.isHighValue
            ? "border-emerald-500/35 hover:border-emerald-500/55"
            : "border-emerald-500/18 hover:border-emerald-500/35"
          : "border-red-500/15 hover:border-red-500/28"
      )}
      style={{
        background: isWin
          ? `linear-gradient(135deg, ${sc.bg} 0%, rgba(0,0,0,0) 60%)`
          : "linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(0,0,0,0) 60%)",
        boxShadow: isWin && ticket.isHighValue
          ? "0 0 20px rgba(34,197,94,0.08)"
          : undefined,
        animationDelay: `${Math.min(index * 40, 400)}ms`,
      }}
      data-testid={`card-showcase-${ticket.id}`}
    >
      {/* Left sport accent bar */}
      <div
        className={cn("absolute left-0 top-0 bottom-0 w-0.5", sc.bar)}
        style={{ opacity: isWin ? 0.7 : 0.3 }}
      />

      <div className="pl-4 pr-3 pt-3 pb-3 space-y-2.5">
        {/* Top row: result + date + tags */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0",
              isWin ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {isWin ? <><CheckCircle2 className="w-3 h-3" />Won</> : <><XCircle className="w-3 h-3" />Lost</>}
            </div>
            {ticket.tags?.map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
          <div className="shrink-0 text-right">
            <div className={cn("text-base font-black font-mono", isWin ? sc.text : "text-muted-foreground/60")}>
              {fmtOdds(ticket.combinedOdds)}
            </div>
          </div>
        </div>

        {/* Date + Season */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>{fmtFull(ticket.date)}</span>
          {ticket.seasonLabel && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className={cn("font-semibold", sc.text)}>{ticket.seasonLabel}</span>
            </>
          )}
        </div>

        {/* Legs */}
        <div className="space-y-1">
          {ticket.legs.map((leg, i) => {
            const legWon = leg.result === "won";
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded-lg text-xs",
                  legWon ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-red-500/4 border border-red-500/8"
                )}
              >
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-black",
                  legWon ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/12 text-red-400"
                )}>
                  {legWon ? "✓" : "✗"}
                </div>
                <span className="text-sm leading-none shrink-0">{SPORT_EMOJI[leg.sport] ?? "🎯"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-foreground/85">{leg.pick}</p>
                  <p className="text-[9px] text-muted-foreground/50 truncate">{leg.game}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span className="font-mono text-[10px] text-muted-foreground/60">{fmtOdds(leg.odds)}</span>
                  <span className={cn("font-black text-[9px]", GRADE_COLOR[leg.grade] ?? "text-slate-400")}>{leg.grade}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-white/4">
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider block">Payout</span>
              <span className={cn("font-bold", isWin ? "text-emerald-400" : "text-muted-foreground/50")}>
                ${ticket.payout}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider block">P&L</span>
              <span className={cn("font-black", isWin ? "text-emerald-400" : "text-red-400")}>
                {isWin ? "+" : ""}{ticket.profit}
              </span>
            </div>
            {ticket.combinedGrade && (
              <div>
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider block">Grade</span>
                <span className={cn("font-black", GRADE_COLOR[ticket.combinedGrade] ?? "text-slate-400")}>
                  {ticket.combinedGrade}
                </span>
              </div>
            )}
          </div>
          {isWin && (
            <button
              className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors"
              onClick={() => onShare(ticket)}
              data-testid={`button-share-${ticket.id}`}
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareModal({ ticket, onClose }: { ticket: ShowcaseTicket; onClose: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const text = [
    `🏆 SORS MAXIMA — WINNING TICKET`,
    `${"─".repeat(34)}`,
    `Combined Odds: ${fmtOdds(ticket.combinedOdds)}`,
    `Payout: $${ticket.payout}  (+$${ticket.profit} profit)`,
    `Date: ${fmtFull(ticket.date)}`,
    ticket.seasonLabel ? `Season: ${ticket.seasonLabel}` : "",
    ``,
    ...ticket.legs.map((l, i) =>
      `${i + 1}. ${SPORT_EMOJI[l.sport] ?? "🎯"} ${l.pick} (${fmtOdds(l.odds)}) — ${l.result === "won" ? "✓ WON" : "✗ LOST"}`
    ),
    ``,
    `Powered by Sors 46-Factor Intelligence Engine`,
    `sorsmaxima.com`,
  ].filter(l => l !== undefined).join("\n");

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    toast({ title: "Copied!", description: "Paste it anywhere to share your win." });
    setTimeout(() => setCopied(false), 2500);
  };
  const handleShare = async () => {
    if ("share" in navigator) {
      try { await (navigator as any).share({ title: "Sors Maxima — Winning Ticket", text }); return; } catch {}
    }
    handleCopy();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
      data-testid="share-proof-modal"
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden border border-emerald-500/25"
        style={{ background: "linear-gradient(160deg,#050e0a 0%,#0c1a10 100%)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: "3px", background: "linear-gradient(90deg,#22c55e,#fbbf24,#22c55e)", backgroundSize: "200%", animation: "holo-rainbow-bar 3s linear infinite" }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black tracking-widest text-emerald-500/50 uppercase">Share Result</p>
              <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Winning Ticket
              </h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl bg-black/40 border border-white/6 p-3 max-h-64 overflow-y-auto">
            <pre className="text-[10px] text-foreground/75 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 font-bold h-10" onClick={handleCopy} data-testid="button-share-copy">
              {copied ? <><CheckCheck className="w-4 h-4 text-emerald-400" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
            </Button>
            <Button className="flex-1 gap-2 font-bold h-10 bg-emerald-600 hover:bg-emerald-500" onClick={handleShare} data-testid="button-share-send">
              <Share2 className="w-4 h-4" />Share
            </Button>
          </div>
          <p className="text-center text-[9px] text-muted-foreground/30 uppercase tracking-widest">
            Sors 46-Factor Intelligence Engine
          </p>
        </div>
      </div>
    </div>
  );
}

type FilterResult = "all" | "won" | "lost";

export function TicketShowcase({ onClose }: TicketShowcaseProps) {
  const [filterResult, setFilterResult] = useState<FilterResult>("all");
  const [filterSport, setFilterSport] = useState<string>("all");
  const [sharingTicket, setSharingTicket] = useState<ShowcaseTicket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<ShowcaseData>({
    queryKey: ["/api/showcase-tickets"],
  });

  const tickets = data?.tickets ?? [];
  const stats = data?.stats;

  const allSports = [...new Set(tickets.flatMap(t => t.sports ?? [t.legs[0]?.sport ?? ""]))]
    .filter(Boolean).sort();

  const featured = tickets.find(t => t.isFeatured && t.result === "won");

  const filtered = tickets.filter(t => {
    if (filterResult !== "all" && t.result !== filterResult) return false;
    if (filterSport !== "all" && !t.sports?.includes(filterSport) && t.legs[0]?.sport !== filterSport) return false;
    return true;
  }).filter(t => !(t.isFeatured && filterResult === "all" && filterSport === "all"));

  const groups = groupByTimeline(filtered);

  const refreshedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#06080a" }} data-testid="ticket-showcase">

      {/* ── Top header ── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "linear-gradient(180deg,rgba(0,0,0,0.8) 0%,rgba(6,8,10,0.95) 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3 space-y-4">
          {/* Nav row */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0" data-testid="button-showcase-back">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight flex items-center gap-1.5 shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                  Intelligence Showcase
                </h2>
                {refreshedAt && (
                  <span className="text-[9px] text-muted-foreground/40 font-medium">
                    Updated {refreshedAt}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/50">Real settled results · Sors 46-Factor Engine</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground/40 hover:text-primary"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-showcase"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </Button>
          </div>

          {/* Stats strip */}
          {!isLoading && stats && (
            <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide py-1">
              <StatCounter
                label="Record"
                value={`${stats.winning}W–${stats.losing}L`}
                color={stats.winRate >= 55 ? "text-emerald-400" : "text-foreground"}
              />
              <div className="w-px h-8 bg-white/6 shrink-0" />
              <StatCounter
                label="Win Rate"
                value={`${stats.winRate}%`}
                color={stats.winRate >= 55 ? "text-emerald-400" : stats.winRate >= 45 ? "text-amber-400" : "text-red-400"}
              />
              <div className="w-px h-8 bg-white/6 shrink-0" />
              <StatCounter
                label="Total ROI"
                value={stats.totalROI >= 0 ? `+$${stats.totalROI}` : `-$${Math.abs(stats.totalROI)}`}
                sub="per $100"
                color={stats.totalROI >= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <div className="w-px h-8 bg-white/6 shrink-0" />
              <StatCounter
                label="Best Odds"
                value={stats.bestOdds > 0 ? `+${stats.bestOdds}` : `${stats.bestOdds}`}
                color="text-amber-400"
              />
              {stats.bestProfit > 0 && (
                <>
                  <div className="w-px h-8 bg-white/6 shrink-0" />
                  <StatCounter label="Best Hit" value={`+$${stats.bestProfit}`} color="text-amber-400" />
                </>
              )}
              {stats.currentStreak > 1 && (
                <>
                  <div className="w-px h-8 bg-white/6 shrink-0" />
                  <StatCounter
                    label="Streak"
                    value={`${stats.currentStreak}${stats.streakType === "win" ? "W" : "L"}`}
                    color={stats.streakType === "win" ? "text-emerald-400" : "text-red-400"}
                  />
                </>
              )}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {/* Result filter */}
            <div className="flex gap-1 shrink-0">
              {(["all", "won", "lost"] as FilterResult[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterResult(f)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
                    filterResult === f
                      ? f === "won" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                        : f === "lost" ? "bg-red-500/12 text-red-400 border-red-500/25"
                        : "bg-primary/15 text-primary border-primary/30"
                      : "bg-white/3 text-muted-foreground/50 border-white/6 hover:bg-white/6"
                  )}
                  data-testid={`filter-tab-${f}`}
                >
                  {f === "all" ? "All" : f === "won" ? "Won" : "Lost"}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-white/8 shrink-0" />

            {/* Sport filter */}
            <button
              onClick={() => setFilterSport("all")}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold border transition-all shrink-0",
                filterSport === "all"
                  ? "bg-white/10 text-foreground border-white/20"
                  : "bg-white/3 text-muted-foreground/40 border-white/6 hover:bg-white/6"
              )}
              data-testid="filter-sport-all"
            >
              All Sports
            </button>
            {allSports.map(sport => {
              const sc = SPORT_COLORS[sport] ?? DEFAULT_COLOR;
              const isActive = filterSport === sport;
              return (
                <button
                  key={sport}
                  onClick={() => setFilterSport(sport)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border transition-all shrink-0",
                    isActive ? "border-opacity-40" : "bg-white/3 text-muted-foreground/40 border-white/6 hover:bg-white/6"
                  )}
                  style={isActive ? { background: `${sc.accent}18`, color: sc.accent, borderColor: `${sc.accent}40` } : undefined}
                  data-testid={`filter-sport-${sport.toLowerCase()}`}
                >
                  {SPORT_EMOJI[sport] ?? ""} {sport}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mx-auto">
                <Target className="w-10 h-10 text-muted-foreground/20" />
              </div>
              <div>
                <h3 className="font-black text-xl">No Results Yet</h3>
                <p className="text-sm text-muted-foreground/50 mt-1 max-w-xs mx-auto">
                  Ticket results will appear here once picks are settled by the engine.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Featured ticket (only when no filters active) */}
              {featured && filterResult === "all" && filterSport === "all" && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Top Result</span>
                  </div>
                  <FeaturedBanner ticket={featured} onShare={() => setSharingTicket(featured)} />
                </section>
              )}

              {/* Timeline groups */}
              {groups.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mx-auto">
                    {filterResult === "won" ? <Trophy className="w-7 h-7 text-muted-foreground/20" /> : <TrendingDown className="w-7 h-7 text-muted-foreground/20" />}
                  </div>
                  <div>
                    <h3 className="font-bold">No matching tickets</h3>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {filterSport !== "all" ? `No ${filterResult === "all" ? "" : filterResult + " "}results for ${filterSport}.` : `No ${filterResult === "all" ? "" : filterResult + " "}tickets match this filter.`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground/50" onClick={() => { setFilterResult("all"); setFilterSport("all"); }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-6" data-testid="showcase-ticket-list">
                  {groups.map(group => (
                    <section key={group.label}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-white/4" />
                        <span className="text-[10px] text-muted-foreground/25">{group.tickets.length} ticket{group.tickets.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2">
                        {group.tickets.map((ticket, i) => (
                          <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onShare={setSharingTicket}
                            index={i}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                  <div className="py-8 text-center space-y-2 border-t border-white/4">
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground/20" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/25">
                        Sors 46-Factor Intelligence Engine
                      </p>
                    </div>
                    <p className="text-[9px] text-muted-foreground/15">
                      All results are genuine settled picks · Auto-refreshes daily at midnight
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {sharingTicket && (
        <ShareModal ticket={sharingTicket} onClose={() => setSharingTicket(null)} />
      )}
    </div>
  );
}
