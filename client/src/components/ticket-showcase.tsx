import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Check, X, Trophy, TrendingDown, Sparkles, CircleDollarSign,
  Calendar, ChevronRight, Star, Share2, Copy, CheckCheck
} from "lucide-react";
import { gradeAmbientGlow, getGradeShimmerClass } from "@/lib/grade-utils";

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

function ShareProofModal({ ticket, onClose }: { ticket: ShowcaseTicket; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isWin = ticket.result === "won";
  const accent = isWin ? "#22c55e" : "#ef4444";
  const accentAlt = isWin ? "#16a34a" : "#dc2626";

  const formatText = () => {
    const header = `${isWin ? "🏆" : "📊"} SORS MAXIMA — ${isWin ? "WINNING" : "SETTLED"} TICKET`;
    const divider = "─".repeat(34);
    const odds = `Combined Odds: ${ticket.combinedOdds > 0 ? "+" : ""}${ticket.combinedOdds}`;
    const payoutLine = `Payout: $${ticket.payout} (+$${ticket.profit} profit)`;
    const date = `Date: ${formatDate(ticket.date)}`;
    const legs = ticket.legs.map((l, i) =>
      `${i + 1}. ${sportEmoji(l.sport)} ${l.pick} (${l.odds > 0 ? "+" : ""}${l.odds}) — ${l.result === "won" ? "✓ WON" : "✗ LOST"}`
    ).join("\n");
    const footer = `\nPowered by Sors 46-Factor Engine\nsorsmaxima.com`;
    return [header, divider, odds, payoutLine, date, "", legs, footer].join("\n");
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(formatText()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as any).share({ title: "Sors Maxima — Ticket", text: formatText() }); return; } catch {}
    }
    handleCopy();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setTilt({ x: -(ny - 0.5) * 14, y: (nx - 0.5) * 14 });
    setGlowPos({ x: nx * 100, y: ny * 100 });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
      data-testid="share-proof-modal"
    >
      <div
        className="w-full max-w-sm"
        style={{ perspective: "900px" }}
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setGlowPos({ x: 50, y: 50 }); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* Outer glow ring — gold for wins, silver for other */}
        <div style={{
          padding: "2px",
          borderRadius: "20px",
          background: isWin
            ? "linear-gradient(135deg, #22c55e, #ffd700, #22c55e, #00bfff, #ffd700, #22c55e)"
            : "linear-gradient(135deg, #ef4444, #f97316, #ef4444, #dc2626)",
          backgroundSize: "300% 300%",
          animation: "holo-shift 4s ease infinite",
          boxShadow: `0 0 50px ${accent}55, 0 0 120px ${accent}22, 0 24px 80px rgba(0,0,0,0.9)`,
        }}>
          <div
            ref={cardRef}
            style={{
              borderRadius: "18px",
              background: isWin
                ? "linear-gradient(160deg, #050e0a 0%, #08130c 50%, #040a07 100%)"
                : "linear-gradient(160deg, #0f0505 0%, #170808 50%, #0b0404 100%)",
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: isHovered ? "transform 0.08s ease-out" : "transform 0.4s ease-out",
              transformStyle: "preserve-3d",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background dot pattern */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }} />

            {/* Diagonal grid */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: `repeating-linear-gradient(55deg, transparent, transparent 36px, rgba(255,255,255,0.015) 36px, rgba(255,255,255,0.015) 38px)`,
            }} />

            {/* Holographic shimmer */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: isWin
                ? `linear-gradient(125deg, transparent 15%, rgba(34,197,94,0.08) 28%, rgba(255,215,0,0.07) 38%, rgba(0,191,255,0.07) 48%, rgba(34,197,94,0.08) 58%, transparent 72%)`
                : `linear-gradient(125deg, transparent 15%, rgba(239,68,68,0.08) 30%, rgba(249,115,22,0.07) 45%, rgba(239,68,68,0.08) 60%, transparent 72%)`,
              backgroundSize: "300% 300%",
              animation: "holo-pulse 3s ease-in-out infinite",
              mixBlendMode: "screen",
            } as React.CSSProperties} />

            {/* Moving light sweep */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              <div style={{
                position: "absolute", width: "70px", height: "200%", top: "-50%", left: 0,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)",
                animation: "holo-sweep 9s ease-in-out infinite",
              }} />
            </div>

            {/* Mouse glow */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${accent}22 0%, transparent 55%)`,
              transition: "background 0.06s",
            }} />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Top rainbow bar */}
              <div style={{
                height: "4px",
                background: isWin
                  ? "linear-gradient(90deg, #22c55e, #ffd700, #00bfff, #22c55e, #ffd700)"
                  : "linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #ef4444)",
                backgroundSize: "200% 100%",
                animation: "holo-rainbow-bar 3s linear infinite",
              }} />

              {/* Header */}
              <div style={{
                padding: "14px 18px 10px",
                borderBottom: `1px solid ${accent}20`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{
                    fontSize: "8px", fontWeight: 900, letterSpacing: "0.35em", textTransform: "uppercase",
                    background: "linear-gradient(135deg, #8898c8, #c0cce8, #8898c8)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "3px",
                  }}>SORS MAXIMA</div>
                  <div style={{
                    fontSize: "17px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase",
                    background: `linear-gradient(135deg, ${accent}, #ffffff 50%, ${accent})`,
                    backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    animation: "holo-shift 4s ease infinite",
                  }}>
                    {isWin ? "🏆 WINNING TICKET" : "SETTLED TICKET"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "9px", color: `${accent}80`, marginBottom: "2px" }}>{formatDate(ticket.date)}</div>
                  <div style={{
                    fontSize: "22px", fontWeight: 900, fontFamily: "monospace",
                    color: accent, textShadow: `0 0 14px ${accent}80`,
                  }}>
                    {ticket.combinedOdds > 0 ? "+" : ""}{ticket.combinedOdds}
                  </div>
                </div>
              </div>

              {/* Legs */}
              <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {ticket.legs.map((leg, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                    borderRadius: "8px",
                    background: leg.result === "won" ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.05)",
                    border: `1px solid ${leg.result === "won" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.10)"}`,
                  }}>
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                      background: leg.result === "won" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px",
                    }}>
                      {leg.result === "won" ? "✓" : "✗"}
                    </div>
                    <span style={{ fontSize: "10px", flexShrink: 0 }}>{sportEmoji(leg.sport)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.9)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{leg.pick}</div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
                        {leg.sport} · {leg.odds > 0 ? "+" : ""}{leg.odds}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "4px",
                      background: leg.result === "won" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.15)",
                      color: leg.result === "won" ? "#22c55e" : "#f87171",
                    }}>{leg.grade}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={{
                margin: "0 18px 14px", padding: "11px 16px", borderRadius: "10px",
                border: `1px solid ${accent}40`,
                background: `linear-gradient(135deg, ${accent}12, rgba(255,255,255,0.02))`,
                display: "flex", alignItems: "center", justifyContent: "space-around",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2px" }}>Payout</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: accent, lineHeight: 1, textShadow: `0 0 12px ${accent}70` }}>${ticket.payout}</div>
                </div>
                <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2px" }}>Profit</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>+${ticket.profit}</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: "10px 18px 15px", borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
                  46-Factor Intelligence
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "6px 12px", borderRadius: "8px",
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      color: copied ? "#22c55e" : "rgba(255,255,255,0.75)",
                      fontSize: "9px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                    }}
                    data-testid="button-share-copy"
                  >
                    {copied ? "✓ COPIED" : "COPY"}
                  </button>
                  <button
                    onClick={handleShare}
                    style={{
                      padding: "6px 16px", borderRadius: "8px",
                      background: `linear-gradient(135deg, ${accent}90, ${accent}55)`,
                      border: `1px solid ${accent}70`,
                      color: "#fff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.1em",
                      textTransform: "uppercase", cursor: "pointer", boxShadow: `0 0 12px ${accent}45`,
                    }}
                    data-testid="button-share-send"
                  >
                    SHARE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        Tap outside to close
      </p>
    </div>
  );
}

function computeTicketGrade(legs: ShowcaseLeg[]): string {
  if (!legs || legs.length === 0) return "C";
  if (legs.length === 1) return legs[0].grade;

  const gradeMap: Record<string, number> = {
    "A+": 10, "A": 9, "B+": 8, "B": 7, "C+": 6, "C": 5, "D": 4, "F": 3
  };
  const reverseMap: Record<number, string> = {
    10: "A+", 9: "A", 8: "B+", 7: "B", 6: "C+", 5: "C", 4: "D", 3: "F"
  };

  const sum = legs.reduce((acc, leg) => acc + (gradeMap[leg.grade] || 5), 0);
  const avg = Math.floor(sum / legs.length);
  return reverseMap[avg] || "C";
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
  const [sharingTicket, setSharingTicket] = useState<ShowcaseTicket | null>(null);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = tickets.filter((_, i) => !seen.has(i));
  const ticket = active[0];
  const ticketGrade = ticket ? computeTicketGrade(ticket.legs) : "C";
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
          } ${getGradeShimmerClass(ticketGrade)}`}
          style={{
            ...cardStyle,
            ...gradeAmbientGlow(ticketGrade),
            zIndex: 1,
            boxShadow: isWin
              ? `${gradeAmbientGlow(ticketGrade).boxShadow}, 0 0 50px rgba(34,197,94,0.35), 0 0 100px rgba(34,197,94,0.15), 0 8px 32px rgba(0,0,0,0.4)`
              : `${gradeAmbientGlow(ticketGrade).boxShadow}, 0 0 50px rgba(239,68,68,0.35), 0 0 100px rgba(239,68,68,0.15), 0 8px 32px rgba(0,0,0,0.4)`,
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
                    <span className="text-[10px] font-bold text-muted-foreground">{leg.grade}</span>
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
            {isWin && <span className="ml-2 text-emerald-400/60">· Tap Share to post your proof</span>}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-8 pb-6 shrink-0 flex items-center justify-center gap-4">
        <button
          onClick={() => triggerAction("left")}
          className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center shadow-lg hover:border-red-500/60 hover:bg-red-500/5 transition-colors"
          data-testid="button-showcase-skip"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Share button — visible for winning tickets */}
        {isWin && (
          <button
            onClick={() => setSharingTicket(ticket)}
            className="w-12 h-12 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center shadow-lg hover:bg-emerald-500/20 transition-colors"
            data-testid="button-showcase-share"
          >
            <Share2 className="w-5 h-5 text-emerald-400" />
          </button>
        )}

        <button
          onClick={() => triggerAction("right")}
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-xl transition-colors ${
            isWin
              ? "border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20"
          }`}
          data-testid="button-showcase-save"
        >
          <Star className={`w-6 h-6 ${isWin ? "text-emerald-400" : "text-amber-400"}`} />
        </button>

        {!isWin && <div className="w-12 h-12" />}

        <button
          onClick={() => triggerAction("left")}
          className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 bg-background flex items-center justify-center shadow-lg hover:border-muted-foreground/60 transition-colors"
          data-testid="button-showcase-next"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Share proof modal */}
      {sharingTicket && (
        <ShareProofModal ticket={sharingTicket} onClose={() => setSharingTicket(null)} />
      )}
    </div>
  );
}
