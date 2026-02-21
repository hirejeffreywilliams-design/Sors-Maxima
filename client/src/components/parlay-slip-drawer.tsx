import { useState } from "react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Ticket,
  X,
  Trash2,
  TrendingUp,
  DollarSign,
  Target,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

const marketIcons: Record<string, typeof TrendingUp> = {
  moneyline: TrendingUp,
  spread: Target,
  total: DollarSign,
  player_prop: User,
};

function formatOdds(american: number | undefined, decimal: number): string {
  if (american !== undefined) {
    return american > 0 ? `+${american}` : `${american}`;
  }
  const am = decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return am > 0 ? `+${am}` : `${am}`;
}

function LegItem({ leg, onRemove }: { leg: ParlaySlipLeg; onRemove: () => void }) {
  const Icon = marketIcons[leg.market] || TrendingUp;

  return (
    <div className="flex items-start gap-3 py-3 px-1 group" data-testid={`slip-leg-${leg.id}`}>
      <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{leg.team}</span>
          {leg.opponent && (
            <span className="text-xs text-muted-foreground truncate">vs {leg.opponent}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize">{leg.market.replace("_", " ")}</span>
          <span className="text-xs font-medium">{leg.outcome}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {formatOdds(leg.americanOdds, leg.decimalOdds)}
          </Badge>
          {leg.confidence && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {Math.round(leg.confidence)}% conf
            </Badge>
          )}
          {leg.evPercent !== undefined && leg.evPercent > 0 && (
            <Badge className="text-[10px] h-4 px-1.5 bg-green-500/20 text-green-600 border-green-500/30">
              +{leg.evPercent.toFixed(1)}% EV
            </Badge>
          )}
        </div>
        {leg.sport && (
          <span className="text-[10px] text-muted-foreground mt-0.5 block">{leg.sport} · from {leg.addedFrom}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={onRemove}
        data-testid={`remove-leg-${leg.id}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ParlaySlipDrawer() {
  const { legs, removeLeg, clearSlip, legCount, totalOdds, totalAmericanOdds } = useParlaySlip();
  const [open, setOpen] = useState(false);

  const potentialPayout = (totalOdds * 10).toFixed(2);
  const formattedTotalOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 h-12 gap-2 rounded-full shadow-lg px-4"
          data-testid="button-parlay-slip"
          variant={legCount > 0 ? "default" : "secondary"}
        >
          <Ticket className="h-4 w-4" />
          <span className="font-semibold">Slip</span>
          {legCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-white text-primary">
              {legCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Parlay Slip
              {legCount > 0 && (
                <Badge variant="outline">{legCount} leg{legCount !== 1 ? "s" : ""}</Badge>
              )}
            </SheetTitle>
            {legCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSlip} className="text-xs text-destructive hover:text-destructive" data-testid="button-clear-slip">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {legCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Your slip is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add picks from the Smart Generator, Daily Parlays, or Live Center to build your parlay
              </p>
            </div>
            <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
              <Link href="/">
                <Sparkles className="h-4 w-4 mr-1" />
                Go to Smart Generator
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="divide-y">
                {legs.map((leg) => (
                  <LegItem key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} />
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <SheetFooter className="px-4 py-3 flex-col gap-3">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Odds</span>
                  <span className="font-bold">{formattedTotalOdds} ({totalOdds.toFixed(2)}x)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">$10 Payout</span>
                  <span className="font-bold text-green-600">${potentialPayout}</span>
                </div>
              </div>
              <Button className="w-full gap-2" size="lg" asChild onClick={() => setOpen(false)} data-testid="button-open-builder">
                <Link href="/builder">
                  Open in Parlay Builder
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
