import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  ChevronLeft,
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
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Shield,
  Zap,
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

function gradeLabel(grade?: string): string {
  if (!grade) return "";
  if (grade.startsWith("A")) return "[A]";
  if (grade.startsWith("B")) return "[B]";
  if (grade.startsWith("C")) return "[C]";
  return "[D]";
}

function formatSlipAsText(legs: ParlaySlipLeg[], totalOdds: number, totalAmericanOdds: number, stake: number): string {
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;
  const toWin = ((totalOdds - 1) * stake).toFixed(2);
  const totalReturn = (totalOdds * stake).toFixed(2);

  const lines: string[] = [
    "🎯 SORS MAXIMA PARLAY",
    `${legs.length} Leg${legs.length !== 1 ? "s" : ""} | ${formattedOdds} | Stake $${stake} → Win $${toWin}`,
    "-".repeat(36),
  ];

  legs.forEach((leg, i) => {
    const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
    const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
    const dateStr = formatGameDate(leg.gameTime);
    const label = gradeLabel(leg.grade);

    lines.push("");
    lines.push(`${label} Leg ${i + 1}: ${leg.outcome}`);
    lines.push(`  ${matchup}${dateStr ? ` (${dateStr})` : ""}`);

    const meta: string[] = [`Odds: ${odds}`];
    if (leg.grade) meta.push(`Grade: ${leg.grade}`);
    if (leg.confidence) meta.push(`${Math.round(leg.confidence)}% confidence`);
    if (leg.evPercent !== undefined && leg.evPercent > 0) meta.push(`+${leg.evPercent.toFixed(1)}% EV`);
    if (leg.sport) meta.push(leg.sport);
    lines.push(`  ${meta.join(" · ")}`);

    if (leg.monteCarloData) {
      const mc = leg.monteCarloData;
      lines.push(`  MC Projected: ${Math.round(mc.predictedAwayScore)}-${Math.round(mc.predictedHomeScore)} | Win Prob: ${(mc.homeWinProb * 100).toFixed(0)}%`);
    }

    if (leg.reasoning) {
      const shortReason = leg.reasoning.length > 120 ? leg.reasoning.slice(0, 117) + "..." : leg.reasoning;
      lines.push(`  "${shortReason}"`);
    }
  });

  lines.push("");
  lines.push("-".repeat(36));
  lines.push(`Stake: $${stake.toFixed(2)} | To Win: $${toWin} | Total Return: $${totalReturn}`);
  lines.push(`Combined Odds: ${formattedOdds} (${totalOdds.toFixed(3)}x decimal)`);
  lines.push("");
  lines.push("Powered by Sors Maxima · 46-Factor Model Analysis");
  lines.push("sorsmaxima.com");

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

interface SimulationResult {
  simulation: {
    winProbability: number;
    method: string;
    simulations: number;
    convergenceScore: number;
    confidenceInterval: [number, number];
  };
  risk: {
    rating: "low" | "medium" | "high" | "very_high";
    variance: number;
    sharpeRatio: number;
    ruinProbability: number;
  };
  kelly: {
    fraction: number;
    optimalBet: number;
    potentialPayout: number;
    expectedGrowthRate: number;
  };
  ticket: {
    legs: number;
    combinedOdds: number;
    impliedProbability: number;
  };
}

function riskColor(rating: string): string {
  if (rating === "low") return "text-green-600 dark:text-green-400";
  if (rating === "medium") return "text-yellow-600 dark:text-yellow-400";
  if (rating === "high") return "text-orange-500 dark:text-orange-400";
  return "text-red-500 dark:text-red-400";
}

function riskBg(rating: string): string {
  if (rating === "low") return "bg-green-500/10 border-green-500/20";
  if (rating === "medium") return "bg-yellow-500/10 border-yellow-500/20";
  if (rating === "high") return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function MCSimulationPanel({ legs, stake, compact }: { legs: ParlaySlipLeg[]; stake: number; compact?: boolean }) {
  const [simData, setSimData] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastLegKeyRef = useRef("");

  const legKey = legs.map(l => l.id).sort().join(",") + `|${stake}`;

  useEffect(() => {
    if (legs.length < 2 || legKey === lastLegKeyRef.current) return;
    lastLegKeyRef.current = legKey;
    const timer = setTimeout(async () => {
      setIsSimulating(true);
      try {
        const resp = await fetch("/api/slip/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ legs, bankroll: stake * 10 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setSimData(data);
        }
      } catch {}
      setIsSimulating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [legKey, legs, stake]);

  if (legs.length < 2) return null;

  if (isSimulating && !simData) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/10 text-xs" data-testid="mc-simulating">
        <Activity className="h-3 w-3 animate-pulse text-primary" />
        <span className="text-muted-foreground">Running Monte Carlo simulation...</span>
      </div>
    );
  }

  if (!simData) return null;

  const { simulation, risk, kelly } = simData;
  const ratingLabel = risk.rating === "very_high" ? "Very High" : risk.rating.charAt(0).toUpperCase() + risk.rating.slice(1);

  if (compact) {
    return (
      <div className={`rounded-md border px-2 py-1.5 text-[10px] space-y-1 ${riskBg(risk.rating)}`} data-testid="mc-simulation-compact">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-medium">
            <Activity className="h-2.5 w-2.5" />
            MC: {simulation.winProbability.toFixed(1)}% win
          </span>
          <span className={`font-bold ${riskColor(risk.rating)}`}>{ratingLabel} Risk</span>
        </div>
        {kelly.optimalBet > 0 && (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Kelly: ${kelly.optimalBet.toFixed(2)}</span>
            <span className="text-green-600 dark:text-green-400">${kelly.potentialPayout.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-md border space-y-0 overflow-hidden ${riskBg(risk.rating)}`} data-testid="mc-simulation-panel">
      <button
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid="toggle-mc-panel"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Activity className="h-3 w-3 text-primary" />
          Monte Carlo: {simulation.winProbability.toFixed(1)}% Win
          {isSimulating && <span className="text-muted-foreground animate-pulse">(updating...)</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${riskColor(risk.rating)} border-current/20`}>
            {ratingLabel}
          </Badge>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      {expanded && (
        <div className="px-2.5 pb-2 space-y-1.5 text-xs border-t border-current/5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><BarChart3 className="h-2.5 w-2.5" /> Win Prob</span>
              <span className="font-bold">{simulation.winProbability.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> Risk</span>
              <span className={`font-bold ${riskColor(risk.rating)}`}>{ratingLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-2.5 w-2.5" /> CI 95%</span>
              <span className="font-mono text-[10px]">{simulation.confidenceInterval[0].toFixed(1)}-{simulation.confidenceInterval[1].toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Convergence</span>
              <span className="font-mono text-[10px]">{(simulation.convergenceScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sharpe</span>
              <span className="font-mono text-[10px]">{risk.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ruin Prob</span>
              <span className={`font-mono text-[10px] ${risk.ruinProbability > 50 ? "text-red-500" : "text-green-600"}`}>{risk.ruinProbability.toFixed(1)}%</span>
            </div>
          </div>

          {kelly.optimalBet > 0 && (
            <>
              <Separator className="opacity-30" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kelly Optimal Bet</span>
                <span className="font-bold text-primary">${kelly.optimalBet.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kelly Payout</span>
                <span className="font-bold text-green-600 dark:text-green-400">${kelly.potentialPayout.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="text-[9px] text-muted-foreground/70 pt-0.5">
            {simulation.method === "analytic" ? "Analytic" : `${(simulation.simulations / 1000).toFixed(0)}K sims`} | {simulation.method}
          </div>
        </div>
      )}
    </div>
  );
}

function LegItem({ leg, onRemove, compact }: { leg: ParlaySlipLeg; onRemove: () => void; compact?: boolean }) {
  const Icon = marketIcons[leg.market] || TrendingUp;

  return (
    <div className="flex items-start gap-2 py-2 px-1 group" data-testid={`slip-leg-${leg.id}`}>
      <div className="mt-0.5 p-1 rounded-md bg-primary/10">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs truncate">{leg.team}</span>
          {leg.opponent && (
            <span className="text-[10px] text-muted-foreground truncate">vs {leg.opponent}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground capitalize">{leg.market.replace("_", " ")}</span>
          <span className="text-[10px] font-medium">{leg.outcome}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {formatOdds(leg.americanOdds, leg.decimalOdds)}
          </Badge>
          {leg.grade && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1 font-bold ${gradeColor(leg.grade)}`} data-testid={`slip-grade-${leg.id}`}>
              {leg.grade}
            </Badge>
          )}
          {leg.confidence && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {Math.round(leg.confidence)}%
            </Badge>
          )}
          {leg.evPercent !== undefined && leg.evPercent > 0 && (
            <Badge className="text-[10px] h-4 px-1 bg-green-500/20 text-green-600 border-green-500/30">
              +{leg.evPercent.toFixed(1)}% EV
            </Badge>
          )}
        </div>
        {!compact && leg.monteCarloData && (
          <div className="mt-1 px-1.5 py-1 rounded bg-muted/60 text-[10px] space-y-0.5" data-testid={`slip-mc-${leg.id}`}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5" />
              <span className="font-medium">MC: {(leg.monteCarloData.simulations / 1000).toFixed(0)}K sims</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Projected: {leg.monteCarloData.predictedAwayScore}-{leg.monteCarloData.predictedHomeScore}</span>
            </div>
          </div>
        )}
        {!compact && leg.reasoning && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1" data-testid={`slip-reasoning-${leg.id}`}>
            {leg.reasoning}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
    <div className="space-y-2">
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
                className={`h-8 text-[10px] font-bold transition-all ${selectedBook === book.id ? "ring-2 ring-primary ring-offset-1" : ""} ${book.color} ${book.textColor} ${book.hoverColor} border-0`}
                onClick={() => handleOpenBook(book)}
                data-testid={`button-place-at-${book.id}`}
              >
                <ExternalLink className="h-2.5 w-2.5 mr-1" />
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
          <p className="text-[10px] text-muted-foreground">
            Check off each leg as you add it to {SPORTSBOOKS.find(b => b.id === selectedBook)?.name}:
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {legs.map((leg, i) => {
              const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
              const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
              const checked = checkedLegs.has(i);
              return (
                <button
                  key={leg.id}
                  className={`w-full text-left flex items-center gap-2 p-1.5 rounded-md border text-[10px] transition-all ${checked ? "bg-green-500/10 border-green-500/30 line-through opacity-60" : "bg-muted/50 border-border hover:bg-muted"}`}
                  onClick={() => toggleLeg(i)}
                  data-testid={`checklist-leg-${i}`}
                >
                  <div className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-green-500 border-green-500" : "border-muted-foreground/40"}`}>
                    {checked && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-medium">{matchup}</span>
                    <span className="text-muted-foreground ml-1">{leg.outcome} ({odds})</span>
                  </div>
                </button>
              );
            })}
          </div>
          {allChecked && (
            <div className="flex items-center gap-2 p-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-[10px]">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
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
          Tap a sportsbook to open and build your slip there
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
  const toWin = ((totalOdds - 1) * stake).toFixed(2);
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
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleCopy} data-testid="button-copy-full-slip">
              {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              Copy
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy as text for messaging</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleShare} data-testid="button-share-slip">
              <MessageCircle className="h-3 w-3" />
              Share
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share via messaging apps</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleScreenshot} data-testid="button-screenshot-slip">
              <Camera className="h-3 w-3" />
              Screenshot
            </Button>
          </TooltipTrigger>
          <TooltipContent>Screenshot the visual card to share</TooltipContent>
        </Tooltip>
      </div>

      <div ref={cardRef} className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-2.5 space-y-1.5" data-testid="visual-bet-card">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary tracking-wide">SORS MAXIMA</span>
          <Badge variant="outline" className="text-[10px]">{legs.length} Leg Parlay</Badge>
        </div>
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {legs.map((leg) => {
            const odds = formatOdds(leg.americanOdds, leg.decimalOdds);
            return (
              <div key={leg.id} className="flex items-center justify-between text-[10px]">
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
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Odds: <span className="font-bold text-foreground">{formattedOdds}</span></span>
          <span className="text-muted-foreground">Stake: <span className="font-bold text-foreground">${stake}</span></span>
          <span className="text-green-600 dark:text-green-400 font-bold">To Win: ${toWin}</span>
        </div>
      </div>
    </div>
  );
}

function SlipContent({ compact, isMobile }: { compact?: boolean; isMobile?: boolean }) {
  const { legs, removeLeg, clearSlip, legCount, totalOdds, totalAmericanOdds, toWin } = useParlaySlip();
  const { toast } = useToast();
  const [stake, setStake] = useState(10);
  const [showPlacement, setShowPlacement] = useState(false);
  const [tracked, setTracked] = useState(false);

  const { data: authData } = useQuery<{ authenticated: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
    staleTime: 30000,
  });
  const isAuthenticated = authData?.authenticated ?? false;

  const trackMutation = useMutation({
    mutationFn: async () => {
      const picks = legs.map(leg => {
        const idParts = leg.id?.split("-") || [];
        const gameId = idParts.length >= 3 ? idParts[2] : (leg.game || leg.id);
        return {
          sport: (leg as ParlaySlipLeg).sport || idParts[1] || "unknown",
          gameId,
          game: leg.game || "",
          pick: leg.outcome,
          betType: leg.type || "moneyline",
          oddsAtPick: leg.odds || -110,
        };
      });
      return apiRequest("POST", "/api/user/picks/batch", { picks });
    },
    onSuccess: () => {
      setTracked(true);
      toast({ title: "Bet tracked!", description: "We'll automatically record the result when the game finishes." });
    },
    onError: () => {
      toast({ title: "Sign in to track bets", description: "Create an account to track your bets and see your accuracy over time.", variant: "destructive" });
    },
  });

  const toWinAmount = useMemo(() => (toWin * stake).toFixed(2), [toWin, stake]);
  const totalReturn = useMemo(() => (totalOdds * stake).toFixed(2), [totalOdds, stake]);
  const formattedTotalOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;

  const handleCopySlip = () => {
    const text = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    copyToClipboard(text).then(() => {
      toast({ title: "Bet slip copied to clipboard!" });
    }).catch(() => {
      toast({ title: "Could not copy", variant: "destructive" });
    });
  };

  const handleShareSlip = () => {
    const text = formatSlipAsText(legs, totalOdds, totalAmericanOdds, stake);
    if (navigator.share) {
      navigator.share({
        title: `Sors Maxima Parlay (${legs.length} legs)`,
        text: text,
      }).catch(() => {});
    } else {
      handleCopySlip();
    }
  };

  if (legCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Your slip is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add picks from any page to start building your parlay
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Browse Picks
          </Link>
        </Button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs font-bold px-2.5 py-0.5">
                {legCount} leg{legCount !== 1 ? "s" : ""}
              </Badge>
              <span className="text-sm font-bold">{formattedTotalOdds}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearSlip} className="text-xs text-destructive hover:text-destructive h-7 px-2" data-testid="button-clear-slip">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Stake $</span>
              <Input
                type="number"
                min={1}
                max={100000}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-20 text-sm font-medium"
                data-testid="input-stake"
              />
              <div className="flex gap-1">
                {[10, 25, 50, 100].map((amt) => (
                  <Button
                    key={amt}
                    variant={stake === amt ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setStake(amt)}
                    data-testid={`button-stake-${amt}`}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">Odds: <span className="font-bold text-foreground">{formattedTotalOdds} ({totalOdds.toFixed(2)}x)</span></span>
            <div className="text-right">
              <span className="text-sm font-bold text-green-600 dark:text-green-400">To Win: ${toWinAmount}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">(Return ${totalReturn})</span>
            </div>
          </div>
          <div className="mt-2">
            <MCSimulationPanel legs={legs} stake={stake} compact />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 py-1">
            <div className="divide-y">
              {legs.map((leg) => (
                <LegItem key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} />
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t bg-background px-4 py-3 space-y-2.5 safe-area-bottom">
          <div className="flex gap-2">
            <Button className="flex-1 h-10 gap-2 font-bold" onClick={handleCopySlip} data-testid="button-copy-full-slip">
              <Copy className="h-4 w-4" />
              Copy Slip
            </Button>
            <Button variant="outline" className="h-10 gap-2" onClick={handleShareSlip} data-testid="button-share-slip">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {isAuthenticated && (
            <Button
              variant={tracked ? "outline" : "secondary"}
              className="w-full h-9 gap-2 text-sm"
              onClick={() => !tracked && trackMutation.mutate()}
              disabled={trackMutation.isPending || tracked}
              data-testid="button-track-bet"
            >
              {tracked ? (
                <><CheckCircle className="h-4 w-4 text-green-500" /> Bet Tracked — We'll Record the Result</>
              ) : trackMutation.isPending ? (
                <><Activity className="h-4 w-4 animate-pulse" /> Tracking...</>
              ) : (
                <><Target className="h-4 w-4" /> Track My Bet</>
              )}
            </Button>
          )}

          <button
            className="w-full flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs text-muted-foreground"
            onClick={() => setShowPlacement(!showPlacement)}
            data-testid="toggle-placement-guide"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Sportsbook to Place Bet
            </span>
            {showPlacement ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showPlacement && (
            <PlacementGuide legs={legs} totalAmericanOdds={totalAmericanOdds} stake={stake} />
          )}

          <AffiliateDisclosure compact className="text-center block w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold">
            {legCount} leg{legCount !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs font-bold">{formattedTotalOdds}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-right">
            <span className="text-xs text-green-600 dark:text-green-400 font-bold">Win ${toWinAmount}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearSlip} className="text-[10px] text-destructive hover:text-destructive h-6 px-1.5" data-testid="button-clear-slip">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y px-2">
          {legs.map((leg) => (
            <LegItem key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} compact={compact} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t bg-background px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Stake $</span>
          <Input
            type="number"
            min={1}
            max={100000}
            value={stake}
            onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
            className="h-6 w-16 text-[10px] font-medium"
            data-testid="input-stake"
          />
          <div className="flex gap-0.5 flex-1">
            {[10, 25, 50, 100].map((amt) => (
              <Button
                key={amt}
                variant={stake === amt ? "default" : "outline"}
                size="sm"
                className="h-6 px-1 text-[9px] flex-1 min-w-0"
                onClick={() => setStake(amt)}
                data-testid={`button-stake-${amt}`}
              >
                ${amt}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Odds</span>
          <span className="font-bold">{formattedTotalOdds} ({totalOdds.toFixed(2)}x)</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">To Win</span>
          <span className="font-bold text-green-600 dark:text-green-400">${toWinAmount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Return (incl. stake)</span>
          <span className="font-medium text-muted-foreground">${totalReturn}</span>
        </div>

        <MCSimulationPanel legs={legs} stake={stake} compact />

        <Separator />

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleCopySlip} data-testid="button-copy-full-slip">
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleShareSlip} data-testid="button-share-slip">
            <Share2 className="h-3 w-3" />
            Share
          </Button>
          {isAuthenticated && (
            <Button
              variant={tracked ? "outline" : "secondary"}
              size="sm"
              className="flex-1 h-7 text-[10px] gap-1"
              onClick={() => !tracked && trackMutation.mutate()}
              disabled={trackMutation.isPending || tracked}
              data-testid="button-track-bet"
            >
              {tracked ? (
                <><CheckCircle className="h-3 w-3 text-green-500" /> Tracked</>
              ) : trackMutation.isPending ? (
                <><Activity className="h-3 w-3 animate-pulse" /> ...</>
              ) : (
                <><Target className="h-3 w-3" /> Track</>
              )}
            </Button>
          )}
        </div>

        <button
          className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
          onClick={() => setShowPlacement(!showPlacement)}
          data-testid="toggle-placement-guide"
        >
          <span className="flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Open Sportsbook
          </span>
          {showPlacement ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showPlacement && (
          <PlacementGuide legs={legs} totalAmericanOdds={totalAmericanOdds} stake={stake} />
        )}
      </div>
    </>
  );
}

export function ParlaySlipDesktopSidebar() {
  const [open, setOpen] = useState(false);
  const { legCount, totalAmericanOdds } = useParlaySlip();
  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;
  const prevLegCountRef = useRef(0);

  useEffect(() => {
    if (legCount > 0 && prevLegCountRef.current === 0) {
      setOpen(true);
    }
    prevLegCountRef.current = legCount;
  }, [legCount]);

  return (
    <>
      {/* Backdrop — click to close */}
      {open && (
        <div
          className="hidden lg:block fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating tab — always visible on right edge, shifts left when panel opens */}
      <button
        className={`hidden lg:flex fixed z-50 top-[40%] -translate-y-1/2 flex-col items-center gap-2 py-4 px-2 rounded-l-xl shadow-xl active:scale-95 transition-all duration-300 ease-out border-y border-l ${
          legCount > 0
            ? "bg-primary text-primary-foreground hover:bg-primary/90 border-white/10 py-5"
            : "bg-muted/80 text-muted-foreground hover:bg-muted border-border backdrop-blur-sm"
        }`}
        style={{ right: open ? "320px" : "0px" }}
        onClick={() => setOpen(o => !o)}
        data-testid="button-toggle-bet-slip"
        aria-label="Toggle bet slip"
      >
        <Ticket className="h-4 w-4" />
        {legCount > 0 ? (
          <span className="bg-white/20 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {legCount}
          </span>
        ) : null}
        {open ? (
          <ChevronRight className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronLeft className="h-3 w-3 opacity-60" />
        )}
      </button>

      {/* Sliding panel — overlays content, does NOT push it */}
      <aside
        className="hidden lg:flex fixed right-0 top-[3.5rem] bottom-0 w-[320px] border-l bg-background flex-col z-40 shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        data-testid="desktop-bet-slip"
      >
        <div className="px-3 py-2.5 border-b bg-gradient-to-r from-primary/5 to-primary/10 flex items-center gap-2 shrink-0">
          <Ticket className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">Bet Slip</span>
          {legCount > 0 && (
            <Badge variant="default" className="ml-1 text-[10px] h-5 px-2">
              {legCount} leg{legCount !== 1 ? "s" : ""} · {formattedOdds}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <SlipContent compact />
      </aside>
    </>
  );
}

export function ParlaySlipMobileDrawer() {
  const { legCount, mobileOpen, setMobileOpen } = useParlaySlip();
  const prevLegCount = useRef(legCount);

  useEffect(() => {
    if (prevLegCount.current === 0 && legCount === 1) {
      setMobileOpen(true);
    }
    prevLegCount.current = legCount;
  }, [legCount, setMobileOpen]);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2" />
          <SheetTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Bet Slip
            {legCount > 0 && (
              <Badge variant="outline">{legCount} leg{legCount !== 1 ? "s" : ""}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <SlipContent isMobile />
      </SheetContent>
    </Sheet>
  );
}

export function ParlaySlipDrawer() {
  return (
    <>
      <ParlaySlipDesktopSidebar />
      <ParlaySlipMobileDrawer />
    </>
  );
}
