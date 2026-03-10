import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft, ChevronRight, Zap, TrendingUp, Clock } from "lucide-react";

interface SwipePick {
  id: string;
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  confidence: number;
  grade: string;
  edge: number;
  ev: number;
  reasoning: string;
  recommendation?: string;
  gameTime?: string;
  homeTeam: string;
  awayTeam: string;
}

interface SwipePickCardsProps {
  picks: SwipePick[];
  onAdd: (pick: SwipePick) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 40;

function gradeColor(grade: string) {
  if (grade.startsWith("S") || grade === "A+") return "text-violet-400";
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B+")) return "text-teal-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C+")) return "text-yellow-400";
  if (grade.startsWith("C")) return "text-slate-400";
  return "text-muted-foreground";
}

function gradeBg(grade: string) {
  if (grade.startsWith("S") || grade === "A+") return "bg-violet-500/15 border-violet-500/30 text-violet-400";
  if (grade.startsWith("A")) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
  if (grade.startsWith("B+")) return "bg-teal-500/15 border-teal-500/30 text-teal-400";
  if (grade.startsWith("B")) return "bg-blue-500/15 border-blue-500/30 text-blue-400";
  if (grade.startsWith("C+")) return "bg-yellow-500/15 border-yellow-500/30 text-yellow-400";
  if (grade.startsWith("C")) return "bg-slate-500/15 border-slate-500/30 text-slate-400";
  return "bg-muted/50 border-border/40 text-muted-foreground";
}

function gradeBorder(grade: string): string {
  if (grade.startsWith("S") || grade === "A+") return "border-l-violet-500";
  if (grade.startsWith("A")) return "border-l-emerald-500";
  if (grade.startsWith("B+")) return "border-l-teal-500";
  if (grade.startsWith("B")) return "border-l-blue-500";
  if (grade.startsWith("C+")) return "border-l-yellow-500";
  if (grade.startsWith("C")) return "border-l-slate-500";
  return "border-l-muted";
}

function formatOdds(o: number) {
  return o > 0 ? `+${o}` : `${o}`;
}

export function SwipePickCards({ picks, onAdd, onClose }: SwipePickCardsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [animatingOut, setAnimatingOut] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const activePicks = picks.filter((_, i) => !dismissed.has(i) && !added.has(i));
  const cardIdx = picks.findIndex((_, i) => !dismissed.has(i) && !added.has(i) && picks.indexOf(picks[i]) >= currentIdx);
  const pick = activePicks[0];
  const pickIdx = picks.indexOf(pick);

  const progress = picks.length > 0 ? Math.round(((picks.length - activePicks.length) / picks.length) * 100) : 0;

  const triggerAction = (direction: "left" | "right") => {
    setAnimatingOut(direction);
    setTimeout(() => {
      if (direction === "right" && pick) {
        onAdd(pick);
        setAdded(prev => new Set([...prev, pickIdx]));
      } else {
        setDismissed(prev => new Set([...prev, pickIdx]));
      }
      setDragX(0);
      setAnimatingOut(null);
      setCurrentIdx(prev => prev + 1);
    }, 260);
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
    if (dragX > SWIPE_THRESHOLD) {
      triggerAction("right");
    } else if (dragX < -SWIPE_THRESHOLD) {
      triggerAction("left");
    } else {
      setDragX(0);
    }
  };

  if (!pick) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">All Done!</h2>
          <p className="text-sm text-muted-foreground">
            You've reviewed all {picks.length} picks.{" "}
            {added.size > 0 ? `${added.size} added to your slip.` : "Nothing added — refresh for new picks."}
          </p>
          <Button onClick={onClose} className="w-full">Back to Picks</Button>
        </div>
      </div>
    );
  }

  const rotation = (dragX / window.innerWidth) * 18;
  const cardStyle = animatingOut
    ? {
        transform: `translateX(${animatingOut === "right" ? "110vw" : "-110vw"}) rotate(${animatingOut === "right" ? 18 : -18}deg)`,
        transition: "transform 0.26s cubic-bezier(0.2, 0, 0.3, 1)",
      }
    : {
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0.3, 1)",
      };

  const swipeRightOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const swipeLeftOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col" data-testid="swipe-pick-cards">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
          Exit
        </Button>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">Swipe Picks</p>
          <p className="text-[10px] text-muted-foreground">{activePicks.length} remaining · {added.size} added</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3 shrink-0">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card stack area */}
      <div className="flex-1 relative flex items-center justify-center px-4 select-none overflow-hidden">
        {/* Next card (behind) */}
        {activePicks[1] && (
          <div className="absolute inset-x-4 rounded-2xl border bg-card shadow-lg overflow-hidden opacity-60"
            style={{ transform: "scale(0.94) translateY(12px)", zIndex: 0 }}>
            <div className="p-5 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">{activePicks[1].sport}</Badge>
                <span className="text-xs text-muted-foreground truncate">{activePicks[1].game}</span>
              </div>
              <p className="text-sm font-semibold truncate">{activePicks[1].pick}</p>
            </div>
          </div>
        )}

        {/* Main card */}
        <div
          ref={cardRef}
          className={`absolute inset-x-4 rounded-2xl border-y border-r border-l-4 bg-card shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing ${gradeBorder(pick.grade)}`}
          style={{ ...cardStyle, zIndex: 1, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="swipe-card-main"
        >
          {/* Swipe indicators */}
          <div
            className="absolute inset-0 bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/50 z-10 pointer-events-none flex items-center justify-center"
            style={{ opacity: swipeRightOpacity }}
          >
            <div className="bg-emerald-500 text-white rounded-xl px-6 py-3 rotate-[-12deg]">
              <p className="text-xl font-black tracking-wider">ADD TO SLIP</p>
            </div>
          </div>
          <div
            className="absolute inset-0 bg-red-500/10 rounded-2xl border-2 border-red-500/50 z-10 pointer-events-none flex items-center justify-center"
            style={{ opacity: swipeLeftOpacity }}
          >
            <div className="bg-red-500 text-white rounded-xl px-6 py-3 rotate-[12deg]">
              <p className="text-xl font-black tracking-wider">SKIP</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Sport + grade header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-bold">{pick.sport}</Badge>
                <Badge variant="outline" className="text-[10px]">{pick.betType}</Badge>
              </div>
              <div 
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-sm ${gradeBg(pick.grade)}`}
              >
                <span className="text-2xl font-black tracking-tighter">
                  {pick.grade}
                </span>
              </div>
            </div>

            {/* Game */}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{pick.game}</p>
              {pick.gameTime && (
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pick.gameTime}
                </p>
              )}
            </div>

            {/* Pick */}
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-lg font-bold leading-tight">{pick.pick}</p>
              <p className="text-2xl font-black text-primary mt-1">{formatOdds(pick.odds)}</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Confidence</p>
                <p className="text-base font-bold">{pick.confidence}%</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Edge</p>
                <p className="text-base font-bold text-primary">+{pick.edge}%</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">EV</p>
                <p className="text-base font-bold text-emerald-400">+{pick.ev.toFixed(1)}%</p>
              </div>
            </div>

            {/* Reasoning */}
            {pick.reasoning && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{pick.reasoning}</p>
            )}
          </div>
        </div>

        {/* Swipe hint (shown briefly) */}
        {dragX === 0 && !animatingOut && activePicks.length === picks.length && (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 pointer-events-none">
            <div className="flex items-center gap-1 text-red-400/60">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] font-medium">Skip</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400/60">
              <span className="text-[10px] font-medium">Add to Slip</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center justify-center gap-8 px-4 py-6 shrink-0">
        <button
          onClick={() => triggerAction("left")}
          className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all"
          data-testid="button-swipe-skip"
          aria-label="Skip pick"
        >
          <X className="w-6 h-6 text-red-400" />
        </button>

        <button
          onClick={() => triggerAction("right")}
          className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center hover:bg-emerald-500/25 active:scale-95 transition-all"
          data-testid="button-swipe-add"
          aria-label="Add pick to slip"
        >
          <Check className="w-7 h-7 text-emerald-400" />
        </button>
      </div>
    </div>
  );
}
