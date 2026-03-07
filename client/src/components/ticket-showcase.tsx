import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Check, X, Trophy, TrendingDown, Sparkles, CircleDollarSign,
  Calendar, ChevronRight, Star
} from "lucide-react";

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

const SWIPE_THRESHOLD = 80;

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

function formatDate(d: string) {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sportEmoji(s: string) {
  const map: Record<string, string> = {
    NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾", NCAAB: "🏀", MMA: "🥊", SOCCER: "⚽",
  };
  return map[s] || "🎯";
}

function gradeColor(g: string) {
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-blue-400";
  if (g.startsWith("C")) return "text-yellow-400";
  return "text-muted-foreground";
}

export function TicketShowcase({ onClose }: TicketShowcaseProps) {
  const { data, isLoading } = useQuery<{ tickets: ShowcaseTicket[]; stats: { winning: number; losing: number } }>({
    queryKey: ["/api/showcase-tickets"],
  });

  const tickets = data?.tickets ?? [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<"left" | "right" | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = tickets.filter((_, i) => !seen.has(i));
  const ticket = active[0];
  const ticketIdx = tickets.indexOf(ticket);
  const progress = tickets.length > 0 ? Math.round((seen.size / tickets.length) * 100) : 0;

  const triggerAction = (dir: "left" | "right") => {
    setAnimatingOut(dir);
    setTimeout(() => {
      if (dir === "right") setLiked(prev => new Set([...prev, ticketIdx]));
      setSeen(prev => new Set([...prev, ticketIdx]));
      setDragX(0);
      setAnimatingOut(null);
      setCurrentIdx(prev => prev + 1);
    }, 280);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (animatingOut) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startXRef.current);
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) triggerAction("right");
    else if (dragX < -SWIPE_THRESHOLD) triggerAction("left");
    else setDragX(0);
  };

  const isWin = ticket?.result === "won";
  const swipeRightOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const swipeLeftOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

  const rotation = (dragX / (typeof window !== "undefined" ? window.innerWidth : 400)) * 15;
  const cardStyle = animatingOut
    ? {
        transform: `translateX(${animatingOut === "right" ? "110vw" : "-110vw"}) rotate(${animatingOut === "right" ? 15 : -15}deg)`,
        transition: "transform 0.28s cubic-bezier(0.2, 0, 0.3, 1)",
      }
    : {
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.2, 0, 0.3, 1)",
      };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex items-center justify-center" data-testid="ticket-showcase-loading">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading ticket showcase…</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    const wonCount = Array.from(liked).filter(i => tickets[i]?.result === "won").length;
    return (
      <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col items-center justify-center p-6" data-testid="ticket-showcase-done">
        <div className="text-center space-y-5 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Showcase Complete</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You reviewed {tickets.length} tickets — {wonCount} winners saved.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-emerald-400 font-bold text-lg">{data?.stats.winning ?? 0}</p>
              <p className="text-muted-foreground text-xs">Winning tickets</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-red-400 font-bold text-lg">{data?.stats.losing ?? 0}</p>
              <p className="text-muted-foreground text-xs">Losing tickets</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            These are real picks from the Sors Intelligence system. Build your own optimized tickets using the Smart Ticket Generator.
          </p>
          <Button onClick={onClose} className="w-full" data-testid="button-showcase-close-done">
            Back to Command Center
          </Button>
        </div>
      </div>
    );
  }

  const nextTicket = active[1];

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col" data-testid="ticket-showcase">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-muted-foreground" data-testid="button-showcase-back">
          <ChevronLeft className="w-4 h-4" />
          Exit
        </Button>
        <div className="text-center">
          <p className="text-xs font-semibold">Ticket Showcase</p>
          <p className="text-[10px] text-muted-foreground">{active.length} remaining · {liked.size} saved</p>
        </div>
        <div className="w-16 flex justify-end">
          <Badge variant="outline" className="text-[10px]">
            {tickets.filter(t => t.result === "won").length}W / {tickets.filter(t => t.result === "lost").length}L
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3 shrink-0">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Hint labels */}
      <div className="relative px-4 shrink-0 h-7 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 transition-opacity duration-100" style={{ opacity: swipeLeftOpacity }}>
          <div className="rounded-md border-2 border-red-500 px-3 py-0.5">
            <span className="text-red-500 font-black text-sm tracking-widest">SKIP</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 transition-opacity duration-100" style={{ opacity: swipeRightOpacity }}>
          <div className="rounded-md border-2 border-emerald-500 px-3 py-0.5">
            <span className="text-emerald-500 font-black text-sm tracking-widest">SAVE</span>
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative flex items-center justify-center px-4 select-none overflow-hidden pb-4">
        {/* Back card peek */}
        {nextTicket && (
          <div
            className={`absolute inset-x-4 rounded-2xl border overflow-hidden opacity-50 ${
              nextTicket.result === "won"
                ? "border-emerald-500/20 bg-card"
                : "border-red-500/20 bg-card"
            }`}
            style={{ transform: "scale(0.93) translateY(14px)", zIndex: 0 }}
          >
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {nextTicket.legs.slice(0, 2).map((l, i) => (
                  <span key={i} className="text-xs">{sportEmoji(l.sport)}</span>
                ))}
                <Badge variant={nextTicket.result === "won" ? "default" : "destructive"} className="text-[10px] ml-auto">
                  {nextTicket.result === "won" ? "WON" : "LOST"}
                </Badge>
              </div>
              <p className="text-sm font-medium truncate">{nextTicket.legs[0]?.pick}</p>
            </div>
          </div>
        )}

        {/* Main card */}
        <div
          ref={cardRef}
          className={`absolute inset-x-4 rounded-2xl border-2 overflow-hidden cursor-grab active:cursor-grabbing ${
            isWin
              ? "border-emerald-500/40 bg-card"
              : "border-red-500/40 bg-card"
          }`}
          style={{
            ...cardStyle,
            zIndex: 1,
            boxShadow: isWin
              ? `0 0 50px rgba(34,197,94,0.35), 0 0 100px rgba(34,197,94,0.15), 0 8px 32px rgba(0,0,0,0.4)`
              : `0 0 50px rgba(239,68,68,0.35), 0 0 100px rgba(239,68,68,0.15), 0 8px 32px rgba(0,0,0,0.4)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid={`showcase-card-${ticket.id}`}
        >
          {/* Card glow overlay */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isWin
                ? "bg-gradient-to-b from-emerald-500/8 via-transparent to-emerald-500/5"
                : "bg-gradient-to-b from-red-500/8 via-transparent to-red-500/5"
            }`}
          />

          {/* Header band */}
          <div
            className={`flex items-center justify-between px-5 py-3 border-b ${
              isWin ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              {isWin ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
              )}
              <div>
                <p className={`text-sm font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                  {isWin ? "WINNING TICKET" : "LOSING TICKET"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(ticket.date)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Combined Odds</p>
              <p className={`text-xl font-black tabular-nums ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                {formatOdds(ticket.combinedOdds)}
              </p>
            </div>
          </div>

          {/* Legs */}
          <div className="p-4 space-y-2.5">
            {ticket.legs.map((leg, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  leg.result === "won"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
                data-testid={`showcase-leg-${i}`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  leg.result === "won" ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}>
                  {leg.result === "won"
                    ? <Check className="w-3 h-3 text-emerald-400" />
                    : <X className="w-3 h-3 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[10px]">{sportEmoji(leg.sport)}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{leg.sport}</Badge>
                    <span className={`text-[10px] font-bold ${gradeColor(leg.grade)}`}>{leg.grade}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-0.5">{leg.game}</p>
                  <p className="text-sm font-semibold leading-tight">{leg.pick}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${
                    leg.odds > 0 ? "text-emerald-400" : "text-foreground"
                  }`}>
                    {formatOdds(leg.odds)}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">{leg.betType.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Payout footer */}
          <div className={`mx-4 mb-4 rounded-xl border p-3 ${
            isWin
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className={`w-4 h-4 ${isWin ? "text-emerald-400" : "text-red-400"}`} />
                <div>
                  <p className="text-[10px] text-muted-foreground">$100 stake</p>
                  <p className="text-xs font-medium">
                    {isWin ? "Would have paid out" : "Would have lost"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black tabular-nums ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                  {isWin ? `$${ticket.payout}` : `-$100`}
                </p>
                {isWin && (
                  <p className="text-[10px] text-emerald-400/70">+${ticket.profit} profit</p>
                )}
              </div>
            </div>
          </div>

          {/* Swipe hint */}
          <p className="text-center text-[10px] text-muted-foreground pb-3">
            Swipe right to save · Swipe left to skip
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-8 pb-6 shrink-0 flex items-center justify-center gap-6">
        <button
          onClick={() => triggerAction("left")}
          className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center shadow-lg hover:border-red-500/60 hover:bg-red-500/5 transition-colors"
          data-testid="button-showcase-skip"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <button
          onClick={() => triggerAction("right")}
          className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-xl transition-colors ${
            isWin
              ? "border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20"
          }`}
          data-testid="button-showcase-save"
        >
          <Star className={`w-7 h-7 ${isWin ? "text-emerald-400" : "text-amber-400"}`} />
        </button>
        <button
          onClick={() => triggerAction("left")}
          className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center shadow-lg hover:border-muted-foreground/60 transition-colors"
          data-testid="button-showcase-next"
        >
          <ChevronRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
