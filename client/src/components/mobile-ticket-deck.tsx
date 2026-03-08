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
  "A+": 0,
  "A": 1,
  "B+": 2,
  "B": 3,
  "C+": 4,
  "C": 5,
  "D": 6,
  "F": 7,
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
  const touchStartX = useRef<number | null>(null);

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
      <div className="md:hidden py-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setShowHint(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < sortedItems.length - 1 ? prev + 1 : prev));
    setShowHint(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const currentItem = sortedItems[currentIndex];
  const currentGrade = getGrade(currentItem);

  return (
    <div className="md:hidden space-y-4 py-4" data-testid={`mobile-deck-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Viewing: {currentGrade} Grade
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {currentIndex + 1} / {sortedItems.length}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
          {label}
        </span>
      </div>

      <div 
        className="relative h-[450px] w-full px-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Stack visual effect */}
        {currentIndex + 2 < sortedItems.length && (
          <div 
            className="absolute left-4 right-4 top-2 h-full rounded-xl border bg-card/40 opacity-20 transition-all duration-300"
            style={{ 
              transform: "translateY(16px) scale(0.92)",
              zIndex: 0,
              ...gradeAmbientGlow(getGrade(sortedItems[currentIndex + 2]))
            }}
          />
        )}
        {currentIndex + 1 < sortedItems.length && (
          <div 
            className="absolute left-3 right-3 top-1 h-full rounded-xl border bg-card/60 opacity-50 transition-all duration-300"
            style={{ 
              transform: "translateY(8px) scale(0.96)",
              zIndex: 1,
              ...gradeAmbientGlow(getGrade(sortedItems[currentIndex + 1]))
            }}
          />
        )}

        {/* Main Card */}
        <div className="relative z-10 h-full w-full transition-all duration-300">
          {renderCard(currentItem, currentIndex)}
        </div>

        {showHint && (
          <div className="absolute inset-x-0 -bottom-8 flex justify-center animate-bounce">
            <div className="flex items-center gap-2 text-[10px] text-primary font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Fingerprint className="w-3 h-3" />
              Swipe or tap arrows to browse
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 pt-4">
        <Button
          size="icon"
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-full w-12 h-12 border-primary/20 hover:bg-primary/5 disabled:opacity-30"
          data-testid="button-prev"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="flex gap-1.5">
          {sortedItems.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                (sortedItems.length > 5 ? Math.floor(currentIndex / (sortedItems.length/5)) === i : currentIndex === i)
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-primary/20"
              }`}
            />
          ))}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === sortedItems.length - 1}
          className="rounded-full w-12 h-12 border-primary/20 hover:bg-primary/5 disabled:opacity-30"
          data-testid="button-next"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
