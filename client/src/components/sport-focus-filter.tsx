import { useSportFocus } from "@/context/sport-focus-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SportFocusFilterProps {
  sport?: string | null;
  children: React.ReactNode;
  showAllLabel?: string;
}

export function SportFocusFilter({ sport, children, showAllLabel }: SportFocusFilterProps) {
  const { focusedSport, clearFocus } = useSportFocus();

  if (!focusedSport) return <>{children}</>;

  const normalizedSport = (sport ?? "").toUpperCase();
  const normalizedFocus = focusedSport.toUpperCase();
  const isMatch = normalizedSport === normalizedFocus
    || normalizedSport.includes(normalizedFocus)
    || normalizedFocus.includes(normalizedSport);

  if (isMatch) return <>{children}</>;

  return (
    <div className="opacity-35 grayscale">
      {children}
    </div>
  );
}

export function SportFocusBanner({ activeCount, totalCount }: { activeCount: number; totalCount: number }) {
  const { focusedSport, clearFocus } = useSportFocus();

  if (!focusedSport) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-sm" data-testid="sport-focus-banner">
      <Badge variant="outline" className="text-primary border-primary/40 text-xs font-semibold px-2 py-0.5">
        {focusedSport}
      </Badge>
      <span className="text-muted-foreground text-xs">
        Showing {activeCount} of {totalCount} items
      </span>
      <button
        onClick={clearFocus}
        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="sport-focus-show-all"
      >
        <X className="w-3 h-3" />
        Show all
      </button>
    </div>
  );
}

export function sportMatchesFocus(sportString: string | undefined | null, focusedSport: string | null): boolean {
  if (!focusedSport || !sportString) return true;
  const normalized = sportString.toUpperCase();
  const focus = focusedSport.toUpperCase();
  return normalized === focus || normalized.includes(focus) || focus.includes(normalized);
}
