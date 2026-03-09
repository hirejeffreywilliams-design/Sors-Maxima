import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardStackDeckProps {
  cards: React.ReactNode[];
  className?: string;
  cardLabel?: string;
  emptyContent?: React.ReactNode;
}

const STACK_DEPTH = 3;

export function CardStackDeck({ cards, className, cardLabel = "card", emptyContent }: CardStackDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const total = cards.length;

  const goTo = useCallback((dir: "prev" | "next") => {
    if (isAnimating || total === 0) return;
    setAnimDir(dir === "next" ? "left" : "right");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(i => dir === "next"
        ? (i + 1) % total
        : (i - 1 + total) % total
      );
      setAnimDir(null);
      setIsAnimating(false);
    }, 280);
  }, [isAnimating, total]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 22) {
      goTo(dx < 0 ? "next" : "prev");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (total === 0) {
    return emptyContent ? <>{emptyContent}</> : null;
  }

  const visibleIndices = Array.from({ length: Math.min(STACK_DEPTH, total) }, (_, i) =>
    (currentIndex + i) % total
  );

  const getStackStyle = (stackPos: number): React.CSSProperties => {
    if (stackPos === 0) {
      return {
        transform: animDir
          ? animDir === "left"
            ? "translateX(-8%) rotateZ(-4deg) scale(0.95)"
            : "translateX(8%) rotateZ(4deg) scale(0.95)"
          : "translateX(0) rotateZ(0deg) scale(1)",
        opacity: animDir ? 0 : 1,
        zIndex: 30,
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
        /* Strong shadow separates front card visually from the stack */
        filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.85)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
        isolation: "isolate",
      };
    }
    if (stackPos === 1) {
      return {
        transform: animDir
          ? "translateY(0px) scale(1) rotateZ(0deg)"
          : "translateY(12px) scale(0.94) rotateZ(1.5deg)",
        /* Lower opacity + dark filter so it reads clearly as "behind" */
        opacity: animDir ? 0.9 : 0.55,
        filter: "brightness(0.45) saturate(0.6)",
        zIndex: 20,
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, filter 0.28s ease",
      };
    }
    return {
      transform: animDir
        ? "translateY(12px) scale(0.94) rotateZ(1.5deg)"
        : "translateY(22px) scale(0.885) rotateZ(-1deg)",
      opacity: animDir ? 0.55 : 0.35,
      filter: "brightness(0.3) saturate(0.4)",
      zIndex: 10,
      transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, filter 0.28s ease",
    };
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Card stack area */}
      <div
        className="relative w-full max-w-[280px] mx-auto select-none"
        style={{ aspectRatio: "2/3", paddingBottom: "26px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Stack cards from back to front */}
        {[...visibleIndices].reverse().map((cardIdx, revPos) => {
          const stackPos = (visibleIndices.length - 1) - revPos;
          return (
            <div
              key={cardIdx}
              className="absolute inset-0"
              style={{
                ...getStackStyle(stackPos),
                transformOrigin: "50% 80%",
              }}
            >
              {cards[cardIdx]}
            </div>
          );
        })}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-4 mt-1">
        <button
          onClick={() => goTo("prev")}
          disabled={isAnimating || total <= 1}
          data-testid="button-cardstack-prev"
          className="w-11 h-11 rounded-full flex items-center justify-center border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black tabular-nums text-white/80">{currentIndex + 1}</span>
          <span className="text-xs text-white/30">/</span>
          <span className="text-sm font-bold tabular-nums text-white/40">{total}</span>
          {cardLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 ml-1">
              {cardLabel}s
            </span>
          )}
        </div>

        <button
          onClick={() => goTo("next")}
          disabled={isAnimating || total <= 1}
          data-testid="button-cardstack-next"
          className="w-11 h-11 rounded-full flex items-center justify-center border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dot navigation for up to 20 cards */}
      {total > 1 && total <= 20 && (
        <div className="flex items-center flex-wrap justify-center max-w-[240px]">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                if (!isAnimating) {
                  setCurrentIndex(i);
                }
              }}
              data-testid={`button-cardstack-dot-${i}`}
              className="transition-all duration-200"
              style={{
                padding: "10px 5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: i === currentIndex ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: i === currentIndex ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.2s",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
