import { useState, useMemo, useRef } from "react";
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
  Camera,
  MessageCircle,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  return new Promise((resolve, reject) => {
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (success) resolve();
    else reject(new Error("Copy failed"));
  });
}

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", shortName: "DK", sportLinks: { NBA: "https://sportsbook.draftkings.com/leagues/basketball/nba", NFL: "https://sportsbook.draftkings.com/leagues/football/nfl", MLB: "https://sportsbook.draftkings.com/leagues/baseball/mlb", NHL: "https://sportsbook.draftkings.com/leagues/hockey/nhl", NCAAB: "https://sportsbook.draftkings.com/leagues/basketball/ncaa", NCAAF: "https://sportsbook.draftkings.com/leagues/football/ncaa", default: "https://sportsbook.draftkings.com" }, color: "bg-[#53d337]", textColor: "text-black", hoverColor: "hover:bg-[#47b82f]" },
  { id: "fanduel", name: "FanDuel", shortName: "FD", sportLinks: { NBA: "https://sportsbook.fanduel.com/basketball", NFL: "https://sportsbook.fanduel.com/american-football", MLB: "https://sportsbook.fanduel.com/baseball", NHL: "https://sportsbook.fanduel.com/hockey", NCAAB: "https://sportsbook.fanduel.com/college-basketball", NCAAF: "https://sportsbook.fanduel.com/college-football", default: "https://sportsbook.fanduel.com" }, color: "bg-[#1493ff]", textColor: "text-white", hoverColor: "hover:bg-[#1080e0]" },
  { id: "betmgm", name: "BetMGM", shortName: "MGM", sportLinks: { NBA: "https://sports.betmgm.com/en/sports/basketball-7", NFL: "https://sports.betmgm.com/en/sports/football-11", MLB: "https://sports.betmgm.com/en/sports/baseball-23", NHL: "https://sports.betmgm.com/en/sports/hockey-12", default: "https://sports.betmgm.com" }, color: "bg-[#c4a24f]", textColor: "text-black", hoverColor: "hover:bg-[#b09040]" },
  { id: "caesars", name: "Caesars", shortName: "CZR", sportLinks: { NBA: "https://sportsbook.caesars.com/us/nba", NFL: "https://sportsbook.caesars.com/us/nfl", MLB: "https://sportsbook.caesars.com/us/mlb", NHL: "https://sportsbook.caesars.com/us/nhl", default: "https://sportsbook.caesars.com" }, color: "bg-[#0a3d2a]", textColor: "text-white", hoverColor: "hover:bg-[#0d5238]" },
  { id: "pointsbet", name: "PointsBet", shortName: "PB", sportLinks: { default: "https://pointsbet.com" }, color: "bg-[#ed1c24]", textColor: "text-white", hoverColor: "hover:bg-[#d41920]" },
  { id: "betrivers", name: "BetRivers", shortName: "BR", sportLinks: { default: "https://betrivers.com" }, color: "bg-[#1a1a2e]", textColor: "text-white", hoverColor: "hover:bg-[#2a2a4e]" },
];

function getSportLink(book: typeof SPORTSBOOKS[0], sport?: string): string {
  if (sport && sport in book.sportLinks) {
    return book.sportLinks[sport as keyof typeof book.sportLinks] as string;
  }
  return book.sportLinks.default;
}

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

function formatGameDate(gameTime?: string): string {
  if (!gameTime) return "";
  try {
    const d = new Date(gameTime);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

function gradeEmoji(grade?: string): string {
  if (!grade) return "";
  if (grade.startsWith("A")) return "\u{1F7E2}";
  if (grade.startsWith("B")) return "\u{1F535}";
  if (grade.startsWith("C")) return "\u{1F7E1}";
  return "\u{1F534}";
}

function formatSlipAsText(legs: ParlaySlipLeg[], totalOdds: number, totalAmericanOdds: number, stake: number): string {
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;
  const payout = (totalOdds * stake).toFixed(2);

  const lines: string[] = [
    "\u26A1 SORS MAXIMA PARLAY",
    `\u{1F3AF} ${legs.length} Legs | ${formattedOdds} Odds | $${stake} \u2192 $${payout}`,
    "\u2500".repeat(30),
  ];

  legs.forEach((leg, i) => {
    const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
    const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
    const dateStr = formatGameDate(leg.gameTime);
    const emoji = gradeEmoji(leg.grade);

    lines.push("");
    lines.push(`${emoji} Leg ${i + 1}: ${leg.outcome}`);
    lines.push(`\u{1F3C0} ${matchup}${dateStr ? ` \u{1F4C5} ${dateStr}` : ""}`);

    const meta: string[] = [`${odds}`];
    if (leg.grade) meta.push(`Grade: ${leg.grade}`);
    if (leg.confidence) meta.push(`${Math.round(leg.confidence)}% conf`);
    if (leg.evPercent !== undefined && leg.evPercent > 0) meta.push(`+${leg.evPercent.toFixed(1)}% EV`);
    lines.push(`   ${meta.join(" \u2022 ")}`);

    if (leg.monteCarloData) {
      lines.push(`   \u{1F4CA} Projected: ${Math.round(leg.monteCarloData.predictedAwayScore)}-${Math.round(leg.monteCarloData.predictedHomeScore)}`);
    }

    if (leg.reasoning) {
      lines.push(`   \u{1F4A1} ${leg.reasoning}`);
    }
  });

  lines.push("");
  lines.push("\u2500".repeat(30));
  lines.push(`\u{1F4B0} Stake: $${stake.toFixed(2)} | Payout: $${payout}`);
  lines.push(`\u{1F4C8} Total Odds: ${formattedOdds} (${totalOdds.toFixed(2)}x)`);
  lines.push("");
  lines.push("Powered by Sors Maxima \u2022 sorsmaxima.com");

  return lines.join("\n");
}

function getPrimarySport(legs: ParlaySlipLeg[]): string | undefined {
  const sports = legs.map(l => l.sport).filter(Boolean);
  if (sports.length === 0) return undefined;
  const counts: Record<string, number> = {};
  sports.forEach(s => { counts[s!] = (counts[s!] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 border-green-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  return "bg-red-500/15 text-red-500 border-red-500/30";
}

function LegItem({ leg, onRemove }: { leg: ParlaySlipLeg; onRemove: () => void }) {
  const Icon = marketIcons[leg.market] || TrendingUp;
  const hasEngineData = leg.grade || leg.monteCarloData || leg.reasoning;

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
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {formatOdds(leg.americanOdds, leg.decimalOdds)}
          </Badge>
          {leg.grade && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 font-bold ${gradeColor(leg.grade)}`} data-testid={`slip-grade-${leg.id}`}>
              {leg.grade}
            </Badge>
          )}
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
          {leg.edge !== undefined && leg.edge > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-purple-500/10 text-purple-600 border-purple-500/30">
              +{leg.edge.toFixed(1)}% edge
            </Badge>
          )}
        </div>
        {leg.monteCarloData && (
          <div className="mt-1.5 px-2 py-1.5 rounded bg-muted/60 text-[10px] space-y-0.5" data-testid={`slip-mc-${leg.id}`}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5" />
              <span className="font-medium">Monte Carlo: {(leg.monteCarloData.simulations / 1000).toFixed(0)}K sims</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Projected: {leg.monteCarloData.predictedAwayScore}-{leg.monteCarloData.predictedHomeScore}</span>
              <span className="text-muted-foreground">|</span>
              <span>Win: {leg.monteCarloData.homeWinProb}% / {leg.monteCarloData.awayWinProb}%</span>
            </div>
          </div>
        )}
        {leg.reasoning && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2" data-testid={`slip-reasoning-${leg.id}`}>
            {leg.reasoning}
          </p>
        )}
        {leg.sport && (
          <span className="text-[10px] text-muted-foreground mt-0.5 block">{leg.sport} · {leg.addedFrom}</span>
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

function PlacementGuide({ legs, totalAmericanOdds, stake }: { legs: ParlaySlipLeg[]; totalAmericanOdds: number; stake: number }) {
  const [checkedLegs, setCheckedLegs] = useState<Set<number>>(new Set());
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const { toast } = useToast();
  const primarySport = getPrimarySport(legs);

  const toggleLeg = (index: number) => {
    setCheckedLegs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleOpenBook = (book: typeof SPORTSBOOKS[0]) => {
    setSelectedBook(book.id);
    const url = getSportLink(book, primarySport);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const allChecked = checkedLegs.size === legs.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Place Your Bet</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SPORTSBOOKS.map((book) => (
          <Tooltip key={book.id}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs font-bold transition-all ${selectedBook === book.id ? "ring-2 ring-primary ring-offset-1" : ""} ${book.color} ${book.textColor} ${book.hoverColor} border-0`}
                onClick={() => handleOpenBook(book)}
                data-testid={`button-place-at-${book.id}`}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {book.shortName}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Open {book.name} {primarySport || "sportsbook"} page</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {selectedBook && (
        <div className="space-y-1.5 mt-2">
          <p className="text-xs text-muted-foreground">
            Check off each leg as you add it to your {SPORTSBOOKS.find(b => b.id === selectedBook)?.name} bet slip:
          </p>
          <div className="space-y-1">
            {legs.map((leg, i) => {
              const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
              const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
              const checked = checkedLegs.has(i);
              return (
                <button
                  key={leg.id}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded-md border text-xs transition-all ${checked ? "bg-green-500/10 border-green-500/30 line-through opacity-60" : "bg-muted/50 border-border hover:bg-muted"}`}
                  onClick={() => toggleLeg(i)}
                  data-testid={`checklist-leg-${i}`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-green-500 border-green-500" : "border-muted-foreground/40"}`}>
                    {checked && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{matchup}</span>
                    <span className="text-muted-foreground ml-1">
                      {leg.market.replace("_", " ")} · {leg.outcome} ({odds})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {allChecked && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/30 text-xs">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                All legs added! Set stake to ${stake.toFixed(0)} and place your parlay.
              </span>
            </div>
          )}
        </div>
      )}

      {!selectedBook && (
        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="h-2.5 w-2.5" />
          Opens the sportsbook's {primarySport || "sports"} page — add each leg to build your slip there
        </p>
      )}
    </div>
  );
}

function ShareSection({ legs, totalOdds, totalAmericanOdds, stake }: { legs: ParlaySlipLeg[]; totalOdds: number; totalAmericanOdds: number; stake: number }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;
  const payout = (totalOdds * stake).toFixed(2);

  const handleCopy = () => {
    const text = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    copyToClipboard(text).then(() => {
      setCopied(true);
      toast({ title: "Bet slip copied" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: "Could not copy", variant: "destructive" });
    });
  };

  const handleShare = () => {
    const text = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    if (navigator.share) {
      navigator.share({
        title: `Sors Maxima Parlay (${legs.length} legs)`,
        text: text,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleScreenshot = () => {
    toast({
      title: "Screenshot the card below",
      description: "Share it on social media or send to friends",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share Your Picks</span>
      </div>
      <div className="flex gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleCopy} data-testid="button-copy-full-slip">
              {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              Copy Text
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy as text for messaging</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleShare} data-testid="button-share-slip">
              <MessageCircle className="h-3 w-3" />
              Share
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share via messaging apps</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleScreenshot} data-testid="button-screenshot-slip">
              <Camera className="h-3 w-3" />
              Screenshot
            </Button>
          </TooltipTrigger>
          <TooltipContent>Screenshot the visual card to share</TooltipContent>
        </Tooltip>
      </div>

      <div ref={cardRef} className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-3 space-y-2" data-testid="visual-bet-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-primary tracking-wide">SORS MAXIMA</span>
          <Badge variant="outline" className="text-[10px]">{legs.length} Leg Parlay</Badge>
        </div>
        <div className="space-y-1">
          {legs.map((leg, i) => {
            const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
            return (
              <div key={leg.id} className="flex items-center justify-between text-[11px]">
                <span className="truncate flex-1">
                  <span className="font-medium">{leg.team}</span>
                  {leg.opponent && <span className="text-muted-foreground"> vs {leg.opponent}</span>}
                  <span className="text-muted-foreground"> · {leg.outcome}</span>
                </span>
                <span className="font-mono font-medium ml-2 shrink-0">{odds}</span>
              </div>
            );
          })}
        </div>
        <Separator />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Odds: <span className="font-bold text-foreground">{formattedOdds}</span></span>
          <span className="text-muted-foreground">Stake: <span className="font-bold text-foreground">${stake}</span></span>
          <span className="text-green-600 dark:text-green-400 font-bold">Payout: ${payout}</span>
        </div>
      </div>
    </div>
  );
}

export function ParlaySlipDrawer() {
  const { legs, removeLeg, clearSlip, legCount, totalOdds, totalAmericanOdds } = useParlaySlip();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState(10);

  const potentialPayout = useMemo(() => (totalOdds * stake).toFixed(2), [totalOdds, stake]);
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

              <PlacementGuide legs={legs} totalAmericanOdds={totalAmericanOdds} stake={stake} />

              <Separator />

              <ShareSection legs={legs} totalOdds={totalOdds} totalAmericanOdds={totalAmericanOdds} stake={stake} />

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
