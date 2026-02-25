import { useState, useMemo } from "react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ExternalLink,
  Copy,
  CheckCircle,
  Share2,
  Info,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", shortName: "DK", deepLink: "https://sportsbook.draftkings.com", color: "bg-[#53d337]", textColor: "text-black", hoverColor: "hover:bg-[#47b82f]" },
  { id: "fanduel", name: "FanDuel", shortName: "FD", deepLink: "https://sportsbook.fanduel.com", color: "bg-[#1493ff]", textColor: "text-white", hoverColor: "hover:bg-[#1080e0]" },
  { id: "betmgm", name: "BetMGM", shortName: "MGM", deepLink: "https://sports.betmgm.com", color: "bg-[#c4a24f]", textColor: "text-black", hoverColor: "hover:bg-[#b09040]" },
  { id: "caesars", name: "Caesars", shortName: "CZR", deepLink: "https://sportsbook.caesars.com", color: "bg-[#0a3d2a]", textColor: "text-white", hoverColor: "hover:bg-[#0d5238]" },
  { id: "pointsbet", name: "PointsBet", shortName: "PB", deepLink: "https://pointsbet.com", color: "bg-[#ed1c24]", textColor: "text-white", hoverColor: "hover:bg-[#d41920]" },
  { id: "betrivers", name: "BetRivers", shortName: "BR", deepLink: "https://betrivers.com", color: "bg-[#1a1a2e]", textColor: "text-white", hoverColor: "hover:bg-[#2a2a4e]" },
];

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

function formatSlipAsText(legs: ParlaySlipLeg[], totalOdds: number, totalAmericanOdds: number, stake: number): string {
  const header = `Sors Maxima Parlay (${legs.length} legs)`;
  const divider = "─".repeat(32);
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;
  const payout = (totalOdds * stake).toFixed(2);

  const legLines = legs.map((leg, i) => {
    const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
    const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
    return `${i + 1}. ${matchup}\n   ${leg.market.replace("_", " ")} · ${leg.outcome} (${odds})`;
  });

  return [
    header,
    divider,
    ...legLines,
    divider,
    `Total Odds: ${formattedOdds} (${totalOdds.toFixed(2)}x)`,
    `Stake: $${stake.toFixed(2)} → Payout: $${payout}`,
  ].join("\n");
}

function formatSlipForBook(bookId: string, legs: ParlaySlipLeg[], totalAmericanOdds: number): string {
  const book = SPORTSBOOKS.find((b) => b.id === bookId);
  const bookName = book?.name || bookId;
  const divider = "---";
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;

  const legLines = legs.map((leg, i) => {
    const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
    const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
    const market = leg.market.replace("_", " ");
    return `${i + 1}. ${matchup}\n   ${market}: ${leg.outcome} (${odds})`;
  });

  return [
    `${bookName} Parlay`,
    divider,
    ...legLines,
    divider,
    `${legs.length} legs · ${formattedOdds}`,
  ].join("\n");
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

function SportsbookButtons({ legs, totalAmericanOdds }: { legs: ParlaySlipLeg[]; totalAmericanOdds: number }) {
  const { toast } = useToast();
  const [copiedBook, setCopiedBook] = useState<string | null>(null);

  const handlePlaceAt = (book: typeof SPORTSBOOKS[0]) => {
    const slipText = formatSlipForBook(book.id, legs, totalAmericanOdds);
    navigator.clipboard.writeText(slipText).then(() => {
      setCopiedBook(book.id);
      toast({
        title: `Slip copied for ${book.name}`,
        description: "Paste your selections into the sportsbook",
      });
      setTimeout(() => setCopiedBook(null), 3000);
    });
    window.open(book.deepLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Place at Sportsbook</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {SPORTSBOOKS.map((book) => (
          <Tooltip key={book.id}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs font-bold transition-all ${book.color} ${book.textColor} ${book.hoverColor} border-0`}
                onClick={() => handlePlaceAt(book)}
                data-testid={`button-place-at-${book.id}`}
              >
                {copiedBook === book.id ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <ExternalLink className="h-3 w-3 mr-1" />
                )}
                {book.shortName}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Copy slip & open {book.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
        <Info className="h-2.5 w-2.5" />
        Copies your selections and opens the sportsbook
      </p>
    </div>
  );
}

export function ParlaySlipDrawer() {
  const { legs, removeLeg, clearSlip, legCount, totalOdds, totalAmericanOdds } = useParlaySlip();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState(10);
  const [copied, setCopied] = useState(false);

  const potentialPayout = useMemo(() => (totalOdds * stake).toFixed(2), [totalOdds, stake]);
  const formattedTotalOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;

  const handleCopySlip = () => {
    const slipText = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    navigator.clipboard.writeText(slipText).then(() => {
      setCopied(true);
      toast({ title: "Bet slip copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareSlip = () => {
    const slipText = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    if (navigator.share) {
      navigator.share({
        title: `Sors Maxima Parlay (${legCount} legs)`,
        text: slipText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(slipText).then(() => {
        toast({ title: "Slip copied — paste to share" });
      });
    }
  };

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
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Bet Slip
              {legCount > 0 && (
                <Badge variant="outline">{legCount} leg{legCount !== 1 ? "s" : ""}</Badge>
              )}
            </SheetTitle>
            {legCount > 0 && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopySlip} data-testid="button-copy-full-slip">
                      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy full slip</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShareSlip} data-testid="button-share-slip">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share slip</TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="sm" onClick={clearSlip} className="text-xs text-destructive hover:text-destructive h-7 px-2" data-testid="button-clear-slip">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
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
                Add picks from Daily Picks, Command Center, or the Parlay Builder to start
              </p>
            </div>
            <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
              <Link href="/">
                <Sparkles className="h-4 w-4 mr-1" />
                Browse Picks
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

            <SheetFooter className="px-4 py-3 flex-col gap-3 block space-y-3">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Odds</span>
                  <span className="font-bold">{formattedTotalOdds} ({totalOdds.toFixed(2)}x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Stake $</span>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={stake}
                    onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 w-24 text-sm font-medium"
                    data-testid="input-stake"
                  />
                  <div className="flex gap-1 flex-1">
                    {[10, 25, 50, 100].map((amt) => (
                      <Button
                        key={amt}
                        variant={stake === amt ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2 text-xs flex-1"
                        onClick={() => setStake(amt)}
                        data-testid={`button-stake-${amt}`}
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Payout</span>
                  <span className="font-bold text-green-600 dark:text-green-400 text-base">${potentialPayout}</span>
                </div>
              </div>

              <Separator />

              <SportsbookButtons legs={legs} totalAmericanOdds={totalAmericanOdds} />

              <div className="flex gap-2">
                <Button className="flex-1 gap-2" size="sm" variant="outline" asChild onClick={() => setOpen(false)} data-testid="button-open-builder">
                  <Link href="/builder">
                    <ChevronRight className="h-4 w-4" />
                    Open in Builder
                  </Link>
                </Button>
              </div>

              <AffiliateDisclosure compact className="text-center block w-full" />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
