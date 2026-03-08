import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, Trophy, TrendingDown, CheckCircle2, XCircle,
  Copy, CheckCheck, Share2, BarChart3, Calendar, ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShowcaseLeg {
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  result: "won" | "lost";
}

interface ShowcaseTicket {
  id: string;
  date: string;
  result: "won" | "lost";
  legs: ShowcaseLeg[];
  combinedOdds: number;
  stake: number;
  payout: number;
  profit: number;
}

interface TicketShowcaseProps {
  onClose: () => void;
}

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾",
  NCAAB: "🏀", NCAAF: "🏈", MMA: "🥊", SOCCER: "⚽",
  UFC: "🥊", TENNIS: "🎾", GOLF: "⛳",
};

function fmtOdds(o: number) { return o > 0 ? `+${o}` : `${o}`; }

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function gradeColor(g: string) {
  if (g === "A+") return "text-amber-400";
  if (g.startsWith("A")) return "text-emerald-400";
  if (g === "B+") return "text-teal-400";
  if (g.startsWith("B")) return "text-blue-400";
  if (g.startsWith("C")) return "text-yellow-400";
  return "text-muted-foreground";
}

function TicketCard({ ticket, onShare }: { ticket: ShowcaseTicket; onShare: (t: ShowcaseTicket) => void }) {
  const isWin = ticket.result === "won";
  const accent = isWin ? "emerald" : "red";

  return (
    <Card
      className={`relative overflow-hidden border transition-all duration-200 hover:shadow-lg ${
        isWin
          ? "border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 via-card to-card hover:border-emerald-500/45"
          : "border-red-500/20 bg-gradient-to-br from-red-950/20 via-card to-card hover:border-red-500/35"
      }`}
      data-testid={`card-showcase-${ticket.id}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWin ? "bg-emerald-500" : "bg-red-500"}`} />

      <CardContent className="pl-5 pr-4 pt-4 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${
              isWin
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/12 text-red-400 border border-red-500/25"
            }`}>
              {isWin
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Won</>
                : <><XCircle className="w-3.5 h-3.5" /> Lost</>
              }
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {fmtDate(ticket.date)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg font-black font-mono ${isWin ? "text-emerald-400" : "text-muted-foreground"}`}>
              {fmtOdds(ticket.combinedOdds)}
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Combined Odds</div>
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-1.5">
          {ticket.legs.map((leg, i) => {
            const legWon = leg.result === "won";
            return (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                  legWon
                    ? "bg-emerald-500/5 border-emerald-500/15"
                    : "bg-red-500/5 border-red-500/12"
                }`}
                data-testid={`leg-showcase-${ticket.id}-${i}`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
                  legWon ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {legWon ? "✓" : "✗"}
                </div>
                <span className="text-base leading-none shrink-0">{SPORT_EMOJI[leg.sport] ?? "🎯"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-foreground/90">{leg.pick}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{leg.game}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-right">
                  <span className="font-mono text-muted-foreground">{fmtOdds(leg.odds)}</span>
                  <span className={`font-black text-[10px] ${gradeColor(leg.grade)}`}>{leg.grade}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payout row */}
        <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
          isWin ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/5 border-red-500/12"
        }`}>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Stake</span>
              <span className="font-bold">${ticket.stake}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Payout</span>
              <span className={`font-black ${isWin ? "text-emerald-400" : "text-muted-foreground"}`}>
                ${ticket.payout}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">P&L</span>
              <span className={`font-black ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                {isWin ? "+" : ""}{ticket.profit}
              </span>
            </div>
          </div>
          {isWin && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[10px] font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              onClick={() => onShare(ticket)}
              data-testid={`button-share-${ticket.id}`}
            >
              <Share2 className="w-3 h-3" /> Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ShareModal({ ticket, onClose }: { ticket: ShowcaseTicket; onClose: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const text = [
    `🏆 SORS MAXIMA — WINNING TICKET`,
    `${"─".repeat(32)}`,
    `Combined Odds: ${fmtOdds(ticket.combinedOdds)}`,
    `Payout: $${ticket.payout}  (+$${ticket.profit} profit)`,
    `Date: ${fmtDate(ticket.date)}`,
    ``,
    ...ticket.legs.map((l, i) =>
      `${i + 1}. ${SPORT_EMOJI[l.sport] ?? "🎯"} ${l.pick} (${fmtOdds(l.odds)}) — ${l.result === "won" ? "✓ WON" : "✗ LOST"}`
    ),
    ``,
    `Powered by Sors 46-Factor Engine`,
    `sorsmaxima.com`,
  ].join("\n");

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Copied to clipboard", description: "Paste it anywhere to share." });
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as any).share({ title: "Sors Maxima — Winning Ticket", text }); return; } catch {}
    }
    handleCopy();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
      data-testid="share-proof-modal"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 via-background to-background"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 bg-[length:200%_100%] animate-[holo-rainbow-bar_3s_linear_infinite]" />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Sors Maxima™</p>
              <h3 className="text-lg font-black text-emerald-400">🏆 Winning Ticket</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-white/6">
            <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
              {text}
            </pre>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 font-bold"
              onClick={handleCopy}
              data-testid="button-share-copy"
            >
              {copied ? <><CheckCheck className="w-4 h-4 text-emerald-400" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Text</>}
            </Button>
            <Button
              className="flex-1 gap-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handleShare}
              data-testid="button-share-send"
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FilterTab = "all" | "won" | "lost";

export function TicketShowcase({ onClose }: TicketShowcaseProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sharingTicket, setSharingTicket] = useState<ShowcaseTicket | null>(null);

  const { data, isLoading } = useQuery<{
    tickets: ShowcaseTicket[];
    stats: { winning: number; losing: number };
  }>({ queryKey: ["/api/showcase-tickets"] });

  const tickets = data?.tickets ?? [];

  const visible = tickets.filter(t =>
    filter === "all" ? true : t.result === filter
  );

  const winCount = tickets.filter(t => t.result === "won").length;
  const loseCount = tickets.filter(t => t.result === "lost").length;
  const winRate = tickets.length > 0 ? Math.round((winCount / tickets.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      data-testid="ticket-showcase"
    >
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-1.5 text-muted-foreground"
            data-testid="button-showcase-back"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1">
            <h2 className="font-black text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Ticket Showcase
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Real results from the Sors 46-Factor Intelligence Engine
            </p>
          </div>
        </div>

        {/* Stats bar */}
        {!isLoading && tickets.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{tickets.length} tickets</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-emerald-400">{winCount} Won</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="font-bold text-red-400">{loseCount} Lost</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-sm">
              <div className={`font-black text-base ${winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {winRate}%
              </div>
              <span className="text-muted-foreground text-xs">Win Rate</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-1.5">
          {(["all", "won", "lost"] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                filter === tab
                  ? tab === "won"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : tab === "lost"
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent"
              }`}
              data-testid={`filter-tab-${tab}`}
            >
              {tab === "all" ? `All (${tickets.length})` : tab === "won" ? `Won (${winCount})` : `Lost (${loseCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                {filter === "won"
                  ? <Trophy className="w-8 h-8 text-muted-foreground/40" />
                  : <TrendingDown className="w-8 h-8 text-muted-foreground/40" />
                }
              </div>
              <div>
                <h3 className="font-bold text-lg">No {filter === "all" ? "" : filter} tickets yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === "all"
                    ? "Ticket results will appear here once picks are settled."
                    : `No ${filter === "won" ? "winning" : "losing"} tickets to show. Try viewing All.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3" data-testid="showcase-ticket-list">
              {visible.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onShare={setSharingTicket}
                />
              ))}
              <div className="py-6 text-center space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                  Sors 46-Factor Intelligence Engine
                </p>
                <p className="text-[10px] text-muted-foreground/30">
                  All results are real settled picks — no simulated data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {sharingTicket && (
        <ShareModal
          ticket={sharingTicket}
          onClose={() => setSharingTicket(null)}
        />
      )}
    </div>
  );
}
