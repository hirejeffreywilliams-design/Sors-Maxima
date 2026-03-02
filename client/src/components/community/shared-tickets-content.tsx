import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Share2, Trophy, Crown, Medal, Lock, Copy, CheckCircle2, Star,
  Shield, Zap, TrendingUp, Target, Clock, Activity, BarChart3,
  ChevronRight, Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import type { SavedTicket } from "@/pages/profile";

const STORAGE_KEY = "sors_ticket_history";
const DAILY_USAGE_KEY = "sors_daily_usage";

function loadTickets(): SavedTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTicket[];
  } catch {
    return [];
  }
}

function getDailyUsage(): number {
  try {
    const raw = localStorage.getItem(DAILY_USAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date === today) return data.count ?? 0;
    return 0;
  } catch {
    return 0;
  }
}

function formatOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

function formatGameTime(gameTime?: string): string {
  if (!gameTime) return "";
  try {
    const d = new Date(gameTime);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-500 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-500 border-red-500/30";
}

function confidenceLabel(level: string): string {
  if (level === "high") return "High Confidence";
  if (level === "medium") return "Medium Confidence";
  return "Low Confidence";
}

function computeUserStats(tickets: SavedTicket[]) {
  const settled = tickets.filter((t) => t.status !== "pending");
  const wins = tickets.filter((t) => t.status === "won").length;
  const losses = tickets.filter((t) => t.status === "lost").length;
  const totalStaked = settled.reduce((sum, t) => sum + t.recommended_stake, 0);
  const totalPL = settled.reduce((sum, t) => sum + (t.actual_pl ?? 0), 0);
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  let longestStreak = 0, currentStreak = 0;
  const sorted = [...tickets].sort((a, b) => new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime());
  for (const t of sorted) {
    if (t.status === "won") { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); }
    else if (t.status === "lost") currentStreak = 0;
  }

  return { roi, winRate, totalProfit: totalPL, longestStreak, wins, losses };
}

type LeaderboardEntry = { name: string; roi: number; winRate: number; totalProfit: number; longestStreak: number };
type RankCriteria = "roi" | "winRate" | "totalProfit" | "longestStreak";

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-yellow-500 text-yellow-950 gap-1 text-xs" data-testid="badge-gold"><Crown className="w-3 h-3" />Gold</Badge>;
  if (rank === 2) return <Badge className="bg-gray-300 text-gray-800 gap-1 text-xs" data-testid="badge-silver"><Medal className="w-3 h-3" />Silver</Badge>;
  if (rank === 3) return <Badge className="bg-amber-700 text-amber-100 gap-1 text-xs" data-testid="badge-bronze"><Medal className="w-3 h-3" />Bronze</Badge>;
  return null;
}

function formatStatValue(criteria: RankCriteria, value: number) {
  switch (criteria) {
    case "roi": return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "winRate": return `${value.toFixed(1)}%`;
    case "totalProfit": return `${value >= 0 ? "+" : ""}$${value.toFixed(0)}`;
    case "longestStreak": return `${value} W`;
  }
}

function SlipShareCard() {
  const { legs, totalOdds, totalAmericanOdds, toWin, legCount } = useParlaySlip();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const formattedOdds = totalAmericanOdds > 0 ? `+${totalAmericanOdds}` : `${totalAmericanOdds}`;

  const buildShareText = () => {
    const stake = 10;
    const toWinAmt = (toWin * stake).toFixed(2);
    const lines: string[] = [
      "🎯 SORS MAXIMA PARLAY PICK",
      `${legCount} Leg${legCount !== 1 ? "s" : ""} | ${formattedOdds} | $${stake} to win $${toWinAmt}`,
      "─".repeat(36),
    ];
    legs.forEach((leg, i) => {
      const odds = leg.americanOdds !== undefined ? formatOdds(leg.americanOdds) : formatOdds(Math.round(leg.decimalOdds >= 2 ? (leg.decimalOdds - 1) * 100 : -100 / (leg.decimalOdds - 1)));
      const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
      const gameStr = leg.gameTime ? ` (${formatGameTime(leg.gameTime)})` : "";
      lines.push(`\nLeg ${i + 1}: ${leg.outcome}`);
      lines.push(`  ${matchup}${gameStr}`);
      const meta: string[] = [`Odds: ${odds}`];
      if (leg.grade) meta.push(`Grade: ${leg.grade}`);
      if (leg.confidence) meta.push(`${Math.round(leg.confidence)}% confidence`);
      if (leg.evPercent !== undefined && leg.evPercent > 0) meta.push(`+${leg.evPercent.toFixed(1)}% EV`);
      if (leg.sport) meta.push(leg.sport);
      lines.push(`  ${meta.join(" · ")}`);
      if (leg.reasoning) {
        const short = leg.reasoning.length > 100 ? leg.reasoning.slice(0, 97) + "..." : leg.reasoning;
        lines.push(`  "${short}"`);
      }
    });
    lines.push("\n" + "─".repeat(36));
    lines.push(`Combined Odds: ${formattedOdds} (${totalOdds.toFixed(2)}x decimal)`);
    lines.push(`Stake $${stake} → To Win $${toWinAmt} | Total Return $${(totalOdds * stake).toFixed(2)}`);
    lines.push("\nPowered by Sors Maxima · 46-Factor Model Analysis\nsorsmaxima.com");
    return lines.join("\n");
  };

  const handleCopy = () => {
    const text = buildShareText();
    (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => {
      setCopied(true);
      toast({ title: "Slip copied!", description: "Rich pick details copied to clipboard." });
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      toast({ title: "Could not copy", variant: "destructive" });
    });
  };

  const handleShare = () => {
    const text = buildShareText();
    if (navigator.share) {
      navigator.share({ title: `Sors Maxima ${legCount}-Leg Parlay ${formattedOdds}`, text }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  if (legCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center space-y-2">
          <Ticket className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No picks in your slip</p>
          <p className="text-xs text-muted-foreground">Add picks from the Command Center, Daily Picks, or Matchup pages to share them here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="slip-share-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            Current Slip — {legCount} Leg{legCount !== 1 ? "s" : ""}
          </CardTitle>
          <Badge variant="outline" className="font-mono font-bold text-sm">{formattedOdds}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>To Win: <span className="text-green-600 dark:text-green-400 font-bold">${(toWin * 10).toFixed(2)}</span> on $10</span>
          <span>Return: <span className="font-medium">${(totalOdds * 10).toFixed(2)}</span></span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2">
          {legs.map((leg, i) => {
            const odds = leg.americanOdds !== undefined ? formatOdds(leg.americanOdds) : "";
            const matchup = leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team;
            const gameStr = formatGameTime(leg.gameTime);
            return (
              <div key={leg.id} className="p-2.5 rounded-lg bg-background border space-y-1.5" data-testid={`slip-share-leg-${i}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium">Leg {i + 1}</span>
                      {leg.grade && (
                        <Badge variant="outline" className={`text-[10px] h-4 px-1 font-bold ${gradeColor(leg.grade)}`}>
                          {leg.grade}
                        </Badge>
                      )}
                      {leg.sport && <Badge variant="secondary" className="text-[10px] h-4 px-1">{leg.sport}</Badge>}
                    </div>
                    <p className="font-semibold text-sm mt-0.5">{leg.outcome}</p>
                    <p className="text-xs text-muted-foreground">{matchup}</p>
                    {gameStr && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {gameStr}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-sm">{odds}</p>
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      {leg.confidence && (
                        <span className="text-[10px] text-muted-foreground">{Math.round(leg.confidence)}% conf</span>
                      )}
                      {leg.evPercent !== undefined && leg.evPercent > 0 && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">+{leg.evPercent.toFixed(1)}% EV</span>
                      )}
                    </div>
                  </div>
                </div>
                {leg.reasoning && (
                  <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-t pt-1.5">
                    {leg.reasoning}
                  </p>
                )}
                {leg.monteCarloData && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-1.5">
                    <Activity className="h-2.5 w-2.5" />
                    <span>MC: {(leg.monteCarloData.homeWinProb * 100).toFixed(0)}% win prob</span>
                    <span>·</span>
                    <span>Projected {Math.round(leg.monteCarloData.predictedAwayScore)}-{Math.round(leg.monteCarloData.predictedHomeScore)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-9 gap-2 text-xs font-semibold"
            onClick={handleCopy}
            data-testid="button-copy-slip-share"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Pick Details"}
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2 text-xs"
            onClick={handleShare}
            data-testid="button-share-slip-native"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Copies all legs with grades, confidence, EV%, and reasoning
        </p>
      </CardContent>
    </Card>
  );
}

function SavedTicketShareCard({ ticket }: { ticket: SavedTicket }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const decimalOdds = ticket.american_odds > 0
    ? ticket.american_odds / 100 + 1
    : 100 / Math.abs(ticket.american_odds) + 1;
  const toWin = ((decimalOdds - 1) * ticket.recommended_stake).toFixed(2);

  const buildShareText = () => {
    const lines: string[] = [
      "🎯 SORS MAXIMA PICK",
      `${ticket.name}`,
      `${ticket.legs.length} Legs | ${formatOdds(ticket.american_odds)} | Stake $${ticket.recommended_stake} → Win $${toWin}`,
      "─".repeat(36),
    ];

    ticket.legs.forEach((leg, i) => {
      const odds = formatOdds(leg.americanOdds);
      const matchup = `${leg.team} vs ${leg.opponent}`;
      lines.push(`\nLeg ${i + 1}: ${leg.outcome}`);
      lines.push(`  ${matchup}`);
      const meta: string[] = [`Odds: ${odds}`];
      if (leg.winProbability) meta.push(`${(leg.winProbability * 100).toFixed(0)}% win prob`);
      if (leg.edgePercent > 0) meta.push(`+${leg.edgePercent.toFixed(1)}% edge`);
      meta.push(confidenceLabel(leg.analysis.confidenceLevel));
      lines.push(`  ${meta.join(" · ")}`);
      if (leg.analysis.sharpAction) lines.push(`  ✓ Sharp money action detected`);
      if (leg.analysis.lineMovement === "steam") lines.push(`  ✓ Steam move — line moving fast`);
    });

    lines.push("\n" + "─".repeat(36));
    lines.push(`Grade: ${ticket.grade} | Sport: ${ticket.sport}`);
    lines.push(`Combined Odds: ${formatOdds(ticket.american_odds)}`);
    if (ticket.status !== "pending") lines.push(`Result: ${ticket.status.toUpperCase()}`);
    lines.push("\nPowered by Sors Maxima · 46-Factor Model Analysis\nsorsmaxima.com");
    return lines.join("\n");
  };

  const handleCopy = () => {
    (navigator.clipboard?.writeText(buildShareText()) || Promise.reject()).then(() => {
      setCopied(true);
      toast({ title: "Ticket copied!" });
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => toast({ title: "Could not copy", variant: "destructive" }));
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: `${ticket.name} ${formatOdds(ticket.american_odds)}`, text: buildShareText() }).catch(() => {});
    else handleCopy();
  };

  return (
    <Card data-testid="shared-ticket-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight" data-testid="text-shared-ticket-name">{ticket.name}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs">{ticket.sport}</Badge>
              <Badge variant="outline" className={`text-xs font-bold ${gradeColor(ticket.grade)}`} data-testid="badge-shared-grade">
                Grade {ticket.grade}
              </Badge>
              <Badge variant="outline" className="text-xs">{ticket.legs.length} legs</Badge>
              {ticket.status !== "pending" && (
                <Badge className={`text-xs ${ticket.status === "won" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"}`}>
                  {ticket.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Combined Odds</p>
            <p className="text-xl font-bold font-mono" data-testid="text-shared-odds">
              {formatOdds(ticket.american_odds)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Win ${toWin}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pick Breakdown</p>
          {ticket.legs.map((leg, i) => (
            <div key={leg.id} className="p-2.5 rounded-lg bg-muted/40 border space-y-1" data-testid={`shared-leg-${leg.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Leg {i + 1}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 capitalize">{leg.market}</Badge>
                    {leg.analysis.sharpAction && (
                      <Badge className="text-[10px] h-4 px-1 bg-blue-500/20 text-blue-500 border-blue-500/30">
                        Sharp ✓
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5">{leg.outcome}</p>
                  <p className="text-xs text-muted-foreground">{leg.team} vs {leg.opponent}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-mono font-bold text-sm">{formatOdds(leg.americanOdds)}</p>
                  {leg.winProbability > 0 && (
                    <p className="text-[10px] text-muted-foreground">{(leg.winProbability * 100).toFixed(0)}% win</p>
                  )}
                  {leg.edgePercent > 0 && (
                    <p className="text-[10px] text-green-600 dark:text-green-400">+{leg.edgePercent.toFixed(1)}% edge</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                <BarChart3 className="h-2.5 w-2.5 shrink-0" />
                <span>{confidenceLabel(leg.analysis.confidenceLevel)}</span>
                {leg.analysis.lineMovement !== "stable" && (
                  <>
                    <span>·</span>
                    <span className={leg.analysis.lineMovement === "steam" ? "text-orange-500" : "text-blue-400"}>
                      {leg.analysis.lineMovement === "steam" ? "Steam move" : "Reverse line"}
                    </span>
                  </>
                )}
                {leg.analysis.publicPercent > 0 && (
                  <>
                    <span>·</span>
                    <span>{leg.analysis.publicPercent}% public</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="h-9 gap-2 text-xs" onClick={handleCopy} data-testid="button-copy-ticket">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Picks"}
          </Button>
          <Button variant="outline" className="h-9 gap-2 text-xs" onClick={handleShare} data-testid="button-share-ticket">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Generated by Sors Maxima · 46-Factor Model Analysis
        </p>
      </CardContent>
    </Card>
  );
}

function ShareTab() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const savedTickets = useMemo(() => loadTickets().slice(0, 10), []);

  const urlTicket = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const encodedId = params.get("id");
    if (!encodedId) return null;
    try { return JSON.parse(atob(encodedId)) as SavedTicket; } catch { return null; }
  }, []);

  const selectedTicket = useMemo(() => {
    if (urlTicket) return urlTicket;
    if (!selectedTicketId) return null;
    return savedTickets.find(t => String(t.id) === selectedTicketId) ?? null;
  }, [selectedTicketId, savedTickets, urlTicket]);

  return (
    <div className="space-y-5" data-testid="share-tab">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Share Your Current Slip
        </h3>
        <p className="text-xs text-muted-foreground">Copies all pick details — grades, confidence, EV, reasoning — ready to paste or send.</p>
        <SlipShareCard />
      </div>

      {savedTickets.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              Share a Saved Ticket
            </h3>
            <p className="text-xs text-muted-foreground">Select any saved ticket from your history to share.</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {savedTickets.map((t) => (
                <button
                  key={t.id}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                    selectedTicketId === String(t.id)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  }`}
                  onClick={() => setSelectedTicketId(prev => prev === String(t.id) ? null : String(t.id))}
                  data-testid={`button-select-ticket-${t.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                      <span>{t.sport}</span>
                      <span>·</span>
                      <span>{t.legs.length} legs</span>
                      <span>·</span>
                      <span className="font-mono">{formatOdds(t.american_odds)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.status !== "pending" && (
                      <Badge className={`text-[10px] h-4 px-1 ${t.status === "won" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"}`}>
                        {t.status.toUpperCase()}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 font-bold ${gradeColor(t.grade)}`}>
                      {t.grade}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
            {selectedTicket && selectedTicketId && (
              <div className="mt-3">
                <SavedTicketShareCard ticket={selectedTicket} />
              </div>
            )}
          </div>
        </>
      )}

      {urlTicket && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Shared Ticket
            </h3>
            <SavedTicketShareCard ticket={urlTicket} />
          </div>
        </>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [criteria, setCriteria] = useState<RankCriteria>("roi");
  const userStats = useMemo(() => computeUserStats(loadTickets()), []);

  const { data: competitors = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/community/leaderboard"],
  });

  const allEntries = useMemo(() => {
    const userEntry = { name: "You", roi: userStats.roi, winRate: userStats.winRate, totalProfit: userStats.totalProfit, longestStreak: userStats.longestStreak, isUser: true };
    const entries = [...competitors.map((c) => ({ ...c, isUser: false })), userEntry];
    entries.sort((a, b) => (b[criteria] as number) - (a[criteria] as number));
    return entries;
  }, [criteria, userStats, competitors]);

  const criteriaOptions: { value: RankCriteria; label: string }[] = [
    { value: "roi", label: "ROI %" },
    { value: "winRate", label: "Win Rate" },
    { value: "totalProfit", label: "Total Profit" },
    { value: "longestStreak", label: "Win Streak" },
  ];

  return (
    <div className="space-y-4" data-testid="leaderboard-tab">
      <div className="flex items-center gap-2 flex-wrap">
        {criteriaOptions.map((opt) => (
          <Button key={opt.value} size="sm" variant={criteria === opt.value ? "default" : "outline"} onClick={() => setCriteria(opt.value)} data-testid={`button-criteria-${opt.value}`}>
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {allEntries.map((entry, idx) => {
                const rank = idx + 1;
                return (
                  <div key={entry.name} className={`flex items-center gap-3 p-3 ${entry.isUser ? "bg-primary/5" : ""}`} data-testid={`leaderboard-entry-${rank}`}>
                    <span className="w-8 text-center font-bold text-sm text-muted-foreground" data-testid={`text-rank-${rank}`}>{rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${entry.isUser ? "text-primary" : ""}`} data-testid={`text-username-${rank}`}>
                        {entry.name}{entry.isUser && <Star className="w-3 h-3 inline ml-1 text-primary" />}
                      </p>
                    </div>
                    <span className={`font-bold text-sm ${(entry[criteria] as number) >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-stat-${rank}`}>
                      {formatStatValue(criteria, entry[criteria] as number)}
                    </span>
                    <div className="w-20 flex justify-end">{getRankBadge(rank)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TierAccessTab() {
  const dailyUsage = useMemo(() => getDailyUsage(), []);

  const tiers = [
    { name: "Sharp", price: "$49", period: "/mo", current: true, icon: <Shield className="w-5 h-5 text-blue-500" />, features: ["Unlimited ticket generations", "Full 46-factor engine", "+EV finder & bet grading", "ROI dashboard"], limitations: ["No AI assistant", "No prop projections", "No arbitrage scanner"] },
    { name: "Edge", price: "$99", period: "/mo", current: false, icon: <Zap className="w-5 h-5 text-purple-500" />, features: ["Unlimited tickets", "AI Betting Assistant", "Prop projections", "Line movement alerts", "SGP optimizer"], limitations: [] },
    { name: "Max", price: "$249", period: "/mo", current: false, icon: <Crown className="w-5 h-5 text-amber-500" />, features: ["Everything in Edge", "Zero limits — priority processing", "Custom model builder", "Hedge & arbitrage tools", "Direct support"], limitations: [] },
  ];

  return (
    <div className="space-y-6" data-testid="tier-access-tab">
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium">Daily Usage</p>
            <p className="text-xs text-muted-foreground">Sharp tier: 25 tickets/day</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((dailyUsage / 25) * 100, 100)}%` }} />
            </div>
            <span className="text-sm font-bold" data-testid="text-daily-usage">{dailyUsage}/25</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <Card key={tier.name} data-testid={`tier-card-${tier.name.toLowerCase()}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">{tier.icon}<CardTitle className="text-base">{tier.name}</CardTitle></div>
              {tier.current && <Badge variant="outline" className="text-xs" data-testid="badge-current-plan">Current Plan</Badge>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div><span className="text-2xl font-bold">{tier.price}</span><span className="text-sm text-muted-foreground">{tier.period}</span></div>
              <div className="space-y-2">
                {tier.features.map((feat) => <div key={feat} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /><span>{feat}</span></div>)}
                {tier.limitations.map((lim) => <div key={lim} className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="w-4 h-4 shrink-0" /><span>{lim}</span></div>)}
              </div>
              {!tier.current && (
                <Button className="w-full" variant="outline" onClick={() => (window.location.href = "/pricing")} data-testid={`button-upgrade-${tier.name.toLowerCase()}`}>
                  Upgrade to {tier.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SharedTicketsContent() {
  const hasSharedId = typeof window !== "undefined" && window.location.search.includes("id=");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="share" className="space-y-4">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="share" data-testid="tab-share-ticket">
            <Share2 className="w-4 h-4 mr-1.5" />
            Share Picks
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-shared-leaderboard">
            <Trophy className="w-4 h-4 mr-1.5" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">
            <Crown className="w-4 h-4 mr-1.5" />
            Tier Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="share"><ShareTab /></TabsContent>
        <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        <TabsContent value="tiers"><TierAccessTab /></TabsContent>
      </Tabs>
    </div>
  );
}
