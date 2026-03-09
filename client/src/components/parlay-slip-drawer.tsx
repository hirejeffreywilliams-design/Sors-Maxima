import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUserStrategy } from "@/hooks/use-user-strategy";
import { checkPickAgainstStrategy, type BettingStrategy } from "@/lib/strategy-definitions";
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
  AlertTriangle,
  Plus,
  Shuffle,
  FlaskConical,
  ArrowUp,
  ArrowDown,
  Radio,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { SlipShareCard } from "@/components/slip-share-card";

interface LiveLegOdds {
  legId: string;
  americanOdds: number | null;
  decimalOdds: number | null;
  book: string | null;
  found: boolean;
}

function useSlipLiveOdds(legs: ParlaySlipLeg[]): Map<string, LiveLegOdds> {
  const legKey = legs.map(l => l.id).join(",");
  const { data } = useQuery<{ legs: LiveLegOdds[]; timestamp: string }>({
    queryKey: ["/api/odds/live-legs", legKey],
    queryFn: async () => {
      const res = await fetch("/api/odds/live-legs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legs: legs.map(l => ({
            id: l.id,
            sport: l.sport,
            team: l.team,
            opponent: l.opponent,
            market: l.market,
            outcome: l.outcome,
          })),
        }),
      });
      if (!res.ok) return { legs: [], timestamp: "" };
      return res.json();
    },
    enabled: legs.length > 0,
    staleTime: 25000,
    refetchInterval: 30000,
  });

  return useMemo(() => {
    const map = new Map<string, LiveLegOdds>();
    if (data?.legs) {
      for (const entry of data.legs) map.set(entry.legId, entry);
    }
    return map;
  }, [data]);
}

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
        <span className="text-muted-foreground">Running Sors simulation...</span>
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
            Sors Sim: {simulation.winProbability.toFixed(1)}% win
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
          Sors Simulation: {simulation.winProbability.toFixed(1)}% Win
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
            {simulation.method === "analytic" ? "Sors Analytic" : `${(simulation.simulations / 1000).toFixed(0)}K runs`} | Sors Engine
          </div>
        </div>
      )}
    </div>
  );
}

interface BetQualityIssue {
  headline: string;
  detail: string;
  severity: "mild" | "moderate" | "strong";
}

function getBetQualityIssue(leg: ParlaySlipLeg): BetQualityIssue | null {
  const { grade, confidence, evPercent, americanOdds } = leg;

  if (grade === "F") {
    return {
      headline: "Our model really doesn't like this one.",
      detail: `An F grade means the data strongly favors the other side. You can still bet it — just know you're going against the numbers.`,
      severity: "strong",
    };
  }

  if (grade === "D" || grade === "D+") {
    return {
      headline: "This pick has a rough report card.",
      detail: `A D grade means the model sees significant edge working against you here. Worth double-checking before locking it in.`,
      severity: "moderate",
    };
  }

  if (americanOdds >= 700) {
    const impliedPct = Math.round(100 / (americanOdds / 100 + 1));
    const breakEvenEvery = Math.round(100 / impliedPct);
    return {
      headline: "That's a long shot — and we mean that literally.",
      detail: `At +${americanOdds}, this has roughly a ${impliedPct}% chance according to the market. It needs to hit about once every ${breakEvenEvery} times just to break even. Fun to root for, but the math is steep.`,
      severity: "moderate",
    };
  }

  if (evPercent !== undefined && evPercent < -18) {
    const lossPerHundred = Math.abs(evPercent).toFixed(0);
    return {
      headline: "The house has a big edge on this one.",
      detail: `At ${evPercent.toFixed(0)}% EV, you'd expect to lose about $${lossPerHundred} for every $100 bet here over time. That's a steep price to pay. Are you sure this is the right number?`,
      severity: "strong",
    };
  }

  if (evPercent !== undefined && evPercent < -10) {
    return {
      headline: "Negative expected value — just a heads up.",
      detail: `This bet comes in at ${evPercent.toFixed(1)}% EV. You're paying a premium over true odds. Still beatable with the right edge, but worth knowing.`,
      severity: "mild",
    };
  }

  if (americanOdds <= -450) {
    const profitPer100 = Math.round(10000 / Math.abs(americanOdds));
    return {
      headline: "Heavy chalk, light reward.",
      detail: `At ${americanOdds}, you're risking $100 to win only $${profitPer100}. The team probably wins — but you need them to win a lot of times just to make the juice worthwhile.`,
      severity: "mild",
    };
  }

  if (confidence !== undefined && confidence < 28) {
    return {
      headline: "Low confidence flag.",
      detail: `The model gives this only a ${Math.round(confidence)}% win probability. That's below a coin flip, and the coin is leaning the wrong way.`,
      severity: "moderate",
    };
  }

  return null;
}

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NFL: "🏈", MLB: "⚾", NHL: "🏒", NCAAB: "🏀", NCAAF: "🏈", MMA: "🥊", SOCCER: "⚽",
};

function legGradeBorder(grade?: string): string {
  if (!grade) return "border-l-border";
  if (grade.startsWith("A")) return "border-l-green-500";
  if (grade.startsWith("B")) return "border-l-blue-500";
  if (grade.startsWith("C")) return "border-l-yellow-500";
  return "border-l-red-500";
}

function LegItem({ leg, onRemove, compact, liveOdds }: { leg: ParlaySlipLeg; onRemove: () => void; compact?: boolean; liveOdds?: LiveLegOdds }) {
  const Icon = marketIcons[leg.market] || TrendingUp;
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const prevLiveOdds = useRef<number | null>(null);
  const qualityIssue = getBetQualityIssue(leg);
  const formattedOdds = formatOdds(leg.americanOdds, leg.decimalOdds);
  const isPositiveOdds = (leg.americanOdds ?? 0) > 0;

  const liveAmerican = liveOdds?.found ? liveOdds.americanOdds : null;
  const originalAmerican = leg.americanOdds ?? null;
  const oddsChanged = liveAmerican !== null && originalAmerican !== null && liveAmerican !== originalAmerican;
  const oddsImproved = oddsChanged && liveAmerican! > originalAmerican!;
  const formattedLiveOdds = liveAmerican !== null
    ? (liveAmerican > 0 ? `+${liveAmerican}` : `${liveAmerican}`)
    : null;

  useEffect(() => {
    if (liveAmerican !== null && prevLiveOdds.current !== null && prevLiveOdds.current !== liveAmerican) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 1200);
      return () => clearTimeout(t);
    }
    prevLiveOdds.current = liveAmerican;
  }, [liveAmerican]);

  return (
    <div
      className={`flex items-start gap-2 py-2 px-1 pl-2.5 group border-l-2 ${legGradeBorder(leg.grade)} bg-gradient-to-r from-muted/20 to-transparent transition-colors duration-300 ${flashing ? (oddsImproved ? "bg-emerald-500/10" : "bg-red-500/10") : ""}`}
      data-testid={`slip-leg-${leg.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {leg.sport && (
                <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wide shrink-0">
                  {SPORT_EMOJI[leg.sport] ?? ""} {leg.sport}
                </span>
              )}
              {leg.grade && (
                <Badge variant="outline" className={`text-[9px] h-4 px-1 font-bold shrink-0 ${gradeColor(leg.grade)}`} data-testid={`slip-grade-${leg.id}`}>
                  {leg.grade}
                </Badge>
              )}
              {liveOdds?.found && (
                <span className="text-[8px] font-bold text-sky-500 flex items-center gap-0.5 shrink-0" data-testid={`live-odds-badge-${leg.id}`}>
                  <Radio className="h-2 w-2 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Icon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground capitalize">{(leg.market || "").replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs font-semibold mt-0.5 leading-tight line-clamp-2" data-testid={`slip-outcome-${leg.id}`}>{leg.outcome}</p>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
              <span className="truncate">{leg.team}{leg.opponent ? ` vs ${leg.opponent}` : ""}</span>
            </div>
            {leg.gameTime && (
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">{formatGameDate(leg.gameTime)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            {oddsChanged ? (
              <>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50 line-through">
                  {formattedOdds}
                </span>
                <span className={`text-sm font-bold font-mono tabular-nums flex items-center gap-0.5 ${oddsImproved ? "text-emerald-500" : "text-red-500"}`} data-testid={`live-odds-value-${leg.id}`}>
                  {oddsImproved ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {formattedLiveOdds}
                </span>
                {liveOdds?.book && (
                  <span className="text-[8px] text-sky-500/80 font-medium">{liveOdds.book}</span>
                )}
              </>
            ) : (
              <>
                <span className={`text-sm font-bold font-mono tabular-nums ${liveOdds?.found ? "text-sky-400" : isPositiveOdds ? "text-emerald-500" : "text-foreground"}`}>
                  {formattedLiveOdds ?? formattedOdds}
                </span>
                {liveOdds?.book && liveOdds.found && (
                  <span className="text-[8px] text-sky-500/60 font-medium">{liveOdds.book}</span>
                )}
              </>
            )}
            {leg.evPercent !== undefined && leg.evPercent > 0 && (
              <span className="text-[9px] font-bold text-emerald-500/80">+{leg.evPercent.toFixed(1)}% EV</span>
            )}
            {leg.confidence && (
              <span className="text-[9px] text-muted-foreground">{Math.round(leg.confidence)}% conf</span>
            )}
          </div>
        </div>
        {!compact && leg.monteCarloData && (
          <div className="mt-1 px-1.5 py-1 rounded bg-muted/60 text-[10px] space-y-0.5" data-testid={`slip-mc-${leg.id}`}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5" />
              <span className="font-medium">SM: {(leg.monteCarloData.simulations / 1000).toFixed(0)}K runs</span>
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
        {!compact && qualityIssue && !alertDismissed && (
          <div
            className={`mt-1.5 rounded-md px-2 py-1.5 text-[10px] border flex items-start gap-1.5 ${
              qualityIssue.severity === "strong"
                ? "bg-red-500/8 border-red-400/30 text-red-700 dark:text-red-400"
                : qualityIssue.severity === "moderate"
                ? "bg-amber-500/10 border-amber-400/30 text-amber-700 dark:text-amber-400"
                : "bg-yellow-500/8 border-yellow-400/25 text-yellow-700 dark:text-yellow-500"
            }`}
            data-testid={`bet-quality-alert-${leg.id}`}
          >
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{qualityIssue.headline}</span>
              {" "}
              <span className="opacity-85">{qualityIssue.detail}</span>
            </div>
            <button
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-0.5"
              onClick={() => setAlertDismissed(true)}
              title="Dismiss"
              data-testid={`dismiss-quality-alert-${leg.id}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <button
        className="h-8 w-8 rounded-md flex items-center justify-center text-red-400/70 hover:text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors shrink-0"
        onClick={onRemove}
        data-testid={`remove-leg-${leg.id}`}
        title="Remove from slip"
        aria-label="Remove this bet from your slip"
      >
        <X className="h-4 w-4" />
      </button>
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
  const [showHoloCard, setShowHoloCard] = useState(false);
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

  return (
    <>
      {showHoloCard && (
        <SlipShareCard
          legs={legs.map(l => ({
            outcome: l.outcome,
            americanOdds: l.americanOdds,
            sport: l.sport,
            market: l.market,
            team: l.team,
            grade: l.grade,
          }))}
          totalAmericanOdds={totalAmericanOdds}
          stake={stake > 0 ? parseFloat(stake.toFixed(2)) : undefined}
          payout={stake > 0 ? parseFloat(payout) : undefined}
          onClose={() => setShowHoloCard(false)}
        />
      )}
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
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setShowHoloCard(true)}
                data-testid="button-share-card-slip"
              >
                <Zap className="h-3 w-3" />
                Card
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open holographic share card</TooltipContent>
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
  </>
  );
}

interface CorrelationData {
  score: number;
  grade: string;
  label: string;
  color: "green" | "yellow" | "red";
  warnings: string[];
  suggestions: string[];
  averageGrade: string;
  averageEV: number;
  averageConfidence: number;
}

function CorrelationPanel({ legs }: { legs: ParlaySlipLeg[] }) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef("");

  const legKey = legs.map(l => l.id).sort().join(",");

  useEffect(() => {
    if (legs.length < 2 || legKey === lastKeyRef.current) return;
    lastKeyRef.current = legKey;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch("/api/tickets/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ legs }),
        });
        if (resp.ok) setData(await resp.json());
      } catch {}
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [legKey, legs]);

  if (legs.length < 2) return null;

  const colorClass = data?.color === "green"
    ? "border-green-500/30 bg-green-500/8 text-green-700 dark:text-green-400"
    : data?.color === "yellow"
    ? "border-yellow-500/30 bg-yellow-500/8 text-yellow-700 dark:text-yellow-400"
    : "border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-400";

  const dotColor = data?.color === "green"
    ? "bg-green-500"
    : data?.color === "yellow"
    ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <div className={`mx-2 my-1.5 rounded-lg border text-[10px] ${colorClass}`} data-testid="correlation-panel">
      <button
        className="w-full flex items-center justify-between px-2.5 py-1.5 gap-1.5"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Shield className="h-3 w-3" />
          Correlation Check
          {loading && <Activity className="h-2.5 w-2.5 animate-pulse" />}
        </span>
        {data && (
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-bold">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              {data.score}/100 — {data.label}
            </span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
        {!data && !loading && <span className="text-muted-foreground">Analyzing...</span>}
      </button>
      {expanded && data && (
        <div className="px-2.5 pb-2 space-y-1.5 border-t border-current/20">
          <div className="flex items-center gap-3 pt-1.5 text-muted-foreground">
            <span>Avg Grade: <span className="font-bold text-foreground">{data.averageGrade}</span></span>
            <span>Avg EV: <span className="font-bold text-foreground">{data.averageEV > 0 ? "+" : ""}{data.averageEV}%</span></span>
            <span>Conf: <span className="font-bold text-foreground">{data.averageConfidence}%</span></span>
          </div>
          {data.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-[9px] uppercase tracking-wide opacity-70">Warnings</p>
              {data.warnings.map((w, i) => (
                <p key={i} className="text-[10px] leading-snug flex items-start gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                  {w}
                </p>
              ))}
            </div>
          )}
          {data.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-[9px] uppercase tracking-wide opacity-70">Suggestions</p>
              {data.suggestions.map((s, i) => (
                <p key={i} className="text-[10px] leading-snug flex items-start gap-1">
                  <Zap className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                  {s}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlipTabBar() {
  const { slips, activeSlipId, createSlip, deleteSlip, switchSlip, renameSlip, canUseMultiSlip } = useParlaySlip();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const startEdit = (slip: { id: string; name: string }, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setEditingId(slip.id);
    setEditValue(slip.name);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) renameSlip(editingId, editValue.trim());
    setEditingId(null);
  };

  if (!canUseMultiSlip) return null;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20 overflow-x-auto scrollbar-none" data-testid="slip-tab-bar">
      {slips.map((slip) => {
        const isActive = slip.id === activeSlipId;
        return (
          <div key={slip.id} className="flex items-center shrink-0">
            <button
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => switchSlip(slip.id)}
              onDoubleClick={(e) => startEdit(slip, e)}
              data-testid={`tab-slip-${slip.id}`}
            >
              {editingId === slip.id ? (
                <input
                  ref={editRef}
                  className="bg-transparent outline-none w-20 text-[10px]"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="max-w-[72px] truncate">{slip.name}</span>
              )}
              {slip.legs.length > 0 && (
                <span className={`text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center ${isActive ? "bg-white/20" : "bg-muted-foreground/20"}`}>
                  {slip.legs.length}
                </span>
              )}
            </button>
            {!isActive && slips.length > 1 && (
              <button
                className="text-muted-foreground/50 hover:text-destructive h-4 w-4 flex items-center justify-center rounded ml-0.5"
                onClick={(e) => { e.stopPropagation(); deleteSlip(slip.id); }}
                data-testid={`delete-slip-${slip.id}`}
                title="Delete slip"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}
      {slips.length < 5 && (
        <button
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          onClick={() => createSlip()}
          data-testid="button-create-slip"
          title="New slip"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function SlipContent({ compact, isMobile }: { compact?: boolean; isMobile?: boolean }) {
  const { legs, removeLeg, clearSlip, legCount, totalOdds, totalAmericanOdds, toWin, canUseMultiSlip } = useParlaySlip();
  const liveOddsMap = useSlipLiveOdds(legs);
  const liveLegsCount = useMemo(() => [...liveOddsMap.values()].filter(o => o.found).length, [liveOddsMap]);
  const { toast } = useToast();
  const [stake, setStake] = useState(10);
  const [stakeInitialized, setStakeInitialized] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [showHoloCard, setShowHoloCard] = useState(false);

  const { data: authData } = useQuery<{ authenticated: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
    staleTime: 30000,
  });
  const isAuthenticated = authData?.authenticated ?? false;

  const { data: bankrollData } = useQuery<{ bankroll: number; kellyFraction: number; dailyCapPct: number }>({
    queryKey: ["/api/settings/bankroll"],
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  useEffect(() => {
    if (bankrollData && !stakeInitialized) {
      const br = bankrollData.bankroll;
      const frac = bankrollData.kellyFraction ?? 0.25;
      const suggested = Math.max(1, Math.round(br * frac * 0.05));
      setStake(Math.min(suggested, Math.round(br * 0.05)));
      setStakeInitialized(true);
    }
  }, [bankrollData, stakeInitialized]);

  const bankrollPct = bankrollData && bankrollData.bankroll > 0
    ? ((stake / bankrollData.bankroll) * 100).toFixed(1)
    : null;

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

  const stakePresets: Array<{ label: string; value: number; testId: string }> = useMemo(() => {
    if (bankrollData && bankrollData.bankroll > 0) {
      const br = bankrollData.bankroll;
      return [
        { label: "1%", value: Math.max(1, Math.round(br * 0.01)), testId: "button-stake-1pct" },
        { label: "2%", value: Math.max(1, Math.round(br * 0.02)), testId: "button-stake-2pct" },
        { label: "5%", value: Math.max(1, Math.round(br * 0.05)), testId: "button-stake-5pct" },
        { label: "10%", value: Math.max(1, Math.round(br * 0.10)), testId: "button-stake-10pct" },
      ];
    }
    return [
      { label: "$10", value: 10, testId: "button-stake-10" },
      { label: "$25", value: 25, testId: "button-stake-25" },
      { label: "$50", value: 50, testId: "button-stake-50" },
      { label: "$100", value: 100, testId: "button-stake-100" },
    ];
  }, [bankrollData]);

  const { activeStrategy, recordOverride } = useUserStrategy();
  const strategyViolations = useMemo(() => {
    if (!activeStrategy) return [];
    return legs
      .map((leg, idx) => {
        const violation = checkPickAgainstStrategy(
          activeStrategy,
          {
            market: leg.market,
            americanOdds: leg.americanOdds ?? leg.odds,
            evPercent: leg.evPercent,
            confidence: leg.confidence,
            grade: leg.grade,
            sport: leg.sport,
            sharpMoneyPct: leg.sharpMoneyPct,
            publicMoneyPct: leg.publicMoneyPct,
            reverseLineMove: leg.reverseLineMove,
            steamMove: leg.steamMove,
          },
          idx
        );
        return violation ? { leg, violation } : null;
      })
      .filter(Boolean) as { leg: ParlaySlipLeg; violation: { reason: string; severity: "warn" | "strong" } }[];
  }, [activeStrategy, legs]);
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4 py-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Ticket className="h-7 w-7 text-primary/60" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-sm">No picks yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
            Add picks from Daily Picks, Odds Center, or Live Center to start building your parlay.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
          <Button variant="default" size="sm" className="w-full gap-2 h-8 text-xs" asChild>
            <Link href="/daily">
              <Sparkles className="h-3.5 w-3.5" />
              Browse Today's Picks
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2 h-8 text-xs" asChild>
            <Link href="/odds-center">
              <BarChart3 className="h-3.5 w-3.5" />
              Compare Odds
            </Link>
          </Button>
        </div>
        <div className="text-[9px] text-muted-foreground/50 flex items-center gap-1">
          <Zap className="h-2.5 w-2.5" />
          First pick auto-opens this slip
        </div>
        <Button variant="outline" size="sm" asChild className="hidden">
          <Link href="/">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Browse Picks
          </Link>
        </Button>
      </div>
    );
  }

  if (isMobile) {
    const holoPayload = {
      legs: legs.map(l => ({ outcome: l.outcome, americanOdds: l.americanOdds, sport: l.sport, market: l.market, team: l.team, grade: l.grade })),
      totalAmericanOdds,
      stake: stake > 0 ? stake : undefined,
      payout: stake > 0 ? parseFloat((totalOdds * stake).toFixed(2)) : undefined,
    };
    return (
      <>
        {showHoloCard && <SlipShareCard {...holoPayload} onClose={() => setShowHoloCard(false)} />}
        <SlipTabBar />
        <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs font-bold px-2.5 py-0.5">
                {legCount} leg{legCount !== 1 ? "s" : ""}
              </Badge>
              <span className="text-sm font-bold">{formattedTotalOdds}</span>
              {liveLegsCount > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-sky-500" data-testid="live-odds-mobile-status">
                  <Radio className="h-2.5 w-2.5 animate-pulse" />
                  {liveLegsCount} LIVE
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearSlip} className="text-xs text-destructive hover:text-destructive h-7 px-2" data-testid="button-clear-slip">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
          <div className="space-y-1.5">
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
                {stakePresets.map(({ label, value, testId }) => (
                  <Button
                    key={testId}
                    variant={stake === value ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setStake(value)}
                    data-testid={testId}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {bankrollPct !== null ? (
              <div className="flex items-center gap-1.5 text-[10px]" data-testid="bankroll-stake-context">
                <span className={`font-medium ${parseFloat(bankrollPct) > 10 ? "text-amber-500" : parseFloat(bankrollPct) > 5 ? "text-yellow-500" : "text-emerald-500"}`}>
                  {bankrollPct}% of your ${bankrollData!.bankroll.toLocaleString()} bankroll
                </span>
                {parseFloat(bankrollPct) > 10 && (
                  <span className="text-amber-500">— consider reducing stake</span>
                )}
              </div>
            ) : isAuthenticated ? (
              <div className="text-[10px] text-muted-foreground" data-testid="bankroll-no-setting">
                <a href="/settings" className="underline text-primary/70">Set your bankroll</a> to get personalized stake recommendations
              </div>
            ) : null}
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
          {activeStrategy && <ConflictBanner legs={legs} strategy={activeStrategy} />}
          <div className="px-3 py-1">
            <div className="divide-y">
              {legs.map((leg) => (
                <LegItem key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} liveOdds={liveOddsMap.get(leg.id)} />
              ))}
            </div>
          </div>
        </ScrollArea>

        <CorrelationPanel legs={legs} />

        {strategyViolations.length > 0 && (
          <div className="mx-3 mb-1 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/8 space-y-1.5" data-testid="banner-strategy-violations">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {strategyViolations.length} pick{strategyViolations.length > 1 ? "s" : ""} outside your {activeStrategy?.name} strategy
            </div>
            {strategyViolations.map(({ leg, violation }, i) => (
              <p key={i} className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
                <span className="font-medium">{leg.team}</span>: {violation.reason}
              </p>
            ))}
            <button
              className="text-[10px] underline text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
              onClick={() => recordOverride.mutate()}
              data-testid="button-acknowledge-override"
            >
              I understand — continue anyway
            </button>
          </div>
        )}

        <div className="border-t bg-background px-4 py-3 space-y-2.5 safe-area-bottom">
          <div className="flex gap-2">
            <Button className="flex-1 h-10 gap-2 font-bold" onClick={handleCopySlip} data-testid="button-copy-full-slip">
              <Copy className="h-4 w-4" />
              Copy Slip
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => setShowHoloCard(true)}
              data-testid="button-share-slip"
            >
              <Zap className="h-4 w-4" />
              Share Card
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

          {canUseMultiSlip && (
            <Link href="/ticket-variations">
              <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-primary/40 text-[10px] text-primary hover:bg-primary/5 transition-colors" data-testid="link-variation-engine">
                <FlaskConical className="h-3 w-3" />
                Ticket Variation Engine
                <Shuffle className="h-3 w-3" />
              </button>
            </Link>
          )}

          <AffiliateDisclosure compact className="text-center block w-full" />
        </div>
      </>
    );
  }

  const holoPayloadDesktop = {
    legs: legs.map(l => ({ outcome: l.outcome, americanOdds: l.americanOdds, sport: l.sport, market: l.market, team: l.team, grade: l.grade })),
    totalAmericanOdds,
    stake: stake > 0 ? stake : undefined,
    payout: stake > 0 ? parseFloat((totalOdds * stake).toFixed(2)) : undefined,
  };

  return (
    <>
      {showHoloCard && <SlipShareCard {...holoPayloadDesktop} onClose={() => setShowHoloCard(false)} />}
      <SlipTabBar />
      <div className="px-3 pt-2.5 pb-2 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent border-b space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-6 w-6 text-[10px] font-black shrink-0">
              {legCount}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-muted-foreground leading-none">Combined Odds</p>
                {liveLegsCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[8px] font-bold text-sky-500 leading-none" data-testid="live-odds-status">
                    <Radio className="h-2 w-2 animate-pulse" />
                    {liveLegsCount}/{legCount} LIVE
                  </span>
                )}
              </div>
              <p className="text-base font-black tabular-nums leading-tight">{formattedTotalOdds}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">To Win</p>
              <p className="text-lg font-black text-emerald-500 tabular-nums leading-tight" data-testid="desktop-to-win">${toWinAmount}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearSlip} className="h-6 w-6 text-muted-foreground/40 hover:text-destructive mt-0.5 shrink-0" data-testid="button-clear-slip" title="Clear slip">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {legs.length > 1 && (
          <div className="flex items-center gap-0.5">
            {legs.map((leg, i) => {
              const bg = leg.grade?.startsWith("A") ? "bg-green-500" : leg.grade?.startsWith("B") ? "bg-blue-500" : leg.grade?.startsWith("C") ? "bg-yellow-500" : "bg-muted-foreground/40";
              return (
                <div key={leg.id} className="flex items-center gap-0.5 flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`h-1.5 w-full rounded-full ${bg}`} />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">Leg {i + 1}: {leg.outcome} ({leg.grade ?? "?"})</TooltipContent>
                  </Tooltip>
                  {i < legs.length - 1 && <div className="w-1 h-px bg-muted-foreground/20 shrink-0" />}
                </div>
              );
            })}
            <span className="text-[8px] text-muted-foreground/50 ml-1.5 shrink-0 tabular-nums">{totalOdds.toFixed(2)}x</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {activeStrategy && <ConflictBanner legs={legs} strategy={activeStrategy} />}
        <div className="divide-y px-2">
          {legs.map((leg) => (
            <LegItem key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} compact={compact} liveOdds={liveOddsMap.get(leg.id)} />
          ))}
        </div>
      </ScrollArea>

      <CorrelationPanel legs={legs} />

      {strategyViolations.length > 0 && (
        <div className="mx-2 mb-1 p-2 rounded-lg border border-amber-500/30 bg-amber-500/8 space-y-1" data-testid="banner-strategy-violations-desktop">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {strategyViolations.length} off-strategy pick{strategyViolations.length > 1 ? "s" : ""}
          </div>
          {strategyViolations.map(({ leg, violation }, i) => (
            <p key={i} className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
              <span className="font-medium">{leg.team}</span>: {violation.reason}
            </p>
          ))}
          <button
            className="text-[10px] underline text-amber-600 dark:text-amber-400"
            onClick={() => recordOverride.mutate()}
            data-testid="button-acknowledge-override-desktop"
          >
            Continue anyway
          </button>
        </div>
      )}

      <div className="border-t bg-background px-3 py-2.5 space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">Stake</span>
            <div className="flex items-center flex-1 gap-1">
              <span className="text-[10px] text-muted-foreground">$</span>
              <Input
                type="number"
                min={1}
                max={100000}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
                className="h-6 w-14 text-[10px] font-bold px-1.5"
                data-testid="input-stake"
              />
            </div>
            <div className="flex gap-0.5">
              {stakePresets.map(({ label, value, testId }) => (
                <Button
                  key={testId}
                  variant={stake === value ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-1.5 text-[9px] font-medium"
                  onClick={() => setStake(value)}
                  data-testid={testId}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          {bankrollPct !== null && (
            <p className={`text-[9px] font-medium ${parseFloat(bankrollPct) > 10 ? "text-amber-500" : parseFloat(bankrollPct) > 5 ? "text-yellow-500" : "text-emerald-500"}`} data-testid="bankroll-pct-desktop">
              {bankrollPct}% of ${bankrollData!.bankroll.toLocaleString()} bankroll{parseFloat(bankrollPct) > 10 ? " — consider reducing" : ""}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 border px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Odds</span>
            <span className="font-mono font-bold">{formattedTotalOdds} <span className="text-muted-foreground font-normal">({totalOdds.toFixed(2)}x)</span></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">To Win</span>
            <span className="text-xl font-black text-emerald-500 tabular-nums leading-none">${toWinAmount}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Total Return</span>
            <span className="font-medium text-muted-foreground">${totalReturn}</span>
          </div>
        </div>

        <MCSimulationPanel legs={legs} stake={stake} compact />

        <Separator />

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleCopySlip} data-testid="button-copy-full-slip">
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setShowHoloCard(true)}
            data-testid="button-share-slip"
          >
            <Zap className="h-3 w-3" />
            Card
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

        {canUseMultiSlip && (
          <Link href="/ticket-variations">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-primary/40 text-[10px] text-primary hover:bg-primary/5 transition-colors" data-testid="link-variation-engine-desktop">
              <FlaskConical className="h-2.5 w-2.5" />
              Variation Engine
              <Shuffle className="h-2.5 w-2.5" />
            </button>
          </Link>
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
        <Ticket className="h-4 w-4 gold-ticket-icon" />
        {legCount > 0 ? (
          <span className="gold-slip-badge text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
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
          <Ticket className="h-4 w-4 gold-ticket-icon" />
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
            <Ticket className="h-5 w-5 gold-ticket-icon" />
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

function ConflictBanner({ legs, strategy }: { legs: ParlaySlipLeg[]; strategy: BettingStrategy }) {
  const [expanded, setExpanded] = useState(false);
  const violations = useMemo(() => {
    return legs
      .map((leg) => ({
        leg,
        violation: checkPickAgainstStrategy(
          strategy,
          {
            market: leg.market,
            americanOdds: leg.americanOdds ?? leg.odds,
            evPercent: leg.evPercent,
            confidence: leg.confidence,
            grade: leg.grade,
            sport: leg.sport,
            sharpMoneyPct: leg.sharpMoneyPct,
            publicMoneyPct: leg.publicMoneyPct,
            reverseLineMove: leg.reverseLineMove,
            steamMove: leg.steamMove,
          },
          legs.length
        ),
      }))
      .filter((v) => v.violation !== null);
  }, [legs, strategy]);

  if (violations.length === 0) return null;

  return (
    <div className="mx-4 mt-4 mb-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 overflow-hidden" data-testid="strategy-conflict-banner">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">
            {violations.length} pick{violations.length !== 1 ? "s" : ""} conflict with your {strategy.name} strategy
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/30"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-conflicts"
        >
          {expanded ? "Hide Details" : "Show Details"}
          {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-orange-200/50 dark:border-orange-900/30 pt-3">
          {violations.map(({ leg, violation }) => (
            <div key={leg.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-orange-900 dark:text-orange-200">
                    {leg.team}: {violation?.reason}
                  </p>
                  <AlternativeSuggestion strategyId={strategy.id} sport={leg.sport} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlternativeSuggestion({ strategyId, sport }: { strategyId: string; sport?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/strategy/auto-picks", strategyId, sport, 1],
    queryFn: async () => {
      const url = `/api/strategy/auto-picks?strategyId=${strategyId}&limit=1${sport ? `&sport=${sport}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch alternative");
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading) return <div className="h-4 w-32 bg-orange-200/50 dark:bg-orange-900/30 animate-pulse rounded" />;
  if (!data?.picks?.[0]) return null;

  const pick = data.picks[0];
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-orange-700 dark:text-orange-400 font-medium bg-orange-100/50 dark:bg-orange-900/20 px-2 py-1 rounded w-fit">
      <Sparkles className="h-3 w-3" />
      Best alternative: {pick.team} {pick.outcome} ({pick.americanOdds > 0 ? "+" : ""}{pick.americanOdds})
    </div>
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
