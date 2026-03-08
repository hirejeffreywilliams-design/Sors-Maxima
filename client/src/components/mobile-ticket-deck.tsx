import { useState, useRef, useEffect, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Fingerprint } from "lucide-react";
import { gradeAmbientGlow } from "@/lib/grade-utils";

interface MobileTicketDeckProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => ReactNode;
  getGrade: (item: T) => string;
  emptyMessage?: string;
  label?: string;
}

const GRADE_ORDER: Record<string, number> = {
  "A+": 0, "A": 1, "B+": 2, "B": 3, "C+": 4, "C": 5, "D": 6, "F": 7,
};

const GRADE_BADGE_COLORS: Record<string, string> = {
  "A+": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "A":  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "B+": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "B":  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "C+": "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  "C":  "bg-muted text-muted-foreground border-muted",
  "D":  "bg-red-500/10 text-red-400 border-red-500/20",
  "F":  "bg-muted/50 text-muted-foreground/60 border-muted",
};

export function MobileTicketDeck<T>({
  items,
  renderCard,
  getGrade,
  emptyMessage = "No items available",
  label = "Intelligence Tickets",
}: MobileTicketDeckProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const sortedItems = [...items].sort((a, b) => {
    const gradeA = getGrade(a);
    const gradeB = getGrade(b);
    return (GRADE_ORDER[gradeA] ?? 8) - (GRADE_ORDER[gradeB] ?? 8);
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (sortedItems.length === 0) {
    return (
      <div className="md:hidden py-8 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setShowHint(false);
  };
  const handleNext = () => {
    setCurrentIndex(prev => Math.min(sortedItems.length - 1, prev + 1));
    setShowHint(false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = e.clientX;
    isDragging && setIsDragging(false);
    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null) return;
    setDragX(e.clientX - startXRef.current);
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX < -60) handleNext();
    else if (dragX > 60) handlePrev();
    setDragX(0);
    startXRef.current = null;
  };

  const currentItem = sortedItems[currentIndex];
  const currentGrade = getGrade(currentItem);
  const gradeBadgeClass = GRADE_BADGE_COLORS[currentGrade] || GRADE_BADGE_COLORS["F"];

  const peekCard2 = currentIndex + 2 < sortedItems.length ? sortedItems[currentIndex + 2] : null;
  const peekCard1 = currentIndex + 1 < sortedItems.length ? sortedItems[currentIndex + 1] : null;

  return (
    <div
      className="md:hidden space-y-3 py-2"
      data-testid={`mobile-deck-${label.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-2 py-0 font-bold ${gradeBadgeClass}`}>
            {currentGrade} Grade
          </Badge>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {sortedItems.length}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">
          {label}
        </span>
      </div>

      {/* Card stack */}
      <div
        className="relative w-full"
        style={{ height: "clamp(420px, 62svh, 540px)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Card 3 (back of stack) */}
        {peekCard2 && (
          <div
            className="absolute inset-x-0 top-0 rounded-2xl border bg-card/30"
            style={{
              height: "100%",
              transform: "translateY(14px) scaleX(0.90)",
              transformOrigin: "bottom center",
              zIndex: 0,
              opacity: 0.18,
              ...gradeAmbientGlow(getGrade(peekCard2)),
            }}
          />
        )}
        {/* Card 2 (middle of stack) */}
        {peekCard1 && (
          <div
            className="absolute inset-x-0 top-0 rounded-2xl border bg-card/50"
            style={{
              height: "100%",
              transform: "translateY(7px) scaleX(0.95)",
              transformOrigin: "bottom center",
              zIndex: 1,
              opacity: 0.45,
              ...gradeAmbientGlow(getGrade(peekCard1)),
            }}
          />
        )}

        {/* Main card */}
        <div
          className="absolute inset-0 z-10 overflow-hidden rounded-2xl"
          style={{
            transform: isDragging ? `translateX(${dragX}px) rotate(${dragX / 20}deg)` : "translateX(0) rotate(0deg)",
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2,0,0.3,1)",
            ...gradeAmbientGlow(currentGrade),
          }}
        >
          {/* Swipe hint overlays */}
          <div
            className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-2xl"
            style={{
              opacity: Math.max(0, Math.min(1, dragX / 80)),
              background: "rgba(34,197,94,0.08)",
              border: "2px solid rgba(34,197,94,0.3)",
            }}
          >
            <div className="border-2 border-emerald-500 px-5 py-1.5 rounded-xl">
              <span className="text-emerald-500 font-black text-lg tracking-widest">NEXT →</span>
            </div>
          </div>
          <div
            className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-2xl"
            style={{
              opacity: Math.max(0, Math.min(1, -dragX / 80)),
              background: "rgba(99,102,241,0.08)",
              border: "2px solid rgba(99,102,241,0.3)",
            }}
          >
            <div className="border-2 border-indigo-500 px-5 py-1.5 rounded-xl">
              <span className="text-indigo-400 font-black text-lg tracking-widest">← PREV</span>
            </div>
          </div>
          {renderCard(currentItem, currentIndex)}
        </div>

        {/* Swipe hint */}
        {showHint && (
          <div className="absolute inset-x-0 -bottom-7 flex justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] text-primary font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-bounce">
              <Fingerprint className="w-3 h-3" />
              Swipe or use arrows
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pt-3">
        <Button
          size="icon"
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-full w-11 h-11 border-primary/20 hover:bg-primary/5 disabled:opacity-25"
          data-testid="button-prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex gap-1.5">
          {sortedItems.slice(0, Math.min(sortedItems.length, 7)).map((_, i) => {
            const dotIndex = sortedItems.length > 7
              ? Math.floor((i / 6) * (sortedItems.length - 1))
              : i;
            const isActive = sortedItems.length > 7
              ? currentIndex >= Math.floor((i / 6) * (sortedItems.length - 1)) &&
                (i === 6 || currentIndex < Math.floor(((i + 1) / 6) * (sortedItems.length - 1)))
              : currentIndex === dotIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(dotIndex)}
                className={`rounded-full transition-all duration-300 ${
                  isActive ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-primary/20 hover:bg-primary/40"
                }`}
              />
            );
          })}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === sortedItems.length - 1}
          className="rounded-full w-11 h-11 border-primary/20 hover:bg-primary/5 disabled:opacity-25"
          data-testid="button-next"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
