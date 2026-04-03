import { X, SlidersHorizontal } from "lucide-react";
import { useSportFocus, SUPPORTED_SPORTS, type SportId } from "@/context/sport-focus-context";
import { Button } from "@/components/ui/button";

export function SportFocusBar() {
  const { focusedSport, setFocusedSport, clearFocus } = useSportFocus();

  return (
    <div
      className="w-full border-b bg-card/60 backdrop-blur-sm"
      data-testid="sport-focus-bar"
    >
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">
          Sport Focus
        </span>
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          {SUPPORTED_SPORTS.map(sport => {
            const isActive = focusedSport === sport.id;
            return (
              <button
                key={sport.id}
                onClick={() => setFocusedSport(isActive ? null : sport.id as SportId)}
                data-testid={`sport-focus-btn-${sport.id.toLowerCase()}`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span>{sport.emoji}</span>
                <span>{sport.label}</span>
              </button>
            );
          })}
        </div>
        {focusedSport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFocus}
            data-testid="sport-focus-clear"
            className="shrink-0 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
